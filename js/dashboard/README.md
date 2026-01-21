# Yggdrasil Dashboard

> Builder's Cosmos - Fire & Ice 3D Visualization
> Last Audit: 2026-01-21 | Q-Score: 52.6 | Verdict: WAG

---

## Quick Start

```bash
# From ASDF-Web root
npx live-server --port=8080
# Navigate to http://localhost:8080/dashboard.html
```

---

## Architecture

```
js/dashboard/                 14 files | ~3,800 LOC
├── index.js                  Orchestrator
├── config.js                 PHI constants + data
├── tree/
│   ├── yggdrasil.js          Main Three.js scene
│   ├── camera.js             View transitions + orbit
│   ├── skills.js             Phi-spiral skill nodes
│   ├── particles.js          Fire & Snow systems
│   └── nodes.js              (unused)
├── ui/
│   ├── panel.js              Project detail panel
│   ├── tooltip.js            Hover tooltips
│   ├── formation-panel.js    Learning content panel
│   ├── error-boundary.js     WebGL fallback + errors
│   └── onboarding.js         FTUE 3-step intro
└── data/
    ├── adapter.js            Data access layer
    ├── formations.js         Track/module definitions
    └── cynic-bridge.js       CYNIC integration
```

### Key Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| PHI Constants | `config.js:9-11` | Golden ratio harmony |
| Observer | `callbacks` objects | Event-driven UI |
| Adapter | `data/adapter.js` | Data abstraction |
| View Stack | `camera.js:29` | Back navigation |

---

## Audit Status

### Q-Score Breakdown

| Axiom | Score | Status |
|-------|-------|--------|
| PHI | 63.1 | Strong - golden ratio well used |
| VERIFY | 45.7 | Weak - needs error handling |
| CULTURE | 50.5 | Medium - UX patterns missing |
| BURN | 52.4 | Medium - some complexity to remove |

### Phase 0: Foundation (Infra)

> Priority: Reliability > Speed
> **Status: VERIFIED** (2026-01-21)

| Task | Status | File | Notes |
|------|--------|------|-------|
| ES Module Three.js import | [x] | `yggdrasil.js`, `particles.js`, `skills.js` | importmap in HTML |
| ErrorBoundary component | [x] | `ui/error-boundary.js` | WebGL check + error UI |
| CanvasTexture dispose | [x] | `skills.js:270-302` | Recursive disposeObject() |
| Extract inline styles | [ ] | `ui/*.js` | P2 - deferred |
| Throttle raycasting | [x] | `yggdrasil.js:514-519` | 33ms (~30fps) |
| Add TypeScript types | [ ] | `*.d.ts` | P3 - deferred |

**Verification Checklist:**
- [x] No console errors on load (tested 2026-01-21)
- [ ] No memory growth after 5min idle
- [ ] Works on mobile Safari
- [x] Graceful fallback if WebGL fails

---

### Phase 1: First Impression (Consumer)

> Priority: 10x better or don't ship
> **Status: 1/5 Complete** (2026-01-21)

| Task | Status | Impact | Notes |
|------|--------|--------|-------|
| FTUE onboarding overlay | [x] | First 10s experience | 3-step intro, localStorage |
| Branded loading animation | [ ] | Replace fire emoji | ASDF tree growing |
| Ambient sound design | [ ] | Immersion | Fire crackle + wind |
| Interaction sounds | [ ] | Feedback | Click, hover, transition |
| Clear CTA on first load | [ ] | Reduce bounce | "Click an island" prompt |

**Consumer Metrics:**
- [ ] Time to First Interaction < 3s
- [ ] Bounce rate < 50%
- [ ] "Aha moment" within 30s

---

### Phase 2: Habit Loop (Consumer)

> Why return? Why stay?

| Task | Status | Hook Phase | Notes |
|------|--------|-----------|-------|
| Streak counter | [ ] | Investment | Visible in header |
| Daily skill suggestion | [ ] | Trigger | "Continue: Solana Basics" |
| XP animation | [ ] | Variable Reward | Numbers flying up |
| Badge collection view | [ ] | Investment | Trophy room |
| Share card generation | [ ] | Trigger (external) | Twitter/Discord |
| Progress recap on return | [ ] | Trigger | "Welcome back, 3 skills to go" |

**Retention Metrics:**
- [ ] 7-day return > 20%
- [ ] Skill completion > 30%
- [ ] Share rate > 5%

---

### Phase 3: Scale (Infra)

> Build correct, always needed

