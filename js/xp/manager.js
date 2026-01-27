/**
 * XP Manager
 * Handles experience points, levels, and streaks
 * Uses Fibonacci-based thresholds for level progression
 *
 * @module xp/manager
 *
 * @example
 * import { xpManager } from './xp/manager.js';
 *
 * await xpManager.init('wallet-address');
 * await xpManager.addXP(100, 'quest', 'quest-solana-basics');
 *
 * const profile = xpManager.getProfile();
 * console.log(`Level ${profile.level} - ${profile.xp}/${profile.nextLevelXP} XP`);
 */

'use strict';

import { sync } from '../persistence/index.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('XPManager');

// ============================================
// PHI CONSTANTS
// ============================================

const PHI = 1.618033988749895;
const PHI_INVERSE = 0.618033988749895;

// ============================================
// TRUE FIBONACCI LEVEL THRESHOLDS
// ============================================

/**
 * Generate TRUE Fibonacci XP thresholds for levels
 * Uses actual Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
 * Cumulative for level thresholds (scaled by 100 for practical XP values)
 *
 * Level 1: 0 XP
 * Level 2: 100 XP (Fib(1) * 100)
 * Level 3: 200 XP (cumulative)
 * Level 4: 400 XP (1+1+2 * 100)
 * Level 5: 700 XP (1+1+2+3 * 100)
 * ...
 */
const generateTrueFibonacciThresholds = (maxLevel = 50) => {
  const thresholds = [0]; // Level 1 starts at 0
  const baseXP = 100;

  // Generate Fibonacci sequence
  const fib = [1, 1];
  for (let i = 2; i < maxLevel; i++) {
    fib.push(fib[i - 1] + fib[i - 2]);
  }

  // Create cumulative thresholds
  let cumulative = 0;
  for (let i = 0; i < maxLevel - 1; i++) {
    cumulative += fib[i] * baseXP;
    thresholds.push(cumulative);
  }

  return thresholds;
};

// True Fibonacci thresholds:
// L1:0, L2:100, L3:200, L4:400, L5:700, L6:1200, L7:2000, L8:3300, L9:5400...
const LEVEL_THRESHOLDS = generateTrueFibonacciThresholds(50);

// ============================================
// CONFIGURATION
// ============================================

const XP_CONFIG = {
  storageKey: 'xp:profile',
  // φ-based Streak configuration
  // Formula: bonus = φ^(streak/7) - 1, capped at PHI_INVERSE (61.8%)
  // 7 days = ~61.8% bonus, 14 days = ~161.8% (capped to 61.8%)
  maxStreakBonus: PHI_INVERSE, // Max 61.8% bonus (φ⁻¹)
  streakTimeout: 48 * 60 * 60 * 1000, // 48 hours to maintain streak
  // Daily limits
  dailyXPLimit: 5000,
  // Rank titles
  ranks: [
    { level: 1, title: 'Novice', color: '#6b7280' },
    { level: 5, title: 'Apprentice', color: '#3b82f6' },
    { level: 10, title: 'Builder', color: '#10b981' },
    { level: 15, title: 'Architect', color: '#8b5cf6' },
    { level: 25, title: 'Master', color: '#f59e0b' },
    { level: 35, title: 'Legend', color: '#ef4444' },
    { level: 50, title: 'Mythic', color: '#ea4e33' }
  ]
};

// ============================================
// XP MANAGER CLASS
// ============================================

class XPManager {
  constructor(config = {}) {
    this.config = { ...XP_CONFIG, ...config };
    this.userId = null;
    this.profile = null;
    this.initialized = false;

    // Listen for XP events
    eventBus.on(EVENTS.XP_GAINED, (data) => {
      if (data.userId === this.userId) {
        this.addXP(data.amount, data.source, data.questId || data.moduleId);
      }
    });
  }

  /**
   * Initialize XP manager for a user
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   */
  async init(userId) {
    if (this.initialized && this.userId === userId) {
      return;
    }

    this.userId = userId;
    await this._loadProfile();

    // Check and update streak
    this._updateStreak();

    this.initialized = true;
    log.debug(`Initialized for user: ${userId}`);

    eventBus.emit(EVENTS.DATA_LOADED, { type: 'xp', userId });
  }

