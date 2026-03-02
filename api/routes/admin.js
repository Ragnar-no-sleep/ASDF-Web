/**
 * Admin Routes Module
 *
 * Handles all admin-related endpoints:
 * - Metrics, audit, status, sync-leaderboard
 * - Cache, queue, analytics, scheduler
 * - Rate limiting, validation, feature flags
 * - Audit trail, circuit breaker, tracing
 * - Health, configuration, shutdown
 * - Versioning, batching, compression
 * - RPC failover, WebSocket management
 * - Monitoring, public status
 */

'use strict';

const express = require('express');
const router = express.Router();

// Helpers
const { sanitizeError, paginate } = require('./helpers');

// Auth & Security
const { authMiddleware, optionalAuthMiddleware } = require('../services/auth');
const { requireAdmin, getSecurityMetrics, isAdmin } = require('../services/security');

// Services
const { getDetailedMetrics } = require('../services/metrics');
const { getHealthStatus: getDbHealth } = require('../services/database');
const { logAudit, getAuditLog, syncFromBlockchain } = require('../services/leaderboard');
const { invalidateTag, getStats: getCacheStats } = require('../services/cache');
const { getJob, getJobsByStatus, getQueueStats } = require('../services/queue');
const {
  getAggregatedMetrics,
  getFunnelAnalysis,
  getAnalyticsMetrics,
} = require('../services/analytics');
const {
  getAllTasks,
  getHistory: getTaskHistory,
  getSchedulerMetrics,
} = require('../services/scheduler');
const {
  getStats: getRateLimitStats,
  getBannedList,
  removeBan,
  extractIP,
} = require('../services/ratelimit');
const { getStats: getValidatorStats } = require('../services/validator');
const {
  evaluateFlag,
  getAllFlags,
  setFlagEnabled,
  setFlagPercentage,
  createFlag,
  getStats: getFeatureFlagStats,
  getHistory: getFlagHistory,
} = require('../services/featureflags');
const {
  log: auditLog,
  logAdmin: logAdminAction,
  search: searchAudit,
  getActiveAlerts,
  exportLogs: exportAuditLogs,
  getStats: getAuditStats,
  EVENT_TYPES: AUDIT_EVENTS,
  SEVERITY: AUDIT_SEVERITY,
} = require('../services/audit');
const {
  getAllCircuits,
  getCircuitStatus,
  forceCircuitState,
  resetCircuit,
  getStats: getCircuitStats,
} = require('../services/circuitbreaker');
const {
  getTrace,
  searchTraces,
  getSlowTraces,
  getErrorTraces,
  getStats: getTracingStats,
  setSampleRate,
} = require('../services/tracing');
const {
  getDetailedHealth,
  getHistory: getHealthHistory,
  getTrend: getHealthTrend,
  getStats: getHealthStats,
} = require('../services/healthcheck');
const {
  get: getConfig,
  set: setConfig,
  getAll: getAllConfig,
  getHistory: getConfigHistory,
  getStats: getConfigStats,
} = require('../services/config');
const {
  getHealthState: getShutdownState,
  getStats: getShutdownStats,
  initiateShutdown,
} = require('../services/shutdown');
const { getVersionInfo, getStats: getVersioningStats } = require('../services/versioning');
const { getStats: getBatchingStats, getRunningBatches } = require('../services/batching');
const {
  getStats: getCompressionStats,
  clearCache: clearCompressionCache,
} = require('../services/compression');
const {
  getAllEndpointsStatus,
  checkAllEndpointsHealth,
  getStats: getRpcStats,
} = require('../services/helius/middleware/failover');
const {
  getConnectionStatus: getWsStatus,
  getSubscriptions: getWsSubscriptions,
  getStats: getWsStats,
  connect: wsConnect,
} = require('../services/wsManager');
const { getStorage, isStorageReady } = require('../services/storage');

// Environment
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// ADMIN - BASIC ROUTES
// ============================================

/**
 * Get detailed metrics (admin only)
 * GET /admin/metrics
 */
router.get('/admin/metrics', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const metrics = getDetailedMetrics();
    const security = getSecurityMetrics();
    const database = getDbHealth();

    res.json({
      api: metrics,
      security,
      database,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'admin-metrics') });
  }
});

