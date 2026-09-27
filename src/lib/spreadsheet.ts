import "server-only"
import ExcelJS from "exceljs"
import Papa from "papaparse"
import { normalizeHeader, TEMPLATE_COLUMNS } from "@/lib/import"

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export const MAX_IMPORT_ROWS = 5000

export type ReadResult = { rows: Record<string, string>[] } | { error: "fileType" | "tooLarge" | "noHeader" | "tooManyRows" | "unreadable" }

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue)
    if ("richText" in value) return value.richText.map((r) => r.text).join("")
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return ""
  }
  return String(value)
}

/**
 * Reads an uploaded .xlsx or .csv into rows keyed by template column. Headers
 * are matched loosely (see normalizeHeader), unknown columns are ignored, and
 * blank lines are dropped.
 */
export async function readSpreadsheet(file: File): Promise<ReadResult> {
  if (file.size > MAX_IMPORT_BYTES) return { error: "tooLarge" }
  const name = file.name.toLowerCase()
  let table: string[][]

  try {
    if (name.endsWith(".csv")) {
      const text = await file.text()
      const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" })
      table = parsed.data
    } else if (name.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const sheet = wb.worksheets[0]
      if (!sheet) return { error: "noHeader" }
      table = []
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const values: string[] = []
        for (let c = 1; c <= sheet.columnCount; c++) values.push(cellText(row.getCell(c).value).trim())
        table.push(values)
      })
    } else {
      return { error: "fileType" }
    }
  } catch {
    return { error: "unreadable" }
  }

  const [header, ...body] = table
  if (!header) return { error: "noHeader" }
  const columns = header.map((h) => normalizeHeader(String(h ?? "")))
  if (!columns.includes("student_name")) return { error: "noHeader" }

  const rows = body
    .filter((r) => r.some((v) => String(v ?? "").trim() !== ""))
    .map((r) => {
      const out: Record<string, string> = {}
      columns.forEach((col, i) => {
        if (col && !out[col]) out[col] = String(r[i] ?? "").trim()
      })
      return out
    })
  if (rows.length > MAX_IMPORT_ROWS) return { error: "tooManyRows" }
  return { rows }
}

/** The import template, with one example row. */
export async function templateWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Students")
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c, key: c, width: c === "student_name" || c === "guardian_name" ? 28 : 18 }))
  ws.addRow({
    student_name: "Abdirahman Mohamed Ali",
    student_number: "STU-001",
    gender: "M",
    guardian_name: "Mohamed Ali Nur",
    guardian_phone_1: "+252 61 555 0101",
    guardian_phone_2: "",
  })
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D3F6E" } }
  ws.getColumn("guardian_phone_1").numFmt = "@"
  ws.getColumn("guardian_phone_2").numFmt = "@"
  return Buffer.from(await wb.xlsx.writeBuffer())
}
