const DEFAULTS = [
  'youtube.com',
  'reddit.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'facebook.com',
  'netflix.com',
  'twitch.tv',
];

const API_BASE = 'http://localhost:3000';

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['mastifyToken', 'mastifyTokenExpiry'], (data) => {
      const { mastifyToken, mastifyTokenExpiry } = data;
      if (!mastifyToken) { resolve(null); return; }
      if (mastifyTokenExpiry && Date.now() / 1000 > mastifyTokenExpiry) { resolve(null); return; }
      resolve(mastifyToken);
    });
  });
}

// ── Remote sync ───────────────────────────────────────────────────────────────

async function fetchRemote(token) {
  try {
    const res = await fetch(`${API_BASE}/api/extension/blocked-sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

let saveTimer = null;

async function saveRemote(token, disabledDefaults, customBlocked) {
  showSaving(true);
  chrome.storage.local.set({ cachedDisabledDefaults: disabledDefaults, cachedCustomBlocked: customBlocked });

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch(`${API_BASE}/api/extension/blocked-sites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledDefaults, customBlocked }),
      });
    } catch { /* silent */ }
    showSaving(false);
  }, 600);
}

function showSaving(show) {
  const el = document.getElementById('saving');
  if (el) el.classList.toggle('show', show);
}

// ── Fallback local storage (when not logged in) ───────────────────────────────

function loadLocal() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      { cachedDisabledDefaults: [], cachedCustomBlocked: [] },
      (d) => resolve({ disabledDefaults: d.cachedDisabledDefaults, customBlocked: d.cachedCustomBlocked }),
    );
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

let state = { disabledDefaults: [], customBlocked: [] };
let token = null;

function onChange(newState) {
  state = newState;
  if (token) {
    saveRemote(token, state.disabledDefaults, state.customBlocked);
  } else {
    chrome.storage.local.set({ cachedDisabledDefaults: state.disabledDefaults, cachedCustomBlocked: state.customBlocked });
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderDefaults() {
  const list = document.getElementById('defaults-list');
  list.innerHTML = '';
  DEFAULTS.forEach((domain) => {
    const enabled = !state.disabledDefaults.includes(domain);
    const row = document.createElement('div');
    row.className = `site-row${enabled ? '' : ' disabled'}`;

    const name = document.createElement('span');
    name.className = 'site-name';
    name.textContent = domain;

    const label = document.createElement('label');
    label.className = 'pill';
    label.title = enabled ? 'Click to disable' : 'Click to enable';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = enabled;
    input.addEventListener('change', () => {
      const next = { ...state };
      if (input.checked) {
        next.disabledDefaults = next.disabledDefaults.filter((d) => d !== domain);
      } else {
        next.disabledDefaults = [...new Set([...next.disabledDefaults, domain])];
      }
      onChange(next);
      renderDefaults();
    });

    const track = document.createElement('div');
    track.className = 'pill-track';
    const thumb = document.createElement('div');
    thumb.className = 'pill-thumb';

    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(thumb);

    row.appendChild(name);
    row.appendChild(label);
    list.appendChild(row);
  });
}

function renderCustom() {
  const list = document.getElementById('custom-list');
  list.innerHTML = '';
  if (state.customBlocked.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No custom sites yet';
    list.appendChild(empty);
    return;
  }
  state.customBlocked.forEach((domain) => {
    const row = document.createElement('div');
    row.className = 'site-row';

    const name = document.createElement('span');
    name.className = 'site-name';
    name.textContent = domain;

    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    btn.title = 'Remove';
    btn.addEventListener('click', () => {
      onChange({ ...state, customBlocked: state.customBlocked.filter((d) => d !== domain) });
      renderCustom();
    });

    row.appendChild(name);
    row.appendChild(btn);
    list.appendChild(row);
  });
}

// ── Add domain ────────────────────────────────────────────────────────────────

function normaliseDomain(raw) {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? '';
}

function setupAdd() {
  const input = document.getElementById('add-input');
  const btn = document.getElementById('add-btn');

  function add() {
    const domain = normaliseDomain(input.value);
    if (!domain || domain.length < 3 || !domain.includes('.')) return;
    if (state.customBlocked.includes(domain) || DEFAULTS.includes(domain)) {
      input.value = '';
      return;
    }
    onChange({ ...state, customBlocked: [...state.customBlocked, domain] });
    renderCustom();
    input.value = '';
  }

  btn.addEventListener('click', add);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
}

// ── Dumb Mode ─────────────────────────────────────────────────────────────────

function setupDumbMode() {
  const toggle = document.getElementById('dumb-toggle');
  const row    = document.getElementById('dumb-row');

  chrome.storage.local.get('dumbMode', ({ dumbMode }) => {
    toggle.checked = !!dumbMode;
    row.classList.toggle('on', !!dumbMode);
  });

  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    chrome.storage.local.set({ dumbMode: on });
    row.classList.toggle('on', on);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  token = await getToken();

  const dot = document.getElementById('status-dot');
  if (dot) { dot.classList.add(token ? 'ok' : 'err'); }

  if (token) {
    const remote = await fetchRemote(token);
    if (remote) {
      state = { disabledDefaults: remote.disabledDefaults, customBlocked: remote.customBlocked };
      // Update local cache
      chrome.storage.local.set({ cachedDisabledDefaults: state.disabledDefaults, cachedCustomBlocked: state.customBlocked });
    } else {
      state = await loadLocal();
    }
  } else {
    state = await loadLocal();
  }

  renderDefaults();
  renderCustom();
  setupAdd();
  setupDumbMode();
}

document.addEventListener('DOMContentLoaded', init);
