import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** Liveness plus a one-query database check. */
export async function GET() {
  let database = false
  try {
    await prisma.$queryRaw`SELECT 1`
    database = true
  } catch {
    database = false
  }
  return NextResponse.json(
    { status: database ? "ok" : "degraded", database, timestamp: new Date().toISOString() },
    { status: database ? 200 : 503, headers: { "cache-control": "no-store" } }
  )
}
