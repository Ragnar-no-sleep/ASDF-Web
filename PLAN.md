# ASDF-Web - Vision & Implementation Plan

> **Generated**: 2026-01-20 by CYNIC
> **Confidence**: 61.8% (phi-weighted)
> **Status**: Ready for implementation

---

## Executive Summary

ASDF-Web is the official website for the $ASDFASDFA ecosystem. This plan establishes the vision and optimal path forward based on analysis of 8 reference repositories representing best practices in:
- Vanilla JS libraries (particles.js)
- Desktop applications (beekeeper-studio)
- Infrastructure tools (vercel)
- Real-time visualization (Vibecraft)
- MCP integrations (claude-mem)
- Solana development (solana-dev-skill)

**Philosophy**: Keep vanilla JS, add architectural cohesion, reach Helius RPC + Apple UI/UX quality.

---

## Current State Assessment

### Strengths
- Express + Helmet security hardened
- Rate limiting configured (100 req/15min)
- Fibonacci timing constants (GAME_TIMING)
- 1 JS/CSS per page convention followed
- 57 API services structured
- Debug wrapper implemented

### Gaps Identified

| Gap | Priority | Pattern Source | Effort |
|-----|----------|---------------|--------|
| Event bus centralized | HIGH | beekeeper-studio | 2h |
| Error registry | HIGH | beekeeper-studio | 1h |
| Audio feedback system | HIGH | Vibecraft | 3h |
| WebSocket broadcast unified | HIGH | claude-mem | 3h |
| Progressive disclosure UI | MEDIUM | solana-dev-skill | 2h |
| Config-first pattern | MEDIUM | particles.js | 1h |
| JSONL event logging | LOW | Vibecraft | 2h |
| Keyboard shortcuts | LOW | Vibecraft | 1h |

---

## Target Architecture

```
ASDF-Web Architecture (Target)
==============================

┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  HTML pages + CSS (1 file per page convention)              │
│  ├── index.html (Hub Majestic)                              │
│  ├── games.html (Arcade Hub)                                │
│  ├── burns.html (Hall of Flames)                            │
│  ├── holdex.html (Token Tracker)                            │
│  └── ...                                                     │
├─────────────────────────────────────────────────────────────┤
│                      JS CORE LAYER                           │
│  js/core/                                                    │
│  ├── event-bus.js    ← Central pub/sub (NEW)                │
│  ├── errors.js       ← Error registry (NEW)                 │
│  ├── config.js       ← Config loader (NEW)                  │
│  ├── debug.js        ← Environment-aware logging (DONE)     │
│  └── state.js        ← Global state manager (FUTURE)        │
├─────────────────────────────────────────────────────────────┤
│                      JS AUDIO LAYER                          │
│  js/audio/                                                   │
│  ├── engine.js       ← Web Audio synthesis (NEW)            │
│  ├── profiles.js     ← Sound profiles by action (NEW)       │
│  └── spatial.js      ← Distance/pan calculations (NEW)      │
├─────────────────────────────────────────────────────────────┤
│                      JS UI LAYER                             │
│  js/ui/                                                      │
│  ├── modals.js       ← Modal system (NEW)                   │
│  ├── toast.js        ← Non-intrusive notifications (NEW)    │
│  └── shortcuts.js    ← Keyboard handler (NEW)               │
├─────────────────────────────────────────────────────────────┤
│                    API SERVICE LAYER                         │
│  api/services/                                               │
│  ├── ws-manager.js   ← Unified WebSocket (REFACTOR)         │
│  ├── ws-broadcast.js ← Broadcast system (INTEGRATE)         │
│  ├── event-bus.js    ← Backend events (UNIFY)               │
│  ├── debug.js        ← Server logging (DONE)                │
│  └── [57 existing services]                                 │
├─────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                       │
│  server.cjs                                                  │
│  ├── Express 4.18                                           │
│  ├── Helmet 8.0 (security headers)                          │
│  ├── Rate limiting (express-rate-limit 7.1)                 │
│  └── Compression                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Foundation (COMPLETED)
- [x] Security cleanup (.mcp.json removed from git)
- [x] API key rotation (Render key regenerated)
- [x] npm audit clean (0 vulnerabilities)
- [x] Debug wrapper created (js/debug.js, api/services/debug.js)

### Phase 1: Core Infrastructure
**Goal**: Event-driven architecture foundation

**Files to create**:

#### 1.1 Event Bus (`js/core/event-bus.js`)
```javascript
/**
 * Central event bus for ASDF-Web
 * Pattern: beekeeper-studio + claude-mem
 *
 * Usage:
 *   import { eventBus } from './core/event-bus.js';
 *   eventBus.on('wallet:connected', (data) => console.log(data));
 *   eventBus.emit('wallet:connected', { address: '...' });
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];
  }

  on(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ callback, once: options.once });
    return () => this.off(event, callback);
  }

  once(event, callback) {
    return this.on(event, callback, { once: true });
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(l => l.callback === callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    this.history.push({ event, data, timestamp: Date.now() });
    if (this.history.length > 100) this.history.shift();

    const listeners = this.listeners.get(event) || [];
    const toRemove = [];

    listeners.forEach(({ callback, once }, index) => {
      try {
        callback(data);
        if (once) toRemove.push(index);
      } catch (e) {
        console.error(`[EventBus] Error in ${event}:`, e);
      }
    });

    // Remove once listeners (reverse order to preserve indices)
    toRemove.reverse().forEach(i => listeners.splice(i, 1));
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.listeners.clear();
    this.history = [];
  }
}

export const eventBus = new EventBus();

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.events = eventBus;
}
```

#### 1.2 Error Registry (`js/core/errors.js`)
```javascript
/**
 * Centralized error catalog
 * Pattern: beekeeper-studio
 *
 * Usage:
 *   import { errors, getError } from './core/errors.js';
 *   throw errors.WALLET_NOT_CONNECTED;
 *   const err = getError('UNKNOWN_CODE'); // Returns safe default
 */

