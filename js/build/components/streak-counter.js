/**
 * Streak Counter Component
 * Displays current streak, bonus multiplier, and countdown
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { addClass, removeClass, setStyles } from '../utils/dom.js';
import { INTERVAL, GAMIFICATION } from '../config/timing.js';

// ============================================
// PHI CONSTANTS
// ============================================

const PHI = 1.618033988749895;
const PHI_INVERSE = 0.618033988749895;

// ============================================
// CONFIGURATION
// ============================================

const STREAK_CONFIG = {
  storageKey: 'asdf_streak',
  // 48 hours to maintain streak (same as XP manager)
  streakTimeout: 48 * 60 * 60 * 1000,
  // Max bonus is 61.8% (φ⁻¹)
  maxBonus: PHI_INVERSE,
  // Show warning when < 6 hours remaining
  warningThreshold: 6 * 60 * 60 * 1000,
  // Milestone streaks for special effects
  milestones: [3, 7, 14, 21, 30, 50, 100],
};

// ============================================
// STREAK COUNTER COMPONENT
// ============================================

let streakElement = null;
let countdownInterval = null;
let streakData = null;

const StreakCounter = {
  /**
   * Initialize streak counter
   */
  init() {
    // Load streak data
    this.load();

    // Create UI element
    this.create();

    // Subscribe to XP events
    this.bindEvents();

    // Start countdown timer
    this.startCountdown();

    console.log('[StreakCounter] Initialized', streakData);
  },

  /**
   * Load streak data from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(STREAK_CONFIG.storageKey);
      if (stored) {
        streakData = JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }

    // Initialize if not exists
    if (!streakData) {
      streakData = {
        current: 0,
        lastActivity: null,
        bestStreak: 0,
        totalDays: 0,
      };
    }

    // Check if streak is still valid
    this.checkStreak();
  },

  /**
   * Save streak data
   */
  save() {
    try {
      localStorage.setItem(STREAK_CONFIG.storageKey, JSON.stringify(streakData));
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Check and update streak status
   */
  checkStreak() {
    if (!streakData.lastActivity) return;

    const now = Date.now();
    const timeSince = now - streakData.lastActivity;

    // Check if streak expired
    if (timeSince > STREAK_CONFIG.streakTimeout) {
      if (streakData.current > 0) {
        // Emit streak lost event
        BuildState.emit('streak:lost', {
          was: streakData.current,
          bestStreak: streakData.bestStreak,
        });
      }
      streakData.current = 0;
      this.save();
    }
  },

  /**
   * Record activity and update streak
   */
  recordActivity() {
    const now = Date.now();
    const lastActivity = streakData.lastActivity;

    // Get day boundaries
    const today = this.getDayKey(now);
    const lastDay = lastActivity ? this.getDayKey(lastActivity) : null;

    if (today !== lastDay) {
      // New day - increment streak
      streakData.current++;
      streakData.totalDays++;

      // Update best streak
      if (streakData.current > streakData.bestStreak) {
        streakData.bestStreak = streakData.current;
      }

      // Check for milestone
      if (STREAK_CONFIG.milestones.includes(streakData.current)) {
        this.celebrateMilestone(streakData.current);
      }

      // Emit streak event
      BuildState.emit('streak:updated', {
        streak: streakData.current,
        bonus: this.getBonus(),
        isNew: true,
      });
    }

    streakData.lastActivity = now;
    this.save();
    this.update();
  },

  /**
   * Get day key for date comparison
   * @param {number} timestamp
   * @returns {string}
   */
  getDayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  },

  /**
   * Calculate streak bonus (φ-based)
   * @returns {number} Bonus multiplier (0 to 0.618)
   */
  getBonus() {
    if (streakData.current <= 0) return 0;

    // φ^(streak/7) - 1, capped at PHI_INVERSE
    const bonus = Math.pow(PHI, streakData.current / 7) - 1;
    return Math.min(bonus, STREAK_CONFIG.maxBonus);
  },

  /**
   * Get time remaining before streak expires
   * @returns {number} Milliseconds remaining
   */
  getTimeRemaining() {
    if (!streakData.lastActivity) return 0;

    const elapsed = Date.now() - streakData.lastActivity;
    return Math.max(0, STREAK_CONFIG.streakTimeout - elapsed);
  },

  /**
   * Create streak counter UI
   */
  create() {
    if (streakElement) return;

    streakElement = document.createElement('div');
    streakElement.className = 'streak-counter';
    streakElement.setAttribute('role', 'status');
    streakElement.setAttribute('aria-label', 'Daily streak');

    this.render();

    // Add to DOM (fixed position)
    document.body.appendChild(streakElement);

    // Animate in
    requestAnimationFrame(() => {
      addClass(streakElement, 'streak-counter--visible');
    });
  },

  /**
   * Render streak counter content
   */
  render() {
    if (!streakElement) return;

    const streak = streakData.current;
    const bonus = this.getBonus();
    const bonusPercent = Math.round(bonus * 100);
    const timeRemaining = this.getTimeRemaining();
    const isWarning = timeRemaining > 0 && timeRemaining < STREAK_CONFIG.warningThreshold;

    // Fire emoji scales with streak
    const fireLevel = streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
    const fireEmojis = ['', '&#128293;', '&#128293;&#128293;', '&#128293;&#128293;&#128293;'];

    streakElement.innerHTML = `
      <div class="streak-counter__fire">${fireEmojis[fireLevel]}</div>
      <div class="streak-counter__main">
        <span class="streak-counter__number">${streak}</span>
        <span class="streak-counter__label">day${streak !== 1 ? 's' : ''}</span>
      </div>
      ${
        bonusPercent > 0
          ? `
        <div class="streak-counter__bonus">+${bonusPercent}%</div>
      `
          : ''
      }
      ${
        isWarning
          ? `
        <div class="streak-counter__warning" title="Streak expiring soon!">
          <span class="streak-counter__countdown">${this.formatTime(timeRemaining)}</span>
        </div>
      `
          : ''
      }
    `;

    // Add warning class if needed
    if (isWarning) {
      addClass(streakElement, 'streak-counter--warning');
    } else {
      removeClass(streakElement, 'streak-counter--warning');
    }

    // Add milestone class for special streaks
    if (STREAK_CONFIG.milestones.includes(streak)) {
      addClass(streakElement, 'streak-counter--milestone');
    } else {
      removeClass(streakElement, 'streak-counter--milestone');
    }
  },

  /**
   * Update streak counter display
   */
  update() {
    this.render();
  },

  /**
   * Format time remaining
   * @param {number} ms - Milliseconds
   * @returns {string}
   */
  formatTime(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },

  /**
   * Start countdown timer
   */
  startCountdown() {
    if (countdownInterval) return;

    countdownInterval = setInterval(() => {
      this.checkStreak();
      this.update();
    }, INTERVAL.COUNTDOWN);
  },

  /**
   * Celebrate milestone achievement
   * @param {number} milestone
   */
  celebrateMilestone(milestone) {
    BuildState.emit('streak:milestone', {
      milestone,
      streak: streakData.current,
    });

    // Add celebration animation
    if (streakElement) {
      addClass(streakElement, 'streak-counter--celebrate');
      setTimeout(() => {
        removeClass(streakElement, 'streak-counter--celebrate');
      }, GAMIFICATION.CELEBRATION);
    }
  },

  /**
   * Bind to state events
   */
  bindEvents() {
    // Record activity on various actions
    BuildState.subscribe('project:select', () => {
      this.recordActivity();
    });

    BuildState.subscribe('onboarding:milestone', () => {
      this.recordActivity();
    });

    // Listen for XP events from other sources
    if (typeof window !== 'undefined' && window.eventBus) {
      window.eventBus.on('xp:gained', () => {
        this.recordActivity();
      });
    }
  },

  /**
   * Get current streak data
   * @returns {Object}
   */
  getData() {
    return { ...streakData };
  },

  /**
   * Destroy streak counter
   */
  destroy() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    if (streakElement) {
      streakElement.remove();
      streakElement = null;
    }
  },

  /**
   * Reset streak (for testing)
   */
  reset() {
    streakData = {
      current: 0,
      lastActivity: null,
      bestStreak: 0,
      totalDays: 0,
    };
    this.save();
    this.update();
  },
};

export { StreakCounter };
export default StreakCounter;

// Global export
if (typeof window !== 'undefined') {
  window.StreakCounter = StreakCounter;
}
