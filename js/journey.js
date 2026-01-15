/**
 * Journey UI Components
 * Renders lessons, quizzes, and handles user interactions
 *
 * Philosophy: Don't trust. Verify. Build.
 */

/* eslint-disable no-unused-vars */

// ============================================
// STATE
// ============================================

var journeyState = {
  currentModule: null,
  currentSkillPack: null,
  currentLesson: null,
  currentContentIndex: 0,
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the Journey system
 */
function initJourney() {
  // Load curriculum and render modules
  renderJourneyModules();

  // Set up event listeners
  setupJourneyEventListeners();

  // Update stats display
  updateJourneyStatsDisplay();
}

/**
 * Set up event listeners for journey interactions
 */
function setupJourneyEventListeners() {
  // Module click handlers
  var moduleElements = document.querySelectorAll('.journey-module');
  moduleElements.forEach(function (el) {
    el.addEventListener('click', function () {
      var moduleId = this.dataset.module;
      var lessonId = this.dataset.lesson;
      if (moduleId && lessonId) {
        openJourneyLesson(moduleId, lessonId);
      }
    });
  });

  // Close modal handlers
  var closeBtn = document.getElementById('journey-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeJourneyModal);
  }

  var backdrop = document.getElementById('journey-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeJourneyModal);
  }

  // Begin Learning button
  var beginBtn = document.querySelector('.journey-cta-btn');
  if (beginBtn) {
    beginBtn.addEventListener('click', function () {
      // Open first unlocked lesson
      var firstModule = DEV_CURRICULUM[0];
      if (firstModule && firstModule.skillPacks[0] && firstModule.skillPacks[0].lessons[0]) {
        openJourneyLesson(firstModule.id, firstModule.skillPacks[0].lessons[0].id);
      }
    });
  }
}

// ============================================
// RENDERING
// ============================================

/**
 * Render all modules in the journey curriculum
 */
function renderJourneyModules() {
  var container = document.querySelector('.journey-modules');
  if (!container) return;

  var progress = getJourneyProgress();
  var html = '';

  DEV_CURRICULUM.forEach(function (module) {
    module.skillPacks.forEach(function (skillPack, spIndex) {
      skillPack.lessons.forEach(function (lesson, lessonIndex) {
        var lessonProgress = progress.lessons[lesson.id];
        var isCompleted = lessonProgress && lessonProgress.completed;
        var isUnlocked = canAccessLesson(lesson, progress);

        var statusClass = isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked';

        html +=
          '<div class="journey-module ' +
          statusClass +
          '" data-module="' +
          module.id +
          '" data-lesson="' +
          lesson.id +
          '">' +
          '<div class="journey-module-num">' +
          (spIndex * 10 + lessonIndex + 1) +
          '</div>' +
          '<div class="journey-module-info">' +
          '<span class="journey-module-name">' +
          escapeHtml(lesson.title) +
          '</span>' +
          '<span class="journey-module-lessons">' +
          lesson.estimatedTime +
          ' min</span>' +
          '</div>' +
          (isCompleted
            ? '<span class="journey-module-check">&#10004;</span>'
            : isUnlocked
              ? '<span class="journey-module-action">Start &#8594;</span>'
              : '<span class="journey-module-lock">&#128274;</span>') +
          '</div>';
      });
    });
  });

  container.innerHTML = html;

  // Re-attach event listeners after rendering
  var moduleElements = container.querySelectorAll('.journey-module.unlocked, .journey-module.completed');
  moduleElements.forEach(function (el) {
    el.addEventListener('click', function () {
      var moduleId = this.dataset.module;
      var lessonId = this.dataset.lesson;
      if (moduleId && lessonId) {
        openJourneyLesson(moduleId, lessonId);
      }
    });
  });
}

/**
 * Check if a lesson can be accessed
 * @param {Object} lesson - Lesson data
 * @param {Object} progress - User progress
 * @returns {boolean} Whether lesson is accessible
 */
function canAccessLesson(lesson, progress) {
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return true;
  }

  return lesson.prerequisites.every(function (prereqId) {
    return progress.lessons[prereqId] && progress.lessons[prereqId].completed;
  });
}

