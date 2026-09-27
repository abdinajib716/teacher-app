import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { requireTeacherSettings, activeClasses } from "@/lib/data/teacher"
import { loadRegister } from "@/lib/data/register"
import { formatMonth, isMonthKey, monthOf, todayKey } from "@/lib/time"
import { PageHeader, EmptyState } from "@/components/app/page-header"
import { RegisterGrid } from "@/components/register/register-grid"
import { RegisterControls, RegisterLegend } from "@/components/register/register-controls"

export const metadata: Metadata = { title: "Monthly Register" }

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ classId?: string; month?: string }> }) {
  const sp = await searchParams
  const teacher = await requireTeacherSettings()
  const t = await getTranslations("register")
  const tc = await getTranslations("common")
  const locale = await getLocale()
  const classes = await activeClasses(teacher.id)

  const today = todayKey()
  const month = isMonthKey(sp.month) ? sp.month : monthOf(today)
  const classId = classes.some((c) => c.id === sp.classId) ? sp.classId! : (classes[0]?.id ?? "")
  const register = classId ? await loadRegister(teacher.id, classId, month, teacher.schoolDays) : null

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <RegisterControls classes={classes} classId={classId} month={month} />

      {!register ? (
        <EmptyState title={tc("selectClass")} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{formatMonth(month, locale)}</p>
              <h2 className="font-serif text-2xl font-semibold">{register.className}</h2>
            </div>
            <dl className="flex overflow-hidden rounded-md border border-border bg-card text-sm">
              {[
                ["Wiilal", tc("boys"), register.boys],
                ["Gabdho", tc("girls"), register.girls],
                ["Wadar", tc("total"), register.students.length],
              ].map(([so, en, n], i) => (
                <div key={String(so)} className={`px-4 py-2 ${i > 0 ? "border-l border-border" : ""}`}>
                  <dt className="text-[11px] text-muted-foreground">
                    {so}
                    {locale !== "so" && <span className="opacity-70"> · {en}</span>}
                  </dt>
                  <dd className="num text-lg font-semibold leading-tight">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          {register.days.length === 0 ? (
            <EmptyState title={t("noDays")} />
          ) : (
            <RegisterGrid
              register={register}
              locale={locale}
              threshold={teacher.lowAttendanceThreshold}
              today={today}
              schoolDays={teacher.schoolDays}
            />
          )}
          <RegisterLegend />
        </>
      )}
    </>
  )
}
