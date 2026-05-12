/**
 * Helius RPC Layer — Transport (Layer 2)
 *
 * Single composition point: cache + circuit breaker + metrics + provider rotation.
 * rpcCall (JSON-RPC) and restCall (Helius REST) share the same core pipeline.
 *
 * @see docs/ARCH-HELIUS.md Section 9
 */

'use strict';

const providers = require('./providers');
const { CAPABILITIES } = providers;
const cache = require('./middleware/cache');
const circuitBreaker = require('./middleware/circuit-breaker');
const metrics = require('./middleware/metrics');
const {
  CircuitOpenError,
  NoProviderError,
  RateLimitError,
  HttpError,
  RpcError,
} = require('./errors');

// ---- Core pipeline: provider rotation + circuit breaker + metrics ----

/**
 * Execute a request across healthy providers with automatic rotation.
 * @param {string}   capability  Required provider capability
 * @param {Function} execFn      (provider) => Promise<result>
 * @param {object}   opts        { cacheKey?, cacheTTL?, label }
 * @returns {Promise<any>}
 */
async function executeWithProviders(capability, execFn, opts = {}) {
  const { cacheKey = null, cacheTTL = 0, label = 'unknown' } = opts;

  // 1. Cache check
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit !== null) {
      metrics.cacheHit(label);
      return hit;
    }
    metrics.cacheMiss(label);
  }

  // 2. Get candidates
  const candidates = providers.getHealthy(capability);
  if (candidates.length === 0) throw new NoProviderError(capability);

  // 3. Try each provider (retry = provider rotation, no sleep)
  let lastErr;
  for (const provider of candidates) {
    if (!circuitBreaker.canExecute(provider.id)) {
      lastErr = new CircuitOpenError(provider.id);
      continue;
    }

    const start = Date.now();
    try {
      const result = await execFn(provider);
      const latency = Date.now() - start;

      // 4. Success
      circuitBreaker.onSuccess(provider.id);
      providers.markSuccess(provider.id, latency);
      metrics.rpcSuccess(label, latency, provider.id);

      if (cacheKey && cacheTTL > 0) cache.set(cacheKey, result, cacheTTL);
      return result;
    } catch (err) {
      const latency = Date.now() - start;
      circuitBreaker.onFailure(provider.id);
      providers.markFailed(provider.id);
      if (err instanceof RateLimitError) metrics.rateLimited(provider.id);
      metrics.rpcError(label, latency, provider.id, err.code || err.message);
      lastErr = err;
    }
  }

  throw lastErr;
}

// ---- JSON-RPC (Solana standard + Helius extensions) ----

/**
 * @param {string}   method  RPC method name
 * @param {any[]}    params  RPC params
 * @param {object}   opts    { capability?, timeout?, cacheKey?, cacheTTL? }
 * @returns {Promise<any>}   The `result` field from JSON-RPC response
 */
async function rpcCall(method, params = [], opts = {}) {
  const { capability = CAPABILITIES.RPC, timeout = 10_000, ...rest } = opts;

  return executeWithProviders(
    capability,
    async provider => {
      const url = provider.apiKey
        ? `${provider.rpcUrl}/?api-key=${provider.apiKey}`
        : provider.rpcUrl;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(timeout),
      });

      if (res.status === 429) throw new RateLimitError(res.headers.get('retry-after'));
      if (!res.ok) throw new HttpError(res.status);

      const data = await res.json();
      if (data.error) throw new RpcError(data.error.message, data.error.code);

      return data.result;
    },
    { ...rest, label: method }
  );
}

// ---- REST API (Helius Enhanced Transactions, Wallet API) ----

/**
 * @param {string}   path    REST path (e.g., '/v0/addresses/.../transactions')
 * @param {object}   opts    { params?, timeout?, cacheKey?, cacheTTL? }
 * @returns {Promise<any>}   Parsed JSON response body
 */
async function restCall(path, opts = {}) {
  const { params = {}, timeout = 10_000, ...rest } = opts;

  return executeWithProviders(
    CAPABILITIES.ENHANCED,
    async provider => {
      if (!provider.restUrl || !provider.apiKey) {
        throw new HttpError(501);
      }

      const url = new URL(`${provider.restUrl}${path}`);
      url.searchParams.set('api-key', provider.apiKey);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });

      if (res.status === 429) throw new RateLimitError(res.headers.get('retry-after'));
      if (!res.ok) throw new HttpError(res.status);

      return res.json();
    },
    { ...rest, label: `REST:${path.split('?')[0]}` }
  );
}

module.exports = { rpcCall, restCall, executeWithProviders };
