/**
 * Quest State Machine
 * 6-state quest lifecycle management
 *
 * States:
 *   LOCKED -> AVAILABLE -> ACTIVE -> PENDING -> COMPLETED
 *                                           \-> FAILED
 *
 * @module quest/state-machine
 */

'use strict';

// ============================================
// QUEST STATES
// ============================================

export const QUEST_STATES = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// ============================================
// STATE TRANSITIONS
// ============================================

/**
 * Valid state transitions
 * Key: current state, Value: array of valid next states
 */
export const TRANSITIONS = {
  [QUEST_STATES.LOCKED]: [QUEST_STATES.AVAILABLE],
  [QUEST_STATES.AVAILABLE]: [QUEST_STATES.ACTIVE, QUEST_STATES.LOCKED],
  [QUEST_STATES.ACTIVE]: [QUEST_STATES.PENDING, QUEST_STATES.AVAILABLE],
  [QUEST_STATES.PENDING]: [QUEST_STATES.COMPLETED, QUEST_STATES.FAILED, QUEST_STATES.ACTIVE],
  [QUEST_STATES.COMPLETED]: [], // Terminal state
  [QUEST_STATES.FAILED]: [QUEST_STATES.AVAILABLE] // Can retry
};

// ============================================
// TRANSITION ACTIONS
// ============================================

/**
 * Actions that trigger state transitions
 */
export const ACTIONS = {
  UNLOCK: 'unlock',
  START: 'start',
  SUBMIT: 'submit',
  VERIFY: 'verify',
  REJECT: 'reject',
  ABANDON: 'abandon',
  RETRY: 'retry',
  LOCK: 'lock'
};

/**
 * Map actions to state transitions
 */
const ACTION_TRANSITIONS = {
  [ACTIONS.UNLOCK]: {
    from: [QUEST_STATES.LOCKED],
    to: QUEST_STATES.AVAILABLE
  },
  [ACTIONS.START]: {
    from: [QUEST_STATES.AVAILABLE],
    to: QUEST_STATES.ACTIVE
  },
  [ACTIONS.SUBMIT]: {
    from: [QUEST_STATES.ACTIVE],
    to: QUEST_STATES.PENDING
  },
  [ACTIONS.VERIFY]: {
    from: [QUEST_STATES.PENDING],
    to: QUEST_STATES.COMPLETED
  },
  [ACTIONS.REJECT]: {
    from: [QUEST_STATES.PENDING],
    to: QUEST_STATES.FAILED
  },
  [ACTIONS.ABANDON]: {
    from: [QUEST_STATES.ACTIVE, QUEST_STATES.PENDING],
    to: QUEST_STATES.AVAILABLE
  },
  [ACTIONS.RETRY]: {
    from: [QUEST_STATES.FAILED],
    to: QUEST_STATES.AVAILABLE
  },
  [ACTIONS.LOCK]: {
    from: [QUEST_STATES.AVAILABLE],
    to: QUEST_STATES.LOCKED
  }
};

// ============================================
// STATE MACHINE CLASS
// ============================================

export class QuestStateMachine {
  /**
   * Create a quest state machine
   * @param {string} questId - Quest identifier
   * @param {string} initialState - Initial state (default: LOCKED)
   */
  constructor(questId, initialState = QUEST_STATES.LOCKED) {
    this.questId = questId;
    this.state = initialState;
    this.history = [{
      state: initialState,
      timestamp: Date.now(),
      action: null
    }];
    this.listeners = new Map();
  }

  /**
   * Get current state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Check if a transition is valid
   * @param {string} toState - Target state
   * @returns {boolean}
   */
  canTransitionTo(toState) {
    const validTransitions = TRANSITIONS[this.state] || [];
    return validTransitions.includes(toState);
  }

  /**
   * Check if an action can be performed
   * @param {string} action - Action to check
   * @returns {boolean}
   */
  canPerform(action) {
    const transition = ACTION_TRANSITIONS[action];
    if (!transition) return false;
    return transition.from.includes(this.state);
  }

  /**
   * Perform an action (triggers state transition)
   * @param {string} action - Action to perform
   * @param {Object} metadata - Optional metadata
   * @returns {boolean} Success
   */
  perform(action, metadata = {}) {
    const transition = ACTION_TRANSITIONS[action];

    if (!transition) {
      console.warn(`[QuestStateMachine] Unknown action: ${action}`);
      return false;
    }

    if (!transition.from.includes(this.state)) {
      console.warn(
        `[QuestStateMachine] Cannot perform ${action} from state ${this.state}`
      );
      return false;
    }

    const previousState = this.state;
    this.state = transition.to;

    // Record history
    this.history.push({
      state: this.state,
      previousState,
      action,
      timestamp: Date.now(),
      metadata
    });

    // Notify listeners
    this._notify(action, previousState, this.state, metadata);

    return true;
  }

