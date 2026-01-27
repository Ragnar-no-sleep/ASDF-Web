/**
 * Quest Manager
 * Handles quest lifecycle, persistence, and rewards
 *
 * @module quest/manager
 *
 * @example
 * import { questManager } from './quest/manager.js';
 *
 * // Start a quest
 * await questManager.startQuest('quest-solana-basics');
 *
 * // Submit quest completion
 * await questManager.submitQuest('quest-solana-basics', { score: 85 });
 *
 * // Get quest status
 * const status = questManager.getQuestStatus('quest-solana-basics');
 */

'use strict';

import {
  QuestStateMachine,
  QUEST_STATES,
  ACTIONS,
  getStateLabel
} from './state-machine.js';
import { sync } from '../persistence/index.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('QuestManager');

// ============================================
// CONFIGURATION
// ============================================

const QUEST_CONFIG = {
  // Storage key prefix
  storagePrefix: 'quest:',
  // User quests index key
  userQuestsKey: 'user:quests',
  // Minimum score to pass (phi^-1 = 61.8%)
  passThreshold: 0.618,
  // XP multiplier for streak
  streakMultiplier: 1.1,
  // Max streak bonus
  maxStreakBonus: 2.0
};

// ============================================
// QUEST DEFINITION INTERFACE
// ============================================

/**
 * @typedef {Object} QuestDefinition
 * @property {string} id - Unique quest ID
 * @property {string} name - Display name
 * @property {string} description - Quest description
 * @property {string} track - Track ID (dev, gaming, content)
 * @property {string} module - Parent module ID
 * @property {string} type - Quest type (video, quiz, project, challenge)
 * @property {number} xp - Base XP reward
 * @property {string[]} prerequisites - Required quest IDs
 * @property {Object} content - Quest content (varies by type)
 * @property {number} estimatedTime - Estimated completion time (minutes)
 */

// ============================================
// QUEST MANAGER CLASS
// ============================================

class QuestManager {
  constructor(config = {}) {
    this.config = { ...QUEST_CONFIG, ...config };
    this.quests = new Map(); // questId -> QuestStateMachine
    this.definitions = new Map(); // questId -> QuestDefinition
    this.userId = null;
    this.initialized = false;
  }

  /**
   * Initialize quest manager for a user
   * @param {string} userId - User identifier (wallet address)
   * @returns {Promise<void>}
   */
  async init(userId) {
    if (this.initialized && this.userId === userId) {
      return;
    }

    this.userId = userId;
    this.quests.clear();

    // Load user's quest states from persistence
    await this._loadUserQuests();

    this.initialized = true;
    log.debug(`Initialized for user: ${userId}`);

    eventBus.emit(EVENTS.DATA_LOADED, { type: 'quests', userId });
  }

  /**
   * Register quest definitions
   * @param {QuestDefinition[]} definitions - Array of quest definitions
   */
  registerQuests(definitions) {
    definitions.forEach(def => {
      this.definitions.set(def.id, def);
    });

    log.debug(`Registered ${definitions.length} quest definitions`);
  }

  /**
   * Get quest definition
   * @param {string} questId
   * @returns {QuestDefinition|null}
   */
  getDefinition(questId) {
    return this.definitions.get(questId) || null;
  }

  /**
   * Get quest state machine
   * @param {string} questId
   * @returns {QuestStateMachine|null}
   */
  getQuest(questId) {
    return this.quests.get(questId) || null;
  }

  /**
   * Get quest status
   * @param {string} questId
   * @returns {Object|null}
   */
  getQuestStatus(questId) {
    const machine = this.quests.get(questId);
    const definition = this.definitions.get(questId);

    if (!definition) return null;

    const state = machine ? machine.getState() : QUEST_STATES.LOCKED;

    return {
      id: questId,
      state,
      stateLabel: getStateLabel(state),
      definition,
      canStart: this.canStartQuest(questId),
      canSubmit: state === QUEST_STATES.ACTIVE,
      canRetry: state === QUEST_STATES.FAILED,
      history: machine ? machine.getHistory() : []
    };
  }

  /**
   * Check if quest prerequisites are met
   * @param {string} questId
   * @returns {boolean}
   */
  checkPrerequisites(questId) {
    const definition = this.definitions.get(questId);
    if (!definition) return false;

    const prereqs = definition.prerequisites || [];
    if (prereqs.length === 0) return true;

    return prereqs.every(prereqId => {
      const prereqMachine = this.quests.get(prereqId);
      return prereqMachine && prereqMachine.getState() === QUEST_STATES.COMPLETED;
    });
  }

  /**
   * Check if quest can be started
   * @param {string} questId
   * @returns {boolean}
   */
  canStartQuest(questId) {
    const machine = this.quests.get(questId);
    const state = machine ? machine.getState() : QUEST_STATES.LOCKED;

    // Must be available
    if (state !== QUEST_STATES.AVAILABLE) {
      // Check if should be unlocked
      if (state === QUEST_STATES.LOCKED && this.checkPrerequisites(questId)) {
        return true; // Will be unlocked when starting
      }
      return false;
    }

    return true;
  }

