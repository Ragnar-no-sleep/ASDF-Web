/**
 * Yggdrasil Builder's Cosmos - Main Orchestrator
 * Entry point for the dashboard
 */

'use strict';

import { CONFIG, VIEWS, TRACKS, ECOSYSTEM_PROJECTS, SKILLS } from './config.js';
import { Yggdrasil } from './tree/yggdrasil.js';
import { Tooltip } from './ui/tooltip.js';
import { Panel } from './ui/panel.js';
import { FormationPanel } from './ui/formation-panel.js';
import { ErrorBoundary, ErrorType } from './ui/error-boundary.js';
import { Onboarding } from './ui/onboarding.js';

/**
 * Dashboard Application
 */
const Dashboard = {
  // Components
  cosmos: null,
  tooltip: null,
  panel: null,
  formationPanel: null,
  onboarding: null,

  // State
  initialized: false,
  container: null,
  currentProject: null,

  // Mouse tracking
  lastMouseX: 0,
  lastMouseY: 0,

  // Event handler references (for cleanup)
  _handlers: {
    mousemove: null,
    keydown: null,
  },

  /**
   * Initialize dashboard
   */
  async init(containerSelector) {
    this.container =
      typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!this.container) {
      throw new Error('[Dashboard] Container not found');
    }

    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    // Initialize error boundary first
    const webglSupported = ErrorBoundary.init(this.container, {
      onError: () => {},
    });

    if (!webglSupported) {
      throw new Error('WebGL not supported');
    }

    try {
      // Initialize UI
      this.tooltip = Tooltip.init();
      this.panel = Panel.init(this.container);
      this.formationPanel = FormationPanel.init(this.container);
      this.onboarding = Onboarding.init(this.container, {
        onComplete: () => {},
      });

      // Initialize cosmos with error wrapping
      this.cosmos = Yggdrasil;
      await ErrorBoundary.wrap(
        () => this.cosmos.init(this.container),
        ErrorType.INITIALIZATION_FAILED
      );

      // Wire events
      this.setupCallbacks();
      this.setupKeyboard();

      // Track mouse (store handler for cleanup)
      this._handlers.mousemove = e => {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.tooltip.updatePosition(e.clientX, e.clientY);
      };
      this.container.addEventListener('mousemove', this._handlers.mousemove);

      this.initialized = true;

      // Show onboarding for first-time users
      this.onboarding.showIfFirstTime();

      // Emit ready event
      window.dispatchEvent(
        new CustomEvent('cosmos:ready', {
          detail: { dashboard: this },
        })
      );

      return this;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Setup event callbacks
   */
  setupCallbacks() {
    // Island hover -> tooltip (only in COSMOS view, not when panel is open)
    this.cosmos.on('islandHover', project => {
      // Don't show tooltip if panel is open or in project view
      if (this.panel.isOpen || this.cosmos.getCurrentView() !== VIEWS.COSMOS) {
        this.tooltip.hide();
        return;
      }

      if (project) {
        const track = TRACKS[project.track];
        this.tooltip.show(
          {
            name: project.name,
            type: 'project',
            track: track?.name || project.track,
            trackColor: track?.color,
            status: project.status,
            description: project.description,
            kScore: project.kScore,
          },
          this.lastMouseX,
          this.lastMouseY
        );
      } else {
        this.tooltip.hide();
      }
    });

    // Island click -> panel + zoom
    this.cosmos.on('islandClick', project => {
      // Hide tooltip immediately on click (prevents tooltip persisting during zoom)
      this.tooltip.hide();

      this.currentProject = project;
      this.panel.open({
        ...project,
        track: TRACKS[project.track],
      });

      // Update UI
      this.updateViewIndicator('project');
    });

    // Burn core click -> burns page or panel
    this.cosmos.on('burnCoreClick', () => {
      // Could open burns panel or navigate
      window.open('/burns.html', '_blank');
    });

    // Skill hover -> tooltip
    this.cosmos.on('skillHover', skill => {
      if (skill) {
        const track = TRACKS[skill.track];
        this.tooltip.show(
          {
            name: skill.name,
            type: 'skill',
            track: track?.name || skill.track,
            trackColor: track?.color,
            status: `Difficulty ${skill.difficulty}`,
            description: `${skill.icon} ${skill.name}`,
          },
          this.lastMouseX,
          this.lastMouseY
        );
      } else {
        this.tooltip.hide();
      }
    });

    // Skill click -> open FormationPanel
    this.cosmos.on('skillClick', (skill, project) => {
      this.formationPanel.open({
        trackId: skill.track,
        skillId: skill.id,
        skillName: skill.name,
      });
    });
  },

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboard() {
    this._handlers.keydown = e => {
      // Escape - go back
      if (e.key === 'Escape') {
        if (this.panel.isOpen) {
          this.panel.close();
        } else {
          this.goBack();
        }
      }

      // Home - return to cosmos
      if (e.key === 'Home') {
        this.goHome();
      }

      // Backspace - go back (when not in input)
      if (e.key === 'Backspace' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.goBack();
      }
    };
    window.addEventListener('keydown', this._handlers.keydown);
  },

  /**
   * Update view indicator
   */
  updateViewIndicator(view) {
    const indicator = document.getElementById('viewIndicator');
    if (indicator) {
      indicator.textContent = view;
      indicator.className = `view-indicator view-${view}`;
    }
  },

  /**
   * Go back one level
   */
  goBack() {
    const currentView = this.cosmos.getCurrentView();

    // Hide skills if leaving project view
    if (currentView === VIEWS.PROJECT_TREE) {
      this.cosmos.skillNodes.hide();
      this.panel.close();
      this.currentProject = null;
    }

    this.cosmos.cameraController.goBack();
    this.updateViewIndicator(this.cosmos.getCurrentView());
  },

  /**
   * Go home
   */
  goHome() {
    this.cosmos.goHome();
    this.panel.close();
    this.currentProject = null;
    this.updateViewIndicator('cosmos');
  },

  /**
   * Get ecosystem projects
   */
  getProjects() {
    return ECOSYSTEM_PROJECTS;
  },

  /**
   * Get tracks
   */
  getTracks() {
    return TRACKS;
  },

  /**
   * Reset onboarding (for testing)
   */
  resetOnboarding() {
    this.onboarding?.reset();
  },

  /**
   * Show onboarding manually
   */
  showOnboarding() {
    this.onboarding?.show();
  },

  /**
   * Dispose
   */
  dispose() {
    // Remove event listeners
    if (this.container && this._handlers.mousemove) {
      this.container.removeEventListener('mousemove', this._handlers.mousemove);
    }
    if (this._handlers.keydown) {
      window.removeEventListener('keydown', this._handlers.keydown);
    }

    // Clear handler references
    this._handlers = { mousemove: null, keydown: null };

    // Dispose components
    this.cosmos?.dispose();
    this.tooltip?.dispose();
    this.panel?.dispose();
    this.formationPanel?.dispose();
    this.onboarding?.dispose();

    // Clear state
    this.container = null;
    this.currentProject = null;
    this.initialized = false;
  },
};

// Exports
export { Dashboard, CONFIG, VIEWS, TRACKS, ECOSYSTEM_PROJECTS, SKILLS };
export default Dashboard;

// Global
if (typeof window !== 'undefined') {
  window.YggdrasilDashboard = Dashboard;
}
