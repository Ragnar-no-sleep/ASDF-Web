/**
 * Helius RPC Layer — Circuit Breaker Middleware
 *
 * Per-provider 3-state FSM: CLOSED -> OPEN -> HALF_OPEN -> CLOSED.
 * Single implementation — used by transport.js only.
 *
 * @see docs/ARCH-HELIUS.md Section 7
 */

'use strict';

//  CLOSED --(N failures)--> OPEN --(cooldown)--> HALF_OPEN
//    ^                                              |
//    +-------(probe success)------------------------+
//              (probe failure) --> OPEN

const STATE = Object.freeze({ CLOSED: 0, OPEN: 1, HALF_OPEN: 2 });

const THRESHOLD = 3;
const COOLDOWN_MS = 30_000;

/** @type {Map<string, {state: number, failures: number, lastTrip: number}>} */
const circuits = new Map();

function _getOrCreate(id) {
  if (!circuits.has(id)) {
    circuits.set(id, { state: STATE.CLOSED, failures: 0, lastTrip: 0 });
  }
  return circuits.get(id);
}

function canExecute(id) {
  const c = _getOrCreate(id);
  if (c.state === STATE.CLOSED) return true;
  if (c.state === STATE.OPEN) {
    if (Date.now() - c.lastTrip >= COOLDOWN_MS) {
      c.state = STATE.HALF_OPEN;
      return true;
    }
    return false;
  }
  // HALF_OPEN: already probing — block concurrent probes
  return false;
}

function onSuccess(id) {
  const c = _getOrCreate(id);
  c.state = STATE.CLOSED;
  c.failures = 0;
}

function onFailure(id) {
  const c = _getOrCreate(id);
  c.failures++;
  if (c.failures >= THRESHOLD || c.state === STATE.HALF_OPEN) {
    c.state = STATE.OPEN;
    c.lastTrip = Date.now();
    c.failures = 0;
  }
}

function getState(id) {
  const c = circuits.get(id);
  if (!c) return 'CLOSED';
  return Object.keys(STATE).find(k => STATE[k] === c.state) || 'CLOSED';
}

function reset(id) {
  circuits.delete(id);
}

function resetAll() {
  circuits.clear();
}

module.exports = {
  canExecute,
  onSuccess,
  onFailure,
  getState,
  reset,
  resetAll,
  STATE,
  THRESHOLD,
  COOLDOWN_MS,
};
