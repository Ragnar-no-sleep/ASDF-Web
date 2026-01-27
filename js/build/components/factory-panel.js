/**
 * Build V2 - Factory Panel Component
 * Sliding panel showing selected track, modules, and project recommendations
 * Triggered after quiz completion
 *
 * @version 1.0.0
 */

'use strict';

import { TRACKS, EVENTS } from '../config.js';
import { BuildState } from '../state.js';
import { DataAdapter } from '../data/adapter.js';
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
// TRACK MODULES DATA
// ============================================

// Note: Growth track merged into Content as of 2026-01-21
const TRACK_MODULES = {
  dev: [
    { id: 'solana-basics', name: 'Solana Fundamentals', icon: '&#9883;', duration: '2h', status: 'available' },
    { id: 'rust-intro', name: 'Rust for Solana', icon: '&#128296;', duration: '4h', status: 'available' },
    { id: 'anchor-framework', name: 'Anchor Framework', icon: '&#9875;', duration: '3h', status: 'available' },
    { id: 'token-program', name: 'Token Programs', icon: '&#128176;', duration: '2h', status: 'locked' },
    { id: 'pda-accounts', name: 'PDAs & Accounts', icon: '&#128273;', duration: '3h', status: 'locked' },
    { id: 'testing-programs', name: 'Testing Programs', icon: '&#128269;', duration: '2h', status: 'locked' }
  ],
  gaming: [
    { id: 'game-design', name: 'Game Design Basics', icon: '&#127922;', duration: '2h', status: 'available' },
    { id: 'unity-solana', name: 'Unity + Solana', icon: '&#127918;', duration: '4h', status: 'available' },
    { id: 'nft-integration', name: 'NFT Game Assets', icon: '&#128444;', duration: '2h', status: 'available' },
    { id: 'game-economy', name: 'Game Economy', icon: '&#128176;', duration: '2h', status: 'locked' },
    { id: 'multiplayer', name: 'Multiplayer Systems', icon: '&#128101;', duration: '3h', status: 'locked' }
  ],
  content: [
    // Content creation
    { id: 'crypto-writing', name: 'Crypto Writing', icon: '&#128221;', duration: '1h', status: 'available' },
    { id: 'video-production', name: 'Video Production', icon: '&#127909;', duration: '2h', status: 'available' },
    { id: 'thread-mastery', name: 'Thread Mastery', icon: '&#128172;', duration: '1h', status: 'available' },
    { id: 'brand-building', name: 'Personal Branding', icon: '&#127775;', duration: '2h', status: 'locked' },
    { id: 'monetization', name: 'Creator Monetization', icon: '&#128176;', duration: '1.5h', status: 'locked' },
    // Growth (merged)
    { id: 'crypto-marketing', name: 'Crypto Marketing 101', icon: '&#128200;', duration: '1.5h', status: 'available' },
    { id: 'community-building', name: 'Community Building', icon: '&#128101;', duration: '2h', status: 'available' },
    { id: 'viral-hooks', name: 'Viral Hooks', icon: '&#128293;', duration: '1h', status: 'locked' },
    { id: 'tokenomics', name: 'Tokenomics Design', icon: '&#128178;', duration: '2h', status: 'locked' },
    { id: 'analytics', name: 'On-Chain Analytics', icon: '&#128202;', duration: '2h', status: 'locked' }
  ]
};

// Project recommendations by track (Growth merged into Content)
const TRACK_PROJECTS = {
  dev: ['burn-tracker', 'token-launcher', 'oracle', 'rpc-monitor'],
  gaming: ['games-platform', 'holdex', 'forecast'],
  content: ['learn-platform', 'community-hub', 'ambassador-program', 'games-platform']
};

// ============================================
// PANEL STATE
// ============================================

let panelElement = null;
let backdropElement = null;
let isOpen = false;
let currentTrack = null;
let escapeHandler = null;

// ============================================
// FACTORY PANEL COMPONENT
// ============================================

