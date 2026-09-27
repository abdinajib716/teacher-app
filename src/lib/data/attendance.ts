import "server-only"
import { prisma } from "@/lib/prisma"
import { initialMarks, type BreakNo, type Mark } from "@/lib/attendance"
import { dateKeyToDate, type DateKey } from "@/lib/time"

export type SheetStudent = { id: string; name: string; studentNo: string | null; gender: "MALE" | "FEMALE" }

export type Sheet = {
  session: { id: string; recordedAt: Date; editedAt: Date | null } | null
  students: SheetStudent[]
  marks: Record<string, Mark | null>
}

/**
 * Everything the Take Attendance screen needs for one class, date and break.
 *
 * Students archived since the break was taken still appear when they have a
 * saved mark on it, so editing an old record never silently drops them.
 */
export async function loadSheet(teacherId: string, classId: string, date: DateKey, breakNo: BreakNo): Promise<Sheet | null> {
  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, teacherId }, select: { id: true } })
  if (!cls) return null
  const sessionDate = dateKeyToDate(date)

  const [session, otherBreak] = await Promise.all([
    prisma.attendanceSession.findUnique({
      where: { classId_sessionDate_breakNo: { classId, sessionDate, breakNo } },
      select: {
        id: true,
        recordedAt: true,
        editedAt: true,
        records: { select: { studentId: true, status: true, excusedScope: true, note: true } },
      },
    }),
    prisma.attendanceSession.findUnique({
      where: { classId_sessionDate_breakNo: { classId, sessionDate, breakNo: breakNo === 1 ? 2 : 1 } },
      select: { records: { where: { status: "EXCUSED", excusedScope: "DAY" }, select: { studentId: true, note: true } } },
    }),
  ])

  const markedIds = session?.records.map((r) => r.studentId) ?? []
  const students = await prisma.student.findMany({
    where: { teacherId, classId, OR: [{ archived: false }, { id: { in: markedIds } }] },
    select: { id: true, name: true, studentNo: true, gender: true },
    orderBy: [{ name: "asc" }],
  })

  const existing = session
    ? new Map<string, Mark>(
        session.records.map((r) => [r.studentId, { status: r.status, scope: r.excusedScope, note: r.note }])
      )
    : null
  const wholeDayExcused = new Map((otherBreak?.records ?? []).map((r) => [r.studentId, r.note]))
  const marks = initialMarks(
    students.map((s) => s.id),
    { existing, wholeDayExcused }
  )

  return {
    session: session ? { id: session.id, recordedAt: session.recordedAt, editedAt: session.editedAt } : null,
    students,
    marks: Object.fromEntries(marks),
  }
}
