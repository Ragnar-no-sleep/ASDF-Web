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
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Services
const { generateChallenge, verifyAndAuthenticate, refreshToken, revokeToken, authMiddleware, optionalAuthMiddleware } = require('./services/auth');
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
const { NOTIFICATION_TYPES, createNotification, getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, getPreferences: getNotificationPreferences, updatePreferences: updateNotificationPreferences, notifyAchievementUnlocked, getNotificationMetrics } = require('./services/notifications');
const { buildBurnTransaction, buildTransferTransaction, verifyTransaction, completeTransaction, getTransactionMetrics } = require('./services/transactions');
const { getOrCreateReferralCode, validateCode: validateReferralCode, processReferral, getReferralStats, getReferralLeaderboard, getReferralMetrics } = require('./services/referrals');
const { EVENTS, subscribe: subscribeEvent, publish: publishEvent, emitBurnConfirmed, emitAchievementUnlocked, emitPurchaseCompleted, getEventBusMetrics } = require('./services/eventBus');
const { get: cacheGet, set: cacheSet, del: cacheDel, wrap: cacheWrap, invalidateTag, getStats: getCacheStats } = require('./services/cache');
const { registerHandler: registerJobHandler, enqueue: enqueueJob, getJob, getJobsByStatus, getQueueStats, PRIORITY: JOB_PRIORITY } = require('./services/queue');
const { track: trackAnalytics, trackPageView, trackAction, getAggregatedMetrics, getFunnelAnalysis, getAnalyticsMetrics, EVENT_TYPES: ANALYTICS_EVENTS } = require('./services/analytics');
const { schedule: scheduleTask, scheduleInterval, getAllTasks, getHistory: getTaskHistory, getSchedulerMetrics, SCHEDULES } = require('./services/scheduler');
const { checkLimit: checkRateLimit, checkTokenBucket, createMiddleware: createRateLimitMiddleware, getStats: getRateLimitStats, getBannedList, removeBan, extractIP } = require('./services/ratelimit');
const { validate, registerSchema, createMiddleware: createValidationMiddleware, sanitizeValue, getStats: getValidatorStats } = require('./services/validator');
const { isEnabled: isFeatureEnabled, evaluate: evaluateFlag, getAllFlags, setFlagEnabled, setFlagPercentage, createFlag, getStats: getFeatureFlagStats, getHistory: getFlagHistory } = require('./services/featureflags');
const { log: auditLog, logSecurity, logAdmin: logAdminAction, search: searchAudit, getActiveAlerts, exportLogs: exportAuditLogs, getStats: getAuditStats, createMiddleware: createAuditMiddleware, EVENT_TYPES: AUDIT_EVENTS, CATEGORIES: AUDIT_CATEGORIES, SEVERITY: AUDIT_SEVERITY } = require('./services/audit');
const { getCircuit, execute: circuitExecute, wrap: circuitWrap, getAllCircuits, getCircuitStatus, forceCircuitState, resetCircuit, getStats: getCircuitStats, STATES: CIRCUIT_STATES } = require('./services/circuitbreaker');
const { startTrace, startSpan, endSpan, getCurrentTrace, createMiddleware: createTracingMiddleware, getTrace, searchTraces, getSlowTraces, getErrorTraces, getRecentTraces, getStats: getTracingStats, setSampleRate } = require('./services/tracing');
const { registerCheck, runAllChecks, livenessProbe, readinessProbe, startupProbe, getDetailedHealth, getHistory: getHealthHistory, getTrend: getHealthTrend, getStats: getHealthStats, CHECK_TYPES } = require('./services/healthcheck');
const { get: getConfig, set: setConfig, getAll: getAllConfig, onChange: onConfigChange, getHistory: getConfigHistory, getStats: getConfigStats, defineSchema: defineConfigSchema } = require('./services/config');
const { registerServer, registerCleanup, middleware: shutdownMiddleware, initiateShutdown, getHealthState: getShutdownState, getStats: getShutdownStats, isAcceptingTraffic } = require('./services/shutdown');
const { middleware: versioningMiddleware, getVersionInfo, getStats: getVersioningStats, detectVersion, validateVersion } = require('./services/versioning');
const { createBatchHandler, getStats: getBatchingStats, getRunningBatches } = require('./services/batching');
const { middleware: compressionMiddleware, getStats: getCompressionStats, clearCache: clearCompressionCache } = require('./services/compression');
const { registerEndpoint, executeRequest, executeEnhancedRequest, getAllEndpointsStatus, checkAllEndpointsHealth, getStats: getRpcStats, ENDPOINT_TYPES } = require('./services/rpcFailover');
const { trackTransaction, getTransactionStatus, getActiveTransactions, getHistory: getTxHistory, getWalletHistory: getTxWalletHistory, getStats: getTxMonitorStats, TX_STATES, TX_TYPES } = require('./services/txMonitor');
const { getEstimate: getPriorityFeeEstimateV2, getAccountFeeEstimate, getCongestionAnalysis, getHistory: getFeeHistory, getHourlyAverages: getFeeHourlyAverages, estimateComputeUnits, getStats: getPriorityFeeStats, PRIORITY_LEVELS } = require('./services/priorityFee');
const { connect: wsConnect, getConnectionStatus: getWsStatus, subscribeAccount, subscribeSignature, getSubscriptions: getWsSubscriptions, getStats: getWsStats, shutdown: wsShutdown } = require('./services/wsManager');

// Phase 12: Data Management & Compliance
const { requestExport, downloadExport, requestDeletion, getRequestStatus: getExportRequestStatus, getWalletRequests, getStats: getDataExportStats } = require('./services/dataExport');
const { middleware: idempotencyMiddleware, generateKey: generateIdempotencyKey, invalidateKey: invalidateIdempotencyKey, getStats: getIdempotencyStats } = require('./services/idempotency');
const { createSession, validateSession, refreshSession, revokeSession, revokeAllUserSessions, getUserSessions, getUserDevices, blockDevice, trustDevice, getStats: getSessionStats } = require('./services/sessionManager');
const { registerTag: registerApiTag, registerSchema: registerApiSchema, registerRoute: registerApiRoute, generateSpec, serveDocumentation, serveSwaggerUI, getStats: getOpenApiStats } = require('./services/openApiGenerator');

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

