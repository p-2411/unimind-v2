// ── Dumb Mode — removes algorithmic content, leaves intentional browsing intact

const STYLE_ID  = 'um-dumb-style';
const BANNER_ID = 'um-dumb-banner';
const MSG_ID    = 'um-dumb-msg';

const SITE_RULES = {
  'youtube.com': `
    /* Home feed — completely gone */
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] ytd-rich-section-renderer { display: none !important; }
    /* Video page — no sidebar */
    #secondary { display: none !important; }
    /* Shorts — sidebar nav entries */
    ytd-guide-entry-renderer a[href="/shorts"],
    ytd-mini-guide-entry-renderer a[href="/shorts"],
    [title="Shorts"] { display: none !important; }
    /* Shorts shelves in feeds */
    ytd-reel-shelf-renderer,
    ytd-rich-shelf-renderer[is-shorts] { display: none !important; }
    /* Comments */
    ytd-comments, #comments.ytd-watch-flexy { display: none !important; }
    /* End screen cards */
    .ytp-endscreen-content, .ytp-ce-element { display: none !important; }
    /* Autoplay */
    .ytp-autonav-toggle-button-container { display: none !important; }
    /* Trending nav entry */
    ytd-guide-entry-renderer a[href="/feed/trending"] { display: none !important; }
    /* Grayscale thumbnails */
    ytd-thumbnail img, ytd-thumbnail yt-image {
      filter: grayscale(1) brightness(0.75) !important;
      transition: filter 0.2s !important;
    }
    ytd-thumbnail:hover img, ytd-thumbnail:hover yt-image {
      filter: grayscale(0.3) brightness(0.9) !important;
    }
  `,

  'instagram.com': `
    /* All posts/articles everywhere */
    article { display: none !important; }
    /* Feed container */
    [role="feed"] { display: none !important; }
    /* Stories bar — multiple selectors across Instagram versions */
    [aria-label="Stories"] { display: none !important; }
    [role="menubar"] { display: none !important; }
    /* Story bubbles on profile pages (row of circles above the grid) */
    ul[style*="overflow"] { display: none !important; }
    /* Explore grid tiles */
    main [role="presentation"] { display: none !important; }
    /* Reels / suggested content */
    [role="tabpanel"] { display: none !important; }
    /* Grayscale profile pics and any remaining media */
    img, video { filter: grayscale(1) brightness(0.75) !important; }
  `,

  'reddit.com': `
    /* New Reddit feed */
    shreddit-feed { display: none !important; }
    shreddit-post { display: none !important; }
    /* Old Reddit / Reddit redesign */
    [data-testid="post-container"] { display: none !important; }
    .Post { display: none !important; }
    .ListingLayout-backgroundContainer { display: none !important; }
    /* Trending */
    [data-testid="trending-searches-block"] { display: none !important; }
    img, video { filter: grayscale(1) brightness(0.8) !important; }
  `,

  'twitter.com': `
    /* Hide For You tab so you can't switch back */
    [role="tab"][aria-label="For you"] { display: none !important; }
    /* Right sidebar — trending, who to follow */
    [data-testid="sidebarColumn"] { display: none !important; }
    img[src*="pbs.twimg"], video { filter: grayscale(1) !important; }
  `,

  'x.com': `
    [role="tab"][aria-label="For you"] { display: none !important; }
    [data-testid="sidebarColumn"] { display: none !important; }
    img[src*="pbs.twimg"], video { filter: grayscale(1) !important; }
  `,

  'tiktok.com': `
    [data-e2e="recommend-list-item-container"],
    [class*="DivVideoFeedV2"],
    [class*="DivItemContainer"] { display: none !important; }
    video { display: none !important; }
  `,

  'facebook.com': `
    [role="feed"] { display: none !important; }
    [data-pagelet="FeedUnit"] { display: none !important; }
    img, video { filter: grayscale(1) brightness(0.8) !important; }
  `,
};

function getSiteKey() {
  const h = location.hostname.replace(/^www\./, '');
  return Object.keys(SITE_RULES).find((k) => h === k || h.endsWith('.' + k)) ?? null;
}

// ── Instagram: redirect algorithmic pages → DMs ───────────────────────────────
// Home, explore, reels all redirect. Profile pages and DMs are left alone.
function maybeRedirectInstagram() {
  const p = location.pathname;
  const isAlgorithmic = p === '/' || p === '' || p.startsWith('/explore') || p.startsWith('/reels');
  if (isAlgorithmic) {
    location.replace('https://www.instagram.com/direct/inbox/');
    return true;
  }
  return false;
}

// ── Twitter/X: force Following tab ───────────────────────────────────────────
// Twitter is a SPA — the tab buttons render asynchronously. We use a
// MutationObserver to click Following as soon as it appears.
let twitterObserver = null;

function forceFollowingTab() {
  function tryClick() {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent?.trim() === 'Following') {
        tab.click();
        return true;
      }
    }
    return false;
  }

  if (tryClick()) return;

  twitterObserver = new MutationObserver(() => {
    if (tryClick()) {
      twitterObserver.disconnect();
      twitterObserver = null;
    }
  });
  twitterObserver.observe(document.body, { childList: true, subtree: true });
}

// ── YouTube home message ──────────────────────────────────────────────────────
function maybeInjectYouTubeMessage() {
  if (location.pathname !== '/') return;
  if (document.getElementById(MSG_ID)) return;
  setTimeout(() => {
    if (document.getElementById(MSG_ID)) return;
    const el = document.createElement('div');
    el.id = MSG_ID;
    el.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:120px 24px', 'font-family:monospace', 'font-size:13px',
      'letter-spacing:0.18em', 'color:#3a4250', 'text-transform:uppercase',
      'pointer-events:none',
    ].join(';');
    el.textContent = 'Dumb Mode — recommended feed hidden. Use search.';
    const anchor = document.querySelector('ytd-browse[page-subtype="home"] #primary') ?? document.body;
    anchor.appendChild(el);
  }, 800);
}

// ── Core ──────────────────────────────────────────────────────────────────────
function applyDumbMode() {
  const key = getSiteKey();
  if (!key) return;

  // Instagram: redirect algorithmic pages; still apply CSS on remaining pages
  if (key === 'instagram.com' && maybeRedirectInstagram()) return;

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
  }
  style.textContent = SITE_RULES[key];

  if (key === 'youtube.com') maybeInjectYouTubeMessage();
  if (key === 'twitter.com' || key === 'x.com') forceFollowingTab();

  if (!document.getElementById(BANNER_ID)) {
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:50%', 'transform:translateX(-50%)',
      'z-index:2147483646', 'background:#07080a',
      'border:1px solid #7cff6b22', 'border-top:none',
      'padding:3px 14px 4px', 'font-family:monospace', 'font-size:9px',
      'letter-spacing:0.24em', 'color:#7cff6b66', 'text-transform:uppercase',
      'pointer-events:none', 'border-radius:0 0 4px 4px',
    ].join(';');
    banner.textContent = 'Dumb Mode';
    document.documentElement.appendChild(banner);
  }
}

function removeDumbMode() {
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(BANNER_ID)?.remove();
  document.getElementById(MSG_ID)?.remove();
  if (twitterObserver) { twitterObserver.disconnect(); twitterObserver = null; }
}

async function init() {
  const { dumbMode } = await chrome.storage.local.get('dumbMode');
  if (dumbMode) applyDumbMode();
}

chrome.storage.onChanged.addListener((changes) => {
  if ('dumbMode' in changes) {
    changes.dumbMode.newValue ? applyDumbMode() : removeDumbMode();
  }
});

init();
