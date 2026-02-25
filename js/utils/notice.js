/**
 * ASDF-Web - Inline Notice Utility
 * Lightweight toast for non-module pages (forecast, ignition).
 * Reuses .error-inline from system.css — no new CSS required.
 *
 * Loaded as plain <script> — defines window.showNotice global.
 * TODO(F1/I1): add `export function showNotice` once forecast + ignition
 *              are converted to type="module".
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
