# ASDF-Web Context Memory

> Persistent context for Claude sessions. Migrated from claude-mem.
> Last updated: 2026-01-07

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
| Page | File | Status |
|------|------|--------|
| Home | index.html | Multiple variants (index-new, index-v3, index-power) |
| Learn | learn.html | V3 with gamification (learn-v3.html) |
| Burns | burns.html | "This is Fine" theme |
| Games | games.html | Arcade hub |
| Forecast | forecast.html | Analytics |
| HolDex | holdex.html | Token tracker integration |

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

*This is fine.* 🐕‍🦺🔥
