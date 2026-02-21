/**
 * PageController - Base class for all page controllers
 * Provides unified lifecycle, API fetching, DOM manipulation, and event handling
 * Implements Open/Closed Principle (extend, don't modify)
 *
 * Usage:
 * class BurnsPage extends PageController {
 *   constructor() {
 *     super({
 *       stats: '/api/burns/stats',
 *       leaderboard: '/api/leaderboard/burns',
 *     }, {
 *       statsCard: '.stat-card',
 *       table: '#leaderboard-table',
 *     });
 *   }
 *   async render(data) { // Override to customize }
 * }
 *
 * const page = new BurnsPage();
 * page.init();
 *
 * @author CYNIC
 */

import { Store } from './Store.js';

export class PageController {
  /**
   * @param {Object} routes - API endpoint map { name: '/api/endpoint' }
   * @param {Object} selectors - DOM selector map { name: '[selector]' }
   * @param {Object} options - Optional { cache: ttl, debug: bool }
   */
  constructor(routes = {}, selectors = {}, options = {}) {
    this.routes = routes;
    this.selectors = selectors;
    this.cache = new Map();
    this.cacheTtl = options.cache || 600000; // 10 min default
    this.debug = options.debug || false;
    this.store = new Store({ isLoading: false, error: null, data: {} });
    this.elements = {};
    this.listeners = [];

    // Logging helper
    this.log = this.debug ? console.log : () => {};
  }

  /**
   * Initialize page: cache selectors, load data, render
   */
  async init() {
    try {
      this.log('[PageController] Initializing...');

      // Cache DOM elements
      this.cacheElements();

      // Subscribe to store changes
      this.store.subscribe(state => this.onStateChange(state));

      // Load initial data
      await this.loadData();

      // First render
      this.render();

      this.log('[PageController] Initialization complete');
    } catch (error) {
      this.handleError(error, 'init');
    }
  }

  /**
   * Cache frequently-used DOM elements
   */
  cacheElements() {
    for (const [name, selector] of Object.entries(this.selectors)) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`[PageController] Selector not found: ${selector}`);
      }
      this.elements[name] = element;
    }
  }

  /**
   * Fetch data from API endpoint
   * @param {string} key - Route name from routes map
   * @param {Object} options - Fetch options
   * @returns {Promise<any>}
   */
  async fetch(key, options = {}) {
    const url = this.routes[key];
    if (!url) throw new Error(`Route '${key}' not found`);

    // Check cache
    const cached = this.getCached(key);
    if (cached) return cached;

    this.log(`[PageController] Fetching ${key} from ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache result
      this.setCached(key, data);

      return data;
    } catch (error) {
      this.handleError(error, 'fetch', key);
      return null;
    }
  }

  /**
   * Load all configured routes
   */
  async loadData() {
    this.store.dispatch({ type: 'isLoading', payload: true });

    const data = {};
    for (const key of Object.keys(this.routes)) {
      try {
        data[key] = await this.fetch(key);
      } catch (error) {
        this.log(`[PageController] Failed to load ${key}:`, error);
        data[key] = null;
      }
    }

    this.store.dispatch({ type: 'data', payload: data });
    this.store.dispatch({ type: 'isLoading', payload: false });
  }

  /**
   * Render view (override in subclass)
   */
  render() {
    this.log('[PageController] Rendering...');
    // Subclasses implement specific rendering
  }

  /**
   * Called when store state changes
   * @param {Object} state - New state
   */
  onStateChange(state) {
    if (!state.isLoading && state.data) {
      this.render();
    }
  }

  /**
   * Attach event listener with auto-cleanup
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(element, event, handler) {
    if (!element) return;

    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  /**
   * Delegate event listener (event bubbling)
   * @param {string} selector - Target selector
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  onDelegate(selector, event, handler) {
    document.addEventListener(event, e => {
      if (e.target.closest(selector)) {
        handler.call(e.target.closest(selector), e);
      }
    });
  }

  /**
   * Update DOM element safely
   * @param {string} selector - Element key
   * @param {string} content - HTML content (sanitized)
   */
  setText(selector, content) {
    const element = this.elements[selector];
    if (element) {
      element.textContent = content; // Safe - no HTML parsing
    }
  }

  /**
   * Set HTML content (DANGER: sanitize first!)
   * @param {string} selector - Element key
   * @param {string} html - HTML string (must be sanitized)
   */
  setHTML(selector, html) {
    const element = this.elements[selector];
    if (element) {
      element.innerHTML = html;
    }
  }

  /**
   * Cleanup and destroy page
   */
  destroy() {
    this.log('[PageController] Destroying...');

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Clear store
    this.store.clear();

    // Clear cache
    this.cache.clear();

    this.log('[PageController] Destroyed');
  }

  /**
   * Cache management
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }

  setCached(key, value) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Error handling
   * @param {Error} error - Error object
   * @param {string} context - Where error occurred
   * @param {string} detail - Additional detail
   */
  handleError(error, context = 'unknown', detail = '') {
    const message = `[${context}${detail ? ':' + detail : ''}] ${error.message}`;
    console.error(message);

    this.store.dispatch({
      type: 'error',
      payload: { message, context, timestamp: Date.now() },
    });
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return this.store.getState();
  }
}
