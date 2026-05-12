/**
 * ServiceContainer Unit Tests
 * Tests DI container from js/core/ServiceContainer.js
 */

import { ServiceContainer, globalContainer } from '../../../js/core/ServiceContainer.js';

describe('ServiceContainer', () => {
  let container;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  // ============================================
  // register
  // ============================================

  describe('register', () => {
    it('registers a transient service', () => {
      container.register('api', () => ({ url: '/api' }));
      expect(container.has('api')).toBe(true);
    });

    it('registers a singleton service', () => {
      container.register('db', () => ({ connected: true }), 'singleton');
      expect(container.has('db')).toBe(true);
    });

    it('throws for non-function factory', () => {
      expect(() => container.register('bad', 'not a function')).toThrow(TypeError);
    });

    it('throws for invalid lifecycle', () => {
      expect(() => container.register('x', () => {}, 'invalid')).toThrow();
    });
  });

  // ============================================
  // get
  // ============================================

  describe('get', () => {
    it('returns service instance', () => {
      container.register('api', () => ({ url: '/api' }));
      expect(container.get('api')).toEqual({ url: '/api' });
    });

    it('returns same instance for singleton', () => {
      let count = 0;
      container.register('counter', () => ({ id: ++count }), 'singleton');
      const a = container.get('counter');
      const b = container.get('counter');
      expect(a).toBe(b);
      expect(count).toBe(1);
    });

    it('returns new instance for transient', () => {
      let count = 0;
      container.register('counter', () => ({ id: ++count }), 'transient');
      const a = container.get('counter');
      const b = container.get('counter');
      expect(a).not.toBe(b);
      expect(count).toBe(2);
    });

    it('throws for unknown service', () => {
      expect(() => container.get('unknown')).toThrow();
    });

    it('passes container to factory', () => {
      container.register('dep', () => 'dependency', 'singleton');
      container.register('main', c => ({ dep: c.get('dep') }));
      expect(container.get('main').dep).toBe('dependency');
    });

    it('throws if factory errors', () => {
      container.register('bad', () => {
        throw new Error('factory boom');
      });
      expect(() => container.get('bad')).toThrow(/factory boom/);
    });
  });

  // ============================================
  // has
  // ============================================

  describe('has', () => {
    it('returns false for unknown service', () => {
      expect(container.has('nope')).toBe(false);
    });

    it('returns true for registered service', () => {
      container.register('x', () => {});
      expect(container.has('x')).toBe(true);
    });
  });

  // ============================================
  // clear
  // ============================================

  describe('clear', () => {
    it('clears cached singletons', () => {
      let count = 0;
      container.register('s', () => ({ id: ++count }), 'singleton');
      container.get('s');
      container.clear();
      // After clear, singleton is re-created
      expect(container.get('s').id).toBe(2);
    });
  });

  // ============================================
  // getRegistered
  // ============================================

  describe('getRegistered', () => {
    it('returns empty array initially', () => {
      expect(container.getRegistered()).toEqual([]);
    });

    it('returns registered service names', () => {
      container.register('a', () => {});
      container.register('b', () => {});
      expect(container.getRegistered()).toEqual(['a', 'b']);
    });
  });
});

// ============================================
// globalContainer singleton
// ============================================

describe('globalContainer', () => {
  it('is an instance of ServiceContainer', () => {
    expect(globalContainer).toBeInstanceOf(ServiceContainer);
  });
});
