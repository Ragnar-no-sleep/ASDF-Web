# ROADMAP-LIVE.md

**Updated:** 2026-02-25
**Status:** Phase C infrastructure done — Phase 1.2 tool quality next
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

### P1 — Immédiat (Phase 1.2 Tool Quality)

Chaque page tool doit être fork-ready pour sollama58.

| Page | Status | Travail restant |
|------|--------|-----------------|
| **Burns** | 80% | Density content enrichment (FAQ done), a11y final pass |
| **Forecast** | 50% | Data freshness indicators, chart interactions |
| **HolDex** | 40% | Sorting perf, token search UX |
| **Staking** | 30% | Validator UX, APY clarity, responsive |
| **Ignition** | 40% | Score flow, responsiveness, mobile |

**Objectif**: 5/5 pages fork-ready → déclenche FORK-GUIDE.md

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
| Tool pages fork-ready | 0/5 (quality needed) |
| Helius files modularisés | 8/8 ✓ |
| Endpoints centralisés | ✓ (endpoints.js) |
| Backend refactoring | 40% (C.1 done, C.2 bloqué, C.3 différé) |
| Shop v1/v2 merge | BLOQUÉ |

---

*Last commits*:
- `92958cb` chore(lint): CJS sourceType + ignore ecosystem/
- `161cbcc` refactor(helius): modularise 8 services into helius/ barrel
- `3ff598d` feat(ecosystem-map): migrate to root, add route, regenerate data