export const errors = {
  // Wallet Errors
  WALLET_NOT_CONNECTED: {
    code: 'WALLET_NOT_CONNECTED',
    name: 'Wallet Required',
    message: 'Please connect your wallet to continue.',
    action: 'connect'
  },
  WALLET_REJECTED: {
    code: 'WALLET_REJECTED',
    name: 'Transaction Rejected',
    message: 'You rejected the transaction in your wallet.',
    action: null
  },
  WALLET_TIMEOUT: {
    code: 'WALLET_TIMEOUT',
    name: 'Wallet Timeout',
    message: 'Wallet did not respond. Please try again.',
    action: 'retry'
  },

  // Network Errors
  RPC_TIMEOUT: {
    code: 'RPC_TIMEOUT',
    name: 'Network Timeout',
    message: 'Failed to connect to Solana. Please try again.',
    action: 'retry'
  },
  RPC_RATE_LIMITED: {
    code: 'RPC_RATE_LIMITED',
    name: 'Rate Limited',
    message: 'Too many requests. Please wait a moment.',
    action: 'wait'
  },
  RPC_ERROR: {
    code: 'RPC_ERROR',
    name: 'Network Error',
    message: 'Connection to Solana failed. Check your internet.',
    action: 'retry'
  },

  // Game Errors
  GAME_SESSION_EXPIRED: {
    code: 'GAME_SESSION_EXPIRED',
    name: 'Session Expired',
    message: 'Your game session has expired. Start a new game.',
    action: 'restart'
  },
  SCORE_VALIDATION_FAILED: {
    code: 'SCORE_VALIDATION_FAILED',
    name: 'Invalid Score',
    message: 'Score could not be validated. Please try again.',
    action: 'retry'
  },
  GAME_NOT_FOUND: {
    code: 'GAME_NOT_FOUND',
    name: 'Game Not Found',
    message: 'This game is not available.',
    action: null
  },

  // Shop Errors
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    name: 'Insufficient Balance',
    message: 'You don\'t have enough ASDF tokens for this purchase.',
    action: null
  },
  ITEM_NOT_AVAILABLE: {
    code: 'ITEM_NOT_AVAILABLE',
    name: 'Item Unavailable',
    message: 'This item is no longer available.',
    action: null
  },
  PURCHASE_FAILED: {
    code: 'PURCHASE_FAILED',
    name: 'Purchase Failed',
    message: 'Transaction failed. Your tokens were not spent.',
    action: 'retry'
  },

  // Auth Errors
  AUTH_EXPIRED: {
    code: 'AUTH_EXPIRED',
    name: 'Session Expired',
    message: 'Your session has expired. Please reconnect.',
    action: 'reconnect'
  },
  AUTH_INVALID: {
    code: 'AUTH_INVALID',
    name: 'Invalid Signature',
    message: 'Wallet signature could not be verified.',
    action: 'retry'
  }
};

