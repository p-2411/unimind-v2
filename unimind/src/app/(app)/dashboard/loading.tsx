import { SidebarTrigger } from "~/components/ui/sidebar";

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
    />
  );
}

export default function DashboardLoading() {
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
        {/* Greeting */}
        <section>
          <Pulse className="h-2.5 w-12" />
          <Pulse className="mt-3 h-8 w-56" />
        </section>

        {/* Quote aside */}
        <div className="mt-6 overflow-hidden rounded-xl border-l-2 border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-4 py-3">
          <Pulse className="h-3.5 w-full max-w-sm" />
          <Pulse className="mt-2 h-2.5 w-28" />
        </div>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[color:var(--color-panel)] px-5 py-5">
              <Pulse className="h-2.5 w-20" />
              <Pulse className="mt-3 h-9 w-14" />
              <Pulse className="mt-2 h-2.5 w-20" />
            </div>
          ))}
        </div>

        {/* Bottom two-column section */}
        <div className="mt-8 grid grid-cols-12 gap-4">
          {/* Topic mastery */}
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-rule)] pb-2">
              <Pulse className="h-4 w-28" />
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border-b border-[color:var(--color-rule)] px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Pulse className="h-3 w-32" />
                    <Pulse className="h-2.5 w-14" />
                  </div>
                  <Pulse className="mt-2 h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* First Up */}
          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-end gap-4 border-b border-[color:var(--color-rule)] pb-2">
              <Pulse className="h-4 w-16" />
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
              {/* Card header */}
              <div className="flex items-center gap-3 border-b border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2">
                <Pulse className="h-2.5 w-24" />
                <Pulse className="h-2.5 w-20" />
                <Pulse className="ml-auto h-2.5 w-16" />
              </div>
              {/* Question text */}
              <div className="space-y-2 px-5 py-5">
                <Pulse className="h-4 w-full" />
                <Pulse className="h-4 w-5/6" />
              </div>
              {/* Choices */}
              <div className="grid grid-cols-1 gap-px border-t border-[color:var(--color-rule)] bg-[color:var(--color-rule)] sm:grid-cols-2">
                {(["w-[48%]", "w-[58%]", "w-[68%]", "w-[78%]"] as const).map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-[color:var(--color-panel)] px-4 py-3"
                  >
                    <div className="h-6 w-6 shrink-0 rounded border border-[color:var(--color-rule-hi)] animate-pulse" />
                    <Pulse className={`h-3 rounded-full ${w}`} />
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div className="flex items-center border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-2.5">
                <Pulse className="ml-auto h-7 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
