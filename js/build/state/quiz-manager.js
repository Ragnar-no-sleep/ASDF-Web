/**
 * Build V2 - Quiz Manager
 * Track quiz logic and results
 *
 * @version 1.0.0
 */

'use strict';

import { DEFAULTS, EVENTS } from '../config.js';
import { EventBus } from './event-bus.js';

/**
 * Validate track ID
 * @param {string} trackId
 * @returns {boolean}
 */
function isValidTrackId(trackId) {
  if (typeof trackId !== 'string') return false;
  return /^[a-z]{2,20}$/.test(trackId);
}

/**
 * Quiz Manager - Handles quiz logic and results
 */
const QuizManager = {
  /**
   * Quiz state
   */
  state: {
    answers: [],
    result: null,
    currentQuestion: 0,
    isComplete: false,
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
   * Record a quiz answer
   * @param {string} trackId - Selected track for this question
   * @returns {boolean}
   */
  recordAnswer(trackId) {
    if (!isValidTrackId(trackId)) {
      console.warn('[QuizManager] Invalid track ID:', trackId);
      return false;
    }

    this.state.answers.push(trackId);
    this.state.currentQuestion++;

    this.deps.EventBus.emit(EVENTS.QUIZ_ANSWER, {
      trackId,
      questionIndex: this.state.currentQuestion - 1,
      answers: [...this.state.answers],
    });

    return true;
  },

  /**
   * Complete the quiz and calculate result
   * @returns {string} Winning track ID
   */
  complete() {
    // Count votes per track
    const counts = {};
    this.state.answers.forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });

    // Sort by count (descending)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    // Winner is the track with most votes, or default
    const winner = sorted.length > 0 ? sorted[0][0] : DEFAULTS.defaultTrack;

    this.state.result = winner;
    this.state.isComplete = true;

    this.deps.EventBus.emit(EVENTS.QUIZ_COMPLETE, {
      result: winner,
      answers: [...this.state.answers],
      breakdown: counts,
    });

    return winner;
  },

  /**
   * Get the quiz result
   * @returns {string|null}
   */
  getResult() {
    return this.state.result;
  },

  /**
   * Get current answers
   * @returns {string[]}
   */
  getAnswers() {
    return [...this.state.answers];
  },

  /**
   * Get current question index
   * @returns {number}
   */
  getCurrentQuestion() {
    return this.state.currentQuestion;
  },

  /**
   * Check if quiz is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.state.isComplete;
  },

  /**
   * Reset quiz to start fresh
   */
  reset() {
    this.state = {
      answers: [],
      result: null,
      currentQuestion: 0,
      isComplete: false,
    };

    this.deps.EventBus.emit(EVENTS.QUIZ_START, {});
  },

  /**
   * Restore state (from persistence)
   * @param {Object} savedState
   */
  restore(savedState) {
    if (!savedState || typeof savedState !== 'object') return;

    if (Array.isArray(savedState.answers)) {
      this.state.answers = savedState.answers.filter(isValidTrackId);
    }
    if (savedState.result && isValidTrackId(savedState.result)) {
      this.state.result = savedState.result;
      this.state.isComplete = true;
    }
  },

  /**
   * Get state for persistence
   * @returns {Object}
   */
  getState() {
    return {
      answers: [...this.state.answers],
      result: this.state.result,
    };
  },
};

export { QuizManager, isValidTrackId };
export default QuizManager;
