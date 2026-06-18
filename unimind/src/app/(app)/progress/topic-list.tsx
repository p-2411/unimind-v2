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

  // Group topics by course, preserving the mastery-score sort within each group
  const courseGroups = new Map<string, { courseName: string; topics: Topics }>();
  for (const topic of topics) {
    const key = topic.courseId || "__unknown__";
    const group = courseGroups.get(key) ?? { courseName: topic.courseName, topics: [] };
    group.topics.push(topic);
    courseGroups.set(key, group);
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

      {Array.from(courseGroups.entries()).map(([courseId, group]) => (
        <div key={courseId} className="mt-6">
          <div className="mb-2 font-mono text-[10px] tracking-[0.24em] text-[color:var(--color-fg-mute)] uppercase">
            {group.courseName}
          </div>

          <div className="border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
            <ul className="divide-y divide-[color:var(--color-rule)]">
              {group.topics.map((topic, i) => {
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

                    {isOpen && topic.subtopics.length > 0 && (
                      <ul className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-void)]">
                        {topic.subtopics.map((st) => {
                          const acc = Math.round((st.correctCount / st.totalCount) * 100);
                          const stColor = masteryColor(acc);
                          return (
                            <li
                              key={st.id}
                              className="flex items-center border-b border-[color:var(--color-rule)] px-6 py-2.5 last:border-b-0"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline justify-between gap-3">
                                  <span className="truncate font-sans text-[12px] text-[color:var(--color-fg-soft)]">
                                    {st.name}
                                  </span>
                                  <span
                                    className="shrink-0 font-mono text-[10px] tabular-nums"
                                    style={{ color: stColor }}
                                  >
                                    {acc}%{" "}
                                    <span className="text-[color:var(--color-fg-mute)]">
                                      ({st.correctCount}/{st.totalCount})
                                    </span>
                                  </span>
                                </span>
                                <div className="mt-1.5 h-1 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                                  <div
                                    className="h-full"
                                    style={{ width: `${acc}%`, background: stColor }}
                                  />
                                </div>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {isOpen && topic.subtopics.length === 0 && (
                      <div className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-void)] px-6 py-3 font-mono text-[11px] text-[color:var(--color-fg-mute)]">
                        No subtopic data yet — answer more questions to see breakdown.
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </section>
  );
}
