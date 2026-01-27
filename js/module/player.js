/**
 * Module Player
 * Handles content delivery for videos, articles, and quizzes
 *
 * @module module/player
 *
 * @example
 * import { ModulePlayer } from './module/player.js';
 *
 * const player = new ModulePlayer('#player-container');
 * await player.loadLesson('dev-solana-basics', 'lesson-1');
 */

'use strict';

import { moduleManager, LESSON_TYPES } from './manager.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('ModulePlayer');

// ============================================
// PLAYER CONFIGURATION
// ============================================

const PLAYER_CONFIG = {
  // Video settings
  videoProgressInterval: 5000, // Report progress every 5s
  videoCompletionThreshold: 0.8,

  // Quiz settings
  quizPassThreshold: 0.618,
  quizCooldown: 30000, // 30s between retries

  // Animation timings (Fibonacci-based)
  fadeInDuration: 300,
  fadeOutDuration: 200
};

// ============================================
// MODULE PLAYER CLASS
// ============================================

export class ModulePlayer {
  /**
   * Create a module player
   * @param {string|Element} container - Container selector or element
   * @param {Object} config - Player configuration
   */
  constructor(container, config = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error('ModulePlayer: Container not found');
    }

    this.config = { ...PLAYER_CONFIG, ...config };
    this.currentModule = null;
    this.currentLesson = null;
    this.videoElement = null;
    this.progressInterval = null;
    this.quizState = null;

