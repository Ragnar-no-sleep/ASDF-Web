# ROADMAP-LIVE.md

**Updated:** 2026-02-28
**Status:** Phase 1.6 — CSS cleanup sweep complete (7 atomic commits, Q-Score 85 HOWL)
**Owner:** CYNIC / ragnarnosleep + sollama58 + zeyxx

---

## État actuel — ce qui est DONE

### Phase A — Fondations (Session 4, Feb 24)
- [x] `js/config/endpoints.js` — ASDF_ENDPOINTS, single source of truth (frozen)
- [x] `js/utils/format.js` — formatNumber, formatWallet, formatTimeAgo, formatDuration
- [x] `js/core/PageLifecycle.js` — timer/listener cleanup on beforeunload
- [x] 5 tool pages — URL centralisées (burns, forecast, holdex, staking, ignition)
- [x] forecast.css + holdex.css — mobile P0 fix (100vh → min-height + overflow-y)
- [x] PHP legacy archivé → `_archive/php-game-store-2025/`
- [x] Orphan configs supprimés (tailwind.config.ts, next.config.ts, tsconfig.json)
- [x] CLAUDE.md mis à jour (shell pattern, shared utils, linked repos)
- [x] 35 tests unitaires ajoutés (endpoints + format)

### Phase B — Ecosystem Map (commit 3ff598d, Feb 24)
- [x] `demo/ecosystem-map.html` → `/ecosystem-map.html` (public)
- [x] Route `/ecosystem-map` ajoutée à server.cjs
- [x] `js/ecosystem-data.js` régénéré (catalogue de données)

### Phase C — Consolidation (Session 5, Feb 25)
- [x] **C.4** Fix 8 failures de tests pre-existants
  - ecosystem-routes: mockImplementation avec pagination sémantique
  - games/config: factory `makeEnv(hostname)` — élimine dépendance jsdom window.location
- [x] **C.1** Helius modularisation (commit 161cbcc)
  - 8 fichiers → `api/services/helius/` (barrel index, zéro import breakage)
  - 4 consumers externes mis à jour (api/index.js, admin.js, routes/helius.js ×2)
  - Tous les require relatifs corrigés (./audit → ../audit ou ../../audit)
- [x] **D** ARCHITECTURE.md mis à jour (local, gitignored)
- [x] eslint.config.js — CJS sourceType pour api/ + ignore ecosystem/ (commit 92958cb)

**Tests: 497/497 pass** ✓ (20 suites)

---

## Ce qui RESTE — priorisé

### P1 — Phase 1.2 Tool Quality (complété 2026-02-27)

