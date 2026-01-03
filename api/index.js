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
const { getTokenBalance, getTokenSupply, getRecentBurns, getWalletBurnHistory, getBatchTokenBalances, getPriorityFeeEstimate, healthCheck, isValidAddress } = require('./services/helius');
const { getCatalogWithPrices, initiatePurchase, confirmPurchase, getInventory, getEquipped, equipItem, unequipLayer, getShopMetrics } = require('./services/shop');
const { getTopBurners, getXPLeaderboard, getUserRank, getStatistics, recordBurn, logAudit, syncFromBlockchain, getAuditLog } = require('./services/leaderboard');
const { startGameSession, submitScore, getPlayerStats, getValidationMetrics } = require('./services/gameValidation');
const { requireAdmin, getSecurityMetrics, generateNonce, isAdmin } = require('./services/security');
const { metricsMiddleware, getSummaryMetrics, getDetailedMetrics, getPrometheusMetrics } = require('./services/metrics');
const { getHealthStatus: getDbHealth } = require('./services/database');
const { verifyWebhookSignature: verifyHeliusSignature, processWebhookEvent, getWebhookMetrics, registerWebhook, listWebhooks } = require('./services/webhooks');
const { getWalletNFTs, verifyNFTOwnership, verifyCollectionOwnership, getTokenBalances: getDASTokenBalances, getAssetDetails, checkRateLimit: checkAssetRateLimit, getAssetMetrics } = require('./services/assets');
const { getUnlockedAchievements, getAchievementProgress, getDetailedAchievements, recordBurnForAchievements, recordGameForAchievements, updateStreak, grantAchievement, getAchievementLeaderboard, getAchievementMetrics } = require('./services/achievements');

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

// Metrics collection (before rate limiting)
app.use(metricsMiddleware);

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

// Per-wallet rate limiting for sensitive operations
const walletRateLimits = new Map();
const WALLET_RATE_CONFIG = {
    windowMs: 60 * 1000,    // 1 minute window
    maxRequests: 30,        // 30 requests per wallet per minute
    cleanupInterval: 5 * 60 * 1000  // Cleanup every 5 minutes
};

/**
 * Per-wallet rate limiter middleware
 * Tracks requests by wallet address in JWT
 */
function walletRateLimiter(req, res, next) {
    if (!req.user?.wallet) {
        return next(); // No wallet, use IP-based limiting
    }

    const wallet = req.user.wallet;
    const now = Date.now();

    let walletData = walletRateLimits.get(wallet);
    if (!walletData || now - walletData.windowStart > WALLET_RATE_CONFIG.windowMs) {
        walletData = { windowStart: now, count: 0 };
    }

    walletData.count++;
    walletRateLimits.set(wallet, walletData);

    if (walletData.count > WALLET_RATE_CONFIG.maxRequests) {
        console.warn(`[RateLimit] Wallet ${wallet.slice(0, 8)}... exceeded limit`);
        return res.status(429).json({
            error: 'Too many requests from this wallet',
            retryAfter: Math.ceil((walletData.windowStart + WALLET_RATE_CONFIG.windowMs - now) / 1000)
        });
    }

    next();
}

