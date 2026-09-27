import "server-only"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { attendanceRate, emptyCounts, STATUS_LETTER, type Counts } from "@/lib/attendance"
import { classTotals, dailyTotals, lowAttendance, studentTotals, type Range } from "@/lib/data/stats"
import { dateKeyToDate, dateToDateKey, formatDateKey } from "@/lib/time"
import { formatPhone } from "@/lib/phone"
import type { Cell } from "@/lib/pdf"

export const REPORT_TYPES = ["daily", "class", "student", "excused", "low"] as const
export type ReportType = (typeof REPORT_TYPES)[number]

export function isReportType(v: unknown): v is ReportType {
  return typeof v === "string" && (REPORT_TYPES as readonly string[]).includes(v)
}

export type Report = {
  title: string
  columns: { header: string; width: number; align?: "left" | "right" | "center" }[]
  rows: Cell[][]
  totals: Counts
}

const pct = (rate: number | null) => (rate === null ? "—" : `${rate}%`)
const num = (n: number) => String(n)

/**
 * Builds one report as a table. The Reports page renders it, and the PDF and
 * Excel exports print it, from this same value. Excused is always left out of
 * the percentage and shown in its own column.
 */
export async function buildReport(opts: {
  teacherId: string
  type: ReportType
  range: Range
  classId?: string
  threshold: number
  locale: string
}): Promise<Report> {
  const { teacherId, type, range, classId, threshold, locale } = opts
  const t = await getTranslations({ locale, namespace: "reports" })
  const tc = await getTranslations({ locale, namespace: "common" })
  const ts = await getTranslations({ locale, namespace: "status" })

  const countCols = [
    { header: ts("PRESENT"), width: 8, align: "right" as const },
    { header: ts("ABSENT"), width: 8, align: "right" as const },
    { header: ts("EXCUSED"), width: 8, align: "right" as const },
    { header: tc("rate"), width: 8, align: "right" as const },
  ]
  const countCells = (c: Counts): Cell[] => [num(c.present), num(c.absent), num(c.excused), { text: pct(attendanceRate(c)), bold: true }]

  if (type === "daily") {
    const byDay = await dailyTotals(teacherId, range, classId)
    const breaks = await prisma.attendanceSession.groupBy({
      by: ["sessionDate"],
      where: {
        teacherId,
        sessionDate: { gte: dateKeyToDate(range.from), lte: dateKeyToDate(range.to) },
        ...(classId ? { classId } : {}),
      },
      _count: true,
    })
    const breakCount = new Map(breaks.map((b) => [dateToDateKey(b.sessionDate), b._count]))
    const totals = emptyCounts()
    const rows = [...byDay.entries()].map(([day, c]) => {
      totals.present += c.present
      totals.absent += c.absent
      totals.excused += c.excused
      return [formatDateKey(day, locale), num(breakCount.get(day) ?? 0), ...countCells(c)]
    })
    return {
      title: t("types.daily"),
      columns: [{ header: tc("date"), width: 18 }, { header: t("breaksTaken"), width: 9, align: "right" }, ...countCols],
      rows,
      totals,
    }
  }

  if (type === "class") {
    const [per, classes] = await Promise.all([
      classTotals(teacherId, range),
      prisma.schoolClass.findMany({
        where: { teacherId, archived: false, ...(classId ? { id: classId } : {}) },
        select: { id: true, name: true, _count: { select: { students: { where: { archived: false } } } } },
        orderBy: { name: "asc" },
      }),
    ])
    const totals = emptyCounts()
    const rows = classes.map((c) => {
      const counts = per.get(c.id) ?? emptyCounts()
      totals.present += counts.present
      totals.absent += counts.absent
      totals.excused += counts.excused
      return [c.name, num(c._count.students), ...countCells(counts)]
    })
    return {
      title: t("types.class"),
      columns: [{ header: tc("class"), width: 16 }, { header: tc("students"), width: 9, align: "right" }, ...countCols],
      rows,
      totals,
    }
  }

  if (type === "student") {
    const [per, students] = await Promise.all([
      studentTotals(teacherId, range, classId),
      prisma.student.findMany({
        where: { teacherId, archived: false, ...(classId ? { classId } : {}) },
        select: { id: true, name: true, studentNo: true, class: { select: { name: true } } },
        orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      }),
    ])
    const totals = emptyCounts()
    const rows = students.map((s) => {
      const c = per.get(s.id) ?? emptyCounts()
      totals.present += c.present
      totals.absent += c.absent
      totals.excused += c.excused
      return [s.name, s.studentNo ?? "", s.class.name, ...countCells(c)]
    })
    return {
      title: t("types.student"),
      columns: [
        { header: tc("student"), width: 22 },
        { header: tc("studentNo"), width: 10 },
        { header: tc("class"), width: 10 },
        ...countCols,
      ],
      rows,
      totals,
    }
  }

  if (type === "excused") {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        status: "EXCUSED",
        session: {
          teacherId,
          sessionDate: { gte: dateKeyToDate(range.from), lte: dateKeyToDate(range.to) },
          ...(classId ? { classId } : {}),
        },
      },
      select: {
        excusedScope: true,
        note: true,
        student: { select: { name: true, guardian: { select: { phone1: true } } } },
        session: { select: { sessionDate: true, breakNo: true, class: { select: { name: true } } } },
      },
      orderBy: [{ session: { sessionDate: "desc" } }, { session: { breakNo: "asc" } }],
      take: 5000,
    })
    return {
      title: t("types.excused"),
      columns: [
        { header: tc("date"), width: 16 },
        { header: tc("break"), width: 6, align: "center" },
        { header: tc("student"), width: 20 },
        { header: tc("class"), width: 9 },
        { header: t("scope"), width: 14 },
        { header: tc("note"), width: 18 },
        { header: tc("guardianPhone"), width: 14 },
      ],
      rows: records.map((r) => [
        formatDateKey(dateToDateKey(r.session.sessionDate), locale),
        String(r.session.breakNo),
        r.student.name,
        r.session.class.name,
        { text: r.excusedScope === "DAY" ? t("wholeDay") : t("thisBreak"), tone: "excused", stamp: STATUS_LETTER.EXCUSED },
        r.note ?? "",
        formatPhone(r.student.guardian?.phone1),
      ]),
      totals: { present: 0, absent: 0, excused: records.length },
    }
  }

  const low = await lowAttendance(teacherId, range, threshold, classId)
  const students = await prisma.student.findMany({
    where: { id: { in: low.map((s) => s.id) } },
    select: { id: true, guardian: { select: { name: true, phone1: true } } },
  })
  const guardians = new Map(students.map((s) => [s.id, s.guardian]))
  return {
    title: t("types.low", { threshold }),
    columns: [
      { header: tc("student"), width: 20 },
      { header: tc("class"), width: 9 },
      ...countCols,
      { header: tc("guardian"), width: 16 },
      { header: tc("guardianPhone"), width: 14 },
    ],
    rows: low.map((s) => [
      s.name,
      s.className,
      num(s.counts.present),
      num(s.counts.absent),
      num(s.counts.excused),
      { text: pct(s.rate), tone: "absent" },
      guardians.get(s.id)?.name ?? "",
      formatPhone(guardians.get(s.id)?.phone1),
    ]),
    totals: low.reduce(
      (acc, s) => ({
        present: acc.present + s.counts.present,
        absent: acc.absent + s.counts.absent,
        excused: acc.excused + s.counts.excused,
      }),
      emptyCounts()
    ),
  }
}
