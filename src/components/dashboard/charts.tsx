"use client"

import { useTranslations } from "next-intl"
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { Counts } from "@/lib/attendance"
import { RateBar } from "@/components/app/status"

const axis = { fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }
const pct = (v: unknown) => (typeof v === "number" ? `${v}%` : "—")

/** Daily attendance rate, with the at-risk threshold drawn as a rule. */
export function TrendChart({ data, threshold }: { data: { day: string; rate: number | null }[]; threshold: number }) {
  const t = useTranslations("dashboard.charts")
  if (!data.some((p) => p.rate !== null)) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("empty")}</p>
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -18, right: 6, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.14} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axis} tickLine={false} axisLine={false} tickFormatter={pct} />
        <ReferenceLine y={threshold} stroke="var(--absent)" strokeDasharray="4 4" strokeOpacity={0.6} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border-strong)",
            borderRadius: 5,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--popover-foreground)",
          }}
          formatter={pct}
        />
        <Area type="monotone" dataKey="rate" stroke="var(--chart-1)" strokeWidth={2} fill="url(#trendFill)" connectNulls dot={false} activeDot={{ r: 3.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Present / Absent / Excused as one measured strip, with the numbers beneath. */
export function ShareStrip({ counts }: { counts: Counts }) {
  const ts = useTranslations("status")
  const total = counts.present + counts.absent + counts.excused
  const parts = [
    { key: "PRESENT" as const, n: counts.present, bar: "bg-present" },
    { key: "ABSENT" as const, n: counts.absent, bar: "bg-absent" },
    { key: "EXCUSED" as const, n: counts.excused, bar: "bg-excused" },
  ]
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
        {total > 0 && parts.map((p) => <span key={p.key} className={p.bar} style={{ width: `${(p.n / total) * 100}%` }} />)}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.key}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-[2px] ${p.bar}`} aria-hidden="true" />
              {ts(p.key)}
            </dt>
            <dd className="num mt-0.5 text-base font-semibold">
              {p.n}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{total ? Math.round((p.n / total) * 100) : 0}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** A short list of labelled rates, each with its bar. */
export function RateList({ items, threshold }: { items: { name: string; rate: number | null }[]; threshold: number }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.name} className="flex items-center justify-between gap-3">
          <span className="truncate text-[13px]">{it.name}</span>
          <RateBar rate={it.rate} threshold={threshold} />
        </li>
      ))}
    </ul>
  )
}
