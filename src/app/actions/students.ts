"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"
import { audit } from "@/lib/audit"
import { parseGuardian, type GuardianInput } from "@/lib/guardian"
import { done, fail, ok, type ActionResult } from "@/lib/action"

const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  studentNo: z.string().trim().max(40).optional(),
  gender: z.enum(["MALE", "FEMALE"]),
  classId: z.string().min(1),
  // An existing guardian, or the fields of a new one. Neither is allowed too.
  guardianId: z.string().optional(),
})

export type StudentInput = z.input<typeof studentSchema> & { newGuardian?: GuardianInput }

export async function saveStudent(input: StudentInput): Promise<ActionResult<{ id: string }>> {
  const teacher = await requireTeacher()
  const parsed = studentSchema.safeParse(input)
  if (!parsed.success) return fail("invalid")
  const { id, name, gender, classId } = parsed.data
  const studentNo = parsed.data.studentNo || null

  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, teacherId: teacher.id }, select: { id: true } })
  if (!cls) return fail("notFound")

  let guardianId: string | null = null
  if (input.newGuardian?.name) {
    const g = parseGuardian(input.newGuardian)
    if ("error" in g) return fail(g.error)
    const { name: gname, phone1, phone2 } = g.data
    const created = await prisma.guardian.create({ data: { name: gname, phone1, phone2, teacherId: teacher.id } })
    guardianId = created.id
  } else if (parsed.data.guardianId) {
    const g = await prisma.guardian.findFirst({
      where: { id: parsed.data.guardianId, teacherId: teacher.id },
      select: { id: true },
    })
    if (!g) return fail("notFound")
    guardianId = g.id
  }

  const data = { name, studentNo, gender, classId, guardianId }
  try {
    if (id) {
      const before = await prisma.student.findFirst({ where: { id, teacherId: teacher.id } })
      if (!before) return fail("notFound")
      await prisma.student.update({ where: { id }, data })
      await audit({
        teacherId: teacher.id,
        entity: "student",
        entityId: id,
        action: "update",
        oldValues: {
          name: before.name,
          studentNo: before.studentNo,
          gender: before.gender,
          classId: before.classId,
          guardianId: before.guardianId,
        },
        newValues: data,
      })
      revalidatePath("/students")
      return ok({ id })
    }
    const created = await prisma.student.create({ data: { ...data, teacherId: teacher.id } })
    await audit({ teacherId: teacher.id, entity: "student", entityId: created.id, action: "create", newValues: data })
    revalidatePath("/students")
    return ok({ id: created.id })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("studentNoTaken")
    throw error
  }
}

export async function setStudentArchived(id: string, archived: boolean): Promise<ActionResult> {
  const teacher = await requireTeacher()
  const res = await prisma.student.updateMany({ where: { id, teacherId: teacher.id }, data: { archived } })
  if (res.count === 0) return fail("notFound")
  await audit({ teacherId: teacher.id, entity: "student", entityId: id, action: archived ? "archive" : "unarchive" })
  revalidatePath("/students")
  return done()
}
