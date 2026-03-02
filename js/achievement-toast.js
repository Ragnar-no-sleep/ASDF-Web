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
  // TOAST ELEMENT
  // ============================================

  let toastEl = null;
  let hideTimer = null;
  const queue = [];
  let showing = false;

  function createToast() {
    const el = document.createElement('div');
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

    const def = detail.definition;
    const progress = detail.progress;

    // ARRIVAL: show brief "welcome" toast on first visit only
    // (achievement-toast.js called once per session — if it triggers, it's genuinely first)
    if (detail.id === 'ARRIVAL') {
      if (!toastEl) toastEl = createToast();
      toastEl.querySelector('.asdf-toast-icon').textContent = '🌑';
      toastEl.querySelector('.asdf-toast-label').textContent = 'You found the cosmos.';
      toastEl.querySelector('.asdf-toast-sub').textContent = 'This is fine.';
      toastEl.querySelector('.asdf-toast-progress-fill').style.width = '0%';
      toastEl.querySelector('.asdf-toast-title').textContent = 'Welcome';
      toastEl.classList.add('visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        toastEl.classList.remove('visible');
        setTimeout(function () {
          toastEl.querySelector('.asdf-toast-title').textContent = 'Achievement Unlocked';
          toastEl.querySelector('.asdf-toast-progress-fill').style.width = '0%';
          showing = false;
          processQueue();
        }, 600);
      }, 3000);
      return;
    }

    toastEl.querySelector('.asdf-toast-icon').textContent = def.icon;
    toastEl.querySelector('.asdf-toast-label').textContent = def.label;
    toastEl.querySelector('.asdf-toast-sub').textContent = def.subtitle;

    const fill = toastEl.querySelector('.asdf-toast-progress-fill');

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
