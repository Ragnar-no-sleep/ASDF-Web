# ASDF-Web Fork Guide

> For external developers forking ASDF-Web tool pages.

---

## Quick Start

```bash
git clone <your-fork-url>
npm install
npm run dev    # starts Express on http://localhost:3000
```

Tool pages are available at: `/burns`, `/forecast`, `/holdex`, `/staking`, `/ignition`

---

## Architecture Overview

Each tool page follows the **1-1-1 convention**: 1 HTML + 1 CSS + 1 JS file.

```
burns.html          # Page markup
css/burns.css       # Page styles (includes variant + density CSS)
js/burns.js         # Page logic (data fetching, UI updates)

css/ecosystem.css   # Shared navigation, drawer, theme shell
js/ecosystem.js     # Shared drawer logic, theme/density/variant management
css/design-tokens.css # Phi-based spacing, typography, colors
```

---

## Theme System

### Page Themes (`data-theme`)

Set on `<html>` automatically by `ecosystem.js`. Each tool page has a default:

| Page | Theme | Accent Color |
|------|-------|-------------|
| Burns | `ember` | #c9a227 (gold) |
| Forecast | `matrix` | #00ff41 (green) |
| HolDex | `holdex` | #4ade80 (green) |
| Staking | `delegate` | #7b93ff (blue) |
| Ignition | `arcade` | #ea580c (orange) |

Plus a global override: `console` (CRT terminal mode).

### Visual Variants (`data-variant`)

Each page has 3 color variants. Set on `<html>`, stored in `localStorage` as `asdf-variant-{page}`.

To customize: override the CSS variables in `[data-variant='2']` and `[data-variant='3']` blocks in the page CSS file.

Example from `burns.css`:
```css
/* Variant 2: Inferno */
[data-variant='2'] {
  --gold: #dc2626;
  --gold-light: #f87171;
  --ember: #ff3b3b;
  /* ... */
}
```

### Content Density (`data-density`)

Three levels of content depth. Set on `<html>`, stored as `asdf-density-{page}`.

| Value | Behavior |
|-------|----------|
| (none) / `minimal` | Dashboard view: stats and quick actions |
| `detailed` | + context guides, descriptions, FAQ sections |
| `full` | + visual effects, glows, expanded hero, animations |

To add density-aware content in HTML:
```html
<!-- Shown only in detailed + full modes -->
<p class="density-detailed">Extra explanation here</p>

<!-- Shown only in full mode -->
<div class="density-full">Immersive content here</div>
```

---

## Ecosystem Shell

The navigation bar and drawer are shared across all tool pages.

### Navigation (`ecosystem.css`)

```html
<nav class="eco-nav eco-nav--burns">
  <!-- Logo, center links, home button -->
</nav>
```

The `eco-nav--{page}` modifier applies page-specific border colors and glows.

### Drawer (`ecosystem.js`)

The left-side drawer is rendered dynamically by `ecosystem.js`. It contains:
- **Global Theme toggle** (Auto / Console)
- **Tool cards** (accordion) with density picker + color swatches
- **Universe links** (Games, Build)

Configuration lives in `PAGE_TOOLS` object in `ecosystem.js`:
```js
burns: {
  icon: '\u{1F525}',
  label: 'Burns',
  href: '/burns',
  defaultTheme: 'ember',
  densityKey: 'asdf-density-burns',
  variantKey: 'asdf-variant-burns',
  variants: {
    names: ['Gold', 'Inferno', 'Ash'],
    swatches: ['eco-variant-swatch--gold', ...],
  },
}
```

To add a new tool page, add an entry to `PAGE_TOOLS` and create matching swatch classes in `ecosystem.css`.

---

## CSS Customization Points

### Design Tokens (`css/design-tokens.css`)

All spacing, typography, and timing values use phi-based (1.618) scales:
```
Spacing: 2, 3, 5, 8, 13, 21, 34, 55, 89px
Typography: 9, 10, 11, 13, 15, 17, 20, 24, 28, 34, 55px
```

### Page-Level Variables

