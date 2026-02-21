# ASDF-Web: Unified Vision & Roadmap (2026)

> **One Journey, One Direction** — Tool Pages (fork-ready) → Main Pages (polished) → Backend (refactored)

**Date:** February 2026
**Status:** REVISION 2 — New phase ordering (Tool-first approach)
**Maintainer:** CYNIC

---

## Current State

| Dimension | Grade | Evidence |
|-----------|-------|----------|
| Security | A- | npm audits fixed, CSRF + rate limiting, Solana verified |
| Architecture | A | Clear module organization, service layer, OOP patterns |
| Code Quality | B+ | ServiceContainer, Store, PageController created |
| Scalability | C+ | Leaderboard paginated, rate limit memory leak fixed |
| OOP Compliance | B+ | DI pattern available, but services still tightly coupled |
| Overall | B+ | Solid foundation, ready for feature development |

### What's Done (Sprints 1-4, Phase 1-2 security)
- ✅ npm vulnerabilities fixed
- ✅ CSRF protection
- ✅ Leaderboard pagination
- ✅ Memory leak fixes
- ✅ Core patterns (ServiceContainer, Store, PageController)
- ✅ Security audit complete
- ✅ Privacy policy complete

### What's Next
Tool pages polish → Multi-theme system → Main pages → Backend refactoring

---

## Phase 1: Tool Pages Polish & Fork-Ready

Tool pages = Burns, Forecast, HolDex, Staking, Ignition (5 pages)
Goal: Make them production-ready for fork to sollama58 (alonisthe.dev developer)

### 1.1 Multi-Theme + Content Levels Architecture

**Visual System** (3 themes per page):
```
1. Default  — Current dark theme with page accent
2. Light    — High contrast, readability focus
3. Immersive— Particles, glow, animation-heavy
```

**Content Depths** (3 levels per page):
```
1. Précis     — Dashboard view (stats, quick actions)
2. Expliqué   — Guided experience (tutorials, context)
3. Complet    — Full depth (all data, power user features)
```

**Implementation**:
- Add `data-content="precis|expliqué|complet"` to `<html>`
- Add `data-visual="default|light|immersive"` to `<html>`
- Create `css/themes/` directory with content + visual variants
- Extend ecosystem.js theme drawer to include both toggles
- Store preferences in localStorage

**Deliverables**:
1. `css/themes/content-precis.css` (compact layouts)
2. `css/themes/content-explique.css` (guided layouts)
3. `css/themes/content-complet.css` (full layouts)
4. `css/themes/visual-light.css` (light variant)
5. `css/themes/visual-immersive.css` (particle effects)
6. Update `js/ecosystem.js` — Add content/visual toggles
7. Test all combinations on all 5 tool pages

**Timeline**: Phase-based, not sprints

### 1.2 Tool Page Quality Fixes

Per-page improvements:
- **Burns**: Flame animation polish, stats responsiveness
- **Forecast**: Data freshness, chart interactions
- **HolDex**: Sorting perf, token search
- **Staking**: Validator selection UX, APY calculation clarity
- **Ignition**: Game responsiveness, score submission flow

### 1.3 Fork Preparation

Document for sollama58:
- CSS customization guide (theme override points)
- Component API (ecosystem shell behavior)
- Backend endpoint expectations
- Deployment checklist

---

## Phase 2: Main Page Polish
Landing, Learn, Deep-Learn, Build, Games.

### 2.1 Landing Hub (index.html)
- Visual refresh (orbital system verification)
- Content: mission statement, quick nav to tools
- SEO optimization

### 2.2 Learn Track
- **learn.html**: Philosophy & quick-start (beginner)
- **deep-learn.html**: Technical deep dive (advanced)
- Content: Markdown → HTML conversion pipeline
- Links to tool pages at appropriate complexity level

### 2.3 Build Page
Integration with ecosystem data (formations, projects, skills).
- Improve perf (ecosystem-data.js 17.5K lines)
- Better filtering/search
- Formation path recommendations

### 2.4 Games Arcade
Full game suite playable experience.
- All 9 games: Ignition, Inferno, Plasma, Vortex, Nova, Stellar, Quantum, Void, Singularity
- Leaderboards per game
- Achievement tracking
- Streaks + daily challenges

