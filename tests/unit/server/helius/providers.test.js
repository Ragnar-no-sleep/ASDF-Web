/**
 * Tests for api/services/helius/providers.js
 */

'use strict';

const providers = require('../../../../api/services/helius/providers');
const { CAPABILITIES } = providers;

describe('helius/providers', () => {
  beforeEach(() => {
    providers.clear();
  });

  describe('register / get / getAll', () => {
    it('registers a provider with id on the object', () => {
      providers.register('test-1', {
        rpcUrl: 'https://rpc.test',
        capabilities: [CAPABILITIES.RPC],
        weight: 5,
      });

      const p = providers.get('test-1');
      expect(p).not.toBeNull();
      expect(p.id).toBe('test-1');
      expect(p.rpcUrl).toBe('https://rpc.test');
      expect(p.weight).toBe(5);
      expect(p.health.ok).toBe(true);
    });

    it('defaults restUrl and apiKey to null', () => {
      providers.register('minimal', { rpcUrl: 'https://rpc.test' });
      const p = providers.get('minimal');
      expect(p.restUrl).toBeNull();
      expect(p.apiKey).toBeNull();
    });

    it('getAll returns all providers', () => {
      providers.register('a', { rpcUrl: 'https://a' });
      providers.register('b', { rpcUrl: 'https://b' });
      expect(providers.getAll()).toHaveLength(2);
    });

    it('get returns null for unknown id', () => {
      expect(providers.get('nonexistent')).toBeNull();
    });
  });

  describe('unregister', () => {
    it('removes a provider', () => {
      providers.register('rm-me', { rpcUrl: 'https://rm' });
      expect(providers.size()).toBe(1);
      providers.unregister('rm-me');
      expect(providers.size()).toBe(0);
      expect(providers.get('rm-me')).toBeNull();
    });
  });

  describe('getHealthy', () => {
    beforeEach(() => {
      providers.register('helius', {
        rpcUrl: 'https://helius',
        restUrl: 'https://api.helius.xyz',
        apiKey: 'key',
        capabilities: [CAPABILITIES.RPC, CAPABILITIES.DAS, CAPABILITIES.ENHANCED],
        weight: 10,
      });
      providers.register('solana', {
        rpcUrl: 'https://solana',
        capabilities: [CAPABILITIES.RPC],
        weight: 1,
      });
    });

    it('filters by capability', () => {
      const rpc = providers.getHealthy(CAPABILITIES.RPC);
      expect(rpc).toHaveLength(2);

      const das = providers.getHealthy(CAPABILITIES.DAS);
      expect(das).toHaveLength(1);
      expect(das[0].id).toBe('helius');
    });

    it('sorts by weight descending', () => {
      const rpc = providers.getHealthy(CAPABILITIES.RPC);
      expect(rpc[0].id).toBe('helius');
      expect(rpc[1].id).toBe('solana');
    });

    it('excludes unhealthy providers', () => {
      const p = providers.get('helius');
      p.health.ok = false;

      const rpc = providers.getHealthy(CAPABILITIES.RPC);
      expect(rpc).toHaveLength(1);
      expect(rpc[0].id).toBe('solana');
    });

    it('sorts by latency when weight is equal', () => {
      providers.register('fast', {
        rpcUrl: 'https://fast',
        capabilities: [CAPABILITIES.RPC],
        weight: 1,
      });
      providers.markSuccess('fast', 10);
      providers.markSuccess('solana', 100);

      const rpc = providers.getHealthy(CAPABILITIES.RPC);
      // helius (weight 10) first, then fast (10ms) before solana (100ms)
      const lowWeight = rpc.filter(p => p.weight === 1);
      expect(lowWeight[0].id).toBe('fast');
      expect(lowWeight[1].id).toBe('solana');
    });
  });

  describe('markSuccess / markFailed', () => {
    beforeEach(() => {
      providers.register('p1', { rpcUrl: 'https://p1' });
    });

    it('markSuccess updates health', () => {
      providers.markSuccess('p1', 42);
      const p = providers.get('p1');
      expect(p.health.ok).toBe(true);
      expect(p.health.latencyMs).toBe(42);
      expect(p.health.failures).toBe(0);
      expect(p.health.lastCheck).toBeGreaterThan(0);
    });

    it('markFailed increments failure count', () => {
      providers.markFailed('p1');
      providers.markFailed('p1');
      const p = providers.get('p1');
      expect(p.health.failures).toBe(2);
    });

    it('markSuccess resets failures', () => {
      providers.markFailed('p1');
      providers.markFailed('p1');
      providers.markSuccess('p1', 50);
      expect(providers.get('p1').health.failures).toBe(0);
    });

    it('ignores unknown provider ids', () => {
      expect(() => providers.markSuccess('ghost', 10)).not.toThrow();
      expect(() => providers.markFailed('ghost')).not.toThrow();
    });
  });
});
