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

// Load environment-specific .env file
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';

require('dotenv').config({
  path: path.join(__dirname, envFile),
});

// Fallback to .env if specific file doesn't exist
if (!process.env.HELIUS_API_KEY) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Services
const {
  generateChallenge,
  verifyAndAuthenticate,
  refreshToken,
  revokeToken,
  authMiddleware,
  optionalAuthMiddleware,
} = require('./services/auth');
const {
  getTokenBalance,
  getTokenSupply,
  getRecentBurns,
  getWalletBurnHistory,
  getBatchTokenBalances,
  getPriorityFeeEstimate,
  healthCheck,
  isValidAddress,
} = require('./services/helius');
const {
  getCatalogWithPrices,
  initiatePurchase,
  confirmPurchase,
  getInventory,
  getEquipped,
  equipItem,
  unequipLayer,
  getShopMetrics,
} = require('./services/shop');
const shopV2 = require('./services/shopV2');
const {
  getTopBurners,
  getXPLeaderboard,
  getUserRank,
  getStatistics,
  recordBurn,
  logAudit,
  syncFromBlockchain,
  getAuditLog,
} = require('./services/leaderboard');
const {
  startGameSession,
  submitScore,
  getPlayerStats,
  getValidationMetrics,
} = require('./services/gameValidation');
const { requireAdmin, getSecurityMetrics, generateNonce, isAdmin } = require('./services/security');
const {
  metricsMiddleware,
  getSummaryMetrics,
  getDetailedMetrics,
  getPrometheusMetrics,
} = require('./services/metrics');
const { getHealthStatus: getDbHealth } = require('./services/database');
const {
  verifyWebhookSignature: verifyHeliusSignature,
  processWebhookEvent,
  getWebhookMetrics,
  registerWebhook,
  listWebhooks,
} = require('./services/webhooks');
const {
  getWalletNFTs,
  verifyNFTOwnership,
  verifyCollectionOwnership,
  getTokenBalances: getDASTokenBalances,
  getAssetDetails,
  checkRateLimit: checkAssetRateLimit,
  getAssetMetrics,
} = require('./services/assets');
const {
  getUnlockedAchievements,
  getAchievementProgress,
  getDetailedAchievements,
  recordBurnForAchievements,
  recordGameForAchievements,
  updateStreak,
  grantAchievement,
  getAchievementLeaderboard,
  getAchievementMetrics,
} = require('./services/achievements');
const {
  getActiveChallenges,
  updateProgress: updateChallengeProgress,
  claimReward: claimChallengeReward,
  getChallengeStats,
} = require('./services/challenges');
const {
  NOTIFICATION_TYPES: _NOTIFICATION_TYPES,
  createNotification: _createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences: getNotificationPreferences,
  updatePreferences: updateNotificationPreferences,
  notifyAchievementUnlocked: _notifyAchievementUnlocked,
  getNotificationMetrics,
} = require('./services/notifications');
const {
  buildBurnTransaction,
  buildTransferTransaction,
  verifyTransaction,
  completeTransaction: _completeTransaction,
  getTransactionMetrics,
} = require('./services/transactions');
const {
  getOrCreateReferralCode,
  validateCode: validateReferralCode,
  processReferral,
  getReferralStats,
  getReferralLeaderboard,
  getReferralMetrics,
} = require('./services/referrals');
const {
  EVENTS,
  subscribe: _subscribeEvent,
  publish: publishEvent,
  emitBurnConfirmed: _emitBurnConfirmed,
  emitAchievementUnlocked: _emitAchievementUnlocked,
  emitPurchaseCompleted: _emitPurchaseCompleted,
  getEventBusMetrics,
} = require('./services/eventBus');
const {
  get: _cacheGet,
  del: _cacheDel,
  wrap: _cacheWrap,
  invalidateTag,
  getStats: getCacheStats,
} = require('./services/cache');
const {
  registerHandler: _registerJobHandler,
  enqueue: _enqueueJob,
  getJob,
  getJobsByStatus,
  getQueueStats,
  PRIORITY: _JOB_PRIORITY,
} = require('./services/queue');
const {
  track: trackAnalytics,
  trackPageView: _trackPageView,
  trackAction: _trackAction,
  getAggregatedMetrics,
  getFunnelAnalysis,
  getAnalyticsMetrics,
  EVENT_TYPES: ANALYTICS_EVENTS,
} = require('./services/analytics');
const {
  schedule: _scheduleTask,
  scheduleInterval: _scheduleInterval,
  getAllTasks,
  getHistory: getTaskHistory,
  getSchedulerMetrics,
  SCHEDULES: _SCHEDULES,
} = require('./services/scheduler');
const {
  checkLimit: _checkRateLimit,
  checkTokenBucket: _checkTokenBucket,
  createMiddleware: _createRateLimitMiddleware,
  getStats: getRateLimitStats,
  getBannedList,
  removeBan,
  extractIP,
} = require('./services/ratelimit');
const {
  validate: _validate,
  registerSchema: _registerSchema,
  createMiddleware: _createValidationMiddleware,
  sanitizeValue: _sanitizeValue,
  getStats: getValidatorStats,
} = require('./services/validator');
const {
  isEnabled: _isFeatureEnabled,
  evaluate: evaluateFlag,
  getAllFlags,
  setFlagEnabled,
  setFlagPercentage,
  createFlag,
  getStats: getFeatureFlagStats,
  getHistory: getFlagHistory,
} = require('./services/featureflags');
const {
  log: auditLog,
  logSecurity: _logSecurity,
  logAdmin: logAdminAction,
  search: searchAudit,
  getActiveAlerts,
  exportLogs: exportAuditLogs,
  getStats: getAuditStats,
  createMiddleware: _createAuditMiddleware,
  EVENT_TYPES: AUDIT_EVENTS,
  CATEGORIES: _AUDIT_CATEGORIES,
  SEVERITY: AUDIT_SEVERITY,
} = require('./services/audit');
const {
  getCircuit: _getCircuit,
  execute: _circuitExecute,
  wrap: _circuitWrap,
  getAllCircuits,
  getCircuitStatus,
  forceCircuitState,
  resetCircuit,
  getStats: getCircuitStats,
  STATES: _CIRCUIT_STATES,
} = require('./services/circuitbreaker');
const {
  startTrace: _startTrace,
  startSpan: _startSpan,
  endSpan: _endSpan,
  getCurrentTrace: _getCurrentTrace,
  createMiddleware: _createTracingMiddleware,
  getTrace,
  searchTraces,
  getSlowTraces,
  getErrorTraces,
  getRecentTraces: _getRecentTraces,
  getStats: getTracingStats,
  setSampleRate,
} = require('./services/tracing');
const {
  registerCheck: _registerCheck,
  runAllChecks: _runAllChecks,
  livenessProbe,
  readinessProbe,
  startupProbe,
  getDetailedHealth,
  getHistory: getHealthHistory,
  getTrend: getHealthTrend,
  getStats: getHealthStats,
  CHECK_TYPES: _CHECK_TYPES,
} = require('./services/healthcheck');
const {
  get: getConfig,
  set: setConfig,
  getAll: getAllConfig,
  onChange: _onConfigChange,
  getHistory: getConfigHistory,
  getStats: getConfigStats,
  defineSchema: _defineConfigSchema,
} = require('./services/config');
const {
  registerServer,
  registerCleanup,
  middleware: shutdownMiddleware,
  initiateShutdown,
  getHealthState: getShutdownState,
  getStats: getShutdownStats,
  isAcceptingTraffic: _isAcceptingTraffic,
} = require('./services/shutdown');
const {
  middleware: versioningMiddleware,
  getVersionInfo,
  getStats: getVersioningStats,
  detectVersion: _detectVersion,
  validateVersion: _validateVersion,
} = require('./services/versioning');
const {
  createBatchHandler,
  getStats: getBatchingStats,
  getRunningBatches,
} = require('./services/batching');
const {
  middleware: compressionMiddleware,
  getStats: getCompressionStats,
  clearCache: clearCompressionCache,
} = require('./services/compression');
const {
  registerEndpoint: _registerEndpoint,
  executeRequest: _executeRequest,
  executeEnhancedRequest: _executeEnhancedRequest,
  getAllEndpointsStatus,
  checkAllEndpointsHealth,
  getStats: getRpcStats,
  ENDPOINT_TYPES: _ENDPOINT_TYPES,
} = require('./services/rpcFailover');
const {
  trackTransaction,
  getTransactionStatus,
  getActiveTransactions,
  getHistory: _getTxHistory,
  getWalletHistory: getTxWalletHistory,
  getStats: getTxMonitorStats,
  TX_STATES: _TX_STATES,
  TX_TYPES,
} = require('./services/txMonitor');
const {
  getEstimate: getPriorityFeeEstimateV2,
  getAccountFeeEstimate,
  getCongestionAnalysis,
  getHistory: getFeeHistory,
  getHourlyAverages: getFeeHourlyAverages,
  estimateComputeUnits,
  getStats: getPriorityFeeStats,
  PRIORITY_LEVELS: _PRIORITY_LEVELS,
} = require('./services/priorityFee');
const {
  connect: wsConnect,
  getConnectionStatus: getWsStatus,
  subscribeAccount: _subscribeAccount,
  subscribeSignature: _subscribeSignature,
  getSubscriptions: getWsSubscriptions,
  getStats: getWsStats,
  shutdown: _wsShutdown,
} = require('./services/wsManager');

