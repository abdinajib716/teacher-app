import Link from "next/link"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { signInWithPassword } from "@/app/actions/auth"
import { PendingButton } from "@/components/auth/pending-button"
import { AuthCard, AuthMessage, authButton, authInput, authLabel } from "@/components/auth/auth-card"
import { Input } from "@/components/ui/input"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams
  const t = await getTranslations("auth.login")
  const errorMessage = error ? (t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.generic")) : null

  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      {errorMessage && <AuthMessage tone="error">{errorMessage}</AuthMessage>}
      {reset === "1" && <AuthMessage tone="success">{t("passwordUpdated")}</AuthMessage>}

      <form action={signInWithPassword} className="flex flex-col gap-5">
        <div>
          <label htmlFor="email" className={authLabel}>{t("email")}</label>
          <Input id="email" name="email" type="email" autoComplete="email" required className={authInput} />
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>{t("password")}</label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className={authInput} />
        </div>
        <PendingButton className={authButton}>{t("submit")}</PendingButton>
      </form>

      <div className="mt-5 text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          {t("forgot")}
        </Link>
      </div>
    </AuthCard>
  )
}
