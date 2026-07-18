import { SidebarTrigger } from "~/components/ui/sidebar";
import { Brain } from "lucide-react";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
      style={style}
    />
  );
}

export default function ProgressLoading() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <Pulse className="h-2.5 w-36" />
        </div>
        <div className="h-px w-full bg-[color:var(--color-rule)]" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        {/* Stats grid */}
        <section className="overflow-hidden rounded-xl border border-[color:var(--color-rule)] grid grid-cols-2 gap-px bg-[color:var(--color-rule)] md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[color:var(--color-panel)] px-5 py-5">
              <Pulse className="h-2.5 w-20" />
              <Pulse className="mt-3 h-9 w-16" />
              <Pulse className="mt-2 h-2.5 w-24" />
            </div>
          ))}
        </section>

        {/* XP bar */}
        <section className="mt-4 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-5 py-4">
          <div className="flex items-center justify-between">
            <Pulse className="h-2.5 w-24" />
            <Pulse className="h-2.5 w-8" />
          </div>
          <Pulse className="mt-2 h-2 w-full rounded-full" />
        </section>

        {/* Topic mastery */}
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-rule)] pb-2">
            <Pulse className="h-4 w-28" />
          </div>

          <div className="mt-6">
            <Pulse className="mb-2 h-2 w-36" />
            <div className="overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
              <ul className="divide-y divide-[color:var(--color-rule)]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Pulse className="h-3.5 w-3.5 rounded-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <Pulse className="h-3.5 w-40" />
                          <Pulse className="h-2.5 w-16" />
                        </div>
                        <Pulse
                          className="mt-2 h-1.5 w-full rounded-full"
                          style={{ animationDelay: `${i * 60}ms` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* AI Overview */}
        <section className="mt-8">
          <div className="flex items-end gap-4 border-b border-[color:var(--color-rule)] pb-2">
            <Pulse className="h-4 w-24" />
          </div>
          <div className="mt-3 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-5">
            <div className="flex gap-3">
              <Brain
                className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-magenta)] animate-pulse"
                strokeWidth={2}
              />
              <div className="flex-1 space-y-2">
                <Pulse className="h-3 w-full" />
                <Pulse className="h-3 w-4/5" />
                <Pulse className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
