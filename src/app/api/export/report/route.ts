import { NextResponse, type NextRequest } from "next/server"
import { getTranslations } from "next-intl/server"
import { getCurrentTeacher } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildReport, isReportType } from "@/lib/data/reports"
import { renderTable } from "@/lib/pdf"
import { workbook } from "@/lib/excel"
import { attendanceRate } from "@/lib/attendance"
import { formatDateKey, isDateKey } from "@/lib/time"
import { docChrome, statusLegend } from "@/lib/doc-labels"
import { CAJIIB } from "@/lib/cajiib-logo"

/** A report from the Reports page, as PDF or Excel. */
export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const type = sp.get("type")
  const from = sp.get("from")
  const to = sp.get("to")
  const classId = sp.get("classId") || undefined
  const format = sp.get("format") === "xlsx" ? "xlsx" : "pdf"
  if (!isReportType(type) || !isDateKey(from) || !isDateKey(to)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 })
  }

  const settings = await prisma.user.findUniqueOrThrow({
    where: { id: teacher.id },
    select: { language: true, lowAttendanceThreshold: true, school: true, name: true },
  })
  const locale = settings.language
  const report = await buildReport({
    teacherId: teacher.id,
    type,
    range: { from, to },
    classId,
    threshold: settings.lowAttendanceThreshold,
    locale,
  })
  const t = await getTranslations({ locale, namespace: "reports" })
  const ts = await getTranslations({ locale, namespace: "status" })
  const className = classId
    ? (await prisma.schoolClass.findFirst({ where: { id: classId, teacherId: teacher.id }, select: { name: true } }))?.name
    : null

  const meta = [
    [settings.school, settings.name].filter(Boolean).join(" - "),
    `${formatDateKey(from, locale, false)} - ${formatDateKey(to, locale, false)}${className ? `    ${className}` : ""}`,
  ]
  const rate = attendanceRate(report.totals)
  const after = [
    `${ts("PRESENT")}: ${report.totals.present}    ${ts("ABSENT")}: ${report.totals.absent}    ${ts("EXCUSED")}: ${report.totals.excused}    ${t("overallRate")}: ${rate === null ? "—" : `${rate}%`}`,
    t("excusedNote"),
  ]
  const fileBase = `report_${type}_${from}_${to}`
  const tp = await getTranslations({ locale, namespace: "pdf" })
  const chrome = await docChrome(locale)

  if (format === "xlsx") {
    const buf = await workbook([
      {
        name: report.title,
        appName: chrome.appName,
        kind: tp("kindReport"),
        title: report.title,
        meta,
        columns: report.columns,
        rows: report.rows,
        after,
        credit: `${tp("builtBy")} ${CAJIIB.name} - ${CAJIIB.url}`,
      },
    ])
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${fileBase}.xlsx"`,
      },
    })
  }

  const bytes = await renderTable({
    ...chrome,
    kind: tp("kindReport"),
    title: report.title,
    subtitle: `${formatDateKey(from, locale)} - ${formatDateKey(to, locale)}`,
    school: settings.school,
    teacher: settings.name,
    fields: [
      { label: tp("period"), value: `${formatDateKey(from, locale, false)} - ${formatDateKey(to, locale, false)}` },
      { label: tp("classFilter"), value: className ?? tp("allClasses") },
      { label: type === "student" || type === "low" ? tp("students") : tp("entries"), value: String(report.rows.length) },
    ],
    // The Excused report counts only excused marks: the other tiles would be zero.
    stats:
      type === "excused"
        ? [{ label: ts("EXCUSED"), value: String(report.totals.excused), tone: "excused" }]
        : [
            { label: ts("PRESENT"), value: String(report.totals.present), tone: "present" },
            { label: ts("ABSENT"), value: String(report.totals.absent), tone: "absent" },
            { label: ts("EXCUSED"), value: String(report.totals.excused), tone: "excused" },
            { label: t("overallRate"), value: rate === null ? "-" : `${rate}%` },
          ],
    columns: report.columns,
    rows: report.rows,
    legend: statusLegend(ts),
    notes: [t("excusedNote")],
    landscape: report.columns.length > 6,
  })
  return new NextResponse(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${fileBase}.pdf"` },
  })
}
