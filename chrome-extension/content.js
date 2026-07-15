// ── Config ────────────────────────────────────────────────────────────────────
const SCHOLAR_SVG = `<svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M 26,50 L 26,70 A 24,24 0 0 0 74,70 L 74,50" stroke="#7cff6b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M 10,50 L 90,50" stroke="#7cff6b" stroke-width="5.5" stroke-linecap="round"/><path d="M 50,16 L 70,33 L 50,50 L 30,33 Z" stroke="#7cff6b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M 70,33 L 78,54" stroke="#7cff6b" stroke-width="3" stroke-linecap="round" opacity="0.82"/><circle cx="78" cy="57" r="4" fill="#7cff6b"/></svg>`;
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

function blockedListFromData(disabledDefaults, customBlocked) {
  const enabled = DEFAULT_BLOCKED.filter((d) => !disabledDefaults.includes(d));
  return [...enabled, ...customBlocked];
}

async function getBlockedList(authToken) {
  if (authToken) {
    try {
      const res = await fetch(`${API_BASE}/api/extension/blocked-sites`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        chrome.storage.local.set({ cachedDisabledDefaults: data.disabledDefaults, cachedCustomBlocked: data.customBlocked });
        return blockedListFromData(data.disabledDefaults, data.customBlocked);
      }
    } catch { /* fall through to cache */ }
  }
  return new Promise((resolve) => {
    chrome.storage.local.get({ cachedDisabledDefaults: [], cachedCustomBlocked: [] }, (data) => {
      resolve(blockedListFromData(data.cachedDisabledDefaults, data.cachedCustomBlocked));
    });
  });
}

async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['mastifyToken'], (data) => {
      resolve(data.mastifyToken ?? null);
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
    chrome.runtime.sendMessage({ type: 'GRANT_TAB', hostname: getHostname() }, () => resolve());
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
  s.id = 'mastify-hide';
  s.textContent = 'html{visibility:hidden!important}';
  document.documentElement.appendChild(s);
}

function showPage() {
  document.getElementById('mastify-hide')?.remove();
}

function showOverlay(content) {
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.id = 'mastify-overlay';
    document.documentElement.appendChild(overlayEl);
  }
  overlayEl.innerHTML = content;
  overlayEl.style.display = 'flex';
  showPage();
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function buildChoicesHTML(q) {
  const labels = ['A', 'B', 'C', 'D'];
  return q.choices.map((choice, i) => `
    <button class="um-choice" data-index="${i}">
      <span class="um-choice-label">${labels[i]}</span>
      <span class="um-choice-text">${esc(choice)}</span>
    </button>`).join('');
}

// The swappable answer section: either choices+footer or learning panel
function buildAnswerSectionHTML(q) {
  return `
    <div class="um-choices um-locked" id="um-choices">
      ${buildChoicesHTML(q)}
    </div>
    <div class="um-footer" id="um-footer-locked">
      <span class="um-footer-hint">Read the question…</span>
    </div>
    <div class="um-footer" id="um-footer-unlocked" style="display:none">
      <button class="um-btn um-btn-ghost" id="um-dont-know" style="padding:7px 14px;font-size:11px;letter-spacing:0.08em">
        Don&apos;t know
      </button>
    </div>
  `;
}

function buildLearningPanelHTML(q) {
  const labels = ['A', 'B', 'C', 'D'];
  const explanation = q.explanation
    ? `<p class="um-learn-explanation">${esc(q.explanation)}</p>`
    : '';
  return `
    <p class="um-learn-eyebrow">The answer</p>
    <div class="um-learn-answer">
      <span class="um-learn-answer-label">${labels[q.answerIndex]}</span>
      <span class="um-learn-answer-text">${esc(q.choices[q.answerIndex])}</span>
    </div>
    ${explanation}
    <p class="um-learn-read-hint">Read before answering…</p>
    <div class="um-learn-timer-wrap">
      <div class="um-learn-timer-bar"></div>
    </div>
    <div id="um-got-it-wrap" style="display:none">
      <button class="um-btn um-btn-primary" id="um-got-it" style="width:100%;justify-content:center">
        Got it — let me answer
      </button>
    </div>
  `;
}

