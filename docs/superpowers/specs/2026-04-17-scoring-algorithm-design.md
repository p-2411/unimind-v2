# Scoring Algorithm Design

**Date:** 2026-04-17
**Status:** Approved (pending implementation)
**Replaces:** `src/server/lib/scoring.ts` (current ±1 clamp)

## Goal

Replace the current single-number ±1 mastery score with a two-tier scoring system that supports both:

1. **Question scheduling** — pick the next question to surface (used by the in-app practice flow and the upcoming Chrome-extension paywall that blocks distracting websites behind a question).
2. **Mastery display** — a smooth, time-decaying topic-level number shown on the dashboard.

Pre-launch, no real users — clean schema migration, no backfill required.

## Architecture

Two independent scoring tracks, both updated on every answer through the single `question.answer` mutation.

### Track 1 — Scheduler (hidden)

Per-`(user, question)` FSRS state. Drives:

- The Chrome paywall (`question.nextForPaywall`)
- The in-app practice picker (`question.forMe`)

Both endpoints share the same picker query — single source of truth for "what should this user see next."

Implementation uses the [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) npm package (canonical TypeScript port of FSRS, maintained by the FSRS authors). We do not implement any FSRS math ourselves; we persist and rehydrate `Card` objects.

### Track 2 — Mastery (displayed)

Per-`UserTopic` exponential moving average with a 15-day half-life. Decays toward a neutral 50 when the user is idle. Replaces the existing `UserTopic.score` (Int) column. Only this number is shown to users.

### Audit log

Every answer also writes a `QuestionAttempt` row. Not used at runtime by either track (both are computed incrementally), but provides:

- Source-of-truth for recomputing mastery if the formula changes
- Per-user analytics
- Debug trail

## Data model changes

### New: `UserQuestion` (per-user × per-question scheduler state)

Mirrors the `ts-fsrs` `Card` type field-for-field so state round-trips through `f.next(card, ...)` with no field mapping.

```prisma
model UserQuestion {
  id              String    @id @default(cuid())
  userId          String    @db.Uuid
  questionId      String

  // FSRS Card state (1:1 with ts-fsrs Card type)
  due             DateTime
  stability       Float     @default(0)
  difficulty      Float     @default(0)
  elapsedDays     Int       @default(0)
  scheduledDays   Int       @default(0)
  learningSteps   Int       @default(0)
  reps            Int       @default(0)
  lapses          Int       @default(0)
  state           Int       @default(0)     // 0=New, 1=Learning, 2=Review, 3=Relearning
  lastReview      DateTime?

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  question        Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([userId, questionId])
  @@index([userId, due])
  @@map("user_questions")
}
```

The `(userId, due)` index is the hot path — it's what makes "give me my most-due card" cheap.

### New: `QuestionAttempt` (append-only audit log)

```prisma
model QuestionAttempt {
  id              String    @id @default(cuid())
  userId          String    @db.Uuid
  questionId      String
  topicId         String                    // denormalized for cheap topic-scoped queries
  isCorrect       Boolean
  rating          Int                       // 1=Again, 2=Hard, 3=Good, 4=Easy
  timeSpentMs     Int       @default(0)
  source          String                    // "paywall" | "in_app" — analytics only
  answeredAt      DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  question        Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  topic           Topic     @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@index([userId, answeredAt])
  @@index([userId, topicId, answeredAt])
  @@map("question_attempts")
}
```

Append-only. Never updated, never deleted (except via course unenrollment — see below).

### Modified: `UserTopic` (mastery EMA fields)

```prisma
model UserTopic {
  // existing fields kept: id, topicName, userId, topicId, correctCount, totalCount, lastAnsweredAt, updatedAt, relations

  masteryScore      Float    @default(50)
  masteryUpdatedAt  DateTime @default(now())
  // delete: score (Int)
}
```

Renames the semantics of the old `score` Int to `masteryScore` Float. Adds `masteryUpdatedAt` so time-decay can be computed at read time without scanning attempts.

### Modified: `UserCourse` (drop soft-delete fields)

```prisma
model UserCourse {
  // delete: archivedAt, isActive
}
```

Unenrollment is now a hard delete (see below), so the soft-delete fields are removed.

### Reverse relations

`User`, `Question`, `Topic` each gain reverse relations to `UserQuestion` and `QuestionAttempt`.

## Algorithms

### Scheduler — `applyAnswer`

Lives in `src/server/lib/scoring/scheduler.ts`. Thin adapter around `ts-fsrs`.

