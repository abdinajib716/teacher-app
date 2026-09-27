/**
 * Demo data from the PRD: one teacher, class F3C and its 10 students with
 * their guardians, plus three weeks of attendance so the dashboard, register
 * and reports have something to show.
 *
 *   npm run db:seed
 *
 * The login comes from TEACHER_EMAIL / TEACHER_PASSWORD in .env (falling back
 * to demo@example.com / demo12345). Re-running replaces that teacher's data
 * and touches nobody else's. To change only the login and keep the data, use
 * `npm run teacher:login` instead.
 */
import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient, type AttendanceStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const EMAIL = (process.env.TEACHER_EMAIL || "demo@example.com").trim().toLowerCase()
const PASSWORD = process.env.TEACHER_PASSWORD || "demo12345"
const NAME = process.env.TEACHER_NAME || "Karshe"
const SCHOOL = process.env.TEACHER_SCHOOL || "Demo Secondary School"

const STUDENTS: [string, string, "MALE" | "FEMALE", string, string][] = [
  ["Abdirahman Mohamed Ali", "STU-001", "MALE", "Mohamed Ali Nur", "+252615550101"],
  ["Hodan Abdullahi Nur", "STU-002", "FEMALE", "Amina Hassan", "+252615550102"],
  ["Ayaan Hassan Warsame", "STU-003", "FEMALE", "Hassan Warsame", "+252625550103"],
  ["Mohamud Ahmed Jama", "STU-004", "MALE", "Ahmed Jama", "+252615550104"],
  ["Fadumo Yusuf Omar", "STU-005", "FEMALE", "Yusuf Omar", "+252655550105"],
  ["Abdullahi Ibrahim Farah", "STU-006", "MALE", "Halima Farah", "+252615550106"],
  ["Sagal Osman Duale", "STU-007", "FEMALE", "Osman Duale", "+252625550107"],
  ["Ismail Abdi Hersi", "STU-008", "MALE", "Abdi Hersi", "+252615550108"],
  ["Khadra Ali Mohamud", "STU-009", "FEMALE", "Ali Mohamud", "+252665550109"],
  ["Yasin Farah Abdi", "STU-010", "MALE", "Farah Abdi", "+252615550110"],
]

const SCHOOL_DAYS = [6, 0, 1, 2, 3]

function mogadishuToday(): Date {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Mogadishu" }).format(new Date())
  return new Date(`${key}T00:00:00.000Z`)
}

// Deterministic pseudo-random, so every seed produces the same register.
let state = 42
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } })
  if (existing) await prisma.user.delete({ where: { id: existing.id } })

  const teacher = await prisma.user.create({
    data: {
      email: EMAIL,
      name: NAME,
      emailVerified: true,
      school: SCHOOL,
      language: "so",
      schoolDays: SCHOOL_DAYS,
    },
  })
  await prisma.account.create({
    data: {
      userId: teacher.id,
      accountId: teacher.id,
      providerId: "credential",
      password: await bcrypt.hash(PASSWORD, 12),
    },
  })

  const cls = await prisma.schoolClass.create({
    data: { teacherId: teacher.id, name: "F3C", description: "Form 3, section C" },
  })

  const students = []
  for (const [name, studentNo, gender, guardianName, phone] of STUDENTS) {
    const guardian = await prisma.guardian.create({
      data: { teacherId: teacher.id, name: guardianName, phone1: phone },
    })
    students.push(
      await prisma.student.create({
        data: { teacherId: teacher.id, classId: cls.id, guardianId: guardian.id, name, studentNo, gender },
      })
    )
  }

  // Three weeks of school days before today, both breaks.
  const today = mogadishuToday()
  let sessions = 0
  for (let back = 21; back >= 1; back--) {
    const day = new Date(today)
    day.setUTCDate(day.getUTCDate() - back)
    if (!SCHOOL_DAYS.includes(day.getUTCDay())) continue

    for (const breakNo of [1, 2]) {
      const recordedAt = new Date(day)
      recordedAt.setUTCHours(breakNo === 1 ? 10 : 12, 5 + Math.floor(rand() * 20)) // 13:05 / 15:05 Mogadishu
      await prisma.attendanceSession.create({
        data: {
          teacherId: teacher.id,
          classId: cls.id,
          sessionDate: day,
          breakNo,
          recordedAt,
          records: {
            create: students.map((s, i) => {
              // Student 8 is often absent, so the at-risk list is not empty.
              const r = rand()
              const absentChance = i === 7 ? 0.45 : 0.08
              const status: AttendanceStatus = r < absentChance ? "ABSENT" : r < absentChance + 0.04 ? "EXCUSED" : "PRESENT"
              return {
                studentId: s.id,
                status,
                excusedScope: status === "EXCUSED" ? "BREAK" : null,
                note: status === "EXCUSED" ? "Fasax" : null,
              }
            }),
          },
        },
      })
      sessions++
    }
  }

  console.log(`Seeded ${EMAIL} (password from TEACHER_PASSWORD): 1 class, ${students.length} students, ${sessions} breaks.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
