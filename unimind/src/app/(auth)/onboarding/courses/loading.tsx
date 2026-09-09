import { AuthPane } from "~/components/auth-pane";

export default function OnboardingCoursesLoading() {
  return (
    <AuthPane
      eyebrow="Step 2 of 2"
      title="Loading courses…"
      subtitle="Preparing your course selection."
    >
      <div
        role="status"
        aria-live="polite"
        className="border border-[color:var(--color-rule-hi)] bg-[color:var(--color-panel)] px-4 py-5 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-fg-mute)] uppercase"
      >
        Fetching available courses…
      </div>
    </AuthPane>
  );
}
