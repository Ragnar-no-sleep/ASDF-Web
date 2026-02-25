/**
 * ASDF API - Helius Service Barrel
 *
 * Re-exports all core Helius client functions.
 * Existing callers of require('./services/helius') resolve here automatically
 * via Node.js directory index resolution — zero import breakage.
 *
 * Sub-services:
 *   ./client.js              — Core RPC client (token balances, burns, supply)
 *   ./enhanced.js            — DAS API, tx simulation, enhanced parsing
 *   ./ws.js                  — WebSocket subscriptions
 *   ./webhooks.js            — Webhook processing & event queue
 *   ./middleware/metrics.js  — Prometheus-compatible metrics
 *   ./middleware/rateLimit.js — Adaptive rate limiter
 *   ./middleware/batch.js    — JSON-RPC request batcher
 *   ./middleware/failover.js — Multi-endpoint failover & load balancing
 */

'use strict';

module.exports = require('./client');
