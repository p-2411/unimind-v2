"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { formatUserCount } from "~/lib/social-proof";
import { cn } from "~/lib/utils";

export function SocialProofTicker({ initialCount }: { initialCount: number }) {
  const start = Math.max(0, initialCount - 12);
  const [count, setCount] = useState(start);
  const [flash, setFlash] = useState(false);
  const [climbed, setClimbed] = useState(start >= initialCount);

  useEffect(() => {
    if (climbed) return;
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c + 1 >= initialCount) {
          setClimbed(true);
          return initialCount;
        }
        return c + 1;
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [climbed, initialCount]);

  useEffect(() => {
    if (!climbed) return;
    let cancelled = false;
    function schedule() {
      const delay = 6000 + Math.random() * 8000;
      window.setTimeout(() => {
        if (cancelled) return;
        setCount((c) => c + 1);
        setFlash(true);
        window.setTimeout(() => {
          if (!cancelled) setFlash(false);
        }, 600);
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      cancelled = true;
    };
  }, [climbed]);

  return (
    <div className="inline-flex items-center gap-2.5 border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[11px] text-[color:var(--color-fg-soft)]">
      <Users
        className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-phosphor)]"
        strokeWidth={2}
      />
      <span>
        <span
          className={cn(
            "font-semibold tabular-nums transition-colors duration-500",
            flash ? "text-[color:var(--color-phosphor)]" : "text-[color:var(--color-fg)]",
          )}
        >
          {formatUserCount(count)}
        </span>{" "}
        CS students already practicing
      </span>
      <span className="ml-1 inline-flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-phosphor)] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-phosphor)]" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-mute)]">
          live
        </span>
      </span>
    </div>
  );
}
