# ROADMAP-LIVE.md

**Updated:** 2026-02-27
**Status:** Phase 1.2 tool quality — 5/5 pages refactored, gaps résiduels backend-dépendants
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

**Tests: 485/485 pass** ✓

---

## Ce qui RESTE — priorisé

### P1 — Phase 1.2 Tool Quality (complété 2026-02-27)

| Page | Q-Score | Status | Gaps résiduels |
|------|---------|--------|----------------|
| **Burns** | ~87 HOWL | ✓ fork-ready | issues #2/#3/#4 pending backend |
| **Staking** | ~84 HOWL | ✓ fork-ready | getDemoLocks() marginal |
| **Forecast** | ~78 WAG | ✓ fork-ready | stat-frames/burned absent /api/state |
| **HolDex** | ~75 WAG | ✓ fork-ready | backend URL non déployé |
| **Ignition** | shell | ✓ shell honnête | 7× [API] TODO, backend inexistant |

**Prochain step P1** : créer issues + PRs sur chaque sollama58 repo (FORK-GUIDE.md)

**Décisions 2026-02-27** :
- HolDex backend = Option A (shell only) — PostgreSQL+Redis trop lourd à forker
- Gouvernance staking supprimée (données hardcodées 62%/78% sans endpoint)
- Tous les phantom endpoints remplacés par `showXxxPending()` honnêtes

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

---

## Metrics

| Métrique | Valeur |
|----------|--------|
| Tests | 485/485 pass |
| Tool pages fork-ready | 5/5 ✓ |
| Q-Score moyen tools | ~80 (WAG→HOWL) |
| Helius files modularisés | 8/8 ✓ |
| Endpoints centralisés | ✓ (endpoints.js) |
| Backend refactoring | 40% (C.1 done, C.2 bloqué, C.3 différé) |
| Shop v1/v2 merge | BLOQUÉ |
| sollama58 PRs créées | 0/5 (next step) |

---

*Last commits*:
- `dc5dc1e` fix(staking): event delegation + keydown via PageLifecycle
- `5ff6b54` fix(staking): real 60s interval, remove fake governance, showNotice
- `3a4635a` refactor(ignition): ES6 module, remove all mock data, real Phantom
- `26681e5` refactor(forecast): real API endpoint, no phantom routes
- `00443e6` refactor(holdex): ES6 module, real API field names
- `f65a522` fix(burns): rewire to real API endpoints, no fake data
