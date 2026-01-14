# ASDF-Web Context Memory

> Persistent context for Claude sessions.
> Last updated: 2026-01-14

## Project Overview

**ASDF-Web** is the official website for the $asdfasdfa ecosystem - a Solana-based token with the "This is Fine" philosophy.

### Technical Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Server     | Express.js + Helmet + CSP          |
| Frontend   | HTML/CSS/JS vanilla (no framework) |
| Design     | system.css (Helius/Orb inspired)   |
| Deployment | Render (auto-deploy from main)     |

### URLs

- Production: https://asdf-web.onrender.com
- Live: https://alonisthe.dev

---

## Current Architecture

```
ASDF-Web/
├── server.cjs              # Express server
├── index.html              # Hub Majestic (fire particles, orbital nodes)
├── learn.html              # Quick Start - 5-step interactive intro
├── deep-learn.html         # Complete Guide - K-Score, philosophy
├── build.html              # Builder's Guide - Yggdrasil, paths
├── games.html              # Arcade Hub
├── burns.html              # Hall of Flames
├── forecast.html           # Predictions
├── holdex.html             # Token Tracker
├── css/
│   ├── system.css          # Design system
│   └── [page].css          # Per-page styles
├── js/
│   ├── hub-majestic.js     # Landing
│   └── [page].js           # Per-page scripts
└── docs/                   # Internal documentation
```

### Routes

| Route                    | File            | Description          |
| ------------------------ | --------------- | -------------------- |
| `/`                      | index.html      | Hub Majestic landing |
| `/story`, `/quick-start` | learn.html      | Quick Start guide    |
| `/deep-learn`            | deep-learn.html | Complete guide       |
| `/ignition`              | games.html      | Arcade hub           |
| `/burns`                 | burns.html      | Burn tracker         |
| `/asdforecast`           | forecast.html   | Predictions          |
| `/holdex`                | holdex.html     | Token tracker        |

---

## Philosophy $asdfasdfa

```
Don't trust. Verify.    → Test everything, on-chain data
Don't extract. Burn.    → 0% to platform, 100% to burn
Don't panic. Hold.      → Quality over speed
This is fine.           → Confidence through verification
```

### Applied to Development

- **Verify**: All code passes lint, tests, security audit
- **Burn**: No dead code, no bloat, clean diffs
- **Hold**: No rushed decisions, stability first
- **This is fine**: CI green = safe to deploy

### K-Score Formula

```
K = 100 × ∛(D × O × L)

D = Diamond Hands (conviction)
O = Organic Growth (distribution)
L = Longevity (survival)
```

### Hierarchy

```
BUILD > USE > HOLD
φ multipliers reward conviction
```

---

## Design System

### Colors (css/system.css)

```css
--asdf-orange: #ea4e33; /* Primary accent */
--asdf-gold: #f59e0b; /* Secondary */
--asdf-green: #4ade80; /* Success */
--asdf-dark: #0a0a0a; /* Background */
--asdf-elevated: #0a0a0c; /* Cards */
```

### Typography

- **Body:** Inter
- **Code/Labels:** JetBrains Mono

### Landing (Hub Majestic)

- Fire particles, embers, dust
- Orbital rings with nodes
- Tools expandable menu
- Dark fire palette (#0d0906)

---

## MCP Integration

### Project-Level Config (.mcp.json)

```json
{
  "mcpServers": {
    "render": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-render@latest"],
      "env": { "RENDER_API_KEY": "${RENDER_API_KEY}" }
    }
  }
}
```

### Configured Servers

| Server     | Usage                            | Location            |
| ---------- | -------------------------------- | ------------------- |
| Render     | Deploy monitoring, logs, metrics | .mcp.json (project) |
| context7   | Documentation lookup             | Global config       |
| claude-mem | Memory backup (when available)   | Global config       |

### Skills Installed

| Skill      | Location                    | Usage                                                               |
| ---------- | --------------------------- | ------------------------------------------------------------------- |
| solana-dev | ~/.claude/skills/solana-dev | Solana v2.0 development (framework-kit, Anchor, Pinocchio, testing) |

**solana-dev skill covers:**

- UI/wallet: @solana/client + @solana/react-hooks (framework-kit)
- SDK: @solana/kit (Address, Signer, codecs)
- Legacy: @solana/web3-compat boundary adapters
- Programs: Anchor (default) or Pinocchio (performance)
- Testing: LiteSVM, Mollusk, Surfpool

### Agents

| Agent             | Model  | Usage                |
| ----------------- | ------ | -------------------- |
| librarian         | sonnet | Research docs/code   |
| ui-ux-architect   | sonnet | Design decisions     |
| helius-architect  | opus   | RPC patterns, Solana |
| integrity-auditor | haiku  | Security audit       |
| academy-designer  | sonnet | Learning paths       |

### Commands

- `/deep-research` - Multi-source research
- `/audit-security` - Security scanning
- `/analyze-commits` - Git pattern analysis

---

## Workflow

### Git Flow

```
main ────────●────────●──── (production)
            ↑        ↑
develop ──●──●──●──●──●──── (integration)
         ↑     ↑
feature/ ●─────●
```

### Conventions

- 1 JS file per HTML page
- 1 CSS file per page
- CSS variables in `:root`
- Commit: `type(scope): description`

---

## Future Plans

### Plugins to Explore

- **Solana/Web3**: Helius RPC, token metadata
- **Database**: PostgreSQL/Redis for state
- **Monitoring**: Metrics, logs, alerts

### Mobile (TWA)

- Android app in development
- assetlinks.json placeholder ready

---

## Notes for Sessions

1. **Read this file first** for project context
2. **Update after architectural changes**
3. **Use ADRs** in `decisions/` for major decisions
4. **claude-mem** is backup only (Chroma unreliable)

---

_This is fine._
