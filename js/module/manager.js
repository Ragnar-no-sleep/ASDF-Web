/**
 * Module Manager
 * Handles learning module progress and content delivery
 *
 * @module module/manager
 *
 * @example
 * import { moduleManager } from './module/manager.js';
 *
 * // Initialize for user
 * await moduleManager.init('wallet-address');
 *
 * // Start a module
 * await moduleManager.startModule('dev-solana-basics');
 *
 * // Complete a lesson
 * await moduleManager.completeLesson('dev-solana-basics', 'lesson-1');
 */

'use strict';

import { sync } from '../persistence/index.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('ModuleManager');

// ============================================
// MODULE STATES
// ============================================

export const MODULE_STATES = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

// ============================================
// LESSON TYPES
// ============================================

export const LESSON_TYPES = {
  VIDEO: 'video',
  ARTICLE: 'article',
  QUIZ: 'quiz',
  PROJECT: 'project',
  CHALLENGE: 'challenge'
};

// ============================================
// CONFIGURATION
// ============================================

const MODULE_CONFIG = {
  storagePrefix: 'module:',
  userModulesKey: 'user:modules',
  // Minimum watch percentage for video completion
  videoCompletionThreshold: 0.8,
  // Quiz pass threshold (phi^-1)
  quizPassThreshold: 0.618
};

// ============================================
// MODULE MANAGER CLASS
// ============================================

class ModuleManager {
  constructor(config = {}) {
    this.config = { ...MODULE_CONFIG, ...config };
    this.definitions = new Map(); // moduleId -> ModuleDefinition
    this.progress = new Map(); // moduleId -> ModuleProgress
    this.userId = null;
    this.initialized = false;
  }

  /**
   * Initialize module manager for a user
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   */
  async init(userId) {
    if (this.initialized && this.userId === userId) {
      return;
    }

    this.userId = userId;
    this.progress.clear();

    await this._loadUserProgress();

    this.initialized = true;
    log.debug(`Initialized for user: ${userId}`);

    eventBus.emit(EVENTS.DATA_LOADED, { type: 'modules', userId });
  }

  /**
   * Register module definitions
   * @param {Object[]} definitions - Array of module definitions
   */
  registerModules(definitions) {
    definitions.forEach(def => {
      this.definitions.set(def.id, def);
    });

    log.debug(`Registered ${definitions.length} module definitions`);
  }

  /**
   * Get module definition
   * @param {string} moduleId
   * @returns {Object|null}
   */
  getDefinition(moduleId) {
    return this.definitions.get(moduleId) || null;
  }

  /**
   * Get module progress
   * @param {string} moduleId
   * @returns {Object}
   */
  getProgress(moduleId) {
    const definition = this.definitions.get(moduleId);
    if (!definition) return null;

    const progress = this.progress.get(moduleId) || this._createDefaultProgress(moduleId);

    return {
      ...progress,
      definition,
      state: this._computeState(moduleId, progress),
      percentage: this._computePercentage(moduleId, progress)
    };
  }

  /**
   * Get module state
   * @param {string} moduleId
   * @returns {string}
   */
  getState(moduleId) {
    const progress = this.progress.get(moduleId);
    return this._computeState(moduleId, progress);
  }

  /**
   * Check if module is available
   * @param {string} moduleId
   * @returns {boolean}
   */
  isAvailable(moduleId) {
    const definition = this.definitions.get(moduleId);
    if (!definition) return false;

    const prereqs = definition.prerequisites || [];
    if (prereqs.length === 0) return true;

    return prereqs.every(prereqId => {
      const prereqState = this.getState(prereqId);
      return prereqState === MODULE_STATES.COMPLETED;
    });
  }

  /**
   * Start a module
   * @param {string} moduleId
   * @returns {Promise<boolean>}
   */
  async startModule(moduleId) {
    const definition = this.definitions.get(moduleId);
    if (!definition) {
      log.warn(`Module not found: ${moduleId}`);
      return false;
    }

    if (!this.isAvailable(moduleId)) {
      log.warn(`Module not available: ${moduleId}`);
      return false;
    }

    let progress = this.progress.get(moduleId);

    if (!progress) {
      progress = this._createDefaultProgress(moduleId);
      this.progress.set(moduleId, progress);
    }

    if (!progress.startedAt) {
      progress.startedAt = Date.now();
      await this._saveProgress(moduleId);

      eventBus.emit(EVENTS.MODULE_STARTED, {
        moduleId,
        userId: this.userId,
        definition
      });

      log.debug(`Module started: ${moduleId}`);
    }

    return true;
  }

