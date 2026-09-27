# Working in this repository

Teacher Attendance: one Next.js app on one Postgres database. The spec is
`PRD-Teacher-Attendance-App.pdf`; the README maps each PRD section to code.

This is Next.js 16: `params` and `searchParams` are Promises, the middleware
file is `src/proxy.ts`, and the local guides live in `node_modules/next/dist/docs/`.

## Rules

**Every query is scoped by `teacherId`.** There is no admin and no tenant: a
teacher sees only their own rows. Pages and actions get the teacher from
`requireTeacher()` / `requireTeacherSettings()` and pass `teacher.id` into every
`where`. Never trust an id from the client without checking it belongs to them.

**Nothing blocks the teacher.** No locks, windows or cutoffs. Off days and
existing records ask and then allow. History (`src/lib/audit.ts`) is written
after the change and swallows its own errors.

**Time goes through `src/lib/time.ts`.** Instants are `timestamptz` in UTC and
shown in Africa/Mogadishu; school days are `date` columns handled as
`"YYYY-MM-DD"` keys. Do not add hours by hand or use the machine's zone.

**Percentages go through `attendanceRate`.** Present ÷ (Present + Absent);
Excused is left out and shown on its own.

**User-facing text lives in `src/locales/en.json` and `so.json`.** A test
fails if the two files' keys differ. PDFs and emails use the teacher's saved
language via `getTranslations({ locale })`.

**Status is never colour alone.** Show the letter (P/A/E) and an icon too
(`StatusChip`, register cells, PDF cells).

**Pure logic goes in `src/lib` with a `.test.ts` beside it.** Server actions
re-validate everything with zod; client checks are a convenience.

**`"use server"` files export only async functions.** Schemas and helpers go
in `src/lib`.

## Design: "The Register"

The interface is a digital version of the paper register teachers already
keep. Tokens live in `src/app/globals.css`; keep new UI inside them.

- **Materials:** paper background (`bg-background`), sheets (`bg-card`) with
  1px ruled edges, one register-blue (`primary`) for actions. No gradients,
  glows, glass, coloured shadows or lift-on-hover.
- **Type:** `font-serif` (IBM Plex Serif) for page titles, class names and
  section headings; Plex Sans for the interface; `num` (Plex Mono, tabular)
  for every number, time, date field, student number and phone.
- **Status:** always a `Stamp` (square with P / A / E) or a `STATUS_SOLID`
  button: letter plus colour, never colour alone.
- **Structure:** ruled tables (`TableFrame`), figure strips (`FigureStrip`)
  instead of card grids of KPIs, `PageHeader` with an `eyebrow` for context,
  `EmptyState` for nothing-yet. Corners are small (`rounded-md` / `rounded-lg`).
- **Phone first:** the Take Attendance roster must stay one-handed at 375px;
  targets are at least 40px.

Before calling work finished: `npm run typecheck`, `npm run lint`, `npm test`.
