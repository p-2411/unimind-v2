"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Raccoon } from "~/components/raccoon";
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
  const [learningMode, setLearningMode] = useState(false);
  const [learningReady, setLearningReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLocked(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!learningMode) return;
    const t = setTimeout(() => setLearningReady(true), 4000);
    return () => clearTimeout(t);
  }, [learningMode]);
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
          <div className="level-up-card flex flex-col items-center gap-4 rounded-2xl border border-[color:var(--color-phosphor)]/30 bg-[color:var(--color-panel)] px-16 py-10 shadow-[0_0_80px_-20px_var(--color-phosphor)]">
            <Raccoon mood="celebrating" size={96} />
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

        {/* Read timer bar */}
        {locked && !learningMode && (
          <div className="px-5 pb-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-rule-hi)]">
              <div className="read-timer h-full rounded-full bg-[color:var(--color-phosphor)]" />
            </div>
          </div>
        )}

        {learningMode ? (
          <div className="border-t border-[color:var(--color-rule)]">
            <div className="space-y-3 px-5 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                The answer
              </span>
              <div className="flex items-center gap-3 rounded-lg border border-[color:var(--color-phosphor)]/25 bg-[color:var(--color-phosphor)]/8 px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] font-mono text-[11px] text-[color:var(--color-void)]">
                  {["A","B","C","D","E","F"][q.answerIndex]}
                </span>
                <span className="font-sans text-[14px] leading-snug text-[color:var(--color-fg)]">
                  {q.choices[q.answerIndex]}
                </span>
              </div>
            </div>
            <div className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-5 py-3">
              {learningReady ? (
                <button
                  type="button"
                  onClick={() => { setLearningMode(false); setLearningReady(false); }}
                  className="w-full rounded-lg border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-void)] shadow-[0_0_16px_-6px_var(--color-phosphor)] transition-all hover:bg-[color:var(--color-phosphor)]/90 active:scale-[0.97]"
                >
                  Got it — let me answer
                </button>
              ) : (
                <div className="space-y-2">
                  <span className="font-mono text-[10px] text-[color:var(--color-fg-mute)]">Read before answering…</span>
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-[color:var(--color-rule-hi)]">
                    <div key="learn" className="learn-timer h-full rounded-full bg-[color:var(--color-cyan)]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
        <ul className={`grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 ${locked ? "pointer-events-none select-none opacity-0" : "opacity-100 transition-opacity duration-500"}`}>
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
        )}

        {!learningMode && (
        <div className="flex items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
          {locked ? (
            <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
              Read the question…
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setLearningMode(true)}
                className="rounded-lg border border-[color:var(--color-rule-hi)] px-3 py-1.5 font-mono text-[11px] text-[color:var(--color-fg-mute)] transition-all hover:border-[color:var(--color-fg-soft)] hover:text-[color:var(--color-fg)]"
              >
                Don&apos;t know
              </button>
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
        )}
      </section>
    </>
  );
}
