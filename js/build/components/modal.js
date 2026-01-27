/**
 * Build V2 - Modal Factory
 * Factory Pattern for unified modal management
 *
 * @version 2.0.0
 */

'use strict';

import { MODAL_TYPES, EVENTS, SELECTORS } from '../config.js';
import { BuildState } from '../state.js';
import { DataAdapter } from '../data/adapter.js';
import {
  safeInnerHTML,
  safeTextContent,
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
} from '../utils/security.js';
import {
  $,
  $$,
  byId,
  addClass,
  removeClass,
  show,
  hide,
  on,
  once,
  createElement,
} from '../utils/dom.js';

// ============================================
// MODAL STATE
// ============================================

/**
 * Active modals stack (for nested modals)
 */
const modalStack = [];

/**
 * Registered modal configurations
 */
const modalConfigs = new Map();

// ============================================
// MODAL TEMPLATES
// ============================================

/**
 * Generate doc modal content
 * @param {Object} project - Project data
 * @returns {string} HTML content
 */
function generateDocModalContent(project) {
  const icon = sanitizeText(project.icon);
  const title = sanitizeText(project.title);
  const status = sanitizeText(project.status);
  const overview = sanitizeText(project.overview);

  const features = project.features
    .map((f, i) => {
      const name = sanitizeText(typeof f === 'string' ? f : f.name);
      return `<li data-feature-index="${i}" data-project-id="${sanitizeText(project.id)}">${name}</li>`;
    })
    .join('');

  const techTags = project.tech
    .map(t => {
      return `<span class="doc-tech-tag">${sanitizeText(t)}</span>`;
    })
    .join('');

  const deps = sanitizeText(project.dependencies || '');

  const githubLink =
    project.github && sanitizeUrl(project.github)
      ? `<a href="${sanitizeUrl(project.github)}" class="modal-link" target="_blank" rel="noopener noreferrer">
         <span class="link-icon">&#128187;</span> GitHub
       </a>`
      : '';

  const demoLink =
    project.demo && sanitizeUrl(project.demo)
      ? `<a href="${sanitizeUrl(project.demo)}" class="modal-link" target="_blank" rel="noopener noreferrer">
         <span class="link-icon">&#127760;</span> Demo
       </a>`
      : '';

  return `
    <div class="modal-header">
      <span class="modal-icon" id="doc-modal-icon">${icon}</span>
      <h2 class="modal-title" id="doc-modal-title">${title}</h2>
      <span class="modal-status ${status}" id="doc-modal-status">${status.toUpperCase()}</span>
    </div>
    <div class="modal-body">
      <div class="doc-section">
        <h3>Overview</h3>
        <p id="doc-modal-overview">${overview}</p>
      </div>
      <div class="doc-section">
        <h3>Features</h3>
        <ul class="doc-features-list" id="doc-modal-features">
          ${features}
        </ul>
      </div>
      <div class="doc-section">
        <h3>Tech Stack</h3>
        <div class="doc-tech-list" id="doc-modal-tech">
          ${techTags}
        </div>
      </div>
      <div class="doc-section">
        <h3>Dependencies</h3>
        <p id="doc-modal-deps">${deps}</p>
      </div>
      <div class="modal-links">
        ${githubLink}
        ${demoLink}
      </div>
    </div>
  `;
}

/**
 * Generate feature modal content
 * @param {Object} feature - Feature data
 * @returns {string} HTML content
 */
function generateFeatureModalContent(feature) {
  const name = sanitizeText(feature.name);
  const what = sanitizeText(feature.what || '');
  const how = sanitizeText(feature.how || '');
  const why = sanitizeText(feature.why || '');

  return `
    <div class="modal-header">
      <h2 class="modal-title" id="feature-modal-title">${name}</h2>
    </div>
    <div class="modal-body">
      <div class="feature-section">
        <h3><span class="section-icon">&#129300;</span> What</h3>
        <p id="feature-modal-what">${what}</p>
      </div>
      <div class="feature-section">
        <h3><span class="section-icon">&#128736;</span> How</h3>
        <p id="feature-modal-how">${how}</p>
      </div>
      <div class="feature-section">
        <h3><span class="section-icon">&#128161;</span> Why</h3>
        <p id="feature-modal-why">${why}</p>
      </div>
    </div>
  `;
}

/**
 * Generate component modal content (mini-tree item)
 * @param {Object} component - Component data
 * @returns {string} HTML content
 */
