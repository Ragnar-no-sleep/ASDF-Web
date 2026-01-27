/**
 * Yggdrasil Builder's Cosmos - Side Panel
 * Project details with Fire & Ice theme
 *
 * Styles are in css/yggdrasil-unified.css (.cosmos-panel)
 */

'use strict';

/**
 * Track configuration for colors and icons
 */
const TRACK_CONFIG = {
  dev: { id: 'dev', icon: '⚡' },
  games: { id: 'games', icon: '🎮' },
  content: { id: 'content', icon: '📚' },
};

/**
 * Side panel for project details
 */
export const Panel = {
  element: null,
  isOpen: false,
  currentProject: null,

  /**
   * Initialize
   */
  init(container) {
    this.createElement(container);
    return this;
  },

  /**
   * Create panel element
   */
  createElement(container) {
    this.element = document.createElement('div');
    this.element.className = 'cosmos-panel';
    this.element.innerHTML = `
      <button class="panel-close">&times;</button>
      <div class="panel-track-indicator"></div>
      <div class="panel-header">
        <div class="panel-icon"></div>
        <div class="panel-title-group">
          <h2 class="panel-title"></h2>
          <span class="panel-track"></span>
        </div>
      </div>
      <div class="panel-status-bar">
        <span class="panel-status"></span>
        <span class="panel-kscore"></span>
      </div>
      <div class="panel-description"></div>
      <div class="panel-content">
        <div class="panel-section panel-actions">
          <h3>Actions</h3>
          <div class="panel-buttons"></div>
        </div>
      </div>
    `;

    container.appendChild(this.element);
    this.setupEvents();
  },

  /**
   * Setup events
   */
  setupEvents() {
    const close = this.element.querySelector('.panel-close');
    close.addEventListener('click', () => this.close());

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  /**
   * Open panel with project data
   */
  open(project) {
    if (!project) return;

    this.currentProject = project;
    this.updateContent(project);

    this.element.classList.add('open');
    this.isOpen = true;
  },

  /**
   * Update panel content
   */
  updateContent(project) {
    const trackId = project.track?.id || project.track || 'dev';
    const trackConfig = TRACK_CONFIG[trackId] || TRACK_CONFIG.dev;

    // Update track class for CSS-based theming
    this.element.classList.remove('track-dev', 'track-games', 'track-content');
    this.element.classList.add(`track-${trackId}`);

    // Icon
    const icon = this.element.querySelector('.panel-icon');
    icon.textContent = trackConfig.icon;

    // Title
    const title = this.element.querySelector('.panel-title');
    title.textContent = project.name || 'Unknown';

    // Track name
    const track = this.element.querySelector('.panel-track');
    track.textContent = project.track?.name || project.track || '';

    // Status
    const status = this.element.querySelector('.panel-status');
    if (project.status === 'live') {
      status.innerHTML = '<span class="status-live">● LIVE</span>';
    } else if (project.status === 'building') {
      status.innerHTML = '<span class="status-building">◐ IN DEVELOPMENT</span>';
    } else {
      status.textContent = project.status || '';
    }

    // K-Score
    const kscore = this.element.querySelector('.panel-kscore');
    kscore.textContent = project.kScore ? `K-Score: ${project.kScore}` : '';

    // Description
    const description = this.element.querySelector('.panel-description');
    description.textContent = project.description || '';

    // Buttons
    const buttons = this.element.querySelector('.panel-buttons');
    buttons.innerHTML = '';

    if (project.url) {
      const visitBtn = this.createButton('Visit Project →', true, () => {
        window.location.href = project.url;
      });
      buttons.appendChild(visitBtn);
    }

    if (project.status === 'live') {
      const learnBtn = this.createButton('Learn More', false, () => {
        // Navigate to learning content when implemented
      });
      buttons.appendChild(learnBtn);
    }
  },

  /**
   * Create button
   */
  createButton(text, isPrimary, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = isPrimary ? 'panel-btn primary' : 'panel-btn';
    btn.addEventListener('click', onClick);
    return btn;
  },

  /**
   * Close panel
   */
  close() {
    this.element.classList.remove('open');
    this.isOpen = false;
    this.currentProject = null;
  },

  /**
   * Toggle
   */
  toggle(project) {
    if (this.isOpen && this.currentProject?.id === project?.id) {
      this.close();
    } else {
      this.open(project);
    }
  },

  /**
   * Dispose
   */
  dispose() {
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  },
};

export default Panel;
