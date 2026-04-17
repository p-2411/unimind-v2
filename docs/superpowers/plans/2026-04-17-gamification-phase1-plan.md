# Gamification Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1 of the gamification system — XP, levels, achievements, streaks (with longest-ever badge), anonymous weekly percentile — wired into `question.answer` and displayed on the Next.js dashboard and a new `/achievements` page. Chrome-extension (paywall) UI is deferred until the extension exists; the backend is built to serve both surfaces with no additional work when the extension arrives.

**Architecture:** A new server-only `src/server/lib/gamification/` module encapsulates pure logic (XP calculation, level curve, streak transitions, achievement predicates, percentile query). `question.answer` extends its existing `$transaction` to update `UserStats`, evaluate achievements, and fire-and-forget analytics writes. Three new Prisma models (`Achievement`, `UserAchievement`, `AnalyticsEvent`) and two new tRPC procedures (`user.weeklyPercentile`, `achievement.listForUser`). Dashboard gets a re-worked hero + achievements rail; a new `/achievements` page renders the full gallery.

**Tech Stack:** Next.js 15 App Router · TypeScript · tRPC v11 · Prisma 6 · Jest 30 · shadcn/ui · Tailwind v4.

**Reference spec:** `docs/superpowers/specs/2026-04-17-gamification-design.md`

**Working directory assumption:** all `npm`/`prisma` commands run from `unimind/`. File paths below are repo-root-relative.

---

## File Structure (decisions locked in)

### New files

- `unimind/src/server/lib/gamification/xp.ts` — XP per answer, level curve, progress-to-next-level
- `unimind/src/server/lib/gamification/xp.test.ts`
- `unimind/src/server/lib/gamification/streak.ts` — streak transition function (pure, no DB)
- `unimind/src/server/lib/gamification/streak.test.ts`
- `unimind/src/server/lib/gamification/achievements.ts` — predicate registry + evaluate + progress
- `unimind/src/server/lib/gamification/achievements.test.ts`
- `unimind/src/server/lib/gamification/analytics.ts` — best-effort event writer
- `unimind/src/server/lib/gamification/index.ts` — barrel
- `unimind/prisma/achievements-seed.ts` — ordered list of seed Achievement rows
- `unimind/src/server/api/routers/achievement.ts` — tRPC router
- `unimind/src/app/achievements/page.tsx` — full gallery page
- `unimind/src/app/achievements/achievements-grid.tsx` — client component grid with filters

### Modified files

- `unimind/prisma/schema.prisma` — add three models and relations
- `unimind/prisma/seed.ts` — call new achievement seeder
- `unimind/src/server/api/routers/question.ts` — extend `answer` mutation
- `unimind/src/server/api/routers/user.ts` — add `weeklyPercentile`; extend `dashboardStats` payload
- `unimind/src/server/api/root.ts` — register `achievement` router
- `unimind/src/app/dashboard/page.tsx` — percentile line + achievements rail + level XP progress
- `unimind/src/app/dashboard/preview-question.tsx` — level-up and achievement-earn toasts after answer

---

## Task 1: Add Prisma models for achievements and analytics

**Files:**
- Modify: `unimind/prisma/schema.prisma`

- [ ] **Step 1: Add the three new models to `schema.prisma`**

Insert the three models at the end of the file (after `Assessment`):

```prisma
// ============================================
// GAMIFICATION
// ============================================

model Achievement {
  id          String  @id @default(cuid())
  code        String  @unique
  name        String
  description String
  category    String
  tier        Int     @default(1)
  xpReward    Int     @default(0)
  iconKey     String?

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

model AnalyticsEvent {
  id         String   @id @default(cuid())
  userId     String?  @db.Uuid
  eventType  String
  payload    Json?
  occurredAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, occurredAt])
  @@index([eventType, occurredAt])
  @@map("analytics_events")
}
```

- [ ] **Step 2: Add relations to `User`**

In the `User` model (around line 27–33), add three new relations:

```prisma
model User {
  // ... existing fields and relations ...
  userCourses UserCourse[]      @relation("UserCourseEnrollments")
  assessments Assessment[]
  stats       UserStats?
  topics      UserTopic[]
  questions   UserQuestion[]
  attempts    QuestionAttempt[]

  achievements UserAchievement[]
  events       AnalyticsEvent[]

  @@map("users")
}
```

- [ ] **Step 3: Generate the migration**

From `unimind/`:

```bash
npm run db:generate -- --name add_gamification_tables
```

Expected: new migration folder under `unimind/prisma/migrations/…_add_gamification_tables/`, Prisma client regenerated into `unimind/generated/prisma/`.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add unimind/prisma/schema.prisma unimind/prisma/migrations/
git commit -m "feat(gamification): add Achievement, UserAchievement, AnalyticsEvent models"
```

---

## Task 2: Seed the Phase 1 achievement catalog

**Files:**
- Create: `unimind/prisma/achievements-seed.ts`
- Modify: `unimind/prisma/seed.ts`

- [ ] **Step 1: Create the catalog file**

Path: `unimind/prisma/achievements-seed.ts`

```ts
export type AchievementSeed = {
  code: string;
  name: string;
  description: string;
  category: "streak" | "volume" | "mastery" | "breadth" | "meta";
  tier: 1 | 2 | 3;
  xpReward: number;
  iconKey?: string;
};

// Phase 1 catalog. Extend in later phases — order here controls display order
// within a category on the /achievements page.
export const ACHIEVEMENTS: AchievementSeed[] = [
  // Streak
  { code: "STREAK_3",  name: "Warm-Up",        description: "Maintain a 3-day streak.",  category: "streak", tier: 1, xpReward: 25,  iconKey: "flame-1" },
  { code: "STREAK_7",  name: "Week One",       description: "Maintain a 7-day streak.",  category: "streak", tier: 2, xpReward: 75,  iconKey: "flame-2" },
  { code: "STREAK_30", name: "Month Strong",   description: "Maintain a 30-day streak.", category: "streak", tier: 3, xpReward: 300, iconKey: "flame-3" },

  // Volume (total correct answers)
  { code: "VOL_10",   name: "First Ten",     description: "Answer 10 questions correctly.",   category: "volume", tier: 1, xpReward: 20,  iconKey: "target-1" },
  { code: "VOL_100",  name: "Centurion",     description: "Answer 100 questions correctly.",  category: "volume", tier: 2, xpReward: 100, iconKey: "target-2" },
  { code: "VOL_1000", name: "Thousandaire",  description: "Answer 1000 questions correctly.", category: "volume", tier: 3, xpReward: 500, iconKey: "target-3" },

  // Mastery (per-topic mastery thresholds)
  { code: "MASTERY_70_ONE",    name: "Specialist",    description: "Reach 70 mastery in one topic.",       category: "mastery", tier: 1, xpReward: 40,  iconKey: "spark-1" },
  { code: "MASTERY_85_ONE",    name: "Expert",        description: "Reach 85 mastery in one topic.",       category: "mastery", tier: 2, xpReward: 120, iconKey: "spark-2" },
  { code: "MASTERY_70_FIVE",   name: "Well-Rounded",  description: "Reach 70 mastery in five topics.",     category: "mastery", tier: 3, xpReward: 250, iconKey: "spark-3" },

  // Breadth (topics or courses touched)
  { code: "BREADTH_3_TOPICS",  name: "Explorer",      description: "Practice in 3 different topics.",      category: "breadth", tier: 1, xpReward: 20,  iconKey: "map-1" },
  { code: "BREADTH_10_TOPICS", name: "Cartographer",  description: "Practice in 10 different topics.",     category: "breadth", tier: 2, xpReward: 100, iconKey: "map-2" },
  { code: "BREADTH_2_COURSES", name: "Polymath",      description: "Enrol in and practice 2 courses.",     category: "breadth", tier: 3, xpReward: 150, iconKey: "map-3" },

  // Meta (one-off / onboarding)
  { code: "META_FIRST_ANSWER", name: "First Step",    description: "Answer your very first question.",     category: "meta", tier: 1, xpReward: 10,  iconKey: "start" },
  { code: "META_HARD_ANSWER",  name: "No Easy Road",  description: "Answer a difficulty-3 question correctly.", category: "meta", tier: 1, xpReward: 30,  iconKey: "shield" },
  { code: "META_LEVEL_5",      name: "Cadet",         description: "Reach level 5.",                        category: "meta", tier: 2, xpReward: 100, iconKey: "pip-2" },
];
```

- [ ] **Step 2: Call the seeder from `seed.ts`**

Insert this block in `unimind/prisma/seed.ts` **before** the final `"\n✅ Database seeded successfully!"` log, after the existing `assessmentUsers` block:

```ts
  // Seed Achievements
  console.log("🏅 Seeding achievements...");
  const { ACHIEVEMENTS } = await import("./achievements-seed");
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        name: a.name,
        description: a.description,
        category: a.category,
        tier: a.tier,
        xpReward: a.xpReward,
        iconKey: a.iconKey,
      },
      update: {
        name: a.name,
        description: a.description,
        category: a.category,
        tier: a.tier,
        xpReward: a.xpReward,
        iconKey: a.iconKey,
      },
    });
  }
  console.log(`   ✓ Upserted ${ACHIEVEMENTS.length} achievements`);
