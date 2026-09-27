import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"

/**
 * The mark: a corner of the register sheet. Two columns of cells (Break 1,
 * Break 2) with one day marked. Drawn in currentColor so it follows the theme.
 */
export function RegisterGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M3 15h18M12 3v18" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <rect x="4.6" y="4.6" width="5.8" height="2.8" rx="0.6" fill="currentColor" />
      <path d="m13.8 12 1.6 1.5 3-3.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoMark({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground", className)}>
      <RegisterGlyph className={cn("h-5 w-5", iconClassName)} />
    </span>
  )
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-serif text-[17px] font-semibold leading-none tracking-tight", wordmarkClassName)}>
        {siteConfig.name}
      </span>
    </span>
  )
}
