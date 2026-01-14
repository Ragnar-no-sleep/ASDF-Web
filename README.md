# ASDF Web

Official website for the $asdfasdfa ecosystem - The Optimistic Burn Protocol on Solana.

> **"Don't trust. Verify. Don't extract. Burn. Don't panic. Hold. This is fine."**

**Live:** https://alonisthe.dev

---

## Quick Start

```bash
npm install
npm start     # Express server on port 3000
npm run dev   # Dev with hot reload
```

---

## Stack

| Layer      | Technology                | Notes                           |
| ---------- | ------------------------- | ------------------------------- |
| Server     | Express.js + Helmet + CSP | Rate limiting, security headers |
| Frontend   | HTML/CSS/JS vanilla       | No framework, direct serve      |
| Design     | system.css                | Helius/Orb inspired             |
| Deployment | Render                    | Auto-deploy from main           |

---

## Project Structure

```
ASDF-Web/
├── server.cjs              # Express server (CommonJS)
├── index.html              # Landing - Hub Majestic (fire particles)
├── learn.html              # Quick Start - 5-step interactive intro
├── deep-learn.html         # Complete Guide - K-Score, philosophy
├── build.html              # Builder's Guide - Yggdrasil, paths
├── games.html              # Arcade Hub - games collection
├── burns.html              # Hall of Flames - burn tracker
├── forecast.html           # Predictions - betting interface
├── holdex.html             # Token Tracker - HolDex integration
├── privacy.html            # Privacy Policy
├── css/
│   ├── system.css          # Design system (colors, typography)
│   ├── hub-majestic.css    # Landing page styles
│   ├── build.css           # Build page styles
│   └── ...                 # Per-page stylesheets
├── js/
│   ├── hub-majestic.js     # Landing interactions
│   ├── build.js            # Build page logic
│   ├── games/              # Game engines
│   └── ...                 # Per-page scripts
├── docs/                   # Architecture & audits
└── assets/                 # Images, fonts
```

---

## Routes

| Route          | File            | Description          |
| -------------- | --------------- | -------------------- |
| `/`            | index.html      | Hub Majestic landing |
| `/story`       | learn.html      | Quick Start guide    |
| `/quick-start` | learn.html      | Alias for /story     |
| `/deep-learn`  | deep-learn.html | Complete guide       |
| `/ignition`    | games.html      | Arcade hub           |
| `/burns`       | burns.html      | Burn tracker         |
| `/asdforecast` | forecast.html   | Predictions          |
| `/holdex`      | holdex.html     | Token tracker        |
| `/privacy`     | privacy.html    | Privacy policy       |

---

## Design System

### Colors (`css/system.css`)

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

### Philosophy

- Helius/Orb inspired dark theme
- Fire color palette for landing
- No emojis in code - use HTML entities

---

## Philosophy

```
Don't trust. Verify.    → Every formula published, on-chain data
Don't extract. Burn.    → 0% to platform, 100% to burn
Don't panic. Hold.      → Quality over speed, no rushed deploys

This is fine.
```

### K-Score Formula

```
K = 100 × ∛(D × O × L)

D = Diamond Hands (conviction)
O = Organic Growth (distribution)
L = Longevity (survival)
```

### The Ratio (φ)

```
φ = 1.618033988749895...
φ⁻¹ = 61.8%
φ⁻² = 38.2%
```

Used for internal thresholds and weights.

---

## Security

- **Helmet.js** - HTTP security headers
- **Rate limiting** - 100 req/15min per IP
- **CSP** - Content Security Policy configured
- **No inline scripts** - External JS files only

See `docs/SECURITY_AUDIT.md` for full audit.

---

## Development

### Conventions

- 1 JS file per HTML page (`burns.html` → `js/burns.js`)
- 1 CSS file per page (`css/burns.css`)
- CSS variables in `:root`
- No build step - code directly served

### Git Workflow

```bash
git checkout -b feature/name
git commit -m "feat(scope): description"
git push origin feature/name
```

Commit convention: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

### Pre-commit Hooks

- ESLint validation
- Custom ASDF message: "This is fine."

---

## Deployment

Deployed on [Render](https://render.com) - see `render.yaml`

- **Auto-deploy:** Merge to main triggers deployment
- **Health check:** `/health` endpoint

---

## Documentation

| File                           | Content                       |
| ------------------------------ | ----------------------------- |
| `README.md`                    | This file - project overview  |
| `CLAUDE.md`                    | Claude Code instructions (FR) |
| `docs/SECURITY_AUDIT.md`       | Security review               |
| `docs/BACKEND_ARCHITECTURE.md` | API architecture              |
| `docs/HELIUS_AUDIT_REPORT.md`  | Solana integration audit      |

---

## Contributing

1. Read `CLAUDE.md` for conventions
2. Follow commit conventions
3. Test before pushing
4. If stuck after 2 attempts → ask for clarification

---

_The fire rises. The supply falls. The holders remain._

**ASDF Team** | MIT License
