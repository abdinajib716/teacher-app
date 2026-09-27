import { describe, expect, it } from "vitest"
import { defaultTemplate, effectiveTemplate, isIOS, PLACEHOLDERS, renderMessage, smsHref } from "./message"

describe("renderMessage", () => {
  it("fills placeholders with the student's details", () => {
    const text = renderMessage("{student} was absent {absences} times, last on {lastAbsent}.", {
      student: "Hodan Abdullahi Nur",
      absences: "3",
      lastAbsent: "Wed, 23 Sep",
    })
    expect(text).toBe("Hodan Abdullahi Nur was absent 3 times, last on Wed, 23 Sep.")
  })

  it("leaves unknown placeholders visible so a typo is noticed", () => {
    expect(renderMessage("Hi {studnet}", { student: "Ayaan" })).toBe("Hi {studnet}")
  })

  it("uses every placeholder in both default templates", () => {
    for (const lang of ["en", "so"]) {
      const used = [...defaultTemplate(lang).matchAll(/\{(\w+)\}/g)].map((m) => m[1])
      for (const key of used) expect(PLACEHOLDERS).toContain(key)
    }
  })
})

describe("effectiveTemplate", () => {
  it("falls back to the language default when nothing is saved", () => {
    expect(effectiveTemplate(null, "so")).toBe(defaultTemplate("so"))
    expect(effectiveTemplate("   ", "en")).toBe(defaultTemplate("en"))
    expect(effectiveTemplate("Custom {student}", "en")).toBe("Custom {student}")
  })
})

describe("smsHref", () => {
  it("encodes the body and strips spaces from the number", () => {
    expect(smsHref("+252 61 555 0101", "Hi & bye")).toBe("sms:+252615550101?body=Hi%20%26%20bye")
  })

  it("uses the iOS separator on iPhone", () => {
    expect(smsHref("+252615550101", "x", true)).toBe("sms:+252615550101&body=x")
    expect(isIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true)
    expect(isIOS("Mozilla/5.0 (Linux; Android 14)")).toBe(false)
  })
})
