/**
 * ASDF Achievement Toast
 *
 * UI layer — listens to AchievementEngine events, shows toast.
 * Self-contained: injects its own CSS, no external deps.
 * Requires achievements.js to be loaded first.
 *
 * Usage:
 *   <script src="js/achievements.js"></script>
 *   <script src="js/achievement-toast.js"></script>
 *   AchievementToast.init(); // once per page
 */

(function (global) {
  'use strict';

  // ============================================
  // CSS — injected once
  // ============================================

  var CSS = [
    '.asdf-toast {',
    '  position: fixed;',
    '  top: 21px;' /* F8 — Fibonacci */,
    '  right: 21px;',
    '  z-index: 9998;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 13px;' /* F7 */,
    '  padding: 13px 21px;' /* F7 F8 */,
    '  background: rgba(13, 9, 6, 0.95);',
    '  border: 1px solid rgba(234, 179, 8, 0.5);',
    '  border-radius: 13px;',
    '  backdrop-filter: blur(8px);',
    '  box-shadow: 0 0 34px rgba(234, 179, 8, 0.15);',
    '  font-family: "JetBrains Mono", monospace;',
    '  color: #faf8f5;',
    '  pointer-events: none;',
    '  transform: translateX(calc(100% + 34px));',
    '  transition: transform 0.5s cubic-bezier(0.618, 0, 0.382, 1),',
    '              opacity 0.5s cubic-bezier(0.618, 0, 0.382, 1);',
    '  opacity: 0;',
    '  will-change: transform, opacity;',
    '}',
    '.asdf-toast.visible {',
    '  transform: translateX(0);',
    '  opacity: 1;',
    '}',
    '.asdf-toast-icon {',
    '  font-size: 24px;',
    '  line-height: 1;',
    '  flex-shrink: 0;',
    '}',
    '.asdf-toast-body {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 3px;',
    '}',
    '.asdf-toast-title {',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '  letter-spacing: 0.1em;',
    '  text-transform: uppercase;',
    '  color: rgba(234, 179, 8, 0.6);',
    '}',
    '.asdf-toast-label {',
    '  font-size: 16px;',
    '  font-weight: 600;',
    '  color: #eab308;',
    '}',
    '.asdf-toast-sub {',
    '  font-size: 11px;',
    '  color: rgba(250, 248, 245, 0.55);',
    '  font-family: "Inter", sans-serif;',
    '  margin-top: 2px;',
    '}',
    '.asdf-toast-progress {',
    '  margin-top: 8px;',
    '  height: 2px;',
    '  background: rgba(234, 179, 8, 0.12);',
    '  border-radius: 1px;',
    '  overflow: hidden;',
    '}',
    '.asdf-toast-progress-fill {',
    '  height: 100%;',
    '  background: linear-gradient(90deg, #eab308, #f59e0b);',
    '  transition: width 0.8s cubic-bezier(0.618, 0, 0.382, 1);',
    '  width: 0%;',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .asdf-toast { transition: opacity 0.2s; transform: translateX(0); }',
    '}',
  ].join('\n');

  var cssInjected = false;

  function injectCSS() {
    if (cssInjected) return;
    var style = document.createElement('style');
    style.id = 'asdf-achievement-toast-css';
    style.textContent = CSS;
    document.head.appendChild(style);
    cssInjected = true;
  }

  // ============================================
  // TOAST ELEMENT
  // ============================================

  var toastEl = null;
  var hideTimer = null;
  var queue = [];
  var showing = false;

  function createToast() {
    var el = document.createElement('div');
    el.className = 'asdf-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = [
      '<div class="asdf-toast-icon"></div>',
      '<div class="asdf-toast-body">',
      '  <div class="asdf-toast-title">Achievement Unlocked</div>',
      '  <div class="asdf-toast-label"></div>',
      '  <div class="asdf-toast-sub"></div>',
      '  <div class="asdf-toast-progress">',
      '    <div class="asdf-toast-progress-fill"></div>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(el);
    return el;
  }

  function showToast(detail) {
    if (!toastEl) toastEl = createToast();

    var def = detail.definition;
    var progress = detail.progress;

    // Special case: ARRIVAL is silent (too common, not surprising)
    if (detail.id === 'ARRIVAL') return;

    toastEl.querySelector('.asdf-toast-icon').textContent = def.icon;
    toastEl.querySelector('.asdf-toast-label').textContent = def.label;
    toastEl.querySelector('.asdf-toast-sub').textContent = def.subtitle;

    var fill = toastEl.querySelector('.asdf-toast-progress-fill');

    // Show
    toastEl.classList.add('visible');

    // Animate progress bar after brief delay
    setTimeout(function () {
      fill.style.width = progress.percent + '%';
    }, 100);

    // Auto-hide after F9=34 * 100ms = 3.4s (rounded: 4s)
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      toastEl.classList.remove('visible');
      // Reset progress fill after transition
      setTimeout(function () {
        fill.style.width = '0%';
        showing = false;
        processQueue();
      }, 600);
    }, 4000);
  }

  function processQueue() {
    if (showing || queue.length === 0) return;
    showing = true;
    showToast(queue.shift());
  }

  // ============================================
  // INIT
  // ============================================

  /**
   * Initialize toast — listens for achievement events.
   * Call once per page load.
   */
  function init() {
    injectCSS();

    document.addEventListener(
      global.AchievementEngine ? global.AchievementEngine.EVENT_NAME : 'asdf:achievement-unlocked',
      function (e) {
        queue.push(e.detail);
        processQueue();
      }
    );
  }

  // ============================================
  // PUBLIC API
  // ============================================

  global.AchievementToast = {
    init: init,
  };
})(typeof window !== 'undefined' ? window : this);
