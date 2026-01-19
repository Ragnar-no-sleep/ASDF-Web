/**
 * Build V2 - State Management
 * State Machine with Observer pattern for Build page
 *
 * @version 2.0.0
 * @security Data validation for localStorage
 */

'use strict';

import {
  STORAGE_KEY,
  STORAGE_VERSION,
  STATES,
  TRANSITIONS,
  EVENTS,
  DEFAULTS
} from './config.js';

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate state name
 * @param {string} state - State to validate
 * @returns {boolean}
 */
function isValidState(state) {
  return Object.values(STATES).includes(state);
}

/**
 * Validate track ID
 * @param {string} trackId - Track ID to validate
 * @returns {boolean}
 */
function isValidTrackId(trackId) {
  if (typeof trackId !== 'string') return false;
  return /^[a-z]{2,20}$/.test(trackId);
}

/**
 * Validate project ID
 * @param {string} projectId - Project ID to validate
 * @returns {boolean}
 */
function isValidProjectId(projectId) {
  if (typeof projectId !== 'string') return false;
  return /^[a-z0-9-]{2,50}$/.test(projectId);
}

/**
 * Validate timestamp
 * @param {*} timestamp - Timestamp to validate
 * @returns {number|null}
 */
function validateTimestamp(timestamp) {
  const num = Number(timestamp);
  if (!Number.isFinite(num)) return null;
  // Must be within reasonable range (year 2020 to 2100)
  if (num < 1577836800000 || num > 4102444800000) return null;
  return num;
}

// ============================================
// BUILD STATE - Singleton
// ============================================

