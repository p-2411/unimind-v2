/**
 * Phase 1 XP + level math. Pure; no DB.
 *
 * XP per correct answer scales with Question.difficulty (1–3):
 *   difficulty 1 →  5 XP
 *   difficulty 2 → 10 XP
 *   difficulty 3 → 20 XP
 * Incorrect answers grant a flat 1 XP participation credit.
 *
 * Level curve: level N requires cumulative XP >= 50 * (N-1) * N.
 * Level 2 = 100 XP, 3 = 300, 4 = 600, 5 = 1000.
 */

const CORRECT_XP_BY_DIFFICULTY: Record<1 | 2 | 3, number> = {
  1: 5,
  2: 10,
  3: 20,
};

const INCORRECT_XP = 1;

export function xpForAnswer({
  isCorrect,
  difficulty,
}: {
  isCorrect: boolean;
  difficulty: number;
}): number {
  if (!isCorrect) return INCORRECT_XP;
  const clamped = Math.min(3, Math.max(1, Math.round(difficulty))) as 1 | 2 | 3;
  return CORRECT_XP_BY_DIFFICULTY[clamped];
}

/** Cumulative XP threshold at which the user first reaches `level`. Level 1 = 0. */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

export function levelForXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Solve N s.t. 50*(N-1)*N <= totalXp. Iterative — bounded; cheap.
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXp) {
    level += 1;
  }
  return level;
}

export function xpProgressForLevel(totalXp: number): {
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
} {
  const level = levelForXp(totalXp);
  const base = xpThresholdForLevel(level);
  const next = xpThresholdForLevel(level + 1);
  return {
    level,
    xpInLevel: totalXp - base,
    xpForNextLevel: next - base,
  };
}
