/**
 * Build V2 - Event Handlers
 * Chain of Responsibility pattern for event handling
 *
 * @version 2.0.0
 */

'use strict';

import { EVENTS, SELECTORS, STATES } from './config.js';
import { BuildState } from './state.js';
import { DataAdapter } from './data/adapter.js';
import { ModalFactory } from './components/modal.js';
import { TreeComponent } from './components/tree.js';
import { $, $$, addClass, removeClass, on, delegate } from './utils/dom.js';

// ============================================
// HANDLER CHAIN
// ============================================

/**
 * Handler chain for processing events
 */
const handlerChain = [];

/**
 * Register a handler in the chain
 * @param {Object} handler - Handler with canHandle and handle methods
 */
function registerHandler(handler) {
  if (handler && typeof handler.canHandle === 'function' && typeof handler.handle === 'function') {
    handlerChain.push(handler);
  }
}

/**
 * Process an event through the handler chain
 * @param {string} type - Event type
 * @param {Object} data - Event data
 * @returns {boolean} Whether event was handled
 */
function processEvent(type, data) {
  for (const handler of handlerChain) {
    if (handler.canHandle(type, data)) {
      const result = handler.handle(type, data);
      if (result === true) {
        // Handler consumed the event
        return true;
      }
    }
  }
  return false;
}

// ============================================
// VIEW SWITCH HANDLER
// ============================================

