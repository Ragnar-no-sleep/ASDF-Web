import storage from './storage.js';
/**
 * ASDF Unified Streak Manager
 * Single source of truth for daily engagement tracking
 * Logic: 48h rolling window for streak maintenance
 */

('use strict');

const STORAGE_KEY = 'asdf_streak_unified';
const TIMEOUT = 48 * 60 * 60 * 1000; // 48 hours

class StreakManager {
  constructor() {
    this.data = this.load();
    this.init();
  }

  load() {
    try {
      const stored = storage.get('streak_unified');
      return stored
        ? JSON.parse(stored)
        : {
            current: 0,
            lastActivity: null,
            bestStreak: 0,
            totalDays: 0,
          };
    } catch (e) {
      return { current: 0, lastActivity: null, bestStreak: 0, totalDays: 0 };
    }
  }

  save() {
    storage.set('streak_unified', this.data);
    // Bridge Legacy keys for backward compatibility
    // Legacy key handled by storage manager;
  }

  init() {
    this.checkExpiration();
    // Auto-record activity on load (engagement track)
    this.recordActivity();
  }

  checkExpiration() {
    if (!this.data.lastActivity) return;
    const now = Date.now();
    const timeSince = now - this.data.lastActivity;

    if (timeSince > TIMEOUT) {
      this.data.current = 0;
      this.save();
    }
  }

  recordActivity() {
    const now = Date.now();
    const lastActivity = this.data.lastActivity;

    const getDayKey = ts => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };

    const today = getDayKey(now);
    const lastDay = lastActivity ? getDayKey(lastActivity) : null;

    if (today !== lastDay) {
      this.data.current++;
      this.data.totalDays++;
      if (this.data.current > this.data.bestStreak) {
        this.data.bestStreak = this.data.current;
      }
      this.save();

      // Dispatch global event for UI components to react
      document.dispatchEvent(
        new CustomEvent('asdf:streak-updated', {
          detail: { streak: this.data.current, isNew: true },
        })
      );
    }

    this.data.lastActivity = now;
    this.save();
  }

  getStreak() {
    this.checkExpiration();
    return this.data.current;
  }
}

export const streakManager = new StreakManager();
window.ASDF = window.ASDF || {};
window.ASDF.streakManager = streakManager;
