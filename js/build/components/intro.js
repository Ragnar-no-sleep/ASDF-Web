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
// INTRO SLIDES
// ============================================

const INTRO_SLIDES = [
  {
    id: 'welcome',
    icon: '\uD83C\uDF33', // 🌳
    title: 'Welcome to Yggdrasil',
    subtitle: 'The World Tree of ASDF',
    description: 'Every project in our ecosystem is connected, supporting and strengthening each other.',
    cta: 'Continue'
  },
  {
    id: 'explore',
    icon: '\uD83D\uDD25', // 🔥
    title: 'Explore the Ecosystem',
    subtitle: 'Click any realm to learn more',
    description: 'From the Burn Engine at the heart to the growing branches of new projects.',
    cta: 'Got it'
  },
  {
    id: 'build',
    icon: '\uD83D\uDEE0\uFE0F', // 🛠️
    title: 'Ready to Build?',
    subtitle: 'Find your path',
    description: 'Take our quiz to discover which track fits your skills and interests.',
    cta: 'Start Exploring'
  }
];

// ============================================
// INTRO STATE
// ============================================

let introContainer = null;
let currentSlide = 0;
let isAnimating = false;

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
   * Render intro content
   */
  render() {
    const slide = INTRO_SLIDES[currentSlide];
    if (!slide) return;

    // Generate dots
    const dots = INTRO_SLIDES.map((_, i) => {
      const activeClass = i === currentSlide ? 'active' : '';
      const doneClass = i < currentSlide ? 'done' : '';
      return `<span class="intro-dot ${activeClass} ${doneClass}" data-slide="${i}"></span>`;
    }).join('');

    const html = `
      <div class="intro-backdrop"></div>
      <div class="intro-card">
        <button class="intro-skip" aria-label="Skip intro">Skip</button>
        <div class="intro-content">
          <div class="intro-icon">${sanitizeText(slide.icon)}</div>
          <h1 class="intro-title">${sanitizeText(slide.title)}</h1>
          <p class="intro-subtitle">${sanitizeText(slide.subtitle)}</p>
          <p class="intro-description">${sanitizeText(slide.description)}</p>
        </div>
        <div class="intro-footer">
          <div class="intro-dots">${dots}</div>
          <button class="intro-cta">${sanitizeText(slide.cta)}</button>
        </div>
      </div>
    `;

    introContainer.innerHTML = html;

    // Animate in
    requestAnimationFrame(() => {
      addClass(introContainer, 'active');
    });
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
    const card = $('.intro-card', introContainer);
    if (card) {
      addClass(card, `slide-out-${direction}`);
      await waitForTransition(card);
    }
  },

  /**
   * Animate slide in
   * @param {string} direction - 'left' or 'right'
   */
  async animateSlideIn(direction) {
    const card = $('.intro-card', introContainer);
    if (card) {
      addClass(card, `slide-in-${direction}`);
      await nextFrame();
      removeClass(card, `slide-in-${direction}`, 'slide-out-left', 'slide-out-right');
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
