"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError } from "~/components/auth-form";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type Course = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
};

export function CoursePicker({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const enroll = api.user.enrollCourses.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  function toggle(id: string) {
    if (enroll.isPending) return;

    setError(null);
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onContinue() {
    if (selected.size < 1 || enroll.isPending) return;
    setError(null);
    enroll.mutate({ courseIds: Array.from(selected) });
  }

  if (courses.length === 0) {
    return (
      <div
        role="status"
        className="border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-4 py-5"
      >
        <p className="font-mono text-[12px] tracking-[0.18em] text-[color:var(--color-fg)] uppercase">
          No courses available
        </p>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-[color:var(--color-fg-soft)]">
          Course enrollment is not ready yet. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5" aria-busy={enroll.isPending}>
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.24em] text-[color:var(--color-fg-mute)] uppercase">
        <span>{courses.length} available</span>
        <span>
          <span className="text-[color:var(--color-phosphor)] tabular-nums">
            {selected.size}
          </span>{" "}
          selected
        </span>
      </div>

      <ul className="grid max-h-[52vh] auto-rows-fr grid-cols-1 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2">
        {courses.map((course) => {
          const isSelected = selected.has(course.id);
          return (
            <li key={course.id} className="h-full min-w-0">
              <button
                type="button"
                onClick={() => toggle(course.id)}
                disabled={enroll.isPending}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex h-full w-full items-start gap-3 border px-3.5 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--color-phosphor)] focus-visible:outline-none focus-visible:ring-inset disabled:cursor-wait disabled:opacity-70",
                  isSelected
                    ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)]/8"
                    : "border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] hover:border-[color:var(--color-fg-soft)]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
                    isSelected
                      ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                      : "border-[color:var(--color-rule-hi)] text-transparent group-hover:border-[color:var(--color-fg-soft)]",
                  )}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[13.5px] leading-tight font-medium break-words text-[color:var(--color-fg)]">
                    {course.name}
                  </div>
                  <div
                    className="mt-1 overflow-hidden font-sans text-[12px] leading-snug text-[color:var(--color-fg-mute)]"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {course.description ?? "\u00A0"}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <AuthError id="course-enrollment-error" message={error} />

      <button
        type="button"
        onClick={onContinue}
        disabled={selected.size < 1 || enroll.isPending}
        aria-busy={enroll.isPending}
        aria-describedby={error ? "course-enrollment-error" : undefined}
        className="group inline-flex w-full items-center justify-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2.5 font-mono text-[12px] tracking-[0.22em] text-[color:var(--color-void)] uppercase transition-colors hover:bg-[color:var(--color-phosphor)]/90 focus-visible:ring-2 focus-visible:ring-[color:var(--color-phosphor)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-void)] focus-visible:outline-none disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
      >
        {enroll.isPending
          ? `Enrolling in ${selected.size}…`
          : selected.size
            ? `Continue with ${selected.size}`
            : "Pick at least one"}
        {selected.size > 0 && !enroll.isPending && (
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        )}
      </button>
    </div>
  );
}