function buildQuestionHTML(q) {
  const diffLabel = q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : 'Hard';
  const diffClass = q.difficulty === 1 ? 'um-diff-easy' : q.difficulty === 2 ? 'um-diff-medium' : 'um-diff-hard';

  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">${SCHOLAR_SVG}</div>
        <div class="um-meta">
          <span class="um-topic">${esc(q.topic.course.name)} · ${esc(q.topic.name)}</span>
          <span class="um-diff ${diffClass}">${diffLabel}</span>
        </div>
      </div>
      <p class="um-prompt">Answer to continue</p>
      <p class="um-question">${esc(q.question)}</p>
      <div class="um-timer-wrap">
        <div class="um-timer-bar"></div>
      </div>
      <div id="um-answer-section">
        ${buildAnswerSectionHTML(q)}
      </div>
    </div>
  `;
}

function buildResultHTML(isCorrect, answerIndex, explanation, choices) {
  const labels = ['A', 'B', 'C', 'D'];
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">${SCHOLAR_SVG}</div>
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
        <div class="um-logo">${SCHOLAR_SVG}</div>
      </div>
      <p class="um-prompt">Log in to continue</p>
      <p class="um-question">You need to be logged in to Mastify to access blocked sites.</p>
      <div class="um-actions">
        <a class="um-btn um-btn-primary" href="${API_BASE}/login" target="_blank">Log in to Mastify</a>
        <button class="um-btn um-btn-ghost" id="um-skip-login">Skip for now</button>
      </div>
    </div>
  `;
}

function buildSessionExpiredHTML() {
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">${SCHOLAR_SVG}</div>
      </div>
      <p class="um-prompt">Session expired</p>
      <p class="um-question">Visit Mastify to refresh your session, then come back.</p>
      <div class="um-actions">
        <a class="um-btn um-btn-primary" href="${API_BASE}" target="_blank">Open Mastify</a>
        <button class="um-btn um-btn-ghost" id="um-skip">Continue anyway</button>
      </div>
    </div>
  `;
}

function buildNoQuestionsHTML() {
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">${SCHOLAR_SVG}</div>
      </div>
      <p class="um-prompt">No questions available</p>
      <p class="um-question">Enroll in a course on Mastify to get practice questions.</p>
      <div class="um-actions">
        <a class="um-btn um-btn-primary" href="${API_BASE}" target="_blank">Open Mastify</a>
        <button class="um-btn um-btn-ghost" id="um-skip">Continue anyway</button>
      </div>
    </div>
  `;
}

function buildFetchErrorHTML() {
  return `
    <div class="um-card">
      <div class="um-header">
        <div class="um-logo">${SCHOLAR_SVG}</div>
      </div>
      <p class="um-prompt">Couldn't load question</p>
      <p class="um-question">Something went wrong fetching your question. Make sure Mastify is reachable and try again.</p>
      <div class="um-actions">
        <button class="um-btn um-btn-primary" id="um-retry-fetch">Try again</button>
        <button class="um-btn um-btn-ghost" id="um-skip">Continue anyway</button>
      </div>
    </div>
  `;
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchQuestion() {
  try {
    const resp = await fetch(`${API_BASE}/api/extension/question`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('[Mastify] /api/extension/question status:', resp.status);
    if (resp.status === 401) return 'unauthorized';
    if (!resp.ok) return 'error';
    const data = await resp.json();
    console.log('[Mastify] question response body:', JSON.stringify(data));
    return data.question ?? null;
  } catch (e) {
    console.error('[Mastify] fetchQuestion threw:', e);
    return 'error';
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

function deriveRating(timeSpentMs) {
  if (timeSpentMs < 8000) return 4;
  if (timeSpentMs < 20000) return 3;
  return 2;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function attachChoiceHandlers() {
  overlayEl.querySelectorAll('.um-choice').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const choiceIndex = parseInt(btn.dataset.index, 10);
      const timeSpentMs = Date.now() - startedAt;

      overlayEl.querySelectorAll('.um-choice').forEach((b) => {
        b.disabled = true;
        b.style.pointerEvents = 'none';
      });

      const result = await submitAnswer(choiceIndex, deriveRating(timeSpentMs), timeSpentMs);

      if (!result) {
        await grantTab();
        overlayEl.remove();
        overlayEl = null;
        showPage();
        return;
      }

      const { isCorrect, answerIndex, explanation } = result;
      showOverlay(buildResultHTML(isCorrect, answerIndex, explanation, currentQuestion.choices));
      attachResultHandlers(isCorrect);
    });
  });
}

function attachResultHandlers(isCorrect) {
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
      if (currentQuestion === 'unauthorized') {
        showOverlay(buildSessionExpiredHTML());
        attachSkipHandler();
      } else if (currentQuestion === 'error') {
        showOverlay(buildFetchErrorHTML());
        attachSkipHandler();
        attachRetryFetchHandler();
      } else if (!currentQuestion) {
        showOverlay(buildNoQuestionsHTML());
        attachSkipHandler();
      } else {
        showOverlay(buildQuestionHTML(currentQuestion));
        attachOverlayHandlers();
      }
    });
  }
}

