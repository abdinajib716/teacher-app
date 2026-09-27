import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings, activeClasses } from "@/lib/data/teacher"
import { studentTotals } from "@/lib/data/stats"
import { guardianMessages } from "@/lib/data/guardian-message"
import { attendanceRate, emptyCounts } from "@/lib/attendance"
import { PageHeader } from "@/components/app/page-header"
import { StudentsView } from "@/components/students/students-view"

export const metadata: Metadata = { title: "Students" }

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string; archived?: string; new?: string }>
}) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("students")
  const q = sp.q?.trim() ?? ""
  const showArchived = sp.archived === "1"
  const classes = await activeClasses(teacher.id)
  const classId = classes.some((c) => c.id === sp.classId) ? sp.classId! : ""

  const [students, guardians, rates] = await Promise.all([
    prisma.student.findMany({
      where: {
        teacherId: teacher.id,
        archived: showArchived,
        ...(classId ? { classId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { studentNo: { contains: q, mode: "insensitive" as const } },
                { guardian: { name: { contains: q, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        studentNo: true,
        gender: true,
        archived: true,
        classId: true,
        class: { select: { name: true } },
        guardian: { select: { id: true, name: true, phone1: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      take: 1000,
    }),
    prisma.guardian.findMany({
      where: { teacherId: teacher.id, archived: false },
      select: { id: true, name: true, phone1: true },
      orderBy: { name: "asc" },
    }),
    studentTotals(teacher.id, null),
  ])

  const messages = await guardianMessages(
    teacher,
    students
      .filter((s) => s.guardian?.phone1)
      .map((s) => ({ id: s.id, name: s.name, className: s.class.name, guardianName: s.guardian!.name }))
  )

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <StudentsView
        messages={Object.fromEntries(messages)}
        q={q}
        classId={classId}
        showArchived={showArchived}
        openNew={sp.new === "1"}
        classes={classes}
        guardians={guardians}
        threshold={teacher.lowAttendanceThreshold}
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          studentNo: s.studentNo,
          gender: s.gender,
          archived: s.archived,
          classId: s.classId,
          className: s.class.name,
          guardian: s.guardian,
          rate: attendanceRate(rates.get(s.id) ?? emptyCounts()),
        }))}
      />
    </>
  )
}
