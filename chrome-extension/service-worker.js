// ── Config ────────────────────────────────────────────────────────────────────
// Update UNIMIND_URL to your production domain before publishing.
const UNIMIND_URL = 'http://localhost:3000';

// ── Tab grant tracking ────────────────────────────────────────────────────────
// Tracks which tab IDs have answered correctly this visit.
const grantedTabs = new Set();

chrome.tabs.onRemoved.addListener((tabId) => {
  grantedTabs.delete(tabId);
});

// Clear grant when tab navigates to a different site
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    grantedTabs.delete(tabId);
  }
});

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (msg.type === 'CHECK_GRANTED') {
    sendResponse({ granted: tabId != null && grantedTabs.has(tabId) });
    return true;
  }

  if (msg.type === 'GRANT_TAB') {
    if (tabId != null) grantedTabs.add(tabId);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GET_AUTH') {
    // Read Supabase session cookies from the UniMind web app domain.
    // @supabase/ssr stores session as sb-{ref}-auth-token (may be chunked).
    chrome.cookies.getAll({ url: UNIMIND_URL }, (cookies) => {
      const chunks = {};
      let simple = null;

      for (const c of cookies) {
        const chunkMatch = c.name.match(/^sb-.+-auth-token\.(\d+)$/);
        if (chunkMatch) {
          chunks[parseInt(chunkMatch[1])] = c.value;
        } else if (c.name.match(/^sb-.+-auth-token$/)) {
          simple = c.value;
        }
      }

      let raw = simple;
      if (!raw && Object.keys(chunks).length > 0) {
        raw = Object.keys(chunks)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((k) => chunks[k])
          .join('');
      }

      if (!raw) {
        sendResponse({ token: null });
        return;
      }

      try {
        const session = JSON.parse(decodeURIComponent(raw));
        sendResponse({ token: session?.access_token ?? null });
      } catch {
        sendResponse({ token: null });
      }
    });
    return true; // keep channel open for async response
  }
});
