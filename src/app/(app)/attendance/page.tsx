import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { requireTeacherSettings, activeClasses } from "@/lib/data/teacher"
import { loadSheet } from "@/lib/data/attendance"
import { PageHeader } from "@/components/app/page-header"
import { AttendanceTaker } from "@/components/attendance/attendance-taker"
import { defaultBreak, formatClockRange, formatDateKey, isDateKey, isSchoolDay, todayKey } from "@/lib/time"

export const metadata: Metadata = { title: "Take Attendance" }

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string; break?: string; edit?: string }>
}) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("attendance")
  const locale = await getLocale()
  const classes = await activeClasses(teacher.id)

  const date = isDateKey(sp.date) ? sp.date : todayKey()
  const breakNo = sp.break === "1" || sp.break === "2" ? (Number(sp.break) as 1 | 2) : defaultBreak(teacher.break2Start)
  const classId = classes.some((c) => c.id === sp.classId) ? sp.classId! : classes.length === 1 ? classes[0].id : ""

  const sheet = classId ? await loadSheet(teacher.id, classId, date, breakNo) : null

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <AttendanceTaker
        // Remount on every class/date/break so marks never leak between sheets.
        key={`${classId}|${date}|${breakNo}`}
        classes={classes}
        classId={classId}
        date={date}
        dateLabel={formatDateKey(date, locale)}
        breakNo={breakNo}
        breakTimes={{
          1: formatClockRange(teacher.break1Start, teacher.break2Start, locale),
          2: formatClockRange(teacher.break2Start, teacher.break2End, locale),
        }}
        schoolDay={isSchoolDay(date, teacher.schoolDays)}
        editRequested={sp.edit === "1"}
        sheet={
          sheet && {
            session: sheet.session && {
              id: sheet.session.id,
              recordedAt: sheet.session.recordedAt.toISOString(),
              editedAt: sheet.session.editedAt?.toISOString() ?? null,
            },
            students: sheet.students,
            marks: sheet.marks,
          }
        }
      />
    </>
  )
}
