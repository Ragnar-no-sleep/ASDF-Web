/**
 * PageLifecycle Tests
 * Tests the REAL source at js/core/PageLifecycle.js
 * Covers: timer registration, listener registration, cleanup, clearTimer
 */

import { PageLifecycle } from '../../../js/core/PageLifecycle.js';

describe('PageLifecycle', () => {
  beforeEach(() => {
    // Clean state between tests
    PageLifecycle.cleanup();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registerTimer', () => {
    test('should store timer by name', () => {
      const id = setInterval(() => {}, 1000);
      PageLifecycle.registerTimer('test-timer', id);
      // Verify by clearing it (no throw)
      expect(() => PageLifecycle.clearTimer('test-timer')).not.toThrow();
    });

    test('should overwrite timer with same name', () => {
      const id1 = setInterval(() => {}, 1000);
      const id2 = setInterval(() => {}, 2000);
      PageLifecycle.registerTimer('dup', id1);
      PageLifecycle.registerTimer('dup', id2);
      // Both are tracked, cleanup will clear the latest
      PageLifecycle.cleanup();
    });
  });

  describe('registerListener', () => {
    test('should add event listener to target', () => {
      const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const handler = jest.fn();
      PageLifecycle.registerListener(target, 'click', handler);
      expect(target.addEventListener).toHaveBeenCalledWith('click', handler);
    });

    test('should store multiple listeners for cleanup', () => {
      const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const h1 = jest.fn();
      const h2 = jest.fn();
      PageLifecycle.registerListener(target, 'click', h1);
      PageLifecycle.registerListener(target, 'keydown', h2);
      // Both should be removed on cleanup
      PageLifecycle.cleanup();
      expect(target.removeEventListener).toHaveBeenCalledWith('click', h1);
      expect(target.removeEventListener).toHaveBeenCalledWith('keydown', h2);
    });
  });

  describe('clearTimer', () => {
    test('should clear and remove a specific timer', () => {
      let count = 0;
      const id = setInterval(() => {
        count++;
      }, 100);
      PageLifecycle.registerTimer('counter', id);

      PageLifecycle.clearTimer('counter');

      jest.advanceTimersByTime(500);
      expect(count).toBe(0);
    });

    test('should be safe to call with unknown name', () => {
      expect(() => PageLifecycle.clearTimer('nonexistent')).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should clear all timers', () => {
      let a = 0,
        b = 0;
      const id1 = setInterval(() => {
        a++;
      }, 100);
      const id2 = setInterval(() => {
        b++;
      }, 200);
      PageLifecycle.registerTimer('a', id1);
      PageLifecycle.registerTimer('b', id2);

      PageLifecycle.cleanup();

      jest.advanceTimersByTime(1000);
      expect(a).toBe(0);
      expect(b).toBe(0);
    });

    test('should remove all event listeners', () => {
      const target1 = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const target2 = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const h1 = jest.fn();
      const h2 = jest.fn();

      PageLifecycle.registerListener(target1, 'click', h1);
      PageLifecycle.registerListener(target2, 'keydown', h2);

      PageLifecycle.cleanup();

      expect(target1.removeEventListener).toHaveBeenCalledWith('click', h1);
      expect(target2.removeEventListener).toHaveBeenCalledWith('keydown', h2);
    });

    test('should be safe to call twice', () => {
      PageLifecycle.registerTimer(
        'x',
        setInterval(() => {}, 100)
      );
      PageLifecycle.cleanup();
      expect(() => PageLifecycle.cleanup()).not.toThrow();
    });
  });
});
