"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { difficultyLabel } from "~/lib/question-display";
import { useStableAnswerSubmission } from "~/hooks/use-stable-answer-submission";
import { keepPreviewQuestion } from "~/hooks/answer-submission-state";

type NextQuestion = NonNullable<RouterOutputs["question"]["forMe"]>;

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function PreviewQuestion({ question: incoming }: { question: NextQuestion | null }) {
  const [q, setQuestion] = useState(incoming);
  const router = useRouter();
  const submission = useStableAnswerSubmission();
  const [selected, setSelected] = useState<number | null>(null);
  const [isAdvancing, startAdvancing] = useTransition();
  const advancingRef = useRef(false);
  const state = q ? submission.states[q.id] : undefined;
  const result = state?.status === "success" ? state.data : null;
  const interactionLocked = state !== undefined || isAdvancing;
  const next = keepPreviewQuestion(q, incoming, state !== undefined, selected !== null);
  if (q?.id !== next?.id) setQuestion(next);

  useEffect(() => {
    if (!isAdvancing) advancingRef.current = false;
  }, [isAdvancing]);

  if (!q) {
    return (
      <div role="status" className="border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-10 text-center font-sans text-[13px] text-[color:var(--color-fg-soft)]">
        No questions available yet.
      </div>
    );
  }
  const question = q;

  function handleSubmit() {
    if (selected === null || interactionLocked) return;
    const rating = selected === question.answerIndex ? 3 : 1;
    submission.submit({
      questionId: question.id,
      choiceIndex: selected,
      rating,
      source: "in_app",
    });
  }

  function handleNext() {
    if (!result || state?.status !== "success" || advancingRef.current) return;
    advancingRef.current = true;
    if (!submission.reset(question.id)) {
      advancingRef.current = false;
      return;
    }
    setSelected(null);
    startAdvancing(() => router.refresh());
  }

  const correct = result?.isCorrect ?? false;
  const resultAnswerIndex = result?.answerIndex ?? -1;
  const statusText = isAdvancing
    ? "Loading the next question."
    : state?.status === "pending"
      ? "Submitting answer."
      : state?.status === "error"
        ? "Answer submission failed. Your original answer is ready to retry."
        : result
          ? `${result.isCorrect ? "Correct" : "Incorrect"}. ${result.xpDelta} XP awarded.`
          : selected === null
            ? "Choose an answer."
            : `Answer ${LETTERS[selected]} selected.`;

  return (
    <section
      aria-labelledby={`preview-question-${q.id}`}
      className="term-rise border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2 font-mono text-[11px]">
        <span className="text-[color:var(--color-fg)]">{q.topic.name}</span>
        <span aria-hidden className="text-[color:var(--color-fg-mute)]">·</span>
        <span className="text-[color:var(--color-fg-mute)]">{q.subtopic.name}</span>
        <span aria-hidden className="text-[color:var(--color-fg-mute)]">·</span>
        <span className="text-[color:var(--color-fg-mute)]">{q.topic.course.name}</span>
        <span className="ml-auto inline-flex items-center gap-2 text-[color:var(--color-fg-mute)]">
          <span aria-hidden className="text-[color:var(--color-phosphor)]">
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
        <h3 id={`preview-question-${q.id}`} className="font-mono text-[18px] font-medium leading-snug text-[color:var(--color-fg)] md:text-[19px]">
          {q.question}
        </h3>
      </div>

      <ul aria-label="Answer choices" className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
        {q.choices.map((choice, index) => {
          const isSelected = selected === index;
          const isAnswer = result !== null && index === resultAnswerIndex;
          const isWrongPick = result !== null && isSelected && !isAnswer;
          const background = isAnswer
            ? "bg-[color:var(--color-phosphor)]/15"
            : isWrongPick
              ? "bg-[color:var(--color-red)]/12"
              : isSelected
                ? "bg-[color:var(--color-phosphor)]/12"
                : "hover:bg-[color:var(--color-panel-hi)]";
          const chipClass = isAnswer
            ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
            : isWrongPick
              ? "border-[color:var(--color-red)] bg-[color:var(--color-red)] text-[color:var(--color-void)]"
              : isSelected
                ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                : "border-[color:var(--color-rule-hi)] text-[color:var(--color-fg-mute)] group-hover:border-[color:var(--color-fg-soft)]";

          return (
            <li key={index} className="bg-[color:var(--color-panel)]">
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={interactionLocked}
                onClick={() => setSelected(index)}
                className={`group flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed ${background}`}
              >
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px] ${chipClass}`}>
                  {LETTERS[index]}
                </span>
                <span className="font-sans text-[13.5px] leading-snug text-[color:var(--color-fg)]">
                  <span className="sr-only">Answer {LETTERS[index]}: </span>
                  {choice}
                </span>
                {isAnswer && <Check aria-label="Correct answer" className="ml-auto h-4 w-4 shrink-0 text-[color:var(--color-phosphor)]" strokeWidth={2.2} />}
                {isWrongPick && <X aria-label="Your answer" className="ml-auto h-4 w-4 shrink-0 text-[color:var(--color-red)]" strokeWidth={2.2} />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-3">
        <p role="status" aria-live="polite" className="sr-only">{statusText}</p>

        {isAdvancing ? (
          <div className="flex min-h-8 items-center font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
            Loading next question…
          </div>
        ) : state?.status === "error" ? (
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="font-sans text-[12.5px] text-[color:var(--color-red)]">
              Could not confirm this answer. Retry sends the exact same attempt: {state.message}
            </p>
            <button
              type="button"
              onClick={() => submission.retry(q.id)}
              className="inline-flex min-h-9 items-center justify-center gap-2 border border-[color:var(--color-red)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-red)] transition-colors hover:bg-[color:var(--color-red)]/10 sm:ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry answer
            </button>
          </div>
        ) : result === null ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
              {selected === null ? "Pick one answer" : `Selected ${LETTERS[selected]}`}
            </span>
            <button
              type="button"
              disabled={selected === null || state?.status === "pending"}
              onClick={handleSubmit}
              className={[
                "inline-flex min-h-9 items-center justify-center gap-2 border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors sm:ml-auto",
                selected === null
                  ? "cursor-not-allowed border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)]/60"
                  : "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)] shadow-[0_0_16px_-6px_var(--color-phosphor)] hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-wait disabled:opacity-70",
              ].join(" ")}
            >
              {state?.status === "pending" ? "Submitting…" : "Submit"}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${correct ? "bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]" : "bg-[color:var(--color-red)] text-[color:var(--color-void)]"}`}>
                {correct ? "Correct" : "Incorrect"}
              </span>
              <span className="font-sans text-[12.5px] text-[color:var(--color-fg-mute)]">
                Answer: <span className="text-[color:var(--color-fg)]">{LETTERS[result.answerIndex]} — {q.choices[result.answerIndex]}</span>
              </span>
            </div>
            {result.explanation && (
              <p className="font-sans text-[12.5px] leading-relaxed text-[color:var(--color-fg-soft)]">
                {result.explanation}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className={correct ? "text-[color:var(--color-phosphor)]" : "text-[color:var(--color-fg-mute)]"}>+{result.xpDelta} XP</span>
              {result.leveledUp && <span className="text-[color:var(--color-amber)]">Level {result.newLevel} ↑</span>}
              {result.newlyEarned.map((achievement) => (
                <span key={achievement.code} className="text-[color:var(--color-cyan)]">
                  🏅 {achievement.name} · +{achievement.xpReward} XP
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-9 items-center justify-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-void)] shadow-[0_0_16px_-6px_var(--color-phosphor)] transition-colors hover:bg-[color:var(--color-phosphor)]/90"
              >
                Next question
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <Link href="/questions" className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-soft)] transition-colors hover:text-[color:var(--color-fg)] sm:ml-auto">
                All questions →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
