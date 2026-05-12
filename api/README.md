# api/ — Vercel Serverless Functions

This directory contains Vercel Serverless Functions for ASDF-Web's production
runtime (Vercel Hobby tier, Fluid Compute).

**This is NOT the archived backend.** The legacy `api/` backend (~43k LOC) was
archived in Phase 1 (2026-04-24) to `_archive/api-backend-2026-04-burn/` and
`_archive/api-backend-2026-04-keep-reference/`.

## Current Functions

| File        | Purpose                                                     |
| ----------- | ----------------------------------------------------------- |
| `health.js` | `/health` endpoint — replaces server.cjs equivalent on prod |

## Adding a Function

Each `.js` file in this directory becomes a Vercel Serverless Function. The
file name (minus `.js`) becomes the URL path. So `api/foo.js` → `/api/foo`.

Use the Web Fetch API in handlers (request/response). For Node.js libraries, ensure
they're in the root `package.json` deps.

See `vercel.json` for runtime configuration if needed.

— Phase 1 Task 7, 2026-04-24
