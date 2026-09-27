"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/logo"
import { SidebarNav } from "./sidebar-nav"
import { SignOutButton } from "./sign-out-button"

/** The sidebar as a slide-in sheet below `md`. */
export function MobileNav() {
  const t = useTranslations("nav")
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={t("openNavigation")}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong bg-card text-foreground md:hidden"
        >
          <Menu size={18} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col bg-background p-0">
        <SheetTitle className="flex h-14 items-center border-b border-border px-4">
          <Logo />
        </SheetTitle>
        <SidebarNav onNavigate={() => setOpen(false)} />
        <div className="border-t border-border p-3">
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  )
}
