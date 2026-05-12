/**
 * ASDF Personal Dashboard (/me)
 * Unified view of user progress and activity
 */

import { achievementSystem } from './utils/achievements.js';
import { disclosureSystem } from './utils/progressive-disclosure.js';
import { soundSystem, initSounds } from './utils/sound-system.js';
import { initInteractions, animateCounter } from './utils/interactions.js';
import { initEasterEggs } from './utils/easter-eggs.js';
import { PageLifecycle } from './core/PageLifecycle.js';

// ============================================
// K-SCORE CALCULATION
// ============================================

/**
 * Calculate K-Score based on Depth, Ownership, Loyalty
 * Formula: K = 100 × ∛(D × O × L)
 * If any component is 0, K = 0
 */
function calculateKScore() {
  // Get component values from localStorage/progress
  const depth = calculateDepth();
  const ownership = calculateOwnership();
  const loyalty = calculateLoyalty();

  // If any is 0, K = 0
  if (depth === 0 || ownership === 0 || loyalty === 0) {
    return { k: 0, d: depth, o: ownership, l: loyalty };
  }

  // K = 100 × ∛(D × O × L)
  const product = depth * ownership * loyalty;
  const k = Math.round(100 * Math.cbrt(product));

  return { k, d: depth, o: ownership, l: loyalty };
}

/**
 * Depth (D) - How deep have they explored?
 * Based on: pages visited, features unlocked, achievements
 */
function calculateDepth() {
  const pagesVisited = JSON.parse(localStorage.getItem('asdf_visited_pages') || '[]').length;
  const featuresUnlocked = disclosureSystem.unlockedFeatures.length;
  const achievementsUnlocked = achievementSystem.unlocked.length;

  // Normalize to 0-1 range
  const pageScore = Math.min(pagesVisited / 10, 1); // 10 pages = max
  const featureScore = Math.min(featuresUnlocked / 9, 1); // 9 features = max
  const achievementScore = Math.min(achievementsUnlocked / 20, 1); // 20 achievements = max

  // Weighted average
  const depth = pageScore * 0.3 + featureScore * 0.3 + achievementScore * 0.4;

  return Math.round(depth * 100) / 100; // Round to 2 decimals
}

/**
 * Ownership (O) - How much have they done?
 * Based on: burns, stakes, games played
 */
function calculateOwnership() {
  const progress = achievementSystem.progress;

  const burns = progress.burn_tokens?.count || 0;
  const stakes = progress.stake_tokens?.count || 0;
  const games = progress.play_game?.count || 0;

  // Normalize to 0-1 range
  const burnScore = Math.min(burns / 10, 1); // 10 burns = max
  const stakeScore = Math.min(stakes / 5, 1); // 5 stakes = max
  const gameScore = Math.min(games / 20, 1); // 20 games = max

  // Weighted average
  const ownership = burnScore * 0.4 + stakeScore * 0.3 + gameScore * 0.3;

  return Math.round(ownership * 100) / 100;
}

/**
 * Loyalty (L) - How consistent are they?
 * Based on: daily streak, total visits
 */
function calculateLoyalty() {
  const streak = parseInt(localStorage.getItem('asdf_daily_streak') || '0', 10);
  const totalVisits = achievementSystem.progress.page_visit?.count || 1;

  // Normalize to 0-1 range
  const streakScore = Math.min(streak / 30, 1); // 30 days = max
  const visitScore = Math.min(totalVisits / 100, 1); // 100 visits = max

  // Weighted average
  const loyalty = streakScore * 0.7 + visitScore * 0.3;

  return Math.round(loyalty * 100) / 100;
}

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Render K-Score with animations
 */
function renderKScore() {
  const { k, d, o, l } = calculateKScore();

  // Animate K-Score
  const kScoreEl = document.getElementById('kScoreValue');
  const currentK = parseInt(kScoreEl.textContent || '0', 10);
  animateCounter(kScoreEl, currentK, k, 1500);

  // Animate components
  const depthEl = document.getElementById('depthValue');
  const ownershipEl = document.getElementById('ownershipValue');
  const loyaltyEl = document.getElementById('loyaltyValue');

  setTimeout(() => {
    depthEl.textContent = d.toFixed(2);
  }, 200);

  setTimeout(() => {
    ownershipEl.textContent = o.toFixed(2);
  }, 400);

  setTimeout(() => {
    loyaltyEl.textContent = l.toFixed(2);
  }, 600);
}

/**
 * Render daily streak calendar
 */
function renderStreakCalendar() {
  const streak = parseInt(localStorage.getItem('asdf_daily_streak') || '0', 10);
  const streakEl = document.getElementById('streakValue');
  const calendarEl = document.getElementById('streakCalendar');

  // Animate streak value
  const currentStreak = parseInt(streakEl.textContent || '0', 10);
  animateCounter(streakEl, currentStreak, streak, 1000);

  // Render last 28 days (4 weeks)
  calendarEl.innerHTML = '';
  const today = new Date();

  for (let i = 27; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);

    const cell = document.createElement('div');
    cell.className = 'streak-day';
    cell.setAttribute('role', 'gridcell');

    const isActive = i < streak;
    // Mark as active if within current streak
    if (isActive) {
      cell.classList.add('active');
    }

    // Mark today
    if (i === 0) {
      cell.classList.add('today');
    }

    const dateStr = day.toDateString();
    cell.title = dateStr;
    cell.setAttribute('aria-label', `${dateStr}${isActive ? ' \u2014 active' : ''}`);
    calendarEl.appendChild(cell);
  }
}

