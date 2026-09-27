import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string
  subtitle?: string
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-5 flex flex-col gap-4 border-b border-border pb-4 sm:mb-6 sm:pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 hidden max-w-2xl text-sm text-muted-foreground sm:block">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function EmptyState({
  title,
  body,
  icon: Icon = Inbox,
  children,
}: {
  title: string
  body?: string
  icon?: LucideIcon
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-card/60 px-6 py-14 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

/** A labelled group of fields or filters sitting on the page. */
export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end gap-3">{children}</div>
}
