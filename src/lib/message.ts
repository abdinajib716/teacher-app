/**
 * The SMS a teacher sends a guardian from the message button.
 *
 * The teacher writes the template once in Settings with {placeholders}; each
 * button fills them for its student and opens the phone's own messages app
 * with the text ready. Nothing is sent by the app itself: the teacher reviews
 * and presses send, from their own number, at no cost to the school.
 */

export const PLACEHOLDERS = [
  "guardian",
  "student",
  "class",
  "absences",
  "lastAbsent",
  "rate",
  "month",
  "teacher",
  "school",
  "date",
] as const

export type Placeholder = (typeof PLACEHOLDERS)[number]
export type MessageVars = Record<Placeholder, string>

export const MAX_TEMPLATE_LENGTH = 600

const DEFAULTS: Record<"en" | "so", string> = {
  en:
    "Assalamu alaikum {guardian}. This is {teacher} from {school}. " +
    "{student} ({class}) has been absent {absences} time(s) in {month}, most recently on {lastAbsent}. " +
    "Attendance this month: {rate}. Please contact me. Thank you.",
  so:
    "Asc {guardian}. Waxaa kuu soo qoray {teacher}, {school}. " +
    "{student} ({class}) wuxuu maqnaa {absences} jeer bisha {month}, ugu dambeyntii {lastAbsent}. " +
    "Xaadiritaanka bishan: {rate}. Fadlan ila soo xiriir. Mahadsanid.",
}

export function defaultTemplate(language: string): string {
  return language === "so" ? DEFAULTS.so : DEFAULTS.en
}

/** The teacher's saved template, or the default for their language. */
export function effectiveTemplate(saved: string | null | undefined, language: string): string {
  return saved?.trim() ? saved : defaultTemplate(language)
}

/** Fills {placeholders}. Unknown ones are left as written, so typos show. */
export function renderMessage(template: string, vars: Partial<MessageVars>): string {
  return template
    .replace(/\{(\w+)\}/g, (whole, key: string) => {
      const v = vars[key as Placeholder]
      return v === undefined ? whole : v
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

/**
 * An `sms:` link with the body filled in. iOS reads the body after `&`,
 * Android and the standard (RFC 5724) after `?`.
 */
export function smsHref(phone: string, body: string, ios = false): string {
  const number = phone.replace(/[^\d+]/g, "")
  return `sms:${number}${ios ? "&" : "?"}body=${encodeURIComponent(body)}`
}

export function isIOS(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && /Mobile/.test(userAgent))
}
