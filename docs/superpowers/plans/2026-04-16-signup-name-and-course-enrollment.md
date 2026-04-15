# Signup Full Name + Course Enrollment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect full name at signup and require users to enroll in ≥1 course before reaching the dashboard via a new onboarding page.

**Architecture:** `/signup` collects full name and passes it into Supabase `user_metadata`. tRPC context writes it to `User.name` on first-create. New `/onboarding/courses` page shows a card-grid picker; a new `user.enrollCourses` mutation inserts `UserCourse` rows. The root `/` page gates on zero enrollments and redirects to onboarding.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript, tRPC, Prisma, Supabase Auth, Tailwind.

Spec: `docs/superpowers/specs/2026-04-16-signup-name-and-course-enrollment-design.md`

---

## File structure

- Modify `unimind/src/app/signup/page.tsx` — add required full name input, pass metadata, redirect to `/onboarding/courses`.
- Modify `unimind/src/server/api/trpc.ts` — extend user creation to persist `full_name` from Supabase metadata.
- Modify `unimind/src/server/api/routers/course.ts` — add `list` query.
- Modify `unimind/src/server/api/routers/user.ts` — add `enrollCourses` mutation.
- Create `unimind/src/app/onboarding/courses/page.tsx` — server component: auth + reverse-gate, fetches courses.
- Create `unimind/src/app/onboarding/courses/course-picker.tsx` — client component: card grid, submit.
- Modify `unimind/src/app/page.tsx` — add forward-gate: if session and 0 enrollments → redirect to `/onboarding/courses`.

All code paths below are relative to repo root. The Next app lives under `unimind/`.

---

### Task 1: Persist `full_name` from Supabase metadata into `User.name`

**Files:**
- Modify: `unimind/src/server/api/trpc.ts` (lines 29-55)

- [ ] **Step 1: Update `createTRPCContext` to read `full_name` from metadata and write `name` on create**

Replace the body of `createTRPCContext` (lines 29–55) with:

```ts
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let session: { user: { id: string; email: string } } | null = null;

  if (user) {
    const existing = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (!existing) {
      const fullName =
        typeof user.user_metadata?.full_name === "string"
          ? (user.user_metadata.full_name as string).trim() || null
          : null;
      await db.user.create({
        data: {
          id: user.id,
          email: user.email ?? "",
          name: fullName,
        },
      });
    }
    session = { user: { id: user.id, email: user.email ?? "" } };
  }

  return {
    db,
    session,
    ...opts,
  };
};
```

Rationale: only writes `name` on initial create so future in-app name edits aren't clobbered.

- [ ] **Step 2: Type-check**

Run from `unimind/`:
```bash
cd unimind && pnpm exec tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/server/api/trpc.ts
git commit -m "feat(auth): persist full_name from supabase metadata on user create"
```

---

### Task 2: Add `course.list` tRPC query

**Files:**
- Modify: `unimind/src/server/api/routers/course.ts`

- [ ] **Step 1: Add `list` protected query**

Replace the file with:

```ts
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const courseRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.course.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
      },
    }),
  ),

  enroll: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.userCourse.upsert({
        where: {
          userId_courseId: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        },
        create: { userId: ctx.session.user.id, courseId: input.courseId },
        update: { isActive: true, archivedAt: null },
      }),
    ),

  listMine: protectedProcedure.query(({ ctx }) =>
    ctx.db.userCourse.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
    }),
  ),
});
```

- [ ] **Step 2: Type-check**

```bash
cd unimind && pnpm exec tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/server/api/routers/course.ts
git commit -m "feat(course): add list query for course catalog"
```

---

### Task 3: Add `user.enrollCourses` mutation

**Files:**
- Modify: `unimind/src/server/api/routers/user.ts`

- [ ] **Step 1: Add import for `z` and the mutation**

At the top of the file, change the imports to:

```ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
```

Inside the `createTRPCRouter({ ... })` object, after the existing `dashboardStats` query, add:

```ts
  enrollCourses: protectedProcedure
    .input(z.object({ courseIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.userCourse.createMany({
        data: input.courseIds.map((courseId) => ({
          userId: ctx.session.user.id,
          courseId,
        })),
        skipDuplicates: true,
      });
      return { count: result.count };
    }),
```

- [ ] **Step 2: Type-check**

```bash
cd unimind && pnpm exec tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/server/api/routers/user.ts
git commit -m "feat(user): add enrollCourses mutation for onboarding"
```

---

### Task 4: Update `/signup` to collect full name

**Files:**
- Modify: `unimind/src/app/signup/page.tsx`

- [ ] **Step 1: Replace the page with the updated version**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabase } from "~/components/providers/supabase-provider";

