"use client";

import { useState } from "react";
import type { RouterOutputs } from "~/trpc/react";
import { ChevronDown, ChevronRight } from "lucide-react";

function masteryColor(score: number) {
  if (score >= 80) return "var(--color-phosphor)";
  if (score >= 60) return "var(--color-cyan)";
  if (score >= 40) return "var(--color-amber)";
  return "var(--color-red)";
}

function masteryLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Weak";
  return "Critical";
}

type Topics = RouterOutputs["user"]["progressStats"]["topics"];

export function TopicList({ topics }: { topics: Topics }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(topicId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  }

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-rule)] pb-2">
        <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
          Topic Mastery
        </h2>
        <span className="font-sans text-[11px] text-[color:var(--color-fg-mute)]">
          click to expand
        </span>
      </div>

      <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
        <ul className="divide-y divide-[color:var(--color-rule)]">
          {topics.map((topic, i) => {
            const color = masteryColor(topic.score);
            const isOpen = expanded.has(topic.topicId);
            return (
              <li key={topic.topicId}>
                <button
                  onClick={() => toggle(topic.topicId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--color-panel-hi)]"
                >
                  <span className="text-[color:var(--color-fg-mute)]">
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-sans text-[13px] text-[color:var(--color-fg)]">
                        {topic.name}
                      </span>
                      <span
                        className="shrink-0 font-mono text-[11px] tabular-nums"
                        style={{ color }}
                      >
                        {topic.score}% ·{" "}
                        <span className="text-[color:var(--color-fg-mute)]">
                          {masteryLabel(topic.score)}
                        </span>
                      </span>
                    </span>
                    <div
                      className="term-scan mt-2 h-1.5 w-full overflow-hidden bg-[color:var(--color-rule-hi)]"
                      style={{ animationDelay: `${120 + i * 70}ms` }}
                    >
                      <div
                        className="h-full"
                        style={{ width: `${topic.score}%`, background: color }}
                      />
                    </div>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
