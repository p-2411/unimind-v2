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

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function raccoonSVG(mood, size) {
  const h = Math.round(size * 130 / 120);
  const lx = 46, rx = 74, ey = 47, mx = 60, my = 61;
  const eyes = mood === 'happy'
    ? `<path d="M ${lx-8} ${ey+3} Q ${lx} ${ey-7} ${lx+8} ${ey+3}" fill="#06090e"/>
       <path d="M ${rx-8} ${ey+3} Q ${rx} ${ey-7} ${rx+8} ${ey+3}" fill="#06090e"/>`
    : `<circle cx="${lx}" cy="${ey}" r="7" fill="#edf2fc"/><circle cx="${lx+1}" cy="${ey+1}" r="4" fill="#06090e"/><circle cx="${lx+3}" cy="${ey-1}" r="1.5" fill="#edf2fc"/>
       <circle cx="${rx}" cy="${ey}" r="7" fill="#edf2fc"/><circle cx="${rx+1}" cy="${ey+1}" r="4" fill="#06090e"/><circle cx="${rx+3}" cy="${ey-1}" r="1.5" fill="#edf2fc"/>`;
  const mouth = mood === 'happy'
    ? `<path d="M ${mx-9} ${my} Q ${mx} ${my+10} ${mx+9} ${my}" stroke="#06090e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : `<path d="M ${mx-7} ${my} Q ${mx} ${my+8} ${mx+7} ${my}" stroke="#06090e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const arms = mood === 'happy'
    ? `<path d="M 42 94 Q 27 81 21 69" stroke="#aeb4c4" stroke-width="11" fill="none" stroke-linecap="round"/>
       <path d="M 78 94 Q 93 81 99 69" stroke="#aeb4c4" stroke-width="11" fill="none" stroke-linecap="round"/>
       <circle cx="19" cy="66" r="8" fill="#aeb4c4"/><circle cx="101" cy="66" r="8" fill="#aeb4c4"/>`
    : `<path d="M 42 98 Q 38 108 38 116" stroke="#aeb4c4" stroke-width="10" fill="none" stroke-linecap="round"/>
       <path d="M 78 98 Q 82 108 82 116" stroke="#aeb4c4" stroke-width="10" fill="none" stroke-linecap="round"/>
       <ellipse cx="38" cy="118" rx="9" ry="5" fill="#aeb4c4"/><ellipse cx="82" cy="118" rx="9" ry="5" fill="#aeb4c4"/>`;
  return `<svg viewBox="0 0 120 130" width="${size}" height="${h}" aria-hidden style="flex-shrink:0">
    <path d="M 79 107 Q 104 97 107 79 Q 112 59 99 55 Q 88 51 83 66 Q 79 80 87 92 Q 92 101 83 108" fill="#aeb4c4"/>
    <ellipse cx="60" cy="101" rx="22" ry="19" fill="#aeb4c4"/>
    <ellipse cx="60" cy="104" rx="13" ry="14" fill="#d9dde8"/>
    ${arms}
    <circle cx="60" cy="46" r="32" fill="#aeb4c4"/>
    <ellipse cx="33" cy="17" rx="13" ry="16" fill="#aeb4c4"/><ellipse cx="87" cy="17" rx="13" ry="16" fill="#aeb4c4"/>
    <ellipse cx="33" cy="19" rx="7.5" ry="10" fill="#cc9fa8"/><ellipse cx="87" cy="19" rx="7.5" ry="10" fill="#cc9fa8"/>
    <circle cx="60" cy="50" r="23" fill="#c8cdd8"/>
    <ellipse cx="46" cy="47" rx="12" ry="10" fill="#171b26"/><ellipse cx="74" cy="47" rx="12" ry="10" fill="#171b26"/>
    ${eyes}
    <ellipse cx="60" cy="59" rx="5" ry="3.5" fill="#171b26"/>
    ${mouth}
  </svg>`;
}

function buildChoicesHTML(q) {
  return q.choices.map((choice, i) => `
    <button class="um-choice" data-index="${i}">
      <span class="um-choice-label">${LABELS[i]}</span>
      <span class="um-choice-text">${esc(choice)}</span>
    </button>`).join('');
}

function buildResultFooterHTML(isCorrect, answerIndex, explanation) {
  return `
    <div class="um-result-footer">
      <div class="um-result-verdict">
        ${raccoonSVG(isCorrect ? 'happy' : 'idle', 42)}
        <div class="um-verdict-meta">
          <span class="um-verdict-badge ${isCorrect ? 'um-verdict-correct' : 'um-verdict-wrong'}">
            ${isCorrect ? 'Correct' : 'Incorrect'}
          </span>
          ${!isCorrect ? `<p class="um-verdict-answer">Answer: <strong>${LABELS[answerIndex]}. ${esc(currentQuestion.choices[answerIndex])}</strong></p>` : ''}
        </div>
      </div>
      ${explanation ? `<p class="um-result-explanation">${esc(explanation)}</p>` : ''}
      <div class="um-actions">
        ${isCorrect
          ? `<button class="um-btn um-btn-primary" id="um-continue">Continue to site →</button>`
          : `<button class="um-btn um-btn-secondary" id="um-retry">Try another question</button>
             <button class="um-btn um-btn-ghost" id="um-continue">Skip →</button>`}
      </div>
    </div>
  `;
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
  const explanation = q.explanation
    ? `<p class="um-learn-explanation">${esc(q.explanation)}</p>`
    : '';
  return `
    <p class="um-learn-eyebrow">The answer</p>
    <div class="um-learn-answer">
      <span class="um-learn-answer-label">${LABELS[q.answerIndex]}</span>
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

      // Disable all choices immediately while waiting for result
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

      // Color choices inline — mirror web app behaviour
      overlayEl.querySelectorAll('.um-choice').forEach((b) => {
        const idx = parseInt(b.dataset.index, 10);
        if (idx === answerIndex) {
          b.classList.add('um-correct');
        } else if (idx === choiceIndex && !isCorrect) {
          b.classList.add('um-wrong-pick');
        } else {
          b.classList.add('um-other-revealed');
        }
      });

      // Card animation
      const card = overlayEl.querySelector('.um-card');
      if (card) {
        const cls = isCorrect ? 'um-flash-correct' : 'um-shake';
        card.classList.add(cls);
        setTimeout(() => card?.classList.remove(cls), isCorrect ? 700 : 550);
      }

      // Inject inline result footer (remove old footers first)
      const section = overlayEl.querySelector('#um-answer-section');
      if (section) {
        section.querySelector('#um-footer-locked')?.remove();
        section.querySelector('#um-footer-unlocked')?.remove();
        section.insertAdjacentHTML('beforeend', buildResultFooterHTML(isCorrect, answerIndex, explanation));
      }

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
