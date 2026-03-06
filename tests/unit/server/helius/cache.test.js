/**
 * Tests for api/services/helius/middleware/cache.js
 */

'use strict';

const cache = require('../../../../api/services/helius/middleware/cache');

describe('helius/middleware/cache', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('get / set', () => {
    it('returns null for missing key', () => {
      expect(cache.get('nope')).toBeNull();
    });

    it('stores and retrieves a value', () => {
      cache.set('key1', { data: 42 }, 60_000);
      expect(cache.get('key1')).toEqual({ data: 42 });
    });

    it('returns null for expired entry', () => {
      cache.set('expired', 'old', 1); // 1ms TTL
      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        /* spin */
      }
      expect(cache.get('expired')).toBeNull();
    });

    it('overwrites existing key', () => {
      cache.set('k', 'v1', 60_000);
      cache.set('k', 'v2', 60_000);
      expect(cache.get('k')).toBe('v2');
    });
  });

  describe('del', () => {
    it('removes a specific key', () => {
      cache.set('a', 1, 60_000);
      cache.set('b', 2, 60_000);
      cache.del('a');
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBe(2);
    });
  });

  describe('invalidate', () => {
    it('removes all keys matching prefix', () => {
      cache.set('bal:wallet1', 100, 60_000);
      cache.set('bal:wallet2', 200, 60_000);
      cache.set('supply:mint', 999, 60_000);

      cache.invalidate('bal:');

      expect(cache.get('bal:wallet1')).toBeNull();
      expect(cache.get('bal:wallet2')).toBeNull();
      expect(cache.get('supply:mint')).toBe(999);
    });
  });

  describe('clear / size', () => {
    it('clears all entries', () => {
      cache.set('a', 1, 60_000);
      cache.set('b', 2, 60_000);
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });
});
