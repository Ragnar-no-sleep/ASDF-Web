---
name: workflow
description: Display and enforce the ASDF-Web git/deploy workflow. Use when asked about branches, where to push, deployment targets, or when to push to main vs develop.
user-invocable: true
---

# /workflow — ASDF-Web Git & Deploy Protocol

_"Le chien ne pousse sur main que sur ordre."_ — κυνικός

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    ASDF-WEB WORKFLOW                           │
├────────────────────────────────────────────────────────────────┤
│  DEV (Codespace /workspaces/ASDF-Web)                          │
│          │                                                     │
│          ▼  (every feature, fix, commit)                       │
│      develop ──► Render: asdf-web-dev                         │
│                  https://asdf-web-dev.onrender.com             │
│                  (staging — verify en conditions réelles)      │
│          │                                                     │
│          │  ONLY on explicit user instruction                  │
│          ▼                                                     │
│        main ──► Render: asdf-gateway                          │
│                 https://asdf-gateway.onrender.com              │
│                 https://hub.alonisthe.dev (Squarespace DNS)    │
└────────────────────────────────────────────────────────────────┘
```

---

## Branch Map

| Branch    | Purpose               | Auto-deploys to |
| --------- | --------------------- | --------------- |
| `develop` | Integration / staging | asdf-web-dev    |
| `main`    | Production            | asdf-gateway    |

**No other branches.** feature/_, hotfix/_ — not used.

---

## The One Rule

> **ALWAYS push to `develop` by default.**
> **NEVER push to `main` unless the user explicitly says so.**

```
User: "on pousse"         → git push (develop)
User: "ship"              → git push (develop)
User: "push sur main"     → PR develop → main, then push
User: "deploy en prod"    → PR develop → main, then push
```

---

## Push to develop (normal flow)

```bash
git add <specific files>
git commit -m "type(scope): description"
git push
# → asdf-web-dev deploys automatically
```

## Push to main (production — ONLY on explicit order)

```bash
# 1. Verify develop is clean and working on asdf-web-dev
# 2. Create PR: develop → main (via GitHub)
# 3. Merge PR
# 4. → asdf-gateway deploys automatically to hub.alonisthe.dev
```

---

## Safety Rules

- **NEVER** `git push origin main` without explicit user order
- **NEVER** `git push --force` on any branch
- **NEVER** commit to main directly — always via PR from develop
- `alonisthe.dev` DNS is managed by another developer on Squarespace — no DNS changes

---

## Commit Convention

```
type(scope): brief description

Types:  feat | fix | refactor | docs | style | test | chore
Scopes: hub | learn | build | games | burns | api | ecosystem
```

---

## CYNIC Voice

**On develop push**: `*tail wag* Shipped to develop. Vérifie sur https://asdf-web-dev.onrender.com`
**On main push**: `*ears perk* ⚠️ Push vers MAIN — confirmation avant de procéder.`
**On wrong branch**: `*GROWL* On est sur main. Retour sur develop d'abord.`
