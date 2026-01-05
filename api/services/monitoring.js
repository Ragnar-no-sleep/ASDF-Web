/**
 * ASDF API - Monitoring Service
 *
 * Tracks errors, performance, and system health
 * - Error aggregation
 * - Performance metrics
 * - Alerting (webhook-based)
 *
 * @version 1.0.0
 */

'use strict';

const { getStorage } = require('./storage');

// ============================================
// CONFIGURATION
// ============================================

const MONITORING_CONFIG = {
    // Error tracking
    maxErrorsStored: 100,
    errorTTL: 24 * 60 * 60, // 24 hours

    // Performance
    slowRequestThreshold: 1000, // 1 second
    sampleRate: 0.1, // 10% of requests

    // Alerting
    alertCooldown: 5 * 60 * 1000, // 5 minutes between same alerts
    criticalErrorThreshold: 10, // Alert after 10 errors in window
    errorWindowMs: 60 * 1000, // 1 minute window

    // Webhook (optional)
    webhookUrl: process.env.MONITORING_WEBHOOK_URL || null
};

// ============================================
// IN-MEMORY METRICS
// ============================================

const metrics = {
    requests: {
        total: 0,
        success: 0,
        errors: 0,
        byStatus: {},
        byEndpoint: {}
    },
    performance: {
        totalLatency: 0,
        count: 0,
        slowRequests: 0,
        p95: []
    },
    errors: [],
    lastAlert: {},
    startedAt: Date.now()
};

// ============================================
// REQUEST TRACKING
// ============================================

/**
 * Track a request
 */
function trackRequest(req, res, duration) {
    metrics.requests.total++;

    const status = res.statusCode;
    metrics.requests.byStatus[status] = (metrics.requests.byStatus[status] || 0) + 1;

    if (status >= 400) {
        metrics.requests.errors++;
    } else {
        metrics.requests.success++;
    }

    // Track by endpoint (sample to avoid memory bloat)
    if (Math.random() < MONITORING_CONFIG.sampleRate) {
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        if (!metrics.requests.byEndpoint[endpoint]) {
            metrics.requests.byEndpoint[endpoint] = { count: 0, totalLatency: 0 };
        }
        metrics.requests.byEndpoint[endpoint].count++;
        metrics.requests.byEndpoint[endpoint].totalLatency += duration;
    }

    // Performance tracking
    metrics.performance.totalLatency += duration;
    metrics.performance.count++;

    if (duration > MONITORING_CONFIG.slowRequestThreshold) {
        metrics.performance.slowRequests++;
    }

    // P95 tracking (keep last 100 for calculation)
    metrics.performance.p95.push(duration);
    if (metrics.performance.p95.length > 100) {
        metrics.performance.p95.shift();
    }
}

/**
 * Express middleware for request tracking
 */
function requestTrackingMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        trackRequest(req, res, duration);
    });

    next();
}

// ============================================
// ERROR TRACKING
// ============================================

/**
 * Track an error
 */
async function trackError(error, context = {}) {
    const errorEntry = {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        code: error.code,
        context,
        timestamp: Date.now()
    };

    // Add to in-memory list
    metrics.errors.unshift(errorEntry);
    if (metrics.errors.length > MONITORING_CONFIG.maxErrorsStored) {
        metrics.errors.pop();
    }

    // Store in Redis for persistence
    try {
        const cache = getStorage();
        await cache.lpush('monitoring:errors', errorEntry);
        await cache.ltrim('monitoring:errors', 0, MONITORING_CONFIG.maxErrorsStored - 1);
    } catch (e) {
        // Ignore storage errors
    }

    // Check for alert threshold
    const recentErrors = metrics.errors.filter(
        e => e.timestamp > Date.now() - MONITORING_CONFIG.errorWindowMs
    );

    if (recentErrors.length >= MONITORING_CONFIG.criticalErrorThreshold) {
        await sendAlert('critical_errors', {
            count: recentErrors.length,
            window: '1 minute',
            lastError: error.message
        });
    }

    console.error(`[Monitor] Error tracked: ${error.message}`);
}

