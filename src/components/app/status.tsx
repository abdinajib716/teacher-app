"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { STATUS_LETTER, type Status } from "@/lib/attendance"

/** Stamp colours: tinted paper, ink-coloured letter and rule. */
export const STATUS_STYLE: Record<Status, string> = {
  PRESENT: "bg-present-bg text-present border-present/35",
  ABSENT: "bg-absent-bg text-absent border-absent/35",
  EXCUSED: "bg-excused-bg text-excused border-excused/35",
}

/** Solid version, for the selected state of a control. */
export const STATUS_SOLID: Record<Status, string> = {
  PRESENT: "bg-present text-white border-present dark:text-[#0f1a13]",
  ABSENT: "bg-absent text-white border-absent dark:text-[#1f0f0d]",
  EXCUSED: "bg-excused text-white border-excused dark:text-[#1f170a]",
}

/**
 * A register stamp: the P / A / E letter in a square, as it is written on the
 * paper sheet. The letter is the non-colour cue, so colour is never alone.
 */
export function Stamp({ status, size = "md", className }: { status: Status | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const t = useTranslations("status")
  const dims = size === "sm" ? "h-5 w-5 text-[10px]" : size === "lg" ? "h-9 w-9 text-sm" : "h-6 w-6 text-[11px]"
  return (
    <span
      className={cn(
        "num inline-flex shrink-0 items-center justify-center rounded-sm border font-semibold",
        dims,
        status ? STATUS_STYLE[status] : "border-dashed border-border-strong text-muted-foreground",
        className
      )}
      title={status ? t(status) : t("notMarked")}
    >
      <span aria-hidden="true">{status ? STATUS_LETTER[status] : "–"}</span>
      <span className="sr-only">{status ? t(status) : t("notMarked")}</span>
    </span>
  )
}

/** Stamp with its word beside it. */
export function StatusChip({ status, withLabel = true }: { status: Status | null; size?: "sm" | "md"; withLabel?: boolean }) {
  const t = useTranslations("status")
  return (
    <span className="inline-flex items-center gap-2">
      <Stamp status={status} />
      {withLabel && (
        <span className={cn("text-[13px] font-medium", status ? "text-foreground" : "text-muted-foreground")}>
          {status ? t(status) : t("notMarked")}
        </span>
      )}
    </span>
  )
}

export function RateText({ rate, threshold, className }: { rate: number | null; threshold?: number; className?: string }) {
  if (rate === null) return <span className={cn("num text-muted-foreground", className)}>—</span>
  const low = threshold !== undefined && rate < threshold
  return <span className={cn("num font-medium", low && "text-absent", className)}>{rate}%</span>
}

/** A thin bar showing a rate, for tables and lists. */
export function RateBar({ rate, threshold }: { rate: number | null; threshold?: number }) {
  const low = rate !== null && threshold !== undefined && rate < threshold
  return (
    <span className="flex items-center gap-2">
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", low ? "bg-absent" : "bg-primary")}
          style={{ width: `${rate ?? 0}%` }}
        />
      </span>
      <RateText rate={rate} threshold={threshold} className="w-12 text-right text-[13px]" />
    </span>
  )
}
