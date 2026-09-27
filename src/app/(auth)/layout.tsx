import { getTranslations } from "next-intl/server"
import { LanguageSwitch } from "@/components/language-switch"
import { Logo, RegisterGlyph } from "@/components/logo"
import { siteConfig } from "@/config/site"
import { CajiibCredit } from "@/components/brand/cajiib-credit"

// A week of the paper register, as the art on the sign-in page.
const SHEET = [
  ["Abdirahman M.", "PPPPAPPPPP"],
  ["Hodan A.", "PPEEPPPPPA"],
  ["Ayaan H.", "PPPPPPPPPP"],
  ["Mohamud A.", "APPPPPPAPP"],
  ["Fadumo Y.", "PPPPPPEPPP"],
  ["Sagal O.", "PPAPPPPPPP"],
]

const CELL: Record<string, string> = {
  P: "bg-white/10 text-white/85",
  A: "bg-[#f08a80]/25 text-[#ffd6d1]",
  E: "bg-[#e2b45c]/25 text-[#f7e2b2]",
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth.panel")
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[#1d3f6e] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="ruled pointer-events-none absolute inset-0 text-white" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 left-16 w-px bg-[#f08a80]/40" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#1d3f6e]">
            <RegisterGlyph className="h-5 w-5" />
          </span>
          <span className="font-serif text-lg font-semibold">{siteConfig.name}</span>
        </div>

        <div className="relative">
          <p className="font-serif text-[40px] font-semibold leading-[1.1] tracking-tight xl:text-5xl">{t("title")}</p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">{t("body")}</p>

          <div className="mt-10 max-w-md rounded-lg border border-white/15 bg-white/[0.06] p-4 backdrop-blur-sm" aria-hidden="true">
            <div className="mb-3 flex items-baseline justify-between text-[11px] uppercase tracking-wider text-white/60">
              <span>F3C · Diiwaanka Bishii</span>
              <span className="num">B1 · B2</span>
            </div>
            <div className="space-y-1.5">
              {SHEET.map(([name, marks]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-28 truncate text-[12px] text-white/80">{name}</span>
                  <div className="flex gap-1">
                    {marks.split("").map((m, i) => (
                      <span
                        key={i}
                        className={`num flex h-5 w-5 items-center justify-center rounded-[3px] text-[10px] font-semibold ${CELL[m]} ${i % 2 === 1 ? "mr-1" : ""}`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative num text-[12px] text-white/50">Africa/Mogadishu · UTC+3</p>
      </aside>

      <div className="relative flex flex-col bg-background">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8">
          <span className="lg:invisible">
            <Logo />
          </span>
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <CajiibCredit className="border-t-0" />
      </div>
    </div>
  )
}