  /**
   * Unlock a quest (prerequisites met)
   * @param {string} questId
   * @returns {Promise<boolean>}
   */
  async unlockQuest(questId) {
    if (!this.checkPrerequisites(questId)) {
      log.warn(`Prerequisites not met for quest: ${questId}`);
      return false;
    }

    let machine = this.quests.get(questId);

    if (!machine) {
      machine = new QuestStateMachine(questId, QUEST_STATES.LOCKED);
      this.quests.set(questId, machine);
    }

    if (machine.getState() !== QUEST_STATES.LOCKED) {
      return false;
    }

    const success = machine.perform(ACTIONS.UNLOCK);

    if (success) {
      await this._saveQuest(questId);
      eventBus.emit(EVENTS.QUEST_UNLOCKED, {
        questId,
        userId: this.userId
      });
      log.debug(`Quest unlocked: ${questId}`);
    }

    return success;
  }

  /**
   * Start a quest
   * @param {string} questId
   * @returns {Promise<boolean>}
   */
  async startQuest(questId) {
    const definition = this.definitions.get(questId);
    if (!definition) {
      log.warn(`Quest definition not found: ${questId}`);
      return false;
    }

    let machine = this.quests.get(questId);

    // Auto-unlock if needed
    if (!machine || machine.getState() === QUEST_STATES.LOCKED) {
      const unlocked = await this.unlockQuest(questId);
      if (!unlocked && (!machine || machine.getState() === QUEST_STATES.LOCKED)) {
        log.warn(`Cannot unlock quest: ${questId}`);
        return false;
      }
      machine = this.quests.get(questId);
    }

    if (!machine.canPerform(ACTIONS.START)) {
      log.warn(`Cannot start quest from state: ${machine.getState()}`);
      return false;
    }

    const success = machine.perform(ACTIONS.START, {
      startedAt: Date.now()
    });

    if (success) {
      await this._saveQuest(questId);
      eventBus.emit(EVENTS.QUEST_STARTED, {
        questId,
        userId: this.userId,
        definition
      });
      log.debug(`Quest started: ${questId}`);
    }

    return success;
  }

  /**
   * Submit quest for verification
   * @param {string} questId
   * @param {Object} submission - Submission data (score, answers, proof)
   * @returns {Promise<Object>} Result with passed, xp, feedback
   */
  async submitQuest(questId, submission = {}) {
    const machine = this.quests.get(questId);
    const definition = this.definitions.get(questId);

    if (!machine || !definition) {
      log.warn(`Quest not found: ${questId}`);
      return { passed: false, error: 'Quest not found' };
    }

    if (!machine.canPerform(ACTIONS.SUBMIT)) {
      return { passed: false, error: `Cannot submit from state: ${machine.getState()}` };
    }

    // Transition to pending
    machine.perform(ACTIONS.SUBMIT, { submission });

    eventBus.emit(EVENTS.QUEST_SUBMITTED, {
      questId,
      userId: this.userId,
      submission
    });

    // Verify submission
    const result = await this._verifySubmission(questId, submission, definition);

    if (result.passed) {
      machine.perform(ACTIONS.VERIFY, {
        verifiedAt: Date.now(),
        score: result.score,
        xp: result.xp
      });

      await this._saveQuest(questId);

      eventBus.emit(EVENTS.QUEST_VERIFIED, {
        questId,
        userId: this.userId,
        result
      });

      eventBus.emit(EVENTS.QUEST_COMPLETED, {
        questId,
        userId: this.userId,
        xp: result.xp,
        score: result.score
      });

      // Award XP
      eventBus.emit(EVENTS.XP_EARNED, {
        userId: this.userId,
        amount: result.xp,
        source: 'quest',
        questId
      });

      // Check if this unlocks other quests
      await this._checkUnlocks(questId);

      log.debug(`Quest completed: ${questId} (XP: ${result.xp})`);
    } else {
      machine.perform(ACTIONS.REJECT, {
        rejectedAt: Date.now(),
        score: result.score,
        feedback: result.feedback
      });

      await this._saveQuest(questId);

      eventBus.emit(EVENTS.QUEST_REJECTED, {
        questId,
        userId: this.userId,
        result
      });

      eventBus.emit(EVENTS.QUEST_FAILED, {
        questId,
        userId: this.userId,
        score: result.score
      });

      log.debug(`Quest failed: ${questId} (Score: ${result.score})`);
    }

    return result;
  }

  /**
   * Retry a failed quest
   * @param {string} questId
   * @returns {Promise<boolean>}
   */
  async retryQuest(questId) {
    const machine = this.quests.get(questId);

    if (!machine || !machine.canPerform(ACTIONS.RETRY)) {
      return false;
    }

    const success = machine.perform(ACTIONS.RETRY);

    if (success) {
      await this._saveQuest(questId);
      eventBus.emit(EVENTS.QUEST_UNLOCKED, {
        questId,
        userId: this.userId,
        retry: true
      });
    }

    return success;
  }

