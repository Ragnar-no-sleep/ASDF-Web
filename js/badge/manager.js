/**
 * Badge Manager
 * Handles achievement badges with future cNFT integration
 *
 * @module badge/manager
 *
 * @example
 * import { badgeManager } from './badge/manager.js';
 *
 * await badgeManager.init('wallet-address');
 *
 * // Check and award badges
 * await badgeManager.checkAchievements();
 *
 * // Get user badges
 * const badges = badgeManager.getUserBadges();
 */

'use strict';

import { sync } from '../persistence/index.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('BadgeManager');

// ============================================
// BADGE TIERS
// ============================================

export const BADGE_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  LEGENDARY: 'legendary'
};

// ============================================
// BADGE CATEGORIES
// ============================================

export const BADGE_CATEGORIES = {
  QUEST: 'quest',
  MODULE: 'module',
  TRACK: 'track',
  XP: 'xp',
  STREAK: 'streak',
  COMMUNITY: 'community',
  SPECIAL: 'special'
};

// ============================================
// CONFIGURATION
// ============================================

const BADGE_CONFIG = {
  storageKey: 'badge:user',
  // cNFT settings (Helius)
  cnftEnabled: false, // Enable when ready for production
  cnftCollection: null, // Metaplex collection address
  heliusApiKey: null
};

// ============================================
// BADGE MANAGER CLASS
// ============================================

class BadgeManager {
  constructor(config = {}) {
    this.config = { ...BADGE_CONFIG, ...config };
    this.definitions = new Map(); // badgeId -> BadgeDefinition
    this.userBadges = new Map(); // badgeId -> UserBadge
    this.userId = null;
    this.initialized = false;

    // Subscribe to events for auto-checking
    this._subscribeToEvents();
  }

  /**
   * Initialize badge manager for a user
   * @param {string} userId - User identifier (wallet address)
   * @returns {Promise<void>}
   */
  async init(userId) {
    if (this.initialized && this.userId === userId) {
      return;
    }

    this.userId = userId;
    this.userBadges.clear();

    await this._loadUserBadges();

    this.initialized = true;
    log.debug(`Initialized for user: ${userId}`);

    eventBus.emit(EVENTS.DATA_LOADED, { type: 'badges', userId });
  }

  /**
   * Register badge definitions
   * @param {Object[]} definitions - Array of badge definitions
   */
  registerBadges(definitions) {
    definitions.forEach(def => {
      this.definitions.set(def.id, def);
    });

    log.debug(`Registered ${definitions.length} badge definitions`);
  }

  /**
   * Get badge definition
   * @param {string} badgeId
   * @returns {Object|null}
   */
  getDefinition(badgeId) {
    return this.definitions.get(badgeId) || null;
  }

  /**
   * Get all badge definitions
   * @returns {Object[]}
   */
  getAllDefinitions() {
    return Array.from(this.definitions.values());
  }

  /**
   * Get user's earned badges
   * @returns {Object[]}
   */
  getUserBadges() {
    const badges = [];

    this.userBadges.forEach((userBadge, badgeId) => {
      const definition = this.definitions.get(badgeId);
      if (definition) {
        badges.push({
          ...definition,
          ...userBadge,
          earned: true
        });
      }
    });

    return badges.sort((a, b) => b.earnedAt - a.earnedAt);
  }

  /**
   * Get badges by category
   * @param {string} category
   * @returns {Object[]}
   */
  getBadgesByCategory(category) {
    const badges = [];

    this.definitions.forEach((def, badgeId) => {
      if (def.category === category) {
        const userBadge = this.userBadges.get(badgeId);
        badges.push({
          ...def,
          ...userBadge,
          earned: !!userBadge
        });
      }
    });

    return badges;
  }

  /**
   * Check if user has a badge
   * @param {string} badgeId
   * @returns {boolean}
   */
  hasBadge(badgeId) {
    return this.userBadges.has(badgeId);
  }