// Cleanup wallet rate limits periodically
setInterval(() => {
    const now = Date.now();
    for (const [wallet, data] of walletRateLimits.entries()) {
        if (now - data.windowStart > WALLET_RATE_CONFIG.windowMs) {
            walletRateLimits.delete(wallet);
        }
    }
}, WALLET_RATE_CONFIG.cleanupInterval);

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/shop/purchase', purchaseLimiter);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
    const heliusHealth = await healthCheck();
    const shopMetrics = getShopMetrics();
    const gameMetrics = getValidationMetrics();
    const dbHealth = getDbHealth();
    const securityMetrics = getSecurityMetrics();
    const webhookMetrics = getWebhookMetrics();
    const assetMetrics = getAssetMetrics();
    const achievementMetrics = getAchievementMetrics();

    res.json({
        status: heliusHealth.healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.1.0',
        services: {
            api: true,
            helius: heliusHealth.healthy,
            heliusEnhanced: heliusHealth.details?.enhancedApi || false,
            database: dbHealth.type,
            webhooks: webhookMetrics.config.hasSecret
        },
        latency: {
            helius: heliusHealth.latency
        },
        metrics: {
            shop: shopMetrics,
            game: gameMetrics,
            database: dbHealth.stats,
            security: {
                activeNonces: securityMetrics.activeNonces
            },
            webhooks: {
                queueSize: webhookMetrics.queueSize,
                processed: webhookMetrics.processedCount
            },
            assets: {
                cacheSize: assetMetrics.cacheSize
            },
            achievements: {
                totalPlayers: achievementMetrics.playersWithAchievements,
                totalUnlocks: achievementMetrics.totalUnlocks
            },
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

/**
 * Get current priority fee estimate
 * GET /api/ecosystem/priority-fee
 */
app.get('/api/ecosystem/priority-fee', async (req, res) => {
    try {
        const fee = await getPriorityFeeEstimate();

        res.json({
            priorityFee: fee,
            unit: 'microLamports',
            estimatedCost: (fee * 50000 / 1e9).toFixed(9) // Estimated SOL cost for burn tx
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
app.get('/api/user/burns', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const history = await getWalletBurnHistory(req.user.wallet, limit);

        res.json({
            wallet: req.user.wallet,
            ...history
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
app.post('/api/batch/balances', authMiddleware, walletRateLimiter, async (req, res) => {
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
                invalid: invalidWallets
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
            count: wallets.length
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
// LEADERBOARD ROUTES
// ============================================

/**
 * Get top burners leaderboard
 * GET /api/leaderboard/burns
 */
app.get('/api/leaderboard/burns', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const timeframe = ['all', 'month', 'week', 'day'].includes(req.query.timeframe)
            ? req.query.timeframe
            : 'all';

        const leaderboard = getTopBurners(limit, timeframe);

        res.json({
            timeframe,
            entries: leaderboard,
            count: leaderboard.length
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'leaderboard-burns') });
    }
});

/**
 * Get XP/tier leaderboard
 * GET /api/leaderboard/xp
 */
app.get('/api/leaderboard/xp', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const leaderboard = getXPLeaderboard(limit);

        res.json({
            entries: leaderboard,
            count: leaderboard.length
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'leaderboard-xp') });
    }
});

/**
 * Get user's rank and stats
 * GET /api/leaderboard/rank
 */
app.get('/api/leaderboard/rank', authMiddleware, walletRateLimiter, async (req, res) => {
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
app.get('/api/stats', async (req, res) => {
    try {
        const stats = getStatistics();
        res.json(stats);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'stats') });
    }
});

// ============================================
// GAME VALIDATION ROUTES
// ============================================

// Game session rate limiter (5 sessions per minute per wallet)
const gameSessionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.wallet || req.ip,
    message: { error: 'Too many game sessions, please wait' }
});

/**
 * Start a new game session
 * POST /api/game/start
 */
app.post('/api/game/start', authMiddleware, gameSessionLimiter, async (req, res) => {
    try {
        const { gameType } = req.body;

        // Validate game type
        const validTypes = ['flappy', 'snake', 'default'];
        const type = validTypes.includes(gameType) ? gameType : 'default';

        const session = startGameSession(req.user.wallet, type);

        res.json({
            sessionId: session.sessionId,
            token: session.token,
            gameType: session.gameType,
            startTime: session.startTime
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'game-start') });
    }
});

/**
 * Submit game score
 * POST /api/game/submit
 */
app.post('/api/game/submit', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const { sessionId, token, score, gameData } = req.body;

        if (!sessionId || !token || typeof score !== 'number') {
            return res.status(400).json({ error: 'Session ID, token, and score required' });
        }

        const result = submitScore(sessionId, token, score, gameData || {});

        if (!result.valid) {
            // Log suspicious activity
            if (result.suspicious) {
                logAudit('suspicious_score', {
                    wallet: req.user.wallet.slice(0, 8) + '...',
                    error: result.error
                });
            }
            return res.status(400).json({ error: result.error, suspicious: result.suspicious });
        }

        // Check for achievement unlocks
        const newAchievements = recordGameForAchievements(req.user.wallet, result.score);

        res.json({
            success: true,
            score: result.score,
            duration: result.duration,
            percentile: result.percentile,
            newAchievements: newAchievements.map(a => ({
                id: a.id,
                name: a.name,
                rarity: a.rarity,
                xpReward: a.xpReward
            }))
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'game-submit') });
    }
});

