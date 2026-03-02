# ASDF-Web Production Audit

## Latest: Empirical Audit — 2026-03-01

> Q-Score Global: **72 WAG**
> Auditor: CYNIC (5 parallel agents, ~400 files analyzed)
> Branch: `develop` (113 commits ahead of main)
> Tests: 635/635 unit (26 suites) + 120 E2E (11 specs)

### Scores by Dimension

| Dimension | Score | Status |
|-----------|-------|--------|
| Dead Code / Coupling | 78 | Games decoupled (3 phases). scoring.js DOM violation remains |
| Security | 75 | CSP onerror violation, unsafe-inline broad, Redis dev unprotected |
| CSS / Design System | 64 | build.css: breakpoints/keyframes dupes/hardcoded colors. Tool pages clean |
| Accessibility / HTML | 70 | 4 WCAG violations. Good foundation (skip-links, aria, focus-visible) |
| Performance / Arch | 82 | 1 unprotected fetch. Middleware excellent. Script loading optimal |

### Findings Summary

- **P0 Critical:** 3 (onerror CSP, scoring.js DOM in logic, dead GAMES fallback)
- **P1 High:** 8 (inline module, unsafe-inline, Redis dev, SRI, keyframes×6, breakpoints×9, skip-links×2, aria-hidden)
- **P2 Medium:** 10 (legacy router, console.logs, fetch timeout, !important×77, timings, z-index, colors, contrast, div-as-button)
- **P3 Low:** 6 (PHI_INVERSE, PageLifecycle bypass, @import cascade, OG meta, inline styles, pagination)

### Strengths Confirmed

- fetchWithRetry + AbortController + phi backoff (all tool pages)
- Helmet CSP strict, rate limiting 400/15min, timing-safe Redis auth
- 566 tests / 24 suites / 0 failures / npm vulns: 0
- PageLifecycle pattern available (underutilized in games/)
- esc() canonical, SQL parameterized, cookie flags correct
- All scripts defer/module, 0 blocking, middleware order optimal
- GameEvents bus + GameStore + lifecycle events (Phase 1-3 complete)

### Full TODO in [ROADMAP-LIVE.md](ROADMAP-LIVE.md)

---

## Historical: UI Audit — 2026-02-19

> &#9888;&#65039; **HISTORICAL REFERENCE** — Point-in-time UI audit from Feb 19, 2026.
> Many items fixed in P1.4-P1.7 sprints. See ROADMAP-LIVE.md for current state.

> Audit date: 2026-02-19
> Target: hub.alonisthe.dev (asdf-gateway on Render, branch `main`)
> Scope: All routed pages currently in production

---

## Executive Summary

The hub landing page works structurally thanks to a 3-layer CSS override system (`hub-majestic.css` + `orbital-system.css` + `orbital-patch.css`), but carries ~500 lines of dead CSS and has a broken hover effect on orbital items. Tool pages are individually well-crafted but have critical mobile UX issues (Forecast and HolDex are completely unscrollable), inconsistent design token usage, and each redefines its own CSS reset/variables creating maintenance debt. Navigation between the hub and content pages (learn, build, games) is effectively broken — satellites are decorative only.

**Critical issues**: 4
**Major issues**: 8
**Minor issues**: 11

---

## P0 — CRITICAL (Breaks user experience)