  /**
   * Award a badge to user
   * @param {string} badgeId
   * @param {Object} metadata - Additional data (proof, source)
   * @returns {Promise<Object>} Award result
   */
  async awardBadge(badgeId, metadata = {}) {
    const definition = this.definitions.get(badgeId);

    if (!definition) {
      return { success: false, error: 'Badge not found' };
    }

    if (this.userBadges.has(badgeId)) {
      return { success: false, error: 'Badge already earned', alreadyEarned: true };
    }

    const userBadge = {
      badgeId,
      earnedAt: Date.now(),
      metadata,
      cnftMinted: false,
      cnftAddress: null
    };

    this.userBadges.set(badgeId, userBadge);
    await this._saveUserBadges();

    // Emit badge earned event
    eventBus.emit(EVENTS.BADGE_EARNED, {
      userId: this.userId,
      badge: { ...definition, ...userBadge }
    });

    // Award XP bonus if defined
    if (definition.xpBonus) {
      eventBus.emit(EVENTS.XP_EARNED, {
        userId: this.userId,
        amount: definition.xpBonus,
        source: 'badge',
        badgeId
      });
    }

    log.debug(`Badge awarded: ${badgeId} (${definition.name})`);

    // Attempt cNFT mint if enabled
    if (this.config.cnftEnabled) {
      await this._mintCNFT(badgeId, userBadge);
    }

    return {
      success: true,
      badge: { ...definition, ...userBadge }
    };
  }

  /**
   * Check achievements and award eligible badges
   * @param {Object} context - Current user stats
   * @returns {Promise<Object[]>} Newly awarded badges
   */
  async checkAchievements(context = {}) {
    const awarded = [];

    for (const [badgeId, definition] of this.definitions) {
      // Skip if already earned
      if (this.userBadges.has(badgeId)) continue;

      // Check if criteria met
      const eligible = await this._checkCriteria(definition, context);

      if (eligible) {
        const result = await this.awardBadge(badgeId, {
          autoAwarded: true,
          context
        });

        if (result.success) {
          awarded.push(result.badge);
        }
      }
    }

    if (awarded.length > 0) {
      log.debug(`Auto-awarded ${awarded.length} badges`);
    }

    return awarded;
  }

  /**
   * Get progress towards a badge
   * @param {string} badgeId
   * @param {Object} context - Current user stats
   * @returns {Object} Progress info
   */
  getProgress(badgeId, context = {}) {
    const definition = this.definitions.get(badgeId);
    if (!definition) return null;

    if (this.userBadges.has(badgeId)) {
      return { earned: true, progress: 100, current: null, target: null };
    }

    const criteria = definition.criteria;
    if (!criteria) return { earned: false, progress: 0 };

    let current = 0;
    let target = 1;

    switch (criteria.type) {
      case 'quest_count':
        current = context.questsCompleted || 0;
        target = criteria.count;
        break;

      case 'module_count':
        current = context.modulesCompleted || 0;
        target = criteria.count;
        break;

      case 'track_complete':
        current = context.trackProgress?.[criteria.track] || 0;
        target = 100;
        break;

      case 'xp_total':
        current = context.totalXP || 0;
        target = criteria.amount;
        break;

      case 'level':
        current = context.level || 1;
        target = criteria.level;
        break;

      case 'streak':
        current = context.streak || 0;
        target = criteria.days;
        break;

      default:
        return { earned: false, progress: 0, current: 0, target: 1 };
    }

    const progress = Math.min(100, Math.round((current / target) * 100));

    return {
      earned: false,
      progress,
      current,
      target
    };
  }

