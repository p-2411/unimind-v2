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
