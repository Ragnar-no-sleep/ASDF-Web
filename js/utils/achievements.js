/**
 * ASDF Achievements System
 * Track and reward user exploration and engagement
 */

import { soundSystem } from './sound-system.js';

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

const ACHIEVEMENTS = {
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
    icon: '🤿',
    rarity: 'common',
    condition: { type: 'scroll_bottom', count: 5 },
  },
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
    icon: '🔒',
    rarity: 'epic',
    condition: { type: 'stake_duration', days: 30 },
  },
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
    icon: '🔝',
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
    icon: '🗺️',
    rarity: 'legendary',
    condition: { type: 'secret_found', count: 5 },
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    description: 'Complete a formation course',
    icon: '🛠️',
    rarity: 'rare',
    condition: { type: 'complete_course', count: 1 },
  },
  architect: {
    id: 'architect',
    name: 'Architect',
    description: 'Complete 3 formation courses',
    icon: '🏗️',
    rarity: 'epic',
    condition: { type: 'complete_course', count: 3 },
  },
  completionist: {
    id: 'completionist',
    name: 'Completionist',
    description: 'Unlock all other achievements',
    icon: '👑',
    rarity: 'legendary',
    condition: { type: 'all_achievements', count: 18 },
  },
};

class AchievementSystem {
  constructor() {
    this.achievements = ACHIEVEMENTS;
    this.progress = this.loadProgress();
    this.unlocked = this.loadUnlocked();
    this.init();
  }

  init() {
    this.trackPageVisit();
  }

  loadProgress() {
    const stored = localStorage.getItem('asdf_achievement_progress');
    return stored ? JSON.parse(stored) : {};
  }

  loadUnlocked() {
    const stored = localStorage.getItem('asdf_achievements_unlocked');
    return stored ? JSON.parse(stored) : [];
  }

  saveProgress() {
    localStorage.setItem('asdf_achievement_progress', JSON.stringify(this.progress));
    localStorage.setItem('asdf_achievements_unlocked', JSON.stringify(this.unlocked));
  }

  track(actionType, data = {}) {
    if (!this.progress[actionType]) {
      this.progress[actionType] = { count: 0, amount: 0, data: [] };
    }
    this.progress[actionType].count += 1;
    if (data.amount) this.progress[actionType].amount += data.amount;
    if (data) {
      this.progress[actionType].data.push({ timestamp: Date.now(), ...data });
    }
    this.saveProgress();
    this.checkUnlocks();
  }

  checkUnlocks() {
    Object.values(this.achievements).forEach(achievement => {
      if (this.unlocked.includes(achievement.id)) return;
      if (this.checkCondition(achievement.condition)) {
        this.unlock(achievement);
      }
    });
    if (this.unlocked.length === Object.keys(this.achievements).length - 1) {
      const completionist = this.achievements.completionist;
      if (!this.unlocked.includes(completionist.id)) this.unlock(completionist);
    }
  }

  checkCondition(condition) {
    const { type, count, amount, days, rank } = condition;
    if (days !== undefined) return this.checkDailyStreak(days);

    const progress = this.progress[type];
    if (!progress) return false;

    if (count !== undefined) return progress.count >= count;
    if (amount !== undefined) return progress.data.some(entry => entry.amount >= amount);
    if (rank !== undefined) return progress.data.some(entry => entry.rank <= rank);

    return false;
  }

  checkDailyStreak(requiredDays) {
    // *sniff* Unified source of truth (Gap G5)
    if (window.ASDF && window.ASDF.streakManager) {
      return window.ASDF.streakManager.getStreak() >= requiredDays;
    }
    return false;
  }

  unlock(achievement) {
    this.unlocked.push(achievement.id);
    this.saveProgress();

    // *sniff* Bridge Hero's Journey (Gap G4)
    if (window.AchievementEngine) {
      const stageMap = {
        first_visit: 'ARRIVAL',
        explorer: 'LEARNED',
        first_burn: 'VERIFIED',
        pyromaniac: 'BELIEVER',
        builder: 'BUILDER',
      };
      const journeyId = stageMap[achievement.id];
      if (journeyId) window.AchievementEngine.unlock(journeyId);
    }

    soundSystem.play('success');
    this.showUnlockAnimation(achievement);
  }

  showUnlockAnimation(achievement) {
    const rarityColors = {
      common: '#ffffff',
      rare: '#3b82f6',
      epic: '#9945ff',
      legendary: '#fbbf24',
    };
    const overlay = document.createElement('div');
    overlay.className = 'achievement-unlock-overlay';
    overlay.style.cssText = `position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:10000; animation:fade-in 300ms ease-out;`;
    overlay.innerHTML = `<div class="ach-unlock-inner"><div class="ach-unlock-icon">${achievement.icon}</div><div class="ach-unlock-rarity">${achievement.rarity}</div><div class="ach-unlock-title">${achievement.name}</div><div class="ach-unlock-desc">${achievement.description}</div></div>`;

    const rarityEl = overlay.querySelector('.ach-unlock-rarity');
    if (rarityEl) {
      rarityEl.style.setProperty('--ach-rarity-color', rarityColors[achievement.rarity]);
    }
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.animation = 'fade-out 300ms ease-out';
      setTimeout(() => overlay.remove(), 300);
    }, 3000);
  }

  trackPageVisit() {
    const currentPage = window.location.pathname;
    const visitedPages = JSON.parse(localStorage.getItem('asdf_visited_pages') || '[]');
    if (!visitedPages.includes(currentPage)) {
      visitedPages.push(currentPage);
      localStorage.setItem('asdf_visited_pages', JSON.stringify(visitedPages));
      this.track('page_visit');
      this.track('unique_pages', { page: currentPage });
    }
  }

  getAllAchievements() {
    return Object.values(this.achievements).map(achievement => ({
      ...achievement,
      unlocked: this.unlocked.includes(achievement.id),
      progress: this.getAchievementProgress(achievement),
    }));
  }

  getAchievementProgress(achievement) {
    const { type, count, amount, days } = achievement.condition;
    if (days !== undefined) {
      const current = window.ASDF?.streakManager?.getStreak() || 0;
      return Math.min((current / days) * 100, 100);
    }
    const progress = this.progress[type];
    if (!progress) return 0;
    if (count !== undefined) return Math.min((progress.count / count) * 100, 100);
    if (amount !== undefined) {
      const max = Math.max(...progress.data.map(d => d.amount || 0));
      return Math.min((max / amount) * 100, 100);
    }
    return 0;
  }
}

export const achievementSystem = new AchievementSystem();

export function createAchievementGallery(container) {
  const achievements = achievementSystem.getAllAchievements();
  const gallery = document.createElement('div');
  gallery.className = 'achievement-gallery';
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  gallery.innerHTML = `<div class="achievement-stats"><div class="achievement-stats-count">${unlockedCount}/${achievements.length}</div><div class="achievement-stats-label">Achievements Unlocked</div><div class="achievement-stats-progress"><div class="achievement-stats-bar" style="width: ${(unlockedCount / achievements.length) * 100}%"></div></div></div>`;

  const grid = document.createElement('div');
  grid.className = 'achievement-grid';
  achievements.forEach(a => {
    const card = document.createElement('div');
    card.className = `achievement-card ${a.unlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `<div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div><div class="achievement-name">${a.unlocked ? a.name : '???'}</div><div class="achievement-desc">${a.unlocked ? a.description : 'Locked'}</div>`;
    grid.appendChild(card);
  });
  gallery.appendChild(grid);
  container.appendChild(gallery);
}
