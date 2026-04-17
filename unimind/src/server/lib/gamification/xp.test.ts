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
