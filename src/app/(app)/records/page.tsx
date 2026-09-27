import Link from "next/link"
import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { Download, Pencil } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings, activeClasses } from "@/lib/data/teacher"
import { countStatuses } from "@/lib/attendance"
import { dateKeyToDate, dateToDateKey, eachDay, formatDateKey, formatDateTime, isSchoolDay } from "@/lib/time"
import { rangeFromParams } from "@/lib/range"
import { PageHeader, EmptyState, Toolbar } from "@/components/app/page-header"
import { DateRangeFilter, ParamSelect, ParamSwitch } from "@/components/app/filters"
import { Stamp } from "@/components/app/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableFrame, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata: Metadata = { title: "Attendance Records" }

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; classId?: string; break?: string; notTaken?: string }>
}) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("records")
  const tc = await getTranslations("common")
  const ts = await getTranslations("status")
  const tn = await getTranslations("dashboard.today")
  const locale = await getLocale()
  const classes = await activeClasses(teacher.id)

  const range = rangeFromParams(sp, 14)
  const classId = classes.some((c) => c.id === sp.classId) ? sp.classId! : ""
  const breakNo = sp.break === "1" || sp.break === "2" ? Number(sp.break) : null
  const notTaken = sp.notTaken === "1"

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      teacherId: teacher.id,
      sessionDate: { gte: dateKeyToDate(range.from), lte: dateKeyToDate(range.to) },
      ...(classId ? { classId } : {}),
      ...(breakNo ? { breakNo } : {}),
    },
    select: {
      id: true,
      classId: true,
      sessionDate: true,
      breakNo: true,
      recordedAt: true,
      editedAt: true,
      class: { select: { name: true } },
      records: { select: { status: true } },
    },
    orderBy: [{ sessionDate: "desc" }, { class: { name: "asc" } }, { breakNo: "asc" }],
    take: 1000,
  })

  // "Not taken": every school day × class × break in the range with no record.
  const missing = notTaken
    ? (() => {
        const taken = new Set(sessions.map((s) => `${dateToDateKey(s.sessionDate)}|${s.classId}|${s.breakNo}`))
        const targetClasses = classId ? classes.filter((c) => c.id === classId) : classes
        return eachDay(range.from, range.to)
          .filter((d) => isSchoolDay(d, teacher.schoolDays))
          .reverse()
          .flatMap((d) =>
            targetClasses.flatMap((c) =>
              (breakNo ? [breakNo] : [1, 2])
                .filter((b) => !taken.has(`${d}|${c.id}|${b}`))
                .map((b) => ({ date: d, classId: c.id, className: c.name, breakNo: b }))
            )
          )
      })()
    : []

  const filters = (
    <Toolbar>
      <DateRangeFilter from={range.from} to={range.to} />
      <ParamSelect name="classId" value={classId} label={tc("class")} allLabel={tc("all")} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
      <ParamSelect
        name="break"
        value={breakNo ? String(breakNo) : ""}
        label={tc("break")}
        allLabel={t("allBreaks")}
        options={[1, 2].map((b) => ({ value: String(b), label: tc("breakN", { n: b }) }))}
      />
      <ParamSwitch name="notTaken" checked={notTaken} label={t("notTakenOnly")} />
    </Toolbar>
  )

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {filters}

      {notTaken ? (
        missing.length === 0 ? (
          <EmptyState title={t("notTakenEmpty")} />
        ) : (
          <TableFrame>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("date")}</TableHead>
                  <TableHead>{tc("class")}</TableHead>
                  <TableHead>{tc("break")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {missing.slice(0, 500).map((m) => (
                  <TableRow key={`${m.date}-${m.classId}-${m.breakNo}`}>
                    <TableCell className="whitespace-nowrap text-[13px]">{formatDateKey(m.date, locale)}</TableCell>
                    <TableCell className="font-serif text-[15px] font-semibold">{m.className}</TableCell>
                    <TableCell className="num">{m.breakNo}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{tc("notTaken")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={`/attendance?classId=${m.classId}&date=${m.date}&break=${m.breakNo}`}>{tn("take")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        )
      ) : sessions.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("date")}</TableHead>
                <TableHead>{tc("class")}</TableHead>
                <TableHead>{tc("break")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("recordedAt")}</TableHead>
                <TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1.5"><Stamp status="PRESENT" size="sm" /> <span className="hidden xl:inline">{ts("PRESENT")}</span></span></TableHead>
                <TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1.5"><Stamp status="ABSENT" size="sm" /> <span className="hidden xl:inline">{ts("ABSENT")}</span></span></TableHead>
                <TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1.5"><Stamp status="EXCUSED" size="sm" /> <span className="hidden xl:inline">{ts("EXCUSED")}</span></span></TableHead>
                <TableHead />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => {
                const d = dateToDateKey(s.sessionDate)
                const c = countStatuses(s.records.map((r) => r.status))
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-[13px]">{formatDateKey(d, locale)}</TableCell>
                    <TableCell className="font-serif text-[15px] font-semibold">{s.class.name}</TableCell>
                    <TableCell className="num">{s.breakNo}</TableCell>
                    <TableCell className="num hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                      {formatDateTime(s.recordedAt, locale)}
                    </TableCell>
                    <TableCell className="text-right num font-medium text-present">{c.present}</TableCell>
                    <TableCell className="text-right num font-medium text-absent">{c.absent}</TableCell>
                    <TableCell className="text-right num font-medium text-excused">{c.excused}</TableCell>
                    <TableCell>
                      {s.editedAt && (
                        <Badge variant="warning" title={formatDateTime(s.editedAt, locale)}>
                          {tc("edited")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label={t("receipt")} title={t("receipt")}>
                        <a href={`/api/receipts/${s.id}`} download>
                          <Download />
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/attendance?classId=${s.classId}&date=${d}&break=${s.breakNo}&edit=1`}>
                          <Pencil /> {tc("open")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </>
  )
}
