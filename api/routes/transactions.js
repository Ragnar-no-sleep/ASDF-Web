/**
 * Transactions Routes Module
 *
 * Handles all transaction-related endpoints:
 * - Transaction Builder: burn, transfer, verify
 * - Transaction Monitor: track, status, history, admin active
 * - Priority Fee: estimates, account-based fees, congestion, compute units
 */

'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const { authMiddleware } = require('../services/auth');
const { requireAdmin } = require('../services/security');
const { isValidAddress } = require('../services/helius');
const {
  buildBurnTransaction,
  buildTransferTransaction,
  verifyTransaction,
  getTransactionMetrics,
} = require('../services/transactions');
const {
  trackTransaction,
  getTransactionStatus,
  getActiveTransactions,
  getWalletHistory: getTxWalletHistory,
  getStats: getTxMonitorStats,
  TX_TYPES,
} = require('../services/txMonitor');
const {
  getEstimate: getPriorityFeeEstimateV2,
  getAccountFeeEstimate,
  getCongestionAnalysis,
  estimateComputeUnits,
  getStats: getPriorityFeeStats,
} = require('../services/priorityFee');
const { logAudit } = require('../services/leaderboard');

// Rate limiter for wallet-based operations
const walletRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30,
  keyGenerator: req => req.user?.wallet || req.ip,
  message: { error: 'Rate limit exceeded' },
});

// ============================================
// TRANSACTION BUILDER ROUTES
// ============================================

/**
 * Build burn transaction
 * POST /transactions/burn
 */
router.post('/transactions/burn', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { amount, priorityLevel } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const transaction = await buildBurnTransaction(req.user.wallet, amount, { priorityLevel });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'build-burn-tx') });
  }
});

/**
 * Build transfer transaction
 * POST /transactions/transfer
 */
router.post('/transactions/transfer', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { toWallet, mint, amount, priorityLevel } = req.body;

    if (!toWallet || !isValidAddress(toWallet)) {
      return res.status(400).json({ error: 'Valid destination wallet required' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const transaction = await buildTransferTransaction(
      req.user.wallet,
      toWallet,
      mint || process.env.ASDF_TOKEN_MINT,
      amount,
      { priorityLevel }
    );

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'build-transfer-tx') });
  }
});

/**
 * Verify signed transaction
 * POST /transactions/verify
 */
router.post('/transactions/verify', authMiddleware, async (req, res) => {
  try {
    const { transactionId, signature } = req.body;

    if (!transactionId || !signature) {
      return res.status(400).json({ error: 'Transaction ID and signature required' });
    }

    const result = verifyTransaction(transactionId, signature, req.user.wallet);

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'verify-tx') });
  }
});

// ============================================
// TRANSACTION MONITOR ROUTES
// ============================================

/**
 * Track a transaction
 * POST /transactions/track
 */
router.post('/transactions/track', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { signature, type, amount, metadata } = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Transaction signature required' });
    }

    const tracker = trackTransaction(signature, {
      wallet: req.user.wallet,
      type: type || TX_TYPES.CUSTOM,
      amount,
      metadata,
    });

    res.json({
      signature: tracker.signature,
      state: tracker.state,
      tracking: true,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'track-tx') });
  }
});

/**
 * Get transaction status
 * GET /transactions/status/:signature
 */
router.get('/transactions/status/:signature', async (req, res) => {
  try {
    const status = getTransactionStatus(req.params.signature);

    if (!status) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'tx-status') });
  }
});

/**
 * Get user's transaction history
 * GET /transactions/history
 */
router.get('/transactions/history', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const history = getTxWalletHistory(req.user.wallet, limit);

    res.json({ history, count: history.length });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'tx-history') });
  }
});

/**
 * Get active transactions (admin only)
 * GET /admin/transactions/active
 */
router.get('/admin/transactions/active', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const active = getActiveTransactions();
    const stats = getTxMonitorStats();

    res.json({ active, stats });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'active-tx') });
  }
});

// ============================================
// PRIORITY FEE ROUTES
// ============================================

/**
 * Get priority fee estimate (v2 with full analysis)
 * GET /priority-fee
 */
router.get('/priority-fee', async (req, res) => {
  try {
    const priorityLevel = req.query.level || 'medium';
    const computeUnits = parseInt(req.query.computeUnits) || 200000;

    const estimate = await getPriorityFeeEstimateV2({
      priorityLevel,
      computeUnits,
    });

    res.json(estimate);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'priority-fee') });
  }
});

/**
 * Get priority fee for specific accounts
 * POST /priority-fee/accounts
 */
router.post('/priority-fee/accounts', async (req, res) => {
  try {
    const { accountKeys, priorityLevel } = req.body;

    if (!accountKeys || !Array.isArray(accountKeys)) {
      return res.status(400).json({ error: 'accountKeys array required' });
    }

    const estimate = await getAccountFeeEstimate(accountKeys, priorityLevel || 'medium');

    res.json(estimate);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'account-fee') });
  }
});

/**
 * Get network congestion analysis
 * GET /priority-fee/congestion
 */
router.get('/priority-fee/congestion', async (req, res) => {
  try {
    const analysis = getCongestionAnalysis();
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'congestion') });
  }
});

/**
 * Get compute unit estimate for transaction type
 * GET /priority-fee/compute-units
 */
router.get('/priority-fee/compute-units', (req, res) => {
  try {
    const txType = req.query.type || 'transfer';
    const computeUnits = estimateComputeUnits(txType);

    res.json({ txType, computeUnits });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'compute-units') });
  }
});

/**
 * Get fee history (admin only)
 * GET /admin/priority-fee
 *
 * NOTE: getFeeHistory and getFeeHourlyAverages are not implemented in priorityFee.js
 * This route will only return stats until those functions are added.
 */
router.get('/admin/priority-fee', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = getPriorityFeeStats();

    // TODO: Implement getFeeHistory and getFeeHourlyAverages in priorityFee.js
    // const history = getFeeHistory(50);
    // const hourly = getFeeHourlyAverages(24);
    // res.json({ stats, history, hourlyAverages: hourly });

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'fee-admin') });
  }
});

module.exports = router;
