import { Suspense } from "react";
import { Flame, Brain } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { CountUp } from "~/components/count-up";
import { AnimatedBar } from "~/components/animated-bar";
import { api } from "~/trpc/server";
import { TopicList } from "./topic-list";
import Anthropic from "@anthropic-ai/sdk";
import type { RouterOutputs } from "~/trpc/react";

type ProgressStats = RouterOutputs["user"]["progressStats"];

async function AIOverview({ stats }: { stats: ProgressStats }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const topicSummary = stats.topics
    .map((t) => `${t.score}% mastery (${t.correctCount}/${t.totalCount} correct)`)
    .join("\n");

  const aiResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `You are a study coach. Give a 2-3 sentence personalised overview of this student's progress. Be specific, encouraging but honest. Plain text only, no markdown headings or formatting.\n\nData:\n- Streak: ${stats.currentStreak} days\n- Level: ${stats.level}, XP: ${stats.xp}\n- Topics:\n${topicSummary}`,
      },
    ],
  });

  const text = (aiResponse.content[0] as { text: string }).text;

  return (
    <div className="mt-3 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-5">
      <div className="flex gap-3">
        <Brain
          className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-magenta)]"
          strokeWidth={2}
        />
        <p className="font-sans text-[13.5px] leading-relaxed text-[color:var(--color-fg-soft)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function AIOverviewSkeleton() {
  return (
    <div className="mt-3 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-5">
      <div className="flex gap-3">
        <Brain
          className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-magenta)] animate-pulse"
          strokeWidth={2}
        />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-full rounded bg-[color:var(--color-rule-hi)] animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-[color:var(--color-rule-hi)] animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-[color:var(--color-rule-hi)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default async function ProgressPage() {
  const stats = await api.user.progressStats();

  const xpForNextLevel = 50 * (stats.level + 1) * (stats.level + 1);
  const xpForCurrentLevel = 50 * stats.level * stats.level;
  const xpProgress = Math.min(
    100,
    Math.round(
      ((stats.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) *
        100,
    ),
  );

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Progress</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pt-6 pb-16 md:px-8">
        {/* Stats bar */}
        <section className="term-rise overflow-hidden rounded-xl border border-[color:var(--color-rule)] grid grid-cols-2 gap-px bg-[color:var(--color-rule)] md:grid-cols-4">
          {[
            {
              label: "Streak",
              numericValue: stats.currentStreak,
              prefix: "",
              suffix: "d",
              sub: `Best ${stats.longestStreak}d`,
              color: "amber",
              Icon: Flame as typeof Flame | null,
            },
            {
              label: "Level",
              numericValue: stats.level,
              prefix: "L",
              suffix: "",
              sub: `${stats.xp} XP`,
              color: "phosphor",
              Icon: null as typeof Flame | null,
            },
            {
              label: "XP to next level",
              numericValue: xpForNextLevel - stats.xp,
              prefix: "",
              suffix: "",
              sub: "XP remaining",
              color: "cyan",
              Icon: null as typeof Flame | null,
            },
            {
              label: "Topics tracked",
              numericValue: stats.topics.length,
              prefix: "",
              suffix: "",
              sub: "all time",
              color: "fg",
              Icon: null as typeof Flame | null,
            },
          ].map((tile, i) => (
            <div
              key={tile.label}
              className="term-rise bg-[color:var(--color-panel)] px-5 py-5"
              style={{ animationDelay: `${60 + i * 60}ms` }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                {tile.label}
              </div>
              <div
                className="mt-2 flex items-center gap-2 font-mono text-[32px] font-semibold leading-none tabular-nums"
                style={{ color: `var(--color-${tile.color})` }}
              >
                {tile.Icon && <tile.Icon className="h-6 w-6" strokeWidth={2} fill="currentColor" />}
                <CountUp value={tile.numericValue} prefix={tile.prefix} suffix={tile.suffix} duration={800} />
              </div>
              <div className="mt-2 font-sans text-[11.5px] text-[color:var(--color-fg-mute)]">
                {tile.sub}
              </div>
            </div>
          ))}
        </section>

        {/* XP progress bar */}
        <section
          className="term-rise mt-4 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-5 py-4"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-fg-mute)] uppercase">
              Level {stats.level} → {stats.level + 1}
            </span>
            <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
              {xpProgress}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-rule-hi)]">
            <AnimatedBar pct={xpProgress} color="var(--color-phosphor)" delay={350} rounded />
          </div>
        </section>

        <TopicList topics={stats.topics} />

        {/* AI Overview */}
        <section className="term-rise mt-8" style={{ animationDelay: "200ms" }}>
          <div className="flex items-end gap-4 border-b border-[color:var(--color-rule)] pb-2">
            <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
              AI Overview
            </h2>
            <span className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-magenta)]">
              beta
            </span>
          </div>
          <Suspense fallback={<AIOverviewSkeleton />}>
            <AIOverview stats={stats} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
