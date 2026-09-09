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
- `npm run db:seed` — run `prisma/seed.ts`. **Destructive, dev-only**: wipes every table (including users) before loading fixtures.
- `npm run db:seed:achievements` — idempotent upsert of the achievement catalog only; safe on any database. Run after `db:migrate` on every environment.
- `npm run db:seed:content` — inserts missing bundled courses/topics/questions without creating fixture users, changing existing content, or resetting progress. Use to bootstrap an empty replacement database.
- `npm run db:studio`
- `npm test` — pure unit tests (jest). `TEST_DATABASE_URL=postgresql://… npm run test:integration` — DB-backed tests (`*.int.test.ts`) against a throwaway, migrated Postgres (local `initdb`/`pg_ctl` works; never point this at a real database).

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
- No OAuth or password-reset flow. Signup handles projects with email confirmation enabled or disabled. Application tables have RLS enabled with no browser-role policies and client-role grants revoked: all data access is server-only via tRPC and Prisma's database-owner connection. Supabase is used for authentication, not direct browser data access.

### Signup / onboarding flow
1. `/signup` collects `fullName` + `email` + `password`, passes `full_name` via `options.data`.
2. Redirects to `/onboarding/courses` (card grid, must pick ≥1). `user.enrollCourses` mutation inserts `UserCourse` rows.
3. The `(app)` route-group layout gates on enrollment count: 0 → redirect to onboarding; >0 → render the page. `/onboarding/courses` has the reverse gate.

### Route groups
- `src/app/(auth)/` — `/login`, `/signup`, `/onboarding/courses`. Shares the decorative auth layout.
- `src/app/(app)/` — `/` (dashboard, `dashboard-view.tsx`), `/questions`, `/achievements`. `(app)/layout.tsx` checks the Supabase user, enforces the enrollment gate, and wraps children in `SidebarProvider` / `AppSidebar` / `SidebarInset`. Pages must not add their own sidebar wrapper. Shared dashboard client components live in `(app)/_components/`.
- Middleware never redirects `/api/*` to `/login`; tRPC decides per procedure (protected procedures throw `UNAUTHORIZED`).

### Data model (`unimind/prisma/schema.prisma`)
Hierarchy: `Course` → `Topic` → `Subtopic` → `Question`. Per-user state: `UserCourse` (enrollments — hard-deleted on unenroll), `UserTopic` (per-topic EMA mastery + counts), `UserQuestion` (per-`(user, question)` FSRS scheduler state, mirrors ts-fsrs `Card`), `QuestionAttempt` (append-only audit log of every answer), `UserStats` (gamification: level, xp, streaks, totals). `Assessment` is a named dated event tied to a course.

Gamification tables: `Achievement` (catalog, seeded from `prisma/achievements-seed.ts`; `code` is the stable key), `UserAchievement` (first-earn rows, unique per `(user, achievement)`), `AnalyticsEvent` (best-effort wide event log; placeholder until a real pipeline exists).

`QuestionAnswerReceipt` stores the original response and request fingerprint per `(userId, attemptId)`, atomically with answer effects. Clients supply a UUID per genuine answer and retain the exact payload on retries. Identical retries return the original response (Dates preserved); changed payload reuse is `CONFLICT`. Receipts deliberately survive course unenrollment so stale requests cannot recreate deleted progress.

`User.id` is a UUID matching `auth.users.id` — **no default**; it must be provided on create (done by `getOrCreateUserProfile` in the tRPC context). Most other IDs are cuid.

### tRPC routers (`src/server/api/routers/`)
- `user` — `count` (public), `dashboardStats` (mastery tiles + streak/level/XP + achievements rail data), `enrollCourses`, `weeklyPercentile` (anonymous 7-day standing; `null` below cohort 20 or below median)
- `course` — `list`, `enroll`, `unenroll` (hard reset of all per-user state for the course), `listMine`
- `question` — `list` (filter/sort/search), `forMe` and `nextForPaywall` (shared picker — `due ASC NULLS FIRST` over the user's enrolled-course questions), `answer` (rejects questions outside the user's enrolled courses with `FORBIDDEN`; interactive `$transaction` that takes a per-user `pg_advisory_xact_lock`, updates `UserQuestion` FSRS state, appends `QuestionAttempt`, EMA-updates `UserTopic`, updates `UserStats` XP/level/streak, and unlocks achievements; then does one awaited best-effort `AnalyticsEvent` batch write. Returns `xpDelta`, `newLevel`, `leveledUp`, streak fields, `newlyEarnedCodes`, and `newlyEarned[{code,name,xpReward}]`)
- `topic` — `getAll`
- `achievement` — `listForUser` (`earned` / `locked` with 0–1 progress for countable predicates)
- `assessment` — empty placeholder