// CORS - SECURITY: Require explicit ALLOWED_ORIGINS in production
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(o => o.length > 0);

// CRITICAL: Fail to start if ALLOWED_ORIGINS is not configured in production
if (isProduction && (!allowedOrigins || allowedOrigins.length === 0)) {
    console.error('[SECURITY] FATAL: ALLOWED_ORIGINS must be configured in production');
    console.error('Set ALLOWED_ORIGINS=https://your-domain.com,https://other-domain.com in environment');
    process.exit(1);
}

const corsOrigins = isProduction
    ? allowedOrigins
    : (allowedOrigins || ['http://localhost:3000', 'http://localhost:5173', 'https://alonisthe.dev']);

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Cookie parsing
app.use(cookieParser());

// ============================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================

/**
 * Validate Content-Type header for JSON endpoints
 * Security: Prevents content-type confusion attacks
 */
app.use('/api', (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Require Content-Type for POST/PUT/PATCH/DELETE with body
    const contentType = req.headers['content-type'];
    if (req.body && Object.keys(req.body).length > 0) {
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
                error: 'Unsupported Media Type',
                message: 'Content-Type must be application/json'
            });
        }
    }

    next();
});

/**
 * Add request ID for tracing
 * Security: Helps with audit logging and debugging
 */
app.use('/api', (req, res, next) => {
    req.requestId = req.headers['x-request-id'] ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

/**
 * Sanitize common request parameters
 * Security: Prevents injection in query parameters
 */
app.use('/api', (req, res, next) => {
    // Sanitize query parameters
    for (const key of Object.keys(req.query)) {
        if (typeof req.query[key] === 'string') {
            // Remove null bytes and control characters
            req.query[key] = req.query[key].replace(/[\x00-\x1F\x7F]/g, '');
            // Limit length
            if (req.query[key].length > 1000) {
                req.query[key] = req.query[key].substring(0, 1000);
            }
        }
    }
    next();
});

// ============================================
// JWT COOKIE CONFIGURATION
// ============================================

const JWT_COOKIE_NAME = 'asdf_auth';
const JWT_COOKIE_OPTIONS = {
    httpOnly: true,                           // Not accessible via JavaScript
    secure: isProduction,                     // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/api',                             // Only sent to API routes
    maxAge: 24 * 60 * 60 * 1000               // 24 hours (match JWT expiry)
};

/**
 * Set JWT token as httpOnly cookie
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
function setAuthCookie(res, token) {
    res.cookie(JWT_COOKIE_NAME, token, JWT_COOKIE_OPTIONS);
}

/**
 * Clear auth cookie (logout)
 * @param {object} res - Express response object
 */
function clearAuthCookie(res) {
    res.clearCookie(JWT_COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/api'
    });
}

/**
 * Get JWT token from cookie or Authorization header (fallback for backward compatibility)
 * @param {object} req - Express request object
 * @returns {string|null}
 */
function getAuthToken(req) {
    // Primary: Get from httpOnly cookie
    if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
        return req.cookies[JWT_COOKIE_NAME];
    }

    // Fallback: Authorization header (for legacy clients during migration)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

// Content-Type validation middleware for non-GET requests with body
app.use((req, res, next) => {
    // Skip GET, HEAD, OPTIONS requests (no body expected)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip webhook endpoints (they handle raw body separately)
    if (req.path.includes('/webhook/')) {
        return next();
    }

    // For requests with body, validate Content-Type
    const contentType = req.headers['content-type'];
    if (req.body && Object.keys(req.body).length > 0) {
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
                error: 'Unsupported Media Type',
                message: 'Content-Type must be application/json'
            });
        }
    }

    next();
});

// Request timeout middleware - prevent hanging requests
const REQUEST_TIMEOUT = 30000; // 30 seconds
app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT, () => {
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout' });
        }
    });
    res.setTimeout(REQUEST_TIMEOUT, () => {
        if (!res.headersSent) {
            res.status(503).json({ error: 'Response timeout' });
        }
    });
    next();
});

// Response compression
app.use(compressionMiddleware());

// Graceful shutdown middleware
app.use(shutdownMiddleware());

// API versioning middleware
app.use('/api', versioningMiddleware({ strict: false, warnDeprecated: true }));

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

