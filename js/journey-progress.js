/**
 * Journey Progress System
 * MVP: localStorage-based progress tracking
 * Future: Wallet-based with SBTs on Solana
 *
 * Philosophy: Don't trust. Verify. Build.
 */


const JOURNEY_STORAGE_KEY = 'asdf_journey_progress';

// ============================================
// PROGRESS MANAGEMENT
// ============================================

/**
 * Get or create user progress
 * @returns {Object} User progress object
 */
function getJourneyProgress() {
  try {
    const stored = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (stored) {
      const progress = JSON.parse(stored);
      progress.lastActiveAt = new Date().toISOString();
      saveJourneyProgress(progress);
      return progress;
    }
  } catch (e) {
    console.error('Failed to load journey progress:', e);
  }

  const defaultProgress = createDefaultJourneyProgress();
  saveJourneyProgress(defaultProgress);
  return defaultProgress;
}

/**
 * Save progress to localStorage
 * @param {Object} progress - Progress object to save
 */
function saveJourneyProgress(progress) {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save journey progress:', e);
  }
}

/**
 * Create default progress state
 * @returns {Object} Default progress object
 */
function createDefaultJourneyProgress() {
  return {
    userId: generateJourneyUserId(),
    track: 'dev',
    totalXP: 0,
    currentLevel: 0,
    modules: {},
    skillPacks: {},
    lessons: {},
    achievements: [],
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a random user ID (MVP)
 * @returns {string} Random user ID
 */
function generateJourneyUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

// ============================================
// LESSON PROGRESS
// ============================================

/**
 * Start a lesson
 * @param {string} lessonId - Lesson ID
 * @returns {Object} Lesson progress object
 */
function startJourneyLesson(lessonId) {
  const progress = getJourneyProgress();

  if (!progress.lessons[lessonId]) {
    progress.lessons[lessonId] = {
      lessonId: lessonId,
      completed: false,
      startedAt: new Date().toISOString(),
      completedAt: null,
      contentProgress: {},
      quizAnswers: {},
      challengeCompleted: false,
    };
    saveJourneyProgress(progress);
  }

  return progress.lessons[lessonId];
}

/**
 * Mark content block as completed
 * @param {string} lessonId - Lesson ID
 * @param {string} blockId - Content block ID
 */
function markJourneyContentCompleted(lessonId, blockId) {
  let progress = getJourneyProgress();

  if (!progress.lessons[lessonId]) {
    startJourneyLesson(lessonId);
    progress = getJourneyProgress();
  }

  progress.lessons[lessonId].contentProgress[blockId] = true;
  saveJourneyProgress(progress);
}

/**
 * Record quiz answer
 * @param {string} lessonId - Lesson ID
 * @param {string} quizId - Quiz ID
 * @param {string} answerId - Selected answer ID
 * @param {boolean} correct - Whether answer was correct
 */
function recordJourneyQuizAnswer(lessonId, quizId, answerId, correct) {
  let progress = getJourneyProgress();

  if (!progress.lessons[lessonId]) {
    startJourneyLesson(lessonId);
    progress = getJourneyProgress();
  }

  progress.lessons[lessonId].quizAnswers[quizId] = {
    answerId: answerId,
    correct: correct,
  };
  saveJourneyProgress(progress);
}

/**
 * Mark challenge as completed
 * @param {string} lessonId - Lesson ID
 */
function markJourneyChallengeCompleted(lessonId) {
  let progress = getJourneyProgress();

  if (!progress.lessons[lessonId]) {
    startJourneyLesson(lessonId);
    progress = getJourneyProgress();
  }

  progress.lessons[lessonId].challengeCompleted = true;
  saveJourneyProgress(progress);
}

/**
 * Complete a lesson and award XP
 * @param {string} lessonId - Lesson ID
 * @param {number} xpReward - XP to award
 */
function completeJourneyLesson(lessonId, xpReward) {
  let progress = getJourneyProgress();

  if (!progress.lessons[lessonId]) {
    startJourneyLesson(lessonId);
    progress = getJourneyProgress();
  }

  const lesson = progress.lessons[lessonId];

  // Only award XP if not already completed
  if (!lesson.completed) {
    lesson.completed = true;
    lesson.completedAt = new Date().toISOString();
    progress.totalXP += xpReward;

    // Check for level up
    const newLevel = calculateJourneyLevel(progress.totalXP);
    if (newLevel > progress.currentLevel) {
      progress.currentLevel = newLevel;
      // Could trigger level-up notification here
    }

    saveJourneyProgress(progress);
  }
}

// ============================================
// LEVEL CALCULATIONS
// ============================================

/**
 * Calculate level from XP
 * @param {number} xp - Total XP
 * @returns {number} Level index
 */
function calculateJourneyLevel(xp) {
  for (let i = JOURNEY_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= JOURNEY_LEVELS[i].minXp) {
      return i;
    }
  }
  return 0;
}

/**
 * Get XP progress to next level
 * @param {number} xp - Total XP
 * @returns {Object} Progress info { current, max, percent }
 */
function getJourneyLevelProgress(xp) {
  const level = calculateJourneyLevel(xp);
  const currentLevel = JOURNEY_LEVELS[level];
  const nextLevel = JOURNEY_LEVELS[level + 1];

  if (!nextLevel) {
    return { current: xp - currentLevel.minXp, max: 1000, percent: 100 };
  }

  const current = xp - currentLevel.minXp;
  const max = nextLevel.minXp - currentLevel.minXp;
  const percent = Math.round((current / max) * 100);

  return { current: current, max: max, percent: percent };
}

// ============================================
// SKILL PACK & MODULE COMPLETION
// ============================================

/**
 * Check if skill pack is completed
 * @param {string} skillPackId - Skill pack ID
 * @param {Object} skillPack - Skill pack data
 * @returns {boolean} Whether completed
 */
function checkJourneySkillPackCompletion(skillPackId, skillPack) {
  const progress = getJourneyProgress();
  const lessonIds = skillPack.lessons.map(function (l) {
    return l.id;
  });

  const allCompleted = lessonIds.every(function (id) {
    return progress.lessons[id] && progress.lessons[id].completed;
  });

  if (allCompleted && (!progress.skillPacks[skillPackId] || !progress.skillPacks[skillPackId].completed)) {
    if (!progress.skillPacks[skillPackId]) {
      progress.skillPacks[skillPackId] = {
        skillPackId: skillPackId,
        lessonsCompleted: lessonIds,
        completed: false,
      };
    }
    progress.skillPacks[skillPackId].completed = true;
    progress.skillPacks[skillPackId].completedAt = new Date().toISOString();
    saveJourneyProgress(progress);
  }

  return allCompleted;
}

/**
 * Check if module is completed
 * @param {string} moduleId - Module ID
 * @param {Object} module - Module data
 * @returns {boolean} Whether completed
 */
function checkJourneyModuleCompletion(moduleId, module) {
  const progress = getJourneyProgress();
  const skillPackIds = module.skillPacks.map(function (sp) {
    return sp.id;
  });

  const allCompleted = skillPackIds.every(function (id) {
    return progress.skillPacks[id] && progress.skillPacks[id].completed;
  });

  if (allCompleted && (!progress.modules[moduleId] || !progress.modules[moduleId].completed)) {
    if (!progress.modules[moduleId]) {
      progress.modules[moduleId] = {
        moduleId: moduleId,
        skillPacksCompleted: skillPackIds,
        completed: false,
      };
    }
    progress.modules[moduleId].completed = true;
    progress.modules[moduleId].completedAt = new Date().toISOString();
    saveJourneyProgress(progress);
  }

  return allCompleted;
}

// ============================================
// STATS & UTILITIES
// ============================================

/**
 * Get completion stats for a module
 * @param {Object} module - Module data
 * @returns {Object} Stats object
 */
function getJourneyModuleStats(module) {
  const progress = getJourneyProgress();
  let totalLessons = 0;
  let completedLessons = 0;
  let totalXP = 0;
  let earnedXP = 0;

  module.skillPacks.forEach(function (skillPack) {
    skillPack.lessons.forEach(function (lesson) {
      const xp = getLessonXpReward(lesson);
      totalLessons++;
      totalXP += xp;

      if (progress.lessons[lesson.id] && progress.lessons[lesson.id].completed) {
        completedLessons++;
        earnedXP += xp;
      }
    });
  });

  const percentComplete = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalLessons: totalLessons,
    completedLessons: completedLessons,
    totalXP: totalXP,
    earnedXP: earnedXP,
    percentComplete: percentComplete,
  };
}

/**
 * Get lesson progress
 * @param {string} lessonId - Lesson ID
 * @returns {Object|null} Lesson progress or null
 */
function getJourneyLessonProgress(lessonId) {
  const progress = getJourneyProgress();
  return progress.lessons[lessonId] || null;
}

/**
 * Reset all progress (for testing)
 */
function resetJourneyProgress() {
  localStorage.removeItem(JOURNEY_STORAGE_KEY);
}

/**
 * Export progress as JSON (for backup/migration)
 * @returns {string} JSON string
 */
function exportJourneyProgress() {
  const progress = getJourneyProgress();
  return JSON.stringify(progress, null, 2);
}

/**
 * Import progress from JSON
 * @param {string} json - JSON string
 * @returns {boolean} Success
 */
function importJourneyProgress(json) {
  try {
    const progress = JSON.parse(json);
    saveJourneyProgress(progress);
    return true;
  } catch (e) {
    console.error('Failed to import progress:', e);
    return false;
  }
}
