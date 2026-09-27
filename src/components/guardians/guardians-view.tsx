"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Archive, ArchiveRestore, Pencil, Plus, Users } from "lucide-react"
import { ContactButtons, MessageLink } from "@/components/app/contact-buttons"
import { saveGuardian, setGuardianArchived } from "@/app/actions/guardians"
import { useAction } from "@/components/app/use-action"
import { FieldLabel, ParamSwitch, SearchParamInput } from "@/components/app/filters"
import { EmptyState, Toolbar } from "@/components/app/page-header"
import { formatPhone } from "@/lib/phone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableFrame, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Row = {
  id: string
  name: string
  phone1: string | null
  phone2: string | null
  archived: boolean
  students: { id: string; name: string; className: string }[]
}

export function GuardiansView({ guardians, q, showArchived, messages }: { guardians: Row[]; q: string; showArchived: boolean; messages: Record<string, string> }) {
  const t = useTranslations("guardians")
  const tc = useTranslations("common")
  const { run, pending } = useAction()
  const [editing, setEditing] = useState<Partial<Row> | null>(null)

  return (
    <>
      <Toolbar>
        <SearchParamInput value={q} placeholder={tc("search")} />
        <ParamSwitch name="archived" checked={showArchived} label={tc("showArchived")} />
        <Button className="ml-auto" onClick={() => setEditing({})}>
          <Plus /> {t("new")}
        </Button>
      </Toolbar>

      {guardians.length === 0 ? (
        <EmptyState title={q ? tc("noResults") : t("empty")} icon={Users} />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("guardian")}</TableHead>
                <TableHead>{tc("phone")}</TableHead>
                <TableHead>{t("linked")}</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">{tc("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.name} {g.archived && <Badge variant="secondary">{tc("archived")}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {[g.phone1, g.phone2]
                        .filter((p): p is string => Boolean(p))
                        .map((p) => (
                          <ContactButtons key={p} phone={p} message={g.students.length === 1 ? messages[g.students[0].id] : undefined} />
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {g.students.map((s) => {
                        const phone = g.phone1 ?? g.phone2
                        return (
                          <span key={s.id} className="inline-flex items-stretch overflow-hidden rounded-sm border border-border bg-muted/60 text-xs">
                            <Link href={`/students/${s.id}`} className="inline-flex items-center gap-1.5 px-2 py-0.5 hover:bg-accent">
                              {s.name}
                              <span className="font-serif font-semibold text-muted-foreground">{s.className}</span>
                            </Link>
                            {phone && messages[s.id] && (
                              <MessageLink
                                phone={phone}
                                body={messages[s.id]}
                                className="inline-flex items-center border-l border-border px-1.5 text-primary hover:bg-primary-soft"
                              />
                            )}
                          </span>
                        )
                      })}
                      {g.students.length === 0 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")} title={tc("edit")} onClick={() => setEditing(g)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={pending}
                        aria-label={g.archived ? tc("unarchive") : tc("archive")}
                        title={g.archived ? tc("unarchive") : tc("archive")}
                        onClick={() => run(() => setGuardianArchived(g.id, !g.archived), { success: g.archived ? t("restoredToast") : t("archivedToast") })}
                      >
                        {g.archived ? <ArchiveRestore /> : <Archive />}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                run(
                  () =>
                    saveGuardian({
                      id: editing.id,
                      name: String(fd.get("name") ?? ""),
                      phone1: String(fd.get("phone1") ?? ""),
                      phone2: String(fd.get("phone2") ?? ""),
                    }),
                  { success: t("saved"), onSuccess: () => setEditing(null) }
                )
              }}
            >
              <div>
                <FieldLabel htmlFor="gd-name">{tc("name")}</FieldLabel>
                <Input id="gd-name" name="name" required maxLength={100} defaultValue={editing.name} className="h-11 text-[15px]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="gd-p1">{tc("phone1")}</FieldLabel>
                  <Input id="gd-p1" name="phone1" type="tel" inputMode="tel" placeholder="+252 61 555 0101" defaultValue={formatPhone(editing.phone1)} className="num" />
                </div>
                <div>
                  <FieldLabel htmlFor="gd-p2">
                    {tc("phone2")} ({tc("optional")})
                  </FieldLabel>
                  <Input id="gd-p2" name="phone2" type="tel" inputMode="tel" defaultValue={formatPhone(editing.phone2)} className="num" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" loading={pending}>
                  {tc("save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