  /**
   * Force transition to a state (bypasses validation)
   * Use with caution - mainly for data recovery
   * @param {string} toState - Target state
   * @param {string} reason - Reason for forced transition
   */
  forceTransition(toState, reason = 'forced') {
    const previousState = this.state;
    this.state = toState;

    this.history.push({
      state: toState,
      previousState,
      action: 'FORCE',
      timestamp: Date.now(),
      metadata: { reason, forced: true }
    });

    this._notify('FORCE', previousState, toState, { reason });
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - (action, from, to, metadata) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    const id = Symbol('listener');
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  /**
   * Notify all listeners
   * @private
   */
  _notify(action, from, to, metadata) {
    this.listeners.forEach(callback => {
      try {
        callback(action, from, to, metadata);
      } catch (error) {
        console.error('[QuestStateMachine] Listener error:', error);
      }
    });
  }

  /**
   * Get state history
   * @returns {Array}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Check if quest is in a terminal state
   * @returns {boolean}
   */
  isTerminal() {
    return this.state === QUEST_STATES.COMPLETED;
  }

  /**
   * Check if quest can be retried
   * @returns {boolean}
   */
  canRetry() {
    return this.state === QUEST_STATES.FAILED;
  }

  /**
   * Check if quest is active (in progress)
   * @returns {boolean}
   */
  isActive() {
    return this.state === QUEST_STATES.ACTIVE ||
           this.state === QUEST_STATES.PENDING;
  }

  /**
   * Serialize state machine for persistence
   * @returns {Object}
   */
  serialize() {
    return {
      questId: this.questId,
      state: this.state,
      history: this.history
    };
  }

  /**
   * Restore state machine from serialized data
   * @param {Object} data - Serialized data
   * @returns {QuestStateMachine}
   */
  static deserialize(data) {
    const machine = new QuestStateMachine(data.questId, data.state);
    machine.history = data.history || [];
    return machine;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get human-readable state label
 * @param {string} state - Quest state
 * @returns {string}
 */
export function getStateLabel(state) {
  const labels = {
    [QUEST_STATES.LOCKED]: 'Locked',
    [QUEST_STATES.AVAILABLE]: 'Available',
    [QUEST_STATES.ACTIVE]: 'In Progress',
    [QUEST_STATES.PENDING]: 'Pending Review',
    [QUEST_STATES.COMPLETED]: 'Completed',
    [QUEST_STATES.FAILED]: 'Failed'
  };
  return labels[state] || state;
}

/**
 * Get state color (for UI)
 * @param {string} state - Quest state
 * @returns {string} Hex color
 */
export function getStateColor(state) {
  const colors = {
    [QUEST_STATES.LOCKED]: '#6b7280',     // Gray
    [QUEST_STATES.AVAILABLE]: '#3b82f6',  // Blue
    [QUEST_STATES.ACTIVE]: '#f59e0b',     // Amber
    [QUEST_STATES.PENDING]: '#8b5cf6',    // Purple
    [QUEST_STATES.COMPLETED]: '#10b981',  // Green
    [QUEST_STATES.FAILED]: '#ef4444'      // Red
  };
  return colors[state] || '#6b7280';
}

/**
 * Get state icon
 * @param {string} state - Quest state
 * @returns {string} Icon character
 */
export function getStateIcon(state) {
  const icons = {
    [QUEST_STATES.LOCKED]: '\u{1F512}',     // Lock
    [QUEST_STATES.AVAILABLE]: '\u{1F513}',  // Unlock
    [QUEST_STATES.ACTIVE]: '\u{1F3C3}',     // Running
    [QUEST_STATES.PENDING]: '\u23F3',       // Hourglass
    [QUEST_STATES.COMPLETED]: '\u2705',     // Check
    [QUEST_STATES.FAILED]: '\u274C'         // X
  };
  return icons[state] || '\u2753';
}

// ============================================
// EXPORTS
// ============================================

export default {
  QUEST_STATES,
  TRANSITIONS,
  ACTIONS,
  QuestStateMachine,
  getStateLabel,
  getStateColor,
  getStateIcon
};
