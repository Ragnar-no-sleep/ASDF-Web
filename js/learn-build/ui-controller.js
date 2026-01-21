/**
 * Learn & Build UI Controller
 * Bridges the Learn & Build system with DOM components
 *
 * @module learn-build/ui-controller
 */

'use strict';

import { LearnBuild, ALL_QUESTS, ALL_MODULES, EVENTS } from './index.js';
import { eventBus } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('LearnBuildUI');

// ============================================
// SELECTORS
// ============================================

const SELECTORS = {
  // Dashboard
  DASHBOARD_ROOT: '#learn-build-dashboard',
  XP_DISPLAY: '.lb-xp-display',
  LEVEL_DISPLAY: '.lb-level-display',
  LEVEL_PROGRESS: '.lb-level-progress',
  STREAK_DISPLAY: '.lb-streak-display',
  RANK_DISPLAY: '.lb-rank-display',

  // Progress
  PROGRESS_CARD: '.lb-progress-card',
  TRACK_PROGRESS: '.lb-track-progress',
  QUEST_COUNT: '.lb-quest-count',
  MODULE_COUNT: '.lb-module-count',

  // Badges
  BADGE_SHOWCASE: '.lb-badge-showcase',
  BADGE_COUNT: '.lb-badge-count',

  // Milestones
  MILESTONES_LIST: '.lb-milestones',

  // Active quests
  ACTIVE_QUESTS: '.lb-active-quests',

  // Journey view elements (existing)
  JOURNEY_TRACK_NAME: '#journey-track-name',
  JOURNEY_TRACK_DESC: '#journey-track-desc',
  JOURNEY_TRACK_ICON: '#journey-track-icon',
  JOURNEY_STAT_VALUES: '.journey-stat-value'
};

// ============================================
// UI CONTROLLER CLASS
// ============================================

class LearnBuildUIController {
  constructor() {
    this.initialized = false;
    this.elements = {};
    this.updateInterval = null;
  }

  /**
   * Initialize UI controller
   * @param {string} userId - User wallet address
   * @param {Object} options - Options
   * @returns {Promise<void>}
   */
  async init(userId, options = {}) {
    if (this.initialized) {
      log.debug('Already initialized');
      return;
    }

    // Initialize Learn & Build system with sample data
    await LearnBuild.init(userId, {
      quests: ALL_QUESTS,
      modules: ALL_MODULES
    });

    // Cache DOM elements
    this._cacheElements();

    // Subscribe to events
    this._subscribeToEvents();

    // Initial render
    this.render();

    // Start periodic updates (every 30s for streak/daily progress)
    this.updateInterval = setInterval(() => {
      this._updateDynamicElements();
    }, 30000);

    this.initialized = true;
    log.debug('UI Controller initialized');
  }

  /**
   * Render all UI components
   */
  render() {
    this.renderXPDisplay();
    this.renderProgressCard();
    this.renderBadgeShowcase();
    this.renderMilestones();
    this.renderActiveQuests();
    this.renderTrackProgress();
  }

  /**
   * Render XP and level display
   */
  renderXPDisplay() {
    const profile = LearnBuild.xp.getProfile();
    if (!profile) return;

    // XP total
    const xpEl = document.querySelector(SELECTORS.XP_DISPLAY);
    if (xpEl) {
      xpEl.textContent = this._formatNumber(profile.totalXP);
      xpEl.dataset.xp = profile.totalXP;
    }

    // Level
    const levelEl = document.querySelector(SELECTORS.LEVEL_DISPLAY);
    if (levelEl) {
      levelEl.textContent = profile.level;
      levelEl.dataset.level = profile.level;
    }

    // Level progress bar
    const progressEl = document.querySelector(SELECTORS.LEVEL_PROGRESS);
    if (progressEl) {
      progressEl.style.width = `${profile.progress}%`;
      progressEl.setAttribute('aria-valuenow', profile.progress);
    }

    // Streak
    const streakEl = document.querySelector(SELECTORS.STREAK_DISPLAY);
    if (streakEl) {
      streakEl.textContent = profile.streak;
      if (profile.streak > 0) {
        streakEl.classList.add('active');
      }
    }

    // Rank
    const rankEl = document.querySelector(SELECTORS.RANK_DISPLAY);
    if (rankEl) {
      rankEl.textContent = profile.rank;
      rankEl.style.color = profile.rankColor;
    }
  }

