export const INITIAL_TOPIC_SCORE = 50;

export function computeTopicScore({
  prevScore,
  isCorrect,
}: {
  prevScore: number;
  isCorrect: boolean;
}): number {
  const next = prevScore + (isCorrect ? 1 : -1);
  if (next < 0) return 0;
  if (next > 100) return 100;
  return next;
}
