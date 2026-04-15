# Data Schema Design — Unimind v2

**Date:** 2026-04-15
**Status:** Draft — pending user review
**Scope:** Prisma schema for courses, topics, subtopics, questions, and per-user progress.

## Goal

Define the persistent data model that supports:

- Users enrolling in **courses**.
- Courses composed of **topics**, topics composed of **subtopics** (static reference content, shared by all users).
- A global pool of **questions** tagged by topic + subtopic.
- Per-user **topic-level** progress (score + counters), updated every time a user answers a question.
- No per-user question attempt history.

## Non-Goals

- Per-user subtopic scoring (subtopics are navigation/reference only).
- Per-user question copies or personalized question generation.
- Spaced-repetition / SM-2 / Elo — the schema must *allow* these to be added later, but picking the algorithm is out of scope.
- Changes to `Assessment` model.

## Entity Model

### Static content (shared across all users)

**Course**
- `id`, `name`, `description?`, `color?`, `icon?`, timestamps.
- Relations: `topics Topic[]`, `userCourses UserCourse[]`, `assessments Assessment[]`.

**Topic**
- `id`, `name`, `description?`, `courseId`, timestamps.
- Relations: `course`, `subtopics Subtopic[]`, `questions Question[]`, `userTopics UserTopic[]`.
- Index: `courseId`.

**Subtopic** *(new — uncomment and adjust the existing stub)*
- `id`, `name`, `description?`, `topicId`, timestamps.
- Relations: `topic`, `questions Question[]`.
- **No per-user relation.** Subtopics are pure reference structure.
- Index: `topicId`.

**Question**
- `id`, `question`, `choices String[]`, `answerIndex`, `explanation?`, `difficulty` (1–3), timestamps.
- `topicId` (required) — primary categorization.
- `subtopicId` (required) — finer-grained tag, for display/filtering only.
- Relations: `topic`, `subtopic`.
- Indexes: `topicId`, `subtopicId`, `difficulty`.
- **Global pool** — same question rows serve every user.

### Per-user state

**UserCourse** *(new — replaces the implicit `User ↔ Course` M2M)*
- `id`, `userId`, `courseId`, `enrolledAt`, `archivedAt?`, `isActive Boolean @default(true)`.
- `@@unique([userId, courseId])`, index on `userId`.
- Purpose: carry enrollment metadata (enrolled-at date, archive/pause) without losing the user's existing `UserTopic` scores if they leave a course.

**UserTopic** *(existing — extend with counters)*
- `id`, `userId`, `topicId`, `topicName` (denormalized, existing).
- `score Float @default(0)` — canonical per-user mastery signal; interpretation owned by app layer.
- `correctCount Int @default(0)` *(new)*
- `totalCount Int @default(0)` *(new)*
- `lastAnsweredAt DateTime?` *(new)*
- `updatedAt`.
- `@@unique([userId, topicId])`, index on `userId`.
- Counters are stored so the app can later switch between rolling accuracy / EMA / Elo without a migration.

**UserStats** — unchanged. Global gamification counters (xp, level, streak, totals).

**User** — unchanged structurally; the `courses Course[]` implicit M2M is replaced by `userCourses UserCourse[]`.

### Untouched

- `Assessment` keeps its implicit `users User[]` M2M. Revisit if enrollment metadata is ever needed there.
- `UserStats` unchanged.

## Data Flow — Answering a Question

Handled in app layer (tRPC router), one database transaction:

1. Load `Question` by id → obtain `topicId`.
2. Upsert `UserTopic(userId, topicId)`:
   - `totalCount += 1`
   - `correctCount += isCorrect ? 1 : 0`
   - `score = <app-chosen formula>(prev score, correctCount, totalCount, isCorrect)`
   - `lastAnsweredAt = now()`
3. Update `UserStats`: `totalQuestionsAnswered += 1`, `totalCorrectAnswers += isCorrect ? 1 : 0`, `totalTimeSpent += elapsed`, streak logic, `lastActiveDate = today`.

No `QuestionAttempt` row is written.

## Enrollment Flow

- Enroll: create `UserCourse(userId, courseId, enrolledAt = now, isActive = true)`.
- Archive: set `isActive = false`, `archivedAt = now`. `UserTopic` rows persist untouched.
- Unenroll hard: delete `UserCourse` (cascade does **not** remove `UserTopic`, since `UserTopic` is keyed off `Topic`, not `UserCourse`). A user's historical topic scores survive re-enrollment.

## Indexes Summary

| Table | Index |
|-------|-------|
| Topic | `courseId` |
| Subtopic | `topicId` |
| Question | `topicId`, `subtopicId`, `difficulty` |
| UserCourse | `@@unique([userId, courseId])`, `userId` |
| UserTopic | `@@unique([userId, topicId])`, `userId` |

## Migration Notes

1. Add `Subtopic` model; backfill one default subtopic per existing topic (or leave topics without subtopics until content is authored) — TBD based on existing seed data volume.
2. Add `subtopicId` to `Question` as **nullable first**, backfill, then mark required.
3. Add `UserCourse`; backfill from current implicit `_CourseToUser` join table; drop implicit relation after verifying row counts match.
4. Add `correctCount`, `totalCount`, `lastAnsweredAt` to `UserTopic` with defaults — no backfill needed.

## Open Questions

None blocking. App-layer scoring algorithm is intentionally deferred.
