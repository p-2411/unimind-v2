# UniMind TODO

---

### 🔴 Pre-launch

- [x] Extension question cooldown — 30 min per domain stored in `chrome.storage.local`; only correct answers grant the cooldown
- [ ] Extension: swap `localhost:3000` → prod domain before publishing (`API_BASE` + `UNIMIND_URL` in content.js + auth-bridge.js)
- [ ] Deploy web app — Vercel or similar

---

### 🟡 Settings (incomplete)

- [x] Avatar upload — Supabase Storage `avatars` bucket, POST /api/avatar, updates `User.image`, shown in settings
- [ ] Notifications — daily study reminder (web push or email cron); toggle exists in settings but is a placeholder
- [x] Feedback forms — inline expanding forms in settings, stored in `Feedback` table, visible in admin page

---

### 🟡 Social

- [ ] Study groups — create/join via invite code; group DM chat + member leaderboard (level, XP, streak, mastery); no feed

---

### 🧠 Post-launch: take back the codebase

- [ ] Walk through every file end-to-end and build a full mental model of what's happening — auth flow, tRPC routers, FSRS scheduler, picker SQL, extension messaging, everything
- [ ] Identify parts built with Claude that aren't fully understood and refactor/rewrite them yourself

---

### 🎨 UI polish

- [ ] **Raccoon mascot** — graduation gown + cap, expressive (happy/smug/tired states); replaces the scholar mark as the logo
- [ ] **Rounder UI** — softer card corners, less sharp edges throughout; more approachable, less console-intimidating
- [ ] **Flashcard micro-interactions** — shake on wrong answer, pulse/burst on correct; instant emotional feedback
- [ ] **Level-up celebration** — modal or full-screen animation when XP threshold is hit; celebrate the win
- [ ] **Progress animations** — XP bar fill, mastery ring, streak counter; motion throughout the app not just on events
- [ ] **General animation pass** — page transitions, hover states, loading skeletons; polish builds trust

---

### ⚪ Nice to have

- [x] Extension popup — blocked sites list with toggle/add/remove, synced to DB and settings page
- [x] Extension logo — scholar mark PNG icons at 16/32/48/128px, transparent background
- [x] Dumb mode — YouTube (no home feed, no sidebar, no Shorts, no comments), Instagram (redirects home/explore/reels → DMs, hides posts/stories on other pages), Reddit/Twitter/TikTok/Facebook (feed removed)
- [x] Assessment-weighted paywall — urgency tiers (≤3d / ≤7d / ≤30d), ordered by nearest assessment date, then topic within assessment's week range
- [ ] Force read delay — disable answer choices for 2–3s after flashcard appears so user has to read the question before clicking

---

### 🏗️ Infrastructure (get off Supabase) — next session

- [ ] **DB → Neon** — swap `DATABASE_URL` to Neon serverless Postgres; no pausing, same Prisma setup. Do first.
- [ ] **Auth → Better Auth** — replace Supabase Auth entirely; email/password, Prisma adapter, DB-backed sessions on Neon, simpler extension token flow. Do in same session as Neon.

---

### ⚙️ Scaling (revisit before launch)

Currently on Supabase **session pooler** (port 5432). Fine for now.

- Switch to **transaction pooler** (port 6543) — needs interactive `$transaction` removed from `question.answer` first
- Or **Neon HTTP driver** — no persistent connections, serverless-friendly, no interactive transactions
- Set `connection_limit` in `DATABASE_URL` once concurrency is known
- Add slow-query logging before scaling

> Do NOT switch to port 6543 without first refactoring `question.answer`.

---

### ✅ Done

- [x] Flex week support — `flexWeeks Int[]` on `Course`; picker SQL and settings `courseWeek()` subtract passed flex weeks from calendar week (COMP1521 T2 2026: week 6)
- [x] Forgot password — `/forgot-password`, `/auth/confirm`, `/reset-password`; link on login + settings
- [x] Chrome extension — blocks YouTube, Reddit, Instagram etc., flashcard overlay to unlock
- [x] Extension auth — auth-bridge.js syncs session via `/api/extension/token` (same-origin)
- [x] Extension API routes — `/api/extension/question` + `/api/extension/answer` (Bearer token, full FSRS pipeline)
- [x] Dashboard tiles — courses covered + topics covered (all-time)
- [x] Admin page — real user/course/accuracy stats, gated by `admins` table
- [x] COMP1521 T2 2026 seeded — 8 topics, 37 subtopics, 333 questions
- [x] Week-based question filtering — only surfaces topics ≤ current week
- [x] Week override in settings — persists to `UserCourse.currentWeekOverride`
- [x] Progress page — streak, level, XP, topic mastery with subtopic breakdown
- [x] Settings page — name, password, enroll/unenroll, delete account
- [x] XP, level, streak tracking wired into `question.answer`
- [x] Difficulty-weighted mastery EMA
- [x] Subtopic tracking — `subtopicId` on `QuestionAttempt`, breakdown on progress page