```

Also add `prisma.achievement.deleteMany()` to the early "Clear existing data" block (so re-seeding stays clean) — insert it before `prisma.user.deleteMany()`:

```ts
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.analyticsEvent.deleteMany();
```

- [ ] **Step 3: Run the seed**

```bash
npm run db:seed
```

Expected: `✓ Upserted 15 achievements` line; no errors.

- [ ] **Step 4: Verify in Prisma Studio (optional, manual)**

```bash
npm run db:studio
```

Open the `achievements` table — 15 rows.

- [ ] **Step 5: Commit**

```bash
git add unimind/prisma/achievements-seed.ts unimind/prisma/seed.ts
git commit -m "feat(gamification): seed Phase 1 achievement catalog"
```

---

## Task 3: XP module — pure calculation

**Files:**
- Create: `unimind/src/server/lib/gamification/xp.ts`
- Test: `unimind/src/server/lib/gamification/xp.test.ts`

- [ ] **Step 1: Write the failing tests**

Path: `unimind/src/server/lib/gamification/xp.test.ts`

```ts
import {
  xpForAnswer,
  levelForXp,
  xpProgressForLevel,
} from "./xp";

describe("xpForAnswer", () => {
  it("grants difficulty-scaled XP for correct answers", () => {
    expect(xpForAnswer({ isCorrect: true, difficulty: 1 })).toBe(5);
    expect(xpForAnswer({ isCorrect: true, difficulty: 2 })).toBe(10);
    expect(xpForAnswer({ isCorrect: true, difficulty: 3 })).toBe(20);
  });

  it("grants a flat 1 XP participation grant for incorrect answers", () => {
    expect(xpForAnswer({ isCorrect: false, difficulty: 1 })).toBe(1);
    expect(xpForAnswer({ isCorrect: false, difficulty: 3 })).toBe(1);
  });

  it("clamps unexpected difficulties into the 1-3 range", () => {
    expect(xpForAnswer({ isCorrect: true, difficulty: 0 })).toBe(5);
    expect(xpForAnswer({ isCorrect: true, difficulty: 9 })).toBe(20);
  });
});