Scoring in `src/server/lib/scoring/`: `mastery.ts` is the per-topic EMA (15-day half-life, decays toward 50; `applyMastery` on write, `readMastery` on read). `scheduler.ts` is a thin adapter over the `ts-fsrs` package — we persist `Card` fields directly on `UserQuestion` and never reimplement FSRS math. `picker.ts` is the shared raw-SQL "next due card" query used by `forMe` and `nextForPaywall`.

Gamification in `src/server/lib/gamification/` (pure modules, unit-tested): `xp.ts` (5/10/20 XP by difficulty, 1 XP for incorrect; level N at `50·(N−1)·N` XP), `streak.ts` (UTC-day streak transition — a streak day is any day with an answer, correct or not), `achievements.ts` (predicate registry keyed by `Achievement.code`; must stay in lockstep with `prisma/achievements-seed.ts`, enforced by a test), `analytics.ts` (never-throwing event writers; always `await` them — fire-and-forget writes are dropped on serverless). Spec: `docs/superpowers/specs/2026-04-17-gamification-design.md`; extension follow-ups: `GAME_TODO.md`.

### UI
Distinctive engineering-console theme — dark background, phosphor green / cyan / amber / magenta accents, Geist sans + JetBrains Mono, glassmorphism, custom keyframes (`term-rise`, `term-scan`, `term-blink`) defined in `src/styles/globals.css` via Tailwind v4 `@theme`. The sidebar (`src/components/app-sidebar.tsx`) wraps most app routes via `SidebarProvider` / `SidebarInset`.

## Database connection (important)

Retain the Supabase **session pooler** on port `5432` for the replacement project. The old project was deleted; on September 9, 2026, replacement credentials were provisioned locally and in Vercel, all migrations and bootstrap seeds were applied, and live owner access plus browser-role denial were verified.

`question.answer` and `course.unenroll` require one atomic interactive transaction and a transaction-scoped advisory lock. Never split those operations into independently committed writes. Transaction pooling can pin a backend for an entire transaction; the earlier claim that it inherently cannot support interactive transactions was incorrect. However, a move to port `6543` needs explicit Prisma/prepared-statement configuration and live concurrency/rollback testing, not an untested URL edit. Keep the current pooler choice for this release and revisit connection limits before scaling.

## Deployment

Vercel project `unimind-revamped`, production host `unimind-revamped.vercel.app`, Node.js 22. Deploy from `unimind/`; the linked Vercel project's Root Directory is `.`. `postinstall` runs `prisma generate`. Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL`. Release order: `npm run db:migrate` (`prisma migrate deploy`) → `npm run db:seed:achievements` → deploy code. Never run `npm run db:seed` against a database with real users. `next build` fails on ESLint errors, so run `npm run lint` first.

## Workflow conventions

- Brainstorm specs live in `docs/superpowers/specs/YYYY-MM-DD-*.md`.
- Implementation plans live in `docs/superpowers/plans/YYYY-MM-DD-*.md`.
- Commits follow Conventional Commits (`feat(scope):`, `fix(scope):`, `docs(…):`, `chore(…):`). Recent history is a good reference.
- Git workflow: one branch per large feature (e.g. implementing a new feature end-to-end). Within that branch, make a separate commit for each individual change — a button added, a bug fixed, a small update — rather than one large bundled commit. Related changes belonging to the same feature stay together on the branch but remain split across granular commits.
- The team uses subagent-driven development for plan execution; follow the existing plan format when writing new ones (checkbox steps, exact file paths, concrete code, one commit per task).
