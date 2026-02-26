# ASDF-Web Architecture

> Current state of the codebase, patterns, and conventions.

**Last Updated:** February 2026 (C.1 Helius modularisation)
**Grade:** B+ (target: A by end of roadmap)

---

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Server | Express.js + Helmet | `server.cjs` (port 3000) |
| API | Express.js | `api/index.js` (port 3001) |
| Frontend | Vanilla HTML/CSS/JS | No framework, no bundler |
| Design System | CSS Custom Properties | `system.css` + `design-tokens.css` |
| Wallet | Solana Web3.js | Challenge-response auth |
| Deploy | Render | develop > staging, main > prod |

---

## File Structure

```
/
  index.html              Hub landing (orbital system)
  burns.html              Burn tracker
  forecast.html           Predictions terminal
  holdex.html             Token tracker
  staking.html            Delegation dashboard
  ignition.html           Game arcade
  learn.html              Philosophy intro
  deep-learn.html         Technical deep dive
  build.html              Builder hub
  games.html              Games arcade
  privacy.html            Privacy policy
  me.html                 User profile
  tools.html              Tools index
  terrier.html            CYNIC companion

css/
  design-tokens.css       Phi-based tokens (spacing, type, z-index)
  system.css              Base components (nav, buttons, cards, tables, badges)
  ecosystem.css           Shared shell (nav, themes, view transitions)
  loading-states.css      Skeletons, spinners, error states
  hub-majestic.css        Hub page styles
  orbital-system.css      Orbital animation system
  orbital-patch.css       Orbital overrides
  burns.css               Burns page
  forecast.css            Forecast page
  holdex.css              HolDex page
  staking.css             Staking page
  ignition.css            Ignition page
  build.css               Build page (146K - large)
  games.css               Games page (65K - needs splitting)
  learn.css               Learn page

js/
  core/
    ServiceContainer.js   DI container (register/get services)
    Store.js              Reactive state (subscribe/dispatch)
    PageController.js     Base class for all pages
  burns.js                Burns page logic
  forecast.js             Forecast page logic
  holdex.js               HolDex page logic
  staking.js              Staking page logic
  ignition.js             Ignition page logic
  ecosystem.js            Shared ecosystem shell logic
  ecosystem-data.js       Data catalog (17.5K lines - needs splitting)
  hub-majestic.js         Hub page logic
  learn.js                Learn page logic
  deep-learn.js           Deep learn page logic

api/
  services/               56 atomic services + 1 modular subdirectory
    helius/               Helius integration (modular, barrel export)
      index.js            Barrel — re-exports client.js (zero import breakage)
      client.js           Core RPC client (token balances, burns, supply)
      enhanced.js         DAS API, tx simulation, enhanced tx parsing
      ws.js               WebSocket subscriptions (account, logs, slot)
      webhooks.js         Webhook processing & event queue
      middleware/
        metrics.js        Prometheus-compatible metrics
        rateLimit.js      Adaptive rate limiter (sliding window, per-wallet)
        batch.js          JSON-RPC request batcher (deduplication, priority)
        failover.js       Multi-endpoint failover & health monitoring
  routes/                 15 route modules
  admin.js                Admin monolith (1,319L - needs splitting)
  security/               Auth, CSRF, validation middleware

docs/                     Architecture docs (gitignored)
_archive/                 Historical docs (gitignored)
```

---

## Design System

### Tokens (`design-tokens.css`)
- **Spacing**: Phi-based from 8px base: `2, 3, 5, 8, 13, 21, 34, 55, 89px`
- **Typography**: Phi-based from 15px base: `9, 10, 11, 13, 15, 17, 20, 24, 28, 34, 55px`
- **Fonts**: Inter (body), JetBrains Mono (code)
- **Z-index**: 10-layer system (base 1 to max 500)

### Colors (`system.css`)
- **Surfaces**: `#000000` > `#0a0a0c` > `#111114` > `#18181c` > `#1f1f24`
- **Accent**: `#ea4e33` (ASDF orange-red)
- **Semantic**: success `#22c55e`, warning `#f59e0b`, error `#ef4444`, info `#3b82f6`
- **Text**: primary `#fff`, secondary `#a1a1aa`, tertiary `#71717a`, muted `#71717a`

### Theme System (`ecosystem.css`)
6 page themes via `data-theme` attribute on `<html>`:

| Theme | Page | Accent |
|-------|------|--------|
| `ember` | Burns | gold `#c9a227` |
| `matrix` | Forecast | matrix green `#00ff41` |
| `holdex` | HolDex | green `#4ade80` |
| `delegate` | Staking | blue `#7b93ff` |
| `arcade` | Ignition | orange `#ea580c` |
| `console` | Terminal | CRT green `#00ff00` |

Each theme overrides `--eco-accent`, `--eco-accent-glow`, `--eco-accent-soft`, `--eco-bg`, `--eco-nav-bg`, `--eco-nav-border`.

---

## Patterns in Use

### Service Locator (`js/core/ServiceContainer.js`)
Central registry. Register services by name with lifecycle (singleton/transient).
```js
container.register('apiClient', () => new ApiClient(), 'singleton');
const client = container.get('apiClient');
```

### Reactive Store (`js/core/Store.js`)
Observer pattern. Subscribe to state changes, dispatch actions.
```js
const store = new Store({ count: 0 });
store.subscribe(state => render(state));
store.dispatch({ type: 'increment' });
```

### Page Controller (`js/core/PageController.js`)
Template method. Defines lifecycle: `setupDOM > loadData > render > attachListeners`.
Each page extends and implements `render()`.
```js
class BurnsPage extends PageController {
  async render() { /* page-specific */ }
}
```

### Ecosystem Shell
Shared navigation, theme drawer, view transitions across all tool pages.
Loaded via `ecosystem.css` + `ecosystem.js` on every tool page.

---

## Conventions

1. **1 file per page**: HTML + CSS + JS triplet per page
2. **CSS variables only**: Never hardcode colors, use tokens from system.css
3. **HTML entities**: Use `&#x1F525;` not emoji in source code
4. **Phi timings**: Fibonacci-based animation durations
5. **No bundler**: Direct serve, no build step for HTML pages
6. **Security first**: Helmet CSP, rate limiting, CSRF, parameterized SQL

---

## Known Technical Debt

| Issue | Impact | Location |
|-------|--------|----------|
| ecosystem-data.js 17.5K lines | Memory, parse time | `js/ecosystem-data.js` |
| build.css 146K | Bundle size | `css/build.css` |
| admin.js 1,319 lines monolith | Maintainability | `api/admin.js` |
| Shop v1/v2 duplication 38K | Bug risk | `api/services/shop*.js` |
| Helius (RESOLVED) modular | Resolved C.1 | `api/services/helius/` (barrel index, 8 files) |
| Game engines 9x copy-paste | Bug fix = 9 edits | `js/games/*.js` |

---

*sniff* -- CYNIC
