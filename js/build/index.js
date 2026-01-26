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
import { FormationPanel } from './components/formation-panel.js';
import { BuilderProfile } from './components/builder-profile.js';
import { SkillTreeView } from './components/skill-tree-view.js';
import { GitHubTimeline } from './components/github-timeline.js';
import { FeatureTooltip } from './components/feature-tooltip.js';
import { OnboardingProgress } from './components/onboarding-progress.js';
import { StreakCounter } from './components/streak-counter.js';
import { XPFlyup } from './components/xp-flyup.js';
import { ShareButton } from './components/share-button.js';
import { RendererFactory } from './renderer/index.js';
import { Animations } from './renderer/animations.js';
import { EventHandlers } from './handlers.js';
import { escapeHtml, sanitizeHtml, safeInnerHTML, safeTextContent } from './utils/security.js';
import { $, $$, on, delegate } from './utils/dom.js';
import { DURATION, DELAY } from './config/timing.js';

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
    formationPanel: FormationPanel,
    builderProfile: BuilderProfile,
    skillTreeView: SkillTreeView,
    githubTimeline: GitHubTimeline,
    featureTooltip: FeatureTooltip,
    onboardingProgress: OnboardingProgress,
    streakCounter: StreakCounter,
    xpFlyup: XPFlyup,
    shareButton: ShareButton,
    renderer: RendererFactory,
    animations: Animations,
    handlers: EventHandlers,
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
    const loadingEl = $('#app-loading');

    try {
      // 1. Initialize state management
      BuildState.init();

      // 2. Pre-load data
      this._updateLoadingText(loadingEl, 'Loading project data...');
      await DataAdapter.getProjects();
      console.log('[BuildApp] Data loaded');

      // 3. Initialize modal factory
      ModalFactory.init();

      // 4. Initialize tree component
      TreeComponent.init('.tree-container');

      // 4b. Initialize animations module
      await Animations.init();

      // 4c. Initialize renderer (progressive enhancement)
      const treeContainer = $('.tree-container');
      console.log(
        '[BuildApp] Tree container found:',
        !!treeContainer,
        'enableRenderer:',
        options.enableRenderer
      );
      if (treeContainer && options.enableRenderer !== false) {
        try {
          this._updateLoadingText(loadingEl, 'Rendering Yggdrasil cosmos...');
          await RendererFactory.init(treeContainer, {
            mobileThree: options.mobileThree || false,
          });
        } catch (err) {
          console.error('[BuildApp] RendererFactory.init failed:', err);
        }
      } else {
        console.warn(
          '[BuildApp] Skipping renderer init - container:',
          !!treeContainer,
          'enabled:',
          options.enableRenderer
        );
      }

      // 5. Initialize quiz component
      QuizComponent.init('#view-path');

      // 6. Initialize tracks component
      TracksComponent.init('#view-journey');

      // 7. Initialize project panel (slide-left)
      ProjectPanelComponent.init();

      // 8. Initialize factory panel (slide-right, triggered by quiz)
      FactoryPanelComponent.init();

      // 9. Initialize Yggdrasil 3D components
      FormationPanel.init(SELECTORS.FORMATION_PANEL_ROOT);
      BuilderProfile.init(SELECTORS.BUILDER_PROFILE_ROOT);
      console.log('[BuildApp] Formation panel and builder profile initialized');

      // 10. Initialize event handlers
      EventHandlers.init();

      // 11. Initialize FTUE and Habit Loop components
      FeatureTooltip.init();
      OnboardingProgress.init();
      StreakCounter.init();
      XPFlyup.init();
      ShareButton.init();

      // 12. Show intro if first visit (or skip if option set)
      if (!options.skipIntro) {
        IntroComponent.init('#intro-container');
      }

      // 14. Set up global listeners
      this.setupGlobalListeners();

      // 15. Mark as initialized
      this.initialized = true;

      // Emit ready event
      BuildState.emit('app:ready', { version: this.version });

      // Hide loading overlay with fade
      this._hideLoading(loadingEl);

      console.log('[BuildApp] Initialization complete');
    } catch (error) {
      console.error('[BuildApp] Initialization failed:', error);
      this._showLoadingError(loadingEl, error);
      throw error;
    }
  },

  /**
   * Update loading text
   * @param {HTMLElement} el - Loading overlay element
   * @param {string} text - New text to display
   * @private
   */
  _updateLoadingText(el, text) {
    if (!el) return;
    const textEl = el.querySelector('.loading-text');
    if (textEl) {
      safeTextContent(textEl, text);
    }
  },

  /**
   * Hide loading overlay with animation
   * @param {HTMLElement} el - Loading overlay element
   * @private
   */
  _hideLoading(el) {
    if (!el) return;
    el.style.transition = `opacity ${DURATION.NORMAL}ms ease`;
    el.style.opacity = '0';
    el.setAttribute('aria-busy', 'false');
    setTimeout(() => {
      el.style.display = 'none';
    }, DURATION.NORMAL);
  },

  /**
   * Show error state in loading overlay
   * @param {HTMLElement} el - Loading overlay element
   * @param {Error} error - The error that occurred
   * @private
   */
  _showLoadingError(el, error) {
    if (!el) return;
    el.setAttribute('aria-busy', 'false');
    safeInnerHTML(
      el,
      `<div class="error-state">
        <div class="error-icon">&#9888;</div>
        <p class="error-title">Failed to load Yggdrasil</p>
        <p class="error-message">${escapeHtml(error.message || 'Unknown error')}</p>
        <button class="btn-retry" onclick="location.reload()">
          <span>&#8635;</span> Retry
        </button>
      </div>`
    );
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
    BuildState.subscribe('project:open', data => {
      if (data.projectId) {
        ProjectPanelComponent.open(data.projectId);
      }
    });

    // Renderer node click event (Three.js raycaster clicks)
    BuildState.subscribe('renderer:nodeClick', data => {
      if (data.projectId) {
        // Open project panel for renderer clicks
        ProjectPanelComponent.open(data.projectId);
      }
    });

    // Renderer ready event - sync initial state
    BuildState.subscribe('renderer:ready', data => {
      console.log(`[BuildApp] Renderer ready: ${data.type}`);
      // Sync current filter if any
      if (TreeComponent.getCurrentFilter() !== 'all') {
        RendererFactory.getRenderer()?.update({
          filter: TreeComponent.getCurrentFilter(),
        });
      }
    });

    // Renderer view changed event - manage back button
    BuildState.subscribe('renderer:viewChanged', data => {
      const { level, projectId } = data;
      this.updateBackButton(level !== 'COSMOS');

      if (level === 'PROJECT_TREE' && projectId) {
        // Optionally open project panel
        ProjectPanelComponent.open(projectId);
      }
    });

    // Renderer skill click event - open formation for skill
    BuildState.subscribe('renderer:skillClick', data => {
      const { skillId, skill } = data;
      console.log(`[BuildApp] Skill clicked: ${skillId}`, skill);
      // TODO: Open formation panel for skill
    });

    // Project focus event - show skill tree and timeline
    BuildState.subscribe(EVENTS.PROJECT_FOCUS, data => {
      if (data.projectId) {
        SkillTreeView.showForProject(data.projectId);
        GitHubTimeline.loadForProject(data.projectId);
      }
    });

    // Project blur event - hide skill tree
    BuildState.subscribe(EVENTS.PROJECT_BLUR, () => {
      SkillTreeView.clear();
    });

    // Formation panel open trigger
    delegate(document, 'click', '[data-action="open-formation"]', (e, btn) => {
      const trackId = btn.dataset.track;
      FormationPanel.open(trackId);
    });

    // Quiz complete - recommend formation track
    BuildState.subscribe(EVENTS.QUIZ_COMPLETE, data => {
      if (data.recommendedTrack) {
        FormationPanel.open(data.recommendedTrack);
      }
    });

    // Window resize handling
    let resizeTimeout;
    on(window, 'resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        BuildState.emit('window:resize', {
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, DELAY.DEBOUNCE);
    });

    // Visibility change
    on(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        BuildState.emit('app:visible', {});
      } else {
        BuildState.emit('app:hidden', {});
      }
    });

    // Keyboard shortcuts
    on(document, 'keydown', e => {
      // Ctrl/Cmd + Shift + R = Switch renderer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.toggleRenderer();
      }
      // Ctrl/Cmd + Shift + D = Toggle debug info
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugOverlay();
      }
    });
  },

  /**
   * Toggle between renderers
   */
  async toggleRenderer() {
    const currentType = RendererFactory.getType();
    const newType = currentType === 'three' ? 'svg' : 'three';

    const container = $('.tree-container');
    if (!container) return;

    console.log(`[BuildApp] Switching renderer: ${currentType} -> ${newType}`);

    try {
      await RendererFactory.switchRenderer(newType, container);
    } catch (error) {
      console.warn('[BuildApp] Renderer switch failed:', error);
    }
  },

  /**
   * Toggle debug overlay showing renderer info
   */
  toggleDebugOverlay() {
    const container = $('.tree-container');
    if (!container) return;

    let overlay = $('.renderer-info', container);

    if (overlay) {
      overlay.remove();
    } else {
      overlay = document.createElement('div');
      overlay.className = `renderer-info ${RendererFactory.getType() || 'svg'}`;
      overlay.textContent = `${RendererFactory.getType()?.toUpperCase() || 'SVG'} | ${
        RendererFactory.getCapabilities()?.webgl ? 'WebGL' : 'No WebGL'
      }`;
      container.style.position = 'relative';
      container.appendChild(overlay);
    }
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
      introCompleted: BuildState.data.introCompleted,
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
   * Back button reference
   */
  _backButton: null,

  /**
   * Update back button visibility
   * @param {boolean} show - Whether to show the back button
   */
  updateBackButton(show) {
    // Create back button if doesn't exist
    if (!this._backButton) {
      this._backButton = document.createElement('button');
      this._backButton.className = 'cosmos-back-btn';
      this._backButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        <span>Back to Cosmos</span>
      `;
      this._backButton.setAttribute('aria-label', 'Back to Cosmos view');

      // Style the button
      Object.assign(this._backButton.style, {
        position: 'fixed',
        top: '100px',
        left: '20px',
        zIndex: '1000',
        padding: '10px 16px',
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'none',
        alignItems: 'center',
        gap: '8px',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
      });

      // Hover effect
      this._backButton.addEventListener('mouseenter', () => {
        this._backButton.style.background = 'rgba(0, 217, 255, 0.3)';
        this._backButton.style.borderColor = 'rgba(0, 217, 255, 0.5)';
      });
      this._backButton.addEventListener('mouseleave', () => {
        this._backButton.style.background = 'rgba(0, 0, 0, 0.7)';
        this._backButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      });

      // Click handler
      this._backButton.addEventListener('click', () => {
        const renderer = RendererFactory.getRenderer();
        if (renderer && renderer.goBackToCosmos) {
          renderer.goBackToCosmos();
        }
      });

      document.body.appendChild(this._backButton);
    }

    // Show/hide button
    this._backButton.style.display = show ? 'flex' : 'none';
  },

  /**
   * Expose utilities for external use
   */
  utils: {
    escapeHtml,
    sanitizeHtml,
    safeInnerHTML,
    safeTextContent,
  },
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
    FormationPanel: FormationPanel,
    BuilderProfile: BuilderProfile,
    SkillTreeView: SkillTreeView,
    GitHubTimeline: GitHubTimeline,
    Renderer: RendererFactory,
    Animations: Animations,
    Handlers: EventHandlers,
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
  window.openDocModal = projectId => {
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
    },
  });
}
