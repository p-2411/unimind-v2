# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**UniMind** — a study app where students enroll in courses, practice multiple-choice questions, and track per-topic mastery. Pre-launch, no real users.

The Next.js app lives under `unimind/`. Everything outside that directory is repo-level (docs, plans, specs, this file).

## Commands

Run all commands from `unimind/` unless stated otherwise.

- `npm run dev` — dev server (Next 15, Turbopack)
- `npm run build` / `npm run start`
- `npm run lint` / `npm run typecheck` — ESLint / `tsc --noEmit`
- `npm run db:generate` — `prisma migrate dev` (creates migration + regenerates client)
- `npm run db:push` — push schema without migration (dev only)
- `npm run db:seed` — run `prisma/seed.ts`
- `npm run db:studio`

Package manager is **npm**, not pnpm. Prisma client is generated to `unimind/generated/prisma/` (non-standard path — import from there, not `@prisma/client`).

## Architecture

### Stack
Next.js 15 App Router · TypeScript · tRPC v11 · Prisma · Supabase (Auth + Postgres) · Tailwind v4 · shadcn/ui. T3-style layout.

### Auth (Supabase, email/password only)
- `src/lib/supabase/server.ts` — `createSupabaseServerClient()` (SSR, cookie-backed, via `@supabase/ssr`).
- `src/lib/supabase/browser.ts` — browser client singleton.
- `src/components/providers/supabase-provider.tsx` — `SupabaseProvider` + `useSupabase()` / `useUser()` hooks.
- `src/middleware.ts` — protects routes using `supabase.auth.getClaims()` (fast, local JWT verify). Redirects unauth → `/login`, redirects auth users away from `/login` and `/signup`.
- `src/server/api/trpc.ts` — `createTRPCContext` calls `supabase.auth.getUser()` (authoritative), then **lazily creates** the `public.users` profile row on first authenticated request, copying `full_name` from `auth.users.user_metadata` on create only (never overwrites).
- No email confirmation, no OAuth, no password reset, no RLS. Data access is server-only via tRPC.

### Signup / onboarding flow
1. `/signup` collects `fullName` + `email` + `password`, passes `full_name` via `options.data`.
2. Redirects to `/onboarding/courses` (card grid, must pick ≥1). `user.enrollCourses` mutation inserts `UserCourse` rows.
3. Root `/` gates on enrollment count: 0 → redirect to onboarding; >0 → render dashboard. `/onboarding/courses` has the reverse gate.

### Data model (`unimind/prisma/schema.prisma`)
Hierarchy: `Course` → `Topic` → `Subtopic` → `Question`. Per-user state: `UserCourse` (enrollments), `UserTopic` (mastery score 0–100 per topic, correct/total counts), `UserStats` (gamification: level, xp, streaks, totals). `Assessment` is a named dated event tied to a course.

`User.id` is a UUID matching `auth.users.id` — **no default**; it must be provided on create (done by `getOrCreateUserProfile` in the tRPC context). Most other IDs are cuid.

### tRPC routers (`src/server/api/routers/`)
- `user` — `count` (public), `dashboardStats`, `enrollCourses`
- `course` — `list`, `enroll`, `listMine`
- `question` — `list` (filter/sort/search), `forMe` (weighted pick by lowest `UserTopic.score`), `answer` (interactive `$transaction` that updates `UserTopic` + `UserStats`)
- `topic` — `getAll`
- `assessment` — empty placeholder

Mastery scoring in `src/server/lib/scoring.ts`: `computeTopicScore({ prevScore, isCorrect })` is a simple ±1 clamp 0–100, seeded at `INITIAL_TOPIC_SCORE = 50`.

### UI
Distinctive engineering-console theme — dark background, phosphor green / cyan / amber / magenta accents, Geist sans + JetBrains Mono, glassmorphism, custom keyframes (`term-rise`, `term-scan`, `term-blink`) defined in `src/styles/globals.css` via Tailwind v4 `@theme`. The sidebar (`src/components/app-sidebar.tsx`) wraps most app routes via `SidebarProvider` / `SidebarInset`.

## Database connection (important)

`DATABASE_URL` currently points at Supabase's **session pooler** on port `5432` (hostname `aws-*.pooler.supabase.com`). `DIRECT_URL` is the same. This is deliberate:

- `question.answer` uses Prisma's interactive `$transaction(async tx => …)`, which **breaks on the transaction pooler** (port 6543) — pgbouncer in transaction mode can't hold a dedicated connection across multiple round-trips. Symptom: `"Transaction API error: Unable to start a transaction in the given time."`
- Session mode holds one Postgres backend per client session, so interactive transactions work.
- Before scaling, revisit this — see `TODO.md` at repo root for options (transaction pooler + remove interactive tx, Neon HTTP driver, etc.).

Do **not** switch back to port `6543` without first refactoring `question.answer` and any other interactive transactions.

## Workflow conventions

- Brainstorm specs live in `docs/superpowers/specs/YYYY-MM-DD-*.md`.
- Implementation plans live in `docs/superpowers/plans/YYYY-MM-DD-*.md`.
- Commits follow Conventional Commits (`feat(scope):`, `fix(scope):`, `docs(…):`, `chore(…):`). Recent history is a good reference.
- The team uses subagent-driven development for plan execution; follow the existing plan format when writing new ones (checkbox steps, exact file paths, concrete code, one commit per task).