/**
 * Get player's game statistics
 * GET /api/game/stats
 */
app.get('/api/game/stats', authMiddleware, async (req, res) => {
    try {
        const gameType = req.query.gameType || 'default';
        const stats = getPlayerStats(req.user.wallet, gameType);

        res.json(stats);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'game-stats') });
    }
});

// ============================================
// METRICS ROUTES
// ============================================

/**
 * Get API metrics (public summary)
 * GET /api/metrics
 */
app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = getSummaryMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'metrics') });
    }
});

/**
 * Get Prometheus metrics
 * GET /api/metrics/prometheus
 */
app.get('/api/metrics/prometheus', async (req, res) => {
    try {
        const metrics = getPrometheusMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    } catch (error) {
        res.status(500).send('# Error getting metrics');
    }
});

// ============================================
// SECURITY ROUTES
// ============================================

/**
 * Generate a nonce for signed requests
 * GET /api/security/nonce
 */
app.get('/api/security/nonce', authMiddleware, (req, res) => {
    try {
        const nonce = generateNonce();
        res.json({
            nonce,
            expiresIn: '10 minutes',
            usage: 'Include in X-ASDF-Nonce header for signed requests'
        });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'nonce') });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * Get detailed metrics (admin only)
 * GET /api/admin/metrics
 */
app.get('/api/admin/metrics', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const metrics = getDetailedMetrics();
        const security = getSecurityMetrics();
        const database = getDbHealth();

        res.json({
            api: metrics,
            security,
            database,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'admin-metrics') });
    }
});

/**
 * Get audit log (admin only)
 * GET /api/admin/audit
 */
app.get('/api/admin/audit', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const action = req.query.action || null;

        const logs = getAuditLog(limit, action);

        res.json({
            logs,
            count: logs.length,
            filter: action
        });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'admin-audit') });
    }
});

/**
 * Check admin status
 * GET /api/admin/status
 */
app.get('/api/admin/status', authMiddleware, (req, res) => {
    const adminStatus = isAdmin(req.user.wallet);

    res.json({
        wallet: req.user.wallet,
        isAdmin: adminStatus,
        tier: req.user.tier
    });
});

/**
 * Sync leaderboard from blockchain (admin only)
 * POST /api/admin/sync-leaderboard
 */
app.post('/api/admin/sync-leaderboard', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await syncFromBlockchain();

        logAudit('admin_sync_leaderboard', {
            wallet: req.user.wallet.slice(0, 8) + '...'
        });

        res.json({
            success: true,
            message: 'Leaderboard synced from blockchain'
        });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'admin-sync') });
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
        let processedBurns = 0;
        for (const event of events) {
            if (event.type === 'BURN' || event.tokenTransfers?.some(t => t.tokenAmount < 0)) {
                const burn = {
                    signature: event.signature,
                    wallet: event.feePayer,
                    amount: Math.abs(event.tokenTransfers?.[0]?.tokenAmount || 0),
                    timestamp: event.timestamp,
                    slot: event.slot
                };

                if (burn.wallet && burn.amount > 0) {
                    // Record to leaderboard
                    recordBurn(burn.wallet, burn.amount, burn.signature);
                    processedBurns++;

                    // Audit log
                    logAudit('webhook_burn', {
                        wallet: burn.wallet.slice(0, 8) + '...',
                        amount: burn.amount,
                        signature: burn.signature.slice(0, 16) + '...'
                    });

                    console.log(`[Webhook] Burn recorded: ${burn.wallet.slice(0, 8)}... burned ${burn.amount} tokens`);
                }
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
// ACHIEVEMENT ROUTES
// ============================================

/**
 * Get user's achievements
 * GET /api/achievements
 */
app.get('/api/achievements', authMiddleware, async (req, res) => {
    try {
        const detailed = req.query.detailed === 'true';

        if (detailed) {
            const achievements = getDetailedAchievements(req.user.wallet);
            res.json({ achievements });
        } else {
            const unlocked = getUnlockedAchievements(req.user.wallet);
            const progress = getAchievementProgress(req.user.wallet);
            res.json({ unlocked, progress });
        }

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'achievements') });
    }
});

