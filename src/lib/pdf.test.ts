import { describe, expect, it } from "vitest"
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib"
import { pdfSafe, renderTable } from "./pdf"

describe("pdfSafe", () => {
  it("keeps Latin text and replaces what the standard fonts cannot draw", () => {
    expect(pdfSafe("Cabdiraxmaan Maxamed")).toBe("Cabdiraxmaan Maxamed")
    expect(pdfSafe("“Fasax” – ok")).toBe('"Fasax" - ok')
    expect(pdfSafe("✓ done")).toBe(" done")
  })
})

describe("renderTable", () => {
  it("produces a multi-page PDF with the shared template", async () => {
    const bytes = await renderTable({
      appName: "Teacher Attendance",
      kind: "Attendance receipt",
      title: "F3C - Break 1",
      subtitle: "Sat, 26 Sep 2026",
      school: "Demo Secondary School",
      teacher: "Karshe",
      fields: [
        { label: "Class", value: "F3C" },
        { label: "Break", value: "1" },
      ],
      stats: [
        { label: "Present", value: "118", tone: "present" },
        { label: "Absent", value: "2", tone: "absent" },
      ],
      columns: [
        { header: "#", width: 1, align: "right" },
        { header: "Name", width: 6 },
        { header: "Status", width: 3 },
      ],
      rows: Array.from({ length: 120 }, (_, i) => [String(i + 1), `Student ${i + 1}`, { text: "Present", tone: "present" as const, stamp: "P" }]),
      legend: [["P", "present", "Joogid"]],
      notes: ["Excused is left out of the percentage."],
      generatedAt: "26 Sep 2026, 1:05 PM",
      labels: { page: "Page", of: "of", generated: "Generated", timeZone: "Africa/Mogadishu (UTC+3)", builtBy: "Designed & built by" },
    })
    const head = new TextDecoder().decode(bytes.slice(0, 5))
    expect(head).toBe("%PDF-")
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThan(2)
    // Every page carries the credit link to the studio.
    for (const page of doc.getPages()) {
      const annots = page.node.lookup(PDFName.of("Annots"), PDFArray)
      const link = annots.lookup(0, PDFDict).lookup(PDFName.of("A"), PDFDict)
      expect(link.lookup(PDFName.of("URI"), PDFString).decodeText()).toBe("https://cajiibcreative.mrk.so/")
    }
  })
})
