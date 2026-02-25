# ASDF-Web Refactoring Plan
## Architecture Harmonieuse + Phi-based Maintainability

**Status**: Plan Mode
**Confidence**: 61.8% (φ⁻¹)
**Team**: 3 devs (sollama58, zeyxx, ragnarnosleep)

---

## EXECUTIVE SUMMARY

Transform ASDF-Web from **254 loosely-coupled files** → **atomic modular ecosystem**:
- Centralize API endpoints (1 file instead of 5 hardcoded)
- Unify utilities (eliminate 4x duplicated format functions)
- Create ecosystem-map intelligence dashboard
- Refactor God Files (engine.js, api/index.js) planning
- Achieve 80% test coverage (Tier 1: config, utils, core services)

**Timeline**: 4 sprints (A-D), NO bifurcations on sollama58 flows (Phase 2+)

---

## PHASE A: FOUNDATIONAL CLEANUP (Sprint 1)
### Goal: Zero architectural debt, single source of truth for config

#### A1. Create `/js/config/endpoints.js`
**File**: `/workspaces/ASDF-Web/js/config/endpoints.js` (NEW)

```javascript
/**
 * ASDF-Web API Endpoints Configuration
 * Single source of truth for all API calls
 *
 * Environment:
 *   - DEV (localhost): proxied via server.cjs to /api
 *   - PROD: alonisthe.dev/{tool} (sollama58 repos)
 */

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const ASDF_ENDPOINTS = {
  // Sollama58 tool services (prod)
  burns:      isDev ? '/api' : 'https://alonisthe.dev/burns',
  forecast:   isDev ? '/api' : 'https://alonisthe.dev/asdforecast',
  holdex:     isDev ? '/api' : 'https://alonisthe.dev/holdex',
  staking:    isDev ? '/api' : 'https://alonisthe.dev/staking',
  ignition:   isDev ? '/api' : 'https://alonisthe.dev/ignition',

  // Central API (asdf-gateway)
  api:        isDev ? '/api' : 'https://asdf-api.onrender.com/api',
};

// Freeze for immutability
Object.freeze(ASDF_ENDPOINTS);

// Global window access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF_ENDPOINTS = ASDF_ENDPOINTS;
}

export default ASDF_ENDPOINTS;
```

**Dependencies**: None (pure config)
**Tests**: `/tests/unit/config/endpoints.test.js` (must have 95%+ coverage)
  - Test all 5 tool URLs are correct
  - Test DEV vs PROD switching
  - Test immutability (Object.freeze working)
  - Test window fallback

---

#### A2. Create `/js/utils/format.js`
**File**: `/workspaces/ASDF-Web/js/utils/format.js` (NEW)

Consolidate 4 duplicated functions from burns.js, forecast.js, holdex.js, staking.js:

```javascript
/**
 * ASDF-Web Formatting Utilities
 * Shared across all tool pages
 *
 * Eliminates 4 duplicate implementations
 */

/**
 * Format large numbers (123456789 → "123.4M")
 */
export function formatNumber(n, decimals = 1) {
  if (n === null || n === undefined || n === 0) return '0';
  if (n < 1e3) return n.toString();
  if (n < 1e6) return (n / 1e3).toFixed(decimals) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(decimals) + 'M';
  return (n / 1e9).toFixed(decimals) + 'B';
}

/**
 * Format wallet address (12345...6789)
 */
export function formatWallet(address, start = 8, end = 4) {
  if (!address || address.length <= start + end) return address;
  return address.slice(0, start) + '...' + address.slice(-end);
}

/**
 * Format time ago ("2h ago", "3d ago")
 */
export function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return 'now';
}

/**
 * Format time duration (300000ms → "5:00")
 */
export function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Dependencies**: None (pure functions)
**Tests**: `/tests/unit/utils/format.test.js` (must have 100% coverage)
  - Test number formatting edge cases (0, 1, 1K, 1M, 1B, null)
  - Test wallet formatting (short address, null, edge lengths)
  - Test timeAgo (now, 30s, 1m, 1h, 5d ago)
  - Test duration (0ms, 1000ms, 60000ms, 3661000ms)

---

#### A3. Update 5 Tool Pages (burns, forecast, holdex, staking, ignition)
**Files Modified**:
- `/js/burns.js` (line 14)
- `/js/forecast.js` (line 8)
- `/js/holdex.js` (line 8)
- `/js/staking.js` (likely no change — mock)
- `/js/ignition.js` (line 15)

**Pattern Change** (ALL 5 files):

```javascript
// BEFORE
const API_BASE = isDev ? '/api' : 'https://asdf-api.onrender.com/api';

