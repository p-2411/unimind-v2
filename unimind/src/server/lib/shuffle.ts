// Deterministic Fisher-Yates shuffle seeded by question ID.
// Same question always produces the same choice order, but order varies across questions.

function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h, 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s;
  };
}

export function shuffleChoices(
  questionId: string,
  choices: string[],
  answerIndex: number,
): { choices: string[]; answerIndex: number } {
  const rand = lcg(strHash(questionId));
  const arr = [...choices];
  const n = arr.length;

  for (let i = n - 1; i > 0; i--) {
    const j = rand() % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }

  const correctChoice = choices[answerIndex]!;
  const newIndex = arr.indexOf(correctChoice);

  return { choices: arr, answerIndex: newIndex };
}
