import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config"

type Messages = { [key: string]: string | Messages }

/**
 * Fills gaps in `translated` with English, all the way down, so a key missing
 * from so.json shows English instead of the raw key.
 */
function withFallback(source: Messages, translated: Messages): Messages {
  const out: Messages = { ...source }
  for (const [key, value] of Object.entries(translated)) {
    const base = out[key]
    out[key] =
      typeof value === "object" && typeof base === "object" ? withFallback(base, value) : value
  }
  return out
}

export default getRequestConfig(async ({ locale: requested }) => {
  // An explicit locale wins (emails and PDFs are written in the teacher's
  // saved language, whoever's request produces them); otherwise the cookie.
  const fromCookie = isLocale(requested) ? requested : (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE

  const source: Messages = (await import("../locales/en.json")).default
  const messages =
    locale === "en" ? source : withFallback(source, (await import(`../locales/${locale}.json`)).default)

  return { locale, messages: messages as never, timeZone: "Africa/Mogadishu" }
})
