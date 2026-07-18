import { SidebarTrigger } from "~/components/ui/sidebar";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
      style={style}
    />
  );
}

function SkeletonCard({ delay }: { delay?: string }) {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-3 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2">
        <div className="h-2.5 w-5 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="h-2.5 w-28 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="h-2.5 w-20 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="ml-auto h-2.5 w-16 rounded-full bg-[color:var(--color-rule-hi)]" />
      </div>
      <div className="space-y-2.5 px-5 py-5">
        <div className="h-3.5 w-full rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="h-3.5 w-4/5 rounded-full bg-[color:var(--color-rule-hi)]" />
      </div>
      <div className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-[color:var(--color-panel)] px-4 py-3">
            <div className="h-6 w-6 shrink-0 rounded border border-[color:var(--color-rule-hi)]" />
            <div
              className="h-3 rounded-full bg-[color:var(--color-rule-hi)]"
              style={{ width: `${48 + i * 12}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
        <div className="h-2.5 w-24 rounded-full bg-[color:var(--color-rule-hi)]" />
        <div className="ml-auto h-7 w-16 rounded-lg bg-[color:var(--color-rule-hi)]" />
      </div>
    </div>
  );
}

export default function QuestionsLoading() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Questions</span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Pulse className="h-2.5 w-20" />
          </div>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section>
          <Pulse className="h-2.5 w-16" />
          <Pulse className="mt-3 h-10 w-48" />
          <Pulse className="mt-3 h-3.5 w-80 max-w-full" />
        </section>

        {/* Filter bar */}
        <div className="mt-6 border-y border-[color:var(--color-rule)] py-3">
          <div className="flex items-center gap-2">
            <div className="h-9 flex-1 animate-pulse rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]" />
            <div className="hidden h-9 w-40 animate-pulse rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] md:block" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[40, 56, 64, 48, 52, 44].map((w, i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]"
                style={{ width: `${w}px`, animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        </div>

        <section className="mt-6 space-y-3">
          <SkeletonCard delay="0ms" />
          <SkeletonCard delay="80ms" />
          <SkeletonCard delay="160ms" />
        </section>
      </main>
    </div>
  );
}