const FactoryPanelComponent = {
  /**
   * Initialize the factory panel
   */
  init() {
    this.createPanel();
    this.bindEvents();

    // Subscribe to quiz completion
    BuildState.subscribe(EVENTS.QUIZ_COMPLETE, (data) => {
      if (data.result) {
        // Small delay to let quiz animation complete
        setTimeout(() => {
          this.open(data.result);
        }, 300);
      }
    });

    console.log('[FactoryPanelComponent] Initialized');
  },

  /**
   * Create panel DOM structure
   */
  createPanel() {
    // Create backdrop
    backdropElement = createElement('div', {
      className: 'factory-panel-backdrop'
    });

    // Create panel
    panelElement = createElement('div', {
      className: 'factory-panel',
      'aria-hidden': 'true',
      role: 'dialog',
      'aria-label': 'Your Builder Track'
    });

    panelElement.innerHTML = `
      <div class="factory-panel-header">
        <button class="factory-panel-close" aria-label="Close panel">
          <span aria-hidden="true">&times;</span>
        </button>
        <div class="factory-panel-badge">
          <span class="track-icon"></span>
        </div>
        <h2 class="factory-panel-title">Your Track</h2>
        <p class="factory-panel-subtitle">Start your journey</p>
      </div>

      <div class="factory-panel-content">
        <!-- Modules Section -->
        <section class="panel-section">
          <h3 class="panel-section-title">Learning Modules</h3>
          <div class="modules-list"></div>
        </section>

        <!-- Recommended Projects -->
        <section class="panel-section">
          <h3 class="panel-section-title">Recommended Projects</h3>
          <div class="recommended-projects"></div>
        </section>

        <!-- Progress Overview -->
        <section class="panel-section">
          <h3 class="panel-section-title">Your Progress</h3>
          <div class="track-progress">
            <div class="progress-ring-container">
              <svg class="progress-ring" width="80" height="80">
                <circle class="progress-ring-bg" cx="40" cy="40" r="32" fill="none" stroke-width="6"/>
                <circle class="progress-ring-fill" cx="40" cy="40" r="32" fill="none" stroke-width="6"/>
              </svg>
              <span class="progress-ring-text">0%</span>
            </div>
            <div class="progress-stats">
              <div class="progress-stat">
                <span class="stat-value modules-completed">0</span>
                <span class="stat-label">Modules Done</span>
              </div>
              <div class="progress-stat">
                <span class="stat-value hours-spent">0h</span>
                <span class="stat-label">Time Spent</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="factory-panel-footer">
        <button class="panel-btn panel-btn-secondary" data-action="change-track">
          <span>&#128260;</span> Change Track
        </button>
        <button class="panel-btn panel-btn-primary" data-action="start-learning">
          <span>&#128640;</span> Start Learning
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
    const closeBtn = $('.factory-panel-close', panelElement);
    if (closeBtn) {
      on(closeBtn, 'click', () => this.close());
    }

    // Backdrop click
    on(backdropElement, 'click', () => this.close());

    // Change track button
    const changeTrackBtn = $('[data-action="change-track"]', panelElement);
    if (changeTrackBtn) {
      on(changeTrackBtn, 'click', () => {
        this.close();
        // Switch to quiz view to retake
        const pathBtn = $('[data-view="path"]');
        if (pathBtn) pathBtn.click();
      });
    }

    // Start learning button
    const startBtn = $('[data-action="start-learning"]', panelElement);
    if (startBtn) {
      on(startBtn, 'click', () => {
        if (currentTrack) {
          // Navigate to deep-learn with track
          window.location.href = `/deep-learn.html?track=${encodeURIComponent(currentTrack)}`;
        }
      });
    }

    // Module clicks
    on(panelElement, 'click', (e) => {
      const moduleItem = e.target.closest('.module-item:not(.locked)');
      if (moduleItem) {
        const moduleId = moduleItem.dataset.module;
        if (moduleId) {
          window.location.href = `/deep-learn.html?module=${encodeURIComponent(moduleId)}`;
        }
      }
    });

    // Project clicks
    on(panelElement, 'click', (e) => {
      const projectCard = e.target.closest('.recommended-project');
      if (projectCard) {
        const projectId = projectCard.dataset.project;
        if (projectId) {
          this.close();
          // Open project panel (import would be circular, use event)
          BuildState.emit('project:open', { projectId });
        }
      }
    });
  },

  /**
   * Open panel for a track
   * @param {string} trackId
   */
  async open(trackId) {
    if (isOpen && currentTrack === trackId) return;

    currentTrack = trackId;
    const track = TRACKS[trackId];

    if (!track) {
      console.warn('[FactoryPanelComponent] Unknown track:', trackId);
      return;
    }

    // Update content
    this.updateHeader(track);
    this.updateModules(trackId);
    await this.updateProjects(trackId);
    this.updateProgress(trackId);

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
    BuildState.emit('panel:open', { trackId, type: 'factory' });
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

    // Emit event
    BuildState.emit('panel:close', { type: 'factory' });
  },

  /**
   * Update panel header
   * @param {Object} track
   */
  updateHeader(track) {
    const icon = $('.track-icon', panelElement);
    const title = $('.factory-panel-title', panelElement);
    const subtitle = $('.factory-panel-subtitle', panelElement);
    const badge = $('.factory-panel-badge', panelElement);

    if (icon) icon.textContent = track.icon;
    if (title) title.textContent = track.name;
    if (subtitle) subtitle.textContent = track.desc;

    if (badge) {
      badge.style.background = `${track.color}20`;
      badge.style.borderColor = `${track.color}40`;
      if (icon) icon.style.color = track.color;
    }
  },

  /**
   * Update modules list
   * @param {string} trackId
   */
  updateModules(trackId) {
    const list = $('.modules-list', panelElement);
    if (!list) return;

    const modules = TRACK_MODULES[trackId] || [];

    list.innerHTML = modules.map(mod => `
      <div class="module-item ${mod.status === 'locked' ? 'locked' : ''}" data-module="${escapeHtml(mod.id)}">
        <span class="module-icon">${mod.icon}</span>
        <div class="module-info">
          <span class="module-name">${escapeHtml(mod.name)}</span>
          <span class="module-duration">${escapeHtml(mod.duration)}</span>
        </div>
        <span class="module-status">
          ${mod.status === 'locked' ? '&#128274;' : '&#9654;'}
        </span>
      </div>
    `).join('');
  },

  /**
   * Update recommended projects
   * @param {string} trackId
   */
  async updateProjects(trackId) {
    const container = $('.recommended-projects', panelElement);
    if (!container) return;

    const projectIds = TRACK_PROJECTS[trackId] || [];

    // Fetch project data
    const projectsHtml = await Promise.all(
      projectIds.slice(0, 3).map(async (projectId) => {
        const project = await DataAdapter.getProject(projectId);
        if (!project) return '';

        return `
          <div class="recommended-project" data-project="${escapeHtml(projectId)}">
            <span class="project-icon">${project.icon}</span>
            <div class="project-info">
              <span class="project-name">${escapeHtml(project.title)}</span>
              <span class="project-status status-${project.status}">${project.status}</span>
            </div>
          </div>
        `;
      })
    );

    container.innerHTML = projectsHtml.join('');
  },

  /**
   * Update progress display
   * @param {string} trackId
   */
  updateProgress(trackId) {
    // Get saved progress from state
    const progress = BuildState.data.trackProgress?.[trackId] || {
      completed: 0,
      hoursSpent: 0
    };

    const modules = TRACK_MODULES[trackId] || [];
    const totalModules = modules.length;
    const percentage = totalModules > 0
      ? Math.round((progress.completed / totalModules) * 100)
      : 0;

    // Update ring
    const ringFill = $('.progress-ring-fill', panelElement);
    const ringText = $('.progress-ring-text', panelElement);

    if (ringFill) {
      // Circumference = 2 * PI * r = 2 * 3.14159 * 32 ≈ 201
      const circumference = 201;
      const offset = circumference - (percentage / 100 * circumference);
      ringFill.style.strokeDasharray = `${circumference}`;
      ringFill.style.strokeDashoffset = offset;
    }

    if (ringText) {
      ringText.textContent = `${percentage}%`;
    }

    // Update stats
    const modulesCompleted = $('.modules-completed', panelElement);
    const hoursSpent = $('.hours-spent', panelElement);

    if (modulesCompleted) modulesCompleted.textContent = progress.completed;
    if (hoursSpent) hoursSpent.textContent = `${progress.hoursSpent}h`;
  },

  /**
   * Check if panel is open
   * @returns {boolean}
   */
  isOpen() {
    return isOpen;
  },

  /**
   * Get current track
   * @returns {string|null}
   */
  getCurrentTrack() {
    return currentTrack;
  }
};

// ============================================
// EXPORTS
// ============================================

export { FactoryPanelComponent };
export default FactoryPanelComponent;

// Global export for browser
if (typeof window !== 'undefined') {
  window.FactoryPanelComponent = FactoryPanelComponent;
}
