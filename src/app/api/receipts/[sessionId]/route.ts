import { NextResponse } from "next/server"
import { getCurrentTeacher } from "@/lib/auth"
import { buildReceipt } from "@/lib/receipt"

/** The PDF receipt for one saved break, as a download. */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { sessionId } = await params
  const receipt = await buildReceipt(teacher.id, sessionId)
  if (!receipt) return NextResponse.json({ error: "not found" }, { status: 404 })

  return new NextResponse(Buffer.from(receipt.bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${receipt.fileName}"`,
      "cache-control": "no-store",
    },
  })
}
