"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Search, X } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { type RouterOutputs, api } from "~/trpc/react";
import { DIFFICULTIES, difficultyLabel } from "~/lib/question-display";
import {
  type AnswerSubmissionState,
  useStableAnswerSubmission,
} from "~/hooks/use-stable-answer-submission";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const SORTS = ["Recent", "Difficulty", "Topic"] as const;
type SortKey = (typeof SORTS)[number];
type Question = RouterOutputs["question"]["list"][number];

export function QuestionsView() {
  const [topicFilter, setTopicFilter] = useState<{ id: string; name: string } | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<1 | 2 | 3 | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("Recent");
  const [picks, setPicks] = useState<Record<string, number>>({});
  const submission = useStableAnswerSubmission();

  const topicsQuery = api.topic.getAll.useQuery();
  const questionsQuery = api.question.list.useQuery({
    topicId: topicFilter?.id,
    difficulty: difficultyFilter ?? undefined,
    search: query.trim() || undefined,
    limit: 50,
  });

  const topicChips = useMemo(
    () => (topicsQuery.data ?? []).map((topic) => ({ id: topic.id, name: topic.name })),
    [topicsQuery.data],
  );

  const sorted = useMemo(() => {
    const list = [...(questionsQuery.data ?? [])];
    if (sort === "Difficulty") list.sort((a, b) => a.difficulty - b.difficulty);
    if (sort === "Topic") list.sort((a, b) => a.topic.name.localeCompare(b.topic.name));
    return list;
  }, [questionsQuery.data, sort]);

  const answered = sorted.filter(
    (question) => submission.states[question.id]?.status === "success",
  ).length;
  const correct = sorted.filter((question) => {
    const state = submission.states[question.id];
    return state?.status === "success" && state.data.isCorrect;
  }).length;

  function handleCheck(question: Question) {
    const choice = picks[question.id];
    if (choice === undefined || submission.states[question.id] !== undefined) return;
    submission.submit({
      questionId: question.id,
      choiceIndex: choice,
      rating: choice === question.answerIndex ? 3 : 1,
      source: "in_app",
    });
  }

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex min-h-12 items-center gap-3 px-4 py-2">
          <SidebarTrigger className="-ml-1 shrink-0 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Unimind <span aria-hidden>/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Questions</span>
          </span>
          <span className="ml-auto text-right font-mono text-[10px] leading-tight text-[color:var(--color-fg-mute)] sm:text-[11px]">
            <span className="text-[color:var(--color-fg)] tabular-nums">{answered}</span>/{sorted.length} answered
            <span aria-hidden className="mx-1.5 text-[color:var(--color-rule-hi)] sm:mx-2">·</span>
            <span className="text-[color:var(--color-phosphor)] tabular-nums">{correct}</span> correct
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">Practice</div>
          <h1 className="mt-2 font-mono text-[36px] font-semibold leading-none tracking-tight md:text-[44px]">Question set</h1>
          <p className="mt-2 max-w-lg font-sans text-[14px] text-[color:var(--color-fg-soft)]">
            Filter by topic or difficulty, then answer at your own pace.
          </p>
        </section>

        <section aria-label="Question controls" className="sticky top-12 z-[5] -mx-4 mt-6 border-y border-[color:var(--color-rule)] bg-[color:var(--color-void)]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]">
              <Search aria-hidden className="ml-3 h-3.5 w-3.5 shrink-0 text-[color:var(--color-fg-mute)]" strokeWidth={2} />
              <label htmlFor="question-search" className="sr-only">Search questions, topics, or subtopics</label>
              <input
                id="question-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions, topics, or subtopics"
                className="min-w-0 w-full bg-transparent px-3 py-2 font-sans text-[13px] text-[color:var(--color-fg)] outline-none placeholder:text-[color:var(--color-fg-mute)]"
              />
            </div>
            <fieldset className="min-w-0 overflow-x-auto">
              <legend className="sr-only">Sort questions</legend>
              <div className="flex w-max items-center border border-[color:var(--color-rule-hi)]">
                {SORTS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={sort === key}
                    onClick={() => setSort(key)}
                    className={[
                      "min-h-9 px-3 py-2 font-mono text-[11px] transition-colors",
                      sort === key
                        ? "bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                        : "text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-panel)]",
                    ].join(" ")}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-5">
            <FilterGroup label="Topic">
              <Chip active={topicFilter === null} onClick={() => setTopicFilter(null)}>All</Chip>
              {topicChips.map((topic) => (
                <Chip
                  key={topic.id}
                  active={topicFilter?.id === topic.id}
                  onClick={() => setTopicFilter(topicFilter?.id === topic.id ? null : topic)}
                >
                  {topic.name}
                </Chip>
              ))}
              {topicsQuery.isLoading && <span className="px-1 font-sans text-[12px] text-[color:var(--color-fg-mute)]">Loading topics…</span>}
              {topicsQuery.isError && (
                <button type="button" disabled={topicsQuery.isFetching} onClick={() => void topicsQuery.refetch()} className="px-1 font-sans text-[12px] text-[color:var(--color-red)] hover:underline disabled:cursor-wait">
                  {topicsQuery.isFetching ? "Retrying topics…" : "Topics unavailable · retry"}
                </button>
              )}
            </FilterGroup>
            <div aria-hidden className="hidden h-5 w-px bg-[color:var(--color-rule)] lg:block" />
            <FilterGroup label="Difficulty">
              <Chip active={difficultyFilter === null} onClick={() => setDifficultyFilter(null)}>Any</Chip>
              {DIFFICULTIES.map((difficulty) => (
                <Chip
                  key={difficulty}
                  active={difficultyFilter === difficulty}
                  onClick={() => setDifficultyFilter(difficultyFilter === difficulty ? null : difficulty)}
                >
                  {difficultyLabel(difficulty)}
                </Chip>
              ))}
            </FilterGroup>
          </div>
        </section>

        <section aria-busy={questionsQuery.isFetching} aria-label="Questions" className="mt-6 space-y-3">
          {questionsQuery.isPending ? (
            <QueryMessage role="status">Loading questions…</QueryMessage>
          ) : questionsQuery.isError ? (
            <QueryMessage role="alert">
              <p>Questions could not be loaded.</p>
              <button type="button" disabled={questionsQuery.isFetching} onClick={() => void questionsQuery.refetch()} className="mt-3 min-h-9 border border-[color:var(--color-red)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-red)] hover:bg-[color:var(--color-red)]/10 disabled:cursor-wait">
                {questionsQuery.isFetching ? "Retrying questions…" : "Retry query"}
              </button>
            </QueryMessage>
          ) : sorted.length === 0 ? (
            <QueryMessage role="status">No questions match these filters.</QueryMessage>
          ) : (
            sorted.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index + 1}
                picked={picks[question.id] ?? null}
                state={submission.states[question.id]}
                onPick={(choice) => {
                  if (submission.states[question.id] !== undefined) return;
                  setPicks((current) => ({ ...current, [question.id]: choice }));
                }}
                onCheck={() => handleCheck(question)}
                onRetry={() => submission.retry(question.id)}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function QueryMessage({ role, children }: { role: "alert" | "status"; children: React.ReactNode }) {
  return (
    <div role={role} className="border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-10 text-center font-sans text-[13px] text-[color:var(--color-fg-soft)]">
      {children}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-wrap items-center gap-2">
      <legend className="float-left mr-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">{label}</legend>
      <div className="flex min-w-0 flex-wrap gap-1">{children}</div>
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "min-h-8 border px-2.5 py-1 font-sans text-[12px] transition-colors",
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
  question,
  index,
  picked,
  state,
  onPick,
  onCheck,
  onRetry,
}: {
  question: Question;
  index: number;
  picked: number | null;
  state: AnswerSubmissionState | undefined;
  onPick: (choice: number) => void;
  onCheck: () => void;
  onRetry: () => void;
}) {
  const result = state?.status === "success" ? state.data : null;
  const revealed = result !== null;
  const locked = state !== undefined;
  const correct = result?.isCorrect ?? false;
  const resultAnswerIndex = result?.answerIndex ?? -1;
  const headingId = `question-${question.id}`;
  const statusText = state?.status === "pending"
    ? "Submitting answer."
    : state?.status === "error"
      ? "Answer submission failed. Your original answer is ready to retry."
      : result
        ? `${result.isCorrect ? "Correct" : "Incorrect"}. ${result.xpDelta} XP awarded.`
        : picked === null
          ? "Choose an answer."
          : `Answer ${LETTERS[picked]} selected.`;

  return (
    <article aria-labelledby={headingId} className="term-rise border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2">
        <span className="font-mono text-[11px] tabular-nums text-[color:var(--color-fg-mute)]">{String(index).padStart(2, "0")}</span>
        <span className="font-sans text-[13px] text-[color:var(--color-fg)]">{question.topic.name}</span>
        <span aria-hidden className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">·</span>
        <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">{question.subtopic.name}</span>
        <span aria-hidden className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">·</span>
        <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">{question.topic.course.name}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--color-fg-mute)]">
          <span aria-hidden className="text-[color:var(--color-phosphor)]">
            {"●".repeat(question.difficulty)}<span className="text-[color:var(--color-rule-hi)]">{"●".repeat(3 - question.difficulty)}</span>
          </span>
          {difficultyLabel(question.difficulty)}
        </span>
      </div>

      <div className="flex items-start gap-3 px-5 py-4">
        <span aria-hidden className="select-none pt-0.5 font-mono text-[16px] leading-none text-[color:var(--color-phosphor)]">&gt;</span>
        <h2 id={headingId} className="font-mono text-[15.5px] font-medium leading-snug text-[color:var(--color-fg)]">{question.question}</h2>
      </div>

      <ul aria-label="Answer choices" className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
        {question.choices.map((choice, choiceIndex) => {
          const isPicked = picked === choiceIndex;
          const isAnswer = revealed && choiceIndex === resultAnswerIndex;
          const isWrongPick = revealed && isPicked && !isAnswer;
          const background = isAnswer
            ? "bg-[color:var(--color-phosphor)]/15"
            : isWrongPick
              ? "bg-[color:var(--color-red)]/12"
              : isPicked
                ? "bg-[color:var(--color-cyan)]/10"
                : "bg-[color:var(--color-panel)] hover:bg-[color:var(--color-panel-hi)]";
          const chipClass = isAnswer
            ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
            : isWrongPick
              ? "border-[color:var(--color-red)] bg-[color:var(--color-red)] text-[color:var(--color-void)]"
              : isPicked
                ? "border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)] text-[color:var(--color-void)]"
                : "border-[color:var(--color-rule-hi)] text-[color:var(--color-fg-mute)] group-hover:border-[color:var(--color-fg-soft)]";

          return (
            <li key={choiceIndex}>
              <button
                type="button"
                aria-pressed={isPicked}
                disabled={locked}
                onClick={() => onPick(choiceIndex)}
                className={`group flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed ${background}`}
              >
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px] ${chipClass}`}>{LETTERS[choiceIndex]}</span>
                <span className="font-sans text-[13.5px] leading-snug text-[color:var(--color-fg)]"><span className="sr-only">Answer {LETTERS[choiceIndex]}: </span>{choice}</span>
                {isAnswer && <Check aria-label="Correct answer" className="ml-auto h-4 w-4 shrink-0 text-[color:var(--color-phosphor)]" strokeWidth={2.2} />}
                {isWrongPick && <X aria-label="Your answer" className="ml-auto h-4 w-4 shrink-0 text-[color:var(--color-red)]" strokeWidth={2.2} />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-3">
        <p role="status" aria-live="polite" className="sr-only">{statusText}</p>
        {state?.status === "error" ? (
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="font-sans text-[12.5px] text-[color:var(--color-red)]">Could not confirm this answer. Retry sends the exact same attempt: {state.message}</p>
            <button type="button" onClick={onRetry} className="inline-flex min-h-9 items-center justify-center gap-2 border border-[color:var(--color-red)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-red)] hover:bg-[color:var(--color-red)]/10 sm:ml-auto">
              <RotateCcw className="h-3.5 w-3.5" /> Retry answer
            </button>
          </div>
        ) : result === null ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="font-sans text-[12px] text-[color:var(--color-fg-mute)]">{picked === null ? "Pick an answer" : `Selected ${LETTERS[picked]}`}</span>
            <button
              type="button"
              disabled={picked === null || state?.status === "pending"}
              onClick={onCheck}
              className={[
                "min-h-9 border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors sm:ml-auto",
                picked === null
                  ? "cursor-not-allowed border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)]/60"
                  : "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)] shadow-[0_0_16px_-6px_var(--color-phosphor)] hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-wait disabled:opacity-70",
              ].join(" ")}
            >
              {state?.status === "pending" ? "Checking…" : "Check"}
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${correct ? "bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]" : "bg-[color:var(--color-red)] text-[color:var(--color-void)]"}`}>{correct ? "Correct" : "Incorrect"}</span>
              <span className="font-sans text-[12.5px] text-[color:var(--color-fg-mute)]">Answer: <span className="text-[color:var(--color-fg)]">{LETTERS[result.answerIndex]} — {question.choices[result.answerIndex]}</span></span>
            </div>
            {result.explanation && <p className="font-sans text-[12.5px] leading-relaxed text-[color:var(--color-fg-soft)]">{result.explanation}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className={correct ? "text-[color:var(--color-phosphor)]" : "text-[color:var(--color-fg-mute)]"}>+{result.xpDelta} XP</span>
              {result.leveledUp && <span className="text-[color:var(--color-amber)]">Level {result.newLevel} ↑</span>}
              {result.newlyEarned.map((achievement) => <span key={achievement.code} className="text-[color:var(--color-cyan)]">🏅 {achievement.name} · +{achievement.xpReward} XP</span>)}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
