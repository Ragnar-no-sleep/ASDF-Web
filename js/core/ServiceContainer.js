/**
 * ServiceContainer - Dependency Injection / Service Locator
 * Manages service registration and instantiation with lifecycle control
 *
 * Usage:
 * const container = new ServiceContainer();
 * container.register('api', () => new ApiClient('/api'), 'singleton');
 * const api = container.get('api'); // Returns same instance
 *
 * @author CYNIC
 */

export class ServiceContainer {
  constructor() {
    this._services = new Map();
    this._singletons = new Map();
  }

  /**
   * Register a service factory in the container
   * @param {string} name - Service name
   * @param {Function} factory - Function that returns service instance
   * @param {string} lifecycle - 'singleton' (cached) or 'transient' (new each time)
   */
  register(name, factory, lifecycle = 'transient') {
    if (typeof factory !== 'function') {
      throw new TypeError(`Factory for '${name}' must be a function`);
    }
    if (!['singleton', 'transient'].includes(lifecycle)) {
      throw new Error(`Lifecycle must be 'singleton' or 'transient', got '${lifecycle}'`);
    }
    this._services.set(name, { factory, lifecycle });
  }

  /**
   * Get a service instance from the container
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  get(name) {
    if (!this._services.has(name)) {
      throw new Error(`Service '${name}' not found in container`);
    }

    // Return cached singleton if exists
    if (this._singletons.has(name)) {
      return this._singletons.get(name);
    }

    const { factory, lifecycle } = this._services.get(name);

    try {
      const instance = factory(this);

      // Cache singleton
      if (lifecycle === 'singleton') {
        this._singletons.set(name, instance);
      }

      return instance;
    } catch (error) {
      throw new Error(`Failed to instantiate service '${name}': ${error.message}`, {
        cause: error,
      });
    }
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this._services.has(name);
  }

  /**
   * Clear all cached singletons (useful for testing)
   */
  clear() {
    this._singletons.clear();
  }

  /**
   * Get all registered service names
   * @returns {string[]}
   */
  getRegistered() {
    return Array.from(this._services.keys());
  }
}

/**
 * Global service container instance
 * Use with caution - prefer dependency injection
 */
export const globalContainer = new ServiceContainer();
