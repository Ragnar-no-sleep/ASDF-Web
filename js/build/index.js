/**
 * Build V2 - Main Orchestrator
 * Entry point for the modular Build page
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// IMPORTS
// ============================================

import { DEFAULTS, EVENTS, SELECTORS } from './config.js';
import { BuildState } from './state.js';
import { DataAdapter } from './data/adapter.js';
import { ModalFactory } from './components/modal.js';
import { TreeComponent } from './components/tree.js';
import { IntroComponent } from './components/intro.js';
import { QuizComponent } from './components/quiz.js';
import { TracksComponent } from './components/tracks.js';
import { ProjectPanelComponent } from './components/project-panel.js';
import { FactoryPanelComponent } from './components/factory-panel.js';
import { EventHandlers } from './handlers.js';
import {
  escapeHtml,
  sanitizeHtml,
  safeInnerHTML,
  safeTextContent
} from './utils/security.js';
import { $, $$, on, delegate } from './utils/dom.js';

// ============================================
// BUILD V2 APPLICATION
// ============================================

const BuildApp = {
  /**
   * Application version
   */
  version: '2.0.0',

  /**
   * Initialization status
   */
  initialized: false,

  /**
   * Component references
   */
  components: {
    state: BuildState,
    data: DataAdapter,
    modal: ModalFactory,
    tree: TreeComponent,
    intro: IntroComponent,
    quiz: QuizComponent,
    tracks: TracksComponent,
    projectPanel: ProjectPanelComponent,
    factoryPanel: FactoryPanelComponent,
    handlers: EventHandlers
  },

  /**
   * Initialize the application
   * @param {Object} options - Configuration options
   */
  async init(options = {}) {
    if (this.initialized) {
      console.warn('[BuildApp] Already initialized');
      return;
    }

    console.log('[BuildApp] Initializing v' + this.version);

    try {
      // 1. Initialize state management
      BuildState.init();

      // 2. Pre-load data
      await DataAdapter.getProjects();
      console.log('[BuildApp] Data loaded');

      // 3. Initialize modal factory
      ModalFactory.init();

      // 4. Initialize tree component
      TreeComponent.init('.tree-container');

      // 5. Initialize quiz component
      QuizComponent.init('#view-path');

      // 6. Initialize tracks component
      TracksComponent.init('#view-journey');

      // 7. Initialize project panel (slide-left)
      ProjectPanelComponent.init();

      // 8. Initialize factory panel (slide-right, triggered by quiz)
      FactoryPanelComponent.init();

      // 9. Initialize event handlers
      EventHandlers.init();

      // 10. Show intro if first visit (or skip if option set)
      if (!options.skipIntro) {
        IntroComponent.init('#intro-container');
      }

      // 11. Set up global listeners
      this.setupGlobalListeners();

      // 12. Mark as initialized
      this.initialized = true;

      // Emit ready event
      BuildState.emit('app:ready', { version: this.version });

      console.log('[BuildApp] Initialization complete');
    } catch (error) {
      console.error('[BuildApp] Initialization failed:', error);
      throw error;
    }
  },

  /**
   * Set up global event listeners
   */
  setupGlobalListeners() {
    // Legacy realm clicks (for backwards compatibility)
    delegate(document, 'click', '.realm, .core-realm', (e, elem) => {
      const projectId = elem.dataset.project || 'burn-engine';
      this.openProject(projectId);
    });

    // Tree node clicks
    delegate(document, 'click', '.tree-node', (e, node) => {
      const projectId = node.dataset.project;
      if (projectId) {
        this.openProject(projectId);
      }
    });

    // Tree heart click
    const treeHeart = $('.tree-heart');
    if (treeHeart) {
      on(treeHeart, 'click', () => {
        this.openProject('burn-engine');
      });
    }

    // View tree buttons (from quiz/journey)
    delegate(document, 'click', '[data-action="view-tree"]', () => {
      const yggdrasilBtn = $('[data-view="yggdrasil"]');
      if (yggdrasilBtn) yggdrasilBtn.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Deep modal buttons
    delegate(document, 'click', '[data-action="deep-learn"]', (e, btn) => {
      const projectId = btn.dataset.project;
      if (projectId) {
        this.openDeepLearn(projectId);
      }
    });

    // External link tracking
    delegate(document, 'click', 'a[target="_blank"]', (e, link) => {
      // Track external link clicks
      BuildState.emit('external:link', { url: link.href });
    });

    // Project panel open event (from factory panel recommendations)
    BuildState.subscribe('project:open', (data) => {
      if (data.projectId) {
        ProjectPanelComponent.open(data.projectId);
      }
    });

    // Window resize handling
    let resizeTimeout;
    on(window, 'resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        BuildState.emit('window:resize', {
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 150);
    });

    // Visibility change
    on(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        BuildState.emit('app:visible', {});
      } else {
        BuildState.emit('app:hidden', {});
      }
    });
  },

  /**
   * Open a project (either immersive or doc modal based on status)
   * @param {string} projectId
   */
  async openProject(projectId) {
    const project = await DataAdapter.getProject(projectId);
    if (!project) {
      console.warn('[BuildApp] Project not found:', projectId);
      return;
    }

    // Use immersive modal for main projects
    if (project.status === 'live' || project.status === 'building') {
      ModalFactory.openProjectImmersive(projectId);
    } else {
      ModalFactory.openDoc(projectId);
    }
  },

  /**
   * Open deep learn modal for a project
   * @param {string} projectId
   */
  openDeepLearn(projectId) {
    // Navigate to deep-learn page or open code learning modal
    window.location.href = `/deep-learn.html?project=${encodeURIComponent(projectId)}`;
  },

  /**
   * Switch to a specific view
   * @param {string} view - 'yggdrasil', 'marketplace', 'path', 'journey'
   */
  switchView(view) {
    EventHandlers.process('view:switch', { view });
  },

  /**
   * Filter tree by status
   * @param {string} status - 'all', 'live', 'building', 'planned'
   */
  filterByStatus(status) {
    EventHandlers.process('filter:status', { status });
  },

  /**
   * Get application state
   * @returns {Object}
   */
  getState() {
    return {
      version: this.version,
      initialized: this.initialized,
      currentState: BuildState.currentState,
      selectedProject: BuildState.data.selectedProject,
      selectedTrack: BuildState.data.selectedTrack,
      introCompleted: BuildState.data.introCompleted
    };
  },

  /**
   * Reset application state
   */
  reset() {
    BuildState.reset();
    ModalFactory.closeAll();
    IntroComponent.reset();
    QuizComponent.reset();
    console.log('[BuildApp] State reset');
  },

  /**
   * Expose utilities for external use
   */
  utils: {
    escapeHtml,
    sanitizeHtml,
    safeInnerHTML,
    safeTextContent
  }
};

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    BuildApp.init();
  });
} else {
  // DOM already loaded
  BuildApp.init();
}

