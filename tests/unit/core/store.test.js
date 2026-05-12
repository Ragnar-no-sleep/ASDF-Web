/**
 * Store Unit Tests
 * Tests reactive state management from js/core/Store.js
 */

import { Store } from '../../../js/core/Store.js';

describe('Store', () => {
  let store;

  beforeEach(() => {
    store = new Store({ count: 0, name: 'test' });
  });

  // ============================================
  // constructor
  // ============================================

  describe('constructor', () => {
    it('deep copies initial state', () => {
      const initial = { nested: { value: 1 } };
      const s = new Store(initial);
      initial.nested.value = 999;
      expect(s.getState().nested.value).toBe(1);
    });

    it('defaults to empty object', () => {
      const s = new Store();
      expect(s.getState()).toEqual({});
    });
  });

  // ============================================
  // getState
  // ============================================

  describe('getState', () => {
    it('returns current state', () => {
      expect(store.getState()).toEqual({ count: 0, name: 'test' });
    });

    it('returns immutable copy', () => {
      const state = store.getState();
      state.count = 999;
      expect(store.getState().count).toBe(0);
    });
  });

  // ============================================
  // subscribe
  // ============================================

  describe('subscribe', () => {
    it('notifies on dispatch', () => {
      const handler = jest.fn();
      store.subscribe(handler);
      store.dispatch({ type: 'count', payload: 5 });
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ count: 5 }));
    });

    it('returns unsubscribe function', () => {
      const handler = jest.fn();
      const unsub = store.subscribe(handler);
      unsub();
      store.dispatch({ type: 'count', payload: 5 });
      expect(handler).not.toHaveBeenCalled();
    });

    it('throws for non-function callback', () => {
      expect(() => store.subscribe('bad')).toThrow(TypeError);
    });
  });

  // ============================================
  // dispatch
  // ============================================

  describe('dispatch', () => {
    it('updates state', () => {
      store.dispatch({ type: 'count', payload: 42 });
      expect(store.getState().count).toBe(42);
    });

    it('throws for missing type', () => {
      expect(() => store.dispatch({})).toThrow();
      expect(() => store.dispatch(null)).toThrow();
    });

    it('records history', () => {
      store.dispatch({ type: 'count', payload: 1 });
      const history = store.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('count');
    });

    it('trims history beyond max', () => {
      store._maxHistory = 3;
      for (let i = 0; i < 10; i++) {
        store.dispatch({ type: 'count', payload: i });
      }
      expect(store.getHistory()).toHaveLength(3);
    });

    it('handles subscriber errors gracefully', () => {
      store.subscribe(() => {
        throw new Error('boom');
      });
      // Should not throw
      expect(() => store.dispatch({ type: 'count', payload: 1 })).not.toThrow();
    });
  });

  // ============================================
  // reduce
  // ============================================

  describe('reduce', () => {
    it('applies reducer function', () => {
      store.reduce(state => ({ ...state, count: state.count + 10 }));
      expect(store.getState().count).toBe(10);
    });

    it('notifies subscribers', () => {
      const handler = jest.fn();
      store.subscribe(handler);
      store.reduce(state => ({ ...state, count: 99 }));
      expect(handler).toHaveBeenCalled();
    });

    it('throws for non-function reducer', () => {
      expect(() => store.reduce('bad')).toThrow(TypeError);
    });
  });

  // ============================================
  // undo
  // ============================================

  describe('undo', () => {
    it('reverts to previous state', () => {
      store.dispatch({ type: 'count', payload: 5 });
      store.undo();
      expect(store.getState().count).toBe(0);
    });

    it('returns true on success', () => {
      store.dispatch({ type: 'count', payload: 1 });
      expect(store.undo()).toBe(true);
    });

    it('returns false when no history', () => {
      expect(store.undo()).toBe(false);
    });

    it('notifies subscribers', () => {
      store.dispatch({ type: 'count', payload: 5 });
      const handler = jest.fn();
      store.subscribe(handler);
      store.undo();
      expect(handler).toHaveBeenCalled();
    });
  });

  // ============================================
  // clear / getSubscriberCount
  // ============================================

  describe('clear', () => {
    it('clears subscribers and history', () => {
      store.subscribe(() => {});
      store.dispatch({ type: 'x', payload: 1 });
      store.clear();
      expect(store.getSubscriberCount()).toBe(0);
      expect(store.getHistory()).toEqual([]);
    });
  });

  describe('getSubscriberCount', () => {
    it('returns 0 initially', () => {
      expect(store.getSubscriberCount()).toBe(0);
    });

    it('counts active subscribers', () => {
      store.subscribe(() => {});
      store.subscribe(() => {});
      expect(store.getSubscriberCount()).toBe(2);
    });
  });
});
