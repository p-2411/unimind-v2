# UniMind — TODO

---

## Now (blocks other work)

| # | Task | Notes |
|---|------|-------|
| 1 | Seed COMP1511 real data | Topics, subtopics, week numbers, course start date |
| 2 | Generate question bank | AI-prompted per subtopic, difficulty 1–3 |
| 3 | Wire week-based filtering into `picker.ts` | Blocked until seed done |

---

## Next (can start anytime)

| # | Task | Notes |
|---|------|-------|
| 4 | Admin page | User count, activity stats, enrolled courses breakdown |
| 5 | Flashcard view | One question per page, answer before next appears |
| 6 | Live user counter | Badge only visible past 100 users |
| 7 | Anonymised analytics endpoints | Aggregate `QuestionAttempt` / `UserTopic` / `UserStats` |
| 8 | Chrome extension | Paywall interceptor |

---

## Later (post-launch)

| # | Task | Notes |
|---|------|-------|
| 9 | Assessment-weighted paywall course selection | Prioritise courses with nearest assessment date |
| 10 | Survey 4-grade self-rate UX | May simplify to binary on paywall surface if too much friction |
| 11 | `QuestionAttempt` cascade on Topic delete | Consider `Restrict` or `SetNull` to preserve audit log |

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

- [x] Progress page — streak, level, XP, topic mastery (real data + AI overview)
- [x] Settings page — name, password, enroll/unenroll, delete account (all real)
- [x] XP, level, streak tracking wired into `question.answer`
- [x] Difficulty-weighted mastery EMA
- [x] Subtopic tracking — `subtopicId` on `QuestionAttempt`, subtopic breakdown on progress page
- [x] Topic mastery grouped by course on progress page
