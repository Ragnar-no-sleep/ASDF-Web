/**
 * Build V2 - GitHub Timeline Component
 * Displays commit history and contributor activity
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { GitHubApiService } from '../services/github-api.js';
import { $, $$, addClass, removeClass, on, safeInnerHTML } from '../utils/dom.js';
import { sanitizeText } from '../utils/security.js';

// ============================================
// GITHUB TIMELINE CONFIGURATION
// ============================================

const TIMELINE_CONFIG = {
  // Display limits
  limits: {
    commits: 10,
    contributors: 5
  },
  // Refresh interval (5 minutes)
  refreshInterval: 300000,
  // Animation
  animation: {
    stagger: 50
  }
};

// ============================================
// GITHUB TIMELINE COMPONENT
// ============================================

const GitHubTimeline = {
  /**
   * Container element
   */
  container: null,

  /**
   * Current project ID
   */
  currentProject: null,

  /**
   * Loading state
   */
  isLoading: false,

  /**
   * Refresh timer
   */
  refreshTimer: null,

  /**
   * Initialize GitHub timeline
   * @param {string|Element} containerSelector
   */
  init(containerSelector) {
    this.container = typeof containerSelector === 'string'
      ? $(containerSelector)
      : containerSelector;

    if (!this.container) {
      console.warn('[GitHubTimeline] Container not found');
      return;
    }

    // Create structure
    this.createStructure();

    // Bind events
    this.bindEvents();

    console.log('[GitHubTimeline] Initialized');
  },

  /**
   * Create DOM structure
   */
  createStructure() {
    this.container.innerHTML = `
      <div class="github-timeline">
        <div class="timeline-header">
          <h3 class="timeline-title">
            <span class="timeline-icon">&#128187;</span>
            Development Activity
          </h3>
          <button class="timeline-refresh" title="Refresh">&#8635;</button>
        </div>

        <div class="timeline-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <span>Loading activity...</span>
        </div>

        <div class="timeline-error" style="display: none;">
          <span class="error-icon">&#9888;</span>
          <span class="error-message">Failed to load activity</span>
        </div>

        <div class="timeline-content">
          <div class="timeline-section commits-section">
            <h4 class="section-title">Recent Commits</h4>
            <ul class="commits-list"></ul>
          </div>

          <div class="timeline-section contributors-section">
            <h4 class="section-title">Contributors</h4>
            <div class="contributors-grid"></div>
          </div>

          <div class="timeline-section stats-section">
            <div class="repo-stats"></div>
          </div>
        </div>
      </div>
    `;

    // Cache references
    this.loadingEl = $('.timeline-loading', this.container);
    this.errorEl = $('.timeline-error', this.container);
    this.contentEl = $('.timeline-content', this.container);
    this.commitsList = $('.commits-list', this.container);
    this.contributorsGrid = $('.contributors-grid', this.container);
    this.statsSection = $('.repo-stats', this.container);

    // Refresh button
    const refreshBtn = $('.timeline-refresh', this.container);
    if (refreshBtn) {
      on(refreshBtn, 'click', () => this.refresh());
    }
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for project selection
    BuildState.subscribe('project:select', (data) => {
      if (data.projectId) {
        this.loadForProject(data.projectId);
      }
    });

    // Listen for timeline open
    BuildState.subscribe('timeline:open', (data) => {
      if (data.projectId) {
        this.loadForProject(data.projectId);
      }
    });
  },

  /**
   * Load timeline for a project
   * @param {string} projectId
   */
  async loadForProject(projectId) {
    if (this.isLoading) return;

    this.currentProject = projectId;
    this.showLoading();

    try {
      const data = await GitHubApiService.getProjectData(projectId);
      this.renderTimeline(data);
      this.hideLoading();

      // Setup auto-refresh
      this.setupAutoRefresh();
    } catch (error) {
      console.error('[GitHubTimeline] Failed to load:', error);
      this.showError(error.message);
    }
  },

  /**
   * Render timeline content
   * @param {Object} data
   */
  renderTimeline(data) {
    // Render commits
    this.renderCommits(data.commits || []);

    // Render contributors
    this.renderContributors(data.contributors || []);

    // Render stats
    this.renderStats(data.repo, data.completion);
  },

  /**
   * Render commits list
   * @param {Array} commits
   */
  renderCommits(commits) {
    if (!this.commitsList) return;

    if (!commits.length) {
      this.commitsList.innerHTML = '<li class="empty-state">No recent commits</li>';
      return;
    }

    const html = commits.slice(0, TIMELINE_CONFIG.limits.commits).map((commit, index) => {
      const timeAgo = GitHubApiService.formatTimeAgo(commit.date);
      const message = sanitizeText(commit.message);
      const author = sanitizeText(commit.author);

      return `
        <li class="commit-item" style="animation-delay: ${index * TIMELINE_CONFIG.animation.stagger}ms">
          <div class="commit-sha">
            <a href="${commit.url}" target="_blank" rel="noopener">${commit.sha}</a>
          </div>
          <div class="commit-message">${message}</div>
          <div class="commit-meta">
            <span class="commit-author">${author}</span>
            <span class="commit-time">${timeAgo}</span>
          </div>
        </li>
      `;
    }).join('');

    safeInnerHTML(this.commitsList, html);
  },

  /**
   * Render contributors grid
   * @param {Array} contributors
   */
  renderContributors(contributors) {
    if (!this.contributorsGrid) return;

    if (!contributors.length) {
      this.contributorsGrid.innerHTML = '<div class="empty-state">No contributors data</div>';
      return;
    }

    const html = contributors.slice(0, TIMELINE_CONFIG.limits.contributors).map((contrib, index) => {
      const login = sanitizeText(contrib.login);

      return `
        <div class="contributor-card" data-login="${login}" style="animation-delay: ${index * TIMELINE_CONFIG.animation.stagger}ms">
          <div class="contributor-link" role="button" tabindex="0">
            <img
              src="${contrib.avatar}"
              alt="${login}"
              class="contributor-avatar"
              loading="lazy"
              onerror="this.src='/assets/default-avatar.png'"
            />
            <div class="contributor-info">
              <span class="contributor-name">${login}</span>
              <span class="contributor-commits">${contrib.contributions} commits</span>
            </div>
          </div>
          <a href="${contrib.url}" target="_blank" rel="noopener" class="contributor-github-link" title="View on GitHub">
            &#128279;
          </a>
        </div>
      `;
    }).join('');

    safeInnerHTML(this.contributorsGrid, html);

    // Add click handler for builder profile
    $$('.contributor-card', this.contributorsGrid).forEach(card => {
      const contributorLink = $('.contributor-link', card);
      if (contributorLink) {
        const handler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const login = card.dataset.login;
          if (login) {
            BuildState.emit('contributor:click', { login });
          }
        };

        on(contributorLink, 'click', handler);
        on(contributorLink, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handler(e);
          }
        });
      }
    });
  },

  /**
   * Render repository stats
   * @param {Object} repo
   * @param {number} completion
   */
  renderStats(repo, completion) {
    if (!this.statsSection || !repo) return;

    const html = `
      <div class="stat-item">
        <span class="stat-icon">&#11088;</span>
        <span class="stat-value">${repo.stars || 0}</span>
        <span class="stat-label">Stars</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">&#128208;</span>
        <span class="stat-value">${repo.forks || 0}</span>
        <span class="stat-label">Forks</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">&#128196;</span>
        <span class="stat-value">${repo.openIssues || 0}</span>
        <span class="stat-label">Issues</span>
      </div>
      <div class="stat-item completion">
        <div class="completion-bar">
          <div class="completion-fill" style="width: ${completion || 0}%"></div>
        </div>
        <span class="completion-label">${completion || 0}% Complete</span>
      </div>
    `;

    safeInnerHTML(this.statsSection, html);
  },

  /**
   * Show loading state
   */
  showLoading() {
    this.isLoading = true;
    if (this.loadingEl) this.loadingEl.style.display = 'flex';
    if (this.contentEl) this.contentEl.style.display = 'none';
    if (this.errorEl) this.errorEl.style.display = 'none';
  },

  /**
   * Hide loading state
   */
  hideLoading() {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.contentEl) this.contentEl.style.display = 'block';
  },

  /**
   * Show error state
   * @param {string} message
   */
  showError(message) {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.contentEl) this.contentEl.style.display = 'none';
    if (this.errorEl) {
      this.errorEl.style.display = 'flex';
      const msgEl = $('.error-message', this.errorEl);
      if (msgEl) msgEl.textContent = message || 'Failed to load activity';
    }
  },

  /**
   * Refresh current project
   */
  refresh() {
    if (this.currentProject) {
      // Clear cache
      GitHubApiService.clearCache();
      this.loadForProject(this.currentProject);
    }
  },

  /**
   * Setup auto-refresh
   */
  setupAutoRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Set new timer
    this.refreshTimer = setInterval(() => {
      if (this.currentProject && document.visibilityState === 'visible') {
        this.loadForProject(this.currentProject);
      }
    }, TIMELINE_CONFIG.refreshInterval);
  },

  /**
   * Get container
   * @returns {Element}
   */
  getContainer() {
    return this.container;
  },

  /**
   * Dispose
   */
  dispose() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.container = null;
    this.currentProject = null;
    this.isLoading = false;
  }
};

// ============================================
// EXPORTS
// ============================================

export { GitHubTimeline };
export default GitHubTimeline;

// Global export
if (typeof window !== 'undefined') {
  window.GitHubTimeline = GitHubTimeline;
}
