import { api, HydrateClient } from "~/trpc/server";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { AchievementsGrid } from "./achievements-grid";

export default async function AchievementsPage() {
  const data = await api.achievement.listForUser();

  return (
    <HydrateClient>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AchievementsContent data={data} />
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}

function AchievementsContent({
  data,
}: {
  data: Awaited<ReturnType<typeof api.achievement.listForUser>>;
}) {
  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Unimind <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Achievements</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <main className="px-4 pb-16 pt-6 md:px-8">
        <section className="term-rise">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-fg-mute)]">
            Collection
          </div>
          <h1 className="mt-1 font-mono text-[22px] font-semibold text-[color:var(--color-fg)]">
            {data.earned.length} / {data.totalCount} unlocked
            <span className="ml-3 text-[color:var(--color-fg-mute)]">
              · {data.xpFromAchievements} XP earned
            </span>
          </h1>
        </section>

        <AchievementsGrid data={data} />
      </main>
    </div>
  );
}
