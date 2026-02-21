# ASDF-Web: Unified Vision & Roadmap (2026)

> **One Journey, One Direction** — Consolidate 3 roadmaps into single execution strategy
>
> Philosophy: **φ (Phi) Harmony** — Each phase builds the previous, timings follow Fibonacci, decisions respect OOP & security first.

**Date:** February 2026
**Status:** UNIFIED — All 3 roadmaps synced + prioritized
**Maintainer:** CYNIC

---

## Executive Alignment

Three roadmaps existed in parallel:
1. **SCALABILITY-ROADMAP.md** — Infrastructure, caching, performance (500th-10k DAU)
2. **AUDIT-COMPLETE.md** — OOP, security, code quality (16 priorities)
3. **api/ARCHITECTURE.md** — Refactoring, modularisation, routes extraction

**Problem:** Misaligned phases, overlapping work, unclear dependencies
**Solution:** Single unified roadmap with atomic phases, clear sequencing, long-term vision

---

## North Star: A-Rated Codebase by Month 6

```
Current: B (Security A-, OOP B+, Scalability C+, Patterns B)
Target:  A (All dimensions ≥90%)

Timeline: 24 weeks (6 Sprints × 4 weeks)
Team: 1 Developer (CYNIC)
Capacity: 61.8% (φ⁻¹) confidence per phase
```

---

## Phase Foundation: P1 — Critical Security (DONE ✓)

**Duration:** Sprint 1 (Feb 21-28)
**Status:** Complete
**Commits:** `fix(security): implement Phase 2 critical security hardening`

### What Was Done
- ✅ npm audit fix (bigint-buffer RCE, minimatch ReDoS)
- ✅ Leaderboard pagination (unbounded queries → 20-100 per request)
- ✅ Rate limit memory leak fix (immediate delete on window reset)
- ✅ CSRF protection added (shop purchase endpoints)
- ✅ Solana compatibility verified (spl-token@0.1.8)

### Rationale
Security first: Any production system needs zero critical vulns + CSRF protection. Cannot scale with known vulnerabilities. Performance/refactoring secondary until foundation is secure.

### Impact
- Security: B- → A- (2 critical vulns fixed)
- Scalability: C+ → C+ (leaderboard now pageable, memory leak gone)
- OOP: No change (0 refactoring)

---

## Phase 2: Code Foundation (Weeks 3-6)

### P2.1 — Dependency Injection & OOP Compliance (Sprint 2)
**Duration:** 2 weeks
**Effort:** ~50 hours
**Risk:** Medium (touching core service layer)

#### Why Now?
**Before** refactoring/scaling, services must be decoupled. Currently:
- Shop: shop.js + shopV2.js (70% duplicate) — unmaintainable
- Helius: 6 files (118K) — cannot extend without breaking
- Games: 9 engines (10K dup lines) — bug fix = 9 edits

**Dependency Injection enables:**
1. Swap implementations (test vs production)
2. Merge duplicate services (shop.js + shopV2.js → single service)
3. Extract base classes safely (game engines, Helius wrappers)

#### Implementation
```javascript
// NEW: ServiceContainer (replaces direct imports)
class ServiceContainer {
  constructor() {
    this.services = new Map();
  }

  register(name, factory) {
    this.services.set(name, factory);
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not registered`);
    }
    return this.services.get(name);
  }
}

// OLD pattern (bad)
import { shop } from '../services/shop';
export function getBurns() {
  return shop.getBurns(); // Tightly coupled
}

// NEW pattern (good)
export function createLeaderboardService(container) {
  const db = container.get('database');
  return {
    getBurns: () => db.query(...) // Decoupled via container
  };
}
```

#### Deliverables
1. Create `api/infrastructure/ServiceContainer.js`
2. Register all 64 services into container
3. Update 10 critical services to use DI (shop, helius, games)
4. Keep 54 services as-is for backward compat

#### Metrics
- Code coupling: High → Medium
- Testability: Low → Medium
- Duplication: 38K + 118K consolidated → shared bases

### P2.2 — Consolidate Shop Services (Sprint 2)
**Duration:** 1 week
**Effort:** ~20 hours

#### Current Duplication
```
shop.js (16K)   → getInventory, purchase, equip
shopV2.js (22K) → getInventory, purchase, equip

