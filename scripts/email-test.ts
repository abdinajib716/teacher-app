/**
 * Sends one test email through Resend with the app's settings.
 *
 *   npm run email:test -- someone@example.com
 *
 * Without a verified domain in Resend, only the Resend account owner's own
 * address can receive mail; Resend's answer is printed either way.
 */
import "dotenv/config"
import { Resend } from "resend"

async function main() {
  const to = process.argv[2]
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? "Teacher Attendance <onboarding@resend.dev>"
  if (!key) throw new Error("RESEND_API_KEY is not set in .env")
  if (!to) throw new Error("Usage: npm run email:test -- you@example.com")

  const { data, error } = await new Resend(key).emails.send({
    from,
    to,
    subject: "Teacher Attendance: email test",
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:24px auto;border:1px solid #e3ddd0;border-radius:8px;overflow:hidden">
      <div style="background:#1d3f6e;color:#fff;padding:18px 24px;font:600 18px Georgia,serif">Teacher Attendance</div>
      <div style="padding:24px;color:#1a1917;line-height:1.5">
        <p style="margin:0 0 12px"><b>Email is working.</b> Password reset links and attendance PDF receipts will be sent from <code>${from.replace(/</g, "&lt;")}</code>.</p>
        <p style="margin:0;color:#625d55;font-size:13px">Sent ${new Date().toISOString()}</p>
      </div></div>`,
  })
  if (error) {
    console.error("Resend refused the email:", error.message)
    process.exitCode = 1
    return
  }
  console.log(`Sent to ${to}. Resend id: ${data?.id}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
})
