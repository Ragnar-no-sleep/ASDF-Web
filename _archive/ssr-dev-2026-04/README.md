# SSR (server-side rendering for bots) — Archived 2026-05-12

`ssr/games.cjs` + `ssr/services.cjs` were used by `server.cjs` to serve
bot-rendered HTML for `/games` when user agent matched crawler patterns.

## Why archived

- Phase 1 (2026-04-24) reduced `server.cjs` to dev-only — bot SSR never reached prod
- Analysis (2026-05-12) showed zero real SEO value:
  - Leaderboards rendered were **mock data** (random scores in `getMockLeaderboard`)
  - Countdown was static at render time but updated client-side anyway
  - All SEO-essential tags already in static `games.html` (title, meta description, og:type/url/title/description/image/site_name, twitter:card, canonical, structured body)
- Crawlers index the static HTML which is sufficient for SEO

## Restoration

If real leaderboard data becomes available and bot SSR is needed:

```bash
git checkout pre-reorg-2026-04-24-baseline -- ssr/
```

Or copy back from this archive folder + restore the bot-detection helper from `server.cjs` (lines 38-106 in the baseline).

## Removed alongside

- `server.cjs` lines 33-34 (`renderGamesPage` require) and 38-106 (`BOT_USER_AGENTS` + `isBot` helper)
- `tests/unit/quality-gate.test.js` "SSR Quality" describe block (3 tests) + `SSR_DIR` constant

— Phase 1.5 Wave 3