  /**
   * Get badge showcase (top badges for display)
   * @param {number} limit
   * @returns {Object[]}
   */
  getShowcase(limit = 5) {
    const badges = this.getUserBadges();

    // Sort by tier (legendary first) then by date
    const tierOrder = {
      [BADGE_TIERS.LEGENDARY]: 0,
      [BADGE_TIERS.PLATINUM]: 1,
      [BADGE_TIERS.GOLD]: 2,
      [BADGE_TIERS.SILVER]: 3,
      [BADGE_TIERS.BRONZE]: 4
    };

    return badges
      .sort((a, b) => {
        const tierDiff = (tierOrder[a.tier] || 5) - (tierOrder[b.tier] || 5);
        if (tierDiff !== 0) return tierDiff;
        return b.earnedAt - a.earnedAt;
      })
      .slice(0, limit);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.definitions.size;
    const earned = this.userBadges.size;

    const byTier = {};
    const byCategory = {};

    this.userBadges.forEach((userBadge, badgeId) => {
      const def = this.definitions.get(badgeId);
      if (def) {
        byTier[def.tier] = (byTier[def.tier] || 0) + 1;
        byCategory[def.category] = (byCategory[def.category] || 0) + 1;
      }
    });

    return {
      total,
      earned,
      percentage: total > 0 ? Math.round((earned / total) * 100) : 0,
      byTier,
      byCategory
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Subscribe to events for auto-checking badges
   * @private
   */
  _subscribeToEvents() {
    // Quest completed
    eventBus.on(EVENTS.QUEST_COMPLETED, async (data) => {
      if (data.userId === this.userId) {
        await this.checkAchievements({ questCompleted: data.questId });
      }
    });

    // Module completed
    eventBus.on(EVENTS.MODULE_COMPLETED, async (data) => {
      if (data.userId === this.userId) {
        await this.checkAchievements({ moduleCompleted: data.moduleId });
      }
    });

    // Level up
    eventBus.on(EVENTS.XP_LEVEL_UP, async (data) => {
      if (data.userId === this.userId) {
        await this.checkAchievements({ level: data.newLevel });
      }
    });

    // Streak update
    eventBus.on(EVENTS.XP_STREAK, async (data) => {
      if (data.userId === this.userId) {
        await this.checkAchievements({ streak: data.streak });
      }
    });
  }

  /**
   * Check if badge criteria is met
   * @private
   */
  async _checkCriteria(definition, context) {
    const criteria = definition.criteria;
    if (!criteria) return false;

    switch (criteria.type) {
      case 'quest_count':
        return (context.questsCompleted || 0) >= criteria.count;

      case 'quest_specific':
        return context.questCompleted === criteria.questId;

      case 'module_count':
        return (context.modulesCompleted || 0) >= criteria.count;

      case 'module_specific':
        return context.moduleCompleted === criteria.moduleId;

      case 'track_complete':
        return (context.trackProgress?.[criteria.track] || 0) >= 100;

      case 'xp_total':
        return (context.totalXP || 0) >= criteria.amount;

      case 'level':
        return (context.level || 1) >= criteria.level;

      case 'streak':
        return (context.streak || 0) >= criteria.days;

      case 'first_action':
        return context[criteria.action] === true;

      case 'custom':
        // Custom criteria function
        if (typeof criteria.check === 'function') {
          return criteria.check(context);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Mint cNFT for badge (future Helius integration)
   * @private
   */
  async _mintCNFT(badgeId, userBadge) {
    if (!this.config.cnftEnabled || !this.config.heliusApiKey) {
      return;
    }

    try {
      // TODO: Implement Helius cNFT minting
      // const helius = new Helius(this.config.heliusApiKey);
      // const result = await helius.mintCompressedNft({
      //   name: definition.name,
      //   symbol: 'ASDF',
      //   uri: definition.metadataUri,
      //   collection: this.config.cnftCollection,
      //   owner: this.userId
      // });

      log.debug(`cNFT minting not yet implemented for badge: ${badgeId}`);
    } catch (error) {
      log.warn(`cNFT minting failed for ${badgeId}: ${error.message}`);
    }
  }

  /**
   * Load user badges from persistence
   * @private
   */
  async _loadUserBadges() {
    const key = `${this.config.storageKey}:${this.userId}`;

    try {
      const data = await sync.read(key, {});

      if (data.badges) {
        Object.entries(data.badges).forEach(([badgeId, userBadge]) => {
          this.userBadges.set(badgeId, userBadge);
        });
      }

      log.debug(`Loaded ${this.userBadges.size} badges for user`);
    } catch (error) {
      log.warn(`Failed to load user badges: ${error.message}`);
    }
  }

  /**
   * Save user badges to persistence
   * @private
   */
  async _saveUserBadges() {
    const key = `${this.config.storageKey}:${this.userId}`;

    const badges = {};
    this.userBadges.forEach((userBadge, badgeId) => {
      badges[badgeId] = userBadge;
    });

    await sync.write(key, { badges, updatedAt: Date.now() });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const badgeManager = new BadgeManager();

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.badgeManager = badgeManager;
}

export default badgeManager;
