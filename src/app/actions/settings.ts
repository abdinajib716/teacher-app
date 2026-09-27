"use server"

import { headers, cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { passwordSchema, verifyPassword } from "@/lib/password"
import { parseClock } from "@/lib/time"
import { MAX_TEMPLATE_LENGTH, defaultTemplate } from "@/lib/message"
import { done, fail, type ActionResult } from "@/lib/action"
import { LOCALE_COOKIE } from "@/i18n/config"

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  school: z.string().trim().max(120).optional(),
})

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail("invalid")
  await prisma.user.update({
    where: { id: teacher.id },
    data: { name: parsed.data.name, school: parsed.data.school || null },
  })
  revalidatePath("/", "layout")
  return done()
}

const clock = z.string().refine((v) => parseClock(v) !== null)

const preferencesSchema = z
  .object({
    language: z.enum(["en", "so"]),
    lowAttendanceThreshold: z.number().int().min(1).max(100),
    break1Start: clock,
    break2Start: clock,
    break2End: clock,
    schoolDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  })
  .refine((v) => parseClock(v.break1Start)! < parseClock(v.break2Start)!, { message: "breakOrder" })
  .refine((v) => parseClock(v.break2Start)! < parseClock(v.break2End)!, { message: "breakOrder" })

export async function updatePreferences(input: z.input<typeof preferencesSchema>): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues.some((i) => i.message === "breakOrder") ? "breakOrder" : "invalid")
  }
  const data = { ...parsed.data, schoolDays: [...new Set(parsed.data.schoolDays)] }
  await prisma.user.update({ where: { id: teacher.id }, data })
  ;(await cookies()).set(LOCALE_COOKIE, data.language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
  revalidatePath("/", "layout")
  return done()
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  await requireTeacher()
  const parsed = passwordSchema.safeParse(input.newPassword)
  if (!parsed.success) return fail("passwordPolicy")
  try {
    await auth.api.changePassword({
      body: { currentPassword: input.currentPassword, newPassword: parsed.data, revokeOtherSessions: true },
      headers: await headers(),
    })
  } catch {
    return fail("currentPasswordWrong")
  }
  return done()
}

/** Saves the guardian SMS template. Empty, or the default, stores nothing. */
export async function updateSmsTemplate(template: string): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const text = template.replace(/\r\n/g, "\n").trim()
  if (text.length > MAX_TEMPLATE_LENGTH) return fail("invalid")
  const row = await prisma.user.findUnique({ where: { id: teacher.id }, select: { language: true } })
  const isDefault = !text || text === defaultTemplate(row?.language ?? "en")
  await prisma.user.update({ where: { id: teacher.id }, data: { smsTemplate: isDefault ? null : text } })
  revalidatePath("/", "layout")
  return done()
}

const emailChangeSchema = z.object({ newEmail: z.email(), currentPassword: z.string().min(1) })

/**
 * Changes the sign-in email. Guarded by the current password; the teacher's
 * classes and records stay as they are.
 */
export async function changeEmail(input: z.input<typeof emailChangeSchema>): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const parsed = emailChangeSchema.safeParse({ ...input, newEmail: input.newEmail?.trim().toLowerCase() })
  if (!parsed.success) return fail("invalid")
  const { newEmail, currentPassword } = parsed.data

  const credential = await prisma.account.findFirst({
    where: { userId: teacher.id, providerId: "credential" },
    select: { password: true },
  })
  if (!credential?.password || !(await verifyPassword(currentPassword, credential.password))) return fail("currentPasswordWrong")

  if (newEmail !== teacher.email) {
    const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })
    if (taken) return fail("emailTaken")
    await prisma.user.update({ where: { id: teacher.id }, data: { email: newEmail, emailVerified: true } })
  }
  revalidatePath("/", "layout")
  return done()
}
