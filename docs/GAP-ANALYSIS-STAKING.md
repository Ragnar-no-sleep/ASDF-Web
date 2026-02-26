# GAP-ANALYSIS — Staking (ASDF-Web) vs TokenVotingUtil

**Date**: 2026-02-26
**Source TVU**: sollama58/TokenVotingUtil @ main (index.html, 3111 lignes)
**Source ASDF**: ASDF-Web staking.html + js/staking.js (post-fixes S1/S2/S3)
**Méthode**: Audit empirique complet — fonctions, IDs, API calls, event listeners

---

## Verdict en 1 ligne

**ASDF-Web staking = lock browser basique (mock). TVU = governance DAO complet (API réelle).**
Feature parity gap : ~70% des fonctionnalités TVU manquent dans staking.html.

---

## Ce que TVU fait — inventaire exhaustif

### Données & API (9 endpoints)
| Endpoint | Méthode | Utilisé dans TVU | Dans ASDF staking.js |
|----------|---------|-----------------|---------------------|
| `GET /api/locks` | GET | ✓ `renderData()` ligne 3088 | ✗ mock `getDemoLocks()` |
| `GET /api/config` | GET | ✓ site title branding | ✗ |
| `GET /api/wallet/{addr}/balance` | GET | ✓ `fetchWalletBalance()` | ✗ |
| `POST /api/refresh` | POST | ✓ refresh button | ✗ |
| `PUT /api/locks/{id}/name` | PUT | ✓ rename in modal | ✗ |
| `GET /api/proposals` | GET | ✓ `loadProposals()` | ✗ |
| `POST /api/proposals` | POST | ✓ create proposal form | ✗ |
| `POST /api/proposals/{id}/vote` | POST | ✓ vote handler | ✗ |
| `POST /api/admin/auth` | POST | ✓ admin panel | ✗ |

### Sections HTML
| Section | TVU | ASDF staking.html |
|---------|-----|-------------------|
| Stats cards (4) | ✓ | ✓ |
| Lock cards grid + filters | ✓ filtres: all/locked/unlocked/mine + sort | ✓ filtres: all/active/completed (pas de mine, pas de sort) |
| Lock detail modal | ✓ amounts, dates, progress, rename, Solscan | ✗ |
| Unlock timeline chart (Chart.js) | ✓ line chart, 4 units (day/week/month/year) | ✗ HTML list statique |
| Token breakdown chart (doughnut) | ✓ ownership distribution | ✗ |
| Proposals tab | ✓ active + historique | ✗ (juste quorum/approval statiques) |
| Proposal detail modal + vote UI | ✓ | ✗ |
| Create proposal modal | ✓ form complet | ✗ |
| My Tokens tab | ✓ balance, locks perso, votes, proposals | ✗ |
| About tab | ✓ | ✗ |
| Admin panel | ✓ password-protected | ✗ |
| Welcome modal | ✓ first-visit onboarding | ✗ |

