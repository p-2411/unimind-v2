"use client";

import { AuthPane } from "~/components/auth-pane";

export default function OnboardingCoursesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthPane
      eyebrow="Step 2 of 2"
      title="Courses unavailable."
      subtitle="We couldn't load course enrollment right now."
    >
      <div role="alert" className="space-y-4">
        <p className="font-sans text-[13px] leading-relaxed text-[color:var(--color-fg-soft)]">
          Check your connection and try loading the course list again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex w-full items-center justify-center border border-[color:var(--color-phosphor)] bg-[color:var(--color-phosphor)] px-4 py-2.5 font-mono text-[12px] tracking-[0.22em] text-[color:var(--color-void)] uppercase transition-colors hover:bg-[color:var(--color-phosphor)]/90 focus-visible:ring-2 focus-visible:ring-[color:var(--color-phosphor)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-void)] focus-visible:outline-none"
        >
          Try again
        </button>
      </div>
    </AuthPane>
  );
}