| Task | Status | Dependency | Notes |
|------|--------|-----------|-------|
| TypeScript migration | [ ] | Phase 0 | Gradual, start with config |
| State machine | [ ] | Phase 0 | XState or custom FSM |
| Builder PDA integration | [ ] | Solana program | On-chain progress |
| LOD for islands | [ ] | Performance | 3 detail levels |
| InstancedMesh for skills | [ ] | Performance | Many nodes efficient |
| WebSocket live burns | [ ] | Backend | Real-time core pulse |

---

## Tech Debt Tracker

| Debt | Severity | Added | Resolved |
|------|----------|-------|----------|
| Global THREE via script tag | High | 2026-01-21 | 2026-01-21 |
| CanvasTexture memory leak | High | 2026-01-21 | 2026-01-21 |
| 200 LOC inline styles in panel.js | Medium | 2026-01-21 | - |
| Raycasting every mousemove | Medium | 2026-01-21 | 2026-01-21 |
| No error boundaries | High | 2026-01-21 | 2026-01-21 |
| No loading states for async | Medium | 2026-01-21 | - |

---

## File Change Log

| Date | File | Change | Author |
|------|------|--------|--------|
| 2026-01-21 | `README.md` | Initial audit documentation | CYNIC |
| 2026-01-21 | `formation-panel.js` | Ported from build/ | CYNIC |
| 2026-01-21 | `data/formations.js` | Ported from build/ | CYNIC |
| 2026-01-21 | `data/adapter.js` | Ported from build/ | CYNIC |
| 2026-01-21 | `index.js` | Wired FormationPanel to skill click | CYNIC |
| 2026-01-21 | `skills.js` | Added disposeObject() for memory leak fix | CYNIC |
| 2026-01-21 | `yggdrasil.js` | ES Module import, throttled raycasting | CYNIC |
| 2026-01-21 | `particles.js` | ES Module import, removed THREE param | CYNIC |
| 2026-01-21 | `ui/error-boundary.js` | NEW: Error handling + WebGL fallback | CYNIC |
| 2026-01-21 | `dashboard.html` | Added importmap for Three.js | CYNIC |
| 2026-01-21 | `ui/onboarding.js` | NEW: FTUE 3-step onboarding overlay | CYNIC |
| 2026-01-21 | `index.js` | Wired Onboarding, added reset/show methods | CYNIC |

---

## Commands

```bash
# Development
npx live-server --port=8080

# Check for console errors
# Open DevTools > Console, interact with all features

# Memory profiling
# DevTools > Memory > Take heap snapshot
# Interact for 5 min, take another snapshot
# Compare for leaks

# Performance
# DevTools > Performance > Record
# Should maintain 60fps on desktop
```

```javascript
// Console commands for testing (both work)
dashboard.resetOnboarding();          // Reset FTUE, refresh to see again
dashboard.showOnboarding();           // Force show onboarding
// or: YggdrasilDashboard.resetOnboarding() / .showOnboarding()
```

---

## Consumer Testing Checklist

### First-Time User (FTUE)
- [ ] User understands what Yggdrasil is within 10s
- [ ] User clicks an island within 30s
- [ ] User opens a skill within 60s
- [ ] User feels "I want to come back"

### Returning User
- [ ] Progress is preserved
- [ ] User knows what to do next
- [ ] User feels progress toward goal

### Mobile
- [ ] Touch orbit works
- [ ] Panels are readable
- [ ] Performance is acceptable (30fps min)

---

## Dependencies

| Package | Version | Purpose | CDN |
|---------|---------|---------|-----|
| Three.js | 0.160.0 | 3D rendering | unpkg (to migrate) |
| Inter font | - | Typography | Google Fonts |

---

## Philosophy Alignment

> "L'utilisateur doit sentir qu'il habite cet arbre."

Every change must answer: **Does this make the user feel like they belong?**

### ASDF Principles Applied

| Principle | Application |
|-----------|-------------|
| **PHI** | Golden angle for skill placement, 61.8% max confidence |
| **VERIFY** | Error handling, graceful degradation |
| **CULTURE** | Fire & Ice theme, Norse mythology |
| **BURN** | Simplicity over features, remove complexity |

---

## Next Steps

1. **Immediate**: FTUE onboarding overlay (Phase 1.1)
2. **This Week**: Clear CTA on first load (Phase 1.5)
3. **This Sprint**: Extract inline styles to CSS (P2 debt)
4. **Milestone**: Q-Score > 65 (current: 52.6 -> target after Phase 1: ~58)

---

*"This is Fine. The fire is transformation. The ice is purity. You are the builder."*
