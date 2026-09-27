/**
 * Somali and English, switchable at any time.
 *
 * There is no locale in the URL: the teacher's choice is saved on their
 * account (User.language) and mirrored in a cookie so every request, including
 * the sign-in page before anyone is signed in, renders in it.
 */
export const LOCALES = ["en", "so"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "lang"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}
