/**
 * Build V2 - Project Panel Component
 * Sliding panel showing project details, GitHub data, skills, and builders
 *
 * @version 1.0.0
 */

'use strict';

import { EVENTS } from '../config.js';
import { BuildState } from '../state.js';
import { DataAdapter } from '../data/adapter.js';
import { GitHubApiService } from '../services/github-api.js';
import { sanitizeText, escapeHtml } from '../utils/security.js';
import {
  $,
  $$,
  addClass,
  removeClass,
  on,
  off,
  createElement,
  setStyles,
  waitForTransition
} from '../utils/dom.js';

// ============================================
// PANEL CONFIGURATION
// ============================================

const PANEL_CONFIG = {
  width: '400px',
  maxWidth: '90vw',
  animationDuration: 300
};

// ============================================
// PANEL STATE
// ============================================

let panelElement = null;
let backdropElement = null;
let isOpen = false;
let currentProjectId = null;
let escapeHandler = null;

// ============================================
// PROJECT PANEL COMPONENT
// ============================================

const ProjectPanelComponent = {
  /**
   * Initialize the project panel
   */
  init() {
    this.createPanel();
    this.bindEvents();

    // Subscribe to project selection events
    BuildState.subscribe(EVENTS.TREE_NODE_CLICK, (data) => {
      // Panel opens via explicit call, not auto on tree click
      // This allows the modal system to work alongside
    });

    console.log('[ProjectPanelComponent] Initialized');
  },

  /**
   * Create panel DOM structure
   */
  createPanel() {
    // Create backdrop
    backdropElement = createElement('div', {
      className: 'project-panel-backdrop'
    });

    // Create panel
    panelElement = createElement('div', {
      className: 'project-panel',
      'aria-hidden': 'true',
      role: 'dialog',
      'aria-label': 'Project Details'
    });

    panelElement.innerHTML = `
      <div class="project-panel-header">
        <button class="project-panel-close" aria-label="Close panel">
          <span aria-hidden="true">&times;</span>
        </button>
        <div class="project-panel-title-wrapper">
          <span class="project-panel-icon"></span>
          <h2 class="project-panel-title">Project</h2>
        </div>
        <span class="project-panel-status"></span>
      </div>

      <div class="project-panel-content">
        <!-- Progress Section -->
        <section class="panel-section">
          <h3 class="panel-section-title">Progress</h3>
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-bar-fill"></div>
            </div>
            <span class="progress-percentage">0%</span>
          </div>
          <div class="github-stats">
            <div class="github-stat">
              <span class="stat-icon">&#9733;</span>
              <span class="stat-value stars-count">0</span>
              <span class="stat-label">Stars</span>
            </div>
            <div class="github-stat">
              <span class="stat-icon">&#128065;</span>
              <span class="stat-value issues-count">0</span>
              <span class="stat-label">Issues</span>
            </div>
            <div class="github-stat">
              <span class="stat-icon">&#128100;</span>
              <span class="stat-value contributors-count">0</span>
              <span class="stat-label">Builders</span>
            </div>
          </div>
        </section>

        <!-- Skills Section -->
        <section class="panel-section">
          <h3 class="panel-section-title">Skills Required</h3>
          <div class="skills-grid"></div>
        </section>

        <!-- Recent Activity -->
        <section class="panel-section">
          <h3 class="panel-section-title">Recent Activity</h3>
          <div class="commits-list"></div>
        </section>

        <!-- Builders Section -->
        <section class="panel-section">
          <h3 class="panel-section-title">Top Builders</h3>
          <div class="builders-grid"></div>
        </section>
      </div>

      <div class="project-panel-footer">
        <a href="#" class="panel-btn panel-btn-secondary" target="_blank" rel="noopener">
          <span>&#128279;</span> GitHub
        </a>
        <button class="panel-btn panel-btn-primary" data-action="deep-learn">
          <span>&#128218;</span> Deep Learn
        </button>
      </div>
    `;

    // Append to body
    document.body.appendChild(backdropElement);
    document.body.appendChild(panelElement);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Close button
    const closeBtn = $('.project-panel-close', panelElement);
    if (closeBtn) {
      on(closeBtn, 'click', () => this.close());
    }

    // Backdrop click
    on(backdropElement, 'click', () => this.close());

    // Deep learn button
    const deepLearnBtn = $('[data-action="deep-learn"]', panelElement);
    if (deepLearnBtn) {
      on(deepLearnBtn, 'click', () => {
        if (currentProjectId) {
          window.location.href = `/deep-learn.html?project=${encodeURIComponent(currentProjectId)}`;
        }
      });
    }
  },

  /**
   * Open panel for a project
   * @param {string} projectId
   */
  async open(projectId) {
    if (isOpen && currentProjectId === projectId) return;

    currentProjectId = projectId;

    // Show loading state
    this.showLoading();

    // Show panel
    addClass(backdropElement, 'active');
    addClass(panelElement, 'active');
    panelElement.setAttribute('aria-hidden', 'false');
    isOpen = true;

    // Bind escape key
    escapeHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    on(document, 'keydown', escapeHandler);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Emit event
    BuildState.emit('panel:open', { projectId, type: 'project' });

    // Load data
    await this.loadProjectData(projectId);
  },

  /**
   * Close the panel
   */
  async close() {
    if (!isOpen) return;

    removeClass(panelElement, 'active');
    removeClass(backdropElement, 'active');
    panelElement.setAttribute('aria-hidden', 'true');

    // Unbind escape key
    if (escapeHandler) {
      off(document, 'keydown', escapeHandler);
      escapeHandler = null;
    }

    // Restore body scroll
    document.body.style.overflow = '';

    await waitForTransition(panelElement);

    isOpen = false;
    currentProjectId = null;

    // Emit event
    BuildState.emit('panel:close', { type: 'project' });
  },

  /**
   * Show loading state
   */
  showLoading() {
    const content = $('.project-panel-content', panelElement);
    if (content) {
      addClass(content, 'loading');
    }
  },

  /**
   * Hide loading state
   */
  hideLoading() {
    const content = $('.project-panel-content', panelElement);
    if (content) {
      removeClass(content, 'loading');
    }
  },

  /**
   * Load and display project data
   * @param {string} projectId
   */
  async loadProjectData(projectId) {
    try {
      // Get project info from DataAdapter
      const project = await DataAdapter.getProject(projectId);
      if (!project) {
        this.showError('Project not found');
        return;
      }

      // Update header
      this.updateHeader(project);

      // Fetch GitHub data
      const githubData = await GitHubApiService.getProjectData(projectId);

      // Update sections
      this.updateProgress(githubData.completion, githubData.repo);
      this.updateSkills(project.skills || []);
      this.updateCommits(githubData.commits);
      this.updateBuilders(githubData.contributors);
      this.updateFooter(project, githubData.repo);

      this.hideLoading();
    } catch (error) {
      console.error('[ProjectPanelComponent] Failed to load data:', error);
      this.showError('Failed to load project data');
    }
  },

  /**
   * Update panel header
   * @param {Object} project
   */
  updateHeader(project) {
    const icon = $('.project-panel-icon', panelElement);
    const title = $('.project-panel-title', panelElement);
    const status = $('.project-panel-status', panelElement);

    if (icon) icon.innerHTML = project.icon || '&#128193;';
    if (title) title.textContent = sanitizeText(project.title);
    if (status) {
      status.textContent = project.status.toUpperCase();
      status.className = `project-panel-status status-${project.status}`;
    }
  },

  /**
   * Update progress section
   * @param {number} completion
   * @param {Object} repo
   */
  updateProgress(completion, repo) {
    const progressFill = $('.progress-bar-fill', panelElement);
    const progressText = $('.progress-percentage', panelElement);
    const starsCount = $('.stars-count', panelElement);
    const issuesCount = $('.issues-count', panelElement);
    const contributorsCount = $('.contributors-count', panelElement);

    if (progressFill) {
      progressFill.style.width = `${completion}%`;
      // Color based on completion
      if (completion >= 80) {
        progressFill.style.background = 'var(--green)';
      } else if (completion >= 50) {
        progressFill.style.background = 'var(--gold)';
      } else {
        progressFill.style.background = 'var(--accent-fire)';
      }
    }
    if (progressText) progressText.textContent = `${completion}%`;

    if (repo) {
      if (starsCount) starsCount.textContent = repo.stars || 0;
      if (issuesCount) issuesCount.textContent = repo.openIssues || 0;
    }
  },

  /**
   * Update skills section
   * @param {Array} skills
   */
  updateSkills(skills) {
    const grid = $('.skills-grid', panelElement);
    if (!grid) return;

    if (skills.length === 0) {
      grid.innerHTML = '<p class="empty-state">No skills defined yet</p>';
      return;
    }

    grid.innerHTML = skills.map(skill => `
      <span class="skill-tag">${escapeHtml(skill)}</span>
    `).join('');
  },

  /**
   * Update commits section
   * @param {Array} commits
   */
  updateCommits(commits) {
    const list = $('.commits-list', panelElement);
    if (!list) return;

    if (!commits || commits.length === 0) {
      list.innerHTML = '<p class="empty-state">No recent activity</p>';
      return;
    }

    list.innerHTML = commits.map(commit => `
      <div class="commit-item">
        <span class="commit-sha">${escapeHtml(commit.sha)}</span>
        <span class="commit-message">${escapeHtml(commit.message)}</span>
        <span class="commit-time">${GitHubApiService.formatTimeAgo(commit.date)}</span>
      </div>
    `).join('');
  },

  /**
   * Update builders section
   * @param {Array} contributors
   */
  updateBuilders(contributors) {
    const grid = $('.builders-grid', panelElement);
    const contributorsCount = $('.contributors-count', panelElement);

    if (!grid) return;

    if (contributorsCount) {
      contributorsCount.textContent = contributors ? contributors.length : 0;
    }

    if (!contributors || contributors.length === 0) {
      grid.innerHTML = '<p class="empty-state">No builders yet</p>';
      return;
    }

    grid.innerHTML = contributors.slice(0, 5).map(contrib => `
      <a href="${escapeHtml(contrib.url)}" class="builder-badge" target="_blank" rel="noopener" title="${escapeHtml(contrib.login)}">
        <img src="${escapeHtml(contrib.avatar)}" alt="${escapeHtml(contrib.login)}" class="builder-avatar" loading="lazy" />
        <span class="builder-commits">${contrib.contributions}</span>
      </a>
    `).join('');
  },

  /**
   * Update footer links
   * @param {Object} project
   * @param {Object} repo
   */
  updateFooter(project, repo) {
    const githubLink = $('.panel-btn-secondary', panelElement);
    if (githubLink && repo) {
      githubLink.href = repo.url || '#';
    }
  },

  /**
   * Show error state
   * @param {string} message
   */
  showError(message) {
    const content = $('.project-panel-content', panelElement);
    if (content) {
      content.innerHTML = `
        <div class="panel-error">
          <span class="error-icon">&#9888;</span>
          <p>${sanitizeText(message)}</p>
          <button class="panel-btn panel-btn-secondary" onclick="ProjectPanelComponent.close()">Close</button>
        </div>
      `;
    }
    this.hideLoading();
  },

  /**
   * Check if panel is open
   * @returns {boolean}
   */
  isOpen() {
    return isOpen;
  },

  /**
   * Get current project ID
   * @returns {string|null}
   */
  getCurrentProject() {
    return currentProjectId;
  }
};

// ============================================
// EXPORTS
// ============================================

export { ProjectPanelComponent };
export default ProjectPanelComponent;

// Global export for browser
if (typeof window !== 'undefined') {
  window.ProjectPanelComponent = ProjectPanelComponent;
}
