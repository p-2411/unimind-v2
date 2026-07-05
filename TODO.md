# UniMind — TODO

---

## Pre-launch blockers

| # | Task | Notes |
|---|------|-------|
| 1 | Forgot password flow | Link on `/login` → Supabase password reset email |
| 2 | Extension question cooldown | Show question once every 30 mins per domain, not every reload |
| 3 | Extension: update `API_BASE` + `UNIMIND_URL` to prod domain before publishing | Currently hardcoded to `localhost:3000` |
| 4 | Deploy web app | Vercel or similar |

---

## Nice to have (post-launch or soon)

| # | Task | Notes |
|---|------|-------|
| 5 | Flashcard view in web app | One question per page, answer before next appears |
| 6 | Live user counter | Badge only visible past 100 users |
| 7 | Assessment-weighted paywall course selection | Prioritise courses with nearest assessment date |

---

## Later

| # | Task | Notes |
|---|------|-------|
| 8 | Survey 4-grade self-rate UX | May simplify to binary on paywall surface if too much friction |
| 9 | `QuestionAttempt` cascade on Topic delete | Consider `Restrict` or `SetNull` to preserve audit log |

---

## Scaling (revisit before launch)

Currently on Supabase **session pooler** (port 5432). Fine for now. Options when load grows:

- **Transaction pooler** (port 6543) — needs interactive `$transaction` removed from `question.answer`
- **Neon HTTP driver** — no persistent connections, great for serverless; no interactive transactions
- Set `connection_limit` in `DATABASE_URL` once concurrency is known
- Add slow-query logging before scaling

> Do NOT switch to port 6543 without first refactoring `question.answer`.

---

## Done

- [x] Chrome extension — blocks YouTube, Reddit, Instagram etc., requires study question to continue
- [x] Extension auth — auth-bridge.js syncs session from UniMind app via /api/extension/token
- [x] Extension API routes — /api/extension/question + /api/extension/answer (Bearer token auth, full FSRS pipeline)
- [x] Dashboard — courses covered + topics covered all-time tiles
- [x] Admin page — real user/course/accuracy stats, aggregate analytics, gated by `admins` table
- [x] COMP1521 T2 2026 seeded — 8 topics, 37 subtopics, 333 questions (AI-generated, difficulty 1–3)
- [x] Week-based question filtering in `picker.ts` — only surfaces topics ≤ current week
- [x] Week override in settings — persists to `UserCourse.currentWeekOverride`, used by picker
- [x] Progress page — streak, level, XP, topic mastery (real data + AI overview, non-blocking Suspense)
- [x] Progress page topics grouped by course, with subtopic breakdown
- [x] Settings page — name, password, enroll/unenroll, delete account (all real)
- [x] XP, level, streak tracking wired into `question.answer`
- [x] Difficulty-weighted mastery EMA
- [x] Subtopic tracking — `subtopicId` on `QuestionAttempt`, subtopic breakdown on progress page
