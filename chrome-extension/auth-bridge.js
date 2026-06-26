// Runs on the UniMind web app — syncs the Supabase session into
// chrome.storage.local so content scripts on blocked sites can read it.

function findSessionInLocalStorage() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && /^sb-.+-auth-token$/.test(key)) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const session = JSON.parse(raw);
        if (session?.access_token) return session;
      } catch { /* skip malformed */ }
    }
  }
  return null;
}

function sync() {
  const session = findSessionInLocalStorage();
  if (session?.access_token) {
    chrome.storage.local.set({
      unimindToken: session.access_token,
      unimindTokenExpiry: session.expires_at ?? null,
    });
  } else {
    chrome.storage.local.set({ unimindToken: null, unimindTokenExpiry: null });
  }
}

sync();

// Re-sync whenever auth state changes (login / logout / token refresh).
window.addEventListener('storage', (e) => {
  if (e.key && /sb-.+-auth-token$/.test(e.key)) sync();
});
