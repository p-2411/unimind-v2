import { updateStreak } from "./streak";

const utcDay = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

describe("updateStreak", () => {
  it("starts a new streak at 1 for a first-ever answer", () => {
    const result = updateStreak({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
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

  it("treats an incorrect answer as a streak day too", () => {
    const result = updateStreak({
      currentStreak: 4,
      longestStreak: 10,
      lastActiveDate: utcDay(-1),
      today: utcDay(0),
    });
    expect(result).toEqual({
      currentStreak: 5,
      longestStreak: 10,
      lastActiveDate: utcDay(0),
      streakExtended: true,
      streakLost: false,
    });
  });

  it("keeps the streak unchanged on a second answer the same day", () => {
    const result = updateStreak({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDate: utcDay(0),
      today: utcDay(0),
    });
    expect(result.currentStreak).toBe(5);
    expect(result.streakExtended).toBe(false);
  });

  it("extends the streak by one on an answer the day after", () => {
    const result = updateStreak({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDate: utcDay(0),
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
      today: utcDay(3),
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(8);
    expect(result.streakExtended).toBe(true);
    expect(result.streakLost).toBe(true);
  });

  it("does not report streakLost when there was no prior streak to lose", () => {
    const result = updateStreak({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      today: utcDay(0),
    });
    expect(result.streakLost).toBe(false);
  });

  it("updates longestStreak when current surpasses it", () => {
    const result = updateStreak({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDate: utcDay(0),
      today: utcDay(1),
    });
    expect(result.currentStreak).toBe(8);
    expect(result.longestStreak).toBe(8);
  });
});
