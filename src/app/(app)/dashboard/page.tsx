import Link from "next/link"
import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { ArrowRight, Check, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings } from "@/lib/data/teacher"
import { breakTotals, classTotals, dailyTotals, lowAttendance, totals } from "@/lib/data/stats"
import { attendanceRate, emptyCounts } from "@/lib/attendance"
import {
  dateKeyToDate,
  dateToDateKey,
  eachDay,
  formatDateKey,
  formatDateTime,
  formatTime,
  isSchoolDay,
  monthBounds,
  monthOf,
  todayKey,
} from "@/lib/time"
import { rangeFromParams } from "@/lib/range"
import { guardianMessages } from "@/lib/data/guardian-message"
import { ContactButtons } from "@/components/app/contact-buttons"
import { PageHeader } from "@/components/app/page-header"
import { DateRangeFilter } from "@/components/app/filters"
import { RateText } from "@/components/app/status"
import { TrendChart, ShareStrip, RateList } from "@/components/dashboard/charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("dashboard")
  const tc = await getTranslations("common")
  const tcl = await getTranslations("classes")
  const locale = await getLocale()

  const today = todayKey()
  const month = monthBounds(monthOf(today))
  // Default range: this month so far. The filter applies to every figure and
  // chart that is not explicitly about today.
  const range = sp.from || sp.to ? rangeFromParams(sp) : { from: month.from, to: today }
  const isThisMonth = range.from === month.from && range.to === today
  const teacherId = teacher.id
  const threshold = teacher.lowAttendanceThreshold

  const [studentCount, classes, todayCounts, rangeCounts, byDay, byBreak, byClass, atRisk, todaySessions, recent] =
    await Promise.all([
      prisma.student.count({ where: { teacherId, archived: false } }),
      prisma.schoolClass.findMany({
        where: { teacherId, archived: false },
        select: { id: true, name: true, _count: { select: { students: { where: { archived: false } } } } },
        orderBy: { name: "asc" },
      }),
      totals(teacherId, { from: today, to: today }),
      totals(teacherId, range),
      dailyTotals(teacherId, range),
      breakTotals(teacherId, range),
      classTotals(teacherId, range),
      lowAttendance(teacherId, range, threshold),
      prisma.attendanceSession.findMany({
        where: { teacherId, sessionDate: dateKeyToDate(today) },
        select: { classId: true, breakNo: true, recordedAt: true, editedAt: true },
      }),
      prisma.attendanceSession.findMany({
        where: { teacherId },
        orderBy: [{ editedAt: { sort: "desc", nulls: "last" } }, { recordedAt: "desc" }],
        take: 6,
        select: {
          id: true,
          classId: true,
          sessionDate: true,
          breakNo: true,
          recordedAt: true,
          editedAt: true,
          class: { select: { name: true } },
          _count: { select: { records: { where: { status: "ABSENT" } } } },
        },
      }),
    ])

  const riskGuardians = await prisma.student.findMany({
    where: { teacherId, id: { in: atRisk.slice(0, 6).map((s) => s.id) } },
    select: { id: true, guardian: { select: { name: true, phone1: true, phone2: true } } },
  })
  const guardianOf = new Map(riskGuardians.map((g) => [g.id, g.guardian]))
  const riskMessages = await guardianMessages(
    teacher,
    atRisk
      .slice(0, 6)
      .filter((s) => guardianOf.get(s.id)?.phone1 || guardianOf.get(s.id)?.phone2)
      .map((s) => ({ id: s.id, name: s.name, className: s.className, guardianName: guardianOf.get(s.id)?.name ?? null }))
  )

  const taken = new Map(todaySessions.map((s) => [`${s.classId}|${s.breakNo}`, s]))
  const totalBreaks = classes.length * 2
  const schoolDay = isSchoolDay(today, teacher.schoolDays)

  const trend = eachDay(range.from, range.to)
    .filter((d) => byDay.has(d) || isSchoolDay(d, teacher.schoolDays))
    .map((d) => ({
      day: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(dateKeyToDate(d)),
      rate: attendanceRate(byDay.get(d) ?? emptyCounts()),
    }))

  const figures = [
    { label: t("kpi.todayRate"), value: <RateText rate={attendanceRate(todayCounts)} threshold={threshold} /> },
    { label: isThisMonth ? t("kpi.monthRate") : t("kpi.rangeRate"), value: <RateText rate={attendanceRate(rangeCounts)} threshold={threshold} /> },
    { label: t("kpi.excusedToday"), value: todayCounts.excused },
    { label: t("kpi.atRisk"), value: <span className={cn(atRisk.length > 0 && "text-absent")}>{atRisk.length}</span>, hint: t("kpi.atRiskHint", { threshold }) },
    { label: t("kpi.students"), value: studentCount },
    { label: t("kpi.classes"), value: classes.length },
  ]

  return (
    <>
      <PageHeader
        eyebrow={formatDateKey(today, locale)}
        title={t("greeting", { name: teacher.name.split(" ")[0] })}
        subtitle={t("subtitle")}
        actions={<DateRangeFilter from={range.from} to={range.to} />}
      />

      {/* Today: the work to do, first. */}
      <Card>
        <CardHeader className="flex-wrap">
          <div className="flex items-baseline gap-3">
            <CardTitle className="whitespace-nowrap font-serif text-lg">{t("today.title")}</CardTitle>
            <span className="num whitespace-nowrap text-xs text-muted-foreground">{t("kpi.breaksTodayValue", { taken: taken.size, total: totalBreaks })}</span>
          </div>
          {!schoolDay && <span className="rounded-sm bg-excused-bg px-2 py-0.5 text-xs font-medium text-excused">{t("today.offDay")}</span>}
        </CardHeader>
        {classes.length === 0 ? (
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("today.noClasses")}</p>
            <Button asChild size="sm">
              <Link href="/classes?new=1">
                <Plus /> {t("today.addClass")}
              </Link>
            </Button>
          </CardContent>
        ) : (
          <div>
            <div className="hidden grid-cols-[1fr_1fr_1fr] border-b border-border bg-muted/50 px-5 py-2 sm:grid">
              <span className="eyebrow">{tc("class")}</span>
              <span className="eyebrow">{tc("breakN", { n: 1 })}</span>
              <span className="eyebrow">{tc("breakN", { n: 2 })}</span>
            </div>
            <ul>
              {classes.map((c) => (
                <li key={c.id} className="grid grid-cols-1 items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[1fr_1fr_1fr] sm:px-5">
                  <div className="flex items-baseline gap-2">
                    <Link href={`/classes/${c.id}`} className="font-serif text-[17px] font-semibold hover:underline">
                      {c.name}
                    </Link>
                    <span className="num text-xs text-muted-foreground">{tcl("studentCount", { count: c._count.students })}</span>
                  </div>
                  {([1, 2] as const).map((b) => {
                    const s = taken.get(`${c.id}|${b}`)
                    const href = `/attendance?classId=${c.id}&date=${today}&break=${b}${s ? "&edit=1" : ""}`
                    return s ? (
                      <Link
                        key={b}
                        href={href}
                        className="group flex h-11 items-center justify-between gap-2 rounded-md border border-present/30 bg-present-bg px-3 text-present"
                      >
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold">
                          <Check className="h-4 w-4" />
                          <span className="sm:hidden">{tc("breakN", { n: b })}</span>
                          <span className="num font-medium">{formatTime(s.editedAt ?? s.recordedAt, locale)}</span>
                        </span>
                        <Pencil className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" aria-label={t("today.edit")} />
                      </Link>
                    ) : (
                      <Link
                        key={b}
                        href={href}
                        className="flex h-11 items-center justify-between gap-2 rounded-md border border-dashed border-border-strong bg-card px-3 text-[13px] transition-colors hover:border-primary hover:bg-primary-soft"
                      >
                        <span className="whitespace-nowrap text-muted-foreground">
                          <span className="sm:hidden">{tc("breakN", { n: b })} · </span>
                          {tc("notTaken")}
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-primary">
                          {t("today.take")} <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    )
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Figures, one ruled strip. */}
      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {figures.map((f) => (
          <div key={f.label} className="bg-card px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="num mt-1 text-2xl font-semibold leading-tight">{f.value}</dd>
            {f.hint && <dd className="text-[11px] text-muted-foreground">{f.hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("charts.trend")}</CardTitle>
            <span className="num flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-px w-4 border-t border-dashed border-absent" aria-hidden="true" /> {threshold}%
            </span>
          </CardHeader>
          <CardContent className="h-64">
            <TrendChart data={trend} threshold={threshold} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("charts.share")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ShareStrip counts={rangeCounts} />
            <div>
              <p className="eyebrow mb-2.5">{t("charts.breaks")}</p>
              <RateList
                threshold={threshold}
                items={[
                  { name: tc("breakN", { n: 1 }), rate: attendanceRate(byBreak[1]) },
                  { name: tc("breakN", { n: 2 }), rate: attendanceRate(byBreak[2]) },
                ]}
              />
            </div>
            {classes.length > 0 && (
              <div>
                <p className="eyebrow mb-2.5">{t("charts.byClass")}</p>
                <RateList threshold={threshold} items={classes.map((c) => ({ name: c.name, rate: attendanceRate(byClass.get(c.id) ?? emptyCounts()) }))} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("low.title")}</CardTitle>
            <Badge variant={atRisk.length ? "destructive" : "secondary"}>&lt; {threshold}%</Badge>
          </CardHeader>
          {atRisk.length === 0 ? (
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("low.empty")}</p>
            </CardContent>
          ) : (
            <ul>
              {atRisk.slice(0, 6).map((s) => {
                const g = guardianOf.get(s.id)
                const phone = g?.phone1 ?? g?.phone2
                return (
                  <li key={s.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 sm:px-5">
                    <Link href={`/students/${s.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="num block text-[11.5px] text-muted-foreground">
                        {s.className} · A {s.counts.absent} · P {s.counts.present}
                      </span>
                    </Link>
                    <RateText rate={s.rate} threshold={threshold} className="text-sm" />
                    {phone && <ContactButtons phone={phone} message={riskMessages.get(s.id)} showNumber={false} />}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("activity.title")}</CardTitle>
            <span className="text-[11px] text-muted-foreground">UTC+3</span>
          </CardHeader>
          {recent.length === 0 ? (
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
            </CardContent>
          ) : (
            <ol>
              {recent.map((s) => {
                const d = dateToDateKey(s.sessionDate)
                return (
                  <li key={s.id} className="border-b border-border last:border-0">
                    <Link
                      href={`/attendance?classId=${s.classId}&date=${d}&break=${s.breakNo}&edit=1`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 sm:px-5"
                    >
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", s.editedAt ? "bg-excused" : "bg-primary")}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {t("activity.saved", { className: s.class.name, date: formatDateKey(d, locale), breakNo: s.breakNo })}
                        </span>
                        <span className="num block text-[11.5px] text-muted-foreground">
                          {s.editedAt
                            ? t("activity.editedAt", { time: formatDateTime(s.editedAt, locale) })
                            : t("activity.recordedAt", { time: formatDateTime(s.recordedAt, locale) })}
                        </span>
                      </span>
                      {s._count.records > 0 && <Badge variant="destructive">A {s._count.records}</Badge>}
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      </div>
    </>
  )
}
