import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * The quiet edit history. Written after the change it describes has already
 * been saved, and a failure here is logged and swallowed: the history must
 * never block the teacher (PRD: "Nothing is ever blocked").
 */
export async function audit(entry: {
  teacherId: string
  entity: string
  entityId: string
  action: "create" | "update" | "archive" | "unarchive" | "import"
  oldValues?: unknown
  newValues?: unknown
}) {
  try {
    await prisma.auditLog.create({
      data: {
        teacherId: entry.teacherId,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        oldValues: (entry.oldValues ?? Prisma.DbNull) as Prisma.InputJsonValue,
        newValues: (entry.newValues ?? Prisma.DbNull) as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    console.error("[audit] could not write history entry", error)
  }
}