// Phase 12: Data Management & Compliance
const {
  requestExport,
  downloadExport,
  requestDeletion,
  getRequestStatus: getExportRequestStatus,
  getWalletRequests,
  getStats: getDataExportStats,
} = require('./services/dataExport');
const {
  middleware: _idempotencyMiddleware,
  generateKey: _generateIdempotencyKey,
  invalidateKey: _invalidateIdempotencyKey,
  getStats: getIdempotencyStats,
} = require('./services/idempotency');
const {
  createSession: _createSession,
  validateSession: _validateSession,
  refreshSession: _refreshSession,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  getUserDevices,
  blockDevice,
  trustDevice,
  getStats: getSessionStats,
} = require('./services/sessionManager');
const {
  registerTag: _registerApiTag,
  registerSchema: _registerApiSchema,
  registerRoute: _registerApiRoute,
  generateSpec,
  serveDocumentation,
  serveSwaggerUI,
  getStats: getOpenApiStats,
} = require('./services/openApiGenerator');

// Phase 15: Storage Abstraction (Redis/Memory)
const { getStorage, isStorageReady, BACKENDS: _BACKENDS } = require('./services/storage');

// Phase 16: Modular Routes (extracted from index.js)
const routes = require('./routes');

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
    'not found',
    'already owned',
    'insufficient balance',
    'invalid wallet',
    'item not',
    'requires higher',
    'purchase expired',
    'signature required',
    'already used',
    'cannot purchase',
    'cannot unequip',
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
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('helius')
  ) {
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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

// CRITICAL: Fail to start if ALLOWED_ORIGINS is not configured in production
if (isProduction && (!allowedOrigins || allowedOrigins.length === 0)) {
  console.error('[SECURITY] FATAL: ALLOWED_ORIGINS must be configured in production');
  console.error(
    'Set ALLOWED_ORIGINS=https://your-domain.com,https://other-domain.com in environment'
  );
  process.exit(1);
}

const corsOrigins = isProduction
  ? allowedOrigins
  : allowedOrigins || ['http://localhost:3000', 'http://localhost:5173', 'https://alonisthe.dev'];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

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
        message: 'Content-Type must be application/json',
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
  req.requestId =
    req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      // eslint-disable-next-line no-control-regex
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
  httpOnly: true, // Not accessible via JavaScript
  secure: isProduction, // HTTPS only in production
  sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
  path: '/api', // Only sent to API routes
  maxAge: 24 * 60 * 60 * 1000, // 24 hours (match JWT expiry)
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
    path: '/api',
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
        message: 'Content-Type must be application/json',
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

// Monitoring middleware
const { requestTrackingMiddleware, errorTrackingMiddleware } = require('./services/monitoring');
app.use(requestTrackingMiddleware);

// Rate limiting by IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
});

