import { SidebarTrigger } from "~/components/ui/sidebar";

function Pulse({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[color:var(--color-rule-hi)] ${className}`}
      style={style}
    />
  );
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-6">
      {children}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Settings</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-16 pt-8 md:px-8">
        {/* Profile section */}
        <SectionBlock>
          <Pulse className="mb-5 h-3 w-20 border-b border-[color:var(--color-rule)] pb-2" />
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full border-2 border-[color:var(--color-rule-hi)] bg-[color:var(--color-rule-hi)]" />
            <div className="space-y-2">
              <Pulse className="h-3 w-32" />
              <Pulse className="h-2.5 w-24" />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {["Name", "Email"].map((label, i) => (
              <div key={label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
                <Pulse className="h-2.5 w-16 shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
                <div className="h-9 flex-1 animate-pulse rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel-hi)]" style={{ animationDelay: `${i * 60}ms` }} />
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* Password section */}
        <SectionBlock>
          <Pulse className="mb-5 h-3 w-24" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
                <Pulse className="h-2.5 w-28 shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
                <div className="h-9 flex-1 animate-pulse rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel-hi)]" style={{ animationDelay: `${i * 60}ms` }} />
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* Courses section */}
        <SectionBlock>
          <Pulse className="mb-5 h-3 w-20" />
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[color:var(--color-rule)] bg-[color:var(--color-panel-hi)] px-4 py-3"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-[color:var(--color-rule-hi)]" style={{ animationDelay: `${i * 80}ms` }} />
                  <div>
                    <Pulse className="h-3 w-48" style={{ animationDelay: `${i * 80}ms` }} />
                    <Pulse className="mt-1.5 h-2.5 w-24" style={{ animationDelay: `${i * 80}ms` }} />
                  </div>
                </div>
                <Pulse className="h-6 w-12 rounded-full" style={{ animationDelay: `${i * 80}ms` }} />
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* Danger zone */}
        <SectionBlock>
          <Pulse className="mb-5 h-3 w-24" />
          <div className="h-10 animate-pulse rounded-lg border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel-hi)]" />
        </SectionBlock>
      </main>
    </div>
  );
}
