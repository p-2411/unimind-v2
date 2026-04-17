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
