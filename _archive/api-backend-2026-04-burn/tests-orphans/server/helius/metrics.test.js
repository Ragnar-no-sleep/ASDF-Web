/**
 * Tests for api/services/helius/middleware/metrics.js
 */

'use strict';

const metrics = require('../../../../api/services/helius/middleware/metrics');

describe('helius/middleware/metrics', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('counters', () => {
    it('starts at zero', () => {
      const stats = metrics.getStats();
      expect(stats.requests).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.rateLimits).toBe(0);
    });

    it('increments on rpcSuccess', () => {
      metrics.rpcSuccess('getBalance', 45, 'provider-1');
      const stats = metrics.getStats();
      expect(stats.requests).toBe(1);
      expect(stats.errors).toBe(0);
    });

    it('increments requests + errors on rpcError', () => {
      metrics.rpcError('getBalance', 100, 'provider-1', 'TIMEOUT');
      const stats = metrics.getStats();
      expect(stats.requests).toBe(1);
      expect(stats.errors).toBe(1);
    });

    it('tracks cache hits and misses', () => {
      metrics.cacheHit('getBalance');
      metrics.cacheHit('getBalance');
      metrics.cacheMiss('getTokenSupply');

      const stats = metrics.getStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHitRate).toBe('66.7%');
    });

    it('tracks rate limits', () => {
      metrics.rateLimited('provider-1');
      metrics.rateLimited('provider-2');
      expect(metrics.getStats().rateLimits).toBe(2);
    });
  });

  describe('getStats', () => {
    it('computes errorRate', () => {
      metrics.rpcSuccess('m', 10, 'p');
      metrics.rpcSuccess('m', 10, 'p');
      metrics.rpcError('m', 10, 'p', 'ERR');

      expect(metrics.getStats().errorRate).toBe('33.3%');
    });

    it('returns 0% errorRate with no requests', () => {
      expect(metrics.getStats().errorRate).toBe('0%');
    });

    it('returns N/A cacheHitRate with no cache activity', () => {
      expect(metrics.getStats().cacheHitRate).toBe('N/A');
    });

    it('computes p50 and p99 from recent window', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.rpcSuccess('m', i, 'p');
      }
      const stats = metrics.getStats();
      expect(stats.p50).toBeGreaterThan(0);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p50);
      expect(stats.windowSize).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('clears all counters and latencies', () => {
      metrics.rpcSuccess('m', 10, 'p');
      metrics.rpcError('m', 20, 'p', 'E');
      metrics.cacheHit('m');

      metrics.reset();

      const stats = metrics.getStats();
      expect(stats.requests).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.windowSize).toBe(0);
    });
  });
});