/**
 * Get achievement leaderboard
 * GET /api/achievements/leaderboard
 */
app.get('/api/achievements/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const leaderboard = getAchievementLeaderboard(limit);

        res.json({
            entries: leaderboard,
            count: leaderboard.length
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'achievement-leaderboard') });
    }
});

/**
 * Grant achievement (admin only)
 * POST /api/admin/achievements/grant
 */
app.post('/api/admin/achievements/grant', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { wallet, achievementId } = req.body;

        if (!wallet || !achievementId) {
            return res.status(400).json({ error: 'Wallet and achievementId required' });
        }

        if (!isValidAddress(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const result = grantAchievement(wallet, achievementId);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            achievement: result.achievement
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'grant-achievement') });
    }
});

// ============================================
// ASSET VERIFICATION ROUTES (DAS API)
// ============================================

/**
 * Get user's NFTs
 * GET /api/assets/nfts
 */
app.get('/api/assets/nfts', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const rateCheck = checkAssetRateLimit(req.user.wallet);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: 'Asset API rate limit exceeded',
                remaining: rateCheck.remaining
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
app.get('/api/assets/verify/nft/:mint', authMiddleware, async (req, res) => {
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
app.get('/api/assets/verify/collection/:address', authMiddleware, async (req, res) => {
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
app.get('/api/assets/tokens', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const rateCheck = checkAssetRateLimit(req.user.wallet);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: 'Asset API rate limit exceeded',
                remaining: rateCheck.remaining
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
app.get('/api/assets/:mint', async (req, res) => {
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
// ENHANCED WEBHOOK HANDLER
// ============================================

/**
 * Enhanced Helius webhook endpoint
 * POST /api/webhook/helius/v2
 * Uses the new webhooks service with full event processing
 */
app.post('/api/webhook/helius/v2', express.raw({ type: 'application/json' }), async (req, res) => {
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
                        count: newAchievements.length
                    });
                }
            }
        }

        res.json({
            received: true,
            processed: results.filter(r => r.processed).length,
            total: events.length
        });

    } catch (error) {
        console.error('[Webhook v2] Error:', error.message);
        res.json({ received: true, error: 'Processing error' });
    }
});

/**
 * Webhook management - list webhooks (admin only)
 * GET /api/admin/webhooks
 */
app.get('/api/admin/webhooks', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const webhooks = await listWebhooks();
        const metrics = getWebhookMetrics();

        res.json({
            webhooks,
            metrics
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'list-webhooks') });
    }
});

/**
 * Register new webhook (admin only)
 * POST /api/admin/webhooks
 */
app.post('/api/admin/webhooks', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { webhookUrl, addresses } = req.body;

        if (!webhookUrl || !addresses?.length) {
            return res.status(400).json({ error: 'webhookUrl and addresses required' });
        }

        const result = await registerWebhook(webhookUrl, addresses);

        logAudit('webhook_created', {
            admin: req.user.wallet.slice(0, 8) + '...',
            webhookId: result.webhookID
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'register-webhook') });
    }
});

// ============================================
// STREAK TRACKING
// ============================================

/**
 * Record daily activity (call on any user action)
 * POST /api/user/activity
 */
app.post('/api/user/activity', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const newAchievements = updateStreak(req.user.wallet);

        res.json({
            recorded: true,
            newAchievements: newAchievements.map(a => ({
                id: a.id,
                name: a.name,
                rarity: a.rarity,
                xpReward: a.xpReward
            }))
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'record-activity') });
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

app.listen(PORT, async () => {
    console.log(`🔥 ASDF API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Environment: ${isProduction ? 'production' : 'development'}`);

    // Sync leaderboard from blockchain on startup
    try {
        await syncFromBlockchain();
        console.log('   Leaderboard: synced from blockchain');
    } catch (error) {
        console.warn('   Leaderboard: sync failed -', error.message);
    }
});

module.exports = app;
