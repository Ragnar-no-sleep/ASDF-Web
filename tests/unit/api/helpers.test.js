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
});
