# TODO
[] Account/settings page
[] Report feature on questions

## Database connection / scaling

The prior deployment used Supabase's **session pooler** (port 5432), not a direct connection. Retain that configuration for the replacement database and revisit before concurrency grows:

- **Pooling strategy.** Direct connections don't scale — each Next.js request can open its own Postgres connection and exhaust the server. Options:
  - Supabase **transaction pooler** (port 6543), with Prisma/prepared-statement settings verified against the deployed pooler and migration URL kept separately. Transaction mode pins a backend until commit; retain atomic interactive transactions and test concurrency/rollback before switching.
  - Supabase **session pooler** — less strict, but can still exhaust under hot-reload / many Prisma clients.
  - Move to **Neon** + `@neondatabase/serverless` HTTP driver via Prisma's driver adapter. No persistent connection, no pool exhaustion, very fast cold starts. Tradeoff: no interactive transactions across requests, no LISTEN/NOTIFY.

- **Preserve transaction integrity.** Answer writes (attempt, FSRS card, mastery, stats, achievements and replay receipt) must commit atomically. They are not individually idempotent. The receipt deduplicates an entire logical answer; do not replace the transaction with sequential independently committed upserts.

- **Connection limit tuning.** Set `connection_limit` on the Prisma URL once we know runtime concurrency. Too high = Postgres dies; too low = requests queue.

- **Observability.** Add Prisma query logging / slow-query alerts before scaling so we can see which queries hold connections longest.


## Live counter 
Make live counter represent ACTUAL number of users -- badge only shows when past 100 users

## Flashcard view style rather than question list
i.e. each question occupies the page and u answer one question before moving to the next


## Scoring follow-ups

Tracked from the 2026-04-17 scoring design. None block launch; revisit after first-batch user feedback.

- **Survey first-batch users on the 4-grade self-rate prompt.** Both the in-app practice flow and the Chrome paywall ask users to rate Again / Hard / Good / Easy after revealing the answer. If feedback says it's too much friction *on the paywall specifically*, fall back to binary on that surface (rating maps to `Again=1` for incorrect, `Good=3` for correct). Keep in-app at 4-grade unless feedback is universally negative. Until the 4-grade UI ships, both surfaces send binary ratings derived from correctness.
- **Difficulty-weighted mastery EMA.** Currently each attempt blends in with a flat `ATTEMPT_WEIGHT=0.15`. Once `Question.difficulty` ratings are reliable, scale that weight by difficulty so getting harder questions right boosts mastery more than easy ones.
- **Assessment-weighted paywall course selection.** `nextForPaywall` currently pulls the globally most-due card across all enrolled courses. Switch to weighted random across courses, weighted by closest assessment date (uses the existing `Assessment` model). Falls back to current global most-due when no assessments are scheduled.
- **`QuestionAttempt` cascade behavior on Topic deletion.** Currently `topic` FK on `question_attempts` is `onDelete: Cascade`, so removing a Topic silently erases all related audit rows. The audit log's stated purpose is recompute + analytics; consider switching to `Restrict` (refuse Topic delete if attempts exist) or making `topicId` nullable with `SetNull` to preserve historical rows. Theoretical risk only pre-launch; revisit when content management workflows land.