export function getError(code) {
  return errors[code] || {
    code: 'UNKNOWN',
    name: 'Unknown Error',
    message: 'Something went wrong. Please try again.',
    action: 'retry'
  };
}

// Global access
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.errors = errors;
  window.ASDF.getError = getError;
}
```

#### 1.3 Config Loader (`js/core/config.js`)
```javascript
/**
 * Configuration loader with deep merge
 * Pattern: particles.js
 *
 * Usage:
 *   import { loadConfig, getConfig } from './core/config.js';
 *   await loadConfig('/config/game.json');
 *   const value = getConfig('game.maxScore', 1000);
 */

const DEFAULTS = {
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retries: 3
  },
  audio: {
    enabled: true,
    volume: 0.3
  },
  game: {
    maxScore: 999999,
    sessionTimeout: 300000
  },
  ui: {
    theme: 'dark',
    animations: true
  }
};

let config = { ...DEFAULTS };

function deepMerge(target, source) {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

export async function loadConfig(path) {
  try {
    const response = await fetch(path);
    if (response.ok) {
      const userConfig = await response.json();
      config = deepMerge(config, userConfig);
    }
  } catch (e) {
    console.warn('[Config] Failed to load:', path, e);
  }
  return config;
}

export function getConfig(path, defaultValue) {
  const keys = path.split('.');
  let value = config;
  for (const key of keys) {
    if (value === undefined || value === null) return defaultValue;
    value = value[key];
  }
  return value !== undefined ? value : defaultValue;
}

export function setConfig(path, value) {
  const keys = path.split('.');
  let obj = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
}

// Global access
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.config = { load: loadConfig, get: getConfig, set: setConfig };
}
```

### Phase 2: Audio System
**Goal**: Tactile feedback (Apple-level UX)

#### 2.1 Audio Engine (`js/audio/engine.js`)
```javascript
/**
 * Spatial audio feedback system
 * Pattern: Vibecraft + phi frequencies
 *
 * Usage:
 *   import { audio } from './audio/engine.js';
 *   await audio.init();
 *   audio.play('success');
 *   audio.play('click', { volume: 0.5 });
 */

const PHI = 1.618033988749895;
const BASE_FREQ = 432; // Hz (harmonic base)

