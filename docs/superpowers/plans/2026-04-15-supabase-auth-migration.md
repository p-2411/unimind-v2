# Supabase Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace NextAuth with Supabase Auth (email/password, no confirmation) and host Postgres on Supabase while keeping Prisma + tRPC.

**Architecture:** Supabase owns `auth.users` (credentials + sessions via JWT cookies). Prisma's `User` becomes a profile table in `public.users` keyed by UUID = `auth.users.id`. tRPC context reads the Supabase session via `@supabase/ssr`, calls `getUser()` for authoritative verification, lazy-upserts the profile row, and sets `ctx.session.user.id`. No RLS — Data API is disabled; all reads/writes still flow through tRPC. Middleware uses `getClaims()` for fast per-request token refresh.

**Tech Stack:** Next.js 15 (App Router), tRPC v11, Prisma, `@supabase/supabase-js`, `@supabase/ssr`, Supabase Postgres, TypeScript.

**Working directory:** All paths below are relative to `unimind/` (the Next.js app root) unless they start with `docs/`.

**Spec:** `docs/superpowers/specs/2026-04-15-supabase-auth-migration-design.md`

---

## Preflight (manual, user-performed)

These must be complete before Task 1. They're user actions, not coding tasks:

- [ ] Supabase project created. Email provider enabled. "Confirm email" disabled.
- [ ] Data API disabled in Project Settings → Data API.
- [ ] `.env` contains valid, non-rotated:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`)
  - `SUPABASE_SECRET_KEY` (`sb_secret_...`)
  - `DATABASE_URL` = Transaction Pooler URL (port 6543, with `?pgbouncer=true&connection_limit=1`)
  - `DIRECT_URL` = Session Pooler or Direct URL (port 5432)
- [ ] Old leaked `sb_secret_*` key rotated and old DB password reset (if they were shared in chat).

---

## Task 1: Install Supabase SDKs, remove NextAuth packages

**Files:**
- Modify: `unimind/package.json`

- [ ] **Step 1: Install Supabase packages**

Run from `unimind/`:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Uninstall NextAuth packages**

```bash
npm uninstall next-auth @auth/prisma-adapter
```

- [ ] **Step 3: Verify `package.json`**

Expected: `dependencies` contains `@supabase/supabase-js` and `@supabase/ssr`; no `next-auth` or `@auth/prisma-adapter`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap next-auth packages for @supabase/ssr + supabase-js"
```

---

## Task 2: Update env schema (`src/env.js`)

**Files:**
- Modify: `unimind/src/env.js`

- [ ] **Step 1: Replace the file contents**

Write to `unimind/src/env.js`:

```js
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

- [ ] **Step 2: Remove old vars from `.env`**

Delete these lines from `unimind/.env`:
- `AUTH_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- The `# Database password: ...` comment

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: passes (any `next-auth` errors are fine — we fix them later).

- [ ] **Step 4: Commit**

```bash
git add src/env.js .env
git commit -m "chore: replace NextAuth env vars with Supabase equivalents"
```

---

## Task 3: Update Prisma schema — drop NextAuth models, switch User to UUID

**Files:**
- Modify: `unimind/prisma/schema.prisma`

- [ ] **Step 1: Add `directUrl` to datasource block**

Replace the `datasource db` block with:

```prisma
datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 2: Replace the `User` model**

Replace the existing `User` model with:

```prisma
model User {
  id        String   @id @db.Uuid
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  courses     Course[]
  assessments Assessment[]
  stats       UserStats?
  topics      UserTopic[]

  @@map("users")
}
```

(Removed: `password`, `emailVerified`, `accounts`, `sessions` relations. Changed `id` to UUID with no default — ID comes from `auth.users.id`.)

- [ ] **Step 3: Delete NextAuth models**

Delete the entire `Account`, `Session`, and `VerificationToken` models from the file (the "AUTHENTICATION" section at the bottom).

- [ ] **Step 4: Reset DB + generate client**

```bash
npx prisma migrate reset --force
npx prisma generate
```

Expected: `migrate reset` wipes the Supabase DB and applies a fresh migration. `generate` regenerates the client in `unimind/generated/prisma`.

- [ ] **Step 5: Verify schema in Supabase**

In the Supabase dashboard → Table Editor, confirm `public.users` exists with `id uuid` and no NextAuth tables (`accounts`, `sessions`, `verification_tokens`) are present.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): migrate schema to Supabase, drop NextAuth models, UUID user ids"
```

