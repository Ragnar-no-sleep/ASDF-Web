/**
 * ASDF Tool Page Timing Constants
 *
 * Centralizes all polling intervals, animation durations, and debounce
 * values used across tool pages (burns, forecast, holdex, staking, ignition).
 *
 * Fibonacci-aligned where practical:
 * 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610...
 *
 * @see js/games/shared/timing-config.js for game-specific timings
 */

// Polling intervals — how often tool pages refresh data
export const POLL_INTERVAL = Object.freeze({
  FAST: 10_000, // 10s — forecast market state
  NORMAL: 30_000, // 30s — burns stats, forecast price
  SLOW: 60_000, // 60s — holdex tokens, staking timeline, wallet stats
});

// Animation durations
export const ANIMATION = Object.freeze({
  COUNTER: 2000, // Counter animation (burns animateCounter)
  FRAME: 16, // ~60fps frame interval
  TICK: 1000, // 1s countdown tick (forecast, ignition)
});

// Debounce intervals
export const DEBOUNCE = Object.freeze({
  SEARCH: 300, // Search input (holdex) — fib(3) × 100
});

// Cache durations
export const CACHE_TTL = Object.freeze({
  LOCKS: 10 * 60_000, // 10min — staking locks cache
});

// Time math constants (ms)
export const TIME_MS = Object.freeze({
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
});
