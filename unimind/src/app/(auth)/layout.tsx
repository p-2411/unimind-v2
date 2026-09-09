import { Suspense } from "react";
import { UnimindLogo } from "~/components/logo";
import { SocialProofTicker } from "~/components/social-proof-ticker";
import { shouldShowSocialProof } from "~/lib/social-proof";
import { api } from "~/trpc/server";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh overflow-x-hidden bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <div
        aria-hidden
        className="term-scan pointer-events-none absolute inset-x-0 top-0 h-px origin-left bg-[color:var(--color-phosphor)]/40"
      />

      <div className="relative grid min-h-svh min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)]">
        {/* Decorative pane — persists across auth route changes */}
        <aside className="relative hidden overflow-hidden border-r border-[color:var(--color-rule)] lg:block">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          <div className="relative flex h-full flex-col justify-between p-10">
            <div className="term-rise flex items-center gap-3">
              <UnimindLogo className="h-9 w-9 text-[color:var(--color-phosphor)]" />
              <div className="leading-tight">
                <div className="font-mono text-[20px] font-semibold tracking-tight">
                  Unimind
                </div>
                <div className="font-mono text-[10.5px] text-[color:var(--color-fg-mute)]">
                  CS practice console
                </div>
              </div>
            </div>

            <div className="term-rise" style={{ animationDelay: "120ms" }}>
              <h2 className="max-w-sm font-mono text-[32px] leading-[1.05] font-semibold tracking-tight">
                Practice like the
                <br />
                best{" "}
                <span className="text-[color:var(--color-phosphor)]">
                  CS students.
                </span>
              </h2>
              <p className="mt-4 max-w-sm font-sans text-[14px] leading-relaxed text-[color:var(--color-fg-soft)]">
                Topic-weighted question sets, spaced recall, and a streak that
                keeps you honest.
              </p>
              <Suspense fallback={null}>
                <SocialProof />
              </Suspense>
            </div>

            <div
              className="term-rise font-mono text-[11px] leading-[1.7]"
              style={{ animationDelay: "240ms" }}
            >
              <BootLine status="OK" color="phosphor" label="runtime.ready" />
              <BootLine
                status="OK"
                color="phosphor"
                label="question.index loaded"
              />
              <BootLine
                status="··"
                color="fg-mute"
                label="awaiting credentials"
                cursor
              />
            </div>
          </div>
        </aside>

        {children}
      </div>
    </div>
  );
}

async function SocialProof() {
  try {
    const { count } = await api.user.count();
    if (!shouldShowSocialProof(count)) return null;

    return (
      <div className="mt-6">
        <SocialProofTicker count={count} />
      </div>
    );
  } catch {
    return null;
  }
}

function BootLine({
  status,
  color,
  label,
  cursor,
}: {
  status: string;
  color: "phosphor" | "fg-mute";
  label: string;
  cursor?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-[color:var(--color-fg-soft)]">
      <span
        className="w-6 shrink-0 tabular-nums"
        style={{ color: `var(--color-${color})` }}
      >
        [{status}]
      </span>
      <span className={cursor ? "term-caret" : ""}>{label}</span>
    </div>
  );
}
