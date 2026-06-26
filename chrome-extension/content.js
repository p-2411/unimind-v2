// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000';

const DEFAULT_BLOCKED = [
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getHostname() {
  return location.hostname.replace(/^www\./, '');
}

function isBlocked(hostname, blocked) {
  return blocked.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
}

async function getBlockedList() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ customBlocked: [], disabledDefaults: [] }, (data) => {
      const enabled = DEFAULT_BLOCKED.filter((d) => !data.disabledDefaults.includes(d));
      resolve([...enabled, ...data.customBlocked]);
    });
  });
}

async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['unimindToken', 'unimindTokenExpiry'], (data) => {
      const { unimindToken, unimindTokenExpiry } = data;
      if (!unimindToken) { resolve(null); return; }
      // Reject if token is expired (expires_at is a Unix timestamp in seconds).
      if (unimindTokenExpiry && Date.now() / 1000 > unimindTokenExpiry) {
        resolve(null);
        return;
      }
      resolve(unimindToken);
    });
  });
}

async function checkGranted() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CHECK_GRANTED' }, (resp) => {
      resolve(resp?.granted ?? false);
    });
  });
}

async function grantTab() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GRANT_TAB' }, () => resolve());
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Overlay ───────────────────────────────────────────────────────────────────
let overlayEl = null;
let currentQuestion = null;
let token = null;
let startedAt = Date.now();

function hidePageInstantly() {
  const s = document.createElement('style');
  s.id = 'unimind-hide';
  s.textContent = 'html{visibility:hidden!important}';
  document.documentElement.appendChild(s);
}

function showPage() {
  document.getElementById('unimind-hide')?.remove();
}

function showOverlay(content) {
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.id = 'unimind-overlay';
    document.documentElement.appendChild(overlayEl);
  }
  overlayEl.innerHTML = content;
  overlayEl.style.display = 'flex';
  showPage();
}

function buildQuestionHTML(q) {
  const labels = ['A', 'B', 'C', 'D'];
  const choices = q.choices
    .map(
      (choice, i) => `
      <button class="um-choice" data-index="${i}">
        <span class="um-choice-label">${labels[i]}</span>
        <span class="um-choice-text">${esc(choice)}</span>
      </button>`,
    )
    .join('');

  const diffLabel = q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : 'Hard';
  const diffClass = q.difficulty === 1 ? 'um-diff-easy' : q.difficulty === 2 ? 'um-diff-medium' : 'um-diff-hard';

  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">UniMind</div>
        <div class="um-meta">
          <span class="um-topic">${esc(q.topic.course.name)} · ${esc(q.topic.name)}</span>
          <span class="um-diff ${diffClass}">${diffLabel}</span>
        </div>
      </div>
      <p class="um-prompt">Answer to continue</p>
      <p class="um-question">${esc(q.question)}</p>
      <div class="um-choices">${choices}</div>
    </div>
  `;
}

function buildResultHTML(isCorrect, answerIndex, explanation, choices) {
  const labels = ['A', 'B', 'C', 'D'];
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">UniMind</div>
      </div>
      <div class="um-result ${isCorrect ? 'um-result-correct' : 'um-result-wrong'}">
        ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
      </div>
      ${!isCorrect ? `<p class="um-answer-label">Correct answer: <strong>${labels[answerIndex]}. ${esc(choices[answerIndex])}</strong></p>` : ''}
      ${explanation ? `<p class="um-explanation">${esc(explanation)}</p>` : ''}
      <div class="um-actions">
        ${isCorrect
          ? `<button class="um-btn um-btn-primary" id="um-continue">Continue to site →</button>`
          : `<button class="um-btn um-btn-secondary" id="um-retry">Try another question</button>
             <button class="um-btn um-btn-ghost" id="um-continue">Skip and continue →</button>`
        }
      </div>
    </div>
  `;
}

function buildLoginHTML() {
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">UniMind</div>
      </div>
      <p class="um-prompt">Log in to continue</p>
      <p class="um-question">You need to be logged in to UniMind to access blocked sites.</p>
      <div class="um-actions">
        <a class="um-btn um-btn-primary" href="${API_BASE}/login" target="_blank">Log in to UniMind</a>
        <button class="um-btn um-btn-ghost" id="um-skip-login">Skip for now</button>
      </div>
    </div>
  `;
}

function buildSessionExpiredHTML() {
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">UniMind</div>
      </div>
      <p class="um-prompt">Session expired</p>
      <p class="um-question">Visit UniMind to refresh your session, then come back.</p>
      <div class="um-actions">
        <a class="um-btn um-btn-primary" href="${API_BASE}" target="_blank">Open UniMind</a>
        <button class="um-btn um-btn-ghost" id="um-skip">Continue anyway</button>
      </div>
    </div>
  `;
}

