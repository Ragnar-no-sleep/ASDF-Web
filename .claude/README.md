# ASDF-Web Claude Workflow

> Configuration Claude Code pour le projet ASDF-Web
> Philosophie: Don't trust. Verify. This is fine.

---

## Quick Reference

```bash
# Dev workflow
npm run dev          # Next.js dev (temporaire, migration en cours)
npm run express:dev  # Express server avec hot reload

# Validation
npm run lint         # ESLint
npm test             # Jest unit tests
npm run validate     # lint + test + audit

# Git branches
main                 # Production (deploy Render)
develop              # Integration
feature/*            # Features en cours
```

---

## Git Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                       GIT FLOW ASDF-WEB                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   feature/xxx  ─┐                                                │
│                 │                                                │
│   feature/yyy  ─┼──► develop ──► (tests pass) ──► main ──► Render│
│                 │                                                │
│   feature/zzz  ─┘                                                │
│                                                                  │
│   Workflow:                                                      │
│   1. git checkout -b feature/name (depuis develop)               │
│   2. Develop + commit                                            │
│   3. Push to feature/name                                        │
│   4. Tests auto (CI)                                             │
│   5. PR → develop                                                │
│   6. Merge to main après validation                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Commit Convention

```
type(scope): description

Types: feat | fix | refactor | docs | style | test | chore
Scope: hub | learn | build | games | api | workflow

Exemples:
feat(hub): add wallet connect button
fix(learn): quiz scoring calculation
refactor(api): optimize burn data fetch
```

---

## Pre-Commit Checklist

Avant chaque commit/push, vérifier:

```bash
# 1. Lint (auto via Husky)
npm run lint

# 2. Tests unitaires
npm test

# 3. Build check (si modifs significatives)
npm run build

# 4. Security audit
npm audit

# Ou tout en un:
npm run validate
```

### Husky Hooks

```
.husky/
├── pre-commit    # lint + format automatique
└── commit-msg    # Validation format commit
```

---

## MCP Servers - Tests & Troubleshooting

### 1. claude-mem (Mémoire)

```
Status: Peut avoir des timeouts (Chroma connection)

Test:
┌─────────────────────────────────────────────────────────┐
│ mcp__plugin_claude-mem_mcp-search__search               │
│   query: "ASDF-Web"                                     │
│   limit: 5                                              │
├─────────────────────────────────────────────────────────┤
│ Expected: Liste d'observations avec IDs                 │
│ Error: "Chroma connection failed" = serveur down        │
└─────────────────────────────────────────────────────────┘

Troubleshooting:
- Si timeout: Réessayer après quelques secondes
- Si persistent: Utiliser .claude/memory/ comme fallback local
- Le MCP claude-mem est un backup de la mémoire Git-based
```

### 2. render (Déploiement)

```
Status: Actif, workspace configuré

Test:
┌─────────────────────────────────────────────────────────┐
│ mcp__render__get_selected_workspace                     │
├─────────────────────────────────────────────────────────┤
│ Expected: { id: "tea-d598ujshg0os73c7cj1g", ... }       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ mcp__render__list_services                              │
├─────────────────────────────────────────────────────────┤
│ Expected: Liste avec srv-d599rtshg0os73c7u3qg (web)     │
│           et srv-d5dhcs3e5dus739clqhg (api)             │
└─────────────────────────────────────────────────────────┘

Services configurés:
- web: srv-d599rtshg0os73c7u3qg (ASDF-Web frontend)
- api: srv-d5dhcs3e5dus739clqhg (API backend)

Commandes utiles:
- mcp__render__list_deploys      # Historique des deploys
- mcp__render__list_logs         # Logs du service
- mcp__render__get_metrics       # CPU/Memory
```

### 3. context7 (Documentation)

```
Status: Actif, priorités configurées

Priorités: solana, helius, express

Usage via librarian agent:
/deep-research <topic>

Test direct:
mcp__context7__search_docs
  query: "Solana wallet adapter"
```

---

## Agents Disponibles

| Agent               | Model  | Budget     | Usage                    |
| ------------------- | ------ | ---------- | ------------------------ |
| `librarian`         | Sonnet | 50k tokens | `/deep-research <topic>` |
| `integrity-auditor` | Haiku  | 20k tokens | `/audit-security`        |
| `commit-analyzer`   | Sonnet | 30k tokens | `/analyze-commits`       |
| `ui-ux-architect`   | Sonnet | 40k tokens | Task tool                |
| `helius-architect`  | Opus   | 60k tokens | Task tool                |

### Usage Examples

