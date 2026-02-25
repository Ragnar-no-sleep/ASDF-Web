# ASDF-Web Session Memory

## Session 6 Summary (2026-02-25)
**Topic**: Empirical audit P1 + P0 fixes + utils/notice.js + doc cleanup + migration prep
**Commits**: 7604229 · cfefd84 · 87988c3 · 0a5357c → develop

### Empirical Q-Scores (tool pages)
| Page | Q-Score | Level | Key blocker |
|------|---------|-------|-------------|
| Burns | 78 | WAG | Regression: format.js duplicated locally (B0) |
| Staking | 71 | WAG | Stats grid no responsive breakpoint |
| HolDex | 55 | BARK | filter-btn vs filter bug (FIXED) |
| Forecast | 42 | BARK | 2× alert() (FIXED) |
| Ignition | 28 | GROWL | 3× alert() (FIXED) + IIFE + countdown reset |

### P0 Fixes Shipped (7604229)
- H0: holdex.js `.filter-btn` → `.filter` (filters were 100% broken)
- F0: forecast.js 3× alert() → showNotice() (3rd was validation alert)
- I0: ignition.js 3× alert() → showNotice()

### utils/notice.js Created (cfefd84 · 0a5357c)
- `js/utils/notice.js` — plain `<script>` global, defines `window.showNotice`
- Loaded via `<script src>` in forecast.html + ignition.html before main script
- NO ESM export — would break plain script loading with SyntaxError
- TODO(F1/I1): add `export function showNotice` when forecast + ignition → type="module"
- CJS `module.exports` removed (was misleading comment "ES module export")

### Audit Corrections vs Initial Sprint Plan
- forecast.css already has @media 768px + density levels → F5/F6 = visual check only (XS not M)
- staking.css already has density-detailed rules → S2 DONE
- Streamflow comment already present in staking.js → S4 DONE
- burns.js regression: imports 4 modules but duplicates formatNumber/formatWallet/formatTimeAgo locally
- ignition.js countdown: `Date.now() + 48h` resets on every page load → I-C bug

### Doc Cleanup (87988c3)
- docs/AUDIT.md → _archive/AUDIT-2026-02-19.md (git rm)
- docs/UNIFIED-VISION.md → _archive/UNIFIED-VISION-2026-02.md (git rm)
- Remaining tracked docs in git: PRIVACY-POLICY.md, SECURITY-ASSESSMENT.md only
- Gitignored local docs: ARCHITECTURE.md, ROADMAP-LIVE.md, SPRINT-P1.md, AUDIT-TOOLS-P1.md, FORK-GUIDE.md

### PR Strategy Clarified (critical)
- sollama58 PRs = polish only: CSS responsive, a11y, bug fixes, perf
- NO architectural refactoring in PRs (no module conversion, no import ASDF_ENDPOINTS)
- ASDF_ENDPOINTS / format.js / AudioFeedback are OUR utils — not theirs
- Each PR must be self-contained in their repo

### Migration Branch
- `private/docs-migration` on remote — snapshot of all gitignored docs
- User will delete branch manually after migration
- docs/ on develop has only 2 tracked files — gitignored files live only in migration branch

---

## Session 5 Summary (2026-02-25)
**Topic**: C.1 Helius modularisation + SPRINT-P1 design + eslint fix
**Commits**: 161cbcc · 92958cb + eslint.config.js → develop

### C.1 Helius Modularisation (161cbcc)
- 8 files → `api/services/helius/` barrel structure
- `index.js` barrel: `module.exports = require('./client')` — zero import breakage
- Relative require depth: helius/ = `../audit`, helius/middleware/ = `../../audit`
- 4 external consumers updated: api/index.js, api/routes/admin.js, api/routes/helius.js ×2
- Tests: 485/485 pass ✓

### eslint.config.js (92958cb)
- CJS sourceType block for `api/**/*.js`
- Ignores: `ecosystem/**`, `js/_archive_build.js`

### Docs Created This Session
- `docs/SPRINT-P1.md` — detailed P1 task breakdown per page (empirically corrected)
- `docs/AUDIT-TOOLS-P1.md` — Q-scores + judge mode findings

---

## Session 4 Summary (2026-02-24)
**Topic**: Phase A Refactoring — Architecture cleanup, centralized endpoints, mobile P0
**Shipped**: 3 commits → develop

### Phase A Completed
- `js/config/endpoints.js` — ASDF_ENDPOINTS frozen, single source of truth
- `js/utils/format.js` — formatNumber, formatWallet, formatTimeAgo, formatDuration
- `js/core/PageLifecycle.js` — timer/listener cleanup on beforeunload
- 35 unit tests: endpoints (22) + format (13)
- burns.js: ES module, imports ASDF_ENDPOINTS + PageLifecycle
- forecast.js + holdex.js: regular scripts (no import — cannot add import without HTML change)
- ignition.js: IIFE (cannot use import until I1)
- forecast.css + holdex.css: mobile P0 fix (min-height + overflow-y)

### Module System Reality (permanent reference)
- burns.js, staking.js = ES modules (`import`) ✓
- forecast.js, holdex.js = regular scripts → need type="module" (F1/H1)
- ignition.js = IIFE → need IIFE removal + type="module" (I1/I2)
- notice.js = plain script global → add `export` only after F1/I1

---

## Session 3 Summary (2026-02-21)
**Topic**: Sprint 2 — Phase 1.1 Audit + Phase 1.2 Burns Quality
**Key Finding**: Phase 1.1 (multi-theme) ALREADY DONE across all 5 tool pages
**Shipped**: c752a17 → develop

### Multi-Theme Implementation (ACTUAL)
- `data-variant="1|2|3"` on `<html>` → 3 color variants per page
- `data-density="minimal|detailed|full"` on `<html>` → 3 content levels
- `ecosystem.js` PAGE_TOOLS config: density picker + color swatches in drawer
- localStorage keys: `asdf-density-{page}`, `asdf-variant-{page}`
- All 5 CSS files have `[data-variant]` + `[data-density]` selectors

---

## Render Workspace
- **Name**: My Workspace
- **ID**: tea-d598ujshg0os73c7cj1g
- **Services**: asdf-web-dev (staging), asdf-gateway (prod), asdf-api, cynic-mcp, holdex

## Notes
- Branch strategy: develop (staging) → main (prod, explicit order only)
- `docs/` entirely gitignored (tracked exceptions: PRIVACY-POLICY.md, SECURITY-ASSESSMENT.md)
- Tests baseline: 485/485 pass
- `_archive/` gitignored — files there are local only
- sollama58 PRs: polish only, self-contained, no ASDF-Web deps
