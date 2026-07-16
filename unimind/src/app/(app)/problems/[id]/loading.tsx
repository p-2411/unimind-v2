import { SidebarTrigger } from "~/components/ui/sidebar";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
      style={style}
    />
  );
}

export default function ProblemDetailLoading() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <Pulse className="h-2.5 w-40" />
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-8">
        {/* Back link */}
        <Pulse className="h-3 w-24" />

        {/* Title block */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Pulse className="h-5 w-16 rounded-full" />
            <Pulse className="h-5 w-20 rounded-full" />
          </div>
          <Pulse className="mt-3 h-9 w-64" />
        </div>

        {/* Hints */}
        <div className="mt-6 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
          <div className="flex items-center justify-between px-4 py-3">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-3 w-8" />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-5">
          <div className="space-y-2.5">
            <Pulse className="h-3.5 w-full" />
            <Pulse className="h-3.5 w-5/6" />
            <Pulse className="h-3.5 w-full" />
            <Pulse className="h-3.5 w-3/4" />
          </div>
          {/* Fake code block */}
          <div className="mt-5 rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-void)] p-4">
            <div className="space-y-2">
              {[80, 60, 70, 50, 65, 55, 40].map((w, i) => (
                <Pulse
                  key={i}
                  className="h-3 rounded-full"
                  style={{ width: `${w}%`, animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <Pulse className="h-3.5 w-full" />
            <Pulse className="h-3.5 w-2/3" />
          </div>
        </div>

        {/* Reveal solution button */}
        <div className="mt-4 animate-pulse rounded-xl border border-dashed border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-5 py-4">
          <div className="flex items-center justify-between">
            <Pulse className="h-3.5 w-32" />
            <Pulse className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
