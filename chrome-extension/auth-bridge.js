// Runs on the Mastify web app — fetches the session token from the server
// (same-origin, so cookies work) and stores it in chrome.storage.local.

async function sync() {
  try {
    const resp = await fetch('/api/extension/token');
    if (!resp.ok) return;
    const { token, expiresAt, reminderEnabled, reminderTime } = await resp.json();
    chrome.storage.local.set({
      mastifyToken: token ?? null,
      mastifyTokenExpiry: expiresAt ?? null,
      notifEnabled: reminderEnabled ?? false,
      notifTime: reminderTime ?? '09:00',
    });
  } catch {
    // App not reachable — leave existing stored value alone.
  }
}

sync();

// Re-sync when auth state changes (visibility means user just switched back).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') sync();
});