Each page CSS defines its own `:root` variables. Override these for brand customization:
```css
:root {
  --gold: #c9a227;       /* Primary accent */
  --gold-light: #e8c547; /* Hover state */
  --gold-dim: #8b7019;   /* Muted accent */
  --ember: #ff6b35;      /* Secondary accent */
  --black: #000000;      /* Background */
  --charcoal: #111118;   /* Card backgrounds */
}
```

### Variant Swatches (`ecosystem.css`)

Color swatches shown in the drawer. Add new ones:
```css
.eco-variant-swatch--mycolor {
  background: linear-gradient(135deg, #000 30%, #yourcolor);
}
```

---

## Backend Endpoints

Tool pages fetch data from the API. In dev, requests proxy through Express to the API.

| Endpoint | Used By | Returns |
|----------|---------|---------|
| `GET /api/ecosystem/burns` | Burns | totalBurned, burnPercentage, circulatingSupply, uniqueBurners |
| `GET /api/ecosystem/burns?recent=true` | Burns | recentBurns[] |
| `GET /api/leaderboard/burns` | Burns | leaderboard[] (wallet, totalBurned, burnCount) |
| `GET /api/scores/leaderboard/{period}/burns` | Burns | period-filtered leaderboard (weekly/monthly) |
| `GET /api/ecosystem/forecast` | Forecast | predictions, confidence scores |
| `https://holdex.onrender.com/api/tokens` | HolDex | tokens[] with kscore, price, volume, marketCap |
| `https://holdex.onrender.com/api/token/{addr}` | HolDex | token detail (full kscore breakdown) |
| `https://holdex.onrender.com/api/stats` | HolDex | totalTokens, volume24h, averageKScore |
| `https://holdex.onrender.com/api/search?q=` | HolDex | search results[] |
| `GET /api/staking/validators` | Staking | validator list, APY |
| `GET /api/games/ignition` | Ignition | game state, scores |

**Fallback**: All pages include mock data if API calls fail, so they render without a backend.

---

## Integrated Patterns (from sollama58 repos)

The following patterns were adapted from sollama58's open-source repositories and harmonized into the ASDF-Web design system.

### Exponential Backoff Fetch

Used in: **Burns**, **HolDex**. Source: `sollama58/ASDFBurnTracker`.

All API calls retry up to 3 times with doubling delay (1s → 2s → 4s):
```js
async function fetchWithRetry(url, maxRetries) {
  if (!maxRetries) maxRetries = 3;
  var delay = 1000;
  for (var i = 0; i <= maxRetries; i++) {
    try {
      var response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response;
    } catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(function(resolve) { setTimeout(resolve, delay); });
      delay *= 2;
    }
  }
}
```

To extend: wrap any new `fetch()` call with `fetchWithRetry()`. The pattern is defined per-page (not shared) to keep the 1-file-per-page convention.

### API Connection Status Monitor

Used in: **Burns**. Source: `sollama58/ASDFBurnTracker`.

The hero badge dot changes color based on API connectivity:
- **Green** `#22c55e` — API connected
- **Red** `#ef4444` — API unreachable, showing cached/mock data

```js
function updateConnectionStatus(connected) {
  var dot = document.querySelector('.hero-badge-dot');
  if (!dot) return;
  dot.style.background = connected ? '#22c55e' : '#ef4444';
}
```

### K-Score Metal Ranks

Used in: **HolDex**. Source: `sollama58/HolDex calculator.js`.

8-tier ranking system based on K-Score value:

| Score | Rank | CSS Class |
|-------|------|-----------|
| 90+ | Diamond | `rank-badge--diamond` |
| 80-89 | Platinum | `rank-badge--platinum` |
| 70-79 | Gold | `rank-badge--gold` |
| 60-69 | Silver | `rank-badge--silver` |
| 50-59 | Bronze | `rank-badge--bronze` |
| 40-49 | Copper | `rank-badge--copper` |
| 20-39 | Iron | `rank-badge--iron` |
| <20 | Rust | `rank-badge--rust` |

Rank badges display as colored diamond icons (`&#9670;`) next to K-Score values in the token list. The metal rank legend widget appears in `density-detailed` mode.

### Credit Ratings