describe("levelForXp", () => {
  it("is level 1 for a new account with 0 XP", () => {
    expect(levelForXp(0)).toBe(1);
  });

  it("reaches level 2 at exactly 100 XP (50*1*2)", () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
  });

  it("reaches level 3 at 300 XP and level 4 at 600", () => {
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(599)).toBe(3);
    expect(levelForXp(600)).toBe(4);
  });

  it("is monotonically non-decreasing", () => {
    let prev = levelForXp(0);
    for (let xp = 0; xp < 5000; xp += 37) {
      const next = levelForXp(xp);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});

describe("xpProgressForLevel", () => {
  it("returns 0/100 at level 1 with 0 XP", () => {
    expect(xpProgressForLevel(0)).toEqual({
      level: 1,
      xpInLevel: 0,
      xpForNextLevel: 100,
    });
  });

  it("returns progress within a level", () => {
    // At 150 XP, user is level 2 (needs 100), 50 XP into level 2.
    // Level 3 needs 300 XP total, i.e. 200 more than level 2 baseline.
    expect(xpProgressForLevel(150)).toEqual({
      level: 2,
      xpInLevel: 50,
      xpForNextLevel: 200,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- xp.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

Path: `unimind/src/server/lib/gamification/xp.ts`

```ts
/**
 * Phase 1 XP + level math. Pure; no DB.
 *
 * XP per correct answer scales with Question.difficulty (1–3):
 *   difficulty 1 →  5 XP
 *   difficulty 2 → 10 XP
 *   difficulty 3 → 20 XP
 * Incorrect answers grant a flat 1 XP participation credit.
 *
 * Level curve: level N requires cumulative XP >= 50 * (N-1) * N.
 * Level 2 = 100 XP, 3 = 300, 4 = 600, 5 = 1000.
 */

const CORRECT_XP_BY_DIFFICULTY: Record<1 | 2 | 3, number> = {
  1: 5,
  2: 10,
  3: 20,
};

const INCORRECT_XP = 1;

export function xpForAnswer({
  isCorrect,
  difficulty,
}: {
  isCorrect: boolean;
  difficulty: number;
}): number {
  if (!isCorrect) return INCORRECT_XP;
  const clamped = Math.min(3, Math.max(1, Math.round(difficulty))) as 1 | 2 | 3;
  return CORRECT_XP_BY_DIFFICULTY[clamped];
}

/** Cumulative XP threshold at which the user first reaches `level`. Level 1 = 0. */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

export function levelForXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Solve N s.t. 50*(N-1)*N <= totalXp. Iterative — bounded; cheap.
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXp) {
    level += 1;
  }
  return level;
}

export function xpProgressForLevel(totalXp: number): {
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
} {
  const level = levelForXp(totalXp);
  const base = xpThresholdForLevel(level);
  const next = xpThresholdForLevel(level + 1);
  return {
    level,
    xpInLevel: totalXp - base,
    xpForNextLevel: next - base,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- xp.test
```

Expected: PASS (3 suites, 9 tests).

- [ ] **Step 5: Commit**

```bash
git add unimind/src/server/lib/gamification/xp.ts unimind/src/server/lib/gamification/xp.test.ts
git commit -m "feat(gamification): xp and level math module"
```

---

## Task 4: Streak module — pure transition

**Files:**
- Create: `unimind/src/server/lib/gamification/streak.ts`
- Test: `unimind/src/server/lib/gamification/streak.test.ts`

Pure function that, given current streak state and today's answer, returns new state. No DB. `question.answer` applies the result.

- [ ] **Step 1: Write the failing tests**

Path: `unimind/src/server/lib/gamification/streak.test.ts`

```ts
import { updateStreak } from "./streak";

const utcDay = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

describe("updateStreak", () => {
  it("starts a new streak at 1 for a first-ever correct answer", () => {
    const result = updateStreak({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      isCorrect: true,
      today: utcDay(0),
    });
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: utcDay(0),
      streakExtended: true,
      streakLost: false,
    });
  });

  it("does nothing on an incorrect answer", () => {
    const result = updateStreak({
      currentStreak: 4,
      longestStreak: 10,
      lastActiveDate: utcDay(-1),
      isCorrect: false,
      today: utcDay(0),
    });
    expect(result).toEqual({
      currentStreak: 4,
      longestStreak: 10,
      lastActiveDate: utcDay(-1),
      streakExtended: false,
      streakLost: false,
    });
  });

  it("keeps the streak unchanged on a second correct answer the same day", () => {
    const result = updateStreak({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDate: utcDay(0),
      isCorrect: true,
      today: utcDay(0),
    });
    expect(result.currentStreak).toBe(5);
    expect(result.streakExtended).toBe(false);
  });

  it("extends the streak by one on a correct answer the day after", () => {
    const result = updateStreak({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDate: utcDay(0),
      isCorrect: true,
      today: utcDay(1),
    });
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
    expect(result.streakExtended).toBe(true);
    expect(result.streakLost).toBe(false);
  });

  it("resets to a new streak of 1 and marks loss when gap > 1 day", () => {
    const result = updateStreak({
      currentStreak: 8,
      longestStreak: 8,
      lastActiveDate: utcDay(0),
      isCorrect: true,
      today: utcDay(3),
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(8);
    expect(result.streakExtended).toBe(true);
    expect(result.streakLost).toBe(true);
  });

  it("updates longestStreak when current surpasses it", () => {
    const result = updateStreak({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDate: utcDay(0),
      isCorrect: true,
      today: utcDay(1),
    });
    expect(result.currentStreak).toBe(8);
    expect(result.longestStreak).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- streak.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

Path: `unimind/src/server/lib/gamification/streak.ts`

```ts
/**
 * Pure streak transition. Rules (spec 2026-04-17-gamification-design.md):
 *
 * - A streak day is a UTC calendar day with at least one CORRECT answer.
 * - Correct answer the same UTC day as lastActiveDate: no change.
 * - Correct answer the UTC day after lastActiveDate: currentStreak += 1.
 * - Correct answer >1 UTC day after lastActiveDate: currentStreak = 1, streakLost = true.
 *   The previous streak value is preserved in longestStreak if it was the max.
 * - Incorrect answer: no change.
 * - longestStreak is updated whenever currentStreak reaches a new max.
 */

export type StreakInput = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  isCorrect: boolean;
  today: Date; // caller supplies UTC day boundary (midnight UTC)
};

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  streakExtended: boolean;
  streakLost: boolean;
};

function utcDaysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((bUtc - aUtc) / MS_PER_DAY);
}

export function updateStreak(input: StreakInput): StreakResult {
  const { currentStreak, longestStreak, lastActiveDate, isCorrect, today } = input;

  if (!isCorrect) {
    return {
      currentStreak,
      longestStreak,
      lastActiveDate: lastActiveDate ?? today,
      streakExtended: false,
      streakLost: false,
    };
  }

  // First-ever correct answer.
  if (lastActiveDate === null) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastActiveDate: today,
      streakExtended: true,
      streakLost: false,
    };
  }

  const gap = utcDaysBetween(lastActiveDate, today);

  if (gap <= 0) {
    // Same UTC day as last activity — no streak change.
    return {
      currentStreak,
      longestStreak,
      lastActiveDate,
      streakExtended: false,
      streakLost: false,
    };
  }

  if (gap === 1) {
    const nextStreak = currentStreak + 1;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      lastActiveDate: today,
      streakExtended: true,
      streakLost: false,
    };
  }

  // gap > 1 — streak broken. Preserve longest, restart at 1.
  return {
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate: today,
    streakExtended: true,
    streakLost: true,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- streak.test
```

Expected: PASS (1 suite, 6 tests).

- [ ] **Step 5: Commit**

```bash
git add unimind/src/server/lib/gamification/streak.ts unimind/src/server/lib/gamification/streak.test.ts
git commit -m "feat(gamification): streak transition module"
```

---

## Task 5: Achievement predicates + progress

**Files:**
- Create: `unimind/src/server/lib/gamification/achievements.ts`
- Test: `unimind/src/server/lib/gamification/achievements.test.ts`

Each achievement `code` maps to a predicate over a context snapshot. The same predicate drives unlock evaluation (boolean) and progress display (0–1 or null). Combinatorial achievements return `null` for progress.

- [ ] **Step 1: Write the failing tests**

Path: `unimind/src/server/lib/gamification/achievements.test.ts`

```ts
import {
  evaluateAchievement,
  getAchievementProgress,
  ALL_ACHIEVEMENT_CODES,
} from "./achievements";

const baseCtx = {
  currentStreak: 0,
  longestStreak: 0,
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  level: 1,
  topicsWithMastery70: 0,
  topicsWithMastery85: 0,
  distinctTopicsPracticed: 0,
  distinctCoursesPracticed: 0,
  justAnsweredDifficulty: 0,
  justAnsweredCorrectly: false,
  hasAnsweredAnyQuestion: false,
};

describe("evaluateAchievement", () => {
  it("STREAK_3 unlocks at currentStreak >= 3", () => {
    expect(evaluateAchievement("STREAK_3", { ...baseCtx, currentStreak: 2 })).toBe(false);
    expect(evaluateAchievement("STREAK_3", { ...baseCtx, currentStreak: 3 })).toBe(true);
    expect(evaluateAchievement("STREAK_3", { ...baseCtx, currentStreak: 10 })).toBe(true);
  });

  it("VOL_100 unlocks at totalCorrectAnswers >= 100", () => {
    expect(evaluateAchievement("VOL_100", { ...baseCtx, totalCorrectAnswers: 99 })).toBe(false);
    expect(evaluateAchievement("VOL_100", { ...baseCtx, totalCorrectAnswers: 100 })).toBe(true);
  });

  it("META_FIRST_ANSWER unlocks on first answered question", () => {
    expect(evaluateAchievement("META_FIRST_ANSWER", baseCtx)).toBe(false);
    expect(
      evaluateAchievement("META_FIRST_ANSWER", { ...baseCtx, hasAnsweredAnyQuestion: true }),
    ).toBe(true);
  });

  it("META_HARD_ANSWER unlocks only on this-answer context (difficulty 3 + correct)", () => {
    expect(
      evaluateAchievement("META_HARD_ANSWER", {
        ...baseCtx,
        justAnsweredDifficulty: 3,
        justAnsweredCorrectly: true,
      }),
    ).toBe(true);
    expect(
      evaluateAchievement("META_HARD_ANSWER", {
        ...baseCtx,
        justAnsweredDifficulty: 3,
        justAnsweredCorrectly: false,
      }),
    ).toBe(false);
  });

  it("BREADTH_2_COURSES unlocks at distinctCoursesPracticed >= 2", () => {
    expect(evaluateAchievement("BREADTH_2_COURSES", { ...baseCtx, distinctCoursesPracticed: 1 })).toBe(false);
    expect(evaluateAchievement("BREADTH_2_COURSES", { ...baseCtx, distinctCoursesPracticed: 2 })).toBe(true);
  });

  it("returns false for an unknown code", () => {
    expect(evaluateAchievement("NO_SUCH_CODE", baseCtx)).toBe(false);
  });
});

describe("getAchievementProgress", () => {
  it("returns 0 for a zeroed context on countable predicates", () => {
    expect(getAchievementProgress("STREAK_3", baseCtx)).toBeCloseTo(0);
    expect(getAchievementProgress("VOL_100", baseCtx)).toBeCloseTo(0);
  });

  it("returns 0.5 when halfway to the target", () => {
    expect(
      getAchievementProgress("STREAK_7", { ...baseCtx, currentStreak: 3 }),
    ).toBeCloseTo(3 / 7, 5);
    expect(
      getAchievementProgress("VOL_1000", { ...baseCtx, totalCorrectAnswers: 500 }),
    ).toBeCloseTo(0.5, 5);
  });

  it("caps at 1 when target is reached or exceeded", () => {
    expect(
      getAchievementProgress("STREAK_3", { ...baseCtx, currentStreak: 10 }),
    ).toBe(1);
  });

  it("returns null for context-only (non-countable) predicates", () => {
    expect(getAchievementProgress("META_HARD_ANSWER", baseCtx)).toBeNull();
  });
});

describe("ALL_ACHIEVEMENT_CODES", () => {
  it("matches every code in the seed catalog", async () => {
    const { ACHIEVEMENTS } = await import("../../../../prisma/achievements-seed");
    const catalogCodes = ACHIEVEMENTS.map((a) => a.code).sort();
    expect([...ALL_ACHIEVEMENT_CODES].sort()).toEqual(catalogCodes);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- achievements.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Path: `unimind/src/server/lib/gamification/achievements.ts`

```ts
/**
 * Achievement predicates. Phase 1. Pure — no DB.
 *
 * `evaluateAchievement(code, ctx)` returns whether the achievement is
 * currently satisfied. The same registry drives progress bars via
 * `getAchievementProgress`, which returns a number in [0, 1] for
 * countable predicates and `null` for combinatorial / context-only ones.
 *
 * The registry must stay in lockstep with `prisma/achievements-seed.ts`;
 * a test in achievements.test.ts enforces code equality.
 */

export type AchievementContext = {
  currentStreak: number;
  longestStreak: number;
  totalCorrectAnswers: number;
  totalQuestionsAnswered: number;
  level: number;
  topicsWithMastery70: number;
  topicsWithMastery85: number;
  distinctTopicsPracticed: number;
  distinctCoursesPracticed: number;
  // Transient — only meaningful for the answer that just happened.
  justAnsweredDifficulty: number;
  justAnsweredCorrectly: boolean;
  hasAnsweredAnyQuestion: boolean;
};

type Predicate = {
  target?: number;
  value: (ctx: AchievementContext) => number | boolean;
};

const REGISTRY: Record<string, Predicate> = {
  STREAK_3:            { target: 3,    value: (c) => c.currentStreak },
  STREAK_7:            { target: 7,    value: (c) => c.currentStreak },
  STREAK_30:           { target: 30,   value: (c) => c.currentStreak },
  VOL_10:              { target: 10,   value: (c) => c.totalCorrectAnswers },
  VOL_100:             { target: 100,  value: (c) => c.totalCorrectAnswers },
  VOL_1000:            { target: 1000, value: (c) => c.totalCorrectAnswers },
  MASTERY_70_ONE:      { target: 1,    value: (c) => c.topicsWithMastery70 },
  MASTERY_85_ONE:      { target: 1,    value: (c) => c.topicsWithMastery85 },
  MASTERY_70_FIVE:     { target: 5,    value: (c) => c.topicsWithMastery70 },
  BREADTH_3_TOPICS:    { target: 3,    value: (c) => c.distinctTopicsPracticed },
  BREADTH_10_TOPICS:   { target: 10,   value: (c) => c.distinctTopicsPracticed },
  BREADTH_2_COURSES:   { target: 2,    value: (c) => c.distinctCoursesPracticed },
  META_FIRST_ANSWER:   { value: (c) => c.hasAnsweredAnyQuestion },
  META_HARD_ANSWER:    {
    value: (c) => c.justAnsweredDifficulty >= 3 && c.justAnsweredCorrectly,
  },
  META_LEVEL_5:        { target: 5, value: (c) => c.level },
};

export const ALL_ACHIEVEMENT_CODES = Object.keys(REGISTRY) as readonly string[];

export function evaluateAchievement(
  code: string,
  ctx: AchievementContext,
): boolean {
  const pred = REGISTRY[code];
  if (!pred) return false;
  const v = pred.value(ctx);
  if (typeof v === "boolean") return v;
  if (pred.target === undefined) return v > 0;
  return v >= pred.target;
}

export function getAchievementProgress(
  code: string,
  ctx: AchievementContext,
): number | null {
  const pred = REGISTRY[code];
  if (!pred) return null;
  const v = pred.value(ctx);
  if (typeof v === "boolean" || pred.target === undefined) return null;
  if (pred.target <= 0) return 1;
  return Math.min(1, Math.max(0, v / pred.target));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- achievements.test
```

Expected: PASS (3 suites, 11 tests). Note the catalog-sync test requires Task 2 to have been committed.

- [ ] **Step 5: Commit**

```bash
git add unimind/src/server/lib/gamification/achievements.ts unimind/src/server/lib/gamification/achievements.test.ts
git commit -m "feat(gamification): achievement predicate registry with progress"
```

---

## Task 6: Analytics event writer

**Files:**
- Create: `unimind/src/server/lib/gamification/analytics.ts`

Best-effort, fire-and-forget. Used by `question.answer` after the main transaction commits. Errors are swallowed and console-warned.

- [ ] **Step 1: Create the module**

Path: `unimind/src/server/lib/gamification/analytics.ts`

```ts
import type { PrismaClient } from "../../../../generated/prisma";

/**
 * Best-effort analytics event writer. NEVER throws — errors are swallowed
 * and logged. Called OUTSIDE the question.answer $transaction so that
 * analytics failure cannot fail a user's answer.
 */
export async function logAnalyticsEvent(
  db: PrismaClient,
  args: {
    userId: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        userId: args.userId,
        eventType: args.eventType,
        payload: args.payload ?? undefined,
      },
    });
  } catch (err) {
    console.warn("[analytics] failed to write event", args.eventType, err);
  }
}

export const ANALYTICS_EVENTS = {
  PAYWALL_SHOWN: "paywall_shown",
  PAYWALL_ANSWERED: "paywall_answered",
  STREAK_EXTENDED: "streak_extended",
  STREAK_LOST: "streak_lost",
  LEVEL_UP: "level_up",
  ACHIEVEMENT_EARNED: "achievement_earned",
  PERCENTILE_SHOWN: "percentile_shown",
} as const;
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/server/lib/gamification/analytics.ts
git commit -m "feat(gamification): best-effort analytics event writer"
```

---

## Task 7: Barrel export for the gamification module

**Files:**
- Create: `unimind/src/server/lib/gamification/index.ts`

- [ ] **Step 1: Create the barrel**

Path: `unimind/src/server/lib/gamification/index.ts`

```ts
export {
  xpForAnswer,
  levelForXp,
  xpThresholdForLevel,
  xpProgressForLevel,
} from "./xp";

export { updateStreak, type StreakInput, type StreakResult } from "./streak";

export {
  evaluateAchievement,
  getAchievementProgress,
  ALL_ACHIEVEMENT_CODES,
  type AchievementContext,
} from "./achievements";

export { logAnalyticsEvent, ANALYTICS_EVENTS } from "./analytics";
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/server/lib/gamification/index.ts
git commit -m "chore(gamification): barrel export"
```

---

## Task 8: Extend `question.answer` with XP, level, and streak updates

**Files:**
- Modify: `unimind/src/server/api/routers/question.ts` (the `answer` mutation, lines 101–275)

Inside the existing `$transaction`, after the `userStats.upsert` block (line 263), compute XP, level, and streak updates and write them. The existing mutation already knows `isCorrect`, `userId`, `today`, and `now`.

- [ ] **Step 1: Add imports**

At the top of `unimind/src/server/api/routers/question.ts`, extend the gamification-adjacent import:

```ts
import {
  applyAnswer,
  applyMastery,
  pickNextQuestionId,
} from "~/server/lib/scoring";
import {
  xpForAnswer,
  levelForXp,
  updateStreak,
} from "~/server/lib/gamification";
```

- [ ] **Step 2: Fetch `difficulty` in the pre-transaction question lookup**

Modify the `ctx.db.question.findUnique` near line 119 to include `difficulty`:

```ts
const question = await ctx.db.question.findUnique({
  where: { id: input.questionId },
  select: {
    id: true,
    topicId: true,
    answerIndex: true,
    explanation: true,
    difficulty: true,                 // NEW
    topic: { select: { name: true } },
  },
});
```

- [ ] **Step 3: Replace the `userStats.upsert` block with a compute-then-upsert pattern**

Currently (lines 248–263) the block increments simple counters but does not compute XP, level, or streak. Replace it with:

```ts
// 6. Compute XP / level / streak from the existing UserStats row.
const existingStats = await tx.userStats.findUnique({
  where: { userId },
  select: {
    xp: true,
    level: true,
    currentStreak: true,
    longestStreak: true,
    lastActiveDate: true,
  },
});

const xpDelta = xpForAnswer({
  isCorrect,
  difficulty: question.difficulty,
});
const newXp = (existingStats?.xp ?? 0) + xpDelta;
const newLevel = levelForXp(newXp);
const leveledUp = newLevel > (existingStats?.level ?? 1);

const streak = updateStreak({
  currentStreak: existingStats?.currentStreak ?? 0,
  longestStreak: existingStats?.longestStreak ?? 0,
  lastActiveDate: existingStats?.lastActiveDate ?? null,
  isCorrect,
  today,
});

await tx.userStats.upsert({
  where: { userId },
  create: {
    userId,
    totalQuestionsAnswered: 1,
    totalCorrectAnswers: isCorrect ? 1 : 0,
    totalTimeSpent: input.timeSpentMs,
    xp: xpDelta,
    level: levelForXp(xpDelta),
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActiveDate: streak.lastActiveDate,
  },
  update: {
    totalQuestionsAnswered: { increment: 1 },
    totalCorrectAnswers: { increment: isCorrect ? 1 : 0 },
    totalTimeSpent: { increment: input.timeSpentMs },
    xp: newXp,
    level: newLevel,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActiveDate: streak.lastActiveDate,
  },
});
```

- [ ] **Step 4: Return XP / level / streak signals from the mutation**

Extend the transaction `return` (currently `{ userTopic, nextDue }`) and the outer `return` (currently `{ isCorrect, answerIndex, explanation, userTopic, nextDue }`) to surface the new signals for the client toast UI.

Replace the inner `return`:

```ts
return {
  userTopic,
  nextDue: card.due,
  xpDelta,
  newXp,
  newLevel,
  leveledUp,
  streakExtended: streak.streakExtended,
  streakLost: streak.streakLost,
  currentStreak: streak.currentStreak,
  longestStreak: streak.longestStreak,
};
```

Replace the outer `return`:

```ts
return {
  isCorrect,
  answerIndex: question.answerIndex,
  explanation: question.explanation,
  userTopic: result.userTopic,
  nextDue: result.nextDue,
  xpDelta: result.xpDelta,
  newXp: result.newXp,
  newLevel: result.newLevel,
  leveledUp: result.leveledUp,
  streakExtended: result.streakExtended,
  streakLost: result.streakLost,
  currentStreak: result.currentStreak,
  longestStreak: result.longestStreak,
};
```

- [ ] **Step 5: Typecheck and test**

```bash
npm run typecheck
npm test
```

Expected: no typecheck errors; all existing tests pass.

- [ ] **Step 6: Manual smoke (dev server)**

```bash
npm run dev
```

Answer a question in the UI; verify (via Prisma Studio or a console log) that `UserStats.xp` and `currentStreak` are now non-zero. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add unimind/src/server/api/routers/question.ts
git commit -m "feat(gamification): write xp, level, and streak inside question.answer"
```

---

## Task 9: Evaluate achievements inside `question.answer`

**Files:**
- Modify: `unimind/src/server/api/routers/question.ts` (the `answer` mutation, inside the `$transaction`)

After the `userStats.upsert` added in Task 8, compute the `AchievementContext`, evaluate all codes, insert new `UserAchievement` rows for first-time earns, and grant bonus XP (simple second stats-update).

- [ ] **Step 1: Extend imports**

Replace the gamification import:

```ts
import {
  xpForAnswer,
  levelForXp,
  updateStreak,
  evaluateAchievement,
  ALL_ACHIEVEMENT_CODES,
  type AchievementContext,
} from "~/server/lib/gamification";
```

- [ ] **Step 2: After the `userStats.upsert`, gather context and evaluate**

Insert after the `userStats.upsert` block:

```ts
// 7. Achievement evaluation. Build a post-answer context snapshot,
// evaluate every registered predicate, and insert UserAchievement rows
// for previously-unearned codes. Earned XP rewards are summed and
// applied in a single stats patch below.
const [
  topicAggregates,
  distinctTopicsCount,
  distinctCoursesCount,
  totalAnswersAgg,
  alreadyEarned,
] = await Promise.all([
  tx.userTopic.findMany({
    where: { userId },
    select: { masteryScore: true },
  }),
  tx.userTopic.count({ where: { userId } }),
  tx.userCourse.count({ where: { userId } }),
  tx.userStats.findUnique({
    where: { userId },
    select: { totalCorrectAnswers: true, totalQuestionsAnswered: true },
  }),
  tx.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { code: true } } },
  }),
]);

const ctxForAchievements: AchievementContext = {
  currentStreak: streak.currentStreak,
  longestStreak: streak.longestStreak,
  totalCorrectAnswers: totalAnswersAgg?.totalCorrectAnswers ?? 0,
  totalQuestionsAnswered: totalAnswersAgg?.totalQuestionsAnswered ?? 0,
  level: newLevel,
  topicsWithMastery70: topicAggregates.filter((t) => t.masteryScore >= 70).length,
  topicsWithMastery85: topicAggregates.filter((t) => t.masteryScore >= 85).length,
  distinctTopicsPracticed: distinctTopicsCount,
  distinctCoursesPracticed: distinctCoursesCount,
  justAnsweredDifficulty: question.difficulty,
  justAnsweredCorrectly: isCorrect,
  hasAnsweredAnyQuestion: (totalAnswersAgg?.totalQuestionsAnswered ?? 0) > 0,
};

const earnedCodes = new Set(alreadyEarned.map((r) => r.achievement.code));
const newlyEarnedCodes: string[] = [];
let bonusXp = 0;

for (const code of ALL_ACHIEVEMENT_CODES) {
  if (earnedCodes.has(code)) continue;
  if (!evaluateAchievement(code, ctxForAchievements)) continue;
  const row = await tx.achievement.findUnique({
    where: { code },
    select: { id: true, xpReward: true },
  });
  if (!row) continue;
  await tx.userAchievement.create({
    data: { userId, achievementId: row.id },
  });
  newlyEarnedCodes.push(code);
  bonusXp += row.xpReward;
}

let finalXp = newXp;
let finalLevel = newLevel;
let finalLeveledUp = leveledUp;
if (bonusXp > 0) {
  finalXp = newXp + bonusXp;
  finalLevel = levelForXp(finalXp);
  finalLeveledUp = finalLevel > (existingStats?.level ?? 1);
  await tx.userStats.update({
    where: { userId },
    data: { xp: finalXp, level: finalLevel },
  });
}
```

- [ ] **Step 3: Update the inner `return` to surface achievement signals and the final XP/level**

```ts
return {
  userTopic,
  nextDue: card.due,
  xpDelta: xpDelta + bonusXp,
  newXp: finalXp,
  newLevel: finalLevel,
  leveledUp: finalLeveledUp,
  streakExtended: streak.streakExtended,
  streakLost: streak.streakLost,
  currentStreak: streak.currentStreak,
  longestStreak: streak.longestStreak,
  newlyEarnedCodes,
};
```

Extend the outer return similarly, adding `newlyEarnedCodes: result.newlyEarnedCodes`.

- [ ] **Step 4: Typecheck and test**

```bash
npm run typecheck
npm test
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add unimind/src/server/api/routers/question.ts
git commit -m "feat(gamification): evaluate and unlock achievements on each answer"
```

---

## Task 10: Fire-and-forget analytics writes after `question.answer`

**Files:**
- Modify: `unimind/src/server/api/routers/question.ts`

Analytics writes are OUTSIDE the transaction (see spec: failures must not fail an answer). Happens in the mutation body after `await ctx.db.$transaction(...)` returns.

- [ ] **Step 1: Import analytics helper**

```ts
import {
  xpForAnswer,
  levelForXp,
  updateStreak,
  evaluateAchievement,
  ALL_ACHIEVEMENT_CODES,
  type AchievementContext,
  logAnalyticsEvent,
  ANALYTICS_EVENTS,
} from "~/server/lib/gamification";
```

- [ ] **Step 2: After `const result = await ctx.db.$transaction(...)` resolves, fire the events**

Insert before the final outer `return`:

```ts
// Best-effort analytics. Do not await (fire-and-forget).
void logAnalyticsEvent(ctx.db, {
  userId,
  eventType: ANALYTICS_EVENTS.PAYWALL_ANSWERED,
  payload: {
    isCorrect,
    difficulty: question.difficulty,
    xpGranted: result.xpDelta,
    source: input.source,
  },
});

if (result.streakExtended) {
  void logAnalyticsEvent(ctx.db, {
    userId,
    eventType: ANALYTICS_EVENTS.STREAK_EXTENDED,
    payload: { length: result.currentStreak },
  });
}
if (result.streakLost) {
  void logAnalyticsEvent(ctx.db, {
    userId,
    eventType: ANALYTICS_EVENTS.STREAK_LOST,
    payload: { priorLongest: result.longestStreak },
  });
}
if (result.leveledUp) {
  void logAnalyticsEvent(ctx.db, {
    userId,
    eventType: ANALYTICS_EVENTS.LEVEL_UP,
    payload: { toLevel: result.newLevel },
  });
}
for (const code of result.newlyEarnedCodes) {
  void logAnalyticsEvent(ctx.db, {
    userId,
    eventType: ANALYTICS_EVENTS.ACHIEVEMENT_EARNED,
    payload: { code },
  });
}
```

- [ ] **Step 3: Typecheck and test**

```bash
npm run typecheck
npm test
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add unimind/src/server/api/routers/question.ts
git commit -m "feat(gamification): write analytics events fire-and-forget after answer"
```

---

## Task 11: Anonymous weekly percentile tRPC procedure

**Files:**
- Modify: `unimind/src/server/api/routers/user.ts`

New `weeklyPercentile` query returns `{ percentile: number; cohortSize: number } | null`. Returns `null` when cohort size is below 20 or user is at/below the median.

- [ ] **Step 1: Add the procedure**

Append to the end of the `createTRPCRouter({ … })` call (after `enrollCourses`):

```ts
  weeklyPercentile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);

    const rows = await ctx.db.$queryRaw<{ userId: string; count: bigint }[]>`
      SELECT "userId", COUNT(*)::bigint AS count
      FROM "question_attempts"
      WHERE "answeredAt" > ${weekAgo}
      GROUP BY "userId";
    `;

    const cohortSize = rows.length;
    if (cohortSize < 20) return null;

    const userRow = rows.find((r) => r.userId === userId);
    const userCount = userRow ? Number(userRow.count) : 0;

    const belowOrEqual = rows.filter((r) => Number(r.count) <= userCount).length;
    const percentile = Math.round((belowOrEqual / cohortSize) * 100);

    if (percentile < 50) return null;

    return { percentile, cohortSize };
  }),
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add unimind/src/server/api/routers/user.ts
git commit -m "feat(gamification): add user.weeklyPercentile procedure"
```

---

## Task 12: `achievement.listForUser` tRPC procedure

**Files:**
- Create: `unimind/src/server/api/routers/achievement.ts`
- Modify: `unimind/src/server/api/root.ts`

Returns `{ earned, locked }` with progress computed from the shared `AchievementContext` snapshot.

- [ ] **Step 1: Create the router**

Path: `unimind/src/server/api/routers/achievement.ts`

```ts
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  evaluateAchievement,
  getAchievementProgress,
  type AchievementContext,
} from "~/server/lib/gamification";

