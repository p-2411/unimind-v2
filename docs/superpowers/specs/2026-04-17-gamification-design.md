# Gamification Design — Return-Visit System

**Date:** 2026-04-17
**Status:** Draft for review (revised 2026-04-17 after initial brainstorm)
**Scope:** In-app dashboard + Chrome paywall extension
**Non-goals:** Changes to the scoring layer (FSRS scheduler or EMA mastery). Both are treated as read-only inputs.

## Goal

Maximize return-visit frequency for UniMind. The measurable outcome is sessions per active user per week, with a secondary outcome of 7-day and 30-day retention once a user base exists. Pre-launch, no real users, no analytics infrastructure, no A/B capability — the design must stand on mechanism-level reasoning, not experimentation.

## Assumptions

1. **Two surfaces matter and they behave differently.**
   - *Dashboard* (`unimind/` web app): low frequency, high-intent sessions. User chose to be there.
   - *Paywall* (Chrome extension): very high frequency (dozens of triggers per day), low intent. User is trying to reach YouTube/Twitter/etc.; the question is an obstacle.
2. **Scoring layer is authoritative and immutable for this work.** `UserQuestion.due` (FSRS) and `UserTopic.masteryScore` with 15-day decay half-life are inputs. We do not change the formulas.
3. **Pre-launch, cohort is empty.** Any social or comparative mechanic that requires other users must either degrade gracefully or be deferred.
4. **No analytics service exists.** Anything observable needs its own persistence.
5. **No push / email plumbing exists.** Out-of-app re-engagement would require new plumbing and is out of scope for Phase 1.
6. **`UserStats` exists but is largely dormant.** `level`, `xp`, `currentStreak`, `longestStreak` are columns but the `question.answer` mutation does not currently write to them. `lastActiveDate` is written. Wiring these up is Phase 1 work with zero schema cost.
7. **Goal is return frequency, not learning outcomes.** Learning outcomes are the scoring layer's job. Where a mechanic trades off against learning, the tradeoff is documented in the Risk Register.
8. **"Pre-launch" does not imply we can redesign scoring.** It does imply we can migrate schema freely — no backfill constraints.

## Design Alternatives

Three philosophies, genuinely different in where the engagement loop lives and what emotion drives return. These were the space explored before settling on the recommendation.

### Option A — Solo Progression ("RPG")

**Philosophy:** Engagement is intrinsic. The user returns because progress feels good. No social comparison, no loss framing. Positive reinforcement, visible mastery, collectible milestones.

**Core loop:** XP per question (variable-ratio bursts), levels with cosmetic unlocks, tiered achievements, per-course mastery tiles, streaks framed as positive momentum.

**Primary surface:** dashboard-heavy; paywall gets only XP animation.

**Pros:** low backlash risk, works day one solo, on-brand with terminal aesthetic.

**Cons:** intrinsic systems have lower return-frequency lift than loss-framed or social systems in the consumer-learning literature; underuses the paywall (highest-frequency surface); achievement novelty declines for power users.

### Option B — Social Competition ("Cohort")

**Philosophy:** Engagement is extrinsic and social. Users return because friends are watching, a league is closing, or a group goal is mid-flight.

**Core loop:** friend graph, weekly leagues with promotion/demotion, study groups with shared targets, friend feed.

**Primary surface:** dashboard.

**Pros:** strongest documented retention lever in consumer learning apps; friend graph is a distribution asset.

**Cons:** catastrophic cold-start pre-launch (empty leagues, empty feeds); heavy infra (invites, blocking, moderation); toxic-competition burnout risk; hostile to the paywall's 10-second choke-point flow.

### Option C — Friction-Calibrated Loss Framing ("Pressure")

**Philosophy:** Engineer specifically for the paywall moment — friction is already present, loss aversion lands hardest there.

**Core loop:** overdue-card debt counter, melting-mastery animation, streak-at-risk countdown shown *before* the answer, near-miss streak post-mortems, variable-ratio "jackpot" XP that also grants free site-access bypass, weekly pledges with sunk-cost framing, anonymous percentile.

**Primary surface:** paywall.

**Pros:** plays to the paywall's frequency advantage; loss aversion is the strongest single retention mechanism in the literature; anonymous percentile sidesteps cold-start.

**Cons:** aggressive; streak-loss cliffs risk churn; jackpot–site-access coupling is gambling-adjacent; debt/melting visuals can demoralize and drive uninstalls.