| Page | Q-Score | Status | Gaps résiduels |
|------|---------|--------|----------------|
| **Burns** | ~87 HOWL | ✓ fork-ready | issues #2/#3/#4 pending backend |
| **Staking** | ~84 HOWL | ✓ fork-ready | getDemoLocks() marginal |
| **Forecast** | ~78 WAG | ✓ fork-ready | stat-frames/burned absent /api/state |
| **HolDex** | ~75 WAG | ✓ fork-ready | sort=change mismatch (issue #8) |
| **Ignition** | shell | ✓ shell honnête | 7× [API] TODO, backend inexistant |

### P1.3 — Sollama58 Coordination (complété 2026-02-27)

| Repo | Issues | PRs | Overview | Q-Score |
|------|--------|-----|----------|---------|
| ASDFBurnTracker | #1-#5 | — | #6 | 76 WAG |
| TokenVotingUtil | #2-#7 | #1 infra, #8 governance | #9 | 74 WAG |
| ASDForecast | #2-#4 | — | #5 | 85 HOWL |
| HolDex | #8-#10 | — | #11 | 81 HOWL |
| ignition | — | — | — | Blocked (no repo) |

**Total** : 21 issues + 2 PRs across 4 repos. Global Q-Score: 81 HOWL.

Each repo has an **overview issue** that presents the ASDF-Web frontend pack, links all related issues, shows what works vs what needs alignment, and references the relevant ASDF-Web commits.

**Key findings during coordination** :
- BurnTracker `/api/burn` merges `cache.forecast` — response includes totalVolume, totalFees (cross-service)
- HolDex backend returns richer data than frontend uses (kRank, creditRating, liquidity, image)
- HolDex sort mismatch: frontend sends `change`, backend expects `gainers`/`24h`
- TVU governance: threshold `>=` bug + no tie detection → fixed in PR #8
- TVU issue #7 was corrupted (GitHub API stripped backtick identifiers) → rewritten
- Forecast `endpoints.js` points to `asdforecast.onrender.com` (direct) not `alonisthe.dev/asdforecast` (proxy not set up)

**Status** : ball is with sollama58. Waiting for review/response.

### P1.4 — Full Stack Audit (2026-02-28)

Full stack empirical audit — Q-Score: 74 WAG.

**P0 fixes applied** :
- [x] Routes `/me` + `/terrier` — explicit routes added to server.cjs (were falling through to SPA catch-all → serving index.html instead of actual pages)
- [x] `notice.js` — ES6 module conversion (`export function`, `const`, arrow fn), `<script type="module">` in staking/forecast/ignition HTML. `window.showNotice` preserved for backward compat
- [x] `privacy.html` `lang="en"` — false positive (already present)

**P1 fixes applied** :
- [x] staking.css — all timings aligned to Fibonacci (20s→21s, 300→233, 600→610, 800→610, 200→233, 150→144ms)
- [x] `fetchWithRetry` — extracted to `js/utils/fetch-retry.js` (AbortController + φ-377ms backoff), burns.js + staking.js rewired

### P1.5 — Frontend Audit Fixes (2026-02-28)

Full stack audit (AUDIT-FRONTEND.md) → 66 findings → 41 fixes applied as **13 atomic commits**.

**CRIT (6/6 DONE):**
- [x] server.cjs — global error handler before app.listen()
- [x] server.cjs — graceful shutdown (SIGTERM/SIGINT + 10s timeout)
- [x] server.cjs — Redis error sanitize (production hides error.message)
- [x] server.cjs — CSP connectSrc: +alonisthe.dev, +lock-verifier.onrender.com
- [x] anti-flash.js — localStorage key mismatch (`asdf-theme` → `asdf-global-theme`)
- [x] deep-learn.html — stale `/asdforecast` → `/forecast`

**HIGH (13/21 DONE, 1 FALSE POSITIVE, 7 deferred):**
- [x] XSS in contextual-animations.js — innerHTML → textContent (createElement)
- [x] deep-learn.html — hardcoded 8% → `--` placeholders
- [x] me.js — PageLifecycle.registerTimer for setInterval
- [x] CSS tokens — 3 added (--z-header, --radius-xs, --text-6xl)
- [x] server.cjs — env var validation at startup
- [x] server.cjs — Permissions-Policy header
- [x] Skip-links — me.html, privacy.html, terrier.html
- [x] learn.html — h2 → h1 heading
- [x] terrier.html — k-trigger keyboard + overlay Escape
- [x] npm audit fix — minimatch + rollup (0 vulns)
- [x] .nvmrc — Node 20.11.0 pinned
- [x] holdex.js — shared fetchWithRetry imported
- [x] PageLifecycle unit tests — 9 tests
- [~] games.html keyboard handlers — FALSE POSITIVE (arcade-hub.js already handles)
- [ ] CSP SRI (scriptSrc) — deferred (long-term)
- [ ] yggdrasil-mock-data.js — deferred (455L mock still present)
- [ ] Page controller tests — deferred
- [ ] Audio system tests — deferred
- [ ] Coverage threshold 50→70% — deferred
- [ ] build.html SVG branch a11y — open
- [ ] me.html heatmap keyboard — open

**MED (12/25 DONE, 1 FALSE POSITIVE, 12 open/deferred):**
- [x] system.css vs design-tokens.css collision — 6 tokens aligned
- [x] holdex.js fetchWithRetry dedup
- [x] learn.js + deep-learn.js → type="module"
- [x] server.cjs — conditional localhost CSP
- [x] server.cjs — Cache-Control on /health
- [x] Meta descriptions — learn, me, privacy
- [x] index.html — hub toggle focus-visible
- [x] build.html — og:image
- [x] terrier.html — OG meta
- [x] me.html — inline onclick → semantic `<a>` links
- [x] me.html — progress bars ARIA (role, valuenow, label)
- [x] terrier.html — kFormulaOverlay Escape handler
- [~] build.html aria-label — FALSE POSITIVE (already had aria-label)

**LOW (7/14 DONE):**
- [x] upgradeInsecureRequests — `[]` → `true`
- [x] Error codes — standardize 403→404
- [x] build.html — defer viking-bg.css
- [x] games.html — defer all 64 scripts
- [x] _archive_build.js → _archive/
- [x] demo/lab — production gate
- [x] eslint — _archive/** ignore

**Tests:** 497 → 506 (+9 PageLifecycle). npm vulns: 2 → 0.

### P1.6 — CSS Cleanup Sweep (2026-02-28)

Full codebase CSS/JS dedup sweep — Q-Score: 68 → 85 HOWL. 7 atomic commits, ~-1500 LOC net.

**Group A — JS Cleanup:**
- [x] `esc()` canonical → `js/utils/escape.js` (was 3× in staking/holdex/forecast)
- [x] `formatTimeAgo()` enhanced — accepts ISO strings + Unix ms
- [x] HolDex keydown leak → PageLifecycle.registerListener
- [x] `js/realtime/` deleted (dead WebSocket, -870 LOC)

**Group B — CSS @keyframes:**
- [x] Duplicate `spin` removed (builder-profile + github-timeline)
- [x] Canonical `fadeIn`, `bounce`, `shake` added to system.css

**Group C — CSS Design System:**
- [x] `--font-sans` + `--font-mono` centralized, removed from 5 tool CSS
- [x] Breakpoint tokens: 1024/768/480 standard
- [x] CSS vars extraction: 1335 total var() calls across 5 pages
- [x] Staking: --staking-white-rgb + --staking-black-rgb (59 hardcoded → 0)

**Group D — Breakpoints:**
- [x] Burns + Staking: 900px → 768px, 600px → 480px

**Gap fixes:** forecast z-index → var(--z-overlay), burns dead import removed.

**Tests:** 544/544 pass (22 suites).

### P1.7 — Games Decoupling (2026-03-01)

Games architecture refactoring — GameEvents bus + GameStore + lifecycle decoupling.
3 phases, 13 commits, tests 506 → 566 (+60).

**Phase 1 — Event Bus + Notifications (3 commits):**
- [x] GameEvents bus (`js/games/shared/events.js`) — on/off/emit, sync forEach
- [x] 11 notification sites migrated from inline DOM to `GameEvents.emit('notify', ...)`
- [x] `clearAuthCache` dead code deleted from main.js

**Phase 2 — GameStore + State (6 commits):**
- [x] GameStore centralized state mutations (setWallet, clearWallet, updateBalance, resetBalance)
- [x] Phantom handlers deduplicated via GameStore (main.js)
- [x] GameStore subscribers wired in main.js (wallet-connected, wallet-disconnected, balance-changed)
- [x] Duplicate functions deleted from engine.js
- [x] resetBalance() precision fix — silent mutation, no event, prevents double-render
- [x] 13 contract tests (store.test.js)

**Phase 3 — Lifecycle Decoupling (4 commits):**
- [x] GameRewards dead code deleted (typeof guard always false, 13 lines)
- [x] CompetitiveUI.resetToPractice() — single source for mode/DOM/timer reset
- [x] CompetitiveUI.init() — subscribes to `game:mode-fallback` event
- [x] lifecycle.js emits events instead of DOM manipulation (game:mode-fallback, game:started, game:ended)
- [x] modal.js close() delegates to CompetitiveUI.resetToPractice()
- [x] 10 contract tests (competitive.test.js)
- [x] Bug fix: competitive fallback now hides timer-stat (was missing)

**Architecture wins:**
- `shared/` (logic layer) no longer touches DOM for competitive mode
- 3× duplicated 5-line reset → single `resetToPractice()`
- Forward-compatible lifecycle events (game:started, game:ended) for future hub audio/analytics
- 191 coupling points audited → high-value items resolved, 76 engine→scoring calls left as-is (working fine)

**Tests:** 566/566 pass (24 suites). **Q-Score games arch:** ~80 WAG.

### P1.8 — Empirical Audit (2026-03-01)

Full codebase audit across 5 dimensions. Q-Score global: **72 WAG**.

| Dimension | Score | Key Findings |
|-----------|-------|-------------|
| Dead Code / Coupling | 78 | scoring.js DOM in logic layer, initializeGame() legacy router, GAMES fallback dead path |
| Security | 75 | onerror CSP violation, unsafe-inline broad scope, Redis dev unprotected, missing SRI |
| CSS / Design System | 64 | build.css: breakpoints/keyframes dupes/hardcoded colors, 77× !important |
| Accessibility / HTML | 70 | 4 WCAG violations (skip-links, aria-hidden toggle, div-as-button, heading hierarchy) |
| Performance / Arch | 82 | 1 unprotected fetch (deep-learn.js), games bypass PageLifecycle, CSS @import cascade |

**27 findings documented** (3 P0, 8 P1, 10 P2, 6 P3). See TODO list below.

**Décisions 2026-02-27 (session 1)** :
- HolDex backend = Option A (shell only) — PostgreSQL+Redis trop lourd à forker
- Gouvernance staking supprimée (données hardcodées 62%/78% sans endpoint)
- Tous les phantom endpoints remplacés par `showXxxPending()` honnêtes

**Décisions 2026-02-27 (session 2)** :
- Overview issues créées per-repo (pitch professionnel, pas juste des bug reports)
- P0-2 "COINECKO typo" = faux positif (empiriquement inexistant) → skip
- TVU PR #8 = governance bugs 1+2 only, bug 3 (backend tally) différé (architecture decision)
- Forecast CORS issue filed (matches TVU PR #1 pattern)

**Décision 2026-02-28** :
- Monster commit split into 13 atomic commits (1 feature = 1 commit rule)
- `git push --force-with-lease` to replace single commit on develop

---

### P2 — Infrastructure (à confirmer scope)

**`api/serverless.js`** (251 lignes, ouvert par user)
- À investiguer : est-ce une migration Vercel/Netlify ? Un adapter Express→serverless ?
- Action requise : lire le fichier et décider si à intégrer au pipeline ou archiver

**C.3 — CSS Split** (différé, besoin perf data)
- `build.css` 146K → split main/animations/3d
- `games.css` 65K → split main/arcade
- `hub-majestic.css` — audit dead CSS (classes overridées par orbital-patch.css)
- **Condition** : mesures Lighthouse avant/après pour justifier

---

### P3 — Bloqué (dépendances externes)

**C.2 — Shop v1/v2 merge**
- **BLOQUÉ** : V1 = on-chain burns, V2 = DB dual-currency — architecturalement incompatibles
- **Débloquer** : confirmer avec sollama58 que V2 implémente bien les burns on-chain avant merge
- Ne pas toucher sans cette confirmation

---

### P4 — Backlog Phase 2 (après fork-ready)

- [ ] Landing hub visual refresh
- [ ] Learn track content enrichment
- [ ] Deep learn technical docs
- [ ] Build page perf (ecosystem-data.js 17.5K lines → split)
- [ ] Games arcade completion
- [ ] Admin.js split (1,319 lignes monolith → modules)
- [ ] Game engines base class (9x copy-paste → 1 base + overrides)

---

## Blockers & Risques

| Blocker | Impact | Action |
|---------|--------|--------|
| sollama58 V2 burns feature? | C.2 merge impossible | Demander confirmation explicite |
| No perf baseline CSS | C.3 split sans ROI mesurable | Lighthouse run avant |
| serverless.js usage unclear | Dead code ou feature? | Lire + décider |

---

## Decision Log

**2026-02-21**: Pivot tool-pages-first (Phase 1 avant backend).

**2026-02-21**: Phase 1.1 multi-theme découvert déjà implémenté → skip directement Phase 1.2.

**2026-02-24**: Phase A complète. Helius marqué pour C.1 en Phase C.

**2026-02-25**: C.1 Helius modularisé via barrel index.js (Node.js dir resolution trick).
C.2 Shop merge confirmé BLOQUÉ. C.3 CSS différé (manque perf data).

**2026-02-27 (session 2)**: P1.3 sollama58 coordination complete.
21 issues + 2 PRs + 4 overview issues across 4 repos.
gh CLI auth under Ragnar-no-sleep. TVU forked for governance PR.
BurnTracker /api/burn confirmed cross-service merge (cache.burn + cache.forecast).
HolDex sort mismatch discovered (change vs gainers). Ignition blocked (no repo).

**2026-02-28**: P1.4 full stack audit. Q-Score 74 WAG.
3 P0 identified → 2 real fixes (routes + notice.js ES6), 1 false positive (privacy.html).
Node.js 24.14.0 LTS installed. 485/485 tests confirmed green.

---

---

## TODO — Backlog complet (post audit 2026-03-01)

### P0 — Fix immédiat

- [ ] **SEC-1** `ecosystem-map.html:1286` — onerror inline handler → script event listener (CSP violation)
- [ ] **ARCH-1** `shared/scoring.js:17,22` — DOM manipulation in logic layer → emit events
- [ ] **ARCH-2** `shared/validation.js:50-52` — `GAMES` fallback never works → remove dead path

### P1 — High priority

- [ ] **SEC-2** `build.html:825-855` — inline `<script type="module">` → external file
- [ ] **SEC-3** `server.cjs:131` — `scriptSrcAttr: unsafe-inline` broad scope → migrate onclick to JS listeners
- [ ] **SEC-4** `server.cjs:307-361` — Redis endpoint unprotected in dev mode
- [ ] **SEC-5** `ecosystem-map.html:1283` — missing SRI on D3.js CDN
- [ ] **CSS-1** `build.css` + 5 files — 5+ duplicate @keyframes (fadeIn×6, pulse×6, spin×4)
- [ ] **CSS-2** 9 files — non-standard breakpoints (900/1200/600/640/769px)
- [ ] **A11Y-1** `build.html`, `ecosystem-map.html` — missing skip-to-content links
- [ ] **A11Y-2** `staking.html:233` — modal aria-hidden not toggled on open

### P2 — Medium

- [ ] **ARCH-3** `engines/index.js:190-232` — legacy initializeGame() switch router → verify/remove
- [ ] **ARCH-4** 30+ files — 40+ console.log in games modules (all environments)
- [ ] **ARCH-5** `timing-config.js:149,154,159,164` — window.ASDF repeated 4×
- [ ] **PERF-1** `deep-learn.js:109` — unprotected fetch() without timeout → fetchWithRetry
- [ ] **CSS-3** 28 in build.css — 77× !important overrides
- [ ] **CSS-4** `build.css` — non-Fibonacci animation timings (0.3s, 0.5s, 0.75s)
- [ ] **CSS-5** `ecosystem.css` — z-index fragmentation (800-900 range vs design-tokens)
- [ ] **CSS-6** `build.css`, `learn.css` — ~25 hardcoded colors
- [ ] **A11Y-3** `forecast.html`, `games.html` — color contrast issues (WCAG AA)
- [ ] **A11Y-4** `games.html:122-139` — `<div role="button">` → `<button>`

### P3 — Low / backlog

- [ ] **ARCH-6** `timing-config.js:26` — PHI_INVERSE not exported (asymmetry with PHI)
- [ ] **PERF-2** `pumparena.js:2011+` — games modules bypass PageLifecycle registry
- [ ] **PERF-3** 13 CSS files — @import cascade for design-tokens → HTML `<link>` preferred
- [ ] **SEO-1** `me.html`, `terrier.html` — missing OG/Twitter Card meta tags
- [ ] **CSS-7** 4 HTML files — inline style="" on html tags (FOUC prevention)
- [ ] **SEC-6** `admin.js:323,659` — parseInt pagination no lower bound

### Deferred (from previous audits, still open)

- [ ] CSP SRI on all external scripts
- [ ] yggdrasil-mock-data.js (455L mock still present)
- [ ] Page controller tests (burns, forecast, holdex, staking, ignition)
- [ ] Audio system tests
- [ ] Coverage threshold 50→70%
- [ ] build.html SVG branch a11y
- [ ] me.html heatmap keyboard
- [ ] console.log cleanup across tool pages
- [ ] emoji→entities in server.cjs
- [ ] build.css 146K split (main/animations/3d)
- [ ] games.css 65K split (main/arcade)
- [ ] Admin.js split (1,319L monolith → modules)
- [ ] Game engines base class (9× copy-paste → 1 base + overrides)

### Blocked (external dependencies)

- [ ] Shop v1/v2 merge — blocked on sollama58 V2 burns confirmation
- [ ] Ignition backend — repo not created (sollama58/ignition)
- [ ] Burns/Forecast/HolDex backend gaps — pending sollama58 review of 21 issues

---

## Metrics

| Métrique | Valeur |
|----------|--------|
| Tests | 566/566 pass (24 suites) |
| Tool pages fork-ready | 5/5 ✓ |
| Q-Score moyen tools | ~85 HOWL |
| Q-Score global | 72 WAG |
| Q-Score games arch | ~80 WAG |
| CSS var() calls (5 tools) | 1,335 total |
| Helius files modularisés | 8/8 ✓ |
| Endpoints centralisés | ✓ (endpoints.js) |
| Games decoupling | 3/3 phases done (13 commits) |
| Backend refactoring | 40% (C.1 done, C.2 bloqué, C.3 différé) |
| Shop v1/v2 merge | BLOQUÉ |
| sollama58 issues | 21 across 4 repos |
| sollama58 PRs | 2 (TVU #1 infra + #8 governance) |
| sollama58 overviews | 4/4 repos covered |
| sollama58 global Q | 81 HOWL |
| Audit findings (2026-03-01) | 27 total (3 P0, 8 P1, 10 P2, 6 P3) |
| Deferred items | 13 |
| Blocked items | 3 |

---

*Last commits (P1.7 Games Decoupling — Phase 3)*:
- `c2f6837` refactor(games): delete GameRewards dead code from lifecycle.js
- `1c0f66d` refactor(games): decouple competitive reset via CompetitiveUI + GameEvents
- `f4aeb1f` feat(games): emit game:started and game:ended lifecycle events
- `c4298cb` test(games): add CompetitiveUI contract tests (10 tests)
