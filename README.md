# ASDF Web

Official website for the ASDFASDFA ecosystem - The Optimistic Burn Protocol on Solana.

> **"Don't trust. Verify. Don't extract. Burn. Don't panic. Hold. This is fine."**

**Live:** https://alonisthe.dev/ecosystem

---

## Quick Start

```bash
npm install
npm start        # Express server (production)
npm run dev      # Next.js dev (temporary)
```

Server runs on `http://localhost:3000`

---

## Current State

| Layer        | Technology                   | Status               |
| ------------ | ---------------------------- | -------------------- |
| Server       | Express.js + Helmet + CSP    | Production           |
| Legacy Pages | HTML/CSS/JS vanilla          | 10+ pages            |
| New Pages    | Next.js + React + TypeScript | 4 pages (migrating)  |
| 3D           | Three.js (Yggdrasil)         | Production           |
| Animations   | Framer Motion                | Migrating to GSAP    |
| Styles       | Tailwind + system.css        | Migrating to vanilla |

---

## Roadmap: Migration to Vanilla Stack

### Phase 1: MVP Validation (Current)

- [x] DEV Track Module 1 - Learning System
- [x] Yggdrasil 3D visualization
- [x] Builders Section
- [ ] Test & validate user experience
- [ ] Gather feedback

### Phase 2: Architecture Migration

```
Target Stack:
├── Express.js      → Server (unchanged)
├── Vite            → Build + tree-shaking
├── GSAP            → Animations (replace Framer Motion)
├── Three.js        → 3D (optimized via Vite)
├── Ace Editor      → Code sandbox (replace Monaco)
├── Vanilla CSS     → system.css + per-page CSS
└── localStorage    → Client state
```

### Phase 3: Folder Cleanup

**Before (Current):**

```
ASDF-Web/
├── src/app/          # Next.js pages (to migrate)
├── src/components/   # React components (to convert)
├── index.html        # Legacy landing
├── learn.html        # Legacy pages...
├── js/               # Legacy scripts
├── css/              # Legacy styles
└── (mixed state)
```

**After (Target):**

```
ASDF-Web/
├── server.js              # Express (unchanged)
├── vite.config.js         # Build configuration
├── index.html             # Landing (migrated)
├── learn.html             # Learn
├── deep-learn.html        # Deep Learn
├── build.html             # Build + Yggdrasil + Journey
├── burns.html             # Burns tracker
├── holdex.html            # HolDex
├── forecast.html          # Forecasts
├── games.html             # Games hub
├── js/
│   ├── lib/
│   │   ├── gsap.min.js
│   │   ├── three.min.js
│   │   └── ace/
│   ├── components/
│   │   ├── nav.js
│   │   ├── footer.js
│   │   └── hub-background.js
│   ├── index.js
│   ├── learn.js
│   ├── build.js           # + Yggdrasil + Journey
│   └── ...
├── css/
│   ├── system.css         # Design system
│   ├── index.css
│   └── ...
└── dist/                  # Production build
```

### Phase 4: Feature Parity

- [ ] Migrate Yggdrasil 3D to vanilla Three.js
- [ ] Convert Journey learning system to vanilla JS
- [ ] Replace Framer Motion animations with GSAP
- [ ] Implement Ace Editor for code sandbox
- [ ] Port all React components to vanilla

---

## Development Workflow

### Claude Code Integration

**MCP Servers:**

```json
{
  "context7": "Documentation lookup",
  "grep": "Codebase search",
  "claude-mem": "Memory/context persistence"
}
```

**Agents disponibles:**
| Agent | Usage |
|-------|-------|
| `librarian` | Research docs, find code examples |
| `ui-ux-architect` | Design decisions (Apple x Helius) |
| `helius-architect` | RPC patterns, Solana production |
| `integrity-auditor` | Security audit |
| `Explore` | Codebase exploration |

**Commandes utiles:**

```bash
/compact          # Reduce context
/rewind           # Go back if wrong direction
use context7      # Search up-to-date docs
use librarian     # Deep research with summary
```

### Git Workflow

```bash
# Feature branches
git checkout -b feature/name
git commit -m "feat(scope): description"
git push origin feature/name

# Commit convention
feat:     New feature
fix:      Bug fix
refactor: Code restructure
docs:     Documentation
style:    Formatting
```

### Pre-commit Hooks

Husky runs automatically:

- ESLint (JS/TS files)
- Prettier (all files)
- Custom ASDF message: "This is fine."

---

## Architecture Decisions

### Why Vanilla JS?

1. **Stability** - No framework churn, long-term maintainability
2. **Performance** - Smaller bundle, faster load times
3. **Simplicity** - Easier onboarding, less abstraction
4. **Alignment** - Matches existing 10+ legacy pages
5. **Philosophy** - "Don't trust. Verify." applies to code too

### Why Vite?

- Tree-shaking for Three.js (reduce ~500KB)
- Fast dev server with HMR
- ES modules native support
- Simple configuration
- No framework lock-in

### Why GSAP over Framer Motion?

- Works with vanilla JS (no React dependency)
- Industry standard for web animations
- Better performance for complex sequences
- ScrollTrigger for scroll-based animations
- Smaller footprint when tree-shaken

### Why Ace Editor over Monaco?

- ~300KB vs ~2MB bundle size
- Native vanilla JS support
- Battle-tested (Cloud9, CodePen)
- Easier migration path
- Sufficient for learning platform needs

---

## Pages Reference

| Route         | File            | Description                    |
| ------------- | --------------- | ------------------------------ |
| `/`           | index.html      | Landing page                   |
| `/story`      | learn.html      | Learn about ASDF               |
| `/deep-learn` | deep-learn.html | Deep dive content              |
| `/build`      | build.html      | Yggdrasil + Builders + Journey |
| `/ignition`   | games.html      | Games hub                      |
| `/burns`      | burns.html      | Burn tracker                   |
| `/holdex`     | holdex.html     | HolDex integration             |
| `/forecast`   | forecast.html   | Predictions                    |

---

## Design System

### Colors (system.css)

```css
--asdf-orange: #ea4e33;
--asdf-gold: #f59e0b;
--asdf-green: #4ade80;
--asdf-dark: #0a0a0a;
--asdf-gray: #888;
```

### Typography

- Headings: System font stack
- Code: JetBrains Mono, Consolas, monospace

### Components

- Cards with glass morphism
- Gradient borders
- Fire/ice visual theme (Ragnarok)
- Viking/Norse aesthetic elements

---

## Security

- Helmet.js for HTTP headers
- Rate limiting on API routes
- CSP configured for embedding
- No inline scripts in production

---

## Deployment

Deployed on [Render](https://render.com) - see `render.yaml`

```yaml
services:
  - type: web
    name: asdf-web
    env: node
    buildCommand: npm install
    startCommand: npm start
```

---

## Contributing

1. Check `.claude/CLAUDE.md` for project conventions
2. Use TodoWrite to track tasks
3. Follow commit conventions
4. Test before pushing
5. If stuck after 2 attempts → ask for clarification

---

## Philosophy

```
Don't trust. Verify.
Don't extract. Burn.
Don't panic. Hold.
This is fine. 🐕‍🦺🔥
```

---

**ASDF Team** | MIT License
