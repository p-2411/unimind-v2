# Gamification Design — Return-Visit System

**Date:** 2026-04-17
**Status:** Draft for review
**Scope:** In-app dashboard + Chrome paywall extension
**Non-goals:** Changes to the scoring layer (FSRS scheduler or EMA mastery). Both are treated as read-only inputs.

## Goal

Maximize return-visit frequency for UniMind. The measurable outcome is sessions per active user per week, with a secondary outcome of 7-day and 30-day retention once a user base exists. Pre-launch, no real users, no analytics infrastructure, no A/B capability — the design must stand on mechanism-level reasoning, not experimentation.

## Assumptions

1. **Two surfaces matter and they behave differently.**
   - *Dashboard* (`unimind/` web app): low frequency, high-intent sessions. User chose to be there.
   - *Paywall* (Chrome extension): very high frequency (dozens of triggers per day), low intent. User is trying to reach YouTube/Twitter/etc.; the question is an obstacle.
   The paywall is where most answers will happen; it is also where loss-framed mechanics land hardest because friction is already present.
2. **Scoring layer is authoritative and immutable for this work.** `UserQuestion.due` (FSRS) and `UserTopic.masteryScore` with 15-day decay half-life are inputs. We do not change the formulas.
3. **Pre-launch, cohort is empty.** Any social or comparative mechanic that requires other users will cold-start to an empty lobby and must either degrade gracefully or be deferred.
4. **No analytics service exists.** Anything observable needs its own persistence. We cannot say "just fire a Segment event."
5. **No push / email plumbing exists.** Any out-of-app re-engagement requires that plumbing to be built.
6. **`UserStats` exists but is largely dormant.** `level`, `xp`, `currentStreak`, `longestStreak` are columns but the `question.answer` mutation does not currently write to them. `lastActiveDate` is written. Streak logic, XP grants, and level-ups do not exist yet.
7. **Goal is return frequency, not learning outcomes.** Learning outcomes are the scoring layer's job. This spec is unapologetically about engagement. Where a mechanic trades off against learning (e.g. padding answer counts), that tradeoff is documented in the Risk Register.
8. **Ethical scope is intentionally wide.** The brief instructs us to explore aggressive mechanics and document tradeoffs. Nothing is excluded a priori. The author of the eventual PR gets to draw the line.
9. **"Pre-launch" does not imply we can redesign scoring.** It does imply we can migrate schema freely — no backfill constraints.

## Design Alternatives

Three philosophies, genuinely different in where the engagement loop lives and what emotion drives return.

### Option A — Solo Progression ("RPG")

**Philosophy:** Engagement is intrinsic. The user returns because progress feels good. No social comparison, no loss framing. Positive reinforcement, visible mastery, collectible milestones.

**Core loop:**
- Every answered question grants XP (variable-ratio — small bursts most of the time, rare large "crit" bursts). Level-ups unlock cosmetic dashboard themes and per-course badges.
- Topic mastery is visualized as a filling skill tree per course; unlocking a subtopic node plays a small reward animation.
- Achievements table with ~40 tiered milestones ("answer 10 questions", "reach 70 mastery in 3 topics", "5-day streak", "answer during 3 separate weekday hours").
- Streaks exist but framed as positive momentum ("Day 5 ▲"), no loss language. Missed days reset silently.

**Primary surface:** dashboard. The paywall gets only XP grant animation; no pressure.

**Pros:**
- Low risk of user backlash. No "dark pattern" accusations.
- Works from day one solo; no cold-start problem.
- Aligns with the engineering-console theme (terminal-aesthetic progress bars are on-brand).

