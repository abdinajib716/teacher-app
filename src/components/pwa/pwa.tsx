"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Download, Share, SquarePlus } from "lucide-react"
import { isIOS } from "@/lib/message"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RegisterGlyph } from "@/components/logo"

/** Registers the service worker (production builds only, to keep dev fresh). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
  }, [])
  return null
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * "Install app": the browser's own install prompt where there is one
 * (Android, desktop Chrome/Edge), step-by-step help on iPhone, and nothing
 * once the app is already installed.
 */
export function InstallApp({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  const t = useTranslations("pwa")
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [hidden, setHidden] = useState(true)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallEvent)
      setHidden(false)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    if (isIOS(navigator.userAgent)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIos(true)
      setHidden(false)
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (hidden) return null

  const onClick = async () => {
    if (prompt) {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === "accepted") setHidden(true)
      setPrompt(null)
    } else if (ios) {
      setHelp(true)
    }
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={onClick}
          title={t("install")}
          className="mb-1 flex h-9 w-full items-center gap-2.5 rounded-md border border-dashed border-primary/40 px-2.5 text-[13.5px] font-medium text-primary transition-colors hover:bg-primary-soft sidebar-collapsed:justify-center sidebar-collapsed:px-0"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sidebar-collapsed:hidden">{t("install")}</span>
        </button>
      ) : (
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onClick} aria-label={t("install")} title={t("install")}>
          <Download />
        </Button>
      )}

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <RegisterGlyph className="h-7 w-7" />
            </span>
            <DialogTitle>{t("installTitle")}</DialogTitle>
            <DialogDescription>{t("installBody")}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
            <li className="flex items-center gap-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-foreground text-xs font-semibold text-background">1</span>
              <Share className="h-4 w-4 shrink-0 text-primary" /> Safari · Share
            </li>
            <li className="flex items-center gap-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-foreground text-xs font-semibold text-background">2</span>
              <SquarePlus className="h-4 w-4 shrink-0 text-primary" /> Add to Home Screen
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">{t("iosSteps")}</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
