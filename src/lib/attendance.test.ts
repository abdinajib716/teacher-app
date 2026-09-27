import { describe, expect, it } from "vitest"
import { attendanceRate, countStatuses, initialMarks, isAtRisk, nextStatus, type Mark } from "./attendance"

describe("attendanceRate", () => {
  it("is Present over Present plus Absent", () => {
    expect(attendanceRate({ present: 3, absent: 1 })).toBe(75)
  })

  it("leaves Excused out of both sides", () => {
    const c = countStatuses(["PRESENT", "PRESENT", "ABSENT", "EXCUSED", "EXCUSED"])
    expect(c).toEqual({ present: 2, absent: 1, excused: 2 })
    expect(attendanceRate(c)).toBe(66.7)
  })

  it("is null when nothing counts", () => {
    expect(attendanceRate({ present: 0, absent: 0 })).toBeNull()
  })
})

describe("isAtRisk", () => {
  it("flags rates below the threshold only", () => {
    expect(isAtRisk(74.9, 75)).toBe(true)
    expect(isAtRisk(75, 75)).toBe(false)
    expect(isAtRisk(null, 75)).toBe(false)
  })
})

describe("nextStatus", () => {
  it("cycles Present, Absent, Excused", () => {
    expect(nextStatus("PRESENT")).toBe("ABSENT")
    expect(nextStatus("ABSENT")).toBe("EXCUSED")
    expect(nextStatus("EXCUSED")).toBe("PRESENT")
  })
})

describe("initialMarks", () => {
  it("starts everyone Present on a new record", () => {
    const m = initialMarks(["a", "b"], { existing: null, wholeDayExcused: new Map() })
    expect(m.get("a")?.status).toBe("PRESENT")
    expect(m.get("b")?.status).toBe("PRESENT")
  })

  it("carries a whole-day Excused into the other break", () => {
    const m = initialMarks(["a", "b"], { existing: null, wholeDayExcused: new Map([["b", "Sick"]]) })
    expect(m.get("b")).toEqual({ status: "EXCUSED", scope: "DAY", note: "Sick" })
  })

  it("shows students added after the break was taken as not marked", () => {
    const existing = new Map<string, Mark>([["a", { status: "ABSENT", scope: null, note: null }]])
    const m = initialMarks(["a", "new"], { existing, wholeDayExcused: new Map() })
    expect(m.get("a")?.status).toBe("ABSENT")
    expect(m.get("new")).toBeNull()
  })
})
