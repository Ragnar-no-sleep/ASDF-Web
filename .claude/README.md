# .claude/ — Claude Code Configuration

## Structure

```
.claude/
├── settings.local.json    # MCP permissions & restrictions
├── agents/
│   ├── helius-architect.md   # Solana RPC backend (Opus)
│   ├── ui-ux-architect.md    # Apple x Helius design (Sonnet)
│   └── librarian.md          # Doc & code research (Sonnet)
├── commands/
│   └── deep-research.md      # Multi-source research command
├── memory/
│   ├── context.md            # Session context (URLs, deploy, decisions)
│   └── decisions/            # Architecture Decision Records
└── _archive/                 # Archived agents, commands, roadmap
```

## Quick Start

1. Project instructions: root `CLAUDE.md`
2. Session context: `memory/context.md`
3. Full docs: `docs/` (PHILOSOPHY, ARCHITECTURE, ROADMAP, AUDIT)

## Agents

| Agent              | Model  | Usage                                            |
| ------------------ | ------ | ------------------------------------------------ |
| `helius-architect` | Opus   | Solana/Helius RPC patterns, backend architecture |
| `ui-ux-architect`  | Sonnet | Apple aesthetics + Helius/Orb dark design        |
| `librarian`        | Sonnet | Documentation research, code search, summaries   |

## Commands

| Command                  | Description                                |
| ------------------------ | ------------------------------------------ |
| `/deep-research <topic>` | Spawns librarian for multi-source research |

## Dev Commands

```bash
npm start          # Express server (port 3000)
npm run dev        # Dev with hot reload
npm run lint       # ESLint
npm run lint:fix   # Auto-fix lint
npm test           # Jest unit tests
npm run validate   # lint + test + audit
```