  /**
   * Get user profile
   * @returns {Object}
   */
  getProfile() {
    if (!this.profile) return null;

    const level = this._calculateLevel(this.profile.totalXP);
    const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextLevelXP = LEVEL_THRESHOLDS[level] || currentLevelXP;
    const xpInLevel = this.profile.totalXP - currentLevelXP;
    const xpForLevel = nextLevelXP - currentLevelXP;
    const progress = xpForLevel > 0 ? (xpInLevel / xpForLevel) * 100 : 100;
    const rank = this._getRank(level);

    return {
      userId: this.userId,
      totalXP: this.profile.totalXP,
      level,
      xpInLevel,
      xpForLevel,
      progress: Math.round(progress),
      nextLevelXP,
      rank: rank.title,
      rankColor: rank.color,
      streak: this.profile.streak,
      streakBonus: this._getStreakBonus(),
      todayXP: this.profile.todayXP,
      lastActivity: this.profile.lastActivity
    };
  }

  /**
   * Add XP to user
   * @param {number} amount - Base XP amount
   * @param {string} source - XP source (quest, module, bonus)
   * @param {string} sourceId - Source identifier
   * @returns {Promise<Object>} XP gain result
   */
  async addXP(amount, source = 'unknown', sourceId = null) {
    if (!this.profile) {
      log.warn('Profile not loaded');
      return { success: false, error: 'Profile not loaded' };
    }

    // Apply streak bonus
    const streakBonus = this._getStreakBonus();
    const bonusAmount = Math.round(amount * streakBonus);
    const totalAmount = amount + bonusAmount;

    // Check daily limit
    const todayKey = this._getTodayKey();
    if (this.profile.todayKey !== todayKey) {
      this.profile.todayKey = todayKey;
      this.profile.todayXP = 0;
    }

    const remainingDaily = this.config.dailyXPLimit - this.profile.todayXP;
    const cappedAmount = Math.min(totalAmount, remainingDaily);

    if (cappedAmount <= 0) {
      return {
        success: false,
        error: 'Daily XP limit reached',
        dailyLimit: this.config.dailyXPLimit
      };
    }

    const previousLevel = this._calculateLevel(this.profile.totalXP);

    // Update profile
    this.profile.totalXP += cappedAmount;
    this.profile.todayXP += cappedAmount;
    this.profile.lastActivity = Date.now();

    // Record history
    this.profile.history.push({
      amount: cappedAmount,
      baseAmount: amount,
      bonus: bonusAmount,
      source,
      sourceId,
      timestamp: Date.now()
    });

    // Keep only last 100 history entries
    if (this.profile.history.length > 100) {
      this.profile.history = this.profile.history.slice(-100);
    }

    await this._saveProfile();

    const newLevel = this._calculateLevel(this.profile.totalXP);
    const leveledUp = newLevel > previousLevel;

    // Emit events
    eventBus.emit(EVENTS.XP_GAINED, {
      userId: this.userId,
      amount: cappedAmount,
      baseAmount: amount,
      bonus: bonusAmount,
      source,
      sourceId,
      totalXP: this.profile.totalXP,
      level: newLevel
    });

    if (leveledUp) {
      const rank = this._getRank(newLevel);
      eventBus.emit(EVENTS.XP_LEVEL_UP, {
        userId: this.userId,
        previousLevel,
        newLevel,
        rank: rank.title,
        rankColor: rank.color
      });

      log.debug(`Level up! ${previousLevel} -> ${newLevel}`);
    }

    return {
      success: true,
      amount: cappedAmount,
      baseAmount: amount,
      bonus: bonusAmount,
      streakMultiplier: streakBonus,
      totalXP: this.profile.totalXP,
      level: newLevel,
      leveledUp,
      previousLevel
    };
  }

