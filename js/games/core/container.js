/**
 * ASDF Games - Service Container (PSR-11 Style)
 *
 * Dependency injection container for managing services.
 * Follows PSR-11 ContainerInterface pattern from PHP-FIG.
 *
 * Usage:
 *   GameServices.register('config', () => loadConfig());
 *   GameServices.register('api', (c) => new ApiClient(c.get('config')));
 *   const api = GameServices.get('api');
 */

'use strict';

const GameServices = {
  /** @type {Map<string, Function>} Service factories */
  _factories: new Map(),

  /** @type {Map<string, any>} Resolved instances (lazy singleton) */
  _instances: new Map(),

  /** @type {Set<string>} Currently resolving (circular dependency detection) */
  _resolving: new Set(),

  /** @type {boolean} Container locked after boot */
  _locked: false,

  /**
   * Register a service factory
   * @param {string} id - Service identifier
   * @param {Function} factory - Factory function (receives container)
   * @throws {Error} If container is locked or id already registered
   */
  register(id, factory) {
    if (this._locked) {
      throw new Error(`[GameServices] Container locked, cannot register '${id}'`);
    }
    if (typeof id !== 'string' || !id) {
      throw new Error('[GameServices] Service id must be a non-empty string');
    }
    if (typeof factory !== 'function') {
      throw new Error(`[GameServices] Factory for '${id}' must be a function`);
    }
    if (this._factories.has(id)) {
      console.warn(`[GameServices] Overwriting service '${id}'`);
    }
    this._factories.set(id, factory);
  },

  /**
   * Register a constant value (no factory)
   * @param {string} id - Service identifier
   * @param {any} value - Constant value
   */
  constant(id, value) {
    this.register(id, () => value);
    // Pre-resolve constants immediately
    this._instances.set(id, value);
  },

  /**
   * Get a service instance (PSR-11 get)
   * @param {string} id - Service identifier
   * @returns {any} Service instance
   * @throws {Error} If service not found or circular dependency
   */
  get(id) {
    // Return cached instance if available
    if (this._instances.has(id)) {
      return this._instances.get(id);
    }

    // Check if service is registered
    if (!this._factories.has(id)) {
      throw new Error(`[GameServices] Service '${id}' not found`);
    }

    // Circular dependency detection
    if (this._resolving.has(id)) {
      const chain = Array.from(this._resolving).join(' -> ');
      throw new Error(`[GameServices] Circular dependency: ${chain} -> ${id}`);
    }

    // Resolve service
    this._resolving.add(id);
    try {
      const factory = this._factories.get(id);
      const instance = factory(this);
      this._instances.set(id, instance);
      return instance;
    } finally {
      this._resolving.delete(id);
    }
  },

  /**
   * Check if service is registered (PSR-11 has)
   * @param {string} id - Service identifier
   * @returns {boolean}
   */
  has(id) {
    return this._factories.has(id);
  },

  /**
   * Lock container (prevent further registrations)
   */
  lock() {
    this._locked = true;
    console.log('[GameServices] Container locked');
  },

  /**
   * Boot all registered services (eager loading)
   * @param {string[]} [eager=[]] - Services to eagerly resolve
   */
  boot(eager = []) {
    eager.forEach(id => {
      if (this.has(id)) {
        this.get(id);
      }
    });
    this.lock();
  },

  /**
   * Get list of registered service IDs
   * @returns {string[]}
   */
  keys() {
    return Array.from(this._factories.keys());
  },

  /**
   * Get container stats
   * @returns {Object}
   */
  stats() {
    return {
      registered: this._factories.size,
      resolved: this._instances.size,
      locked: this._locked,
    };
  },

  /**
   * Reset container (testing only)
   */
  reset() {
    this._factories.clear();
    this._instances.clear();
    this._resolving.clear();
    this._locked = false;
  },
};

// Freeze the container interface
Object.freeze(GameServices);

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameServices = GameServices;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameServices };
}
