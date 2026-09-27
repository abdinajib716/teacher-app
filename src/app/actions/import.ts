"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { audit } from "@/lib/audit"
import { readSpreadsheet } from "@/lib/spreadsheet"
import { errorFileCsv, validateRows, type ImportRow } from "@/lib/import"
import { fail, ok, type ActionResult } from "@/lib/action"

async function readAndValidate(teacherId: string, formData: FormData) {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "fileRequired" as const }
  const read = await readSpreadsheet(file)
  if ("error" in read) return { error: read.error }

  const existing = await prisma.student.findMany({
    where: { teacherId, studentNo: { not: null } },
    select: { studentNo: true },
  })
  const rows = validateRows(read.rows, new Set(existing.map((s) => s.studentNo!.toLowerCase())))
  return { file, rows }
}

export type PreviewRow = Omit<ImportRow, "raw">

/** Reads the file and reports what would be imported, without saving. */
export async function previewImport(formData: FormData): Promise<ActionResult<{ rows: PreviewRow[] }>> {
  const teacher = await requireTeacher()
  const result = await readAndValidate(teacher.id, formData)
  if ("error" in result) return fail(result.error!)
  // The raw cells stay on the server: the preview needs only the parsed row.
  return ok({
    rows: result.rows.map((r) => ({
      line: r.line,
      name: r.name,
      studentNo: r.studentNo,
      gender: r.gender,
      guardianName: r.guardianName,
      phone1: r.phone1,
      phone2: r.phone2,
      errors: r.errors,
      duplicate: r.duplicate,
    })),
  })
}

/**
 * Imports the file into a class. The file is read and validated again here,
 * not trusted from the preview: rows with errors and duplicates are skipped
 * and written to the error file; everything else is saved in one transaction.
 *
 * Guardians are matched on phone number within the teacher's own guardians
 * (and within the file), so two brothers sharing one number share one
 * guardian.
 */
export async function confirmImport(
  formData: FormData
): Promise<ActionResult<{ batchId: string; imported: number; skipped: number }>> {
  const teacher = await requireTeacher()
  const classId = String(formData.get("classId") ?? "")
  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, teacherId: teacher.id }, select: { id: true } })
  if (!cls) return fail("classRequired")

  const result = await readAndValidate(teacher.id, formData)
  if ("error" in result) return fail(result.error!)
  const { file, rows } = result

  const good = rows.filter((r) => r.errors.length === 0 && !r.duplicate)
  const t = await getTranslations("import.errors")
  const errorFile = errorFileCsv(rows, (r) =>
    [...r.errors.map((e) => t(e)), ...(r.duplicate ? [t("duplicate")] : [])].join("; ")
  )

  const batch = await prisma.$transaction(
    async (tx) => {
      const phones = [...new Set(good.flatMap((r) => [r.phone1, r.phone2]).filter((p): p is string => Boolean(p)))]
      const known = await tx.guardian.findMany({
        where: { teacherId: teacher.id, OR: [{ phone1: { in: phones } }, { phone2: { in: phones } }] },
        select: { id: true, phone1: true, phone2: true },
      })
      const byPhone = new Map<string, string>()
      for (const g of known) {
        if (g.phone1) byPhone.set(g.phone1, g.id)
        if (g.phone2) byPhone.set(g.phone2, g.id)
      }

      const students = []
      for (const r of good) {
        let guardianId: string | null = null
        if (r.guardianName || r.phone1 || r.phone2) {
          guardianId = (r.phone1 && byPhone.get(r.phone1)) || (r.phone2 && byPhone.get(r.phone2)) || null
          if (!guardianId) {
            const g = await tx.guardian.create({
              data: { teacherId: teacher.id, name: r.guardianName ?? r.name, phone1: r.phone1, phone2: r.phone2 },
            })
            guardianId = g.id
            if (r.phone1) byPhone.set(r.phone1, g.id)
            if (r.phone2) byPhone.set(r.phone2, g.id)
          }
        }
        students.push({ teacherId: teacher.id, classId, guardianId, name: r.name, studentNo: r.studentNo, gender: r.gender! })
      }
      await tx.student.createMany({ data: students })

      return tx.importBatch.create({
        data: {
          teacherId: teacher.id,
          classId,
          fileName: file.name.slice(0, 200),
          totalRows: rows.length,
          importedRows: good.length,
          errorRows: rows.filter((r) => r.errors.length > 0).length,
          duplicateRows: rows.filter((r) => r.errors.length === 0 && r.duplicate).length,
          errorFile,
        },
      })
    },
    { timeout: 60_000 }
  )

  await audit({
    teacherId: teacher.id,
    entity: "import_batch",
    entityId: batch.id,
    action: "import",
    newValues: { classId, imported: batch.importedRows, total: batch.totalRows },
  })
  revalidatePath("/students")
  revalidatePath("/import")
  return ok({ batchId: batch.id, imported: good.length, skipped: rows.length - good.length })
}
