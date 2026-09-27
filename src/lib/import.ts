import { normalizePhone } from "@/lib/phone"

/**
 * Validation for the class import (Excel or CSV).
 *
 * The file is read into plain rows elsewhere (src/lib/spreadsheet.ts); this
 * decides what each row means and what is wrong with it, so the preview, the
 * confirm step and the error file all agree.
 */

export const TEMPLATE_COLUMNS = [
  "student_name",
  "student_number",
  "gender",
  "guardian_name",
  "guardian_phone_1",
  "guardian_phone_2",
] as const

export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number]

/** Header spellings accepted besides the template's own. */
const ALIASES: Record<string, TemplateColumn> = {
  name: "student_name",
  student: "student_name",
  magaca: "student_name",
  magaca_ardayga: "student_name",
  student_no: "student_number",
  number: "student_number",
  no: "student_number",
  sex: "gender",
  jinsi: "gender",
  guardian: "guardian_name",
  parent: "guardian_name",
  parent_name: "guardian_name",
  waalid: "guardian_name",
  phone: "guardian_phone_1",
  phone_1: "guardian_phone_1",
  guardian_phone: "guardian_phone_1",
  parent_phone: "guardian_phone_1",
  phone_2: "guardian_phone_2",
}

export function normalizeHeader(header: string): TemplateColumn | null {
  const key = header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  if ((TEMPLATE_COLUMNS as readonly string[]).includes(key)) return key as TemplateColumn
  return ALIASES[key] ?? null
}

export function parseGender(value: string): "MALE" | "FEMALE" | null {
  const v = value.trim().toLowerCase()
  if (["m", "male", "boy", "wiil", "lab", "ragga"].includes(v)) return "MALE"
  if (["f", "female", "girl", "gabar", "dhedig", "gabadh"].includes(v)) return "FEMALE"
  return null
}

export type ImportRow = {
  /** Row number in the file, counting the header as row 1. */
  line: number
  name: string
  studentNo: string | null
  gender: "MALE" | "FEMALE" | null
  guardianName: string | null
  phone1: string | null
  phone2: string | null
  errors: string[]
  duplicate: boolean
  raw: Record<TemplateColumn, string>
}

/** Error codes, translated in the UI under `import.errors`. */
export type RowError = "nameRequired" | "genderInvalid" | "phone1Invalid" | "phone2Invalid" | "guardianPhoneRequired"

/**
 * Validates the rows read from a file.
 *
 * `existingStudentNos` are the teacher's student numbers already in the
 * database: a row repeating one is a duplicate, as is a row repeating a number
 * seen earlier in the same file. Duplicates are skipped on confirm rather than
 * failing the import, and listed in the error file.
 */
export function validateRows(
  rows: Record<string, string>[],
  existingStudentNos: Set<string>
): ImportRow[] {
  const seen = new Set<string>()
  return rows.map((row, i) => {
    const raw = Object.fromEntries(TEMPLATE_COLUMNS.map((c) => [c, String(row[c] ?? "").trim()])) as Record<
      TemplateColumn,
      string
    >
    const errors: RowError[] = []

    const name = raw.student_name.replace(/\s+/g, " ")
    if (!name) errors.push("nameRequired")

    const gender = parseGender(raw.gender)
    if (!gender) errors.push("genderInvalid")

    const phone1 = raw.guardian_phone_1 ? normalizePhone(raw.guardian_phone_1) : null
    if (raw.guardian_phone_1 && !phone1) errors.push("phone1Invalid")
    const phone2 = raw.guardian_phone_2 ? normalizePhone(raw.guardian_phone_2) : null
    if (raw.guardian_phone_2 && !phone2) errors.push("phone2Invalid")

    const guardianName = raw.guardian_name.replace(/\s+/g, " ") || null
    if (guardianName && !raw.guardian_phone_1 && !raw.guardian_phone_2) errors.push("guardianPhoneRequired")

    const studentNo = raw.student_number || null
    let duplicate = false
    if (studentNo) {
      const key = studentNo.toLowerCase()
      duplicate = existingStudentNos.has(key) || seen.has(key)
      seen.add(key)
    }

    return {
      line: i + 2,
      name,
      studentNo,
      gender,
      guardianName,
      phone1,
      phone2,
      errors,
      duplicate,
      raw,
    }
  })
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** CSV of the rejected rows with the reason, for the downloadable error file. */
export function errorFileCsv(rows: ImportRow[], describe: (row: ImportRow) => string): string | null {
  const bad = rows.filter((r) => r.errors.length > 0 || r.duplicate)
  if (bad.length === 0) return null
  const header = ["row", ...TEMPLATE_COLUMNS, "problem"].join(",")
  const lines = bad.map((r) =>
    [String(r.line), ...TEMPLATE_COLUMNS.map((c) => r.raw[c]), describe(r)].map(csvCell).join(",")
  )
  return [header, ...lines].join("\n")
}
