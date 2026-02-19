# ASDF-Web Context

> Contexte persistant. Mis à jour: 2026-02-19.
> Source de vérité: root `CLAUDE.md` + `docs/`.

---

## URLs & Services

| Env        | URL                                         | Branch    | Render       |
| ---------- | ------------------------------------------- | --------- | ------------ |
| Production | https://hub.alonisthe.dev                   | `main`    | asdf-gateway |
| Staging    | https://asdf-web-dev.onrender.com           | `develop` | asdf-web-dev |
| Repo       | https://github.com/Ragnar-no-sleep/ASDF-Web | —         | —            |

**DNS**: `alonisthe.dev` géré par un autre dev sur Squarespace — pas de changements.

---

## Environnement

```
ASDF_ENV=codespace    (Codespace /workspaces/ASDF-Web)
NODE_ENV=development
```

Secrets Codespace requis: `ANTHROPIC_API_KEY`, `RENDER_API_KEY`, `GITHUB_TOKEN`

---

## Deploy

- Render Oregon (starter tier)
- Auto-deploy: `develop` → asdf-web-dev · `main` → asdf-gateway
- Shared infra: PostgreSQL (`asdf.*` schema) + Redis (`asdf:*` prefix)
- CI: `.github/workflows/ci.yml` (lint → test → security → E2E → gate)

---

## MCP Actifs

| Server     | Status   | Config                            |
| ---------- | -------- | --------------------------------- |
| Render     | ✅ actif | `.mcp.json` (`${RENDER_API_KEY}`) |
| GitHub     | ✅ actif | `.mcp.json` (`${GITHUB_TOKEN}`)   |
| claude-mem | ✅ actif | global `~/.claude/settings.json`  |

---

## Décisions Actives

- [ADR-001] Migration vers Codespaces (2026-01-07) — Accepted
- [ADR-002] CYNIC dans Codespace (2026-02-19) — Accepted
- Vanilla JS confirmé — pas de migration framework
- ASDF-Web → CYNIC frontend framework (long-terme)
- Build page = builder hub (formations + ecosystem + community)

---

## Priorités

```
Landing → Learn → Deep-Learn → Build → Games → Analytics
```

God files: `api/index.js` (6146L) · `engine.js` (8301L) · `postgres.js` (1433L)

---

## Notes Session

- `/workflow` avant tout push
- `npm run validate` avant toute PR
- ADRs dans `.claude/memory/decisions/` pour décisions majeures