const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many purchase attempts, please try again later' },
});

// Health endpoint rate limiter - prevent DoS via heavy metrics gathering
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many health check requests' },
});

// Per-wallet rate limiting for sensitive operations
const walletRateLimits = new Map();
const WALLET_RATE_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30, // 30 requests per wallet per minute
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
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
    // SECURITY: Don't log wallet addresses in production
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[RateLimit] Wallet ${wallet.slice(0, 8)}... exceeded limit`);
    }
    return res.status(429).json({
      error: 'Too many requests from this wallet',
      retryAfter: Math.ceil((walletData.windowStart + WALLET_RATE_CONFIG.windowMs - now) / 1000),
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
// MODULAR ROUTES (extracted from this file)
// ============================================
app.use('/', routes.probes); // /livez, /readyz, /startupz
app.use('/api/auth', routes.auth); // auth challenge, verify, refresh, logout
app.use('/api/user', routes.user); // user profile
app.use('/api', routes.shop); // shop v1 + v2, csrf, currency
app.use('/api', routes.ecosystem); // ecosystem stats, leaderboard, burns, batch, config
app.use('/api', routes.games); // game validation, scores, achievements, challenges, progression
app.use('/api', routes.admin); // all admin routes (20+ sections)
app.use('/api', routes.helius); // webhooks, DAS API, assets, token metadata
app.use('/api', routes.notifications); // notifications, push, preferences
app.use('/api', routes.formations); // learning tracks, modules, progress
app.use('/api', routes.transactions); // transaction builder, monitor, priority fees
app.use('/api', routes.data); // data export/delete, sessions, devices
app.use('/api', routes.referrals); // referral system
app.use('/api', routes.createMiscRouter(app)); // metrics, security, docs, version, batch

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

  // Phase 15: Storage stats
  const storage = getStorage();
  const storageInfo = await storage.info().catch(() => ({ backend: 'unknown', error: true }));

  res.json({
    status: heliusHealth.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.8.0',
    services: {
      api: true,
      helius: heliusHealth.healthy,
      heliusEnhanced: heliusHealth.details?.enhancedApi || false,
      database: dbHealth.type,
      storage: storageInfo.backend,
      storageReady: isStorageReady(),
      webhooks: webhookMetrics.config.hasSecret,
      eventBus: eventBusMetrics.registeredEvents > 0,
    },
    latency: {
      helius: heliusHealth.latency,
    },
    metrics: {
      shop: shopMetrics,
      game: gameMetrics,
      database: dbHealth.stats,
      security: {
        activeNonces: securityMetrics.activeNonces,
      },
      webhooks: {
        queueSize: webhookMetrics.queueSize,
        processed: webhookMetrics.processedCount,
      },
      assets: {
        cacheSize: assetMetrics.cacheSize,
      },
      achievements: {
        totalPlayers: achievementMetrics.playersWithAchievements,
        totalUnlocks: achievementMetrics.totalUnlocks,
      },
      notifications: {
        users: notificationMetrics.usersWithNotifications,
        unread: notificationMetrics.totalUnread,
      },
      transactions: {
        pending: transactionMetrics.pendingCount,
      },
      referrals: {
        totalCodes: referralMetrics.totalCodes,
        totalReferrals: referralMetrics.totalReferrals,
      },
      eventBus: {
        handlers: eventBusMetrics.totalHandlers,
      },
      cache: {
        entries: cacheStats.entries,
        hitRate: cacheStats.hitRate,
      },
      queue: {
        pending: queueStats.totalQueued,
        active: queueStats.activeJobs,
      },
      analytics: {
        events: analyticsMetrics.rawEvents,
        sessions: analyticsMetrics.activeSessions,
      },
      scheduler: {
        tasks: schedulerMetrics.taskCount,
        running: schedulerMetrics.runningTasks,
      },
      rateLimit: {
        allowed: rateLimitStats.allowed,
        denied: rateLimitStats.denied,
        bans: rateLimitStats.permanentBans,
      },
      validator: {
        validated: validatorStats.validated,
        passRate: validatorStats.passRate,
      },
      featureFlags: {
        total: featureFlagStats.totalFlags,
        enabled: featureFlagStats.enabledFlags,
      },
      audit: {
        events: auditStats.totalEvents,
        alerts: auditStats.activeAlerts,
      },
      circuits: {
        total: circuitStats.circuitCount,
        open: circuitStats.byState?.open || 0,
      },
      tracing: {
        active: tracingStats.activeTraces,
        stored: tracingStats.storedTraces,
      },
      health: {
        state: healthStats.overallState,
        checks: healthStats.registeredChecks,
      },
      config: {
        total: configStats.totalConfigs,
        schemas: configStats.totalSchemas,
      },
      shutdown: {
        state: shutdownStats.currentState,
        connections: shutdownStats.activeConnections,
      },
      versioning: {
        current: versioningStats.currentVersion,
        requests: versioningStats.totalRequests,
      },
      batching: {
        batches: batchingStats.totalBatches,
        running: batchingStats.runningBatches,
      },
      compression: {
        compressed: compressionStats.compressedResponses,
        savings: compressionStats.savingsPercent,
      },
      rpc: {
        endpoints: rpcStats.endpoints?.total || 0,
        healthy: rpcStats.endpoints?.healthy || 0,
        failovers: rpcStats.failovers,
      },
      txMonitor: {
        active: txMonitorStats.active,
        confirmed: txMonitorStats.confirmed,
      },
      priorityFee: {
        congestion: priorityFeeStats.congestion?.level || 'unknown',
        avgFee: priorityFeeStats.avgFeeRecommended,
      },
      websocket: {
        state: wsStats.connectionState,
        subscriptions: wsStats.activeSubscriptions,
      },
      heliusCacheSize: heliusHealth.details?.cacheSize || 0,
      // Phase 12: Data Management & Compliance
      dataExport: {
        pending: dataExportStats.pendingRequests,
        completed: dataExportStats.completedRequests,
        exported: dataExportStats.dataExportedFormatted,
      },
      idempotency: {
        keys: idempotencyStats.totalKeys,
        hits: idempotencyStats.duplicateHits,
      },
      sessions: {
        active: sessionStats.activeSessions,
        devices: sessionStats.totalDevices,
      },
      openApi: {
        routes: openApiStats.totalRoutes,
        requests: openApiStats.requestsServed,
      },
      storage: {
        backend: storageInfo.backend,
        keys: storageInfo.keys || 0,
        stats: storageInfo.stats || {},
      },
    },
  });
});

// Lazy-loaded service for server startup
let _realtimeNotifications = null;
function getRealtimeNotifications() {
  if (!_realtimeNotifications) {
    _realtimeNotifications = require('./services/realtimeNotifications');
  }
  return _realtimeNotifications;
}

// ============================================
// EXTRACTED ROUTES (see routes/ directory)
// ============================================
// All routes have been extracted to modular files:
//   routes/auth.js        → /api/auth/* (challenge, verify, refresh, logout)
//   routes/auth.js        → /api/user/* (profile)
//   routes/shop.js        → /api/shop/*, /api/csrf-token, /api/currency/*
//   routes/ecosystem.js   → /api/ecosystem/*, /api/leaderboard/*, /api/burns/*
//   routes/games.js       → /api/game/*, /api/scores/*, /api/achievements/*, /api/progression/*
//   routes/admin.js       → /api/admin/* (metrics, cache, queue, flags, audit, circuits, tracing, config, etc.)
//   routes/helius.js      → /api/webhook/*, /api/assets/*, /api/das/*, /api/token/*, /api/helius/*
//   routes/notifications.js → /api/notifications/*, /api/admin/notifications/*
//   routes/formations.js  → /api/formations/*
//   routes/transactions.js → /api/transactions/*, /api/priority-fee/*
//   routes/data.js        → /api/data/*, /api/sessions/*, /api/devices/*
//   routes/referrals.js   → /api/referrals/*
//   routes/misc.js        → /api/metrics/*, /api/security/*, /api/docs/*, /api/version, /api/batch

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
    trackAnalytics(
      ANALYTICS_EVENTS.PAGE_VIEW,
      {
        path: req.path,
        method: req.method,
      },
      {
        wallet: req.user?.wallet,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }
    );
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
    method: req.method,
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
      stack: err.stack,
    });
  }
});

// ============================================
// PROCESS ERROR HANDLERS
// ============================================

// Handle uncaught exceptions
process.on('uncaughtException', error => {
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

  // Initialize storage (Redis or Memory)
  const { waitForStorage } = require('./services/storage');
  try {
    const storage = await waitForStorage();
    const info = await storage.info();
    console.log(
      `   Storage: ${info.backend} ${info.connected !== undefined ? (info.connected ? '(connected)' : '(disconnected)') : ''}`
    );
  } catch (error) {
    console.warn('   Storage: initialization warning -', error.message);
  }

  // Initialize PostgreSQL
  const postgres = require('./services/postgres');
  try {
    await postgres.initialize();
    if (postgres.isAvailable()) {
      const health = await postgres.healthCheck();
      console.log(`   Database: PostgreSQL (${health.latency}ms)`);
    } else {
      console.log('   Database: Memory-only mode (no DATABASE_URL)');
    }
  } catch (error) {
    console.warn('   Database: initialization warning -', error.message);
  }

  // Register server with shutdown service
  registerServer(server);
  console.log('   Graceful shutdown: enabled');

  // Initialize WebSocket notification server
  try {
    const notifications = getRealtimeNotifications();
    notifications.initialize(server);
    console.log('   WebSocket: notifications initialized');
  } catch (error) {
    console.warn('   WebSocket: notifications init failed -', error.message);
  }

  // Initialize WebSocket broadcast manager (bridges eventBus -> WebSocket)
  try {
    const wsBroadcast = require('./services/wsBroadcast');
    wsBroadcast.initialize();
    // Register cleanup handler
    registerCleanup('wsBroadcast', () => wsBroadcast.shutdown(), { priority: 80 });
    console.log('   WebSocket: broadcast manager initialized');
  } catch (error) {
    console.warn('   WebSocket: broadcast init failed -', error.message);
  }

  // Sync leaderboard from blockchain on startup
  try {
    await syncFromBlockchain();
    console.log('   Leaderboard: synced from blockchain');
  } catch (error) {
    console.warn('   Leaderboard: sync failed -', error.message);
  }
});

module.exports = app;
