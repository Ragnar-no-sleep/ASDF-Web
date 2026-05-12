/**
 * Helius RPC Layer — Metrics Middleware
 *
 * Counters + sliding window latencies.
 * Wired by transport.js — never called by consumers directly.
 *
 * Replaces previous 728L dead metrics module.
 *
 * @see docs/ARCH-HELIUS.md Section 8
 */

'use strict';

const counters = {
  requests: 0,
  errors: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rateLimits: 0,
};

/** @type {Array<{method: string, latencyMs: number, providerId: string, error?: string, t: number}>} */
const latencies = [];
const MAX_WINDOW = 3600;

function rpcSuccess(method, latencyMs, providerId) {
  counters.requests++;
  latencies.push({ method, latencyMs, providerId, t: Date.now() });
  if (latencies.length > MAX_WINDOW) latencies.shift();
}

function rpcError(method, latencyMs, providerId, errorCode) {
  counters.requests++;
  counters.errors++;
  latencies.push({ method, latencyMs, providerId, error: String(errorCode), t: Date.now() });
  if (latencies.length > MAX_WINDOW) latencies.shift();
}

function cacheHit(method) {
  counters.cacheHits++;
}
function cacheMiss(method) {
  counters.cacheMisses++;
}
function rateLimited(providerId) {
  counters.rateLimits++;
}

function _percentile(arr, pct) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function getStats() {
  const cutoff = Date.now() - 60_000;
  const recent = latencies.filter(l => l.t > cutoff);
  const recentMs = recent.map(l => l.latencyMs);

  return {
    ...counters,
    p50: _percentile(recentMs, 50),
    p99: _percentile(recentMs, 99),
    errorRate: counters.requests
      ? ((counters.errors / counters.requests) * 100).toFixed(1) + '%'
      : '0%',
    cacheHitRate:
      counters.cacheHits + counters.cacheMisses
        ? ((counters.cacheHits / (counters.cacheHits + counters.cacheMisses)) * 100).toFixed(1) +
          '%'
        : 'N/A',
    windowSize: recent.length,
  };
}

function reset() {
  Object.keys(counters).forEach(k => {
    counters[k] = 0;
  });
  latencies.length = 0;
}

module.exports = { rpcSuccess, rpcError, cacheHit, cacheMiss, rateLimited, getStats, reset };
