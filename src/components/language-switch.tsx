"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { setLanguage } from "@/app/actions/auth"
import { LOCALES } from "@/i18n/config"
import { cn } from "@/lib/utils"

/** Somali / English. Saved on the account when signed in. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale()
  const t = useTranslations()
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn("inline-flex h-8 items-stretch overflow-hidden rounded-md border border-border-strong bg-card", pending && "opacity-60", className)}
    >
      {LOCALES.map((l, i) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={locale === l}
          title={t(`languages.${l}`)}
          onClick={() =>
            start(async () => {
              await setLanguage(l)
              router.refresh()
            })
          }
          className={cn(
            "num px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
            i > 0 && "border-l border-border-strong",
            locale === l ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {l}
          <span className="sr-only"> {t(`languages.${l}`)}</span>
        </button>
      ))}
    </div>
  )
}
