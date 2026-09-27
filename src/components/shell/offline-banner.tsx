"use client"

import { useTranslations } from "next-intl"
import { WifiOff } from "lucide-react"
import { useOnline } from "@/hooks/use-online"

export function OfflineBanner() {
  const online = useOnline()
  const t = useTranslations("offline")
  if (online) return null
  return (
    <div role="alert" className="flex items-center justify-center gap-2 border-b border-excused/30 bg-excused-bg px-4 py-2 text-[13px] font-medium text-excused">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      {t("banner")}
    </div>
  )
}
