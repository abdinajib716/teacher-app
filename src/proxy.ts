import { auth } from "@/auth"
import { NextResponse, type NextRequest } from "next/server"

/**
 * A redirect layer only: the real check is `requireTeacher()` on every page
 * and action. Signed-out visitors to the app go to /login; signed-in visitors
 * to the sign-in pages go to the dashboard.
 */
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/api/auth", "/api/health"]
const AUTH_PAGES = ["/login"]

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await auth.api.getSession({ headers: req.headers })

  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return session ? NextResponse.redirect(new URL("/dashboard", req.nextUrl)) : NextResponse.next()
  }
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
  return NextResponse.next()
}

export const config = {
  // Skip static assets, the PWA manifest and icons: they must load signed out.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icon|apple-icon|pwa-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
