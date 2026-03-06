/**
 * Tests for api/services/helius/middleware/health.js
 */

'use strict';

const providers = require('../../../../api/services/helius/providers');
const health = require('../../../../api/services/helius/middleware/health');

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('helius/middleware/health', () => {
  beforeEach(() => {
    providers.clear();
    mockFetch.mockReset();
    health.stop();

    providers.register('test-provider', {
      rpcUrl: 'https://test-rpc.com',
      apiKey: 'key123',
      capabilities: ['rpc'],
      weight: 5,
    });
  });

  afterEach(() => {
    health.stop();
  });

  describe('probeProvider', () => {
    it('returns latency and slot on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 'health', result: 12345 }),
      });

      const p = providers.get('test-provider');
      const result = await health.probeProvider(p);

      expect(result.slot).toBe(12345);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);

      // Verify fetch was called with correct URL
      expect(mockFetch.mock.calls[0][0]).toContain('test-rpc.com');
      expect(mockFetch.mock.calls[0][0]).toContain('api-key=key123');
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      const p = providers.get('test-provider');
      await expect(health.probeProvider(p)).rejects.toThrow('HTTP 503');
    });

    it('throws on RPC error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            error: { message: 'Internal error' },
          }),
      });

      const p = providers.get('test-provider');
      await expect(health.probeProvider(p)).rejects.toThrow('Internal error');
    });

    it('builds URL without api-key when apiKey is null', async () => {
      providers.register('no-key', { rpcUrl: 'https://public-rpc.com' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', result: 100 }),
      });

      const p = providers.get('no-key');
      await health.probeProvider(p);

      expect(mockFetch.mock.calls[0][0]).toBe('https://public-rpc.com');
    });
  });

  describe('checkAll', () => {
    it('marks providers healthy on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', result: 999 }),
      });

      const results = await health.checkAll();
      expect(results).toHaveLength(1);
      expect(results[0].ok).toBe(true);

      const p = providers.get('test-provider');
      expect(p.health.ok).toBe(true);
      expect(p.health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('marks providers as failed on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('timeout'));

      const results = await health.checkAll();
      expect(results).toHaveLength(1);
      expect(results[0].ok).toBe(false);

      const p = providers.get('test-provider');
      expect(p.health.failures).toBe(1);
    });

    it('handles multiple providers', async () => {
      providers.register('provider-2', { rpcUrl: 'https://rpc2.com' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jsonrpc: '2.0', result: 1 }),
      });
      mockFetch.mockRejectedValueOnce(new Error('down'));

      const results = await health.checkAll();
      expect(results).toHaveLength(2);
    });
  });

  describe('getStatus', () => {
    it('returns snapshot of all providers', () => {
      const status = health.getStatus();
      expect(status).toHaveLength(1);
      expect(status[0]).toHaveProperty('id', 'test-provider');
      expect(status[0]).toHaveProperty('healthy', true);
      expect(status[0]).toHaveProperty('latencyMs');
      expect(status[0]).toHaveProperty('failures');
      expect(status[0]).toHaveProperty('lastCheck');
    });
  });

  describe('start / stop', () => {
    it('start and stop without error', () => {
      expect(() => health.start(60_000)).not.toThrow();
      expect(() => health.stop()).not.toThrow();
    });

    it('stop is idempotent', () => {
      health.stop();
      health.stop();
      expect(true).toBe(true); // no throw
    });
  });
});