/**
 * Update the stats display in the sidebar
 */
function updateJourneyStatsDisplay() {
  var progress = getJourneyProgress();
  var level = getJourneyLevel(progress.totalXP);

  // Update XP display
  var xpEl = document.querySelector('.journey-stat-value');
  if (xpEl) {
    xpEl.textContent = progress.totalXP;
  }

  // Update progress bar
  var progressFill = document.getElementById('journey-progress-fill');
  var progressPct = document.getElementById('journey-progress-pct');
  if (progressFill && progressPct) {
    var levelProgress = getJourneyLevelProgress(progress.totalXP);
    progressFill.style.width = levelProgress.percent + '%';
    progressPct.textContent = levelProgress.percent + '%';
  }

  // Update level indicators
  var levelEls = document.querySelectorAll('.journey-level');
  levelEls.forEach(function (el, index) {
    el.classList.remove('active', 'completed');
    if (index < progress.currentLevel) {
      el.classList.add('completed');
    } else if (index === progress.currentLevel) {
      el.classList.add('active');
    }
  });

  // Update modules completed
  var completedCount = Object.values(progress.lessons).filter(function (l) {
    return l.completed;
  }).length;
  var totalLessons = 0;
  DEV_CURRICULUM.forEach(function (m) {
    m.skillPacks.forEach(function (sp) {
      totalLessons += sp.lessons.length;
    });
  });

  var modulesEl = document.querySelectorAll('.journey-stat-value')[1];
  if (modulesEl) {
    modulesEl.textContent = completedCount + '/' + totalLessons;
  }
}

// ============================================
// LESSON MODAL
// ============================================

/**
 * Open a lesson in the modal
 * @param {string} moduleId - Module ID
 * @param {string} lessonId - Lesson ID
 */
