import Link from "next/link"
import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { FileSpreadsheet, FileText } from "lucide-react"
import { requireTeacherSettings, activeClasses } from "@/lib/data/teacher"
import { buildReport, isReportType, REPORT_TYPES } from "@/lib/data/reports"
import { attendanceRate, type Status } from "@/lib/attendance"
import { rangeFromParams } from "@/lib/range"
import { PageHeader, EmptyState, Toolbar } from "@/components/app/page-header"
import { FigureStrip } from "@/components/app/back-link"
import { DateRangeFilter, ParamSelect } from "@/components/app/filters"
import { RateText, Stamp } from "@/components/app/status"
import { Button } from "@/components/ui/button"
import { Table, TableFrame, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Reports" }

const STATUS_BY_LETTER: Record<string, Status> = { P: "PRESENT", A: "ABSENT", E: "EXCUSED" }

const TONE_CLASS = {
  present: "text-present font-semibold",
  absent: "text-absent font-semibold",
  excused: "text-excused font-medium",
  muted: "text-muted-foreground",
  none: "",
} as const

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string; classId?: string }>
}) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("reports")
  const tc = await getTranslations("common")
  const ts = await getTranslations("status")
  const locale = await getLocale()
  const classes = await activeClasses(teacher.id)

  const type = isReportType(sp.type) ? sp.type : "daily"
  const range = rangeFromParams(sp, 30)
  const classId = classes.some((c) => c.id === sp.classId) ? sp.classId! : ""

  const report = await buildReport({
    teacherId: teacher.id,
    type,
    range,
    classId: classId || undefined,
    threshold: teacher.lowAttendanceThreshold,
    locale,
  })
  const exportHref = (format: "pdf" | "xlsx") =>
    `/api/export/report?${new URLSearchParams({ type, from: range.from, to: range.to, ...(classId ? { classId } : {}), format })}`

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={exportHref("pdf")} download>
                <FileText /> {tc("exportPdf")}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={exportHref("xlsx")} download>
                <FileSpreadsheet /> {tc("exportExcel")}
              </a>
            </Button>
          </>
        }
      />

      <nav className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]" aria-label={t("type")}>
        {REPORT_TYPES.map((r) => {
          const p = new URLSearchParams({ type: r, from: range.from, to: range.to, ...(classId ? { classId } : {}) })
          return (
            <Link
              key={r}
              href={`/reports?${p}`}
              aria-current={r === type ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13.5px] transition-colors",
                r === type ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "low" ? t("types.low", { threshold: teacher.lowAttendanceThreshold }) : t(`types.${r}`)}
            </Link>
          )
        })}
      </nav>

      <Toolbar>
        <DateRangeFilter from={range.from} to={range.to} />
        <ParamSelect name="classId" value={classId} label={tc("class")} allLabel={tc("all")} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
      </Toolbar>

      <FigureStrip
        className="mb-5"
        items={[
          { label: ts("PRESENT"), value: report.totals.present, tone: "text-present" },
          { label: ts("ABSENT"), value: report.totals.absent, tone: "text-absent" },
          { label: ts("EXCUSED"), value: report.totals.excused, tone: "text-excused" },
          { label: t("overallRate"), value: <RateText rate={attendanceRate(report.totals)} threshold={teacher.lowAttendanceThreshold} /> },
        ]}
      />

      {report.rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                {report.columns.map((c) => (
                  <TableHead key={c.header} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center")}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => {
                    const c = typeof cell === "string" ? { text: cell } : cell
                    const align = report.columns[j]?.align
                    return (
                      <TableCell
                        key={j}
                        className={cn(
                          "text-[13px]",
                          align === "right" && "num text-right",
                          align === "center" && "text-center",
                          "bold" in c && c.bold && "font-semibold",
                          "tone" in c && c.tone && TONE_CLASS[c.tone]
                        )}
                      >
                        {"stamp" in c && c.stamp ? (
                          <span className="inline-flex items-center gap-2">
                            <Stamp status={STATUS_BY_LETTER[c.stamp] ?? null} size="sm" />
                            {c.text}
                          </span>
                        ) : (
                          c.text
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("excusedNote")}</p>
    </>
  )
}
