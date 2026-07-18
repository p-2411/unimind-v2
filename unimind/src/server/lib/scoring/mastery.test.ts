import {
  applyMastery,
  readMastery,
  HALF_LIFE_DAYS,
  NEUTRAL_SCORE,
} from "./mastery";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

describe("applyMastery", () => {
  it("a correct answer with no time gap nudges score toward 100", () => {
    const { masteryScore, masteryUpdatedAt } = applyMastery({
      prevScore: 50,
      prevUpdatedAt: day(0),
      isCorrect: true,
      now: day(0),
      difficulty: 2,
    });
    // No elapsed time → decayed === prev (50). next = 0.15*100 + 0.85*50 = 57.5.
    expect(masteryScore).toBeCloseTo(57.5, 5);
    expect(masteryUpdatedAt).toEqual(day(0));
  });

  it("an incorrect answer with no time gap nudges score toward 0", () => {
    const { masteryScore } = applyMastery({
      prevScore: 50,
      prevUpdatedAt: day(0),
      isCorrect: false,
      now: day(0),
      difficulty: 2,
    });
    // next = 0.15*0 + 0.85*50 = 42.5.
    expect(masteryScore).toBeCloseTo(42.5, 5);
  });

  it("decays the previous score toward NEUTRAL before blending the new attempt", () => {
    // prev 80, 15 days idle, then correct answer.
    const { masteryScore } = applyMastery({
      prevScore: 80,
      prevUpdatedAt: day(0),
      isCorrect: true,
      now: day(HALF_LIFE_DAYS),
      difficulty: 2,
    });
    // decayed = 0.5*80 + 0.5*50 = 65. next = 0.15*100 + 0.85*65 = 70.25.
    expect(masteryScore).toBeCloseTo(70.25, 5);
  });

  it("blends a NEUTRAL score upward on a correct answer", () => {
    const { masteryScore } = applyMastery({
      prevScore: NEUTRAL_SCORE,
      prevUpdatedAt: day(0),
      isCorrect: true,
      now: day(0),
      difficulty: 2,
    });
    // 0.15*100 + 0.85*50 = 57.5
    const expected = 0.15 * 100 + (1 - 0.15) * NEUTRAL_SCORE;
    expect(masteryScore).toBeCloseTo(expected, 5);
  });

  it("treats negative elapsed time as zero (no amplification on clock skew)", () => {
    // now BEFORE prevUpdatedAt — should not amplify the score away from NEUTRAL.
    const { masteryScore } = applyMastery({
      prevScore: 90,
      prevUpdatedAt: day(10),
      isCorrect: true,
      now: day(0),
      difficulty: 2,
    });
    // Negative elapsed clamped to 0: decayed = 90, next = 0.15*100 + 0.85*90 = 91.5.
    expect(masteryScore).toBeCloseTo(91.5, 5);
  });

  it("clamps output to [0, 100] when prevScore is out of range", () => {
    // Stale prevScore = 120 — output must not exceed 100.
    const high = applyMastery({
      prevScore: 120,
      prevUpdatedAt: day(0),
      isCorrect: true,
      now: day(0),
      difficulty: 2,
    });
    expect(high.masteryScore).toBeLessThanOrEqual(100);

    // Stale prevScore = -20 with incorrect — output must not go below 0.
    const low = applyMastery({
      prevScore: -20,
      prevUpdatedAt: day(0),
      isCorrect: false,
      now: day(0),
      difficulty: 2,
    });
    expect(low.masteryScore).toBeGreaterThanOrEqual(0);
  });
});

describe("readMastery", () => {
  it("returns the stored score when no time has passed", () => {
    expect(
      readMastery({ score: 73, updatedAt: day(0), now: day(0) }),
    ).toBeCloseTo(73, 5);
  });

  it("decays toward NEUTRAL by half over one half-life", () => {
    // 80 with 15 days of idle: 0.5*80 + 0.5*50 = 65.
    expect(
      readMastery({ score: 80, updatedAt: day(0), now: day(HALF_LIFE_DAYS) }),
    ).toBeCloseTo(65, 5);
  });

  it("approaches NEUTRAL after many half-lives", () => {
    // 100 with 10 half-lives idle → almost exactly NEUTRAL.
    const result = readMastery({
      score: 100,
      updatedAt: day(0),
      now: day(HALF_LIFE_DAYS * 10),
    });
    expect(result).toBeCloseTo(NEUTRAL_SCORE, 1); // within 0.05
  });

  it("never moves a NEUTRAL score regardless of elapsed time", () => {
    expect(
      readMastery({
        score: NEUTRAL_SCORE,
        updatedAt: day(0),
        now: day(365),
      }),
    ).toBeCloseTo(NEUTRAL_SCORE, 5);
  });

  it("clamps read output to [0, 100] when stored score is out of range", () => {
    expect(
      readMastery({ score: 150, updatedAt: day(0), now: day(0) }),
    ).toBeLessThanOrEqual(100);
    expect(
      readMastery({ score: -10, updatedAt: day(0), now: day(0) }),
    ).toBeGreaterThanOrEqual(0);
  });
});
