/**
 * ASDF Achievement Engine
 *
 * Pure data layer — no DOM assumptions, no render logic.
 * Pages emit achievements. Hub + UI layers react via DOM events.
 *
 * Storage: localStorage now → Redis/Solana wallet later
 * Event:   'asdf:achievement-unlocked' on document
 *
 * Usage:
 *   AchievementEngine.unlock('LEARNED');
 *   AchievementEngine.isUnlocked('BELIEVER'); // → bool
 *   document.addEventListener('asdf:achievement-unlocked', e => console.log(e.detail));
 */

(function (global) {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const STORAGE_KEY = 'asdf:achievements';
  const EVENT_NAME = 'asdf:achievement-unlocked';

  // Hero's Journey — 6 stages
  // Order matters: defines progression narrative
  const DEFINITIONS = {
    ARRIVAL: {
      index: 0,
      label: 'Arrival',
      subtitle: 'You found the cosmos.',
      icon: '🌑',
      stage: 'void',
    },
    LEARNED: {
      index: 1,
      label: 'Learned',
      subtitle: 'You understand the mechanism.',
      icon: '📖',
      stage: 'newcomer',
    },
    VERIFIED: {
      index: 2,
      label: 'Verified',
      subtitle: 'The numbers confirmed it.',
      icon: '🔍',
      stage: 'curious',
    },
    BELIEVER: {
      index: 3,
      label: 'Believer',
      subtitle: 'You hold. You verify. You burn.',
      icon: '🔥',
      stage: 'believer',
    },
    BUILDER: {
      index: 4,
      label: 'Builder',
      subtitle: 'The ecosystem grows because of you.',
      icon: '🔧',
      stage: 'builder',
    },
    THE_UNNAMEABLE: {
      index: 5,
      label: '???',
      subtitle: 'Transcendence.',
      icon: 'φ',
      stage: 'transcendence',
    },
  };

  const ORDER = ['ARRIVAL', 'LEARNED', 'VERIFIED', 'BELIEVER', 'BUILDER', 'THE_UNNAMEABLE'];

  // ============================================
  // STORAGE
  // ============================================

  function load() {
    try {
      return window.ASDF.storage.get('journey_progress') || {};
    } catch (_) {
      return {};
    }
  }

  function save(state) {
    try {
      window.ASDF.storage.set('journey_progress', state);
    } catch (_) {}
  }

  // ============================================
  // CORE API
  // ============================================

  /**
   * Get full state of all achievements.
   * Returns: { ARRIVAL: { unlocked, at, wallet }, ... }
   */
  function getAll() {
    const saved = load();
    const result = {};
    ORDER.forEach(function (id) {
      result[id] = saved[id] || { unlocked: false, at: null, wallet: null };
    });
    return result;
  }

  /**
   * Check if a specific achievement is unlocked.
   */
  function isUnlocked(id) {
    const saved = load();
    return !!(saved[id] && saved[id].unlocked);
  }

  /**
   * Get progression metrics.
   * Returns: { count, total, percent, stage }
   */
  function getProgress() {
    const all = getAll();
    const count = ORDER.filter(function (id) {
      return all[id].unlocked;
    }).length;
    const total = ORDER.length;

    // Current stage = highest unlocked
    let stage = 'void';
    for (let i = ORDER.length - 1; i >= 0; i--) {
      if (all[ORDER[i]].unlocked) {
        stage = DEFINITIONS[ORDER[i]].stage;
        break;
      }
    }

    return { count: count, total: total, percent: Math.round((count / total) * 100), stage: stage };
  }

  /**
   * Unlock an achievement.
   * Returns true if newly unlocked, false if already was.
   * Emits DOM event 'asdf:achievement-unlocked'.
   */
  function unlock(id) {
    if (!DEFINITIONS[id]) {
      console.warn('[AchievementEngine] Unknown achievement:', id);
      return false;
    }
    if (isUnlocked(id)) return false; // Silent — already earned

    const state = load();
    state[id] = { unlocked: true, at: Date.now(), wallet: null };
    save(state);

    const progress = getProgress();

    try {
      document.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            id: id,
            definition: DEFINITIONS[id],
            achievement: state[id],
            progress: progress,
          },
          bubbles: true,
        })
      );
    } catch (_) {}

    return true;
  }

  /**
   * Link a wallet address to all unlocked achievements.
   * Called when user connects their Solana wallet.
   * Future: trigger on-chain registration.
   */
  function linkWallet(walletAddress) {
    if (!walletAddress) return;
    const state = load();
    let changed = false;
    ORDER.forEach(function (id) {
      if (state[id] && state[id].unlocked && !state[id].wallet) {
        state[id].wallet = walletAddress;
        changed = true;
      }
    });
    if (changed) save(state);

    try {
      document.dispatchEvent(
        new CustomEvent('asdf:wallet-linked', {
          detail: { wallet: walletAddress },
          bubbles: true,
        })
      );
    } catch (_) {}
  }

  /**
   * Auto-unlock ARRIVAL on first page load.
   * Call this once per app init.
   */
  function autoArrival() {
    unlock('ARRIVAL');
  }

  /**
   * Reset all achievements (dev only).
   * Hidden behind explicit call — never called automatically.
   */
  function reset() {
    try {
      window.ASDF.storage.remove('journey_progress');
    } catch (_) {}
  }

  // ============================================
  // PUBLIC API
  // ============================================

  const AchievementEngine = {
    // Data
    DEFINITIONS: DEFINITIONS,
    ORDER: ORDER,
    EVENT_NAME: EVENT_NAME,

    // Core
    unlock: unlock,
    isUnlocked: isUnlocked,
    getAll: getAll,
    getProgress: getProgress,

    // Lifecycle
    autoArrival: autoArrival,
    linkWallet: linkWallet,
    reset: reset,
  };

  // Expose globally (vanilla JS compat)
  global.AchievementEngine = AchievementEngine;
})(typeof window !== 'undefined' ? window : this);