---

## Task 4: Create Supabase browser client

**Files:**
- Create: `unimind/src/lib/supabase/browser.ts`

- [ ] **Step 1: Create the file**

Write to `unimind/src/lib/supabase/browser.ts`:

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "~/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/browser.ts
git commit -m "feat(auth): add Supabase browser client factory"
```

---

## Task 5: Create Supabase server client

**Files:**
- Create: `unimind/src/lib/supabase/server.ts`

- [ ] **Step 1: Create the file**

Write to `unimind/src/lib/supabase/server.ts`:

```ts
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "~/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `cookies().set` throws in Server Components. Safe to ignore —
            // the middleware refresh handles session persistence in that case.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/server.ts
git commit -m "feat(auth): add Supabase server client factory"
```

---

## Task 6: Add Next.js middleware for session refresh

**Files:**
- Create: `unimind/src/middleware.ts`

- [ ] **Step 1: Create middleware**

Write to `unimind/src/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "~/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not place any code between createServerClient and getClaims().
  // A race here can silently log users out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors. Ignore unrelated `next-auth` errors still present.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add Supabase middleware for session refresh + auth gating"
```

---

## Task 7: Rewrite tRPC context to use Supabase

**Files:**
- Modify: `unimind/src/server/api/trpc.ts`

- [ ] **Step 1: Replace imports + context**

Edit `unimind/src/server/api/trpc.ts`. Replace this block:

```ts
import { auth } from "~/server/auth";
import { db } from "~/server/db";
```

with:

```ts
import { db } from "~/server/db";
import { createSupabaseServerClient } from "~/lib/supabase/server";
```

Then replace the `createTRPCContext` function with:

```ts
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let session: { user: { id: string; email: string } } | null = null;

  if (user) {
    // Lazy upsert profile row so public.users.id stays in sync with auth.users.id
    await db.user.upsert({
      where: { id: user.id },
      update: { email: user.email ?? "" },
      create: { id: user.id, email: user.email ?? "" },
    });
    session = { user: { id: user.id, email: user.email ?? "" } };
  }

  return {
    db,
    session,
    ...opts,
  };
};
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: `src/server/api/trpc.ts` clean. Errors may remain in files importing `~/server/auth` — handled in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/trpc.ts
git commit -m "feat(auth): rewrite tRPC context to use Supabase session + lazy profile upsert"
```

---

## Task 8: Delete NextAuth code

**Files:**
- Delete: `unimind/src/server/auth/` (entire directory)
- Delete: `unimind/src/app/api/auth/` (entire directory)

- [ ] **Step 1: Remove directories**

```bash
rm -rf src/server/auth
rm -rf src/app/api/auth
```

- [ ] **Step 2: Verify no references remain**

```bash
grep -rn "from \"~/server/auth\"\|from \"next-auth" src/ 2>/dev/null || echo "clean"
```
Expected output: `clean` (or references only in `src/app/page.tsx`, which Task 9 fixes).

- [ ] **Step 3: Commit**

```bash
git add -A src/server/auth src/app/api/auth
git commit -m "chore(auth): delete NextAuth config and API route"
```

---

## Task 9: Fix remaining `auth()` call sites

**Files:**
- Modify: `unimind/src/app/page.tsx`

- [ ] **Step 1: Remove unused auth import**

Edit `unimind/src/app/page.tsx`. Remove these two lines:

```ts
import { auth } from "~/server/auth";
```

and

```ts
  const session = await auth();
```

(Both are unused — `session` is declared but never read.)

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "chore: remove unused NextAuth call in home page"
```

---

## Task 10: SupabaseProvider + `useUser` hook

