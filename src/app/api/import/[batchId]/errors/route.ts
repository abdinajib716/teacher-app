import { NextResponse } from "next/server"
import { getCurrentTeacher } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** The rows an import rejected, with the reason, as CSV. */
export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { batchId } = await params
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, teacherId: teacher.id },
    select: { errorFile: true, fileName: true },
  })
  if (!batch?.errorFile) return NextResponse.json({ error: "not found" }, { status: 404 })

  const name = `errors_${batch.fileName.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_")}.csv`
  return new NextResponse(`﻿${batch.errorFile}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` },
  })
}