Used in: **HolDex**. Source: `sollama58/HolDex calculator.js`.

Aggregate credit grade based on average K-Score across tracked tokens:

| Score | Grade | CSS Class |
|-------|-------|-----------|
| 90+ | A1 | `credit-badge--a1` |
| 75+ | A2 | `credit-badge--a2` |
| 60+ | B1 | `credit-badge--b1` |
| 45+ | B2 | `credit-badge--b2` |
| 30+ | C | `credit-badge--c` |
| <30 | D | `credit-badge--d` |

Displayed in the K-Score sidebar widget. Updated on stats refresh.

### Marquee Ticker

Used in: **Forecast**. Source: `sollama58/ASDForecast`.

Scrolling price/stats bar between dashboard header and main grid:
```css
.marquee-track {
  display: flex;
  animation: marquee-scroll 27s linear infinite;
}
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

Content is duplicated in the track for seamless looping. Respects `prefers-reduced-motion` (pauses animation). Ticker IDs (`#ticker-sol`, `#ticker-asdf`, `#ticker-burn`) are updated by `forecast.js`.

### Governance Thresholds

Used in: **Staking**. Source: `sollama58/TokenVotingUtil`.

Vote threshold progress bars for quorum and approval:
```html
<div class="threshold-card">
  <div class="threshold-label">Quorum</div>
  <div class="threshold-bar">
    <div class="threshold-fill" style="width:62%"></div>
  </div>
  <div class="threshold-meta">
    <span>62% reached</span>
    <span>Target: 67%</span>
  </div>
</div>
```

Shown in `density-detailed` mode. Fill widths should be updated dynamically when governance API is connected.

### Airdrop Eligibility & Multiplier Tiers

Used in: **Ignition**. Source: `sollama58/TokenVotingUtil` patterns.

Eligibility requirements grid (3 items) and multiplier tiers table (6 rows) in the FAQ section. Multiplier values: #1 = 5.0x, #2 = 3.0x, #3 = 2.0x, #4-5 = 1.5x, #6-10 = 1.0x, #11+ = 0.1-0.5x. All variant-aware across 3 Ignition themes.

---

## Deployment (Render)

### Environment

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` or `development` |
| `PORT` | Server port (default: 3000) |
| `API_URL` | Backend API base URL |

### Render Config

- **Build command**: `npm install`
- **Start command**: `node server.cjs`
- **Branch**: `develop` (staging) or `main` (production)
- Auto-deploy: enabled on branch push

### Static Assets

All CSS/JS/HTML served directly by Express with Helmet security headers.
No build step needed. No bundler. Direct serve.

---

## File Structure Reference

```
/
  burns.html              # Tool pages at root
  forecast.html
  holdex.html
  staking.html
  ignition.html
  css/
    design-tokens.css     # Phi-based tokens
    ecosystem.css         # Shared shell + themes
    burns.css             # Per-page styles
    forecast.css
    holdex.css
    staking.css
    ignition.css
    loading-states.css    # Shared skeleton loaders
  js/
    ecosystem.js          # Shared drawer/theme logic
    burns.js              # Per-page logic
    forecast.js
    holdex.js
    staking.js
    ignition.js
    shared/
      security.js         # XSS protection (escapeHtml)
    utils/
      interactions.js     # Ripple, glow effects
      contextual-animations.js  # Burn particles etc.
      audio-feedback.js   # Sound effects
  server.cjs              # Express server
  package.json
```

---

## Checklist: Before You Fork

- [ ] Verify `npm install` completes without errors
- [ ] Run `npm run dev` and check all 5 tool pages load
- [ ] Open drawer (palette button, left side) and test density/variant toggles
- [ ] Test each variant (3 per page) renders correctly
- [ ] Test each density level shows/hides content appropriately
- [ ] Check mobile responsiveness (viewport < 600px)
- [ ] Verify `prefers-reduced-motion` disables animations
- [ ] Update `PAGE_TOOLS` in ecosystem.js if adding new pages
- [ ] Update variant swatch CSS in ecosystem.css for custom colors

---

*Don't trust. Verify. Don't extract. Burn.*
