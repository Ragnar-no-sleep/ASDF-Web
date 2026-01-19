/**
 * Build V2 - Tracks Component
 * Track selection panel (sliding left panel)
 *
 * @version 2.0.0
 */

'use strict';

import { TRACKS, EVENTS } from '../config.js';
import { BuildState } from '../state.js';
import { sanitizeText } from '../utils/security.js';
import {
  $,
  $$,
  addClass,
  removeClass,
  hasClass,
  on,
  delegate,
  setStyles,
  createElement
} from '../utils/dom.js';

// ============================================
// TRACKS STATE
// ============================================

let tracksPanel = null;
let tracksContainer = null;
let currentTrack = null;
let isPanelOpen = false;

// ============================================
// TRACK MODULES DATA
// ============================================

const TRACK_MODULES = {
  dev: [
    { name: 'Solana Fundamentals', status: 'available', xp: 100 },
    { name: 'Rust Basics', status: 'available', xp: 150 },
    { name: 'Anchor Framework', status: 'locked', xp: 200 },
    { name: 'SPL Tokens', status: 'locked', xp: 200 },
    { name: 'PDAs & CPIs', status: 'locked', xp: 250 },
    { name: 'Testing with Bankrun', status: 'locked', xp: 200 },
    { name: 'Helius Integration', status: 'locked', xp: 150 },
    { name: 'Security Best Practices', status: 'locked', xp: 300 },
    { name: 'Metaplex & NFTs', status: 'locked', xp: 250 },
    { name: 'DeFi Protocols', status: 'locked', xp: 350 },
    { name: 'Governance Programs', status: 'locked', xp: 300 },
    { name: 'Advanced Optimizations', status: 'locked', xp: 400 }
  ],
  growth: [
    { name: 'Crypto Marketing 101', status: 'available', xp: 100 },
    { name: 'Community Building', status: 'available', xp: 150 },
    { name: 'Discord Management', status: 'locked', xp: 150 },
    { name: 'Twitter Growth', status: 'locked', xp: 200 },
    { name: 'Content Strategy', status: 'locked', xp: 200 },
    { name: 'Viral Mechanics', status: 'locked', xp: 250 },
    { name: 'Partnerships', status: 'locked', xp: 250 },
    { name: 'Tokenomics Design', status: 'locked', xp: 300 },
    { name: 'Launch Strategy', status: 'locked', xp: 350 },
    { name: 'Analytics & Metrics', status: 'locked', xp: 300 }
  ],
  gaming: [
    { name: 'Game Design Basics', status: 'available', xp: 100 },
    { name: 'Canvas & WebGL', status: 'available', xp: 150 },
    { name: 'Game Loops', status: 'locked', xp: 200 },
    { name: 'Player Psychology', status: 'locked', xp: 200 },
    { name: 'Reward Systems', status: 'locked', xp: 250 },
    { name: 'Leaderboards', status: 'locked', xp: 200 },
    { name: 'Wallet Integration', status: 'locked', xp: 250 },
    { name: 'Anti-cheat Systems', status: 'locked', xp: 300 }
  ],
  content: [
    { name: 'Crypto Storytelling', status: 'available', xp: 100 },
    { name: 'Thread Writing', status: 'available', xp: 100 },
    { name: 'Video Production', status: 'locked', xp: 200 },
    { name: 'Meme Culture', status: 'locked', xp: 150 },
    { name: 'Infographics', status: 'locked', xp: 200 },
    { name: 'Community Voice', status: 'locked', xp: 200 },
    { name: 'Educational Content', status: 'locked', xp: 250 },
    { name: 'Brand Building', status: 'locked', xp: 300 },
    { name: 'Influencer Strategy', status: 'locked', xp: 350 }
  ]
};

// ============================================
// TRACKS COMPONENT
// ============================================

