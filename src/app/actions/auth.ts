"use server"

import { headers, cookies } from "next/headers"
import { redirect } from "next/navigation"
import { APIError } from "better-auth/api"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { passwordSchema } from "@/lib/password"
import { checkRateLimit, rateLimitKeyFromIp } from "@/lib/rate-limit"
import { hasEmail } from "@/lib/env"
import { getCurrentTeacher } from "@/lib/auth"
import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config"

// redirect() works by throwing, so every redirect here sits OUTSIDE the try
// block that catches authentication errors.

const emailSchema = z.email()
const readEmail = (formData: FormData) => String(formData.get("email") ?? "").trim().toLowerCase()

const ONE_YEAR = 60 * 60 * 24 * 365

async function setLocaleCookie(locale: Locale) {
  ;(await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" })
}

/** Switch the interface language. Saved on the account when signed in. */
export async function setLanguage(locale: string) {
  if (!isLocale(locale)) return
  await setLocaleCookie(locale)
  const teacher = await getCurrentTeacher()
  if (teacher) await prisma.user.update({ where: { id: teacher.id }, data: { language: locale } })
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect("/login")
}

export async function signInWithPassword(formData: FormData) {
  const email = readEmail(formData)
  const password = String(formData.get("password") ?? "")
  if (!(await checkRateLimit(await rateLimitKeyFromIp("signin"), 20))) redirect("/login?error=rate")

  let userId: string
  try {
    const result = await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
    userId = result.user.id
  } catch (error) {
    // One message for every failure: never reveal whether the email exists.
    if (error instanceof APIError) redirect("/login?error=credentials")
    throw error
  }
  // The interface follows the language saved on the account.
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { language: true } })
  if (row) await setLocaleCookie(row.language)
  redirect("/dashboard")
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = emailSchema.safeParse(readEmail(formData))
  // Whatever happens, land on the same confirmation: the response must not
  // reveal whether an account exists.
  if (parsed.success && hasEmail() && (await checkRateLimit(`reset:${parsed.data}`, 3))) {
    try {
      await auth.api.requestPasswordReset({
        body: { email: parsed.data, redirectTo: "/reset-password" },
        headers: await headers(),
      })
    } catch (error) {
      if (!(error instanceof APIError)) throw error
    }
  }
  redirect("/forgot-password?sent=1")
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "")
  if (!token) redirect("/reset-password?error=expired")

  const parsed = passwordSchema.safeParse(String(formData.get("password") ?? ""))
  if (!parsed.success) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=policy`)

  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data, token }, headers: await headers() })
  } catch (error) {
    if (error instanceof APIError) redirect("/reset-password?error=expired")
    throw error
  }
  redirect("/login?reset=1")
}