**Cons:**
- Intrinsic systems have lower return-frequency lift than loss-framed or social systems in the literature (Duolingo's own writeups attribute most of their retention lift to streaks and leagues, both of which are loss/social framed).
- The paywall surface — the highest-frequency touchpoint — is underused.
- Achievements have declining novelty; late-stage users run out of things to chase.

### Option B — Social Competition ("Cohort")

**Philosophy:** Engagement is extrinsic and social. The user returns because friends are watching, a league is closing, or a group goal is mid-flight.

**Core loop:**
- Friend graph (add by email or share link). Friend feed on dashboard: "Alex just hit 80 mastery in Organic Chemistry."
- Weekly leagues (Duolingo-style): users auto-bucketed into groups of ~30 by activity level. Top 10 promote, bottom 10 demote. League resets each Sunday.
- Study groups: 2–8 person rooms with a shared weekly question-count target. Every member's answers count toward one thermometer.
- Leaderboards: weekly XP within league, weekly XP within group, weekly mastery gained globally (anonymous).
- Paywall shows "You're 4 XP behind Sarah this week" if friends exist, else a neutral topic/due counter.

**Primary surface:** dashboard-heavy, paywall displays social state contextually.

**Pros:**
- Social comparison is the single strongest retention lever documented in consumer learning apps.
- Friend graph creates a distribution asset: users invite friends, which compounds.
- Study groups add commitment device (sunk cost in a shared goal).

**Cons:**
- **Cold-start is catastrophic pre-launch.** Empty leagues, no friends, empty groups. Every social surface looks broken until density arrives.
- Friend graph is non-trivial infra: invites, acceptance, blocking, privacy settings, moderation of display names.
- Toxic competition risk (users cram to win a league, burn out, churn).
- Works *against* the paywall surface: social features are hard to consume in a 10-second "unblock me" flow.
- Requires a user acquisition story before it works at all. We don't have one.

### Option C — Friction-Calibrated Loss Framing ("Pressure")

**Philosophy:** The paywall is the highest-frequency surface in the product. Engineer specifically for *that* moment — the user wants to get to a distracting site, friction is already present, psychological vulnerability is highest. Use loss framing, near-miss feedback, and variable-ratio relief so that the paywall becomes the primary engagement loop. Dashboard supports it.

**Core loop:**
- **Debt counter.** The paywall opens with a prominent "You have **N overdue cards** · **M topics melting**" banner. N is count of `UserQuestion` rows with `due < now`. M is count of `UserTopic` rows with `masteryScore` that has decayed by ≥5 points since its peak in the last 30 days. Both numbers grow visibly the longer the user avoids practicing.
- **Streak at risk, *shown before the answer*.** If today's `QuestionAttempt` count is 0, the paywall header reads: "Your **14-day streak dies in 3h 42m**." Countdown is live. Streak is preserved by answering ≥1 question correctly in the 24h UTC window. Near-miss framing: when the user loses a streak, a post-mortem modal shows "You were 1 question away from your longest-ever streak" when applicable.
- **Variable-ratio relief.** Some fraction of correct answers (seeded-random around ~12%) trigger a "Jackpot" — larger XP burst, rarer visual animation. On the paywall, jackpot wins ALSO grant 60 seconds of site access for free, bypassing the paywall for the next trigger. This makes the reward schedule *functionally* variable-ratio slot-machine-shaped, with the "payout" being the thing the user actually wants (site access).
- **Mastery melting visualization.** Dashboard topic tiles animate a slow downward drift when the user is idle — the EMA decay is already there, but we *show it moving*, not a static number. Loss-framed copy: "Electrochemistry has slipped 8 points this week." Clicking a melting tile takes the user straight into questions for that topic.
- **Commitment escalation ("Pledge").** Optional weekly pledge: user commits to N questions this week. If they hit it, level-up animation plus one-time cosmetic. If they miss, the dashboard silently displays their streak of missed pledges ("0/3 pledges met this month"). Sunk-cost framing — successful pledgers tend to renew.
- **Anonymous percentile, not leaderboards.** "You answered more questions this week than 73% of UniMind users." Computed from `UserStats.totalQuestionsAnswered` delta over the last 7 days. No friend graph needed. Degrades gracefully at low N (hidden below 20 users).

**Primary surface:** paywall is the center of gravity. Dashboard is the dashboard for the paywall — where the user inspects their debt, their pledge, their streak status, their mastery drift.

**Pros:**
- Plays to UniMind's unique structural asset: the paywall's frequency.
- Loss framing is the single most-studied retention lever (Kahneman–Tversky); it lands hardest under friction, which the paywall provides.
- No friend-graph infrastructure required; anonymous percentile sidesteps the cold-start problem.
- Every mechanic has a legible psychological mechanism and a clear "off switch" (a user-facing setting).

**Cons:**
- Aggressive. Streak-loss countdowns, debt counters, and mastery-melting animations are the exact things /r/antiworkout complaints get written about. Some users will resent it and uninstall the extension rather than study.
- Variable-ratio site-access grants coupled to correct answers is arguably gambling-adjacent. It is also almost certainly the strongest mechanic in the spec.
- Loss framing can cause drop-off when a streak dies (the "what's the point now" cliff). Needs a "soft landing" (streak freeze tokens, see below).
- Dashboard is de-emphasized relative to paywall — users who prefer a pure in-app loop may feel the dashboard is thin.

## Recommendation

**Option C, with selected elements of Option A layered on, and Option B explicitly deferred to Phase 2 (post-launch, once a user base exists).**

### Why C wins

1. **Frequency is destiny.** The single largest asymmetry in UniMind's product is that the paywall fires 20–50× per day for a heavy browser user and the dashboard fires 1–3×. A gamification system that under-invests in the paywall is leaving the largest engagement lever on the table. Option A is paywall-indifferent. Option B is paywall-hostile (social mechanics don't fit a 10-second choke point).
2. **Loss aversion > reward.** People work ~2× harder to avoid loss than to secure equivalent gain. Option C is the only option that systematically applies this at the moment of peak vulnerability (user blocked from distraction, already feeling friction).
3. **Pre-launch constraint kills Option B standalone.** Leagues, friend feeds, and groups require population. We have none. Every Option B screen would ship broken.
4. **C's weakest point is exactly where A is strongest.** A's positive progression is easy to layer onto C: XP, levels, cosmetic unlocks, achievements. These give users something to chase when they're not in deficit mode.

