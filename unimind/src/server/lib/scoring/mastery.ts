export const HALF_LIFE_DAYS = 15;
export const NEUTRAL_SCORE = 50;
export const ATTEMPT_WEIGHT = 0.15;

const MS_PER_DAY = 86_400_000;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

function decayedTowardNeutral(score: number, elapsedDays: number) {
  const decay = Math.pow(0.5, Math.max(0, elapsedDays) / HALF_LIFE_DAYS);
  return decay * score + (1 - decay) * NEUTRAL_SCORE;
}

export function applyMastery({
  prevScore,
  prevUpdatedAt,
  isCorrect,
  now,
}: {
  prevScore: number;
  prevUpdatedAt: Date;
  isCorrect: boolean;
  now: Date;
}): { masteryScore: number; masteryUpdatedAt: Date } {
  const elapsedDays = (now.getTime() - prevUpdatedAt.getTime()) / MS_PER_DAY;
  const decayed = decayedTowardNeutral(prevScore, elapsedDays);
  const outcome = isCorrect ? 100 : 0;
  const next = ATTEMPT_WEIGHT * outcome + (1 - ATTEMPT_WEIGHT) * decayed;
  return { masteryScore: clamp(next), masteryUpdatedAt: now };
}

export function readMastery({
  score,
  updatedAt,
  now,
}: {
  score: number;
  updatedAt: Date;
  now: Date;
}): number {
  const elapsedDays = (now.getTime() - updatedAt.getTime()) / MS_PER_DAY;
  return clamp(decayedTowardNeutral(score, elapsedDays));
}
