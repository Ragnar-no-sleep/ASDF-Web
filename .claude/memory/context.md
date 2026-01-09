# ASDF-Web Context Memory

> Persistent context for Claude sessions. Migrated from claude-mem.
> Last updated: 2026-01-09

## Project Overview

**ASDF-Web** is the **Hub Central de l'Écosystème $asdfasdfa** - combining:
- **Vitrine**: Marketing et conversion
- **Portail**: Accès centralisé aux outils ASDF
- **Interactive**: Learn, Games, expérience utilisateur
- **Documentation**: Guide technique pour builders
- **Academy**: Formation de Moldu à Builder Production

### Technical Stack
- **Server**: Express.js + Helmet + rate-limiting
- **Frontend**: HTML/CSS/JS vanilla (no framework)
- **Deployment**: Render (auto-deploy from main)
- **Design System**: Helius-inspired dark professional theme (system.css v3)
- **Storage**: Wallet-based progression

### URLs
- Production: https://asdf-web.onrender.com
- API: https://asdf-api.onrender.com
- HolDex: https://holdex.onrender.com
- GASdf Status: https://status.asdfasdfa.tech

### Tools ASDF (NE PAS TOUCHER)
- **Burns**: Burn tracker "This is Fine"
- **Forecast**: ASDForecast predictions
- **HolDex**: Token tracker, K-Score
- **GASdf**: Gasless transaction layer

---

## Philosophy $asdfasdfa

```
Don't trust. Verify.    → Test everything, assume nothing
Don't extract. Burn.    → Remove waste, keep only essential
Don't panic. Hold.      → Stability over speed, quality over quantity
This is fine.           → Confidence through verification
```

### Mathematical Foundations
```javascript
K = 100 × ∛(D × O × L)  // Geometric mean, équilibre obligatoire
φ = 1.618...            // Golden ratio pour tous les ratios
BUILD > USE > HOLD      // Hiérarchie de conviction
```

### Applied to Development
- **Verify**: Read before Edit, test before ship
- **Burn**: No bloat, no unused features, minimal
- **Hold**: Stability over speed, quality over quantity
- **This is fine**: Chaos is the filter, stay calm, ship regularly

---

## Architecture Cible (v3.0)

### Hub Ecosystem (REFACTOR)
```
/                    → Landing (base: index-marketing.html)
/learn/              → Parcours Moldu
  ├── what-is-it     → "Qu'est-ce que $asdfasdfa?"
  ├── the-process    → "Comment ça fonctionne?"
  ├── why-asdf       → "Pourquoi $asdfasdfa?"
  ├── quiz           → Quiz interactif + Play
  └── glossary       → FAQ + Glossaire
/build/              → Parcours Builder
  ├── yggdrasil      → Arbre de l'écosystème
  ├── builder        → Marketplace (ex-marketplace)
  ├── find-path      → "Trouve ton chemin"
  └── academy/       → Centre de formations
/games               → Hub Gaming
```

### Yggdrasil Visualization
```
Arbre organique en flammes
├── Cœur: Burn Engine (feu/lave)
├── Branches: Projets live (HolDex, Forecast, GASdf)
├── Feuilles: Compétences Academy
└── Style: Fire + Ice + Storm
```

### Design System (system.css v3)
- **Colors**: #000000 (base), #0a0a0c (elevated), #ea4e33 (accent)
- **Typography**: Inter + JetBrains Mono
- **Animations**: Subtle, < 300ms
- **Philosophy**: Apple clarity × Helius premium

### Pages Status
| Section | Page | Status |
|---------|------|--------|
| Hub | index | Refactor → index-marketing.html base |
| Hub | learn/* | À créer (structure Learn) |
| Hub | build/* | À créer (Yggdrasil, Academy) |
| Hub | games | Keep games.html |
| Tools | burns | NE PAS TOUCHER |
| Tools | forecast | NE PAS TOUCHER |
| Tools | holdex | NE PAS TOUCHER |

---

## Key Features

### Academy System (À implémenter)
- Wallet-based progression
- 8 niveaux: MOLDU → ARCHITECT
- 7 domaines de compétences
- Skill tree Yggdrasil
- Builds liés à l'écosystème

### Progression Levels
```javascript
// Aligné avec BUILD > USE > HOLD
HOLD tier:  MOLDU → INITIÉ → HOLDER
USE tier:   APPRENTI → ARTISAN
BUILD tier: MAÎTRE → BUILDER → ARCHITECT
```

### XP System (Phi-based)
```
Quiz réussi:        +10 XP × level_multiplier
Chapitre complété:  +25 XP
Skill validé:       +50 XP
Badge obtenu:       +100 XP
Build terminé:      +250 XP
Certification:      +618 XP
```

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

1. **Check this file first** for project context
2. **Check INTERNAL_ROADMAP.md** for detailed roadmap (not committed)
3. **Use ADRs** in `.claude/memory/decisions/` for major changes
4. **Hub sections (learn, build, games)** = Refactor autorisé
5. **Tools (burns, forecast, holdex)** = NE PAS TOUCHER

## Current Phase
**Phase 0: Foundation** - Nettoyer, définir structure, préparer templates

---

*This is fine.* 🐕‍🦺🔥