const BuildState = {
  // Current state
  _currentState: DEFAULTS.initialState,
  _previousState: null,

  // Data
  data: {
    selectedProject: null,
    selectedTrack: null,
    quizAnswers: [],
    quizResult: null,
    introCompleted: false,
    completedProjects: [],
    viewHistory: []
  },

  // Observer pattern
  _listeners: new Map(),

  // ============================================
  // STATE MACHINE
  // ============================================

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
      console.warn('[BuildState] Invalid state:', newState);
      return false;
    }

    // Allow same-state transitions with different payloads
    if (newState === this._currentState && !payload.force) {
      // Just update data if provided
      if (payload.projectId && isValidProjectId(payload.projectId)) {
        this.data.selectedProject = payload.projectId;
      }
      if (payload.trackId && isValidTrackId(payload.trackId)) {
        this.data.selectedTrack = payload.trackId;
      }
      this.emit(EVENTS.STATE_CHANGE, { state: newState, payload });
      return true;
    }

    // Check if transition is valid (or bypass with force)
    if (!payload.force && !this.canTransition(this._currentState, newState)) {
      console.warn(
        '[BuildState] Invalid transition:',
        this._currentState,
        '->',
        newState
      );
      return false;
    }

    const oldState = this._currentState;
    this._previousState = oldState;
    this._currentState = newState;

    // Update data based on payload
    if (payload.projectId && isValidProjectId(payload.projectId)) {
      this.data.selectedProject = payload.projectId;
    }
    if (payload.trackId && isValidTrackId(payload.trackId)) {
      this.data.selectedTrack = payload.trackId;
    }

    // Track view history
    this.data.viewHistory.push({
      state: newState,
      timestamp: Date.now(),
      payload
    });

    // Limit history to last 50 entries
    if (this.data.viewHistory.length > 50) {
      this.data.viewHistory = this.data.viewHistory.slice(-50);
    }

    // Emit events
    this.emit(`${EVENTS.STATE_EXIT}:${oldState}`, { from: oldState, to: newState, payload });
    this.emit(`${EVENTS.STATE_ENTER}:${newState}`, { from: oldState, to: newState, payload });
    this.emit(EVENTS.STATE_CHANGE, { from: oldState, to: newState, payload });

    // Persist state
    this.saveToLocal();

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

  // ============================================
  // DATA METHODS
  // ============================================

  /**
   * Select a project
   * @param {string} projectId
   */
  selectProject(projectId) {
    if (!isValidProjectId(projectId)) {
      console.warn('[BuildState] Invalid project ID:', projectId);
      return;
    }
    this.data.selectedProject = projectId;
    this.emit(EVENTS.PROJECT_SELECT, { projectId });
    this.saveToLocal();
  },

  /**
   * Deselect current project
   */
  deselectProject() {
    const projectId = this.data.selectedProject;
    this.data.selectedProject = null;
    this.emit(EVENTS.PROJECT_DESELECT, { projectId });
    this.saveToLocal();
  },

  /**
   * Select a track
   * @param {string} trackId
   */
  selectTrack(trackId) {
    if (!isValidTrackId(trackId)) {
      console.warn('[BuildState] Invalid track ID:', trackId);
      return;
    }
    this.data.selectedTrack = trackId;
    this.emit(EVENTS.TRACK_SELECT, { trackId });
    this.saveToLocal();
  },

  /**
   * Mark intro as completed
   */
  completeIntro() {
    this.data.introCompleted = true;
    this.saveToLocal();
  },

  /**
   * Record quiz answer
   * @param {string} trackId
   */
  recordQuizAnswer(trackId) {
    if (!isValidTrackId(trackId)) return;
    this.data.quizAnswers.push(trackId);
    this.emit(EVENTS.QUIZ_ANSWER, { trackId, answers: [...this.data.quizAnswers] });
  },

  /**
   * Complete quiz and calculate result
   * @returns {string} Winning track ID
   */
  completeQuiz() {
    const counts = {};
    this.data.quizAnswers.forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const winner = sorted.length > 0 ? sorted[0][0] : DEFAULTS.defaultTrack;

    this.data.quizResult = winner;
    this.data.selectedTrack = winner;
    this.emit(EVENTS.QUIZ_COMPLETE, { result: winner, answers: [...this.data.quizAnswers] });
    this.saveToLocal();

    return winner;
  },

  /**
   * Reset quiz
   */
  resetQuiz() {
    this.data.quizAnswers = [];
    this.data.quizResult = null;
    this.emit(EVENTS.QUIZ_START, {});
  },

  /**
   * Mark a project as viewed/completed
   * @param {string} projectId
   */
  markProjectCompleted(projectId) {
    if (!isValidProjectId(projectId)) return;
    if (!this.data.completedProjects.includes(projectId)) {
      this.data.completedProjects.push(projectId);
      this.saveToLocal();
    }
  },

  /**
   * Check if project is completed
   * @param {string} projectId
   * @returns {boolean}
   */
  isProjectCompleted(projectId) {
    return this.data.completedProjects.includes(projectId);
  },

  // ============================================
  // OBSERVER PATTERN
  // ============================================

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (typeof callback !== 'function') {
      console.warn('[BuildState] Callback must be a function');
      return () => {};
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data = null) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[BuildState] Error in ${event} listener:`, err);
        }
      });
    }

    // Also emit to window for external listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`build:${event}`, { detail: data }));
    }
  },

  /**
   * Remove all listeners for an event
   * @param {string} event
   */
  off(event) {
    this._listeners.delete(event);
  },

  /**
   * Clear all listeners
   */
  clearListeners() {
    this._listeners.clear();
  },

  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Save state to localStorage
   */
  saveToLocal() {
    try {
      const data = {
        version: STORAGE_VERSION,
        currentState: this._currentState,
        previousState: this._previousState,
        data: {
          selectedProject: this.data.selectedProject,
          selectedTrack: this.data.selectedTrack,
          quizResult: this.data.quizResult,
          introCompleted: this.data.introCompleted,
          completedProjects: this.data.completedProjects.slice(0, 100) // Limit
        },
        lastSaved: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[BuildState] Failed to save to localStorage:', e);
    }
  },

  /**
   * Load state from localStorage with validation
   */
  loadFromLocal() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      let data;
      try {
        data = JSON.parse(saved);
      } catch (parseError) {
        console.warn('[BuildState] Corrupted localStorage data, resetting');
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Version check
      if (!data || data.version !== STORAGE_VERSION) {
        console.log('[BuildState] Storage version mismatch, migrating...');
        this._migrateStorage(data);
        return;
      }

      // Validate and restore state
      if (isValidState(data.currentState)) {
        this._currentState = data.currentState;
      }
      if (data.previousState === null || isValidState(data.previousState)) {
        this._previousState = data.previousState;
      }

      // Restore data with validation
      if (data.data) {
        if (data.data.selectedProject && isValidProjectId(data.data.selectedProject)) {
          this.data.selectedProject = data.data.selectedProject;
        }
        if (data.data.selectedTrack && isValidTrackId(data.data.selectedTrack)) {
          this.data.selectedTrack = data.data.selectedTrack;
        }
        if (data.data.quizResult && isValidTrackId(data.data.quizResult)) {
          this.data.quizResult = data.data.quizResult;
        }
        if (typeof data.data.introCompleted === 'boolean') {
          this.data.introCompleted = data.data.introCompleted;
        }
        if (Array.isArray(data.data.completedProjects)) {
          this.data.completedProjects = data.data.completedProjects
            .filter(isValidProjectId)
            .slice(0, 100);
        }
      }

      console.log('[BuildState] Loaded from localStorage (validated)');
    } catch (e) {
      console.warn('[BuildState] Failed to load from localStorage:', e);
    }
  },

  /**
   * Migrate old storage format
   * @param {Object} oldData
   */
  _migrateStorage(oldData) {
    // Migrate from legacy keys
    const legacyTrack = localStorage.getItem('asdf-path-track');
    const legacyJourney = localStorage.getItem('asdf-journey-track');

    if (legacyTrack && isValidTrackId(legacyTrack)) {
      this.data.quizResult = legacyTrack;
      this.data.selectedTrack = legacyTrack;
    }
    if (legacyJourney && isValidTrackId(legacyJourney)) {
      this.data.selectedTrack = legacyJourney;
    }

    // Clean up legacy keys
    localStorage.removeItem('asdf-path-track');
    localStorage.removeItem('asdf-journey-track');

    // Save new format
    this.saveToLocal();
    console.log('[BuildState] Migration complete');
  },

  /**
   * Clear local storage
   */
  clearLocal() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize state manager
   */
  init() {
    this.loadFromLocal();
    console.log('[BuildState] Initialized', {
      state: this._currentState,
      track: this.data.selectedTrack
    });
    this.emit('initialized', { state: this._currentState });
  },

  /**
   * Reset all state
   */
  reset() {
    this._currentState = DEFAULTS.initialState;
    this._previousState = null;
    this.data = {
      selectedProject: null,
      selectedTrack: null,
      quizAnswers: [],
      quizResult: null,
      introCompleted: false,
      completedProjects: [],
      viewHistory: []
    };
    this.clearLocal();
    this.emit('reset', {});
  }
};

// Export for ES modules
export { BuildState };
export default BuildState;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.BuildState = BuildState;
}
