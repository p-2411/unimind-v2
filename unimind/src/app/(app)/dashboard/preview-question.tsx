"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";
import { difficultyLabel } from "~/lib/question-display";

type NextQuestion = NonNullable<RouterOutputs["question"]["forMe"]>;

export function PreviewQuestion({ question: q }: { question: NextQuestion }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [levelUp, setLevelUp] = useState<{ level: number; redirectUrl: string } | null>(null);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLocked(false), 2000);
    return () => clearTimeout(t);
  }, []);
  const letters = ["A", "B", "C", "D", "E", "F"];

  const answer = api.question.answer.useMutation({
    onSuccess: (res) => {
      if (selected === null) return;

      if (res.isCorrect) {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 700);
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 420);
      }

      const params = new URLSearchParams({ seed: q.id, pick: String(selected) });
      const redirectUrl = `/questions?${params.toString()}`;

      if (res.leveledUp) {
        setLevelUp({ level: res.newLevel, redirectUrl });
      } else {
        router.push(redirectUrl);
      }
    },
  });

  function handleSubmit() {
    if (selected === null || answer.isPending) return;
    const rating = selected === q.answerIndex ? 3 : 1;
    answer.mutate({ questionId: q.id, choiceIndex: selected, rating, source: "in_app" });
  }

  function dismissLevelUp() {
    if (!levelUp) return;
    router.push(levelUp.redirectUrl);
    setLevelUp(null);
  }

  return (
    <>
      {/* Level-up overlay */}
      {levelUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-void)]/85 backdrop-blur-sm"
          onClick={dismissLevelUp}
        >
          <div className="level-up-card flex flex-col items-center gap-5 rounded-2xl border border-[color:var(--color-phosphor)]/30 bg-[color:var(--color-panel)] px-16 py-12 shadow-[0_0_80px_-20px_var(--color-phosphor)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-phosphor)]">
              Level up
            </div>
            <div
              className="font-mono text-[80px] font-bold leading-none tabular-nums text-[color:var(--color-phosphor)]"
              style={{ textShadow: "0 0 48px var(--color-phosphor)" }}
            >
              L{levelUp.level}
            </div>
            <div className="font-sans text-[12px] text-[color:var(--color-fg-mute)]">
              tap anywhere to continue
            </div>
          </div>
        </div>
      )}

      <section
        className={[
          "term-rise overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]",
          isShaking ? "shake" : "",
          isFlashing ? "correct-flash" : "",
        ].join(" ")}
      >
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

        <ul className={`grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 transition-opacity duration-300 ${locked ? "pointer-events-none opacity-40" : ""}`}>
          {q.choices.map((c, i) => {
            const isSel = selected === i;
            return (
              <li key={i} className="bg-[color:var(--color-panel)]">
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  className={[
                    "group flex w-full items-center gap-3 px-4 py-3 text-left transition-all",
                    isSel
                      ? "bg-[color:var(--color-phosphor)]/12"
                      : "hover:bg-[color:var(--color-panel-hi)] hover:translate-x-0.5",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-[11px] transition-colors",
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
          {locked ? (
            <>
              <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
                Read the question…
              </span>
              <div className="ml-auto h-0.5 w-24 overflow-hidden rounded-full bg-[color:var(--color-rule-hi)]">
                <div className="read-timer h-full rounded-full bg-[color:var(--color-phosphor)]/60" />
              </div>
            </>
          ) : (
            <>
              <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
                {selected === null ? "" : `Selected ${letters[selected]}`}
              </span>
              <button
                type="button"
                disabled={selected === null || answer.isPending}
                onClick={handleSubmit}
                className={[
                  "ml-auto inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all",
                  selected === null
                    ? "cursor-not-allowed border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)]/60"
                    : "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)] hover:bg-[color:var(--color-phosphor)]/90 shadow-[0_0_16px_-6px_var(--color-phosphor)] active:scale-[0.97]",
                ].join(" ")}
              >
                Submit
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
