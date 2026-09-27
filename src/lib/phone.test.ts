import { describe, expect, it } from "vitest"
import { formatPhone, normalizePhone } from "./phone"

describe("normalizePhone", () => {
  it.each([
    ["+252 61 555 0101", "+252615550101"],
    ["00252615550101", "+252615550101"],
    ["252615550101", "+252615550101"],
    ["0615550101", "+252615550101"],
    ["615550101", "+252615550101"],
    ["61-555-0101", "+252615550101"],
  ])("reads %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it("rejects what is not a number", () => {
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone("abc")).toBeNull()
    expect(normalizePhone("12")).toBeNull()
  })
})

describe("formatPhone", () => {
  it("groups the way teachers write it", () => {
    expect(formatPhone("+252615550101")).toBe("+252 61 555 0101")
  })
})