// ============================================
// EXPORTS
// ============================================

// Export for ES modules
export { BuildApp };
export default BuildApp;

// Global export for browser
if (typeof window !== 'undefined') {
  window.BuildApp = BuildApp;

  // Also expose components globally for debugging
  window.Build = {
    App: BuildApp,
    State: BuildState,
    Data: DataAdapter,
    Modal: ModalFactory,
    Tree: TreeComponent,
    Intro: IntroComponent,
    Quiz: QuizComponent,
    Tracks: TracksComponent,
    ProjectPanel: ProjectPanelComponent,
    FactoryPanel: FactoryPanelComponent,
    Handlers: EventHandlers
  };
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

/**
 * Legacy function exports for backwards compatibility
 * These will be gradually deprecated
 */
if (typeof window !== 'undefined') {
  // Legacy openDocModal
  window.openDocModal = (projectId) => {
    console.warn('[Legacy] openDocModal is deprecated, use BuildApp.openProject()');
    ModalFactory.openDoc(projectId);
  };

  // Legacy openFeatureModal
  window.openFeatureModal = (projectId, featureIndex) => {
    console.warn('[Legacy] openFeatureModal is deprecated, use ModalFactory.openFeature()');
    ModalFactory.openFeature(projectId, featureIndex);
  };

  // Legacy openComponentModal
  window.openComponentModal = (projectId, componentIndex) => {
    console.warn('[Legacy] openComponentModal is deprecated, use ModalFactory.openComponent()');
    ModalFactory.openComponent(projectId, componentIndex);
  };

  // Legacy projectsData access
  Object.defineProperty(window, 'projectsData', {
    get() {
      console.warn('[Legacy] projectsData is deprecated, use DataAdapter.getProjects()');
      return DataAdapter.getProjects();
    }
  });
}
