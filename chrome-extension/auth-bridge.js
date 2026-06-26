// Runs on the UniMind web app — fetches the session token from the server
// (same-origin, so cookies work) and stores it in chrome.storage.local.

async function sync() {
  try {
    const resp = await fetch('/api/extension/token');
    if (!resp.ok) return;
    const { token, expiresAt } = await resp.json();
    chrome.storage.local.set({
      unimindToken: token ?? null,
      unimindTokenExpiry: expiresAt ?? null,
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
