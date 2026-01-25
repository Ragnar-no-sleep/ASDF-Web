/**
 * Progress Tracker - Comprehensive Learning Progress System
 * Tracks both generalist tracks (dev/games/content) and specialized project tracks
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'asdf_progress_v1';

// XP rewards per action
const XP_REWARDS = {
  lessonComplete: 100,
  moduleComplete: 500,
  courseComplete: 2000,
  projectExplored: 50,
  quizPassed: 250,
  dailyStreak: 50,
  weeklyStreak: 500,
  firstLesson: 200,
  firstModule: 1000,
};

// Level thresholds (cumulative XP)
const LEVELS = [
  { level: 1, xp: 0, title: 'Newcomer' },
  { level: 2, xp: 500, title: 'Apprentice' },
  { level: 3, xp: 1500, title: 'Learner' },
  { level: 4, xp: 3500, title: 'Builder' },
  { level: 5, xp: 7000, title: 'Developer' },
  { level: 6, xp: 12000, title: 'Craftsman' },
  { level: 7, xp: 20000, title: 'Expert' },
  { level: 8, xp: 32000, title: 'Master' },
  { level: 9, xp: 50000, title: 'Architect' },
  { level: 10, xp: 75000, title: 'Legend' },
];

// Badges definitions
const BADGES = {
  // Milestone badges
  firstLesson: {
    id: 'firstLesson',
    name: 'First Steps',
    icon: '👣',
    desc: 'Complete your first lesson',
  },
  firstModule: {
    id: 'firstModule',
    name: 'Module Master',
    icon: '📦',
    desc: 'Complete your first module',
  },
  firstCourse: {
    id: 'firstCourse',
    name: 'Course Champion',
    icon: '🎓',
    desc: 'Complete your first course',
  },

  // Track badges
  devTrack: {
    id: 'devTrack',
    name: 'Code Warrior',
    icon: '⚡',
    desc: 'Complete the Developer track',
  },
  gamesTrack: {
    id: 'gamesTrack',
    name: 'Game Creator',
    icon: '🎮',
    desc: 'Complete the Games track',
  },
  contentTrack: {
    id: 'contentTrack',
    name: 'Content King',
    icon: '👑',
    desc: 'Complete the Content track',
  },

  // Streak badges
  streak7: { id: 'streak7', name: 'Week Warrior', icon: '🔥', desc: '7-day learning streak' },
  streak30: { id: 'streak30', name: 'Monthly Master', icon: '💪', desc: '30-day learning streak' },
  streak100: { id: 'streak100', name: 'Century Club', icon: '🏆', desc: '100-day learning streak' },

  // Explorer badges
  explorer5: { id: 'explorer5', name: 'Explorer', icon: '🔍', desc: 'Explore 5 projects' },
  explorer10: { id: 'explorer10', name: 'Adventurer', icon: '🗺️', desc: 'Explore 10 projects' },
  explorer21: {
    id: 'explorer21',
    name: 'Cartographer',
    icon: '🌍',
    desc: 'Explore all 21 projects',
  },

  // Special badges
  fullStack: {
    id: 'fullStack',
    name: 'Full Stack',
    icon: '🌟',
    desc: 'Complete all 3 generalist tracks',
  },
  burnMaster: {
    id: 'burnMaster',
    name: 'Burn Master',
    icon: '🔥',
    desc: 'Complete Burn Engine specialized track',
  },
};

// Generalist tracks structure
const GENERALIST_TRACKS = {
  dev: {
    id: 'dev',
    name: 'Developer Track',
    icon: '💻',
    color: '#9945FF',
    courses: ['solana-fundamentals', 'anchor-framework', 'spl-tokens', 'asdf-integration'],
  },
  games: {
    id: 'games',
    name: 'Games Track',
    icon: '🎮',
    color: '#F97316',
    courses: ['game-fundamentals', 'asdf-game-engine', 'build-mini-game'],
  },
  content: {
    id: 'content',
    name: 'Content Track',
    icon: '🎨',
    color: '#10B981',
    courses: ['content-fundamentals', 'technical-writing', 'community-growth'],
  },
};

// ============================================
// PROGRESS TRACKER
// ============================================

const ProgressTracker = {
  // Progress data
  data: {
    // User info
    totalXp: 0,
    level: 1,

    // Streaks
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,

    // Completed items
    completedLessons: [], // ['course-id:lesson-id', ...]
    completedModules: [], // ['course-id', ...]
    completedCourses: [], // ['course-id', ...]
    exploredProjects: [], // ['project-id', ...]

    // Track progress (calculated)
    trackProgress: {
      dev: 0,
      games: 0,
      content: 0,
    },

    // Specialized track progress
    specializedProgress: {}, // { 'project-id': { lessonsCompleted: [], progress: 0 } }

    // Badges earned
    badges: [], // ['badge-id', ...]

    // History
    xpHistory: [], // [{ date, amount, reason }, ...]
  },

  // Event listeners
  _listeners: new Map(),

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the progress tracker
   */
  init() {
    this.loadFromStorage();
    this.checkDailyStreak();
    this.recalculateTrackProgress();
    console.log('[ProgressTracker] Initialized', {
      level: this.data.level,
      xp: this.data.totalXp,
      streak: this.data.currentStreak,
    });
    this.emit('initialized', this.getStats());
  },

  // ============================================
  // LESSON & MODULE COMPLETION
  // ============================================

  /**
   * Mark a lesson as complete
   * @param {string} courseId - Course ID
   * @param {string} lessonId - Lesson ID
   * @returns {Object} Rewards earned
   */
  completeLesson(courseId, lessonId) {
    const key = `${courseId}:${lessonId}`;
    if (this.data.completedLessons.includes(key)) {
      return { xp: 0, newBadges: [] };
    }

    this.data.completedLessons.push(key);
    const isFirst = this.data.completedLessons.length === 1;

    let xpEarned = XP_REWARDS.lessonComplete;
    const newBadges = [];

    // First lesson bonus
    if (isFirst) {
      xpEarned += XP_REWARDS.firstLesson;
      this.earnBadge('firstLesson');
      newBadges.push(BADGES.firstLesson);
    }

    this.addXp(xpEarned, `Completed lesson: ${lessonId}`);
    this.updateActivity();
    this.recalculateTrackProgress();
    this.saveToStorage();

    this.emit('lessonComplete', { courseId, lessonId, xpEarned, newBadges });
    return { xp: xpEarned, newBadges };
  },

  /**
   * Mark a module/course as complete
   * @param {string} courseId - Course ID
   * @returns {Object} Rewards earned
   */
  completeModule(courseId) {
    if (this.data.completedModules.includes(courseId)) {
      return { xp: 0, newBadges: [] };
    }

    this.data.completedModules.push(courseId);
    const isFirst = this.data.completedModules.length === 1;

    let xpEarned = XP_REWARDS.moduleComplete;
    const newBadges = [];

    // First module bonus
    if (isFirst) {
      xpEarned += XP_REWARDS.firstModule;
      this.earnBadge('firstModule');
      newBadges.push(BADGES.firstModule);
    }

    this.addXp(xpEarned, `Completed module: ${courseId}`);
    this.checkTrackCompletion();
    this.recalculateTrackProgress();
    this.saveToStorage();

    this.emit('moduleComplete', { courseId, xpEarned, newBadges });
    return { xp: xpEarned, newBadges };
  },

  /**
   * Mark a course as complete
   * @param {string} courseId - Course ID
   * @returns {Object} Rewards earned
   */
  completeCourse(courseId) {
    if (this.data.completedCourses.includes(courseId)) {
      return { xp: 0, newBadges: [] };
    }

    this.data.completedCourses.push(courseId);
    const isFirst = this.data.completedCourses.length === 1;

    const xpEarned = XP_REWARDS.courseComplete;
    const newBadges = [];

    // First course bonus
    if (isFirst) {
      this.earnBadge('firstCourse');
      newBadges.push(BADGES.firstCourse);
    }

    this.addXp(xpEarned, `Completed course: ${courseId}`);
    this.checkTrackCompletion();
    this.recalculateTrackProgress();
    this.saveToStorage();

    this.emit('courseComplete', { courseId, xpEarned, newBadges });
    return { xp: xpEarned, newBadges };
  },

  // ============================================
  // PROJECT EXPLORATION
  // ============================================

  /**
   * Mark a project as explored
   * @param {string} projectId - Project ID
   * @returns {Object} Rewards earned
   */
  exploreProject(projectId) {
    if (this.data.exploredProjects.includes(projectId)) {
      return { xp: 0, newBadges: [] };
    }

    this.data.exploredProjects.push(projectId);
    const count = this.data.exploredProjects.length;

    const xpEarned = XP_REWARDS.projectExplored;
    const newBadges = [];

    // Explorer badges
    if (count === 5) {
      this.earnBadge('explorer5');
      newBadges.push(BADGES.explorer5);
    } else if (count === 10) {
      this.earnBadge('explorer10');
      newBadges.push(BADGES.explorer10);
    } else if (count === 21) {
      this.earnBadge('explorer21');
      newBadges.push(BADGES.explorer21);
    }

    this.addXp(xpEarned, `Explored project: ${projectId}`);
    this.updateActivity();
    this.saveToStorage();

    this.emit('projectExplored', { projectId, xpEarned, newBadges });
    return { xp: xpEarned, newBadges };
  },

  // ============================================
  // SPECIALIZED TRACK PROGRESS
  // ============================================

  /**
   * Update specialized track progress for a project
   * @param {string} projectId - Project ID
   * @param {string} componentId - Component/skill ID completed
   */
  completeProjectComponent(projectId, componentId) {
    if (!this.data.specializedProgress[projectId]) {
      this.data.specializedProgress[projectId] = {
        lessonsCompleted: [],
        startedAt: Date.now(),
      };
    }

    const progress = this.data.specializedProgress[projectId];
    if (!progress.lessonsCompleted.includes(componentId)) {
      progress.lessonsCompleted.push(componentId);
      this.addXp(XP_REWARDS.lessonComplete, `Project component: ${projectId}/${componentId}`);
      this.saveToStorage();
      this.emit('componentComplete', { projectId, componentId });
    }
  },

  /**
   * Get specialized track progress for a project
   * @param {string} projectId - Project ID
   * @param {number} totalComponents - Total components in project
   * @returns {Object} Progress info
   */
  getSpecializedProgress(projectId, totalComponents = 6) {
    const progress = this.data.specializedProgress[projectId];
    if (!progress) {
      return { completed: 0, total: totalComponents, percent: 0 };
    }

    const completed = progress.lessonsCompleted.length;
    const percent = Math.round((completed / totalComponents) * 100);
    return { completed, total: totalComponents, percent };
  },

  // ============================================
  // XP & LEVEL SYSTEM
  // ============================================

  /**
   * Add XP and check for level up
   * @param {number} amount - XP amount
   * @param {string} reason - Reason for XP
   */
  addXp(amount, reason = '') {
    const oldLevel = this.data.level;
    this.data.totalXp += amount;

    // Record history (keep last 100)
    this.data.xpHistory.push({
      date: Date.now(),
      amount,
      reason,
    });
    if (this.data.xpHistory.length > 100) {
      this.data.xpHistory = this.data.xpHistory.slice(-100);
    }

    // Check for level up
    const newLevel = this.calculateLevel(this.data.totalXp);
    if (newLevel > oldLevel) {
      this.data.level = newLevel;
      this.emit('levelUp', {
        oldLevel,
        newLevel,
        title: LEVELS[newLevel - 1]?.title || 'Unknown',
      });
    }
  },

  /**
   * Calculate level from XP
   * @param {number} xp - Total XP
   * @returns {number} Level
   */
  calculateLevel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xp) {
        return LEVELS[i].level;
      }
    }
    return 1;
  },

  /**
   * Get XP needed for next level
   * @returns {Object} Current and next level info
   */
  getLevelProgress() {
    const currentLevel = LEVELS.find(l => l.level === this.data.level) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.level === this.data.level + 1);

    if (!nextLevel) {
      return {
        current: currentLevel,
        next: null,
        progress: 100,
        xpToNext: 0,
      };
    }

    const xpInLevel = this.data.totalXp - currentLevel.xp;
    const xpForLevel = nextLevel.xp - currentLevel.xp;
    const progress = Math.round((xpInLevel / xpForLevel) * 100);

    return {
      current: currentLevel,
      next: nextLevel,
      progress,
      xpToNext: nextLevel.xp - this.data.totalXp,
    };
  },

  // ============================================
  // STREAK SYSTEM
  // ============================================

  /**
   * Update last activity and check streak
   */
  updateActivity() {
    const today = this.getDateString(new Date());
    const lastDate = this.data.lastActivityDate;

    if (lastDate === today) {
      // Already active today
      return;
    }

    const yesterday = this.getDateString(new Date(Date.now() - 86400000));

    if (lastDate === yesterday) {
      // Consecutive day - increase streak
      this.data.currentStreak++;
      if (this.data.currentStreak > this.data.longestStreak) {
        this.data.longestStreak = this.data.currentStreak;
      }

      // Check streak badges
      this.checkStreakBadges();

      // Award streak XP
      this.addXp(XP_REWARDS.dailyStreak, 'Daily streak bonus');

      // Weekly bonus
      if (this.data.currentStreak % 7 === 0) {
        this.addXp(XP_REWARDS.weeklyStreak, 'Weekly streak bonus');
      }
    } else if (lastDate !== null) {
      // Streak broken
      this.data.currentStreak = 1;
    } else {
      // First activity
      this.data.currentStreak = 1;
    }

    this.data.lastActivityDate = today;
    this.emit('streakUpdate', { streak: this.data.currentStreak });
  },

  /**
   * Check daily streak on init
   */
  checkDailyStreak() {
    if (!this.data.lastActivityDate) return;

    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(new Date(Date.now() - 86400000));

    if (this.data.lastActivityDate !== today && this.data.lastActivityDate !== yesterday) {
      // Streak broken
      this.data.currentStreak = 0;
    }
  },

  /**
   * Check and award streak badges
   */
  checkStreakBadges() {
    if (this.data.currentStreak >= 7 && !this.data.badges.includes('streak7')) {
      this.earnBadge('streak7');
    }
    if (this.data.currentStreak >= 30 && !this.data.badges.includes('streak30')) {
      this.earnBadge('streak30');
    }
    if (this.data.currentStreak >= 100 && !this.data.badges.includes('streak100')) {
      this.earnBadge('streak100');
    }
  },

  /**
   * Get date string (YYYY-MM-DD)
   * @param {Date} date
   * @returns {string}
   */
  getDateString(date) {
    return date.toISOString().split('T')[0];
  },

  // ============================================
  // TRACK PROGRESS CALCULATION
  // ============================================

  /**
   * Recalculate all track progress percentages
   */
  recalculateTrackProgress() {
    Object.entries(GENERALIST_TRACKS).forEach(([trackId, track]) => {
      const totalCourses = track.courses.length;
      const completedCount = track.courses.filter(c =>
        this.data.completedModules.includes(c)
      ).length;
      this.data.trackProgress[trackId] = Math.round((completedCount / totalCourses) * 100);
    });
  },

  /**
   * Check if any track is complete and award badges
   */
  checkTrackCompletion() {
    Object.entries(GENERALIST_TRACKS).forEach(([trackId, track]) => {
      const allComplete = track.courses.every(c => this.data.completedModules.includes(c));
      if (allComplete) {
        const badgeId = `${trackId}Track`;
        if (!this.data.badges.includes(badgeId)) {
          this.earnBadge(badgeId);
        }
      }
    });

    // Check full stack badge
    const allTracksComplete = Object.values(this.data.trackProgress).every(p => p === 100);
    if (allTracksComplete && !this.data.badges.includes('fullStack')) {
      this.earnBadge('fullStack');
    }
  },

  /**
   * Get progress for a specific generalist track
   * @param {string} trackId - Track ID (dev/games/content)
   * @returns {Object} Track progress details
   */
  getTrackProgress(trackId) {
    const track = GENERALIST_TRACKS[trackId];
    if (!track) return null;

    const courseProgress = track.courses.map(courseId => ({
      courseId,
      completed: this.data.completedModules.includes(courseId),
      lessonsCompleted: this.data.completedLessons.filter(l => l.startsWith(`${courseId}:`)).length,
    }));

    return {
      ...track,
      percent: this.data.trackProgress[trackId],
      courses: courseProgress,
    };
  },

  // ============================================
  // BADGES
  // ============================================

  /**
   * Earn a badge
   * @param {string} badgeId - Badge ID
   */
  earnBadge(badgeId) {
    if (this.data.badges.includes(badgeId)) return;
    if (!BADGES[badgeId]) return;

    this.data.badges.push(badgeId);
    this.saveToStorage();
    this.emit('badgeEarned', { badge: BADGES[badgeId] });
  },

  /**
   * Get all earned badges
   * @returns {Array} Earned badges
   */
  getEarnedBadges() {
    return this.data.badges.map(id => BADGES[id]).filter(Boolean);
  },

  /**
   * Get all available badges
   * @returns {Object} All badges with earned status
   */
  getAllBadges() {
    return Object.values(BADGES).map(badge => ({
      ...badge,
      earned: this.data.badges.includes(badge.id),
    }));
  },

  // ============================================
  // STATS & SUMMARY
  // ============================================

  /**
   * Get overall stats
   * @returns {Object} Stats summary
   */
  getStats() {
    return {
      totalXp: this.data.totalXp,
      level: this.data.level,
      levelProgress: this.getLevelProgress(),
      streak: this.data.currentStreak,
      longestStreak: this.data.longestStreak,
      lessonsCompleted: this.data.completedLessons.length,
      modulesCompleted: this.data.completedModules.length,
      coursesCompleted: this.data.completedCourses.length,
      projectsExplored: this.data.exploredProjects.length,
      badgesEarned: this.data.badges.length,
      trackProgress: { ...this.data.trackProgress },
    };
  },

  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Save to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[ProgressTracker] Failed to save:', e);
    }
  },

  /**
   * Load from localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      console.warn('[ProgressTracker] Failed to load:', e);
    }
  },

  /**
   * Reset all progress (for testing)
   */
  reset() {
    this.data = {
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      completedLessons: [],
      completedModules: [],
      completedCourses: [],
      exploredProjects: [],
      trackProgress: { dev: 0, games: 0, content: 0 },
      specializedProgress: {},
      badges: [],
      xpHistory: [],
    };
    localStorage.removeItem(STORAGE_KEY);
    this.emit('reset', {});
  },

  // ============================================
  // EVENT SYSTEM
  // ============================================

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[ProgressTracker] Error in ${event} listener:`, e);
        }
      });
    }

    // Also emit to window
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`progress:${event}`, { detail: data }));
    }
  },
};

// Export
export { ProgressTracker, BADGES, LEVELS, GENERALIST_TRACKS, XP_REWARDS };
export default ProgressTracker;

// Global export
if (typeof window !== 'undefined') {
  window.ProgressTracker = ProgressTracker;
}
