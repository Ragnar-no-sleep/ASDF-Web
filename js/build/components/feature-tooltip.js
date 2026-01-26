/**
 * Feature Tooltip Component
 * Shows contextual tooltips for feature discovery during FTUE
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { $, on, addClass, removeClass, setStyles } from '../utils/dom.js';
import { sanitizeText } from '../utils/security.js';

// ============================================
// FEATURE TOOLTIPS CONFIGURATION
// ============================================

const FEATURE_TOOLTIPS = {
  'project-panel': {
    target: '.project-panel',
    title: 'Project Details',
    description: 'Explore skills, builders, and progress for each project.',
    position: 'left',
    trigger: 'onboarding:milestone',
    condition: data => data.milestone === 'firstProjectClick',
  },
  'quiz-start': {
    target: '[data-view="path"]',
    title: 'Find Your Path',
    description: 'Take the quiz to discover your ideal builder track.',
    position: 'bottom',
    trigger: 'intro:complete',
    delay: 2000,
  },
  'formation-panel': {
    target: '.formation-panel',
    title: 'Learning Tracks',
    description: 'Start your journey with guided modules and exercises.',
    position: 'right',
    trigger: 'onboarding:milestone',
    condition: data => data.milestone === 'firstQuizComplete',
  },
};

// ============================================
// TOOLTIP STATE
// ============================================

let activeTooltip = null;
const tooltipQueue = [];
let shownTooltips = new Set();

// ============================================
// FEATURE TOOLTIP COMPONENT
// ============================================

const FeatureTooltip = {
  /**
   * Initialize feature tooltips
   */
  init() {
    // Load shown tooltips from localStorage
    const stored = localStorage.getItem('asdf_shown_tooltips');
    if (stored) {
      try {
        shownTooltips = new Set(JSON.parse(stored));
      } catch {
        shownTooltips = new Set();
      }
    }

    // Subscribe to events
    this.bindEvents();

    console.log('[FeatureTooltip] Initialized');
  },

  /**
   * Bind state events
   */
  bindEvents() {
    // Listen for milestone events
    BuildState.subscribe('onboarding:milestone', data => {
      this.checkTooltips('onboarding:milestone', data);
    });

    // Listen for intro complete
    BuildState.subscribe('intro:complete', () => {
      this.checkTooltips('intro:complete', {});
    });

    // Dismiss on click outside
    on(document, 'click', e => {
      if (activeTooltip && !e.target.closest('.feature-tooltip')) {
        this.dismiss();
      }
    });

    // Dismiss on escape
    on(document, 'keydown', e => {
      if (e.key === 'Escape' && activeTooltip) {
        this.dismiss();
      }
    });
  },

  /**
   * Check if any tooltips should be shown
   * @param {string} trigger - Event trigger name
   * @param {Object} data - Event data
   */
  checkTooltips(trigger, data) {
    Object.entries(FEATURE_TOOLTIPS).forEach(([id, config]) => {
      if (config.trigger !== trigger) return;
      if (shownTooltips.has(id)) return;
      if (config.condition && !config.condition(data)) return;

      // Queue tooltip with optional delay
      if (config.delay) {
        setTimeout(() => this.queueTooltip(id, config), config.delay);
      } else {
        this.queueTooltip(id, config);
      }
    });
  },

  /**
   * Queue a tooltip for display
   * @param {string} id - Tooltip ID
   * @param {Object} config - Tooltip configuration
   */
  queueTooltip(id, config) {
    tooltipQueue.push({ id, config });
    this.processQueue();
  },

  /**
   * Process tooltip queue
   */
  processQueue() {
    if (activeTooltip || tooltipQueue.length === 0) return;

    const { id, config } = tooltipQueue.shift();
    this.show(id, config);
  },

  /**
   * Show a feature tooltip
   * @param {string} id - Tooltip ID
   * @param {Object} config - Tooltip configuration
   */
  show(id, config) {
    const target = $(config.target);
    if (!target) {
      console.warn(`[FeatureTooltip] Target not found: ${config.target}`);
      this.processQueue();
      return;
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = `feature-tooltip feature-tooltip--${config.position}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('data-tooltip-id', id);

    tooltip.innerHTML = `
      <div class="feature-tooltip__arrow"></div>
      <div class="feature-tooltip__content">
        <h4 class="feature-tooltip__title">${sanitizeText(config.title)}</h4>
        <p class="feature-tooltip__desc">${sanitizeText(config.description)}</p>
      </div>
      <button class="feature-tooltip__dismiss" aria-label="Dismiss">Got it</button>
    `;

    document.body.appendChild(tooltip);

    // Position tooltip
    this.position(tooltip, target, config.position);

    // Animate in
    requestAnimationFrame(() => {
      addClass(tooltip, 'feature-tooltip--visible');
    });

    // Bind dismiss button
    const dismissBtn = tooltip.querySelector('.feature-tooltip__dismiss');
    on(dismissBtn, 'click', () => this.dismiss());

    activeTooltip = { id, element: tooltip, target };

    // Highlight target
    addClass(target, 'feature-tooltip-target');
  },

  /**
   * Position tooltip relative to target
   * @param {HTMLElement} tooltip - Tooltip element
   * @param {HTMLElement} target - Target element
   * @param {string} position - Position (top, bottom, left, right)
   */
  position(tooltip, target, position) {
    const targetRect = target.getBoundingClientRect();
    const offset = 12;

    let top, left;

    switch (position) {
      case 'top':
        top = targetRect.top - offset;
        left = targetRect.left + targetRect.width / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + offset;
        left = targetRect.left + targetRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - offset;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + offset;
        break;
      default:
        top = targetRect.bottom + offset;
        left = targetRect.left + targetRect.width / 2;
    }

    // Transform based on position
    const transforms = {
      top: 'translate(-50%, -100%)',
      bottom: 'translate(-50%, 0)',
      left: 'translate(-100%, -50%)',
      right: 'translate(0, -50%)',
    };

    setStyles(tooltip, {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: transforms[position] || transforms.bottom,
      zIndex: '1000',
    });
  },

  /**
   * Dismiss active tooltip
   */
  dismiss() {
    if (!activeTooltip) return;

    const { id, element, target } = activeTooltip;

    // Mark as shown
    shownTooltips.add(id);
    localStorage.setItem('asdf_shown_tooltips', JSON.stringify([...shownTooltips]));

    // Remove highlight
    removeClass(target, 'feature-tooltip-target');

    // Animate out
    removeClass(element, 'feature-tooltip--visible');
    addClass(element, 'feature-tooltip--hidden');

    setTimeout(() => {
      element.remove();
      activeTooltip = null;
      this.processQueue();
    }, 200);
  },

  /**
   * Manually show a tooltip by ID
   * @param {string} id - Tooltip ID
   */
  trigger(id) {
    const config = FEATURE_TOOLTIPS[id];
    if (config && !shownTooltips.has(id)) {
      this.show(id, config);
    }
  },

  /**
   * Reset shown tooltips (for testing)
   */
  reset() {
    shownTooltips.clear();
    localStorage.removeItem('asdf_shown_tooltips');
  },
};

export { FeatureTooltip };
export default FeatureTooltip;

// Global export
if (typeof window !== 'undefined') {
  window.FeatureTooltip = FeatureTooltip;
}
