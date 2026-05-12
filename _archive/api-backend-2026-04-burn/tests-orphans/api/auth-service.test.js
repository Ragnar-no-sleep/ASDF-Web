/**
 * @jest-environment node
 */

'use strict';

// Set required env vars BEFORE requiring auth module
process.env.JWT_SECRET = 'test_secret_for_unit_tests_only_minimum_32_chars!';
process.env.NODE_ENV = 'test';

const {
  generateChallenge,
  verifyAndAuthenticate,
  authMiddleware,
} = require('../../../api/services/auth');

describe('Auth Service', () => {
  describe('generateChallenge()', () => {
    it('should generate a challenge for valid wallet', () => {
      const wallet = '9F5NUrZYVqRWmwTuLVPFchvVhPkLyU2vKJxZWrughCip';
      const result = generateChallenge(wallet);

      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.challenge).toBe('string');
      expect(result.challenge.length).toBeGreaterThan(0);
      expect(result.challenge).toContain('ASDF');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should generate unique challenges', () => {
      const wallet = '9F5NUrZYVqRWmwTuLVPFchvVhPkLyU2vKJxZWrughCip';
      const result1 = generateChallenge(wallet);
      const result2 = generateChallenge(wallet);

      expect(result1.challenge).not.toBe(result2.challenge);
    });

    it('should reject empty wallet', () => {
      expect(() => generateChallenge('')).toThrow();
    });

    it('should reject null wallet', () => {
      expect(() => generateChallenge(null)).toThrow();
    });
  });

  describe('verifyAndAuthenticate()', () => {
    it('should reject invalid signature', async () => {
      const wallet = '9F5NUrZYVqRWmwTuLVPFchvVhPkLyU2vKJxZWrughCip';
      generateChallenge(wallet); // Create a pending challenge

      await expect(verifyAndAuthenticate(wallet, 'invalid-signature-data')).rejects.toThrow();
    });

    it('should reject wallet with no pending challenge', async () => {
      const wallet = 'BRjpCHtyQLNbRfLRPjb4vJdE64Rx9JhAEqSq7yKuN3m4';

      await expect(verifyAndAuthenticate(wallet, 'any-signature')).rejects.toThrow();
    });
  });

  describe('authMiddleware()', () => {
    it('should reject request without token', () => {
      const req = { cookies: {}, headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer invalid.jwt.token' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