// AFTER
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { formatNumber, formatWallet, formatTimeAgo } from './utils/format.js';

const API_BASE = ASDF_ENDPOINTS.burns; // or .forecast, .holdex, etc.
```

**Remove duplicated functions** from each file (now import from utils/format.js)

---

#### A4. Fix P0 Mobile Issues
**Files**:
- `/css/forecast.css` (remove `height: 100vh; overflow: hidden`)
- `/css/holdex.css` (remove `height: 100vh; overflow: hidden`)

**Change**: Replace with flexible container + mobile-friendly scroll
```css
/* BEFORE */
body { height: 100vh; overflow: hidden; }

/* AFTER */
body { min-height: 100vh; overflow-y: auto; }
@media (max-width: 768px) {
  /* Stack vertically on mobile */
  .grid-layout { grid-template-columns: 1fr; }
}
```

---

#### A5. Fix Hub Satellites Navigation
**File**: `/index.html` (hub landing)

**Issue**: Satellite elements not clickable → no way to navigate to /learn, /build, /games

**Solution**: Convert satellites to `<a>` elements or add data-href + click handler
```html
<!-- BEFORE -->
<div class="satellite" data-page="learn">Learn</div>

<!-- AFTER -->
<a class="satellite" href="/learn" data-page="learn">Learn</a>
```

---

#### A6. Update CLAUDE.md (Reality Check)
**File**: `/CLAUDE.md`

**Changes**:
- Remove aspirational descriptions ("1 JS file per HTML" → document actual structure)
- Add "Linked Repositories" section (sollama58 repos)
- Update architecture diagram (shell pages + remote APIs)
- Document ASDF_ENDPOINTS usage pattern

---

#### A7. Archive PHP Legacy
**Action**: Move to `_archive/php-game-store-2025/`
- `api/Controllers/LeaderboardController.php`
- `api/Controllers/GameService.php`
- `api/Controllers/ConfigService.php`
- `api/fallback/games-ssr.php`

**Verify**: Confirm no Node.js files import these paths (should be clean)

---

#### A8. Remove Orphaned Configs
**Delete**:
- `tailwind.config.ts`
- `next.config.ts`
- `tsconfig.json`
- Update `.eslintignore` to remove references

---

#### A9. Timer Cleanup Infrastructure
**File**: `/js/core/PageLifecycle.js` (NEW)

```javascript
/**
 * Page Lifecycle Management
 * Ensures timers and listeners cleaned up on page unload
 */

const timers = new Map();

export const PageLifecycle = {
  registerTimer(id, intervalId) {
    timers.set(id, intervalId);
  },

  cleanup() {
    timers.forEach(id => clearInterval(id));
    timers.clear();
  }
};

// Auto-cleanup on beforeunload
window.addEventListener('beforeunload', () => PageLifecycle.cleanup());
```

**Usage in burns.js, forecast.js, holdex.js**:
```javascript
import { PageLifecycle } from './core/PageLifecycle.js';

const updateTimer = setInterval(updateStats, 30000);
PageLifecycle.registerTimer('burns-update', updateTimer);
```

---

### A DELIVERABLES

**Commits** (via git):
```
git checkout develop
git pull origin develop

# Single atomic commit
git add -A
git commit -m "chore(config): centralize endpoints, shared utils, P0 mobile fixes

