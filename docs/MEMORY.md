# ASDF-Web Session Memory

## Session 4 Summary (2026-02-24)
**Topic**: Phase A Refactoring — Architecture cleanup, centralized endpoints, mobile P0
**Shipped**: 3 commits → develop (pushed to github.com/Ragnar-no-sleep/ASDF-Web)

### Phase A Completed
**Commit 1 — chore(config)**: `js/config/endpoints.js`, `js/utils/format.js`, `js/core/PageLifecycle.js`
  - ASDF_ENDPOINTS: all tool URLs → alonisthe.dev/{burns,asdforecast,holdex,staking,ignition}
  - 35 unit tests: `tests/unit/config/endpoints.test.js` (22) + `tests/unit/utils/format.test.js` (13)
  - burns.js: ES module, imports ASDF_ENDPOINTS + PageLifecycle, intervals registered
  - forecast.js + holdex.js: regular scripts (not modules), URL updated inline with isDev pattern
  - ignition.js: IIFE, production URL fixed to alonisthe.dev/ignition
  - staking.js: no API calls (mock data), no changes needed

**Commit 2 — refactor(css)**: Mobile P0 fix
  - forecast.css + holdex.css: `html,body{height:100%}` → body uses `min-height:100%; overflow-y:auto`

**Commit 3 — docs(claude)**: Archive + cleanup
  - Removed asdf-game-store/ (PHP e-commerce, local archive _archive/php-game-store-2025/)
  - Removed api/services PHP files + api/Controllers/
  - Deleted tailwind.config.ts, next.config.ts, tsconfig.json
  - CLAUDE.md: shell pattern docs, Shared Utilities, Linked Repos, endpoint rule

### Module System Reality (verified this session)
- burns.js, staking.js = ES modules (`import`)
- forecast.js, holdex.js = regular scripts (no import — cannot add import without HTML change)
- ignition.js = IIFE wrapper (cannot use import)
- For regular scripts: use window.ASDF_ENDPOINTS or inline isDev pattern

### Phase B (Next Sprint — Not Started)
- Migrate `demo/ecosystem-map.html` → `/ecosystem-map.html` (public, not in navbar)
- Add `/ecosystem-map` route to server.cjs
- Create `scripts/scan-ecosystem.js` + `npm run scan:ecosystem`
- Update `/api/routes/ecosystem.js` with `/api/ecosystem/stats` endpoint

---

## Session 3 Summary (2026-02-21)
**Topic**: Sprint 2 — Phase 1.1 Audit + Phase 1.2 Burns Quality
**Key Finding**: Phase 1.1 (multi-theme) ALREADY DONE across all 5 tool pages
**Shipped**: c752a17 → develop (pushed)

### Multi-Theme Implementation (ACTUAL, corrected)
- `data-variant="1|2|3"` on `<html>` → 3 color variants per page
- `data-density="minimal|detailed|full"` on `<html>` → 3 content levels
- `ecosystem.js` PAGE_TOOLS config: density picker + color swatches in drawer
- localStorage keys: `asdf-density-{page}`, `asdf-variant-{page}`
- All 5 CSS files have `[data-variant]` + `[data-density]` selectors
- NOT `data-content`/`data-visual` as UNIFIED-VISION.md originally said (fixed)

### Burns Polish (c752a17)
- FAQ section (4 cards, .density-detailed/.density-full)
- Responsive animation culling (tablet/mobile)
- GPU will-change hints, focus-visible states, skip-link
- prefers-reduced-motion completeness

### Local Docs (gitignored)
- `docs/FORK-GUIDE.md` — Full fork guide for sollama58
- `docs/ROADMAP-LIVE.md` — Phase 1.1 DONE, Sprint 2 replanned

---

## Session 2 Summary (2026-02-21)
**Topic**: Vision Harmonization & Documentation Sync
**Completed**: Documentation refactoring + vision pivot to tool-pages-first approach
- Created PHILOSOPHY.md, ARCHITECTURE.md, ROADMAP-LIVE.md
- Archived 3 obsolete docs to `_archive/`
- Updated CLAUDE.md routes + references
- Revised UNIFIED-VISION.md with phase-based approach

---

## Render Workspace
- **Name**: My Workspace
- **ID**: tea-d598ujshg0os73c7cj1g
- **Status**: Auto-selected on first MCP call
- **Services**: asdf-web-dev (staging), asdf-gateway (prod), asdf-api, cynic-mcp, holdex

⚠️ **Avoid friction**: Store this ID to skip workspace selection prompts on future MCP calls.

## Codespace v2 Verified ✓
- CYNIC identity loaded (dog voice active)
- MCPs: Render + GitHub functional
- Skills: /ship, /judge, /cynic-burn, /workflow ready
- Tests: 450 pass, CI green, all systems nominal

## Notes
- claude-mem = plugin (manual install: `/plugin marketplace add thedotmack/claude-mem`), NOT MCP
- Branch strategy: develop (staging) → main (prod, explicit order only)
- Workspace selection is automatic if only 1 workspace exists
- `docs/` gitignored via `*ROADMAP*.md`, `SECURITY_*.md`, etc. patterns
- PHILOSOPHY.md, ARCHITECTURE.md referenced by CLAUDE.md (always commit with changes)
- ROADMAP-LIVE.md is non-committed living doc (local tracking only)