  /**
   * Render progress card
   */
  renderProgressCard() {
    const profile = LearnBuild.getProfile();
    if (!profile) return;

    // Quest count
    const questCountEl = document.querySelector(SELECTORS.QUEST_COUNT);
    if (questCountEl) {
      questCountEl.textContent = `${profile.quests.completed}/${profile.quests.total}`;
    }

    // Track progress
    const trackEls = document.querySelectorAll(SELECTORS.TRACK_PROGRESS);
    trackEls.forEach(el => {
      const track = el.dataset.track;
      if (track && profile.tracks[track]) {
        const progress = profile.tracks[track];
        const bar = el.querySelector('.progress-bar');
        const text = el.querySelector('.progress-text');

        if (bar) bar.style.width = `${progress.percentage}%`;
        if (text) text.textContent = `${progress.completed}/${progress.total}`;
      }
    });
  }

  /**
   * Render badge showcase
   */
  renderBadgeShowcase() {
    const showcase = LearnBuild.badge.getShowcase(5);
    const container = document.querySelector(SELECTORS.BADGE_SHOWCASE);

    if (!container) return;

    if (showcase.length === 0) {
      container.innerHTML = `
        <div class="lb-empty-state">
          <span class="lb-empty-icon">\u{1F3C6}</span>
          <p>Complete quests to earn badges!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = showcase.map(badge => `
      <div class="lb-badge" data-badge-id="${badge.id}" data-tier="${badge.tier}">
        <span class="lb-badge-icon">${badge.icon}</span>
        <span class="lb-badge-name">${badge.name}</span>
      </div>
    `).join('');

    // Badge count
    const countEl = document.querySelector(SELECTORS.BADGE_COUNT);
    if (countEl) {
      const stats = LearnBuild.badge.getStats();
      countEl.textContent = `${stats.earned}/${stats.total}`;
    }
  }

  /**
   * Render milestones
   */
  renderMilestones() {
    const dashboard = LearnBuild.getDashboard();
    if (!dashboard) return;

    const container = document.querySelector(SELECTORS.MILESTONES_LIST);
    if (!container) return;

    const milestones = dashboard.nextMilestones.slice(0, 3);

    if (milestones.length === 0) {
      container.innerHTML = '<p class="lb-empty-state">All milestones reached!</p>';
      return;
    }

    container.innerHTML = milestones.map(m => `
      <div class="lb-milestone" data-type="${m.type}">
        <div class="lb-milestone-info">
          ${m.icon ? `<span class="lb-milestone-icon">${m.icon}</span>` : ''}
          <span class="lb-milestone-name">${m.name}</span>
        </div>
        <div class="lb-milestone-progress">
          <div class="lb-milestone-bar">
            <div class="lb-milestone-fill" style="width: ${m.progress}%"></div>
          </div>
          <span class="lb-milestone-text">${m.current}/${m.target}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render active quests
   */
  renderActiveQuests() {
    const dashboard = LearnBuild.getDashboard();
    if (!dashboard) return;

    const container = document.querySelector(SELECTORS.ACTIVE_QUESTS);
    if (!container) return;

    const activeQuests = dashboard.activeQuests;

    if (activeQuests.length === 0) {
      container.innerHTML = `
        <div class="lb-empty-state">
          <span class="lb-empty-icon">\u{1F3AF}</span>
          <p>No active quests. Start one!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = activeQuests.map(quest => `
      <div class="lb-quest-card" data-quest-id="${quest.id}" data-state="${quest.state}">
        <div class="lb-quest-header">
          <span class="lb-quest-name">${quest.definition.name}</span>
          <span class="lb-quest-state">${quest.stateLabel}</span>
        </div>
        <p class="lb-quest-desc">${quest.definition.description}</p>
        <div class="lb-quest-meta">
          <span class="lb-quest-xp">+${quest.definition.xp} XP</span>
          <span class="lb-quest-time">${quest.definition.estimatedTime} min</span>
        </div>
        <button class="lb-quest-action btn btn-sm btn-primary" data-action="continue">
          Continue
        </button>
      </div>
    `).join('');

    // Bind quest actions
    container.querySelectorAll('.lb-quest-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.lb-quest-card');
        const questId = card?.dataset.questId;
        if (questId) {
          this._onQuestAction(questId);
        }
      });
    });
  }

  /**
   * Render track progress in journey view
   */
  renderTrackProgress() {
    const profile = LearnBuild.getProfile();
    if (!profile) return;

    // Update existing journey elements if they exist
    const statValues = document.querySelectorAll(SELECTORS.JOURNEY_STAT_VALUES);
    if (statValues.length >= 2) {
      // XP stat
      if (statValues[0]) {
        statValues[0].textContent = this._formatNumber(profile.xp?.totalXP || 0);
      }
      // Modules stat (use current track)
      // This will be updated when track is selected
    }
  }

  /**
   * Update track display
   * @param {string} trackId
   */
  updateTrackDisplay(trackId) {
    const trackProgress = LearnBuild.module.getTrackProgress(trackId);
    const modules = LearnBuild.module.getTrackModules(trackId);

    // Update journey view elements
    const trackNameEl = document.querySelector(SELECTORS.JOURNEY_TRACK_NAME);
    const trackDescEl = document.querySelector(SELECTORS.JOURNEY_TRACK_DESC);
    const statValues = document.querySelectorAll(SELECTORS.JOURNEY_STAT_VALUES);

    if (statValues.length >= 2 && statValues[1]) {
      statValues[1].textContent = `${trackProgress.completed}/${trackProgress.total}`;
    }

    // Emit for other components
    eventBus.emit('learnbuild:track:update', { trackId, progress: trackProgress, modules });
  }

  /**
   * Show toast notification
   * @param {string} message
   * @param {string} type - success, error, info
   */
  showToast(message, type = 'info') {
    // Use existing toast system if available
    if (window.ASDF?.toast) {
      window.ASDF.toast.show(message, type);
      return;
    }

    // Fallback simple toast
    const toast = document.createElement('div');
    toast.className = `lb-toast lb-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Destroy controller
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.initialized = false;
    LearnBuild.destroy();
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Cache DOM elements
   * @private
   */
  _cacheElements() {
    Object.entries(SELECTORS).forEach(([key, selector]) => {
      this.elements[key] = document.querySelector(selector);
    });
  }

  /**
   * Subscribe to Learn & Build events
   * @private
   */
  _subscribeToEvents() {
    // XP gained
    eventBus.subscribe(EVENTS.XP_GAINED, (data) => {
      this.renderXPDisplay();
      this.showToast(`+${data.amount} XP`, 'success');
    });

    // Level up
    eventBus.subscribe(EVENTS.XP_LEVEL_UP, (data) => {
      this.renderXPDisplay();
      this.showToast(`Level Up! You're now Level ${data.newLevel}`, 'success');
      this._playLevelUpAnimation();
    });

    // Badge earned
    eventBus.subscribe(EVENTS.BADGE_EARNED, (data) => {
      this.renderBadgeShowcase();
      this.showToast(`Badge Earned: ${data.badge.name}`, 'success');
      this._showBadgeModal(data.badge);
    });

    // Quest completed
    eventBus.subscribe(EVENTS.QUEST_COMPLETED, (data) => {
      this.renderActiveQuests();
      this.renderProgressCard();
      this.renderMilestones();
    });

    // Module completed
    eventBus.subscribe(EVENTS.MODULE_COMPLETED, (data) => {
      this.renderProgressCard();
      this.renderTrackProgress();
      this.showToast(`Module Completed! +${data.xp} XP`, 'success');
    });

    // Streak update
    eventBus.subscribe(EVENTS.XP_STREAK, (data) => {
      this.renderXPDisplay();
      if (data.streak > 1) {
        this.showToast(`${data.streak}-day streak! ${Math.round(data.bonus * 100)}% XP bonus`, 'info');
      }
    });
  }

  /**
   * Update dynamic elements (called periodically)
   * @private
   */
  _updateDynamicElements() {
    // Re-render XP display (for streak timeout checking)
    this.renderXPDisplay();
  }

  /**
   * Handle quest action
   * @private
   */
  _onQuestAction(questId) {
    const quest = LearnBuild.quest.getQuestStatus(questId);
    if (!quest) return;

    // Navigate to quest content
    eventBus.emit('learnbuild:quest:open', { questId, quest });

    // Or navigate to deep-learn page
    // window.location.href = `/deep-learn.html?quest=${encodeURIComponent(questId)}`;
  }

  /**
   * Play level up animation
   * @private
   */
  _playLevelUpAnimation() {
    const levelEl = document.querySelector(SELECTORS.LEVEL_DISPLAY);
    if (levelEl) {
      levelEl.classList.add('lb-level-up');
      setTimeout(() => levelEl.classList.remove('lb-level-up'), 1000);
    }
  }

  /**
   * Show badge earned modal
   * @private
   */
  _showBadgeModal(badge) {
    // Use existing modal system if available
    if (window.ASDF?.modal) {
      window.ASDF.modal.show({
        type: 'badge',
        badge
      });
      return;
    }

    // Simple fallback
    log.debug('Badge earned:', badge.name);
  }

  /**
   * Format large numbers
   * @private
   */
  _formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const learnBuildUI = new LearnBuildUIController();

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.learnBuildUI = learnBuildUI;
}

export default learnBuildUI;
