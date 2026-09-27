"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2, Copy, Upload } from "lucide-react"
import { previewImport, confirmImport, type PreviewRow } from "@/app/actions/import"
import { formatPhone } from "@/lib/phone"
import { FieldLabel, selectClass } from "@/components/app/filters"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Step } from "./step"

export function ImportWizard({ classes, defaultClassId }: { classes: { id: string; name: string }[]; defaultClassId: string }) {
  const t = useTranslations("import")
  const tc = useTranslations("common")
  const te = useTranslations("errors")
  const router = useRouter()
  const [classId, setClassId] = useState(defaultClassId || classes[0]?.id || "")
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [previewing, startPreview] = useTransition()
  const [importing, startImport] = useTransition()

  const good = rows?.filter((r) => r.errors.length === 0 && !r.duplicate).length ?? 0
  const withErrors = rows?.filter((r) => r.errors.length > 0).length ?? 0
  const duplicates = rows?.filter((r) => r.errors.length === 0 && r.duplicate).length ?? 0

  const form = () => {
    const fd = new FormData()
    if (file) fd.set("file", file)
    fd.set("classId", classId)
    return fd
  }
  const showError = (key: string) => toast.error(te.has(key) ? te(key) : te("generic"))

  return (
    <>
      <Step n={2} title={t("step2")}>
        <form
          className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            startPreview(async () => {
              const res = await previewImport(form())
              if (!res.ok) {
                showError(res.error)
                return
              }
              setRows(res.data.rows)
            })
          }}
        >
          <div>
            <FieldLabel htmlFor="imp-class">{tc("class")}</FieldLabel>
            <select id="imp-class" required value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
              <option value="">{tc("selectClass")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="imp-file">{t("file")}</FieldLabel>
            <label
              htmlFor="imp-file"
              className={cn(
                "flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-strong bg-muted/40 px-3 text-sm transition-colors hover:border-primary hover:bg-primary-soft",
                file && "border-solid bg-card"
              )}
            >
              <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={cn("num truncate", !file && "text-muted-foreground")}>{file ? file.name : ".xlsx · .csv"}</span>
            </label>
            <input
              id="imp-file"
              type="file"
              required
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setRows(null)
              }}
              className="sr-only"
            />
          </div>
          <Button type="submit" variant="outline" loading={previewing} disabled={!file}>
            {t("preview")}
          </Button>
        </form>
      </Step>

      {rows && (
        <Step
          n={3}
          title={t("step3")}
          aside={
            <Button
              disabled={good === 0 || !classId}
              loading={importing}
              onClick={() =>
                startImport(async () => {
                  const res = await confirmImport(form())
                  if (!res.ok) {
                    showError(res.error)
                    return
                  }
                  toast.success(t("done", { imported: res.data.imported, skipped: res.data.skipped }))
                  setRows(null)
                  setFile(null)
                  router.refresh()
                })
              }
            >
              {t("confirm", { count: good })}
            </Button>
          }
        >
          <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 text-present">
              <CheckCircle2 className="h-4 w-4" /> <dd className="num font-semibold">{good}</dd> <dt>{t("rowOk")}</dt>
            </div>
            <div className="flex items-center gap-1.5 text-absent">
              <AlertCircle className="h-4 w-4" /> <dd className="num font-semibold">{withErrors}</dd> <dt>{t("withErrors")}</dt>
            </div>
            <div className="flex items-center gap-1.5 text-excused">
              <Copy className="h-4 w-4" /> <dd className="num font-semibold">{duplicates}</dd> <dt>{t("duplicate")}</dt>
            </div>
          </dl>
          <div className="max-h-[55vh] overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead className="w-12 text-right">{t("line")}</TableHead>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{tc("studentNo")}</TableHead>
                  <TableHead>{tc("gender")}</TableHead>
                  <TableHead>{tc("guardian")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const bad = r.errors.length > 0
                  return (
                    <TableRow key={r.line} className={cn(bad && "bg-absent-bg/50", !bad && r.duplicate && "bg-excused-bg/50")}>
                      <TableCell className="num text-right text-xs text-muted-foreground">{r.line}</TableCell>
                      <TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell className="num text-[13px]">{r.studentNo ?? "—"}</TableCell>
                      <TableCell className="text-[13px]">{r.gender === "MALE" ? tc("male") : r.gender === "FEMALE" ? tc("female") : "—"}</TableCell>
                      <TableCell className="text-[13px]">
                        {r.guardianName ?? "—"}
                        <span className="num block text-xs text-muted-foreground">
                          {[r.phone1, r.phone2]
                            .filter(Boolean)
                            .map((p) => formatPhone(p))
                            .join(" · ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {bad ? (
                          <span className="flex items-start gap-1.5 text-absent">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {r.errors.map((e) => t(`errors.${e}`)).join("; ")}
                          </span>
                        ) : r.duplicate ? (
                          <span className="flex items-center gap-1.5 text-excused">
                            <Copy className="h-3.5 w-3.5" /> {t("duplicate")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-present">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("rowOk")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Step>
      )}
    </>
  )
}
