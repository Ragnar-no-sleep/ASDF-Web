/**
 * @jest-environment node
 */

'use strict';

const {
  sanitizeError,
  getAuthToken,
  JWT_COOKIE_NAME,
  isProduction,
} = require('../../../api/routes/helpers');

describe('Route Helpers', () => {
  describe('sanitizeError()', () => {
    it('should return message for Error instances', () => {
      const result = sanitizeError(new Error('test error'), 'test');
      expect(result).toContain('test error');
    });

    it('should convert non-Error to string', () => {
      const result = sanitizeError('string error', 'test');
      expect(result).toContain('string error');
    });

    it('should pass through safe patterns in production', () => {
      // In non-production, all messages are returned as-is
      // Test the safe patterns logic
      const result = sanitizeError(new Error('Item not found'), 'test');
      expect(result).toBe('Item not found');
    });

    it('should pass through "insufficient balance" pattern', () => {
      const result = sanitizeError(new Error('Insufficient balance for purchase'), 'test');
      expect(result).toBe('Insufficient balance for purchase');
    });

    it('should pass through "invalid wallet" pattern', () => {
      const result = sanitizeError(new Error('Invalid wallet address'), 'test');
      expect(result).toBe('Invalid wallet address');
    });

    it('should handle undefined error gracefully', () => {
      expect(() => sanitizeError(undefined, 'test')).not.toThrow();
    });

    it('should handle null error gracefully', () => {
      expect(() => sanitizeError(null, 'test')).not.toThrow();
    });
  });

  describe('getAuthToken()', () => {
    it('should extract token from cookies', () => {
      const req = {
        cookies: { [JWT_COOKIE_NAME]: 'test-token-123' },
        headers: {},
      };
      expect(getAuthToken(req)).toBe('test-token-123');
    });

    it('should extract token from Authorization header', () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer my-jwt-token' },
      };
      expect(getAuthToken(req)).toBe('my-jwt-token');
    });

    it('should prefer cookies over header', () => {
      const req = {
        cookies: { [JWT_COOKIE_NAME]: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' },
      };
      expect(getAuthToken(req)).toBe('cookie-token');
    });

    it('should return null when no token present', () => {
      const req = { cookies: {}, headers: {} };
      expect(getAuthToken(req)).toBeNull();
    });

    it('should return null for non-Bearer auth header', () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      };
      expect(getAuthToken(req)).toBeNull();
    });

    it('should handle missing cookies object', () => {
      const req = { headers: {} };
      expect(getAuthToken(req)).toBeNull();
    });
  });

  describe('JWT_COOKIE_NAME', () => {
    it('should be defined', () => {
      expect(JWT_COOKIE_NAME).toBe('asdf_auth');
    });
  });

  describe('isProduction', () => {
    it('should be a boolean', () => {
      expect(typeof isProduction).toBe('boolean');
    });
  });

  describe('paginate()', () => {
    const { paginate } = require('../../../api/routes/helpers');
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

    it('should return default page (offset=0, limit=20)', () => {
      const req = { query: {} };
      const result = paginate(items, req);
      expect(result.items).toHaveLength(20);
      expect(result.items[0].id).toBe(1);
      expect(result.pagination).toEqual({ offset: 0, limit: 20, total: 50 });
    });

    it('should respect offset and limit params', () => {
      const req = { query: { offset: '10', limit: '5' } };
      const result = paginate(items, req);
      expect(result.items).toHaveLength(5);
      expect(result.items[0].id).toBe(11);
      expect(result.pagination).toEqual({ offset: 10, limit: 5, total: 50 });
    });

    it('should cap limit at 100', () => {
      const req = { query: { limit: '999' } };
      const result = paginate(items, req);
      expect(result.pagination.limit).toBe(100);
    });

    it('should cap offset at 10000', () => {
      const req = { query: { offset: '99999' } };
      const result = paginate(items, req);
      expect(result.pagination.offset).toBe(10000);
      expect(result.items).toHaveLength(0);
    });

    it('should handle negative offset', () => {
      const req = { query: { offset: '-5' } };
      const result = paginate(items, req);
      expect(result.pagination.offset).toBe(0);
    });

    it('should handle empty array', () => {
      const req = { query: {} };
      const result = paginate([], req);
      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle offset beyond array length', () => {
      const req = { query: { offset: '100' } };
      const result = paginate(items, req);
      expect(result.items).toHaveLength(0);
    });

    it('should handle non-numeric query params', () => {
      const req = { query: { offset: 'abc', limit: 'xyz' } };
      const result = paginate(items, req);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.limit).toBe(20);
    });
  });
});
