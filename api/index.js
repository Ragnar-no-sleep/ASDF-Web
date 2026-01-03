/**
 * ASDF API - Main Entry Point
 *
 * Production-ready API server for ASDF Games
 * - Wallet authentication
 * - Shop with real burns
 * - Game score validation
 * - Leaderboards
 */

'use strict';

require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Services
const { generateChallenge, verifyAndAuthenticate, refreshToken, authMiddleware, optionalAuthMiddleware } = require('./services/auth');
const { getTokenBalance, getTokenSupply, getRecentBurns, healthCheck, isValidAddress } = require('./services/helius');
const { getCatalogWithPrices, initiatePurchase, confirmPurchase, getInventory, getEquipped, equipItem, unequipLayer, getShopMetrics } = require('./services/shop');

const app = express();
const PORT = process.env.API_PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// ERROR SANITIZATION UTILITY
// ============================================

/**
 * Sanitize error message for client response
 * In production, hide internal details
 * @param {Error|string} error - Error to sanitize
 * @param {string} context - Error context for logging
 * @returns {string} Safe error message
 */
function sanitizeError(error, context = 'unknown') {
    const message = error instanceof Error ? error.message : String(error);

    // Always log the full error server-side
    console.error(`[${context}] Error:`, message);

    // In development, return full error
    if (!isProduction) {
        return message;
    }

    // Production: Return generic messages
    const lowerMessage = message.toLowerCase();

    // Safe errors to pass through (user-facing)
    const safePatterns = [
        'not found', 'already owned', 'insufficient balance',
        'invalid wallet', 'item not', 'requires higher',
        'purchase expired', 'signature required', 'already used',
        'cannot purchase', 'cannot unequip'
    ];

    for (const pattern of safePatterns) {
        if (lowerMessage.includes(pattern)) {
            return message;
        }
    }

    // Generic fallback for internal errors
    if (lowerMessage.includes('jwt') || lowerMessage.includes('token')) {
        return 'Authentication error';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('sql')) {
        return 'Database error';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('helius')) {
        return 'Network error';
    }

    return 'An error occurred';
}

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://alonisthe.dev'],
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Rate limiting by IP
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many auth attempts, please try again later' }
});

const purchaseLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many purchase attempts, please try again later' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/shop/purchase', purchaseLimiter);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
    const heliusHealth = await healthCheck();
    const shopMetrics = getShopMetrics();

    res.json({
        status: heliusHealth.healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            api: true,
            helius: heliusHealth.healthy,
            heliusEnhanced: heliusHealth.details?.enhancedApi || false
        },
        latency: {
            helius: heliusHealth.latency
        },
        metrics: {
            shop: shopMetrics,
            heliusCacheSize: heliusHealth.details?.cacheSize || 0
        }
    });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * Request authentication challenge
 * POST /api/auth/challenge
 */
app.post('/api/auth/challenge', (req, res) => {
    try {
        const { wallet } = req.body;

        if (!wallet || !isValidAddress(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const challenge = generateChallenge(wallet);
        res.json(challenge);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'challenge') });
    }
});

/**
 * Verify signature and get JWT
 * POST /api/auth/verify
 */
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { wallet, signature } = req.body;

        if (!wallet || !signature) {
            return res.status(400).json({ error: 'Wallet and signature required' });
        }

        const result = await verifyAndAuthenticate(wallet, signature);
        res.json(result);

    } catch (error) {
        res.status(401).json({ error: sanitizeError(error, 'auth') });
    }
});

/**
 * Refresh JWT with updated balance
 * GET /api/auth/refresh
 */
app.get('/api/auth/refresh', authMiddleware, async (req, res) => {
    try {
        const token = req.headers.authorization.substring(7);
        const result = await refreshToken(token);
        res.json(result);

    } catch (error) {
        res.status(401).json({ error: sanitizeError(error, 'refresh') });
    }
});

// ============================================
// USER ROUTES
// ============================================

/**
 * Get user profile
 * GET /api/user/profile
 */
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { wallet } = req.user;

        // Get fresh balance
        const balanceInfo = await getTokenBalance(wallet);

        // Get inventory and equipped
        const inventory = await getInventory(wallet);
        const equipped = await getEquipped(wallet);

        res.json({
            wallet,
            balance: balanceInfo.balance,
            isHolder: balanceInfo.isHolder,
            tier: req.user.tier,
            tierIndex: req.user.tierIndex,
            inventory,
            equipped
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'profile') });
    }
});

// ============================================
// SHOP ROUTES
// ============================================

/**
 * Get shop catalog with prices
 * GET /api/shop/catalog
 */
app.get('/api/shop/catalog', optionalAuthMiddleware, async (req, res) => {
    try {
        const engageTier = req.user?.tierIndex || 0;
        const catalog = await getCatalogWithPrices(engageTier);

        // If authenticated, mark owned items
        if (req.user) {
            const inventory = await getInventory(req.user.wallet);
            catalog.forEach(item => {
                item.owned = inventory.includes(item.id);
            });
        }

        res.json({ items: catalog });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'catalog') });
    }
});

/**
 * Get user's inventory
 * GET /api/shop/inventory
 */
app.get('/api/shop/inventory', authMiddleware, async (req, res) => {
    try {
        const inventory = await getInventory(req.user.wallet);
        const equipped = await getEquipped(req.user.wallet);

        res.json({ inventory, equipped });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'inventory') });
    }
});

