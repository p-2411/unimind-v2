"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { useSupabase } from "~/components/providers/supabase-provider";
import { useRouter } from "next/navigation";

type User = RouterOutputs["user"]["me"];
type Course = { id: string; name: string; enrolled: boolean; startDate: string | null; weekOverride: number | null; flexWeeks: number[] };

function courseWeek(startDate: string | null, flexWeeks: number[] = []): number {
  if (!startDate) return 1;
  const ms = Date.now() - new Date(startDate).getTime();
  const calWeek = Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
  const flexPassed = flexWeeks.filter((w) => w <= calWeek).length;
  return Math.max(1, calWeek - flexPassed);
}

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
  value,
  onChange,
  readOnly,
  type = "text",
  placeholder,
}: {
  value?: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      placeholder={placeholder}
      className="w-full border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[13px] text-[color:var(--color-fg)] transition-colors outline-none placeholder:text-[color:var(--color-fg-mute)] read-only:cursor-not-allowed read-only:opacity-50 focus:border-[color:var(--color-phosphor)]"
    />
  );
}

function SaveButton({
  label,
  savedLabel = "Saved",
  saved,
  pending,
  disabled,
  onClick,
}: {
  label: string;
  savedLabel?: string;
  saved: boolean;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-void)] uppercase transition-colors hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
    >
      {saved ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> {savedLabel}
        </>
      ) : pending ? (
        "Saving…"
      ) : (
        label
      )}
    </button>
  );
}

