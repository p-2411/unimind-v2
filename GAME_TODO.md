# Gamification — Paywall follow-ups

Phase 1 (see `docs/superpowers/specs/2026-04-17-gamification-design.md`) ships the backend + Next.js dashboard + `/achievements` page. The Chrome extension does not exist yet; when it does, the gamification UI for the paywall still needs to be built. This file tracks that work.

All endpoints below already exist or will exist in Phase 1 — the extension can call them without further server work.

## Streak status strip (top of paywall, above the question)

Three display states, driven by `api.user.dashboardStats` (`currentStreak`, `longestStreak`, `lastActiveDate`) + today's correct-answer count:

- `✓ Streak N` — today's streak is already preserved by a correct answer.
- `⏱ Streak N · dies in 3h 42m` — today's correct-answer count is 0. Live countdown to UTC day rollover.
- `★ Longest: N · Streak 1` — after a break; show the "longest-ever" badge.

Notes:
- Countdown is a pure client-side timer from `now` to next UTC midnight; no server ticking.
- "Today's correct-answer count" is derivable from `UserStats.lastActiveDate` (equals today's UTC date ⇒ already preserved). No extra endpoint needed.

## Percentile line

Below the streak strip, only when `api.user.weeklyPercentile` returns non-null:
`> 73% of UniMind users this week`

Small, one-liner, cyan accent. Hide entirely if endpoint returns `null`.

## Post-answer flourish

After the extension calls `question.answer`, the response already includes `xpDelta`, `newLevel`, `leveledUp`, `newlyEarnedCodes`.

- Correct + non-level-up: `+10 XP` toast (amount reflects difficulty). Phosphor colour. ~2s fade.
- Correct + level-up: `+10 XP · Level 5 ↑` with a distinct amber animation. ~3s.
- Incorrect: `+1 XP` in muted colour. No celebration.
- Achievement earn: one-time `🏅 Achievement: Week One · +50 XP` pop. Looks up the name via `api.achievement.listForUser` (or fetch-once-cache) because the answer mutation only returns codes.

## Endpoints the paywall will call

- `question.nextForPaywall` — fetches the next question.
- `question.answer` — already returns all gamification deltas.
- `user.dashboardStats` — streak + longest streak + level + XP. Cacheable client-side.
- `user.weeklyPercentile` — optional; render-gated.
- `achievement.listForUser` — name/description lookup for earned codes in post-answer flourishes.

## Extension-specific concerns to remember

- **Settings toggle** for the streak strip and percentile line. Some users will want the question and nothing else; respect that.
- **Auth plumbing.** Extension needs to authenticate against Supabase (existing web auth uses cookies). Likely a separate sign-in flow in the extension popup or a token-handoff from the main app. Out of scope for this TODO but blocks everything above.
- **Offline fallback.** If the extension cannot reach the tRPC endpoints, it still needs to surface the question (the scheduling layer must handle this). Gamification UI simply hides when data is stale.
- **Rendering budget.** The paywall is a 10-second-or-less surface. Strips must be sub-100ms to paint — pre-fetch `dashboardStats` on extension load rather than on paywall-show.

## Deferred (not Phase 1, not even Phase 1 paywall)

These came up during the brainstorm and were intentionally cut. Listed here so future paywall work does not re-invent them.

- **Overdue card debt counter** — "12 cards overdue". Rejected as demoralising at high N.
- **Melting-mastery counter/animation** — "3 topics melting". Rejected as negativity-biased.
- **Streak freeze tokens** — replaced by the "longest-ever badge" soft landing. Revisit if cliff churn shows up in analytics.
- **Jackpot XP + free site-access bypass** — gambling-adjacent; cut.
- **Weekly pledge + pledge-miss history** — cut.
- **Re-engagement email / push** — needs plumbing that does not exist.

## When these unlock

Start once the Chrome extension skeleton exists (auth, question render, `question.answer` call wired). Gamification UI layers cleanly on top of that skeleton.
