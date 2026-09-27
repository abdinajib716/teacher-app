import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { classTotals } from "@/lib/data/stats"
import { attendanceRate, emptyCounts } from "@/lib/attendance"
import { addDays, todayKey } from "@/lib/time"
import { PageHeader } from "@/components/app/page-header"
import { ClassesView } from "@/components/classes/classes-view"

export const metadata: Metadata = { title: "Classes" }

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string; new?: string }>
}) {
  const sp = await searchParams
  const teacher = await requireTeacher()
  const t = await getTranslations("classes")
  const q = sp.q?.trim() ?? ""
  const showArchived = sp.archived === "1"
  const today = todayKey()

  const [classes, rates] = await Promise.all([
    prisma.schoolClass.findMany({
      where: {
        teacherId: teacher.id,
        archived: showArchived,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        archived: true,
        students: { where: { archived: false }, select: { gender: true } },
      },
      orderBy: { name: "asc" },
    }),
    classTotals(teacher.id, { from: addDays(today, -29), to: today }),
  ])

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ClassesView
        q={q}
        showArchived={showArchived}
        openNew={sp.new === "1"}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          archived: c.archived,
          boys: c.students.filter((s) => s.gender === "MALE").length,
          girls: c.students.filter((s) => s.gender === "FEMALE").length,
          rate: attendanceRate(rates.get(c.id) ?? emptyCounts()),
        }))}
      />
    </>
  )
}