export const achievementRouter = createTRPCRouter({
  listForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [allAchievements, earnedRows, stats, userTopics, distinctCourses] =
      await Promise.all([
        ctx.db.achievement.findMany({
          orderBy: [{ category: "asc" }, { tier: "asc" }, { code: "asc" }],
        }),
        ctx.db.userAchievement.findMany({
          where: { userId },
          select: { achievementId: true, earnedAt: true },
        }),
        ctx.db.userStats.findUnique({
          where: { userId },
          select: {
            xp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            totalCorrectAnswers: true,
            totalQuestionsAnswered: true,
          },
        }),
        ctx.db.userTopic.findMany({
          where: { userId },
          select: { masteryScore: true },
        }),
        ctx.db.userCourse.count({ where: { userId } }),
      ]);

    const earnedById = new Map(
      earnedRows.map((r) => [r.achievementId, r.earnedAt]),
    );

    const snapshot: AchievementContext = {
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      totalCorrectAnswers: stats?.totalCorrectAnswers ?? 0,
      totalQuestionsAnswered: stats?.totalQuestionsAnswered ?? 0,
      level: stats?.level ?? 1,
      topicsWithMastery70: userTopics.filter((t) => t.masteryScore >= 70).length,
      topicsWithMastery85: userTopics.filter((t) => t.masteryScore >= 85).length,
      distinctTopicsPracticed: userTopics.length,
      distinctCoursesPracticed: distinctCourses,
      // Context-only predicates cannot be "close" — treat as all-or-nothing.
      justAnsweredDifficulty: 0,
      justAnsweredCorrectly: false,
      hasAnsweredAnyQuestion: (stats?.totalQuestionsAnswered ?? 0) > 0,
    };

    const earned: Array<{
      achievement: (typeof allAchievements)[number];
      earnedAt: Date;
    }> = [];
    const locked: Array<{
      achievement: (typeof allAchievements)[number];
      progress: number | null;
    }> = [];

    for (const a of allAchievements) {
      const earnedAt = earnedById.get(a.id);
      if (earnedAt) {
        earned.push({ achievement: a, earnedAt });
      } else {
        locked.push({
          achievement: a,
          progress: getAchievementProgress(a.code, snapshot),
        });
      }
    }

    earned.sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());

    return {
      earned,
      locked,
      totalCount: allAchievements.length,
      xpFromAchievements: earned.reduce(
        (sum, e) => sum + (e.achievement.xpReward ?? 0),
        0,
      ),
    };
  }),
});
```

- [ ] **Step 2: Register in root router**

Modify `unimind/src/server/api/root.ts`:

```ts
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { topicRouter } from "./routers/topic";
import { questionRouter } from "./routers/question";
import { assessmentRouter } from "./routers/assessment";
import { courseRouter } from "./routers/course";
import { userRouter } from "./routers/user";
import { achievementRouter } from "./routers/achievement";

