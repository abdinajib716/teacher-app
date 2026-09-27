"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Download, Mail, MessageSquareText, Pencil, Search, Upload, UserPlus } from "lucide-react"
import { saveAttendance, emailReceipt, type SavedAttendance } from "@/app/actions/attendance"
import { countStatuses, nextStatus, STATUSES, STATUS_LETTER, type Mark, type Scope, type Status } from "@/lib/attendance"
import { formatTime } from "@/lib/time"
import { useOnline } from "@/hooks/use-online"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/app/page-header"
import { Stamp, STATUS_SOLID, STATUS_STYLE } from "@/components/app/status"
import { FieldLabel, selectClass } from "@/components/app/filters"

type Student = { id: string; name: string; studentNo: string | null; gender: "MALE" | "FEMALE" }

type Props = {
  classes: { id: string; name: string }[]
  classId: string
  date: string
  dateLabel: string
  breakNo: 1 | 2
  breakTimes: Record<1 | 2, string>
  schoolDay: boolean
  editRequested: boolean
  sheet: {
    session: { id: string; recordedAt: string; editedAt: string | null } | null
    students: Student[]
    marks: Record<string, Mark | null>
  } | null
}

export function AttendanceTaker(props: Props) {
  const { classes, classId, date, dateLabel, breakNo, breakTimes, schoolDay, editRequested, sheet } = props
  const t = useTranslations("attendance")
  const tc = useTranslations("common")
  const ts = useTranslations("status")
  const te = useTranslations("errors")
  const tOffline = useTranslations("offline")
  const locale = useLocale()
  const router = useRouter()
  const online = useOnline()

  const [marks, setMarks] = useState<Record<string, Mark | null>>(() => sheet?.marks ?? {})
  const [dirty, setDirty] = useState(false)
  const [query, setQuery] = useState("")
  const [openNote, setOpenNote] = useState<string | null>(null)

  // Gates before the list shows: an off day asks to continue, an existing
  // record asks to open it for editing. Neither blocks: both have a yes.
  const [offDayOk, setOffDayOk] = useState(schoolDay || editRequested)
  const [existsOk, setExistsOk] = useState(!sheet?.session || editRequested)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saved, setSaved] = useState<SavedAttendance | null>(null)
  const [saving, startSaving] = useTransition()
  const [emailing, startEmail] = useTransition()
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  const className = classes.find((c) => c.id === classId)?.name ?? ""
  const students = useMemo(() => sheet?.students ?? [], [sheet])
  const counts = countStatuses(students.map((s) => marks[s.id]?.status))
  const unmarked = students.filter((s) => !marks[s.id]).length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = students.map((s, i) => ({ ...s, no: i + 1 }))
    if (!q) return list
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.studentNo?.toLowerCase().includes(q))
  }, [students, query])

  // ── Navigation guards ──────────────────────────────────────────────────────
  const navigate = useCallback(
    (href: string) => {
      if (dirty) setPendingNav(href)
      else router.push(href)
    },
    [dirty, router]
  )

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    // In-app links: ask before leaving with unsaved marks.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a")
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return
      const href = a.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("/api/")) return
      e.preventDefault()
      e.stopPropagation()
      setPendingNav(href)
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClick, true)
    }
  }, [dirty])

  const hrefFor = (patch: Partial<{ classId: string; date: string; break: string; edit: string }>) => {
    const p = new URLSearchParams({ classId, date, break: String(breakNo), ...patch })
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k)
    return `/attendance?${p.toString()}`
  }

  // ── Marking ────────────────────────────────────────────────────────────────
  const update = (id: string, fn: (m: Mark | null) => Mark | null) => {
    setMarks((prev) => ({ ...prev, [id]: fn(prev[id] ?? null) }))
    setDirty(true)
  }

  const setStatus = (id: string, status: Status) =>
    update(id, (m) => ({ status, scope: status === "EXCUSED" ? (m?.scope ?? "BREAK") : null, note: m?.note ?? null }))

  const cycle = (id: string) => {
    const m = marks[id] ?? null
    setStatus(id, m ? nextStatus(m.status) : "PRESENT")
  }

  const setAll = (status: Status) => {
    setMarks(Object.fromEntries(students.map((s) => [s.id, { status, scope: null, note: marks[s.id]?.note ?? null }])))
    setDirty(true)
  }

  // ── Saving ─────────────────────────────────────────────────────────────────
  const doSave = () =>
    startSaving(async () => {
      const payload = students
        .filter((s) => marks[s.id])
        .map((s) => ({ studentId: s.id, status: marks[s.id]!.status, scope: marks[s.id]!.scope, note: marks[s.id]!.note }))
      try {
        const res = await saveAttendance({ classId, date, breakNo, marks: payload })
        if (!res.ok) {
          toast.error(te.has(res.error) ? te(res.error) : t("saveFailed"))
          return
        }
        setConfirmOpen(false)
        setDirty(false)
        setSaved(res.data)
        router.refresh()
      } catch {
        // Network or server failure: the marks stay on screen for a retry.
        toast.error(t("saveFailed"))
      }
    })

  const sendEmail = () =>
    startEmail(async () => {
      if (!saved) return
      const res = await emailReceipt(saved.sessionId)
      if (res.ok) toast.success(t("emailSent"))
      else toast.error(te.has(res.error) ? te(res.error) : te("generic"))
    })

  // ── Pieces ─────────────────────────────────────────────────────────────────
  const pickers = (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1.2fr_1fr_1.5fr] sm:gap-4 sm:p-5">
      <div>
        <FieldLabel htmlFor="att-class">{tc("class")}</FieldLabel>
        <select
          id="att-class"
          value={classId}
          onChange={(e) => navigate(hrefFor({ classId: e.target.value, edit: "" }))}
          className={cn(selectClass, "h-11 text-[15px] font-medium")}
        >
          <option value="">{tc("selectClass")}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel htmlFor="att-date">{tc("date")}</FieldLabel>
        <Input
          id="att-date"
          type="date"
          value={date}
          onChange={(e) => e.target.value && navigate(hrefFor({ date: e.target.value, edit: "" }))}
          className="num h-11 text-[15px]"
        />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tc("break")}</span>
        <div className="grid h-11 grid-cols-2 overflow-hidden rounded-md border border-input" role="radiogroup" aria-label={tc("break")}>
          {([1, 2] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={breakNo === b}
              onClick={() => b !== breakNo && navigate(hrefFor({ break: String(b), edit: "" }))}
              className={cn(
                "flex flex-col items-center justify-center leading-tight transition-colors",
                b === 2 && "border-l border-input",
                breakNo === b ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
              )}
            >
              <span className="text-[13px] font-semibold">{tc("breakN", { n: b })}</span>
              <span className={cn("num whitespace-nowrap text-[10.5px]", breakNo === b ? "opacity-80" : "text-muted-foreground")}>{breakTimes[b]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const leaveDialog = (
    <Dialog open={pendingNav !== null} onOpenChange={(o) => !o && setPendingNav(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("discardTitle")}</DialogTitle>
          <DialogDescription>{t("discardBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingNav(null)}>
            {t("keep")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const href = pendingNav!
              setDirty(false)
              setPendingNav(null)
              router.push(href)
            }}
          >
            {t("discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ── States before the roster ───────────────────────────────────────────────
  if (!classId || !sheet) {
    return (
      <div className="space-y-5">
        {pickers}
        <EmptyState title={t("pickClass")} />
      </div>
    )
  }

  if (!offDayOk) {
    return (
      <div className="space-y-5">
        {pickers}
        <GateCard title={t("offDayTitle")} body={t("offDayBody", { date: dateLabel })} confirm={t("continue")} onConfirm={() => setOffDayOk(true)} />
      </div>
    )
  }

  if (!existsOk && sheet.session) {
    return (
      <div className="space-y-5">
        {pickers}
        <GateCard
          title={t("existsTitle")}
          body={`${t("existsBody")} ${className} · ${dateLabel} · ${tc("breakN", { n: breakNo })}`}
          confirm={t("openToEdit")}
          onConfirm={() => setExistsOk(true)}
        />
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="space-y-5">
        {pickers}
        <EmptyState title={t("noStudents")} body={t("noStudentsBody")} icon={UserPlus}>
          <Button asChild size="sm">
            <Link href={`/students?new=1&classId=${classId}`}>
              <UserPlus /> {t("addStudent")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/import?classId=${classId}`}>
              <Upload /> {t("importStudents")}
            </Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  // ── Roster ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-28">
      {pickers}

      {sheet.session && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-primary/20 bg-primary-soft px-3.5 py-2 text-[13px]">
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t("editing")}
          </span>
          <span className="num text-muted-foreground">{t("recordedAt", { time: formatTime(new Date(sheet.session.recordedAt), locale) })}</span>
          {sheet.session.editedAt && (
            <span className="num text-muted-foreground">{t("editedAt", { time: formatTime(new Date(sheet.session.editedAt), locale) })}</span>
          )}
        </div>
      )}

      {/* Tally and shortcuts, kept in view while scrolling a class of 40. */}
      <div className="sticky top-14 z-30 -mx-4 mt-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <dl className="flex items-center gap-3 sm:gap-4" aria-live="polite">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <dt>
                  <Stamp status={s} size="sm" />
                </dt>
                <dd className="num text-lg font-semibold leading-none">
                  {s === "PRESENT" ? counts.present : s === "ABSENT" ? counts.absent : counts.excused}
                </dd>
              </div>
            ))}
            {unmarked > 0 && (
              <div className="flex items-center gap-1.5">
                <dt>
                  <Stamp status={null} size="sm" />
                </dt>
                <dd className="num text-lg font-semibold leading-none text-muted-foreground">{unmarked}</dd>
              </div>
            )}
            <div className="num hidden text-[13px] text-muted-foreground md:block">/ {students.length}</div>
          </dl>
          <div className="ml-auto flex gap-1.5 sm:order-last">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 px-2 sm:px-3" onClick={() => setAll("PRESENT")} title={t("markAllPresent")}>
              <Stamp status="PRESENT" size="sm" className="h-4 w-4 text-[9px]" /> <span className="sm:hidden">{tc("all")}</span>
              <span className="hidden sm:inline">{t("markAllPresent")}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 px-2 sm:px-3" onClick={() => setAll("ABSENT")} title={t("markAllAbsent")}>
              <Stamp status="ABSENT" size="sm" className="h-4 w-4 text-[9px]" /> <span className="sm:hidden">{tc("all")}</span>
              <span className="hidden sm:inline">{t("markAllAbsent")}</span>
            </Button>
          </div>
          <div className="relative w-full sm:ml-auto sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchStudents")}
              aria-label={t("searchStudents")}
              className="h-9 pl-8"
            />
          </div>
        </div>
      </div>

      <ol className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
        {visible.map((s) => {
          const m = marks[s.id] ?? null
          const noteOpen = openNote === s.id || Boolean(m?.note)
          return (
            <li key={s.id} className={cn("border-b border-border last:border-0", m?.status === "ABSENT" && "bg-absent-bg/35", m?.status === "EXCUSED" && "bg-excused-bg/35")}>
              <div className="flex items-center gap-1 pr-2 sm:pr-3">
                <button
                  type="button"
                  onClick={() => cycle(s.id)}
                  className="flex min-h-[60px] min-w-0 flex-1 items-center gap-2.5 py-2 pl-2 text-left sm:gap-3 sm:pl-4"
                >
                  <span className="num w-5 shrink-0 text-right text-xs text-muted-foreground sm:w-6">{s.no}</span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-[15px] font-medium leading-snug">{s.name}</span>
                    <span className="num block truncate text-[11.5px] text-muted-foreground">
                      {s.studentNo ?? "—"}
                      {!m && sheet.session ? ` · ${t("notMarkedHint")}` : ""}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 gap-1" role="radiogroup" aria-label={s.name}>
                  {STATUSES.map((opt) => {
                    const on = m?.status === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={ts(opt)}
                        title={ts(opt)}
                        onClick={() => setStatus(s.id, opt)}
                        className={cn(
                          "num flex h-11 w-10 items-center justify-center rounded-md border text-[15px] font-semibold transition-colors sm:w-10",
                          on ? STATUS_SOLID[opt] : "border-border bg-card text-muted-foreground/70 hover:border-border-strong hover:text-foreground"
                        )}
                      >
                        {STATUS_LETTER[opt]}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setOpenNote(openNote === s.id ? null : s.id)}
                  aria-label={t("addNote")}
                  aria-expanded={noteOpen}
                  className={cn(
                    "ml-0.5 flex h-11 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent sm:h-10",
                    m?.note && "text-primary"
                  )}
                >
                  <MessageSquareText className="h-4 w-4" />
                </button>
              </div>

              {(m?.status === "EXCUSED" || noteOpen) && (
                <div className="flex flex-wrap items-center gap-2 pb-3 pl-12 pr-3 sm:pl-[3.25rem]">
                  {m?.status === "EXCUSED" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-excused">{t("excusedScope")}</span>
                      <div className="flex overflow-hidden rounded-md border border-excused/40">
                        {(["BREAK", "DAY"] as Scope[]).map((scope, i) => (
                          <button
                            key={scope}
                            type="button"
                            aria-pressed={m.scope === scope}
                            onClick={() => update(s.id, (cur) => (cur ? { ...cur, scope } : cur))}
                            className={cn(
                              "px-2.5 py-1 text-xs font-semibold",
                              i > 0 && "border-l border-excused/40",
                              m.scope === scope ? "bg-excused text-white dark:text-[#1f170a]" : "bg-card text-excused"
                            )}
                          >
                            {scope === "BREAK" ? t("thisBreak") : t("wholeDay")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {noteOpen && (
                    <Input
                      value={m?.note ?? ""}
                      maxLength={300}
                      placeholder={t("notePlaceholder")}
                      aria-label={t("noteLabel")}
                      onChange={(e) =>
                        update(s.id, (cur) => ({ status: cur?.status ?? "PRESENT", scope: cur?.scope ?? null, note: e.target.value || null }))
                      }
                      className="h-9 min-w-48 flex-1"
                    />
                  )}
                </div>
              )}
            </li>
          )
        })}
        {visible.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">{tc("noResults")}</li>}
      </ol>

      {/* Save bar */}
      <div className="attendance-save-bar fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-card/95 px-4 py-3 backdrop-blur-sm md:left-60 sidebar-collapsed:md:left-16">
        <div className="mx-auto flex max-w-6xl items-center gap-4 md:px-4">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-semibold">
              {className} · {tc("breakN", { n: breakNo })}
            </p>
            <p className="num truncate text-xs text-muted-foreground">
              {dateLabel} · P {counts.present} · A {counts.absent} · E {counts.excused}
            </p>
          </div>
          {!online && <p className="text-xs font-medium text-excused sm:max-w-56">{tOffline("banner")}</p>}
          <Button size="lg" className="flex-1 sm:flex-none sm:px-10" disabled={!online || saving} onClick={() => setConfirmOpen(true)}>
            {t("save")}
          </Button>
        </div>
      </div>

      {/* Summary before saving */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("summaryTitle")}</DialogTitle>
            <DialogDescription>{t("summaryBody", { className, date: dateLabel, breakLabel: tc("breakN", { n: breakNo }) })}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-md border border-border">
            {STATUSES.map((s) => (
              <div key={s} className={cn("flex flex-col items-center gap-1.5 py-3", STATUS_STYLE[s], "border-0")}>
                <span className="num text-2xl font-semibold leading-none">
                  {s === "PRESENT" ? counts.present : s === "ABSENT" ? counts.absent : counts.excused}
                </span>
                <span className="text-xs font-medium">{ts(s)}</span>
              </div>
            ))}
          </div>
          {unmarked > 0 && (
            <p className="flex gap-2 text-sm text-excused">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t("unmarkedWarning", { count: unmarked })}
            </p>
          )}
          {!online && <p className="text-sm text-destructive">{tOffline("banner")}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setConfirmOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button loading={saving} disabled={!online || saving} onClick={doSave}>
              {t("confirmSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* After saving: receipt and next steps */}
      <Dialog open={saved !== null} onOpenChange={(o) => !o && setSaved(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center pt-2 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-present-bg text-present">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <DialogTitle>{t("savedTitle")}</DialogTitle>
            <DialogDescription className="num mt-1">
              {saved && t("savedAt", { time: formatTime(new Date(saved.editedAt ?? saved.recordedAt), locale) })}
            </DialogDescription>
          </div>
          <div className="grid gap-2">
            {saved && (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <a href={`/api/receipts/${saved.sessionId}`} download>
                    <Download /> PDF
                  </a>
                </Button>
                <Button variant="outline" loading={emailing} onClick={sendEmail}>
                  <Mail /> {t("emailPdf")}
                </Button>
              </div>
            )}
            {breakNo === 1 && <Button onClick={() => router.push(hrefFor({ break: "2", edit: "" }))}>{t("nextBreak")}</Button>}
            <Button variant={breakNo === 1 ? "ghost" : "primary"} onClick={() => router.push("/dashboard")}>
              {t("toDashboard")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {leaveDialog}
    </div>
  )
}

function GateCard({ title, body, confirm, onConfirm }: { title: string; body: string; confirm: string; onConfirm: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-excused/35 bg-excused-bg/60 p-5 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-card text-excused">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
      </div>
      <Button onClick={onConfirm}>{confirm}</Button>
    </div>
  )
}
