import "server-only"
import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth"

/** The signed-in teacher with their settings, or a redirect to sign in. */
export const requireTeacherSettings = cache(async () => {
  const { id } = await requireTeacher()
  const teacher = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      school: true,
      language: true,
      schoolDays: true,
      break1Start: true,
      break2Start: true,
      break2End: true,
      lowAttendanceThreshold: true,
      smsTemplate: true,
    },
  })
  if (!teacher) throw new Error("Signed-in teacher not found")
  return teacher
})

export type TeacherSettings = Awaited<ReturnType<typeof requireTeacherSettings>>

/** The teacher's active classes, for pickers and filters. */
export const activeClasses = cache(async (teacherId: string) =>
  prisma.schoolClass.findMany({
    where: { teacherId, archived: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
)
