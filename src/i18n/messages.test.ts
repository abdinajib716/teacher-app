import { describe, expect, it } from "vitest"
import en from "@/locales/en.json"
import so from "@/locales/so.json"

type Tree = { [key: string]: string | Tree }

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)))
}

describe("locale files", () => {
  it("Somali has every English key", () => {
    const missing = keys(en).filter((k) => !keys(so).includes(k))
    expect(missing).toEqual([])
  })

  it("Somali has no keys English lacks", () => {
    const extra = keys(so).filter((k) => !keys(en).includes(k))
    expect(extra).toEqual([])
  })

  it("keeps the paper-register words for the statuses", () => {
    expect(so.status).toMatchObject({ PRESENT: "Joogid", ABSENT: "Maqan", EXCUSED: "Fasax" })
  })
})
