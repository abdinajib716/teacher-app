"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Archive, ArchiveRestore, Pencil, Plus, UserRound } from "lucide-react"
import { ContactButtons } from "@/components/app/contact-buttons"
import { saveStudent, setStudentArchived } from "@/app/actions/students"
import { useAction } from "@/components/app/use-action"
import { FieldLabel, ParamSelect, ParamSwitch, SearchParamInput, selectClass } from "@/components/app/filters"
import { EmptyState, Toolbar } from "@/components/app/page-header"
import { RateBar } from "@/components/app/status"
import { formatPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableFrame, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Guardian = { id: string; name: string; phone1: string | null }
type Row = {
  id: string
  name: string
  studentNo: string | null
  gender: "MALE" | "FEMALE"
  archived: boolean
  classId: string
  className: string
  guardian: Guardian | null
  rate: number | null
}

export function StudentsView(props: {
  messages: Record<string, string>
  students: Row[]
  classes: { id: string; name: string }[]
  guardians: Guardian[]
  q: string
  classId: string
  showArchived: boolean
  openNew: boolean
  threshold: number
}) {
  const { students, classes, guardians, q, classId, showArchived, openNew, threshold, messages } = props
  const t = useTranslations("students")
  const tc = useTranslations("common")
  const { run, pending } = useAction()
  const [editing, setEditing] = useState<Partial<Row> | null>(openNew ? { classId } : null)

  return (
    <>
      <Toolbar>
        <SearchParamInput value={q} placeholder={tc("search")} />
        <ParamSelect name="classId" value={classId} label={tc("class")} allLabel={t("allClasses")} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
        <ParamSwitch name="archived" checked={showArchived} label={tc("showArchived")} />
        <Button className="ml-auto" disabled={classes.length === 0} onClick={() => setEditing({ classId })}>
          <Plus /> {t("new")}
        </Button>
      </Toolbar>

      {students.length === 0 ? (
        <EmptyState title={q ? tc("noResults") : t("empty")} icon={UserRound} />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{tc("class")}</TableHead>
                <TableHead className="hidden md:table-cell">{tc("guardian")}</TableHead>
                <TableHead className="text-right">{tc("rate")}</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">{tc("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "num flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-[10px] font-semibold",
                          s.gender === "MALE" ? "border-primary/25 bg-primary-soft text-primary" : "border-absent/20 bg-absent-bg text-absent"
                        )}
                        title={s.gender === "MALE" ? tc("male") : tc("female")}
                      >
                        {s.gender === "MALE" ? "W" : "G"}
                      </span>
                      <span className="min-w-0">
                        <Link href={`/students/${s.id}`} className="block truncate font-medium hover:underline">
                          {s.name}
                        </Link>
                        <span className="num block text-[11.5px] text-muted-foreground">{s.studentNo ?? "—"}</span>
                      </span>
                      {s.archived && <Badge variant="secondary">{tc("archived")}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-serif font-semibold">{s.className}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {s.guardian ? (
                      <span className="flex items-center gap-2 text-[13px]">
                        <span className="truncate">{s.guardian.name}</span>
                        {s.guardian.phone1 && <ContactButtons phone={s.guardian.phone1} message={messages[s.id]} />}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end">
                      <RateBar rate={s.rate} threshold={threshold} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")} title={tc("edit")} onClick={() => setEditing(s)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={pending}
                        aria-label={s.archived ? tc("unarchive") : tc("archive")}
                        title={s.archived ? tc("unarchive") : tc("archive")}
                        onClick={() => run(() => setStudentArchived(s.id, !s.archived), { success: s.archived ? t("restoredToast") : t("archivedToast") })}
                      >
                        {s.archived ? <ArchiveRestore /> : <Archive />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <StudentForm
              student={editing}
              classes={classes}
              guardians={guardians}
              pending={pending}
              onCancel={() => setEditing(null)}
              onSubmit={(input) => run(() => saveStudent(input), { success: t("saved"), onSuccess: () => setEditing(null) })}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

type GuardianMode = "existing" | "new" | "none"

function StudentForm({
  student,
  classes,
  guardians,
  pending,
  onCancel,
  onSubmit,
}: {
  student: Partial<Row>
  classes: { id: string; name: string }[]
  guardians: Guardian[]
  pending: boolean
  onCancel: () => void
  onSubmit: (input: Parameters<typeof saveStudent>[0]) => void
}) {
  const t = useTranslations("students")
  const tc = useTranslations("common")
  const [mode, setMode] = useState<GuardianMode>(student.guardian ? "existing" : guardians.length ? "existing" : "new")
  const [guardianQuery, setGuardianQuery] = useState("")
  const [guardianId, setGuardianId] = useState(student.guardian?.id ?? "")

  const matches = useMemo(() => {
    const q = guardianQuery.trim().toLowerCase()
    const list = q ? guardians.filter((g) => g.name.toLowerCase().includes(q) || g.phone1?.includes(q.replace(/\s/g, ""))) : guardians
    return list.slice(0, 200)
  }, [guardians, guardianQuery])

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          id: student.id,
          name: String(fd.get("name") ?? ""),
          studentNo: String(fd.get("studentNo") ?? ""),
          gender: String(fd.get("gender")) as "MALE" | "FEMALE",
          classId: String(fd.get("classId") ?? ""),
          guardianId: mode === "existing" ? guardianId || undefined : undefined,
          newGuardian:
            mode === "new"
              ? { name: String(fd.get("gName") ?? ""), phone1: String(fd.get("gPhone1") ?? ""), phone2: String(fd.get("gPhone2") ?? "") }
              : undefined,
        })
      }}
    >
      <div>
        <FieldLabel htmlFor="s-name">{tc("name")}</FieldLabel>
        <Input id="s-name" name="name" required maxLength={100} defaultValue={student.name} className="h-11 text-[15px]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="s-no">{tc("studentNo")}</FieldLabel>
          <Input id="s-no" name="studentNo" maxLength={40} defaultValue={student.studentNo ?? ""} placeholder="STU-001" className="num" />
        </div>
        <div>
          <FieldLabel htmlFor="s-class">{tc("class")}</FieldLabel>
          <select id="s-class" name="classId" required defaultValue={student.classId || classes[0]?.id} className={selectClass}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{tc("gender")}</legend>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-input">
          {(["MALE", "FEMALE"] as const).map((g, i) => (
            <label
              key={g}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-2 bg-card text-sm has-[:checked]:bg-foreground has-[:checked]:font-semibold has-[:checked]:text-background",
                i > 0 && "border-l border-input"
              )}
            >
              <input type="radio" name="gender" value={g} required defaultChecked={student.gender === g} className="sr-only" />
              {g === "MALE" ? `${tc("male")} · Wiil` : `${tc("female")} · Gabar`}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-border bg-muted/40 p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">{t("guardianMode")}</legend>
        <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-md border border-input bg-card">
          {(["existing", "new", "none"] as const).map((m, i) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn("px-2 py-2 text-xs font-medium", i > 0 && "border-l border-input", mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")}
            >
              {m === "existing" ? t("existingGuardian") : m === "new" ? t("newGuardian") : t("noGuardian")}
            </button>
          ))}
        </div>

        {mode === "existing" && (
          <div className="space-y-2">
            <Input type="search" value={guardianQuery} onChange={(e) => setGuardianQuery(e.target.value)} placeholder={tc("search")} aria-label={tc("search")} className="h-9" />
            <select
              aria-label={t("pickGuardian")}
              value={guardianId}
              onChange={(e) => setGuardianId(e.target.value)}
              size={Math.min(6, Math.max(3, matches.length + 1))}
              className="w-full rounded-md border border-input bg-card p-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="">{t("pickGuardian")}</option>
              {matches.map((g) => (
                <option key={g.id} value={g.id} className="rounded-sm px-2 py-1">
                  {g.name}
                  {g.phone1 ? `  ·  ${formatPhone(g.phone1)}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "new" && (
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="g-name">{t("guardianName")}</FieldLabel>
              <Input id="g-name" name="gName" required maxLength={100} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="g-p1">{tc("phone1")}</FieldLabel>
                <Input id="g-p1" name="gPhone1" type="tel" inputMode="tel" placeholder="+252 61 555 0101" className="num" />
              </div>
              <div>
                <FieldLabel htmlFor="g-p2">
                  {tc("phone2")} ({tc("optional")})
                </FieldLabel>
                <Input id="g-p2" name="gPhone2" type="tel" inputMode="tel" className="num" />
              </div>
            </div>
          </div>
        )}
        {mode === "none" && <p className="text-xs text-muted-foreground">{t("noGuardian")}</p>}
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {tc("save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