- Create /js/config/endpoints.js (single source of truth)
- Create /js/utils/format.js (eliminate 4x duplication)
- Update 5 tool pages (burns, forecast, holdex, staking, ignition)
- Fix forecast.html + holdex.html viewport (mobile-friendly)
- Fix hub satellites navigation
- Archive PHP legacy files
- Remove unused configs (tailwind, typescript, next)
- Create PageLifecycle for timer cleanup
- Update CLAUDE.md with reality

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin develop
```

**Tests**:
- `npm run test` should pass all existing tests
- New tests must pass:
  - `tests/unit/config/endpoints.test.js` (95%+ coverage)
  - `tests/unit/utils/format.test.js` (100% coverage)

**Verification**:
```bash
# Check endpoints are used correctly
grep -r "ASDF_ENDPOINTS" js/*.js

# Verify no .onrender hardcodes remain
grep -r "onrender" js/*.js  # Should be empty

# Verify format duplication removed
grep -c "function formatNumber" js/*.js  # Should appear 1x (in utils/format.js)
```

---

## PHASE B: ECOSYSTEM INTELLIGENCE (Sprint 2)
### Goal: Create ecosystem-map.html with cache + API hybrid

#### B1. Migrate `/demo/ecosystem-map.html` → `/ecosystem-map.html` (PUBLIC)
**File**: Move `/demo/ecosystem-map.html` to `/ecosystem-map.html`
**Update**: server.cjs routing + ESLint ignore patterns

#### B2. Cache Strategy: ecosystem-data.js
**Option**: Hybrid (cache + API live fallback)

**npm script** (to be added to package.json):
```json
{
  "scripts": {
    "scan:ecosystem": "node scripts/scan-ecosystem.js"
  }
}
```

**Creates**: `/js/ecosystem-data.js` (cache of static metadata)
- File counts per category
- Complexity metrics (if available via eslint-plugin-sonarjs)
- Git freshness data (via git log)
- Dependency graph (parsed from imports)

**Runtime**:
```javascript
// /ecosystem-map.html
window.ECOSYSTEM_DATA = [...]; // Loaded from /js/ecosystem-data.js
window.ECOSYSTEM_STATS = {...}; // Counts

// Fetch live data
fetch('/api/ecosystem/stats') // Dashboard stats (burn %, supply, etc.)
  .then(r => r.json())
  .then(data => updateTokenHealth(data))
  .catch(err => console.warn('API offline — using cache'));
```

#### B3. API Endpoint (asdf-gateway): `/api/ecosystem/stats`
**File**: `api/routes/ecosystem.js` (update existing)

Returns live token health:
```json
{
  "currentSupply": 450000000,
  "totalBurned": 550000000,
  "initialSupply": 1000000000,
  "burnPercent": "55.0%"
}
```

---

## PHASE C: CONSOLIDATION (Sprint 3)
### Goal: Eliminate duplication (Helius, shop v1/v2)

#### C1. Helius Consolidation (9 files → 1 service + middleware)
**Files to Refactor**:
- `api/services/helius.js` (base)
- `api/services/heliusEnhanced.js` (remove, merge into base)
- `api/services/heliusMetrics.js` (middleware)
- `api/services/heliusRateLimiter.js` (middleware)
- `api/services/heliusWebhooks.js` (separate service)
- `api/services/heliusWebSocket.js` (separate service)
- `api/services/rpcBatcher.js` (middleware)
- `api/services/rpcFailover.js` (middleware)
- `api/services/priorityFee.js` (middleware)

**Target Structure**:
```
/api/services/helius/
├─ index.js              (main client export)
├─ client.js             (core RPC client)
├─ middleware/
│   ├─ retry.js          (from rpcFailover)
│   ├─ rateLimit.js      (from heliusRateLimiter)
│   ├─ batch.js          (from rpcBatcher)
│   └─ priorityFee.js
├─ webhooks.js           (from heliusWebhooks)
├─ ws.js                 (from heliusWebSocket)
└─ metrics.js            (from heliusMetrics)
```

**Implementation**:
- Consolidate retry logic (avoid duplication)
- Create middleware chain pattern
- Single import: `import { HeliusClient } from 'api/services/helius'`

#### C2. Shop v1/v2 Merge (track in issue #XX for Phase 2+)
**Decision**: Merge v2 as primary, deprecate v1 endpoints (3-month sunset)
**Status**: Document in PR, but actual merge is Phase 2+ work

#### C3. Split Large CSS Files
- `build.css` (146K) → `build-main.css` + `build-animations.css` + `build-3d.css`
- `games.css` (65K) → `games-main.css` + `games-arcade.css` (already exists)

**Vite config** updated to auto-code-split

#### C4. Remove 500 lines dead CSS
**File**: `css/hub-majestic.css`
- Audit what `orbital-patch.css` overrides
- Delete dead rules
- Merge overrides into main file

---

## PHASE D: DOCUMENTATION (Sprint 4)
### Goal: Architecture docs match reality

#### D1. Create `docs/ARCHITECTURE-REFACTORED.md`
**Sections**:
- New config pattern (ASDF_ENDPOINTS)
- Modular JS pattern (1 controller per page, shared utils)
- Test coverage expectations (Tier 1/2/3)
- API gateway vs tool services (shell pattern)
- Helius consolidation rationale

#### D2. Update `CLAUDE.md` (complete)
- Remove aspirational language
- Link to sollama58 repos (burns, forecast, holdex, staking, ignition)
- Explain ecosystem-map.html purpose

#### D3. Create `docs/ECOSYSTEM-MAP.md`
- How to use `/ecosystem-map.html` (dev dashboard)
- npm run scan:ecosystem usage
- Cache invalidation strategy

---

## TEST COVERAGE TARGETS

### Tier 1 (MUST 80%+)
```
/js/config/endpoints.js         95%
/js/utils/format.js             100%
/js/core/PageLifecycle.js       90%
/js/utils/audio-feedback.js     80%
```

### Tier 2 (SHOULD 70%+)
```
/js/burns.js                    70%
/js/forecast.js                 70%
/js/holdex.js                   70%
/api/routes/ecosystem.js        70%
/api/services/helius/*          75%
```

### Tier 3 (NICE 50%+)
```
/js/games/*                     50%
/js/build/*                     50%
```

**Update jest.config.cjs**:
```javascript
coverageThreshold: {
  global: { lines: 70, functions: 70, branches: 70, statements: 70 },
  './js/config/**': { lines: 95, functions: 95 },
  './js/utils/**': { lines: 90, functions: 90 },
}
```

---

## VERIFICATION CHECKLIST

### Phase A Completion
- [ ] `/js/config/endpoints.js` exists + frozen
- [ ] `/js/utils/format.js` consolidates 4 functions
- [ ] 5 tool pages import endpoints.js + utils/format.js
- [ ] forecast.html + holdex.html mobile-friendly (no `100vh` + `overflow: hidden`)
- [ ] Hub satellites clickable (a href or click handler)
- [ ] CLAUDE.md updated with reality
- [ ] PHP files archived in `_archive/php-game-store-2025/`
- [ ] Orphaned configs deleted (tailwind, typescript, next)
- [ ] npm test passes (50% → 70%+ for Tier 1/2)
- [ ] npm run lint passes (no hardcoded URLs)

### Phase B Completion
- [ ] `/ecosystem-map.html` live at `/ecosystem-map?`
- [ ] `npm run scan:ecosystem` generates `/js/ecosystem-data.js`
- [ ] `/api/ecosystem/stats` endpoint works live
- [ ] ecosystem-map shows cache data + API fallback

### Phase C Completion (Phase 2+)
- [ ] Helius monolith → modular (planning only in Phase 1)
- [ ] CSS files split (build.css, games.css)
- [ ] Dead CSS removed (500 lines)

### Phase D Completion (Phase 2+)
- [ ] Documentation updated + accurate

---

## KNOWN BLOCKERS & DEPENDENCIES

### On Sollama58 (no bifurcation):
- Burns flow (api architecture) → Phase 2+ (block all Phase A changes on this)
- Tool service maturity (alonisthe.dev/{tool} live & stable)

### Internal:
- Engine.js (8,301 LOC God file) → Phase 3 planning (needs game designers + RPC devs)
- Api/index.js (6,146 LOC God file) → Phase 3 planning

---

## COMMIT STRATEGY

**Phase A** → 1–3 commits (B strategy: per-category)
```
1. chore(config): centralize endpoints, shared utils
2. refactor(css): mobile viewport fixes, dead code cleanup
3. docs(claude): update for reality, archive legacy
```

**Phase B** → 1 commit
```
feat(ecosystem-map): cache + API hybrid, stats dashboard
```

**Phase C** → 2 commits (Phase 2+)
```
refactor(helius): consolidate 9 files → modular service
refactor(css): split large files, eliminate duplication
```

**Phase D** → 1 commit (Phase 2+)
```
docs(architecture): update for post-refactor reality
```

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Sollama58 repos not ready (alonisthe.dev down) | Medium | High | Keep .onrender fallback in config until validated |
| URL migration breaks staging tests | Medium | Medium | Test on develop first, manual smoke tests |
| Helius consolidation over-scoped (Phase C) | Low | Medium | Keep as Phase 3 planning only, don't implement |
| Timer cleanup breaks page transitions | Low | Low | Test with SPA navigation (if used) |
| Coverage threshold too aggressive | Low | Medium | Use jest config margin (70% vs 80%) |

---

## SUCCESS CRITERIA

✓ **Zero hardcoded .onrender URLs** in frontend JS
✓ **80%+ coverage** for Tier 1 config/utils
✓ **5 tool pages** all import from centralized endpoints config
✓ **ecosystem-map.html** live and functional (cache + API)
✓ **CLAUDE.md + docs** match actual architecture
✓ **No duplicate utility functions** (format.js consolidation)
✓ **Mobile-friendly** forecast.html + holdex.html
✓ **Timer cleanup** infrastructure in place

---

**Next Step**: User approval → ExitPlanMode → BEGIN PHASE A