    this._setupContainer();
    this._bindEvents();
  }

  /**
   * Load and display a lesson
   * @param {string} moduleId
   * @param {string} lessonId
   * @returns {Promise<void>}
   */
  async loadLesson(moduleId, lessonId) {
    // Clean up previous lesson
    this._cleanup();

    // Get lesson data
    const lesson = await moduleManager.startLesson(moduleId, lessonId);

    if (!lesson) {
      this._showError('Lesson not found');
      return;
    }

    this.currentModule = moduleId;
    this.currentLesson = lesson;

    // Render based on type
    switch (lesson.type) {
      case LESSON_TYPES.VIDEO:
        await this._renderVideo(lesson);
        break;
      case LESSON_TYPES.ARTICLE:
        await this._renderArticle(lesson);
        break;
      case LESSON_TYPES.QUIZ:
        await this._renderQuiz(lesson);
        break;
      case LESSON_TYPES.PROJECT:
        await this._renderProject(lesson);
        break;
      case LESSON_TYPES.CHALLENGE:
        await this._renderChallenge(lesson);
        break;
      default:
        this._showError(`Unknown lesson type: ${lesson.type}`);
    }

    eventBus.emit(EVENTS.MODULE_LESSON_START, {
      moduleId,
      lessonId,
      lesson
    });
  }

  /**
   * Complete current lesson
   * @param {Object} result - Completion result
   * @returns {Promise<Object>}
   */
  async completeLesson(result = {}) {
    if (!this.currentModule || !this.currentLesson) {
      return { success: false, error: 'No lesson loaded' };
    }

    const completionResult = await moduleManager.completeLesson(
      this.currentModule,
      this.currentLesson.id,
      result
    );

    if (completionResult.success) {
      this._showSuccess(completionResult);
    }

    return completionResult;
  }

  /**
   * Get current progress
   * @returns {Object}
   */
  getProgress() {
    if (!this.currentModule) return null;
    return moduleManager.getProgress(this.currentModule);
  }

  /**
   * Destroy the player
   */
  destroy() {
    this._cleanup();
    this.container.innerHTML = '';
  }

  // ============================================
  // PRIVATE: SETUP
  // ============================================

  _setupContainer() {
    this.container.classList.add('module-player');
    this.container.innerHTML = `
      <div class="player-header">
        <button class="player-back" aria-label="Back">
          <span>&larr;</span>
        </button>
        <div class="player-title">
          <h2 class="lesson-title"></h2>
          <span class="lesson-type"></span>
        </div>
        <div class="player-progress">
          <span class="progress-text">0%</span>
        </div>
      </div>
      <div class="player-content"></div>
      <div class="player-footer">
        <div class="player-nav">
          <button class="player-prev" disabled>Previous</button>
          <button class="player-next">Next</button>
        </div>
      </div>
    `;

    this.contentArea = this.container.querySelector('.player-content');
    this.titleEl = this.container.querySelector('.lesson-title');
    this.typeEl = this.container.querySelector('.lesson-type');
    this.progressEl = this.container.querySelector('.progress-text');
  }

  _bindEvents() {
    // Back button
    this.container.querySelector('.player-back')?.addEventListener('click', () => {
      eventBus.emit(EVENTS.MODULE_LESSON_COMPLETE, {
        moduleId: this.currentModule,
        lessonId: this.currentLesson?.id,
        cancelled: true
      });
    });

    // Navigation buttons
    this.container.querySelector('.player-prev')?.addEventListener('click', () => {
      this._navigatePrev();
    });

    this.container.querySelector('.player-next')?.addEventListener('click', () => {
      this._navigateNext();
    });
  }

  // ============================================
  // PRIVATE: RENDERERS
  // ============================================

  async _renderVideo(lesson) {
    this._updateHeader(lesson, 'Video');

    this.contentArea.innerHTML = `
      <div class="video-container">
        <video
          class="lesson-video"
          controls
          preload="metadata"
          poster="${lesson.thumbnail || ''}"
        >
          <source src="${lesson.url}" type="video/mp4">
          Your browser does not support video playback.
        </video>
        <div class="video-overlay">
          <button class="video-play-btn" aria-label="Play">
            <span>&#9654;</span>
          </button>
        </div>
      </div>
      <div class="video-description">
        <p>${lesson.description || ''}</p>
        <span class="video-duration">${lesson.duration || ''}</span>
      </div>
    `;

    this.videoElement = this.contentArea.querySelector('.lesson-video');
    this._setupVideoTracking();
  }

  async _renderArticle(lesson) {
    this._updateHeader(lesson, 'Article');

    this.contentArea.innerHTML = `
      <article class="lesson-article">
        <div class="article-content">
          ${lesson.content || '<p>Loading content...</p>'}
        </div>
        <div class="article-footer">
          <span class="reading-time">${lesson.duration || '5 min read'}</span>
          <button class="btn btn-primary mark-complete">Mark as Complete</button>
        </div>
      </article>
    `;

    // Mark complete button
    this.contentArea.querySelector('.mark-complete')?.addEventListener('click', async () => {
      await this.completeLesson({ type: 'article', readComplete: true });
    });
  }

  async _renderQuiz(lesson) {
    this._updateHeader(lesson, 'Quiz');

    this.quizState = {
      questions: lesson.questions || [],
      currentIndex: 0,
      answers: {},
      startTime: Date.now()
    };

    this._renderQuizQuestion();
  }

  _renderQuizQuestion() {
    const { questions, currentIndex, answers } = this.quizState;
    const question = questions[currentIndex];

    if (!question) {
      this._renderQuizResults();
      return;
    }

    const selectedAnswer = answers[question.id];
    const isLast = currentIndex === questions.length - 1;

    this.contentArea.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-progress">
          <span>Question ${currentIndex + 1} of ${questions.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${((currentIndex + 1) / questions.length) * 100}%"></div>
          </div>
        </div>
        <div class="quiz-question">
          <h3>${question.text}</h3>
        </div>
        <div class="quiz-options">
          ${question.options.map((opt, i) => `
            <button
              class="quiz-option ${selectedAnswer === i ? 'selected' : ''}"
              data-index="${i}"
            >
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="option-text">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="quiz-actions">
          <button class="btn btn-secondary quiz-prev" ${currentIndex === 0 ? 'disabled' : ''}>
            Previous
          </button>
          <button class="btn btn-primary quiz-next" ${selectedAnswer === undefined ? 'disabled' : ''}>
            ${isLast ? 'Submit' : 'Next'}
          </button>
        </div>
      </div>
    `;

    // Option selection
    this.contentArea.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index, 10);
        this.quizState.answers[question.id] = index;
        this._renderQuizQuestion();
      });
    });

    // Navigation
    this.contentArea.querySelector('.quiz-prev')?.addEventListener('click', () => {
      this.quizState.currentIndex--;
      this._renderQuizQuestion();
    });

    this.contentArea.querySelector('.quiz-next')?.addEventListener('click', () => {
      if (isLast) {
        this._submitQuiz();
      } else {
        this.quizState.currentIndex++;
        this._renderQuizQuestion();
      }
    });
  }

  async _submitQuiz() {
    const { questions, answers, startTime } = this.quizState;

    // Calculate score
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct) {
        correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    const timeSpent = Date.now() - startTime;

    const result = await this.completeLesson({
      type: 'quiz',
      score,
      correct,
      total: questions.length,
      timeSpent,
      answers
    });

    this._renderQuizResults(result);
  }

  _renderQuizResults(result = {}) {
    const passed = result.passed ?? false;
    const score = result.score ?? 0;
    const threshold = this.config.quizPassThreshold * 100;

    this.contentArea.innerHTML = `
      <div class="quiz-results ${passed ? 'passed' : 'failed'}">
        <div class="results-icon">
          ${passed ? '\u2705' : '\u274C'}
        </div>
        <h3>${passed ? 'Quiz Passed!' : 'Not Quite...'}</h3>
        <div class="results-score">
          <span class="score-value">${score}%</span>
          <span class="score-threshold">Required: ${threshold}%</span>
        </div>
        ${passed ? `
          <p class="results-message">Great job! You've completed this quiz.</p>
          ${result.xp ? `<p class="results-xp">+${result.xp} XP</p>` : ''}
        ` : `
          <p class="results-message">You need ${threshold}% to pass. Review the material and try again!</p>
          <button class="btn btn-primary retry-quiz">Try Again</button>
        `}
      </div>
    `;

    // Retry button
    this.contentArea.querySelector('.retry-quiz')?.addEventListener('click', () => {
      this.quizState = {
        ...this.quizState,
        currentIndex: 0,
        answers: {},
        startTime: Date.now()
      };
      this._renderQuizQuestion();
    });
  }

  async _renderProject(lesson) {
    this._updateHeader(lesson, 'Project');

    this.contentArea.innerHTML = `
      <div class="project-container">
        <div class="project-description">
          <h3>${lesson.title}</h3>
          <p>${lesson.description}</p>
        </div>
        <div class="project-requirements">
          <h4>Requirements</h4>
          <ul>
            ${(lesson.requirements || []).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        <div class="project-submission">
          <h4>Submit Your Work</h4>
          <textarea
            class="project-url"
            placeholder="Paste your GitHub repo URL or deployment link..."
            rows="3"
          ></textarea>
          <button class="btn btn-primary submit-project">Submit Project</button>
        </div>
      </div>
    `;

    // Submit handler
    this.contentArea.querySelector('.submit-project')?.addEventListener('click', async () => {
      const url = this.contentArea.querySelector('.project-url')?.value.trim();
      if (!url) {
        alert('Please enter a URL');
        return;
      }
      await this.completeLesson({ type: 'project', submissionUrl: url });
    });
  }

  async _renderChallenge(lesson) {
    this._updateHeader(lesson, 'Challenge');

    this.contentArea.innerHTML = `
      <div class="challenge-container">
        <div class="challenge-description">
          <h3>${lesson.title}</h3>
          <p>${lesson.description}</p>
        </div>
        <div class="challenge-instructions">
          ${lesson.instructions || ''}
        </div>
        <div class="challenge-submission">
          <button class="btn btn-primary complete-challenge">Mark as Complete</button>
        </div>
      </div>
    `;

    this.contentArea.querySelector('.complete-challenge')?.addEventListener('click', async () => {
      await this.completeLesson({ type: 'challenge' });
    });
  }

  // ============================================
  // PRIVATE: HELPERS
  // ============================================

  _updateHeader(lesson, type) {
    if (this.titleEl) this.titleEl.textContent = lesson.title || 'Lesson';
    if (this.typeEl) this.typeEl.textContent = type;
  }

  _setupVideoTracking() {
    if (!this.videoElement) return;

    // Track progress periodically
    this.progressInterval = setInterval(() => {
      if (this.videoElement && this.currentModule && this.currentLesson) {
        const percent = this.videoElement.currentTime / this.videoElement.duration;
        moduleManager.updateVideoProgress(
          this.currentModule,
          this.currentLesson.id,
          percent
        );
        this._updateProgress(percent);
      }
    }, this.config.videoProgressInterval);

    // Video ended
    this.videoElement.addEventListener('ended', async () => {
      await this.completeLesson({
        type: 'video',
        watchedPercent: 1,
        duration: this.videoElement.duration
      });
    });
  }

  _updateProgress(percent) {
    if (this.progressEl) {
      this.progressEl.textContent = `${Math.round(percent * 100)}%`;
    }
  }

  _showSuccess(result) {
    // Could integrate with toast system
    log.debug('Lesson completed:', result);
  }

  _showError(message) {
    this.contentArea.innerHTML = `
      <div class="player-error">
        <span class="error-icon">\u26A0</span>
        <p>${message}</p>
      </div>
    `;
  }

  _navigatePrev() {
    // TODO: Implement lesson navigation
  }

  _navigateNext() {
    // TODO: Implement lesson navigation
  }

  _cleanup() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement = null;
    }

    this.quizState = null;
  }
}

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.ModulePlayer = ModulePlayer;
}

export default ModulePlayer;
