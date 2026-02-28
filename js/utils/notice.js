/**
 * ASDF-Web - Inline Notice Utility
 * Lightweight toast notification.
 * Reuses .error-inline from system.css — no new CSS required.
 *
 * Dual access: ES6 import + window.showNotice global.
 */

export function showNotice(msg) {
  const el = document.createElement('div');
  el.className = 'error-inline';
  el.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:999;max-width:340px;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); }, 4000);
}

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.showNotice = showNotice;
}