// Health endpoint rate limiter - prevent DoS via heavy metrics gathering
const healthLimiter = rateLimit({
    windowMs: 60 * 1000,    // 1 minute
    max: 30,                // 30 requests per minute
    message: { error: 'Too many health check requests' }
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

app.get('/health', healthLimiter, async (req, res) => {
    const heliusHealth = await healthCheck();
    const shopMetrics = getShopMetrics();
    const gameMetrics = getValidationMetrics();
    const dbHealth = getDbHealth();
    const securityMetrics = getSecurityMetrics();
    const webhookMetrics = getWebhookMetrics();
    const assetMetrics = getAssetMetrics();
    const achievementMetrics = getAchievementMetrics();
    const notificationMetrics = getNotificationMetrics();
    const transactionMetrics = getTransactionMetrics();
    const referralMetrics = getReferralMetrics();
    const eventBusMetrics = getEventBusMetrics();
    const cacheStats = getCacheStats();
    const queueStats = getQueueStats();
    const analyticsMetrics = getAnalyticsMetrics();
    const schedulerMetrics = getSchedulerMetrics();
    const rateLimitStats = getRateLimitStats();
    const validatorStats = getValidatorStats();
    const featureFlagStats = getFeatureFlagStats();
    const auditStats = getAuditStats();
    const circuitStats = getCircuitStats();
    const tracingStats = getTracingStats();
    const healthStats = getHealthStats();
    const configStats = getConfigStats();
    const shutdownStats = getShutdownStats();
    const versioningStats = getVersioningStats();
    const batchingStats = getBatchingStats();
    const compressionStats = getCompressionStats();
    const rpcStats = getRpcStats();
    const txMonitorStats = getTxMonitorStats();
    const priorityFeeStats = getPriorityFeeStats();
    const wsStats = getWsStats();

    // Phase 12 stats
    const dataExportStats = getDataExportStats();
    const idempotencyStats = getIdempotencyStats();
    const sessionStats = getSessionStats();
    const openApiStats = getOpenApiStats();

    res.json({
        status: heliusHealth.healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.7.0',
        services: {
            api: true,
            helius: heliusHealth.healthy,
            heliusEnhanced: heliusHealth.details?.enhancedApi || false,
            database: dbHealth.type,
            webhooks: webhookMetrics.config.hasSecret,
            eventBus: eventBusMetrics.registeredEvents > 0
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
            notifications: {
                users: notificationMetrics.usersWithNotifications,
                unread: notificationMetrics.totalUnread
            },
            transactions: {
                pending: transactionMetrics.pendingCount
            },
            referrals: {
                totalCodes: referralMetrics.totalCodes,
                totalReferrals: referralMetrics.totalReferrals
            },
            eventBus: {
                handlers: eventBusMetrics.totalHandlers
            },
            cache: {
                entries: cacheStats.entries,
                hitRate: cacheStats.hitRate
            },
            queue: {
                pending: queueStats.totalQueued,
                active: queueStats.activeJobs
            },
            analytics: {
                events: analyticsMetrics.rawEvents,
                sessions: analyticsMetrics.activeSessions
            },
            scheduler: {
                tasks: schedulerMetrics.taskCount,
                running: schedulerMetrics.runningTasks
            },
            rateLimit: {
                allowed: rateLimitStats.allowed,
                denied: rateLimitStats.denied,
                bans: rateLimitStats.permanentBans
            },
            validator: {
                validated: validatorStats.validated,
                passRate: validatorStats.passRate
            },
            featureFlags: {
                total: featureFlagStats.totalFlags,
                enabled: featureFlagStats.enabledFlags
            },
            audit: {
                events: auditStats.totalEvents,
                alerts: auditStats.activeAlerts
            },
            circuits: {
                total: circuitStats.circuitCount,
                open: circuitStats.byState?.open || 0
            },
            tracing: {
                active: tracingStats.activeTraces,
                stored: tracingStats.storedTraces
            },
            health: {
                state: healthStats.overallState,
                checks: healthStats.registeredChecks
            },
            config: {
                total: configStats.totalConfigs,
                schemas: configStats.totalSchemas
            },
            shutdown: {
                state: shutdownStats.currentState,
                connections: shutdownStats.activeConnections
            },
            versioning: {
                current: versioningStats.currentVersion,
                requests: versioningStats.totalRequests
            },
            batching: {
                batches: batchingStats.totalBatches,
                running: batchingStats.runningBatches
            },
            compression: {
                compressed: compressionStats.compressedResponses,
                savings: compressionStats.savingsPercent
            },
            rpc: {
                endpoints: rpcStats.endpoints?.total || 0,
                healthy: rpcStats.endpoints?.healthy || 0,
                failovers: rpcStats.failovers
            },
            txMonitor: {
                active: txMonitorStats.active,
                confirmed: txMonitorStats.confirmed
            },
            priorityFee: {
                congestion: priorityFeeStats.congestion?.level || 'unknown',
                avgFee: priorityFeeStats.avgFeeRecommended
            },
            websocket: {
                state: wsStats.connectionState,
                subscriptions: wsStats.activeSubscriptions
            },
            heliusCacheSize: heliusHealth.details?.cacheSize || 0,
            // Phase 12: Data Management & Compliance
            dataExport: {
                pending: dataExportStats.pendingRequests,
                completed: dataExportStats.completedRequests,
                exported: dataExportStats.dataExportedFormatted
            },
            idempotency: {
                keys: idempotencyStats.totalKeys,
                hits: idempotencyStats.duplicateHits
            },
            sessions: {
                active: sessionStats.activeSessions,
                devices: sessionStats.totalDevices
            },
            openApi: {
                routes: openApiStats.totalRoutes,
                requests: openApiStats.requestsServed
            }
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
 * Sets JWT as httpOnly cookie for security
 */
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { wallet, signature } = req.body;

        if (!wallet || !signature) {
            return res.status(400).json({ error: 'Wallet and signature required' });
        }

        const result = await verifyAndAuthenticate(wallet, signature);

        // Set JWT as httpOnly cookie
        setAuthCookie(res, result.token);

        // Return user info (token still included for backward compatibility during migration)
        res.json({
            success: true,
            user: result.user,
            // Token in response body is deprecated - will be removed in future version
            token: result.token
        });

    } catch (error) {
        res.status(401).json({ error: sanitizeError(error, 'auth') });
    }
});

/**
 * Refresh JWT with updated balance
 * GET /api/auth/refresh
 * Updates the httpOnly cookie with new token
 */
app.get('/api/auth/refresh', authMiddleware, async (req, res) => {
    try {
        const token = getAuthToken(req);
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const result = await refreshToken(token);

        // Update cookie with new token
        setAuthCookie(res, result.token);

        res.json({
            success: true,
            user: result.user,
            // Token in response body is deprecated
            token: result.token
        });

    } catch (error) {
        res.status(401).json({ error: sanitizeError(error, 'refresh') });
    }
});

/**
 * Logout - Revoke current JWT token and clear cookie
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', authMiddleware, (req, res) => {
    try {
        const token = getAuthToken(req);
        if (token) {
            const result = revokeToken(token);
            if (!result.success) {
                // Log but don't fail - still clear cookie
                console.warn('[Auth] Token revocation failed:', result.error);
            }
        }

        // Always clear the cookie
        clearAuthCookie(res);

        logAudit('user_logout', { wallet: req.user?.wallet?.slice(0, 8) + '...' });
        res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
        // Still clear cookie even on error
        clearAuthCookie(res);
        res.status(500).json({ error: sanitizeError(error, 'logout') });
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
app.post('/api/webhook/helius', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
    try {
        const signature = req.headers['x-helius-signature'];
        const payload = req.body.toString();

        // SECURITY: Always verify webhook signature
        // Require WEBHOOK_SECRET to be configured
        if (!WEBHOOK_SECRET) {
            console.error('[Webhook] CRITICAL: HELIUS_WEBHOOK_SECRET not configured - rejecting request');
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
app.post('/api/webhook/helius/v2', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
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
// NOTIFICATION ROUTES
// ============================================

/**
 * Get user notifications
 * GET /api/notifications
 */
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        const unreadOnly = req.query.unread === 'true';

        const result = getNotifications(req.user.wallet, { limit, offset, unreadOnly });

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-notifications') });
    }
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
app.get('/api/notifications/unread-count', authMiddleware, async (req, res) => {
    try {
        const count = getUnreadCount(req.user.wallet);
        res.json({ unreadCount: count });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'unread-count') });
    }
});

