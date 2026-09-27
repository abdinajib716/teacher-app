import {
  LineCapStyle,
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib"
import { CAJIIB, CAJIIB_C_PATH, CAJIIB_RAYS, CAJIIB_RAY_WIDTH, CAJIIB_VIEWBOX } from "@/lib/cajiib-logo"

/**
 * The one document template behind every PDF the app produces: attendance
 * receipts, the monthly register and the reports. Same header band, title,
 * field strip, summary tiles, ruled table and footer, so they read as one set.
 * Pure JavaScript (pdf-lib): runs on any Node host.
 *
 * The standard PDF fonts cover Latin-1. Somali is written in the Latin
 * alphabet, so real names print; anything else is replaced, never a crash.
 */

export type Align = "left" | "center" | "right"
export type Tone = "present" | "absent" | "excused" | "muted" | "none"

/**
 * A table cell. `stamp` draws the register stamp (a square with the letter)
 * before the text; a `tone` without a stamp tints the whole cell, which is how
 * the dense register grid shows its marks.
 */
export type Cell = string | { text: string; tone?: Tone; bold?: boolean; stamp?: string }

export type Column = {
  header: string
  /** Relative width; columns share the page width in proportion. */
  width: number
  align?: Align
}

export type GroupHeader = { label: string; span: number }
export type DocField = { label: string; value: string; width?: number }
export type DocStat = { label: string; value: string; tone?: Tone }

export type DocLabels = {
  /** e.g. "Page" and "of" → "Page 1 of 3" */
  page: string
  of: string
  generated: string
  timeZone: string
  builtBy: string
}

export type TableDoc = {
  appName: string
  /** What the document is, shown in the header band: "Attendance receipt". */
  kind: string
  title: string
  subtitle?: string
  school?: string | null
  teacher?: string | null
  fields?: DocField[]
  stats?: DocStat[]
  columns: Column[]
  /** Optional row above the column headers, e.g. day numbers over B1/B2. */
  groups?: GroupHeader[]
  rows: Cell[][]
  /** Legend of stamps drawn under the table: [letter, tone, word]. */
  legend?: [string, Tone, string][]
  notes?: string[]
  /** Pre-formatted generation time, in the teacher's language and zone. */
  generatedAt: string
  labels: DocLabels
  landscape?: boolean
  fontSize?: number
}

// ── Palette (the app's "Register" tokens) ────────────────────────────────────
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const INK = hex("#1a1917")
const MUTED = hex("#625d55")
const RULE = hex("#e3ddd0")
const RULE_STRONG = hex("#cdc5b4")
const PAPER = hex("#f6f4ee")
const HEAD = hex("#eeeae0")
const ZEBRA = hex("#fbfaf6")
const BLUE = hex("#1d3f6e")
const BLUE_SOFT = hex("#e4ebf5")
const WHITE = rgb(1, 1, 1)

const TONES: Record<Exclude<Tone, "none">, { fg: RGB; bg: RGB; line: RGB }> = {
  present: { fg: hex("#17683c"), bg: hex("#e2f0e6"), line: hex("#9fcbad") },
  absent: { fg: hex("#b3261e"), bg: hex("#fae6e3"), line: hex("#e7aaa3") },
  excused: { fg: hex("#87580a"), bg: hex("#f7ecd2"), line: hex("#dcc08a") },
  muted: { fg: MUTED, bg: HEAD, line: RULE_STRONG },
}

const A4: [number, number] = [595.28, 841.89]
const M = 36 // page margin
const BAND = 64 // header band height
const FOOT = 44 // space reserved for the footer

/** Keep only what WinAnsi can encode. */
export function pdfSafe(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
}

function fit(text: string, font: PDFFont, size: number, max: number): string {
  let t = pdfSafe(text)
  if (font.widthOfTextAtSize(t, size) <= max) return t
  while (t.length > 1 && font.widthOfTextAtSize(`${t}.`, size) > max) t = t.slice(0, -1)
  return `${t}.`
}

type Fonts = { regular: PDFFont; bold: PDFFont; title: PDFFont }

function text(page: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont, color: RGB, maxWidth?: number) {
  page.drawText(maxWidth ? fit(s, font, size, maxWidth) : pdfSafe(s), { x, y, size, font, color })
}

function textRight(page: PDFPage, s: string, right: number, y: number, size: number, font: PDFFont, color: RGB) {
  const t = pdfSafe(s)
  page.drawText(t, { x: right - font.widthOfTextAtSize(t, size), y, size, font, color })
}

/** The app mark: a corner of the register sheet, as in the web logo. */
function drawRegisterMark(page: PDFPage, x: number, y: number, size: number, fg: RGB, bg: RGB) {
  page.drawRectangle({ x, y, width: size, height: size, color: bg })
  const s = size / 24
  const px = (v: number) => x + v * s
  const py = (v: number) => y + size - v * s
  page.drawRectangle({ x: px(3), y: py(21), width: 18 * s, height: 18 * s, borderColor: fg, borderWidth: 1.8 * s })
  for (const v of [9, 15]) page.drawLine({ start: { x: px(3), y: py(v) }, end: { x: px(21), y: py(v) }, thickness: 1.2 * s, color: fg, opacity: 0.55 })
  page.drawLine({ start: { x: px(12), y: py(3) }, end: { x: px(12), y: py(21) }, thickness: 1.2 * s, color: fg, opacity: 0.55 })
  page.drawRectangle({ x: px(4.6), y: py(7.4), width: 5.8 * s, height: 2.8 * s, color: fg })
  page.drawLine({ start: { x: px(13.8), y: py(12) }, end: { x: px(15.4), y: py(13.5) }, thickness: 1.9 * s, color: fg, lineCap: LineCapStyle.Round })
  page.drawLine({ start: { x: px(15.4), y: py(13.5) }, end: { x: px(18.4), y: py(10.4) }, thickness: 1.9 * s, color: fg, lineCap: LineCapStyle.Round })
}

/** The Cajiib Creative mark, `height` points tall, bottom-left at (x, y). */
function drawCajiibMark(page: PDFPage, x: number, y: number, height: number) {
  const s = height / CAJIIB_VIEWBOX.height
  const ox = x - CAJIIB_VIEWBOX.x * s
  const oy = y + height + CAJIIB_VIEWBOX.y * s // SVG y grows downward from this top edge
  for (const [x1, y1, x2, y2] of CAJIIB_RAYS) {
    page.drawLine({
      start: { x: ox + x1 * s, y: oy - y1 * s },
      end: { x: ox + x2 * s, y: oy - y2 * s },
      thickness: CAJIIB_RAY_WIDTH * s,
      color: hex(CAJIIB.orange),
      lineCap: LineCapStyle.Round,
    })
  }
  page.drawSvgPath(CAJIIB_C_PATH, { x: ox, y: oy, scale: s, color: hex(CAJIIB.blue) })
  return CAJIIB_VIEWBOX.width * s
}

function addLink(pdf: PDFDocument, page: PDFPage, rect: [number, number, number, number], url: string) {
  const annot = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: rect,
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    })
  )
  const annots = page.node.lookup(PDFName.of("Annots"))
  if (annots && "push" in annots) (annots as unknown as { push: (v: unknown) => void }).push(annot)
  else page.node.set(PDFName.of("Annots"), pdf.context.obj([annot]))
}

