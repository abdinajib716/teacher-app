import Link from "next/link"
import { requireTeacherSettings } from "@/lib/data/teacher"
import { Logo, LogoMark } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitch } from "@/components/language-switch"
import { SidebarNav } from "@/components/shell/sidebar-nav"
import { MobileNav } from "@/components/shell/mobile-nav"
import { SignOutButton } from "@/components/shell/sign-out-button"
import { SidebarCollapseToggle } from "@/components/shell/sidebar-collapse-toggle"
import { OfflineBanner } from "@/components/shell/offline-banner"
import { MogadishuClock } from "@/components/shell/mogadishu-clock"
import { InstallApp } from "@/components/pwa/pwa"
import { CajiibCredit } from "@/components/brand/cajiib-credit"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacherSettings()
  const initials =
    teacher.name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "T"

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-muted/50 transition-[width] duration-200 md:flex sidebar-collapsed:w-16">
        <div className="flex h-14 items-center border-b border-border px-4 sidebar-collapsed:justify-center sidebar-collapsed:px-0">
          <Link href="/dashboard" className="flex min-w-0 items-center" aria-label="Dashboard">
            <span className="sidebar-collapsed:hidden">
              <Logo wordmarkClassName="truncate text-[15px]" />
            </span>
            <span className="hidden sidebar-collapsed:block">
              <LogoMark />
            </span>
          </Link>
        </div>
        <SidebarNav />
        <div className="border-t border-border p-3">
          <div className="mb-1 flex items-center gap-2.5 px-2.5 py-2 sidebar-collapsed:justify-center sidebar-collapsed:px-0">
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-card text-[11px] font-semibold">
              {initials}
            </span>
            <div className="min-w-0 leading-tight sidebar-collapsed:hidden">
              <p className="truncate text-[13px] font-semibold">{teacher.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{teacher.school ?? teacher.email}</p>
            </div>
          </div>
          <InstallApp />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-sm md:px-6">
          <SidebarCollapseToggle />
          <MobileNav />
          <Link href="/dashboard" className="md:hidden" aria-label="Dashboard">
            <LogoMark className="h-7 w-7" iconClassName="h-4 w-4" />
          </Link>
          <MogadishuClock />
          <div className="ml-auto flex items-center gap-2">
            <span className="md:hidden">
              <InstallApp variant="header" />
            </span>
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 md:px-8 md:pt-8">{children}</main>
        <CajiibCredit />
      </div>
    </div>
  )
}
