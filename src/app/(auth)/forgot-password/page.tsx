import Link from "next/link"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { requestPasswordReset } from "@/app/actions/auth"
import { PendingButton } from "@/components/auth/pending-button"
import { AuthCard, AuthMessage, authButton, authInput, authLabel } from "@/components/auth/auth-card"
import { Input } from "@/components/ui/input"
import { hasEmail } from "@/lib/env"

export const metadata: Metadata = { title: "Reset password" }

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams
  const t = await getTranslations("auth.forgot")
  const emailReady = hasEmail()

  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      {!emailReady && <AuthMessage tone="warning">{t("noEmail")}</AuthMessage>}
      {sent === "1" && emailReady ? (
        <AuthMessage tone="success">{t("sent")}</AuthMessage>
      ) : (
        <form action={requestPasswordReset} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className={authLabel}>{t("email")}</label>
            <Input id="email" name="email" type="email" autoComplete="email" required disabled={!emailReady} className={authInput} />
          </div>
          <PendingButton disabled={!emailReady} className={authButton}>
            {t("submit")}
          </PendingButton>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          {t("back")}
        </Link>
      </p>
    </AuthCard>
  )
}
