"use client";

import { useState } from "react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Check, ChevronDown, ChevronUp, Trash2, Upload } from "lucide-react";

const MOCK_USER = {
  name: "Arnav Gupta",
  email: "arnavgupta09au@gmail.com",
  image: null,
};

const MOCK_COURSES = [
  {
    id: "c1",
    name: "COMP1511 Programming Fundamentals",
    enrolled: true,
    currentWeek: 5,
  },
  {
    id: "c2",
    name: "COMP1521 Computer Systems Fundamentals",
    enrolled: true,
    currentWeek: 3,
  },
  {
    id: "c3",
    name: "COMP2521 Data Structures & Algorithms",
    enrolled: false,
    currentWeek: 0,
  },
  {
    id: "c4",
    name: "MATH1131 Mathematics 1A",
    enrolled: false,
    currentWeek: 0,
  },
];

function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-4 border-b border-[color:var(--color-rule)] pb-2">
      <h2 className="font-mono text-[14px] font-semibold tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase">
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
      <span className="w-32 shrink-0 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Input({
  defaultValue,
  readOnly,
  type = "text",
  placeholder,
}: {
  defaultValue?: string;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      readOnly={readOnly}
      placeholder={placeholder}
      className="w-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[13px] text-[color:var(--color-fg)] transition-colors outline-none placeholder:text-[color:var(--color-fg-mute)] read-only:cursor-not-allowed read-only:opacity-50 focus:border-[color:var(--color-phosphor)]"
    />
  );
}

