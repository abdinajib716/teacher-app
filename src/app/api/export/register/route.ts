import { NextResponse, type NextRequest } from "next/server"
import { getTranslations } from "next-intl/server"
import { getCurrentTeacher } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { loadRegister, cellKey } from "@/lib/data/register"
import { renderTable, type Cell, type Tone } from "@/lib/pdf"
import { workbook } from "@/lib/excel"
import { attendanceRate, STATUS_LETTER, STATUS_SOMALI, type Status } from "@/lib/attendance"
import { formatMonth, isMonthKey } from "@/lib/time"
import { formatPhone } from "@/lib/phone"
import { docChrome, statusLegend } from "@/lib/doc-labels"
import { CAJIIB } from "@/lib/cajiib-logo"

const TONE: Record<Status, Tone> = { PRESENT: "present", ABSENT: "absent", EXCUSED: "excused" }

/**
 * The Monthly Register as PDF or Excel, laid out like the paper sheet: one row
 * per student, two columns (Break 1, Break 2) per school day, and the
 * Wiilal / Gabdho / Wadar counts in the header.
 */
export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const classId = sp.get("classId") ?? ""
  const month = sp.get("month") ?? ""
  const format = sp.get("format") === "xlsx" ? "xlsx" : "pdf"
  if (!isMonthKey(month)) return NextResponse.json({ error: "bad month" }, { status: 400 })

  const settings = await prisma.user.findUniqueOrThrow({
    where: { id: teacher.id },
    select: { schoolDays: true, language: true, school: true, name: true },
  })
  const reg = await loadRegister(teacher.id, classId, month, settings.schoolDays)
  if (!reg) return NextResponse.json({ error: "not found" }, { status: 404 })

  const locale = settings.language
  const t = await getTranslations({ locale, namespace: "register" })
  const tc = await getTranslations({ locale, namespace: "common" })
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })

  const tp = await getTranslations({ locale, namespace: "pdf" })
  const ts = await getTranslations({ locale, namespace: "status" })
  const chrome = await docChrome(locale)
  const monthLabel = formatMonth(month, locale)
  const title = `${reg.className} - ${monthLabel}`
  const meta = [
    [settings.school, settings.name].filter(Boolean).join(" - "),
    `Wiilal (${tc("boys")}): ${reg.boys}    Gabdho (${tc("girls")}): ${reg.girls}    Wadar (${tc("total")}): ${reg.students.length}`,
  ]
  const legend = `P = ${STATUS_SOMALI.PRESENT}    A = ${STATUS_SOMALI.ABSENT}    E = ${STATUS_SOMALI.EXCUSED}    ${t("emptyMeans")}`
  const totals = reg.students.reduce(
    (acc, s) => ({ present: acc.present + s.counts.present, absent: acc.absent + s.counts.absent, excused: acc.excused + s.counts.excused }),
    { present: 0, absent: 0, excused: 0 }
  )
  const classRate = attendanceRate(totals)

  const dayLabel = (d: string) => `${weekday.format(new Date(`${d}T00:00:00Z`)).slice(0, 2)} ${Number(d.slice(8))}`
  const groups = [{ label: "", span: 3 }, ...reg.days.map((d) => ({ label: dayLabel(d), span: 2 })), { label: "", span: 4 }]
  const rows: Cell[][] = reg.students.map((s, i) => [
    String(i + 1),
    s.name,
    formatPhone(s.guardianPhone),
    ...reg.days.flatMap((d) =>
      [1, 2].map((b): Cell => {
        const st = reg.cells[cellKey(s.id, d, b)]
        return st ? { text: STATUS_LETTER[st], tone: TONE[st] } : ""
      })
    ),
    String(s.counts.present),
    String(s.counts.absent),
    String(s.counts.excused),
    s.rate === null ? "—" : `${s.rate}%`,
  ])

  const fileBase = `register_${reg.className.replace(/[^\w-]+/g, "_")}_${month}`

  if (format === "xlsx") {
    const buf = await workbook([
      {
        name: reg.className,
        appName: chrome.appName,
        kind: tp("kindRegister"),
        title,
        meta: [...meta, legend],
        credit: `${tp("builtBy")} ${CAJIIB.name} - ${CAJIIB.url}`,
        groups,
        columns: [
          { header: "#", width: 4 },
          { header: tc("student"), width: 28 },
          { header: tc("guardianPhone"), width: 17 },
          ...reg.days.flatMap(() => [
            { header: "B1", width: 4 },
            { header: "B2", width: 4 },
          ]),
          { header: "P", width: 5 },
          { header: "A", width: 5 },
          { header: "E", width: 5 },
          { header: "%", width: 7 },
        ],
        rows,
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
    kind: tp("kindRegister"),
    title,
    subtitle: t("title"),
    school: settings.school,
    teacher: settings.name,
    fields: [
      { label: tp("class"), value: reg.className },
      { label: tp("month"), value: monthLabel },
      { label: "Wiilal", value: String(reg.boys) },
      { label: "Gabdho", value: String(reg.girls) },
      { label: "Wadar", value: String(reg.students.length) },
      { label: tp("days"), value: String(reg.days.length) },
    ],
    stats: [
      { label: ts("PRESENT"), value: String(totals.present), tone: "present" },
      { label: ts("ABSENT"), value: String(totals.absent), tone: "absent" },
      { label: ts("EXCUSED"), value: String(totals.excused), tone: "excused" },
      { label: tp("rate"), value: classRate === null ? "-" : `${classRate}%` },
    ],
    landscape: true,
    fontSize: reg.days.length > 18 ? 5.5 : 6.5,
    groups,
    columns: [
      { header: "#", width: 2.2, align: "right" },
      { header: tc("student"), width: 13 },
      { header: tc("phone"), width: 8 },
      ...reg.days.flatMap(() => [
        { header: "1", width: 1.6, align: "center" as const },
        { header: "2", width: 1.6, align: "center" as const },
      ]),
      { header: "P", width: 2, align: "right" },
      { header: "A", width: 2, align: "right" },
      { header: "E", width: 2, align: "right" },
      { header: "%", width: 4.2, align: "right" },
    ],
    rows,
    legend: statusLegend(ts),
    notes: [t("emptyMeans"), tp("excusedNote")],
  })
  return new NextResponse(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${fileBase}.pdf"` },
  })
}
