"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { updatePreferences, updateProfile, changePassword, changeEmail } from "@/app/actions/settings"
import { useAction } from "@/components/app/use-action"
import { FieldLabel, selectClass } from "@/components/app/filters"
import type { TeacherSettings } from "@/lib/data/teacher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Displayed Saturday first, the way the school week runs.
const WEEK = [6, 0, 1, 2, 3, 4, 5]

function Section({ title, hint, id, children }: { title: string; hint?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid gap-4 border-b border-border py-7 first:pt-0 last:border-0 md:grid-cols-[220px_1fr] md:gap-10">
      <div>
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <div className="max-w-xl">{children}</div>
    </section>
  )
}

export function SettingsForms({ teacher, messageSection }: { teacher: TeacherSettings; messageSection: React.ReactNode }) {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const tw = useTranslations("weekdays")
  const tl = useTranslations("languages")
  const profile = useAction()
  const prefs = useAction()
  const password = useAction()
  const email = useAction()
  const [days, setDays] = useState<number[]>(teacher.schoolDays)

  return (
    <div>
      <Section title={t("profile")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            profile.run(() => updateProfile({ name: String(fd.get("name")), school: String(fd.get("school") ?? "") }), { success: t("saved") })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="st-name">{tc("name")}</FieldLabel>
              <Input id="st-name" name="name" required maxLength={100} defaultValue={teacher.name} />
            </div>
            <div>
              <FieldLabel htmlFor="st-school">{t("school")}</FieldLabel>
              <Input id="st-school" name="school" maxLength={120} defaultValue={teacher.school ?? ""} />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="st-email">{t("email")}</FieldLabel>
            <Input id="st-email" value={teacher.email} disabled className="num" />
          </div>
          <Button type="submit" loading={profile.pending}>
            {tc("save")}
          </Button>
        </form>
      </Section>

      <Section title={t("preferences")} hint={t("breakHint")}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            prefs.run(
              () =>
                updatePreferences({
                  language: String(fd.get("language")) as "en" | "so",
                  lowAttendanceThreshold: Number(fd.get("threshold")),
                  break1Start: String(fd.get("break1Start")),
                  break2Start: String(fd.get("break2Start")),
                  break2End: String(fd.get("break2End")),
                  schoolDays: days,
                }),
              { success: t("saved") }
            )
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="st-lang">{t("language")}</FieldLabel>
              <select id="st-lang" name="language" defaultValue={teacher.language} className={selectClass}>
                <option value="so">{tl("so")}</option>
                <option value="en">{tl("en")}</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="st-thr">{t("threshold")}</FieldLabel>
              <div className="relative">
                <Input id="st-thr" name="threshold" type="number" min={1} max={100} required defaultValue={teacher.lowAttendanceThreshold} className="num pr-8" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{tc("break")}</p>
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-input bg-card">
              {(["break1Start", "break2Start", "break2End"] as const).map((k, i) => (
                <label key={k} htmlFor={`st-${k}`} className={cn("block px-3 py-2", i > 0 && "border-l border-input")}>
                  <span className="block text-[11px] text-muted-foreground">{t(k)}</span>
                  <input
                    id={`st-${k}`}
                    name={k}
                    type="time"
                    required
                    defaultValue={teacher[k]}
                    className="num w-full bg-transparent text-[15px] font-medium focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{t("schoolDays")}</legend>
            <div className="grid grid-cols-7 overflow-hidden rounded-md border border-input">
              {WEEK.map((d, i) => {
                const on = days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    title={tw(String(d))}
                    onClick={() => setDays((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))}
                    className={cn(
                      "py-2.5 text-center text-xs font-semibold transition-colors",
                      i > 0 && "border-l border-input",
                      on ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {tw(String(d)).slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <FieldLabel>{t("timeZone")}</FieldLabel>
            <p className="num text-sm">{t("timeZoneValue")}</p>
          </div>

          <Button type="submit" loading={prefs.pending} disabled={days.length === 0}>
            {tc("save")}
          </Button>
        </form>
      </Section>

      <Section id="message" title={t("message.title")} hint={t("message.hint")}>
        {messageSection}
      </Section>

      <Section title={t("login")} hint={t("loginHint")}>
        <form
          className="mb-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const fd = new FormData(form)
            email.run(() => changeEmail({ newEmail: String(fd.get("newEmail")), currentPassword: String(fd.get("emailPassword")) }), {
              success: t("emailChanged"),
              onSuccess: () => form.reset(),
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="st-newemail">{t("newEmail")}</FieldLabel>
              <Input id="st-newemail" name="newEmail" type="email" required autoComplete="email" placeholder={teacher.email} className="num" />
            </div>
            <div>
              <FieldLabel htmlFor="st-emailpw">{t("currentPassword")}</FieldLabel>
              <Input id="st-emailpw" name="emailPassword" type="password" required autoComplete="current-password" />
            </div>
          </div>
          <Button type="submit" variant="outline" loading={email.pending}>
            {t("changeEmail")}
          </Button>
        </form>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const fd = new FormData(form)
            password.run(() => changePassword({ currentPassword: String(fd.get("current")), newPassword: String(fd.get("next")) }), {
              success: t("passwordChanged"),
              onSuccess: () => form.reset(),
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="st-cur">{t("currentPassword")}</FieldLabel>
              <Input id="st-cur" name="current" type="password" required autoComplete="current-password" />
            </div>
            <div>
              <FieldLabel htmlFor="st-new">{t("newPassword")}</FieldLabel>
              <Input id="st-new" name="next" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
            </div>
          </div>
          <Button type="submit" variant="outline" loading={password.pending}>
            {t("password")}
          </Button>
        </form>
      </Section>
    </div>
  )
}
