/**
 * Helius / Blockchain Routes Module
 *
 * Handles all Helius-related endpoints:
 * - Webhook: Real-time burn tracking (v1 + v2 enhanced)
 * - Asset Verification: NFTs, collections, token balances via DAS API
 * - DAS API: Asset lookup, owner assets, transaction simulate/parse, health
 * - Token Metadata: metadata, batch, holders, distribution, transfers, burns, price
 * - Helius Metrics: Prometheus + JSON formats (admin only)
 * - Admin Webhook Management: list + register webhooks
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Helpers
const { sanitizeError, isProduction } = require('./helpers');

// Auth & Security
const { authMiddleware } = require('../services/auth');
const { requireAdmin } = require('../services/security');

// Rate limiter for wallet-scoped routes
const walletRateLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  keyGenerator: req => req.user?.wallet || req.ip,
  message: { error: 'Rate limit exceeded' },
});

// Services - Helius
const {
  getRecentBurns,
  getWalletBurnHistory,
  healthCheck,
  isValidAddress,
} = require('../services/helius');

// Services - Assets (DAS)
const {
  getWalletNFTs,
  verifyNFTOwnership,
  verifyCollectionOwnership,
  getTokenBalances: getDASTokenBalances,
  getAssetDetails,
  checkRateLimit: checkAssetRateLimit,
  getAssetMetrics,
} = require('../services/assets');

// Services - Webhooks
const {
  verifyWebhookSignature: verifyHeliusSignature,
  processWebhookEvent,
  getWebhookMetrics,
  registerWebhook,
  listWebhooks,
} = require('../services/webhooks');

// Services - Leaderboard
const { recordBurn, logAudit } = require('../services/leaderboard');

// Services - Achievements (for v2 webhook burn tracking)
const { recordBurnForAchievements } = require('../services/achievements');

// Services - Metrics
const { getSummaryMetrics } = require('../services/metrics');

// Lazy-loaded services (avoid circular deps)
let heliusEnhanced = null;
function getHeliusEnhanced() {
  if (!heliusEnhanced) {
    heliusEnhanced = require('../services/heliusEnhanced');
  }
  return heliusEnhanced;
}

let tokenMetadata = null;
function getTokenMetadata() {
  if (!tokenMetadata) {
    tokenMetadata = require('../services/tokenMetadata');
  }
  return tokenMetadata;
}

let heliusMetrics = null;
function getHeliusMetrics() {
  if (!heliusMetrics) {
    heliusMetrics = require('../services/heliusMetrics');
  }
  return heliusMetrics;
}

// ============================================
// HELIUS WEBHOOK - REAL-TIME BURN TRACKING
// ============================================

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

/**
 * Verify Helius webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Helius-Signature header
 * @returns {boolean} Is valid
 */
function verifyWebhookSignature(payload, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] HELIUS_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    // Length mismatch
    return false;
  }
}

/**
 * Helius webhook endpoint for burn events
 * POST /api/webhook/helius
 *
 * Configure in Helius Dashboard:
 * - URL: https://your-api.com/api/webhook/helius
 * - Transaction Types: BURN
 * - Account: ASDF token mint address
 */
router.post(
  '/webhook/helius',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    try {
      const signature = req.headers['x-helius-signature'];
      const payload = req.body.toString();

      // SECURITY: Always verify webhook signature
      // Require WEBHOOK_SECRET to be configured
      if (!WEBHOOK_SECRET) {
        console.error(
          '[Webhook] CRITICAL: HELIUS_WEBHOOK_SECRET not configured - rejecting request'
        );
        return res.status(503).json({ error: 'Webhook not configured' });
      }
      if (!signature || !verifyWebhookSignature(payload, signature)) {
        console.warn('[Webhook] Invalid signature - rejecting request');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const events = JSON.parse(payload);

      // Process each burn event
      let processedBurns = 0;
      for (const event of events) {
        if (event.type === 'BURN' || event.tokenTransfers?.some(t => t.tokenAmount < 0)) {
          const burn = {
            signature: event.signature,
            wallet: event.feePayer,
            amount: Math.abs(event.tokenTransfers?.[0]?.tokenAmount || 0),
            timestamp: event.timestamp,
            slot: event.slot,
          };

          if (burn.wallet && burn.amount > 0) {
            // Record to leaderboard
            recordBurn(burn.wallet, burn.amount, burn.signature);
            processedBurns++;

            // Audit log
            logAudit('webhook_burn', {
              wallet: burn.wallet.slice(0, 8) + '...',
              amount: burn.amount,
              signature: burn.signature.slice(0, 16) + '...',
            });

            console.log(
              `[Webhook] Burn recorded: ${burn.wallet.slice(0, 8)}... burned ${burn.amount} tokens`
            );
          }
        }
      }

      res.json({ received: true, processed: events.length });
    } catch (error) {
      console.error('[Webhook] Error processing:', error.message);
      // Always return 200 to prevent Helius retries on processing errors
      res.json({ received: true, error: 'Processing error' });
    }
  }
);

