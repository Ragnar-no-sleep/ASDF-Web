/**
 * Learn & Build System
 * Central integration module for quest, module, XP, and badge systems
 *
 * @module learn-build
 *
 * @example
 * import { LearnBuild } from './learn-build/index.js';
 *
 * // Initialize all systems
 * await LearnBuild.init('wallet-address');
 *
 * // Access subsystems
 * const profile = LearnBuild.xp.getProfile();
 * const badges = LearnBuild.badge.getUserBadges();
 *
 * // Start learning
 * await LearnBuild.quest.startQuest('quest-solana-basics');
 */

'use strict';

// Core systems
import { questManager, QUEST_STATES, ACTIONS } from '../quest/index.js';
import { moduleManager, MODULE_STATES, LESSON_TYPES, ModulePlayer } from '../module/index.js';
import { xpManager, LEVEL_THRESHOLDS } from '../xp/index.js';
import { badgeManager, BADGE_DEFINITIONS, BADGE_TIERS, BADGE_CATEGORIES } from '../badge/index.js';

// Persistence
import { sync } from '../persistence/index.js';

// Core utilities
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

// Sample data
import { ALL_QUESTS, QUEST_TYPES } from './quests.js';
import { ALL_MODULES } from './modules.js';

const log = createLogger('LearnBuild');

// ============================================
// LEARN & BUILD SYSTEM
// ============================================

class LearnBuildSystem {
  constructor() {
    this.initialized = false;
    this.userId = null;

    // Expose subsystems
    this.quest = questManager;
    this.module = moduleManager;
    this.xp = xpManager;
    this.badge = badgeManager;
    this.sync = sync;
    this.events = eventBus;

    // Expose constants
    this.QUEST_STATES = QUEST_STATES;
    this.ACTIONS = ACTIONS;
    this.MODULE_STATES = MODULE_STATES;
    this.LESSON_TYPES = LESSON_TYPES;
    this.BADGE_TIERS = BADGE_TIERS;
    this.BADGE_CATEGORIES = BADGE_CATEGORIES;
    this.LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
    this.EVENTS = EVENTS;

    // Player factory
    this.ModulePlayer = ModulePlayer;
  }

