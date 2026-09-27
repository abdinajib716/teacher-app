"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

/** Collapses the desktop sidebar to icons; remembered in localStorage. */
export function SidebarCollapseToggle() {
  const t = useTranslations("nav")
  const [collapsed, setCollapsed] = useState<boolean | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(document.documentElement.classList.contains("sidebar-collapsed"))
  }, [])

  function toggle() {
    const next = !document.documentElement.classList.contains("sidebar-collapsed")
    document.documentElement.classList.toggle("sidebar-collapsed", next)
    try {
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0")
    } catch {}
    setCollapsed(next)
  }

  const label = collapsed ? t("expand") : t("collapse")
  return (
    <button
      aria-label={label}
      title={label}
      onClick={toggle}
      className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:flex"
    >
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
    </button>
  )
}
