"use client";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[color:var(--color-void)] px-4 text-center text-[color:var(--color-fg)]">
      <h1 className="font-mono text-xl">Unable to load this page</h1>
      <p role="alert" className="max-w-md font-sans text-sm text-[color:var(--color-fg-soft)]">
        Your study data could not be loaded. Check your connection and try again.
      </p>
      <button type="button" onClick={reset} className="min-h-10 border border-[color:var(--color-phosphor)] px-4 py-2 font-mono text-sm text-[color:var(--color-phosphor)] hover:bg-[color:var(--color-panel)]">
        Try again
      </button>
    </main>
  );
}
