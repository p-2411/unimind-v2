// ── Daily reminder (chrome.alarms + chrome.notifications) ────────────────────

const ALARM_NAME = 'mastify-daily-reminder';

async function scheduleReminder() {
  const { notifEnabled, notifTime } = await chrome.storage.local.get(['notifEnabled', 'notifTime']);
  await chrome.alarms.clear(ALARM_NAME);
  if (!notifEnabled) return;

  const [hours, minutes] = (notifTime ?? '09:00').split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  chrome.alarms.create(ALARM_NAME, {
    when: next.getTime(),
    periodInMinutes: 24 * 60,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  chrome.notifications.create('mastify-reminder', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Mastify',
    message: 'Time to study! Open Mastify to practice today\'s questions.',
    priority: 1,
  });
});

// Reschedule when prefs change (user toggles or changes time in settings).
chrome.storage.onChanged.addListener((changes) => {
  if ('notifEnabled' in changes || 'notifTime' in changes) {
    scheduleReminder();
  }
});

// Schedule on service worker startup.
scheduleReminder();

// ── Tab grant tracking ────────────────────────────────────────────────────────
// Maps tabId → granted hostname. Grant expires when the tab closes or
// navigates to a different domain — same-domain navigation keeps it alive.
const grantedTabs = new Map();

chrome.tabs.onRemoved.addListener((tabId) => {
  grantedTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url || !grantedTabs.has(tabId)) return;
  try {
    const newHost = new URL(changeInfo.url).hostname.replace(/^www\./, '');
    const grantedHost = grantedTabs.get(tabId);
    if (newHost !== grantedHost && !newHost.endsWith('.' + grantedHost)) {
      grantedTabs.delete(tabId);
    }
  } catch {
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
    if (tabId != null && msg.hostname) grantedTabs.set(tabId, msg.hostname);
    sendResponse({ ok: true });
    return true;
  }

  // Auth is handled by auth-bridge.js writing to chrome.storage.local.
});
