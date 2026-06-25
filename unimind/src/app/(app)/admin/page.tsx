import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/server";
import { TRPCError } from "@trpc/server";

// Filler data for anonymous aggregate stats — replace with real queries when wiring up analytics
const FILLER_DAILY = [
  { day: "Mon", attempts: 34 },
  { day: "Tue", attempts: 58 },
  { day: "Wed", attempts: 91 },
  { day: "Thu", attempts: 47 },
  { day: "Fri", attempts: 73 },
  { day: "Sat", attempts: 22 },
  { day: "Sun", attempts: 61 },
];

const FILLER_TOP_TOPICS = [
  { name: "MIPS Basics", attempts: 312, accuracy: 71 },
  { name: "Integer Representations", attempts: 287, accuracy: 64 },
  { name: "Bit Manipulation", attempts: 241, accuracy: 68 },
  { name: "MIPS Control Flow", attempts: 198, accuracy: 59 },
  { name: "Floating Point Representation", attempts: 154, accuracy: 52 },
];

const FILLER_DIFFICULTY = [
  { label: "Easy", count: 1840, accuracy: 82 },
  { label: "Medium", count: 1203, accuracy: 67 },
  { label: "Hard", count: 721, accuracy: 48 },
];

export default async function AdminPage() {
  try {
    const data = await api.admin.stats();

    const maxAttempts = Math.max(...FILLER_DAILY.map((d) => d.attempts));

    return (
      <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
        <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
          <div className="flex h-12 items-center gap-3 px-4">
            <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
            <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
              Unimind <span className="text-[color:var(--color-fg-mute)]">/</span>{" "}
              <span className="text-[color:var(--color-fg)]">Admin</span>
            </span>
          </div>
          <div className="term-scan h-px w-full origin-left bg-gradient-to-r from-[color:var(--color-phosphor)] via-[color:var(--color-cyan)] to-transparent" />
        </header>

        <main className="px-4 pb-16 pt-6 md:px-8">
          {/* Top stat tiles */}
          <section className="term-rise grid grid-cols-3 gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)]">
            {[
              {
                label: "Total Users",
                value: String(data.totalUsers),
                delta: data.newUsersToday > 0 ? `+${data.newUsersToday} today` : "none today",
                tone: "phosphor",
              },
              {
                label: "Questions Answered",
                value: data.totalAttempts.toLocaleString(),
                delta: data.attemptsToday > 0 ? `+${data.attemptsToday} today` : "none today",
                tone: "cyan",
              },
              {
                label: "Overall Accuracy",
                value: data.accuracy !== null ? `${data.accuracy}%` : "—",
                delta: "all-time",
                tone: "amber",
              },
            ].map((tile, i) => (
              <div
                key={tile.label}
                className="term-rise bg-[color:var(--color-panel)] px-5 py-5"
                style={{ animationDelay: `${60 + i * 60}ms` }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
                  {tile.label}
                </div>
                <div
                  className="mt-2 font-mono text-[36px] font-semibold leading-none tabular-nums"
                  style={{ color: `var(--color-${tile.tone})` }}
                >
                  {tile.value}
                </div>
                <div className="mt-2 font-sans text-[11.5px] text-[color:var(--color-fg-mute)]">
                  {tile.delta}
                </div>
              </div>
            ))}
          </section>

          <div className="mt-6 grid grid-cols-12 gap-6">
            {/* Recent users */}
            <section className="term-rise col-span-12 lg:col-span-7" style={{ animationDelay: "120ms" }}>
              <SectionHead title="Recent Users" hint={`${data.totalUsers} total`} />
              <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
                {data.recentUsers.length === 0 ? (
                  <div className="p-6 text-center font-sans text-[13px] text-[color:var(--color-fg-mute)]">
                    No users yet.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[color:var(--color-rule)]">
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
                          User
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
                          Joined
                        </th>
                        <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-mute)]">
                          Courses
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-rule)]">
                      {data.recentUsers.map((u) => (
                        <tr key={u.id} className="transition-colors hover:bg-[color:var(--color-rule)]/30">
                          <td className="px-4 py-3">
                            <div className="font-sans text-[13px] text-[color:var(--color-fg)]">
                              {u.name ?? <span className="text-[color:var(--color-fg-mute)]">—</span>}
                            </div>
                            <div className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
                              {u.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-[color:var(--color-fg-soft)]">
                            {new Date(u.joinedAt).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-[color:var(--color-fg-soft)]">
                            {u.courseCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Courses breakdown */}
            <section className="term-rise col-span-12 lg:col-span-5" style={{ animationDelay: "180ms" }}>
              <SectionHead title="Courses" />
              <div className="mt-3 space-y-px border border-[color:var(--color-rule)]">
                {data.courses.map((c) => {
                  const pct = c.avgMastery ?? 0;
                  const color =
                    pct < 50
                      ? "var(--color-red)"
                      : pct < 70
                        ? "var(--color-amber)"
                        : "var(--color-phosphor)";
                  return (
                    <div key={c.id} className="bg-[color:var(--color-panel)] px-4 py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-mono text-[12px] tracking-tight text-[color:var(--color-fg)]">
                          {c.name}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--color-fg-mute)]">
                          {c.enrolled} enrolled
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                        <span>{c.attempts.toLocaleString()} attempts</span>
                        <span style={{ color: c.avgMastery !== null ? color : undefined }}>
                          {c.avgMastery !== null ? `${c.avgMastery}% avg mastery` : "no data"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {data.courses.length === 0 && (
                  <div className="bg-[color:var(--color-panel)] p-6 text-center font-sans text-[13px] text-[color:var(--color-fg-mute)]">
                    No courses yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Anonymous aggregate stats ── */}
          <div className="mt-8 border-t border-[color:var(--color-rule)] pt-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-[13px] font-semibold tracking-tight text-[color:var(--color-fg)]">
                Anonymous Aggregates
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-amber)]">
                filler
              </span>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Activity this week */}
              <section className="term-rise col-span-12 lg:col-span-5" style={{ animationDelay: "60ms" }}>
                <SectionHead title="Activity This Week" hint="questions answered" />
                <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-5">
                  <div className="flex h-24 items-end gap-2">
                    {FILLER_DAILY.map((d) => (
                      <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                        <div
                          className="w-full bg-[color:var(--color-cyan)] opacity-80 transition-all"
                          style={{ height: `${Math.round((d.attempts / maxAttempts) * 96)}px` }}
                        />
                        <span className="font-mono text-[9px] text-[color:var(--color-fg-mute)]">
                          {d.day}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                    <span>0</span>
                    <span>{maxAttempts}</span>
                  </div>
                </div>
              </section>

              {/* Top topics */}
              <section className="term-rise col-span-12 lg:col-span-4" style={{ animationDelay: "120ms" }}>
                <SectionHead title="Top Topics" hint="by attempts" />
                <div className="mt-3 border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
                  <ul className="divide-y divide-[color:var(--color-rule)]">
                    {FILLER_TOP_TOPICS.map((t, i) => (
                      <li key={t.name} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-4 shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--color-fg-mute)]">
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate font-sans text-[12.5px] text-[color:var(--color-fg)]">
                          {t.name}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-[color:var(--color-fg-mute)]">
                          {t.attempts}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Accuracy by difficulty */}
              <section className="term-rise col-span-12 lg:col-span-3" style={{ animationDelay: "180ms" }}>
                <SectionHead title="By Difficulty" hint="accuracy" />
                <div className="mt-3 space-y-px border border-[color:var(--color-rule)]">
                  {FILLER_DIFFICULTY.map((d) => {
                    const color =
                      d.accuracy >= 75
                        ? "var(--color-phosphor)"
                        : d.accuracy >= 55
                          ? "var(--color-amber)"
                          : "var(--color-red)";
                    return (
                      <div key={d.label} className="bg-[color:var(--color-panel)] px-4 py-3.5">
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-[color:var(--color-fg-mute)]">
                            {d.label}
                          </span>
                          <span className="font-mono text-[13px] tabular-nums" style={{ color }}>
                            {d.accuracy}%
                          </span>
                        </div>
                        <div className="mt-2 h-1 w-full overflow-hidden bg-[color:var(--color-rule-hi)]">
                          <div className="h-full" style={{ width: `${d.accuracy}%`, background: color }} />
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                          {d.count.toLocaleString()} attempts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  } catch (e) {
    const isForbidden = e instanceof TRPCError && e.code === "FORBIDDEN";
    if (!isForbidden) throw e;

    return (
      <div className="min-h-svh bg-[color:var(--color-void)] text-[color:var(--color-fg)]">
        <header className="sticky top-0 z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-void)]/90 backdrop-blur">
          <div className="flex h-12 items-center gap-3 px-4">
            <SidebarTrigger className="-ml-1 text-[color:var(--color-fg-soft)]" />
            <span className="font-mono text-[11px] text-[color:var(--color-fg-mute)]">
              Unimind / Admin
            </span>
          </div>
        </header>
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-red)]">
            Access denied
          </span>
          <p className="font-sans text-[13px] text-[color:var(--color-fg-mute)]">
            Your account is not authorised to view this page.
          </p>
        </main>
      </div>
    );
  }
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-rule)] pb-2">
      <h2 className="font-mono text-[16px] font-semibold tracking-tight text-[color:var(--color-fg)]">
        {title}
      </h2>
      {hint && (
        <span className="font-sans text-[11px] text-[color:var(--color-fg-mute)]">{hint}</span>
      )}
    </div>
  );
}
