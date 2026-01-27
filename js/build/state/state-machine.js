/**
 * Build V2 - State Machine
 * Finite state machine for Build page navigation
 *
 * @version 1.0.0
 */

'use strict';

import { STATES, TRANSITIONS, DEFAULTS, EVENTS } from '../config.js';
import { EventBus } from './event-bus.js';

/**
 * Validate state name
 * @param {string} state
 * @returns {boolean}
 */
function isValidState(state) {
  return Object.values(STATES).includes(state);
}

/**
 * State Machine - Manages state transitions
 */
const StateMachine = {
  /** @type {string} */
  _currentState: DEFAULTS.initialState,

  /** @type {string|null} */
  _previousState: null,

  /** @type {Array<{state: string, timestamp: number, payload: Object}>} */
  _history: [],

  /** Maximum history size */
  _maxHistory: 50,

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
   * Get current state
   * @returns {string}
   */
  get currentState() {
    return this._currentState;
  },

  /**
   * Get previous state
   * @returns {string|null}
   */
  get previousState() {
    return this._previousState;
  },

  /**
   * Check if transition is valid
   * @param {string} from - Source state
   * @param {string} to - Target state
   * @returns {boolean}
   */
  canTransition(from, to) {
    if (!isValidState(from) || !isValidState(to)) return false;
    const allowed = TRANSITIONS[from];
    return allowed && allowed.includes(to);
  },

  /**
   * Transition to a new state
   * @param {string} newState - Target state
   * @param {Object} payload - Optional payload data
   * @returns {boolean} Success status
   */
  transition(newState, payload = {}) {
    if (!isValidState(newState)) {
      console.warn('[StateMachine] Invalid state:', newState);
      return false;
    }

    // Allow same-state transitions with different payloads
    if (newState === this._currentState && !payload.force) {
      this.deps.EventBus.emit(EVENTS.STATE_CHANGE, { state: newState, payload });
      return true;
    }

    // Check if transition is valid (or bypass with force)
    if (!payload.force && !this.canTransition(this._currentState, newState)) {
      console.warn('[StateMachine] Invalid transition:', this._currentState, '->', newState);
      return false;
    }

    const oldState = this._currentState;
    this._previousState = oldState;
    this._currentState = newState;

    // Track history
    this._history.push({
      state: newState,
      timestamp: Date.now(),
      payload,
    });

    // Limit history
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory);
    }

    // Emit events
    this.deps.EventBus.emit(`${EVENTS.STATE_EXIT}:${oldState}`, {
      from: oldState,
      to: newState,
      payload,
    });
    this.deps.EventBus.emit(`${EVENTS.STATE_ENTER}:${newState}`, {
      from: oldState,
      to: newState,
      payload,
    });
    this.deps.EventBus.emit(EVENTS.STATE_CHANGE, {
      from: oldState,
      to: newState,
      payload,
    });

    return true;
  },

  /**
   * Go back to previous state
   * @returns {boolean}
   */
  goBack() {
    if (!this._previousState) return false;
    return this.transition(this._previousState, { force: true });
  },

  /**
   * Get state history
   * @returns {Array}
   */
  getHistory() {
    return [...this._history];
  },

  /**
   * Set state directly (for restoration from persistence)
   * @param {string} state
   * @param {string|null} previousState
   */
  restore(state, previousState = null) {
    if (isValidState(state)) {
      this._currentState = state;
    }
    if (previousState === null || isValidState(previousState)) {
      this._previousState = previousState;
    }
  },

  /**
   * Reset to initial state
   */
  reset() {
    this._currentState = DEFAULTS.initialState;
    this._previousState = null;
    this._history = [];
  },
};

export { StateMachine, isValidState };
export default StateMachine;