function attachOverlayHandlers() {
  // 3s unlock: reveal choices and swap footer
  const unlockTimer = setTimeout(() => {
    const choices = overlayEl?.querySelector('#um-choices');
    const footerLocked = overlayEl?.querySelector('#um-footer-locked');
    const footerUnlocked = overlayEl?.querySelector('#um-footer-unlocked');
    if (choices) choices.classList.remove('um-locked');
    if (footerLocked) footerLocked.style.display = 'none';
    if (footerUnlocked) footerUnlocked.style.display = 'flex';
  }, 3000);

  // "Don't know" — enter learning mode
  const dontKnowHandler = (e) => {
    if (!e.target.closest('#um-dont-know')) return;
    overlayEl.removeEventListener('click', dontKnowHandler);

    // Replace answer section with learning panel
    const section = overlayEl.querySelector('#um-answer-section');
    if (section) section.innerHTML = buildLearningPanelHTML(currentQuestion);

    // After 4s show "Got it" button
    setTimeout(() => {
      const wrap = overlayEl?.querySelector('#um-got-it-wrap');
      if (wrap) wrap.style.display = 'block';
    }, 4000);

    // "Got it" — restore choices for one final answer
    const gotItHandler = (e2) => {
      if (!e2.target.closest('#um-got-it')) return;
      overlayEl.removeEventListener('click', gotItHandler);

      const section2 = overlayEl.querySelector('#um-answer-section');
      if (section2) section2.innerHTML = buildAnswerSectionHTML(currentQuestion);

      // Choices start unlocked since the lock period already passed
      const choices = overlayEl.querySelector('#um-choices');
      const footerLocked = overlayEl.querySelector('#um-footer-locked');
      if (choices) choices.classList.remove('um-locked');
      if (footerLocked) footerLocked.style.display = 'none';

      attachChoiceHandlers();
    };
    overlayEl.addEventListener('click', gotItHandler);
  };
  overlayEl.addEventListener('click', dontKnowHandler);

  attachChoiceHandlers();
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

function attachRetryFetchHandler() {
  const btn = document.getElementById('um-retry-fetch');
  if (btn) {
    btn.addEventListener('click', async () => {
      showOverlay(`<div class="um-card"><div class="um-header"><div class="um-logo">${SCHOLAR_SVG}</div></div><p class="um-prompt">Loading…</p></div>`);
      currentQuestion = await fetchQuestion();
      if (currentQuestion === 'unauthorized') {
        showOverlay(buildSessionExpiredHTML());
        attachSkipHandler();
      } else if (currentQuestion === 'error' || !currentQuestion) {
        showOverlay(buildFetchErrorHTML());
        attachSkipHandler();
        attachRetryFetchHandler();
      } else {
        startedAt = Date.now();
        showOverlay(buildQuestionHTML(currentQuestion));
        attachOverlayHandlers();
      }
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  token = await getAuth();
  const blocked = await getBlockedList(token);
  if (!isBlocked(getHostname(), blocked)) return;

  const granted = await checkGranted();
  if (granted) return;

  hidePageInstantly();

  if (!token) {
    showOverlay(buildLoginHTML());
    attachSkipHandler();
    return;
  }

  currentQuestion = await fetchQuestion();
  console.log('[Mastify] question result:', currentQuestion);

  if (currentQuestion === 'unauthorized') {
    showOverlay(buildSessionExpiredHTML());
    attachSkipHandler();
    return;
  }

  if (currentQuestion === 'error') {
    showOverlay(buildFetchErrorHTML());
    attachSkipHandler();
    attachRetryFetchHandler();
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
})().catch((e) => { console.error('[Mastify] fatal:', e); showPage(); });