**Files:**
- Create: `unimind/src/components/providers/supabase-provider.tsx`

- [ ] **Step 1: Create provider**

Write to `unimind/src/components/providers/supabase-provider.tsx`:

```tsx
"use client";

import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase/browser";

type SupabaseContextValue = {
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  user: User | null;
  isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        router.refresh();
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <SupabaseContext.Provider value={{ supabase, user, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used inside SupabaseProvider");
  return ctx;
}

export function useUser() {
  const { user, isLoading } = useSupabase();
  return { user, isLoading };
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/providers/supabase-provider.tsx
git commit -m "feat(auth): add SupabaseProvider + useUser hook"
```

---

## Task 11: Wrap root layout in SupabaseProvider

**Files:**
- Modify: `unimind/src/app/layout.tsx`

- [ ] **Step 1: Update layout**

Replace `unimind/src/app/layout.tsx` with:

```tsx
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { SupabaseProvider } from "~/components/providers/supabase-provider";

export const metadata: Metadata = {
  title: "Create T3 App",
  description: "Generated by create-t3-app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <SupabaseProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(auth): wrap app in SupabaseProvider"
```

---

## Task 12: Login page

**Files:**
- Create: `unimind/src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

Write to `unimind/src/app/login/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase } from "~/components/providers/supabase-provider";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
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
          placeholder="Password"
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
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(auth): add /login page"
```

---

## Task 13: Signup page

**Files:**
- Create: `unimind/src/app/signup/page.tsx`

- [ ] **Step 1: Create signup page**

Write to `unimind/src/app/signup/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase } from "~/components/providers/supabase-provider";

export default function SignupPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    // Confirmations disabled: user is signed in immediately.
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-bold">Sign up</h1>
      <form onSubmit={onSubmit} className="space-y-4">
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

- [ ] **Step 2: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat(auth): add /signup page"
```

---

## Task 14: Logout route

**Files:**
- Create: `unimind/src/app/auth/logout/route.ts`

- [ ] **Step 1: Create route handler**

Write to `unimind/src/app/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/logout/route.ts
git commit -m "feat(auth): add POST /auth/logout route"
```

---

## Task 15: End-to-end smoke test

**Files:** (none — manual verification)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Unauthenticated redirect**

Visit `http://localhost:3000/`. Expected: redirect to `/login`.

- [ ] **Step 3: Sign up flow**

Go to `/signup`, enter a fresh email + password (≥6 chars), submit. Expected: redirected to `/`, app loads.

- [ ] **Step 4: Verify Supabase `auth.users`**

In Supabase dashboard → Authentication → Users: the new email appears.

- [ ] **Step 5: Verify Prisma `public.users`**

In Supabase dashboard → Table Editor → `users`: a row exists with the same UUID as the auth user and the correct email.

- [ ] **Step 6: Session persistence**

Refresh the page. Expected: still logged in.

- [ ] **Step 7: Sign in with wrong password**

Log out (call `POST /auth/logout` via a form or browser devtools). Then visit `/login` and try the same email with a bad password. Expected: inline "Invalid login credentials" error.

- [ ] **Step 8: Protected tRPC call**

Without a session, open the browser devtools and call any protected procedure. Expected: `UNAUTHORIZED` error.

- [ ] **Step 9: Final commit (if manual edits were needed during testing)**

If the smoke test surfaces fixes, commit them:

```bash
git add -A
git commit -m "fix(auth): smoke-test adjustments"
```

---

## Task 16: Clean up

**Files:**
- Modify: `unimind/.env.example` (if it exists)

- [ ] **Step 1: Sync `.env.example` (if present)**

If `unimind/.env.example` exists, replace its contents with:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SECRET_KEY=""

DATABASE_URL=""
DIRECT_URL=""
```

If it doesn't exist, skip.

- [ ] **Step 2: Typecheck + build**

```bash
npx tsc --noEmit
npm run build
```
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: sync env.example with Supabase vars"
```

---

## Plan complete

Spec coverage verified: every section of the design doc (architecture, file list, data flow, error handling, testing, migration steps) maps to one or more tasks above.
