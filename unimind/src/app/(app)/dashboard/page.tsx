import { Flame, Sparkles } from "lucide-react";
import { Raccoon } from "~/components/raccoon";
import { api } from "~/trpc/server";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { CountUp } from "~/components/count-up";
import { AnimatedBar } from "~/components/animated-bar";
import { PreviewQuestion } from "./preview-question";
import { Greeting } from "./greeting";

const QUOTES = [
  { q: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius" },
  { q: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", a: "Will Durant" },
  { q: "An investment in knowledge pays the best interest.", a: "Benjamin Franklin" },
  { q: "The expert in anything was once a beginner.", a: "Helen Hayes" },
  { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
  { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
  { q: "Genius is one percent inspiration and ninety-nine percent perspiration.", a: "Thomas Edison" },
  { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson" },
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "You miss 100% of the shots you don't take.", a: "Wayne Gretzky" },
  { q: "Discipline is the bridge between goals and accomplishment.", a: "Jim Rohn" },
  { q: "Little by little, one travels far.", a: "J.R.R. Tolkien" },
];

export default async function Dashboard() {
  const [stats, nextQuestion] = await Promise.all([
    api.user.dashboardStats(),
    api.question.forMe(),
  ]);

  const quote = QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length]!;
  const calibrating = stats.accuracy === null;

  const tiles = [
    {
      label: "Courses covered",
      numericValue: stats.coursesCovered,
      prefix: "" as const,
      suffix: "" as const,
      delta: stats.coursesCovered === 0 ? "—" : "all-time",
      tone: "fg" as const,
      Icon: null as typeof Flame | null,
    },
    {
      label: "Topics covered",
      numericValue: stats.topicsCovered,
      prefix: "" as const,
      suffix: "" as const,
      delta: stats.topicsCovered === 0 ? "—" : "all-time",
      tone: "fg" as const,
      Icon: null as typeof Flame | null,
    },
    {
      label: "Accuracy",
      numericValue: calibrating ? null : stats.accuracy!,
      prefix: "" as const,
      suffix: "%" as const,
      delta: calibrating
        ? `Calibrating ${stats.totalAnswers}/${stats.calibrationThreshold}`
        : "across topics",
      tone: "cyan" as const,
      Icon: null as typeof Flame | null,
    },
    {
      label: "Streak",
      numericValue: stats.currentStreak,
      prefix: "" as const,
      suffix: "d" as const,
      delta: `Best ${stats.longestStreak}d`,
      tone: "amber" as const,
      Icon: Flame as typeof Flame | null,
    },
    {
      label: "Level",
      numericValue: stats.level,
      prefix: "L" as const,
      suffix: "" as const,
      delta: `${stats.xp} XP`,
      tone: "phosphor" as const,
      Icon: null as typeof Flame | null,
    },
  ];

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Dashboard</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-mute)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-phosphor)] shadow-[0_0_8px_var(--color-phosphor)]" />
            synced
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            Today
          </div>
          <Greeting />
        </section>

        <aside className="term-rise mt-6 flex items-start gap-3 rounded-xl border-l-2 border-[color:var(--color-phosphor)] bg-[color:var(--color-panel)] px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-phosphor)]" strokeWidth={2} />
          <div className="min-w-0">
            <p className="font-sans text-[13.5px] italic leading-snug text-[color:var(--color-fg)]">
              &ldquo;{quote.q}&rdquo;
            </p>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
              — {quote.a}
            </p>
          </div>
        </aside>

        <section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] md:grid-cols-3 lg:grid-cols-5">
          {tiles.map((s, i) => (
            <div
              key={s.label}
              className="term-rise bg-[color:var(--color-panel)] px-5 py-5"
              style={{ animationDelay: `${60 + i * 60}ms` }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                {s.label}
              </div>
              <div
                className="mt-2 inline-flex items-center gap-2 font-mono text-[36px] font-semibold leading-none tabular-nums"
                style={{ color: `var(--color-${s.tone})` }}
              >
                {s.Icon && <s.Icon className="h-7 w-7" strokeWidth={2} fill="currentColor" />}
                {s.numericValue === null
                  ? "—"
                  : <CountUp value={s.numericValue} prefix={s.prefix} suffix={s.suffix} duration={800} />
                }
              </div>
              <div className="mt-2 font-sans text-[11.5px] text-[color:var(--color-fg-mute)]">
                {s.delta}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-12 gap-4">
          <div className="col-span-12 min-w-0 lg:col-span-5">
            <SectionHead title="Topic Mastery" hint="30 days" />
            <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
              {stats.topicMastery.length === 0 ? (
                <div className="p-6 text-center font-sans text-[13px] text-[color:var(--color-fg-mute)]">
                  Answer a question to start tracking topic mastery.
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--color-rule)]">
                  {stats.topicMastery.map((t, i) => {
                    const pct = t.score;
                    const color =
                      pct < 50
                        ? "var(--color-red)"
                        : pct < 70
                          ? "var(--color-amber)"
                          : "var(--color-phosphor)";
                    return (
                      <li key={t.topicId} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-sans text-[13px] text-[color:var(--color-fg)]">
                            {t.name}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-[color:var(--color-fg-mute)]">
                            {t.correctCount}/{t.totalCount}
                            {!calibrating && (
                              <span className="ml-2" style={{ color }}>{pct}%</span>
                            )}
                          </span>
                        </div>
                        {!calibrating && (
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-rule-hi)]">
                            <AnimatedBar pct={pct} color={color} delay={i * 70} rounded />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="col-span-12 min-w-0 lg:col-span-7">
            <SectionHead title="First Up" />
            <div className="mt-3">
              {nextQuestion ? (
                <PreviewQuestion question={nextQuestion} />
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-8 text-center">
                  <Raccoon mood="idle" size={72} />
                  <p className="font-sans text-[13px] text-[color:var(--color-fg-soft)]">
                    No questions available yet.
                  </p>
                  <p className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
                    Enroll in a course to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-rule)] pb-2">
      <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
        {title}
      </h2>
      {hint && (
        <span className="hidden font-sans text-[11px] text-[color:var(--color-fg-mute)] sm:inline">
          {hint}
        </span>
      )}
    </div>
  );
}
