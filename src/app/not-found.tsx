import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { RegisterGlyph } from "@/components/logo"

export default async function NotFound() {
  const t = await getTranslations("notFound")
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <RegisterGlyph className="h-10 w-10 text-border-strong" />
      <p className="num mt-6 text-sm text-muted-foreground">404</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("body")}</p>
      <Link href="/dashboard" className="mt-8 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        {t("home")}
      </Link>
    </div>
  )
}
