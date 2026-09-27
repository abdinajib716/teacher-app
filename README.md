# Teacher Attendance

A web app and installable PWA where a teacher registers students and their
guardians and records attendance for **two breaks each school day**, replacing
the paper monthly register. Somali and English. Built from the PRD in
`PRD-Teacher-Attendance-App.pdf`, on top of the
[OpenStarterKit Next.js SaaS starter](https://github.com/openstarterkit/nextjs-saas-starter-kit)
(auth, UI kit and project setup reused; billing, blog, admin, OAuth and 2FA removed).

## Stack

Next.js 16 (App Router, server actions) · PostgreSQL on Neon via Prisma 7 ·
Better Auth (email + password, database sessions) · Resend (reset links, PDF
receipts) · next-intl (Somali / English) · Tailwind 4 + Radix UI · Recharts ·
pdf-lib (PDF) · exceljs + papaparse (Excel / CSV).

## Getting started

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL, AUTH_SECRET, RESEND_API_KEY
npm run db:deploy           # apply migrations
npm run teacher:login       # create the teacher from TEACHER_EMAIL / TEACHER_PASSWORD
npm run db:seed             # optional: demo class F3C, 10 students, 3 weeks of attendance
npm run dev
```

There is **no public sign-up**. The teacher signs in with `TEACHER_EMAIL` /
`TEACHER_PASSWORD` from `.env`. To change the login, edit those two values and
run `npm run teacher:login` again: the account keeps all its classes and
records. The teacher can also change email and password in Settings.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` / `start` | Production build and server |
| `npm test` | Unit tests (time zone, percentages, import rules, phones, PDF, locales) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Reset the teacher's data to the demo class |
| `npm run teacher:login` | Apply `TEACHER_EMAIL` / `TEACHER_PASSWORD` from `.env` |
| `npm run email:test -- you@example.com` | Send one test email through Resend |

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon/Postgres connection string |
| `AUTH_SECRET` | production | Session signing secret |
| `NEXT_PUBLIC_APP_URL` | yes | Public URL, no trailing slash (used in reset links) |
| `RESEND_API_KEY` | for email | Starts with `re_`. Without it, reset and "email PDF" are disabled with a clear message |
| `EMAIL_FROM` | with Resend | Must be on a domain verified in Resend. `onboarding@resend.dev` only delivers to the Resend account owner |
| `NEXT_PUBLIC_APP_NAME` | no | Shown in the UI, emails, PDFs and PWA |
| `TEACHER_EMAIL` / `TEACHER_PASSWORD` | yes | The teacher login, applied by `npm run teacher:login` |

## How the PRD maps to the code

| PRD | Where |
| --- | --- |
| Core rules: time zone, school days, default break | `src/lib/time.ts` (+ tests) |
| Percentage = Present ÷ (Present + Absent), Excused apart | `src/lib/attendance.ts` (+ tests) |
| Data model (8 entities, `teacherId` on every table) | `prisma/schema.prisma` |
| Take Attendance flow, edge cases | `src/app/(app)/attendance`, `src/components/attendance/attendance-taker.tsx`, `src/app/actions/attendance.ts` |
| PDF receipt + email | `src/lib/receipt.ts`, `src/app/api/receipts/[sessionId]`, `src/lib/email.ts` |
| Monthly Register + export | `src/app/(app)/register`, `src/lib/data/register.ts`, `src/app/api/export/register` |
| Dashboard KPIs and charts | `src/app/(app)/dashboard`, `src/lib/data/stats.ts` |
| Reports + export | `src/lib/data/reports.ts` (one source for screen, PDF and Excel) |
| Import with preview, duplicates, error file | `src/lib/import.ts` (+ tests), `src/lib/spreadsheet.ts`, `src/app/actions/import.ts` |
| Somali / English | `src/locales/{en,so}.json`, `src/i18n/` |
| Quiet edit history | `src/lib/audit.ts` → `audit_logs` table |
| PWA (online only) | `src/app/manifest.ts`, `public/sw.js` (offline screen only, no data cached), `public/offline.html`, `src/components/pwa/pwa.tsx` (install button) |
| Guardian SMS | `src/lib/message.ts` (+ tests), `src/lib/data/guardian-message.ts`, template editor in Settings |

## Decisions on the PRD's open questions

These follow the PRD's defaults and are easy to change:

- A student belongs to **one class**.
- Students **start as Present**.
- One guardian can have several students and **up to two phone numbers**; the
  import matches guardians by phone, so siblings sharing a number share a guardian.
- **Late is removed**; Break 1 ends at 3:00 PM; **gender** drives the Wiilal /
  Gabdho / Wadar counts.
- The **quiet edit history is kept** (`audit_logs`), written after each save and
  never blocking it.
- SMS / WhatsApp alerts are out of scope for v1.

## Deploying

One Next.js deployment (e.g. Vercel) plus the Neon database. Set the
environment variables above, run `npm run db:deploy` against the production
database, and enable Neon's daily backups (PITR) to meet the backup requirement.

## Messaging guardians

Every guardian number has **Call** and **Message** buttons (Students, student
profile, Guardians, Dashboard at-risk list). Message opens the phone's own SMS
app with the text filled in; the teacher reviews it and presses send, so it
costs the school nothing and needs no SMS provider. The text is written once in
**Settings → Guardian message** with placeholders: `{guardian}`, `{student}`,
`{class}`, `{absences}` (this month), `{lastAbsent}`, `{rate}` (this month),
`{month}`, `{teacher}`, `{school}`, `{date}`.

## Email (Resend)

Until a domain is verified at resend.com/domains, Resend's test mode only
delivers to the Resend account owner's own address. Verify a domain, then set
`EMAIL_FROM` to an address on it (e.g. `Attendance <no-reply@yourschool.so>`).
The app tells the teacher when an email was refused for this reason.