/**
 * Mark notification as read
 * POST /api/notifications/:id/read
 */
app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const success = markAsRead(req.user.wallet, req.params.id);

        if (!success) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'mark-read') });
    }
});

/**
 * Mark all notifications as read
 * POST /api/notifications/read-all
 */
app.post('/api/notifications/read-all', authMiddleware, async (req, res) => {
    try {
        const count = markAllAsRead(req.user.wallet);
        res.json({ success: true, markedCount: count });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'mark-all-read') });
    }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
        const success = deleteNotification(req.user.wallet, req.params.id);

        if (!success) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'delete-notification') });
    }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
app.get('/api/notifications/preferences', authMiddleware, async (req, res) => {
    try {
        const prefs = getNotificationPreferences(req.user.wallet);
        res.json(prefs);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-prefs') });
    }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
app.put('/api/notifications/preferences', authMiddleware, async (req, res) => {
    try {
        const updated = updateNotificationPreferences(req.user.wallet, req.body);
        res.json(updated);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'update-prefs') });
    }
});

// ============================================
// TRANSACTION BUILDER ROUTES
// ============================================

/**
 * Build burn transaction
 * POST /api/transactions/burn
 */
app.post('/api/transactions/burn', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const { amount, priorityLevel } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount required' });
        }

        const transaction = await buildBurnTransaction(
            req.user.wallet,
            amount,
            { priorityLevel }
        );

        res.json(transaction);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'build-burn-tx') });
    }
});

/**
 * Build transfer transaction
 * POST /api/transactions/transfer
 */
app.post('/api/transactions/transfer', authMiddleware, walletRateLimiter, async (req, res) => {
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
 * POST /api/transactions/verify
 */
app.post('/api/transactions/verify', authMiddleware, async (req, res) => {
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
// REFERRAL ROUTES
// ============================================

/**
 * Get or create referral code
 * GET /api/referrals/code
 */
app.get('/api/referrals/code', authMiddleware, async (req, res) => {
    try {
        const result = getOrCreateReferralCode(req.user.wallet);
        res.json(result);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-referral-code') });
    }
});

/**
 * Get referral stats
 * GET /api/referrals/stats
 */
app.get('/api/referrals/stats', authMiddleware, async (req, res) => {
    try {
        const stats = getReferralStats(req.user.wallet);
        res.json(stats);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'referral-stats') });
    }
});

/**
 * Apply referral code
 * POST /api/referrals/apply
 */
app.post('/api/referrals/apply', authMiddleware, walletRateLimiter, async (req, res) => {
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
            rewards: result.rewards
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'apply-referral') });
    }
});

/**
 * Validate referral code (public)
 * GET /api/referrals/validate/:code
 */
app.get('/api/referrals/validate/:code', async (req, res) => {
    try {
        const result = validateReferralCode(req.params.code);
        res.json({
            valid: result.valid,
            error: result.error || null
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'validate-code') });
    }
});

/**
 * Get referral leaderboard
 * GET /api/referrals/leaderboard
 */
app.get('/api/referrals/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const leaderboard = getReferralLeaderboard(limit);

        res.json({
            entries: leaderboard,
            count: leaderboard.length
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'referral-leaderboard') });
    }
});

// ============================================
// ADMIN - CACHE ROUTES
// ============================================

/**
 * Get cache statistics (admin only)
 * GET /api/admin/cache
 */
app.get('/api/admin/cache', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getCacheStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'cache-stats') });
    }
});

/**
 * Invalidate cache by tag (admin only)
 * POST /api/admin/cache/invalidate
 */
app.post('/api/admin/cache/invalidate', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { tag } = req.body;

        if (!tag) {
            return res.status(400).json({ error: 'Tag required' });
        }

        const count = await invalidateTag(tag);

        logAudit('cache_invalidated', {
            admin: req.user.wallet.slice(0, 8) + '...',
            tag,
            count
        });

        res.json({ success: true, invalidatedCount: count });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'cache-invalidate') });
    }
});

// ============================================
// ADMIN - QUEUE ROUTES
// ============================================

/**
 * Get queue statistics (admin only)
 * GET /api/admin/queue
 */
app.get('/api/admin/queue', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getQueueStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'queue-stats') });
    }
});

/**
 * Get jobs by status (admin only)
 * GET /api/admin/queue/jobs
 */
app.get('/api/admin/queue/jobs', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const jobs = getJobsByStatus(status, limit);
        res.json({ jobs, count: jobs.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'queue-jobs') });
    }
});

/**
 * Get specific job (admin only)
 * GET /api/admin/queue/jobs/:id
 */
app.get('/api/admin/queue/jobs/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const job = getJob(req.params.id);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'queue-job') });
    }
});

// ============================================
// ADMIN - ANALYTICS ROUTES
// ============================================

/**
 * Get analytics overview (admin only)
 * GET /api/admin/analytics
 */
app.get('/api/admin/analytics', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const metrics = getAnalyticsMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'analytics') });
    }
});

/**
 * Get aggregated metrics (admin only)
 * GET /api/admin/analytics/metrics
 */
app.get('/api/admin/analytics/metrics', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const interval = req.query.interval || 'hour';
        const count = Math.min(parseInt(req.query.count) || 24, 168);

        const metrics = getAggregatedMetrics(interval, count);
        res.json({ interval, metrics });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'analytics-metrics') });
    }
});

/**
 * Get funnel analysis (admin only)
 * GET /api/admin/analytics/funnel/:name
 */
app.get('/api/admin/analytics/funnel/:name', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const analysis = getFunnelAnalysis(req.params.name);

        if (!analysis) {
            return res.status(404).json({ error: 'Funnel not found' });
        }

        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'funnel-analysis') });
    }
});

// ============================================
// ADMIN - SCHEDULER ROUTES
// ============================================

/**
 * Get scheduled tasks (admin only)
 * GET /api/admin/scheduler
 */
app.get('/api/admin/scheduler', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const tasks = getAllTasks();
        const metrics = getSchedulerMetrics();

        res.json({ tasks, metrics });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'scheduler') });
    }
});

