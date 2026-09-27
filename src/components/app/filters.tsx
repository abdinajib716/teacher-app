"use client"

import { useRef, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { Input, fieldClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Updates the URL's search params, which the server page reads. */
export function useSetParams() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const set = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k)
      else next.set(k, v)
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }
  return { set, params, pending }
}

/** Native select styled like the other fields, with its own chevron. */
export const selectClass = cn(fieldClass, "field-select h-10 cursor-pointer pr-9")

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  )
}

export function DateRangeFilter({ from, to, className }: { from: string; to: string; className?: string }) {
  const t = useTranslations("common")
  const { set, pending } = useSetParams()
  return (
    <div className={cn("flex items-end gap-2", pending && "opacity-60", className)}>
      <div>
        <FieldLabel htmlFor="range-from">{t("from")}</FieldLabel>
        <Input id="range-from" type="date" defaultValue={from} max={to} className="num w-[9.5rem]" onChange={(e) => e.target.value && set({ from: e.target.value })} />
      </div>
      <span className="pb-2.5 text-muted-foreground" aria-hidden="true">
        –
      </span>
      <div>
        <FieldLabel htmlFor="range-to">{t("to")}</FieldLabel>
        <Input id="range-to" type="date" defaultValue={to} min={from} className="num w-[9.5rem]" onChange={(e) => e.target.value && set({ to: e.target.value })} />
      </div>
    </div>
  )
}

export function ParamSelect({
  name,
  value,
  label,
  options,
  allLabel,
  className,
}: {
  name: string
  value: string
  label: string
  options: { value: string; label: string }[]
  allLabel?: string
  className?: string
}) {
  const { set, pending } = useSetParams()
  return (
    <div className={className}>
      <FieldLabel htmlFor={`f-${name}`}>{label}</FieldLabel>
      <select
        id={`f-${name}`}
        value={value}
        disabled={pending}
        onChange={(e) => set({ [name]: e.target.value })}
        className={cn(selectClass, "min-w-40")}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SearchParamInput({ value, placeholder }: { value: string; placeholder: string }) {
  const { set } = useSetParams()
  const timer = useRef<number | undefined>(undefined)
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        defaultValue={value}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
        onChange={(e) => {
          const v = e.target.value
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => set({ q: v }), 300)
        }}
      />
    </div>
  )
}

/** A labelled switch that writes a "1" flag to the URL. */
export function ParamSwitch({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  const { set } = useSetParams()
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-3 text-[13px] text-muted-foreground hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => set({ [name]: e.target.checked ? "1" : null })}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  )
}
