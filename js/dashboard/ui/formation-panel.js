/**
 * Yggdrasil Dashboard - Formation Panel
 * Left slide panel for learning tracks (Fire & Ice theme)
 * Ported and simplified from js/build/components/formation-panel.js
 */

'use strict';

import {
  FORMATION_TRACKS,
  FORMATION_MODULES,
  getFormationTrack,
  getTrackModules,
  calculateTrackProgress,
  getNextModule
} from '../data/formations.js';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  storageKey: 'asdf_formation_progress',
  animation: {
    slideDuration: 400,
    stagger: 50
  }
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
    onClose: null
  },

  /**
   * Initialize
   */
  init(container) {
    const parent = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!parent) {
      console.warn('[FormationPanel] Container not found');
      return this;
    }

    this.loadProgress();
    this.createPanel(parent);
    this.createStyles();
    this.bindEvents();

    console.log('[FormationPanel] Initialized');
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
   * Create styles
   */
  createStyles() {
    if (document.getElementById('formation-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'formation-panel-styles';
    style.textContent = `
      .formation-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        z-index: 200;
      }

      .formation-backdrop.open {
        opacity: 1;
        visibility: visible;
      }

      .formation-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 400px;
        max-width: 90vw;
        height: 100%;
        background: linear-gradient(180deg, rgba(10, 15, 30, 0.98), rgba(5, 10, 20, 0.98));
        border-right: 1px solid rgba(255, 100, 50, 0.2);
        transform: translateX(-100%);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 201;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .formation-panel.open {
        transform: translateX(0);
      }

      .formation-panel-inner {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .formation-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(90deg, rgba(255, 68, 68, 0.1), transparent);
      }

      .formation-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #fff;
      }

      .formation-icon {
        font-size: 24px;
      }

      .formation-close {
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .formation-close:hover {
        background: rgba(255, 100, 100, 0.2);
        color: #ff6666;
      }

      .formation-tracks {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .track-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-left: 4px solid var(--track-color, #ff4444);
      }

      .track-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(4px);
      }

      .track-card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .track-icon {
        font-size: 28px;
        width: 44px;
        height: 44px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .track-info {
        flex: 1;
      }

      .track-name {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
      }

      .track-desc {
        margin: 0;
        font-size: 13px;
        color: #888;
        line-height: 1.4;
      }

      .track-meta {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
        font-size: 12px;
        color: #666;
      }

      .track-progress {
        margin-bottom: 12px;
      }

      .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 6px;
      }

      .progress-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .progress-label {
        font-size: 11px;
        color: #666;
      }

      .track-start-btn {
        width: 100%;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .track-start-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-2px);
      }

      /* Detail View */
      .formation-detail {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .formation-back {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #888;
        font-size: 14px;
        cursor: pointer;
        margin-bottom: 16px;
        transition: all 0.2s ease;
      }

      .formation-back:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .track-detail-header {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 20px;
        border-left: 4px solid var(--track-color, #ff4444);
      }

      .track-icon-large {
        font-size: 48px;
        margin-bottom: 12px;
        display: block;
      }

      .track-name-large {
        margin: 0 0 8px;
        font-size: 20px;
        color: #fff;
      }

      .track-desc-detail {
        margin: 0 0 12px;
        font-size: 14px;
        color: #888;
        line-height: 1.5;
      }

      .track-stats {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #666;
      }

      .modules-title {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #666;
        margin: 0 0 12px;
      }

      .module-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        animation: slideIn 0.3s ease forwards;
        opacity: 0;
      }

      @keyframes slideIn {
        to { opacity: 1; transform: translateX(0); }
        from { opacity: 0; transform: translateX(-10px); }
      }

      .module-card:hover:not(.locked) {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--track-color, #ff4444);
      }

      .module-card.locked {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .module-card.completed {
        border-color: rgba(0, 255, 136, 0.3);
        background: rgba(0, 255, 136, 0.05);
      }

      .module-card.next {
        border-color: var(--track-color, #ff4444);
        box-shadow: 0 0 20px rgba(255, 68, 68, 0.1);
      }

      .module-number {
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: #888;
        flex-shrink: 0;
      }

      .module-info {
        flex: 1;
        min-width: 0;
      }

      .module-name {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 500;
        color: #fff;
      }

      .module-desc {
        margin: 0 0 8px;
        font-size: 12px;
        color: #666;
        line-height: 1.4;
      }

      .module-meta {
        display: flex;
        gap: 10px;
        font-size: 11px;
        color: #555;
      }

      .module-status {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .status-icon {
        font-size: 16px;
      }

      .status-icon.completed { color: #00ff88; }
      .status-icon.locked { color: #666; }

      .status-badge {
        padding: 4px 8px;
        background: rgba(255, 68, 68, 0.2);
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        color: #ff6644;
      }
    `;
    document.head.appendChild(style);
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
    this.tracksContainer.addEventListener('click', (e) => {
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
    this.detailContent.addEventListener('click', (e) => {
      const card = e.target.closest('.module-card');
      if (card && !card.classList.contains('locked')) {
        this.openModule(card.dataset.module);
      }
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
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
      ${modules.map((module, index) => {
        const isCompleted = completedModules.includes(module.id);
        const isLocked = !isCompleted && module.prerequisites.some(p => !completedModules.includes(p));
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
      }).join('')}
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
      console.log('[FormationPanel] Module locked:', moduleId);
      return;
    }

    this.close();

    if (this.callbacks.onModuleOpen) {
      this.callbacks.onModuleOpen(module);
    }

    console.log('[FormationPanel] Opening module:', module.name);
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
      console.warn('[FormationPanel] Failed to save progress');
    }
  },

  /**
   * Dispose
   */
  dispose() {
    this.panel?.remove();
    this.backdrop?.remove();
  }
};

export default FormationPanel;
