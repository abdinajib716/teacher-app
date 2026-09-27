import { addDays, isDateKey, todayKey, type DateKey } from "@/lib/time"

/** A from/to range from search params, defaulting to the last `days` days. */
export function rangeFromParams(sp: { from?: string; to?: string }, days = 30): { from: DateKey; to: DateKey } {
  const today = todayKey()
  let to = isDateKey(sp.to) ? sp.to : today
  let from = isDateKey(sp.from) ? sp.from : addDays(to, -(days - 1))
  if (from > to) [from, to] = [to, from]
  return { from, to }
}
