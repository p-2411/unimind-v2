"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronDown, Eye, ThumbsDown, ThumbsUp } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api, type RouterOutputs } from "~/trpc/react";

type Problem = RouterOutputs["problem"]["get"];

const DIFF_COLOR: Record<string, string> = {
  easy: "var(--color-phosphor)",
  medium: "var(--color-amber)",
  hard: "var(--color-red)",
};

const TYPE_LABEL: Record<string, string> = {
  "code-writing": "Code Writing",
  "code-tracing": "Code Tracing",
  "short-answer": "Short Answer",
  "diagram": "Diagram",
};

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <pre className="my-4 overflow-x-auto rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-void)] p-4">
                <code className="font-mono text-[13px] leading-relaxed text-[color:var(--color-fg-soft)]">
                  {children}
                </code>
              </pre>
            );
          }
          return (
            <code
              className="rounded border border-[color:var(--color-rule-hi)] bg-[color:var(--color-void)] px-1.5 py-0.5 font-mono text-[12px] text-[color:var(--color-cyan)]"
              {...props}
            >
              {children}
            </code>
          );
        },
        h2({ children }) {
          return <h2 className="mt-6 mb-2 font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-fg-mute)]">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mt-4 mb-1.5 font-sans text-[15px] font-semibold text-[color:var(--color-fg)]">{children}</h3>;
        },
        p({ children }) {
          return <p className="mb-3 font-sans text-[14px] leading-relaxed text-[color:var(--color-fg-soft)]">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc space-y-1 pl-5 font-sans text-[14px] text-[color:var(--color-fg-soft)]">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 list-decimal space-y-1 pl-5 font-sans text-[14px] text-[color:var(--color-fg-soft)]">{children}</ol>;
        },
        strong({ children }) {
          return <strong className="font-semibold text-[color:var(--color-fg)]">{children}</strong>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-2 border-[color:var(--color-cyan)] pl-4 italic text-[color:var(--color-fg-mute)]">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export function ProblemDetail({ problem }: { problem: Problem }) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [selfRated, setSelfRated] = useState<boolean | null>(problem.attempt?.selfRated ?? null);
  const [answer, setAnswer] = useState("");

  const startAttempt = api.problem.startAttempt.useMutation();
  const rate = api.problem.rate.useMutation({
    onSuccess: (_, vars) => setSelfRated(vars.selfRated),
  });

  function handleRevealSolution() {
    setSolutionVisible(true);
    startAttempt.mutate({ problemId: problem.id });
  }

  function handleRate(value: boolean) {
    rate.mutate({ problemId: problem.id, selfRated: value });
  }

  return (
    <div className="flex min-h-svh flex-col bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <Link
            href="/problems"
            className="flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--color-fg-mute)] transition-colors hover:text-[color:var(--color-fg)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Problems
          </Link>
          <span className="text-[color:var(--color-fg-mute)]">/</span>
          <span className="font-mono text-[11px] text-[color:var(--color-fg)] truncate max-w-xs">
            {problem.title}
          </span>
          {selfRated !== null && (
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{
                background: selfRated ? "var(--color-phosphor)" : "var(--color-amber)",
                color: "var(--color-void)",
              }}
            >
              {selfRated ? "Solved" : "Review"}
            </span>
          )}
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 flex-col lg:flex-row">

        {/* LEFT PANEL — problem */}
        <div className="flex-1 overflow-y-auto border-b border-[color:var(--color-rule)] lg:border-b-0 lg:border-r lg:max-w-[52%]">
          <div className="px-6 py-6 md:px-8">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.2em]"
                style={{ color: DIFF_COLOR[problem.difficulty] ?? "var(--color-fg-mute)" }}
              >
                {problem.difficulty}
              </span>
              <span className="text-[color:var(--color-rule-hi)]">·</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-fg-mute)]">
                {TYPE_LABEL[problem.type] ?? problem.type}
              </span>
              {problem.topic && (
                <>
                  <span className="text-[color:var(--color-rule-hi)]">·</span>
                  <span className="font-sans text-[12px] text-[color:var(--color-fg-mute)]">
                    {problem.topic.name}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-mono text-[24px] font-semibold leading-snug tracking-tight text-[color:var(--color-fg)] md:text-[28px]">
              {problem.title}
            </h1>

            <div className="mt-6">
              <Markdown>{problem.description}</Markdown>
            </div>

            {/* Hints */}
            {problem.hints.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                  Hints
                </div>
                {problem.hints.slice(0, hintsRevealed).map((hint, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-4 py-3"
                  >
                    <span className="mr-2 font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                      Hint {i + 1}
                    </span>
                    <span className="font-sans text-[13px] text-[color:var(--color-fg-soft)]">{hint}</span>
                  </div>
                ))}
                {hintsRevealed < problem.hints.length && (
                  <button
                    onClick={() => setHintsRevealed((n) => n + 1)}
                    className="flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--color-fg-mute)] transition-colors hover:text-[color:var(--color-fg)]"
                  >
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                    {hintsRevealed === 0 ? "Show hint" : `Show hint ${hintsRevealed + 1}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — scratch pad + solution */}
        <div className="flex flex-1 flex-col lg:max-w-[48%]">
          {/* Scratch pad */}
          <div className="flex flex-1 flex-col border-b border-[color:var(--color-rule)]">
            <div className="flex items-center border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                Your answer
              </span>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer here…&#10;&#10;For code, use plain text — no need to format."
              className="flex-1 resize-none bg-[color:var(--color-panel)] px-5 py-4 font-mono text-[13px] leading-relaxed text-[color:var(--color-fg)] outline-none placeholder:text-[color:var(--color-fg-mute)] min-h-[240px]"
              spellCheck={false}
            />
          </div>

          {/* Solution area */}
          <div className="flex flex-col">
            {!solutionVisible ? (
              <div className="flex items-center justify-center px-6 py-8">
                <button
                  onClick={handleRevealSolution}
                  className="flex items-center gap-2.5 rounded-lg border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[color:var(--color-void)] shadow-[0_0_20px_-8px_var(--color-phosphor)] transition-all hover:bg-[color:var(--color-phosphor)]/90 active:scale-[0.97]"
                >
                  <Eye className="h-4 w-4" strokeWidth={2} />
                  Reveal solution
                </button>
              </div>
            ) : (
              <div className="px-6 py-5">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                  Solution
                </div>
                <Markdown>{problem.solution}</Markdown>

                {/* Self-assessment */}
                <div className="mt-6 border-t border-[color:var(--color-rule)] pt-5">
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                    How did you do?
                  </div>
                  {selfRated === null ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRate(true)}
                        disabled={rate.isPending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-phosphor)]/40 bg-[color:var(--color-phosphor)]/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-phosphor)] transition-all hover:bg-[color:var(--color-phosphor)]/20 active:scale-[0.97]"
                      >
                        <ThumbsUp className="h-4 w-4" strokeWidth={2} />
                        Got it
                      </button>
                      <button
                        onClick={() => handleRate(false)}
                        disabled={rate.isPending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-amber)]/40 bg-[color:var(--color-amber)]/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-amber)] transition-all hover:bg-[color:var(--color-amber)]/20 active:scale-[0.97]"
                      >
                        <ThumbsDown className="h-4 w-4" strokeWidth={2} />
                        Needs review
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em]"
                        style={{
                          background: selfRated ? "var(--color-phosphor)" : "var(--color-amber)",
                          color: "var(--color-void)",
                        }}
                      >
                        {selfRated ? "Marked as solved" : "Marked for review"}
                      </span>
                      <button
                        onClick={() => setSelfRated(null)}
                        className="font-mono text-[10px] text-[color:var(--color-fg-mute)] transition-colors hover:text-[color:var(--color-fg)]"
                      >
                        change
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
