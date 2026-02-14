/**
 * ASDF Achievements System
 * Track and reward user exploration and engagement
 *
 * Features:
 * - 20+ achievement definitions
 * - Rarity tiers (common, rare, epic, legendary)
 * - Auto-tracking of user actions
 * - Gallery UI with locked/unlocked states
 * - Progress tracking
 * - Visual unlock animations
 *
 * Usage:
 *   import { achievementSystem } from './utils/achievements.js';
 *   achievementSystem.track('burn_tokens', { amount: 100 });
 */

import { soundSystem } from './sound-system.js';
import { showSuccessAnimation } from './contextual-animations.js';

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

const ACHIEVEMENTS = {
  // === EXPLORATION (Common) ===
  first_visit: {
    id: 'first_visit',
    name: 'Welcome Aboard',
    description: 'Visit ASDF for the first time',
    icon: '👋',
    rarity: 'common',
    condition: { type: 'page_visit', count: 1 },
  },

  explorer: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Visit 5 different pages',
    icon: '🗺️',
    rarity: 'common',
    condition: { type: 'unique_pages', count: 5 },
  },

  deep_diver: {
    id: 'deep_diver',
    name: 'Deep Diver',
    description: 'Scroll to the bottom of 5 pages',
    icon: '🏊',
    rarity: 'common',
    condition: { type: 'scroll_bottom', count: 5 },
  },

  // === ACTIONS (Common/Rare) ===
  first_burn: {
    id: 'first_burn',
    name: 'First Burn',
    description: 'Burn tokens for the first time',
    icon: '🔥',
    rarity: 'common',
    condition: { type: 'burn_tokens', count: 1 },
  },

  pyromaniac: {
    id: 'pyromaniac',
    name: 'Pyromaniac',
    description: 'Burn tokens 10 times',
    icon: '🔥',
    rarity: 'rare',
    condition: { type: 'burn_tokens', count: 10 },
  },

  whale_burn: {
    id: 'whale_burn',
    name: 'Whale Burn',
    description: 'Burn 10,000+ tokens in a single transaction',
    icon: '🐳',
    rarity: 'epic',
    condition: { type: 'burn_amount', amount: 10000 },
  },

  first_stake: {
    id: 'first_stake',
    name: 'Diamond Hands',
    description: 'Stake tokens for the first time',
    icon: '💎',
    rarity: 'common',
    condition: { type: 'stake_tokens', count: 1 },
  },

  hodler: {
    id: 'hodler',
    name: 'True HODLer',
    description: 'Keep tokens staked for 30 days',
    icon: '🏔️',
    rarity: 'epic',
    condition: { type: 'stake_duration', days: 30 },
  },

  // === ENGAGEMENT (Rare) ===
  daily_streak_7: {
    id: 'daily_streak_7',
    name: 'Week Warrior',
    description: 'Visit 7 days in a row',
    icon: '📅',
    rarity: 'rare',
    condition: { type: 'daily_streak', days: 7 },
  },

  daily_streak_30: {
    id: 'daily_streak_30',
    name: 'Monthly Master',
    description: 'Visit 30 days in a row',
    icon: '🌙',
    rarity: 'epic',
    condition: { type: 'daily_streak', days: 30 },
  },

  // === GAMES (Common/Rare) ===
  first_game: {
    id: 'first_game',
    name: 'Game On',
    description: 'Play your first game',
    icon: '🎮',
    rarity: 'common',
    condition: { type: 'play_game', count: 1 },
  },

  high_scorer: {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Reach top 10 on any leaderboard',
    icon: '🏆',
    rarity: 'rare',
    condition: { type: 'leaderboard_rank', rank: 10 },
  },

  perfect_score: {
    id: 'perfect_score',
    name: 'Perfectionist',
    description: 'Get a perfect score in any game',
    icon: '⭐',
    rarity: 'epic',
    condition: { type: 'perfect_score', count: 1 },
  },

  // === SECRETS (Epic/Legendary) ===
  konami_code: {
    id: 'konami_code',
    name: 'Konami Master',
    description: 'Unlock the legendary cheat code',
    icon: '🎮',
    rarity: 'epic',
    condition: { type: 'konami_unlock', count: 1 },
  },

  curiosity_seeker: {
    id: 'curiosity_seeker',
    name: 'Curiosity Seeker',
    description: 'Find a hidden secret',
    icon: '🔍',
    rarity: 'rare',
    condition: { type: 'secret_found', count: 1 },
  },

  secret_collector: {
    id: 'secret_collector',
    name: 'Secret Collector',
    description: 'Find all 5 hidden secrets',
    icon: '🗝️',
    rarity: 'legendary',
    condition: { type: 'secret_found', count: 5 },
  },

  // === COMMUNITY (Rare/Epic) ===
  builder: {
    id: 'builder',
    name: 'Builder',
    description: 'Complete a formation course',
    icon: '🏗️',
    rarity: 'rare',
    condition: { type: 'complete_course', count: 1 },
  },

  architect: {
    id: 'architect',
    name: 'Architect',
    description: 'Complete 3 formation courses',
    icon: '🏛️',
    rarity: 'epic',
    condition: { type: 'complete_course', count: 3 },
  },

  // === ULTIMATE (Legendary) ===
  completionist: {
    id: 'completionist',
    name: 'Completionist',
    description: 'Unlock all other achievements',
    icon: '👑',
    rarity: 'legendary',
    condition: { type: 'all_achievements', count: 19 }, // Total - 1
  },
};

