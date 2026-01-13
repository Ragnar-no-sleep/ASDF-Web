/**
 * ASDF Journey - Enhanced Educational Modules
 * "THIS IS FINE" Philosophy Integration
 *
 * Features:
 * - Interactive quizzes (drag-drop, matching, timed challenges)
 * - Skill questionnaires with visual feedback
 * - Educational graphics (charts, diagrams, infographics)
 * - Themed lessons following ASDF philosophy
 *
 * Security: Input validation, XSS prevention, rate limiting
 * Version: 1.0.0
 */

'use strict';

// ============================================
// SECURITY UTILITIES
// ============================================

const JourneyModules = (function () {
  // Fibonacci sequence for ASDF philosophy
  const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

  function getFib(n) {
    if (n < 0) return 0;
    if (n < FIB.length) return FIB[n];
    return FIB[FIB.length - 1];
  }

  // XSS Prevention
  function escapeHtml(str) {
    if (typeof str !== 'string') {
      str = String(str ?? '');
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function sanitizeId(id) {
    if (typeof id !== 'string') return '';
    return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
  }

  // Rate Limiter for quiz submissions
  const RateLimiter = {
    _timestamps: {},
    _cooldowns: {
      quiz: 1000, // 1 second between quiz submissions
      drag: 200, // 200ms between drag operations
      answer: 500, // 500ms between answers
    },

    check(action) {
      const now = Date.now();
      const cooldown = this._cooldowns[action] || 500;
      const last = this._timestamps[action] || 0;
      if (now - last < cooldown) {
        return false;
      }
      this._timestamps[action] = now;
      return true;
    },
  };

  // ============================================
  // ASDF TIER SYSTEM
  // ============================================

  const ASDF_TIERS = {
    EMBER: { index: 0, name: 'EMBER', color: '#6b7280', xpMin: 0 },
    SPARK: { index: 1, name: 'SPARK', color: '#fbbf24', xpMin: getFib(8) },
    FLAME: { index: 2, name: 'FLAME', color: '#f97316', xpMin: getFib(11) },
    BLAZE: { index: 3, name: 'BLAZE', color: '#ef4444', xpMin: getFib(14) },
    INFERNO: { index: 4, name: 'INFERNO', color: '#dc2626', xpMin: getFib(17) },
  };

  function getTierFromXP(xp) {
    if (xp >= ASDF_TIERS.INFERNO.xpMin) return ASDF_TIERS.INFERNO;
    if (xp >= ASDF_TIERS.BLAZE.xpMin) return ASDF_TIERS.BLAZE;
    if (xp >= ASDF_TIERS.FLAME.xpMin) return ASDF_TIERS.FLAME;
    if (xp >= ASDF_TIERS.SPARK.xpMin) return ASDF_TIERS.SPARK;
    return ASDF_TIERS.EMBER;
  }

  // ============================================
  // EDUCATIONAL CONTENT - "THIS IS FINE" THEME
  // ============================================

  const LESSON_THEMES = {
    thisIsFine: {
      title: 'THIS IS FINE',
      motto: 'Embrace the chaos, build through the fire',
      icon: '🔥',
      colors: {
        primary: '#ea580c',
        secondary: '#f97316',
        accent: '#fbbf24',
        bg: '#1a0a00',
      },
    },
    fibonacci: {
      title: 'Mathematical Harmony',
      motto: 'All values derived from the golden sequence',
      icon: '🌀',
      colors: {
        primary: '#a855f7',
        secondary: '#8b5cf6',
        accent: '#c084fc',
        bg: '#0f0a1a',
      },
    },
    burn: {
      title: 'Burns Benefit Everyone',
      motto: 'Deflationary by design',
      icon: '🔥',
      colors: {
        primary: '#ef4444',
        secondary: '#dc2626',
        accent: '#f87171',
        bg: '#1a0505',
      },
    },
    verify: {
      title: 'Verify Everything',
      motto: 'Trust but verify on-chain',
      icon: '🔍',
      colors: {
        primary: '#22c55e',
        secondary: '#16a34a',
        accent: '#4ade80',
        bg: '#051a0a',
      },
    },
  };

  // ============================================
  // ENHANCED QUIZ TYPES
  // ============================================

  /**
   * Drag & Drop Quiz
   * Match items by dragging to correct zones
   */
  function createDragDropQuiz(config) {
    const { id, title, instruction, items, zones, onComplete } = config;

    // Validate inputs
    if (!Array.isArray(items) || !Array.isArray(zones)) {
      console.error('Invalid drag-drop config');
      return null;
    }

    const container = document.createElement('div');
    container.className = 'jm-quiz jm-drag-drop';
    container.dataset.quizId = sanitizeId(id);

    const state = {
      placements: {},
      completed: false,
    };

    container.innerHTML = `
            <div class="jm-quiz-header">
                <h3 class="jm-quiz-title">${escapeHtml(title)}</h3>
                <p class="jm-quiz-instruction">${escapeHtml(instruction)}</p>
            </div>
            <div class="jm-drag-items" id="jm-items-${sanitizeId(id)}">
                ${items
                  .map(
                    (item, i) => `
                    <div class="jm-drag-item" draggable="true" data-item-id="${i}" data-correct-zone="${sanitizeId(item.zone)}">
                        <span class="jm-drag-icon">${escapeHtml(item.icon || '📦')}</span>
                        <span class="jm-drag-label">${escapeHtml(item.label)}</span>
                    </div>
                `
                  )
                  .join('')}
            </div>
            <div class="jm-drop-zones">
                ${zones
                  .map(
                    zone => `
                    <div class="jm-drop-zone" data-zone-id="${sanitizeId(zone.id)}">
                        <div class="jm-zone-header">
                            <span class="jm-zone-icon">${escapeHtml(zone.icon || '📂')}</span>
                            <span class="jm-zone-name">${escapeHtml(zone.name)}</span>
                        </div>
                        <div class="jm-zone-content"></div>
                    </div>
                `
                  )
                  .join('')}
            </div>
            <div class="jm-quiz-actions">
                <button class="jm-btn jm-btn-check" disabled>Check Answers</button>
                <button class="jm-btn jm-btn-reset">Reset</button>
            </div>
            <div class="jm-quiz-feedback"></div>
        `;

    // Attach drag & drop events
    attachDragDropEvents(container, state, items, onComplete);

    return container;
  }

  function attachDragDropEvents(container, state, items, onComplete) {
    const draggables = container.querySelectorAll('.jm-drag-item');
    const dropZones = container.querySelectorAll('.jm-drop-zone');
    const itemsContainer = container.querySelector('.jm-drag-items');
    const checkBtn = container.querySelector('.jm-btn-check');
    const resetBtn = container.querySelector('.jm-btn-reset');
    const feedback = container.querySelector('.jm-quiz-feedback');

    let draggedItem = null;

    draggables.forEach(item => {
      item.addEventListener('dragstart', e => {
        if (!RateLimiter.check('drag')) return;
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
      });
    });

    dropZones.forEach(zone => {
      zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        if (draggedItem && !state.completed) {
          const zoneContent = zone.querySelector('.jm-zone-content');
          zoneContent.appendChild(draggedItem);
          state.placements[draggedItem.dataset.itemId] = zone.dataset.zoneId;
          updateCheckButton();
        }
      });
    });

    // Allow dropping back to items container
    itemsContainer.addEventListener('dragover', e => e.preventDefault());
    itemsContainer.addEventListener('drop', e => {
      e.preventDefault();
      if (draggedItem && !state.completed) {
        itemsContainer.appendChild(draggedItem);
        delete state.placements[draggedItem.dataset.itemId];
        updateCheckButton();
      }
    });

    function updateCheckButton() {
      const allPlaced = Object.keys(state.placements).length === items.length;
      checkBtn.disabled = !allPlaced;
    }

    checkBtn.addEventListener('click', () => {
      if (!RateLimiter.check('quiz')) return;

      let correct = 0;
      let total = items.length;

      draggables.forEach(item => {
        const itemId = item.dataset.itemId;
        const correctZone = item.dataset.correctZone;
        const placedZone = state.placements[itemId];

        if (placedZone === correctZone) {
          item.classList.add('correct');
          correct++;
        } else {
          item.classList.add('incorrect');
        }
      });

      state.completed = true;
      checkBtn.disabled = true;

      const score = Math.round((correct / total) * 100);
      const passed = score >= 70;

      feedback.innerHTML = `
                <div class="jm-feedback ${passed ? 'success' : 'warning'}">
                    <span class="jm-feedback-icon">${passed ? '🔥' : '💪'}</span>
                    <div class="jm-feedback-text">
                        <strong>${passed ? 'THIS IS FINE!' : 'Keep Building!'}</strong>
                        <p>You got ${correct}/${total} correct (${score}%)</p>
                    </div>
                </div>
            `;

      if (onComplete) {
        onComplete({ correct, total, score, passed });
      }
    });

    resetBtn.addEventListener('click', () => {
      state.placements = {};
      state.completed = false;
      draggables.forEach(item => {
        item.classList.remove('correct', 'incorrect');
        itemsContainer.appendChild(item);
      });
      checkBtn.disabled = true;
      feedback.innerHTML = '';
    });
  }

  /**
   * Matching Quiz
   * Connect related concepts with lines
   */
  function createMatchingQuiz(config) {
    const { id, title, instruction, pairs, onComplete } = config;

    if (!Array.isArray(pairs) || pairs.length === 0) {
      console.error('Invalid matching config');
      return null;
    }

    const container = document.createElement('div');
    container.className = 'jm-quiz jm-matching';
    container.dataset.quizId = sanitizeId(id);

    // Shuffle right column
    const shuffledRight = [...pairs].sort(() => Math.random() - 0.5);

    const state = {
      selectedLeft: null,
      matches: {},
      completed: false,
    };

    container.innerHTML = `
            <div class="jm-quiz-header">
                <h3 class="jm-quiz-title">${escapeHtml(title)}</h3>
                <p class="jm-quiz-instruction">${escapeHtml(instruction)}</p>
            </div>
            <div class="jm-match-container">
                <div class="jm-match-column jm-match-left">
                    ${pairs
                      .map(
                        (pair, i) => `
                        <div class="jm-match-item" data-left-id="${i}">
                            <span class="jm-match-icon">${escapeHtml(pair.leftIcon || '▶')}</span>
                            <span class="jm-match-text">${escapeHtml(pair.left)}</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
                <div class="jm-match-lines">
                    <svg class="jm-match-svg"></svg>
                </div>
                <div class="jm-match-column jm-match-right">
                    ${shuffledRight
                      .map(
                        (pair, i) => `
                        <div class="jm-match-item" data-right-id="${pairs.indexOf(pair)}">
                            <span class="jm-match-text">${escapeHtml(pair.right)}</span>
                            <span class="jm-match-icon">${escapeHtml(pair.rightIcon || '◀')}</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
            <div class="jm-quiz-actions">
                <button class="jm-btn jm-btn-check" disabled>Check Answers</button>
                <button class="jm-btn jm-btn-reset">Reset</button>
            </div>
            <div class="jm-quiz-feedback"></div>
        `;

    attachMatchingEvents(container, state, pairs, onComplete);

    return container;
  }

  function attachMatchingEvents(container, state, pairs, onComplete) {
    const leftItems = container.querySelectorAll('.jm-match-left .jm-match-item');
    const rightItems = container.querySelectorAll('.jm-match-right .jm-match-item');
    const checkBtn = container.querySelector('.jm-btn-check');
    const resetBtn = container.querySelector('.jm-btn-reset');
    const feedback = container.querySelector('.jm-quiz-feedback');
    const svg = container.querySelector('.jm-match-svg');

    leftItems.forEach(item => {
      item.addEventListener('click', () => {
        if (state.completed) return;

        leftItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        state.selectedLeft = item.dataset.leftId;
      });
    });

    rightItems.forEach(item => {
      item.addEventListener('click', () => {
        if (state.completed || state.selectedLeft === null) return;
        if (!RateLimiter.check('answer')) return;

        // Remove previous match for this left item
        if (state.matches[state.selectedLeft]) {
          const prevRight = container.querySelector(
            `[data-right-id="${state.matches[state.selectedLeft]}"]`
          );
          if (prevRight) prevRight.classList.remove('matched');
        }

        state.matches[state.selectedLeft] = item.dataset.rightId;

        const leftItem = container.querySelector(`[data-left-id="${state.selectedLeft}"]`);
        leftItem.classList.remove('selected');
        leftItem.classList.add('matched');
        item.classList.add('matched');

        state.selectedLeft = null;
        drawLines(container, state);
        updateCheckButton();
      });
    });

    function updateCheckButton() {
      checkBtn.disabled = Object.keys(state.matches).length !== pairs.length;
    }

    function drawLines(container, state) {
      const svgRect = svg.getBoundingClientRect();
      let paths = '';

      for (const [leftId, rightId] of Object.entries(state.matches)) {
        const leftItem = container.querySelector(`[data-left-id="${leftId}"]`);
        const rightItem = container.querySelector(`[data-right-id="${rightId}"]`);

        if (leftItem && rightItem) {
          const leftRect = leftItem.getBoundingClientRect();
          const rightRect = rightItem.getBoundingClientRect();

          const x1 = leftRect.right - svgRect.left;
          const y1 = leftRect.top + leftRect.height / 2 - svgRect.top;
          const x2 = rightRect.left - svgRect.left;
          const y2 = rightRect.top + rightRect.height / 2 - svgRect.top;

          paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                              class="jm-match-line" data-left="${leftId}" data-right="${rightId}"/>`;
        }
      }

      svg.innerHTML = paths;
    }

    checkBtn.addEventListener('click', () => {
      if (!RateLimiter.check('quiz')) return;

      let correct = 0;

      for (const [leftId, rightId] of Object.entries(state.matches)) {
        const isCorrect = leftId === rightId;
        const line = svg.querySelector(`[data-left="${leftId}"]`);

        if (isCorrect) {
          correct++;
          if (line) line.classList.add('correct');
        } else {
          if (line) line.classList.add('incorrect');
        }
      }

      state.completed = true;
      checkBtn.disabled = true;

      const score = Math.round((correct / pairs.length) * 100);
      const passed = score >= 70;

      feedback.innerHTML = `
                <div class="jm-feedback ${passed ? 'success' : 'warning'}">
                    <span class="jm-feedback-icon">${passed ? '🔥' : '💪'}</span>
                    <div class="jm-feedback-text">
                        <strong>${passed ? 'Mathematical Harmony!' : 'Almost There!'}</strong>
                        <p>You matched ${correct}/${pairs.length} correctly (${score}%)</p>
                    </div>
                </div>
            `;

      if (onComplete) {
        onComplete({ correct, total: pairs.length, score, passed });
      }
    });

    resetBtn.addEventListener('click', () => {
      state.matches = {};
      state.selectedLeft = null;
      state.completed = false;
      leftItems.forEach(i => i.classList.remove('selected', 'matched', 'correct', 'incorrect'));
      rightItems.forEach(i => i.classList.remove('matched', 'correct', 'incorrect'));
      svg.innerHTML = '';
      checkBtn.disabled = true;
      feedback.innerHTML = '';
    });

    // Redraw lines on resize
    window.addEventListener('resize', () => drawLines(container, state));
  }

  /**
   * Timed Challenge Quiz
   * Answer questions against the clock
   */
  function createTimedQuiz(config) {
    const { id, title, instruction, questions, timeLimit = 60, onComplete } = config;

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('Invalid timed quiz config');
      return null;
    }

    const container = document.createElement('div');
    container.className = 'jm-quiz jm-timed';
    container.dataset.quizId = sanitizeId(id);

    const state = {
      currentIndex: 0,
      score: 0,
      timeLeft: timeLimit,
      started: false,
      ended: false,
      timer: null,
    };

    container.innerHTML = `
            <div class="jm-quiz-header">
                <h3 class="jm-quiz-title">${escapeHtml(title)}</h3>
                <p class="jm-quiz-instruction">${escapeHtml(instruction)}</p>
            </div>
            <div class="jm-timed-stats">
                <div class="jm-stat">
                    <span class="jm-stat-icon">⏱️</span>
                    <span class="jm-stat-value" id="jm-timer-${sanitizeId(id)}">${timeLimit}</span>
                    <span class="jm-stat-label">seconds</span>
                </div>
                <div class="jm-stat">
                    <span class="jm-stat-icon">🔥</span>
                    <span class="jm-stat-value" id="jm-score-${sanitizeId(id)}">0</span>
                    <span class="jm-stat-label">correct</span>
                </div>
                <div class="jm-stat">
                    <span class="jm-stat-icon">📊</span>
                    <span class="jm-stat-value" id="jm-progress-${sanitizeId(id)}">0/${questions.length}</span>
                    <span class="jm-stat-label">answered</span>
                </div>
            </div>
            <div class="jm-timed-progress">
                <div class="jm-progress-bar" id="jm-timer-bar-${sanitizeId(id)}"></div>
            </div>
            <div class="jm-timed-question" id="jm-question-${sanitizeId(id)}">
                <button class="jm-btn jm-btn-start">Start Challenge 🔥</button>
            </div>
            <div class="jm-quiz-feedback"></div>
        `;

    attachTimedEvents(container, state, questions, timeLimit, onComplete, id);

    return container;
  }

  function attachTimedEvents(container, state, questions, timeLimit, onComplete, id) {
    const questionDiv = container.querySelector(`#jm-question-${sanitizeId(id)}`);
    const timerSpan = container.querySelector(`#jm-timer-${sanitizeId(id)}`);
    const scoreSpan = container.querySelector(`#jm-score-${sanitizeId(id)}`);
    const progressSpan = container.querySelector(`#jm-progress-${sanitizeId(id)}`);
    const timerBar = container.querySelector(`#jm-timer-bar-${sanitizeId(id)}`);
    const feedback = container.querySelector('.jm-quiz-feedback');
    const startBtn = container.querySelector('.jm-btn-start');

    startBtn.addEventListener('click', () => {
      state.started = true;
      state.timeLeft = timeLimit;
      state.score = 0;
      state.currentIndex = 0;
      showQuestion();
      startTimer();
    });

    function startTimer() {
      state.timer = setInterval(() => {
        state.timeLeft--;
        timerSpan.textContent = state.timeLeft;
        timerBar.style.width = `${(state.timeLeft / timeLimit) * 100}%`;

        if (state.timeLeft <= 10) {
          timerBar.classList.add('warning');
        }

        if (state.timeLeft <= 0) {
          endQuiz();
        }
      }, 1000);
    }

    function showQuestion() {
      if (state.currentIndex >= questions.length) {
        endQuiz();
        return;
      }

      const q = questions[state.currentIndex];
      questionDiv.innerHTML = `
                <div class="jm-timed-q">
                    <p class="jm-q-text">${escapeHtml(q.question)}</p>
                    <div class="jm-timed-input">
                        <input type="text" class="jm-answer-input" placeholder="Type your answer..." autocomplete="off">
                        <button class="jm-btn jm-btn-submit">→</button>
                    </div>
                </div>
            `;

      const input = questionDiv.querySelector('.jm-answer-input');
      const submitBtn = questionDiv.querySelector('.jm-btn-submit');

      input.focus();

      const submitAnswer = () => {
        if (!RateLimiter.check('answer')) return;

        const answer = input.value.trim().toLowerCase();
        const correct = q.answer.toLowerCase();

        if (answer === correct || answer.includes(correct) || correct.includes(answer)) {
          state.score++;
          scoreSpan.textContent = state.score;
          showFlash('correct');
        } else {
          showFlash('incorrect');
        }

        state.currentIndex++;
        progressSpan.textContent = `${state.currentIndex}/${questions.length}`;

        setTimeout(showQuestion, 300);
      };

      submitBtn.addEventListener('click', submitAnswer);
      input.addEventListener('keypress', e => {
        if (e.key === 'Enter') submitAnswer();
      });
    }

    function showFlash(type) {
      const flash = document.createElement('div');
      flash.className = `jm-flash jm-flash-${type}`;
      flash.textContent = type === 'correct' ? '✓' : '✗';
      container.appendChild(flash);
      setTimeout(() => flash.remove(), 300);
    }

    function endQuiz() {
      clearInterval(state.timer);
      state.ended = true;

      const score = Math.round((state.score / questions.length) * 100);
      const passed = score >= 70;

      // Calculate XP based on performance (Fibonacci-scaled)
      const xpEarned = getFib(Math.min(state.score + 5, 15));

      questionDiv.innerHTML = `
                <div class="jm-timed-results">
                    <div class="jm-result-icon">${passed ? '🔥' : '💪'}</div>
                    <h4>${passed ? 'THIS IS FINE!' : 'Keep Practicing!'}</h4>
                    <div class="jm-result-stats">
                        <div class="jm-result-stat">
                            <span class="jm-result-value">${state.score}</span>
                            <span class="jm-result-label">Correct</span>
                        </div>
                        <div class="jm-result-stat">
                            <span class="jm-result-value">${score}%</span>
                            <span class="jm-result-label">Score</span>
                        </div>
                        <div class="jm-result-stat">
                            <span class="jm-result-value">+${xpEarned}</span>
                            <span class="jm-result-label">XP</span>
                        </div>
                    </div>
                    <button class="jm-btn jm-btn-retry">Try Again</button>
                </div>
            `;

      const retryBtn = questionDiv.querySelector('.jm-btn-retry');
      retryBtn.addEventListener('click', () => {
        state.currentIndex = 0;
        state.score = 0;
        state.timeLeft = timeLimit;
        state.ended = false;
        timerBar.classList.remove('warning');
        timerBar.style.width = '100%';
        timerSpan.textContent = timeLimit;
        scoreSpan.textContent = '0';
        progressSpan.textContent = `0/${questions.length}`;
        showQuestion();
        startTimer();
      });

      if (onComplete) {
        onComplete({
          correct: state.score,
          total: questions.length,
          score,
          passed,
          xpEarned,
        });
      }
    }
  }

  // ============================================
  // SKILL QUESTIONNAIRE
  // ============================================

  /**
   * Create a skill assessment questionnaire
   * with visual feedback and recommendations
   */
  function createSkillQuestionnaire(config) {
    const { id, title, description, categories, onComplete } = config;

    if (!Array.isArray(categories) || categories.length === 0) {
      console.error('Invalid questionnaire config');
      return null;
    }

    const container = document.createElement('div');
    container.className = 'jm-questionnaire';
    container.dataset.questionnaireId = sanitizeId(id);

    const state = {
      currentCategory: 0,
      currentQuestion: 0,
      answers: {},
      scores: {},
    };

    // Initialize scores
    categories.forEach(cat => {
      state.scores[cat.id] = 0;
    });

    container.innerHTML = `
            <div class="jm-quest-header">
                <h3 class="jm-quest-title">${escapeHtml(title)}</h3>
                <p class="jm-quest-desc">${escapeHtml(description)}</p>
            </div>
            <div class="jm-quest-progress">
                ${categories
                  .map(
                    (cat, i) => `
                    <div class="jm-quest-step ${i === 0 ? 'active' : ''}" data-step="${i}">
                        <span class="jm-step-icon">${escapeHtml(cat.icon)}</span>
                        <span class="jm-step-name">${escapeHtml(cat.name)}</span>
                    </div>
                `
                  )
                  .join('')}
            </div>
            <div class="jm-quest-content" id="jm-quest-content-${sanitizeId(id)}"></div>
            <div class="jm-quest-results" id="jm-quest-results-${sanitizeId(id)}" style="display:none;"></div>
        `;

    renderQuestion(container, state, categories, onComplete, id);

    return container;
  }

  function renderQuestion(container, state, categories, onComplete, id) {
    const contentDiv = container.querySelector(`#jm-quest-content-${sanitizeId(id)}`);
    const cat = categories[state.currentCategory];
    const q = cat.questions[state.currentQuestion];

    const totalQuestions = categories.reduce((sum, c) => sum + c.questions.length, 0);
    let currentProgress = 0;
    for (let i = 0; i < state.currentCategory; i++) {
      currentProgress += categories[i].questions.length;
    }
    currentProgress += state.currentQuestion;
    const progressPercent = (currentProgress / totalQuestions) * 100;

    contentDiv.innerHTML = `
            <div class="jm-quest-category">
                <span class="jm-cat-icon">${escapeHtml(cat.icon)}</span>
                <span class="jm-cat-name">${escapeHtml(cat.name)}</span>
            </div>
            <div class="jm-quest-bar">
                <div class="jm-quest-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="jm-quest-question">
                <p class="jm-q-text">${escapeHtml(q.question)}</p>
                <div class="jm-quest-options">
                    ${q.options
                      .map(
                        (opt, i) => `
                        <button class="jm-quest-option" data-value="${i}" data-points="${opt.points || i}">
                            <span class="jm-opt-emoji">${escapeHtml(opt.emoji || getEmoji(i))}</span>
                            <span class="jm-opt-text">${escapeHtml(opt.text)}</span>
                        </button>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `;

    const options = contentDiv.querySelectorAll('.jm-quest-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        if (!RateLimiter.check('answer')) return;

        const points = parseInt(opt.dataset.points, 10);
        state.scores[cat.id] += points;
        state.answers[`${cat.id}-${state.currentQuestion}`] = points;

        // Next question
        state.currentQuestion++;
        if (state.currentQuestion >= cat.questions.length) {
          // Next category
          state.currentCategory++;
          state.currentQuestion = 0;

          // Update step indicators
          const steps = container.querySelectorAll('.jm-quest-step');
          steps.forEach((step, i) => {
            step.classList.remove('active', 'completed');
            if (i < state.currentCategory) step.classList.add('completed');
            if (i === state.currentCategory) step.classList.add('active');
          });
        }

        if (state.currentCategory >= categories.length) {
          showQuestionnaireResults(container, state, categories, onComplete, id);
        } else {
          renderQuestion(container, state, categories, onComplete, id);
        }
      });
    });
  }

  function getEmoji(index) {
    const emojis = ['😬', '🙂', '😊', '🔥', '⭐'];
    return emojis[index] || '•';
  }

  function showQuestionnaireResults(container, state, categories, onComplete, id) {
    const contentDiv = container.querySelector(`#jm-quest-content-${sanitizeId(id)}`);
    const resultsDiv = container.querySelector(`#jm-quest-results-${sanitizeId(id)}`);

    contentDiv.style.display = 'none';
    resultsDiv.style.display = 'block';

    // Calculate overall tier
    const totalScore = Object.values(state.scores).reduce((a, b) => a + b, 0);
    const maxScore = categories.reduce((sum, cat) => sum + cat.questions.length * 4, 0);
    const overallPercent = (totalScore / maxScore) * 100;
    const tier = getTierFromXP(totalScore);

    // Generate recommendations
    const recommendations = categories.map(cat => {
      const catMaxScore = cat.questions.length * 4;
      const catPercent = (state.scores[cat.id] / catMaxScore) * 100;
      return {
        ...cat,
        score: state.scores[cat.id],
        maxScore: catMaxScore,
        percent: catPercent,
        level: catPercent >= 80 ? 'advanced' : catPercent >= 50 ? 'intermediate' : 'beginner',
      };
    });

    resultsDiv.innerHTML = `
            <div class="jm-results-header">
                <div class="jm-tier-badge" style="background: ${tier.color}">
                    <span class="jm-tier-icon">🔥</span>
                    <span class="jm-tier-name">${escapeHtml(tier.name)}</span>
                </div>
                <h4>Your Skill Profile</h4>
                <p>Overall: ${Math.round(overallPercent)}% mastery</p>
            </div>
            <div class="jm-skill-chart">
                ${recommendations
                  .map(
                    rec => `
                    <div class="jm-skill-bar">
                        <div class="jm-skill-label">
                            <span class="jm-skill-icon">${escapeHtml(rec.icon)}</span>
                            <span class="jm-skill-name">${escapeHtml(rec.name)}</span>
                        </div>
                        <div class="jm-skill-track">
                            <div class="jm-skill-fill" style="width: ${rec.percent}%; background: ${getSkillColor(rec.percent)}"></div>
                        </div>
                        <span class="jm-skill-level">${escapeHtml(rec.level)}</span>
                    </div>
                `
                  )
                  .join('')}
            </div>
            <div class="jm-recommendations">
                <h5>🎯 Recommended Paths</h5>
                ${recommendations
                  .filter(r => r.percent < 80)
                  .sort((a, b) => a.percent - b.percent)
                  .slice(0, 2)
                  .map(
                    rec => `
                        <div class="jm-rec-card">
                            <span class="jm-rec-icon">${escapeHtml(rec.icon)}</span>
                            <div class="jm-rec-info">
                                <strong>Focus on ${escapeHtml(rec.name)}</strong>
                                <p>Start at ${escapeHtml(rec.level)} level to build foundations</p>
                            </div>
                            <button class="jm-btn jm-btn-small" data-path="${sanitizeId(rec.id)}" data-level="${rec.level}">
                                Start →
                            </button>
                        </div>
                    `
                  )
                  .join('')}
            </div>
        `;

    // Attach path button handlers
    resultsDiv.querySelectorAll('.jm-btn-small').forEach(btn => {
      btn.addEventListener('click', () => {
        if (onComplete) {
          onComplete({
            scores: state.scores,
            tier,
            recommendations,
            selectedPath: btn.dataset.path,
            selectedLevel: btn.dataset.level,
          });
        }
      });
    });
  }

  function getSkillColor(percent) {
    if (percent >= 80) return '#22c55e';
    if (percent >= 60) return '#fbbf24';
    if (percent >= 40) return '#f97316';
    return '#ef4444';
  }

  // ============================================
  // EDUCATIONAL GRAPHICS
  // ============================================

  /**
   * Create an animated Fibonacci spiral visualization
   */
  function createFibonacciSpiral(container, options = {}) {
    const { size = 300, animated = true, showNumbers = true } = options;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.className = 'jm-fibonacci-spiral';

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;

    // Draw Fibonacci spiral
    function drawSpiral() {
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(0, 0, size, size);

      // Draw squares and arcs
      let x = centerX;
      let y = centerY;
      const scale = size / 150;

      const colors = ['#ea580c', '#f97316', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7'];

      for (let i = 0; i < 8; i++) {
        const fib = FIB[i + 2] * scale;
        const prevFib = FIB[i + 1] * scale;

        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 2;

        // Draw arc
        ctx.beginPath();
        const startAngle = (i * Math.PI) / 2;
        const endAngle = ((i + 1) * Math.PI) / 2;
        ctx.arc(x, y, fib, startAngle, endAngle);
        ctx.stroke();

        // Update position for next square
        switch (i % 4) {
          case 0:
            y -= prevFib;
            break;
          case 1:
            x += prevFib;
            break;
          case 2:
            y += prevFib;
            break;
          case 3:
            x -= prevFib;
            break;
        }

        // Show Fibonacci numbers
        if (showNumbers) {
          ctx.fillStyle = '#ffffff80';
          ctx.font = `${10 + i}px monospace`;
          ctx.fillText(FIB[i + 2].toString(), x + 5, y + 15);
        }
      }
    }

    if (animated) {
      let animationFrame = 0;
      const animate = function () {
        drawSpiral();
        animationFrame = requestAnimationFrame(animate);
      };
      animate();

      // Cleanup on remove
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.removedNodes) {
            mutation.removedNodes.forEach(node => {
              if (node === canvas || node.contains?.(canvas)) {
                cancelAnimationFrame(animationFrame);
                observer.disconnect();
              }
            });
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      drawSpiral();
    }

    container.appendChild(canvas);
    return canvas;
  }

  /**
   * Create a burn progress chart
   */
  function createBurnChart(container, data) {
    const { burned, total, milestones } = data;

    const chartDiv = document.createElement('div');
    chartDiv.className = 'jm-burn-chart';

    const burnPercent = (burned / total) * 100;

    chartDiv.innerHTML = `
            <div class="jm-burn-header">
                <span class="jm-burn-icon">🔥</span>
                <h4>Token Burn Progress</h4>
            </div>
            <div class="jm-burn-visual">
                <div class="jm-burn-track">
                    <div class="jm-burn-fill" style="width: ${burnPercent}%">
                        <span class="jm-burn-flame">🔥</span>
                    </div>
                    ${milestones
                      .map(
                        m => `
                        <div class="jm-burn-milestone ${burned >= m.value ? 'reached' : ''}"
                             style="left: ${(m.value / total) * 100}%">
                            <span class="jm-milestone-marker"></span>
                            <span class="jm-milestone-label">${escapeHtml(m.label)}</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
            <div class="jm-burn-stats">
                <div class="jm-burn-stat">
                    <span class="jm-stat-value">${formatNumber(burned)}</span>
                    <span class="jm-stat-label">Burned</span>
                </div>
                <div class="jm-burn-stat">
                    <span class="jm-stat-value">${burnPercent.toFixed(2)}%</span>
                    <span class="jm-stat-label">of Supply</span>
                </div>
                <div class="jm-burn-stat">
                    <span class="jm-stat-value">${formatNumber(total - burned)}</span>
                    <span class="jm-stat-label">Remaining</span>
                </div>
            </div>
        `;

    container.appendChild(chartDiv);
    return chartDiv;
  }

  function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
  }

  /**
   * Create a tier progression chart
   */
  function createTierChart(container, currentXP) {
    const chartDiv = document.createElement('div');
    chartDiv.className = 'jm-tier-chart';

    const currentTier = getTierFromXP(currentXP);
    const tiers = Object.values(ASDF_TIERS);

    chartDiv.innerHTML = `
            <div class="jm-tier-header">
                <span class="jm-tier-icon">⚡</span>
                <h4>Your ASDF Tier Progress</h4>
            </div>
            <div class="jm-tier-track">
                ${tiers
                  .map((tier, i) => {
                    const isActive = tier.index === currentTier.index;
                    const isCompleted = tier.index < currentTier.index;
                    const nextTier = tiers[i + 1];
                    const progressToNext = nextTier
                      ? Math.min(
                          100,
                          ((currentXP - tier.xpMin) / (nextTier.xpMin - tier.xpMin)) * 100
                        )
                      : 100;

                    return `
                        <div class="jm-tier-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
                             style="--tier-color: ${tier.color}">
                            <div class="jm-tier-marker">
                                <span>${escapeHtml(tier.name.charAt(0))}</span>
                            </div>
                            <span class="jm-tier-name">${escapeHtml(tier.name)}</span>
                            <span class="jm-tier-xp">${formatNumber(tier.xpMin)} XP</span>
                            ${
                              isActive && nextTier
                                ? `
                                <div class="jm-tier-progress">
                                    <div class="jm-tier-progress-fill" style="width: ${progressToNext}%"></div>
                                </div>
                            `
                                : ''
                            }
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;

    container.appendChild(chartDiv);
    return chartDiv;
  }

  // ============================================
  // THEMED LESSON CARDS
  // ============================================

  /**
   * Create a "This is Fine" themed lesson card
   */
  function createThemedLesson(config) {
    const { id, theme, title, content, keyPoints, practicePrompt } = config;
    const themeData = LESSON_THEMES[theme] || LESSON_THEMES.thisIsFine;

    const lesson = document.createElement('div');
    lesson.className = 'jm-lesson';
    lesson.dataset.theme = theme;
    lesson.style.setProperty('--theme-primary', themeData.colors.primary);
    lesson.style.setProperty('--theme-secondary', themeData.colors.secondary);
    lesson.style.setProperty('--theme-accent', themeData.colors.accent);
    lesson.style.setProperty('--theme-bg', themeData.colors.bg);

    lesson.innerHTML = `
            <div class="jm-lesson-header">
                <div class="jm-lesson-badge">
                    <span class="jm-badge-icon">${escapeHtml(themeData.icon)}</span>
                    <span class="jm-badge-text">${escapeHtml(themeData.title)}</span>
                </div>
                <h3 class="jm-lesson-title">${escapeHtml(title)}</h3>
                <p class="jm-lesson-motto">"${escapeHtml(themeData.motto)}"</p>
            </div>
            <div class="jm-lesson-content">
                ${content}
            </div>
            ${
              keyPoints && keyPoints.length > 0
                ? `
                <div class="jm-lesson-keypoints">
                    <h4>🔑 Key Takeaways</h4>
                    <ul>
                        ${keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                    </ul>
                </div>
            `
                : ''
            }
            ${
              practicePrompt
                ? `
                <div class="jm-lesson-practice">
                    <h4>💪 Practice Challenge</h4>
                    <p>${escapeHtml(practicePrompt)}</p>
                </div>
            `
                : ''
            }
        `;

    return lesson;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Quiz creators
    createDragDropQuiz,
    createMatchingQuiz,
    createTimedQuiz,

    // Questionnaire
    createSkillQuestionnaire,

    // Graphics
    createFibonacciSpiral,
    createBurnChart,
    createTierChart,

    // Lessons
    createThemedLesson,

    // Utilities
    escapeHtml,
    sanitizeId,
    getFib,
    getTierFromXP,
    formatNumber,

    // Constants
    ASDF_TIERS,
    LESSON_THEMES,
    FIB,
  };
})();

// Export for global access
if (typeof window !== 'undefined') {
  window.JourneyModules = JourneyModules;
}
