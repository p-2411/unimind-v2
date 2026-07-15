import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/server";

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const TYPE_LABEL: Record<string, string> = {
  "code-writing": "Code",
  "code-tracing": "Trace",
  "short-answer": "Explain",
  "diagram": "Diagram",
};

export default async function ProblemsPage() {
  const problems = await api.problem.list();

  const solved = problems.filter((p) => p.attempt?.selfRated === true).length;
  const attempted = problems.filter((p) => p.attempt && p.attempt.selfRated === null).length;

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Problems</span>
          </span>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            <span className="text-[color:var(--color-phosphor)] tabular-nums">{solved}</span>
            /{problems.length} solved
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            Exam Practice
          </div>
          <h1 className="mt-2 font-mono text-[36px] font-semibold leading-[1] tracking-tight md:text-[44px]">
            Problems
          </h1>
          <p className="mt-2 max-w-lg font-sans text-[14px] text-[color:var(--color-fg-soft)]">
            Exam-style questions. Read the problem, write your answer, then reveal the solution and self-assess.
          </p>
        </section>

        {/* Stats row */}
        <section className="term-rise mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-rule)]" style={{ animationDelay: "60ms" }}>
          {[
            { label: "Total", value: problems.length, color: "fg" },
            { label: "Solved", value: solved, color: "phosphor" },
            { label: "Attempted", value: attempted, color: "amber" },
          ].map((s) => (
            <div key={s.label} className="bg-[color:var(--color-panel)] px-5 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">{s.label}</div>
              <div className="mt-1 font-mono text-[28px] font-semibold tabular-nums" style={{ color: `var(--color-${s.color})` }}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* Problem table */}
        <section className="term-rise mt-6 overflow-hidden rounded-xl border border-[color:var(--color-rule)]" style={{ animationDelay: "120ms" }}>
          {problems.length === 0 ? (
            <div className="p-10 text-center font-sans text-[14px] text-[color:var(--color-fg-mute)]">
              No problems yet — enroll in a course with problems to get started.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)]">
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">Status</th>
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">Title</th>
                  <th className="hidden px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)] md:table-cell">Topic</th>
                  <th className="hidden px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)] sm:table-cell">Type</th>
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-rule)]">
                {problems.map((p) => {
                  const status = p.attempt?.selfRated === true
                    ? "solved"
                    : p.attempt
                      ? "attempted"
                      : "unseen";

                  const diffColor =
                    p.difficulty === "easy" ? "var(--color-phosphor)"
                    : p.difficulty === "hard" ? "var(--color-red)"
                    : "var(--color-amber)";

                  return (
                    <tr key={p.id} className="group bg-[color:var(--color-panel)] transition-colors hover:bg-[color:var(--color-panel-hi)]">
                      <td className="px-4 py-3">
                        {status === "solved" ? (
                          <CheckCircle2 className="h-4 w-4 text-[color:var(--color-phosphor)]" strokeWidth={2} />
                        ) : status === "attempted" ? (
                          <Clock className="h-4 w-4 text-[color:var(--color-amber)]" strokeWidth={2} />
                        ) : (
                          <Circle className="h-4 w-4 text-[color:var(--color-rule-hi)]" strokeWidth={1.5} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/problems/${p.id}`}
                          className="font-sans text-[14px] text-[color:var(--color-fg)] transition-colors group-hover:text-[color:var(--color-phosphor)]"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="font-sans text-[12px] text-[color:var(--color-fg-mute)]">
                          {p.topic?.name ?? "—"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-mute)]">
                          {TYPE_LABEL[p.type] ?? p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-[11px] uppercase tracking-[0.16em]"
                          style={{ color: diffColor }}
                        >
                          {p.difficulty}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
