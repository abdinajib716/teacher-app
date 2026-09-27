import "server-only"
import ExcelJS from "exceljs"
import type { Cell, Tone } from "@/lib/pdf"

/**
 * Excel counterpart of src/lib/pdf.ts: the same table description becomes a
 * worksheet, so the PDF and Excel exports of a report never disagree.
 */

const FILL: Record<Exclude<Tone, "none">, string> = {
  present: "FFDCFCE7",
  absent: "FFFEE2E2",
  excused: "FFFEF3C7",
  muted: "FFF3F4F6",
}
const FONT: Record<Exclude<Tone, "none">, string> = {
  present: "FF15803D",
  absent: "FFB91C1C",
  excused: "FFA16207",
  muted: "FF6B7280",
}

export type Sheet = {
  name: string
  /** Header band: "<appName> · <KIND>" on the brand blue, as in the PDFs. */
  appName?: string
  kind?: string
  /** Last line of the sheet: the Cajiib Creative credit, as a link. */
  credit?: string
  title: string
  meta: string[]
  columns: { header: string; width: number }[]
  groups?: { label: string; span: number }[]
  rows: Cell[][]
  after?: string[]
}

export async function workbook(sheets: Sheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.created = new Date()

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet")
    const span = Math.max(s.columns.length, 4)
    if (s.appName || s.kind) {
      const band = ws.addRow([[s.appName, s.kind?.toUpperCase()].filter(Boolean).join("  ·  ")])
      ws.mergeCells(band.number, 1, band.number, span)
      band.height = 26
      band.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }
      band.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D3F6E" } }
      band.getCell(1).alignment = { vertical: "middle", indent: 1 }
    }
    const titleRow = ws.addRow([s.title])
    titleRow.height = 24
    titleRow.font = { bold: true, size: 16, name: "Georgia", color: { argb: "FF1D3F6E" } }
    for (const line of s.meta) ws.addRow([line]).font = { color: { argb: "FF625D55" } }
    ws.addRow([])

    if (s.groups) {
      const row = ws.addRow([])
      let col = 1
      for (const g of s.groups) {
        row.getCell(col).value = g.label
        if (g.span > 1) ws.mergeCells(row.number, col, row.number, col + g.span - 1)
        row.getCell(col).alignment = { horizontal: "center" }
        col += g.span
      }
      row.font = { bold: true }
    }

    const header = ws.addRow(s.columns.map((c) => c.header))
    header.font = { bold: true, color: { argb: "FFFFFFFF" } }
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D3F6E" } }
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    })
    s.columns.forEach((c, i) => (ws.getColumn(i + 1).width = c.width))
    ws.views = [{ state: "frozen", ySplit: header.number, xSplit: 0 }]

    for (const r of s.rows) {
      const row = ws.addRow(r.map((c) => (typeof c === "string" ? c : c.text)))
      r.forEach((c, i) => {
        if (typeof c === "string" || !c.tone || c.tone === "none") return
        const cell = row.getCell(i + 1)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[c.tone] } }
        cell.font = { bold: true, color: { argb: FONT[c.tone] } }
        cell.alignment = { horizontal: "center" }
      })
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        }
      })
    }

    if (s.after?.length) {
      ws.addRow([])
      for (const line of s.after) ws.addRow([line])
    }
    if (s.credit) {
      ws.addRow([])
      const url = s.credit.match(/https?:\/\/\S+/)?.[0]
      const row = ws.addRow([url ? { text: s.credit, hyperlink: url } : s.credit])
      row.font = { size: 9, italic: true, color: { argb: "FF0F75BB" } }
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}
