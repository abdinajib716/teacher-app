import { describe, expect, it } from "vitest"
import {
  addDays,
  formatClockRange,
  dateKeyToDate,
  dateToDateKey,
  defaultBreak,
  eachDay,
  isDateKey,
  isSchoolDay,
  monthBounds,
  mogadishuParts,
  parseClock,
  todayKey,
  weekdayOf,
} from "./time"

const SAT_TO_WED = [6, 0, 1, 2, 3]

describe("Mogadishu time", () => {
  it("is UTC+3 regardless of the machine's zone", () => {
    const p = mogadishuParts(new Date("2026-09-25T10:05:00Z"))
    expect(p.hour).toBe(13)
    expect(p.minute).toBe(5)
  })

  it("rolls the date over at Mogadishu midnight, not UTC midnight", () => {
    expect(todayKey(new Date("2026-09-25T20:59:00Z"))).toBe("2026-09-25")
    expect(todayKey(new Date("2026-09-25T21:00:00Z"))).toBe("2026-09-26")
  })
})

describe("defaultBreak", () => {
  it("is Break 1 before the Break 2 start time", () => {
    expect(defaultBreak("15:00", new Date("2026-09-26T05:00:00Z"))).toBe(1) // 08:00
    expect(defaultBreak("15:00", new Date("2026-09-26T10:00:00Z"))).toBe(1) // 13:00
    expect(defaultBreak("15:00", new Date("2026-09-26T11:59:00Z"))).toBe(1) // 14:59
  })

  it("is Break 2 from the Break 2 start time", () => {
    expect(defaultBreak("15:00", new Date("2026-09-26T12:00:00Z"))).toBe(2) // 15:00
    expect(defaultBreak("15:00", new Date("2026-09-26T16:00:00Z"))).toBe(2) // 19:00
  })

  it("follows an edited start time", () => {
    expect(defaultBreak("14:30", new Date("2026-09-26T11:30:00Z"))).toBe(2)
  })
})

describe("date keys", () => {
  it("round-trip through a date column", () => {
    expect(dateToDateKey(dateKeyToDate("2026-02-28"))).toBe("2026-02-28")
  })

  it("validates real dates only", () => {
    expect(isDateKey("2026-09-26")).toBe(true)
    expect(isDateKey("2026-02-30")).toBe(false)
    expect(isDateKey("26-09-2026")).toBe(false)
  })

  it("steps across months", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01")
    expect(eachDay("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"])
  })

  it("knows month bounds including leap years", () => {
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" })
  })
})

describe("school days", () => {
  it("are Saturday to Wednesday by default", () => {
    expect(weekdayOf("2026-09-26")).toBe(6) // Saturday
    expect(isSchoolDay("2026-09-26", SAT_TO_WED)).toBe(true)
    expect(isSchoolDay("2026-09-30", SAT_TO_WED)).toBe(true) // Wednesday
    expect(isSchoolDay("2026-10-01", SAT_TO_WED)).toBe(false) // Thursday
    expect(isSchoolDay("2026-10-02", SAT_TO_WED)).toBe(false) // Friday
  })
})

describe("parseClock", () => {
  it("parses HH:MM and rejects anything else", () => {
    expect(parseClock("13:00")).toBe(780)
    expect(parseClock("24:00")).toBeNull()
    expect(parseClock("1pm")).toBeNull()
  })
})

describe("formatClockRange", () => {
  it("writes a shared day period once", () => {
    expect(formatClockRange("13:00", "15:00", "en").replace(/\s/g, " ")).toBe("1:00–3:00 PM")
    expect(formatClockRange("11:00", "13:00", "en").replace(/\s/g, " ")).toBe("11:00 AM–1:00 PM")
  })
})
