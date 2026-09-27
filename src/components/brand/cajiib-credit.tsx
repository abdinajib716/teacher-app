import { getTranslations } from "next-intl/server"
import { CAJIIB, CAJIIB_C_PATH, CAJIIB_RAYS, CAJIIB_RAY_WIDTH, CAJIIB_VIEWBOX } from "@/lib/cajiib-logo"
import { siteConfig } from "@/config/site"
import { todayKey } from "@/lib/time"
import { cn } from "@/lib/utils"

/**
 * The Cajiib Creative mark as inline SVG. Animated, the rays rise one after
 * another like a sunrise and keep a slow shimmer; on hover they burst out.
 * All motion stops under prefers-reduced-motion (globals.css).
 */
export function CajiibMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  const { x, y, width, height } = CAJIIB_VIEWBOX
  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      className={cn("cajiib-mark", animated && "is-animated", className)}
      aria-hidden="true"
    >
      <g className="cajiib-rays" stroke={CAJIIB.orange} strokeWidth={CAJIIB_RAY_WIDTH} strokeLinecap="round">
        {CAJIIB_RAYS.map(([x1, y1, x2, y2], i) => (
          <line key={i} className="cajiib-ray" style={{ ["--i" as string]: i }} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <path className="cajiib-c" d={CAJIIB_C_PATH} fill={CAJIIB.blue} />
    </svg>
  )
}

/** "© year App · Designed & built by Cajiib Creative", with the animated mark. */
export async function CajiibCredit({ className }: { className?: string }) {
  const t = await getTranslations("footer")
  const year = todayKey().slice(0, 4)
  return (
    <footer className={cn("credit-footer border-t border-border", className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row md:px-8">
        <p className="num order-2 sm:order-1">
          © {year} {siteConfig.name}. {t("rights")}
        </p>
        <a
          href={CAJIIB.url}
          target="_blank"
          rel="noopener"
          className="cajiib-link group order-1 flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-card sm:order-2"
        >
          <CajiibMark className="h-9 w-10 shrink-0" />
          <span className="leading-tight">
            <span className="block text-[10px] uppercase tracking-[0.12em]">{t("builtBy")}</span>
            <span className="cajiib-name block text-[13px] font-semibold text-foreground">{CAJIIB.name}</span>
          </span>
        </a>
      </div>
    </footer>
  )
}
