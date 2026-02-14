/**
 * ASDF Interactions Module
 * Visceral micro-interactions for immersive UX
 *
 * Features:
 * - Ripple effects on click
 * - Haptic feedback (if supported)
 * - Scale animations on hover
 * - Smooth scroll with parallax
 *
 * Usage:
 *   import { initInteractions } from './utils/interactions.js';
 *   initInteractions();
 */

// ============================================
// RIPPLE EFFECT
// ============================================

/**
 * Creates a ripple effect on click
 * @param {HTMLElement} element - Element to attach ripple to
 * @param {Event} event - Click event
 */
function createRipple(element, event) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();

  // Position ripple at click location
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.classList.add('ripple');

  // Add to element
  element.appendChild(ripple);

  // Remove after animation
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/**
 * Attaches ripple effect to elements
 * @param {string} selector - CSS selector for interactive elements
 */
export function initRipples(selector = '.ripple-trigger') {
  const elements = document.querySelectorAll(selector);

  elements.forEach(element => {
    // Ensure element has position context
    const position = window.getComputedStyle(element).position;
    if (position === 'static') {
      element.style.position = 'relative';
    }

    element.addEventListener('click', e => {
      createRipple(element, e);
    });
  });
}

// ============================================
// HAPTIC FEEDBACK
// ============================================

/**
 * Triggers haptic feedback (if supported)
 * @param {string} type - 'light', 'medium', 'heavy'
 */
export function hapticFeedback(type = 'light') {
  // Check for Vibration API support
  if (!navigator.vibrate) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    error: [50, 100, 50],
  };

  navigator.vibrate(patterns[type] || patterns.light);
}

/**
 * Attaches haptic feedback to interactive elements
 * @param {string} selector - CSS selector
 * @param {string} type - Haptic type
 */
export function initHaptics(selector = '.haptic-trigger', type = 'light') {
  const elements = document.querySelectorAll(selector);

  elements.forEach(element => {
    element.addEventListener('click', () => {
      hapticFeedback(type);
    });
  });
}

// ============================================
// HOVER SCALE
// ============================================

/**
 * Adds subtle scale effect on hover
 * @param {string} selector - CSS selector
 * @param {number} scale - Scale multiplier (default: 1.02)
 */
export function initHoverScale(selector = '.hover-scale', scale = 1.02) {
  const elements = document.querySelectorAll(selector);

  elements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      element.style.transform = `scale(${scale})`;
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(1)';
    });
  });
}

// ============================================
// SMOOTH SCROLL WITH PARALLAX
// ============================================

let ticking = false;

/**
 * Parallax scroll effect
 * @param {string} selector - Elements to parallax
 * @param {number} speed - Parallax speed (0.1 = slow, 1 = fast)
 */
export function initParallax(selector = '.parallax', speed = 0.3) {
  const elements = document.querySelectorAll(selector);

  if (elements.length === 0) return;

  function updateParallax() {
    const scrollY = window.pageYOffset;

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + scrollY;
      const offset = (scrollY - elementTop) * speed;

      element.style.transform = `translateY(${offset}px)`;
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  });
}

// ============================================
// GLOW PULSE ON HOVER
// ============================================

/**
 * Adds glow effect on hover
 * @param {string} selector - CSS selector
 */
export function initGlowHover(selector = '.glow-hover') {
  const elements = document.querySelectorAll(selector);

  elements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      element.classList.add('glow-active');
    });

    element.addEventListener('mouseleave', () => {
      element.classList.remove('glow-active');
    });
  });
}

// ============================================
// PROGRESSIVE COUNTER
// ============================================

/**
 * Animates a number from start to end
 * @param {HTMLElement} element - Element to update
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Animation duration (ms)
 */
export function animateCounter(element, start, end, duration = 1000) {
  const startTime = performance.now();
  const diff = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + diff * easeOut;

    element.textContent = Math.round(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ============================================
// MAIN INIT
// ============================================

/**
 * Initialize all interactions
 * @param {Object} options - Configuration options
 */
export function initInteractions(options = {}) {
  const defaults = {
    ripples: true,
    haptics: true,
    hoverScale: true,
    parallax: true,
    glowHover: true,
    ripplesSelector: 'button, .btn, .card, .ripple-trigger',
    hapticsSelector: 'button, .btn, .haptic-trigger',
    hoverScaleSelector: 'button, .btn, .card, .hover-scale',
    parallaxSelector: '.parallax',
    glowHoverSelector: '.glow-hover',
  };

  const config = { ...defaults, ...options };

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(config));
  } else {
    init(config);
  }
}

function init(config) {
  if (config.ripples) {
    initRipples(config.ripplesSelector);
  }

  if (config.haptics) {
    initHaptics(config.hapticsSelector);
  }

  if (config.hoverScale) {
    initHoverScale(config.hoverScaleSelector);
  }

  if (config.parallax) {
    initParallax(config.parallaxSelector);
  }

  if (config.glowHover) {
    initGlowHover(config.glowHoverSelector);
  }

  console.log('🎯 ASDF Interactions initialized');
}

// Auto-init if data attribute present
if (document.querySelector('[data-asdf-interactions]')) {
  initInteractions();
}