### Why A and B lose (on their own)

- **A** is the safe, low-backlash choice but the brief asks for maximum return-visit lift and A's evidence base for frequency lift is weakest. Its mechanics are also the easiest to add later, so picking A now locks in the lowest-impact version.
- **B** is the highest-impact choice *conditional on user density*, and we have none. Shipping social features to an empty app is a known failure mode. Building friend-graph infra now burns implementation time on something that cannot be validated pre-launch. Deferring B also lets us study which users' return patterns make them the best seeds for cohorts.

### The layered design (what we actually build)

- **Phase 1 (launch):** Option C core + XP/level/achievements from Option A.
- **Phase 2 (once >~500 weekly-active users):** Option B bolted on — friend graph, leagues, groups. The pressure/progression layer remains the substrate. Deferred explicitly; schema hooks for Phase 2 are noted but not added now.

## Psychological Mechanism Inventory

Every mechanic maps to a named principle and its primary surface.

| Mechanic | Named principle | Primary surface | Phase |
|----------|-----------------|-----------------|-------|
| Overdue card debt counter | Loss aversion, endowment effect | Paywall | 1 |
| Melting topics counter / animation | Loss aversion, visibility of decay (salience) | Paywall + Dashboard | 1 |
| Streak-at-risk countdown | Sunk cost, loss aversion, deadline effect | Paywall | 1 |
| Streak post-mortem ("1 question away from your longest") | Near-miss effect | Paywall | 1 |
| Streak freeze tokens (earned from pledges) | Endowment effect, goal-gradient | Dashboard | 1 |
| Variable-ratio "jackpot" XP bursts | Variable-ratio reinforcement (Skinner) | Paywall + Dashboard | 1 |
| Jackpot grants free site-access bypass | Variable-ratio reinforcement coupled to revealed preference | Paywall | 1 |
| Weekly pledge (N questions committed) | Commitment device, sunk cost escalation | Dashboard | 1 |
| Pledge miss history display | Consistency bias, self-signaling | Dashboard | 1 |
| XP + levels + cosmetic unlocks | Progression, operant conditioning (ratio) | Dashboard | 1 |
| Achievements / milestone badges | Collection, completion bias | Dashboard | 1 |
| Mastery progress bars (fill-up) | Goal-gradient effect | Dashboard | 1 |
| Anonymous percentile ("> 73% of users") | Social proof without cold-start | Dashboard + Paywall | 1 |
| Re-engagement notifications ("3 topics melting, 12 cards overdue") | Loss framing, situational trigger (Fogg) | Email/push | 1.5 |
| Friend feed | Social proof, vicarious reinforcement | Dashboard | 2 |
| Leagues (weekly bucketed competition) | Social comparison, intermittent loss, reset anchoring | Dashboard | 2 |
| Study groups (shared weekly target) | Cooperative goal, diffusion of commitment, social accountability | Dashboard | 2 |

