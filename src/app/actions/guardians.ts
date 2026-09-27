"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { audit } from "@/lib/audit"
import { parseGuardian, type GuardianInput } from "@/lib/guardian"
import { done, fail, ok, type ActionResult } from "@/lib/action"

export async function saveGuardian(input: GuardianInput): Promise<ActionResult<{ id: string }>> {
  const teacher = await requireTeacher()
  const parsed = parseGuardian(input)
  if ("error" in parsed) return fail(parsed.error)
  const { id, ...data } = parsed.data

  if (id) {
    const before = await prisma.guardian.findFirst({ where: { id, teacherId: teacher.id } })
    if (!before) return fail("notFound")
    await prisma.guardian.update({ where: { id }, data })
    await audit({
      teacherId: teacher.id,
      entity: "guardian",
      entityId: id,
      action: "update",
      oldValues: { name: before.name, phone1: before.phone1, phone2: before.phone2 },
      newValues: data,
    })
    revalidatePath("/guardians")
    return ok({ id })
  }

  const created = await prisma.guardian.create({ data: { ...data, teacherId: teacher.id } })
  await audit({ teacherId: teacher.id, entity: "guardian", entityId: created.id, action: "create", newValues: data })
  revalidatePath("/guardians")
  return ok({ id: created.id })
}

export async function setGuardianArchived(id: string, archived: boolean): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const res = await prisma.guardian.updateMany({ where: { id, teacherId: teacher.id }, data: { archived } })
  if (res.count === 0) return fail("notFound")
  await audit({ teacherId: teacher.id, entity: "guardian", entityId: id, action: archived ? "archive" : "unarchive" })
  revalidatePath("/guardians")
  return done()
}