/**
 * Get task execution history (admin only)
 * GET /api/admin/scheduler/history
 */
app.get('/api/admin/scheduler/history', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const taskId = req.query.taskId || null;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const history = getTaskHistory(taskId, limit);
        res.json({ history, count: history.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'scheduler-history') });
    }
});

// ============================================
// ADMIN - RATE LIMITING ROUTES
// ============================================

/**
 * Get rate limit statistics (admin only)
 * GET /api/admin/ratelimit
 */
app.get('/api/admin/ratelimit', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getRateLimitStats();
        const banned = getBannedList();

        res.json({ stats, banned });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'ratelimit-stats') });
    }
});

/**
 * Remove ban (admin only)
 * POST /api/admin/ratelimit/unban
 */
app.post('/api/admin/ratelimit/unban', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return res.status(400).json({ error: 'Identifier required' });
        }

        const success = removeBan(identifier);

        logAdminAction(AUDIT_EVENTS.USER_UNBANNED, {
            identifier,
            success
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'unban') });
    }
});

// ============================================
// ADMIN - VALIDATION ROUTES
// ============================================

/**
 * Get validator statistics (admin only)
 * GET /api/admin/validator
 */
app.get('/api/admin/validator', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getValidatorStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'validator-stats') });
    }
});

// ============================================
// ADMIN - FEATURE FLAGS ROUTES
// ============================================

/**
 * Get all feature flags (admin only)
 * GET /api/admin/flags
 */
app.get('/api/admin/flags', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const flags = getAllFlags();
        const stats = getFeatureFlagStats();

        res.json({ flags, stats });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'feature-flags') });
    }
});

/**
 * Create or update feature flag (admin only)
 * POST /api/admin/flags
 */
app.post('/api/admin/flags', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { key, config } = req.body;

        if (!key || typeof key !== 'string') {
            return res.status(400).json({ error: 'Flag key required' });
        }

        const result = createFlag(key, config || {});

        logAdminAction(AUDIT_EVENTS.FLAG_TOGGLED, {
            key,
            action: 'created'
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'create-flag') });
    }
});

/**
 * Toggle feature flag (admin only)
 * POST /api/admin/flags/:key/toggle
 */
app.post('/api/admin/flags/:key/toggle', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled (boolean) required' });
        }

        const success = setFlagEnabled(key, enabled);

        if (!success) {
            return res.status(404).json({ error: 'Flag not found' });
        }

        logAdminAction(AUDIT_EVENTS.FLAG_TOGGLED, {
            key,
            enabled
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, key, enabled });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'toggle-flag') });
    }
});

/**
 * Update flag rollout percentage (admin only)
 * POST /api/admin/flags/:key/percentage
 */
app.post('/api/admin/flags/:key/percentage', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { percentage } = req.body;

        if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
            return res.status(400).json({ error: 'percentage (0-100) required' });
        }

        const success = setFlagPercentage(key, percentage);

        if (!success) {
            return res.status(404).json({ error: 'Flag not found' });
        }

        logAdminAction(AUDIT_EVENTS.FLAG_TOGGLED, {
            key,
            percentage
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, key, percentage });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'flag-percentage') });
    }
});

/**
 * Get flag history (admin only)
 * GET /api/admin/flags/history
 */
app.get('/api/admin/flags/history', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const key = req.query.key || null;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const history = getFlagHistory(key, limit);
        res.json({ history, count: history.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'flag-history') });
    }
});

/**
 * Evaluate flag for context (public, for client-side feature checks)
 * POST /api/flags/evaluate
 */
app.post('/api/flags/evaluate', optionalAuthMiddleware, async (req, res) => {
    try {
        const { flags } = req.body;

        if (!Array.isArray(flags)) {
            return res.status(400).json({ error: 'flags array required' });
        }

        const context = {
            wallet: req.user?.wallet,
            tier: req.user?.tier,
            tierIndex: req.user?.tierIndex,
            environment: isProduction ? 'production' : 'development'
        };

        const results = {};
        for (const key of flags.slice(0, 50)) {  // Limit to 50 flags per request
            results[key] = evaluateFlag(key, context);
        }

        res.json({ flags: results });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'evaluate-flags') });
    }
});

// ============================================
// ADMIN - AUDIT TRAIL ROUTES
// ============================================

/**
 * Get audit statistics (admin only)
 * GET /api/admin/audit
 */
app.get('/api/admin/audit', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getAuditStats();
        const alerts = getActiveAlerts();

        res.json({ stats, alerts });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'audit-stats') });
    }
});

/**
 * Search audit logs (admin only)
 * GET /api/admin/audit/search
 */
app.get('/api/admin/audit/search', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const query = {
            category: req.query.category || null,
            eventType: req.query.eventType || null,
            severity: req.query.severity || null,
            actor: req.query.actor || null,
            startTime: req.query.startTime ? parseInt(req.query.startTime) : null,
            endTime: req.query.endTime ? parseInt(req.query.endTime) : null,
            limit: Math.min(parseInt(req.query.limit) || 50, 500),
            offset: parseInt(req.query.offset) || 0
        };

        const results = searchAudit(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'audit-search') });
    }
});

/**
 * Export audit logs (admin only)
 * GET /api/admin/audit/export
 */
app.get('/api/admin/audit/export', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const options = {
            category: req.query.category || null,
            startTime: req.query.startTime ? parseInt(req.query.startTime) : null,
            endTime: req.query.endTime ? parseInt(req.query.endTime) : null,
            format: req.query.format || 'json'
        };

        const exported = exportAuditLogs(options);

        logAdminAction(AUDIT_EVENTS.DATA_EXPORTED, {
            type: 'audit_logs',
            format: options.format,
            eventCount: exported.totalEvents || 0
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        if (options.format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="audit_export.csv"');
            return res.send(exported);
        }

        res.json(exported);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'audit-export') });
    }
});

/**
 * Get active security alerts (admin only)
 * GET /api/admin/audit/alerts
 */
app.get('/api/admin/audit/alerts', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const alerts = getActiveAlerts();
        res.json({ alerts, count: alerts.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'audit-alerts') });
    }
});

// ============================================
// ADMIN - CIRCUIT BREAKER ROUTES
// ============================================

/**
 * Get all circuit breakers (admin only)
 * GET /api/admin/circuits
 */
