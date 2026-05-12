/**
 * EventBus Unit Tests
 * Tests the pub/sub event system from js/core/event-bus.js
 */

import { eventBus, EVENTS } from '../../../js/core/event-bus.js';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
    eventBus.setDebug(false);
  });

  // ============================================
  // on / off
  // ============================================

  describe('on', () => {
    it('subscribes and receives events', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);
      eventBus.emit('test', { value: 1 });
      expect(handler).toHaveBeenCalledWith({ value: 1 });
    });

    it('returns unsubscribe function', () => {
      const handler = jest.fn();
      const unsub = eventBus.on('test', handler);
      unsub();
      eventBus.emit('test');
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects non-function callbacks', () => {
      const unsub = eventBus.on('test', 'not a function');
      expect(typeof unsub).toBe('function');
      // Should not throw when emitting
      eventBus.emit('test');
    });

    it('supports multiple listeners on same event', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      eventBus.on('test', h1);
      eventBus.on('test', h2);
      eventBus.emit('test', 42);
      expect(h1).toHaveBeenCalledWith(42);
      expect(h2).toHaveBeenCalledWith(42);
    });
  });

  describe('off', () => {
    it('removes specific listener', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);
      eventBus.off('test', handler);
      eventBus.emit('test');
      expect(handler).not.toHaveBeenCalled();
    });

    it('is safe for non-existent events', () => {
      expect(() => eventBus.off('nonexistent', () => {})).not.toThrow();
    });
  });

  // ============================================
  // once
  // ============================================

  describe('once', () => {
    it('fires only once then auto-unsubscribes', () => {
      const handler = jest.fn();
      eventBus.once('test', handler);
      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });
  });

  // ============================================
  // emit
  // ============================================

  describe('emit', () => {
    it('records event in history', () => {
      eventBus.emit('ping', { ts: 123 });
      const history = eventBus.getHistory('ping');
      expect(history).toHaveLength(1);
      expect(history[0].data).toEqual({ ts: 123 });
    });

    it('handles listener errors gracefully', () => {
      const badHandler = () => {
        throw new Error('boom');
      };
      const goodHandler = jest.fn();
      eventBus.on('test', badHandler);
      eventBus.on('test', goodHandler);
      eventBus.emit('test');
      // Good handler still called despite bad handler throwing
      expect(goodHandler).toHaveBeenCalled();
    });

    it('trims history beyond maxHistory', () => {
      eventBus.maxHistory = 5;
      for (let i = 0; i < 10; i++) {
        eventBus.emit('count', i);
      }
      expect(eventBus.getHistory()).toHaveLength(5);
    });

    it('is safe to emit with no listeners', () => {
      expect(() => eventBus.emit('nobody-listening')).not.toThrow();
    });
  });

  // ============================================
  // getHistory
  // ============================================

  describe('getHistory', () => {
    it('returns all history without filter', () => {
      eventBus.emit('a');
      eventBus.emit('b');
      expect(eventBus.getHistory()).toHaveLength(2);
    });

    it('filters by event name', () => {
      eventBus.emit('a');
      eventBus.emit('b');
      eventBus.emit('a');
      expect(eventBus.getHistory('a')).toHaveLength(2);
    });

    it('returns copy, not reference', () => {
      eventBus.emit('x');
      const h = eventBus.getHistory();
      h.push({ fake: true });
      expect(eventBus.getHistory()).toHaveLength(1);
    });
  });

  // ============================================
  // listenerCount / eventNames
  // ============================================

  describe('listenerCount', () => {
    it('returns 0 for unknown events', () => {
      expect(eventBus.listenerCount('unknown')).toBe(0);
    });

    it('counts listeners correctly', () => {
      eventBus.on('test', () => {});
      eventBus.on('test', () => {});
      expect(eventBus.listenerCount('test')).toBe(2);
    });
  });

  describe('eventNames', () => {
    it('returns empty array initially', () => {
      expect(eventBus.eventNames()).toEqual([]);
    });

    it('returns registered event names', () => {
      eventBus.on('alpha', () => {});
      eventBus.on('beta', () => {});
      expect(eventBus.eventNames()).toContain('alpha');
      expect(eventBus.eventNames()).toContain('beta');
    });
  });

  // ============================================
  // clear
  // ============================================

  describe('clear', () => {
    it('removes all listeners and history', () => {
      eventBus.on('test', () => {});
      eventBus.emit('test');
      eventBus.clear();
      expect(eventBus.eventNames()).toEqual([]);
      expect(eventBus.getHistory()).toEqual([]);
    });
  });

  // ============================================
  // setDebug
  // ============================================

  describe('setDebug', () => {
    it('enables debug mode', () => {
      eventBus.setDebug(true);
      expect(eventBus.debug).toBe(true);
    });

    it('disables debug mode', () => {
      eventBus.setDebug(true);
      eventBus.setDebug(false);
      expect(eventBus.debug).toBe(false);
    });
  });
});

// ============================================
// EVENTS constants
// ============================================

describe('EVENTS', () => {
  it('defines wallet events', () => {
    expect(EVENTS.WALLET_CONNECTED).toBe('wallet:connected');
    expect(EVENTS.WALLET_DISCONNECTED).toBe('wallet:disconnected');
  });

  it('defines game events', () => {
    expect(EVENTS.GAME_START).toBe('game:start');
    expect(EVENTS.GAME_END).toBe('game:end');
  });

  it('defines quest events', () => {
    expect(EVENTS.QUEST_COMPLETED).toBe('quest:completed');
  });

  it('defines badge events', () => {
    expect(EVENTS.BADGE_UNLOCKED).toBe('badge:unlocked');
  });

  it('all values are strings', () => {
    Object.values(EVENTS).forEach(val => {
      expect(typeof val).toBe('string');
    });
  });
});
