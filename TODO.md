# UniMind TODO

---

### 🔴 Pre-launch

- [x] Extension question cooldown — 30 min per domain stored in `chrome.storage.local`; only correct answers grant the cooldown
- [ ] Extension: swap `localhost:3000` → prod domain before publishing (`API_BASE` + `UNIMIND_URL` in content.js + auth-bridge.js)
- [ ] Deploy web app — Vercel or similar

---

### 🟡 Settings (incomplete)

- [ ] Avatar upload — needs Supabase Storage bucket, signed URL upload, store URL on `User` model
- [ ] Notifications — daily study reminder (web push or email cron); toggle exists in settings but is a placeholder
- [ ] Feedback forms — "report a bug", "suggest a question", "general feedback" all say coming soon; wire up to email / Linear / DB table

---

### 🟡 Social

- [ ] Friend connections — opt-in, send/accept requests, no public followers (Whoop-style)
- [ ] Compare stats with friends — head-to-head streak, level, XP, topic mastery on demand
- [ ] Study groups — named group (e.g. "COMP1521 T2"), members see each other's stats

---

### ⚪ Nice to have

- [ ] Live user counter — visible on landing page past 100 users
- [ ] Extension popup — make add/remove blocked sites more obvious (currently works but feels hidden)
- [ ] Dumb mode — hide YouTube recommendations/thumbnails, Reddit feed, Instagram explore; user picks duration (30m / 1h / 2h / ∞)
- [ ] Assessment-weighted course selection on paywall — prioritise courses with nearest assessment date

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