app.get('/api/admin/circuits', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const circuits = getAllCircuits();
        const stats = getCircuitStats();

        res.json({ circuits, stats });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'circuits') });
    }
});

/**
 * Get specific circuit status (admin only)
 * GET /api/admin/circuits/:name
 */
app.get('/api/admin/circuits/:name', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const status = getCircuitStatus(req.params.name);

        if (!status) {
            return res.status(404).json({ error: 'Circuit not found' });
        }

        res.json(status);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'circuit-status') });
    }
});

/**
 * Force circuit state (admin only)
 * POST /api/admin/circuits/:name/state
 */
app.post('/api/admin/circuits/:name/state', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { state } = req.body;

        if (!['open', 'closed'].includes(state)) {
            return res.status(400).json({ error: 'State must be "open" or "closed"' });
        }

        const success = forceCircuitState(req.params.name, state);

        if (!success) {
            return res.status(404).json({ error: 'Circuit not found' });
        }

        logAdminAction(AUDIT_EVENTS.CONFIG_CHANGED, {
            circuit: req.params.name,
            newState: state
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, circuit: req.params.name, state });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'circuit-state') });
    }
});

/**
 * Reset circuit (admin only)
 * POST /api/admin/circuits/:name/reset
 */
app.post('/api/admin/circuits/:name/reset', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const success = resetCircuit(req.params.name);

        if (!success) {
            return res.status(404).json({ error: 'Circuit not found' });
        }

        res.json({ success: true, circuit: req.params.name });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'circuit-reset') });
    }
});

// ============================================
// ADMIN - TRACING ROUTES
// ============================================

/**
 * Get tracing statistics (admin only)
 * GET /api/admin/tracing
 */
app.get('/api/admin/tracing', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getTracingStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'tracing-stats') });
    }
});

/**
 * Get specific trace (admin only)
 * GET /api/admin/tracing/traces/:id
 */
app.get('/api/admin/tracing/traces/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const trace = getTrace(req.params.id);

        if (!trace) {
            return res.status(404).json({ error: 'Trace not found' });
        }

        res.json(trace);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-trace') });
    }
});

/**
 * Search traces (admin only)
 * GET /api/admin/tracing/search
 */
app.get('/api/admin/tracing/search', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const query = {
            operationName: req.query.operation || null,
            hasError: req.query.hasError === 'true' ? true : req.query.hasError === 'false' ? false : null,
            minDuration: req.query.minDuration ? parseInt(req.query.minDuration) : null,
            maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration) : null,
            limit: Math.min(parseInt(req.query.limit) || 50, 100),
            offset: parseInt(req.query.offset) || 0
        };

        const traces = searchTraces(query);
        res.json({ traces, count: traces.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'search-traces') });
    }
});

/**
 * Get slow traces (admin only)
 * GET /api/admin/tracing/slow
 */
app.get('/api/admin/tracing/slow', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 1000;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const traces = getSlowTraces(threshold, limit);
        res.json({ traces, count: traces.length, threshold });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'slow-traces') });
    }
});

/**
 * Get error traces (admin only)
 * GET /api/admin/tracing/errors
 */
app.get('/api/admin/tracing/errors', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const traces = getErrorTraces(limit);

        res.json({ traces, count: traces.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'error-traces') });
    }
});

/**
 * Set sample rate (admin only)
 * POST /api/admin/tracing/sample-rate
 */
app.post('/api/admin/tracing/sample-rate', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { rate } = req.body;

        if (typeof rate !== 'number' || rate < 0 || rate > 1) {
            return res.status(400).json({ error: 'Rate must be between 0 and 1' });
        }

        setSampleRate(rate);

        logAdminAction(AUDIT_EVENTS.CONFIG_CHANGED, {
            setting: 'tracing.sampleRate',
            value: rate
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, sampleRate: rate });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'set-sample-rate') });
    }
});

// ============================================
// HEALTH CHECK PROBES
// ============================================

/**
 * Liveness probe
 * GET /livez
 */
app.get('/livez', (req, res) => {
    const result = livenessProbe();
    res.json(result);
});

/**
 * Readiness probe
 * GET /readyz
 */
app.get('/readyz', async (req, res) => {
    try {
        const result = await readinessProbe();
        const status = result.ready ? 200 : 503;
        res.status(status).json(result);
    } catch (error) {
        res.status(503).json({ ready: false, error: error.message });
    }
});

/**
 * Startup probe
 * GET /startupz
 */
app.get('/startupz', async (req, res) => {
    try {
        const result = await startupProbe();
        const status = result.started ? 200 : 503;
        res.status(status).json(result);
    } catch (error) {
        res.status(503).json({ started: false, error: error.message });
    }
});

/**
 * Detailed health (admin only)
 * GET /api/admin/health
 */
app.get('/api/admin/health', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const health = await getDetailedHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'detailed-health') });
    }
});

/**
 * Health history (admin only)
 * GET /api/admin/health/history
 */
app.get('/api/admin/health/history', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const history = getHealthHistory(limit);
        const trend = getHealthTrend(60);

        res.json({ history, trend });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'health-history') });
    }
});

// ============================================
// ADMIN - CONFIGURATION ROUTES
// ============================================

/**
 * Get all configuration (admin only)
 * GET /api/admin/config
 */
app.get('/api/admin/config', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const includeSensitive = req.query.sensitive === 'true';
        const config = getAllConfig({
            includeSensitive,
            includeMetadata: true
        });
        const stats = getConfigStats();

        res.json({ config, stats });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-config') });
    }
});

/**
 * Get specific configuration (admin only)
 * GET /api/admin/config/:key
 */
app.get('/api/admin/config/:key', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const value = getConfig(req.params.key);

        if (value === undefined) {
            return res.status(404).json({ error: 'Configuration not found' });
        }

        res.json({ key: req.params.key, value });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-config-key') });
    }
});

/**
 * Set configuration value (admin only)
 * PUT /api/admin/config/:key
 */
app.put('/api/admin/config/:key', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ error: 'Value required' });
        }

        const result = setConfig(req.params.key, value, {
            updatedBy: req.user.wallet,
            source: 'admin'
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        logAdminAction(AUDIT_EVENTS.CONFIG_CHANGED, {
            key: req.params.key
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, key: req.params.key });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'set-config') });
    }
});

