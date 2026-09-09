export default function AppLoading() {
  return (
    <main aria-busy="true" className="flex min-h-svh items-center justify-center bg-[color:var(--color-void)] px-4 text-[color:var(--color-fg-soft)]">
      <p role="status" className="font-mono text-sm">Loading your study space…</p>
    </main>
  );
}