export async function renderTable(doc: TableDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(pdfSafe(`${doc.kind} - ${doc.title}`))
  pdf.setAuthor(pdfSafe(doc.teacher ?? doc.appName))
  pdf.setCreator(pdfSafe(`${doc.appName} - ${CAJIIB.name}`))
  pdf.setProducer(CAJIIB.name)
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    title: await pdf.embedFont(StandardFonts.TimesRomanBold),
  }

  const [pw, ph] = doc.landscape ? [A4[1], A4[0]] : A4
  const size = doc.fontSize ?? 8.5
  const rowH = Math.max(size + 9, 15)
  const usable = pw - M * 2
  const totalWeight = doc.columns.reduce((s, c) => s + c.width, 0)
  const widths = doc.columns.map((c) => (c.width / totalWeight) * usable)
  const xs = widths.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? M : acc[i - 1] + widths[i - 1]], [])

  let page = pdf.addPage([pw, ph])
  let y = ph

  // ── Header band (first page) ───────────────────────────────────────────────
  const drawBand = () => {
    page.drawRectangle({ x: 0, y: ph - BAND, width: pw, height: BAND, color: BLUE })
    drawRegisterMark(page, M, ph - BAND / 2 - 13, 26, BLUE, WHITE)
    text(page, doc.appName, M + 36, ph - BAND / 2 + 2, 11.5, fonts.bold, WHITE)
    text(page, doc.kind.toUpperCase(), M + 36, ph - BAND / 2 - 11, 7.5, fonts.regular, hex("#c9d6ea"))
    if (doc.school) textRight(page, doc.school, pw - M, ph - BAND / 2 + 2, 10, fonts.bold, WHITE)
    if (doc.teacher) textRight(page, doc.teacher, pw - M, ph - BAND / 2 - 11, 8.5, fonts.regular, hex("#c9d6ea"))
    y = ph - BAND
  }

  // ── Slim header (continuation pages) ───────────────────────────────────────
  const drawSlim = () => {
    page.drawRectangle({ x: 0, y: ph - 5, width: pw, height: 5, color: BLUE })
    text(page, doc.appName, M, ph - 24, 8.5, fonts.bold, BLUE)
    textRight(page, `${doc.kind} - ${doc.title}`, pw - M, ph - 24, 8.5, fonts.regular, MUTED)
    page.drawLine({ start: { x: M, y: ph - 32 }, end: { x: pw - M, y: ph - 32 }, thickness: 0.6, color: RULE })
    y = ph - 42
  }

  // ── Table header ───────────────────────────────────────────────────────────
  const tableHeader = () => {
    const small = Math.min(size, 7.5)
    if (doc.groups) {
      let x = M
      let col = 0
      for (const g of doc.groups) {
        const w = widths.slice(col, col + g.span).reduce((s, v) => s + v, 0)
        page.drawRectangle({ x, y: y - rowH, width: w, height: rowH, color: g.label ? BLUE_SOFT : WHITE })
        if (g.label) {
          const t = fit(g.label, fonts.bold, small, w - 2)
          page.drawText(t, { x: x + (w - fonts.bold.widthOfTextAtSize(t, small)) / 2, y: y - rowH + (rowH - small) / 2 + 1, size: small, font: fonts.bold, color: BLUE })
        }
        page.drawLine({ start: { x, y: y - rowH }, end: { x, y }, thickness: 0.5, color: RULE })
        x += w
        col += g.span
      }
      y -= rowH
    }
    page.drawRectangle({ x: M, y: y - rowH, width: usable, height: rowH, color: HEAD })
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + usable, y: y - rowH }, thickness: 1, color: RULE_STRONG })
    doc.columns.forEach((c, i) => {
      const t = fit(c.header.toUpperCase(), fonts.bold, small, widths[i] - 6)
      const tw = fonts.bold.widthOfTextAtSize(t, small)
      const align = c.align ?? "left"
      const tx = align === "left" ? xs[i] + 4 : align === "right" ? xs[i] + widths[i] - tw - 4 : xs[i] + (widths[i] - tw) / 2
      page.drawText(t, { x: tx, y: y - rowH + (rowH - small) / 2 + 1, size: small, font: fonts.bold, color: MUTED })
    })
    y -= rowH
  }

  const newPage = () => {
    page = pdf.addPage([pw, ph])
    drawSlim()
    tableHeader()
  }

  drawBand()

  // ── Title ──────────────────────────────────────────────────────────────────
  y -= 32
  text(page, doc.title, M, y, 22, fonts.title, INK, usable)
  if (doc.subtitle) {
    y -= 16
    text(page, doc.subtitle, M, y, 10, fonts.regular, MUTED, usable)
  }
  y -= 16

  // ── Field strip ────────────────────────────────────────────────────────────
  if (doc.fields?.length) {
    const h = 34
    const weight = doc.fields.reduce((sum, f) => sum + (f.width ?? 1), 0)
    page.drawRectangle({ x: M, y: y - h, width: usable, height: h, color: PAPER, borderColor: RULE, borderWidth: 0.8 })
    let fx = M
    doc.fields.forEach((f, i) => {
      const w = ((f.width ?? 1) / weight) * usable
      const x = fx
      fx += w
      if (i > 0) page.drawLine({ start: { x, y: y - h }, end: { x, y }, thickness: 0.8, color: RULE })
      text(page, f.label.toUpperCase(), x + 8, y - 12, 6.5, fonts.bold, MUTED, w - 12)
      text(page, f.value, x + 8, y - 26, 9.5, fonts.bold, INK, w - 12)
    })
    y -= h + 12
  }

  // ── Summary tiles ──────────────────────────────────────────────────────────
  if (doc.stats?.length) {
    const h = 42
    const gap = 8
    const w = (usable - gap * (doc.stats.length - 1)) / doc.stats.length
    doc.stats.forEach((s, i) => {
      const x = M + i * (w + gap)
      const tone = s.tone && s.tone !== "none" ? TONES[s.tone] : null
      page.drawRectangle({ x, y: y - h, width: w, height: h, color: tone?.bg ?? WHITE, borderColor: tone?.line ?? RULE, borderWidth: 0.8 })
      page.drawRectangle({ x, y: y - 3, width: w, height: 3, color: tone?.fg ?? BLUE })
      text(page, s.value, x + 9, y - 25, 16, fonts.bold, tone?.fg ?? INK, w - 14)
      text(page, s.label, x + 9, y - 36, 7.5, fonts.regular, tone?.fg ?? MUTED, w - 14)
    })
    y -= h + 16
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  tableHeader()
  doc.rows.forEach((row, r) => {
    if (y - rowH < FOOT + 6) newPage()
    if (r % 2 === 1) page.drawRectangle({ x: M, y: y - rowH, width: usable, height: rowH, color: ZEBRA })
    row.forEach((cell, i) => {
      const c = typeof cell === "string" ? { text: cell } : cell
      const tone = c.tone && c.tone !== "none" ? TONES[c.tone] : null
      const align = doc.columns[i]?.align ?? "left"
      const baseY = y - rowH + (rowH - size) / 2 + 1

      if (tone && !c.stamp) {
        // Dense grid mark: the whole cell becomes the stamp.
        page.drawRectangle({ x: xs[i] + 1, y: y - rowH + 1.5, width: widths[i] - 2, height: rowH - 3, color: tone.bg, borderColor: tone.line, borderWidth: 0.6 })
        const t = fit(c.text, fonts.bold, size, widths[i] - 2)
        page.drawText(t, { x: xs[i] + (widths[i] - fonts.bold.widthOfTextAtSize(t, size)) / 2, y: baseY, size, font: fonts.bold, color: tone.fg })
        return
      }

      let x = xs[i] + 4
      let room = widths[i] - 8
      if (c.stamp) {
        const sq = rowH - 5
        const tn = tone ?? TONES.muted
        page.drawRectangle({ x, y: y - rowH + 2.5, width: sq, height: sq, color: tn.bg, borderColor: tn.line, borderWidth: 0.7 })
        const letter = pdfSafe(c.stamp)
        page.drawText(letter, { x: x + (sq - fonts.bold.widthOfTextAtSize(letter, size)) / 2, y: baseY, size, font: fonts.bold, color: tn.fg })
        x += sq + 5
        room -= sq + 5
      }
      const font = c.bold || tone ? fonts.bold : fonts.regular
      const t = fit(c.text, font, size, room)
      const tw = font.widthOfTextAtSize(t, size)
      const tx = c.stamp || align === "left" ? x : align === "right" ? xs[i] + widths[i] - tw - 4 : xs[i] + (widths[i] - tw) / 2
      page.drawText(t, { x: tx, y: baseY, size, font, color: tone?.fg ?? INK })
    })
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + usable, y: y - rowH }, thickness: 0.5, color: RULE })
    y -= rowH
  })
  // Table frame
  page.drawLine({ start: { x: M, y: y }, end: { x: M + usable, y: y }, thickness: 1, color: RULE_STRONG })

  // ── Legend and notes ───────────────────────────────────────────────────────
  if (doc.legend?.length || doc.notes?.length) {
    y -= 16
    if (y < FOOT + 30) {
      page = pdf.addPage([pw, ph])
      drawSlim()
    }
    if (doc.legend?.length) {
      let x = M
      for (const [letter, tone, word] of doc.legend) {
        const tn = tone !== "none" ? TONES[tone] : TONES.muted
        page.drawRectangle({ x, y: y - 3, width: 11, height: 11, color: tn.bg, borderColor: tn.line, borderWidth: 0.6 })
        page.drawText(pdfSafe(letter), { x: x + (11 - fonts.bold.widthOfTextAtSize(pdfSafe(letter), 7)) / 2, y: y, size: 7, font: fonts.bold, color: tn.fg })
        x += 15
        text(page, word, x, y, 8, fonts.regular, INK)
        x += fonts.regular.widthOfTextAtSize(pdfSafe(word), 8) + 14
      }
      y -= 16
    }
    for (const n of doc.notes ?? []) {
      text(page, n, M, y, 8, fonts.regular, MUTED, usable)
      y -= 12
    }
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: FOOT - 6 }, end: { x: pw - M, y: FOOT - 6 }, thickness: 0.6, color: RULE })
    text(p, `${doc.appName}  |  ${doc.labels.generated} ${doc.generatedAt}  |  ${doc.labels.timeZone}`, M, FOOT - 18, 7, fonts.regular, MUTED, usable - 90)
    textRight(p, `${doc.labels.page} ${i + 1} ${doc.labels.of} ${pages.length}`, pw - M, FOOT - 18, 7.5, fonts.bold, INK)

    const markH = 9
    const markW = drawCajiibMark(p, M, 10, markH)
    const credit = `${doc.labels.builtBy} ${CAJIIB.name}  -  ${CAJIIB.host}`
    text(p, credit, M + markW + 5, 12, 7, fonts.regular, MUTED)
    const linkW = markW + 5 + fonts.regular.widthOfTextAtSize(pdfSafe(credit), 7)
    addLink(pdf, p, [M, 8, M + linkW, 10 + markH + 2], CAJIIB.url)
  })

  return pdf.save()
}
