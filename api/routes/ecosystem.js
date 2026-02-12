/**
 * Ecosystem Routes Module
 *
 * Handles ecosystem and platform-wide endpoints:
 * - Ecosystem stats (supply, burns, priority fees)
 * - User burn history
 * - Batch operations (balance queries)
 * - Public configuration
 * - Leaderboards (burns, XP, ranks, stats)
 *
 * Extracted from index.js during modularization.
 */

'use strict';

const express = require('express');
const router = express.Router();

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const {
  getTokenSupply,
  getRecentBurns,
  getWalletBurnHistory,
  getBatchTokenBalances,
  getPriorityFeeEstimate,
  isValidAddress,
} = require('../services/helius');

const {
  getTopBurners,
  getXPLeaderboard,
  getUserRank,
  getStatistics,
} = require('../services/leaderboard');

const { authMiddleware, optionalAuthMiddleware } = require('../services/auth');

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================
// TODO: Move to helpers.js or middleware.js
// For now, using a placeholder reference to walletRateLimiter from index.js
// This will be properly extracted in the next refactoring step

// Temporary: Import from parent until fully modularized
let walletRateLimiter;
try {
  // This is a temporary solution - walletRateLimiter should be moved to helpers
  walletRateLimiter = require('../index').walletRateLimiter;
} catch (e) {
  // Fallback: no-op middleware if not available
  walletRateLimiter = (req, res, next) => next();
}

// ============================================
// ECOSYSTEM ROUTES
// ============================================

/**
 * Get ecosystem stats
 * GET /api/ecosystem/stats
 */
router.get('/ecosystem/stats', async (req, res) => {
  try {
    const supply = await getTokenSupply();

    res.json({
      currentSupply: supply.current,
      totalBurned: supply.burned,
      initialSupply: 1_000_000_000,
      burnPercent: ((supply.burned / 1_000_000_000) * 100).toFixed(4),
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'stats') });
  }
});

/**
 * Get recent burns
 * GET /api/ecosystem/burns
 */
router.get('/ecosystem/burns', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const burns = await getRecentBurns(limit);

    res.json({ burns });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'burns') });
  }
});

/**
 * Get current priority fee estimate
 * GET /api/ecosystem/priority-fee
 */
router.get('/ecosystem/priority-fee', async (req, res) => {
  try {
    const fee = await getPriorityFeeEstimate();

    res.json({
      priorityFee: fee,
      unit: 'microLamports',
      estimatedCost: ((fee * 50000) / 1e9).toFixed(9), // Estimated SOL cost for burn tx
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'priority-fee') });
  }
});

// ============================================
// USER BURN HISTORY
// ============================================

/**
 * Get authenticated user's burn history
 * GET /api/user/burns
 */
router.get('/user/burns', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const history = await getWalletBurnHistory(req.user.wallet, limit);

    res.json({
      wallet: req.user.wallet,
      ...history,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'user-burns') });
  }
});

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Get balances for multiple wallets
 * POST /api/batch/balances
 * Rate limited and requires auth to prevent abuse
 */
router.post('/batch/balances', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { wallets } = req.body;

    if (!Array.isArray(wallets)) {
      return res.status(400).json({ error: 'wallets must be an array' });
    }

    // Limit batch size (Fibonacci number)
    const MAX_BATCH = 21;
    if (wallets.length > MAX_BATCH) {
      return res.status(400).json({ error: `Maximum ${MAX_BATCH} wallets per request` });
    }

    // Validate all addresses
    const invalidWallets = wallets.filter(w => !isValidAddress(w));
    if (invalidWallets.length > 0) {
      return res.status(400).json({
        error: 'Invalid wallet addresses',
        invalid: invalidWallets,
      });
    }

    const balances = await getBatchTokenBalances(wallets);

    // Convert Map to object for JSON response
    const result = {};
    for (const [wallet, data] of balances) {
      result[wallet] = data;
    }

    res.json({
      balances: result,
      count: wallets.length,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'batch-balances') });
  }
});

// ============================================
// PUBLIC CONFIG
// ============================================

/**
 * Get public configuration
 * GET /api/config/public
 */
router.get('/config/public', async (req, res) => {
  try {
    const supply = await getTokenSupply();

    res.json({
      tokenMint: process.env.ASDF_TOKEN_MINT || '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
      minHolderBalance: 1_000_000,
      currentSupply: supply.current,
      totalBurned: supply.burned,
      cycleWeeks: 9,
      rotationEpoch: '2024-01-01T00:00:00Z',
    });
  } catch (error) {
    sanitizeError(error, 'config'); // Log but return defaults
    res.json({
      tokenMint: '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
      minHolderBalance: 1_000_000,
      cycleWeeks: 9,
      rotationEpoch: '2024-01-01T00:00:00Z',
    });
  }
});

// ============================================
// LEADERBOARD ROUTES
// ============================================

/**
 * Get top burners leaderboard
 * GET /api/leaderboard/burns
 */
router.get('/leaderboard/burns', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const timeframe = ['all', 'month', 'week', 'day'].includes(req.query.timeframe)
      ? req.query.timeframe
      : 'all';

    const leaderboard = getTopBurners(limit, timeframe);

    res.json({
      timeframe,
      entries: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'leaderboard-burns') });
  }
});

/**
 * Get XP/tier leaderboard
 * GET /api/leaderboard/xp
 */
router.get('/leaderboard/xp', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const leaderboard = getXPLeaderboard(limit);

    res.json({
      entries: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'leaderboard-xp') });
  }
});

/**
 * Get user's rank and stats
 * GET /api/leaderboard/rank
 */
router.get('/leaderboard/rank', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const rank = getUserRank(req.user.wallet);
    res.json(rank);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'user-rank') });
  }
});

/**
 * Get ecosystem statistics
 * GET /api/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'stats') });
  }
});

module.exports = router;
