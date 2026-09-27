"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { setRegisterCell } from "@/app/actions/attendance"
import { useAction } from "@/components/app/use-action"
import { RateText, STATUS_SOLID, STATUS_STYLE } from "@/components/app/status"
import { STATUSES, STATUS_LETTER, type Status } from "@/lib/attendance"
import { formatDateKey, weekdayOf } from "@/lib/time"
import { formatPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"
import type { Register } from "@/lib/data/register"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const cellKey = (studentId: string, date: string, b: number) => `${studentId}|${date}|${b}`

/**
 * The paper register on screen: one row per student and, for each school day,
 * a Break 1 and a Break 2 column. Each cell is a stamp with its letter; empty
 * means not taken. A heavier rule opens each school week (Saturday), and
 * today's column is tinted. Tap a cell to mark or correct it.
 */
export function RegisterGrid({
  register,
  locale,
  threshold,
  today,
  schoolDays,
}: {
  register: Register
  locale: string
  threshold: number
  today: string
  schoolDays: number[]
}) {
  const t = useTranslations("register")
  const tc = useTranslations("common")
  const ts = useTranslations("status")
  const { run } = useAction()
  const [open, setOpen] = useState<string | null>(null)
  // Optimistic cells, so a correction shows at once while it saves.
  const [local, setLocal] = useState<Record<string, Status | null>>({})
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })

  const statusOf = (k: string) => (k in local ? local[k] : (register.cells[k] ?? null))
  const weekStart = (d: string) => weekdayOf(d) === (schoolDays.includes(6) ? 6 : schoolDays[0])

  const set = (studentId: string, date: string, breakNo: 1 | 2, status: Status | null) => {
    const k = cellKey(studentId, date, breakNo)
    setLocal((prev) => ({ ...prev, [k]: status }))
    setOpen(null)
    run(() => setRegisterCell({ classId: register.classId, studentId, date, breakNo, status }), { success: t("saved") })
  }

  const dayCol = (d: string) =>
    cn(weekStart(d) && "border-l-2 border-l-border-strong", d === today && "bg-primary-soft/70", !schoolDays.includes(weekdayOf(d)) && "bg-excused-bg/40")

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card" style={{ maxHeight: "72vh" }}>
      <table className="border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-20">
          <tr className="bg-muted">
            <th rowSpan={2} className="sticky left-0 z-30 w-9 border-b border-r border-border bg-muted px-2 text-right font-normal text-muted-foreground">
              #
            </th>
            <th rowSpan={2} className="sticky left-9 z-30 min-w-44 border-b border-r border-border bg-muted px-3 text-left">
              <span className="eyebrow">{tc("student")}</span>
            </th>
            <th rowSpan={2} className="hidden min-w-32 border-b border-r border-border px-3 text-left md:table-cell">
              <span className="eyebrow">{tc("guardianPhone")}</span>
            </th>
            {register.days.map((d) => (
              <th key={d} colSpan={2} className={cn("border-b border-border px-1 pb-1 pt-1.5 text-center", dayCol(d))}>
                <span className="block text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  {weekday.format(new Date(`${d}T00:00:00Z`)).slice(0, 3)}
                </span>
                <span className={cn("num text-[13px] font-semibold", d === today && "text-primary")}>{Number(d.slice(8))}</span>
              </th>
            ))}
            {["P", "A", "E", "%"].map((h, i) => (
              <th key={h} rowSpan={2} className={cn("border-b border-border px-2.5 text-center font-semibold", i === 0 && "border-l-2 border-l-border-strong")}>
                <span className="num">{h}</span>
              </th>
            ))}
          </tr>
          <tr className="bg-muted">
            {register.days.flatMap((d) =>
              [1, 2].map((b) => (
                <th key={`${d}-${b}`} className={cn("num border-b border-border px-0 pb-1 text-center text-[10px] font-normal text-muted-foreground", b === 1 && dayCol(d), b === 2 && d === today && "bg-primary-soft/70")}>
                  {b}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {register.students.map((s, i) => (
            <tr key={s.id} className="group">
              <td className="num sticky left-0 z-10 border-b border-r border-border bg-card px-2 text-right text-muted-foreground group-hover:bg-accent">
                {i + 1}
              </td>
              <td className="sticky left-9 z-10 max-w-56 truncate border-b border-r border-border bg-card px-3 py-1 text-[13px] font-medium group-hover:bg-accent">
                {s.name}
              </td>
              <td className="num hidden whitespace-nowrap border-b border-r border-border px-3 text-muted-foreground md:table-cell">{formatPhone(s.guardianPhone)}</td>
              {register.days.flatMap((d) =>
                ([1, 2] as const).map((b) => {
                  const k = cellKey(s.id, d, b)
                  const st = statusOf(k)
                  const label = t("cellTitle", { student: s.name, date: formatDateKey(d, locale), breakNo: b })
                  return (
                    <td key={k} className={cn("border-b border-border p-[3px]", b === 1 ? dayCol(d) : d === today && "bg-primary-soft/70")}>
                      <Popover open={open === k} onOpenChange={(o) => setOpen(o ? k : null)}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title={label}
                            aria-label={`${label}: ${st ? ts(st) : tc("notTaken")}`}
                            className={cn(
                              "num flex h-7 w-7 items-center justify-center rounded-[3px] border text-[11px] font-semibold transition-colors",
                              st ? STATUS_STYLE[st] : "border-transparent text-border-strong hover:border-border-strong hover:text-muted-foreground"
                            )}
                          >
                            {st ? STATUS_LETTER[st] : "·"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60" align="center">
                          <p className="mb-2.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{s.name}</span>
                            <br />
                            <span className="num">
                              {formatDateKey(d, locale, false)} · {tc("breakN", { n: b })}
                            </span>
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {STATUSES.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => set(s.id, d, b, opt)}
                                aria-pressed={st === opt}
                                className={cn(
                                  "flex flex-col items-center gap-0.5 rounded-md border py-2 transition-colors",
                                  st === opt ? STATUS_SOLID[opt] : STATUS_STYLE[opt]
                                )}
                              >
                                <span className="num text-base font-semibold leading-none">{STATUS_LETTER[opt]}</span>
                                <span className="text-[10.5px] font-medium">{ts(opt)}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => set(s.id, d, b, null)}
                            className="mt-1.5 w-full rounded-md border border-dashed border-border-strong py-1.5 text-xs text-muted-foreground hover:bg-accent"
                          >
                            {t("clear")}
                          </button>
                        </PopoverContent>
                      </Popover>
                    </td>
                  )
                })
              )}
              <td className="num border-b border-l-2 border-border border-l-border-strong px-2.5 text-center text-present">{s.counts.present}</td>
              <td className="num border-b border-border px-2.5 text-center text-absent">{s.counts.absent}</td>
              <td className="num border-b border-border px-2.5 text-center text-excused">{s.counts.excused}</td>
              <td className="border-b border-border px-2.5 text-center">
                <RateText rate={s.rate} threshold={threshold} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
