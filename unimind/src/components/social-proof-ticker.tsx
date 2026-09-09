import { Users } from "lucide-react";
import { formatUserCount } from "~/lib/social-proof";

export function SocialProofTicker({ count }: { count: number }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2.5 border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[11px] text-[color:var(--color-fg-soft)]">
      <Users
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-phosphor)]"
        strokeWidth={2}
      />
      <span>
        <span className="font-semibold text-[color:var(--color-fg)] tabular-nums">
          {formatUserCount(count)}
        </span>{" "}
        accounts on UniMind
      </span>
    </div>
  );
}
