import { SidebarTrigger } from "~/components/ui/sidebar";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
      style={style}
    />
  );
}

export default function AdminLoading() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Admin</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        {/* Top stat tiles */}
        <section className="grid grid-cols-3 gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[color:var(--color-panel)] px-5 py-5">
              <Pulse className="h-2.5 w-28" style={{ animationDelay: `${i * 60}ms` }} />
              <Pulse className="mt-3 h-9 w-20" style={{ animationDelay: `${i * 60}ms` }} />
              <Pulse className="mt-2 h-2.5 w-16" style={{ animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
        </section>

        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* Recent users table */}
          <section className="col-span-12 lg:col-span-7">
            <div className="flex items-end justify-between border-b border-[color:var(--color-rule)] pb-2">
              <Pulse className="h-4 w-28" />
              <Pulse className="h-2.5 w-14" />
            </div>
            <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
              {/* thead */}
              <div className="flex gap-6 border-b border-[color:var(--color-rule)] px-4 py-2.5">
                <Pulse className="h-2.5 w-12" />
                <Pulse className="h-2.5 w-16" />
                <Pulse className="ml-auto h-2.5 w-12" />
              </div>
              {/* rows */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 border-b border-[color:var(--color-rule)] px-4 py-3 last:border-b-0">
                  <div>
                    <Pulse className="h-3 w-32" style={{ animationDelay: `${i * 40}ms` }} />
                    <Pulse className="mt-1.5 h-2.5 w-44" style={{ animationDelay: `${i * 40}ms` }} />
                  </div>
                  <Pulse className="h-2.5 w-20" style={{ animationDelay: `${i * 40}ms` }} />
                  <Pulse className="ml-auto h-3 w-4" style={{ animationDelay: `${i * 40}ms` }} />
                </div>
              ))}
            </div>
          </section>

          {/* Courses breakdown */}
          <section className="col-span-12 lg:col-span-5">
            <div className="border-b border-[color:var(--color-rule)] pb-2">
              <Pulse className="h-4 w-20" />
            </div>
            <div className="mt-3 space-y-px border border-[color:var(--color-rule)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[color:var(--color-panel)] px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <Pulse className="h-3 w-40" style={{ animationDelay: `${i * 60}ms` }} />
                    <Pulse className="h-2.5 w-16 shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
                  </div>
                  <Pulse className="mt-3 h-1.5 w-full rounded-full" style={{ animationDelay: `${i * 60}ms` }} />
                  <div className="mt-1.5 flex justify-between">
                    <Pulse className="h-2 w-20" style={{ animationDelay: `${i * 60}ms` }} />
                    <Pulse className="h-2 w-20" style={{ animationDelay: `${i * 60}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Anonymous aggregates */}
        <div className="mt-8 border-t border-[color:var(--color-rule)] pt-6">
          <Pulse className="mb-5 h-3.5 w-40" />
          <div className="grid grid-cols-12 gap-6">
            {/* Bar chart */}
            <section className="col-span-12 lg:col-span-5">
              <div className="border-b border-[color:var(--color-rule)] pb-2">
                <Pulse className="h-4 w-32" />
              </div>
              <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-5">
                <div className="flex h-24 items-end gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full animate-pulse rounded-sm bg-[color:var(--color-rule-hi)]"
                        style={{ height: `${30 + Math.sin(i) * 20 + 20}px`, animationDelay: `${i * 50}ms` }}
                      />
                      <Pulse className="h-2 w-full" style={{ animationDelay: `${i * 50}ms` }} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Top topics */}
            <section className="col-span-12 lg:col-span-4">
              <div className="border-b border-[color:var(--color-rule)] pb-2">
                <Pulse className="h-4 w-24" />
              </div>
              <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-[color:var(--color-rule)] px-4 py-2.5 last:border-b-0">
                    <Pulse className="h-2.5 w-4 shrink-0" style={{ animationDelay: `${i * 50}ms` }} />
                    <Pulse className="h-2.5 flex-1" style={{ animationDelay: `${i * 50}ms`, width: `${55 + i * 5}%` }} />
                    <Pulse className="h-2.5 w-8 shrink-0" style={{ animationDelay: `${i * 50}ms` }} />
                  </div>
                ))}
              </div>
            </section>

            {/* By difficulty */}
            <section className="col-span-12 lg:col-span-3">
              <div className="border-b border-[color:var(--color-rule)] pb-2">
                <Pulse className="h-4 w-24" />
              </div>
              <div className="mt-3 space-y-px border border-[color:var(--color-rule)]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-[color:var(--color-panel)] px-4 py-3.5">
                    <div className="flex items-baseline justify-between">
                      <Pulse className="h-2.5 w-12" style={{ animationDelay: `${i * 60}ms` }} />
                      <Pulse className="h-3 w-10" style={{ animationDelay: `${i * 60}ms` }} />
                    </div>
                    <Pulse className="mt-2 h-1 w-full rounded-full" style={{ animationDelay: `${i * 60}ms` }} />
                    <Pulse className="mt-1 h-2 w-20" style={{ animationDelay: `${i * 60}ms` }} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
