import Link from "next/link"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { resetPassword } from "@/app/actions/auth"
import { PendingButton } from "@/components/auth/pending-button"
import { AuthCard, AuthMessage, authButton, authInput, authLabel } from "@/components/auth/auth-card"
import { Input } from "@/components/ui/input"

export const metadata: Metadata = { title: "New password" }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams
  const t = await getTranslations("auth.reset")
  const expired = error === "expired" || error === "INVALID_TOKEN" || !token

  return (
    <AuthCard title={t("title")}>
      {expired ? (
        <>
          <AuthMessage tone="error">{t("expired")}</AuthMessage>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="underline underline-offset-4">
              {t("requestNew")}
            </Link>
          </p>
        </>
      ) : (
        <>
          {error === "policy" && <AuthMessage tone="error">{t("policy")}</AuthMessage>}
          <form action={resetPassword} className="flex flex-col gap-5">
            <input type="hidden" name="token" value={token} />
            <div>
              <label htmlFor="password" className={authLabel}>{t("password")}</label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={authInput} />
            </div>
            <PendingButton className={authButton}>{t("submit")}</PendingButton>
          </form>
        </>
      )}
    </AuthCard>
  )
}
