/**
 * ASDF-Web - Inline Notice Utility
 * Lightweight toast for non-module pages (forecast, ignition).
 * Reuses .error-inline from system.css — no new CSS required.
 *
 * Usage (plain script):  showNotice('message')
 * Usage (ES module):     import { showNotice } from './utils/notice.js'
 */

function showNotice(msg) {
  var el = document.createElement('div');
  el.className = 'error-inline';
  el.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:999;max-width:340px;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () {
    el.remove();
  }, 4000);
}

// ES module export (for future module consumers)
if (typeof module !== 'undefined') {
  module.exports = { showNotice };
}
