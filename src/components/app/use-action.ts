"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import type { ActionResult } from "@/lib/action"

/**
 * Runs a server action, shows its error in the teacher's language, and
 * refreshes the page on success.
 */
export function useAction() {
  const router = useRouter()
  const te = useTranslations("errors")
  const [pending, start] = useTransition()

  const run = <T,>(action: () => Promise<ActionResult<T>>, opts: { success?: string; onSuccess?: (data: T) => void } = {}) =>
    start(async () => {
      try {
        const res = await action()
        if (!res.ok) {
          toast.error(te.has(res.error) ? te(res.error) : te("generic"))
          return
        }
        if (opts.success) toast.success(opts.success)
        opts.onSuccess?.(res.data)
        router.refresh()
      } catch {
        toast.error(te("generic"))
      }
    })

  return { run, pending }
}
