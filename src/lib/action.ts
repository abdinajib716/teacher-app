/**
 * What every server action returns. `error` is a message key under
 * `errors.*` in the locale files, so the client shows it in the teacher's
 * language.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
export const done = (): ActionResult => ({ ok: true, data: undefined })
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
