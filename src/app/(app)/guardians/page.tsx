import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings } from "@/lib/data/teacher"
import { guardianMessages } from "@/lib/data/guardian-message"
import { normalizePhone } from "@/lib/phone"
import { PageHeader } from "@/components/app/page-header"
import { GuardiansView } from "@/components/guardians/guardians-view"

export const metadata: Metadata = { title: "Guardians" }

export default async function GuardiansPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string }> }) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("guardians")
  const q = sp.q?.trim() ?? ""
  const phone = normalizePhone(q)

  const guardians = await prisma.guardian.findMany({
    where: {
      teacherId: teacher.id,
      archived: sp.archived === "1",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { students: { some: { name: { contains: q, mode: "insensitive" as const } } } },
              ...(phone ? [{ phone1: phone }, { phone2: phone }] : []),
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phone1: true,
      phone2: true,
      archived: true,
      students: { where: { archived: false }, select: { id: true, name: true, class: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
    take: 1000,
  })

  const messages = await guardianMessages(
    teacher,
    guardians
      .filter((g) => g.phone1 || g.phone2)
      .flatMap((g) => g.students.map((s) => ({ id: s.id, name: s.name, className: s.class.name, guardianName: g.name })))
  )

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <GuardiansView
        messages={Object.fromEntries(messages)}
        q={q}
        showArchived={sp.archived === "1"}
        guardians={guardians.map((g) => ({
          ...g,
          students: g.students.map((s) => ({ id: s.id, name: s.name, className: s.class.name })),
        }))}
      />
    </>
  )
}
