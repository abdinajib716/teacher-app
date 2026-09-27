"use client"

import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from "lucide-react"
import { useSetParams, selectClass, FieldLabel } from "@/components/app/filters"
import { Stamp } from "@/components/app/status"
import { STATUSES } from "@/lib/attendance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function RegisterControls({ classes, classId, month }: { classes: { id: string; name: string }[]; classId: string; month: string }) {
  const t = useTranslations("register")
  const tc = useTranslations("common")
  const { set, pending } = useSetParams()
  const exportHref = (format: "pdf" | "xlsx") => `/api/export/register?classId=${classId}&month=${month}&format=${format}`

  return (
    <div className={cn("mb-6 flex flex-wrap items-end gap-3", pending && "opacity-60")}>
      <div>
        <FieldLabel htmlFor="reg-class">{tc("class")}</FieldLabel>
        <select id="reg-class" value={classId} onChange={(e) => set({ classId: e.target.value })} className={cn(selectClass, "min-w-40")}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel htmlFor="reg-month">{t("month")}</FieldLabel>
        <div className="flex">
          <Button
            variant="outline"
            size="icon"
            className="h-10 rounded-r-none border-r-0"
            aria-label="Previous month"
            onClick={() => set({ month: shiftMonth(month, -1) })}
          >
            <ChevronLeft />
          </Button>
          <Input
            id="reg-month"
            type="month"
            value={month}
            onChange={(e) => e.target.value && set({ month: e.target.value })}
            className="num w-48 rounded-none"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-10 rounded-l-none border-l-0"
            aria-label="Next month"
            onClick={() => set({ month: shiftMonth(month, 1) })}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {classId && (
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline">
            <a href={exportHref("pdf")} download>
              <FileText /> {tc("exportPdf")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={exportHref("xlsx")} download>
              <FileSpreadsheet /> {tc("exportExcel")}
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

export function RegisterLegend() {
  const ts = useTranslations("status")
  const tc = useTranslations("common")
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {STATUSES.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <Stamp status={s} size="sm" /> {ts(s)}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="num flex h-5 w-5 items-center justify-center text-border-strong">·</span> {tc("notTaken")}
      </span>
    </div>
  )
}