/**
 * Render exploration progress
 */
function renderProgress() {
  // Features discovered
  const totalFeatures = 42; // Arbitrary total features count
  const featuresUnlocked = disclosureSystem.unlockedFeatures.length;
  const featuresPercent = Math.round((featuresUnlocked / totalFeatures) * 100);

  document.getElementById('featuresProgress').textContent = `${featuresUnlocked}/${totalFeatures}`;
  const featuresBar = document.getElementById('featuresBar');
  featuresBar.style.width = `${featuresPercent}%`;
  featuresBar.setAttribute('aria-valuenow', featuresPercent);

  // Achievements
  const totalAchievements = 20;
  const achievementsUnlocked = achievementSystem.unlocked.length;
  const achievementsPercent = Math.round((achievementsUnlocked / totalAchievements) * 100);

  document.getElementById('achievementsProgress').textContent =
    `${achievementsUnlocked}/${totalAchievements}`;
  const achievementsBar = document.getElementById('achievementsBar');
  achievementsBar.style.width = `${achievementsPercent}%`;
  achievementsBar.setAttribute('aria-valuenow', achievementsPercent);

  // Pages explored
  const totalPages = 10;
  const pagesVisited = JSON.parse(localStorage.getItem('asdf_visited_pages') || '[]').length;
  const pagesPercent = Math.round((pagesVisited / totalPages) * 100);

  document.getElementById('pagesProgress').textContent = `${pagesVisited}/${totalPages}`;
  const pagesBar = document.getElementById('pagesBar');
  pagesBar.style.width = `${pagesPercent}%`;
  pagesBar.setAttribute('aria-valuenow', pagesPercent);
}

/**
 * Render quick stats
 */
function renderStats() {
  const progress = achievementSystem.progress;

  const burns = progress.burn_tokens?.count || 0;
  const stakes = progress.stake_tokens?.count || 0;
  const games = progress.play_game?.count || 0;
  const secrets = progress.secret_found?.count || 0;

  document.getElementById('totalBurns').textContent = burns;
  document.getElementById('totalStakes').textContent = stakes;
  document.getElementById('gamesPlayed').textContent = games;
  document.getElementById('secretsFound').textContent = secrets;
}

/**
 * Render activity heatmap (GitHub-style)
 */
function renderHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = '';

  // Generate 365 days (52 weeks × 7 days = 364, +1 for 365)
  const totalDays = 365;
  const today = new Date();

  // Get activity data (we'll simulate for now)
  const activityData = getActivityData();

  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();

    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('role', 'gridcell');

    // Get activity level for this day (0-5)
    const level = activityData[dateKey] || 0;
    if (level > 0) {
      cell.setAttribute('data-level', level);
    }

    const label = `${dateKey}: ${level} activities`;
    cell.title = label;
    cell.setAttribute('aria-label', label);

    grid.appendChild(cell);
  }
}

/**
 * Get activity data for heatmap
 * In production, this would come from backend
 * For now, we simulate based on localStorage
 */
function getActivityData() {
  const data = {};

  // Parse progress data and assign to dates
  const progress = achievementSystem.progress;

  Object.values(progress).forEach(actionType => {
    if (actionType.data) {
      actionType.data.forEach(entry => {
        const date = new Date(entry.timestamp).toDateString();

        if (!data[date]) {
          data[date] = 0;
        }

        data[date] += 1;
      });
    }
  });

  // Normalize to 0-5 scale
  const maxActivity = Math.max(...Object.values(data), 1);

  Object.keys(data).forEach(date => {
    const level = Math.ceil((data[date] / maxActivity) * 5);
    data[date] = Math.min(level, 5);
  });

  return data;
}

/**
 * Render recent achievements
 */
function renderAchievements() {
  const showcase = document.getElementById('achievementShowcase');
  const allAchievements = achievementSystem.getAllAchievements();

  // Show first 8 achievements (mix of unlocked and locked)
  const toShow = allAchievements.slice(0, 8);

  showcase.innerHTML = '';

  toShow.forEach(achievement => {
    const badge = document.createElement('div');
    badge.className = `achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('role', 'listitem');

    const iconText = achievement.unlocked ? achievement.icon : '&#x1F512;';
    const nameText = achievement.unlocked ? achievement.name : '???';
    badge.innerHTML = `
      <div class="achievement-icon" aria-hidden="true">${iconText}</div>
      <div class="achievement-name">${nameText}</div>
    `;

    if (achievement.unlocked) {
      badge.title = achievement.description;
      badge.setAttribute('aria-label', `${achievement.name}: ${achievement.description}`);
    } else {
      badge.title = 'Locked';
      badge.setAttribute('aria-label', 'Locked achievement');
    }

    showcase.appendChild(badge);
  });
}

// ============================================
// INIT
// ============================================

function init() {
  // Initialize all systems
  soundSystem.toggle(false); // Default off
  initInteractions();
  initSounds();
  initEasterEggs();

  // Render all widgets
  renderKScore();
  renderStreakCalendar();
  renderProgress();
  renderStats();
  renderHeatmap();
  renderAchievements();

  // Auto-refresh every 5 seconds
  const refreshId = setInterval(() => {
    renderKScore();
    renderStreakCalendar();
    renderProgress();
    renderStats();
    renderHeatmap();
    renderAchievements();
  }, 5000);
  PageLifecycle.registerTimer('me-dashboard-refresh', refreshId);
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