/**
 * Initiate purchase (returns transaction to sign)
 * POST /api/shop/purchase
 * Supports idempotency key header for safe retries
 */
app.post('/api/shop/purchase', authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.body;
        const idempotencyKey = req.headers['x-idempotency-key'] || null;

        if (!itemId) {
            return res.status(400).json({ error: 'Item ID required' });
        }

        // Validate itemId format (alphanumeric with underscores)
        if (!/^[a-z0-9_]{1,50}$/.test(itemId)) {
            return res.status(400).json({ error: 'Invalid item ID format' });
        }

        const inventory = await getInventory(req.user.wallet);

        const result = await initiatePurchase(
            req.user.wallet,
            itemId,
            req.user.tierIndex,
            inventory,
            idempotencyKey
        );

        res.json(result);

    } catch (error) {
        res.status(400).json({ error: sanitizeError(error, 'purchase-init') });
    }
});

/**
 * Confirm purchase after signing
 * POST /api/shop/purchase/confirm
 */
app.post('/api/shop/purchase/confirm', authMiddleware, async (req, res) => {
    try {
        const { purchaseId, signature } = req.body;

        if (!purchaseId || !signature) {
            return res.status(400).json({ error: 'Purchase ID and signature required' });
        }

        const result = await confirmPurchase(purchaseId, signature);
        res.json(result);

    } catch (error) {
        res.status(400).json({ error: sanitizeError(error, 'purchase-confirm') });
    }
});

/**
 * Equip an item
 * POST /api/shop/equip
 */
app.post('/api/shop/equip', authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.body;
        const inventory = await getInventory(req.user.wallet);

        const result = await equipItem(req.user.wallet, itemId, inventory);
        res.json(result);

    } catch (error) {
        res.status(400).json({ error: sanitizeError(error, 'equip') });
    }
});

/**
 * Unequip a layer
 * POST /api/shop/unequip
 */
app.post('/api/shop/unequip', authMiddleware, async (req, res) => {
    try {
        const { layer } = req.body;

        const result = await unequipLayer(req.user.wallet, layer);
        res.json(result);

    } catch (error) {
        res.status(400).json({ error: sanitizeError(error, 'unequip') });
    }
});

// ============================================
// ECOSYSTEM ROUTES
// ============================================

/**
 * Get ecosystem stats
 * GET /api/ecosystem/stats
 */
app.get('/api/ecosystem/stats', async (req, res) => {
    try {
        const supply = await getTokenSupply();

        res.json({
            currentSupply: supply.current,
            totalBurned: supply.burned,
            initialSupply: 1_000_000_000,
            burnPercent: ((supply.burned / 1_000_000_000) * 100).toFixed(4)
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'stats') });
    }
});

/**
 * Get recent burns
 * GET /api/ecosystem/burns
 */
app.get('/api/ecosystem/burns', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const burns = await getRecentBurns(limit);

        res.json({ burns });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'burns') });
    }
});

// ============================================
// PUBLIC CONFIG
// ============================================

/**
 * Get public configuration
 * GET /api/config/public
 */
app.get('/api/config/public', async (req, res) => {
    try {
        const supply = await getTokenSupply();

        res.json({
            tokenMint: process.env.ASDF_TOKEN_MINT || '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
            minHolderBalance: 1_000_000,
            currentSupply: supply.current,
            totalBurned: supply.burned,
            cycleWeeks: 9,
            rotationEpoch: '2024-01-01T00:00:00Z'
        });

    } catch (error) {
        sanitizeError(error, 'config'); // Log but return defaults
        res.json({
            tokenMint: '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
            minHolderBalance: 1_000_000,
            cycleWeeks: 9,
            rotationEpoch: '2024-01-01T00:00:00Z'
        });
    }
});

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
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
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
app.post('/api/webhook/helius', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-helius-signature'];
        const payload = req.body.toString();

        // Verify webhook signature in production
        if (isProduction && WEBHOOK_SECRET) {
            if (!signature || !verifyWebhookSignature(payload, signature)) {
                console.warn('[Webhook] Invalid signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const events = JSON.parse(payload);

        // Process each burn event
        for (const event of events) {
            if (event.type === 'BURN' || event.tokenTransfers?.some(t => t.tokenAmount < 0)) {
                const burn = {
                    signature: event.signature,
                    wallet: event.feePayer,
                    amount: Math.abs(event.tokenTransfers?.[0]?.tokenAmount || 0),
                    timestamp: event.timestamp,
                    slot: event.slot
                };

                console.log(`[Webhook] Burn detected: ${burn.wallet?.slice(0, 8)}... burned ${burn.amount} tokens`);

                // In production: Record to database, update stats, notify clients via WebSocket
                // await db.query('INSERT INTO burns ...', [burn]);
                // await redis.publish('burns', JSON.stringify(burn));
            }
        }

        res.json({ received: true, processed: events.length });

    } catch (error) {
        console.error('[Webhook] Error processing:', error.message);
        // Always return 200 to prevent Helius retries on processing errors
        res.json({ received: true, error: 'Processing error' });
    }
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
    const safeMessage = sanitizeError(err, 'unhandled');

    // Don't leak stack traces in production
    if (isProduction) {
        res.status(500).json({ error: 'Internal server error' });
    } else {
        res.status(500).json({
            error: safeMessage,
            stack: err.stack
        });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`🔥 ASDF API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
});

module.exports = app;
