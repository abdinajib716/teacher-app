import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/auth"

/**
 * The boundary between the app and the auth library. Pages and actions ask
 * these functions for the teacher; nothing else imports `@/auth`.
 *
 * `teacherId` is the id every query filters on.
 */
export type CurrentTeacher = {
  id: string
  email: string
  name: string
}

/** The signed-in teacher, or null. Cached per request. */
export const getCurrentTeacher = cache(async (): Promise<CurrentTeacher | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null
  const { id, email, name } = session.user
  return { id, email, name }
})

/** The signed-in teacher, or a redirect to the sign-in page. */
export async function requireTeacher(): Promise<CurrentTeacher> {
  const teacher = await getCurrentTeacher()
  if (!teacher) redirect("/login")
  return teacher
}
