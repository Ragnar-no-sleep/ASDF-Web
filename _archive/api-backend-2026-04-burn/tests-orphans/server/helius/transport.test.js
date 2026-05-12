/**
 * Tests for api/services/helius/transport.js
 *
 * Validates: provider rotation, circuit breaker integration,
 * caching, metrics, error handling, restCall.
 */

'use strict';

const providers = require('../../../../api/services/helius/providers');
const cache = require('../../../../api/services/helius/middleware/cache');
const circuitBreaker = require('../../../../api/services/helius/middleware/circuit-breaker');
const metricsModule = require('../../../../api/services/helius/middleware/metrics');
const { NoProviderError, HttpError, RpcError } = require('../../../../api/services/helius/errors');

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const transport = require('../../../../api/services/helius/transport');

describe('helius/transport', () => {
  beforeEach(() => {
    providers.clear();
    cache.clear();
    circuitBreaker.resetAll();
    metricsModule.reset();
    mockFetch.mockReset();

    // Register default providers
    providers.register('helius-gk', {
      rpcUrl: 'https://beta.helius-rpc.com',
      restUrl: 'https://api.helius.xyz',
      apiKey: 'test-key',
      capabilities: ['rpc', 'das', 'enhanced', 'priority'],
      weight: 10,
    });
    providers.register('solana-pub', {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      capabilities: ['rpc'],
      weight: 1,
    });
  });

  describe('rpcCall', () => {
    it('sends JSON-RPC request to highest-weight provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: 42 }),
      });

      const result = await transport.rpcCall('getSlot', []);
      expect(result).toBe(42);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('beta.helius-rpc.com');
      expect(url).toContain('api-key=test-key');
      expect(opts.method).toBe('POST');

      const body = JSON.parse(opts.body);
      expect(body.method).toBe('getSlot');
    });

    it('returns cached result on second call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: 100 }),
      });

      const r1 = await transport.rpcCall('getTokenSupply', ['mint'], {
        cacheKey: 'supply:mint',
        cacheTTL: 60_000,
      });
      const r2 = await transport.rpcCall('getTokenSupply', ['mint'], {
        cacheKey: 'supply:mint',
        cacheTTL: 60_000,
      });

      expect(r1).toBe(100);
      expect(r2).toBe(100);
      expect(mockFetch).toHaveBeenCalledTimes(1); // only 1 fetch
    });

    it('rotates to next provider on failure', async () => {
      // First provider fails
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      // Second provider succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: 'ok' }),
      });

      const result = await transport.rpcCall('getSlot', []);
      expect(result).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call to helius, second to solana
      expect(mockFetch.mock.calls[0][0]).toContain('helius');
      expect(mockFetch.mock.calls[1][0]).toContain('solana');
    });

    it('throws NoProviderError when no providers available', async () => {
      providers.clear();
      await expect(transport.rpcCall('getSlot', [])).rejects.toThrow(NoProviderError);
    });

    it('throws NoProviderError for unsupported capability', async () => {
      // Neither provider has 'websocket' capability
      await expect(transport.rpcCall('subscribe', [], { capability: 'websocket' })).rejects.toThrow(
        NoProviderError
      );
    });

    it('throws RpcError on JSON-RPC error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            error: { message: 'Method not found', code: -32601 },
          }),
      });
      // Solana fallback also fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            error: { message: 'Method not found', code: -32601 },
          }),
      });

      await expect(transport.rpcCall('badMethod', [])).rejects.toThrow(RpcError);
    });

    it('throws HttpError on non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 502 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      await expect(transport.rpcCall('getSlot', [])).rejects.toThrow(HttpError);
    });

    it('updates metrics on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: 1 }),
      });

      await transport.rpcCall('getSlot', []);
      const stats = metricsModule.getStats();
      expect(stats.requests).toBe(1);
      expect(stats.errors).toBe(0);
    });

    it('updates metrics on error + retry', async () => {
      mockFetch.mockRejectedValueOnce(new Error('timeout'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: 1 }),
      });

      await transport.rpcCall('getSlot', []);
      const stats = metricsModule.getStats();
      expect(stats.requests).toBe(2); // 1 error + 1 success
      expect(stats.errors).toBe(1);
    });

    it('skips provider with open circuit', async () => {
      // Trip helius-gk circuit
      for (let i = 0; i < circuitBreaker.THRESHOLD; i++) {
        circuitBreaker.onFailure('helius-gk');
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: 'fallback' }),
      });

      const result = await transport.rpcCall('getSlot', []);
      expect(result).toBe('fallback');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Should have gone directly to solana-pub
      expect(mockFetch.mock.calls[0][0]).toContain('solana');
    });
  });

  describe('restCall', () => {
    it('sends GET to Helius REST API with api-key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ signature: 'tx1' }]),
      });

      const result = await transport.restCall('/v0/addresses/MINT/transactions', {
        params: { type: 'BURN' },
      });

      expect(result).toEqual([{ signature: 'tx1' }]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('api.helius.xyz');
      expect(url).toContain('api-key=test-key');
      expect(url).toContain('type=BURN');
    });

    it('skips providers without restUrl', async () => {
      // Only helius-gk has restUrl, solana-pub doesn't
      // If helius-gk fails, solana-pub can't serve REST
      mockFetch.mockRejectedValueOnce(new Error('helius down'));

      // solana-pub lacks restUrl/apiKey, so HttpError(501) thrown internally
      await expect(transport.restCall('/v0/test')).rejects.toThrow(); // either HttpError or the original error
    });

    it('caches restCall results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ sig: '1' }]),
      });

      await transport.restCall('/v0/test', { cacheKey: 'rest:test', cacheTTL: 60_000 });
      const r2 = await transport.restCall('/v0/test', { cacheKey: 'rest:test', cacheTTL: 60_000 });

      expect(r2).toEqual([{ sig: '1' }]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
