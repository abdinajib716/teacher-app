import { describe, expect, it } from "vitest"
import { errorFileCsv, normalizeHeader, parseGender, validateRows } from "./import"

const row = (over: Record<string, string> = {}) => ({
  student_name: "Hodan Abdullahi Nur",
  student_number: "STU-002",
  gender: "F",
  guardian_name: "Amina Hassan",
  guardian_phone_1: "+252 61 555 0102",
  guardian_phone_2: "",
  ...over,
})

describe("normalizeHeader", () => {
  it("accepts the template headers and common spellings", () => {
    expect(normalizeHeader("Student Name")).toBe("student_name")
    expect(normalizeHeader("guardian phone 1")).toBe("guardian_phone_1")
    expect(normalizeHeader("Parent phone")).toBe("guardian_phone_1")
    expect(normalizeHeader("Magaca")).toBe("student_name")
    expect(normalizeHeader("whatever")).toBeNull()
  })
})

describe("parseGender", () => {
  it("reads English and Somali", () => {
    expect(parseGender("Wiil")).toBe("MALE")
    expect(parseGender("gabar")).toBe("FEMALE")
    expect(parseGender("x")).toBeNull()
  })
})

describe("validateRows", () => {
  it("accepts a good row and normalizes the phone", () => {
    const [r] = validateRows([row()], new Set())
    expect(r.errors).toEqual([])
    expect(r.phone1).toBe("+252615550102")
    expect(r.line).toBe(2)
  })

  it("reports missing name, bad gender and bad phone", () => {
    const [r] = validateRows([row({ student_name: "", gender: "?", guardian_phone_1: "12" })], new Set())
    expect(r.errors).toEqual(["nameRequired", "genderInvalid", "phone1Invalid"])
  })

  it("flags duplicates against the database and within the file", () => {
    const rows = validateRows(
      [row({ student_number: "STU-001" }), row({ student_number: "STU-009" }), row({ student_number: "stu-009" })],
      new Set(["stu-001"])
    )
    expect(rows.map((r) => r.duplicate)).toEqual([true, false, true])
  })

  it("writes an error file only for rejected rows", () => {
    const rows = validateRows([row(), row({ gender: "" })], new Set())
    const csv = errorFileCsv(rows, (r) => r.errors.join("; "))
    expect(csv?.split("\n")).toHaveLength(2)
    expect(csv).toContain("genderInvalid")
    expect(errorFileCsv(validateRows([row()], new Set()), () => "")).toBeNull()
  })
})
