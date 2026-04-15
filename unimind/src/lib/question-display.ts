export function difficultyLabel(d: number): string {
  return d === 1 ? "Intro" : d === 2 ? "Core" : "Advanced";
}

export const DIFFICULTIES = [1, 2, 3] as const;
