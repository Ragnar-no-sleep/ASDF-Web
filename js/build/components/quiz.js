/**
 * Build V2 - Quiz Component
 * "Find Your Path" quiz for track selection
 *
 * @version 2.0.0
 */

'use strict';

import { TRACKS, QUIZ_QUESTIONS, EVENTS } from '../config.js';
import { BuildState } from '../state.js';
import { sanitizeText } from '../utils/security.js';
import {
  $,
  $$,
  byId,
  addClass,
  removeClass,
  show,
  hide,
  on,
  delegate,
  setStyles,
  waitForTransition,
  nextFrame
} from '../utils/dom.js';

// ============================================
// QUIZ STATE
// ============================================

let quizContainer = null;
let questionsContainer = null;
let resultContainer = null;
let progressDots = null;
let stepLabel = null;
let currentQuestion = 0;
let isAnimating = false;

// ============================================
// QUIZ COMPONENT
// ============================================

const QuizComponent = {
  /**
   * Initialize quiz component
   * @param {string|Element} container - Container selector or element
   */
  init(container = '#view-path') {
    quizContainer = typeof container === 'string' ? $(container) : container;
    if (!quizContainer) {
      console.warn('[QuizComponent] Container not found');
      return;
    }

    // Find or create sub-elements
    questionsContainer = $('#path-questions', quizContainer) || this.createQuestionsContainer();
    resultContainer = $('#path-result', quizContainer) || this.createResultContainer();
    progressDots = $$('.path-dot', quizContainer);
    stepLabel = $('.path-step-label', quizContainer);

    // Render questions
    this.render();

    // Bind events
    this.bindEvents();

    // Load saved quiz result if any
    if (BuildState.data.quizResult) {
      this.showResult(BuildState.data.quizResult);
    }

    console.log('[QuizComponent] Initialized');
  },

  /**
   * Create questions container if not exists
   */
  createQuestionsContainer() {
    const container = document.createElement('div');
    container.id = 'path-questions';
    container.className = 'path-questions';
    quizContainer.appendChild(container);
    return container;
  },

  /**
   * Create result container if not exists
   */
  createResultContainer() {
    const container = document.createElement('div');
    container.id = 'path-result';
    container.className = 'path-result';
    quizContainer.appendChild(container);
    return container;
  },

  /**
   * Render quiz questions
   */
  render() {
    // Generate questions HTML
    const questionsHtml = QUIZ_QUESTIONS.map((q, qIndex) => {
      const activeClass = qIndex === currentQuestion ? 'active' : '';
      const optionsHtml = q.options.map(opt => {
        const icon = sanitizeText(opt.icon || '');
        const text = sanitizeText(opt.text);
        return `
          <button class="path-option" data-track="${sanitizeText(opt.track)}">
            <span class="option-icon">${icon}</span>
            <span class="option-text">${text}</span>
          </button>
        `;
      }).join('');

      return `
        <div class="path-question ${activeClass}" data-question="${qIndex}">
          <h3 class="question-text">${sanitizeText(q.text)}</h3>
          <div class="question-options">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    questionsContainer.innerHTML = questionsHtml;

    // Generate progress dots if they don't exist in HTML
    if (progressDots.length === 0) {
      const progressContainer = $('.path-progress', quizContainer);
      if (progressContainer) {
        const dotsHtml = QUIZ_QUESTIONS.map((_, i) => {
          const activeClass = i === currentQuestion ? 'active' : '';
          return `<span class="path-dot ${activeClass}" data-question="${i}"></span>`;
        }).join('');
        const dotsWrapper = document.createElement('div');
        dotsWrapper.className = 'path-dots';
        dotsWrapper.innerHTML = dotsHtml;
        progressContainer.insertBefore(dotsWrapper, progressContainer.firstChild);
        progressDots = $$('.path-dot', progressContainer);
      }
    }

    // Update step label
    this.updateProgress();
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Option clicks
    delegate(questionsContainer, 'click', '.path-option', (e, option) => {
      if (isAnimating) return;
      const track = option.dataset.track;
      this.selectAnswer(track);
    });

    // Retake quiz button
    const retakeBtn = $('#path-retake', quizContainer);
    if (retakeBtn) {
      on(retakeBtn, 'click', () => this.reset());
    }

    // Start journey button
    const startJourneyBtn = $('#path-start-journey', quizContainer);
    if (startJourneyBtn) {
      on(startJourneyBtn, 'click', () => this.startJourney());
    }

    // View tree button
    const viewTreeBtn = $('[data-action="view-tree"]', quizContainer);
    if (viewTreeBtn) {
      on(viewTreeBtn, 'click', () => this.viewTree());
    }
  },

  /**
   * Select an answer and advance
   * @param {string} trackId
   */
  async selectAnswer(trackId) {
    isAnimating = true;

    // Record answer
    BuildState.recordQuizAnswer(trackId);

    // Update progress dots
    if (progressDots[currentQuestion]) {
      removeClass(progressDots[currentQuestion], 'active');
      addClass(progressDots[currentQuestion], 'done');
    }

    // Check if last question
    if (currentQuestion >= QUIZ_QUESTIONS.length - 1) {
      // Complete quiz
      await this.animateQuestionOut();
      const result = BuildState.completeQuiz();
      this.showResult(result);
    } else {
      // Next question
      await this.animateQuestionOut();
      currentQuestion++;
      this.showQuestion(currentQuestion);
      await this.animateQuestionIn();
    }

    isAnimating = false;
  },

  /**
   * Show specific question
   * @param {number} index
   */
  showQuestion(index) {
    const questions = $$('.path-question', questionsContainer);
    questions.forEach((q, i) => {
      if (i === index) {
        addClass(q, 'active');
      } else {
        removeClass(q, 'active');
      }
    });

    // Update dots
    progressDots.forEach((dot, i) => {
      if (i === index) {
        addClass(dot, 'active');
        removeClass(dot, 'done');
      } else if (i < index) {
        removeClass(dot, 'active');
        addClass(dot, 'done');
      } else {
        removeClass(dot, 'active', 'done');
      }
    });

    this.updateProgress();
  },

  /**
   * Update progress display
   */
  updateProgress() {
    if (stepLabel) {
      stepLabel.textContent = `${currentQuestion + 1} of ${QUIZ_QUESTIONS.length}`;
    }
  },

  /**
   * Animate question out
   */
  async animateQuestionOut() {
    const currentEl = $(`.path-question[data-question="${currentQuestion}"]`, questionsContainer);
    if (currentEl) {
      addClass(currentEl, 'exiting');
      await waitForTransition(currentEl);
      removeClass(currentEl, 'active', 'exiting');
    }
  },

  /**
   * Animate question in
   */
  async animateQuestionIn() {
    const currentEl = $(`.path-question[data-question="${currentQuestion}"]`, questionsContainer);
    if (currentEl) {
      addClass(currentEl, 'entering');
      await nextFrame();
      addClass(currentEl, 'active');
      await waitForTransition(currentEl);
      removeClass(currentEl, 'entering');
    }
  },

  /**
   * Show quiz result
   * @param {string} trackId
   */
  showResult(trackId) {
    const track = TRACKS[trackId];
    if (!track) return;

    // Hide questions, show result
    hide(questionsContainer);
    const progressEl = $('.path-progress', quizContainer);
    if (progressEl) hide(progressEl);

    // Update result content
    const iconEl = $('#path-result-icon', resultContainer);
    const trackNameEl = $('#path-result-track', resultContainer);
    const descEl = $('#path-result-desc', resultContainer);

    if (iconEl) {
      iconEl.textContent = track.icon;
      setStyles(iconEl, {
        color: track.color,
        background: `${track.color}20`
      });
    }
    if (trackNameEl) {
      trackNameEl.textContent = track.name;
      setStyles(trackNameEl, { color: track.color });
    }
    if (descEl) {
      descEl.textContent = track.desc;
    }

    // Show result
    addClass(resultContainer, 'show');

    // Emit event
    BuildState.emit(EVENTS.QUIZ_COMPLETE, { result: trackId });
  },

  /**
   * Start journey with selected track
   */
  startJourney() {
    const track = BuildState.data.quizResult || BuildState.data.selectedTrack;
    if (!track) return;

    // Switch to journey view
    const journeyBtn = $('[data-view="journey"]');
    if (journeyBtn) {
      journeyBtn.click();

      // Activate the track after view switches
      setTimeout(() => {
        const trackBtn = $(`.journey-track[data-track="${track}"]`);
        if (trackBtn) trackBtn.click();
      }, 100);
    }
  },

  /**
   * View Yggdrasil tree
   */
  viewTree() {
    const treeBtn = $('[data-view="yggdrasil"]');
    if (treeBtn) {
      treeBtn.click();
    }
  },

  /**
   * Reset quiz
   */
  reset() {
    currentQuestion = 0;
    isAnimating = false;

    // Reset state
    BuildState.resetQuiz();

    // Reset UI
    this.render();

    // Show questions, hide result
    show(questionsContainer);
    const progressEl = $('.path-progress', quizContainer);
    if (progressEl) show(progressEl);
    removeClass(resultContainer, 'show');

    // Emit event
    BuildState.emit(EVENTS.QUIZ_START, {});
  },

  /**
   * Get current question index
   * @returns {number}
   */
  getCurrentQuestion() {
    return currentQuestion;
  },

  /**
   * Get quiz result
   * @returns {string|null}
   */
  getResult() {
    return BuildState.data.quizResult;
  },

  /**
   * Check if quiz is completed
   * @returns {boolean}
   */
  isCompleted() {
    return BuildState.data.quizResult !== null;
  }
};

// Export for ES modules
export { QuizComponent };
export default QuizComponent;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.QuizComponent = QuizComponent;
}
