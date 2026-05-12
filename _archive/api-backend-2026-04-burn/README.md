# api/ backend — Burned (2026-04-24)

This directory contains the never-deployed-in-production `api/` backend of ASDF-Web.

## Why burned

Empirical verification (Phase 1, 2026-04-24):
- `server.cjs:484` has `app.use('/api', (req, res) => 404)` — proves the routes were never mounted at server startup
- Client-side audit: out of 197 endpoints defined here, ~7 distinct `/api/*` paths are called by `js/`, and 6 of those route to external `alonisthe.dev` (sollama58 backends), NOT to this backend
- `asdf-api.onrender.com` was deployed but currently returns 503; no caller depends on it

This was an aspirational backend, built ahead of frontend wiring that never happened. Spec §9.5 documents the decision.

## Contents

- `services/` — 43 BURN files (boilerplate infra, never-wired wrappers) + 9 CONFIRM files (helius/middleware, monitoring, helius/errors) defaulted to BURN
- `routes/` — 13 route files defining 197 endpoints
- `tests/` — backend's own test suite (scoped to api/)
- `tests-orphans/` — 17 frontend tests that referenced this code and were archived alongside:
  - `tests-orphans/api/` — 5 tests (auth-service, ecosystem-routes, helpers, migrations, sanitize-production)
  - `tests-orphans/server/helius-client.test.js` — 1 test
  - `tests-orphans/server/helius/` — 7 tests (cache, circuit-breaker, errors, health, metrics, providers, transport)
- `handlers.js`, `index.js`, `package.json`, `package-lock.json`, `ARCHITECTURE.md`, `.env.example` — backend top-level files

## Restoration

To revive the full backend:

```bash
git checkout pre-reorg-2026-04-24-baseline -- api/
```

To revive a single file:

```bash
git checkout pre-reorg-2026-04-24-baseline -- api/services/<file>.js
```

For files worth keeping as reference (16 of 68 services), see the sister directory `_archive/api-backend-2026-04-keep-reference/`.

— CYNIC, Phase 1 Task 6
