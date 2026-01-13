# ASDF-Web Context Memory

> Persistent context for Claude sessions. Migrated from claude-mem.
> Last updated: 2026-01-13

## Project Overview

**ASDF-Web** is the official website for the $asdfasdfa ecosystem - a Solana-based meme token with a unique "This is Fine" philosophy.

### Technical Stack

- **Server**: Express.js + Helmet + rate-limiting
- **Frontend**: HTML/CSS/JS vanilla (no framework)
- **Deployment**: Render (auto-deploy from main)
- **Design System**: Helius-inspired dark professional theme

### URLs

- Production: https://asdf-web.onrender.com
- API: https://asdf-api.onrender.com
- HolDex: https://holdex.onrender.com

---

## Philosophy $asdfasdfa

```
Don't trust. Verify.    → Test everything, assume nothing
Don't extract. Burn.    → Remove waste, keep only essential
Don't panic. Hold.      → Stability over speed, quality over quantity
This is fine.           → Confidence through verification
```

### Applied to Development

- **Verify**: All code passes lint, tests, security audit before merge
- **Burn**: No dead code, no unnecessary dependencies, clean diffs
- **Hold**: No rushed decisions, breaking changes documented
- **This is fine**: CI/CD green = safe to deploy

---

## Design System Evolution

### Timeline

1. **Initial**: Basic HTML pages
2. **V2**: Apple-inspired clean aesthetics
3. **V3 (Current)**: Helius-inspired dark professional with void-and-energy philosophy

### Key Design Decisions

- **Colors**: Dark backgrounds (#0a0a0a), cyan accents (#00d4ff), orange highlights (#ff6b35)
- **Typography**: System fonts, monospace for data
- **Animations**: Subtle, purposeful transitions
- **Components**: Cards with glass morphism, gradient borders

### Pages

| Page     | File          | Status                                               |
| -------- | ------------- | ---------------------------------------------------- |
| Home     | index.html    | Multiple variants (index-new, index-v3, index-power) |
| Learn    | learn.html    | V3 with gamification (learn-v3.html)                 |
| Burns    | burns.html    | "This is Fine" theme                                 |
| Games    | games.html    | Arcade hub                                           |
| Forecast | forecast.html | Analytics                                            |
| HolDex   | holdex.html   | Token tracker integration                            |

---

## Key Features

### Burns Tracker

- Real-time burn statistics
- "This is Fine" dog animation
- Verification links to Solana explorer

### Learn Page (V3)

- Interactive journey with chapters
- XP system with localStorage persistence
- Quiz progression mechanics
- Golden Ratio philosophy education
- K-Score explanation

### HolDex Integration

- Token tracker with K-Score analytics
- Real-time holder data
- Conviction hierarchy (BUILD > USE > HOLD)

---

## Workflow (Git Flow)

```
main ────────────●────────────●──────── (production)
                ↑            ↑
develop ──●──●──●──●──●──●──●──●─────── (integration)
         ↑     ↑        ↑
feature/ ●─────●        │
hotfix/  ───────────────●
```

### Branch Rules

- `main`: Protected, requires PR with passing CI
- `develop`: Integration branch, E2E tests run here
- `feature/*`: New features, branch from develop
- `hotfix/*`: Critical fixes, branch from main

---

## Claude Integration

### MCP Servers

- **Render**: Deploy monitoring, logs, metrics
- **GitHub**: PR management, issues
- **context7**: Documentation lookup

### Agents

- `librarian`: Research docs/code
- `ui-ux-architect`: Design decisions
- `helius-architect`: RPC patterns
- `integrity-auditor`: Security audit
- `commit-analyzer`: Git history analysis

### Commands

- `/deep-research`: Multi-source research
- `/audit-security`: Security scanning
- `/analyze-commits`: Git pattern analysis

---

## Recent Decisions

### 2026-01-13: Migration Stack - Express + Vite + Vanilla

**Décision**: Migrer de Next.js/React/TS vers Express + Vite + Vanilla JS

**Stack Cible**:

- Serveur: Express.js (inchangé)
- Bundler: Vite (tree-shaking, HMR)
- Animations: GSAP core + CSS natif
- 3D: Three.js (inchangé)
- Games 2D: Canvas API natif
- Code Editor: CodeMirror 6 (remplace Monaco)
- Styles: system.css + page tokens (Tailwind supprimé)
- Components: JS injection bundlé (security by design)
- State local: localStorage + CustomEvents
- State on-chain: Future session (cynic)

**Ordre de Migration**:

1. Setup Vite
2. Hub/Landing (index.html)
3. Learn system
4. Deep Learn
5. Build (Yggdrasil + Builders + Journey)

**Raisons**:

- Philosophie $asdfasdfa: Qualité > Quantité
- Alignement avec 10+ pages legacy existantes
- Performance: Bundle plus léger
- Simplicité: Pas de framework churn

### 2026-01-13: Architecture Components

**Décision**: Components réutilisables via JS injection

**Structure**:

```
js/
├── components/    # Nav, Footer, Modal, Toast
├── utils/         # wallet.js, storage.js, api.js
├── lib/           # GSAP, Three.js, CodeMirror
├── games/         # Canvas game engines
└── pages/         # Per-page logic
```

**Raisons**:

- Security by design: Code bundlé, pas de fetch externe
- CSP friendly: Pas d'inline HTML dynamique
- Compatible avec Express existant

### 2026-01-13: On-Chain Vision

**Décision**: Tout on-chain pour les données utilisateur (future)

**Scope on-chain**:

- Progression learning (XP, badges, modules)
- Games stats (scores, achievements, inventory)
- Wallet activity (burns, transactions, holdings)
- Full user profile

**Leaderboards**: Hybrid approach

- Real-time via API (affichage)
- On-chain snapshots (preuves/rewards)

**Timeline**: Session dédiée avec cynic

### 2026-01-07: Codespaces Migration

- Move development to GitHub Codespaces
- Full MCP integration in devcontainer
- PR-based workflow with Claude review
- Memory persistence via GitHub (this file)

### 2026-01-07: Testing Stack

- ESLint + Prettier for code quality
- Jest for unit tests
- Playwright for E2E
- npm audit for security
- Husky pre-commit hooks

---

## Notes for Future Sessions

1. **Always check this file first** for project context
2. **Update this file** when making architectural decisions
3. **Use ADRs** in `.claude/memory/decisions/` for major changes
4. **claude-mem backup** may be available but unreliable

---

_This is fine._ 🐕‍🦺🔥
