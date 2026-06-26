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

async function loadStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ customBlocked: [], disabledDefaults: [] }, resolve);
  });
}

async function saveStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(data, resolve);
  });
}

async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['unimindToken', 'unimindTokenExpiry'], (data) => {
      const { unimindToken, unimindTokenExpiry } = data;
      if (!unimindToken) { resolve(null); return; }
      if (unimindTokenExpiry && Date.now() / 1000 > unimindTokenExpiry) {
        resolve(null);
        return;
      }
      resolve(unimindToken);
    });
  });
}

function renderDefaults(disabledDefaults) {
  const list = document.getElementById('defaults-list');
  list.innerHTML = '';
  DEFAULTS.forEach((domain) => {
    const row = document.createElement('div');
    row.className = 'site-row';

    const name = document.createElement('span');
    name.className = 'site-name';
    name.textContent = domain;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'toggle';
    toggle.checked = !disabledDefaults.includes(domain);
    toggle.addEventListener('change', async () => {
      const data = await loadStorage();
      if (toggle.checked) {
        data.disabledDefaults = data.disabledDefaults.filter((d) => d !== domain);
      } else {
        data.disabledDefaults = [...new Set([...data.disabledDefaults, domain])];
      }
      await saveStorage({ disabledDefaults: data.disabledDefaults });
    });

    row.appendChild(name);
    row.appendChild(toggle);
    list.appendChild(row);
  });
}

function renderCustom(customBlocked) {
  const list = document.getElementById('custom-list');
  const empty = document.getElementById('custom-empty');
  list.innerHTML = '';

  if (customBlocked.length === 0) {
    list.appendChild(empty);
    return;
  }

  customBlocked.forEach((domain) => {
    const row = document.createElement('div');
    row.className = 'site-row';

    const name = document.createElement('span');
    name.className = 'site-name';
    name.textContent = domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', async () => {
      const data = await loadStorage();
      data.customBlocked = data.customBlocked.filter((d) => d !== domain);
      await saveStorage({ customBlocked: data.customBlocked });
      renderCustom(data.customBlocked);
    });

    row.appendChild(name);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

async function init() {
  const data = await loadStorage();
  renderDefaults(data.disabledDefaults);
  renderCustom(data.customBlocked);

  // Auth status
  const token = await getAuth();
  const status = document.getElementById('status');
  status.textContent = token ? 'logged in' : 'not logged in';
  status.style.color = token ? '#7cff6b' : '#ff6b8a';

  // Add custom domain
  const input = document.getElementById('add-input');
  const addBtn = document.getElementById('add-btn');

  function addDomain() {
    const raw = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!raw || raw.length < 3 || !raw.includes('.')) return;
    loadStorage().then(async (data) => {
      if (data.customBlocked.includes(raw) || DEFAULTS.includes(raw)) {
        input.value = '';
        return;
      }
      data.customBlocked = [...data.customBlocked, raw];
      await saveStorage({ customBlocked: data.customBlocked });
      renderCustom(data.customBlocked);
      input.value = '';
    });
  }

  addBtn.addEventListener('click', addDomain);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomain();
  });
}

document.addEventListener('DOMContentLoaded', init);