// ============================================
// ACHIEVEMENT SYSTEM
// ============================================

class AchievementSystem {
  constructor() {
    this.achievements = ACHIEVEMENTS;
    this.progress = this.loadProgress();
    this.unlocked = this.loadUnlocked();

    this.init();
  }

  init() {
    // Track page visits
    this.trackPageVisit();

    // Track daily streak
    this.trackDailyStreak();

    console.log('🏆 Achievement system initialized');
    console.log(`Unlocked: ${this.unlocked.length}/${Object.keys(this.achievements).length}`);
  }

  /**
   * Load progress from localStorage
   */
  loadProgress() {
    const stored = localStorage.getItem('asdf_achievement_progress');
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Load unlocked achievements
   */
  loadUnlocked() {
    const stored = localStorage.getItem('asdf_achievements_unlocked');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    localStorage.setItem('asdf_achievement_progress', JSON.stringify(this.progress));
    localStorage.setItem('asdf_achievements_unlocked', JSON.stringify(this.unlocked));
  }

  /**
   * Track an action/event
   * @param {string} actionType - Type of action (burn_tokens, stake_tokens, etc.)
   * @param {Object} data - Additional data (amount, count, etc.)
   */
  track(actionType, data = {}) {
    // Initialize progress for this action type
    if (!this.progress[actionType]) {
      this.progress[actionType] = { count: 0, amount: 0, data: [] };
    }

    // Increment count
    this.progress[actionType].count += 1;

    // Add amount if provided
    if (data.amount) {
      this.progress[actionType].amount += data.amount;
    }

    // Store data
    if (data) {
      this.progress[actionType].data.push({
        timestamp: Date.now(),
        ...data,
      });
    }

    this.saveProgress();

    // Check for achievement unlocks
    this.checkUnlocks();
  }

  /**
   * Check if any achievements should unlock
   */
  checkUnlocks() {
    Object.values(this.achievements).forEach(achievement => {
      if (this.unlocked.includes(achievement.id)) return; // Already unlocked

      if (this.checkCondition(achievement.condition)) {
        this.unlock(achievement);
      }
    });

    // Check completionist (all other achievements)
    if (this.unlocked.length === Object.keys(this.achievements).length - 1) {
      const completionist = this.achievements.completionist;
      if (!this.unlocked.includes(completionist.id)) {
        this.unlock(completionist);
      }
    }
  }

  /**
   * Check if achievement condition is met
   */
  checkCondition(condition) {
    const { type, count, amount, days, rank } = condition;
    const progress = this.progress[type];

    if (!progress) return false;

    // Count-based
    if (count !== undefined) {
      return progress.count >= count;
    }

    // Amount-based
    if (amount !== undefined) {
      // Check if any single entry has amount >= threshold
      return progress.data.some(entry => entry.amount >= amount);
    }

    // Days-based (daily streak)
    if (days !== undefined) {
      return this.checkDailyStreak(days);
    }

    // Rank-based
    if (rank !== undefined) {
      return progress.data.some(entry => entry.rank <= rank);
    }

    return false;
  }

  /**
   * Unlock an achievement
   */
  unlock(achievement) {
    this.unlocked.push(achievement.id);
    this.saveProgress();

    console.log(`🏆 Achievement unlocked: ${achievement.name}`);

    // Play sound
    soundSystem.play('success');

    // Show unlock animation
    this.showUnlockAnimation(achievement);
  }

  /**
   * Show unlock animation
   */
  showUnlockAnimation(achievement) {
    const rarityColors = {
      common: '#ffffff',
      rare: '#3b82f6',
      epic: '#9945ff',
      legendary: '#fbbf24',
    };

    const overlay = document.createElement('div');
    overlay.className = 'achievement-unlock-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fade-in 300ms ease-out;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; animation: scale-in 400ms ease-out;">
        <div style="font-size: 80px; margin-bottom: 16px;">${achievement.icon}</div>
        <div style="font-size: 14px; color: ${rarityColors[achievement.rarity]}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
          ${achievement.rarity}
        </div>
        <div style="font-size: 32px; font-weight: 700; margin-bottom: 12px;">
          ${achievement.name}
        </div>
        <div style="font-size: 16px; color: rgba(255, 255, 255, 0.7); max-width: 400px;">
          ${achievement.description}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Create particles based on rarity
    const particleCount = { common: 20, rare: 40, epic: 60, legendary: 100 }[achievement.rarity];
    this.createParticles(overlay, particleCount, rarityColors[achievement.rarity]);

    // Remove after 3 seconds
    setTimeout(() => {
      overlay.style.animation = 'fade-out 300ms ease-out';
      setTimeout(() => overlay.remove(), 300);
    }, 3000);
  }

  /**
   * Create particle effects
   */
  createParticles(container, count, color) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const x = Math.random() * 100;
      const y = Math.random() * 100;

      particle.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: 8px;
        height: 8px;
        background: ${color};
        border-radius: 50%;
        animation: confetti-fall ${1500 + Math.random() * 2000}ms ease-in forwards;
      `;

      container.appendChild(particle);
    }
  }

  /**
   * Track page visit
   */
  trackPageVisit() {
    const currentPage = window.location.pathname;

    // Track unique pages
    const visitedPages = JSON.parse(localStorage.getItem('asdf_visited_pages') || '[]');

    if (!visitedPages.includes(currentPage)) {
      visitedPages.push(currentPage);
      localStorage.setItem('asdf_visited_pages', JSON.stringify(visitedPages));

      this.track('page_visit');
      this.track('unique_pages', { page: currentPage });
    }
  }

  /**
   * Track daily streak
   */
  trackDailyStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('asdf_last_visit_date');
    const streak = parseInt(localStorage.getItem('asdf_daily_streak') || '0', 10);

    if (lastVisit !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastVisit === yesterday.toDateString()) {
        // Streak continues
        const newStreak = streak + 1;
        localStorage.setItem('asdf_daily_streak', newStreak.toString());
        this.track('daily_streak', { streak: newStreak });
      } else {
        // Streak broken
        localStorage.setItem('asdf_daily_streak', '1');
        this.track('daily_streak', { streak: 1 });
      }

      localStorage.setItem('asdf_last_visit_date', today);
    }
  }

  /**
   * Check daily streak condition
   */
  checkDailyStreak(requiredDays) {
    const currentStreak = parseInt(localStorage.getItem('asdf_daily_streak') || '0', 10);
    return currentStreak >= requiredDays;
  }

  /**
   * Get all achievements with unlock status
   */
  getAllAchievements() {
    return Object.values(this.achievements).map(achievement => ({
      ...achievement,
      unlocked: this.unlocked.includes(achievement.id),
      progress: this.getAchievementProgress(achievement),
    }));
  }

  /**
   * Get progress for specific achievement
   */
  getAchievementProgress(achievement) {
    const { type, count, amount, days } = achievement.condition;
    const progress = this.progress[type];

    if (!progress) return 0;

    if (count !== undefined) {
      return Math.min((progress.count / count) * 100, 100);
    }

    if (amount !== undefined) {
      const maxAmount = Math.max(...progress.data.map(d => d.amount || 0));
      return Math.min((maxAmount / amount) * 100, 100);
    }

    if (days !== undefined) {
      const currentStreak = parseInt(localStorage.getItem('asdf_daily_streak') || '0', 10);
      return Math.min((currentStreak / days) * 100, 100);
    }

    return 0;
  }
}

// Singleton instance
export const achievementSystem = new AchievementSystem();

// ============================================
// ACHIEVEMENT GALLERY UI
// ============================================

export function createAchievementGallery(container) {
  const achievements = achievementSystem.getAllAchievements();

  // Group by rarity
  const byRarity = {
    common: achievements.filter(a => a.rarity === 'common'),
    rare: achievements.filter(a => a.rarity === 'rare'),
    epic: achievements.filter(a => a.rarity === 'epic'),
    legendary: achievements.filter(a => a.rarity === 'legendary'),
  };

  const gallery = document.createElement('div');
  gallery.className = 'achievement-gallery';

  // Stats header
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  gallery.innerHTML = `
    <div class="achievement-stats">
      <div class="achievement-stats-count">${unlockedCount}/${totalCount}</div>
      <div class="achievement-stats-label">Achievements Unlocked</div>
      <div class="achievement-stats-progress">
        <div class="achievement-stats-bar" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
      </div>
    </div>
  `;

  // Render by rarity
  Object.entries(byRarity).forEach(([rarity, list]) => {
    if (list.length === 0) return;

    const section = document.createElement('div');
    section.className = `achievement-section achievement-section-${rarity}`;
    section.innerHTML = `<h3>${rarity.toUpperCase()}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'achievement-grid';

    list.forEach(achievement => {
      const card = createAchievementCard(achievement);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    gallery.appendChild(section);
  });

  container.appendChild(gallery);
}

function createAchievementCard(achievement) {
  const card = document.createElement('div');
  card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;

  card.innerHTML = `
    <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
    <div class="achievement-name">${achievement.unlocked ? achievement.name : '???'}</div>
    <div class="achievement-desc">${achievement.unlocked ? achievement.description : 'Locked'}</div>
    ${
      !achievement.unlocked && achievement.progress > 0
        ? `
      <div class="achievement-progress">
        <div class="achievement-progress-bar" style="width: ${achievement.progress}%"></div>
      </div>
      <div class="achievement-progress-text">${Math.floor(achievement.progress)}%</div>
    `
        : ''
    }
  `;

  return card;
}

// ============================================
// CSS INJECTION
// ============================================

const style = document.createElement('style');
style.textContent = `
  .achievement-gallery {
    padding: 24px;
  }

  .achievement-stats {
    text-align: center;
    margin-bottom: 32px;
    padding: 24px;
    background: var(--color-bg-surface);
    border-radius: 16px;
  }

  .achievement-stats-count {
    font-size: 48px;
    font-weight: 700;
    color: var(--color-fire);
    margin-bottom: 8px;
  }

  .achievement-stats-label {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin-bottom: 16px;
  }

  .achievement-stats-progress {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .achievement-stats-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-fire), var(--color-fire-light));
    transition: width 600ms ease-out;
  }

  .achievement-section {
    margin-bottom: 32px;
  }

  .achievement-section h3 {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 16px;
    opacity: 0.7;
  }

  .achievement-section-common h3 { color: #ffffff; }
  .achievement-section-rare h3 { color: #3b82f6; }
  .achievement-section-epic h3 { color: #9945ff; }
  .achievement-section-legendary h3 { color: #fbbf24; }

  .achievement-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .achievement-card {
    padding: 20px;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border-default);
    border-radius: 12px;
    text-align: center;
    transition: all 300ms ease;
  }

  .achievement-card.unlocked {
    border-color: var(--color-fire);
  }

  .achievement-card.locked {
    opacity: 0.5;
    filter: grayscale(100%);
  }

  .achievement-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .achievement-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .achievement-name {
    font-weight: 600;
    margin-bottom: 8px;
  }

  .achievement-desc {
    font-size: 13px;
    color: var(--color-text-tertiary);
    margin-bottom: 12px;
  }

  .achievement-progress {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .achievement-progress-bar {
    height: 100%;
    background: var(--color-fire);
    transition: width 300ms ease;
  }

  .achievement-progress-text {
    font-size: 11px;
    color: var(--color-text-muted);
  }
`;
document.head.appendChild(style);