70% overlap + different implementations = maintenance nightmare
```

#### Solution
Merge into `ShopServiceFactory`:
```javascript
// services/shop-base.js (replaces shop.js + shopV2.js)
export function createShopService(config = {}) {
  const { version = 'v1', features = {} } = config;

  return {
    getInventory: (wallet) => { ... },
    purchase: (wallet, itemId) => { ... },
    equip: (wallet, itemId) => { ... },
    // V2-only features
    ...(version === 'v2' && {
      getCollections: () => { ... },
      addToFavorites: (wallet, itemId) => { ... },
    })
  };
}
```

#### Routes Stay Separate
```
routes/shop.js     → v1 endpoints (backward compat)
routes/shop-v2.js  → v2 endpoints
  Both use same createShopService() factory
```

#### Result
- 38KB → 14KB code (63% reduction)
- 1 bug fix → fixes both v1 & v2
- Easy to add v3 later (new config)

### P2.3 — Helius Consolidation (Sprint 2-3)
**Duration:** 2 weeks
**Effort:** ~30 hours

#### Current Problems
```
helius.js (26K)           → Base API wrapper
heliusEnhanced.js (18K)   → Market data (duplicates API calls)
heliusMetrics.js (22K)    → Metrics (duplicates API calls)
heliusRateLimiter.js (17K) → Rate limiting (duplicates API calls)
heliusWebSocket.js (17K)  → WebSocket (duplicates API calls)
heliusWebhooks.js (18K)   → Webhooks (duplicates API calls)
```

**Issue:** Each file reimplements Helius HTTP client.

#### Solution: Mixin Pattern
```javascript
// services/helius/base.js
export function createHeliusClient(apiKey) {
  return {
    _apiKey: apiKey,

    async request(method, endpoint, body = null) {
      const response = await fetch(`https://api.helius.xyz${endpoint}`, {
        method,
        headers: { 'X-API-Key': this._apiKey },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json();
    },

    // V1 shared methods
    async getBalance(wallet) {
      return this.request('GET', `/v0/balance/${wallet}`);
    },
  };
}

// services/helius/enhanced.js — ONLY enrichment logic
export function enhanceWithMarketData(heliusClient) {
  return {
    ...heliusClient,

    // NEW: Market data enrichment (no API call duplication)
    async getTokenWithMarketData(mint) {
      const tokenInfo = await this.request('GET', `/v0/token/${mint}`);
      return {
        ...tokenInfo,
        marketCap: calculateMarketCap(tokenInfo.supply),
      };
    },
  };
}

// Usage
const client = createHeliusClient(API_KEY);
const enhanced = enhanceWithMarketData(client);
```

#### Result
- 118KB → 40KB code (66% reduction in duplication)
- Single source of truth for API calls
- Easy to add new features (just add mixin)

### P2.4 — Extract Game Engine Base (Sprint 3)
**Duration:** 1 week
**Effort:** ~15 hours

#### Current Duplication (9 game engines)
```
Each game file (~500L) contains:
  - Wallet connection logic
  - Score submission logic
  - UI rendering logic

Copy-pasted 9 times across ignition.js, inferno.js, plasma.js, etc.
```

#### Solution
```javascript
// games/engine-base.js
export class GameEngine {
  constructor(config) {
    this.gameId = config.gameId;
    this.maxScore = config.maxScore;
    this.rules = config.rules;
  }

  async submitScore(wallet, score, timestamp) {
    // Shared logic for all games
    if (score > this.maxScore) throw new Error('Invalid score');

    return this.#submitToBlockchain(wallet, score, timestamp);
  }

  async #submitToBlockchain(wallet, score, timestamp) {
    // All games use same blockchain submission
    return solanaService.submitScore(this.gameId, wallet, score, timestamp);
  }
}

// games/ignition.js — ONLY game rules
export default class IgnitionGame extends GameEngine {
  constructor() {
    super({
      gameId: 'ignition',
      maxScore: 1000000,
      rules: 'burn as much as possible',
    });
  }

  // Game-specific logic only
  calculateScore(burnAmount) {
    return burnAmount * this.rules.multiplier;
  }
}
```

#### Result
- 10K lines of duplication → single base class
- Bug fix in scoring logic = fix once, applies to all 9 games
- New game = extend GameEngine, add rules binding

### P2.5 — Admin Module Extraction (Sprint 3)
**Duration:** 1 week
**Effort:** ~15 hours

#### Current Monolith
```
admin.js (1,319 lines)
  ├── Users management (auth, roles, deletion)
  ├── Audit logging (user actions, security events)
  ├── Config management (feature flags, rate limits)
  └── Analytics (metrics, dashboards)

VIOLATION: Single Responsibility Principle
```

#### Solution
```
api/routes/admin/
├── index.js         → Router aggregator
├── users.js         → User CRUD, roles (200L)
├── audit.js         → Audit trail, security events (150L)
├── config.js        → Feature flags, cache control (100L)
└── analytics.js     → Metrics, dashboards (150L)
```

Each is self-contained + can be tested independently.

#### Result
- 1,319L → 4 focused modules (200L each)
- Each module owns its domain
- Easy to add new admin features

---

## Phase 3: Scalability Foundation (Weeks 7-10)

### P3.1 — Redis Caching System (Sprint 3-4)
**Duration:** 2 weeks
**Effort:** ~40 hours
**Prerequisite:** P2.1 (ServiceContainer) — cache service registered via DI

#### What To Cache
```
High-Priority (cache immediately):
  ✓ GET /api/leaderboard/burns     (5-min TTL) — 300k queries/day → 10k
  ✓ GET /api/leaderboard/xp        (5-min TTL) — 100k queries/day → 3k
  ✓ GET /api/ecosystem/stats       (10-min TTL) — 80k queries/day → 2k
  ✓ GET /api/ecosystem/burns       (5-min TTL) — 50k queries/day → 2k

Medium-Priority (after warmup):
  ⚠️ GET /api/user/burns           (1-min TTL, per-wallet)
  ⚠️ GET /api/formations/*         (15-min TTL, static data)
```

#### Implementation
```javascript
// NEW: cache-manager.js (DI-registered)
export function createCacheManager(redis, db) {
  return {
    async get(key, ttl, fetcher) {
      // L1: Redis
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);

      // L2: Compute
      const fresh = await fetcher();

      // L3: Store
      await redis.setex(key, ttl, JSON.stringify(fresh));
      return fresh;
    },

    async invalidate(pattern) {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    },
  };
}

// Usage in routes
router.get('/api/leaderboard/burns', async (req, res) => {
  const cache = container.get('cacheManager');
  const burns = await cache.get(
    'leaderboard:burns',
    5 * 60, // 5 min TTL
    () => db.query('SELECT * FROM burns ORDER BY amount DESC LIMIT 100')
  );
  res.json(burns);
});
```

#### Invalidation Strategy
```
On mutation (POST/PUT/DELETE):
  - shop.purchase → invalidate('cache:inventory:*', 'cache:shop:*')
  - burn submission → invalidate('cache:leaderboard:*', 'cache:stats:*')
  - user update → invalidate('cache:user:*')

TTL fallback (if invalidation missed):
  - Hot data (leaderboard): 5 min
  - Warm data (ecosystem): 10 min
  - Cold data (formations): 15 min
```

#### Metrics
- Cache hit rate: Target 90%+ (after 1 week warmup)
- Database load: 150-200 req/s → 30-40 req/s
- API latency: 150ms → 10-20ms (99% improvement on hits)

### P3.2 — Database Connection Pooling (Sprint 4)
**Duration:** 3 days
**Effort:** ~8 hours

#### Current Problem
```
Each API request:
  1. Open new DB connection (5-10ms)
  2. Authenticate (10-15ms)
  3. Execute query (80-120ms)
  4. Close connection (5ms)
  ────────────────────────────
  Total overhead: 20-30ms (20% of query time)

At scale (100 req/s): 2000+ simultaneousconnections → database runs out
```

#### Solution
```javascript
// services/postgres.js (REPLACE current)
import pg from 'pg';

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  max: 20,                      // Max idle connections in pool
  min: 5,                       // Pre-warm 5 connections
  idleTimeoutMillis: 30000,     // Kill connection after 30s idle
  connectionTimeoutMillis: 2000, // Fail fast if pool exhausted
});

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

#### Result
- Connection overhead: 20-30ms → 2-3ms (90% reduction)
- Max throughput: 10 req/s → 100+ req/s per instance
- Database stability: Predictable connection count

### P3.3 — Pagination Across All Endpoints (Sprint 4)
**Duration:** 2 weeks
**Effort:** ~20 hours

#### Current Issues
```
What lacks pagination:
  ✗ GET /api/ecosystem/burns         → Could return 100K records
  ✗ GET /api/leaderboard/achievements → All games' achievements
  ✗ GET /api/formations/tracks       → All formations
  ✗ GET /api/admin/users             → All users (dangerous)
```

#### Standard Pattern
```javascript
export const paginationDefaults = {
  offset: 0,
  limit: 20,
  maxLimit: 100,
};

export function parsePagination(query) {
  const offset = Math.max(0, parseInt(query.offset) || 0);
  const limit = Math.min(
    parseInt(query.limit) || paginationDefaults.limit,
    paginationDefaults.maxLimit
  );

  return { offset, limit };
}

// Usage (all endpoints)
router.get('/api/ecosystem/burns', async (req, res) => {
  const { offset, limit } = parsePagination(req.query);
  const burns = await db.query(
    'SELECT * FROM burns ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const total = await db.query('SELECT COUNT(*) FROM burns');

  res.json({
    data: burns,
    pagination: { offset, limit, total: total[0].count },
  });
});
```

#### Endpoints to Paginate
1. All `/api/leaderboard/*` → Fibonacci limits (20, 34, 55, 89)
2. All `/api/ecosystem/*` → Same pattern
3. All `/api/admin/*` → Same pattern
4. All `/api/user/*` lists → Same pattern

#### Result
- Prevents unbounded `SELECT *` queries
- Database can serve many users (no 100K row transfers)
- Lighthouse scores improve (fewer assets to serialize)

---

## Phase 4: Performance Optimization (Weeks 11-14)

### P4.1 — Code-Split JavaScript (Sprint 4-5)
**Duration:** 2 weeks
**Effort:** ~40 hours
**Prerequisite:** Vite build system (already in place)

#### Current Problem
```
Bundle components:
  ecosystem-data.js  17.5MB  (loaded on burns page)
  games.js          ~45kb  (loaded on forecast page)
  build.js          ~20kb  (loaded everywhere)
  ──────────────────────────
  Total: 225KB JS (gzip: ~60KB)

Unused on each page → Load only needed data
```

#### Solution: Tree-shaking + Code Splitting
```javascript
// BEFORE: monolithic
import ecosystemData from './ecosystem-data.js'; // 17.5MB

// AFTER: lazy load
const resources = {
  projects: () => import('./data/projects.js'),
  formations: ) => import('./data/formations.js'),
  achievements: () => import('./data/achievements.js'),
};

// Usage (burns page only: no projects needed)
const stats = await resources.leaderboard();
```

#### Vite Config
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split by route
          ecosystem: ['./js/ecosystem-data.js'],
          games: ['./js/games/index.js'],
          vendor: ['@solana/web3.js', 'tweetnacl'],
        },
      },
    },
  },
};
```

#### Result
- Main bundle: 225KB JS → 140KB JS (38% reduction)
- Ecosystem page only loads projects.js (~100KB)
- Games page only loads games.js (~40KB)
- Parse time: 300ms → 180ms
- Lighthouse: 78 → 85+

### P4.2 — Critical CSS Inlining (Sprint 5)
**Duration:** 1 week
**Effort:** ~15 hours

#### Issue
```
Current:
  1. GET /index.html
  2. Parse HTML → find <link rel="stylesheet" href="css/system.css">
  3. Fetch css/system.css (50ms latency)
  4. Parse CSS (50ms)
  5. Then render page
  ════════════════════════
  Result: 100ms delay before anything renders (FCP = 1.8s)

Fix: Inline critical CSS in <head> (render-blocking eliminated)
```

#### Solution
```javascript
// build/critical-css.js
import fs from 'fs';
import critical from 'critical';

export async function extractCriticalCSS() {
  const criticalStyles = await critical.generate({
    src: 'index.html',
    width: 1200,
    height: 800,
  });

  // Inline into <head>
  const html = fs.readFileSync('dist/index.html', 'utf8');
  const inline = html.replace(
    '</head>',
    `<style data-critical>${criticalStyles}</style></head>`
  );

  fs.writeFileSync('dist/index.html', inline);
}

// Run in build step
// npm run build → Vite → extracts critical CSS
```

#### Impact
- FCP: 1.8s → 1.2s (33% improvement)
- LCP: 2.4s → 2.0s
- Lighthouse: +8 points

### P4.3 — Database Query Optimization (Sprint 5)
**Duration:** 1 week
**Effort:** ~20 hours

#### Problems Identified
```
Issue 1: N+1 Queries
  getBurners(10) → SELECT * FROM burns (10 rows)
  For each: SELECT * FROM users WHERE wallet = ? (10 queries)
  Total: 11 queries instead of 1 JOIN

Issue 2: Missing Indexes
  SELECT * FROM game_scores WHERE user = ? → Table scan (1000s of rows)
  (Should have INDEX on user column)

Issue 3: No Query Limits
  SELECT * FROM audit_log → Could be 1M rows
  (Should have LIMIT or window function)
```

#### Solution
```sql
-- Add missing indexes
CREATE INDEX idx_burns_wallet ON burns(wallet);
CREATE INDEX idx_game_scores_user ON game_scores(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_formations_category ON formations(category);

-- Fix N+1: Use JOIN instead of loop
SELECT
  b.*,
  u.username,
  u.tier
FROM burns b
LEFT JOIN users u ON b.wallet = u.wallet
ORDER BY b.amount DESC
LIMIT 100;

-- Add window functions for rankings
SELECT
  *,
  ROW_NUMBER() OVER (ORDER BY amount DESC) as rank
FROM burns
WHERE timestamp >= NOW() - INTERVAL '7 days'
LIMIT 100;
```

#### Query Analysis Tools
```javascript
// Log slow queries
db.query = (sql, params) => {
  const start = Date.now();
  const result = exec(sql, params);
  const duration = Date.now() - start;

  if (duration > 100) {
    console.warn(`SLOW QUERY (${duration}ms): ${sql}`);
    // Log to monitoring system
  }

  return result;
};
```

#### Result
- N+1 queries eliminated (11 → 1)
- Query time: 150-200ms → 80-120ms
- Database CPU: -40%

---

## Phase 5: Security Hardening (Weeks 15-18)

### P5.1 — Server-Side Consent & Audit Trail (Sprint 5-6)
**Duration:** 2 weeks
**Effort:** ~30 hours
**Prerequisite:** P1 CSRF in place

#### Gap
```
Current: Client-side consent only
  └─ User clicks "I accept" → localStorage SET consent=true
  └─ Problem: No server proof, user can clear browser

Required (GDPR): Server audit trail
  └─ POST /api/user/consent → Server records timestamp, IP, user-agent
  └─ GET /api/user/consent-history → User sees all consent decisions
  └─ Compliance: Proof for auditors
```

#### Implementation
```javascript
// Services: consent-service.js
export async function recordConsent(wallet, type, accepted, metadata = {}) {
  const record = {
    wallet,
    type, // 'marketing', 'analytics', 'essential'
    accepted,
    timestamp: new Date(),
    ip: metadata.ip,
    userAgent: metadata.userAgent,
  };

  await db.query(
    'INSERT INTO consent_audit (wallet, type, accepted, timestamp, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
    [record.wallet, record.type, record.accepted, record.timestamp, record.ip, record.userAgent]
  );

  return record;
}

// Routes: POST /api/user/consent
router.post('/api/user/consent', authMiddleware, csrfProtection, async (req, res) => {
  const { marketing, analytics } = req.body;

  const consent = {
    marketing: await recordConsent(req.user.wallet, 'marketing', marketing, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }),
    analytics: await recordConsent(req.user.wallet, 'analytics', analytics, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }),
  };

  res.json(consent);
});
```

### P5.2 — Privacy & Data Export (Sprint 6)
**Duration:** 1 week
**Effort:** ~15 hours

#### GDPR Article 15 (Right to Access)
User must be able to export all their data in machine-readable format (JSON/CSV).

#### Implementation
```javascript
// GET /api/user/export?format=json
router.get('/api/user/export', authMiddleware, async (req, res) => {
  const wallet = req.user.wallet;
  const format = req.query.format || 'json';

  const userData = {
    profile: await db.query('SELECT * FROM users WHERE wallet = $1', [wallet]),
    burns: await db.query('SELECT * FROM burns WHERE wallet = $1', [wallet]),
    gameScores: await db.query('SELECT * FROM game_scores WHERE wallet = $1', [wallet]),
    inventory: await db.query('SELECT * FROM inventory WHERE wallet = $1', [wallet]),
    consentHistory: await db.query('SELECT * FROM consent_audit WHERE wallet = $1', [wallet]),
  };

  if (format === 'csv') {
    return sendAsCSV(res, userData);
  }

  res.json(userData);
});
```

### P5.3 — Security Headers & CSP (Sprint 6)
**Duration:** 3 days
**Effort:** ~5 hours

#### Current CSP Issue
```
Current: X-Content-Security-Policy = "default-src ... script-src 'unsafe-inline'"
Problem: 'unsafe-inline' defeats XSS protection (allows inline <script> tags)
```

#### Solution
```javascript
// middleware/security-headers.js
  app.use((req, res, next) => {
  res.setHeader('X-Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + crypto.randomUUID() + "'", // Nonce-based, no unsafe-inline
    "style-src 'self' data:",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.helius.xyz https://api.solana.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
});
```

---

## Phase 6: Long-Term Vision (Months 5-6)

### P6.1 — Read Replicas & Horizontal Scaling
**Duration:** 2 weeks
**Effort:** ~40 hours

#### Architecture
```
Write Path:
  POST /api/user/profile → Primary DB (Virginia)

Read Path:
  GET /api/leaderboard → Replica 1 (nearest region)
  GET /api/stats → Replica 2 (nearest region)

Replication Lag: <1s acceptable
```

#### Implementation
```javascript
// services/postgres.js
const primaryPool = new pg.Pool({ host: process.env.DB_PRIMARY });
const readPool = new pg.Pool({ host: process.env.DB_REPLICA });

export async function writeQuery(sql, params) {
  return primaryPool.query(sql, params);
}

export async function readQuery(sql, params) {
  return readPool.query(sql, params);
}
```

### P6.2 — Distributed Rate Limiting (via Redis)
**Duration:** 1 week
**Effort:** ~10 hours

#### Current Problem
```
walletRateLimits Map is in-memory → when scaling to multiple instances, each instance has own Map
Result: Same wallet can make 30 req/min per instance (no cross-instance enforcement)
```

#### Solution
```javascript
// Move from in-memory Map to Redis
export async function rateLimitWallet(wallet) {
  const key = `ratelimit:wallet:${wallet}`;
  const current = await redis.get(key);
  const count = (current || 0) + 1;

  if (count > 30) {
    return false; // Rate limited
  }

  // Increment with 1-minute expiry
  await redis.setex(key, 60, count);
  return true;
}
```

### P6.3 — CDN & Geographic Caching
**Duration:** 1 week
**Effort:** ~5 hours

#### Setup: Cloudflare + Render
```
User in EU requests /index.html
  ↓
Cloudflare edge (nearest location)
  ├─ Cache hit → Serve instantly (5ms)
  └─ Cache miss → Fetch from Render (Virginia)
      ├─ Wait 100-150ms
      ├─ Cache at 200+ Cloudflare edge locations
      └─ Return to user
```

#### Result
- Geographic latency: 150-300ms → 5-20ms (90% improvement)
- Bandwidth: -40% (Cloudflare deduplicates)

---

## Unified Timeline (Gantt View)

```
Week    Sprint  Phase  Tasks
───────────────────────────────────────────────────────
1       1       P1     npm audit, leaderboard, rate limits, CSRF
2       1       P1     ✅ COMPLETE

3-4     2       P2.1   DI + Service consolidation
        2       P2.2   Shop merge (v1 + v2)
        2       P2.3   Helius consolidation

5-6     3       P2.4   Game engine base
        3       P2.5   Admin extraction
        3       P3.1   Redis caching (half)

7       4       P3.1   Redis caching (complete)
        4       P3.2   DB connection pooling
        4       P3.3   Pagination

8-9     5       P4.1   Code-split JS
        5       P4.2   Critical CSS
        5       P4.3   Query optimization

10-11   6       P5.1   Consent & audit trail
        6       P5.2   Privacy export
        6       P5.3   CSP hardening

12-13   7       P6.1   Read replicas
        7       P6.2   Distributed rate limiting

14      8       P6.3   CDN setup
        8       **A RATING ACHIEVED**
```

---

## Unified Priority Matrix

```
Quadrant 1: Do First (High Impact, High Dep)
├─ P1: Security hardening ✅ DONE
├─ P2.1: DI container (unblocks P2-P6)
├─ P3.1: Redis caching (enables scaling)
└─ P4.1: Code-split JS (Lighthouse -> 85)

Quadrant 2: Do Next (High Impact, Low Dep)
├─ P2.2-2.5: Consolidations (DRY)
├─ P3.2-3.3: Database optimization
└─ P4.2-4.3: Performance polish

Quadrant 3: Do Later (Low Impact, High Dep)
├─ P5.1-5.3: Privacy/compliance
└─ P6.2: Distributed rate limiting

Quadrant 4: Nice-to-Haves (Low Impact, Low Dep)
└─ P6.3: CDN (nice but not critical for A rating)
```

---

## Success Criteria (A Rating = 90%+ all dimensions)

| Dimension | Current | Target | P1 | P2-P3 | P4-P5 | P6 |
|-----------|---------|--------|----|---------|---------|----|
| **OOP** | B+ | A | — | ✅ | — | — |
| **Security** | A- | A | ✅ | ✅ | ✅ | — |
| **Scalability** | C+ | A | ✅ | ✅ | ✅ | ✅ |
| **Code Quality** | B | A | — | ✅ | ✅ | — |
| **Performance** | C | A | — | — | ✅ | ✅ |
| **Privacy** | B | A | — | — | ✅ | — |

---

## Key Principles

### 1. **φ (Phi) Harmony**
Each phase is complete, self-contained, builds on the previous. No jumping ahead. Fibonacci-paced (1, 1, 2, 3, 5, 8 weeks).

### 2. **Security First**
Never refactor/scale before security hardened. Vulnerabilities must be zero.

### 3. **Long-Term Vision**
Each commit aligns with A-rating goal. No shortcuts that create technical debt later.

### 4. **Confidence Capped at 61.8%**
φ⁻¹ limit. Every phase reviewed before proceeding. Empirical validation (tests, metrics).

### 5. **One Direction, One Source of Truth**
This document is the single roadmap. SCALABILITY-ROADMAP.md and AUDIT-COMPLETE.md are inputs, not sources of truth. All PRs must reference this phase.

---

## References

- **SCALABILITY-ROADMAP.md** — Performance baselines, caching patterns, CDN strategy (incorporated into P3-P6)
- **AUDIT-COMPLETE.md** — OOP gaps, code duplication (incorporated into P2)
- **api/ARCHITECTURE.md** — Routes extraction, refactoring patterns (incorporated into P2)
- **CLAUDE.md** — φ philosophy, design system, Solana stack

---

## Next Action

→ **Begin P2.1** (Dependency Injection)
→ Duration: 2 weeks (March 3-17)
→ Deliverable: ServiceContainer + 10 services migrated
→ Review: Weekly, with metrics (code coupling, testability)

*sniff* — CYNIC
**Confidence: 61.8% (φ⁻¹)** — Unified vision locked in. Ready for 6-week sprint.
