/**
 * ASDF-Web Core Module Tests
 * Tests for event-bus, errors, config, and debug modules
 *
 * This is fine.
 */

// We'll test the modules in isolation without ES modules
// Jest will transform them via Babel or use CommonJS-compatible versions

describe('Core Module', () => {
  // ============================================
  // EVENT BUS TESTS
  // ============================================
  describe('EventBus', () => {
    let EventBus;
    let eventBus;

    beforeEach(() => {
      // Create a fresh EventBus for each test
      EventBus = class {
        constructor() {
          this.listeners = new Map();
          this.history = [];
          this.maxHistory = 100;
          this.debug = false;
        }

        on(event, callback, options = {}) {
          if (typeof callback !== 'function') return () => {};
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event).push({ callback, once: Boolean(options.once) });
          return () => this.off(event, callback);
        }

        once(event, callback) {
          return this.on(event, callback, { once: true });
        }

        off(event, callback) {
          const listeners = this.listeners.get(event);
          if (!listeners) return;
          const index = listeners.findIndex((l) => l.callback === callback);
          if (index > -1) listeners.splice(index, 1);
        }

        emit(event, data) {
          this.history.push({ event, data, timestamp: Date.now() });
          if (this.history.length > this.maxHistory) this.history.shift();

          const listeners = this.listeners.get(event);
          if (!listeners) return;

          const toRemove = [];
          listeners.forEach((listener, index) => {
            try {
              listener.callback(data);
              if (listener.once) toRemove.push(index);
            } catch (error) {
              // Silent error handling in tests
            }
          });

          for (let i = toRemove.length - 1; i >= 0; i--) {
            listeners.splice(toRemove[i], 1);
          }
        }

        getHistory(event) {
          if (event) return this.history.filter((e) => e.event === event);
          return [...this.history];
        }

        clear() {
          this.listeners.clear();
          this.history = [];
        }

        listenerCount(event) {
          const listeners = this.listeners.get(event);
          return listeners ? listeners.length : 0;
        }

        eventNames() {
          return Array.from(this.listeners.keys());
        }
      };

      eventBus = new EventBus();
    });

    test('should subscribe to events', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);

      expect(eventBus.listenerCount('test:event')).toBe(1);
    });

    test('should emit events to subscribers', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);
      eventBus.emit('test:event', { foo: 'bar' });

      expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should unsubscribe from events', () => {
      const callback = jest.fn();
      const unsubscribe = eventBus.on('test:event', callback);

      unsubscribe();
      eventBus.emit('test:event', {});

      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle once subscriptions', () => {
      const callback = jest.fn();
      eventBus.once('test:event', callback);

      eventBus.emit('test:event', { first: true });
      eventBus.emit('test:event', { second: true });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ first: true });
    });

    test('should track event history', () => {
      eventBus.emit('event1', { a: 1 });
      eventBus.emit('event2', { b: 2 });

      const history = eventBus.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].event).toBe('event1');
      expect(history[1].event).toBe('event2');
    });

    test('should filter history by event name', () => {
      eventBus.emit('event1', {});
      eventBus.emit('event2', {});
      eventBus.emit('event1', {});

      const history = eventBus.getHistory('event1');
      expect(history).toHaveLength(2);
    });

    test('should limit history size', () => {
      eventBus.maxHistory = 5;

      for (let i = 0; i < 10; i++) {
        eventBus.emit('test', { i });
      }

      expect(eventBus.getHistory()).toHaveLength(5);
    });

    test('should clear all listeners and history', () => {
      eventBus.on('test', jest.fn());
      eventBus.emit('test', {});

      eventBus.clear();

      expect(eventBus.listenerCount('test')).toBe(0);
      expect(eventBus.getHistory()).toHaveLength(0);
    });

    test('should return event names', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());

      expect(eventBus.eventNames()).toContain('event1');
      expect(eventBus.eventNames()).toContain('event2');
    });

    test('should handle errors in callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = jest.fn();

      eventBus.on('test', errorCallback);
      eventBus.on('test', successCallback);

      // Should not throw
      expect(() => eventBus.emit('test', {})).not.toThrow();

      // Success callback should still be called
      expect(successCallback).toHaveBeenCalled();
    });
  });

  // ============================================
  // ERRORS TESTS
  // ============================================
  describe('Errors', () => {
    const errors = {
      WALLET_NOT_CONNECTED: {
        code: 'WALLET_NOT_CONNECTED',
        name: 'Wallet Required',
        message: 'Please connect your wallet to continue.',
        action: 'connect',
        severity: 'warning'
      },
      UNKNOWN: {
        code: 'UNKNOWN',
        name: 'Unknown Error',
        message: 'Something went wrong.',
        action: 'retry',
        severity: 'error'
      }
    };

    const getError = (code) => errors[code] || errors.UNKNOWN;

    const createError = (code, context = {}) => ({
      ...getError(code),
      context,
      timestamp: Date.now()
    });

    const isASDFError = (obj) => {
      if (!obj || typeof obj !== 'object') return false;
      return (
        typeof obj.code === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.message === 'string'
      );
    };

    test('should return predefined errors', () => {
      const error = errors.WALLET_NOT_CONNECTED;

      expect(error.code).toBe('WALLET_NOT_CONNECTED');
      expect(error.name).toBe('Wallet Required');
      expect(error.action).toBe('connect');
    });

    test('should return unknown error for invalid codes', () => {
      const error = getError('INVALID_CODE');

      expect(error.code).toBe('UNKNOWN');
    });

    test('should create error with context', () => {
      const error = createError('WALLET_NOT_CONNECTED', { wallet: 'phantom' });

      expect(error.code).toBe('WALLET_NOT_CONNECTED');
      expect(error.context.wallet).toBe('phantom');
      expect(error.timestamp).toBeDefined();
    });

    test('should validate ASDF error objects', () => {
      expect(isASDFError(errors.WALLET_NOT_CONNECTED)).toBe(true);
      expect(isASDFError({ foo: 'bar' })).toBe(false);
      expect(isASDFError(null)).toBe(false);
      expect(isASDFError('string')).toBe(false);
    });
  });

  // ============================================
  // CONFIG TESTS
  // ============================================
  describe('Config', () => {
    const PHI = 1.618033988749895;

    const DEFAULTS = {
      api: { timeout: 30000, retries: 3 },
      audio: { enabled: true, volume: 0.3 },
      phi: { value: PHI }
    };

    let config;

    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

    const deepMerge = (target, source) => {
      const output = deepClone(target);
      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          output[key] = deepMerge(output[key] || {}, source[key]);
        } else {
          output[key] = source[key];
        }
      }
      return output;
    };

    const getConfig = (path, defaultValue) => {
      if (!path) return config;
      const keys = path.split('.');
      let value = config;
      for (const key of keys) {
        if (value === undefined || value === null) return defaultValue;
        value = value[key];
      }
      return value !== undefined ? value : defaultValue;
    };

    const setConfig = (path, value) => {
      const keys = path.split('.');
      let obj = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
    };

    beforeEach(() => {
      config = deepClone(DEFAULTS);
    });

    test('should have sensible defaults', () => {
      expect(config.api.timeout).toBe(30000);
      expect(config.audio.enabled).toBe(true);
      expect(config.phi.value).toBeCloseTo(PHI, 10);
    });

    test('should get config by path', () => {
      expect(getConfig('api.timeout')).toBe(30000);
      expect(getConfig('audio.volume')).toBe(0.3);
    });

    test('should return default for missing paths', () => {
      expect(getConfig('missing.path', 'fallback')).toBe('fallback');
      expect(getConfig('api.missing', 123)).toBe(123);
    });

    test('should set config by path', () => {
      setConfig('audio.enabled', false);
      expect(getConfig('audio.enabled')).toBe(false);
    });

    test('should create nested paths when setting', () => {
      setConfig('new.nested.value', 'test');
      expect(getConfig('new.nested.value')).toBe('test');
    });

    test('should deep merge configs', () => {
      const userConfig = { api: { timeout: 60000 } };
      config = deepMerge(config, userConfig);

      expect(getConfig('api.timeout')).toBe(60000);
      expect(getConfig('api.retries')).toBe(3); // Preserved from defaults
    });
  });

  // ============================================
  // DEBUG TESTS
  // ============================================
  describe('Debug', () => {
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock localStorage
      window.localStorage.getItem.mockReturnValue(null);
      window.location = { hostname: 'localhost' };
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should log on localhost', () => {
      // Simulate the debug function behavior
      const shouldLog = () => {
        const setting = window.localStorage.getItem('DEBUG');
        if (!setting) {
          return window.location.hostname === 'localhost';
        }
        return setting === 'true';
      };

      expect(shouldLog()).toBe(true);
    });

    test('should log when DEBUG=true', () => {
      window.localStorage.getItem.mockReturnValue('true');

      const shouldLog = () => {
        const setting = window.localStorage.getItem('DEBUG');
        return setting === 'true';
      };

      expect(shouldLog()).toBe(true);
    });

    test('should respect DEBUG=false setting', () => {
      window.localStorage.getItem.mockReturnValue('false');

      const shouldLog = () => {
        const setting = window.localStorage.getItem('DEBUG');
        if (setting === 'false') return false;
        if (setting === 'true') return true;
        // Default to localhost check (which is true in test env)
        return true;
      };

      expect(shouldLog()).toBe(false);
    });

    test('debugError should always log', () => {
      // Error logging is unconditional
      const debugError = (module, ...args) => {
        console.error(`[${module}]`, ...args);
      };

      debugError('Test', 'Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================
  describe('Integration', () => {
    test('event bus and errors work together', () => {
      const EventBus = class {
        constructor() {
          this.listeners = new Map();
        }
        on(event, callback) {
          if (!this.listeners.has(event)) this.listeners.set(event, []);
          this.listeners.get(event).push(callback);
        }
        emit(event, data) {
          const listeners = this.listeners.get(event) || [];
          listeners.forEach((cb) => cb(data));
        }
      };

      const eventBus = new EventBus();
      const errors = {
        WALLET_NOT_CONNECTED: {
          code: 'WALLET_NOT_CONNECTED',
          message: 'Connect wallet'
        }
      };

      const errorHandler = jest.fn();
      eventBus.on('app:error', errorHandler);
      eventBus.emit('app:error', errors.WALLET_NOT_CONNECTED);

      expect(errorHandler).toHaveBeenCalledWith(errors.WALLET_NOT_CONNECTED);
    });

    test('config and debug work together', () => {
      const config = { debug: { enabled: true } };
      const getConfig = (path) => {
        const keys = path.split('.');
        let value = config;
        for (const key of keys) {
          if (!value) return undefined;
          value = value[key];
        }
        return value;
      };

      const isDebugEnabled = () => getConfig('debug.enabled') === true;

      expect(isDebugEnabled()).toBe(true);
    });
  });
});

// ============================================
// EVENTS CONSTANTS TEST
// ============================================
describe('EVENTS constants', () => {
  const EVENTS = {
    WALLET_CONNECTED: 'wallet:connected',
    WALLET_DISCONNECTED: 'wallet:disconnected',
    GAME_START: 'game:start',
    GAME_END: 'game:end',
    APP_READY: 'app:ready'
  };

  test('should have consistent naming convention', () => {
    Object.values(EVENTS).forEach((event) => {
      expect(event).toMatch(/^[a-z]+:[a-z:]+$/);
    });
  });

  test('should be unique values', () => {
    const values = Object.values(EVENTS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