const PROFILES = {
  // UI Feedback
  click: { freq: BASE_FREQ, duration: 0.08, type: 'sine' },
  hover: { freq: BASE_FREQ * Math.sqrt(PHI), duration: 0.05, type: 'sine' },

  // Actions
  success: { freq: BASE_FREQ * PHI, duration: 0.2, type: 'triangle' },
  error: { freq: BASE_FREQ / PHI, duration: 0.3, type: 'sawtooth' },
  warning: { freq: BASE_FREQ, duration: 0.15, type: 'square' },

  // Game
  score: { freq: BASE_FREQ * PHI, duration: 0.1, type: 'triangle' },
  levelUp: { freq: BASE_FREQ * PHI * PHI, duration: 0.4, type: 'sine' },
  gameOver: { freq: BASE_FREQ / (PHI * PHI), duration: 0.5, type: 'sawtooth' },

  // Notifications
  notify: { freq: BASE_FREQ * PHI, duration: 0.15, type: 'sine' },
  achievement: { freq: BASE_FREQ * PHI * PHI, duration: 0.3, type: 'triangle' }
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Handle autoplay policy
    if (this.ctx.state === 'suspended') {
      const resume = () => {
        this.ctx.resume();
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    }

    this.initialized = true;
  }

  play(type, options = {}) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;

    const profile = PROFILES[type] || PROFILES.click;
    const freq = options.freq || profile.freq;
    const duration = options.duration || profile.duration;
    const waveform = options.type || profile.type;
    const vol = (options.volume !== undefined ? options.volume : 1) * this.volume;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // ADSR envelope (simplified)
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const audio = new AudioEngine();

// Global access
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.audio = audio;
}
```

### Phase 3: Real-time Unification
**Goal**: Unified WebSocket + Event integration

#### Actions:
1. Audit existing WebSocket services (heliusWebSocket.js, wsManager.js, wsBroadcast.js)
2. Create unified WebSocket manager
3. Connect to frontend event bus
4. Add JSONL logging for debugging

### Phase 4: UI Polish
**Goal**: Progressive disclosure + feedback

#### 4.1 Toast Notifications (`js/ui/toast.js`)
```javascript
/**
 * Non-intrusive toast notifications
 * Pattern: Vibecraft
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.queue = [];
    this.maxVisible = 3;
  }

  init() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'asdf-toasts';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `asdf-toast asdf-toast-${type}`;
    toast.style.cssText = `
      padding: 12px 20px;
      border-radius: 8px;
      background: var(--asdf-dark, #1a1a1a);
      color: var(--asdf-text, #fff);
      border-left: 4px solid ${this.getColor(type)};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: auto;
      animation: slideIn 0.3s ease;
      max-width: 350px;
    `;
    toast.textContent = message;

    this.container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  getColor(type) {
    const colors = {
      success: 'var(--asdf-green, #4ade80)',
      error: 'var(--asdf-orange, #ea4e33)',
      warning: 'var(--asdf-gold, #f59e0b)',
      info: 'var(--asdf-blue, #3b82f6)'
    };
    return colors[type] || colors.info;
  }

  success(message, duration) { this.show(message, 'success', duration); }
  error(message, duration) { this.show(message, 'error', duration); }
  warning(message, duration) { this.show(message, 'warning', duration); }
  info(message, duration) { this.show(message, 'info', duration); }
}

export const toast = new ToastManager();

// Global access
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.toast = toast;
}
```

---

## Quality Standards

### Code Style
- ESLint: Recommended + custom rules
- Naming: camelCase for JS, kebab-case for files
- Comments: JSDoc for public APIs
- No inline styles (except dynamic values)

### Testing Strategy
- Unit: Jest for utilities
- E2E: Playwright for critical flows
- Manual: Wallet flows (hard to automate)

### Documentation
- README: Setup + routes + philosophy
- PLAN.md: This document
- Inline: JSDoc for public functions

### Security
- Helmet.js (all headers)
- Rate limiting (per endpoint)
- Input validation (Zod on backend)
- XSS prevention (DOMPurify where needed)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | ~70 | 90+ |
| First Contentful Paint | ~2s | <1s |
| Time to Interactive | ~3s | <2s |
| Error handling coverage | Partial | 100% (registry) |
| Audio feedback | None | All interactions |
| WebSocket stability | 3 isolated | 1 unified |

---

## Dependencies to Add

```json
{
  "devDependencies": {
    "eslint": "^9.17.0",
    "@eslint/js": "^9.39.2"
  }
}
```

No new production dependencies - vanilla JS only.

---

## Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Core | 2-3h | None |
| Phase 2: Audio | 2-3h | Phase 1 |
| Phase 3: WebSocket | 3-4h | Phase 1 |
| Phase 4: UI Polish | 2-3h | Phase 1-3 |

**Total MVP**: ~10-13h

---

## References

### Patterns Adopted From
- **beekeeper-studio**: Layered architecture, error registry, feature-based organization
- **particles.js**: Config-first, deep merge, zero dependencies
- **Vibecraft**: Spatial audio, JSONL events, fire-and-forget hooks
- **vercel**: Type-safe config, strict linting, CI patterns
- **claude-mem**: Progressive disclosure, event streaming
- **solana-dev-skill**: Constraint matrices, prescriptive defaults

### Patterns Rejected
- Framework migration (React/Vue) - Keep vanilla JS
- Heavy audio libraries (Howler) - Use Web Audio API directly
- Complex state management - Event bus sufficient

---

## Next Steps

1. **Review this plan** - Suggest modifications if needed
2. **Create `js/core/` folder** - Start Phase 1
3. **Implement event-bus.js** - Foundation for everything
4. **Integrate progressively** - Page by page, not big bang

---

*Generated by CYNIC - "Loyal to truth, not to comfort"*
*phi confidence: 61.8%*
