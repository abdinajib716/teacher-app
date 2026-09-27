"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { TIME_ZONE } from "@/lib/time"

/**
 * Today's date and the time in Mogadishu, always, whatever the phone's own
 * time zone says. It is the reference for "today" and for every recorded-at.
 */
export function MogadishuClock() {
  const locale = useLocale()
  const t = useTranslations("nav")
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!now) return <span className="h-4 w-40" aria-hidden="true" />
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: TIME_ZONE }).format(now)
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(now)

  return (
    <p className="flex min-w-0 items-baseline gap-2 text-[13px]" title={t("timeZoneTitle")}>
      <span className="truncate font-medium">{date}</span>
      <span className="num text-muted-foreground">{time}</span>
      <span className="hidden text-[11px] uppercase tracking-wider text-muted-foreground/80 lg:inline">Mogadishu</span>
    </p>
  )
}
