import { Resend } from "resend"
import { getTranslations } from "next-intl/server"
import { siteConfig } from "@/config/site"
import { CAJIIB } from "@/lib/cajiib-logo"
import { deliver, deliverWithReason } from "@/lib/email-delivery"
import { isLocale, DEFAULT_LOCALE } from "@/i18n/config"

/**
 * Transactional email through Resend: password reset links and attendance PDF
 * receipts. Each email is written in the teacher's saved language, which is
 * passed in explicitly because these are not always sent from the teacher's
 * own request (a reset link is requested before anyone is signed in).
 */

let instance: Resend | null = null

function client(): Resend {
  if (!instance) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set")
    instance = new Resend(key)
  }
  return instance
}

const from = () => process.env.EMAIL_FROM ?? `${siteConfig.name} <onboarding@resend.dev>`

const strings = (language?: string | null) =>
  getTranslations({ locale: isLocale(language) ? language : DEFAULT_LOCALE, namespace: "email" })

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/**
 * The email version of the document template (see src/lib/pdf.ts): register
 * blue header band with the app name and what the message is, paper body,
 * and the studio credit in the footer.
 */
function layout(kind: string, title: string, body: string, builtBy: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f6f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1917">
  <div style="max-width:560px;margin:32px auto;background:#fffefb;border:1px solid #e3ddd0;border-radius:8px;overflow:hidden">
    <div style="background:#1d3f6e;padding:20px 28px">
      <div style="color:#ffffff;font-size:16px;font-weight:700">${escape(siteConfig.name)}</div>
      <div style="color:#c9d6ea;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px">${escape(kind)}</div>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1917">${escape(title)}</h2>
      ${body}
    </div>
    <div style="border-top:1px solid #e3ddd0;padding:14px 28px;font-size:12px;color:#625d55">
      ${escape(builtBy)}
      <a href="${CAJIIB.url}" style="color:${CAJIIB.blue};font-weight:600;text-decoration:none"><span style="color:${CAJIIB.orange}">&#9679;</span> ${CAJIIB.name}</a>
    </div>
  </div>
</body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escape(href)}" style="display:inline-block;background:#1d3f6e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${escape(label)}</a></p>`

export async function sendPasswordResetEmail(to: string, url: string, language?: string | null) {
  const t = await strings(language)
  return deliver("password-reset", async () =>
    client().emails.send({
      from: from(),
      to,
      subject: t("resetSubject", { app: siteConfig.name }),
      html: layout(
        t("kindAccount"),
        t("resetTitle"),
        `<p>${escape(t("resetBody"))}</p>${button(url, t("resetButton"))}<p style="color:#625d55;font-size:13px">${escape(t("resetIgnore"))}</p>`,
        t("builtBy")
      ),
    })
  )
}

export type ReceiptSummary = {
  className: string
  date: string
  breakLabel: string
  present: number
  absent: number
  excused: number
  recordedAt: string
}

export async function sendAttendanceReceipt(
  to: string,
  summary: ReceiptSummary,
  pdf: Uint8Array,
  fileName: string,
  language?: string | null
) {
  const t = await strings(language)
  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:6px 0;color:#625d55">${escape(label)}</td><td style="padding:6px 0;font-weight:600;text-align:right">${escape(String(value))}</td></tr>`
  return deliverWithReason("attendance-receipt", async () =>
    client().emails.send({
      from: from(),
      to,
      subject: t("receiptSubject", { className: summary.className, date: summary.date, breakLabel: summary.breakLabel }),
      html: layout(
        t("kindReceipt"),
        t("receiptTitle"),
        `<p>${escape(t("receiptBody"))}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${row(t("class"), summary.className)}
          ${row(t("date"), summary.date)}
          ${row(t("break"), summary.breakLabel)}
          ${row(t("present"), summary.present)}
          ${row(t("absent"), summary.absent)}
          ${row(t("excused"), summary.excused)}
          ${row(t("recordedAt"), summary.recordedAt)}
        </table>`,
        t("builtBy")
      ),
      attachments: [{ filename: fileName, content: Buffer.from(pdf) }],
    })
  )
}
