/**
 * Yggdrasil Dashboard - Formation Panel
 * Left slide panel for learning tracks (Fire & Ice theme)
 * Ported and simplified from js/build/components/formation-panel.js
 *
 * Styles: css/formation-panel.css (linked in build.html)
 */

'use strict';

import {
  FORMATION_TRACKS,
  FORMATION_MODULES,
  getFormationTrack,
  getTrackModules,
  calculateTrackProgress,
  getNextModule,
} from '../data/formations.js';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  storageKey: 'asdf_formation_progress',
  animation: {
    slideDuration: 400,
    stagger: 50,
  },
};

// ============================================
// FORMATION PANEL
// ============================================

export const FormationPanel = {
  panel: null,
  backdrop: null,
  tracksContainer: null,
  detailContainer: null,
  detailContent: null,

  currentTrack: null,
  currentSkill: null,
  progress: {},
  isOpen: false,

  // Callbacks
  callbacks: {
    onModuleOpen: null,
    onTrackStart: null,
    onClose: null,
  },

  /**
   * Initialize
   */
  init(container) {
    const parent = typeof container === 'string' ? document.querySelector(container) : container;

    if (!parent) {
      return this;
    }

    this.loadProgress();
    this.createPanel(parent);
    // Styles are in css/formation-panel.css (linked in build.html)
    this.bindEvents();

    return this;
  },

  /**
   * Create panel DOM
   */
  createPanel(parent) {
    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'formation-backdrop';
    parent.appendChild(this.backdrop);

    // Panel
    this.panel = document.createElement('div');
    this.panel.className = 'formation-panel';
    this.panel.innerHTML = `
      <div class="formation-panel-inner">
        <div class="formation-header">
          <h2 class="formation-title">
            <span class="formation-icon">🎓</span>
            Learning Tracks
          </h2>
          <button class="formation-close" aria-label="Close">&times;</button>
        </div>

        <div class="formation-tracks"></div>

        <div class="formation-detail" style="display: none;">
          <button class="formation-back">
            <span>←</span> Back to Tracks
          </button>
          <div class="track-detail-content"></div>
        </div>
      </div>
    `;
    parent.appendChild(this.panel);

    // Cache refs
    this.tracksContainer = this.panel.querySelector('.formation-tracks');
    this.detailContainer = this.panel.querySelector('.formation-detail');
    this.detailContent = this.panel.querySelector('.track-detail-content');

    // Render tracks
    this.renderTracks();
  },

  /**
   * Render tracks list
   */
  renderTracks() {
    this.tracksContainer.innerHTML = Object.values(FORMATION_TRACKS)
      .map(track => this.renderTrackCard(track))
      .join('');
  },

  /**
   * Render single track card
   */
  renderTrackCard(track) {
    const progress = calculateTrackProgress(track.id, this.progress[track.id]?.completed || []);

    return `
      <div class="track-card" data-track="${track.id}" style="--track-color: ${track.color}">
        <div class="track-card-header">
          <span class="track-icon">${track.icon}</span>
          <div class="track-info">
            <h3 class="track-name">${track.name}</h3>
            <p class="track-desc">${track.description}</p>
          </div>
        </div>
        <div class="track-meta">
          <span>⏱ ${track.duration}</span>
          <span>${track.difficulty}</span>
        </div>
        <div class="track-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%; background: ${track.color}"></div>
          </div>
          <span class="progress-label">${progress}% complete</span>
        </div>
        <button class="track-start-btn" style="background: ${track.color}">
          ${progress > 0 ? 'Continue' : 'Start Track'}
        </button>
      </div>
    `;
  },

  /**
   * Bind events
   */
  bindEvents() {
    // Close button
    this.panel.querySelector('.formation-close').addEventListener('click', () => this.close());

    // Backdrop click
    this.backdrop.addEventListener('click', () => this.close());

    // Track card clicks
    this.tracksContainer.addEventListener('click', e => {
      const card = e.target.closest('.track-card');
      if (!card) return;

      // Check if it's the start button
      if (e.target.classList.contains('track-start-btn')) {
        e.stopPropagation();
        this.startTrack(card.dataset.track);
      } else {
        this.showTrackDetail(card.dataset.track);
      }
    });

    // Back button
    this.panel.querySelector('.formation-back').addEventListener('click', () => {
      this.showTracksList();
    });

    // Module clicks
    this.detailContent.addEventListener('click', e => {
      const card = e.target.closest('.module-card');
      if (card && !card.classList.contains('locked')) {
        this.openModule(card.dataset.module);
      }
    });

    // Keyboard
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  /**
   * Open panel
   */
  open(options = {}) {
    const { trackId, skillId, skillName } = options;

    this.isOpen = true;
    this.currentSkill = skillId;
    this.backdrop.classList.add('open');
    this.panel.classList.add('open');

    // Update title if skill provided
    if (skillName) {
      this.panel.querySelector('.formation-title').innerHTML = `
        <span class="formation-icon">🎓</span>
        Learn: ${skillName}
      `;
    }

    if (trackId) {
      this.showTrackDetail(trackId);
    } else {
      this.showTracksList();
    }

    document.body.style.overflow = 'hidden';
  },

  /**
   * Close panel
   */
  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.backdrop.classList.remove('open');
    document.body.style.overflow = '';

    // Reset title
    this.panel.querySelector('.formation-title').innerHTML = `
      <span class="formation-icon">🎓</span>
      Learning Tracks
    `;

    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  },

  /**
   * Show tracks list
   */
  showTracksList() {
    this.currentTrack = null;
    this.tracksContainer.style.display = 'block';
    this.detailContainer.style.display = 'none';
    this.renderTracks();
  },

  /**
   * Show track detail
   */
  showTrackDetail(trackId) {
    const track = getFormationTrack(trackId);
    if (!track) return;

    this.currentTrack = trackId;
    this.tracksContainer.style.display = 'none';
    this.detailContainer.style.display = 'block';

    const modules = getTrackModules(trackId);
    const completedModules = this.progress[trackId]?.completed || [];
    const nextModule = getNextModule(trackId, completedModules);

    this.detailContent.innerHTML = `
      <div class="track-detail-header" style="--track-color: ${track.color}">
        <span class="track-icon-large">${track.icon}</span>
        <h3 class="track-name-large">${track.name}</h3>
        <p class="track-desc-detail">${track.description}</p>
        <div class="track-stats">
          <span>⏱ ${track.duration}</span>
          <span>📚 ${modules.length} modules</span>
          <span>${track.difficulty}</span>
        </div>
      </div>

      <h4 class="modules-title">Modules</h4>
      ${modules
        .map((module, index) => {
          const isCompleted = completedModules.includes(module.id);
          const isLocked =
            !isCompleted && module.prerequisites.some(p => !completedModules.includes(p));
          const isNext = nextModule?.id === module.id;

          return `
          <div
            class="module-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''} ${isNext ? 'next' : ''}"
            data-module="${module.id}"
            style="animation-delay: ${index * CONFIG.animation.stagger}ms; --track-color: ${track.color}"
          >
            <div class="module-number">${index + 1}</div>
            <div class="module-info">
              <h5 class="module-name">${module.name}</h5>
              <p class="module-desc">${module.description}</p>
              <div class="module-meta">
                <span>⏱ ${module.duration}</span>
                <span>📖 ${module.lessons} lessons</span>
                <span>🔧 ${module.projects} project${module.projects > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="module-status">
              ${isCompleted ? '<span class="status-icon completed">✓</span>' : ''}
              ${isLocked ? '<span class="status-icon locked">🔒</span>' : ''}
              ${isNext ? '<span class="status-badge">Next</span>' : ''}
            </div>
          </div>
        `;
        })
        .join('')}
    `;
  },

  /**
   * Start track
   */
  startTrack(trackId) {
    const completedModules = this.progress[trackId]?.completed || [];
    const nextModule = getNextModule(trackId, completedModules);

    if (nextModule) {
      this.openModule(nextModule.id);
    }

    if (this.callbacks.onTrackStart) {
      this.callbacks.onTrackStart(trackId);
    }
  },

  /**
   * Open module
   */
  openModule(moduleId) {
    const module = FORMATION_MODULES[moduleId];
    if (!module) return;

    // Check if locked
    const completedModules = this.progress[module.track]?.completed || [];
    const isLocked = module.prerequisites.some(p => !completedModules.includes(p));

    if (isLocked) {
      return;
    }

    this.close();

    if (this.callbacks.onModuleOpen) {
      this.callbacks.onModuleOpen(module);
    }
  },

  /**
   * Complete module
   */
  completeModule(moduleId) {
    const module = FORMATION_MODULES[moduleId];
    if (!module) return;

    if (!this.progress[module.track]) {
      this.progress[module.track] = { completed: [] };
    }

    if (!this.progress[module.track].completed.includes(moduleId)) {
      this.progress[module.track].completed.push(moduleId);
      this.saveProgress();
    }
  },

  /**
   * Set callback
   */
  on(event, callback) {
    const key = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    if (this.callbacks.hasOwnProperty(key)) {
      this.callbacks[key] = callback;
    }
  },

  /**
   * Load progress
   */
  loadProgress() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      this.progress = saved ? JSON.parse(saved) : {};
    } catch (e) {
      this.progress = {};
    }
  },

  /**
   * Save progress
   */
  saveProgress() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.progress));
    } catch (e) {
      // Silent fail - localStorage may be unavailable
    }
  },

  /**
   * Dispose
   */
  dispose() {
    this.panel?.remove();
    this.backdrop?.remove();
  },
};

export default FormationPanel;