const TracksComponent = {
  /**
   * Initialize tracks component
   * @param {string|Element} container - Container selector or element
   */
  init(container = '#view-journey') {
    tracksContainer = typeof container === 'string' ? $(container) : container;
    if (!tracksContainer) {
      console.warn('[TracksComponent] Container not found');
      return;
    }

    // Find or create tracks panel
    tracksPanel = $('.tracks-panel', tracksContainer);
    if (!tracksPanel) {
      this.createPanel();
    }

    // Bind events
    this.bindEvents();

    // Load saved track
    if (BuildState.data.selectedTrack) {
      this.selectTrack(BuildState.data.selectedTrack, false);
    }

    console.log('[TracksComponent] Initialized');
  },

  /**
   * Create tracks panel
   */
  createPanel() {
    tracksPanel = createElement('div', {
      className: 'tracks-panel'
    });

    // Generate track buttons
    const trackButtonsHtml = Object.entries(TRACKS).map(([id, track]) => {
      return `
        <button class="journey-track" data-track="${sanitizeText(id)}">
          <span class="track-icon" style="color: ${track.color}; background: ${track.color}20">${sanitizeText(track.icon)}</span>
          <span class="track-name">${sanitizeText(track.name)}</span>
        </button>
      `;
    }).join('');

    tracksPanel.innerHTML = `
      <div class="tracks-header">
        <h3>Choose Your Path</h3>
        <button class="tracks-toggle" aria-label="Toggle tracks panel">&lsaquo;</button>
      </div>
      <div class="tracks-list">
        ${trackButtonsHtml}
      </div>
    `;

    tracksContainer.insertBefore(tracksPanel, tracksContainer.firstChild);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Track selection
    delegate(tracksContainer, 'click', '.journey-track', (e, btn) => {
      const trackId = btn.dataset.track;
      this.selectTrack(trackId);
    });

    // Panel toggle
    const toggleBtn = $('.tracks-toggle', tracksPanel);
    if (toggleBtn) {
      on(toggleBtn, 'click', () => this.togglePanel());
    }

    // Module clicks
    delegate(tracksContainer, 'click', '.module-item', (e, item) => {
      const moduleIndex = parseInt(item.dataset.moduleIndex, 10);
      this.onModuleClick(moduleIndex);
    });

    // View tree button
    delegate(tracksContainer, 'click', '[data-action="view-tree"]', () => {
      const treeBtn = $('[data-view="yggdrasil"]');
      if (treeBtn) treeBtn.click();
    });

    // Subscribe to state changes
    BuildState.subscribe(EVENTS.TRACK_SELECT, (data) => {
      this.updateDisplay(data.trackId);
    });
  },

  /**
   * Select a track
   * @param {string} trackId
   * @param {boolean} emit - Whether to emit event
   */
  selectTrack(trackId, emit = true) {
    const track = TRACKS[trackId];
    if (!track) return;

    currentTrack = trackId;

    // Update button states
    const buttons = $$('.journey-track', tracksContainer);
    buttons.forEach(btn => {
      if (btn.dataset.track === trackId) {
        addClass(btn, 'active');
      } else {
        removeClass(btn, 'active');
      }
    });

    // Update state
    if (emit) {
      BuildState.selectTrack(trackId);
    }

    // Update display
    this.updateDisplay(trackId);
  },

  /**
   * Update track display
   * @param {string} trackId
   */
  updateDisplay(trackId) {
    const track = TRACKS[trackId];
    if (!track) return;

    // Update progress card
    const trackName = $('#journey-track-name', tracksContainer);
    const trackDesc = $('#journey-track-desc', tracksContainer);
    const trackIcon = $('#journey-track-icon', tracksContainer);

    if (trackName) trackName.textContent = track.name;
    if (trackDesc) trackDesc.textContent = track.desc;
    if (trackIcon) {
      trackIcon.textContent = track.icon;
      setStyles(trackIcon, {
        color: track.color,
        background: `${track.color}20`
      });
    }

    // Update modules count
    const modules = TRACK_MODULES[trackId] || [];
    const statValues = $$('.journey-stat-value', tracksContainer);
    if (statValues[1]) {
      statValues[1].textContent = `0/${modules.length}`;
    }

    // Render modules list
    this.renderModules(trackId);
  },

  /**
   * Render modules list for a track
   * @param {string} trackId
   */
  renderModules(trackId) {
    const modules = TRACK_MODULES[trackId] || [];
    const modulesContainer = $('.journey-modules', tracksContainer) ||
                            this.createModulesContainer();

    const modulesHtml = modules.map((module, i) => {
      const statusIcon = module.status === 'available' ? '\u2705' :
                        module.status === 'completed' ? '\u2713' : '\uD83D\uDD12';
      const statusClass = module.status;

      return `
        <div class="module-item ${statusClass}" data-module-index="${i}">
          <span class="module-status">${statusIcon}</span>
          <span class="module-name">${sanitizeText(module.name)}</span>
          <span class="module-xp">${module.xp} XP</span>
        </div>
      `;
    }).join('');

    modulesContainer.innerHTML = `
      <h4>Modules</h4>
      <div class="modules-list">
        ${modulesHtml}
      </div>
    `;
  },

  /**
   * Create modules container
   */
  createModulesContainer() {
    const container = createElement('div', {
      className: 'journey-modules'
    });

    const progressCard = $('.journey-progress', tracksContainer);
    if (progressCard) {
      progressCard.parentNode.insertBefore(container, progressCard.nextSibling);
    } else {
      tracksContainer.appendChild(container);
    }

    return container;
  },

  /**
   * Handle module click
   * @param {number} moduleIndex
   */
  onModuleClick(moduleIndex) {
    if (!currentTrack) return;

    const modules = TRACK_MODULES[currentTrack];
    const module = modules[moduleIndex];

    if (!module) return;

    if (module.status === 'locked') {
      // Show locked message
      console.log('[TracksComponent] Module locked:', module.name);
      return;
    }

    // Emit module click event
    BuildState.emit('track:module:click', {
      trackId: currentTrack,
      moduleIndex,
      module
    });

    // TODO: Navigate to module content
    console.log('[TracksComponent] Module clicked:', module.name);
  },

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    isPanelOpen = !isPanelOpen;

    if (isPanelOpen) {
      addClass(tracksPanel, 'open');
    } else {
      removeClass(tracksPanel, 'open');
    }

    // Update toggle button
    const toggleBtn = $('.tracks-toggle', tracksPanel);
    if (toggleBtn) {
      toggleBtn.innerHTML = isPanelOpen ? '&rsaquo;' : '&lsaquo;';
    }
  },

  /**
   * Open panel
   */
  openPanel() {
    if (!isPanelOpen) {
      this.togglePanel();
    }
  },

  /**
   * Close panel
   */
  closePanel() {
    if (isPanelOpen) {
      this.togglePanel();
    }
  },

  /**
   * Get current track
   * @returns {string|null}
   */
  getCurrentTrack() {
    return currentTrack;
  },

  /**
   * Get track modules
   * @param {string} trackId
   * @returns {Object[]}
   */
  getTrackModules(trackId) {
    return TRACK_MODULES[trackId] || [];
  },

  /**
   * Mark module as completed
   * @param {string} trackId
   * @param {number} moduleIndex
   */
  completeModule(trackId, moduleIndex) {
    const modules = TRACK_MODULES[trackId];
    if (!modules || !modules[moduleIndex]) return;

    modules[moduleIndex].status = 'completed';

    // Unlock next module if available
    if (modules[moduleIndex + 1] && modules[moduleIndex + 1].status === 'locked') {
      modules[moduleIndex + 1].status = 'available';
    }

    // Re-render if this is current track
    if (trackId === currentTrack) {
      this.renderModules(trackId);
    }

    // Emit event
    BuildState.emit('track:module:complete', {
      trackId,
      moduleIndex,
      module: modules[moduleIndex]
    });
  },

  /**
   * Get track progress
   * @param {string} trackId
   * @returns {Object} { completed, total, percent }
   */
  getTrackProgress(trackId) {
    const modules = TRACK_MODULES[trackId] || [];
    const completed = modules.filter(m => m.status === 'completed').length;
    const total = modules.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percent };
  }
};

// Export for ES modules
export { TracksComponent };
export default TracksComponent;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.TracksComponent = TracksComponent;
}
