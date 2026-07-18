import { SidebarTrigger } from "~/components/ui/sidebar";
import { GroupsClient } from "./groups-client";

export default function GroupsPage() {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Mastify <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Groups</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-cyan)] via-[color:var(--color-phosphor)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            Study
          </div>
          <h1 className="mt-2 font-mono text-[36px] font-semibold leading-[1] tracking-tight md:text-[44px]">
            Groups
          </h1>
          <p className="mt-2 max-w-lg font-sans text-[14px] text-[color:var(--color-fg-soft)]">
            Study with friends. See who&apos;s grinding, share progress, and keep the streak alive together.
          </p>
        </section>

        <div className="term-rise mt-8" style={{ animationDelay: "80ms" }}>
          <GroupsClient />
        </div>
      </main>
    </div>
  );
}
