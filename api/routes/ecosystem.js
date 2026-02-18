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

// walletRateLimiter is defined in index.js but not exported — use no-op until extracted
const walletRateLimiter = (req, res, next) => next();

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
    const offset = Math.max(0, Math.min(parseInt(req.query.offset) || 0, 10000));
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const timeframe = ['all', 'month', 'week', 'day'].includes(req.query.timeframe)
      ? req.query.timeframe
      : 'all';

    const allEntries = getTopBurners(offset + limit, timeframe);
    const entries = allEntries.slice(offset);

    res.json({
      timeframe,
      entries,
      count: entries.length,
      pagination: { offset, limit, total: allEntries.length },
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
    const offset = Math.max(0, Math.min(parseInt(req.query.offset) || 0, 10000));
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const allEntries = getXPLeaderboard(offset + limit);
    const entries = allEntries.slice(offset);

    res.json({
      entries,
      count: entries.length,
      pagination: { offset, limit, total: allEntries.length },
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

// ============================================
// RENDER STATUS (Command Center)
// ============================================

// Cache: 30s TTL to avoid hammering Render API
let _renderStatusCache = null;
let _renderStatusTs = 0;
const RENDER_CACHE_TTL = 30_000;

/**
 * Map Render service status to ecosystem-map status
 * Render statuses: live, not_found, build_in_progress, update_in_progress, suspended, ...
 */
function mapRenderStatus(renderStatus) {
  if (!renderStatus) return 'down';
  if (renderStatus === 'live') return 'live';
  if (renderStatus.includes('progress') || renderStatus === 'created') return 'deploying';
  if (renderStatus === 'suspended' || renderStatus === 'not_found') return 'down';
  return 'down';
}

/**
 * GET /api/ecosystem/render-status
 * Returns current ASDF-Web Render deployment status.
 * Requires env: RENDER_API_KEY, RENDER_SERVICE_ID (or falls back to name search)
 */
router.get('/ecosystem/render-status', async (req, res) => {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;

  if (!apiKey) {
    return res.json({ status: 'unknown', error: 'RENDER_API_KEY not configured' });
  }

  // Serve from cache if fresh
  if (_renderStatusCache && Date.now() - _renderStatusTs < RENDER_CACHE_TTL) {
    return res.json(_renderStatusCache);
  }

  try {
    let targetId = serviceId;

    // If no explicit service ID — search by name
    if (!targetId) {
      const listRes = await fetch('https://api.render.com/v1/services?name=asdf-api&limit=5', {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!listRes.ok) throw new Error(`Render API list: ${listRes.status}`);
      const listData = await listRes.json();
      const match = listData.find?.(item => item?.service?.name === 'asdf-api');
      targetId = match?.service?.id;
    }

    if (!targetId) {
      return res.json({ status: 'unknown', error: 'Service asdf-api not found on Render' });
    }

    // Get service details
    const svcRes = await fetch(`https://api.render.com/v1/services/${targetId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!svcRes.ok) throw new Error(`Render API service: ${svcRes.status}`);
    const svcData = await svcRes.json();

    // Get latest deploy
    const deployRes = await fetch(
      `https://api.render.com/v1/services/${targetId}/deploys?limit=1`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    const deployData = deployRes.ok ? await deployRes.json() : [];
    const lastDeploy = deployData[0]?.deploy ?? null;

    const result = {
      status: mapRenderStatus(svcData.serviceDetails?.status),
      serviceId: targetId,
      serviceName: svcData.name,
      serviceUrl: svcData.serviceDetails?.url,
      lastDeploy: lastDeploy?.finishedAt ?? lastDeploy?.createdAt ?? null,
      lastDeployStatus: lastDeploy?.status ?? null,
    };

    _renderStatusCache = result;
    _renderStatusTs = Date.now();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'render-status') });
  }
});

module.exports = router;
