"use client";

import { useState, useMemo } from "react";
import type { RouterOutputs } from "~/trpc/react";

type Data = RouterOutputs["achievement"]["listForUser"];

type Tile =
  | {
      kind: "earned";
      achievement: Data["earned"][number]["achievement"];
      earnedAt: Date;
      progress: number;
    }
  | {
      kind: "locked";
      achievement: Data["locked"][number]["achievement"];
      earnedAt: null;
      progress: number | null;
    };

const CATEGORIES = ["all", "streak", "volume", "mastery", "breadth", "meta"] as const;
type Category = (typeof CATEGORIES)[number];

export function AchievementsGrid({ data }: { data: Data }) {
  const [category, setCategory] = useState<Category>("all");
  const [lockedOnly, setLockedOnly] = useState(false);

  const tiles = useMemo(() => {
    const earned: Tile[] = data.earned.map((e) => ({
      kind: "earned",
      achievement: e.achievement,
      earnedAt: e.earnedAt,
      progress: 1,
    }));
    const locked: Tile[] = data.locked.map((l) => ({
      kind: "locked",
      achievement: l.achievement,
      earnedAt: null,
      progress: l.progress,
    }));
    let merged = [...earned, ...locked];
    if (category !== "all") {
      merged = merged.filter((t) => t.achievement.category === category);
    }
    if (lockedOnly) {
      merged = merged.filter((t) => t.kind === "locked");
    }
    return merged;
  }, [data, category, lockedOnly]);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={
              "font-mono text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 border " +
              (category === c
                ? "border-[color:var(--color-cyan)] text-[color:var(--color-cyan)]"
                : "border-[color:var(--color-rule)] text-[color:var(--color-fg-mute)] hover:text-[color:var(--color-fg)]")
            }
          >
            {c}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
          <input
            type="checkbox"
            checked={lockedOnly}
            onChange={(e) => setLockedOnly(e.target.checked)}
          />
          Locked only
        </label>
      </div>

      <section className="mt-4 grid grid-cols-1 gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const pct = t.progress === null ? null : Math.round(t.progress * 100);
          return (
            <div
              key={t.achievement.id}
              className={
                "bg-[color:var(--color-panel)] p-4 " +
                (t.kind === "locked" ? "opacity-75" : "")
              }
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em]">
                <span className="text-[color:var(--color-fg-mute)]">
                  {t.achievement.category} · tier {t.achievement.tier}
                </span>
                <span
                  style={{
                    color:
                      t.kind === "earned"
                        ? "var(--color-phosphor)"
                        : "var(--color-fg-mute)",
                  }}
                >
                  {t.kind === "earned"
                    ? `Earned · ${t.earnedAt.toISOString().slice(0, 10)}`
                    : pct === null
                      ? "Locked"
                      : `Locked · ${pct}%`}
                </span>
              </div>
              <div className="mt-2 font-mono text-[15px] text-[color:var(--color-fg)]">
                {t.achievement.name}
              </div>
              <div className="mt-1 font-sans text-[12.5px] text-[color:var(--color-fg-mute)]">
                {t.achievement.description}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-amber)]">
                +{t.achievement.xpReward} XP
              </div>
              {t.kind === "locked" && pct !== null && (
                <div className="mt-2 h-1 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                  <div
                    className="h-full bg-[color:var(--color-cyan)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {tiles.length === 0 && (
        <div className="mt-4 border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]/50 p-10 text-center font-sans text-[13px] text-[color:var(--color-fg-soft)]">
          No achievements match this filter.
        </div>
      )}
    </>
  );
}
