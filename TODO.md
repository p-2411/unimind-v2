# UniMind — TODO

---

## Now (blocks other work)

| # | Task | Notes |
|---|------|-------|
| 1 | Flashcard view | One question per page, answer before next appears |

---

## Next (can start anytime)

| # | Task | Notes |
|---|------|-------|
| 2 | Wire real data into admin aggregate stats | Replace filler in `FILLER_DAILY`, `FILLER_TOP_TOPICS`, `FILLER_DIFFICULTY` with real DB queries |
| 3 | Live user counter | Badge only visible past 100 users |
| 4 | Chrome extension | Paywall interceptor |

---

## Later (post-launch)

| # | Task | Notes |
|---|------|-------|
| 5 | Assessment-weighted paywall course selection | Prioritise courses with nearest assessment date |
| 6 | Survey 4-grade self-rate UX | May simplify to binary on paywall surface if too much friction |
| 7 | `QuestionAttempt` cascade on Topic delete | Consider `Restrict` or `SetNull` to preserve audit log |

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

- [x] Admin page — real user/course/accuracy stats + gated by `admins` table
- [x] COMP1521 T2 2026 seeded — 8 topics, 37 subtopics, 333 questions (AI-generated, difficulty 1–3)
- [x] Week-based question filtering in `picker.ts` — only surfaces topics ≤ current week
- [x] Week override in settings — persists to `UserCourse.currentWeekOverride`, used by picker
- [x] Progress page — streak, level, XP, topic mastery (real data + AI overview, non-blocking Suspense)
- [x] Progress page topics grouped by course, with subtopic breakdown
- [x] Settings page — name, password, enroll/unenroll, delete account (all real)
- [x] XP, level, streak tracking wired into `question.answer`
- [x] Difficulty-weighted mastery EMA
- [x] Subtopic tracking — `subtopicId` on `QuestionAttempt`, subtopic breakdown on progress page