/**
 * Get audit log (admin only)
 * GET /admin/audit
 */
router.get('/admin/audit', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const action = req.query.action || null;
    const allLogs = getAuditLog(500, action);
    const { items, pagination } = paginate(allLogs, req);

    res.json({
      logs: items,
      count: items.length,
      filter: action,
      pagination,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'admin-audit') });
  }
});

/**
 * Check admin status
 * GET /admin/status
 */
router.get('/admin/status', authMiddleware, (req, res) => {
  const adminStatus = isAdmin(req.user.wallet);

  res.json({
    wallet: req.user.wallet,
    isAdmin: adminStatus,
    tier: req.user.tier,
  });
});

/**
 * Sync leaderboard from blockchain (admin only)
 * POST /admin/sync-leaderboard
 */
router.post('/admin/sync-leaderboard', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await syncFromBlockchain();

    logAudit('admin_sync_leaderboard', {
      wallet: req.user.wallet.slice(0, 8) + '...',
    });

    res.json({
      success: true,
      message: 'Leaderboard synced from blockchain',
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'admin-sync') });
  }
});

// ============================================
// ADMIN - CACHE ROUTES
// ============================================

/**
 * Get cache statistics (admin only)
 * GET /admin/cache
 */
router.get('/admin/cache', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'cache-stats') });
  }
});

/**
 * Invalidate cache by tag (admin only)
 * POST /admin/cache/invalidate
 */
router.post('/admin/cache/invalidate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ error: 'Tag required' });
    }

    const count = await invalidateTag(tag);

    logAudit('cache_invalidated', {
      admin: req.user.wallet.slice(0, 8) + '...',
      tag,
      count,
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
 * GET /admin/queue
 */
router.get('/admin/queue', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'queue-stats') });
  }
});

/**
 * Get jobs by status (admin only)
 * GET /admin/queue/jobs
 */
router.get('/admin/queue/jobs', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const allJobs = getJobsByStatus(status, 100);
    const { items, pagination } = paginate(allJobs, req);

    res.json({ jobs: items, count: items.length, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'queue-jobs') });
  }
});

/**
 * Get specific job (admin only)
 * GET /admin/queue/jobs/:id
 */
router.get('/admin/queue/jobs/:id', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/analytics
 */
router.get('/admin/analytics', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const metrics = getAnalyticsMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'analytics') });
  }
});

/**
 * Get aggregated metrics (admin only)
 * GET /admin/analytics/metrics
 */
router.get('/admin/analytics/metrics', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const interval = req.query.interval || 'hour';
    const count = Math.max(1, Math.min(parseInt(req.query.count) || 24, 168));

    const metrics = getAggregatedMetrics(interval, count);
    res.json({ interval, metrics });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'analytics-metrics') });
  }
});

/**
 * Get funnel analysis (admin only)
 * GET /admin/analytics/funnel/:name
 */
router.get('/admin/analytics/funnel/:name', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/scheduler
 */
router.get('/admin/scheduler', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/scheduler/history
 */
router.get('/admin/scheduler/history', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const taskId = req.query.taskId || null;
    const allHistory = getTaskHistory(taskId, 100);
    const { items, pagination } = paginate(allHistory, req);

    res.json({ history: items, count: items.length, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'scheduler-history') });
  }
});

// ============================================
// ADMIN - RATE LIMITING ROUTES
// ============================================

/**
 * Get rate limit statistics (admin only)
 * GET /admin/ratelimit
 */
router.get('/admin/ratelimit', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = getRateLimitStats();
    const allBanned = getBannedList();
    const { items: banned, pagination } = paginate(allBanned, req);

    res.json({ stats, banned, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'ratelimit-stats') });
  }
});

/**
 * Remove ban (admin only)
 * POST /admin/ratelimit/unban
 */