export const appRouter = createTRPCRouter({
  user: userRouter,
  assessment: assessmentRouter,
  course: courseRouter,
  topic: topicRouter,
  question: questionRouter,
  achievement: achievementRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add unimind/src/server/api/routers/achievement.ts unimind/src/server/api/root.ts
git commit -m "feat(gamification): achievement.listForUser procedure"
```

---

## Task 13: Extend `user.dashboardStats` with achievement rail data and percentile

**Files:**
- Modify: `unimind/src/server/api/routers/user.ts`

Add a small, dashboard-specific slice: the 3 most-recent earned and the 3 next-closest unearned. Reuses the same predicates.

- [ ] **Step 1: Import the gamification helpers**

Add near the existing `readMastery` import at the top:

```ts
import { readMastery } from "~/server/lib/scoring";
import {
  getAchievementProgress,
  type AchievementContext,
} from "~/server/lib/gamification";
```

- [ ] **Step 2: Inside `dashboardStats`, fetch achievement state**

Just before the final `return` inside `dashboardStats`, compute and attach the rail data. Insert this block right after the `topicMastery` computation:

```ts
const [allAchievements, earnedRows, distinctCoursesCount] = await Promise.all([
  ctx.db.achievement.findMany({
    orderBy: [{ category: "asc" }, { tier: "asc" }, { code: "asc" }],
  }),
  ctx.db.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
    take: 3,
    include: {
      achievement: {
        select: { id: true, code: true, name: true, description: true, iconKey: true, xpReward: true },
      },
    },
  }),
  ctx.db.userCourse.count({ where: { userId } }),
]);

