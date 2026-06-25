import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const [user, allCourses, myCourses] = await Promise.all([
    api.user.me(),
    api.course.list(),
    api.course.listMine(),
  ]);

  const enrolledIds = new Set(myCourses.map((uc) => uc.courseId));
  const weekOverrides = new Map(myCourses.map((uc) => [uc.courseId, uc.currentWeekOverride]));

  const courses = allCourses.map((c) => ({
    id: c.id,
    name: c.name,
    enrolled: enrolledIds.has(c.id),
    startDate: c.startDate?.toISOString() ?? null,
    weekOverride: weekOverrides.get(c.id) ?? null,
  }));

  return (
    <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
          <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
            Unimind <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
            <span className="text-[color:var(--color-fg)]">Settings</span>
          </span>
        </div>
        <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
      </header>

      <SettingsForm user={user} courses={courses} />
    </div>
  );
}