### 1. Forecast: Unscrollable on all viewports
**File**: [forecast.css:67-69](css/forecast.css#L67-L69)
```css
html, body { height: 100vh; overflow: hidden; }
```
The page is a fixed 100vh dashboard. On mobile (<768px), side panels (`panel-left`, `panel-right`) are `display: none`, hiding stats, leaderboard, and history with NO alternative access. On desktop, if content overflows the fixed grid, it's clipped. The prediction terminal itself may overflow on shorter viewports.

**Fix**: Remove `overflow: hidden` from `html/body`. Make side panels collapse into an accordion or tabs on mobile instead of hiding.

### 2. HolDex: Unscrollable + sidebars vanish
**File**: [holdex.css:67-69](css/holdex.css#L67-L69)
```css
html, body { height: 100vh; overflow: hidden; }
```
Same issue as Forecast. Below 1024px, BOTH sidebars disappear (`display: none`), removing Market Overview, K-Score widget, Token Details, and Top Gainers. Only the token table remains.

**Fix**: Remove `overflow: hidden`. Move sidebar widgets above/below the table on tablet/mobile using grid reflow.

### 3. Hub satellites are non-interactive
**File**: [index.html:166-172](index.html#L166-L172)
```html
<i class="hub-satellite" data-sat="learn" style="--sat-angle: 0deg;"></i>
```
The 5 satellites (learn, analytics, build, games, deep-learn) are `<i>` elements with no `href`, no `onclick`, no `tabindex`. They're purely decorative dots. Users have **no way** to navigate from the hub to `/story`, `/build`, `/games`, or `/deep-learn` except by typing the URL manually. The footer only links to GitHub, Solscan, and Community.

**Fix**: Either make satellites into `<a>` links that appear as the achievement stage progresses, or add a secondary navigation ring/menu.

### 4. Hub orbit hover transform is overridden by animation
**File**: [orbital-system.css:435-442](css/orbital-system.css#L435-L442)
```css
.hub-orbit-item:hover {
  transform: scale(1.08); /* NEVER applies */
  animation-play-state: paused;
}
```
CSS animations always override declared `transform` values, even when paused. The hover `scale(1.08)` and the `:active scale(0.95)` have zero visual effect — the paused animation retains its transform. Users get background/border changes on hover but no scale feedback.

**Fix**: Use a wrapper element, or apply scale via a separate CSS property (`scale: 1.08` in modern CSS), or move the animation to a child pseudo-element.

---

## P1 — MAJOR (Significant UX/maintenance issues)

### 5. ~500 lines of dead CSS in hub-majestic.css
**File**: [hub-majestic.css](css/hub-majestic.css)

`orbital-patch.css` hides `.hub-node` and `.hub-tools` with `display: none !important`. This makes the following hub-majestic.css sections completely dead:
- `.hub-node` and all its children (organic blob positioning)
- `.hub-tools`, `.hub-tools-item`, `.hub-tools-trigger` (expandable tools system)
- All `.hub-node` media queries and animation states

These ~500 lines load on every hub visit for zero effect.

**Fix**: Remove the dead selectors from hub-majestic.css. The orbital-patch.css `!important` overrides can then also be removed.

### 6. CSS variable name collision across pages
Each page defines conflicting `--space-*` values:

| Variable | design-tokens.css | ignition.css | burns.css |
|----------|-------------------|--------------|-----------|
| `--space-xs` | 5px | **8px** | 8px |
| `--space-sm` | 8px | **13px** | 13px |
| `--space-md` | 13px | **21px** | 21px |
| `--space-lg` | 21px | **34px** | 34px |

Ignition and Burns shift the scale by one Fibonacci step. This means `var(--space-sm)` means 8px on the hub but 13px on Ignition. When these pages share ecosystem.css components, spacing is inconsistent.

**Fix**: All pages should use design-tokens.css values. Ignition/Burns need to be migrated to the standard scale.

### 7. Staking page has no CSS reset
**File**: [staking.css](css/staking.css)

Unlike every other page, staking.css has no `*, *::before, *::after { box-sizing: border-box; }` reset. It also doesn't import `design-tokens.css`. All values are hardcoded pixels with no CSS variables. This makes it the most fragile page for cross-browser consistency.

**Fix**: Add `@import url('./design-tokens.css')` and a box-sizing reset. Migrate hardcoded values to design token variables.

### 8. CSP meta tags conflict with Helmet CSP
**Files**: [forecast.html:25-32](forecast.html#L25-L32), [holdex.html:25-32](holdex.html#L25-L32)

Forecast and HolDex define inline `<meta http-equiv="Content-Security-Policy">` tags. These are intersected with the server's Helmet CSP (most restrictive wins). For example:
- Forecast meta CSP allows `connect-src: 'self' https://asdforecast.onrender.com https://*.solana.com`
- Server Helmet CSP allows a broader set including `https://esm.sh`, `https://api.github.com`, etc.
- Result: The meta tag CSP wins (more restrictive), blocking connections to any source not in BOTH policies.

Burns, Ignition, and Staking do NOT have meta CSP tags (correct — they rely on Helmet).

**Fix**: Remove the inline CSP meta tags from forecast.html and holdex.html. Let the server-side Helmet CSP handle everything consistently.

### 9. Mobile: Hub 5 orbital items overlap at 89px radius
**File**: [orbital-system.css:659-663](css/orbital-system.css#L659-L663)

At 768px, orbit radius drops to `--orbit-radius-f11` (89px) and item size to 44px. Five 44px items orbiting at 89px radius = items overlap significantly. Pentagon spacing at 72-degree intervals with 89px radius means item centers are ~105px apart, but with 44px sizes, items are only ~61px apart edge-to-edge — tight but not overlapping at rest. However, during animation, adjacent items will visually overlap as they orbit.

**Fix**: Reduce to 3 most important items on mobile, or switch to a vertical list/grid layout below 768px.

### 10. Hub planet hover zooms entire viewport
**File**: [orbital-system.css:114-117](css/orbital-system.css#L114-L117)
```css
.hub:has(.hub-planet:hover) {
  transform: scale(1.22);
}
```
The `.hub` element is `100vw × 100vh` with `overflow: hidden`. Scaling to 1.22x makes orbital items at the edges potentially overflow the viewport. On mobile, this 22% zoom may cause disorientation and performance issues.

**Fix**: Reduce scale factor or limit to desktop only via media query. Consider `scale` on the planet/orbits container rather than the entire `.hub`.

### 11. Forecast side panels hidden with no mobile alternative
**File**: [forecast.css](css/forecast.css) (responsive section ~1024-1100)

When `panel-left` and `panel-right` are hidden on mobile, the leaderboard, system metrics, and recent frames are completely inaccessible. There's no tab system, accordion, or drawer to access this data.

**Fix**: Add a mobile tab bar or swipeable panels. The Ignition page already demonstrates a working tab pattern that could be adapted.

### 12. Loading skeletons inconsistently defined
Each page implements loading skeletons differently:
- Burns: `.loading-skeleton` + `.skeleton-row` with animation
- Forecast: `.loading-skeleton` + `.skeleton-row`
- HolDex: `.loading-skeleton` + `.skeleton-row`
- Staking: `.staking-loading` + `.staking-spinner` (completely different pattern)
- Ignition: No loading states at all

Some pages show `is-loading` class on stat values but the pulse/skeleton animation is page-specific or absent.

**Fix**: Define shared loading skeleton styles in ecosystem.css or a shared base.

---

## P2 — MINOR (Polish, consistency, maintenance)

### 13. design-tokens.css imported multiple times
- hub-majestic.css: `@import url('./design-tokens.css')`
- holdex.css: `@import url('./design-tokens.css')`
- ignition.css: `@import url('./design-tokens.css')`
- index.html: `<link rel="stylesheet" href="css/design-tokens.css">`

The hub loads design-tokens.css twice (once via HTML link, once via hub-majestic.css import). HolDex and Ignition import it in CSS. This causes redundant network requests (though browsers may cache/dedup).

**Fix**: Remove the `@import` from CSS files. Load via HTML `<link>` only (better for performance, no render-blocking chain).

### 14. Inconsistent font-size base
- Burns: `html { font-size: 17px; }`
- Ignition: `html { font-size: 17px; }` (shrinks to 15px on mobile)
- Other pages: browser default (16px) or design-tokens base (15px)

**Fix**: Standardize on design-tokens.css `--text-base: 15px` or set a consistent html font-size.

### 15. HolDex hardcoded demo data
**File**: [holdex.html:233-246](holdex.html#L233-L246)

Top Gainers sidebar has hardcoded `$TEST +45.8%`, `$ASDF +12.5%`, `$MOON +8.3%`. These appear static and never update.

**Fix**: Either remove or mark as placeholder, or populate via JS.

### 16. Forecast countdown starts at 14:59
**File**: [forecast.html:208](forecast.html#L208)

The `#countdown` element has hardcoded text `14:59`. If JS fails to load, users see a frozen countdown.

**Fix**: Show loading/placeholder state instead of a specific time.

### 17. Ignition page: all 8 sections have placeholder data
**File**: [ignition.html](ignition.html) (entire file, 608 lines)

Every section (Dashboard, KOTH, Leaderboard, Launcher, Register, Robinhood, PAGS, Fees) contains hardcoded placeholder values. No JS dynamically populates any data.

### 18. Ecosystem nav `eco-nav-pill` does nothing without JS
**File**: All tool pages have `<div class="eco-nav-pill"></div>` — an animated indicator that slides to the active link. If ecosystem.js fails to load, the pill is an invisible empty div. Harmless but unnecessary DOM.

### 19. Theme anti-flash script inconsistency
**Files**: forecast.html, holdex.html

Both have inline `<script>` that reads `localStorage.getItem('asdf-theme')` and sets `data-theme`. But burns.html, ignition.html, and staking.html do NOT have this script. Theme persistence only works on 2 of 5 tool pages.

**Fix**: Add the anti-flash script to all tool pages, or move it to ecosystem.js with a `DOMContentLoaded` fallback.

### 20. Index.html prefetch targets outdated
**File**: [index.html:34-35](index.html#L34-L35)
```html
<link rel="prefetch" href="burns.html">
<link rel="prefetch" href="holdex.html">
```
Only 2 of 5 tools are prefetched. Also prefetches the raw HTML files, but routes are `/burns` and `/holdex` (Express serves them via routes, not direct file access).

**Fix**: Prefetch via route paths: `/burns`, `/holdex`. Consider adding the other 3 tools.

### 21. `blockAllMixedContent` is deprecated
**File**: [server.cjs:154](server.cjs#L154)
```js
blockAllMixedContent: isProduction ? [] : null,
```
`block-all-mixed-content` CSP directive is deprecated in modern browsers. `upgrade-insecure-requests` (already present) handles this.

**Fix**: Remove `blockAllMixedContent` from Helmet config.

### 22. Rate limiter at 100 req/15min is aggressive
**File**: [server.cjs:101-108](server.cjs#L101-L108)

100 requests per 15 minutes per IP = ~6.7 req/min. A user browsing 5 tool pages + hub + loading JS/CSS assets could hit this quickly, especially since static assets go through Express (not a CDN).

**Fix**: Increase to 300-500, or exclude static asset paths from rate limiting.

### 23. Staking uses hardcoded font-family strings
**File**: [staking.css](css/staking.css) throughout

Every element specifies `font-family: 'Inter', sans-serif` or `font-family: 'JetBrains Mono', monospace` directly instead of using CSS variables.

**Fix**: Migrate to `var(--font-sans)` and `var(--font-mono)` from design-tokens.css.

---

## Architecture Notes

### What works well
- **Orbital system**: The 3-file approach (hub-majestic + orbital-system + orbital-patch) is actually clever — it preserves the old code while cleanly overriding it. But the dead CSS should be pruned.
- **ecosystem.css**: Solid shared navigation shell with theme drawer, 6 themes, density system, and view transitions. Well-structured.
- **design-tokens.css**: Clean, comprehensive token system with phi-based spacing, WCAG-compliant text colors, and Apple HIG touch targets. Should be the single source of truth.
- **Page isolation**: Each page being self-contained (1 HTML + 1 CSS + 1 JS) makes forking to sollama58/gcr straightforward.
- **Accessibility**: Skip links on every page, focus-visible styles, reduced-motion queries on most pages, ARIA labels on hub elements.

### Recommended fix order
1. **P0-1 & P0-2**: Fix Forecast and HolDex scrollability (immediate UX impact)
2. **P0-3**: Make hub satellites navigable (users can't find content pages)
3. **P0-4**: Fix orbital item hover transform
4. **P1-8**: Remove conflicting CSP meta tags
5. **P1-5**: Clean dead CSS from hub-majestic.css
6. **P1-7**: Add reset/tokens to staking.css
7. **P1-6**: Standardize spacing variables
8. Everything else

---

*sniff* Confidence: 58% (phi-inv limit) — CSS interactions between animation and hover states may have nuances depending on browser. All other findings verified against source.