  /**
   * Start a lesson within a module
   * @param {string} moduleId
   * @param {string} lessonId
   * @returns {Promise<Object>} Lesson content
   */
  async startLesson(moduleId, lessonId) {
    const definition = this.definitions.get(moduleId);
    if (!definition) return null;

    // Auto-start module if needed
    await this.startModule(moduleId);

    const progress = this.progress.get(moduleId);
    const lesson = definition.lessons?.find(l => l.id === lessonId);

    if (!lesson) {
      log.warn(`Lesson not found: ${lessonId} in ${moduleId}`);
      return null;
    }

    // Track lesson start
    if (!progress.lessonsStarted) {
      progress.lessonsStarted = {};
    }

    if (!progress.lessonsStarted[lessonId]) {
      progress.lessonsStarted[lessonId] = Date.now();
      await this._saveProgress(moduleId);

      eventBus.emit(EVENTS.MODULE_LESSON_START, {
        moduleId,
        lessonId,
        lesson,
        userId: this.userId
      });
    }

    return lesson;
  }

  /**
   * Complete a lesson
   * @param {string} moduleId
   * @param {string} lessonId
   * @param {Object} result - Completion result (score for quiz, etc.)
   * @returns {Promise<Object>} Completion result
   */
  async completeLesson(moduleId, lessonId, result = {}) {
    const definition = this.definitions.get(moduleId);
    if (!definition) return { success: false, error: 'Module not found' };

    const progress = this.progress.get(moduleId);
    if (!progress) return { success: false, error: 'Module not started' };

    const lesson = definition.lessons?.find(l => l.id === lessonId);
    if (!lesson) return { success: false, error: 'Lesson not found' };

    // Check completion criteria based on lesson type
    const completionResult = this._validateLessonCompletion(lesson, result);

    if (!completionResult.passed) {
      return completionResult;
    }

    // Mark as completed
    if (!progress.lessonsCompleted) {
      progress.lessonsCompleted = {};
    }

    progress.lessonsCompleted[lessonId] = {
      completedAt: Date.now(),
      score: result.score,
      timeSpent: result.timeSpent || 0
    };

    // Update total time spent
    progress.timeSpent = (progress.timeSpent || 0) + (result.timeSpent || 0);

    await this._saveProgress(moduleId);

    eventBus.emit(EVENTS.MODULE_LESSON_COMPLETE, {
      moduleId,
      lessonId,
      lesson,
      result: completionResult,
      userId: this.userId
    });

    // Check if module is complete
    const moduleComplete = await this._checkModuleCompletion(moduleId);

    return {
      success: true,
      passed: true,
      lessonComplete: true,
      moduleComplete,
      xp: lesson.xp || 0,
      ...completionResult
    };
  }

  /**
   * Update video progress
   * @param {string} moduleId
   * @param {string} lessonId
   * @param {number} watchedPercent - 0-1
   * @returns {Promise<void>}
   */
  async updateVideoProgress(moduleId, lessonId, watchedPercent) {
    const progress = this.progress.get(moduleId);
    if (!progress) return;

    if (!progress.videoProgress) {
      progress.videoProgress = {};
    }

    progress.videoProgress[lessonId] = Math.max(
      progress.videoProgress[lessonId] || 0,
      watchedPercent
    );

    // Auto-complete if threshold reached
    if (watchedPercent >= this.config.videoCompletionThreshold) {
      const lesson = this.definitions.get(moduleId)?.lessons?.find(l => l.id === lessonId);
      if (lesson && lesson.type === LESSON_TYPES.VIDEO) {
        await this.completeLesson(moduleId, lessonId, {
          watchedPercent,
          autoCompleted: true
        });
      }
    }

    eventBus.emit(EVENTS.MODULE_PROGRESS, {
      moduleId,
      lessonId,
      watchedPercent,
      userId: this.userId
    });
  }

  /**
   * Get all modules for a track
   * @param {string} trackId
   * @returns {Object[]}
   */
  getTrackModules(trackId) {
    const modules = [];

    this.definitions.forEach((def, moduleId) => {
      if (def.track === trackId) {
        modules.push(this.getProgress(moduleId));
      }
    });

    return modules;
  }

