import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {children}
    </Link>
  )
}

const COLS: Record<number, string> = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5" }

/** A ruled strip of figures: one border, hairline dividers, mono numbers. */
export function FigureStrip({ items, className = "" }: { items: { label: React.ReactNode; value: React.ReactNode; tone?: string }[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border ${COLS[Math.min(items.length, 5)] ?? ""} ${className}`}>
      {items.map((f, i) => (
        <div key={i} className="bg-card px-4 py-3.5">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className={`num mt-1 text-2xl font-semibold leading-tight ${f.tone ?? ""}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between gap-3">
      <h2 className="font-serif text-xl font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  )
}
