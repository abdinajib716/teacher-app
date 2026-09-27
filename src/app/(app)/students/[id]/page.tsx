import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { MessageSquareText, Phone } from "lucide-react"
import { MessageLink } from "@/components/app/contact-buttons"
import { guardianMessages } from "@/lib/data/guardian-message"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings } from "@/lib/data/teacher"
import { attendanceRate, countStatuses } from "@/lib/attendance"
import { dateToDateKey, formatDateKey } from "@/lib/time"
import { formatPhone, telHref } from "@/lib/phone"
import { PageHeader, EmptyState } from "@/components/app/page-header"
import { RateText, Stamp } from "@/components/app/status"
import { BackLink, FigureStrip, SectionTitle } from "@/components/app/back-link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableFrame, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata: Metadata = { title: "Student" }

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("students")
  const tc = await getTranslations("common")
  const ts = await getTranslations("status")
  const ta = await getTranslations("attendance")
  const locale = await getLocale()

  const student = await prisma.student.findFirst({
    where: { id, teacherId: teacher.id },
    select: {
      id: true,
      name: true,
      studentNo: true,
      gender: true,
      archived: true,
      class: { select: { id: true, name: true } },
      guardian: { select: { name: true, phone1: true, phone2: true } },
      records: {
        select: {
          status: true,
          excusedScope: true,
          note: true,
          session: { select: { classId: true, sessionDate: true, breakNo: true } },
        },
        orderBy: [{ session: { sessionDate: "desc" } }, { session: { breakNo: "desc" } }],
        take: 500,
      },
    },
  })
  if (!student) notFound()

  const counts = countStatuses(student.records.map((r) => r.status))
  const phones = [student.guardian?.phone1, student.guardian?.phone2].filter((p): p is string => Boolean(p))

  const message = student.guardian
    ? (
        await guardianMessages(teacher, [
          { id: student.id, name: student.name, className: student.class.name, guardianName: student.guardian.name },
        ])
      ).get(student.id)
    : undefined

  // One line per school day, Break 1 and Break 2 side by side, as on the sheet.
  type Rec = (typeof student.records)[number]
  const days = new Map<string, { classId: string; b: Partial<Record<1 | 2, Rec>> }>()
  for (const r of student.records) {
    const d = dateToDateKey(r.session.sessionDate)
    const day = days.get(d) ?? { classId: r.session.classId, b: {} }
    day.b[r.session.breakNo as 1 | 2] = r
    days.set(d, day)
  }

  return (
    <>
      <BackLink href="/students">{tc("students")}</BackLink>
      <PageHeader
        eyebrow={
          <span className="num normal-case tracking-normal">
            {[student.studentNo, student.class.name, student.gender === "MALE" ? `${tc("male")} · Wiil` : `${tc("female")} · Gabar`]
              .filter(Boolean)
              .join("  ·  ")}
          </span>
        }
        title={student.name}
        actions={
          <>
            {student.archived && <Badge variant="secondary">{tc("archived")}</Badge>}
            {phones.map((p) => (
              <span key={p} className="flex gap-2">
                <Button asChild>
                  <a href={telHref(p)}>
                    <Phone /> {t("callGuardian")} <span className="num opacity-80">{formatPhone(p)}</span>
                  </a>
                </Button>
                {message && (
                  <Button asChild variant="outline">
                    <MessageLink phone={p} body={message}>
                      <MessageSquareText /> {t("messageGuardian")}
                    </MessageLink>
                  </Button>
                )}
              </span>
            ))}
          </>
        }
      />

      <FigureStrip
        items={[
          { label: t("overall"), value: <RateText rate={attendanceRate(counts)} threshold={teacher.lowAttendanceThreshold} /> },
          { label: ts("PRESENT"), value: counts.present, tone: "text-present" },
          { label: ts("ABSENT"), value: counts.absent, tone: "text-absent" },
          { label: t("excusedDays"), value: counts.excused, tone: "text-excused" },
          {
            label: tc("guardian"),
            value: (
              <span className="block font-sans text-base font-semibold">
                <span className="block truncate">{student.guardian?.name ?? "—"}</span>
                <span className="num block text-xs font-normal text-muted-foreground">{phones.map(formatPhone).join(" · ")}</span>
              </span>
            ),
          },
        ]}
      />

      {message && phones.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <p className="eyebrow">{t("messagePreview")}</p>
            <Link href="/settings#message" className="text-xs font-medium text-primary hover:underline">
              {t("editMessage")}
            </Link>
          </div>
          <p className="whitespace-pre-line px-4 py-3 text-[13.5px] leading-relaxed">{message}</p>
        </div>
      )}

      <SectionTitle>{t("history")}</SectionTitle>
      {days.size === 0 ? (
        <EmptyState title={t("noHistory")} />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("date")}</TableHead>
                <TableHead className="w-24 text-center">{tc("breakN", { n: 1 })}</TableHead>
                <TableHead className="w-24 text-center">{tc("breakN", { n: 2 })}</TableHead>
                <TableHead>{tc("note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...days.entries()].map(([d, day]) => {
                const notes = ([1, 2] as const)
                  .flatMap((b) => {
                    const r = day.b[b]
                    if (!r) return []
                    const bits = [r.excusedScope === "DAY" ? ta("wholeDay") : null, r.note].filter(Boolean)
                    return bits.length ? [`${b}: ${bits.join(" · ")}`] : []
                  })
                  .join("   ")
                return (
                  <TableRow key={d}>
                    <TableCell className="whitespace-nowrap text-[13px]">{formatDateKey(d, locale)}</TableCell>
                    {([1, 2] as const).map((b) => (
                      <TableCell key={b} className="text-center">
                        <Link
                          href={`/attendance?classId=${day.classId}&date=${d}&break=${b}${day.b[b] ? "&edit=1" : ""}`}
                          className="inline-flex"
                          aria-label={`${formatDateKey(d, locale)} · ${tc("breakN", { n: b })}`}
                        >
                          {day.b[b] ? <Stamp status={day.b[b]!.status} /> : <span className="num text-border-strong">·</span>}
                        </Link>
                      </TableCell>
                    ))}
                    <TableCell className="text-[13px] text-muted-foreground">{notes}</TableCell>
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