  /**
   * Get progress summary for a track
   * @param {string} trackId
   * @returns {Object}
   */
  getTrackProgress(trackId) {
    const modules = this.getTrackModules(trackId);
    const completed = modules.filter(m => m.state === MODULE_STATES.COMPLETED).length;
    const total = modules.length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalTimeSpent: modules.reduce((sum, m) => sum + (m.timeSpent || 0), 0)
    };
  }

  /**
   * Reset module progress
   * @param {string} moduleId
   * @returns {Promise<void>}
   */
  async resetModule(moduleId) {
    const progress = this._createDefaultProgress(moduleId);
    this.progress.set(moduleId, progress);
    await this._saveProgress(moduleId);

    eventBus.emit(EVENTS.MODULE_PROGRESS, {
      moduleId,
      userId: this.userId,
      reset: true
    });
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Create default progress object
   * @private
   */
  _createDefaultProgress(moduleId) {
    return {
      moduleId,
      startedAt: null,
      completedAt: null,
      lessonsStarted: {},
      lessonsCompleted: {},
      videoProgress: {},
      timeSpent: 0
    };
  }

  /**
   * Compute module state
   * @private
   */
  _computeState(moduleId, progress) {
    if (!this.isAvailable(moduleId)) {
      return MODULE_STATES.LOCKED;
    }

    if (!progress || !progress.startedAt) {
      return MODULE_STATES.AVAILABLE;
    }

    if (progress.completedAt) {
      return MODULE_STATES.COMPLETED;
    }

    return MODULE_STATES.IN_PROGRESS;
  }

  /**
   * Compute completion percentage
   * @private
   */
  _computePercentage(moduleId, progress) {
    const definition = this.definitions.get(moduleId);
    if (!definition || !definition.lessons) return 0;

    const totalLessons = definition.lessons.length;
    if (totalLessons === 0) return 0;

    const completedCount = Object.keys(progress?.lessonsCompleted || {}).length;
    return Math.round((completedCount / totalLessons) * 100);
  }

  /**
   * Validate lesson completion
   * @private
   */
  _validateLessonCompletion(lesson, result) {
    switch (lesson.type) {
      case LESSON_TYPES.QUIZ:
        const score = result.score ?? 0;
        const passed = (score / 100) >= this.config.quizPassThreshold;
        return {
          passed,
          score,
          threshold: this.config.quizPassThreshold * 100,
          feedback: passed
            ? 'Quiz passed!'
            : `Score ${score}% is below ${this.config.quizPassThreshold * 100}%`
        };

      case LESSON_TYPES.VIDEO:
        const watched = result.watchedPercent ?? 0;
        const videoComplete = watched >= this.config.videoCompletionThreshold;
        return {
          passed: videoComplete,
          watchedPercent: watched,
          feedback: videoComplete
            ? 'Video completed!'
            : `Watch at least ${this.config.videoCompletionThreshold * 100}%`
        };

      case LESSON_TYPES.ARTICLE:
      case LESSON_TYPES.PROJECT:
      case LESSON_TYPES.CHALLENGE:
      default:
        // Mark as complete if submission exists
        return {
          passed: true,
          feedback: 'Lesson completed!'
        };
    }
  }

  /**
   * Check if module is complete
   * @private
   */
  async _checkModuleCompletion(moduleId) {
    const definition = this.definitions.get(moduleId);
    const progress = this.progress.get(moduleId);

    if (!definition || !progress) return false;

    const totalLessons = definition.lessons?.length || 0;
    const completedLessons = Object.keys(progress.lessonsCompleted || {}).length;

    if (completedLessons >= totalLessons) {
      progress.completedAt = Date.now();
      await this._saveProgress(moduleId);

      // Calculate total XP
      const totalXp = definition.lessons?.reduce((sum, l) => sum + (l.xp || 0), 0) || 0;

      eventBus.emit(EVENTS.MODULE_COMPLETED, {
        moduleId,
        userId: this.userId,
        xp: totalXp,
        timeSpent: progress.timeSpent
      });

      // Emit XP earned
      eventBus.emit(EVENTS.XP_EARNED, {
        userId: this.userId,
        amount: definition.completionBonus || 0,
        source: 'module',
        moduleId
      });

      log.debug(`Module completed: ${moduleId}`);
      return true;
    }

    return false;
  }

  /**
   * Load user progress from persistence
   * @private
   */
  async _loadUserProgress() {
    const key = `${this.config.storagePrefix}${this.userId}:index`;

    try {
      const moduleIds = await sync.read(key, []);

      for (const moduleId of moduleIds) {
        const progressData = await sync.read(
          `${this.config.storagePrefix}${this.userId}:${moduleId}`,
          null
        );

        if (progressData) {
          this.progress.set(moduleId, progressData);
        }
      }

      log.debug(`Loaded progress for ${this.progress.size} modules`);
    } catch (error) {
      log.warn(`Failed to load user progress: ${error.message}`);
    }
  }

  /**
   * Save module progress to persistence
   * @private
   */
  async _saveProgress(moduleId) {
    const progress = this.progress.get(moduleId);
    if (!progress) return;

    const key = `${this.config.storagePrefix}${this.userId}:${moduleId}`;
    await sync.write(key, progress);

    // Update index
    const indexKey = `${this.config.storagePrefix}${this.userId}:index`;
    const index = await sync.read(indexKey, []);

    if (!index.includes(moduleId)) {
      index.push(moduleId);
      await sync.write(indexKey, index);
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const moduleManager = new ModuleManager();

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.moduleManager = moduleManager;
}

export default moduleManager;