export default function SignupPage() {
  const { supabase } = useSupabase();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: trimmedName } },
    });

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/onboarding/courses";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-bold">Sign up</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          required
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd unimind && pnpm exec tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/app/signup/page.tsx
git commit -m "feat(signup): collect full name and redirect to onboarding"
```

---

### Task 5: Create onboarding course picker (client component)

**Files:**
- Create: `unimind/src/app/onboarding/courses/course-picker.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Course = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
};

export function CoursePicker({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const enroll = api.user.enrollCourses.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onContinue() {
    if (selected.size < 1) return;
    setError(null);
    enroll.mutate({ courseIds: Array.from(selected) });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((course) => {
          const isSelected = selected.has(course.id);
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => toggle(course.id)}
              className={`rounded-lg border p-4 text-left transition ${
                isSelected
                  ? "border-black bg-black/5 ring-2 ring-black"
                  : "border-gray-200 hover:border-gray-400"
              }`}
              style={
                isSelected && course.color
                  ? { borderColor: course.color }
                  : undefined
              }
            >
              <div className="font-medium">{course.name}</div>
              {course.description && (
                <div className="mt-1 text-sm text-gray-600">
                  {course.description}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onContinue}
        disabled={selected.size < 1 || enroll.isPending}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {enroll.isPending
          ? "Enrolling…"
          : `Continue${selected.size ? ` (${selected.size})` : ""}`}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add unimind/src/app/onboarding/courses/course-picker.tsx
git commit -m "feat(onboarding): add course picker client component"
```

---

### Task 6: Create onboarding server page with reverse gate

**Files:**
- Create: `unimind/src/app/onboarding/courses/page.tsx`

- [ ] **Step 1: Write the server component**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { CoursePicker } from "./course-picker";

export default async function OnboardingCoursesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: user.id, isActive: true },
  });
  if (enrollmentCount > 0) redirect("/");

  const courses = await api.course.list();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Pick your courses</h1>
      <p className="mb-6 text-sm text-gray-600">
        Select at least one course to get started.
      </p>
      <CoursePicker courses={courses} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd unimind && pnpm exec tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/app/onboarding/courses/page.tsx
git commit -m "feat(onboarding): add courses page with reverse gate"
```

---

### Task 7: Add forward onboarding gate to root page

**Files:**
- Modify: `unimind/src/app/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";
import { AppSidebar } from "~/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "~/components/ui/sidebar";

import Dashboard from "./dashboard/page";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: user.id, isActive: true },
  });
  if (enrollmentCount === 0) redirect("/onboarding/courses");

  return (
    <HydrateClient>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd unimind && pnpm exec tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/app/page.tsx
git commit -m "feat(dashboard): gate root page on course enrollment"
```

---

### Task 8: Manual end-to-end verification

- [ ] **Step 1: Run dev server**

```bash
cd unimind && pnpm dev
```

- [ ] **Step 2: Happy path**

1. Visit `/signup`. Enter full name, email, password. Submit.
2. Expect redirect to `/onboarding/courses`.
3. In DB (Supabase SQL editor or `pnpm prisma studio`), confirm `public.users` row has `name` = entered full name.
4. Select 2 courses. Click Continue.
5. Expect redirect to `/` with dashboard rendered.
6. Confirm 2 rows in `user_courses` for the user.

- [ ] **Step 3: Reverse gate**

1. While signed in with enrollments, visit `/onboarding/courses` directly.
2. Expect redirect to `/`.

- [ ] **Step 4: Forward gate**

1. In DB, delete the user's `user_courses` rows (or use a fresh account).
2. Visit `/`. Expect redirect to `/onboarding/courses`.

- [ ] **Step 5: Validation**

1. On `/onboarding/courses`, with 0 selected, confirm Continue button is disabled.
2. On `/signup`, leaving full name empty is blocked by HTML `required`; whitespace-only is blocked by trim check showing the inline error.

- [ ] **Step 6: Final commit (if any lint/format fixes needed)**

```bash
cd unimind && pnpm exec eslint . --fix || true
git status
```
If there are changes, commit:
```bash
git add -A
git commit -m "chore: lint fixes for signup onboarding"
```

---

## Self-review notes

- Spec coverage: signup name capture (Tasks 1, 4), onboarding page (Tasks 5, 6), `course.list` (Task 2), `user.enrollCourses` (Task 3), forward gate (Task 7), reverse gate (Task 6), empty-selection validation (Task 5 client + Task 3 server zod `.min(1)`), verification (Task 8). All sections covered.
- No placeholders: every code block is concrete.
- Type consistency: `CoursePicker` consumes the exact shape returned by `course.list`'s `select` clause.
