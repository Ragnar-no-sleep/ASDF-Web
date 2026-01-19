/**
 * Build V2 - Formation Panel Component
 * Left slide panel for learning tracks
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { TRACKS, MODULES, getTrack, getTrackModules, calculateTrackProgress, getNextModule } from '../data/formations-data.js';
import { $, $$, addClass, removeClass, on, delegate, safeInnerHTML } from '../utils/dom.js';
import { sanitizeText } from '../utils/security.js';
import { phiDelays } from '../utils/phi.js';

// ============================================
// FORMATION PANEL CONFIGURATION
// ============================================

const PANEL_CONFIG = {
  // Animation
  animation: {
    slideDuration: 400,
    stagger: 40
  },
  // Storage key for progress
  storageKey: 'asdf_formation_progress'
};

// ============================================
// FORMATION PANEL COMPONENT
// ============================================

const FormationPanel = {
  /**
   * Panel element
   */
  panel: null,

  /**
   * Backdrop element
   */
  backdrop: null,

  /**
   * Current track ID
   */
  currentTrack: null,

  /**
   * User progress data
   */
  progress: {},

  /**
   * Open state
   */
  isOpen: false,

  /**
   * Initialize formation panel
   * @param {string|Element} containerSelector - Parent container
   */
  init(containerSelector = 'body') {
    const container = typeof containerSelector === 'string'
      ? $(containerSelector)
      : containerSelector;

    if (!container) {
      console.warn('[FormationPanel] Container not found');
      return;
    }

    // Load saved progress
    this.loadProgress();

    // Create panel DOM
    this.createPanel(container);

    // Bind events
    this.bindEvents();

    console.log('[FormationPanel] Initialized');
  },

  /**
   * Create panel DOM structure
   * @param {Element} container
   */
  createPanel(container) {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'formation-backdrop';
    this.backdrop.style.display = 'none';
    container.appendChild(this.backdrop);

    // Create panel
    this.panel = document.createElement('div');
    this.panel.className = 'formation-panel';
    this.panel.innerHTML = `
      <div class="formation-panel-inner">
        <div class="formation-header">
          <h2 class="formation-title">
            <span class="formation-icon">&#127891;</span>
            Learning Tracks
          </h2>
          <button class="formation-close" aria-label="Close">&times;</button>
        </div>

        <div class="formation-tracks">
          ${Object.values(TRACKS).map(track => this.renderTrackCard(track)).join('')}
        </div>

        <div class="formation-detail" style="display: none;">
          <button class="formation-back">
            <span>&larr;</span> Back to Tracks
          </button>
          <div class="track-detail-content"></div>
        </div>
      </div>
    `;
    container.appendChild(this.panel);

    // Cache references
    this.tracksContainer = $('.formation-tracks', this.panel);
    this.detailContainer = $('.formation-detail', this.panel);
    this.detailContent = $('.track-detail-content', this.panel);
  },

  /**
   * Render track card
   * @param {Object} track
   * @returns {string}
   */
  renderTrackCard(track) {
    const progress = calculateTrackProgress(track.id, this.progress[track.id]?.completed || []);

    return `
      <div class="track-card" data-track="${track.id}" style="--track-color: ${track.color}">
        <div class="track-card-header">
          <span class="track-icon">${track.icon}</span>
          <div class="track-info">
            <h3 class="track-name">${sanitizeText(track.name)}</h3>
            <p class="track-desc">${sanitizeText(track.description)}</p>
          </div>
        </div>
        <div class="track-meta">
          <span class="track-duration">&#128337; ${track.duration}</span>
          <span class="track-difficulty">${track.difficulty}</span>
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
   * Bind event listeners
   */
  bindEvents() {
    // Close button
    const closeBtn = $('.formation-close', this.panel);
    if (closeBtn) {
      on(closeBtn, 'click', () => this.close());
    }

    // Backdrop click
    on(this.backdrop, 'click', () => this.close());

    // Track card clicks
    delegate(this.tracksContainer, 'click', '.track-card', (e, card) => {
      const trackId = card.dataset.track;
      this.showTrackDetail(trackId);
    });

    // Start button
    delegate(this.tracksContainer, 'click', '.track-start-btn', (e, btn) => {
      e.stopPropagation();
      const card = btn.closest('.track-card');
      const trackId = card?.dataset.track;
      if (trackId) {
        this.startTrack(trackId);
      }
    });

    // Back button
    const backBtn = $('.formation-back', this.panel);
    if (backBtn) {
      on(backBtn, 'click', () => this.showTracksList());
    }

    // Module clicks
    delegate(this.detailContent, 'click', '.module-card', (e, card) => {
      const moduleId = card.dataset.module;
      this.openModule(moduleId);
    });

    // Listen for panel open
    BuildState.subscribe('formation:open', (data) => {
      this.open(data?.trackId);
    });

    // Listen for quiz complete
    BuildState.subscribe('quiz:complete', (data) => {
      if (data.result) {
        this.open(data.result);
      }
    });

    // Keyboard
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  /**
   * Open the panel
   * @param {string} trackId - Optional track to open
   */
  open(trackId = null) {
    this.isOpen = true;
    this.backdrop.style.display = 'block';
    addClass(this.panel, 'open');

    // Show specific track if provided
    if (trackId) {
      this.showTrackDetail(trackId);
    } else {
      this.showTracksList();
    }

    // Emit event
    BuildState.emit('formation:opened', { trackId });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },

  /**
   * Close the panel
   */
  close() {
    this.isOpen = false;
    removeClass(this.panel, 'open');

    setTimeout(() => {
      this.backdrop.style.display = 'none';
    }, PANEL_CONFIG.animation.slideDuration);

    // Restore body scroll
    document.body.style.overflow = '';

    BuildState.emit('formation:closed', {});
  },

  /**
   * Show tracks list
   */
  showTracksList() {
    this.currentTrack = null;
    this.tracksContainer.style.display = 'block';
    this.detailContainer.style.display = 'none';

    // Re-render cards with updated progress
    this.tracksContainer.innerHTML = Object.values(TRACKS)
      .map(track => this.renderTrackCard(track))
      .join('');
  },

  /**
   * Show track detail
   * @param {string} trackId
   */
  showTrackDetail(trackId) {
    const track = getTrack(trackId);
    if (!track) return;

    this.currentTrack = trackId;
    this.tracksContainer.style.display = 'none';
    this.detailContainer.style.display = 'block';

    const modules = getTrackModules(trackId);
    const completedModules = this.progress[trackId]?.completed || [];
    const nextModule = getNextModule(trackId, completedModules);

    const html = `
      <div class="track-detail-header" style="--track-color: ${track.color}">
        <span class="track-icon-large">${track.icon}</span>
        <div>
          <h3 class="track-name-large">${sanitizeText(track.name)}</h3>
          <p class="track-desc-detail">${sanitizeText(track.description)}</p>
          <div class="track-stats">
            <span>&#128337; ${track.duration}</span>
            <span>&#128218; ${modules.length} modules</span>
            <span class="difficulty-badge">${track.difficulty}</span>
          </div>
        </div>
      </div>

      <div class="modules-list">
        <h4 class="modules-title">Modules</h4>
        ${modules.map((module, index) => {
          const isCompleted = completedModules.includes(module.id);
          const isLocked = !isCompleted && module.prerequisites.some(p => !completedModules.includes(p));
          const isNext = nextModule?.id === module.id;

          return `
            <div
              class="module-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''} ${isNext ? 'next' : ''}"
              data-module="${module.id}"
              style="animation-delay: ${index * PANEL_CONFIG.animation.stagger}ms; --track-color: ${track.color}"
            >
              <div class="module-number">${index + 1}</div>
              <div class="module-info">
                <h5 class="module-name">${sanitizeText(module.name)}</h5>
                <p class="module-desc">${sanitizeText(module.description)}</p>
                <div class="module-meta">
                  <span>&#128337; ${module.duration}</span>
                  <span>&#128218; ${module.lessons} lessons</span>
                  <span>&#128295; ${module.projects} project${module.projects > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div class="module-status">
                ${isCompleted ? '<span class="status-icon completed">&#10003;</span>' : ''}
                ${isLocked ? '<span class="status-icon locked">&#128274;</span>' : ''}
                ${isNext ? '<span class="status-badge next">Next</span>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    safeInnerHTML(this.detailContent, html);
  },

  /**
   * Start a track
   * @param {string} trackId
   */
  startTrack(trackId) {
    const track = getTrack(trackId);
    if (!track) return;

    // Get next module
    const completedModules = this.progress[trackId]?.completed || [];
    const nextModule = getNextModule(trackId, completedModules);

    if (nextModule) {
      this.openModule(nextModule.id);
    } else {
      // Track completed
      BuildState.emit('formation:trackComplete', { trackId });
    }

    BuildState.emit('formation:trackStart', { trackId, track });
  },

  /**
   * Open a module
   * @param {string} moduleId
   */
  openModule(moduleId) {
    const module = MODULES[moduleId];
    if (!module) return;

    // Check if locked
    const completedModules = this.progress[module.track]?.completed || [];
    const isLocked = module.prerequisites.some(p => !completedModules.includes(p));

    if (isLocked) {
      BuildState.emit('formation:moduleLocked', { moduleId, module });
      return;
    }

    // Close panel and emit event
    this.close();

    BuildState.emit('formation:moduleOpen', {
      moduleId,
      module,
      trackId: module.track
    });

    // Navigate to deep-learn with module
    window.location.href = `/deep-learn.html?module=${encodeURIComponent(moduleId)}`;
  },

  /**
   * Mark module as complete
   * @param {string} moduleId
   */
  completeModule(moduleId) {
    const module = MODULES[moduleId];
    if (!module) return;

    const trackId = module.track;

    if (!this.progress[trackId]) {
      this.progress[trackId] = { completed: [] };
    }

    if (!this.progress[trackId].completed.includes(moduleId)) {
      this.progress[trackId].completed.push(moduleId);
      this.saveProgress();

      BuildState.emit('formation:moduleComplete', { moduleId, trackId });

      // Check if track completed
      const track = getTrack(trackId);
      const allComplete = track.modules.every(m =>
        this.progress[trackId].completed.includes(m)
      );

      if (allComplete) {
        BuildState.emit('formation:trackComplete', { trackId });
      }
    }
  },

  /**
   * Load saved progress
   */
  loadProgress() {
    try {
      const saved = localStorage.getItem(PANEL_CONFIG.storageKey);
      if (saved) {
        this.progress = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[FormationPanel] Failed to load progress:', e);
      this.progress = {};
    }
  },

  /**
   * Save progress
   */
  saveProgress() {
    try {
      localStorage.setItem(PANEL_CONFIG.storageKey, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('[FormationPanel] Failed to save progress:', e);
    }
  },

  /**
   * Get panel element
   * @returns {Element}
   */
  getPanel() {
    return this.panel;
  },

  /**
   * Check if open
   * @returns {boolean}
   */
  getIsOpen() {
    return this.isOpen;
  },

  /**
   * Dispose
   */
  dispose() {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }

    this.panel = null;
    this.backdrop = null;
    this.currentTrack = null;
    this.isOpen = false;
  }
};

// ============================================
// EXPORTS
// ============================================

export { FormationPanel };
export default FormationPanel;

// Global export
if (typeof window !== 'undefined') {
  window.FormationPanel = FormationPanel;
}