/**
 * Get configuration history (admin only)
 * GET /api/admin/config/history
 */
app.get('/api/admin/config/history', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const key = req.query.key || null;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const history = getConfigHistory(key, limit);
        res.json({ history, count: history.length });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'config-history') });
    }
});

// ============================================
// REQUEST BATCHING
// ============================================

/**
 * Batch multiple API requests
 * POST /api/batch
 */
app.post('/api/batch', authMiddleware, walletRateLimiter, createBatchHandler(app));

// ============================================
// API VERSION INFO
// ============================================

/**
 * Get API version information
 * GET /api/version
 */
app.get('/api/version', (req, res) => {
    const versionInfo = getVersionInfo();
    res.json(versionInfo);
});

// ============================================
// ADMIN - SHUTDOWN ROUTES
// ============================================

/**
 * Get shutdown status (admin only)
 * GET /api/admin/shutdown
 */
app.get('/api/admin/shutdown', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getShutdownStats();
        const state = getShutdownState();

        res.json({ stats, state });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'shutdown-stats') });
    }
});

/**
 * Initiate graceful shutdown (admin only)
 * POST /api/admin/shutdown
 */
app.post('/api/admin/shutdown', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        logAdminAction(AUDIT_EVENTS.CONFIG_CHANGED, {
            action: 'shutdown_initiated',
            reason: reason || 'admin_request'
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({
            success: true,
            message: 'Graceful shutdown initiated',
            reason: reason || 'admin_request'
        });

        // Initiate shutdown after response
        setImmediate(() => {
            initiateShutdown(reason || 'admin_request');
        });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'initiate-shutdown') });
    }
});

// ============================================
// ADMIN - VERSIONING ROUTES
// ============================================

/**
 * Get versioning statistics (admin only)
 * GET /api/admin/versioning
 */
app.get('/api/admin/versioning', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getVersioningStats();
        const info = getVersionInfo();

        res.json({ stats, info });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'versioning-stats') });
    }
});

// ============================================
// ADMIN - BATCHING ROUTES
// ============================================

/**
 * Get batching statistics (admin only)
 * GET /api/admin/batching
 */
app.get('/api/admin/batching', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getBatchingStats();
        const running = getRunningBatches();

        res.json({ stats, runningBatches: running });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'batching-stats') });
    }
});

// ============================================
// ADMIN - COMPRESSION ROUTES
// ============================================

/**
 * Get compression statistics (admin only)
 * GET /api/admin/compression
 */
app.get('/api/admin/compression', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getCompressionStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'compression-stats') });
    }
});

/**
 * Clear compression cache (admin only)
 * POST /api/admin/compression/clear-cache
 */
app.post('/api/admin/compression/clear-cache', authMiddleware, requireAdmin, async (req, res) => {
    try {
        clearCompressionCache();

        logAdminAction(AUDIT_EVENTS.CONFIG_CHANGED, {
            action: 'compression_cache_cleared'
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, message: 'Compression cache cleared' });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'clear-compression-cache') });
    }
});

// ============================================
// RPC FAILOVER ROUTES
// ============================================

/**
 * Get RPC endpoints status (admin only)
 * GET /api/admin/rpc
 */
app.get('/api/admin/rpc', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const endpoints = getAllEndpointsStatus();
        const stats = getRpcStats();

        res.json({ endpoints, stats });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'rpc-status') });
    }
});

/**
 * Trigger health check on all endpoints (admin only)
 * POST /api/admin/rpc/health-check
 */
app.post('/api/admin/rpc/health-check', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const results = await checkAllEndpointsHealth();
        res.json({ results: Object.fromEntries(results) });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'rpc-health-check') });
    }
});

// ============================================
// TRANSACTION MONITOR ROUTES
// ============================================

/**
 * Track a transaction
 * POST /api/transactions/track
 */
app.post('/api/transactions/track', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
        const { signature, type, amount, metadata } = req.body;

        if (!signature) {
            return res.status(400).json({ error: 'Transaction signature required' });
        }

        const tracker = trackTransaction(signature, {
            wallet: req.user.wallet,
            type: type || TX_TYPES.CUSTOM,
            amount,
            metadata
        });

        res.json({
            signature: tracker.signature,
            state: tracker.state,
            tracking: true
        });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'track-tx') });
    }
});

/**
 * Get transaction status
 * GET /api/transactions/status/:signature
 */
app.get('/api/transactions/status/:signature', async (req, res) => {
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
 * GET /api/transactions/history
 */
app.get('/api/transactions/history', authMiddleware, async (req, res) => {
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
 * GET /api/admin/transactions/active
 */
app.get('/api/admin/transactions/active', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /api/priority-fee
 */
app.get('/api/priority-fee', async (req, res) => {
    try {
        const priorityLevel = req.query.level || 'medium';
        const computeUnits = parseInt(req.query.computeUnits) || 200000;

        const estimate = await getPriorityFeeEstimateV2({
            priorityLevel,
            computeUnits
        });

        res.json(estimate);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'priority-fee') });
    }
});

/**
 * Get priority fee for specific accounts
 * POST /api/priority-fee/accounts
 */
app.post('/api/priority-fee/accounts', async (req, res) => {
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
 * GET /api/priority-fee/congestion
 */
app.get('/api/priority-fee/congestion', async (req, res) => {
    try {
        const analysis = getCongestionAnalysis();
        res.json(analysis);

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'congestion') });
    }
});

/**
 * Get compute unit estimate for transaction type
 * GET /api/priority-fee/compute-units
 */
app.get('/api/priority-fee/compute-units', (req, res) => {
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
 * GET /api/admin/priority-fee
 */
app.get('/api/admin/priority-fee', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = getPriorityFeeStats();
        const history = getFeeHistory(50);
        const hourly = getFeeHourlyAverages(24);

        res.json({ stats, history, hourlyAverages: hourly });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'fee-admin') });
    }
});

// ============================================
// WEBSOCKET STATUS ROUTES
// ============================================

/**
 * Get WebSocket connection status
 * GET /api/admin/websocket
 */
app.get('/api/admin/websocket', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const status = getWsStatus();
        const stats = getWsStats();
        const subscriptions = getWsSubscriptions();

        res.json({ status, stats, subscriptions });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'ws-status') });
    }
});

