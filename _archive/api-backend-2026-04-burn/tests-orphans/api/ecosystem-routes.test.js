/**
 * @jest-environment node
 */

'use strict';

// Mock service dependencies before requiring the module
const mockGetTopBurners = jest.fn();
const mockGetXPLeaderboard = jest.fn();
const mockGetUserRank = jest.fn();
const mockGetStatistics = jest.fn();
const mockGetTokenSupply = jest.fn();

jest.mock('../../../api/services/leaderboard', () => ({
  getTopBurners: mockGetTopBurners,
  getXPLeaderboard: mockGetXPLeaderboard,
  getUserRank: mockGetUserRank,
  getStatistics: mockGetStatistics,
}));

jest.mock('../../../api/services/helius', () => ({
  getTokenSupply: mockGetTokenSupply,
  getRecentBurns: jest.fn().mockReturnValue([]),
  getWalletBurnHistory: jest.fn().mockReturnValue([]),
  getBatchTokenBalances: jest.fn().mockResolvedValue([]),
  getPriorityFeeEstimate: jest.fn().mockResolvedValue({}),
  isValidAddress: jest.fn(addr => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)),
}));

jest.mock('../../../api/services/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { wallet: 'TestWallet1234567890abcdefghij', tier: 'holder' };
    next();
  },
  optionalAuthMiddleware: (req, res, next) => next(),
}));

// Mock parent index for walletRateLimiter
jest.mock('../../../api/index', () => ({
  walletRateLimiter: (req, res, next) => next(),
}));

const express = require('express');

describe('Ecosystem Routes', () => {
  let app;
  let router;

  beforeAll(() => {
    router = require('../../../api/routes/ecosystem');
    app = express();
    app.use(express.json());
    app.use('/api', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/leaderboard/burns', () => {
    it('should return paginated entries with default params', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        wallet: `wallet${i}`,
        amount: 1000 - i * 10,
      }));
      mockGetTopBurners.mockReturnValue(mockData);

      const res = await makeRequest(app, '/api/leaderboard/burns');

      expect(res.statusCode).toBe(200);
      expect(res.body.entries).toHaveLength(25);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.offset).toBe(0);
      expect(res.body.timeframe).toBe('all');
    });

    it('should respect offset parameter', async () => {
      const mockData = Array.from({ length: 30 }, (_, i) => ({
        wallet: `wallet${i}`,
        amount: 1000 - i * 10,
      }));
      // Mock implements pagination so the route can trust the service
      mockGetTopBurners.mockImplementation((offset, limit) =>
        mockData.slice(offset, offset + limit)
      );

      const res = await makeRequest(app, '/api/leaderboard/burns?offset=10&limit=20');

      expect(res.statusCode).toBe(200);
      expect(res.body.entries).toHaveLength(20);
      expect(res.body.entries[0].wallet).toBe('wallet10');
      expect(res.body.pagination.offset).toBe(10);
    });

    it('should validate timeframe parameter', async () => {
      mockGetTopBurners.mockReturnValue([]);

      const res = await makeRequest(app, '/api/leaderboard/burns?timeframe=invalid');

      expect(res.statusCode).toBe(200);
      expect(res.body.timeframe).toBe('all');
    });

    it('should accept valid timeframes', async () => {
      mockGetTopBurners.mockReturnValue([]);

      for (const tf of ['all', 'month', 'week', 'day']) {
        const res = await makeRequest(app, `/api/leaderboard/burns?timeframe=${tf}`);
        expect(res.body.timeframe).toBe(tf);
      }
    });
  });

  describe('GET /api/leaderboard/xp', () => {
    it('should return paginated XP leaderboard', async () => {
      const mockData = [
        { wallet: 'w1', xp: 500 },
        { wallet: 'w2', xp: 300 },
      ];
      mockGetXPLeaderboard.mockReturnValue(mockData);

      const res = await makeRequest(app, '/api/leaderboard/xp');

      expect(res.statusCode).toBe(200);
      expect(res.body.entries).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/stats', () => {
    it('should return ecosystem statistics', async () => {
      mockGetStatistics.mockReturnValue({
        totalBurned: 1000000,
        uniqueBurners: 500,
        totalHolders: 2847,
      });

      const res = await makeRequest(app, '/api/stats');

      expect(res.statusCode).toBe(200);
      expect(res.body.totalBurned).toBeDefined();
    });
  });
});

// Simple request helper (no supertest needed)
function makeRequest(app, path) {
  return new Promise(resolve => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = server.address().port;
      http.get(`http://127.0.0.1:${port}${path}`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data || '{}'),
          });
        });
      });
    });
  });
}
