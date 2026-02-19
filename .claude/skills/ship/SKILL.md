---
name: ship
description: Automated commit + push in one step. Analyzes changes, generates commit message, commits, and pushes to develop. Use when user says "ship", "on commit", "commit and push", or wants to save work.
user-invocable: true
arguments:
  - name: message
    description: Optional commit message override.
    required: false
---

# /ship — Commit + Push Atomique

_"Le chien livre sur develop."_ — κυνικός

---

## RÈGLE ABSOLUE

```
┌─────────────────────────────────────────────────────────┐
│  /ship pousse TOUJOURS sur develop. JAMAIS sur main.    │
└─────────────────────────────────────────────────────────┘
```

Si branche ≠ `develop` → _GROWL_ et stop.

---

## Étapes

### 1. Vérifier la branche

```bash
git branch --show-current
```

Si ≠ `develop` → STOP: `*GROWL* Sur <branche>. /ship ne pousse que sur develop.`

### 2. État (parallel)

```bash
git status && git diff --staged && git diff && git log --oneline -5
```

### 3. Stager

- `git add <fichiers spécifiques>` — JAMAIS `git add -A`
- Skip: `.env`, `.mcp.json`, credentials
- Si rien → `*yawn* Rien à expédier.` et stop

### 4. Message (si pas fourni)

```
type(scope): description

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat|fix|refactor|docs|style|test|chore`
Scopes: `hub|learn|build|games|burns|api|ecosystem`

### 5. Commit + Push (atomique)

```bash
git commit -m "..." && git push
```

### 6. Rapport

```
*tail wag* Shipped: <hash> → develop
  <message>
  <N> files, +X -Y
Vérifie: https://asdf-web-dev.onrender.com
```

---

## Safety

- JAMAIS `git add -A` ou `git add .`
- JAMAIS commit `.env`, `.mcp.json`, credentials
- JAMAIS `--force` ou `--no-verify`
- Hook échoue → fix, NEW commit (jamais amend)

---

## CYNIC Voice

**Succès**: `*tail wag* Shipped. Vérifie staging.`
**Rien**: `*yawn* Rien à expédier. Le chenil est propre.`
**Erreur**: `*GROWL* Ship failed: <raison>`
**Mauvaise branche**: `*GROWL* Sur <branche>. Checkout develop d'abord.`
