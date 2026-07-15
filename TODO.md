# UniMind TODO

---

### 🔴 Pre-launch

- [ ] Extension: swap `localhost:3000` → prod domain before publishing (`API_BASE` + `UNIMIND_URL` in content.js + auth-bridge.js)
- [ ] Deploy web app — Vercel or similar

---

### 🟡 Social

- [ ] Study groups — create/join via invite code; group DM chat + member leaderboard (level, XP, streak, mastery); no feed

---

### 🧠 Post-launch: take back the codebase

- [ ] Walk through every file end-to-end and build a full mental model of what's happening — auth flow, tRPC routers, FSRS scheduler, picker SQL, extension messaging, everything
- [ ] Identify parts built with Claude that aren't fully understood and refactor/rewrite them yourself

---

### 🎨 UI polish

- [x] **Raccoon mascot (phase 1)** — SVG raccoon with 5 moods; placed in sidebar footer, post-answer, level-up modal, dashboard empty state, progress streak card
- [ ] **Raccoon mascot (phase 2 — Duolingo-style active presence)**
  - Proactive streak reminder on dashboard when user hasn't practiced today ("haven't seen you yet today…")
  - Post-answer raccoon takes up more real estate + says a short line ("nice one!" / "so close…") rather than tucked in a corner
  - Sidebar raccoon blinks/sways via CSS keyframes (idle animation)
  - Achievement toast — raccoon slides in from corner on milestones (streak, level, mastery thresholds)
  - Raccoon reacts to wrong-answer streaks (3 in a row → tired face + "want to try something easier?")
- [x] **Rounder UI** — softer card corners, less sharp edges throughout; more approachable, less console-intimidating
- [x] **Flashcard micro-interactions** — shake on wrong answer, pulse/burst on correct; instant emotional feedback
- [x] **Level-up celebration** — modal or full-screen animation when XP threshold is hit; celebrate the win
- [ ] **Progress animations** — XP bar fill, mastery ring, streak counter; motion throughout the app not just on events
- [ ] **General animation pass** — page transitions, hover states, loading skeletons; polish builds trust

---

### ⚪ Nice to have

- [x] Assessment-weighted paywall — urgency tiers (≤3d / ≤7d / ≤30d), ordered by nearest assessment date, then topic within assessment's week range
- [x] Force read delay — disable answer choices for 2–3s after flashcard appears so user has to read the question before clicking
- [ ] **4th difficulty tier (LeetCode-hard)** — `difficulty = 4` questions; multi-step algorithm/proof style; distinct UI badge ("hard" in red/magenta); harder FSRS rating weight; seed a handful per topic
- [x] **"I don't know" button** — replaces guessing; sits alongside the answer choices; pressing it skips scoring (no penalty, no FSRS update) and opens a centre-screen modal showing the correct answer + explanation so the user actually learns before moving on; modal has a "Got it" button to continue

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