function buildNoQuestionsHTML() {
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">UniMind</div>
      </div>
      <p class="um-prompt">No questions available</p>
      <p class="um-question">Enroll in a course on UniMind to get practice questions.</p>
      <div class="um-actions">
        <a class="um-btn um-btn-primary" href="${API_BASE}" target="_blank">Open UniMind</a>
        <button class="um-btn um-btn-ghost" id="um-skip">Continue anyway</button>
      </div>
    </div>
  `;
}

// Returns the question object, null (no questions), or 'unauthorized'.
async function fetchQuestion() {
  try {
    const resp = await fetch(`${API_BASE}/api/extension/question`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('[UniMind] /api/extension/question status:', resp.status);
    if (resp.status === 401) return 'unauthorized';
    if (!resp.ok) return null;
    const data = await resp.json();
    console.log('[UniMind] question response body:', JSON.stringify(data));
    return data.question ?? null;
  } catch (e) {
    console.error('[UniMind] fetchQuestion threw:', e);
    return null;
  }
}

async function submitAnswer(choiceIndex, rating, timeSpentMs) {
  try {
    const resp = await fetch(`${API_BASE}/api/extension/answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: currentQuestion.id,
        choiceIndex,
        rating,
        timeSpentMs,
      }),
    });
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

// FSRS rating derived from time spent (can't know correctness before submitting).
function deriveRating(timeSpentMs) {
  if (timeSpentMs < 8000) return 4;
  if (timeSpentMs < 20000) return 3;
  return 2;
}

function attachOverlayHandlers() {
  overlayEl.querySelectorAll('.um-choice').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const choiceIndex = parseInt(btn.dataset.index, 10);
      const timeSpentMs = Date.now() - startedAt;

      // Disable all buttons during submission
      overlayEl.querySelectorAll('.um-choice').forEach((b) => {
        b.disabled = true;
        b.style.pointerEvents = 'none';
      });

      const result = await submitAnswer(
        choiceIndex,
        deriveRating(timeSpentMs),
        timeSpentMs,
      );

      if (!result) {
        // API error — let them through
        await grantTab();
        overlayEl.remove();
        overlayEl = null;
        showPage();
        return;
      }

      const { isCorrect, answerIndex, explanation } = result;

      showOverlay(buildResultHTML(isCorrect, answerIndex, explanation, currentQuestion.choices));

      const continueBtn = document.getElementById('um-continue');
      const retryBtn = document.getElementById('um-retry');

      if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
          if (isCorrect) await grantTab();
          overlayEl.remove();
          overlayEl = null;
          showPage();
        });
      }

      if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
          startedAt = Date.now();
          currentQuestion = await fetchQuestion();
          if (!currentQuestion) {
            showOverlay(buildNoQuestionsHTML());
            attachSkipHandler();
            return;
          }
          showOverlay(buildQuestionHTML(currentQuestion));
          attachOverlayHandlers();
        });
      }
    });
  });
}

function attachSkipHandler() {
  const btn = document.getElementById('um-skip') ?? document.getElementById('um-skip-login');
  if (btn) {
    btn.addEventListener('click', async () => {
      await grantTab();
      overlayEl.remove();
      overlayEl = null;
      showPage();
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
hidePageInstantly();

(async () => {
  const blocked = await getBlockedList();
  console.log('[UniMind] hostname:', getHostname(), '| blocked:', blocked);
  if (!isBlocked(getHostname(), blocked)) {
    showPage();
    return;
  }

  const granted = await checkGranted();
  console.log('[UniMind] granted:', granted);
  if (granted) {
    showPage();
    return;
  }

  token = await getAuth();
  console.log('[UniMind] token present:', !!token);

  if (!token) {
    showOverlay(buildLoginHTML());
    attachSkipHandler();
    return;
  }

  currentQuestion = await fetchQuestion();
  console.log('[UniMind] question result:', currentQuestion);

  if (currentQuestion === 'unauthorized') {
    showOverlay(buildSessionExpiredHTML());
    attachSkipHandler();
    return;
  }

  if (!currentQuestion) {
    showOverlay(buildNoQuestionsHTML());
    attachSkipHandler();
    return;
  }

  startedAt = Date.now();
  showOverlay(buildQuestionHTML(currentQuestion));
  attachOverlayHandlers();
})().catch((e) => { console.error('[UniMind] fatal:', e); showPage(); });
