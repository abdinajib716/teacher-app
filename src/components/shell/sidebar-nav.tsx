"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { NAV_GROUPS } from "./nav-items"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav")
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.key} className="mb-5 last:mb-0">
          <p className="eyebrow mb-1.5 px-2.5 sidebar-collapsed:sr-only">{t(`groups.${group.key}`)}</p>
          <ul className="space-y-px">
            {group.items.map(({ href, key, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={t(key)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors sidebar-collapsed:justify-center sidebar-collapsed:px-0",
                      active
                        ? "bg-card font-semibold text-foreground shadow-[0_0_0_1px_var(--border)] before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r-sm before:bg-primary"
                        : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} aria-hidden="true" />
                    <span className="truncate sidebar-collapsed:hidden">{t(key)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
