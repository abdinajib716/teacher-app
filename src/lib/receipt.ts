import "server-only"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { renderTable, type Cell, type Tone } from "@/lib/pdf"
import { attendanceRate, countStatuses, STATUS_LETTER, type Status } from "@/lib/attendance"
import { docChrome, statusLegend } from "@/lib/doc-labels"
import { dateToDateKey, formatDateKey, formatDateTime } from "@/lib/time"
import type { ReceiptSummary } from "@/lib/email"

const TONE: Record<Status, Tone> = { PRESENT: "present", ABSENT: "absent", EXCUSED: "excused" }

/**
 * The PDF receipt for one saved break, from a fixed template: class, date,
 * break, each student's status and the totals. Built on demand from the saved
 * record, so a receipt is always what the database says, and stamps
 * pdfGeneratedAt on the session.
 */
export async function buildReceipt(teacherId: string, sessionId: string) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, teacherId },
    select: {
      id: true,
      sessionDate: true,
      breakNo: true,
      recordedAt: true,
      editedAt: true,
      class: { select: { name: true } },
      teacher: { select: { name: true, school: true, language: true } },
      records: {
        select: {
          status: true,
          excusedScope: true,
          note: true,
          student: { select: { name: true, studentNo: true } },
        },
        orderBy: { student: { name: "asc" } },
      },
    },
  })
  if (!session) return null

  const locale = session.teacher.language
  const t = await getTranslations({ locale, namespace: "pdf" })
  const ts = await getTranslations({ locale, namespace: "status" })
  const dateKey = dateToDateKey(session.sessionDate)
  const date = formatDateKey(dateKey, locale)
  const breakLabel = t("breakN", { n: session.breakNo })
  const counts = countStatuses(session.records.map((r) => r.status))

  const rows: Cell[][] = session.records.map((r, i) => [
    String(i + 1),
    r.student.name,
    r.student.studentNo ?? "-",
    { text: ts(r.status), tone: TONE[r.status], stamp: STATUS_LETTER[r.status] },
    [r.excusedScope === "DAY" ? t("wholeDay") : "", r.note ?? ""].filter(Boolean).join(" - "),
  ])
  const rate = attendanceRate(counts)

  const bytes = await renderTable({
    ...(await docChrome(locale)),
    kind: t("kindReceipt"),
    title: `${session.class.name} - ${breakLabel}`,
    subtitle: date,
    school: session.teacher.school,
    teacher: session.teacher.name,
    fields: [
      { label: t("class"), value: session.class.name },
      { label: t("date"), value: formatDateKey(dateKey, locale, false) },
      { label: t("break"), value: String(session.breakNo), width: 0.6 },
      { label: t("recordedAt"), value: formatDateTime(session.recordedAt, locale), width: 1.7 },
      { label: t("editedAt"), value: session.editedAt ? formatDateTime(session.editedAt, locale) : "-", width: 1.7 },
    ],
    stats: [
      { label: ts("PRESENT"), value: String(counts.present), tone: "present" },
      { label: ts("ABSENT"), value: String(counts.absent), tone: "absent" },
      { label: ts("EXCUSED"), value: String(counts.excused), tone: "excused" },
      { label: t("total"), value: String(session.records.length) },
      { label: t("rate"), value: rate === null ? "-" : `${rate}%` },
    ],
    columns: [
      { header: "#", width: 3, align: "right" },
      { header: t("student"), width: 24 },
      { header: t("studentNo"), width: 10 },
      { header: t("status"), width: 13 },
      { header: t("note"), width: 18 },
    ],
    rows,
    legend: statusLegend(ts),
    notes: [t("excusedNote")],
  })

  await prisma.attendanceSession.update({ where: { id: session.id }, data: { pdfGeneratedAt: new Date() } })

  const safeClass = session.class.name.replace(/[^\w-]+/g, "_")
  const summary: ReceiptSummary = {
    className: session.class.name,
    date,
    breakLabel,
    ...counts,
    recordedAt: formatDateTime(session.recordedAt, locale),
  }
  return { bytes, fileName: `attendance_${safeClass}_${dateKey}_break${session.breakNo}.pdf`, summary, language: locale }
}