const earnedIdSet = new Set(
  await ctx.db.userAchievement
    .findMany({ where: { userId }, select: { achievementId: true } })
    .then((rs) => rs.map((r) => r.achievementId)),
);

const snapshot: AchievementContext = {
  currentStreak: userStats?.currentStreak ?? 0,
  longestStreak: userStats?.longestStreak ?? 0,
  totalCorrectAnswers: userStats?.totalCorrectAnswers ?? 0,
  totalQuestionsAnswered: userStats?.totalQuestionsAnswered ?? 0,
  level: userStats?.level ?? 1,
  topicsWithMastery70: userTopics.filter((t) => t.masteryScore >= 70).length,
  topicsWithMastery85: userTopics.filter((t) => t.masteryScore >= 85).length,
  distinctTopicsPracticed: userTopics.length,
  distinctCoursesPracticed: distinctCoursesCount,
  justAnsweredDifficulty: 0,
  justAnsweredCorrectly: false,
  hasAnsweredAnyQuestion: (userStats?.totalQuestionsAnswered ?? 0) > 0,
};

const nextClosest = allAchievements
  .filter((a) => !earnedIdSet.has(a.id))
  .map((a) => ({
    achievement: {
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      iconKey: a.iconKey,
      xpReward: a.xpReward,
    },
    progress: getAchievementProgress(a.code, snapshot),
  }))
  .filter((x) => x.progress !== null)
  .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
  .slice(0, 3);