  /**
   * Update activity and maintain streak
   * @returns {Promise<void>}
   */
  async recordActivity() {
    if (!this.profile) return;

    const now = Date.now();
    const lastActivity = this.profile.lastActivity || 0;
    const timeSinceActivity = now - lastActivity;

    // Check if this is a new day
    const today = this._getTodayKey();
    const lastDay = this._getDayKey(lastActivity);

    if (today !== lastDay) {
      if (timeSinceActivity < this.config.streakTimeout) {
        // Streak continues
        this.profile.streak++;

        eventBus.emit(EVENTS.XP_STREAK, {
          userId: this.userId,
          streak: this.profile.streak,
          bonus: this._getStreakBonus()
        });

        log.debug(`Streak: ${this.profile.streak} days`);
      } else {
        // Streak broken
        if (this.profile.streak > 0) {
          log.debug(`Streak broken (was ${this.profile.streak} days)`);
        }
        this.profile.streak = 1;
      }
    }

    this.profile.lastActivity = now;
    await this._saveProfile();
  }

  /**
   * Get XP leaderboard position (mock for now)
   * @returns {Promise<Object>}
   */
  async getLeaderboardPosition() {
    // In production, this would query Redis sorted set
    return {
      rank: 1,
      totalUsers: 1,
      percentile: 100
    };
  }

  /**
   * Get XP history
   * @param {number} limit - Number of entries
   * @returns {Object[]}
   */
  getHistory(limit = 20) {
    if (!this.profile) return [];
    return this.profile.history.slice(-limit).reverse();
  }

  /**
   * Get level for given XP
   * @param {number} xp
   * @returns {number}
   */
  getLevelForXP(xp) {
    return this._calculateLevel(xp);
  }

  /**
   * Get XP required for level
   * @param {number} level
   * @returns {number}
   */
  getXPForLevel(level) {
    return LEVEL_THRESHOLDS[level - 1] || 0;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Calculate level from XP
   * @private
   */
  _calculateLevel(xp) {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get rank for level
   * @private
   */
  _getRank(level) {
    for (let i = this.config.ranks.length - 1; i >= 0; i--) {
      if (level >= this.config.ranks[i].level) {
        return this.config.ranks[i];
      }
    }
    return this.config.ranks[0];
  }

  /**
   * Get φ-based streak bonus multiplier
   * Formula: bonus = φ^(streak/7) - 1, capped at PHI_INVERSE (61.8%)
   *
   * Streak milestones:
   *   1 day  = 0% bonus
   *   3 days = ~22% bonus
   *   7 days = ~62% bonus (capped to 61.8%)
   *   21 days = 61.8% (capped)
   *
   * @private
   */
  _getStreakBonus() {
    if (!this.profile || this.profile.streak <= 1) return 0;

    // φ^(streak/7) - 1 gives natural golden ratio growth
    const bonus = Math.pow(PHI, this.profile.streak / 7) - 1;
    return Math.min(bonus, this.config.maxStreakBonus);
  }

  /**
   * Update streak on load
   * @private
   */
  _updateStreak() {
    if (!this.profile) return;

    const now = Date.now();
    const lastActivity = this.profile.lastActivity || 0;
    const timeSinceActivity = now - lastActivity;

    // Reset streak if too long since last activity
    if (timeSinceActivity > this.config.streakTimeout) {
      this.profile.streak = 0;
    }
  }

  /**
   * Get today's date key
   * @private
   */
  _getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get date key for timestamp
   * @private
   */
  _getDayKey(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  /**
   * Load profile from persistence
   * @private
   */
  async _loadProfile() {
    const key = `${this.config.storageKey}:${this.userId}`;

    try {
      const data = await sync.read(key, null);

      if (data) {
        this.profile = data;
      } else {
        this.profile = this._createDefaultProfile();
        await this._saveProfile();
      }

      log.debug(`Profile loaded: Level ${this._calculateLevel(this.profile.totalXP)}`);
    } catch (error) {
      log.warn(`Failed to load profile: ${error.message}`);
      this.profile = this._createDefaultProfile();
    }
  }

  /**
   * Save profile to persistence
   * @private
   */
  async _saveProfile() {
    const key = `${this.config.storageKey}:${this.userId}`;
    await sync.write(key, this.profile);
  }

  /**
   * Create default profile
   * @private
   */
  _createDefaultProfile() {
    return {
      totalXP: 0,
      streak: 0,
      todayXP: 0,
      todayKey: this._getTodayKey(),
      lastActivity: null,
      history: [],
      createdAt: Date.now()
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const xpManager = new XPManager();

// ============================================
// EXPORTS
// ============================================

export { LEVEL_THRESHOLDS, XP_CONFIG };

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.xpManager = xpManager;
}

export default xpManager;
