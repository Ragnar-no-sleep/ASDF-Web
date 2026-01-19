/**
 * Build V2 - Intro Component
 * Mini-intro experience (3 clicks to skip)
 *
 * @version 2.0.0
 */

'use strict';

import { STATES, EVENTS, DEFAULTS } from '../config.js';
import { BuildState } from '../state.js';
import { sanitizeText } from '../utils/security.js';
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
  setStyles,
  waitForTransition,
  nextFrame
} from '../utils/dom.js';

// ============================================
// INTRO SLIDES - Positioned Tooltips
// ============================================

const INTRO_SLIDES = [
  {
    id: 'burn-center',
    target: '.tree-heart, .nordic-sun',
    position: 'bottom', // Tooltip appears below target
    icon: '&#128293;', // 🔥 as HTML entity
    title: 'The Burn Engine',
    description: 'Live burns power the ecosystem. Watch the pulse - faster means more activity.',
    cta: 'Next'
  },
  {
    id: 'projects',
    target: '.tree-node[data-project="burn-tracker"], .tree-node[data-status="live"]',
    position: 'right',
    icon: '&#127793;', // 🌱 as HTML entity
    title: 'Explore Projects',
    description: 'Click any stone island to see skills, builders, and progress.',
    cta: 'Next'
  },
  {
    id: 'find-path',
    target: '[data-view="path"]',
    position: 'bottom',
    icon: '&#129517;', // 🧭 as HTML entity
    title: 'Find Your Path',
    description: 'Take the quiz to discover your builder track and start your journey.',
    cta: 'Start Exploring'
  }
];

// Tooltip positioning config
const TOOLTIP_CONFIG = {
  offset: 16,        // Distance from target
  arrowSize: 12,     // Arrow/pointer size
  maxWidth: 320,     // Maximum tooltip width
  padding: 20        // Screen edge padding
};

// ============================================
// INTRO STATE
// ============================================

let introContainer = null;
let currentSlide = 0;
let isAnimating = false;
let highlightOverlay = null;
let currentTargetElement = null;

// ============================================
// INTRO COMPONENT
// ============================================

