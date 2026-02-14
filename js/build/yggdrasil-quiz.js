/**
 * Yggdrasil Cosmos - Quiz Module
 * Extracted from yggdrasil-unified.js for modularity
 *
 * Handles "Find Your Path" quiz logic:
 * - Quiz questions data
 * - Quiz state management
 * - Quiz rendering
 * - Answer processing
 */

'use strict';

/**
 * Quiz questions configuration
 */
export const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    text: 'What excites you most?',
    options: [
      { track: 'dev', text: 'Building systems that scale', icon: '🔧' },
      { track: 'games', text: 'Creating immersive experiences', icon: '🎮' },
      { track: 'content', text: 'Growing communities & stories', icon: '📈' },
    ],
  },
  {
    id: 'q2',
    text: 'Your ideal Friday night?',
    options: [
      { track: 'dev', text: 'Debugging a tricky issue', icon: '🐛' },
      { track: 'games', text: 'Playtesting new mechanics', icon: '🎲' },
      { track: 'content', text: 'Editing content & metrics', icon: '🎥' },
    ],
  },
  {
    id: 'q3',
    text: 'Pick your superpower',
    options: [
      { track: 'dev', text: 'Read any codebase instantly', icon: '⚡' },
      { track: 'games', text: 'Design perfect game loops', icon: '🔄' },
      { track: 'content', text: 'Predict viral content', icon: '🔮' },
    ],
  },
];

/**
 * Yggdrasil Quiz Controller
 */
export const YggdrasilQuiz = {
  /**
   * Create initial quiz state
   * @returns {Object} Initial quiz state
   */
  createQuizState() {
    return {
      currentQuestion: 0,
      answers: [],
      completed: false,
      result: null,
    };
  },

  /**
   * Render quiz section HTML
   * @param {Object} quizState - Current quiz state
   * @param {Object} tracksData - Tracks data for result rendering
   * @returns {string} Quiz section HTML
   */
  renderQuizSection(quizState, tracksData) {
    if (quizState.completed && quizState.result) {
      const track = tracksData[quizState.result];
      return `
        <div class="ygg-quiz-result">
          <div class="ygg-quiz-result-header">
            <span class="ygg-quiz-result-icon" style="color: ${track.color}">${track.icon}</span>
            <div class="ygg-quiz-result-text">
              <span class="ygg-quiz-result-label">Your Path</span>
              <span class="ygg-quiz-result-track" style="color: ${track.color}">${track.name}</span>
            </div>
          </div>
          <p class="ygg-quiz-result-desc">Focus on ${track.name} to maximize your builder potential.</p>
          <button class="ygg-quiz-retake">Retake Quiz</button>
        </div>
      `;
    }

    const q = QUIZ_QUESTIONS[quizState.currentQuestion];
    const progress = (quizState.currentQuestion / QUIZ_QUESTIONS.length) * 100;

    return `
      <div class="ygg-quiz-section">
        <div class="ygg-quiz-header">
          <span class="ygg-quiz-title">🧭 Find Your Path</span>
          <span class="ygg-quiz-step">${quizState.currentQuestion + 1}/${QUIZ_QUESTIONS.length}</span>
        </div>
        <div class="ygg-quiz-progress">
          <div class="ygg-quiz-progress-fill" style="width: ${progress}%"></div>
        </div>
        <p class="ygg-quiz-question">${q.text}</p>
        <div class="ygg-quiz-options">
          ${q.options
            .map(
              opt => `
            <button class="ygg-quiz-option" data-track="${opt.track}">
              <span class="ygg-quiz-option-icon">${opt.icon}</span>
              <span class="ygg-quiz-option-text">${opt.text}</span>
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  },

  /**
   * Process quiz answer
   * @param {Object} quizState - Current quiz state (mutated)
   * @param {string} track - Selected track ('dev', 'games', 'content')
   * @param {Function} saveCallback - Callback to save state
   * @returns {Object} Updated quiz state
   */
  answerQuiz(quizState, track, saveCallback) {
    quizState.answers.push(track);

    if (quizState.currentQuestion < QUIZ_QUESTIONS.length - 1) {
      quizState.currentQuestion++;
    } else {
      // Quiz complete - calculate result
      const counts = { dev: 0, games: 0, content: 0 };
      quizState.answers.forEach(t => counts[t]++);
      const result = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

      quizState.completed = true;
      quizState.result = result;

      if (saveCallback) saveCallback();
    }

    return quizState;
  },

  /**
   * Reset quiz to initial state
   * @param {Object} quizState - Current quiz state (mutated)
   * @param {Function} saveCallback - Callback to save state
   * @returns {Object} Reset quiz state
   */
  resetQuiz(quizState, saveCallback) {
    quizState.currentQuestion = 0;
    quizState.answers = [];
    quizState.completed = false;
    quizState.result = null;

    if (saveCallback) saveCallback();

    return quizState;
  },

  /**
   * Update quiz UI in the DOM
   * @param {Object} quizState - Current quiz state
   * @param {HTMLElement} leftPanel - Left panel DOM element
   * @param {Object} tracksData - Tracks data for rendering
   * @param {Object} callbacks - Event callbacks { answerQuiz, resetQuiz, renderTracks }
   */
  updateQuizUI(quizState, leftPanel, tracksData, callbacks) {
    const quizContainer = leftPanel.querySelector('.ygg-quiz-section, .ygg-quiz-result');
    if (quizContainer) {
      const parent = quizContainer.parentNode;
      const newHtml = this.renderQuizSection(quizState, tracksData);
      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      parent.replaceChild(temp.firstElementChild, quizContainer);

      // Re-bind events
      leftPanel.querySelectorAll('.ygg-quiz-option').forEach(opt => {
        opt.addEventListener('click', e => {
          const track = e.currentTarget.dataset.track;
          if (callbacks.answerQuiz) callbacks.answerQuiz(track);
        });
      });

      const retakeBtn = leftPanel.querySelector('.ygg-quiz-retake');
      if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
          if (callbacks.resetQuiz) callbacks.resetQuiz();
        });
      }
    }

    // Also update tracks to show recommended badge
    const tracksList = leftPanel.querySelector('.ygg-tracks-list');
    if (tracksList && callbacks.renderTracks) {
      callbacks.renderTracks();
    }
  },
};

// Browser global export for debugging
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.YggdrasilQuiz = YggdrasilQuiz;
  window.ASDF.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
}

export default YggdrasilQuiz;
