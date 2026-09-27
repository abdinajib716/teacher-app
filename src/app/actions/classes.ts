"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { audit } from "@/lib/audit"
import { done, fail, ok, type ActionResult } from "@/lib/action"

const classSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).optional(),
})

export async function saveClass(input: z.input<typeof classSchema>): Promise<ActionResult<{ id: string }>> {
  const teacher = await requireTeacher()
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) return fail("invalid")
  const { id, name, description } = parsed.data

  if (id) {
    const before = await prisma.schoolClass.findFirst({ where: { id, teacherId: teacher.id } })
    if (!before) return fail("notFound")
    await prisma.schoolClass.update({ where: { id }, data: { name, description: description || null } })
    await audit({
      teacherId: teacher.id,
      entity: "class",
      entityId: id,
      action: "update",
      oldValues: { name: before.name, description: before.description },
      newValues: { name, description },
    })
    revalidatePath("/classes")
    return ok({ id })
  }

  const created = await prisma.schoolClass.create({
    data: { teacherId: teacher.id, name, description: description || null },
  })
  await audit({ teacherId: teacher.id, entity: "class", entityId: created.id, action: "create", newValues: { name } })
  revalidatePath("/classes")
  return ok({ id: created.id })
}

export async function setClassArchived(id: string, archived: boolean): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const res = await prisma.schoolClass.updateMany({ where: { id, teacherId: teacher.id }, data: { archived } })
  if (res.count === 0) return fail("notFound")
  await audit({ teacherId: teacher.id, entity: "class", entityId: id, action: archived ? "archive" : "unarchive" })
  revalidatePath("/classes")
  return done()
}
