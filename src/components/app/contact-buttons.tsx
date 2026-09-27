"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { MessageSquareText, Phone } from "lucide-react"
import { isIOS, smsHref } from "@/lib/message"
import { formatPhone, telHref } from "@/lib/phone"
import { cn } from "@/lib/utils"

/**
 * Opens the phone's own messages app with the guardian message filled in.
 * The href is built after mount because iOS and Android read the body from
 * different separators.
 */
export function MessageLink({
  phone,
  body,
  className,
  children,
}: {
  phone: string
  body: string
  className?: string
  children?: React.ReactNode
}) {
  const t = useTranslations("common")
  const [ios, setIos] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(isIOS(navigator.userAgent))
  }, [])
  const label = `${t("message")} ${formatPhone(phone)}`
  return (
    <a href={smsHref(phone, body, ios)} aria-label={label} title={label} className={className}>
      {children ?? <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />}
    </a>
  )
}

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors hover:border-primary/40 hover:bg-primary-soft"

/** Call and message, side by side, for one guardian number. */
export function ContactButtons({ phone, message, showNumber = true, className }: { phone: string; message?: string; showNumber?: boolean; className?: string }) {
  const t = useTranslations("common")
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {showNumber && <span className="num whitespace-nowrap text-[13px]">{formatPhone(phone)}</span>}
      <a href={telHref(phone)} className={iconBtn} aria-label={`${t("call")} ${formatPhone(phone)}`} title={`${t("call")} ${formatPhone(phone)}`}>
        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
      {message !== undefined && <MessageLink phone={phone} body={message} className={iconBtn} />}
    </span>
  )
}
