/**
 * Somali phone numbers (+252).
 *
 * Stored in one canonical form, "+252" followed by the national digits with no
 * spaces, so the same guardian typed two ways matches itself on import. Shown
 * grouped the way teachers write them: "+252 61 555 0101".
 */

const COUNTRY = "252"

/**
 * Canonical "+252XXXXXXXXX", or null when the input is not a plausible number.
 *
 * Accepts the shapes teachers actually type: "+252 61 555 0101",
 * "00252615550101", "252615550101", "0615550101" and "615550101".
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = String(input).replace(/[^\d+]/g, "")
  if (!digits) return null
  if (digits.startsWith("+")) digits = digits.slice(1)
  else if (digits.startsWith("00")) digits = digits.slice(2)
  digits = digits.replace(/\D/g, "")

  let national: string
  if (digits.startsWith(COUNTRY) && digits.length > 9) national = digits.slice(COUNTRY.length)
  else if (digits.startsWith("0")) national = digits.slice(1)
  else national = digits

  if (!/^\d{7,9}$/.test(national)) return null
  return `+${COUNTRY}${national}`
}

/** "+252615550101" → "+252 61 555 0101". Anything else is returned as it is. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  const m = /^\+252(\d{2})(\d{3})(\d{2,4})$/.exec(phone)
  return m ? `+252 ${m[1]} ${m[2]} ${m[3]}` : phone
}

/** A tel: link target. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`
}