## Recommendation

**Phase 1 ships a targeted subset: XP, levels, achievements, and streaks (from Option A) plus streak-at-risk countdown and anonymous percentile (from Option C), with XP scaled by `Question.difficulty`.**

Everything else from Options B and C is deliberately out of scope for Phase 1. See "Explicitly excluded from Phase 1" below for the exhaustive list and the reasoning.

### Why this mix

1. **Progression without punishment.** A's XP/levels/achievements/streaks are the lowest-backlash, highest-coverage progression mechanics. They also happen to map 1:1 onto `UserStats` columns that already exist — zero migration cost to wire them up.
2. **One targeted dose of loss aversion.** The streak-at-risk countdown is C's strongest single mechanic for return frequency and it costs nothing in infra: it is a derived read over `lastActiveDate` and today's `QuestionAttempt` count. It preserves the loss-aversion lever without dragging in the more aggressive surface mechanics (debt counter, melting animation, jackpot) that came with the fuller C proposal.
3. **Social proof without a friend graph.** Anonymous percentile ("answered more than 73% of UniMind users this week") is the one C mechanic that does not require other users' identities or a friend graph, and it degrades gracefully below N=20. It gives us the social-proof flavor of B without any B infrastructure.
4. **Difficulty-weighted XP couples progression to learning depth.** Because `Question.difficulty` (1–3) is already on the schema, XP scaling is a pure calculation in `question.answer`. Without difficulty weighting, progression rewards volume; with it, progression rewards breadth across difficulty tiers, which is the behavior we want to reinforce.

### Why A, B, and fuller-C lose

- **Pure A** underuses the paywall and has the weakest published evidence for frequency lift. Adding *just* the streak-at-risk countdown fixes that without committing to the rest of C.
- **Pure B** cannot ship pre-launch. Leagues and friend feeds fail to an empty cohort. Deferred entirely to Phase 2; revisited once the active-user base crosses ~500 weekly.
- **Fuller C** is the highest-impact choice on paper but its aggressive mechanics (jackpot/site-access coupling, debt counters, melting animations, pledges) each carry meaningful UX and ethical risk that is hard to walk back once shipped. The recommended subset captures C's two highest-leverage, lowest-cost mechanics (streak-at-risk, anonymous percentile) and leaves the aggressive tail out of Phase 1. If Phase 1 under-delivers on return frequency, the fuller-C mechanics are additive and can be layered in one at a time.

### Broken-streak policy (mitigates the known cliff risk)

A streak-at-risk countdown creates a known cliff-drop failure mode: when the streak breaks, some users disengage entirely ("what's the point now"). Freeze tokens — the most common soft-landing mitigation — are *not* in this phase; the user's explicit scope excluded them.

The cheap mitigation that *is* in scope: **a broken streak becomes a permanent "Longest streak: N" badge on the dashboard and the new streak starts at 1, not 0.** This is a single write on the break-detection path and preserves the player's achievement as a collectible. It meaningfully softens the cliff without adding a new token economy.

If cliff churn turns out to be a real problem in practice, freeze tokens are the first follow-up to reconsider.

## Explicitly excluded from Phase 1

Listed so future contributors know these were considered and intentionally dropped, not forgotten.

- **Overdue-card debt counter** (from C) — paywall demoralizer; large-debt cliff.
- **Mastery-melting animations** (from C) — negativity bias on dashboard; not worth the complexity.
- **Streak post-mortem / near-miss modals** (from C) — subtle, low-coverage lift; animation complexity.
- **Streak freeze tokens** (from C) — replaced by the "longest-ever badge" soft landing.
- **Variable-ratio "jackpot" XP bursts** (from C) — low Phase 1 priority; can be layered in later as a pure server-side RNG on top of the base XP formula.
- **Jackpot → free site-access bypass** (from C) — the most aggressive mechanic, gambling-adjacent, removed.
- **Weekly pledges + pledge-miss history** (from C) — adds a full model and UI surface for a mechanic whose upside is uncertain pre-launch.
- **Daily question goal** (from A/C) — without pledges, unnecessary; streak preservation only requires ≥ 1 correct answer per UTC day.
- **Re-engagement emails and push** (Phase 1.5 in original spec) — new plumbing, deferred.
- **Friend graph, leagues, study groups** (Option B) — deferred to Phase 2 once cohort ≥ 500 weekly-active.