  /**
   * Abandon an active quest
   * @param {string} questId
   * @returns {Promise<boolean>}
   */
  async abandonQuest(questId) {
    const machine = this.quests.get(questId);

    if (!machine || !machine.canPerform(ACTIONS.ABANDON)) {
      return false;
    }

    const success = machine.perform(ACTIONS.ABANDON, {
      abandonedAt: Date.now()
    });

    if (success) {
      await this._saveQuest(questId);
      log.debug(`Quest abandoned: ${questId}`);
    }

    return success;
  }

  /**
   * Get all quests for a track
   * @param {string} trackId
   * @returns {Object[]}
   */
  getTrackQuests(trackId) {
    const quests = [];

    this.definitions.forEach((def, questId) => {
      if (def.track === trackId) {
        quests.push(this.getQuestStatus(questId));
      }
    });

    return quests.sort((a, b) => {
      // Sort by prerequisites (dependency order)
      const aPrereqs = a.definition.prerequisites?.length || 0;
      const bPrereqs = b.definition.prerequisites?.length || 0;
      return aPrereqs - bPrereqs;
    });
  }

  /**
   * Get all quests for a module
   * @param {string} moduleId
   * @returns {Object[]}
   */
  getModuleQuests(moduleId) {
    const quests = [];

    this.definitions.forEach((def, questId) => {
      if (def.module === moduleId) {
        quests.push(this.getQuestStatus(questId));
      }
    });

    return quests;
  }

  /**
   * Get user progress summary
   * @returns {Object}
   */
  getProgressSummary() {
    let total = 0;
    let completed = 0;
    let active = 0;
    let available = 0;
    let locked = 0;
    let failed = 0;

    this.definitions.forEach((def, questId) => {
      total++;
      const machine = this.quests.get(questId);
      const state = machine ? machine.getState() : QUEST_STATES.LOCKED;

      switch (state) {
        case QUEST_STATES.COMPLETED:
          completed++;
          break;
        case QUEST_STATES.ACTIVE:
        case QUEST_STATES.PENDING:
          active++;
          break;
        case QUEST_STATES.AVAILABLE:
          available++;
          break;
        case QUEST_STATES.FAILED:
          failed++;
          break;
        default:
          locked++;
      }
    });

    return {
      total,
      completed,
      active,
      available,
      locked,
      failed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Load user's quest states from persistence
   * @private
   */
  async _loadUserQuests() {
    const key = `${this.config.storagePrefix}${this.userId}:index`;

    try {
      const questIds = await sync.read(key, []);

      for (const questId of questIds) {
        const questData = await sync.read(
          `${this.config.storagePrefix}${this.userId}:${questId}`,
          null
        );

        if (questData) {
          const machine = QuestStateMachine.deserialize(questData);
          this.quests.set(questId, machine);
        }
      }

      log.debug(`Loaded ${this.quests.size} quests for user`);
    } catch (error) {
      log.warn(`Failed to load user quests: ${error.message}`);
    }
  }

  /**
   * Save quest state to persistence
   * @private
   */
  async _saveQuest(questId) {
    const machine = this.quests.get(questId);
    if (!machine) return;

    const key = `${this.config.storagePrefix}${this.userId}:${questId}`;
    await sync.write(key, machine.serialize());

    // Update index
    const indexKey = `${this.config.storagePrefix}${this.userId}:index`;
    const index = await sync.read(indexKey, []);

    if (!index.includes(questId)) {
      index.push(questId);
      await sync.write(indexKey, index);
    }
  }

  /**
   * Verify quest submission
   * @private
   */
  async _verifySubmission(questId, submission, definition) {
    const score = submission.score ?? 0;
    const normalizedScore = score / 100;
    const passed = normalizedScore >= this.config.passThreshold;

    // Calculate XP with potential streak bonus
    let xp = definition.xp || 0;

    if (passed) {
      // Bonus XP for high scores
      if (normalizedScore >= 0.9) {
        xp = Math.round(xp * 1.2); // 20% bonus for 90%+
      } else if (normalizedScore >= 0.8) {
        xp = Math.round(xp * 1.1); // 10% bonus for 80%+
      }
    }

    return {
      passed,
      score,
      xp: passed ? xp : 0,
      threshold: this.config.passThreshold * 100,
      feedback: passed
        ? 'Quest completed successfully!'
        : `Score ${score}% is below the ${this.config.passThreshold * 100}% threshold. Try again!`
    };
  }

  /**
   * Check if completing a quest unlocks others
   * @private
   */
  async _checkUnlocks(completedQuestId) {
    const unlocked = [];

    this.definitions.forEach((def, questId) => {
      if (def.prerequisites?.includes(completedQuestId)) {
        if (this.checkPrerequisites(questId)) {
          const machine = this.quests.get(questId);
          if (!machine || machine.getState() === QUEST_STATES.LOCKED) {
            this.unlockQuest(questId);
            unlocked.push(questId);
          }
        }
      }
    });

    if (unlocked.length > 0) {
      log.debug(`Unlocked ${unlocked.length} quests after completing ${completedQuestId}`);
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const questManager = new QuestManager();

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.questManager = questManager;
}

export default questManager;