const recentEarned = earnedRows.map((r) => ({
  achievement: r.achievement,
  earnedAt: r.earnedAt,
}));
```

And also select `totalCorrectAnswers` and `totalQuestionsAnswered` on the existing `userStats` fetch — modify the `Promise.all` earlier in the function so `userStats` includes those fields.

- [ ] **Step 3: Extend the returned payload**

```ts
return {
  topicsStarted,
  topicsCoveredThisWeek,
  totalAnswers,
  accuracy,
  currentStreak: userStats?.currentStreak ?? 0,
  longestStreak: userStats?.longestStreak ?? 0,
  level: userStats?.level ?? 1,
  xp: userStats?.xp ?? 0,
  topicMastery,
  calibrationThreshold: CALIBRATION_THRESHOLD,
  recentEarned,
  nextClosest,
};
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add unimind/src/server/api/routers/user.ts
git commit -m "feat(gamification): extend dashboardStats with recent and next-closest achievements"
```

---

## Task 14: Dashboard hero — replace `Level` tile with a progress-bar tile

**Files:**
- Modify: `unimind/src/app/dashboard/page.tsx`

The existing `Level` tile shows `L1` and `0 XP`. Replace it with a tile that shows level, progress-within-level, and the XP-to-next number.

- [ ] **Step 1: Import the progress helper at the top of the file**

```ts
import { Flame, Sparkles } from "lucide-react";
import { api } from "~/trpc/server";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { PreviewQuestion } from "./preview-question";
import { Greeting } from "./greeting";
import { xpProgressForLevel } from "~/server/lib/gamification";
```

- [ ] **Step 2: Compute progress before building `tiles`**

Just before the `const tiles = [` definition:

```ts
const { level, xpInLevel, xpForNextLevel } = xpProgressForLevel(stats.xp);
const xpPct = xpForNextLevel === 0 ? 100 : Math.round((xpInLevel / xpForNextLevel) * 100);
```

- [ ] **Step 3: Replace the existing `Level` tile with the progress version**

Replace this tile (lines around 62–68):

```ts
    {
      label: "Level",
      value: `L${stats.level}`,
      delta: `${stats.xp} XP`,
      tone: "phosphor" as const,
      icon: null,
    },
```

with:

```ts
    {
      label: "Level",
      value: `L${level}`,
      delta: `${xpInLevel} / ${xpForNextLevel} XP`,
      tone: "phosphor" as const,
      icon: null,
      bar: { pct: xpPct, color: "var(--color-phosphor)" } as const,
    },
```

And update the tile render block to render an optional progress bar. Replace the `section` tiles map (lines around 108–129) with:

```tsx
        <section className="mt-8 grid grid-cols-2 gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] md:grid-cols-3 lg:grid-cols-5">
          {tiles.map((s, i) => (
            <div
              key={s.label}
              className="term-rise bg-[color:var(--color-panel)] px-5 py-5"
              style={{ animationDelay: `${60 + i * 60}ms` }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                {s.label}
              </div>
              <div
                className="mt-2 inline-flex items-center gap-2 font-mono text-[36px] font-semibold leading-none tabular-nums"
                style={{ color: `var(--color-${s.tone})` }}
              >
                {s.icon && <s.icon className="h-7 w-7" strokeWidth={2} fill="currentColor" />}
                {s.value}
              </div>
              <div className="mt-2 font-sans text-[11.5px] text-[color:var(--color-fg-mute)]">
                {s.delta}
              </div>
              {"bar" in s && s.bar && (
                <div className="mt-2 h-1 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                  <div
                    className="h-full"
                    style={{ width: `${s.bar.pct}%`, background: s.bar.color }}
                  />
                </div>
              )}
            </div>
          ))}
        </section>
```

- [ ] **Step 4: Typecheck + dev-server smoke**

```bash
npm run typecheck
npm run dev
```

Confirm the dashboard still renders and the Level tile shows `0 / 100 XP` on a fresh account. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add unimind/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): level tile shows XP progress to next level"
```

---

## Task 15: Dashboard achievements rail + percentile line

**Files:**
- Modify: `unimind/src/app/dashboard/page.tsx`

Add two new UI blocks between the tile row and the existing 12-col grid.

- [ ] **Step 1: Fetch percentile**

Extend the initial `Promise.all` in `Dashboard()`:

```ts
const [stats, nextQuestion, percentile] = await Promise.all([
  api.user.dashboardStats(),
  api.question.forMe(),
  api.user.weeklyPercentile(),
]);
```

- [ ] **Step 2: Insert the rail + percentile markup**

After the `</section>` that closes the tiles grid (around line 130) and before `<section className="mt-8 grid grid-cols-12 gap-4">`, insert:

```tsx
        <section className="mt-8 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <SectionHead title="Achievements" hint="recent & next" />
            <div className="mt-3 grid grid-cols-1 gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentEarned.map((e) => (
                <div
                  key={e.achievement.id}
                  className="bg-[color:var(--color-panel)] p-4"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-phosphor)]">
                    Earned · {e.earnedAt.toISOString().slice(0, 10)}
                  </div>
                  <div className="mt-1 font-mono text-[14px] text-[color:var(--color-fg)]">
                    {e.achievement.name}
                  </div>
                  <div className="mt-0.5 font-sans text-[11.5px] text-[color:var(--color-fg-mute)]">
                    {e.achievement.description}
                  </div>
                </div>
              ))}
              {stats.nextClosest.map((x) => {
                const pct = Math.round((x.progress ?? 0) * 100);
                return (
                  <div
                    key={x.achievement.id}
                    className="bg-[color:var(--color-panel)] p-4 opacity-80"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-mute)]">
                      Locked · {pct}%
                    </div>
                    <div className="mt-1 font-mono text-[14px] text-[color:var(--color-fg-soft)]">
                      {x.achievement.name}
                    </div>
                    <div className="mt-0.5 font-sans text-[11.5px] text-[color:var(--color-fg-mute)]">
                      {x.achievement.description}
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                      <div
                        className="h-full bg-[color:var(--color-cyan)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.recentEarned.length === 0 && stats.nextClosest.length === 0 && (
                <div className="bg-[color:var(--color-panel)] p-6 text-center font-sans text-[13px] text-[color:var(--color-fg-mute)] sm:col-span-2 lg:col-span-3">
                  Answer a question to start earning achievements.
                </div>
              )}
            </div>
            <div className="mt-2 text-right">
              <a
                href="/achievements"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cyan)] hover:underline"
              >
                View all →
              </a>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <SectionHead title="Standing" />
            <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-5">
              {percentile ? (
                <>
                  <div className="font-mono text-[28px] tabular-nums text-[color:var(--color-cyan)]">
                    Top {100 - percentile.percentile}%
                  </div>
                  <div className="mt-1 font-sans text-[12px] text-[color:var(--color-fg-mute)]">
                    More answers this week than {percentile.percentile}% of {percentile.cohortSize} active users.
                  </div>
                </>
              ) : (
                <div className="font-sans text-[12px] text-[color:var(--color-fg-mute)]">
                  Percentile appears once at least 20 users practise in a week.
                </div>
              )}
            </div>
          </div>
        </section>
```

- [ ] **Step 3: Typecheck and smoke**

```bash
npm run typecheck
npm run dev
```

Dashboard should render with an empty achievements row and a "Percentile appears once…" card. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add unimind/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): achievements rail and percentile standing card"
```

---

## Task 16: `/achievements` page — full gallery

**Files:**
- Create: `unimind/src/app/achievements/page.tsx`
- Create: `unimind/src/app/achievements/achievements-grid.tsx`

Server component fetches data; a small client component handles the category/locked-only filter interaction.

- [ ] **Step 1: Server page**

Path: `unimind/src/app/achievements/page.tsx`

```tsx
import { api } from "~/trpc/server";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { AchievementsGrid } from "./achievements-grid";

export default async function AchievementsPage() {
  const data = await api.achievement.listForUser();

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Unimind <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Achievements</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            Collection
          </div>
          <h1 className="mt-1 font-mono text-[22px] font-semibold text-[color:var(--color-fg)]">
            {data.earned.length} / {data.totalCount} unlocked
            <span className="ml-3 text-[color:var(--color-fg-mute)]">
              · {data.xpFromAchievements} XP earned
            </span>
          </h1>
        </section>

        <AchievementsGrid data={data} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Client grid**

Path: `unimind/src/app/achievements/achievements-grid.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import type { RouterOutputs } from "~/trpc/react";

type Data = RouterOutputs["achievement"]["listForUser"];

const CATEGORIES = ["all", "streak", "volume", "mastery", "breadth", "meta"] as const;
type Category = (typeof CATEGORIES)[number];

export function AchievementsGrid({ data }: { data: Data }) {
  const [category, setCategory] = useState<Category>("all");
  const [lockedOnly, setLockedOnly] = useState(false);

  const tiles = useMemo(() => {
    const earned = data.earned.map((e) => ({
      kind: "earned" as const,
      achievement: e.achievement,
      earnedAt: e.earnedAt,
      progress: 1,
    }));
    const locked = data.locked.map((l) => ({
      kind: "locked" as const,
      achievement: l.achievement,
      earnedAt: null,
      progress: l.progress,
    }));
    let merged = [...earned, ...locked];
    if (category !== "all") {
      merged = merged.filter((t) => t.achievement.category === category);
    }
    if (lockedOnly) {
      merged = merged.filter((t) => t.kind === "locked");
    }
    return merged;
  }, [data, category, lockedOnly]);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={
              "font-mono text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 border " +
              (category === c
                ? "border-[color:var(--color-cyan)] text-[color:var(--color-cyan)]"
                : "border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)] hover:text-[color:var(--color-fg)]")
            }
          >
            {c}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
          <input
            type="checkbox"
            checked={lockedOnly}
            onChange={(e) => setLockedOnly(e.target.checked)}
          />
          Locked only
        </label>
      </div>

      <section className="mt-4 grid grid-cols-1 gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const pct = t.progress === null ? null : Math.round(t.progress * 100);
          return (
            <div
              key={t.achievement.id}
              className={
                "bg-[color:var(--color-panel)] p-4 " +
                (t.kind === "locked" ? "opacity-75" : "")
              }
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em]">
                <span className="text-[color:var(--color-fg-mute)]">
                  {t.achievement.category} · tier {t.achievement.tier}
                </span>
                <span
                  style={{
                    color:
                      t.kind === "earned"
                        ? "var(--color-phosphor)"
                        : "var(--color-fg-mute)",
                  }}
                >
                  {t.kind === "earned"
                    ? `Earned · ${t.earnedAt!.toISOString().slice(0, 10)}`
                    : pct === null
                      ? "Locked"
                      : `Locked · ${pct}%`}
                </span>
              </div>
              <div className="mt-2 font-mono text-[15px] text-[color:var(--color-fg)]">
                {t.achievement.name}
              </div>
              <div className="mt-1 font-sans text-[12.5px] text-[color:var(--color-fg-mute)]">
                {t.achievement.description}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-amber)]">
                +{t.achievement.xpReward} XP
              </div>
              {t.kind === "locked" && pct !== null && (
                <div className="mt-2 h-1 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                  <div
                    className="h-full bg-[color:var(--color-cyan)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {tiles.length === 0 && (
        <div className="mt-4 border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-10 text-center font-sans text-[13px] text-[color:var(--color-fg-soft)]">
          No achievements match this filter.
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Typecheck and smoke**

```bash
npm run typecheck
npm run dev
```

Visit `http://localhost:3000/achievements`. Confirm 15 tiles render, category filters work, "Locked only" works.

- [ ] **Step 4: Commit**

```bash
git add unimind/src/app/achievements
git commit -m "feat(achievements): /achievements page with filterable gallery"
```

---

## Task 17: Answer-flow toasts (XP, level-up, achievement earn)

**Files:**
- Modify: `unimind/src/app/dashboard/preview-question.tsx`

The `answer` mutation now returns `xpDelta`, `leveledUp`, `newLevel`, `newlyEarnedCodes`. Surface them as transient banners after the user answers. Minimal, on-brand (no third-party toast lib).

- [ ] **Step 1: Read the file for the existing answer-flow structure**

```bash
ls unimind/src/app/dashboard/preview-question.tsx
```

Inspect the file to find where the `answer.mutateAsync` result is consumed. Store the last result in local state (`useState<LastResult | null>`) and render a small banner under the explanation block.

- [ ] **Step 2: Extend the state and render**

Add (patterning follows the existing useState usage in the file):

```tsx
type AnswerFlash = {
  xpDelta: number;
  leveledUp: boolean;
  newLevel: number;
  earned: string[];
};

const [flash, setFlash] = useState<AnswerFlash | null>(null);
```

Where the mutation result is consumed, set the flash:

```tsx
setFlash({
  xpDelta: result.xpDelta,
  leveledUp: result.leveledUp,
  newLevel: result.newLevel,
  earned: result.newlyEarnedCodes,
});
```

Render the flash inside the explanation / feedback block:

```tsx
{flash && (
  <div className="mt-3 flex flex-wrap items-center gap-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em]">
    <span className="text-[color:var(--color-phosphor)]">+{flash.xpDelta} XP</span>
    {flash.leveledUp && (
      <span className="text-[color:var(--color-amber)]">Level {flash.newLevel} ↑</span>
    )}
    {flash.earned.map((code) => (
      <span key={code} className="text-[color:var(--color-cyan)]">
        🏅 {code}
      </span>
    ))}
  </div>
)}
```

(Achievement code is surfaced as a placeholder; the dashboard rail will show the full name on next load. Keep the flash minimal.)

- [ ] **Step 3: Typecheck + smoke**

```bash
npm run typecheck
npm run dev
```

Answer a question, see the flash with the XP and (for the first-ever correct answer) `META_FIRST_ANSWER`.

- [ ] **Step 4: Commit**

```bash
git add unimind/src/app/dashboard/preview-question.tsx
git commit -m "feat(dashboard): flash XP, level-up, and earned-achievement after answer"
```

---

## Task 18: End-to-end manual verification

**Files:** none

Browser-based sanity check that the full system works on a fresh account. Run from `unimind/`.

- [ ] **Step 1: Reset the dev database and re-seed**

```bash
npm run db:push
npm run db:seed
```

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Smoke the flow**

1. Sign up a brand new user.
2. Enrol in one course on `/onboarding/courses`.
3. Land on dashboard — confirm: Level tile shows `L1 · 0 / 100 XP`, streak tile `0d`, Standing card shows "Percentile appears once…", Achievements rail shows "Answer a question to start earning".
4. Answer one question correctly (any difficulty). Confirm the flash shows `+5/10/20 XP`, `META_FIRST_ANSWER` appears.
5. Reload dashboard. Confirm: Level tile XP bar moved, Achievements rail shows `First Step` earned, next-closest cards appear.
6. Visit `/achievements`. Confirm: `1 / 15 unlocked`, filter tabs work, Locked-only toggle works.
7. Answer more questions; observe streak, XP, and additional achievements (e.g. `VOL_10` at 10 correct).

- [ ] **Step 4: Commit a note acknowledging verification (optional)**

No code change. If the verification passes cleanly, the branch is ready for PR.

---

## Self-Review

**Spec coverage check:**
- Assumptions ✓ (Task 1–18 collectively preserve existing scoring, wire dormant columns, add tables)
- XP + level curve ✓ (Task 3)
- Difficulty-weighted XP ✓ (Task 3)
- Streak rules incl. longest-ever badge ✓ (Task 4, Task 8)
- Achievement registry + seed + unlock + progress ✓ (Tasks 2, 5, 9, 12)
- Anonymous percentile ✓ (Task 11)
- `dashboardStats` extension ✓ (Task 13)
- `/achievements` page ✓ (Task 16)
- Dashboard rail + percentile line ✓ (Task 15)
- Answer-flow toasts ✓ (Task 17)
- Analytics event log (placeholder) ✓ (Tasks 6, 10)
- Paywall UI — deliberately out of scope (extension does not exist).

**Placeholder scan:** None. All code steps include the full code. Test code is included for every TDD module.

**Type consistency:** `AchievementContext` shape is defined once in `achievements.ts` (Task 5) and reused in `question.ts` (Task 9), `achievement.ts` router (Task 12), and `user.ts` router (Task 13). Function names match across tasks. `ALL_ACHIEVEMENT_CODES` is used consistently.

**Scope:** Single implementation plan covering one cohesive Phase 1 feature. Each task produces a self-contained, testable commit.
