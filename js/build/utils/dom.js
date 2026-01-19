/**
 * Build V2 - DOM Utilities
 * Helper functions for DOM manipulation
 *
 * @version 2.0.0
 */

'use strict';

import { safeInnerHTML, safeTextContent, sanitizeHtml } from './security.js';

// Re-export security functions for convenience
export { safeInnerHTML, safeTextContent, sanitizeHtml };

// ============================================
// ELEMENT SELECTION
// ============================================

/**
 * Query single element (shorthand for querySelector)
 * @param {string} selector - CSS selector
 * @param {Element|Document} context - Query context
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Query multiple elements (shorthand for querySelectorAll)
 * @param {string} selector - CSS selector
 * @param {Element|Document} context - Query context
 * @returns {Element[]}
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Get element by ID
 * @param {string} id - Element ID
 * @returns {Element|null}
 */
export function byId(id) {
  return document.getElementById(id);
}

// ============================================
// CLASS MANIPULATION
// ============================================

/**
 * Add class to element
 * @param {Element} el - DOM element
 * @param {...string} classNames - Class names to add
 */
export function addClass(el, ...classNames) {
  if (!el) return;
  el.classList.add(...classNames.filter(Boolean));
}

/**
 * Remove class from element
 * @param {Element} el - DOM element
 * @param {...string} classNames - Class names to remove
 */
export function removeClass(el, ...classNames) {
  if (!el) return;
  el.classList.remove(...classNames.filter(Boolean));
}

/**
 * Toggle class on element
 * @param {Element} el - DOM element
 * @param {string} className - Class name to toggle
 * @param {boolean} [force] - Force add or remove
 * @returns {boolean} Whether class is now present
 */
export function toggleClass(el, className, force) {
  if (!el || !className) return false;
  return el.classList.toggle(className, force);
}

/**
 * Check if element has class
 * @param {Element} el - DOM element
 * @param {string} className - Class name to check
 * @returns {boolean}
 */
export function hasClass(el, className) {
  if (!el || !className) return false;
  return el.classList.contains(className);
}

// ============================================
// ELEMENT CREATION
// ============================================

/**
 * Create element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @param {(string|Element)[]} children - Child elements or text
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        el.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
    } else if (value !== null && value !== undefined) {
      el.setAttribute(key, value);
    }
  });

  // Append children
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Element) {
      el.appendChild(child);
    }
  });

  return el;
}

/**
 * Create element from HTML string (sanitized)
 * @param {string} html - HTML string
 * @returns {Element}
 */
export function createFromHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = sanitizeHtml(html.trim());
  return template.content.firstChild;
}

// ============================================
// ELEMENT MANIPULATION
// ============================================

/**
 * Show element
 * @param {Element} el - DOM element
 */
export function show(el) {
  if (!el) return;
  el.style.display = '';
  el.hidden = false;
}

/**
 * Hide element
 * @param {Element} el - DOM element
 */
export function hide(el) {
  if (!el) return;
  el.style.display = 'none';
  el.hidden = true;
}

/**
 * Remove element from DOM
 * @param {Element} el - DOM element
 */
export function remove(el) {
  if (!el || !el.parentNode) return;
  el.parentNode.removeChild(el);
}

/**
 * Empty element contents
 * @param {Element} el - DOM element
 */
export function empty(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Replace element contents with text
 * @param {Element} el - DOM element
 * @param {string} text - Text content
 */
export function setText(el, text) {
  safeTextContent(el, text);
}

/**
 * Replace element contents with HTML (sanitized)
 * @param {Element} el - DOM element
 * @param {string} html - HTML content
 */
export function setHtml(el, html) {
  safeInnerHTML(el, html);
}

// ============================================
// ATTRIBUTES
// ============================================

/**
 * Get data attribute value
 * @param {Element} el - DOM element
 * @param {string} key - Data attribute key (without 'data-' prefix)
 * @returns {string|undefined}
 */
export function getData(el, key) {
  if (!el) return undefined;
  return el.dataset[key];
}

/**
 * Set data attribute
 * @param {Element} el - DOM element
 * @param {string} key - Data attribute key
 * @param {string} value - Data attribute value
 */
export function setData(el, key, value) {
  if (!el) return;
  el.dataset[key] = value;
}

/**
 * Set multiple styles
 * @param {Element} el - DOM element
 * @param {Object} styles - Style object
 */
export function setStyles(el, styles) {
  if (!el || typeof styles !== 'object') return;
  Object.assign(el.style, styles);
}

// ============================================
// EVENTS
// ============================================

/**
 * Add event listener with automatic cleanup
 * @param {Element|Window|Document} el - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - Event options
 * @returns {Function} Cleanup function
 */
export function on(el, event, handler, options = {}) {
  if (!el || !event || typeof handler !== 'function') {
    return () => {};
  }
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
}

/**
 * Add one-time event listener
 * @param {Element} el - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 */
export function once(el, event, handler) {
  return on(el, event, handler, { once: true });
}

/**
 * Remove event listener
 * @param {Element} el - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - Event options
 */
export function off(el, event, handler, options = {}) {
  if (!el || !event || typeof handler !== 'function') return;
  el.removeEventListener(event, handler, options);
}

/**
 * Delegate event handling
 * @param {Element} container - Container element
 * @param {string} event - Event name
 * @param {string} selector - CSS selector for delegation
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function delegate(container, event, selector, handler) {
  if (!container || !event || !selector || typeof handler !== 'function') {
    return () => {};
  }

  const delegateHandler = (e) => {
    const target = e.target.closest(selector);
    if (target && container.contains(target)) {
      handler.call(target, e, target);
    }
  };

  container.addEventListener(event, delegateHandler);
  return () => container.removeEventListener(event, delegateHandler);
}

// ============================================
// ANIMATION
// ============================================

/**
 * Wait for CSS transition to complete
 * @param {Element} el - DOM element
 * @returns {Promise}
 */
export function waitForTransition(el) {
  return new Promise(resolve => {
    if (!el) {
      resolve();
      return;
    }

    const handler = () => {
      el.removeEventListener('transitionend', handler);
      resolve();
    };

    el.addEventListener('transitionend', handler);

    // Fallback timeout
    setTimeout(handler, 1000);
  });
}

/**
 * Request animation frame as promise
 * @returns {Promise<number>} Frame timestamp
 */
export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

// ============================================
// SCROLL
// ============================================

/**
 * Scroll element into view smoothly
 * @param {Element} el - DOM element
 * @param {Object} options - Scroll options
 */
export function scrollIntoView(el, options = {}) {
  if (!el) return;
  el.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    ...options
  });
}

/**
 * Scroll to top of page
 */
export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
export function debounce(fn, delay = 150) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit in ms
 * @returns {Function}
 */
export function throttle(fn, limit = 100) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================
// EXPORTS FOR NON-MODULE ENVIRONMENTS
// ============================================

if (typeof window !== 'undefined') {
  window.BuildDOM = {
    $,
    $$,
    byId,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    createElement,
    createFromHtml,
    show,
    hide,
    remove,
    empty,
    setText,
    setHtml,
    getData,
    setData,
    setStyles,
    on,
    once,
    delegate,
    waitForTransition,
    nextFrame,
    scrollIntoView,
    scrollToTop,
    debounce,
    throttle
  };
}
