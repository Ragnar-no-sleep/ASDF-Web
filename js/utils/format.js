/**
 * ASDF-Web Formatting Utilities
 * Shared across all tool pages (burns, forecast, holdex, staking, ignition)
 *
 * Eliminates 4 duplicate implementations previously scattered across tool files.
 */

/**
 * Format large numbers with K/M/B suffix
 * @param {number|null|undefined} n
 * @param {number} decimals
 * @returns {string}
 * @example formatNumber(123456789) // "123.5M"
 */
export function formatNumber(n, decimals = 1) {
  if (n === null || n === undefined || n === 0) return '0';
  if (n < 1e3) return n.toString();
  if (n < 1e6) return (n / 1e3).toFixed(decimals) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(decimals) + 'M';
  return (n / 1e9).toFixed(decimals) + 'B';
}

/**
 * Truncate wallet address for display
 * @param {string} address
 * @param {number} start chars to show at start
 * @param {number} end chars to show at end
 * @returns {string}
 * @example formatWallet("12345678901234567890") // "12345678...7890"
 */
export function formatWallet(address, start = 8, end = 4) {
  if (!address || address.length <= start + end) return address;
  return address.slice(0, start) + '...' + address.slice(-end);
}

/**
 * Format a timestamp as a relative "time ago" string
 * @param {number|string} timestamp — Unix ms OR ISO 8601 string
 * @returns {string}
 * @example formatTimeAgo(Date.now() - 7200000) // "2h ago"
 * @example formatTimeAgo("2026-02-28T10:00:00Z") // "3h ago"
 */
export function formatTimeAgo(timestamp) {
  const ms = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return 'now';
}

/**
 * Format a duration in milliseconds as MM:SS
 * @param {number} ms
 * @returns {string}
 * @example formatDuration(305000) // "5:05"
 */
export function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds as "Xd Yh" period (e.g. vesting period)
 * @param {number} seconds
 * @returns {string}
 * @example formatPeriod(90000) // "1d 1h"
 */
export function formatPeriod(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return days + 'd ' + hours + 'h';
  if (hours > 0) return hours + 'h';
  return Math.floor(seconds / 60) + 'm';
}

/**
 * Format milliseconds as countdown "Xd Yh Zm" (e.g. time left until unlock)
 * @param {number} ms
 * @returns {string}
 * @example formatTimeLeft(90061000) // "1d 1h 1m"
 */
export function formatTimeLeft(ms) {
  if (ms <= 0) return 'Now';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return days + 'd ' + hours + 'h ' + mins + 'm';
  if (hours > 0) return hours + 'h ' + mins + 'm';
  return mins + 'm';
}