function generateComponentModalContent(component) {
  const icon = sanitizeText(component.icon || '');
  const name = sanitizeText(component.name);
  const status = sanitizeText(component.status);
  const what = sanitizeText(component.what || 'Documentation coming soon.');
  const how = sanitizeText(component.how || 'Implementation details coming soon.');
  const why = sanitizeText(component.why || 'Purpose explanation coming soon.');
  const future = sanitizeText(component.future || 'Future roadmap to be announced.');

  return `
    <div class="modal-header">
      <span class="modal-icon" id="component-modal-icon">${icon}</span>
      <h2 class="modal-title" id="component-modal-title">${name}</h2>
      <span class="component-status ${status}" id="component-modal-status">${status.replace('-', ' ').toUpperCase()}</span>
    </div>
    <div class="modal-body">
      <div class="component-section">
        <h3><span class="section-icon">&#129300;</span> What</h3>
        <p id="component-modal-what">${what}</p>
      </div>
      <div class="component-section">
        <h3><span class="section-icon">&#128736;</span> How</h3>
        <p id="component-modal-how">${how}</p>
      </div>
      <div class="component-section">
        <h3><span class="section-icon">&#128161;</span> Why</h3>
        <p id="component-modal-why">${why}</p>
      </div>
      <div class="component-section">
        <h3><span class="section-icon">&#128302;</span> Future</h3>
        <p id="component-modal-future">${future}</p>
      </div>
    </div>
  `;
}

/**
 * Generate project immersive modal content
 * @param {Object} project - Project data
 * @returns {string} HTML content
 */
