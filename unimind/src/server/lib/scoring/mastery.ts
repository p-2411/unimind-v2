export const HALF_LIFE_DAYS = 15;
export const NEUTRAL_SCORE = 50;

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
  difficulty,
}: {
  prevScore: number;
  prevUpdatedAt: Date;
  isCorrect: boolean;
  now: Date;
  difficulty: number;
}): { masteryScore: number; masteryUpdatedAt: Date } {
  const weight = difficulty === 1 ? 0.1 : difficulty === 3 ? 0.25 : 0.15;
  const elapsedDays = (now.getTime() - prevUpdatedAt.getTime()) / MS_PER_DAY;
  const decayed = decayedTowardNeutral(prevScore, elapsedDays);
  const outcome = isCorrect ? 100 : 0;
  const next = weight * outcome + (1 - weight) * decayed;
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
