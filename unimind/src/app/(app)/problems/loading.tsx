import { SidebarTrigger } from "~/components/ui/sidebar";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
      style={style}
    />
  );
}

export default function ProblemsLoading() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Problems</span>
          </span>
          <Pulse className="ml-auto h-2.5 w-20" />
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section>
          <Pulse className="h-2.5 w-24" />
          <Pulse className="mt-3 h-10 w-36" />
          <Pulse className="mt-3 h-3.5 w-96 max-w-full" />
        </section>

        {/* Stats row */}
        <section className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-rule)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[color:var(--color-panel)] px-5 py-4">
              <Pulse className="h-2.5 w-16" style={{ animationDelay: `${i * 60}ms` }} />
              <Pulse className="mt-2 h-7 w-10" style={{ animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
        </section>

        {/* Table */}
        <section className="mt-6 overflow-hidden rounded-xl border border-[color:var(--color-rule)]">
          {/* thead */}
          <div className="flex gap-4 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
            <Pulse className="h-2.5 w-12" />
            <Pulse className="h-2.5 w-24" />
            <Pulse className="ml-auto hidden h-2.5 w-16 md:block" />
            <Pulse className="hidden h-2.5 w-12 sm:block" />
            <Pulse className="h-2.5 w-16" />
          </div>
          {/* rows */}
          <div className="divide-y divide-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Pulse className="h-4 w-4 rounded-full" style={{ animationDelay: `${i * 50}ms` }} />
                <Pulse className="h-3 w-40" style={{ animationDelay: `${i * 50}ms` }} />
                <Pulse className="ml-auto hidden h-3 w-28 md:block" style={{ animationDelay: `${i * 50}ms` }} />
                <Pulse className="hidden h-2.5 w-12 sm:block" style={{ animationDelay: `${i * 50}ms` }} />
                <Pulse className="h-2.5 w-12" style={{ animationDelay: `${i * 50}ms` }} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
