# UI Real-Data Wiring — Dashboard & Questions

**Date:** 2026-04-15
**Status:** Draft — pending user review
**Scope:** Replace hardcoded data on the dashboard and `/questions` page with live queries against the Prisma schema finalized in `2026-04-15-data-schema-design.md`. Add the `subtopic` field to question meta bars. Wire the reveal action to persist `question.answer`.

## Goal

1. Dashboard shows real per-user stats and a personalised "daily prompt" question.
2. `/questions` list, filters, and reveal-flow are backed by the DB and the `question.answer` mutation.
3. All mock data (`src/lib/mock-questions.ts`) is deleted.

## Non-Goals

- Pagination on `/questions` (hard cap at 50 results for now).
- `/topics` and `/progress` pages.
- "My courses" UI, assessment widgets.
- Subtopic filter chip (intentionally deferred).
- Attempt history / per-question "seen before" indicators.

## Server additions

### `questionRouter` (`src/server/api/routers/question.ts`)

- **`list`** — `protectedProcedure`
  - Input: `{ topicId?: string; difficulty?: 1|2|3; search?: string; limit?: number (default 50, max 100) }`
  - Returns questions with `id`, `question`, `choices`, `answerIndex`, `explanation`, `difficulty`, plus nested `topic.name`, `subtopic.name`, `topic.course.name`.
  - Ordering: newest first (`createdAt desc`).
  - `search` matches `question` text, `topic.name`, or `subtopic.name` (case-insensitive `contains`).

- **`forMe`** — `protectedProcedure`
  - No input.
  - Logic: find the session user's top `UserTopic` ordered by `score desc, lastAnsweredAt asc nulls first`. If none exists, fall back to a random topic. Pick a random `Question` from that topic.
  - Returns same shape as a `list` item (single object, not array).

- **`answer`** — already implemented, **extend** to include `answerIndex` and `explanation` on the return so the client can reveal without a second fetch.

### `userRouter` (`src/server/api/routers/user.ts`)

- **`dashboardStats`** — `protectedProcedure`
  - No input.
  - Returns:
    ```ts
    {
      topicsStarted: number;          // count(UserTopic) for user
      topicsCoveredThisWeek: number;  // count(UserTopic where lastAnsweredAt >= now - 7d)
      accuracy: number;               // average(UserTopic.score) or 0
      currentStreak: number;
      longestStreak: number;
      level: number;
      xp: number;
      topicMastery: Array<{
        topicId: string;
        name: string;                 // UserTopic.topicName
        score: number;
        correctCount: number;
        totalCount: number;
      }>;                             // top 6 by score desc
    }
    ```

All stats come from `UserTopic` + `UserStats`. No schema change required.

## Client changes

### `src/app/dashboard/page.tsx`

- Replace `api.topic.getAll()` call with parallel `api.user.dashboardStats()` + `api.question.forMe()`.
- **5 stat tiles**: Topics started · Topics covered (7d) · Accuracy · Streak · Level.
  - `Topics started` → `topicsStarted`.
  - `Topics covered` → `topicsCoveredThisWeek`, subtitle "last 7 days".
  - `Accuracy` → `Math.round(accuracy * 100)%`, subtitle shows raw correct/total sum across topics (or blank if none).
  - `Streak` → `currentStreak + "d"`, subtitle `Best ${longestStreak}d`.
  - `Level` → `L${level}`, subtitle `${xp} XP`.
- Topic bars use `topicMastery` (top 6). Each bar: name, percentage, and a compact counter `${correctCount}/${totalCount}` below (or beside) the percentage.
- Delete the hardcoded fallback branch (lines 42–48). Render an empty state when `topicsStarted === 0`: "Answer a question to start tracking topic mastery."
- Pass the question object to `<PreviewQuestion question={...} />` as a prop.

### `src/app/dashboard/preview-question.tsx`

- Accept `question` prop instead of reading from `MOCK_QUESTIONS`.
- Meta bar: `topic.name · subtopic.name · topic.course.name`.
- On Submit: call `api.question.answer.useMutation()` with `{ questionId, choiceIndex, timeSpentMs: 0 }`; on success, navigate to `/questions?seed=${question.id}&pick=${selected}` and let `QuestionsView` use the real `answerIndex`/`explanation` it receives from its own fetch.
- Remove the `course` hardcoded string; it's now on `topic.course.name`.

### `src/app/questions/questions-view.tsx`

- Delete all imports from `~/lib/mock-questions`.
- Top-level data: `const { data: questions = [] } = api.question.list.useQuery({ topicId, difficulty, search: query, limit: 50 })`. `topicId`, not name, so `topicFilter` becomes `{ id, name } | null`.
- `TOPICS` list: fetch via `api.topic.getAll()` (already exists) for chip labels.
- `difficultyLabel` helper: move inline or into a small `src/lib/question-display.ts` shared util (delete the mock module entirely).
- `QuestionCard` meta bar: `Topic · Subtopic · Course`.
- `Check` button becomes a mutation trigger: `api.question.answer.useMutation({ onSuccess: ({ isCorrect }) => setRevealed(...) })`. Use the server's `answerIndex` / `explanation` (returned by the mutation) for the reveal panel.
- Remove the local "compute correct from pick" logic — server is the authority.
- Header counter (`answered/total correct`): `answered = Object.keys(answers).length` still works, but derive `correct` from a map of `{ questionId → isCorrect }` populated by each mutation response.
- `seed` / `pick` URL params still drive "pin this question to the top". When present, auto-trigger the mutation on mount so the preview-question submit flow records the attempt and the reveal shows correctly.

### `src/lib/mock-questions.ts`

- **Delete.** Move `difficultyLabel` to `src/lib/question-display.ts` (small shared util).

## Data flow summary

```
Dashboard (server component)
 ├─ user.dashboardStats()        → tiles + topic bars
 └─ question.forMe()             → <PreviewQuestion question={…} />
                                     submit → question.answer.mutate()
                                            → router.push(/questions?seed=…&pick=…)

/questions (client component)
 ├─ topic.getAll()                → filter chips
 ├─ question.list({ filters })    → card list
 └─ Check button                  → question.answer.mutate() → reveal
```

## Risks / edge cases

- `question.forMe` fallback: user with zero `UserTopic` rows. Behaviour: pick a random `Question` across all topics; the dashboard tiles render an empty state anyway. Document this in the implementation.
- `question.answer` is called twice if the seed-pick auto-trigger races with a user's manual Check on the same card. Guard: skip the auto-trigger when `revealed[seedId]` is already set (it is, from initial state derived from URL params).
- Avg accuracy is `average(score)` across topics, not `sum(correctCount)/sum(totalCount)`. This keeps every topic equally weighted regardless of how many questions they've answered. Flagging — tell me if you'd rather weight by question count.
