import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { activeClasses } from "@/lib/data/teacher"
import { formatDateTime } from "@/lib/time"
import { TEMPLATE_COLUMNS } from "@/lib/import"
import { PageHeader } from "@/components/app/page-header"
import { ImportWizard } from "@/components/import/import-wizard"
import { Step } from "@/components/import/step"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Import" }

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const sp = await searchParams
  const teacher = await requireTeacher()
  const t = await getTranslations("import")
  const locale = await getLocale()
  const classes = await activeClasses(teacher.id)

  const history = await prisma.importBatch.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      fileName: true,
      totalRows: true,
      importedRows: true,
      errorRows: true,
      duplicateRows: true,
      errorFile: true,
      createdAt: true,
      class: { select: { name: true } },
    },
  })

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Step n={1} title={t("step1")}>
            <p className="text-sm text-muted-foreground">{t("step1Body")}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((c) => (
                <code key={c} className="num rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11.5px]">
                  {c}
                </code>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="/api/import/template" download>
                  <FileSpreadsheet /> {t("templateExcel")}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/import/template?format=csv" download>
                  <FileText /> {t("templateCsv")}
                </a>
              </Button>
            </div>
          </Step>
          <ImportWizard classes={classes} defaultClassId={classes.some((c) => c.id === sp.classId) ? sp.classId! : ""} />
        </div>

        <aside>
          <h2 className="eyebrow mb-3">{t("history")}</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
          ) : (
            <ol className="overflow-hidden rounded-lg border border-border bg-card">
              {history.map((b) => (
                <li key={b.id} className="border-b border-border px-4 py-3 last:border-0">
                  <p className="num truncate text-[13px] font-medium" title={b.fileName}>
                    {b.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.class?.name && <span className="font-serif font-semibold text-foreground">{b.class.name} · </span>}
                    <span className="num">{formatDateTime(b.createdAt, locale)}</span>
                  </p>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="bg-present" style={{ width: `${(b.importedRows / Math.max(b.totalRows, 1)) * 100}%` }} />
                    <span className="bg-absent" style={{ width: `${(b.errorRows / Math.max(b.totalRows, 1)) * 100}%` }} />
                    <span className="bg-excused" style={{ width: `${(b.duplicateRows / Math.max(b.totalRows, 1)) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="num text-xs">{t("counts", { imported: b.importedRows, total: b.totalRows })}</span>
                    {b.errorFile && (
                      <a href={`/api/import/${b.id}/errors`} download className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Download className="h-3 w-3" /> {t("errorFile")}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </>
  )
}