## Psychological Mechanism Inventory

Every Phase 1 mechanic maps to a named principle and its primary surface.

| Mechanic | Named principle | Primary surface |
|----------|-----------------|-----------------|
| XP per question (base) | Operant conditioning (fixed-ratio reward) | Paywall + Dashboard |
| XP scaled by `Question.difficulty` (1→5, 2→10, 3→20) | Matching law; rewards effort proportional to challenge | Paywall + Dashboard |
| Levels + cosmetic unlocks | Progression; endowment effect on unlocked themes | Dashboard |
| Tiered achievements (~40 milestones) | Collection bias; completion bias; goal-gradient effect | Dashboard |
| Streak counter ("Day 14 ▲") | Consistency bias; self-signaling | Dashboard + Paywall |
| Streak-at-risk countdown ("dies in 3h 42m") | Loss aversion; deadline effect; sunk cost | Paywall (primary) + Dashboard |
| Longest-streak badge after a break | Endowment effect; soft-landing against cliff churn | Dashboard |
| Anonymous percentile ("> 73% of users this week") | Social proof without cold-start | Dashboard + Paywall |

## Schema Deltas

Minimal. Two new tables; existing `UserStats` columns are wired up with no new columns.

### No change: `UserStats`

Existing columns (`level`, `xp`, `currentStreak`, `longestStreak`, `lastActiveDate`, `totalQuestionsAnswered`, `totalCorrectAnswers`, `totalTimeSpent`) cover everything Phase 1 needs. Phase 1 changes the logic inside `question.answer` to write to `xp`, `level`, `currentStreak`, and `longestStreak`; the schema is untouched.

### New: `Achievement` (definition) and `UserAchievement` (earned)

```prisma
model Achievement {
  id          String   @id @default(cuid())
  code        String   @unique            // stable identifier, e.g. "STREAK_7"
  name        String
  description String
  category    String                      // "streak" | "volume" | "mastery" | "breadth" | "meta"
  tier        Int      @default(1)        // 1=bronze, 2=silver, 3=gold
  xpReward    Int      @default(0)        // XP granted on first earn
  iconKey     String?                     // UI mapping key

  userAchievements UserAchievement[]

  @@index([category, tier])
  @@map("achievements")
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String   @db.Uuid
  achievementId String
  earnedAt      DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@index([userId, earnedAt])
  @@map("user_achievements")
}
```

### New: `AnalyticsEvent` (wide event log)

```prisma
model AnalyticsEvent {
  id         String   @id @default(cuid())
  userId     String?  @db.Uuid            // nullable: allow anonymous events
  eventType  String                       // "paywall_shown", "streak_lost", "level_up", etc.
  payload    Json?                        // event-specific; small
  occurredAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, occurredAt])
  @@index([eventType, occurredAt])
  @@map("analytics_events")
}
```

Phase 1 events to instrument at minimum:
- `paywall_shown` — every render of a question in the extension
- `paywall_answered` — payload `{ isCorrect, difficulty, xpGranted }`
- `streak_extended` — payload `{ length }`
- `streak_lost` — payload `{ priorLength, wasLongestEver }`
- `level_up` — payload `{ fromLevel, toLevel }`
- `achievement_earned` — payload `{ code }`
- `percentile_shown` — payload `{ percentile, cohortN }` (hidden-below-20 is a read-time gate)

This is a placeholder for proper analytics, not a replacement — when a real pipeline arrives, this table becomes a debug-only mirror.

### `User` relations

```prisma
model User {
  // ... existing ...

  achievements UserAchievement[]
  events       AnalyticsEvent[]
}
```

### Deferred (Phase 2) — not added now

`Friendship`, `League`, `LeagueMembership`, `LeagueSnapshot`, `Group`, `GroupMember`, `GroupChallenge`. Sketched only so Phase 1 table names do not conflict.

## Scoring / XP Rules

All calculations happen inside `question.answer` (already an interactive `$transaction`).

### XP grant per answer

```
Correct answer:
  difficulty 1 →  5 XP
  difficulty 2 → 10 XP
  difficulty 3 → 20 XP

Incorrect answer:
  1 XP (participation; deters random-clicking at 1 XP vs 20 XP for right answer,
        while keeping engagement neutral rather than punishing)
```

