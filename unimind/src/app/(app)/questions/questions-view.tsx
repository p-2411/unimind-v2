"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api, type RouterOutputs } from "~/trpc/react";
import { DIFFICULTIES, difficultyLabel } from "~/lib/question-display";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
type SortKey = "Recent" | "Difficulty" | "Topic";

type Question = RouterOutputs["question"]["list"][number];
type AnswerResult = { isCorrect: boolean; answerIndex: number; explanation: string | null };

export function QuestionsView() {
  const search = useSearchParams();
  const seedId = search.get("seed");
  const seedPick = search.get("pick");

  const [topicFilter, setTopicFilter] = useState<{ id: string; name: string } | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<1 | 2 | 3 | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("Recent");

  const topicsQuery = api.topic.getAll.useQuery();
  const questionsQuery = api.question.list.useQuery({
    topicId: topicFilter?.id,
    difficulty: difficultyFilter ?? undefined,
    search: query.trim() || undefined,
    limit: 50,
  });

  const answer = api.question.answer.useMutation();

  const [picks, setPicks] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [flashingId, setFlashingId] = useState<string | null>(null);

  const topicChips = useMemo(() => {
    const list = topicsQuery.data ?? [];
    return list.map((t) => ({ id: t.id, name: t.name }));
  }, [topicsQuery.data]);

  const sorted = useMemo(() => {
    let list = [...(questionsQuery.data ?? [])];
    if (sort === "Difficulty") list.sort((a, b) => a.difficulty - b.difficulty);
    if (sort === "Topic") list.sort((a, b) => a.topic.name.localeCompare(b.topic.name));
    if (seedId) {
      const idx = list.findIndex((q) => q.id === seedId);
      if (idx > 0) {
        const [pin] = list.splice(idx, 1);
        if (pin) list.unshift(pin);
      }
    }
    return list;
  }, [questionsQuery.data, sort, seedId]);

  useEffect(() => {
    if (!seedId || seedPick === null) return;
    if (results[seedId]) return;
    if (!questionsQuery.isSuccess) return;
    const choice = Number(seedPick);
    if (Number.isNaN(choice)) return;
    const seedQ = questionsQuery.data.find((x) => x.id === seedId);
    if (!seedQ) return;
    setPicks((p) => ({ ...p, [seedId]: choice }));
    const rating = choice === seedQ.answerIndex ? 3 : 1;
    answer.mutate(
      { questionId: seedId, choiceIndex: choice, rating, source: "in_app" },
      {
        onSuccess: (res) => {
          setResults((r) => ({
            ...r,
            [seedId]: {
              isCorrect: res.isCorrect,
              answerIndex: res.answerIndex,
              explanation: res.explanation,
            },
          }));
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedId, seedPick, questionsQuery.isSuccess]);

  function handleCheck(q: Question) {
    const choice = picks[q.id];
    if (choice === undefined || results[q.id] || answer.isPending) return;
    const rating = choice === q.answerIndex ? 3 : 1;
    answer.mutate(
      { questionId: q.id, choiceIndex: choice, rating, source: "in_app" },
      {
        onSuccess: (res) => {
          setResults((r) => ({
            ...r,
            [q.id]: {
              isCorrect: res.isCorrect,
              answerIndex: res.answerIndex,
              explanation: res.explanation,
            },
          }));
          if (res.isCorrect) {
            setFlashingId(q.id);
            setTimeout(() => setFlashingId(null), 700);
          } else {
            setShakingId(q.id);
            setTimeout(() => setShakingId(null), 420);
          }
        },
      },
    );
  }

  const totalCount = sorted.length;
  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter((r) => r.isCorrect).length;

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Questions</span>
          </span>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            <span className="text-[color:var(--color-fg)] tabular-nums">{answered}</span>
            /{totalCount} answered
            <span className="mx-2 text-[color:var(--color-rule-hi)]">·</span>
            <span className="text-[color:var(--color-phosphor)] tabular-nums">{correct}</span> correct
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            Practice
          </div>
          <h1 className="mt-2 font-mono text-[36px] font-semibold leading-[1] tracking-tight md:text-[44px]">
            Question set
          </h1>
          <p className="mt-2 max-w-lg font-sans text-[14px] text-[color:var(--color-fg-soft)]">
            Filter by topic or difficulty, then answer at your own pace.
          </p>
        </section>

        <section className="sticky top-12 z-[5] -mx-4 mt-6 border-y border-[color:var(--color-rule)] bg-[color:var(--color-void)]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]">
              <Search className="ml-3 h-3.5 w-3.5 shrink-0 text-[color:var(--color-fg-mute)]" strokeWidth={2} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions, topics, or subtopics"
                className="w-full bg-transparent px-3 py-2 font-sans text-[13px] text-[color:var(--color-fg)] outline-none placeholder:text-[color:var(--color-fg-mute)]"
              />
            </div>
            <div className="hidden items-center overflow-hidden rounded-lg border border-[color:var(--color-rule-hi)] md:flex">
              {(["Recent", "Difficulty", "Topic"] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={[
                    "px-3 py-2 font-mono text-[11px] transition-colors",
                    sort === k
                      ? "bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                      : "text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-panel)]",
                  ].join(" ")}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <FilterGroup label="Topic">
              <Chip active={topicFilter === null} onClick={() => setTopicFilter(null)}>All</Chip>
              {topicChips.map((t) => (
                <Chip
                  key={t.id}
                  active={topicFilter?.id === t.id}
                  onClick={() => setTopicFilter(topicFilter?.id === t.id ? null : t)}
                >
                  {t.name}
                </Chip>
              ))}
            </FilterGroup>

            <div className="hidden h-5 w-px bg-[color:var(--color-rule)] md:block" />

            <FilterGroup label="Difficulty">
              <Chip active={difficultyFilter === null} onClick={() => setDifficultyFilter(null)}>Any</Chip>
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d}
                  active={difficultyFilter === d}
                  onClick={() => setDifficultyFilter(difficultyFilter === d ? null : d)}
                >
                  {difficultyLabel(d)}
                </Chip>
              ))}
            </FilterGroup>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {questionsQuery.isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
          {!questionsQuery.isLoading && sorted.length === 0 && (
            <div className="rounded-xl border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-10 text-center">
              <p className="font-sans text-[15px] text-[color:var(--color-fg-soft)]">
                No questions match these filters.
              </p>
            </div>
          )}
          {sorted.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i + 1}
              picked={picks[q.id] ?? null}
              result={results[q.id] ?? null}
              isShaking={shakingId === q.id}
              isFlashing={flashingId === q.id}
              onPick={(idx) => setPicks((p) => ({ ...p, [q.id]: idx }))}
              onCheck={() => handleCheck(q)}
              checking={answer.isPending}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] animate-pulse">
      <div className="flex items-center gap-3 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2">
        <div className="h-2.5 w-5 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="h-2.5 w-28 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="h-2.5 w-20 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="ml-auto h-2.5 w-16 rounded-full bg-[color:var(--color-rule-hi)]" />
      </div>
      <div className="space-y-2.5 px-5 py-5">
        <div className="h-3.5 w-full rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="h-3.5 w-4/5 rounded-full bg-[color:var(--color-rule-hi)]" />
      </div>
      <div className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-[color:var(--color-panel)] px-4 py-3">
            <div className="h-6 w-6 shrink-0 rounded border border-[color:var(--color-rule-hi)]" />
            <div
              className="h-3 rounded-full bg-[color:var(--color-rule-hi)]"
              style={{ width: `${48 + i * 12}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
        <div className="h-2.5 w-24 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="ml-auto h-7 w-16 rounded-lg bg-[color:var(--color-rule-hi)]" />
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-2.5 py-0.5 font-sans text-[12px] transition-colors",
        active
          ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
          : "border-[color:var(--color-rule-hi)] text-[color:var(--color-fg-soft)] hover:border-[color:var(--color-fg-soft)] hover:text-[color:var(--color-fg)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function QuestionCard({
  q,
  index,
  picked,
  result,
  isShaking,
  isFlashing,
  onPick,
  onCheck,
  checking,
}: {
  q: Question;
  index: number;
  picked: number | null;
  result: AnswerResult | null;
  isShaking: boolean;
  isFlashing: boolean;
  onPick: (idx: number) => void;
  onCheck: () => void;
  checking: boolean;
}) {
  const revealed = result !== null;
  const correct = result?.isCorrect ?? false;

  return (
    <article
      className={[
        "term-rise overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]",
        isShaking ? "shake" : "",
        isFlashing ? "correct-flash" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2">
        <span className="font-mono text-[11px] tabular-nums text-[color:var(--color-fg-mute)]">
          {String(index).padStart(2, "0")}
        </span>
        <span className="font-sans text-[13px] text-[color:var(--color-fg)]">{q.topic.name}</span>
        <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">·</span>
        <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">{q.subtopic.name}</span>
        <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">·</span>
        <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">{q.topic.course.name}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--color-fg-mute)]">
          <span className="text-[color:var(--color-phosphor)]">
            {"●".repeat(q.difficulty)}
            <span className="text-[color:var(--color-rule-hi)]">
              {"●".repeat(3 - q.difficulty)}
            </span>
          </span>
          {difficultyLabel(q.difficulty)}
        </span>
      </div>

      <div className="flex items-start gap-3 px-5 py-4">
        <span aria-hidden className="select-none pt-0.5 font-mono text-[16px] leading-none text-[color:var(--color-phosphor)]">
          &gt;
        </span>
        <h3 className="font-mono text-[15.5px] font-medium leading-snug text-[color:var(--color-fg)]">
          {q.question}
        </h3>
      </div>

      <ul className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
        {q.choices.map((c, i) => {
          const isPicked = picked === i;
          const isAnswer = revealed && result !== null && i === result.answerIndex;
          const isWrongPick = revealed && isPicked && !isAnswer;

          const bg = isAnswer
            ? "bg-[color:var(--color-phosphor)]/15"
            : isWrongPick
              ? "bg-[color:var(--color-red)]/12"
              : isPicked
                ? "bg-[color:var(--color-cyan)]/10"
                : "bg-[color:var(--color-panel)] hover:bg-[color:var(--color-panel-hi)]";

          const chipCls = isAnswer
            ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
            : isWrongPick
              ? "border-[color:var(--color-red)] bg-[color:var(--color-red)] text-[color:var(--color-void)]"
              : isPicked
                ? "border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)] text-[color:var(--color-void)]"
                : "border-[color:var(--color-rule-hi)] text-[color:var(--color-fg-mute)] group-hover:border-[color:var(--color-fg-soft)]";

          return (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onPick(i)}
                className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${bg} ${revealed ? "cursor-default" : "hover:translate-x-0.5"}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-[11px] transition-colors ${chipCls}`}>
                  {LETTERS[i]}
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
        {!revealed ? (
          <>
            <span className="font-sans text-[12px] text-[color:var(--color-fg-mute)]">
              {picked === null ? "Pick an answer" : `Selected ${LETTERS[picked]}`}
            </span>
            <button
              type="button"
              disabled={picked === null || checking}
              onClick={onCheck}
              className={[
                "ml-auto rounded-lg border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] transition-all",
                picked === null
                  ? "cursor-not-allowed border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)]/60"
                  : "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)] hover:bg-[color:var(--color-phosphor)]/90 shadow-[0_0_16px_-6px_var(--color-phosphor)] active:scale-[0.97]",
              ].join(" ")}
            >
              Check
            </button>
          </>
        ) : (
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]"
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
                  {LETTERS[result!.answerIndex]} — {q.choices[result!.answerIndex]}
                </span>
              </span>
            </div>
            {result?.explanation && (
              <p className="font-sans text-[12.5px] leading-relaxed text-[color:var(--color-fg-soft)]">
                {result.explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
