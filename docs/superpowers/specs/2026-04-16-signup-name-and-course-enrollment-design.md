---
name: Signup Name + Course Enrollment Design
description: Collect full name at signup and enroll users in at least one course via a post-signup onboarding page
status: draft
---

# Signup Full Name + Course Enrollment — Design Spec

## Goal

Extend signup to capture the user's full name and require enrollment in at least one course before the user reaches the dashboard. Signup remains a short form; course selection happens on a dedicated onboarding page after account creation.

## Scope

**In scope**
- Add required `fullName` field to `/signup` page.
- Persist full name into `User.name` via the existing `getOrCreateUserProfile` upsert path, sourced from Supabase `user_metadata.full_name`.
- New `/onboarding/courses` page presenting a grid of course cards for multi-select.
- New tRPC procedures: `course.list` (query) and `user.enrollCourses` (mutation).
- Server-side onboarding gate in the dashboard layout that redirects users with zero enrollments to `/onboarding/courses`.
- Reverse gate on `/onboarding/courses` that redirects users who already have enrollments back to `/`.

**Out of scope**
- Editing profile name after signup (future settings page).
- Unenrolling from courses, archiving, or course management UI.
- Course search/filter (catalog is small; plain grid is sufficient).
- Skipping onboarding — a user must pick at least one course.
- OAuth signup (email/password only, per existing Supabase auth setup).

## Architecture

### Name capture and persistence

- Signup form collects `fullName`, `email`, `password`. All three required.
- On submit, client calls:
  ```ts
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  ```
- Supabase stores `full_name` in `auth.users.raw_user_meta_data`.
- `getOrCreateUserProfile(id, email, fullName?)` in `src/server/api/trpc.ts` is extended: when creating a new `public.users` row, it reads `user.user_metadata.full_name` and writes it to `User.name`. On existing rows it does **not** overwrite `name` (so future in-app name edits are preserved).

### Onboarding gate

- The dashboard layout (server component) calls a lightweight `userCourse` count via Prisma for `ctx.session.user.id`. If `count === 0`, `redirect('/onboarding/courses')`.
- `/onboarding/courses` page does the inverse: if count `> 0`, `redirect('/')`.
- No middleware changes — the gate runs only when the user hits a protected page or the onboarding page. This keeps middleware free of DB calls.

### Course selection UI

- Server component on `/onboarding/courses` fetches all courses via `api.course.list()`.
- Passes courses to a client component that renders a grid of cards (name, description, color/icon). Local state holds a `Set<string>` of selected `courseId`s.
- "Continue" button is disabled until `selected.size >= 1`. On click, calls `api.user.enrollCourses.mutate({ courseIds })`, then `router.push('/')`.

### tRPC procedures

- `courseRouter.list` — protected query, returns `prisma.course.findMany({ orderBy: { name: 'asc' } })`.
- `userRouter.enrollCourses` — protected mutation:
  - Input: `z.object({ courseIds: z.array(z.string()).min(1) })`.
  - Executes `prisma.userCourse.createMany({ data: courseIds.map(id => ({ userId, courseId: id })), skipDuplicates: true })`.
  - Returns `{ count }`.

## File-by-file plan

**Add**
- `src/app/onboarding/courses/page.tsx` — server component: auth guard, reverse onboarding gate, fetches courses, renders client picker.
- `src/app/onboarding/courses/course-picker.tsx` — client component: grid of cards, selection state, submit mutation.
- `src/server/api/routers/course.ts` — new router with `list` query (if one does not already exist).

**Modify**
- `src/app/signup/page.tsx` — add `fullName` state + input field; pass into `signUp` options metadata; redirect to `/onboarding/courses` on success.
- `src/server/api/trpc.ts` — `getOrCreateUserProfile` reads `full_name` from Supabase user metadata and writes on create only.
- `src/server/api/routers/user.ts` — add `enrollCourses` mutation.
- `src/server/api/root.ts` — register `courseRouter` if newly added.
- Dashboard layout (`src/app/dashboard/layout.tsx` or equivalent root-protected layout) — add onboarding gate redirect when `userCourse` count is 0.

## Data flow (happy path)

1. User visits `/signup`, enters full name, email, password.
2. Client calls `supabase.auth.signUp` with `full_name` in `options.data`. Supabase creates `auth.users` row, stores metadata, returns a session (confirmations off).
3. Client redirects to `/onboarding/courses`.
4. First authenticated request triggers `getOrCreateUserProfile`, which creates `public.users` with `id`, `email`, `name` (from metadata).
5. `/onboarding/courses` server component sees 0 enrollments, renders course grid.
6. User selects ≥1 course, clicks "Continue". `enrollCourses` mutation inserts `UserCourse` rows.
7. Client redirects to `/`. Dashboard layout sees enrollments exist, renders dashboard.

## Error handling

- **Signup failure (duplicate email, weak password, etc.):** Supabase error displayed inline on the form (existing behavior).
- **Empty name:** HTML `required` attribute + trimmed non-empty validation client-side.
- **Empty course selection:** Submit button disabled; server also enforces via zod `.min(1)`.
- **enrollCourses failure:** inline error on the onboarding page; user stays on the page and can retry.
- **Race / duplicate enrollments:** `createMany({ skipDuplicates: true })` keyed by the existing `@@unique([userId, courseId])` makes the mutation idempotent.
- **User closes tab after signup before picking courses:** they remain signed in with 0 enrollments. Next visit to any protected page → dashboard layout gate redirects them to `/onboarding/courses`. No resume logic needed.

## Testing

- Manual: sign up with name/email/password → redirected to `/onboarding/courses` → name saved in `public.users` (DB check).
- Manual: select 2 courses → continue → land on `/` with dashboard rendered and 2 `UserCourse` rows present.
- Manual: visit `/onboarding/courses` after enrollments exist → redirected to `/`.
- Manual: visit `/dashboard` (or `/`) with no enrollments → redirected to `/onboarding/courses`.
- Manual: try continuing with 0 selected → button disabled; tamper via devtools and submit empty array → server rejects with zod error.

## Open questions

None — all decisions captured above.
