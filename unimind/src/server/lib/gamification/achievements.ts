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
