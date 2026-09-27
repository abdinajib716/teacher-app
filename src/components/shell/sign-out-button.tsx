"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { LogOut } from "lucide-react"
import { signOutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function SignOutButton() {
  const t = useTranslations("signOut")
  const tn = useTranslations("nav")
  const tc = useTranslations("common")
  const [pending, start] = useTransition()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          title={tn("signOut")}
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-absent-bg hover:text-absent sidebar-collapsed:justify-center sidebar-collapsed:px-0"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sidebar-collapsed:hidden">{tn("signOut")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {tc("cancel")}
            </Button>
          </DialogClose>
          <Button variant="destructive" loading={pending} onClick={() => start(() => signOutAction())}>
            {pending ? t("pending") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