// ============================================
// ASSET VERIFICATION ROUTES (DAS API)
// ============================================

/**
 * Get user's NFTs
 * GET /api/assets/nfts
 */
router.get('/assets/nfts', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const rateCheck = checkAssetRateLimit(req.user.wallet);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Asset API rate limit exceeded',
        remaining: rateCheck.remaining,
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const collection = req.query.collection || null;

    const nfts = await getWalletNFTs(req.user.wallet, { page, limit, collection });

    res.json(nfts);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-nfts') });
  }
});

/**
 * Verify NFT ownership
 * GET /api/assets/verify/nft/:mint
 */
router.get('/assets/verify/nft/:mint', authMiddleware, async (req, res) => {
  try {
    const { mint } = req.params;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const result = await verifyNFTOwnership(req.user.wallet, mint);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'verify-nft') });
  }
});

/**
 * Verify collection ownership
 * GET /api/assets/verify/collection/:address
 */
router.get('/assets/verify/collection/:address', authMiddleware, async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid collection address' });
    }

    const result = await verifyCollectionOwnership(req.user.wallet, address);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'verify-collection') });
  }
});

/**
 * Get token balances via DAS API
 * GET /api/assets/tokens
 */
router.get('/assets/tokens', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const rateCheck = checkAssetRateLimit(req.user.wallet);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Asset API rate limit exceeded',
        remaining: rateCheck.remaining,
      });
    }

    const balances = await getDASTokenBalances(req.user.wallet);

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-tokens') });
  }
});

/**
 * Get asset details
 * GET /api/assets/:mint
 */
router.get('/assets/:mint', async (req, res) => {
  try {
    const { mint } = req.params;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const details = await getAssetDetails(mint);

    if (details.error) {
      return res.status(404).json({ error: details.error });
    }

    res.json(details);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'asset-details') });
  }
});

// ============================================
// HELIUS DAS API ROUTES
// ============================================

/**
 * Get asset via DAS API (supports cNFTs)
 * GET /api/das/asset/:id
 */
router.get('/das/asset/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidAddress(id)) {
      return res.status(400).json({ error: 'Invalid asset ID' });
    }

    const asset = await getHeliusEnhanced().getAsset(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'das-asset') });
  }
});

/**
 * Get assets by owner via DAS API
 * GET /api/das/owner/:address
 */
router.get('/das/owner/:address', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const assets = await getHeliusEnhanced().getAssetsByOwner(address, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });

    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'das-owner') });
  }
});

/**
 * Simulate transaction
 * POST /api/transaction/simulate
 */
router.post('/transaction/simulate', authMiddleware, async (req, res) => {
  try {
    const { transaction, accounts } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction required' });
    }

    const result = await getHeliusEnhanced().simulateTransaction(transaction, { accounts });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'simulate-tx') });
  }
});

/**
 * Parse transaction with enhanced data
 * GET /api/transaction/parse/:signature
 */
router.get('/transaction/parse/:signature', async (req, res) => {
  try {
    const { signature } = req.params;

    // Basic signature validation (base58, 88 chars)
    if (!signature || signature.length < 80 || signature.length > 100) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const parsed = await getHeliusEnhanced().parseTransaction(signature);

    if (!parsed) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'parse-tx') });
  }
});

/**
 * Get Helius service health
 * GET /api/helius/health
 */
router.get('/helius/health', async (req, res) => {
  try {
    const health = await getHeliusEnhanced().healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ healthy: false, error: error.message });
  }
});

// ============================================
// TOKEN METADATA ROUTES
// ============================================

/**
 * Get token metadata
 * GET /api/token/:mint/metadata
 */
router.get('/token/:mint/metadata', async (req, res) => {
  try {
    const { mint } = req.params;

    // Basic validation (base58, 32-44 chars)
    if (!mint || !isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const metadata = await getTokenMetadata().getTokenMetadata(mint);

    if (!metadata) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'token-metadata') });
  }
});

/**
 * Get batch token metadata
 * POST /api/token/metadata/batch
 */
router.post('/token/metadata/batch', async (req, res) => {
  try {
    const { mints } = req.body;

    if (!Array.isArray(mints) || mints.length === 0) {
      return res.status(400).json({ error: 'Mints array required' });
    }

    if (mints.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 tokens per batch' });
    }

    // Validate all addresses
    for (const mint of mints) {
      if (!isValidAddress(mint)) {
        return res.status(400).json({ error: `Invalid mint: ${mint}` });
      }
    }

    const results = await getTokenMetadata().getBatchTokenMetadata(mints);

    // Convert Map to object for JSON
    const response = {};
    for (const [key, value] of results) {
      response[key] = value;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'batch-metadata') });
  }
});

/**
 * Get token holders
 * GET /api/token/:mint/holders
 */
