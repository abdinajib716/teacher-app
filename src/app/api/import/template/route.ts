import { NextResponse } from "next/server"
import { getCurrentTeacher } from "@/lib/auth"
import { templateWorkbook } from "@/lib/spreadsheet"
import { TEMPLATE_COLUMNS } from "@/lib/import"

/** The import template: ?format=csv for CSV, Excel otherwise. */
export async function GET(req: Request) {
  if (!(await getCurrentTeacher())) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const csv = `${TEMPLATE_COLUMNS.join(",")}\nAbdirahman Mohamed Ali,STU-001,M,Mohamed Ali Nur,+252 61 555 0101,\n`
    return new NextResponse(`﻿${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="students_template.csv"`,
      },
    })
  }

  const buf = await templateWorkbook()
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="students_template.xlsx"`,
    },
  })
}
