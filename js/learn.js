/**
 * ASDF Learn Page
 * Simplified gamification for 5-section progressive learning
 */

(function () {
  'use strict';

  // ============================================
  // STATE
  // ============================================

  const STORAGE_KEY = 'asdf_learn_progress';
  const XP_REWARDS = {
    section: 25,
    quiz: 25,
    graduation: 100,
  };

  let state = {
    currentSection: 1,
    completedSections: [],
    totalXP: 0,
    quizzes: {
      quiz1: false,
      quiz2: false,
    },
  };

  // ============================================
  // DOM ELEMENTS
  // ============================================

  const progressBar = document.getElementById('learn-progress-bar');
  const totalXPDisplay = document.getElementById('total-xp');
  const completionOverlay = document.getElementById('completion-overlay');
  const finalXPDisplay = document.getElementById('final-xp');

  // ============================================
  // STORAGE
  // ============================================

  function loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = { ...state, ...JSON.parse(saved) };
        applyState();
      }
    } catch (e) {
      console.log('Could not load progress');
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.log('Could not save progress');
    }
  }

  // ============================================
  // UI UPDATES
  // ============================================

  function applyState() {
    // Update XP display
    if (totalXPDisplay) {
      totalXPDisplay.textContent = state.totalXP;
    }

    // Update progress bar
    if (progressBar) {
      const progress = (state.completedSections.length / 5) * 100;
      progressBar.style.width = `${progress}%`;
    }

    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach(dot => {
      const section = parseInt(dot.dataset.section);
      if (state.completedSections.includes(section)) {
        dot.classList.add('completed');
        dot.classList.remove('active');
      } else if (section === state.currentSection) {
        dot.classList.add('active');
      }
    });

    // Unlock sections
    for (let i = 1; i <= 5; i++) {
      const section = document.getElementById(`section-${i}`);
      if (section) {
        if (i <= state.currentSection || state.completedSections.includes(i - 1)) {
          section.classList.remove('locked');
        }
      }
    }

    // Enable quiz buttons if quiz completed
    if (state.quizzes.quiz1) {
      const btn = document.getElementById('btn-section-2');
      if (btn) {
        btn.disabled = false;
      }
    }
    if (state.quizzes.quiz2) {
      const btn = document.getElementById('btn-section-4');
      if (btn) {
        btn.disabled = false;
      }
    }
  }

  function addXP(amount) {
    state.totalXP += amount;
    if (totalXPDisplay) {
      totalXPDisplay.textContent = state.totalXP;
      totalXPDisplay.classList.add('xp-pulse');
      setTimeout(() => totalXPDisplay.classList.remove('xp-pulse'), 300);
    }
  }

  // ============================================
  // SECTION COMPLETION
  // ============================================

  window.completeSection = function (sectionNum) {
    // Already completed?
    if (state.completedSections.includes(sectionNum)) {
      scrollToNextSection(sectionNum);
      return;
    }

    // Check quiz requirement for sections 2 and 4
    if (sectionNum === 2 && !state.quizzes.quiz1) {
      return;
    }
    if (sectionNum === 4 && !state.quizzes.quiz2) {
      return;
    }

    // Mark as completed
    state.completedSections.push(sectionNum);

    // Award XP
    if (sectionNum === 5) {
      addXP(XP_REWARDS.graduation);
    } else {
      addXP(XP_REWARDS.section);
    }

    // Update current section
    if (sectionNum < 5) {
      state.currentSection = sectionNum + 1;
    }

    // Save and update UI
    saveProgress();
    applyState();

    // Check for completion
    if (sectionNum === 5) {
      showCompletion();
    } else {
      scrollToNextSection(sectionNum);
    }
  };

  function scrollToNextSection(currentNum) {
    const nextSection = document.getElementById(`section-${currentNum + 1}`);
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function showCompletion() {
    if (finalXPDisplay) {
      finalXPDisplay.textContent = state.totalXP;
    }
    if (completionOverlay) {
      completionOverlay.classList.add('show');
    }
  }

  // ============================================
  // QUIZ HANDLING
  // ============================================

  function setupQuizzes() {
    // Quiz 1 (Section 2)
    const quiz1Options = document.querySelectorAll('#quiz-1 .quiz-option');
    quiz1Options.forEach(option => {
      option.addEventListener('click', () =>
        handleQuizAnswer(option, 'quiz1', 'btn-section-2', 'quiz-1-feedback')
      );
    });

    // Quiz 2 (Section 4)
    const quiz2Options = document.querySelectorAll('#quiz-2 .quiz-option');
    quiz2Options.forEach(option => {
      option.addEventListener('click', () =>
        handleQuizAnswer(option, 'quiz2', 'btn-section-4', 'quiz-2-feedback')
      );
    });
  }

  function handleQuizAnswer(option, quizKey, btnId, feedbackId) {
    // Already answered?
    if (state.quizzes[quizKey]) {
      return;
    }

    const isCorrect = option.dataset.correct === 'true';
    const feedback = document.getElementById(feedbackId);
    const btn = document.getElementById(btnId);

    // Disable all options in this quiz
    const parent = option.closest('.quiz-options');
    parent.querySelectorAll('.quiz-option').forEach(opt => {
      opt.style.pointerEvents = 'none';
    });

    if (isCorrect) {
      option.classList.add('correct');
      if (feedback) {
        feedback.textContent = 'Correct! +25 XP';
        feedback.className = 'quiz-feedback show success';
      }

      state.quizzes[quizKey] = true;
      addXP(XP_REWARDS.quiz);

      if (btn) {
        btn.disabled = false;
      }

      saveProgress();
    } else {
      option.classList.add('incorrect');
      if (feedback) {
        feedback.textContent = 'Incorrect. Essaie encore.';
        feedback.className = 'quiz-feedback show error';
      }

      // Re-enable after delay
      setTimeout(() => {
        parent.querySelectorAll('.quiz-option').forEach(opt => {
          opt.style.pointerEvents = 'auto';
          opt.classList.remove('incorrect');
        });
        if (feedback) {
          feedback.classList.remove('show');
        }
      }, 1500);
    }
  }

  // ============================================
  // K-SCORE DEMO
  // ============================================

  function setupKScoreDemo() {
    const sliderD = document.getElementById('slider-d');
    const sliderO = document.getElementById('slider-o');
    const sliderL = document.getElementById('slider-l');
    const valueD = document.getElementById('value-d');
    const valueO = document.getElementById('value-o');
    const valueL = document.getElementById('value-l');
    const kscoreValue = document.getElementById('kscore-value');

    if (!sliderD || !sliderO || !sliderL) {
      return;
    }

    function updateKScore() {
      const d = parseInt(sliderD.value);
      const o = parseInt(sliderO.value);
      const l = parseInt(sliderL.value);

      if (valueD) {
        valueD.textContent = d;
      }
      if (valueO) {
        valueO.textContent = o;
      }
      if (valueL) {
        valueL.textContent = l;
      }

      // K = cube root of (D * O * L), normalized to 100
      const k = Math.round(Math.cbrt(d * o * l));
      if (kscoreValue) {
        kscoreValue.textContent = k;

        // Color based on score
        if (k === 0) {
          kscoreValue.style.color = 'var(--error)';
        } else if (k < 50) {
          kscoreValue.style.color = 'var(--warning)';
        } else {
          kscoreValue.style.color = 'var(--accent)';
        }
      }
    }

    sliderD.addEventListener('input', updateKScore);
    sliderO.addEventListener('input', updateKScore);
    sliderL.addEventListener('input', updateKScore);

    updateKScore();
  }

  // ============================================
  // SCROLL PROGRESS
  // ============================================

  function updateScrollProgress() {
    if (!progressBar) {
      return;
    }

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
      return;
    }

    const scrollPercent = (scrollTop / docHeight) * 100;

    // Update progress bar based on scroll (visual only, not actual progress)
    const actualProgress = (state.completedSections.length / 5) * 100;
    const displayProgress = Math.max(actualProgress, scrollPercent * 0.2);
    progressBar.style.width = `${Math.min(displayProgress, 100)}%`;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    loadProgress();
    setupQuizzes();
    setupKScoreDemo();

    // Scroll listener for progress
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // Close completion overlay on click outside
    if (completionOverlay) {
      completionOverlay.addEventListener('click', e => {
        if (e.target === completionOverlay) {
          completionOverlay.classList.remove('show');
        }
      });
    }
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
