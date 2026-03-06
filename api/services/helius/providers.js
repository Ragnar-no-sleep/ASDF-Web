/**
 * Helius RPC Layer — Provider Registry (Layer 1)
 *
 * A provider is an endpoint that can serve Solana RPC requests.
 * The registry tracks capabilities, weight, and live health state.
 *
 * @see docs/ARCH-HELIUS.md Section 5
 */

'use strict';

const CAPABILITIES = Object.freeze({
  RPC: 'rpc',
  DAS: 'das',
  ENHANCED: 'enhanced',
  PRIORITY: 'priority',
  WEBSOCKET: 'websocket',
});

/** @type {Map<string, object>} */
const registry = new Map();

/**
 * Register a provider.
 * @param {string} id        Unique identifier
 * @param {object} provider  { rpcUrl, restUrl?, apiKey?, capabilities[], weight? }
 */
function register(id, provider) {
  registry.set(id, {
    id,
    rpcUrl: provider.rpcUrl,
    restUrl: provider.restUrl || null,
    apiKey: provider.apiKey || null,
    capabilities: provider.capabilities || [CAPABILITIES.RPC],
    weight: provider.weight || 1,
    health: {
      ok: true,
      latencyMs: null,
      failures: 0,
      lastCheck: 0,
    },
  });
}

function unregister(id) {
  registry.delete(id);
}

/**
 * Get healthy providers sorted by weight (desc) then latency (asc).
 * @param {string} capability  Required capability
 * @returns {object[]}
 */
function getHealthy(capability) {
  return [...registry.values()]
    .filter(p => p.capabilities.includes(capability) && p.health.ok)
    .sort(
      (a, b) =>
        b.weight - a.weight || (a.health.latencyMs ?? Infinity) - (b.health.latencyMs ?? Infinity)
    );
}

function get(id) {
  return registry.get(id) || null;
}

function getAll() {
  return [...registry.values()];
}

function markSuccess(id, latencyMs) {
  const p = registry.get(id);
  if (!p) return;
  p.health.ok = true;
  p.health.latencyMs = latencyMs;
  p.health.failures = 0;
  p.health.lastCheck = Date.now();
}

function markFailed(id) {
  const p = registry.get(id);
  if (!p) return;
  p.health.failures++;
  p.health.lastCheck = Date.now();
}

function size() {
  return registry.size;
}

function clear() {
  registry.clear();
}

module.exports = {
  CAPABILITIES,
  register,
  unregister,
  get,
  getAll,
  getHealthy,
  markSuccess,
  markFailed,
  size,
  clear,
};
