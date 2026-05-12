/**
 * Tests for api/services/helius/config.js
 */

'use strict';

const config = require('../../../../api/services/helius/config');

describe('helius/config', () => {
  describe('ASDF constants', () => {
    it('has correct mint address', () => {
      expect(config.ASDF.MINT).toBe('9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump');
    });

    it('has 6 decimals', () => {
      expect(config.ASDF.DECIMALS).toBe(6);
    });

    it('has 1B initial supply', () => {
      expect(config.ASDF.INITIAL_SUPPLY).toBe(1_000_000_000);
    });

    it('ASDF is frozen', () => {
      expect(Object.isFrozen(config.ASDF)).toBe(true);
    });
  });

  describe('CACHE_TTL', () => {
    it('is frozen', () => {
      expect(Object.isFrozen(config.CACHE_TTL)).toBe(true);
    });

    it('has all expected keys', () => {
      expect(config.CACHE_TTL).toHaveProperty('tokenSupply');
      expect(config.CACHE_TTL).toHaveProperty('tokenBalance');
      expect(config.CACHE_TTL).toHaveProperty('priorityFee');
      expect(config.CACHE_TTL).toHaveProperty('das');
    });

    it('TTLs are positive numbers', () => {
      for (const [, val] of Object.entries(config.CACHE_TTL)) {
        expect(val).toBeGreaterThan(0);
      }
    });
  });

  describe('PRIORITY_FEE', () => {
    it('min < default < max', () => {
      expect(config.PRIORITY_FEE.min).toBeLessThan(config.PRIORITY_FEE.default);
      expect(config.PRIORITY_FEE.default).toBeLessThan(config.PRIORITY_FEE.max);
    });

    it('level is Medium', () => {
      expect(config.PRIORITY_FEE.level).toBe('Medium');
    });
  });

  describe('redactApiKey', () => {
    it('redacts api-key from URL', () => {
      const url = 'https://beta.helius-rpc.com/?api-key=secret123';
      const redacted = config.redactApiKey(url);
      expect(redacted).not.toContain('secret123');
      expect(redacted).toContain('REDACTED');
    });

    it('handles null/empty input', () => {
      expect(config.redactApiKey(null)).toBe('');
      expect(config.redactApiKey('')).toBe('');
    });

    it('returns URL unchanged if no api-key param', () => {
      const url = 'https://api.mainnet-beta.solana.com';
      expect(config.redactApiKey(url)).toBe(url);
    });
  });
});