function SaveButton({ label = "Save" }: { label?: string }) {
  const [saved, setSaved] = useState(false);
  function onClick() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-void)] uppercase transition-colors hover:bg-[color:var(--color-phosphor)]/90"
    >
      {saved ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Saved
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, number>>(
    {},
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function toggleCourse(id: string) {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enrolled: !c.enrolled } : c)),
    );
  }

  function adjustWeek(courseId: string, currentWeek: number, delta: number) {
    const base = weekOverrides[courseId] ?? currentWeek;
    setWeekOverrides((prev) => ({
      ...prev,
      [courseId]: Math.max(1, base + delta),
    }));
  }

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

      <main className="mx-auto max-w-2xl px-4 pt-8 pb-16 md:px-8">
        {/* Account */}
        <section className="term-rise">
          <SectionHead title="Account" />
          <div className="space-y-4">
            <Field label="Avatar">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] font-mono text-[16px] text-[color:var(--color-phosphor)]">
                  {MOCK_USER.name[0]}
                </div>
                <button className="inline-flex items-center gap-2 border border-[color:var(--color-rule-hi)] px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-fg-soft)] uppercase transition-colors hover:border-[color:var(--color-fg-soft)]">
                  <Upload className="h-3 w-3" />
                  Upload
                </button>
              </div>
            </Field>
            <Field label="Name">
              <Input defaultValue={MOCK_USER.name} />
            </Field>
            <Field label="Email">
              <Input defaultValue={MOCK_USER.email} readOnly />
            </Field>
            <div className="flex justify-end">
              <SaveButton label="Save account" />
            </div>
          </div>
        </section>

        {/* Password */}
        <section className="term-rise mt-10" style={{ animationDelay: "60ms" }}>
          <SectionHead title="Password" />
          <div className="space-y-4">
            <Field label="Current">
              <Input type="password" placeholder="••••••••" />
            </Field>
            <Field label="New">
              <Input type="password" placeholder="••••••••" />
            </Field>
            <Field label="Confirm">
              <Input type="password" placeholder="••••••••" />
            </Field>
            <div className="flex justify-end">
              <SaveButton label="Change password" />
            </div>
          </div>
        </section>

        {/* Courses */}
        <section
          className="term-rise mt-10"
          style={{ animationDelay: "120ms" }}
        >
          <SectionHead title="Courses" />
          <ul className="divide-y divide-[color:var(--color-rule)] border border-[color:var(--color-rule)]">
            {courses.map((course) => (
              <li key={course.id} className="bg-[color:var(--color-panel)]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleCourse(course.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                      course.enrolled
                        ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                        : "border-[color:var(--color-rule-hi)] text-transparent hover:border-[color:var(--color-fg-soft)]"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <span className="flex-1 font-sans text-[13px] text-[color:var(--color-fg)]">
                    {course.name}
                  </span>
                </div>

                {course.enrolled && (
                  <div className="flex items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-void)] px-4 py-2.5">
                    <span className="font-mono text-[11px] tracking-[0.16em] text-[color:var(--color-fg-mute)] uppercase">
                      Week
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          adjustWeek(course.id, course.currentWeek, -1)
                        }
                        className="border border-[color:var(--color-rule-hi)] p-1 transition-colors hover:border-[color:var(--color-fg-soft)]"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-mono text-[13px] text-[color:var(--color-phosphor)] tabular-nums">
                        {weekOverrides[course.id] ?? course.currentWeek}
                      </span>
                      <button
                        onClick={() =>
                          adjustWeek(course.id, course.currentWeek, 1)
                        }
                        className="border border-[color:var(--color-rule-hi)] p-1 transition-colors hover:border-[color:var(--color-fg-soft)]"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                    </div>
                    {weekOverrides[course.id] && (
                      <span className="font-mono text-[10px] tracking-[0.16em] text-[color:var(--color-amber)] uppercase">
                        session override
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <SaveButton label="Save courses" />
          </div>
        </section>

        {/* Notifications */}
        <section
          className="term-rise mt-10"
          style={{ animationDelay: "180ms" }}
        >
          <SectionHead title="Notifications" />
          <div className="border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-sans text-[13px] text-[color:var(--color-fg)]">
                  Daily study reminder
                </div>
                <div className="mt-0.5 font-sans text-[11px] text-[color:var(--color-fg-mute)]">
                  Coming soon
                </div>
              </div>
              <div className="border border-[color:var(--color-rule-hi)] px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase">
                Soon
              </div>
            </div>
          </div>
        </section>

        {/* Feedback */}
        <section
          className="term-rise mt-10"
          style={{ animationDelay: "240ms" }}
        >
          <SectionHead title="Feedback" />
          <div className="space-y-3">
            {["Report a bug", "Suggest a question", "General feedback"].map(
              (label) => (
                <button
                  key={label}
                  className="w-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-4 py-3 text-left font-sans text-[13px] text-[color:var(--color-fg-soft)] transition-colors hover:border-[color:var(--color-fg-soft)] hover:text-[color:var(--color-fg)]"
                >
                  {label}{" "}
                  <span className="ml-2 font-mono text-[10px] tracking-[0.16em] text-[color:var(--color-fg-mute)] uppercase">
                    coming soon
                  </span>
                </button>
              ),
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section
          className="term-rise mt-10"
          style={{ animationDelay: "300ms" }}
        >
          <SectionHead title="Danger Zone" />
          <div className="border border-[color:var(--color-red)]/30 bg-[color:var(--color-panel)] px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-sans text-[13px] text-[color:var(--color-fg)]">
                  Delete account
                </div>
                <div className="mt-0.5 font-sans text-[11px] text-[color:var(--color-fg-mute)]">
                  Permanently delete your account and all data. This cannot be
                  undone.
                </div>
              </div>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="inline-flex shrink-0 items-center gap-2 border border-[color:var(--color-red)]/50 px-3 py-2 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-red)] uppercase transition-colors hover:border-[color:var(--color-red)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="border border-[color:var(--color-rule-hi)] px-3 py-2 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase transition-colors hover:border-[color:var(--color-fg-soft)]"
                  >
                    Cancel
                  </button>
                  <button className="border border-[color:var(--color-red)] bg-[color:var(--color-red)] px-3 py-2 font-mono text-[11px] tracking-[0.18em] text-white uppercase">
                    Confirm
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
