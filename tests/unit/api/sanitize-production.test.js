/**
 * @jest-environment node
 *
 * Tests sanitizeError behavior in production mode.
 * In production, internal details (DB errors, stack traces, etc.) must be hidden.
 */

'use strict';

describe('sanitizeError - Production Behavior', () => {
  let sanitizeError;
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // Force production mode
    process.env.NODE_ENV = 'production';
    // Clear module cache so isProduction re-evaluates
    jest.resetModules();
    ({ sanitizeError } = require('../../../api/routes/helpers'));
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  describe('should EXPOSE safe user-facing messages', () => {
    const safeMessages = [
      'Item not found',
      'Already owned by user',
      'Insufficient balance for purchase',
      'Invalid wallet address',
      'Requires higher tier',
      'Purchase expired',
      'Signature required',
      'Already used',
      'Cannot purchase this item',
      'Cannot unequip default skin',
    ];

    test.each(safeMessages)('"%s" should pass through', msg => {
      expect(sanitizeError(new Error(msg), 'test')).toBe(msg);
    });
  });

  describe('should HIDE sensitive internal details', () => {
    it('should hide JWT/token errors', () => {
      const result = sanitizeError(new Error('jwt malformed: invalid payload'), 'test');
      expect(result).toBe('Session expired. Please reconnect your wallet.');
      expect(result).not.toContain('jwt');
      expect(result).not.toContain('malformed');
    });

    it('should hide database errors', () => {
      const result = sanitizeError(
        new Error('database connection refused at postgres://user:pass@host:5432/db'),
        'test'
      );
      expect(result).toBe('Something went wrong. Please try again in a moment.');
      expect(result).not.toContain('postgres');
      expect(result).not.toContain('password');
    });

    it('should hide SQL errors', () => {
      const result = sanitizeError(new Error('SQL syntax error near SELECT * FROM users'), 'test');
      expect(result).toBe('Something went wrong. Please try again in a moment.');
      expect(result).not.toContain('SELECT');
      expect(result).not.toContain('users');
    });

    it('should hide timeout details', () => {
      const result = sanitizeError(
        new Error('Request timeout after 30000ms to 10.0.0.1:5432'),
        'test'
      );
      expect(result).toBe('The request took too long. Please try again.');
      expect(result).not.toContain('10.0.0.1');
    });

    it('should hide network/fetch errors', () => {
      const result = sanitizeError(
        new Error('fetch failed: ECONNREFUSED https://internal-api.example.com/secret'),
        'test'
      );
      expect(result).toBe('Could not reach the server. Check your connection and retry.');
      expect(result).not.toContain('internal-api');
    });

    it('should hide Helius RPC errors', () => {
      const result = sanitizeError(new Error('helius rate limit exceeded for key xxx-yyy'), 'test');
      expect(result).toBe('Could not reach the server. Check your connection and retry.');
      expect(result).not.toContain('xxx-yyy');
    });

    it('should hide rate limit details', () => {
      const result = sanitizeError(
        new Error('Rate limit exceeded: 100/minute for IP 1.2.3.4'),
        'test'
      );
      expect(result).toBe('Too many requests. Please wait a moment before trying again.');
      expect(result).not.toContain('1.2.3.4');
    });

    it('should hide permission/forbidden details', () => {
      const result = sanitizeError(new Error('Permission denied for admin endpoint'), 'test');
      expect(result).toBe('You do not have permission to perform this action.');
    });

    it('should hide unknown errors with generic message', () => {
      const result = sanitizeError(
        new Error('TypeError: Cannot read properties of undefined'),
        'test'
      );
      expect(result).toBe('Something went wrong. Please try again.');
      expect(result).not.toContain('TypeError');
      expect(result).not.toContain('undefined');
    });

    it('should hide stack traces', () => {
      const error = new Error('Internal crash');
      error.stack = 'Error: Internal crash\n  at /app/api/services/secret.js:42:13';
      const result = sanitizeError(error, 'test');
      expect(result).toBe('Something went wrong. Please try again.');
      expect(result).not.toContain('/app/');
      expect(result).not.toContain('secret.js');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined', () => {
      expect(() => sanitizeError(undefined, 'test')).not.toThrow();
    });

    it('should handle null', () => {
      expect(() => sanitizeError(null, 'test')).not.toThrow();
    });

    it('should handle numeric error', () => {
      expect(() => sanitizeError(42, 'test')).not.toThrow();
    });

    it('should handle object error', () => {
      expect(() => sanitizeError({ code: 'ENOENT' }, 'test')).not.toThrow();
    });
  });
});