```ts
import { fsrs, createEmptyCard, type Card, type Rating } from "ts-fsrs";

const f = fsrs(); // default parameters: enable_fuzz=true, enable_short_term=false

export function applyAnswer({
  prevCard,
  rating,
  now,
}: {
  prevCard: Card | null;
  rating: Rating;
  now: Date;
}) {
  const card = prevCard ?? createEmptyCard(now);
  return f.next(card, now, rating); // { card, log }
}
```

The `Card` returned is persisted directly to `UserQuestion` (field names match).

### Picker query

Single source of truth for both `question.forMe` and `question.nextForPaywall`. Pulls global most-due across all enrolled courses (per design decision).

```sql
SELECT q.id
FROM questions q
JOIN topics t       ON t.id = q.topic_id
JOIN user_courses uc ON uc.course_id = t.course_id AND uc.user_id = $userId
LEFT JOIN user_questions uq ON uq.question_id = q.id AND uq.user_id = $userId
ORDER BY uq.due ASC NULLS FIRST   -- unseen → most-overdue → nearest-future-due
LIMIT 1;
```

`NULLS FIRST` ensures unseen questions (no `UserQuestion` row yet) bubble to the top. Among seen questions, smallest `due` wins. No special-case branching for cold start, queue empty, or unseen — single ranking rule covers all cases.

### Mastery — `applyMastery` (write) and `readMastery` (read)

Lives in `src/server/lib/scoring/mastery.ts`.

```ts
export const HALF_LIFE_DAYS = 15;
export const NEUTRAL_SCORE = 50;
export const ATTEMPT_WEIGHT = 0.15;

const MS_PER_DAY = 86_400_000;

export function applyMastery({
  prevScore,
  prevUpdatedAt,
  isCorrect,
  now,
}: {
  prevScore: number;
  prevUpdatedAt: Date;
  isCorrect: boolean;
  now: Date;
}) {
  const elapsedDays = (now.getTime() - prevUpdatedAt.getTime()) / MS_PER_DAY;
  const decay = Math.pow(0.5, elapsedDays / HALF_LIFE_DAYS);
  const decayed = decay * prevScore + (1 - decay) * NEUTRAL_SCORE;
  const outcome = isCorrect ? 100 : 0;
  const next = ATTEMPT_WEIGHT * outcome + (1 - ATTEMPT_WEIGHT) * decayed;
  return { masteryScore: next, masteryUpdatedAt: now };
}

export function readMastery({
  score,
  updatedAt,
  now,
}: {
  score: number;
  updatedAt: Date;
  now: Date;
}) {
  const elapsedDays = (now.getTime() - updatedAt.getTime()) / MS_PER_DAY;
  const decay = Math.pow(0.5, elapsedDays / HALF_LIFE_DAYS);
  return decay * score + (1 - decay) * NEUTRAL_SCORE;
}
```

`readMastery` is called by every consumer that surfaces the mastery number (e.g. `user.dashboardStats`) so the displayed value always reflects current decay, not the stale stored value.

**Tunable constants.**
- `HALF_LIFE_DAYS = 15` — an attempt 30 days ago counts ~25% as much as today's.
- `ATTEMPT_WEIGHT = 0.15` — slow-moving but responsive. ~5 consecutive same-outcome attempts moves the score ~55%.

Both live as `export const` for one-place tuning.

## Runtime flow

### `question.answer` mutation (modified)

Input gains:
- `rating: 1 | 2 | 3 | 4` — Again / Hard / Good / Easy. Both paywall and in-app collect this from the user after revealing the answer.
- `source: "paywall" | "in_app"` — analytics only, no algorithmic effect.

Inside the existing `$transaction` (kept on session pooler per `CLAUDE.md`):

1. Load `Question` and existing `UserQuestion` row (or null if unseen).
2. `const { card, log } = applyAnswer({ prevCard, rating, now })`.
3. Upsert `UserQuestion` with the new `Card` fields.
4. Append `QuestionAttempt` with `{ userId, questionId, topicId, isCorrect, rating, timeSpentMs, source, answeredAt: now }`.
5. `const next = applyMastery({ prevScore, prevUpdatedAt, isCorrect, now })`. Upsert `UserTopic` (`masteryScore`, `masteryUpdatedAt`, `correctCount`, `totalCount`, `lastAnsweredAt`).
6. Update `UserStats` (totals, streak, `lastActiveDate`) — unchanged from current.