const ViewSwitchHandler = {
  canHandle(type) {
    return type === 'view:switch';
  },

  handle(type, data) {
    const { view } = data;
    if (!view) return false;

    // Update buttons
    const buttons = $$(SELECTORS.VIEW_SWITCH_BTN);
    buttons.forEach(btn => {
      if (btn.dataset.view === view) {
        addClass(btn, 'active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        removeClass(btn, 'active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Update sections
    const sections = $$(SELECTORS.VIEW_SECTION);
    sections.forEach(section => {
      if (section.id === `view-${view}`) {
        addClass(section, 'active');
      } else {
        removeClass(section, 'active');
      }
    });

    // Update URL hash
    history.replaceState(null, '', `#${view}`);

    // Emit state change
    BuildState.emit('view:changed', { view });

    return true;
  }
};

// ============================================
// FILTER HANDLER
// ============================================

const FilterHandler = {
  canHandle(type) {
    return type === 'filter:status' || type === 'filter:skill';
  },

  handle(type, data) {
    if (type === 'filter:status') {
      const { status } = data;

      // Update filter pills
      const pills = $$(SELECTORS.FILTER_PILL);
      pills.forEach(pill => {
        if (pill.dataset.status === status) {
          addClass(pill, 'active');
        } else {
          removeClass(pill, 'active');
        }
      });

      // Apply filter to tree
      TreeComponent.filter(status);

      return true;
    }

    if (type === 'filter:skill') {
      const { skill } = data;

      // Update skill pills
      const pills = $$(SELECTORS.SKILL_PILL);
      pills.forEach(pill => {
        if (pill.dataset.skill === skill) {
          addClass(pill, 'active');
        } else {
          removeClass(pill, 'active');
        }
      });

      // Filter builder cards
      const cards = $$('.builder-card');
      cards.forEach(card => {
        const skills = card.dataset.skills || '';
        if (skill === 'all' || skills.includes(skill)) {
          removeClass(card, 'hidden');
        } else {
          addClass(card, 'hidden');
        }
      });

      return true;
    }

    return false;
  }
};

// ============================================
// MODAL HANDLER
// ============================================

const ModalHandler = {
  canHandle(type) {
    return type.startsWith('modal:');
  },

  handle(type, data) {
    if (type === 'modal:open:doc') {
      ModalFactory.openDoc(data.projectId);
      return true;
    }

    if (type === 'modal:open:feature') {
      ModalFactory.openFeature(data.projectId, data.featureIndex);
      return true;
    }

    if (type === 'modal:open:component') {
      ModalFactory.openComponent(data.projectId, data.componentIndex);
      return true;
    }

    if (type === 'modal:open:immersive') {
      ModalFactory.openProjectImmersive(data.projectId);
      return true;
    }

    if (type === 'modal:close') {
      if (data.modalId) {
        ModalFactory.close(data.modalId);
      } else {
        ModalFactory.closeAll();
      }
      return true;
    }

    return false;
  }
};

// ============================================
// NAVIGATION HANDLER
// ============================================

const NavigationHandler = {
  canHandle(type) {
    return type === 'navigate' || type === 'navigate:external';
  },

  handle(type, data) {
    if (type === 'navigate') {
      const { target } = data;

      // Handle internal navigation
      if (target === 'yggdrasil' || target === 'marketplace' || target === 'path' || target === 'journey') {
        processEvent('view:switch', { view: target });
        return true;
      }

      // Handle project navigation
      if (target && target.startsWith('project:')) {
        const projectId = target.replace('project:', '');
        ModalFactory.openProjectImmersive(projectId);
        return true;
      }
    }

    if (type === 'navigate:external') {
      const { url, newTab = true } = data;
      if (url) {
        if (newTab) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = url;
        }
        return true;
      }
    }

    return false;
  }
};

// ============================================
// KEYBOARD HANDLER
// ============================================

const KeyboardHandler = {
  canHandle(type) {
    return type === 'keyboard';
  },

  handle(type, data) {
    const { key, ctrlKey, shiftKey, altKey } = data;

    // Escape - close modals
    if (key === 'Escape') {
      if (ModalFactory.getCurrentModal()) {
        ModalFactory.close(ModalFactory.getCurrentModal());
        return true;
      }
    }

    // Ctrl+1-4 - switch views
    if (ctrlKey && ['1', '2', '3', '4'].includes(key)) {
      const views = ['yggdrasil', 'marketplace', 'path', 'journey'];
      const index = parseInt(key, 10) - 1;
      if (views[index]) {
        processEvent('view:switch', { view: views[index] });
        return true;
      }
    }

    // ? - show help (future)
    if (key === '?' && shiftKey) {
      console.log('[Keyboard] Help requested');
      return true;
    }

    return false;
  }
};

// ============================================
// DEEP LINK HANDLER
// ============================================

const DeepLinkHandler = {
  canHandle(type) {
    return type === 'deeplink:init' || type === 'deeplink:change';
  },

  handle(type, data) {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return false;

    // View deep links
    if (['yggdrasil', 'marketplace', 'path', 'journey'].includes(hash)) {
      processEvent('view:switch', { view: hash });
      return true;
    }

    // Project deep links (e.g., #burn-engine)
    if (hash.match(/^[a-z0-9-]+$/)) {
      // Check if it's a valid project
      DataAdapter.getProject(hash).then(project => {
        if (project) {
          processEvent('view:switch', { view: 'yggdrasil' });
          setTimeout(() => {
            ModalFactory.openProjectImmersive(hash);
          }, 100);
        }
      });
      return true;
    }

    return false;
  }
};

// ============================================
// REGISTER ALL HANDLERS
// ============================================

registerHandler(ViewSwitchHandler);
registerHandler(FilterHandler);
registerHandler(ModalHandler);
registerHandler(NavigationHandler);
registerHandler(KeyboardHandler);
registerHandler(DeepLinkHandler);

// ============================================
// GLOBAL EVENT BINDINGS
// ============================================

const EventHandlers = {
  /**
   * Initialize event handlers
   */
  init() {
    // View switch buttons
    delegate(document, 'click', SELECTORS.VIEW_SWITCH_BTN, (e, btn) => {
      const view = btn.dataset.view;
      processEvent('view:switch', { view });
    });

    // Filter pills
    delegate(document, 'click', SELECTORS.FILTER_PILL, (e, pill) => {
      const status = pill.dataset.status;
      processEvent('filter:status', { status });
    });

    // Skill pills
    delegate(document, 'click', SELECTORS.SKILL_PILL, (e, pill) => {
      const skill = pill.dataset.skill;
      processEvent('filter:skill', { skill });
    });

    // Keyboard events
    on(document, 'keydown', (e) => {
      processEvent('keyboard', {
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
    });

    // Hash change for deep links
    on(window, 'hashchange', () => {
      processEvent('deeplink:change', {});
    });

    // Initial deep link processing
    processEvent('deeplink:init', {});

    console.log('[EventHandlers] Initialized with', handlerChain.length, 'handlers');
  },

  /**
   * Process an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @returns {boolean}
   */
  process: processEvent,

  /**
   * Register a custom handler
   * @param {Object} handler
   */
  register: registerHandler
};

// Export for ES modules
export { EventHandlers, processEvent, registerHandler };
export default EventHandlers;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.EventHandlers = EventHandlers;
}
