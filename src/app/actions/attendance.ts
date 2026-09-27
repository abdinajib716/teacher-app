"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { audit } from "@/lib/audit"
import { countStatuses, type Counts } from "@/lib/attendance"
import { dateKeyToDate, isDateKey } from "@/lib/time"
import { fail, ok, type ActionResult } from "@/lib/action"
import { hasEmail } from "@/lib/env"
import { buildReceipt } from "@/lib/receipt"
import { sendAttendanceReceipt } from "@/lib/email"

const markSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "EXCUSED"]),
  scope: z.enum(["BREAK", "DAY"]).nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
})

const saveSchema = z.object({
  classId: z.string().min(1),
  date: z.string().refine(isDateKey),
  breakNo: z.union([z.literal(1), z.literal(2)]),
  marks: z.array(markSchema).max(2000),
})

export type SaveAttendanceInput = z.input<typeof saveSchema>

export type SavedAttendance = {
  sessionId: string
  recordedAt: string
  editedAt: string | null
  counts: Counts
  edited: boolean
}

/**
 * Saves one break. The first save creates the record and stamps recordedAt;
 * every later save keeps recordedAt, stamps editedAt and adds a history entry.
 * Nothing is locked: any date, any break, any time. When the same break is
 * saved from two devices, the later save wins and both stay in the history.
 */
export async function saveAttendance(input: SaveAttendanceInput): Promise<ActionResult<SavedAttendance>> {
  const teacher = await requireTeacher()
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return fail("invalid")
  const { classId, date, breakNo, marks } = parsed.data

  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, teacherId: teacher.id }, select: { id: true } })
  if (!cls) return fail("notFound")

  // Only this teacher's students in this class can be marked.
  const allowed = await prisma.student.findMany({
    where: { teacherId: teacher.id, classId, id: { in: marks.map((m) => m.studentId) } },
    select: { id: true },
  })
  const allowedIds = new Set(allowed.map((s) => s.id))
  const clean = marks
    .filter((m) => allowedIds.has(m.studentId))
    .map((m) => ({
      studentId: m.studentId,
      status: m.status,
      excusedScope: m.status === "EXCUSED" ? (m.scope ?? "BREAK") : null,
      note: m.note || null,
    }))

  const sessionDate = dateKeyToDate(date)
  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.attendanceSession.findUnique({
      where: { classId_sessionDate_breakNo: { classId, sessionDate, breakNo } },
      select: { id: true, records: { select: { studentId: true, status: true, excusedScope: true, note: true } } },
    })

    const session = existing
      ? await tx.attendanceSession.update({ where: { id: existing.id }, data: { editedAt: now } })
      : await tx.attendanceSession.create({
          data: { teacherId: teacher.id, classId, sessionDate, breakNo, recordedAt: now },
        })

    await tx.attendanceRecord.deleteMany({
      where: { sessionId: session.id, studentId: { in: clean.map((m) => m.studentId) } },
    })
    await tx.attendanceRecord.createMany({ data: clean.map((m) => ({ ...m, sessionId: session.id })) })

    return { session, before: existing?.records ?? null }
  })

  await audit({
    teacherId: teacher.id,
    entity: "attendance_session",
    entityId: result.session.id,
    action: result.before ? "update" : "create",
    oldValues: result.before,
    newValues: { date, breakNo, marks: clean },
  })

  revalidatePath("/dashboard")
  revalidatePath("/records")
  revalidatePath("/register")

  return ok({
    sessionId: result.session.id,
    recordedAt: result.session.recordedAt.toISOString(),
    editedAt: result.session.editedAt?.toISOString() ?? null,
    counts: countStatuses(clean.map((m) => m.status)),
    edited: Boolean(result.before),
  })
}

const cellSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.string().refine(isDateKey),
  breakNo: z.union([z.literal(1), z.literal(2)]),
  status: z.enum(["PRESENT", "ABSENT", "EXCUSED"]).nullable(),
})

/**
 * Marks or corrects one cell of the Monthly Register. Creates the break's
 * record when it was never taken; `null` clears the student's mark.
 */
export async function setRegisterCell(input: z.input<typeof cellSchema>): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const parsed = cellSchema.safeParse(input)
  if (!parsed.success) return fail("invalid")
  const { classId, studentId, date, breakNo, status } = parsed.data

  const student = await prisma.student.findFirst({
    where: { id: studentId, classId, teacherId: teacher.id },
    select: { id: true },
  })
  if (!student) return fail("notFound")

  const sessionDate = dateKeyToDate(date)
  const now = new Date()
  const { sessionId, before } = await prisma.$transaction(async (tx) => {
    const existing = await tx.attendanceSession.findUnique({
      where: { classId_sessionDate_breakNo: { classId, sessionDate, breakNo } },
      select: { id: true },
    })
    const session = existing
      ? await tx.attendanceSession.update({ where: { id: existing.id }, data: { editedAt: now } })
      : await tx.attendanceSession.create({ data: { teacherId: teacher.id, classId, sessionDate, breakNo, recordedAt: now } })

    const prev = await tx.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
      select: { status: true, excusedScope: true, note: true },
    })
    if (status === null) {
      if (prev) await tx.attendanceRecord.delete({ where: { sessionId_studentId: { sessionId: session.id, studentId } } })
    } else {
      await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId } },
        create: { sessionId: session.id, studentId, status, excusedScope: status === "EXCUSED" ? "BREAK" : null },
        update: { status, excusedScope: status === "EXCUSED" ? (prev?.excusedScope ?? "BREAK") : null },
      })
    }
    return { sessionId: session.id, before: prev }
  })

  await audit({
    teacherId: teacher.id,
    entity: "attendance_record",
    entityId: `${sessionId}:${studentId}`,
    action: before ? "update" : "create",
    oldValues: before,
    newValues: { status },
  })
  revalidatePath("/register")
  revalidatePath("/dashboard")
  return ok(undefined)
}

/** Emails the PDF receipt for a break to the signed-in teacher. */
export async function emailReceipt(sessionId: string): Promise<ActionResult> {
  const teacher = await requireTeacher()
  if (!hasEmail()) return fail("emailNotConfigured")

  const receipt = await buildReceipt(teacher.id, sessionId)
  if (!receipt) return fail("notFound")

  const result = await sendAttendanceReceipt(teacher.email, receipt.summary, receipt.bytes, receipt.fileName, receipt.language)
  if (result === "sent") return ok(undefined)
  return fail(result === "testMode" ? "emailTestMode" : "emailFailed")
}