router.post('/admin/ratelimit/unban', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier required' });
    }

    const success = removeBan(identifier);

    logAdminAction(
      AUDIT_EVENTS.USER_UNBANNED,
      {
        identifier,
        success,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

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
 * GET /admin/validator
 */
router.get('/admin/validator', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/flags
 */
router.get('/admin/flags', authMiddleware, requireAdmin, async (req, res) => {
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
 * POST /admin/flags
 */
router.post('/admin/flags', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { key, config } = req.body;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Flag key required' });
    }

    const result = createFlag(key, config || {});

    logAdminAction(
      AUDIT_EVENTS.FLAG_TOGGLED,
      {
        key,
        action: 'created',
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'create-flag') });
  }
});

/**
 * Toggle feature flag (admin only)
 * POST /admin/flags/:key/toggle
 */
router.post('/admin/flags/:key/toggle', authMiddleware, requireAdmin, async (req, res) => {
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

    logAdminAction(
      AUDIT_EVENTS.FLAG_TOGGLED,
      {
        key,
        enabled,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, key, enabled });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'toggle-flag') });
  }
});

/**
 * Update flag rollout percentage (admin only)
 * POST /admin/flags/:key/percentage
 */
router.post('/admin/flags/:key/percentage', authMiddleware, requireAdmin, async (req, res) => {
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

    logAdminAction(
      AUDIT_EVENTS.FLAG_TOGGLED,
      {
        key,
        percentage,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, key, percentage });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'flag-percentage') });
  }
});

/**
 * Get flag history (admin only)
 * GET /admin/flags/history
 */
router.get('/admin/flags/history', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const key = req.query.key || null;
    const allHistory = getFlagHistory(key, 100);
    const { items, pagination } = paginate(allHistory, req);

    res.json({ history: items, count: items.length, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'flag-history') });
  }
});

/**
 * Evaluate flag for context (public, for client-side feature checks)
 * POST /flags/evaluate
 */
router.post('/flags/evaluate', optionalAuthMiddleware, async (req, res) => {
  try {
    const { flags } = req.body;

    if (!Array.isArray(flags)) {
      return res.status(400).json({ error: 'flags array required' });
    }

    const context = {
      wallet: req.user?.wallet,
      tier: req.user?.tier,
      tierIndex: req.user?.tierIndex,
      environment: isProduction ? 'production' : 'development',
    };

    const results = {};
    for (const key of flags.slice(0, 50)) {
      // Limit to 50 flags per request
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
 * GET /admin/audit-trail
 *
 * Note: Mounted as /admin/audit-trail to avoid conflict with
 * GET /admin/audit (basic audit log from leaderboard service above).
 * The original /api/admin/audit route was duplicated in index.js;
 * this is the audit-service version.
 */
router.get('/admin/audit-trail', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/audit/search
 */
router.get('/admin/audit/search', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const query = {
      category: req.query.category || null,
      eventType: req.query.eventType || null,
      severity: req.query.severity || null,
      actor: req.query.actor || null,
      startTime: req.query.startTime ? parseInt(req.query.startTime) : null,
      endTime: req.query.endTime ? parseInt(req.query.endTime) : null,
      limit: Math.max(1, Math.min(parseInt(req.query.limit) || 50, 500)),
      offset: Math.max(0, parseInt(req.query.offset) || 0),
    };

    const results = searchAudit(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'audit-search') });
  }
});

/**
 * Export audit logs (admin only)
 * GET /admin/audit/export
 */
router.get('/admin/audit/export', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const options = {
      category: req.query.category || null,
      startTime: req.query.startTime ? parseInt(req.query.startTime) : null,
      endTime: req.query.endTime ? parseInt(req.query.endTime) : null,
      format: req.query.format || 'json',
    };

    const exported = exportAuditLogs(options);

    logAdminAction(
      AUDIT_EVENTS.DATA_EXPORTED,
      {
        type: 'audit_logs',
        format: options.format,
        eventCount: exported.totalEvents || 0,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

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
 * GET /admin/audit/alerts
 */
router.get('/admin/audit/alerts', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const allAlerts = getActiveAlerts();
    const { items, pagination } = paginate(allAlerts, req);

    res.json({ alerts: items, count: items.length, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'audit-alerts') });
  }
});

// ============================================
// ADMIN - CIRCUIT BREAKER ROUTES
// ============================================

/**
 * Get all circuit breakers (admin only)
 * GET /admin/circuits
 */
router.get('/admin/circuits', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/circuits/:name
 */
router.get('/admin/circuits/:name', authMiddleware, requireAdmin, async (req, res) => {
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
 * POST /admin/circuits/:name/state
 */
router.post('/admin/circuits/:name/state', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { state } = req.body;

    if (!['open', 'closed'].includes(state)) {
      return res.status(400).json({ error: 'State must be "open" or "closed"' });
    }

    const success = forceCircuitState(req.params.name, state);

    if (!success) {
      return res.status(404).json({ error: 'Circuit not found' });
    }

    logAdminAction(
      AUDIT_EVENTS.CONFIG_CHANGED,
      {
        circuit: req.params.name,
        newState: state,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, circuit: req.params.name, state });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'circuit-state') });
  }
});

