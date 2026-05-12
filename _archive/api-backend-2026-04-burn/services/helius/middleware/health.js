/**
 * Helius RPC Layer — Health Check Middleware
 *
 * Periodic background health probes for all registered providers.
 * Bypasses transport intentionally — health probes are INPUT to
 * circuit breaker decisions; routing them through circuit breaker
 * would be circular.
 *
 * @see docs/ARCH-HELIUS.md Section 10
 */

'use strict';

const providers = require('../providers');

let _interval = null;

/**
 * Probe a specific provider with a lightweight getSlot call.
 * Raw fetch — no circuit breaker, no cache, no metrics.
 * @param {object} provider
 * @returns {Promise<{latencyMs: number, slot: number}>}
 */
async function probeProvider(provider) {
  const url = provider.apiKey ? `${provider.rpcUrl}/?api-key=${provider.apiKey}` : provider.rpcUrl;

  const start = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'health', method: 'getSlot', params: [] }),
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { latencyMs: Date.now() - start, slot: data.result };
}

/**
 * Check all registered providers. Updates registry health state.
 * @returns {Promise<Array<{id: string, ok: boolean, latencyMs?: number, error?: string}>>}
 */
async function checkAll() {
  const all = providers.getAll();
  const results = await Promise.allSettled(
    all.map(async p => {
      try {
        const { latencyMs } = await probeProvider(p);
        providers.markSuccess(p.id, latencyMs);
        return { id: p.id, ok: true, latencyMs };
      } catch (err) {
        providers.markFailed(p.id);
        return { id: p.id, ok: false, error: err.message };
      }
    })
  );
  return results.map(r =>
    r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason) }
  );
}

/**
 * Get current health status of all providers (read-only snapshot).
 */
function getStatus() {
  return providers.getAll().map(p => ({
    id: p.id,
    healthy: p.health.ok,
    latencyMs: p.health.latencyMs,
    failures: p.health.failures,
    lastCheck: p.health.lastCheck,
  }));
}

/**
 * Start periodic health check loop.
 * @param {number} intervalMs  Check interval (default 30s)
 */
function start(intervalMs = 30_000) {
  stop();
  _interval = setInterval(() => {
    checkAll().catch(() => {});
  }, intervalMs);
  if (typeof _interval.unref === 'function') _interval.unref();
}

function stop() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

module.exports = { probeProvider, checkAll, getStatus, start, stop };