function generateProjectImmersiveContent(project) {
  const icon = sanitizeText(project.icon);
  const title = sanitizeText(project.title);
  const status = sanitizeText(project.status);
  const overview = sanitizeText(project.overview);
  const architecture = sanitizeText(project.architecture || '');

  // Mini tree (skill tree)
  const miniTreeItems = (project.miniTree || [])
    .map((item, i) => {
      const itemIcon = sanitizeText(item.icon || '');
      const itemName = sanitizeText(item.name);
      const itemStatus = sanitizeText(item.status);
      return `
      <div class="mini-tree-item ${itemStatus}" data-component-index="${i}">
        <span class="mini-tree-icon">${itemIcon}</span>
        <span class="mini-tree-name">${itemName}</span>
        <span class="mini-tree-status">${itemStatus}</span>
      </div>
    `;
    })
    .join('');

  // Roadmap
  const roadmapItems = (project.roadmap || [])
    .map(item => {
      const phase = sanitizeText(item.phase);
      const text = sanitizeText(item.text);
      return `
      <div class="roadmap-item">
        <span class="roadmap-phase">${phase}</span>
        <span class="roadmap-text">${text}</span>
      </div>
    `;
    })
    .join('');

  // Integrations
  const integrations = (project.integrations || [])
    .map(int => {
      return `<span class="integration-tag">${sanitizeText(int)}</span>`;
    })
    .join('');

  return `
    <div class="immersive-header">
      <div class="immersive-icon">${icon}</div>
      <div class="immersive-info">
        <h1 class="immersive-title">${title}</h1>
        <span class="immersive-status ${status}">${status.toUpperCase()}</span>
      </div>
      <button class="modal-close immersive-close" aria-label="Close">&times;</button>
    </div>
    <div class="immersive-body">
      <div class="immersive-overview">
        <h2>Overview</h2>
        <p>${overview}</p>
      </div>
      <div class="immersive-grid">
        <div class="immersive-section skill-tree-section">
          <h2>&#127795; Skill Tree</h2>
          <div class="mini-tree-container">
            ${miniTreeItems}
          </div>
        </div>
        <div class="immersive-section">
          <h2>&#128679; Architecture</h2>
          <p>${architecture}</p>
        </div>
        <div class="immersive-section">
          <h2>&#128198; Roadmap</h2>
          <div class="roadmap-container">
            ${roadmapItems}
          </div>
        </div>
        <div class="immersive-section">
          <h2>&#128279; Integrations</h2>
          <div class="integrations-container">
            ${integrations}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// MODAL FACTORY
// ============================================

const ModalFactory = {
  /**
   * Dependency injection - allows mocking in tests
   * Override via configure({ deps: {...} })
   */
  deps: {
    DataAdapter,
    BuildState,
  },

  /**
   * Configure dependencies
   * @param {Object} options
   * @param {Object} options.deps - Dependency overrides
   */
  configure(options = {}) {
    if (options.deps) {
      this.deps = { ...this.deps, ...options.deps };
    }
    return this;
  },

  /**
   * Modal type creators - Strategy pattern for Open/Closed principle
   * Add new modal types here without modifying create() method
   */
  modalCreators: {
    [MODAL_TYPES.DOC]: (factory, config) => factory.openDoc(config.projectId),
    [MODAL_TYPES.FEATURE]: (factory, config) =>
      factory.openFeature(config.projectId, config.featureIndex),
    [MODAL_TYPES.COMPONENT]: (factory, config) =>
      factory.openComponent(config.projectId, config.componentIndex),
    [MODAL_TYPES.PROJECT_IMMERSIVE]: (factory, config) =>
      factory.openProjectImmersive(config.projectId),
  },

  /**
   * Register a modal configuration
   * @param {string} modalId - Modal element ID
   * @param {Object} config - Modal configuration
   */
  register(modalId, config = {}) {
    modalConfigs.set(modalId, {
      element: null,
      backdrop: null,
      closeBtn: null,
      type: config.type || MODAL_TYPES.DOC,
      onOpen: config.onOpen || null,
      onClose: config.onClose || null,
      ...config,
    });
  },

  /**
   * Initialize all registered modals
   */
  init() {
    // Register default modals
    this.register('doc-modal', { type: MODAL_TYPES.DOC });
    this.register('feature-modal', { type: MODAL_TYPES.FEATURE });
    this.register('component-modal', { type: MODAL_TYPES.COMPONENT });
    this.register('code-learning-modal', { type: MODAL_TYPES.CODE_LEARNING });

    // Initialize each modal
    modalConfigs.forEach((config, modalId) => {
      const element = byId(modalId);
      if (element) {
        config.element = element;
        config.backdrop = $(SELECTORS.MODAL_BACKDROP, element);
        config.closeBtn = $(SELECTORS.MODAL_CLOSE, element);

        // Bind close handlers
        if (config.closeBtn) {
          on(config.closeBtn, 'click', () => this.close(modalId));
        }
        if (config.backdrop) {
          on(config.backdrop, 'click', () => this.close(modalId));
        }
      }
    });

    // Global escape key handler
    on(document, 'keydown', e => {
      if (e.key === 'Escape' && modalStack.length > 0) {
        this.close(modalStack[modalStack.length - 1]);
      }
    });

    console.log('[ModalFactory] Initialized', modalConfigs.size, 'modals');
  },

  /**
   * Create and open a modal
   * @param {string} type - Modal type
   * @param {Object} config - Modal configuration
   * @returns {string} Modal ID
   */
  async create(type, config = {}) {
    const creator = this.modalCreators[type];
    if (creator) {
      return creator(this, config);
    }
    console.warn('[ModalFactory] Unknown modal type:', type);
    return null;
  },

  /**
   * Open doc modal
   * @param {string} projectId
   * @returns {string} Modal ID
   */
  async openDoc(projectId) {
    const project = await this.deps.DataAdapter.getProject(projectId);
    if (!project) {
      console.warn('[ModalFactory] Project not found:', projectId);
      return null;
    }

    const config = modalConfigs.get('doc-modal');
    if (!config || !config.element) {
      console.warn('[ModalFactory] Doc modal not initialized');
      return null;
    }

    // Update content
    const content = config.element.querySelector('.modal-content');
    if (content) {
      safeInnerHTML(content, generateDocModalContent(project));

      // Bind feature click handlers
      const featureItems = $$('.doc-features-list li', content);
      featureItems.forEach(li => {
        on(li, 'click', e => {
          e.stopPropagation();
          const featureIndex = parseInt(li.dataset.featureIndex, 10);
          this.openFeature(projectId, featureIndex);
        });
      });
    }

    // Store current project
    this.deps.BuildState.selectProject(projectId);

    return this.open('doc-modal');
  },

  /**
   * Open feature modal
   * @param {string} projectId
   * @param {number} featureIndex
   * @returns {string} Modal ID
   */
  async openFeature(projectId, featureIndex) {
    const project = await this.deps.DataAdapter.getProject(projectId);
    if (!project) return null;

    const feature = project.features[featureIndex];
    if (!feature || typeof feature === 'string') return null;

    const config = modalConfigs.get('feature-modal');
    if (!config || !config.element) return null;

    const content = config.element.querySelector('.modal-content');
    if (content) {
      safeInnerHTML(content, generateFeatureModalContent(feature));
    }

    return this.open('feature-modal');
  },

  /**
   * Open component modal (mini-tree item)
   * @param {string} projectId
   * @param {number} componentIndex
   * @returns {string} Modal ID
   */
  async openComponent(projectId, componentIndex) {
    const project = await this.deps.DataAdapter.getProject(projectId);
    if (!project) return null;

    const component = project.miniTree[componentIndex];
    if (!component) return null;

    const config = modalConfigs.get('component-modal');
    if (!config || !config.element) return null;

    const content = config.element.querySelector('.modal-content');
    if (content) {
      safeInnerHTML(content, generateComponentModalContent(component));
    }

    return this.open('component-modal');
  },

  /**
   * Open project immersive modal (full-screen)
   * @param {string} projectId
   * @returns {string} Modal ID
   */
  async openProjectImmersive(projectId) {
    const project = await this.deps.DataAdapter.getProject(projectId);
    if (!project) return null;

    // Check if immersive modal exists, create if not
    let modal = byId('project-immersive-modal');
    if (!modal) {
      modal = createElement(
        'div',
        {
          id: 'project-immersive-modal',
          className: 'modal immersive-modal',
        },
        [
          createElement('div', { className: 'modal-backdrop' }),
          createElement('div', { className: 'modal-content immersive-content' }),
        ]
      );
      document.body.appendChild(modal);
      this.register('project-immersive-modal', { type: MODAL_TYPES.PROJECT_IMMERSIVE });

      // Re-initialize
      const config = modalConfigs.get('project-immersive-modal');
      config.element = modal;
      config.backdrop = $(SELECTORS.MODAL_BACKDROP, modal);

      on(config.backdrop, 'click', () => this.close('project-immersive-modal'));
    }

    const content = modal.querySelector('.modal-content');
    if (content) {
      safeInnerHTML(content, generateProjectImmersiveContent(project));

      // Bind close button
      const closeBtn = content.querySelector('.immersive-close');
      if (closeBtn) {
        on(closeBtn, 'click', () => this.close('project-immersive-modal'));
      }

      // Bind mini-tree item clicks
      const miniTreeItems = $$('.mini-tree-item', content);
      miniTreeItems.forEach(item => {
        on(item, 'click', () => {
          const componentIndex = parseInt(item.dataset.componentIndex, 10);
          this.openComponent(projectId, componentIndex);
        });
      });
    }

    // Store current project
    this.deps.BuildState.selectProject(projectId);

    return this.open('project-immersive-modal');
  },

  /**
   * Open a modal by ID
   * @param {string} modalId
   * @returns {string} Modal ID
   */
  open(modalId) {
    const config = modalConfigs.get(modalId);
    if (!config || !config.element) {
      console.warn('[ModalFactory] Modal not found:', modalId);
      return null;
    }

    // Add to stack
    if (!modalStack.includes(modalId)) {
      modalStack.push(modalId);
    }

    // Show modal
    addClass(config.element, 'active');
    document.body.style.overflow = 'hidden';

    // Emit event
    this.deps.BuildState.emit(EVENTS.MODAL_OPEN, { modalId, type: config.type });

    // Callback
    if (config.onOpen) {
      config.onOpen(config.element);
    }

    return modalId;
  },

  /**
   * Close a modal by ID
   * @param {string} modalId
   */
  close(modalId) {
    const config = modalConfigs.get(modalId);
    if (!config || !config.element) return;

    // Remove from stack
    const index = modalStack.indexOf(modalId);
    if (index > -1) {
      modalStack.splice(index, 1);
    }

    // Hide modal
    removeClass(config.element, 'active');

    // Restore body scroll if no modals open
    if (modalStack.length === 0) {
      document.body.style.overflow = '';
    }

    // Emit event
    this.deps.BuildState.emit(EVENTS.MODAL_CLOSE, { modalId, type: config.type });

    // Callback
    if (config.onClose) {
      config.onClose(config.element);
    }
  },

  /**
   * Close all modals
   */
  closeAll() {
    [...modalStack].forEach(modalId => this.close(modalId));
  },

  /**
   * Check if a modal is open
   * @param {string} modalId
   * @returns {boolean}
   */
  isOpen(modalId) {
    return modalStack.includes(modalId);
  },

  /**
   * Get current open modal
   * @returns {string|null}
   */
  getCurrentModal() {
    return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
  },
};

// Export for ES modules
export { ModalFactory };
export default ModalFactory;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.ModalFactory = ModalFactory;
}
