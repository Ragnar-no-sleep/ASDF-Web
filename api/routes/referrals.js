/**
 * Referral Routes Module
 *
 * Handles all referral-related endpoints:
 * - Get or create referral code
 * - Get referral stats
 * - Apply referral code
 * - Validate referral code (public)
 * - Get referral leaderboard
 */

'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const { authMiddleware } = require('../services/auth');
const {
  getOrCreateReferralCode,
  validateCode: validateReferralCode,
  processReferral,
  getReferralStats,
  getReferralLeaderboard,
} = require('../services/referrals');
const { logAudit } = require('../services/leaderboard');
const { EVENTS, publish: publishEvent } = require('../services/eventBus');

// Rate limiter for referral endpoints
const walletRateLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  keyGenerator: req => req.user?.wallet || req.ip,
  message: { error: 'Rate limit exceeded' },
});

// ============================================
// REFERRAL ROUTES
// ============================================

/**
 * Get or create referral code
 * GET /referrals/code
 */
router.get('/referrals/code', authMiddleware, async (req, res) => {
  try {
    const result = getOrCreateReferralCode(req.user.wallet);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-referral-code') });
  }
});

/**
 * Get referral stats
 * GET /referrals/stats
 */
router.get('/referrals/stats', authMiddleware, async (req, res) => {
  try {
    const stats = getReferralStats(req.user.wallet);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'referral-stats') });
  }
});

/**
 * Apply referral code
 * POST /referrals/apply
 */
router.post('/referrals/apply', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Referral code required' });
    }

    const result = processReferral(req.user.wallet, code);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Emit event for other services
    publishEvent(EVENTS.REFERRAL_COMPLETED, {
      referrer: result.referrerWallet,
      referee: req.user.wallet,
      rewards: result.rewards,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'apply-referral') });
  }
});

/**
 * Validate referral code (public)
 * GET /referrals/validate/:code
 */
router.get('/referrals/validate/:code', async (req, res) => {
  try {
    const result = validateReferralCode(req.params.code);
    res.json({
      valid: result.valid,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'validate-code') });
  }
});

/**
 * Get referral leaderboard
 * GET /referrals/leaderboard
 */
router.get('/referrals/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const leaderboard = getReferralLeaderboard(limit);

    res.json({
      entries: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'referral-leaderboard') });
  }
});

module.exports = router;