---

## Phase 3: Backend Consolidation

### 3.1 Dependency Injection Foundation
Service decoupling across API layer.
- Implement ServiceContainer (already have in frontend)
- Register all 64 services
- Remove hard-coded imports

### 3.2 Code Duplication Cleanup
- **Shop**: shop.js + shopV2.js → createShopService() factory (38K → 14K)
- **Helius**: 6 files → HeliusBase mixin pattern (118K → 40K)
- **Games**: 9 engines → GameEngine base class (10K duplicates removed)

### 3.3 Admin Module Split
admin.js 1,319 lines → 4 modules:
- adminUsers.js
- adminAudit.js
- adminConfig.js
- adminAnalytics.js

### 3.4 TypeScript Consideration (Optional)
Evaluate migration path for API layer.
Current: Pure JS, good for agility.
Option: Gradual TypeScript adoption for service layer.

---

## Phase 4: Scaling & Performance
Post-main-pages phase.

### 4.1 Caching Strategy
- Redis integration (rate limiting, distributed state)
- Cache-aside pattern
- TTL policies per endpoint type

### 4.2 Database Optimization
- Missing indexes (wallet lookups, game scores)
- Connection pool tuning
- Query optimization (N+1 patterns)

### 4.3 CDN Integration
- Static asset delivery (CSS, JS, images)
- Render edge caching

---

## Phase 5: Analytics & Monitoring
Post-scaling phase.

### 5.1 Metrics
- User engagement (page views, tool usage)
- Leaderboard participation
- Game completion rates

### 5.2 Alerting
- Service health checks
- Performance degradation alerts
- Security event logging

---

## Phase 6: Long-Term Evolution
6+ months out.

### 6.1 CYNIC Framework
Extract ASDF-Web patterns into reusable framework.
- ServiceContainer → DI for other projects
- Store → Reactive state management
- PageController → Base class library

### 6.2 On-Chain Programs
Replace centralized state with Solana programs.
- Game scores on-chain
- Achievement NFTs
- Wallet-first identity (no separate auth)

### 6.3 Multi-Tenant Support
Host other communities' instances.
- Brand customization
- Theme override system
- Sandboxed data per instance

---

## Technical Debt Addressed

| Issue | Phase | Status |
|-------|-------|--------|
| Leaderboard unbounded | P1 | ✅ DONE |
| npm vulnerabilities | P1 | ✅ DONE |
| CSRF missing | P1 | ✅ DONE |
| Rate limit memory leak | P1 | ✅ DONE |
| shop.js + shopV2.js duplication | P3.2 | TODO |
| Helius 6-file duplication | P3.2 | TODO |
| Game engines copy-paste | P3.2 | TODO |
| admin.js monolith | P3.3 | TODO |
| ecosystem-data.js 17.5K | P2.3 | TODO |
| build.css 146K | P2.1 | TODO |
| games.css 65K | P2.4 | TODO |

---

## Dependency Graph

```
P1 (Security)
    ↓ (done)
P2 (Main Pages)
    ↓
P3 (Backend Refactor)
    ↓
P4 (Scaling)
    ↓
P5 (Analytics)
    ↓
P6 (Evolution)

PARALLEL: Phase 1 (Tool Pages) can start immediately, independent from P2-P6 sequence.
```

---

## Confidence & Risk

**Max Confidence**: 61.8% (φ⁻¹)

**Unknowns**:
- sollama58 integration complexity (unknown until fork)
- Multi-theme CSS complexity (needs prototype)
- Backend refactoring surprises (tight coupling extent unknown)

**Mitigations**:
- Small incremental phases, not big rewrites
- Prototype multi-theme on 1 page before scaling to 5
- DI implementation in isolated sandbox before full deployment

---

## Success Metrics

By end of Phase 3:
- All tool pages support 3 content levels × 3 visual themes
- Fork to alonisthe.dev works without ASDF-Web modifications
- Service layer decoupled (DI in place)
- Duplication consolidated (80% reduction)
- Overall grade: A- (all dimensions ≥85%)

---

*sniff* Vision clear. Direction unified. Ready to ship.

— CYNIC