function openJourneyLesson(moduleId, lessonId) {
  // Find the lesson
  var module = DEV_CURRICULUM.find(function (m) {
    return m.id === moduleId;
  });
  if (!module) return;

  var lesson = null;
  module.skillPacks.forEach(function (sp) {
    var found = sp.lessons.find(function (l) {
      return l.id === lessonId;
    });
    if (found) lesson = found;
  });
  if (!lesson) return;

  // Update state
  journeyState.currentModule = module;
  journeyState.currentLesson = lesson;
  journeyState.currentContentIndex = 0;

  // Start lesson progress tracking
  startJourneyLesson(lessonId);

  // Render modal content
  renderLessonContent();

  // Show modal
  var modal = document.getElementById('journey-lesson-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close the lesson modal
 */
function closeJourneyModal() {
  var modal = document.getElementById('journey-lesson-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Update the module list to reflect any progress
  renderJourneyModules();
  updateJourneyStatsDisplay();
}

/**
 * Render the current lesson content
 */
function renderLessonContent() {
  var lesson = journeyState.currentLesson;
  if (!lesson) return;

  var titleEl = document.getElementById('journey-lesson-title');
  var subtitleEl = document.getElementById('journey-lesson-subtitle');
  var contentEl = document.getElementById('journey-lesson-content');
  var progressEl = document.getElementById('journey-lesson-progress');

  if (titleEl) titleEl.textContent = lesson.title;
  if (subtitleEl) subtitleEl.textContent = lesson.subtitle;

  // Render progress indicator
  if (progressEl) {
    var total = lesson.content.length;
    var current = journeyState.currentContentIndex + 1;
    progressEl.textContent = current + ' / ' + total;
  }

  // Render content block
  if (contentEl) {
    var block = lesson.content[journeyState.currentContentIndex];
    contentEl.innerHTML = renderContentBlock(block, lesson.id);

    // Attach quiz handlers if quiz block
    if (block.type === 'quiz') {
      attachQuizHandlers(block, lesson.id);
    }
  }

  // Update navigation buttons
  updateLessonNavigation();
}

/**
 * Render a single content block
 * @param {Object} block - Content block data
 * @param {string} lessonId - Lesson ID
 * @returns {string} HTML string
 */
function renderContentBlock(block, lessonId) {
  switch (block.type) {
    case 'theory':
      return renderTheoryBlock(block);
    case 'quiz':
      return renderQuizBlock(block, lessonId);
    case 'challenge':
      return renderChallengeBlock(block);
    case 'code':
      return renderCodeBlock(block);
    default:
      return '<p>Unknown content type: ' + block.type + '</p>';
  }
}

/**
 * Render theory content (markdown)
 * @param {Object} block - Theory block
 * @returns {string} HTML
 */
function renderTheoryBlock(block) {
  return '<div class="journey-theory">' + simpleMarkdown(block.content) + '</div>';
}

/**
 * Render quiz content
 * @param {Object} block - Quiz block
 * @param {string} lessonId - Lesson ID
 * @returns {string} HTML
 */
function renderQuizBlock(block, lessonId) {
  var progress = getJourneyProgress();
  var lessonProgress = progress.lessons[lessonId];
  var previousAnswer = lessonProgress && lessonProgress.quizAnswers[block.id];

  var html = '<div class="journey-quiz" data-quiz-id="' + block.id + '">';
  html += '<h3 class="journey-quiz-question">' + escapeHtml(block.content) + '</h3>';
  html += '<div class="journey-quiz-options">';

  block.options.forEach(function (option) {
    var isSelected = previousAnswer && previousAnswer.answerId === option.id;
    var isCorrect = option.id === block.correctAnswer;
    var showResult = previousAnswer !== undefined;

    var optionClass = 'journey-quiz-option';
    if (showResult && isSelected) {
      optionClass += isCorrect ? ' correct' : ' incorrect';
    } else if (showResult && isCorrect) {
      optionClass += ' correct-answer';
    }

    html +=
      '<button class="' +
      optionClass +
      '" data-option-id="' +
      option.id +
      '"' +
      (showResult ? ' disabled' : '') +
      '>' +
      '<span class="option-letter">' +
      option.id.toUpperCase() +
      '</span>' +
      '<span class="option-text">' +
      escapeHtml(option.text) +
      '</span>' +
      '</button>';

    if (showResult && isSelected && option.explanation) {
      html +=
        '<div class="journey-quiz-explanation ' +
        (isCorrect ? 'correct' : 'incorrect') +
        '">' +
        escapeHtml(option.explanation) +
        '</div>';
    }
  });

  html += '</div></div>';
  return html;
}

/**
 * Render code block
 * @param {Object} block - Code block
 * @returns {string} HTML
 */
function renderCodeBlock(block) {
  return (
    '<div class="journey-code">' +
    '<pre><code class="language-' +
    (block.language || 'text') +
    '">' +
    escapeHtml(block.content) +
    '</code></pre>' +
    '</div>'
  );
}

/**
 * Render challenge block
 * @param {Object} block - Challenge block
 * @returns {string} HTML
 */
function renderChallengeBlock(block) {
  var html = '<div class="journey-challenge">';
  html += '<h3>&#9889; Challenge</h3>';
  html += '<p>' + escapeHtml(block.content) + '</p>';

  if (block.solution) {
    html += '<details class="journey-challenge-solution">';
    html += '<summary>View Solution</summary>';
    html += '<pre><code>' + escapeHtml(block.solution) + '</code></pre>';
    html += '</details>';
  }

  html += '</div>';
  return html;
}

/**
 * Attach quiz option click handlers
 * @param {Object} block - Quiz block
 * @param {string} lessonId - Lesson ID
 */
function attachQuizHandlers(block, lessonId) {
  var options = document.querySelectorAll('.journey-quiz-option:not([disabled])');
  options.forEach(function (optionEl) {
    optionEl.addEventListener('click', function () {
      var optionId = this.dataset.optionId;
      var isCorrect = optionId === block.correctAnswer;

      // Record answer
      recordJourneyQuizAnswer(lessonId, block.id, optionId, isCorrect);

      // Re-render to show result
      renderLessonContent();
    });
  });
}

/**
 * Update navigation button states
 */
function updateLessonNavigation() {
  var lesson = journeyState.currentLesson;
  if (!lesson) return;

  var prevBtn = document.getElementById('journey-prev-btn');
  var nextBtn = document.getElementById('journey-next-btn');

  if (prevBtn) {
    prevBtn.disabled = journeyState.currentContentIndex === 0;
  }

  if (nextBtn) {
    var isLastBlock = journeyState.currentContentIndex >= lesson.content.length - 1;
    nextBtn.textContent = isLastBlock ? 'Complete Lesson' : 'Next';
  }
}

/**
 * Go to previous content block
 */
function journeyPrevContent() {
  if (journeyState.currentContentIndex > 0) {
    journeyState.currentContentIndex--;
    renderLessonContent();
  }
}

/**
 * Go to next content block or complete lesson
 */
function journeyNextContent() {
  var lesson = journeyState.currentLesson;
  if (!lesson) return;

  if (journeyState.currentContentIndex < lesson.content.length - 1) {
    journeyState.currentContentIndex++;
    renderLessonContent();
  } else {
    // Complete lesson
    var xpReward = getLessonXpReward(lesson);
    completeJourneyLesson(lesson.id, xpReward);

    // Show completion message
    showLessonComplete(lesson, xpReward);
  }
}

/**
 * Show lesson completion screen
 * @param {Object} lesson - Completed lesson
 * @param {number} xpReward - XP awarded
 */
function showLessonComplete(lesson, xpReward) {
  var contentEl = document.getElementById('journey-lesson-content');
  if (!contentEl) return;

  contentEl.innerHTML =
    '<div class="journey-complete">' +
    '<div class="journey-complete-icon">&#127881;</div>' +
    '<h2>Lesson Complete!</h2>' +
    '<p class="journey-complete-title">' +
    escapeHtml(lesson.title) +
    '</p>' +
    '<div class="journey-complete-xp">+' +
    xpReward +
    ' XP</div>' +
    '<div class="journey-complete-skills">' +
    '<h4>Skills Earned:</h4>' +
    '<ul>' +
    lesson.skills
      .map(function (s) {
        return '<li>' + escapeHtml(s.name) + ' (+' + s.xp + ' XP)</li>';
      })
      .join('') +
    '</ul>' +
    '</div>' +
    '<button class="btn btn-primary journey-complete-btn" onclick="closeJourneyModal()">Continue</button>' +
    '</div>';

  // Hide navigation
  var navEl = document.querySelector('.journey-lesson-nav');
  if (navEl) navEl.style.display = 'none';
}

// ============================================
// UTILITIES
// ============================================

/**
 * Simple markdown parser
 * @param {string} text - Markdown text
 * @returns {string} HTML
 */
function simpleMarkdown(text) {
  if (!text) return '';

  // Escape HTML first
  var html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
    return '<pre><code class="language-' + (lang || 'text') + '">' + code.trim() + '</code></pre>';
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Tables (basic support)
  html = html.replace(/\|(.+)\|/g, function (match, content) {
    var cells = content.split('|').map(function (c) {
      return c.trim();
    });
    if (cells.every(function (c) { return /^[-:]+$/.test(c); })) {
      return ''; // Skip separator row
    }
    return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');

  // Paragraphs (lines that aren't already wrapped)
  html = html
    .split('\n\n')
    .map(function (para) {
      para = para.trim();
      if (!para) return '';
      if (
        para.startsWith('<h') ||
        para.startsWith('<pre') ||
        para.startsWith('<ul') ||
        para.startsWith('<table') ||
        para.startsWith('<blockquote')
      ) {
        return para;
      }
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    })
    .join('\n');

  return html;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// INITIALIZE ON DOM READY
// ============================================

document.addEventListener('DOMContentLoaded', function () {
  // Only init if we're on a page with journey elements
  if (document.querySelector('.journey-section')) {
    initJourney();
  }
});