### Fonctions JS
| Fonction TVU | Rôle | Dans ASDF |
|-------------|------|-----------|
| `renderData(data)` | Pipeline principal: résumé + charts + cards | `renderLocks()` partiel |
| `renderLockCards()` | Cards cliquables avec progress bar + badges | `renderLocks()` basique |
| `showLockDetail(lock)` | Modal détail + rename | ✗ |
| `renderChart(timeline, unit)` | Chart.js line chart unlock timeline | ✗ |
| `renderBreakdownChart()` | Chart.js doughnut ownership | ✗ |
| `loadProposals()` | Fetch + state proposals | ✗ |
| `renderProposalCards()` | Cards proposals avec vote bars | ✗ |
| `showProposalDetail(p)` | Modal vote + threshold bar | ✗ |
| `tallyProposal(p)` | Calcul tally winner + margin | ✗ |
| `checkThreshold(totals, pool, threshold)` | Vérifie si seuil atteint | ✗ |
| `renderMyTokensTab()` | Vue perso: locks + votes + proposals | ✗ |
| `getFilteredSortedLocks()` | Filter + sort combinés | partiel (filter only) |
| `getCachedData()` / `setCachedData()` | localStorage 10 min TTL | ✗ |
| `fetchWalletBalance()` | Balance SPL token | ✗ |
| `disconnectWallet()` | Disconnect Phantom/Solflare | ✗ |
| `getTotalPool(voteMode)` | Calcul pool de vote | ✗ |
| `isMyLock(l)` | Filtre perso locks | ✗ |
| `formatCompact(n)` | Format nombre compact K/M/B | format.js `formatNumber` ✓ |
| `truncAddr(a)` | Truncate address | format.js `formatWallet` ✓ |
| `escapeHtml(s)` | XSS protection | js/shared/security.js ✓ |
| `formatPeriod(s)` | Secondes → "X days Y hours" | ✗ (format.js n'a pas ça) |
| `formatTimeLeft(ms)` | ms → countdown "X days Y hours Z mins" | ✗ |

### Dépendances externes TVU
| Lib | Usage | Dans ASDF |
|-----|-------|-----------|
| Chart.js | Timeline + breakdown charts | ✗ non chargé |
| chartjs-adapter-date-fns | Axis dates Chart.js | ✗ |
| Google Fonts Inter | Typography | ✓ (via system.css) |

---

## Ce que ASDF apporte — que TVU n'a pas

| Feature ASDF | Implémentation | Valeur |
|-------------|----------------|--------|
| Density levels (minimal/detailed/full) | `[data-density]` + CSS classes | Meilleure onboarding UX |
| 3 variants visuels | `[data-variant]` + CSS blocks | Customisation par token |
| AudioFeedback | `AudioFeedback.play()` sur interactions | Visceral feedback |
| `prefers-reduced-motion` | Media query CSS | Accessibilité |
| Shared nav + drawer | `ecosystem.js` / `ecosystem.css` | Cohérence inter-pages |
| Educational content | Glossaire (cliff, vesting, TGE, Streamflow) + FAQ | Onboarding pédagogique |
| Design tokens ASDF | CSS variables système | Brand cohérence |
| `formatNumber` centralisé | import depuis format.js | DRY |
| `formatWallet` centralisé | import depuis format.js | DRY |

---

## Gap classé par priorité (Tier 1 / 2 / 3)

### Tier 1 — Blocking (staking.html non-fonctionnelle sans ça)
| Gap | Effort | Impact |
|-----|--------|--------|
| **Connecter API** — `GET /api/locks` remplace `getDemoLocks()` | S | Données réelles |
| **Lock cards cliquables** — modal détail | M | Interactivité de base |
| **Unlock timeline chart** — Chart.js line | M | Feature promise non tenue |
| **Filtre "My Locks"** — `isMyLock()` | S | Essentiel pour wallet connecté |
| **Sort locks** — status/amount/date | XS | UX tableau de bord |

### Tier 2 — Important (governance features)
| Gap | Effort | Impact |
|-----|--------|--------|
| **Proposals** — fetch + render cards | L | Gouvernance DAO |
| **Proposal detail + vote** — modal + POST vote | L | Feature core TVU |
| **Create proposal** — form modal + POST | M | Feature avancée |
| **My Tokens tab** — balance + perso | M | Différenciation wallet |
| **localStorage caching** — TTL 10 min | S | Performance |
| **Manual refresh** — POST /api/refresh | XS | UX control |

### Tier 3 — Nice-to-have
| Gap | Effort | Impact |
|-----|--------|--------|
| **Breakdown doughnut chart** — ownership | M | Visualisation |
| **Lock rename** — PUT /api/locks/{id}/name | S | Feature secondaire |
| **Welcome modal** | XS | Onboarding |
| **Admin panel** | L | Internal only |
| **Disconnect wallet** | XS | UX |
| **`formatPeriod` / `formatTimeLeft`** — ajouter dans format.js | XS | DRY |

---

## Architecture décisions

### 1. Chart.js — charger ou remplacer ?

**Option A — Charger Chart.js (CDN)**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/..."></script>
```
- ✓ Feature parity rapide
- ✗ Dépendance externe, poids

**Option B — Canvas natif (pas de lib)**
- ✓ Zéro dépendance, contrôle total
- ✗ 3x plus de code pour un chart décent

**Recommandation : Option A** — TVU l'utilise déjà, sollama58 l'acceptera en PR.

### 2. API endpoint — direct ou via proxy ?

**État actuel** : `ASDF_ENDPOINTS.staking` pointe vers `https://alonisthe.dev/staking` (CLAUDE.md)
**TVU API** : `https://lock-verifier.onrender.com`

**Option A — Appel direct TVU API**
```js
const ENDPOINT = 'https://lock-verifier.onrender.com';
// VIOLE la règle CLAUDE.md — hardcoded URL
```

**Option B — Via ASDF_ENDPOINTS**
```js
import { ASDF_ENDPOINTS } from './config/endpoints.js';
const res = await fetch(ASDF_ENDPOINTS.staking + '/api/locks');
// ✓ Respecte l'architecture
// Nécessite que alonisthe.dev/staking proxie vers TVU
```

**Option C — Mettre l'URL TVU dans endpoints.js**
```js
// endpoints.js
staking: 'https://lock-verifier.onrender.com',
```
**Recommandation : Option C à court terme**, B quand alonisthe.dev/staking est configuré.

### 3. Scope du PR vers TVU

**Ce qu'on propose à sollama58** :
- Notre staking.html = frontend amélioré de leur index.html
- Ajoute : density levels, AudioFeedback, themes, design system ASDF
- Garde : toutes leurs features (locks, proposals, votes, charts)
- Améliore : responsive, `prefers-reduced-motion`, code modulaire

---

## Ordre d'exécution recommandé

```
SPRINT 1 (Tier 1 — staking fonctionnelle) :
  [1] Connecter GET /api/locks → mettre URL dans endpoints.js
  [2] Améliorer renderLocks() → lock cards cliquables
  [3] showLockDetail modal (HTML + JS)
  [4] Filtre "Mine" (isMyLock) + Sort
  [5] Charger Chart.js + renderChart (timeline)

SPRINT 2 (Tier 2 — governance) :
  [6] loadProposals() + renderProposalCards()
  [7] showProposalDetail + vote POST
  [8] renderMyTokensTab()
  [9] localStorage caching
  [10] Create proposal modal

SPRINT 3 (Polish + PR TVU) :
  [11] Breakdown doughnut chart
  [12] Welcome modal
  [13] Disconnect wallet + formatPeriod utils
  [14] Tests manuels complets
  [15] PR vers sollama58/TokenVotingUtil
```

---

## Issues à ouvrir sur TVU (en lien avec notre PR futur)

| # | Titre | Lien avec notre PR |
|---|-------|-------------------|
| ✓ #3 | API_BASE configurable | Nécessaire pour notre intégration |
| ✓ #4 | prefers-reduced-motion | On l'implémentera dans notre version |
| ✓ #5 | Density levels | Feature principale de notre PR |
| À créer | Chart.js → modulariser les fonctions de rendu | Facilite la PR review |
| À créer | formatCompact/truncAddr → utilitaires partagés | DRY, aligne avec format.js |

---

*sniff* — CYNIC | Audit empirique v1 | 2026-02-26
*Confidence: 58% (φ⁻¹ limit) — données directement lues dans le code source*
