"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((course) => {
          const isSelected = selected.has(course.id);
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => toggle(course.id)}
              className={`rounded-lg border p-4 text-left transition ${
                isSelected
                  ? "border-black bg-black/5 ring-2 ring-black"
                  : "border-gray-200 hover:border-gray-400"
              }`}
              style={
                isSelected && course.color
                  ? { borderColor: course.color }
                  : undefined
              }
            >
              <div className="font-medium">{course.name}</div>
              {course.description && (
                <div className="mt-1 text-sm text-gray-600">
                  {course.description}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onContinue}
        disabled={selected.size < 1 || enroll.isPending}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {enroll.isPending
          ? "Enrolling…"
          : `Continue${selected.size ? ` (${selected.size})` : ""}`}
      </button>
    </div>
  );
}
