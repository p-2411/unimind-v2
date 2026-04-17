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
