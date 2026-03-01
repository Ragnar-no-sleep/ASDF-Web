/**
 * HTML Escape Utility
 * Prevents XSS by escaping dangerous characters in user-supplied strings.
 * Shared across all tool pages (staking, holdex, forecast).
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '`': '&#x60;',
  '=': '&#x3D;',
  '/': '&#x2F;',
};

const ESCAPE_RE = /[&<>"'`=/]/g;

/**
 * Escape a string for safe HTML insertion
 * @param {*} s — value to escape (non-strings coerced via String())
 * @returns {string}
 */
export function esc(s) {
  if (typeof s !== 'string') return String(s ?? '');
  return s.replace(ESCAPE_RE, c => ESCAPE_MAP[c]);
}
