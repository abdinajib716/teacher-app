"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Archive, ArchiveRestore, ArrowRight, Pencil, Plus, School } from "lucide-react"
import { saveClass, setClassArchived } from "@/app/actions/classes"
import { useAction } from "@/components/app/use-action"
import { FieldLabel, ParamSwitch, SearchParamInput } from "@/components/app/filters"
import { EmptyState, Toolbar } from "@/components/app/page-header"
import { RateBar } from "@/components/app/status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Row = {
  id: string
  name: string
  description: string | null
  archived: boolean
  boys: number
  girls: number
  rate: number | null
}

export function ClassesView({ classes, q, showArchived, openNew }: { classes: Row[]; q: string; showArchived: boolean; openNew: boolean }) {
  const t = useTranslations("classes")
  const tc = useTranslations("common")
  const [editing, setEditing] = useState<Partial<Row> | null>(openNew ? {} : null)
  const { run, pending } = useAction()

  return (
    <>
      <Toolbar>
        <SearchParamInput value={q} placeholder={tc("search")} />
        <ParamSwitch name="archived" checked={showArchived} label={tc("showArchived")} />
        <Button className="ml-auto" onClick={() => setEditing({})}>
          <Plus /> {t("new")}
        </Button>
      </Toolbar>

      {classes.length === 0 ? (
        <EmptyState title={q ? tc("noResults") : t("empty")} icon={School}>
          {!q && (
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus /> {t("new")}
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <article key={c.id} className="group flex flex-col rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between gap-2 border-b border-border px-5 pb-4 pt-5">
                <div className="min-w-0">
                  <p className="eyebrow mb-1">{tc("class")}</p>
                  <Link href={`/classes/${c.id}`} className="block truncate font-serif text-[28px] font-semibold leading-none hover:underline">
                    {c.name}
                  </Link>
                  {c.description && <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{c.description}</p>}
                </div>
                {c.archived && <Badge variant="secondary">{tc("archived")}</Badge>}
              </div>
              <dl className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  ["Wiilal", c.boys],
                  ["Gabdho", c.girls],
                  ["Wadar", c.boys + c.girls],
                ].map(([label, n]) => (
                  <div key={String(label)} className="px-4 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="num text-lg font-semibold">{n}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-xs text-muted-foreground">{t("rate30")}</span>
                <RateBar rate={c.rate} />
              </div>
              <div className="mt-auto flex items-center gap-1 border-t border-border px-3 py-2">
                <Button asChild variant="ghost" size="sm" className="text-primary">
                  <Link href={`/classes/${c.id}`}>
                    {tc("open")} <ArrowRight />
                  </Link>
                </Button>
                <span className="flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")} title={tc("edit")} onClick={() => setEditing(c)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pending}
                  aria-label={c.archived ? tc("unarchive") : tc("archive")}
                  title={c.archived ? tc("unarchive") : tc("archive")}
                  onClick={() => run(() => setClassArchived(c.id, !c.archived), { success: c.archived ? t("restoredToast") : t("archivedToast") })}
                >
                  {c.archived ? <ArchiveRestore /> : <Archive />}
                </Button>
              </div>
            </article>
          ))}
        </div>
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
                  () => saveClass({ id: editing.id, name: String(fd.get("name") ?? ""), description: String(fd.get("description") ?? "") }),
                  { success: t("created"), onSuccess: () => setEditing(null) }
                )
              }}
            >
              <div>
                <FieldLabel htmlFor="class-name">{tc("name")}</FieldLabel>
                <Input id="class-name" name="name" required maxLength={60} defaultValue={editing.name} placeholder={t("namePlaceholder")} className="h-11 font-serif text-lg" />
              </div>
              <div>
                <FieldLabel htmlFor="class-desc">
                  {tc("description")} ({tc("optional")})
                </FieldLabel>
                <Textarea id="class-desc" name="description" maxLength={300} defaultValue={editing.description ?? ""} />
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
