# ASDF-Web Redesign - Todo List

## Context

Refonte complète du site ASDF-Web avec design Helius/Orb (dark premium, orange-red accent #ea4e33, monospace labels).

**Design System:** `css/system.css`
**Philosophy:** Marketing-first + φ (golden ratio) guides all ratios

---

## COMPLETED

### Design System

- [x] `css/system.css` - Design system complet (Helius/Orb inspired)
  - Colors, typography, spacing, components
  - Buttons, cards, badges, navigation, footer

### Landing Page

- [x] `index-marketing.html` (route `/m`) - Marketing-first landing
  - "The token that gets rarer every day" hook
  - 5 tools: HolDex, Ignition, Forecast, Burn Engine, Analytics
  - Explore section: Learn, Build, Games
  - "This is Fine" meme section

### Burns Page

- [x] `burns-v3.html` - Hall of Flames redesign
  - Uses system.css
  - Mega stat, stats grid, podium leaderboard, live feed

### Learn Pages

- [x] `learn-v3.html` (route `/learn-v3`) - Interactive guide (OLD - superseded)
  - Structure: What is it → Why ASDF → Process → Quiz → Play → Analytics → FAQ
  - φ (golden ratio) explanation in "The Process"
  - K-Score formula: K = 100 × ∛(D × O × L)
  - 3-level quiz (Token → Ecosystem → Building)
  - Holder Journey game (7 chapters, 4 stats, archetypes)
  - Analytics section with live burn data
  - FAQ accordion + Glossary with search
  - Gamification: XP, badges, progress tracking, localStorage

- [x] `learn.html` (route `/quick-start`) - Quick 5-Step Intro
  - Apple-inspired clean UI/UX
  - 5 interactive sections: The Pitch, How It Works, The Philosophy, Quick Quiz, Graduation
  - Progress bar with floating step counter
  - XP system with localStorage persistence
  - Quiz validation gates progression
  - Links to deep-learn.html for more detail

- [x] `deep-learn.html` (route `/deep-learn`) - Complete Guide
  - Sidebar + tabs layout (from learn-v3.html)
  - K-Score diagrams and explanations
  - φ (Golden Ratio) philosophy section
  - "This is Fine" 3 layers (Surface, Milieu, Profond)
  - BUILD > USE > HOLD hierarchy with φ multipliers
  - The Pitch and How It Works sections
  - FAQ accordion + Glossary with search
  - All content in English

- [x] `js/learn-v3.js` - All interactivity
  - View switching, quiz logic, FAQ accordion
  - Holder Journey complete game
  - XP/badge system with persistence

### Hub (Landing Page)

- [x] `hub-majestic.html` (route `/hub`) - Ragnar-themed Landing
  - Fixed animation fluidity issues (GPU acceleration)
  - Ragnar fire effects (particles, glows, embers)
  - Performance optimizations (throttle, requestAnimationFrame, will-change)
  - Fire color palette (--fire-core, --fire-mid, --fire-outer)

---

## IN PROGRESS

### Routes Added to server.cjs

- [x] `/v2` → index-new.html
- [x] `/power` → index-power.html
- [x] `/m` → index-marketing.html
- [x] `/learn-v3` → learn-v3.html
- [x] `/hub` → hub-majestic.html
- [x] `/quick-start` → learn.html
- [x] `/deep-learn` → deep-learn.html

---

## PENDING

### Pages to Redesign

#### HolDex (`holdex.html`)

- [ ] Apply system.css design
- [ ] Clean dashboard layout (remove Pokedex theme)
- [ ] Keep: search, token table, K-Score widget, filters
- [ ] Mobile responsive

#### Forecast (`forecast.html`)

- [ ] Apply system.css design
- [ ] Prediction market UI
- [ ] Direction betting interface
- [ ] Countdown/timer styling

#### Games (`games.html`)

- [ ] Apply system.css design
- [ ] Games hub/arcade layout
- [ ] Game cards grid
- [ ] Pump Arena integration

### Final Steps

- [ ] Replace main `index.html` with `index-marketing.html` content
- [ ] Replace main `learn.html` with `learn-v3.html` content
- [ ] Replace main `burns.html` with `burns-v3.html` content
- [ ] Clean up old v2/v3 files
- [ ] Test all routes

---

## KEY DECISIONS

### Design Philosophy

- **Style:** Helius/Orb inspired (dark #000, elevated #0a0a0c, accent #ea4e33)
- **Typography:** Inter (body) + JetBrains Mono (labels, code)
- **No emojis in design** - Use HTML entities (&#128293; etc.)

### Information Architecture

**Tools (functional apps):**

- HolDex, Ignition, Forecast, Burn Engine, Analytics

**Explore (content/education):**

- Learn, Build, Games

### Learn Page Structure

1. What is it - Token déflationniste, burn, tools
2. Why ASDF - Avantages techniques, différenciation
3. The Process - Flywheel + φ + K-Score
4. Quiz - 3 niveaux avec gamification
5. Play - Holder Journey (7 chapitres)
6. Analytics - Live burns data
7. FAQ/Glossary

### $asdfasdfa Philosophy (from manifesto)

- "THIS IS FINE" - 3 layers (surface/middle/deep)
- "Don't Trust, Verify" - everything on-chain
- φ = 1.618... guides all ratios (no magic numbers)
- K = 100 × ∛(D × O × L) - geometric mean
- Conviction > Speculation (BUILD > USE > HOLD)

---

## FILES REFERENCE

```
ASDF-Web/
├── css/
│   └── system.css          # Main design system
├── js/
│   └── learn-v3.js         # Learn page interactivity
├── index-marketing.html    # New landing (/m)
├── learn-v3.html           # New learn (/learn-v3)
├── burns-v3.html           # New burns (ready)
├── server.js               # Routes configured
└── TODO-REDESIGN.md        # This file
```

---

## NEXT SESSION

Start with:

```
Continuing ASDF-Web redesign. Read TODO-REDESIGN.md for context.
Current priority: [build page, games page, tool pages]
```

### Build Page Priority

- [ ] `build.html` (route `/build`) - Builder's Guide
  - Sections: Builders, Find Your Path, Your Journey, Yggdrasil
  - BUILD > USE > HOLD hierarchy prominent
  - φ multipliers for builder rewards
  - Integration guides for ecosystem tools
  - Open source contribution paths

### Games Page Priority

- [ ] `games.html` (route `/ignition`) - Games Hub Redesign
  - Apply system.css design
  - Games hub/arcade layout
  - Game cards grid
  - Pump Arena integration

### Tool Pages (Lower Priority)

- [ ] HolDex, Forecast redesigns
