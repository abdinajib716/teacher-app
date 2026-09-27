/**
 * Attendance rules that every screen, report and export shares.
 *
 * Percentage = Present ÷ (Present + Absent). Excused counts as neither, so it
 * is left out of both sides and reported on its own.
 */

export const STATUSES = ["PRESENT", "ABSENT", "EXCUSED"] as const
export type Status = (typeof STATUSES)[number]
export type Scope = "BREAK" | "DAY"

export const BREAKS = [1, 2] as const
export type BreakNo = (typeof BREAKS)[number]

export function isBreakNo(value: unknown): value is BreakNo {
  return value === 1 || value === 2
}

export type Counts = { present: number; absent: number; excused: number }

export const emptyCounts = (): Counts => ({ present: 0, absent: 0, excused: 0 })

export function countStatuses(statuses: Iterable<Status | null | undefined>): Counts {
  const c = emptyCounts()
  for (const s of statuses) {
    if (s === "PRESENT") c.present++
    else if (s === "ABSENT") c.absent++
    else if (s === "EXCUSED") c.excused++
  }
  return c
}

export function addCounts(a: Counts, b: Counts): Counts {
  return { present: a.present + b.present, absent: a.absent + b.absent, excused: a.excused + b.excused }
}

/**
 * Attendance percentage, rounded to one decimal. Null when there is nothing to
 * divide by (no Present and no Absent), which the UI shows as "—" rather than
 * a misleading 0% or 100%.
 */
export function attendanceRate(c: Pick<Counts, "present" | "absent">): number | null {
  const total = c.present + c.absent
  if (total === 0) return null
  return Math.round((c.present / total) * 1000) / 10
}

export function isAtRisk(rate: number | null, threshold: number): boolean {
  return rate !== null && rate < threshold
}

/** One tap cycles Present → Absent → Excused → Present. */
export function nextStatus(s: Status): Status {
  return s === "PRESENT" ? "ABSENT" : s === "ABSENT" ? "EXCUSED" : "PRESENT"
}

/** Short letter used in the register and receipts. */
export const STATUS_LETTER: Record<Status, string> = { PRESENT: "P", ABSENT: "A", EXCUSED: "E" }

/** Paper-register words, which the PDF and Excel exports print in Somali. */
export const STATUS_SOMALI: Record<Status, string> = { PRESENT: "Joogid", ABSENT: "Maqan", EXCUSED: "Fasax" }

export type Mark = { status: Status; scope: Scope | null; note: string | null }

/**
 * The starting marks for the Take Attendance screen.
 *
 * - An existing record's saved mark wins.
 * - A student with no saved mark in an existing record was added after it was
 *   taken: they show as not marked (null), for the teacher to decide.
 * - On a new record everyone starts Present, except a student Excused for the
 *   whole day on the other break of the same day, who starts Excused.
 */
export function initialMarks(
  studentIds: string[],
  opts: {
    existing: Map<string, Mark> | null
    wholeDayExcused: Map<string, string | null>
  }
): Map<string, Mark | null> {
  const out = new Map<string, Mark | null>()
  for (const id of studentIds) {
    if (opts.existing) {
      out.set(id, opts.existing.get(id) ?? null)
      continue
    }
    if (opts.wholeDayExcused.has(id)) {
      out.set(id, { status: "EXCUSED", scope: "DAY", note: opts.wholeDayExcused.get(id) ?? null })
    } else {
      out.set(id, { status: "PRESENT", scope: null, note: null })
    }
  }
  return out
}