router.get('/token/:mint/holders', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { mint } = req.params;
    const { limit = 100, cursor } = req.query;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const holders = await getTokenMetadata().getTokenHolders(mint, {
      limit: Math.min(parseInt(limit) || 100, 1000),
      cursor: cursor || null,
    });

    res.json(holders);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'token-holders') });
  }
});

/**
 * Get token holder distribution analysis
 * GET /api/token/:mint/distribution
 */
router.get('/token/:mint/distribution', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { mint } = req.params;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const distribution = await getTokenMetadata().analyzeHolderDistribution(mint);

    if (!distribution) {
      return res.status(404).json({ error: 'Unable to analyze distribution' });
    }

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'token-distribution') });
  }
});

/**
 * Get recent token transfers
 * GET /api/token/:mint/transfers
 */
router.get('/token/:mint/transfers', async (req, res) => {
  try {
    const { mint } = req.params;
    const { limit = 100, before } = req.query;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const transfers = await getTokenMetadata().getTokenTransfers(mint, {
      limit: Math.min(parseInt(limit) || 100, 100),
      before: before || '',
    });

    res.json({ transfers });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'token-transfers') });
  }
});

/**
 * Get token burns
 * GET /api/token/:mint/burns
 */
router.get('/token/:mint/burns', async (req, res) => {
  try {
    const { mint } = req.params;
    const { limit = 100 } = req.query;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const burns = await getTokenMetadata().getTokenBurns(mint, {
      limit: Math.min(parseInt(limit) || 100, 100),
    });

    res.json({ burns });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'token-burns') });
  }
});

/**
 * Get token price
 * GET /api/token/:mint/price
 */
router.get('/token/:mint/price', async (req, res) => {
  try {
    const { mint } = req.params;

    if (!isValidAddress(mint)) {
      return res.status(400).json({ error: 'Invalid mint address' });
    }

    const price = await getTokenMetadata().getTokenPrice(mint);
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'token-price') });
  }
});

/**
 * Get token metadata service health
 * GET /api/token/health
 */
router.get('/token/health', async (req, res) => {
  try {
    const health = await getTokenMetadata().healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ healthy: false, error: error.message });
  }
});

// ============================================
// HELIUS METRICS ROUTES
// ============================================

/**
 * Get Helius metrics (Prometheus format)
 * GET /api/helius/metrics
 */
router.get('/helius/metrics', authMiddleware, requireAdmin, (req, res) => {
  try {
    const metrics = getHeliusMetrics().getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Helius metrics (JSON format)
 * GET /api/helius/metrics/json
 */
router.get('/helius/metrics/json', authMiddleware, requireAdmin, (req, res) => {
  try {
    const metrics = getHeliusMetrics().getJsonMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENHANCED WEBHOOK HANDLER
// ============================================

/**
 * Enhanced Helius webhook endpoint
 * POST /api/webhook/helius/v2
 * Uses the new webhooks service with full event processing
 */
router.post(
  '/webhook/helius/v2',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    try {
      const signature = req.headers['x-helius-signature'];
      const payload = req.body.toString();

      // Verify webhook signature
      if (isProduction) {
        if (!verifyHeliusSignature(payload, signature)) {
          logAudit('webhook_signature_failed', {});
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const events = JSON.parse(payload);
      const results = [];

      // Process each event through webhooks service
      for (const event of events) {
        const result = await processWebhookEvent(event);
        results.push(result);

        // Check for achievement unlocks on burns
        if (result.type === 'burn' && result.wallet) {
          const newAchievements = recordBurnForAchievements(result.wallet, result.amount);
          if (newAchievements.length > 0) {
            logAudit('achievements_unlocked_via_webhook', {
              wallet: result.wallet.slice(0, 8) + '...',
              count: newAchievements.length,
            });
          }
        }
      }

      res.json({
        received: true,
        processed: results.filter(r => r.processed).length,
        total: events.length,
      });
    } catch (error) {
      console.error('[Webhook v2] Error:', error.message);
      res.json({ received: true, error: 'Processing error' });
    }
  }
);

/**
 * Webhook management - list webhooks (admin only)
 * GET /api/admin/webhooks
 */
router.get('/admin/webhooks', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const webhooks = await listWebhooks();
    const metrics = getWebhookMetrics();

    res.json({
      webhooks,
      metrics,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'list-webhooks') });
  }
});

/**
 * Register new webhook (admin only)
 * POST /api/admin/webhooks
 */
router.post('/admin/webhooks', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { webhookUrl, addresses } = req.body;

    if (!webhookUrl || !addresses?.length) {
      return res.status(400).json({ error: 'webhookUrl and addresses required' });
    }

    const result = await registerWebhook(webhookUrl, addresses);

    logAudit('webhook_created', {
      admin: req.user.wallet.slice(0, 8) + '...',
      webhookId: result.webhookID,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'register-webhook') });
  }
});

module.exports = router;
