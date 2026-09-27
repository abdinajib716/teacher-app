import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { attendanceRate, emptyCounts, type Counts, type Status } from "@/lib/attendance"
import { dateKeyToDate, dateToDateKey, type DateKey } from "@/lib/time"

/**
 * Aggregates for the dashboard, reports and profiles. Every query here is
 * scoped by teacherId, and works in SQL so it stays fast at the PRD's capacity
 * (5,000 students and 500,000 records per teacher).
 */

export type Range = { from: DateKey; to: DateKey }

type StatusRow = { status: Status; n: bigint }

function add(c: Counts, status: Status, n: number) {
  if (status === "PRESENT") c.present += n
  else if (status === "ABSENT") c.absent += n
  else c.excused += n
}

const between = (range: Range) =>
  Prisma.sql`s."sessionDate" BETWEEN ${dateKeyToDate(range.from)}::date AND ${dateKeyToDate(range.to)}::date`

/** Present / Absent / Excused totals across the range. */
export async function totals(teacherId: string, range: Range, classId?: string): Promise<Counts> {
  const rows = await prisma.$queryRaw<StatusRow[]>`
    SELECT r.status::text AS status, COUNT(*) AS n
    FROM attendance_records r
    JOIN attendance_sessions s ON s.id = r."sessionId"
    WHERE s."teacherId" = ${teacherId} AND ${between(range)}
      ${classId ? Prisma.sql`AND s."classId" = ${classId}` : Prisma.empty}
    GROUP BY r.status`
  const c = emptyCounts()
  for (const r of rows) add(c, r.status, Number(r.n))
  return c
}

/** Totals per day, for the trend line. Days with no attendance are absent. */
export async function dailyTotals(teacherId: string, range: Range, classId?: string) {
  const rows = await prisma.$queryRaw<(StatusRow & { day: Date })[]>`
    SELECT s."sessionDate" AS day, r.status::text AS status, COUNT(*) AS n
    FROM attendance_records r
    JOIN attendance_sessions s ON s.id = r."sessionId"
    WHERE s."teacherId" = ${teacherId} AND ${between(range)}
      ${classId ? Prisma.sql`AND s."classId" = ${classId}` : Prisma.empty}
    GROUP BY s."sessionDate", r.status
    ORDER BY s."sessionDate"`
  const byDay = new Map<DateKey, Counts>()
  for (const r of rows) {
    const key = dateToDateKey(r.day)
    const c = byDay.get(key) ?? emptyCounts()
    add(c, r.status, Number(r.n))
    byDay.set(key, c)
  }
  return byDay
}

/** Totals per break (1 and 2). */
export async function breakTotals(teacherId: string, range: Range) {
  const rows = await prisma.$queryRaw<(StatusRow & { breakNo: number })[]>`
    SELECT s."breakNo" AS "breakNo", r.status::text AS status, COUNT(*) AS n
    FROM attendance_records r
    JOIN attendance_sessions s ON s.id = r."sessionId"
    WHERE s."teacherId" = ${teacherId} AND ${between(range)}
    GROUP BY s."breakNo", r.status`
  const out = { 1: emptyCounts(), 2: emptyCounts() } as Record<1 | 2, Counts>
  for (const r of rows) add(out[r.breakNo as 1 | 2], r.status, Number(r.n))
  return out
}

/** Totals per class. */
export async function classTotals(teacherId: string, range: Range) {
  const rows = await prisma.$queryRaw<(StatusRow & { classId: string })[]>`
    SELECT s."classId" AS "classId", r.status::text AS status, COUNT(*) AS n
    FROM attendance_records r
    JOIN attendance_sessions s ON s.id = r."sessionId"
    WHERE s."teacherId" = ${teacherId} AND ${between(range)}
    GROUP BY s."classId", r.status`
  const out = new Map<string, Counts>()
  for (const r of rows) {
    const c = out.get(r.classId) ?? emptyCounts()
    add(c, r.status, Number(r.n))
    out.set(r.classId, c)
  }
  return out
}

/** Totals per student, optionally for one class. */
export async function studentTotals(teacherId: string, range: Range | null, classId?: string) {
  const rows = await prisma.$queryRaw<(StatusRow & { studentId: string })[]>`
    SELECT r."studentId" AS "studentId", r.status::text AS status, COUNT(*) AS n
    FROM attendance_records r
    JOIN attendance_sessions s ON s.id = r."sessionId"
    WHERE s."teacherId" = ${teacherId}
      ${range ? Prisma.sql`AND ${between(range)}` : Prisma.empty}
      ${classId ? Prisma.sql`AND s."classId" = ${classId}` : Prisma.empty}
    GROUP BY r."studentId", r.status`
  const out = new Map<string, Counts>()
  for (const r of rows) {
    const c = out.get(r.studentId) ?? emptyCounts()
    add(c, r.status, Number(r.n))
    out.set(r.studentId, c)
  }
  return out
}

export type StudentRisk = {
  id: string
  name: string
  studentNo: string | null
  className: string
  counts: Counts
  rate: number
}

/** Active students whose rate over the range is below the threshold. */
export async function lowAttendance(teacherId: string, range: Range, threshold: number, classId?: string) {
  const [perStudent, students] = await Promise.all([
    studentTotals(teacherId, range, classId),
    prisma.student.findMany({
      where: { teacherId, archived: false, ...(classId ? { classId } : {}) },
      select: { id: true, name: true, studentNo: true, class: { select: { name: true } } },
    }),
  ])
  const out: StudentRisk[] = []
  for (const s of students) {
    const counts = perStudent.get(s.id)
    if (!counts) continue
    const rate = attendanceRate(counts)
    if (rate !== null && rate < threshold) {
      out.push({ id: s.id, name: s.name, studentNo: s.studentNo, className: s.class.name, counts, rate })
    }
  }
  return out.sort((a, b) => a.rate - b.rate)
}
