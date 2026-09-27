import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ClipboardCheck, CalendarDays } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings } from "@/lib/data/teacher"
import { studentTotals, totals } from "@/lib/data/stats"
import { attendanceRate } from "@/lib/attendance"
import { addDays, todayKey } from "@/lib/time"
import { formatPhone } from "@/lib/phone"
import { PageHeader, EmptyState } from "@/components/app/page-header"
import { RateBar, RateText } from "@/components/app/status"
import { BackLink, FigureStrip, SectionTitle } from "@/components/app/back-link"
import { Button } from "@/components/ui/button"
import { Table, TableFrame, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata: Metadata = { title: "Class" }

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("classes")
  const tc = await getTranslations("common")
  const tn = await getTranslations("nav")

  const cls = await prisma.schoolClass.findFirst({
    where: { id, teacherId: teacher.id },
    select: {
      id: true,
      name: true,
      description: true,
      students: {
        where: { archived: false },
        select: { id: true, name: true, studentNo: true, gender: true, guardian: { select: { name: true, phone1: true } } },
        orderBy: { name: "asc" },
      },
    },
  })
  if (!cls) notFound()

  const today = todayKey()
  const range = { from: addDays(today, -29), to: today }
  const [classCounts, perStudent] = await Promise.all([totals(teacher.id, range, cls.id), studentTotals(teacher.id, range, cls.id)])
  const boys = cls.students.filter((s) => s.gender === "MALE").length

  return (
    <>
      <BackLink href="/classes">{tc("classes")}</BackLink>
      <PageHeader
        eyebrow={tc("class")}
        title={cls.name}
        subtitle={cls.description ?? undefined}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/register?classId=${cls.id}`}>
                <CalendarDays /> {tn("register")}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/attendance?classId=${cls.id}`}>
                <ClipboardCheck /> {tn("attendance")}
              </Link>
            </Button>
          </>
        }
      />

      <FigureStrip
        items={[
          { label: <>Wiilal <span className="opacity-70">· {tc("boys")}</span></>, value: boys },
          { label: <>Gabdho <span className="opacity-70">· {tc("girls")}</span></>, value: cls.students.length - boys },
          { label: <>Wadar <span className="opacity-70">· {tc("total")}</span></>, value: cls.students.length },
          { label: t("rate30"), value: <RateText rate={attendanceRate(classCounts)} threshold={teacher.lowAttendanceThreshold} /> },
        ]}
      />

      <SectionTitle>{t("detailStudents")}</SectionTitle>
      {cls.students.length === 0 ? (
        <EmptyState title={tc("noResults")} />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-right">#</TableHead>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{tc("studentNo")}</TableHead>
                <TableHead>{tc("gender")}</TableHead>
                <TableHead>{tc("guardian")}</TableHead>
                <TableHead className="text-right">{tc("rate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cls.students.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="num text-right text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Link href={`/students/${s.id}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="num text-[13px] text-muted-foreground">{s.studentNo ?? "—"}</TableCell>
                  <TableCell>{s.gender === "MALE" ? tc("male") : tc("female")}</TableCell>
                  <TableCell className="text-sm">
                    {s.guardian ? (
                      <>
                        {s.guardian.name}
                        <span className="num block text-xs text-muted-foreground">{formatPhone(s.guardian.phone1)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end">
                      <RateBar rate={attendanceRate(perStudent.get(s.id) ?? { present: 0, absent: 0 })} threshold={teacher.lowAttendanceThreshold} />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </>
  )
}
