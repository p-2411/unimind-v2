/**
 * Pure streak transition.
 *
 * A streak day is any UTC calendar day the user answered at least one question
 * (correct or not). Rules:
 *
 * - Answer the same UTC day as lastActiveDate: no change.
 * - Answer the UTC day after lastActiveDate: currentStreak += 1.
 * - Answer >1 UTC day after lastActiveDate: currentStreak = 1, streakLost = true
 *   iff the prior streak was positive. The previous streak value is preserved
 *   in longestStreak if it was the max.
 * - longestStreak is updated whenever currentStreak reaches a new max.
 */

export type StreakInput = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
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

/**
 * The streak as it should be displayed / evaluated right now: the stored
 * value is only live while `lastActiveDate` is today or yesterday (UTC).
 * Once a day has been missed the streak is already lost, even though the
 * stored row is not rewritten until the next answer.
 */
export function effectiveStreak({
  currentStreak,
  lastActiveDate,
  today,
}: {
  currentStreak: number;
  lastActiveDate: Date | null;
  today: Date;
}): number {
  if (lastActiveDate === null) return 0;
  const gap = utcDaysBetween(lastActiveDate, today);
  return gap <= 1 ? currentStreak : 0;
}

export function updateStreak(input: StreakInput): StreakResult {
  const { currentStreak, longestStreak, lastActiveDate, today } = input;

  // First-ever answer.
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

  // gap > 1 — streak broken iff a streak actually existed.
  return {
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate: today,
    streakExtended: true,
    streakLost: currentStreak > 0,
  };
}