## Schema Deltas

All new. No changes to existing scoring tables or existing `UserStats` columns.

### Wire up dormant `UserStats` columns (no schema change, behavior change)

`question.answer` currently writes `lastActiveDate` and `totalQuestionsAnswered` but does **not** update `xp`, `level`, `currentStreak`, or `longestStreak`. Part of Phase 1 is to start writing these. No migration needed; just logic in the mutation.

### Add streak-protection and daily-goal fields to `UserStats`

```prisma
model UserStats {
  // ... existing fields ...

  // Streak protection — earned, not sold. No IAP in this spec.
  streakFreezeTokens Int @default(0)

  // Daily goal — the baseline pledge horizon; weekly Pledge is separate.
  dailyGoalQuestions Int @default(5)

  // Last day the user hit their daily goal. Used to detect misses cheaply.
  lastDailyGoalMetAt DateTime?
}
```

Rationale:
- `streakFreezeTokens`: tokens are granted for weekly pledges met and for certain achievements. One token auto-consumes when the user would otherwise lose a streak (on read, at midnight-checker, or lazily at next session). Gives the user a "soft landing" so a single bad day doesn't reset everything — keeps loss aversion strong without cliff-drop churn.
- `dailyGoalQuestions`: user-editable baseline pledge. Drives the daily progress bar on the dashboard.

### New: `Achievement` (definition) and `UserAchievement` (earned)

