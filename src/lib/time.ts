/**
 * Time rules for the whole app.
 *
 * Every instant is stored in UTC and shown in Africa/Mogadishu. Mogadishu is
 * UTC+3 all year (no daylight saving), but the conversion still goes through
 * Intl with the named zone rather than a hard-coded offset, so the rule lives
 * in one place and the phone's own time zone never matters: these functions
 * run on the server, or receive the zone explicitly on the client.
 *
 * A school day is a calendar date ("YYYY-MM-DD"), not an instant. It is kept
 * as a date key in code and as a `date` column in the database, and converted
 * to a Date only at the database boundary (at UTC midnight), so no time zone
 * can move it to the day before.
 */

export const TIME_ZONE = "Africa/Mogadishu"

/** "YYYY-MM-DD" */
export type DateKey = string

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false
  const d = dateKeyToDate(value)
  return !Number.isNaN(d.getTime()) && dateToDateKey(d) === value
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number }

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
})

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Wall-clock parts of an instant in Mogadishu. */
export function mogadishuParts(instant: Date = new Date()): Parts {
  const map: Record<string, string> = {}
  for (const p of partsFormatter.formatToParts(instant)) map[p.type] = p.value
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAYS.indexOf(map.weekday),
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

export function toDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Today's date in Mogadishu. */
export function todayKey(now: Date = new Date()): DateKey {
  const p = mogadishuParts(now)
  return toDateKey(p.year, p.month, p.day)
}

/** A date key as the Date Prisma writes to a `date` column (UTC midnight). */
export function dateKeyToDate(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

/** A `date` column read back from Prisma, as a date key. */
export function dateToDateKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10)
}

/** 0 = Sunday … 6 = Saturday, for a calendar date. */
export function weekdayOf(key: DateKey): number {
  return dateKeyToDate(key).getUTCDay()
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = dateKeyToDate(key)
  d.setUTCDate(d.getUTCDate() + days)
  return dateToDateKey(d)
}

/** Every date key from `from` to `to`, both included. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export function isSchoolDay(key: DateKey, schoolDays: number[]): boolean {
  return schoolDays.includes(weekdayOf(key))
}

/** "YYYY-MM" of a date key. */
export function monthOf(key: DateKey): string {
  return key.slice(0, 7)
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/** First and last date of a "YYYY-MM" month. */
export function monthBounds(month: string): { from: DateKey; to: DateKey } {
  const [y, m] = month.split("-").map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: toDateKey(y, m, 1), to: toDateKey(y, m, last) }
}

/** Minutes since midnight for "HH:MM". Invalid input is null. */
export function parseClock(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/**
 * The break that matches the current time in Mogadishu: Break 2 from its start
 * time onwards, Break 1 otherwise (including the morning, before Break 1 has
 * started). It only picks the default on the screen; nothing is locked.
 */
export function defaultBreak(break2Start: string, now: Date = new Date()): 1 | 2 {
  const start = parseClock(break2Start) ?? 15 * 60
  const p = mogadishuParts(now)
  return p.hour * 60 + p.minute >= start ? 2 : 1
}

/** A clock time like "1:00 PM" for a stored "HH:MM". */
export function formatClock(value: string, locale: string): string {
  const minutes = parseClock(value)
  if (minutes === null) return value
  const d = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(d)
}

/**
 * A compact clock range such as "1:00–3:00 PM": the day period is written once
 * when both ends share it.
 */
export function formatClockRange(from: string, to: string, locale: string): string {
  const parts = (value: string) => {
    const minutes = parseClock(value) ?? 0
    const d = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).formatToParts(d)
  }
  const a = parts(from)
  const b = parts(to)
  const period = (p: Intl.DateTimeFormatPart[]) => p.find((x) => x.type === "dayPeriod")?.value
  const join = (p: Intl.DateTimeFormatPart[]) => p.map((x) => x.value).join("").trim()
  if (period(a) && period(a) === period(b)) {
    const bare = a.filter((x) => x.type !== "dayPeriod").map((x) => x.value).join("").trim()
    return `${bare}–${join(b)}`
  }
  return `${join(a)}–${join(b)}`
}

/** An instant shown as time of day in Mogadishu, e.g. "2:05 PM". */
export function formatTime(instant: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(instant)
}

/** An instant shown as date and time in Mogadishu. */
export function formatDateTime(instant: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(instant)
}

/** A calendar date shown to people, e.g. "Sat, 26 Sep 2026". */
export function formatDateKey(key: DateKey, locale: string, withWeekday = true): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateKeyToDate(key))
}

export function formatMonth(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    dateKeyToDate(`${month}-01`)
  )
}
