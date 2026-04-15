---
name: Supabase Auth Migration Design
description: Replace NextAuth with Supabase Auth (email/password) and move Postgres to Supabase, keeping Prisma and tRPC
status: draft
---

# Supabase Auth Migration — Design Spec

## Goal

Replace NextAuth with Supabase Auth (email + password, no OAuth, no email confirmation) and host Postgres on Supabase. Keep Prisma as the schema/migration tool and keep tRPC as the data API. No RLS — all data access still flows through tRPC procedures that authorize against `ctx.session.user.id`.

## Scope

**In scope**
- Enable Supabase Auth with email/password provider, confirmations disabled.
- Move `DATABASE_URL` to Supabase Postgres; run a clean Prisma migration (no user data migration — pre-launch, wiping is acceptable).
- Remove NextAuth (`next-auth`, `@auth/prisma-adapter`) and its routes, config, and Prisma models (`Account`, `Session`, `VerificationToken`).
- Add Supabase SDK (`@supabase/supabase-js`, `@supabase/ssr`) and wire JWT-based auth into tRPC context.
- Build `/login` and `/signup` pages with email/password forms.
- Update root layout and any components using `useSession()` / `auth()`.

**Out of scope**
- OAuth providers (Google, etc.) — existing NextAuth Google config is removed; re-adding OAuth is a future task.
- Row-Level Security policies — not used; data access stays server-only via tRPC. **Data API must be disabled** in Supabase project settings so the `public` schema is not reachable via PostgREST. Without RLS, leaving the Data API on would expose all tables to anyone with the publishable key. (Supabase's default guidance is "RLS on every public table"; disabling the Data API is the equivalent safety boundary for this architecture.)
- Password reset / email confirmation flows — can be added later; not required for this migration.
- Migrating existing users — the current NextAuth `User`/`Account` data will be wiped.

## Architecture

### Identity model

- Supabase owns `auth.users` (managed schema). This is the source of truth for user credentials and sessions.
- Prisma's `User` model becomes a **profile table** in `public.users`, keyed by `id UUID` equal to `auth.users.id`.
- On each authenticated request, tRPC context ensures a profile row exists for the authenticated Supabase user (lazy `getOrCreateUser`), then attaches `session.user.id`.

### Session transport

- Browser signs in via `supabase.auth.signInWithPassword(...)`. Supabase client stores the session (access token + refresh token) in cookies via `@supabase/ssr`.
- Server (Next.js route handlers, RSC, tRPC) reads the session using the Supabase server client from `@supabase/ssr`, which parses auth cookies and verifies the JWT.
- tRPC context calls `supabase.auth.getUser()` (server-side) to get the current user. Unauthenticated requests get `session: null`.

### tRPC auth

- A new `createServerSupabaseClient()` helper constructs a per-request Supabase server client bound to the incoming Next.js cookies. Note: in Next 15+, `cookies()` from `next/headers` is async — `const cookieStore = await cookies()`.
- `createTRPCContext` calls this helper, then `supabase.auth.getUser()` (authoritative — contacts the Auth server and verifies). If a user is returned, it calls `getOrCreateUserProfile(userId, email)` (upserts a row in `public.users`) and sets `ctx.session = { user: { id, email } }`.
- `protectedProcedure` remains unchanged — it still checks `ctx.session?.user`.
- **Do not use `supabase.auth.getSession()` server-side** — it reads cookies without verification and is spoofable. Always `getUser()` for authorization decisions.

### Client session hook

- A small `SupabaseProvider` wraps the app root. It creates one browser client via `createBrowserClient` and exposes it through context.
- A `useUser()` hook subscribes to `supabase.auth.onAuthStateChange` and returns `{ user, isLoading }`. This replaces `useSession()`.
- After `signIn` / `signUp` / `signOut`, the provider calls `router.refresh()` so RSC reads updated cookies.

## File-by-file plan

**Remove**
- `src/server/auth/config.ts`
- `src/server/auth/index.ts`
- `src/app/api/auth/[...nextauth]/route.ts` (entire folder)
- Any `SessionProvider` wrapping in the root layout
- `next-auth`, `@auth/prisma-adapter` from `package.json`

**Add**
- `src/lib/supabase/server.ts` — `createServerSupabaseClient()` using `@supabase/ssr` and `next/headers` cookies.
- `src/lib/supabase/browser.ts` — `createBrowserSupabaseClient()` (singleton).
- `src/lib/supabase/admin.ts` — service-role client (optional, used only if/when server-side user management is needed).
- `src/components/providers/supabase-provider.tsx` — client provider + `useUser()` hook.
- `src/app/(auth)/login/page.tsx` — email/password form calling `signInWithPassword`.
- `src/app/(auth)/signup/page.tsx` — email/password form calling `signUp`. Because confirmations are disabled, the user is immediately signed in.
- `src/app/(auth)/logout/route.ts` — POST handler that calls `supabase.auth.signOut()` and redirects.
- `middleware.ts` at project root — uses `@supabase/ssr`'s `updateSession` helper to refresh tokens on every request and optionally redirect unauthenticated users away from protected paths. Inside middleware, use `supabase.auth.getClaims()` (faster — local JWT verification, no Auth server roundtrip) rather than `getUser()`. Per Supabase docs: do not run any code between `createServerClient` and `getClaims()` — races can silently log users out.

**Modify**
- `prisma/schema.prisma`
  - Drop `Account`, `Session`, `VerificationToken` models.
  - Remove `accounts` and `sessions` relations from `User`.
  - Change `User.id` to `String @id @db.Uuid` (no default — ID comes from Supabase auth).
  - Remove `password` field from `User` (Supabase holds credentials).
  - Keep `email`, `name`, `image`, `createdAt`, `updatedAt` and all downstream relations (`UserStats`, `UserTopic`, `courses`, `assessments`).
- `src/server/api/trpc.ts` — `createTRPCContext` reads Supabase session instead of NextAuth `auth()`; `getOrCreateUserProfile` upsert helper added.
- `src/app/layout.tsx` — wrap children in `<SupabaseProvider>`. Remove any NextAuth `SessionProvider`.
- Replace `useSession()` call sites with `useUser()`. Replace server-side `auth()` calls with `createServerSupabaseClient().auth.getUser()`.
- `.env` — add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new `sb_publishable_*` format — replaces legacy `anon` key), `SUPABASE_SECRET_KEY` (new `sb_secret_*` format — replaces legacy `service_role` key), and update `DATABASE_URL` to Supabase pooled connection string. Remove `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

## Data flow (happy path)

1. User visits `/signup`, enters email + password.
2. Client calls `supabase.auth.signUp({ email, password })`. Supabase creates a row in `auth.users` and returns a session (confirmations off).
3. Supabase browser client writes auth cookies. `SupabaseProvider` calls `router.refresh()`.
4. Next request hits the server. Middleware refreshes tokens. tRPC context reads the Supabase user, calls `getOrCreateUserProfile(id, email)` which upserts a `public.users` row with `id = auth.users.id`.
5. Protected procedures run with `ctx.session.user.id` set to the UUID.

## Error handling

- **Sign-in failure:** Supabase returns an error (`invalid_credentials`, etc.) — form displays the message inline.
- **Sign-up duplicate email:** Supabase returns `user_already_exists` — form shows "Account already exists, try signing in."
- **Token expired mid-session:** middleware refreshes via refresh token; if refresh fails, `supabase.auth.getUser()` returns null and tRPC treats the request as unauthenticated.
- **Profile upsert race:** `getOrCreateUserProfile` uses Prisma `upsert` keyed by `id`, which is idempotent.

## Testing

- Manual: sign up → redirected to app → refresh page → still logged in → sign out → redirected to `/login`.
- Manual: sign in with wrong password → inline error.
- Manual: protected tRPC query with no session → returns `UNAUTHORIZED`.
- Manual: DB check — `auth.users` and `public.users` have matching `id`s after first sign-in.

## Migration steps (execution order)

1. Create Supabase project. Enable email provider. Disable "Confirm email" in Auth settings. **Disable the Data API** (Project Settings → Data API) since the `public` schema is not meant to be exposed.
2. Add Supabase env vars locally and in deploy target. Point `DATABASE_URL` at Supabase pooler URL; set `DIRECT_URL` for migrations if needed.
3. Install `@supabase/supabase-js` and `@supabase/ssr`. Uninstall `next-auth` and `@auth/prisma-adapter`.
4. Update `prisma/schema.prisma` (drop NextAuth models, UUID `User.id`). Run `prisma migrate reset` against the Supabase DB.
5. Add `src/lib/supabase/{server,browser,admin}.ts` and the `SupabaseProvider`.
6. Rewrite `src/server/api/trpc.ts` auth context with `getOrCreateUserProfile`.
7. Delete `src/server/auth/*` and `src/app/api/auth/[...nextauth]`.
8. Build `/login`, `/signup`, `/logout` routes.
9. Add `middleware.ts` with `updateSession`.
10. Replace `useSession()` / `auth()` call sites across the app.
11. Smoke test end-to-end (manual checklist above).
12. Remove NextAuth-related env vars.

## Open questions

None for this spec — all decisions captured above. Future work (OAuth, password reset, email confirmation, RLS) is deliberately excluded.