```
# Recherche documentation
/deep-research Solana wallet adapter setup

# Audit sécurité rapide
/audit-security

# Analyse historique git
/analyze-commits

# Design review (via Task)
Task(subagent: ui-ux-architect)
"Analyse la page learn.html pour améliorer l'UX"

# Optimisation RPC (via Task)
Task(subagent: helius-architect)
"Review le fetch des burns pour production"
```

---

## Workflow Session Type

### Start Session

```
1. Check mémoire (si disponible)
   mcp__plugin_claude-mem_mcp-search__search
     query: "ASDF-Web recent"
     limit: 5

2. Ou lire le contexte local
   Read .claude/memory/context.md

3. TodoWrite pour la session
   Planifier les tâches atomiques

4. Vérifier git status
   git status && git log -3 --oneline
```

### During Session

```
┌─────────────────────────────────────────────────────────┐
│                    PHI RATIOS                            │
├─────────────────────────────────────────────────────────┤
│  61.8%  │  Active work (code, fixes, features)          │
│  23.6%  │  Research (docs, exploration, subagents)      │
│  14.6%  │  Overhead (planning, discussions)             │
└─────────────────────────────────────────────────────────┘

Si blocage après 2 tentatives → demander clarification
Si context > 90% → /compact
```

### End Session

```
1. Marquer todos completed

2. Si décisions majeures:
   Update .claude/memory/context.md

3. Si commit demandé:
   - git status
   - git diff
   - git add <files>
   - git commit -m "type(scope): message"

4. Push vers feature branch:
   git push origin feature/xxx
```

---

## Testing Pipeline

### Local Tests

```bash
# Unit tests
npm test

# E2E tests (Playwright)
npm run test:e2e

# Coverage
npm run test:coverage
```

### CI Tests (GitHub Actions)

```yaml
# .github/workflows/ci.yml
- Lint
- Unit tests
- E2E tests
- Security audit
- Build check
```

### Pre-Deploy Checklist

```
□ npm run validate passes
□ Manual test des features modifiées
□ Review de code si applicable
□ Merge to develop
□ Tests CI passent sur develop
□ Merge to main
□ Render auto-deploy
```

---

## Structure Dossier .claude/

```
.claude/
├── README.md              # Ce fichier
├── settings.json          # Config projet (permissions, MCP, budgets)
│
├── agents/                # Définitions des agents
│   ├── librarian.md       # Recherche docs
│   ├── integrity-auditor.md
│   ├── commit-analyzer.md
│   ├── ui-ux-architect.md
│   └── helius-architect.md
│
├── commands/              # Slash commands
│   ├── deep-research.md   # /deep-research
│   ├── audit-security.md  # /audit-security
│   └── analyze-commits.md # /analyze-commits
│
├── memory/                # Mémoire locale (backup claude-mem)
│   ├── context.md         # Contexte actif
│   └── decisions/         # Décisions majeures
│
├── CONTEXT_ENGINEERING.md # Théorie phi-based
├── WORKFLOW_GUIDE.md      # Exemples pratiques
├── ARCHITECTURE_V4.md     # Architecture cible
└── INTERNAL_ROADMAP.md    # Roadmap interne (ne pas commit)
```

---

## Migration Plan (Actif)

### Stack Cible

```
Current                    Target
─────────────────────────────────────────────
Next.js + React + TS  →    Express + Vite + Vanilla JS
Framer Motion         →    GSAP + CSS
Monaco Editor         →    CodeMirror 6
Tailwind             →    system.css (vanilla)
```

### Ordre de Migration

```
1. Setup Vite
2. Hub/Landing (index.html)
3. Learn system
4. Deep Learn
5. Build (Yggdrasil + Builders + Journey)
```

### Fichiers React à Convertir

```
src/app/page.tsx           → index.html + js/index.js
src/app/learn/page.tsx     → learn.html + js/learn.js
src/app/deep-learn/page.tsx→ deep-learn.html + js/deep-learn.js
src/app/build/page.tsx     → build.html + js/build.js
src/components/*           → js/components/*
```

---

## Commandes Utiles

| Commande                 | Description                   |
| ------------------------ | ----------------------------- |
| `/deep-research <topic>` | Recherche docs via librarian  |
| `/audit-security`        | Scan sécurité rapide          |
| `/analyze-commits`       | Analyse historique git        |
| `/compact`               | Réduire contexte si lourd     |
| `/rewind`                | Annuler si mauvaise direction |

---

## Philosophie

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  Don't trust. Verify.                                    │
│  → Test everything, assume nothing                       │
│                                                          │
│  Don't extract. Burn.                                    │
│  → Remove waste, keep only essential                     │
│                                                          │
│  Don't panic. Hold.                                      │
│  → Stability over speed, quality over quantity           │
│                                                          │
│  This is fine.                                           │
│  → Calm in chaos, ship regularly                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

_This is fine._