  /**
   * Initialize all Learn & Build systems
   * @param {string} userId - User identifier (wallet address)
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} Initialization result
   */
  async init(userId, options = {}) {
    if (this.initialized && this.userId === userId) {
      log.debug('Already initialized for user');
      return { success: true, cached: true };
    }

    const startTime = Date.now();
    this.userId = userId;

    try {
      // Start background sync
      sync.startBackgroundSync();

      // Initialize all managers in parallel
      await Promise.all([
        questManager.init(userId),
        moduleManager.init(userId),
        xpManager.init(userId),
        badgeManager.init(userId)
      ]);

      // Register default badge definitions
      badgeManager.registerBadges(BADGE_DEFINITIONS);

      // Register quest definitions if provided
      if (options.quests) {
        questManager.registerQuests(options.quests);
      }

      // Register module definitions if provided
      if (options.modules) {
        moduleManager.registerModules(options.modules);
      }

      // Record activity for streak
      await xpManager.recordActivity();

      // Initial badge check
      const context = await this._buildContext();
      await badgeManager.checkAchievements(context);

      this.initialized = true;

      const duration = Date.now() - startTime;
      log.debug(`Initialized in ${duration}ms`);

      eventBus.emit(EVENTS.DATA_LOADED, {
        type: 'learn-build',
        userId,
        duration
      });

      return {
        success: true,
        userId,
        duration,
        profile: this.getProfile()
      };

    } catch (error) {
      log.warn(`Initialization failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive user profile
   * @returns {Object}
   */
  getProfile() {
    if (!this.initialized) return null;

    const xpProfile = xpManager.getProfile();
    const questProgress = questManager.getProgressSummary();
    const badgeStats = badgeManager.getStats();
    const showcase = badgeManager.getShowcase(5);

    return {
      userId: this.userId,
      xp: xpProfile,
      quests: questProgress,
      badges: {
        ...badgeStats,
        showcase
      },
      tracks: {
        dev: moduleManager.getTrackProgress('dev'),
        gaming: moduleManager.getTrackProgress('gaming'),
        content: moduleManager.getTrackProgress('content')
      }
    };
  }

  /**
   * Get dashboard data
   * @returns {Object}
   */
  getDashboard() {
    if (!this.initialized) return null;

    const profile = this.getProfile();

    return {
      ...profile,
      recentBadges: badgeManager.getUserBadges().slice(0, 3),
      activeQuests: this._getActiveQuests(),
      nextMilestones: this._getNextMilestones(),
      dailyProgress: {
        xpToday: profile.xp?.todayXP || 0,
        dailyLimit: 5000,
        streak: profile.xp?.streak || 0
      }
    };
  }

  /**
   * Quick action: Start a quest
   * @param {string} questId
   * @returns {Promise<Object>}
   */
  async startQuest(questId) {
    const result = await questManager.startQuest(questId);
    if (result) {
      await xpManager.recordActivity();
    }
    return result;
  }

  /**
   * Quick action: Submit quest
   * @param {string} questId
   * @param {Object} submission
   * @returns {Promise<Object>}
   */
  async submitQuest(questId, submission) {
    const result = await questManager.submitQuest(questId, submission);
    if (result.passed) {
      await this._checkAchievements();
    }
    return result;
  }

  /**
   * Quick action: Complete lesson
   * @param {string} moduleId
   * @param {string} lessonId
   * @param {Object} result
   * @returns {Promise<Object>}
   */
  async completeLesson(moduleId, lessonId, result) {
    const completion = await moduleManager.completeLesson(moduleId, lessonId, result);
    if (completion.success) {
      await xpManager.recordActivity();
      await this._checkAchievements();
    }
    return completion;
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    sync.stopBackgroundSync();
    this.initialized = false;
    this.userId = null;
    log.debug('Destroyed');
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build context for badge checking
   * @private
   */
  async _buildContext() {
    const xpProfile = xpManager.getProfile() || {};
    const questSummary = questManager.getProgressSummary();

    // Count completed modules
    let modulesCompleted = 0;
    ['dev', 'gaming', 'content'].forEach(trackId => {
      const progress = moduleManager.getTrackProgress(trackId);
      modulesCompleted += progress.completed || 0;
    });

    return {
      totalXP: xpProfile.totalXP || 0,
      level: xpProfile.level || 1,
      streak: xpProfile.streak || 0,
      questsCompleted: questSummary.completed || 0,
      modulesCompleted,
      trackProgress: {
        dev: moduleManager.getTrackProgress('dev')?.percentage || 0,
        gaming: moduleManager.getTrackProgress('gaming')?.percentage || 0,
        content: moduleManager.getTrackProgress('content')?.percentage || 0
      }
    };
  }

  /**
   * Check achievements with current context
   * @private
   */
  async _checkAchievements() {
    const context = await this._buildContext();
    await badgeManager.checkAchievements(context);
  }

  /**
   * Get active quests
   * @private
   */
  _getActiveQuests() {
    const active = [];

    questManager.definitions.forEach((def, questId) => {
      const status = questManager.getQuestStatus(questId);
      if (status && (status.state === QUEST_STATES.ACTIVE || status.state === QUEST_STATES.PENDING)) {
        active.push(status);
      }
    });

    return active;
  }

  /**
   * Get next milestones
   * @private
   */
  _getNextMilestones() {
    const milestones = [];
    const profile = xpManager.getProfile();

    if (profile) {
      // Next level
      milestones.push({
        type: 'level',
        name: `Level ${profile.level + 1}`,
        current: profile.xpInLevel,
        target: profile.xpForLevel,
        progress: profile.progress
      });

      // Next streak milestone
      const streakMilestones = [3, 7, 21, 30, 100];
      const nextStreak = streakMilestones.find(s => s > profile.streak);
      if (nextStreak) {
        milestones.push({
          type: 'streak',
          name: `${nextStreak}-Day Streak`,
          current: profile.streak,
          target: nextStreak,
          progress: Math.round((profile.streak / nextStreak) * 100)
        });
      }
    }

    // Next badge (find closest to completion)
    const allBadges = badgeManager.getAllDefinitions();
    let closestBadge = null;
    let closestProgress = 0;

    allBadges.forEach(def => {
      if (!badgeManager.hasBadge(def.id)) {
        const progress = badgeManager.getProgress(def.id, this._buildContextSync());
        if (progress && progress.progress > closestProgress && progress.progress < 100) {
          closestProgress = progress.progress;
          closestBadge = { ...def, ...progress };
        }
      }
    });

    if (closestBadge) {
      milestones.push({
        type: 'badge',
        name: closestBadge.name,
        current: closestBadge.current,
        target: closestBadge.target,
        progress: closestBadge.progress,
        icon: closestBadge.icon
      });
    }

    return milestones;
  }

  /**
   * Build context synchronously (for progress checks)
   * @private
   */
  _buildContextSync() {
    const xpProfile = xpManager.getProfile() || {};
    const questSummary = questManager.getProgressSummary();

    let modulesCompleted = 0;
    ['dev', 'gaming', 'content'].forEach(trackId => {
      const progress = moduleManager.getTrackProgress(trackId);
      modulesCompleted += progress.completed || 0;
    });

    return {
      totalXP: xpProfile.totalXP || 0,
      level: xpProfile.level || 1,
      streak: xpProfile.streak || 0,
      questsCompleted: questSummary.completed || 0,
      modulesCompleted,
      trackProgress: {
        dev: moduleManager.getTrackProgress('dev')?.percentage || 0,
        gaming: moduleManager.getTrackProgress('gaming')?.percentage || 0,
        content: moduleManager.getTrackProgress('content')?.percentage || 0
      }
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const LearnBuild = new LearnBuildSystem();

// ============================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================

export {
  // Managers
  questManager,
  moduleManager,
  xpManager,
  badgeManager,

  // Constants
  QUEST_STATES,
  ACTIONS,
  MODULE_STATES,
  LESSON_TYPES,
  BADGE_TIERS,
  BADGE_CATEGORIES,
  LEVEL_THRESHOLDS,
  BADGE_DEFINITIONS,
  QUEST_TYPES,

  // Sample data
  ALL_QUESTS,
  ALL_MODULES,

  // Components
  ModulePlayer,

  // Core
  sync,
  eventBus,
  EVENTS
};

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.LearnBuild = LearnBuild;
}

export default LearnBuild;
