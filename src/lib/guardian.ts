import { z } from "zod"
import { normalizePhone } from "@/lib/phone"

export const guardianSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  phone1: z.string().trim().max(30).optional(),
  phone2: z.string().trim().max(30).optional(),
})

export type GuardianInput = z.input<typeof guardianSchema>

export type ParsedGuardian = { id?: string; name: string; phone1: string | null; phone2: string | null }

/** Parsed guardian fields with phones in canonical +252 form, or an error key. */
export function parseGuardian(input: GuardianInput): { data: ParsedGuardian } | { error: "invalid" | "phoneInvalid" } {
  const parsed = guardianSchema.safeParse(input)
  if (!parsed.success) return { error: "invalid" }
  const { id, name, phone1, phone2 } = parsed.data
  const p1 = phone1 ? normalizePhone(phone1) : null
  const p2 = phone2 ? normalizePhone(phone2) : null
  if ((phone1 && !p1) || (phone2 && !p2)) return { error: "phoneInvalid" }
  return { data: { id, name, phone1: p1, phone2: p2 } }
}