Numbers are proposed. The implementer should treat them as a starting calibration — tune after first real data.

### Level curve

Simple quadratic: level *N* requires cumulative XP ≥ `50 * N * (N + 1)` (i.e. 100, 300, 600, 1000, 1500, 2100 XP for levels 2–7). Smooth early-game (level-up every few sessions) and lengthens naturally.

### Streak rules

- A streak day is a UTC calendar day with at least one **correct** answer. (Using correct-only, not any answer, prevents trivial daily-save clicks; the incorrect-answer 1 XP is consolation, not streak-preserving.)
- `lastActiveDate` already tracks the most recent day with activity; extend the answer mutation to also branch on correct-vs-incorrect and on UTC-day-since-last-streak-day.
- On a correct answer, if `lastActiveDate` is today: no change to streak. If it is yesterday: `currentStreak += 1`. If it is older: `currentStreak = 1` (new streak starts at 1, previous streak's value is preserved as `longestStreak` if it was the max).
- `longestStreak` is updated whenever `currentStreak` reaches a new maximum.

### Anonymous percentile

Computed on the fly (no materialization in Phase 1):

```
user_weekly = COUNT(QuestionAttempt WHERE userId = :me AND answeredAt > NOW() - 7d)
cohort_weekly[u] = COUNT(QuestionAttempt WHERE userId = u AND answeredAt > NOW() - 7d)
percentile = % of cohort with cohort_weekly[u] <= user_weekly

Display ONLY IF cohort_size >= 20 AND percentile >= 50.
```

Cohort is "users with any `QuestionAttempt` in the last 7 days." Index `QuestionAttempt(userId, answeredAt)` already exists, so the query is cheap. Revisit with a materialized weekly snapshot if this becomes a hot path (expected after ~5K weekly-actives).

## Surface Design

### Paywall (Chrome extension)

Two small strips above the question (both optional, both skippable by user setting in Phase 2):

1. **Streak status strip.**
   - `✓ Streak 14` (today's streak already preserved by a correct answer)
   - `⏱ Streak 14 · dies in 3h 42m` (today's correct-answer count is 0, countdown live)
   - `★ Longest: 21 · Streak 3` (after a break — shows the badge)
2. **Percentile line** (if eligible): `> 73% of UniMind users this week`.

Below the question, post-answer:

- Correct: `+10 XP` toast (amount reflects difficulty). On level-up: brief level-up animation.
- Incorrect: `+1 XP` toast, neutral color, no celebration.
- On achievement earn: one-time pop `🏅 Achievement: Week One · +50 XP`.

### Dashboard

- Hero row: `Streak N · Level M (X / Y XP)`.
- Achievements rail: last 3 earned + next-closest 3. Rail links to `/achievements`.
- Percentile line (if eligible).
- Existing topic-mastery panel unchanged.

### Achievements page (`/achievements`)

Full gallery, reachable from the dashboard rail's "View all" link.

- **Header:** `12 / 40 unlocked · 280 XP from achievements`. Collection-progress anchoring at a glance.
- **Filters:** category tabs (All / Streak / Volume / Mastery / Breadth / Meta) plus a "Locked only" toggle.
- **Tiles:**
  - *Earned:* full-color icon, name, description, earned date, XP awarded.
  - *Locked:* muted icon, name + description still visible, progress bar when the predicate is countable (e.g. `73 / 100 questions answered`), XP reward previewed.

**Show locked names/descriptions (don't `???` them).** The achievements system earns its keep through the goal-gradient effect — users accelerate as they approach a visible target. A curiosity gap is a weaker motivator than a known goal. Hidden achievements are reserved for a small set of meta / easter-egg codes (flagged by an `isHidden` column on `Achievement` if we decide to add any later; out of scope for Phase 1).

**Progress bars apply only to countable predicates.** Combinatorial achievements ("3-day streak across 5 courses") render as binary locked/unlocked with the description as the only guide.

**Paywall stays browse-free.** The 10-second choke-point surface only ever shows earn-pops; users who want to browse come to the dashboard.

## Rollout

**Phase 1 (this spec):** schema deltas above; wire up existing `UserStats` columns; XP + level curve + streak logic in `question.answer`; achievement seed + unlock logic; paywall + dashboard UI for streak/percentile/XP/level.

**Phase 2 (once weekly-actives ≥ 500):** social — friend graph, leagues, groups. Separate spec.

**Not planned; revisit only if Phase 1 under-delivers:** jackpot XP bursts, site-access bypass, overdue debt counter, melting-mastery animation, pledges, freeze tokens, re-engagement notifications.

## Risk Register

| Mechanic | Downside / risk | Severity | Mitigation |
|---|---|---|---|
| Streak-at-risk countdown | Cliff-drop churn when streak breaks | Medium | Broken streak becomes permanent "Longest: N" badge; new streak starts at 1. Freeze tokens remain a follow-up if this mitigation is insufficient. |
| Streak correct-only rule | User tries one question, gets it wrong, day is "lost" even though they tried | Low | UI copy: "Answer 1 correctly today to keep your streak." Clarity avoids surprise. |
| XP + levels (decoupled from learning) | Users farm easy-difficulty questions for XP | Low–Medium | Difficulty-weighted XP (5/10/20) already disincentivizes farming difficulty-1 questions relative to harder tiers. FSRS scheduler independently controls which questions surface, limiting user choice of difficulty. |
| Incorrect-answer 1 XP | Could be perceived as rewarding wrong answers | Low | 1 XP is ≤ 20% of the minimum correct grant. UI copy is neutral, not celebratory. Drop to 0 if it reads weird. |
| Achievements | Novelty cliff for power users | Low | Start with ~40 across 5 categories; plan seasonal additions in a later phase. |
| Anonymous percentile | Demoralizing at low percentiles; rewards volume | Medium | Only show above median; hide below cohort N=20. Not a leaderboard. |
| Level curve calibration | Too fast = XP feels cheap; too slow = early abandonment | Medium | Starting quadratic is proposed; re-tune after first data. Schema has no hard-coded curve, it is a function. |

## Open Questions (resolved inline)

- *Freeze tokens?* No. Soft-landing handled by "longest-ever badge" pattern; freeze tokens are a follow-up if cliff churn is observed.
- *Daily goal?* No. Streak rule is "≥ 1 correct answer per UTC day." Simpler; removes another setting; avoids setup-to-fail on high goals.
- *Incorrect-answer XP: 0 or >0?* Starting at 1 XP; tunable. Zero XP was considered and rejected as marginally more punishing with no clear engagement benefit.
- *XP curve numbers (5/10/20, 50·N·(N+1))?* Proposed starting values. Implementer should treat as an initial calibration.
- *Analytics pipeline?* Stay with the `AnalyticsEvent` table in Phase 1. Replace with a real pipeline once a user base exists.
- *Re-engagement emails/push?* Not Phase 1. Flagged as future work if Phase 1 under-performs.

## Implementation handoff notes

- `question.answer` is already an interactive `$transaction` that writes `UserQuestion`, `QuestionAttempt`, `UserTopic`, and `UserStats`. XP / level / streak / achievement-unlock writes should join this same transaction — gamification state must be consistent with the underlying answer. Do not split into post-commit jobs.
- Streak rollover uses UTC day boundaries (matches the existing `lastActiveDate: today` pattern in `question.answer`). Users near the UTC midnight will see rollover at unusual local times; acceptable tradeoff pre-launch.
- Achievement evaluation runs after the `UserStats` update in the same transaction. A lookup table mapping `code` → predicate (implemented in server code, not SQL) evaluates each achievement against the post-update state; new `UserAchievement` rows are written only for first-time earns (`@@unique([userId, achievementId])` protects against double-writes).
- Anonymous-percentile queries should be served by a dedicated tRPC procedure (`user.weeklyPercentile`) and aggressively cacheable (e.g. `staleTime: 5 * 60 * 1000`). At scale, promote to a materialized weekly snapshot.
- `/achievements` page data comes from a new `achievement.listForUser` procedure returning `{ earned: Array<{ achievement, earnedAt }>, locked: Array<{ achievement, progress: number | null }> }`. The same predicate functions that drive unlock evaluation in `question.answer` are reused here in a "how close?" mode that returns a 0–1 progress value (or `null` for combinatorial predicates). Centralise predicates in `src/server/lib/gamification/achievements.ts` so the two call sites cannot drift.
- `AnalyticsEvent` writes should be best-effort and non-blocking (separate write, swallow errors) — they must not fail an answer.
- Phase 1 table names avoid conflict with planned Phase 2 tables (`Friendship`, `League*`, `Group*`, `GroupMember`).
