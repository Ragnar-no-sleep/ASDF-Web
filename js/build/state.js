/**
 * Build V2 - State Management (Facade)
 * Composes focused managers while maintaining backward compatibility
 *
 * @version 2.1.0 - SRP Refactor
 * @security Data validation for localStorage
 */

'use strict';

import { STORAGE_VERSION, EVENTS, DEFAULTS } from './config.js';
import { EventBus } from './state/event-bus.js';
import { StateMachine, isValidState } from './state/state-machine.js';
import { OnboardingManager } from './state/onboarding-manager.js';
import { QuizManager, isValidTrackId } from './state/quiz-manager.js';
import { PersistenceManager } from './state/persistence-manager.js';

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate project ID
 * @param {string} projectId - Project ID to validate
 * @returns {boolean}
 */
function isValidProjectId(projectId) {
  if (typeof projectId !== 'string') return false;
  return /^[a-z0-9-]{2,50}$/.test(projectId);
}

// ============================================
// BUILD STATE - Facade over focused managers
// ============================================

const BuildState = {
  /**
   * Composed managers (internal)
   */
  _managers: {
    events: EventBus,
    state: StateMachine,
    onboarding: OnboardingManager,
    quiz: QuizManager,
    persistence: PersistenceManager,
  },

  /**
   * Legacy data structure (backward compatibility)
   */
  data: {
    selectedProject: null,
    selectedTrack: null,
    quizAnswers: [],
    quizResult: null,
    introCompleted: false,
    completedProjects: [],
    viewHistory: [],
    onboarding: {},
  },

  // ============================================
  // STATE MACHINE (delegated to StateMachine)
  // ============================================

  /**
   * Get current state
   * @returns {string}
   */
  get currentState() {
    return this._managers.state.currentState;
  },

  /**
   * Get previous state
   * @returns {string|null}
   */
  get previousState() {
    return this._managers.state.previousState;
  },

  // Alias for compatibility
  get _currentState() {
    return this._managers.state.currentState;
  },

  get _previousState() {
    return this._managers.state.previousState;
  },

  /**
   * Check if transition is valid
   */
  canTransition(from, to) {
    return this._managers.state.canTransition(from, to);
  },

  /**
   * Transition to a new state
   */
  transition(newState, payload = {}) {
    // Update data based on payload
    if (payload.projectId && isValidProjectId(payload.projectId)) {
      this.data.selectedProject = payload.projectId;
    }
    if (payload.trackId && isValidTrackId(payload.trackId)) {
      this.data.selectedTrack = payload.trackId;
    }

    const result = this._managers.state.transition(newState, payload);

    // Sync view history
    if (result) {
      this.data.viewHistory = this._managers.state.getHistory();
      this.saveToLocal();
    }

    return result;
  },

  /**
   * Go back to previous state
   */
  goBack() {
    return this._managers.state.goBack();
  },

  // ============================================
  // DATA METHODS
  // ============================================

  /**
   * Select a project
   */
  selectProject(projectId) {
    if (!isValidProjectId(projectId)) {
      console.warn('[BuildState] Invalid project ID:', projectId);
      return;
    }
    this.data.selectedProject = projectId;

    // Track onboarding milestones
    this._managers.onboarding.completeMilestone('firstProjectClick');
    this._managers.onboarding.completeMilestone('exploredProjects');

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
   */
  selectTrack(trackId) {
    if (!isValidTrackId(trackId)) {
      console.warn('[BuildState] Invalid track ID:', trackId);
      return;
    }
    this.data.selectedTrack = trackId;

    // Track onboarding milestone
    this._managers.onboarding.completeMilestone('firstTrackStart');

    this.emit(EVENTS.TRACK_SELECT, { trackId });
    this.saveToLocal();
  },

  /**
   * Mark intro as completed
   */
  completeIntro() {
    this.data.introCompleted = true;
    this._managers.onboarding.completeMilestone('introSeen');
    this.saveToLocal();
  },

  // ============================================
  // ONBOARDING (delegated to OnboardingManager)
  // ============================================

  /**
   * Complete an onboarding milestone
   */
  completeMilestone(milestone) {
    const result = this._managers.onboarding.completeMilestone(milestone);
    if (result) {
      this.data.onboarding = this._managers.onboarding.getState();
      this.saveToLocal();
    }
  },

  /**
   * Check if core onboarding is complete
   */
  checkOnboardingComplete() {
    // Handled internally by OnboardingManager
    return this._managers.onboarding.isComplete();
  },

  /**
   * Get onboarding progress (0-100)
   */
  getOnboardingProgress() {
    return this._managers.onboarding.getProgress();
  },

  // ============================================
  // QUIZ (delegated to QuizManager)
  // ============================================

  /**
   * Record quiz answer
   */
  recordQuizAnswer(trackId) {
    if (!isValidTrackId(trackId)) return;

    this._managers.quiz.recordAnswer(trackId);
    this.data.quizAnswers = this._managers.quiz.getAnswers();

    this.emit(EVENTS.QUIZ_ANSWER, { trackId, answers: [...this.data.quizAnswers] });
  },

  /**
   * Complete quiz and calculate result
   */
  completeQuiz() {
    const winner = this._managers.quiz.complete();

    this.data.quizResult = winner;
    this.data.selectedTrack = winner;
    this.data.quizAnswers = this._managers.quiz.getAnswers();

    this._managers.onboarding.completeMilestone('firstQuizComplete');

    this.emit(EVENTS.QUIZ_COMPLETE, { result: winner, answers: [...this.data.quizAnswers] });
    this.saveToLocal();

    return winner;
  },

  /**
   * Reset quiz
   */
  resetQuiz() {
    this._managers.quiz.reset();
    this.data.quizAnswers = [];
    this.data.quizResult = null;
    this.emit(EVENTS.QUIZ_START, {});
  },

  // ============================================
  // PROJECT COMPLETION
  // ============================================

  /**
   * Mark a project as viewed/completed
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
   */
  isProjectCompleted(projectId) {
    return this.data.completedProjects.includes(projectId);
  },

  // ============================================
  // OBSERVER PATTERN (delegated to EventBus)
  // ============================================

  /**
   * Subscribe to events
   */
  subscribe(event, callback) {
    return this._managers.events.subscribe(event, callback);
  },

  /**
   * Emit an event
   */
  emit(event, data = null) {
    this._managers.events.emit(event, data);
  },

  /**
   * Remove all listeners for an event
   */
  off(event) {
    this._managers.events.off(event);
  },

  /**
   * Clear all listeners
   */
  clearListeners() {
    this._managers.events.clear();
  },

  // Backward compatibility alias
  get _listeners() {
    return this._managers.events._listeners;
  },

  // ============================================
  // PERSISTENCE (delegated to PersistenceManager)
  // ============================================

  /**
   * Save state to localStorage
   */
  saveToLocal() {
    this._managers.persistence.save({
      currentState: this._managers.state.currentState,
      previousState: this._managers.state.previousState,
      data: {
        selectedProject: this.data.selectedProject,
        selectedTrack: this.data.selectedTrack,
        quizResult: this.data.quizResult,
        introCompleted: this.data.introCompleted,
        completedProjects: this.data.completedProjects.slice(0, 100),
        onboarding: this._managers.onboarding.getState(),
      },
    });
  },

  /**
   * Load state from localStorage
   */
  loadFromLocal() {
    const saved = this._managers.persistence.load();
    if (!saved) return;

    // Restore state machine
    if (saved.currentState) {
      this._managers.state.restore(saved.currentState, saved.previousState);
    }

    // Restore data
    if (saved.data) {
      if (saved.data.selectedProject && isValidProjectId(saved.data.selectedProject)) {
        this.data.selectedProject = saved.data.selectedProject;
      }
      if (saved.data.selectedTrack && isValidTrackId(saved.data.selectedTrack)) {
        this.data.selectedTrack = saved.data.selectedTrack;
      }
      if (saved.data.quizResult && isValidTrackId(saved.data.quizResult)) {
        this.data.quizResult = saved.data.quizResult;
        this._managers.quiz.restore({ result: saved.data.quizResult });
      }
      if (typeof saved.data.introCompleted === 'boolean') {
        this.data.introCompleted = saved.data.introCompleted;
      }
      if (Array.isArray(saved.data.completedProjects)) {
        this.data.completedProjects = saved.data.completedProjects
          .filter(isValidProjectId)
          .slice(0, 100);
      }
      if (saved.data.onboarding) {
        this._managers.onboarding.restore(saved.data.onboarding);
        this.data.onboarding = this._managers.onboarding.getState();
      }
    }

    console.log('[BuildState] Loaded from localStorage (validated)');
  },

  /**
   * Clear local storage
   */
  clearLocal() {
    this._managers.persistence.clear();
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
      state: this.currentState,
      track: this.data.selectedTrack,
    });
    this.emit('initialized', { state: this.currentState });
  },

  /**
   * Reset all state
   */
  reset() {
    this._managers.state.reset();
    this._managers.onboarding.reset();
    this._managers.quiz.reset();

    this.data = {
      selectedProject: null,
      selectedTrack: null,
      quizAnswers: [],
      quizResult: null,
      introCompleted: false,
      completedProjects: [],
      viewHistory: [],
      onboarding: {},
    };

    this.clearLocal();
    this.emit('reset', {});
  },

  /**
   * Get access to individual managers (for advanced use)
   * @returns {Object}
   */
  getManagers() {
    return { ...this._managers };
  },
};

// Export for ES modules
export { BuildState };
export default BuildState;

// Re-export managers for direct access
export { EventBus, StateMachine, OnboardingManager, QuizManager, PersistenceManager };

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.BuildState = BuildState;
}
