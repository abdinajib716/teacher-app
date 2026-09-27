/**
 * Sets the teacher login from .env, keeping every class, student and record.
 *
 *   TEACHER_EMAIL, TEACHER_PASSWORD (required), TEACHER_NAME, TEACHER_SCHOOL
 *   npm run teacher:login
 *
 * - An account with TEACHER_EMAIL exists → its password is reset.
 * - Otherwise, when the database has exactly one teacher → that account moves
 *   to TEACHER_EMAIL with the new password (so changing the email in .env and
 *   running this again changes the login).
 * - Otherwise a new teacher account is created.
 *
 * Every existing session of that teacher is signed out.
 */
import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  const email = process.env.TEACHER_EMAIL?.trim().toLowerCase()
  const password = process.env.TEACHER_PASSWORD ?? ""
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Set a valid TEACHER_EMAIL in .env")
  if (password.length < 8 || password.length > 72) throw new Error("TEACHER_PASSWORD must be 8 to 72 characters")

  const name = process.env.TEACHER_NAME?.trim() || undefined
  const school = process.env.TEACHER_SCHOOL?.trim() || undefined
  const hash = await bcrypt.hash(password, 12)

  let teacher = await prisma.user.findUnique({ where: { email } })
  let action = "Password updated for"

  if (!teacher) {
    const all = await prisma.user.findMany({ select: { id: true, email: true } })
    if (all.length === 1) {
      teacher = await prisma.user.update({ where: { id: all[0].id }, data: { email, emailVerified: true } })
      action = `Login moved from ${all[0].email} to`
    } else {
      teacher = await prisma.user.create({
        data: { email, name: name ?? email.split("@")[0], school, emailVerified: true },
      })
      action = "Created"
    }
  }

  if (name || school) {
    await prisma.user.update({ where: { id: teacher.id }, data: { ...(name ? { name } : {}), ...(school ? { school } : {}) } })
  }

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: teacher.id } },
    update: { password: hash },
    create: { userId: teacher.id, accountId: teacher.id, providerId: "credential", password: hash },
  })
  await prisma.session.deleteMany({ where: { userId: teacher.id } })

  console.log(`${action} ${email}. Sign in with the TEACHER_PASSWORD from .env.`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
