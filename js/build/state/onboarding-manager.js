/**
 * Build V2 - Onboarding Manager
 * FTUE (First-Time User Experience) milestone tracking
 *
 * @version 1.0.0
 */

'use strict';

import { EventBus } from './event-bus.js';

/**
 * Core milestones for onboarding completion
 */
const CORE_MILESTONES = ['introSeen', 'firstProjectClick', 'firstQuizComplete', 'firstTrackStart'];

/**
 * Onboarding Manager - Tracks user onboarding progress
 */
const OnboardingManager = {
  /**
   * Onboarding state
   */
  state: {
    introSeen: false,
    firstProjectClick: false,
    firstQuizComplete: false,
    firstTrackStart: false,
    firstModuleComplete: false,
    exploredProjects: 0,
    lastMilestoneAt: null,
  },

  /**
   * Dependency injection
   */
  deps: {
    EventBus,
  },

  /**
   * Configure dependencies
   * @param {Object} options
   */
  configure(options = {}) {
    if (options.deps) {
      this.deps = { ...this.deps, ...options.deps };
    }
    return this;
  },

  /**
   * Complete a milestone
   * @param {string} milestone - Milestone key
   * @returns {boolean} Whether milestone was newly completed
   */
  completeMilestone(milestone) {
    // Skip if already completed (except counters)
    if (milestone !== 'exploredProjects' && this.state[milestone]) {
      return false;
    }

    if (milestone === 'exploredProjects') {
      this.state.exploredProjects = (this.state.exploredProjects || 0) + 1;
    } else if (milestone in this.state) {
      this.state[milestone] = true;
    } else {
      console.warn('[OnboardingManager] Unknown milestone:', milestone);
      return false;
    }

    this.state.lastMilestoneAt = Date.now();

    this.deps.EventBus.emit('onboarding:milestone', {
      milestone,
      onboarding: this.getState(),
    });

    // Check if core onboarding is complete
    this._checkComplete();

    return true;
  },

  /**
   * Check if core onboarding is complete
   * @private
   */
  _checkComplete() {
    const { introSeen, firstProjectClick, firstQuizComplete } = this.state;
    if (introSeen && firstProjectClick && firstQuizComplete) {
      this.deps.EventBus.emit('onboarding:complete', {
        onboarding: this.getState(),
      });
    }
  },

  /**
   * Get onboarding progress (0-100)
   * @returns {number}
   */
  getProgress() {
    const completed = CORE_MILESTONES.filter(m => this.state[m]).length;
    return Math.round((completed / CORE_MILESTONES.length) * 100);
  },

  /**
   * Check if a milestone is completed
   * @param {string} milestone
   * @returns {boolean}
   */
  isMilestoneCompleted(milestone) {
    if (milestone === 'exploredProjects') {
      return this.state.exploredProjects > 0;
    }
    return Boolean(this.state[milestone]);
  },

  /**
   * Check if all core milestones are completed
   * @returns {boolean}
   */
  isComplete() {
    return CORE_MILESTONES.every(m => this.state[m]);
  },

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  },

  /**
   * Restore state (from persistence)
   * @param {Object} savedState
   */
  restore(savedState) {
    if (!savedState || typeof savedState !== 'object') return;

    Object.keys(this.state).forEach(key => {
      if (key in savedState) {
        if (key === 'exploredProjects') {
          const num = Number(savedState[key]);
          this.state[key] = Number.isFinite(num) && num >= 0 ? num : 0;
        } else if (key === 'lastMilestoneAt') {
          const ts = Number(savedState[key]);
          this.state[key] = Number.isFinite(ts) ? ts : null;
        } else {
          this.state[key] = Boolean(savedState[key]);
        }
      }
    });
  },

  /**
   * Reset all milestones
   */
  reset() {
    this.state = {
      introSeen: false,
      firstProjectClick: false,
      firstQuizComplete: false,
      firstTrackStart: false,
      firstModuleComplete: false,
      exploredProjects: 0,
      lastMilestoneAt: null,
    };
  },
};

export { OnboardingManager, CORE_MILESTONES };
export default OnboardingManager;
