"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/** Inline ring spinner for buttons and compact pending states. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  )
}

/**
 * Page-level loading state: a thin progress rule under the header and a
 * skeleton of ruled lines, the shape of what is coming, instead of a spinner.
 */
export function BrandLoader({ label, className }: { label?: string; className?: string }) {
  const t = useTranslations("loading")
  return (
    <div role="status" aria-live="polite" className={cn("space-y-6", className)}>
      <div className="relative h-0.5 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary animate-[progress-slide_1.1s_ease-in-out_infinite]" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-md bg-muted/70" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="h-3 w-6 rounded-sm bg-muted" />
            <div className="h-3 rounded-sm bg-muted" style={{ width: `${40 - (i % 3) * 8}%` }} />
            <div className="ml-auto h-6 w-24 rounded-sm bg-muted/70" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label ?? t("default")}</span>
    </div>
  )
}
