/**
 * ASDF Games - Legacy Facades
 *
 * Provides backward compatibility by exposing global variables
 * that delegate to the service container. This allows existing
 * code to continue working while new code uses DI.
 *
 * Migration path:
 *   1. Old code: CONFIG.API_BASE (works via Proxy)
 *   2. New code: GameServices.get('config').API_BASE
 *   3. Future: Remove facades, use DI everywhere
 */

'use strict';

/**
 * Create a proxy facade for a service
 * @param {string} serviceId - Service ID in container
 * @param {string} globalName - Global variable name for logging
 * @returns {Proxy}
 */
function createFacade(serviceId, globalName) {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === Symbol.toStringTag) return globalName;
        if (prop === '__isFacade__') return true;
        if (prop === '__serviceId__') return serviceId;

        if (!GameServices.has(serviceId)) {
          console.warn(`[Facade] Service '${serviceId}' not registered yet`);
          return undefined;
        }

        const service = GameServices.get(serviceId);
        const value = service[prop];

        // Bind functions to preserve 'this' context
        if (typeof value === 'function') {
          return value.bind(service);
        }
        return value;
      },

      set(target, prop, value) {
        if (!GameServices.has(serviceId)) {
          console.warn(`[Facade] Cannot set '${prop}' - service '${serviceId}' not registered`);
          return false;
        }
        const service = GameServices.get(serviceId);
        service[prop] = value;
        return true;
      },

      has(target, prop) {
        if (!GameServices.has(serviceId)) return false;
        const service = GameServices.get(serviceId);
        return prop in service;
      },

      ownKeys() {
        if (!GameServices.has(serviceId)) return [];
        const service = GameServices.get(serviceId);
        return Reflect.ownKeys(service);
      },

      getOwnPropertyDescriptor(target, prop) {
        if (!GameServices.has(serviceId)) return undefined;
        const service = GameServices.get(serviceId);
        return Object.getOwnPropertyDescriptor(service, prop);
      },
    }
  );
}

/**
 * Create a read-only facade (for constants like GAMES)
 * @param {string} serviceId - Service ID in container
 * @param {string} globalName - Global variable name
 * @returns {Proxy}
 */
function createReadOnlyFacade(serviceId, globalName) {
  return new Proxy([], {
    get(target, prop) {
      if (prop === Symbol.toStringTag) return globalName;
      if (prop === '__isFacade__') return true;
      if (prop === '__serviceId__') return serviceId;

      if (!GameServices.has(serviceId)) {
        console.warn(`[Facade] Service '${serviceId}' not registered yet`);
        return undefined;
      }

      const service = GameServices.get(serviceId);

      // Handle array methods
      if (typeof prop === 'symbol' || prop === 'length') {
        return service[prop];
      }

      // Handle numeric indices
      if (!isNaN(prop)) {
        return service[prop];
      }

      const value = service[prop];
      if (typeof value === 'function') {
        return value.bind(service);
      }
      return value;
    },

    set() {
      console.warn(`[Facade] '${globalName}' is read-only`);
      return false;
    },

    has(target, prop) {
      if (!GameServices.has(serviceId)) return false;
      const service = GameServices.get(serviceId);
      return prop in service;
    },
  });
}

/**
 * Install legacy facades as globals
 * Call this after registering core services
 */
function installFacades() {
  // Only install if globals don't exist or are already facades
  const globals = [
    { name: 'CONFIG', serviceId: 'config', readOnly: false },
    { name: 'GAMES', serviceId: 'games', readOnly: true },
    { name: 'REWARD_SLOTS', serviceId: 'rewardSlots', readOnly: true },
  ];

  globals.forEach(({ name, serviceId, readOnly }) => {
    // Skip if real global already exists and isn't a facade
    if (typeof window[name] !== 'undefined' && !window[name]?.__isFacade__) {
      console.log(`[Facade] Keeping original '${name}' (not a facade)`);
      return;
    }

    if (GameServices.has(serviceId)) {
      window[name] = readOnly
        ? createReadOnlyFacade(serviceId, name)
        : createFacade(serviceId, name);
      console.log(`[Facade] Installed '${name}' -> '${serviceId}'`);
    }
  });
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.createFacade = createFacade;
  window.createReadOnlyFacade = createReadOnlyFacade;
  window.installFacades = installFacades;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createFacade, createReadOnlyFacade, installFacades };
}
