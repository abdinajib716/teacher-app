import "server-only"
import { prisma } from "@/lib/prisma"
import { countStatuses, attendanceRate, type Counts, type Status } from "@/lib/attendance"
import { dateKeyToDate, dateToDateKey, eachDay, isSchoolDay, monthBounds, type DateKey } from "@/lib/time"

export type RegisterStudent = {
  id: string
  name: string
  studentNo: string | null
  gender: "MALE" | "FEMALE"
  guardianPhone: string | null
  counts: Counts
  rate: number | null
}

export type Register = {
  classId: string
  className: string
  month: string
  /** School days of the month, plus any off day that has attendance on it. */
  days: DateKey[]
  students: RegisterStudent[]
  /** `${studentId}|${date}|${break}` → status */
  cells: Record<string, Status>
  /** `${date}|${break}` → session id, for the breaks that were taken */
  sessions: Record<string, string>
  boys: number
  girls: number
}

export const cellKey = (studentId: string, date: DateKey, breakNo: number) => `${studentId}|${date}|${breakNo}`
export const sessionKey = (date: DateKey, breakNo: number) => `${date}|${breakNo}`

/** The paper register for one class and month, as data. */
export async function loadRegister(
  teacherId: string,
  classId: string,
  month: string,
  schoolDays: number[]
): Promise<Register | null> {
  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, teacherId }, select: { id: true, name: true } })
  if (!cls) return null
  const { from, to } = monthBounds(month)

  const sessions = await prisma.attendanceSession.findMany({
    where: { teacherId, classId, sessionDate: { gte: dateKeyToDate(from), lte: dateKeyToDate(to) } },
    select: { id: true, sessionDate: true, breakNo: true, records: { select: { studentId: true, status: true } } },
  })

  const cells: Record<string, Status> = {}
  const sessionIds: Record<string, string> = {}
  const takenDays = new Set<DateKey>()
  const markedIds = new Set<string>()
  for (const s of sessions) {
    const d = dateToDateKey(s.sessionDate)
    takenDays.add(d)
    sessionIds[sessionKey(d, s.breakNo)] = s.id
    for (const r of s.records) {
      cells[cellKey(r.studentId, d, s.breakNo)] = r.status
      markedIds.add(r.studentId)
    }
  }

  const students = await prisma.student.findMany({
    where: { teacherId, classId, OR: [{ archived: false }, { id: { in: [...markedIds] } }] },
    select: { id: true, name: true, studentNo: true, gender: true, guardian: { select: { phone1: true } } },
    orderBy: { name: "asc" },
  })

  const days = eachDay(from, to).filter((d) => isSchoolDay(d, schoolDays) || takenDays.has(d))

  const rows: RegisterStudent[] = students.map((s) => {
    const statuses = days.flatMap((d) => [cells[cellKey(s.id, d, 1)], cells[cellKey(s.id, d, 2)]])
    const counts = countStatuses(statuses)
    return {
      id: s.id,
      name: s.name,
      studentNo: s.studentNo,
      gender: s.gender,
      guardianPhone: s.guardian?.phone1 ?? null,
      counts,
      rate: attendanceRate(counts),
    }
  })

  return {
    classId: cls.id,
    className: cls.name,
    month,
    days,
    students: rows,
    cells,
    sessions: sessionIds,
    boys: rows.filter((s) => s.gender === "MALE").length,
    girls: rows.filter((s) => s.gender === "FEMALE").length,
  }
}
