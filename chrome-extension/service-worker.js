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

  // Auth is now handled by auth-bridge.js writing to chrome.storage.local.
  // No GET_AUTH message needed.
});
