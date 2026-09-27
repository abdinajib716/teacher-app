import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { attendanceRate, emptyCounts, type Status } from "@/lib/attendance"
import { effectiveTemplate, renderMessage, type MessageVars } from "@/lib/message"
import { dateKeyToDate, dateToDateKey, formatDateKey, formatMonth, monthBounds, monthOf, todayKey } from "@/lib/time"
import type { TeacherSettings } from "@/lib/data/teacher"

type StudentRef = { id: string; name: string; className: string; guardianName: string | null }

type TeacherRef = Pick<TeacherSettings, "id" | "name" | "school" | "language"> & { smsTemplate: string | null }

/**
 * The ready-to-send guardian message for each student, from the teacher's
 * template: absences and rate this month, and the last absence ever.
 */
export async function guardianMessages(teacher: TeacherRef, students: StudentRef[]): Promise<Map<string, string>> {
  const template = effectiveTemplate(teacher.smsTemplate, teacher.language)
  const vars = await guardianMessageVars(teacher, students)
  return new Map([...vars].map(([id, v]) => [id, renderMessage(template, v)]))
}

/** The placeholder values for each student, e.g. for the Settings preview. */
export async function guardianMessageVars(teacher: TeacherRef, students: StudentRef[]): Promise<Map<string, MessageVars>> {
  const out = new Map<string, MessageVars>()
  if (students.length === 0) return out

  const locale = teacher.language
  const today = todayKey()
  const month = monthOf(today)
  const { from, to } = monthBounds(month)
  const ids = students.map((s) => s.id)

  const [monthRows, lastRows] = await Promise.all([
    prisma.$queryRaw<{ studentId: string; status: Status; n: bigint }[]>`
      SELECT r."studentId" AS "studentId", r.status::text AS status, COUNT(*) AS n
      FROM attendance_records r
      JOIN attendance_sessions s ON s.id = r."sessionId"
      WHERE s."teacherId" = ${teacher.id}
        AND r."studentId" IN (${Prisma.join(ids)})
        AND s."sessionDate" BETWEEN ${dateKeyToDate(from)}::date AND ${dateKeyToDate(to)}::date
      GROUP BY r."studentId", r.status`,
    prisma.$queryRaw<{ studentId: string; last: Date }[]>`
      SELECT r."studentId" AS "studentId", MAX(s."sessionDate") AS last
      FROM attendance_records r
      JOIN attendance_sessions s ON s.id = r."sessionId"
      WHERE s."teacherId" = ${teacher.id}
        AND r."studentId" IN (${Prisma.join(ids)})
        AND r.status = 'ABSENT'
      GROUP BY r."studentId"`,
  ])

  const counts = new Map<string, ReturnType<typeof emptyCounts>>()
  for (const r of monthRows) {
    const c = counts.get(r.studentId) ?? emptyCounts()
    if (r.status === "PRESENT") c.present += Number(r.n)
    else if (r.status === "ABSENT") c.absent += Number(r.n)
    else c.excused += Number(r.n)
    counts.set(r.studentId, c)
  }
  const last = new Map(lastRows.map((r) => [r.studentId, dateToDateKey(r.last)]))

  const base = {
    teacher: teacher.name,
    school: teacher.school ?? "",
    month: formatMonth(month, locale),
    date: formatDateKey(today, locale, false),
  }
  for (const s of students) {
    const c = counts.get(s.id) ?? emptyCounts()
    const rate = attendanceRate(c)
    const lastAbsent = last.get(s.id)
    const vars: MessageVars = {
      ...base,
      guardian: s.guardianName ?? "",
      student: s.name,
      class: s.className,
      absences: String(c.absent),
      lastAbsent: lastAbsent ? formatDateKey(lastAbsent, locale, false) : "—",
      rate: rate === null ? "—" : `${rate}%`,
    }
    out.set(s.id, vars)
  }
  return out
}