const IntroComponent = {
  /**
   * Initialize intro component
   * @param {string|Element} container - Container selector or element
   */
  init(container = '#intro-container') {
    // Check if intro was already completed
    if (BuildState.data.introCompleted) {
      console.log('[IntroComponent] Intro already completed, skipping');
      return false;
    }

    introContainer = typeof container === 'string' ? $(container) : container;

    // If no container exists, create one
    if (!introContainer) {
      this.createContainer();
    }

    // Render initial slide
    this.render();

    // Bind events
    this.bindEvents();

    console.log('[IntroComponent] Initialized');
    return true;
  },

  /**
   * Create intro container
   */
  createContainer() {
    introContainer = createElement('div', {
      id: 'intro-container',
      className: 'intro-overlay'
    });
    document.body.appendChild(introContainer);
  },

  /**
   * Render intro tooltip
   */
  render() {
    const slide = INTRO_SLIDES[currentSlide];
    if (!slide) return;

    // Find target element
    currentTargetElement = $(slide.target);

    // Generate dots
    const dots = INTRO_SLIDES.map((_, i) => {
      const activeClass = i === currentSlide ? 'active' : '';
      const doneClass = i < currentSlide ? 'done' : '';
      return `<span class="intro-dot ${activeClass} ${doneClass}" data-slide="${i}"></span>`;
    }).join('');

    // Create tooltip HTML (icon uses innerHTML for HTML entities)
    const html = `
      <div class="intro-backdrop"></div>
      <div class="intro-spotlight"></div>
      <div class="intro-tooltip" data-position="${slide.position}">
        <div class="intro-tooltip-arrow"></div>
        <button class="intro-skip" aria-label="Skip intro">Skip</button>
        <div class="intro-tooltip-content">
          <div class="intro-tooltip-icon">${slide.icon}</div>
          <h3 class="intro-tooltip-title">${sanitizeText(slide.title)}</h3>
          <p class="intro-tooltip-desc">${sanitizeText(slide.description)}</p>
        </div>
        <div class="intro-tooltip-footer">
          <div class="intro-dots">${dots}</div>
          <button class="intro-cta">${sanitizeText(slide.cta)}</button>
        </div>
      </div>
    `;

    introContainer.innerHTML = html;

    // Position tooltip relative to target
    this.positionTooltip(slide);

    // Highlight target element
    this.highlightTarget();

    // Animate in
    requestAnimationFrame(() => {
      addClass(introContainer, 'active');
    });
  },

  /**
   * Position tooltip relative to target element
   * @param {Object} slide - Current slide config
   */
  positionTooltip(slide) {
    const tooltip = $('.intro-tooltip', introContainer);
    const spotlight = $('.intro-spotlight', introContainer);

    if (!tooltip) return;

    // If no target found, center the tooltip
    if (!currentTargetElement) {
      setStyles(tooltip, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      if (spotlight) hide(spotlight);
      return;
    }

    const targetRect = currentTargetElement.getBoundingClientRect();
    const { offset, padding, maxWidth } = TOOLTIP_CONFIG;

    // Calculate position based on slide.position
    let top, left;
    const position = slide.position || 'bottom';

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

    // Apply transform based on position
    let transform = '';
    if (position === 'top') {
      transform = 'translate(-50%, -100%)';
    } else if (position === 'bottom') {
      transform = 'translate(-50%, 0)';
    } else if (position === 'left') {
      transform = 'translate(-100%, -50%)';
    } else if (position === 'right') {
      transform = 'translate(0, -50%)';
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Clamp horizontal position
    if (left < padding + maxWidth / 2) left = padding + maxWidth / 2;
    if (left > viewportWidth - padding - maxWidth / 2) left = viewportWidth - padding - maxWidth / 2;

    // Clamp vertical position
    if (top < padding) top = padding;
    if (top > viewportHeight - padding - 200) top = viewportHeight - padding - 200;

    setStyles(tooltip, {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: transform,
      maxWidth: `${maxWidth}px`
    });

    // Position spotlight over target
    if (spotlight) {
      const spotlightPadding = 8;
      setStyles(spotlight, {
        position: 'fixed',
        top: `${targetRect.top - spotlightPadding}px`,
        left: `${targetRect.left - spotlightPadding}px`,
        width: `${targetRect.width + spotlightPadding * 2}px`,
        height: `${targetRect.height + spotlightPadding * 2}px`,
        borderRadius: '12px'
      });
      show(spotlight);
    }
  },

  /**
   * Highlight target element
   */
  highlightTarget() {
    // Remove previous highlight
    if (highlightOverlay) {
      removeClass(highlightOverlay, 'intro-highlighted');
    }

    if (currentTargetElement) {
      addClass(currentTargetElement, 'intro-highlighted');
      highlightOverlay = currentTargetElement;

      // Scroll target into view if needed
      currentTargetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  },

  /**
   * Clear target highlight
   */
  clearHighlight() {
    if (highlightOverlay) {
      removeClass(highlightOverlay, 'intro-highlighted');
      highlightOverlay = null;
    }
    currentTargetElement = null;
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // CTA button
    on(introContainer, 'click', (e) => {
      if (e.target.matches('.intro-cta')) {
        this.nextSlide();
      }
    });

    // Skip button
    on(introContainer, 'click', (e) => {
      if (e.target.matches('.intro-skip')) {
        this.complete();
      }
    });

    // Backdrop click to advance
    on(introContainer, 'click', (e) => {
      if (e.target.matches('.intro-backdrop')) {
        this.nextSlide();
      }
    });

    // Dot clicks
    on(introContainer, 'click', (e) => {
      if (e.target.matches('.intro-dot')) {
        const slideIndex = parseInt(e.target.dataset.slide, 10);
        this.goToSlide(slideIndex);
      }
    });

    // Keyboard navigation
    on(document, 'keydown', (e) => {
      if (!introContainer || !introContainer.classList.contains('active')) return;

      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.complete();
      }
    });
  },

  /**
   * Go to next slide
   */
  async nextSlide() {
    if (isAnimating) return;

    if (currentSlide >= INTRO_SLIDES.length - 1) {
      this.complete();
      return;
    }

    await this.animateSlideOut('left');
    currentSlide++;
    this.render();
    await this.animateSlideIn('right');
  },

  /**
   * Go to previous slide
   */
  async prevSlide() {
    if (isAnimating || currentSlide <= 0) return;

    await this.animateSlideOut('right');
    currentSlide--;
    this.render();
    await this.animateSlideIn('left');
  },

  /**
   * Go to specific slide
   * @param {number} index
   */
  async goToSlide(index) {
    if (isAnimating || index === currentSlide) return;
    if (index < 0 || index >= INTRO_SLIDES.length) return;

    const direction = index > currentSlide ? 'left' : 'right';
    await this.animateSlideOut(direction);
    currentSlide = index;
    this.render();
    await this.animateSlideIn(direction === 'left' ? 'right' : 'left');
  },

  /**
   * Animate slide out
   * @param {string} direction - 'left' or 'right'
   */
  async animateSlideOut(direction) {
    isAnimating = true;

    // Clear current highlight before transition
    this.clearHighlight();

    const tooltip = $('.intro-tooltip', introContainer);
    if (tooltip) {
      addClass(tooltip, `slide-out-${direction}`);
      await waitForTransition(tooltip);
    }
  },

  /**
   * Animate slide in
   * @param {string} direction - 'left' or 'right'
   */
  async animateSlideIn(direction) {
    const tooltip = $('.intro-tooltip', introContainer);
    if (tooltip) {
      addClass(tooltip, `slide-in-${direction}`);
      await nextFrame();
      removeClass(tooltip, `slide-in-${direction}`, 'slide-out-left', 'slide-out-right');
    }
    isAnimating = false;
  },

  /**
   * Complete intro and dismiss
   */
  async complete() {
    isAnimating = true;

    // Mark as completed
    BuildState.completeIntro();

    // Clear any highlights
    this.clearHighlight();

    // Animate out
    removeClass(introContainer, 'active');
    addClass(introContainer, 'closing');

    await waitForTransition(introContainer);

    // Remove from DOM
    if (introContainer && introContainer.parentNode) {
      introContainer.parentNode.removeChild(introContainer);
    }
    introContainer = null;
    currentSlide = 0;
    isAnimating = false;

    // Emit completion event
    BuildState.emit('intro:complete', {});

    console.log('[IntroComponent] Completed');
  },

  /**
   * Show intro (if not completed)
   * @returns {boolean} Whether intro was shown
   */
  show() {
    if (BuildState.data.introCompleted) {
      return false;
    }
    return this.init();
  },

  /**
   * Force show intro (even if completed)
   */
  forceShow() {
    // Reset completion flag temporarily
    const wasCompleted = BuildState.data.introCompleted;
    BuildState.data.introCompleted = false;

    this.init();

    // Restore flag (will be set again on complete)
    if (wasCompleted) {
      BuildState.data.introCompleted = true;
    }
  },

  /**
   * Reset intro state
   */
  reset() {
    currentSlide = 0;
    isAnimating = false;
    BuildState.data.introCompleted = false;
    BuildState.saveToLocal();
  },

  /**
   * Check if intro is visible
   * @returns {boolean}
   */
  isVisible() {
    return introContainer && introContainer.classList.contains('active');
  },

  /**
   * Get current slide index
   * @returns {number}
   */
  getCurrentSlide() {
    return currentSlide;
  }
};

// Export for ES modules
export { IntroComponent };
export default IntroComponent;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.IntroComponent = IntroComponent;
}