Returns `{ isCorrect, answerIndex, explanation, userTopic, nextDue: card.due }`.

### `question.forMe` (rewritten)

Replaces the current "highest topic score" pick with the picker query above. Returns the question with the smallest `UserQuestion.due` (or unseen). Note: the current implementation orders by `score: desc` which picks the *highest* mastery topic — likely an existing bug and contrary to the `CLAUDE.md` description. Replaced wholesale.

### `question.nextForPaywall` (new)

Same picker query as `forMe`. Different response shape (no explanation field until after answering, fields scoped to what the extension needs). Implementation reuses a shared picker helper.

### `course.unenroll` (new)

Hard reset — wipes all per-user state for that course in one transaction:

```ts
await ctx.db.$transaction([
  ctx.db.questionAttempt.deleteMany({ where: { userId, topic: { courseId } } }),
  ctx.db.userQuestion.deleteMany({ where: { userId, question: { topic: { courseId } } } }),
  ctx.db.userTopic.deleteMany({ where: { userId, topic: { courseId } } }),
  ctx.db.userCourse.delete({ where: { userId_courseId: { userId, courseId } } }),
]);
```

Re-enrolling later starts the user completely fresh on that course — no carried-over FSRS state, no stale mastery, no attempt history.

## File layout

```
src/server/lib/scoring/
  scheduler.ts    — applyAnswer, picker query helper
  mastery.ts      — applyMastery, readMastery
  index.ts        — re-exports
```

Old `src/server/lib/scoring.ts` (the ±1 fn) is deleted. Imports updated.

## Edge cases

- **Cold start.** New `UserTopic` rows default to `masteryScore = 50, masteryUpdatedAt = now()` — matches `NEUTRAL_SCORE`, so first-attempt EMA is straightforward. Unseen questions have no `UserQuestion` row; picker treats them as highest priority via `NULLS FIRST`.
- **Cascade deletes.** All new tables use `onDelete: Cascade` on user/question/topic FKs. Question or topic cleanup automatically clears related per-user state.
- **Concurrency.** Same `$transaction` envelope as today, same session-pooler caveat. EMA's read-modify-write on `UserTopic` is safe inside the transaction (row lock). `UserStats` already uses atomic `increment`.
- **`UserCourse` cascade.** Cascade on `User` deletion still works. Course unenrollment is handled by explicit `course.unenroll` mutation, not by Prisma cascade (Prisma doesn't cascade `UserCourse` delete to `UserQuestion`/`UserTopic` since they're related via `Question`/`Topic`, not `UserCourse`).
- **ts-fsrs config.** Default parameters: `enable_fuzz: true` (so users don't see large batches all at once on the same day), `enable_short_term: false` (we don't need same-day re-learning steps). Both can be revisited if scheduling feels off.

## Migration

Single Prisma migration:

1. Drop `UserTopic.score` (Int).
2. Add `UserTopic.masteryScore` (Float, default 50), `UserTopic.masteryUpdatedAt` (DateTime, default now()).
3. Drop `UserCourse.archivedAt`, `UserCourse.isActive`.
4. Create `user_questions` table with all fields and indexes.
5. Create `question_attempts` table with all fields and indexes.

`prisma/seed.ts` updated to match (drop `score` from any seed, no need to seed `masteryScore` since defaults handle it).

Pre-launch: any existing dev/test data is reset on migrate.

## TODO follow-ups (added to repo `TODO.md`)

1. **Survey first batch of users** on whether the 4-grade self-rate prompt is too much friction. If feedback is bad on paywall specifically, revert *that* surface to binary (rating maps to `Again=1` or `Good=3`); keep in-app at 4-grade.
2. **Difficulty-weighted mastery EMA** — weight each attempt by question difficulty (current schema has `Question.difficulty: 1–3`). Useful only if difficulty ratings are reliable, which depends on content quality.
3. **Assessment-weighted paywall course selection** — instead of global most-due, pull more often from courses with closer assessment dates (uses existing `Assessment` model). Falls back to current global most-due if no assessments scheduled.

## Out of scope

- Tuning FSRS parameters from user data (FSRS supports per-user param optimization; we use defaults until we have enough data).
- Spaced-repetition for short-answer questions (planned product feature, but the scheduler will work the same way once short-answer questions are persisted in the same schema).
- Refactoring `question.answer` off interactive `$transaction` — tracked separately in `TODO.md` (database connection / scaling section).
