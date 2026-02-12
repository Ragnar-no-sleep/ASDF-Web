# API Architecture Refactoring Plan

## Current State

```
api/
├── index.js           (6166 lines) ← GOD FILE
└── services/
    ├── postgres.js    (1519 lines) ← GOD CLASS
    └── ... (67 other services)
```

## Target State

```
api/
├── index.js           (~400 lines) App setup, middleware, error handlers
├── routes/
│   ├── index.js       Router aggregator
│   ├── auth.js        /api/auth/*
│   ├── user.js        /api/user/*, /api/sessions/*, /api/data/*
│   ├── shop.js        /api/shop/*, /api/v2/shop/*, /api/v2/currency/*
│   ├── game.js        /api/game/*, /api/scores/*
│   ├── ecosystem.js   /api/ecosystem/*, /api/leaderboard/*
│   ├── helius.js      /api/helius/*, /api/das/*, /api/token/*
│   ├── formations.js  /api/formations/*
│   ├── health.js      /health, /livez, /readyz, /api/status
│   ├── notifications.js /api/notifications/*
│   └── admin/
│       ├── index.js   Admin router aggregator
│       ├── metrics.js /api/admin/metrics
│       ├── cache.js   /api/admin/cache/*
│       ├── flags.js   /api/admin/flags/*
│       └── ...        (other admin routes)
│
└── services/
    ├── db/
    │   ├── client.js      Connection pool, query, transaction
    │   ├── migrations.js  Schema migrations
    │   └── cache.js       Cache-aside pattern
    │
    ├── repositories/
    │   ├── users.js       User CRUD
    │   ├── shop.js        Shop catalog, inventory
    │   ├── currency.js    In-game currency
    │   ├── leaderboard.js Burns, rankings
    │   └── games.js       Game scores
    │
    └── ... (other services unchanged)
```

## Migration Strategy

### Phase 1: Routes Extraction (Low Risk)
1. Create `routes/` directory
2. Extract one route group at a time
3. Use Express Router for each module
4. Keep backward compatibility

**Pattern:**
```javascript
// routes/formations.js
const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { sanitizeError } = require('../services/security');

router.get('/tracks', (req, res) => { ... });
router.get('/tracks/:trackId', (req, res) => { ... });

module.exports = router;

// index.js
const formationsRoutes = require('./routes/formations');
app.use('/api/formations', formationsRoutes);
```

### Phase 2: Database Split (Medium Risk)
1. Create `services/db/` directory
2. Extract core DB functions to `client.js`
3. Create repository modules
4. Update imports gradually

### Phase 3: Full Migration (Higher Risk)
1. Complete routes extraction
2. Complete repository pattern
3. Add integration tests
4. Remove legacy code

## Priority Order

| Priority | Module | Lines | Risk | Effort |
|----------|--------|-------|------|--------|
| 1 | formations routes | ~230 | Low | Small |
| 2 | health routes | ~100 | Low | Small |
| 3 | shop routes | ~460 | Medium | Medium |
| 4 | admin routes | ~1800 | Medium | Large |
| 5 | postgres.js split | ~1500 | High | Large |

## Shared Dependencies

Routes commonly import:
- `authMiddleware`, `requireAdmin` from middleware
- `sanitizeError` from security service
- `isValidAddress` from validators
- Various service functions

Create shared exports:
```javascript
// middleware/index.js
module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireAdmin,
  walletRateLimiter,
  // ...
};
```

## Testing Strategy

Before each extraction:
1. Add integration tests for affected routes
2. Verify API contract unchanged
3. Test error handling

## Rollback Plan

If issues arise:
1. Revert to single-file structure
2. Routes are additive - can coexist with inline routes
3. Repository pattern can be reverted by re-exporting from postgres.js