/**
 * Reconnect WebSocket (admin only)
 * POST /api/admin/websocket/reconnect
 */
app.post('/api/admin/websocket/reconnect', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await wsConnect();

        logAdminAction(AUDIT_EVENTS.CONFIG_CHANGED, {
            action: 'websocket_reconnect'
        }, {
            actor: { id: req.user.wallet, type: 'admin' }
        });

        res.json({ success: true, status: getWsStatus() });

    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'ws-reconnect') });
    }
});

// ============================================
// ANALYTICS TRACKING MIDDLEWARE
// ============================================

// ============================================
// PHASE 12: DATA MANAGEMENT & COMPLIANCE
// ============================================

/**
 * Request data export (GDPR Right to Access)
 * POST /api/data/export
 */
app.post('/api/data/export', authMiddleware, async (req, res) => {
    try {
        const result = requestExport(req.user.wallet, req.body);
        if (!result.success) {
            return res.status(429).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'data-export') });
    }
});

/**
 * Get export request status
 * GET /api/data/export/:requestId
 */
app.get('/api/data/export/:requestId', authMiddleware, async (req, res) => {
    try {
        const status = getExportRequestStatus(req.params.requestId, req.user.wallet);
        if (!status) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'export-status') });
    }
});

/**
 * Download exported data
 * GET /api/data/export/:requestId/download
 */
app.get('/api/data/export/:requestId/download', authMiddleware, async (req, res) => {
    try {
        const status = getExportRequestStatus(req.params.requestId, req.user.wallet);
        if (!status || !status.downloadAvailable) {
            return res.status(404).json({ error: 'Download not available' });
        }
        const result = downloadExport(req.params.requestId, req.user.wallet);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'download-export') });
    }
});

/**
 * Request data deletion (GDPR Right to Erasure)
 * POST /api/data/delete
 */
app.post('/api/data/delete', authMiddleware, async (req, res) => {
    try {
        const result = requestDeletion(req.user.wallet, req.body);
        if (!result.success) {
            return res.status(result.confirmationRequired ? 200 : 429).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'data-delete') });
    }
});

/**
 * Get user's data requests
 * GET /api/data/requests
 */
app.get('/api/data/requests', authMiddleware, async (req, res) => {
    try {
        const requests = getWalletRequests(req.user.wallet);
        res.json({ requests });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'data-requests') });
    }
});

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get user's active sessions
 * GET /api/sessions
 */
app.get('/api/sessions', authMiddleware, async (req, res) => {
    try {
        const sessions = getUserSessions(req.user.wallet);
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-sessions') });
    }
});

/**
 * Revoke a specific session
 * DELETE /api/sessions/:sessionId
 */
app.delete('/api/sessions/:sessionId', authMiddleware, async (req, res) => {
    try {
        const result = revokeSession(req.params.sessionId, req.user.wallet);
        if (!result.success) {
            return res.status(404).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'revoke-session') });
    }
});

/**
 * Revoke all sessions (logout everywhere)
 * DELETE /api/sessions
 */
app.delete('/api/sessions', authMiddleware, async (req, res) => {
    try {
        const result = revokeAllUserSessions(req.user.wallet);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'revoke-all-sessions') });
    }
});

/**
 * Get user's devices
 * GET /api/devices
 */
app.get('/api/devices', authMiddleware, async (req, res) => {
    try {
        const devices = getUserDevices(req.user.wallet);
        res.json({ devices });
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'get-devices') });
    }
});

/**
 * Block a device
 * POST /api/devices/:deviceId/block
 */
app.post('/api/devices/:deviceId/block', authMiddleware, async (req, res) => {
    try {
        const result = blockDevice(req.user.wallet, req.params.deviceId);
        if (!result.success) {
            return res.status(404).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'block-device') });
    }
});

/**
 * Trust a device
 * POST /api/devices/:deviceId/trust
 */
app.post('/api/devices/:deviceId/trust', authMiddleware, async (req, res) => {
    try {
        const result = trustDevice(req.user.wallet, req.params.deviceId);
        if (!result.success) {
            return res.status(404).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: sanitizeError(error, 'trust-device') });
    }
});

// ============================================
// API DOCUMENTATION
// ============================================

/**
 * OpenAPI specification
 * GET /api/docs/openapi.json
 */
app.get('/api/docs/openapi.json', (req, res) => {
    res.json(generateSpec());
});

/**
 * API Documentation page
 * GET /api/docs
 */
app.get('/api/docs', serveDocumentation);

/**
 * Swagger UI
 * GET /api/docs/swagger
 */
app.get('/api/docs/swagger', serveSwaggerUI);

// ============================================
// ANALYTICS TRACKING
// ============================================

// Track API requests for analytics (non-blocking)
app.use((req, res, next) => {
    // Skip health checks and static files
    if (req.path === '/health' || req.path.startsWith('/static')) {
        return next();
    }

    // Track asynchronously to not block request
    setImmediate(() => {
        trackAnalytics(ANALYTICS_EVENTS.PAGE_VIEW, {
            path: req.path,
            method: req.method
        }, {
            wallet: req.user?.wallet,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });
    });

    next();
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res, next) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
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
// PROCESS ERROR HANDLERS
// ============================================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error.message);
    if (!isProduction) {
        console.error(error.stack);
    }
    // Log to audit in production
    if (isProduction) {
        logAudit('uncaught_exception', { error: error.message.slice(0, 100) });
    }
    // Give time to log, then exit
    setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error('[ERROR] Unhandled Rejection:', message);
    if (!isProduction && reason instanceof Error) {
        console.error(reason.stack);
    }
    // Log to audit in production
    if (isProduction) {
        logAudit('unhandled_rejection', { error: message.slice(0, 100) });
    }
    // Don't exit on unhandled rejection, but log it
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, async () => {
    console.log(`🔥 ASDF API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`   Version: 1.8.0`);

    // Register server with shutdown service
    registerServer(server);
    console.log('   Graceful shutdown: enabled');

    // Sync leaderboard from blockchain on startup
    try {
        await syncFromBlockchain();
        console.log('   Leaderboard: synced from blockchain');
    } catch (error) {
        console.warn('   Leaderboard: sync failed -', error.message);
    }
});

module.exports = app;
