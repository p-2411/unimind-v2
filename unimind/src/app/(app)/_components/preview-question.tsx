"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";
import { difficultyLabel } from "~/lib/question-display";

type NextQuestion = NonNullable<RouterOutputs["question"]["forMe"]>;
type AnswerResult = {
  isCorrect: boolean;
  answerIndex: number;
  explanation: string | null;
  xpDelta: number;
  leveledUp: boolean;
  newLevel: number;
  newlyEarned: Array<{ code: string; name: string; xpReward: number }>;
};

export function PreviewQuestion({ question: q }: { question: NextQuestion }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const letters = ["A", "B", "C", "D", "E", "F"];

  // The parent does not key this component, so reset local state when
  // router.refresh() swaps in the next due question.
  const [questionId, setQuestionId] = useState(q.id);
  if (questionId !== q.id) {
    setQuestionId(q.id);
    setSelected(null);
    setResult(null);
  }

  const answer = api.question.answer.useMutation({
    onSuccess: (res) => {
      setResult({
        isCorrect: res.isCorrect,
        answerIndex: res.answerIndex,
        explanation: res.explanation,
        xpDelta: res.xpDelta,
        leveledUp: res.leveledUp,
        newLevel: res.newLevel,
        newlyEarned: res.newlyEarned,
      });
    },
  });

  const revealed = result !== null;
  const correct = result?.isCorrect ?? false;
  const resultAnswerIndex = result?.answerIndex ?? -1;

  function handleSubmit() {
    if (selected === null || revealed || answer.isPending) return;
    // Binary rating until the 4-grade self-rate UI lands: Good for correct, Again for wrong.
    const rating = selected === q.answerIndex ? 3 : 1;
    answer.mutate({
      questionId: q.id,
      choiceIndex: selected,
      rating,
      source: "in_app",
    });
  }

  return (
    <section className="term-rise border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
      <div className="flex items-center gap-3 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2 font-mono text-[11px]">
        <span className="text-[color:var(--color-fg)]">{q.topic.name}</span>
        <span className="text-[color:var(--color-fg-mute)]">·</span>
        <span className="text-[color:var(--color-fg-mute)]">{q.subtopic.name}</span>
        <span className="text-[color:var(--color-fg-mute)]">·</span>
        <span className="text-[color:var(--color-fg-mute)]">{q.topic.course.name}</span>
        <span className="ml-auto inline-flex items-center gap-2 text-[color:var(--color-fg-mute)]">
          <span className="text-[color:var(--color-phosphor)]">
            {"●".repeat(q.difficulty)}
            <span className="text-[color:var(--color-rule-hi)]">
              {"●".repeat(3 - q.difficulty)}
            </span>
          </span>
          {difficultyLabel(q.difficulty)}
        </span>
      </div>

      <div className="flex items-start gap-3 px-5 py-6 md:px-6">
        <span aria-hidden className="select-none pt-0.5 font-mono text-[18px] leading-none text-[color:var(--color-phosphor)]">
          &gt;
        </span>
        <h3 className="font-mono text-[18px] font-medium leading-snug text-[color:var(--color-fg)] md:text-[19px]">
          {q.question}
        </h3>
      </div>

      <ul className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
        {q.choices.map((c, i) => {
          const isSel = selected === i;
          const isAnswer = revealed && i === resultAnswerIndex;
          const isWrongPick = revealed && isSel && !isAnswer;

          const bg = isAnswer
            ? "bg-[color:var(--color-phosphor)]/15"
            : isWrongPick
              ? "bg-[color:var(--color-red)]/12"
              : isSel
                ? "bg-[color:var(--color-phosphor)]/12"
                : "hover:bg-[color:var(--color-panel-hi)]";

          const chipCls = isAnswer
            ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
            : isWrongPick
              ? "border-[color:var(--color-red)] bg-[color:var(--color-red)] text-[color:var(--color-void)]"
              : isSel
                ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                : "border-[color:var(--color-rule-hi)] text-[color:var(--color-fg-mute)] group-hover:border-[color:var(--color-fg-soft)]";

          return (
            <li key={i} className="bg-[color:var(--color-panel)]">
              <button
                type="button"
                disabled={revealed}
                onClick={() => setSelected(i)}
                className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${bg} ${revealed ? "cursor-default" : ""}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px] ${chipCls}`}>
                  {letters[i]}
                </span>
                <span className="font-sans text-[13.5px] leading-snug text-[color:var(--color-fg)]">
                  {c}
                </span>
                {isAnswer && <Check className="ml-auto h-4 w-4 shrink-0 text-[color:var(--color-phosphor)]" strokeWidth={2.2} />}
                {isWrongPick && <X className="ml-auto h-4 w-4 shrink-0 text-[color:var(--color-red)]" strokeWidth={2.2} />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
        {result === null ? (
          <>
            <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
              {selected === null ? "" : `Selected ${letters[selected]}`}
            </span>
            <button
              type="button"
              disabled={selected === null || answer.isPending}
              onClick={handleSubmit}
              className={[
                "ml-auto inline-flex items-center gap-2 border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                selected === null
                  ? "cursor-not-allowed border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)]/60"
                  : "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)] hover:bg-[color:var(--color-phosphor)]/90 shadow-[0_0_16px_-6px_var(--color-phosphor)]",
              ].join(" ")}
            >
              Submit
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </>
        ) : (
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{
                  background: correct ? "var(--color-phosphor)" : "var(--color-red)",
                  color: "var(--color-void)",
                }}
              >
                {correct ? "Correct" : "Incorrect"}
              </span>
              <span className="font-sans text-[12.5px] text-[color:var(--color-fg-mute)]">
                Answer:{" "}
                <span className="text-[color:var(--color-fg)]">
                  {letters[result.answerIndex]} — {q.choices[result.answerIndex]}
                </span>
              </span>
            </div>
            {result.explanation && (
              <p className="font-sans text-[12.5px] leading-relaxed text-[color:var(--color-fg-soft)]">
                {result.explanation}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className="text-[color:var(--color-phosphor)]">
                +{result.xpDelta} XP
              </span>
              {result.leveledUp && (
                <span className="text-[color:var(--color-amber)]">
                  Level {result.newLevel} ↑
                </span>
              )}
              {result.newlyEarned.map((a) => (
                <span key={a.code} className="text-[color:var(--color-cyan)]">
                  🏅 {a.name} · +{a.xpReward} XP
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="inline-flex items-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-void)] transition-colors hover:bg-[color:var(--color-phosphor)]/90 shadow-[0_0_16px_-6px_var(--color-phosphor)]"
              >
                Next question
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <Link
                href="/questions"
                className="ml-auto font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-soft)] transition-colors hover:text-[color:var(--color-fg)]"
              >
                All questions →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
