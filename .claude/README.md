# ASDF-Web Claude Workflow

> Configuration Claude Code pour le projet ASDF-Web
> Philosophie: Don't trust. Verify. This is fine.

---

## Quick Reference

```bash
# Development
npm start         # Express server (port 3000)
npm run dev       # Dev with hot reload

# Validation
npm run lint      # ESLint
npm test          # Jest unit tests
npm run validate  # lint + test + audit

# Git
git checkout -b feature/name    # New feature
git push origin develop         # Push to develop
```

---

## Git Workflow

```
main ────────●────────●──── (production, Render auto-deploy)
            ↑        ↑
develop ──●──●──●──●──●──── (integration)
         ↑     ↑
feature/ ●─────●
```

### Branch Rules

- `main`: Protected, auto-deploy to Render
- `develop`: Integration, all PRs go here first
- `feature/*`: New features

### Commit Convention

```
type(scope): description

Types: feat | fix | refactor | docs | style | test | chore
Scope: hub | learn | build | games | burns | api

Examples:
feat(hub): add fire particle effects
fix(learn): quiz progression gate
refactor(games): arcade hub layout
```

---

## Pre-Commit Checks

Husky runs automatically:

```bash
npm run lint      # ESLint validation
# → "This is fine." message on success
```

Manual validation:

```bash
npm run validate  # lint + test + audit
```

---

## MCP Servers

### Render (Deploy)

```bash
# Check deploy status
mcp__render__list_deploys

# View logs
mcp__render__list_logs
```

### context7 (Docs)

```bash
# Search documentation
mcp__context7__resolve-library-id
mcp__context7__get-library-docs
```

### claude-mem (Memory)

```bash
# Search memory (when available)
mcp__plugin_claude-mem_mcp-search__search

# Note: Chroma backend can be unreliable
# Primary memory: .claude/memory/context.md
```

### delete-observations (Cleanup)

```bash
# List recent observations
bun ~/.claude-mem/delete-observations.js --list

# Find stale observations (referencing deleted files)
bun ~/.claude-mem/delete-observations.js --stale

# Delete specific observations by ID
bun ~/.claude-mem/delete-observations.js 82 83 84

# Show database schema
bun ~/.claude-mem/delete-observations.js --tables
```

---

## Agents

| Agent               | Model  | Usage                    |
| ------------------- | ------ | ------------------------ |
| `librarian`         | sonnet | Research docs, find code |
| `ui-ux-architect`   | sonnet | Design decisions         |
| `helius-architect`  | opus   | Solana RPC patterns      |
| `integrity-auditor` | haiku  | Quick security audit     |
| `academy-designer`  | sonnet | Learning paths           |

### Usage

```
Use librarian agent to research X
Use helius-architect for Solana integration
```

---

## Commands

| Command            | Description           |
| ------------------ | --------------------- |
| `/deep-research`   | Multi-source research |
| `/audit-security`  | Security scanning     |
| `/analyze-commits` | Git history analysis  |

---

## File Structure

```
.claude/
├── settings.json       # MCP config, permissions, agents
├── README.md           # This file
├── memory/
│   ├── context.md      # Primary context (READ FIRST)
│   └── decisions/      # ADRs
├── agents/             # Agent definitions
└── commands/           # Slash commands
```

---

## Best Practices

### DO

- Read `memory/context.md` at session start
- Use TodoWrite to track tasks
- Commit and push after useful changes
- Use agents for specialized tasks

### DON'T

- Modify `server.cjs` without asking
- Introduce frameworks without validation
- Make more than 2 attempts before asking
- Fetch full memory without filtering

---

## Troubleshooting

### claude-mem down

```
Error: Chroma connection failed
```

→ Use `.claude/memory/context.md` as primary
→ claude-mem is backup only

### Lint fails

```bash
npm run lint:fix  # Auto-fix
```

### Tests fail

```bash
npm test -- --verbose  # Debug output
```

---

_This is fine._
