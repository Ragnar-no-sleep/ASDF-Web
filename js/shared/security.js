/**
 * ASDF-Web — Shared Security Utilities
 *
 * Canonical escapeHtml for all browser-side scripts.
 * Load this before any page-specific JS.
 */

'use strict';

// Only define if not already defined (e.g., by games/utils.js)
if (typeof window.escapeHtml !== 'function') {
  /**
   * Escape HTML special characters to prevent XSS.
   * @param {*} text - Text to escape
   * @returns {string} Escaped text
   */
  window.escapeHtml = function escapeHtml(text) {
    if (typeof text !== 'string') return String(text ?? '');
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '`': '&#x60;',
      '=': '&#x3D;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'`=/]/g, function (c) {
      return map[c];
    });
  };
}
