import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { requireTeacherSettings } from "@/lib/data/teacher"
import { guardianMessageVars } from "@/lib/data/guardian-message"
import { defaultTemplate, effectiveTemplate, type MessageVars } from "@/lib/message"
import { formatDateKey, formatMonth, monthOf, todayKey } from "@/lib/time"
import { PageHeader } from "@/components/app/page-header"
import { SettingsForms } from "@/components/settings/settings-forms"
import { MessageTemplateEditor } from "@/components/settings/message-template"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("settings")

  // Preview on a real student, preferring the most recently absent one.
  const recent = await prisma.attendanceRecord.findFirst({
    where: { status: "ABSENT", session: { teacherId: teacher.id }, student: { archived: false, guardianId: { not: null } } },
    orderBy: { session: { sessionDate: "desc" } },
    select: { studentId: true },
  })
  const student = await prisma.student.findFirst({
    where: { teacherId: teacher.id, archived: false, guardianId: { not: null }, ...(recent ? { id: recent.studentId } : {}) },
    select: { id: true, name: true, class: { select: { name: true } }, guardian: { select: { name: true, phone1: true, phone2: true } } },
  })

  const today = todayKey()
  const sample: MessageVars = student
    ? (await guardianMessageVars(teacher, [
        { id: student.id, name: student.name, className: student.class.name, guardianName: student.guardian?.name ?? null },
      ])).get(student.id)!
    : {
        guardian: "Amina Hassan",
        student: "Hodan Abdullahi Nur",
        class: "F3C",
        absences: "3",
        lastAbsent: formatDateKey(today, teacher.language, false),
        rate: "82.5%",
        month: formatMonth(monthOf(today), teacher.language),
        teacher: teacher.name,
        school: teacher.school ?? "",
        date: formatDateKey(today, teacher.language, false),
      }

  return (
    <>
      <PageHeader title={t("title")} />
      <SettingsForms
        teacher={teacher}
        messageSection={
          <MessageTemplateEditor
            initial={effectiveTemplate(teacher.smsTemplate, teacher.language)}
            fallback={defaultTemplate(teacher.language)}
            sample={sample}
            samplePhone={student?.guardian?.phone1 ?? student?.guardian?.phone2 ?? null}
          />
        }
      />
    </>
  )
}