```prisma
model Achievement {
  id          String   @id @default(cuid())
  code        String   @unique            // stable identifier, e.g. "STREAK_7"
  name        String
  description String
  category    String                      // "streak" | "volume" | "mastery" | "breadth" | "meta"
  tier        Int      @default(1)        // 1=bronze, 2=silver, 3=gold
  xpReward    Int      @default(0)
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

### New: `Pledge` (weekly commitment)

```prisma
model Pledge {
  id            String    @id @default(cuid())
  userId        String    @db.Uuid
  weekStart     DateTime                      // UTC Monday 00:00
  targetCount   Int                           // questions promised this week
  actualCount   Int       @default(0)         // denormalized, updated on each answer
  metAt         DateTime?                     // set when actualCount >= targetCount
  createdAt     DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, weekStart])
  @@index([userId, weekStart])
  @@map("pledges")
}
```

One row per (user, week). Absence of a row = user did not pledge this week (that is fine and displayed neutrally; only *missed* pledges — rows where `weekStart < current week` and `metAt IS NULL` — are used in the pledge-miss history display).

### New: `AnalyticsEvent` (wide event log)

```prisma
model AnalyticsEvent {
  id         String   @id @default(cuid())
  userId     String?  @db.Uuid            // nullable: allow anonymous events
  eventType  String                       // "paywall_shown", "streak_saved", "level_up", etc.
  payload    Json?                        // event-specific; small
  occurredAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, occurredAt])
  @@index([eventType, occurredAt])
  @@map("analytics_events")
}
```

Events to instrument at minimum for Phase 1:
- `paywall_shown` — every time the extension renders a question
- `paywall_answered` — payload `{ isCorrect, source: "paywall" }`
- `paywall_bypassed_by_jackpot` — jackpot grant consumed
- `streak_saved_by_freeze` — a freeze token auto-consumed
- `streak_lost` — payload `{ priorLength, wasLongestEver }`
- `level_up` — payload `{ fromLevel, toLevel }`
- `achievement_earned` — payload `{ code }`
- `pledge_created`, `pledge_met`, `pledge_missed`
- `decay_warning_shown` — dashboard or paywall displayed a "melting" banner

This is not a replacement for a real analytics pipeline; it is the minimum persistence needed to reason about what works once users exist. When real analytics arrive, this table becomes a debug-only mirror.

### New: `User.relation` additions

```prisma
model User {
  // ... existing ...

  achievements UserAchievement[]
  pledges      Pledge[]
  events       AnalyticsEvent[]
}
```

### Deferred (Phase 2) — sketched, not added now

- `Friendship` (undirected, symmetric rows)
- `League`, `LeagueMembership`, `LeagueSnapshot`
- `Group`, `GroupMember`, `GroupChallenge`

Not in this migration. Mentioned so implementers know the shape of the Phase 2 surface and do not design Phase 1 tables that would conflict.

## Surface Design

### Paywall (Chrome extension)

Above the question, in order of prominence:

1. **Streak status strip** (top, small). Either:
   - `✓ Streak 14 · Day complete` (today's goal met)
   - `⏱ Streak 14 · dies in 3h 42m` (today's goal not met, countdown)
   - `🧊 1 freeze available` (if a token exists and the user is at risk)
2. **Debt line** (small, subordinate). `12 cards overdue · 3 topics melting`. Both numbers link to the dashboard when clicked (opens new tab).
3. **Question block** (unchanged from current `nextForPaywall`).
4. **Post-answer flourish**:
   - Correct + non-jackpot: `+10 XP` toast.
   - Correct + jackpot: `★ JACKPOT +75 XP · Free site access for 60s` with a distinct animation. Jackpot immediately unblocks the current site; no second question needed on next trigger within 60s.
   - Incorrect: neutral feedback; no XP but debt counters update.

The jackpot coupling (site-access reward tied to correct answers on a variable-ratio schedule) is the single most aggressive mechanic in this design and the one most likely to move the frequency metric. It is also the mechanic most likely to be objected to internally. Calling it out explicitly.

### Dashboard

The dashboard becomes a "how am I doing across the three pressure axes" panel.

- Hero row: `Streak N · XP/Level · Today N/M questions` (the daily goal progress bar).
- Topics panel: existing mastery list, but tiles animate downward drift when decaying, up-arrows when recently practiced. Melting tiles move to the top.
- Pledge card: either "No pledge this week — [Pledge 30]" or the active pledge's thermometer.
- Achievements rail: recently-earned + next-closest two.
- Anonymous percentile line: "You answered more this week than 73% of UniMind users." Hidden when cohort N < 20.

### Re-engagement (Phase 1.5)

Out of band from the two surfaces. Requires email/push plumbing that does not exist — flagged as a separate implementation chunk.

- **Daily "debt building" email** if user has not practiced in ≥48h and has ≥5 overdue cards: `"12 cards overdue, 2 topics slipping. 3 questions gets you back on track."`
- **Streak-at-risk push** (if push is added) at T-60min before UTC day rollover if today's answer count is 0 and streak ≥ 3.

## Rollout Phases

- **Phase 1 (core C + A layering):** schema deltas above; wire up dormant `UserStats`; paywall and dashboard copy/animation changes; analytics event logging; pledges; achievements; variable-ratio jackpot.
- **Phase 1.5 (re-engagement):** email plumbing (Resend), push plumbing (extension-native). Re-engagement triggers.
- **Phase 2 (social):** friend graph, leagues, groups. Only begin once weekly-active cohort ≥ 500.

## Risk Register

One row per mechanic. "Severity" is relative within this doc, not absolute.

| Mechanic | Downside / risk | Severity | Mitigation |
|---|---|---|---|
| Overdue debt counter | Demoralizing when debt is huge; creates "too late to start" cliff | Medium | Cap displayed number at 50+ or "many"; show a smaller "today's recommended set" alongside. |
| Streak-at-risk countdown | Pressure can cause avoidance ("I'll just skip this week to not feel bad") | High | Streak freeze tokens; soft reset (streak becomes "longest ever" badge on break, starts at 1, not 0). |
| Streak freeze tokens | Players hoard them and still churn; token inflation reduces meaning | Low | Earned-only (no purchase); decay unused tokens after 30 days; cap at 3 outstanding. |
| Jackpot XP + free site-access bypass | Gambling-mechanic adjacency; regulatory/ethical exposure; may train users to *want* paywall hits | **High** | Payout is informational (XP) plus a practical unlock, not currency. No purchasable modifiers. Payout rate is fixed in code, not tunable per user. Still: this is the first mechanic to pull if concerns arise. |
| Mastery-melting animation | Annoying if the user is actively trying to improve; negativity bias on dashboard | Medium | Cap animation to actually-decaying topics; add a "don't show melting" user preference. |
| Weekly pledge | Missed pledges accumulate guilt; may drive churn rather than return | Medium | "Missed" display is subtle (one line, not a banner). Pledges are opt-in and the default is no pledge. |
| Pledge-miss history display | Public-to-self shaming; can entrench a "failed user" self-narrative | Medium | Show only the last 4 weeks. Never persist beyond that window on the display path. |
| XP + levels | Decoupled from actual learning — user can farm XP on easy questions | Low (pre-launch) / Medium (later) | XP formula should weight by FSRS difficulty + elapsed time since due. Out of scope for schema but noted for `question.answer` logic. |
| Achievements | Novelty cliff for power users; "ran out of things to chase" demotivation | Low | Start with ~40; plan for seasonal drops in Phase 2. |
| Anonymous percentile | Demoralizing at low percentiles; encourages volume farming | Medium | Only show positive percentiles (above median); hide if user is in bottom 50%. |
| Re-engagement email | Unsubscribe / spam risk; CAN-SPAM/Canada's CASL requirements | Medium | Explicit opt-in during onboarding default-on; one-click unsubscribe; content is factual, not manipulative ("you have N overdue cards" is true). |
| Re-engagement push | Browser permission revocation cascade if too aggressive | Medium | Frequency cap: ≤ 1 push/day. User control in extension options. |
| Leagues (Phase 2) | Toxic competition; user burns out to win, then churns | Medium | Demote slowly; protect newcomers from top leagues for N weeks. |
| Friend feed (Phase 2) | Privacy; friend-of-friend data leakage; harassment potential | Medium | Friend-only visibility; block list; no public profiles by default. |

## Open questions (resolved inline for this spec)

- *Should jackpot site-access bypass ship in Phase 1?* Yes. It is the single strongest mechanic and the paywall is the strongest surface. If internal review objects, it is removable via one flag. Not including it means shipping a weaker version of the recommended philosophy.
- *Should streak break fully reset?* No — broken streak becomes a "longest ever" badge, new streak starts at 1. This is a deliberate deviation from Duolingo-style reset-to-zero; it avoids the cliff drop while preserving the pressure.
- *Should pledges be opt-in or default-on?* Opt-in. Default-on pledges create guilt debt for users who never engaged with the mechanic. Let pledge-makers self-select.
- *Should daily goal be user-editable?* Yes. Default 5. Editable between 3 and 25. Lower bound prevents trivializing; upper bound prevents setup-to-fail.

## Implementation handoff notes

Not part of the spec, but flags for the implementation plan author:

- `question.answer` is already an interactive `$transaction` that touches `UserQuestion`, `QuestionAttempt`, `UserTopic`, and `UserStats`. Adding XP, streak, pledge, achievement-unlock writes into the same transaction is safe and desirable — all gamification state updates atomically with the underlying answer. **Do not** split these into post-commit jobs; losing one update would drift state and gamification integrity depends on consistency.
- Streak rollover needs a time-of-day anchor. Use UTC day boundaries (matches existing `lastActiveDate: today` pattern in `question.answer`) for consistency; accept the mild downside that users near midnight UTC see rollover at unusual local times.
- Jackpot RNG should be seeded by `QuestionAttempt.id` (deterministic post-hoc auditability) rather than pure `Math.random()`. Not strictly necessary pre-launch but cheap to do right now.
- Analytics events should be written in a best-effort, non-blocking way (write outside the transaction, swallow errors). They are diagnostic; they must not fail an answer.
- Keep the Option B table sketches in mind when naming Phase 1 tables — avoid `UserGroup` (conflicts with future `GroupMember`), avoid `Leaderboard` as a Phase 1 concept.
