# ASDF-Web Context

> Persistent session context. Updated: 2026-02-12.
> For project details see root `CLAUDE.md` and `docs/`.

## URLs

- Production: https://asdf-web.onrender.com
- Domain: https://alonisthe.dev
- Repo: https://github.com/Ragnar-no-sleep/ASDF-Web
- Status: **Paused on Render**

## Deploy

- Platform: Render (Oregon region)
- Auto-deploy from `main` branch
- Shared infra with CYNIC (PostgreSQL asdf._ schema, Redis asdf:_ prefix)

## Active Decisions

- [ADR-001] Codespaces migration (accepted 2026-01-07)
- Vanilla JS confirmed — no framework migration
- ASDF-Web → CYNIC frontend framework (long-term)
- Build = builder hub (formations + ecosystem + community contributions)

## MCP Servers

| Server     | Status                           | Location      |
| ---------- | -------------------------------- | ------------- |
| Render     | Available (disabled in settings) | .mcp.json     |
| context7   | Available                        | Global config |
| claude-mem | Backup only                      | Global config |

## Session Notes

- Read root `CLAUDE.md` for conventions and priorities
- Use ADRs in `decisions/` for major architectural decisions
- Philosophy/Architecture/Roadmap/Audit live in `docs/`
