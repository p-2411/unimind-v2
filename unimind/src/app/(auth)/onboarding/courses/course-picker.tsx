"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { AuthError } from "~/components/auth-form";
import { cn } from "~/lib/utils";

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
    onError: (e) => setError(e.message),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onContinue() {
    if (selected.size < 1) return;
    setError(null);
    enroll.mutate({ courseIds: Array.from(selected) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-fg-mute)]">
        <span>{courses.length} available</span>
        <span>
          <span className="text-[color:var(--color-phosphor)] tabular-nums">
            {selected.size}
          </span>{" "}
          selected
        </span>
      </div>

      <ul className="grid max-h-[52vh] auto-rows-fr grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {courses.map((course) => {
          const isSelected = selected.has(course.id);
          return (
            <li key={course.id} className="h-full">
              <button
                type="button"
                onClick={() => toggle(course.id)}
                className={cn(
                  "group relative flex h-full w-full items-start gap-3 border px-3.5 py-3 text-left transition-colors",
                  isSelected
                    ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)]/8"
                    : "border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] hover:border-[color:var(--color-fg-soft)]",
                )}
              >
                <span
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
                  <div className="font-mono text-[13.5px] font-medium leading-tight text-[color:var(--color-fg)]">
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

      <AuthError message={error} />

      <button
        type="button"
        onClick={onContinue}
        disabled={selected.size < 1 || enroll.isPending}
        className="group inline-flex w-full items-center justify-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.22em] text-[color:var(--color-void)] transition-colors hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
      >
        {enroll.isPending
          ? "Enrolling…"
          : selected.size
            ? `Continue with ${selected.size}`
            : "Pick at least one"}
        {selected.size > 0 && !enroll.isPending && (
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        )}
      </button>
    </div>
  );
}
