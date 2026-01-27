/**
 * Learn & Build Dashboard Component
 * Renders the main dashboard UI
 *
 * @module learn-build/components/dashboard
 */

'use strict';

import { LearnBuild } from '../index.js';
import { learnBuildUI } from '../ui-controller.js';

// ============================================
// DASHBOARD COMPONENT
// ============================================

export class DashboardComponent {
  /**
   * Create dashboard component
   * @param {string|Element} container - Container selector or element
   */
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.warn('[DashboardComponent] Container not found');
      return;
    }
  }

  /**
   * Render the dashboard
   */
  render() {
    const profile = LearnBuild.getProfile();
    const dashboard = LearnBuild.getDashboard();

    if (!profile || !dashboard) {
      this.container.innerHTML = this._renderLoading();
      return;
    }

    this.container.innerHTML = `
      <div class="lb-dashboard">
        ${this._renderHeader(profile)}
        <div class="lb-dashboard-grid">
          ${this._renderXPCard(profile)}
          ${this._renderStreakCard(profile)}
          ${this._renderProgressCard(profile)}
          ${this._renderBadgesCard(profile)}
        </div>
        ${this._renderMilestones(dashboard)}
        ${this._renderActiveQuests(dashboard)}
      </div>
    `;

    this._bindEvents();
  }

  /**
   * Render loading state
   * @private
   */
  _renderLoading() {
    return `
      <div class="lb-loading">
        <div class="lb-spinner"></div>
        <p>Loading your progress...</p>
      </div>
    `;
  }

  /**
   * Render header
   * @private
   */
  _renderHeader(profile) {
    return `
      <div class="lb-header">
        <div class="lb-header-info">
          <h2 class="lb-header-title">Builder Dashboard</h2>
          <span class="lb-rank-display" style="color: ${profile.xp?.rankColor}">${profile.xp?.rank || 'Novice'}</span>
        </div>
        <div class="lb-header-stats">
          <div class="lb-stat">
            <span class="lb-stat-value lb-level-display">${profile.xp?.level || 1}</span>
            <span class="lb-stat-label">Level</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render XP card
   * @private
   */
  _renderXPCard(profile) {
    const xp = profile.xp || {};
    return `
      <div class="lb-card lb-xp-card">
        <div class="lb-card-header">
          <span class="lb-card-icon">\u2B50</span>
          <span class="lb-card-title">Experience</span>
        </div>
        <div class="lb-xp-content">
          <div class="lb-xp-total">
            <span class="lb-xp-display">${this._formatNumber(xp.totalXP || 0)}</span>
            <span class="lb-xp-label">Total XP</span>
          </div>
          <div class="lb-level-bar">
            <div class="lb-level-info">
              <span>Level ${xp.level || 1}</span>
              <span>${xp.xpInLevel || 0}/${xp.xpForLevel || 100}</span>
            </div>
            <div class="lb-progress">
              <div class="lb-level-progress" style="width: ${xp.progress || 0}%"></div>
            </div>
          </div>
        </div>
        <div class="lb-xp-bonus ${xp.streakBonus > 0 ? 'active' : ''}">
          <span>\u{1F525} +${Math.round((xp.streakBonus || 0) * 100)}% Streak Bonus</span>
        </div>
      </div>
    `;
  }

  /**
   * Render streak card
   * @private
   */
  _renderStreakCard(profile) {
    const streak = profile.xp?.streak || 0;
    const isActive = streak > 0;

    return `
      <div class="lb-card lb-streak-card ${isActive ? 'active' : ''}">
        <div class="lb-card-header">
          <span class="lb-card-icon">\u{1F525}</span>
          <span class="lb-card-title">Streak</span>
        </div>
        <div class="lb-streak-content">
          <span class="lb-streak-display">${streak}</span>
          <span class="lb-streak-label">${streak === 1 ? 'day' : 'days'}</span>
        </div>
        <p class="lb-streak-message">
          ${isActive
            ? 'Keep it up! Learn daily to maintain your streak.'
            : 'Start learning today to begin a streak!'}
        </p>
      </div>
    `;
  }

  /**
   * Render progress card
   * @private
   */
  _renderProgressCard(profile) {
    const tracks = profile.tracks || {};

    return `
      <div class="lb-card lb-progress-card">
        <div class="lb-card-header">
          <span class="lb-card-icon">\u{1F4CA}</span>
          <span class="lb-card-title">Track Progress</span>
        </div>
        <div class="lb-tracks-progress">
          ${this._renderTrackProgress('dev', 'Developer', tracks.dev, '#ea4e33')}
          ${this._renderTrackProgress('gaming', 'Game Dev', tracks.gaming, '#8b5cf6')}
          ${this._renderTrackProgress('content', 'Creator', tracks.content, '#06b6d4')}
        </div>
        <div class="lb-quest-count">
          <span class="lb-quest-count-value">${profile.quests?.completed || 0}</span>
          <span class="lb-quest-count-label">/ ${profile.quests?.total || 0} Quests</span>
        </div>
      </div>
    `;
  }

  /**
   * Render single track progress
   * @private
   */
  _renderTrackProgress(id, name, progress, color) {
    const pct = progress?.percentage || 0;
    return `
      <div class="lb-track-progress" data-track="${id}">
        <div class="lb-track-info">
          <span class="lb-track-name">${name}</span>
          <span class="lb-track-pct">${pct}%</span>
        </div>
        <div class="lb-progress">
          <div class="progress-bar" style="width: ${pct}%; background: ${color}"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render badges card
   * @private
   */
  _renderBadgesCard(profile) {
    const badges = profile.badges || {};
    const showcase = badges.showcase || [];

    return `
      <div class="lb-card lb-badges-card">
        <div class="lb-card-header">
          <span class="lb-card-icon">\u{1F3C6}</span>
          <span class="lb-card-title">Badges</span>
          <span class="lb-badge-count">${badges.earned || 0}/${badges.total || 0}</span>
        </div>
        <div class="lb-badge-showcase">
          ${showcase.length > 0
            ? showcase.map(b => `
                <div class="lb-badge" data-badge-id="${b.id}" data-tier="${b.tier}" title="${b.name}">
                  <span class="lb-badge-icon">${b.icon}</span>
                </div>
              `).join('')
            : '<p class="lb-empty-state">Complete quests to earn badges!</p>'
          }
        </div>
      </div>
    `;
  }

  /**
   * Render milestones section
   * @private
   */
  _renderMilestones(dashboard) {
    const milestones = dashboard.nextMilestones || [];

    if (milestones.length === 0) return '';

    return `
      <div class="lb-section lb-milestones-section">
        <h3 class="lb-section-title">Next Milestones</h3>
        <div class="lb-milestones">
          ${milestones.map(m => `
            <div class="lb-milestone" data-type="${m.type}">
              ${m.icon ? `<span class="lb-milestone-icon">${m.icon}</span>` : ''}
              <div class="lb-milestone-content">
                <span class="lb-milestone-name">${m.name}</span>
                <div class="lb-progress">
                  <div class="lb-milestone-fill" style="width: ${m.progress}%"></div>
                </div>
                <span class="lb-milestone-text">${m.current}/${m.target}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render active quests section
   * @private
   */
  _renderActiveQuests(dashboard) {
    const quests = dashboard.activeQuests || [];

    return `
      <div class="lb-section lb-quests-section">
        <h3 class="lb-section-title">Active Quests</h3>
        <div class="lb-active-quests">
          ${quests.length > 0
            ? quests.map(q => `
                <div class="lb-quest-card" data-quest-id="${q.id}" data-state="${q.state}">
                  <div class="lb-quest-header">
                    <span class="lb-quest-name">${q.definition?.name || 'Quest'}</span>
                    <span class="lb-quest-xp">+${q.definition?.xp || 0} XP</span>
                  </div>
                  <p class="lb-quest-desc">${q.definition?.description || ''}</p>
                  <button class="lb-quest-btn btn btn-sm btn-primary" data-action="continue">
                    Continue \u2192
                  </button>
                </div>
              `).join('')
            : `
              <div class="lb-empty-quests">
                <span class="lb-empty-icon">\u{1F3AF}</span>
                <p>No active quests</p>
                <button class="btn btn-primary lb-start-quest">Start a Quest</button>
              </div>
            `
          }
        </div>
      </div>
    `;
  }

  /**
   * Bind event handlers
   * @private
   */
  _bindEvents() {
    // Quest buttons
    this.container.querySelectorAll('.lb-quest-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.lb-quest-card');
        const questId = card?.dataset.questId;
        if (questId) {
          this._onQuestContinue(questId);
        }
      });
    });

    // Start quest button
    const startBtn = this.container.querySelector('.lb-start-quest');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this._onStartQuest();
      });
    }

    // Track click
    this.container.querySelectorAll('.lb-track-progress').forEach(el => {
      el.addEventListener('click', () => {
        const trackId = el.dataset.track;
        if (trackId) {
          this._onTrackClick(trackId);
        }
      });
    });
  }

  /**
   * Handle quest continue
   * @private
   */
  _onQuestContinue(questId) {
    // Emit event for parent to handle
    window.dispatchEvent(new CustomEvent('learnbuild:quest:continue', {
      detail: { questId }
    }));
  }

  /**
   * Handle start quest
   * @private
   */
  _onStartQuest() {
    window.dispatchEvent(new CustomEvent('learnbuild:quest:browse'));
  }

  /**
   * Handle track click
   * @private
   */
  _onTrackClick(trackId) {
    window.dispatchEvent(new CustomEvent('learnbuild:track:select', {
      detail: { trackId }
    }));
  }

  /**
   * Format large numbers
   * @private
   */
  _formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createDashboard(container) {
  const dashboard = new DashboardComponent(container);
  dashboard.render();
  return dashboard;
}

export default DashboardComponent;