/**
 * Reset circuit (admin only)
 * POST /admin/circuits/:name/reset
 */
router.post('/admin/circuits/:name/reset', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/tracing
 */
router.get('/admin/tracing', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = getTracingStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'tracing-stats') });
  }
});

/**
 * Get specific trace (admin only)
 * GET /admin/tracing/traces/:id
 */
router.get('/admin/tracing/traces/:id', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/tracing/search
 */
router.get('/admin/tracing/search', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const query = {
      operationName: req.query.operation || null,
      hasError:
        req.query.hasError === 'true' ? true : req.query.hasError === 'false' ? false : null,
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration) : null,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration) : null,
      limit: Math.min(parseInt(req.query.limit) || 50, 100),
      offset: parseInt(req.query.offset) || 0,
    };

    const traces = searchTraces(query);
    res.json({ traces, count: traces.length });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'search-traces') });
  }
});

/**
 * Get slow traces (admin only)
 * GET /admin/tracing/slow
 */
router.get('/admin/tracing/slow', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 1000;
    const allTraces = getSlowTraces(threshold, 100);
    const { items, pagination } = paginate(allTraces, req);

    res.json({ traces: items, count: items.length, threshold, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'slow-traces') });
  }
});

/**
 * Get error traces (admin only)
 * GET /admin/tracing/errors
 */
router.get('/admin/tracing/errors', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const allTraces = getErrorTraces(100);
    const { items, pagination } = paginate(allTraces, req);

    res.json({ traces: items, count: items.length, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'error-traces') });
  }
});

/**
 * Set sample rate (admin only)
 * POST /admin/tracing/sample-rate
 */
router.post('/admin/tracing/sample-rate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { rate } = req.body;

    if (typeof rate !== 'number' || rate < 0 || rate > 1) {
      return res.status(400).json({ error: 'Rate must be between 0 and 1' });
    }

    setSampleRate(rate);

    logAdminAction(
      AUDIT_EVENTS.CONFIG_CHANGED,
      {
        setting: 'tracing.sampleRate',
        value: rate,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, sampleRate: rate });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'set-sample-rate') });
  }
});

// ============================================
// ADMIN - HEALTH ROUTES
// ============================================

/**
 * Detailed health (admin only)
 * GET /admin/health
 */
router.get('/admin/health', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const health = await getDetailedHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'detailed-health') });
  }
});

/**
 * Health history (admin only)
 * GET /admin/health/history
 */
router.get('/admin/health/history', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const allHistory = getHealthHistory(100);
    const { items, pagination } = paginate(allHistory, req);
    const trend = getHealthTrend(60);

    res.json({ history: items, trend, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'health-history') });
  }
});

// ============================================
// ADMIN - CONFIGURATION ROUTES
// ============================================

/**
 * Get all configuration (admin only)
 * GET /admin/config
 */
router.get('/admin/config', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const includeSensitive = req.query.sensitive === 'true';
    const config = getAllConfig({
      includeSensitive,
      includeMetadata: true,
    });
    const stats = getConfigStats();

    res.json({ config, stats });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-config') });
  }
});

/**
 * Get specific configuration (admin only)
 * GET /admin/config/:key
 */