/**
 * Express error tracking middleware
 */
function errorTrackingMiddleware(err, req, res, next) {
    trackError(err, {
        method: req.method,
        path: req.path,
        wallet: req.wallet,
        ip: req.ip
    });

    next(err);
}

// ============================================
// ALERTING
// ============================================

/**
 * Send an alert (with cooldown)
 */
async function sendAlert(type, data) {
    const now = Date.now();
    const lastSent = metrics.lastAlert[type] || 0;

    if (now - lastSent < MONITORING_CONFIG.alertCooldown) {
        return; // Cooldown active
    }

    metrics.lastAlert[type] = now;

    const alert = {
        type,
        data,
        timestamp: new Date().toISOString(),
        service: 'asdf-api'
    };

    console.warn(`[Monitor] ALERT: ${type}`, JSON.stringify(data));

    // Send to webhook if configured
    if (MONITORING_CONFIG.webhookUrl) {
        try {
            await fetch(MONITORING_CONFIG.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alert)
            });
        } catch (e) {
            console.error('[Monitor] Failed to send webhook alert:', e.message);
        }
    }
}

// ============================================
// METRICS & STATS
// ============================================

/**
 * Get monitoring statistics
 */
function getStats() {
    const uptime = Date.now() - metrics.startedAt;
    const avgLatency = metrics.performance.count > 0
        ? Math.round(metrics.performance.totalLatency / metrics.performance.count)
        : 0;

    // Calculate P95
    let p95 = 0;
    if (metrics.performance.p95.length > 0) {
        const sorted = [...metrics.performance.p95].sort((a, b) => a - b);
        const idx = Math.floor(sorted.length * 0.95);
        p95 = sorted[idx] || sorted[sorted.length - 1];
    }

    const errorRate = metrics.requests.total > 0
        ? ((metrics.requests.errors / metrics.requests.total) * 100).toFixed(2)
        : '0.00';

    return {
        uptime: {
            ms: uptime,
            human: formatUptime(uptime)
        },
        requests: {
            total: metrics.requests.total,
            success: metrics.requests.success,
            errors: metrics.requests.errors,
            errorRate: `${errorRate}%`,
            byStatus: metrics.requests.byStatus
        },
        performance: {
            avgLatency: `${avgLatency}ms`,
            p95: `${p95}ms`,
            slowRequests: metrics.performance.slowRequests
        },
        recentErrors: metrics.errors.slice(0, 10).map(e => ({
            message: e.message,
            context: e.context,
            ago: formatTimeAgo(e.timestamp)
        })),
        topEndpoints: getTopEndpoints(5)
    };
}

/**
 * Get top endpoints by request count
 */
function getTopEndpoints(limit = 5) {
    return Object.entries(metrics.requests.byEndpoint)
        .map(([endpoint, data]) => ({
            endpoint,
            count: data.count,
            avgLatency: Math.round(data.totalLatency / data.count)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

/**
 * Format uptime
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================
// HEALTH MONITORING
// ============================================

/**
 * Perform health checks
 */
async function performHealthChecks() {
    const checks = {
        api: true,
        storage: false,
        database: false
    };

    // Check Redis
    try {
        const cache = getStorage();
        await cache.set('health:ping', Date.now(), { ex: 60 });
        checks.storage = true;
    } catch (e) {
        checks.storage = false;
    }

    // Check PostgreSQL
    try {
        const postgres = require('./postgres');
        if (postgres.isAvailable()) {
            const health = await postgres.healthCheck();
            checks.database = health.healthy;
        }
    } catch (e) {
        checks.database = false;
    }

    return checks;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Middleware
    requestTrackingMiddleware,
    errorTrackingMiddleware,

    // Tracking
    trackRequest,
    trackError,

    // Alerting
    sendAlert,

    // Stats
    getStats,
    performHealthChecks,

    // Config
    MONITORING_CONFIG
};
