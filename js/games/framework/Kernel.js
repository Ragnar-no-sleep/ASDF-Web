/**
 * ASDF Arcade Kernel 3.0
 * Central orchestrator for the modular game ecosystem.
 *
 * Responsibilities:
 * - Plugin management (Middleware pattern)
 * - Global Event Bus (Pub/Sub)
 * - Service discovery (API, Assets, Storage)
 * - Game lifecycle coordination
 */

'use strict';

(function () {
  class ArcadeKernel {
    constructor() {
      this.version = '3.0.0';
      this.plugins = new Map();
      this.eventBus = new EventTarget();
      this.registry = window.GameRegistry;
      this.activeInstance = null;
      this.services = {};
      this.booted = false;

      console.log(
        `%c 🎮 Arcade Kernel ${this.version} initialized `,
        'background: #4c1d95; color: #fff; font-weight: bold;'
      );

      // Bridge legacy GameEvents if available
      this._setupLegacyBridge();
    }

    _setupLegacyBridge() {
      if (typeof window.GameEvents !== 'undefined') {
        const legacyEmit = window.GameEvents.emit.bind(window.GameEvents);
        window.GameEvents.emit = (event, data) => {
          legacyEmit(event, data);
          this.emit(event, data);
        };
        console.log('[ArcadeKernel] Legacy GameEvents bridged');
      }
    }

    /**
     * Register and initialize a plugin
     * @param {Object} plugin - Object with { name, init: fn, ... }
     */
    use(plugin) {
      if (!plugin || typeof plugin !== 'object' || !plugin.name) {
        console.error('[ArcadeKernel] Plugin must be an object with a unique "name" property.');
        return this;
      }

      if (this.plugins.has(plugin.name)) {
        console.warn(`[ArcadeKernel] Plugin "${plugin.name}" is already registered.`);
        return this;
      }

      try {
        if (typeof plugin.init === 'function') {
          plugin.init(this);
        }
        this.plugins.set(plugin.name, plugin);
        console.log(`[ArcadeKernel] Plugin loaded: ${plugin.name}`);
      } catch (e) {
        console.error(`[ArcadeKernel] Failed to load plugin "${plugin.name}":`, e);
      }

      return this;
    }

    /**
     * Get a registered plugin by name
     * @param {string} name
     */
    getPlugin(name) {
      return this.plugins.get(name);
    }

    /**
     * Register a shared service (Storage, API, etc)
     * @param {string} name
     * @param {Object} service
     */
    registerService(name, service) {
      this.services[name] = service;
      console.log(`[ArcadeKernel] Service registered: ${name}`);
      return this;
    }

    /**
     * Dispatch a global event
     * @param {string} eventName
     * @param {any} detail
     */
    emit(eventName, detail = {}) {
      this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    /**
     * Subscribe to a global event
     * @param {string} eventName
     * @param {Function} callback
     */
    on(eventName, callback) {
      const wrappedCallback = e => callback(e.detail);
      this.eventBus.addEventListener(eventName, wrappedCallback);
      return () => this.eventBus.removeEventListener(eventName, wrappedCallback);
    }

    /**
     * Start a game engine
     * @param {string} gameId
     * @param {HTMLElement} container
     */
    async launch(gameId, container) {
      if (!this.registry) {
        console.error('[ArcadeKernel] GameRegistry not found.');
        return;
      }

      const engine = this.registry.get(gameId);
      if (!engine) {
        throw new Error(`[ArcadeKernel] Game engine "${gameId}" not found in registry.`);
      }

      console.log(`[ArcadeKernel] Launching game: ${gameId}`);
      this.emit('game:before-launch', { gameId });

      try {
        // Stop previous instance if exists
        if (this.activeInstance) {
          this.activeInstance.stop();
        }

        // Standardized engine start
        const instance = await engine.start(gameId, container);
        this.activeInstance = instance;

        this.emit('game:after-launch', { gameId, instance });
        return instance;
      } catch (e) {
        console.error(`[ArcadeKernel] Launch error for "${gameId}":`, e);
        this.emit('game:error', { gameId, error: e });
        throw e;
      }
    }

    /**
     * Global cleanup
     */
    shutdown() {
      if (this.activeInstance) {
        this.activeInstance.stop();
        this.activeInstance = null;
      }
      this.emit('kernel:shutdown');
    }
  }

  // Create singleton
  window.ASDF = window.ASDF || {};
  window.ASDF.Kernel = new ArcadeKernel();

  // Backwards compat / convenience
  window.ArcadeKernel = window.ASDF.Kernel;
})();
