import "server-only"
import { getTranslations } from "next-intl/server"
import { siteConfig } from "@/config/site"
import { formatDateTime } from "@/lib/time"
import type { DocLabels, Tone } from "@/lib/pdf"
import { STATUSES, STATUS_LETTER, STATUS_SOMALI } from "@/lib/attendance"

/** The shared, localized parts of every generated document. */
export async function docChrome(locale: string): Promise<{ appName: string; generatedAt: string; labels: DocLabels }> {
  const t = await getTranslations({ locale, namespace: "pdf" })
  return {
    appName: siteConfig.name,
    generatedAt: formatDateTime(new Date(), locale),
    labels: {
      page: t("page"),
      of: t("of"),
      generated: t("generated"),
      timeZone: t("timeZoneNote"),
      builtBy: t("builtBy"),
    },
  }
}

const LEGEND_TONE = { PRESENT: "present", ABSENT: "absent", EXCUSED: "excused" } as const

/** P / A / E stamps with their words, adding the paper-register Somali word when it differs. */
export function statusLegend(ts: (key: (typeof STATUSES)[number]) => string): [string, Tone, string][] {
  return STATUSES.map((s) => {
    const word = ts(s)
    return [STATUS_LETTER[s], LEGEND_TONE[s], word === STATUS_SOMALI[s] ? word : `${word} (${STATUS_SOMALI[s]})`]
  })
}
