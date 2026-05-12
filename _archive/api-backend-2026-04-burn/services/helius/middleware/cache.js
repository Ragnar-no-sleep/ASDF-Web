/**
 * Helius RPC Layer — Cache Middleware
 *
 * Shared TTL Map for the transport layer.
 * Single instance, used by transport.js only.
 *
 * @see docs/ARCH-HELIUS.md Section 6
 */

'use strict';

/** @type {Map<string, {value: any, expiresAt: number}>} */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function del(key) {
  store.delete(key);
}

/**
 * Invalidate all keys matching a prefix.
 * invalidate('bal:') clears all balance cache entries.
 * @param {string} prefix
 */
function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

function clear() {
  store.clear();
}

function size() {
  return store.size;
}

// Cleanup expired entries every 5 minutes
const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
}, 5 * 60_000);
if (typeof _cleanupTimer.unref === 'function') _cleanupTimer.unref();

module.exports = { get, set, del, invalidate, clear, size };
