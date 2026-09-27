"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { RotateCcw } from "lucide-react"
import { updateSmsTemplate } from "@/app/actions/settings"
import { useAction } from "@/components/app/use-action"
import { MessageLink } from "@/components/app/contact-buttons"
import { MAX_TEMPLATE_LENGTH, PLACEHOLDERS, renderMessage, type MessageVars } from "@/lib/message"
import { fieldClass } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** One SMS holds 160 plain characters; longer texts are sent in 153-character parts. */
function smsParts(length: number) {
  return length <= 160 ? 1 : Math.ceil(length / 153)
}

export function MessageTemplateEditor({
  initial,
  fallback,
  sample,
  samplePhone,
}: {
  initial: string
  fallback: string
  sample: MessageVars
  samplePhone: string | null
}) {
  const t = useTranslations("settings.message")
  const tc = useTranslations("common")
  const ref = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(initial)
  const { run, pending } = useAction()
  const preview = renderMessage(text || fallback, sample)

  const insert = (key: string) => {
    const el = ref.current
    const token = `{${key}}`
    if (!el) return setText((v) => v + token)
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const next = text.slice(0, start) + token + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => updateSmsTemplate(text), { success: t("saved") })
      }}
    >
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="sms-template" className="text-xs font-medium text-muted-foreground">
            {t("template")}
          </label>
          <span className={cn("num text-[11px]", text.length > MAX_TEMPLATE_LENGTH ? "text-absent" : "text-muted-foreground")}>
            {t("counter", { chars: text.length, parts: smsParts(preview.length) })}
          </span>
        </div>
        <textarea
          id="sms-template"
          ref={ref}
          value={text}
          maxLength={MAX_TEMPLATE_LENGTH}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className={cn(fieldClass, "min-h-32 py-2.5 leading-relaxed")}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("insert")}</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => insert(p)}
              title={t(`vars.${p}`)}
              className="num rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[11.5px] hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
            >
              {`{${p}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-3 py-2">
          <p className="eyebrow">{t("preview")}</p>
          <span className="truncate text-[11px] text-muted-foreground">
            {sample.student} · {sample.guardian}
          </span>
        </div>
        <div className="bg-card p-3">
          <p className="ml-auto max-w-[85%] whitespace-pre-line rounded-lg rounded-br-sm bg-primary px-3 py-2 text-[13.5px] leading-relaxed text-primary-foreground">
            {preview}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={pending}>
          {tc("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText(fallback)}>
          <RotateCcw /> {t("reset")}
        </Button>
        {samplePhone && (
          <Button asChild variant="outline" className="ml-auto">
            <MessageLink phone={samplePhone} body={preview}>
              {t("tryIt")}
            </MessageLink>
          </Button>
        )}
      </div>
    </form>
  )
}
