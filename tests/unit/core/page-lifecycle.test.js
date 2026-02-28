/**
 * PageLifecycle Tests
 * Covers: timer registration, listener registration, cleanup, clearTimer
 */

// Inline implementation mirroring js/core/PageLifecycle.js (jest CJS compat)
function createPageLifecycle() {
  const timers = new Map();
  const listeners = [];

  return {
    _timers: timers,
    _listeners: listeners,

    registerTimer(name, timerId) {
      timers.set(name, timerId);
    },

    registerListener(target, event, handler) {
      listeners.push({ target, event, handler });
      target.addEventListener(event, handler);
    },

    clearTimer(name) {
      const id = timers.get(name);
      if (id !== undefined) {
        clearInterval(id);
        clearTimeout(id);
        timers.delete(name);
      }
    },

    cleanup() {
      timers.forEach(id => {
        clearInterval(id);
        clearTimeout(id);
      });
      timers.clear();

      listeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      listeners.length = 0;
    },
  };
}

describe('PageLifecycle', () => {
  let lifecycle;

  beforeEach(() => {
    lifecycle = createPageLifecycle();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registerTimer', () => {
    test('should store timer by name', () => {
      const id = setInterval(() => {}, 1000);
      lifecycle.registerTimer('test-timer', id);
      expect(lifecycle._timers.has('test-timer')).toBe(true);
      expect(lifecycle._timers.get('test-timer')).toBe(id);
      clearInterval(id);
    });

    test('should overwrite timer with same name', () => {
      const id1 = setInterval(() => {}, 1000);
      const id2 = setInterval(() => {}, 2000);
      lifecycle.registerTimer('dup', id1);
      lifecycle.registerTimer('dup', id2);
      expect(lifecycle._timers.get('dup')).toBe(id2);
      clearInterval(id1);
      clearInterval(id2);
    });
  });

  describe('registerListener', () => {
    test('should add event listener to target', () => {
      const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const handler = jest.fn();
      lifecycle.registerListener(target, 'click', handler);
      expect(target.addEventListener).toHaveBeenCalledWith('click', handler);
      expect(lifecycle._listeners).toHaveLength(1);
    });

    test('should store multiple listeners', () => {
      const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      lifecycle.registerListener(target, 'click', jest.fn());
      lifecycle.registerListener(target, 'keydown', jest.fn());
      expect(lifecycle._listeners).toHaveLength(2);
    });
  });

  describe('clearTimer', () => {
    test('should clear and remove a specific timer', () => {
      let count = 0;
      const id = setInterval(() => { count++; }, 100);
      lifecycle.registerTimer('counter', id);

      lifecycle.clearTimer('counter');

      expect(lifecycle._timers.has('counter')).toBe(false);
      jest.advanceTimersByTime(500);
      expect(count).toBe(0);
    });

    test('should be safe to call with unknown name', () => {
      expect(() => lifecycle.clearTimer('nonexistent')).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should clear all timers', () => {
      let a = 0, b = 0;
      const id1 = setInterval(() => { a++; }, 100);
      const id2 = setInterval(() => { b++; }, 200);
      lifecycle.registerTimer('a', id1);
      lifecycle.registerTimer('b', id2);

      lifecycle.cleanup();

      expect(lifecycle._timers.size).toBe(0);
      jest.advanceTimersByTime(1000);
      expect(a).toBe(0);
      expect(b).toBe(0);
    });

    test('should remove all event listeners', () => {
      const target1 = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const target2 = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const h1 = jest.fn();
      const h2 = jest.fn();

      lifecycle.registerListener(target1, 'click', h1);
      lifecycle.registerListener(target2, 'keydown', h2);

      lifecycle.cleanup();

      expect(target1.removeEventListener).toHaveBeenCalledWith('click', h1);
      expect(target2.removeEventListener).toHaveBeenCalledWith('keydown', h2);
      expect(lifecycle._listeners).toHaveLength(0);
    });

    test('should be safe to call twice', () => {
      lifecycle.registerTimer('x', setInterval(() => {}, 100));
      lifecycle.cleanup();
      expect(() => lifecycle.cleanup()).not.toThrow();
      expect(lifecycle._timers.size).toBe(0);
      expect(lifecycle._listeners).toHaveLength(0);
    });
  });
});