router.get('/admin/config/:key', authMiddleware, requireAdmin, async (req, res) => {
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
 * PUT /admin/config/:key
 */
router.put('/admin/config/:key', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value required' });
    }

    const result = setConfig(req.params.key, value, {
      updatedBy: req.user.wallet,
      source: 'admin',
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logAdminAction(
      AUDIT_EVENTS.CONFIG_CHANGED,
      {
        key: req.params.key,
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, key: req.params.key });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'set-config') });
  }
});

/**
 * Get configuration history (admin only)
 * GET /admin/config/history
 */
router.get('/admin/config/history', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const key = req.query.key || null;
    const allHistory = getConfigHistory(key, 100);
    const { items, pagination } = paginate(allHistory, req);

    res.json({ history: items, count: items.length, pagination });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'config-history') });
  }
});

// ============================================
// ADMIN - SHUTDOWN ROUTES
// ============================================

/**
 * Get shutdown status (admin only)
 * GET /admin/shutdown
 */
router.get('/admin/shutdown', authMiddleware, requireAdmin, async (req, res) => {
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
 * POST /admin/shutdown
 */
router.post('/admin/shutdown', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    logAdminAction(
      AUDIT_EVENTS.CONFIG_CHANGED,
      {
        action: 'shutdown_initiated',
        reason: reason || 'admin_request',
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({
      success: true,
      message: 'Graceful shutdown initiated',
      reason: reason || 'admin_request',
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
 * GET /admin/versioning
 */
router.get('/admin/versioning', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/batching
 */
router.get('/admin/batching', authMiddleware, requireAdmin, async (req, res) => {
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
 * GET /admin/compression
 */
router.get('/admin/compression', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = getCompressionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'compression-stats') });
  }
});

/**
 * Clear compression cache (admin only)
 * POST /admin/compression/clear-cache
 */
router.post('/admin/compression/clear-cache', authMiddleware, requireAdmin, async (req, res) => {
  try {
    clearCompressionCache();

    logAdminAction(
      AUDIT_EVENTS.CONFIG_CHANGED,
      {
        action: 'compression_cache_cleared',
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, message: 'Compression cache cleared' });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'clear-compression-cache') });
  }
});

// ============================================
// ADMIN - RPC FAILOVER ROUTES
// ============================================

/**
 * Get RPC endpoints status (admin only)
 * GET /admin/rpc
 */
router.get('/admin/rpc', authMiddleware, requireAdmin, async (req, res) => {
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
 * POST /admin/rpc/health-check
 */
router.post('/admin/rpc/health-check', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const results = await checkAllEndpointsHealth();
    res.json({ results: Object.fromEntries(results) });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'rpc-health-check') });
  }
});

// ============================================
// ADMIN - WEBSOCKET ROUTES
// ============================================

/**
 * Get WebSocket connection status (admin only)
 * GET /admin/websocket
 */
router.get('/admin/websocket', authMiddleware, requireAdmin, async (req, res) => {
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
 * POST /admin/websocket/reconnect
 */
router.post('/admin/websocket/reconnect', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await wsConnect();

    logAdminAction(
      AUDIT_EVENTS.CONFIG_CHANGED,
      {
        action: 'websocket_reconnect',
      },
      {
        actor: { id: req.user.wallet, type: 'admin' },
      }
    );

    res.json({ success: true, status: getWsStatus() });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'ws-reconnect') });
  }
});

// ============================================
// MONITORING ROUTES
// ============================================

/**
 * Get monitoring stats (admin only)
 * GET /admin/monitoring
 */
router.get('/admin/monitoring', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const monitoring = require('../services/monitoring');
    const stats = monitoring.getStats();
    const healthChecks = await monitoring.performHealthChecks();

    res.json({
      ...stats,
      health: healthChecks,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'monitoring') });
  }
});

/**
 * Get monitoring stats (public - limited info)
 * GET /status
 */
router.get('/status', async (req, res) => {
  try {
    const monitoring = require('../services/monitoring');
    const stats = monitoring.getStats();

    res.json({
      status: 'operational',
      uptime: stats.uptime.human,
      requests: {
        total: stats.requests.total,
        errorRate: stats.requests.errorRate,
      },
      performance: {
        avgLatency: stats.performance.avgLatency,
        p95: stats.performance.p95,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

module.exports = router;
