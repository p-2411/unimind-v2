"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";
import { difficultyLabel } from "~/lib/question-display";

type NextQuestion = NonNullable<RouterOutputs["question"]["forMe"]>;

type AnswerFlash = {
  xpDelta: number;
  leveledUp: boolean;
  newLevel: number;
  earned: string[];
};

export function PreviewQuestion({ question: q }: { question: NextQuestion }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState<AnswerFlash | null>(null);
  const letters = ["A", "B", "C", "D", "E", "F"];

  const answer = api.question.answer.useMutation({
    onSuccess: (result) => {
      setFlash({
        xpDelta: result.xpDelta,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
        earned: result.newlyEarnedCodes,
      });
      if (selected === null) return;
      const params = new URLSearchParams({
        seed: q.id,
        pick: String(selected),
      });
      router.push(`/questions?${params.toString()}`);
    },
  });

  function handleSubmit() {
    if (selected === null || answer.isPending) return;
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
          return (
            <li key={i} className="bg-[color:var(--color-panel)]">
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={[
                  "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  isSel
                    ? "bg-[color:var(--color-phosphor)]/12"
                    : "hover:bg-[color:var(--color-panel-hi)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px]",
                    isSel
                      ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                      : "border-[color:var(--color-rule-hi)] text-[color:var(--color-fg-mute)] group-hover:border-[color:var(--color-fg-soft)]",
                  ].join(" ")}
                >
                  {letters[i]}
                </span>
                <span className="font-sans text-[13.5px] leading-snug text-[color:var(--color-fg)]">
                  {c}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
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
      </div>
      {flash && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-[color:var(--color-phosphor)]">+{flash.xpDelta} XP</span>
          {flash.leveledUp && (
            <span className="text-[color:var(--color-amber)]">Level {flash.newLevel} ↑</span>
          )}
          {flash.earned.map((code) => (
            <span key={code} className="text-[color:var(--color-cyan)]">
              🏅 {code}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
