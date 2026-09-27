import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-[32px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function AuthMessage({ tone, children }: { tone: "error" | "success" | "warning"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info
  const styles = {
    error: "border-absent/30 bg-absent-bg text-absent",
    success: "border-present/30 bg-present-bg text-present",
    warning: "border-excused/30 bg-excused-bg text-excused",
  }[tone]
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("mb-5 flex gap-2.5 rounded-md border px-3 py-2.5 text-sm", styles)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export const authInput = "h-11 text-[15px]"
export const authButton =
  "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
export const authLabel = "mb-1.5 block text-[13px] font-medium"
