import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma-adapter"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/password"

/**
 * Email and password sign-in for teachers, with sessions stored in the
 * database. Read the session through `@/lib/auth`, not from here.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  session: {
    // PRD: session expiry. Sessions last 30 days and are refreshed daily while
    // the teacher keeps using the app, so nobody is signed out mid-register.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 },
  },

  emailAndPassword: {
    enabled: true,
    // No public sign-up: teacher accounts are created with
    // `npm run teacher:login` (see .env). This closes /api/auth/sign-up too.
    disableSignUp: true,
    minPasswordLength: 8,
    // bcrypt only considers the first 72 bytes; reject longer input instead of
    // silently truncating it.
    maxPasswordLength: 72,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    password: {
      hash: hashPassword,
      verify: ({ password, hash }) => verifyPassword(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      const { sendPasswordResetEmail } = await import("@/lib/email")
      const row = await prisma.user.findUnique({ where: { id: user.id }, select: { language: true } })
      await sendPasswordResetEmail(user.email, url, row?.language)
    },
  },

  onAPIError: { errorURL: "/login" },

  // MUST stay last: without it a sign-in from a server action sets no cookie.
  plugins: [nextCookies()],
})