export function SettingsForm({
  user,
  courses: initialCourses,
}: {
  user: User;
  courses: Course[];
}) {
  const { supabase } = useSupabase();

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;
    setAvatarPending(true);
    setAvatarError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", { method: "POST", body: form });
    const json = (await res.json()) as { url?: string; error?: string };
    setAvatarPending(false);
    if (!res.ok || !json.url) {
      setAvatarError(json.error ?? "Upload failed.");
      return;
    }
    setAvatarUrl(json.url);
  }

  // Account
  const [name, setName] = useState(user.name);
  const [nameSaved, setNameSaved] = useState(false);
  const updateName = api.user.updateName.useMutation({
    onSuccess: () => {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    },
  });

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordPending(true);
    setPasswordError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      setPasswordError("Current password is incorrect.");
      setPasswordPending(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPasswordPending(false);
    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 2000);
  }

  // Courses
  const [courses, setCourses] = useState(initialCourses);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, number>>(
    () => Object.fromEntries(initialCourses.filter((c) => c.weekOverride !== null).map((c) => [c.id, c.weekOverride!])),
  );
  const [unenrollConfirm, setUnenrollConfirm] = useState<string | null>(null);

  const enroll = api.course.enroll.useMutation({
    onSuccess: (_, { courseId }) =>
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, enrolled: true } : c)),
      ),
  });

  const unenroll = api.course.unenroll.useMutation({
    onSuccess: (_, { courseId }) => {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, enrolled: false } : c)),
      );
      setUnenrollConfirm(null);
    },
  });

  const setWeekOverride = api.course.setWeekOverride.useMutation();

  const router = useRouter();
  const deleteAccount = api.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await supabase.auth.signOut();
      router.push("/login");
    },
  });

  function handleCourseToggle(course: Course) {
    if (course.enrolled) {
      setUnenrollConfirm(course.id);
    } else {
      enroll.mutate({ courseId: course.id });
    }
  }

  function adjustWeek(courseId: string, delta: number) {
    const course = courses.find((c) => c.id === courseId);
    const current = weekOverrides[courseId] ?? courseWeek(course?.startDate ?? null, course?.flexWeeks);
    const next = Math.max(1, current + delta);
    setWeekOverrides((prev) => ({ ...prev, [courseId]: next }));
    setWeekOverride.mutate({ courseId, week: next });
  }

  // Blocked sites
  const DEFAULT_BLOCKED = [
    'youtube.com', 'reddit.com', 'instagram.com', 'twitter.com',
    'x.com', 'tiktok.com', 'facebook.com', 'netflix.com', 'twitch.tv',
  ];
  const { data: blockedData, refetch: refetchBlocked } = api.user.blockedSites.useQuery(undefined, { refetchOnWindowFocus: true });
  const updateBlocked = api.user.updateBlockedSites.useMutation({ onSuccess: () => void refetchBlocked() });
  const [customInput, setCustomInput] = useState("");

  const disabledDefaults = blockedData?.disabledDefaults ?? [];
  const customBlocked = blockedData?.customBlocked ?? [];

  function toggleDefault(domain: string, enabled: boolean) {
    const next = enabled
      ? disabledDefaults.filter((d) => d !== domain)
      : [...new Set([...disabledDefaults, domain])];
    updateBlocked.mutate({ disabledDefaults: next, customBlocked });
  }

  function removeCustom(domain: string) {
    updateBlocked.mutate({ disabledDefaults, customBlocked: customBlocked.filter((d) => d !== domain) });
  }

  function addCustom() {
    const domain = customInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? '';
    if (!domain || domain.length < 3 || !domain.includes('.')) return;
    if (customBlocked.includes(domain) || DEFAULT_BLOCKED.includes(domain)) { setCustomInput(""); return; }
    updateBlocked.mutate({ disabledDefaults, customBlocked: [...customBlocked, domain] });
    setCustomInput("");
  }

  // Feedback
  const [activeForm, setActiveForm] = useState<"bug" | "suggestion" | "general" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const submitFeedback = api.feedback.submit.useMutation({
    onSuccess: () => {
      setFeedbackSent(activeForm);
      setActiveForm(null);
      setFeedbackMessage("");
      setTimeout(() => setFeedbackSent(null), 3000);
    },
  });

  function handleFeedbackClick(type: "bug" | "suggestion" | "general") {
    if (activeForm === type) { setActiveForm(null); setFeedbackMessage(""); return; }
    setActiveForm(type);
    setFeedbackMessage("");
  }

  // Danger zone
  const [reminderEnabled, setReminderEnabled] = useState(user.dailyReminderEnabled);
  const [reminderTime, setReminderTime] = useState(user.dailyReminderTime);
  const updateNotifPrefs = api.user.updateNotificationPrefs.useMutation();

  function handleReminderToggle(enabled: boolean) {
    setReminderEnabled(enabled);
    updateNotifPrefs.mutate({ enabled, time: reminderTime });
  }

  function handleReminderTime(time: string) {
    setReminderTime(time);
    if (reminderEnabled) updateNotifPrefs.mutate({ enabled: true, time });
  }

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-16 md:px-8">
      {/* Account */}
      <section className="term-rise">
        <SectionHead title="Account" />
        <div className="space-y-4">
          <Field label="Avatar">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-mono text-[16px] text-[color:var(--color-phosphor)]">
                      {name[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarPending}
                  className="inline-flex items-center gap-2 border border-[color:var(--color-rule-hi)] px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-fg-soft)] uppercase transition-colors hover:border-[color:var(--color-fg-soft)] disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {avatarPending ? "Uploading…" : "Upload"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {avatarError && (
                <p className="font-mono text-[11px] text-[color:var(--color-red)]">{avatarError}</p>
              )}
              <p className="font-mono text-[10px] text-[color:var(--color-fg-mute)]">
                JPEG · PNG · WebP · max 2 MB
              </p>
            </div>
          </Field>
          <Field label="Name">
            <Input value={name} onChange={setName} />
          </Field>
          <Field label="Email">
            <Input value={user.email} readOnly />
          </Field>
          <div className="flex justify-end">
            <SaveButton
              label="Save account"
              saved={nameSaved}
              pending={updateName.isPending}
              disabled={name === user.name}
              onClick={() => updateName.mutate({ name })}
            />
          </div>
        </div>
      </section>

      {/* Password */}
      <section className="term-rise mt-10" style={{ animationDelay: "60ms" }}>
        <SectionHead title="Password" />
        <div className="space-y-4">
          <Field label="Current">
            <Input
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="••••••••"
            />
            <Link
              href="/forgot-password"
              className="mt-1 inline-block font-mono text-[10px] tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase transition-colors hover:text-[color:var(--color-phosphor)]"
            >
              Forgot it?
            </Link>
          </Field>
          <Field label="New">
            <Input
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirm">
            <Input
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
            />
          </Field>
          {passwordError && (
            <p className="font-mono text-[11px] text-[color:var(--color-red)]">
              {passwordError}
            </p>
          )}
          <div className="flex justify-end">
            <SaveButton
              label="Change password"
              saved={passwordSaved}
              pending={passwordPending}
              disabled={!currentPassword || !newPassword || !confirmPassword}
              onClick={handlePasswordChange}
            />
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
                  onClick={() => handleCourseToggle(course)}
                  disabled={enroll.isPending || unenroll.isPending}
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

              {unenrollConfirm === course.id && (
                <div className="flex items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-void)] px-4 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-amber)]" />
                  <span className="flex-1 font-sans text-[11px] text-[color:var(--color-fg-mute)]">
                    This deletes all your progress for this course.
                  </span>
                  <button
                    onClick={() => setUnenrollConfirm(null)}
                    className="font-mono text-[10px] tracking-[0.16em] text-[color:var(--color-fg-mute)] uppercase hover:text-[color:var(--color-fg)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => unenroll.mutate({ courseId: course.id })}
                    disabled={unenroll.isPending}
                    className="font-mono text-[10px] tracking-[0.16em] text-[color:var(--color-red)] uppercase hover:opacity-80"
                  >
                    Confirm
                  </button>
                </div>
              )}

              {course.enrolled && unenrollConfirm !== course.id && (
                <div className="flex items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-void)] px-4 py-2.5">
                  <span className="font-mono text-[11px] tracking-[0.16em] text-[color:var(--color-fg-mute)] uppercase">
                    Week
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustWeek(course.id, -1)}
                      className="border border-[color:var(--color-rule-hi)] p-1 transition-colors hover:border-[color:var(--color-fg-soft)]"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-mono text-[13px] text-[color:var(--color-phosphor)] tabular-nums">
                      {weekOverrides[course.id] ?? courseWeek(course.startDate, course.flexWeeks)}
                    </span>
                    <button
                      onClick={() => adjustWeek(course.id, 1)}
                      className="border border-[color:var(--color-rule-hi)] p-1 transition-colors hover:border-[color:var(--color-fg-soft)]"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>
                  {weekOverrides[course.id] !== undefined &&
                    weekOverrides[course.id] !== courseWeek(course.startDate, course.flexWeeks) && (
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[color:var(--color-amber)] uppercase">
                      override
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Notifications */}
      <section
        className="term-rise mt-10"
        style={{ animationDelay: "180ms" }}
      >
        <SectionHead title="Notifications" />
        <div className="border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-sans text-[13px] text-[color:var(--color-fg)]">
                Daily study reminder
              </div>
              <div className="mt-0.5 font-sans text-[11px] text-[color:var(--color-fg-mute)]">
                Delivered via the UniMind Chrome extension
              </div>
            </div>
            <button
              onClick={() => handleReminderToggle(!reminderEnabled)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                reminderEnabled
                  ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                  : "border-[color:var(--color-rule-hi)] text-transparent"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </button>
          </div>
          {reminderEnabled && (
            <div className="mt-3 flex items-center gap-3 border-t border-[color:var(--color-rule)] pt-3">
              <span className="font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase">
                Time
              </span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => handleReminderTime(e.target.value)}
                className="border border-[color:var(--color-rule-hi)] bg-[color:var(--color-void)] px-2 py-1 font-mono text-[12px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-phosphor)]"
              />
            </div>
          )}
        </div>
      </section>

      {/* Blocked Sites */}
      <section className="term-rise mt-10" style={{ animationDelay: "210ms" }}>
        <SectionHead title="Extension — Blocked Sites" />
        <div className="space-y-px border border-[color:var(--color-rule)]">
          {/* Defaults */}
          {DEFAULT_BLOCKED.map((domain) => {
            const enabled = !disabledDefaults.includes(domain);
            return (
              <div
                key={domain}
                className="flex items-center gap-3 bg-[color:var(--color-panel)] px-4 py-2.5"
              >
                <button
                  onClick={() => toggleDefault(domain, !enabled)}
                  disabled={updateBlocked.isPending}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                    enabled
                      ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] text-[color:var(--color-void)]"
                      : "border-[color:var(--color-rule-hi)] text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </button>
                <span
                  className={`flex-1 font-mono text-[12px] ${
                    enabled ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-mute)] line-through"
                  }`}
                >
                  {domain}
                </span>
              </div>
            );
          })}

          {/* Custom sites */}
          {customBlocked.map((domain) => (
            <div
              key={domain}
              className="flex items-center gap-3 bg-[color:var(--color-panel)] px-4 py-2.5"
            >
              <div className="flex h-4 w-4 shrink-0 items-center justify-center border border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)] text-[color:var(--color-void)]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
              <span className="flex-1 font-mono text-[12px] text-[color:var(--color-fg)]">{domain}</span>
              <button
                onClick={() => removeCustom(domain)}
                disabled={updateBlocked.isPending}
                className="font-mono text-[14px] text-[color:var(--color-fg-mute)] transition-colors hover:text-[color:var(--color-red)]"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add custom site */}
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
            placeholder="e.g. twitch.tv"
            className="flex-1 border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-3 py-2 font-mono text-[12px] text-[color:var(--color-fg)] outline-none transition-colors placeholder:text-[color:var(--color-fg-mute)]/50 focus:border-[color:var(--color-phosphor)]"
          />
          <button
            onClick={addCustom}
            disabled={updateBlocked.isPending || !customInput.trim()}
            className="border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-void)] uppercase transition-colors hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
          >
            Add
          </button>
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-[color:var(--color-fg-mute)]">
          Changes sync to the extension when you next open the popup.
        </p>
      </section>

      {/* Feedback */}
      <section
        className="term-rise mt-10"
        style={{ animationDelay: "240ms" }}
      >
        <SectionHead title="Feedback" />
        <div className="space-y-3">
          {(
            [
              { label: "Report a bug", type: "bug" },
              { label: "Suggest a question", type: "suggestion" },
              { label: "General feedback", type: "general" },
            ] as const
          ).map(({ label, type }) => (
            <div key={type} className="border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)]">
              <button
                onClick={() => handleFeedbackClick(type)}
                className="w-full px-4 py-3 text-left font-sans text-[13px] text-[color:var(--color-fg-soft)] transition-colors hover:text-[color:var(--color-fg)]"
              >
                {feedbackSent === type ? (
                  <span className="text-[color:var(--color-phosphor)]">✓ Sent — thanks!</span>
                ) : (
                  label
                )}
              </button>
              {activeForm === type && (
                <div className="border-t border-[color:var(--color-rule)] px-4 pb-4 pt-3">
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={
                      type === "bug"
                        ? "Describe the bug and what you were doing when it happened…"
                        : type === "suggestion"
                          ? "What question would you like to see added?"
                          : "Anything on your mind…"
                    }
                    rows={4}
                    className="w-full resize-none border border-[color:var(--color-rule-hi)] bg-[color:var(--color-void)] px-3 py-2 font-sans text-[13px] text-[color:var(--color-fg)] outline-none transition-colors placeholder:text-[color:var(--color-fg-mute)]/60 focus:border-[color:var(--color-phosphor)]"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => submitFeedback.mutate({ type, message: feedbackMessage })}
                      disabled={!feedbackMessage.trim() || submitFeedback.isPending}
                      className="border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-1.5 font-mono text-[11px] tracking-[0.18em] text-[color:var(--color-void)] uppercase transition-colors hover:bg-[color:var(--color-phosphor)]/90 disabled:cursor-not-allowed disabled:border-[color:var(--color-rule)] disabled:bg-transparent disabled:text-[color:var(--color-fg-mute)]"
                    >
                      {submitFeedback.isPending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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
                <button
                  onClick={() => deleteAccount.mutate()}
                  disabled={deleteAccount.isPending}
                  className="border border-[color:var(--color-red)] bg-[color:var(--color-red)] px-3 py-2 font-mono text-[11px] tracking-[0.18em] text-white uppercase disabled:opacity-50"
                >
                  {deleteAccount.isPending ? "Deleting…" : "Confirm"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
