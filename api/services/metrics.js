/**
 * ASDF API - Metrics & Monitoring Service
 *
 * Production-grade metrics collection:
 * - Request latency tracking
 * - Error rate monitoring
 * - Endpoint usage statistics
 * - Resource utilization
 *
 * Security by Design:
 * - No sensitive data in metrics
 * - Rate-limited metrics endpoint
 * - Admin-only detailed metrics
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================

const METRICS_CONFIG = {
    historySize: 1000,         // Keep last 1000 requests
    aggregationWindow: 60000,  // 1 minute aggregation
    percentiles: [50, 90, 95, 99]
};

// ============================================
// METRICS STORAGE
// ============================================

// Request metrics
const requestMetrics = {
    total: 0,
    success: 0,
    errors: 0,
    byEndpoint: new Map(),
    byStatusCode: new Map(),
    latencyHistory: [],
    startTime: Date.now()
};

// Real-time counters (reset every minute)
let currentMinute = {
    requests: 0,
    errors: 0,
    startTime: Date.now()
};

// ============================================
// METRICS COLLECTION
// ============================================

/**
 * Record a request metric
 * @param {Object} data - Request data
 */
function recordRequest(data) {
    const {
        method,
        path,
        statusCode,
        latencyMs,
        wallet = null,
        error = null
    } = data;

    requestMetrics.total++;

    if (statusCode >= 200 && statusCode < 400) {
        requestMetrics.success++;
    } else {
        requestMetrics.errors++;
    }

    // Endpoint stats
    const endpointKey = `${method} ${path}`;
    const endpointStats = requestMetrics.byEndpoint.get(endpointKey) || {
        count: 0,
        errors: 0,
        totalLatency: 0,
        maxLatency: 0
    };

    endpointStats.count++;
    if (statusCode >= 400) endpointStats.errors++;
    endpointStats.totalLatency += latencyMs;
    endpointStats.maxLatency = Math.max(endpointStats.maxLatency, latencyMs);

    requestMetrics.byEndpoint.set(endpointKey, endpointStats);

    // Status code stats
    const codeCount = requestMetrics.byStatusCode.get(statusCode) || 0;
    requestMetrics.byStatusCode.set(statusCode, codeCount + 1);

    // Latency history (for percentiles)
    requestMetrics.latencyHistory.push({
        latency: latencyMs,
        timestamp: Date.now()
    });

    // Keep history bounded
    if (requestMetrics.latencyHistory.length > METRICS_CONFIG.historySize) {
        requestMetrics.latencyHistory.shift();
    }

    // Current minute counters
    currentMinute.requests++;
    if (statusCode >= 400) currentMinute.errors++;
}

/**
 * Middleware to track request metrics
 */
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();

    // Capture original end
    const originalEnd = res.end;

    res.end = function(...args) {
        const latencyMs = Date.now() - startTime;

        // Record metric
        recordRequest({
            method: req.method,
            path: req.route?.path || req.path,
            statusCode: res.statusCode,
            latencyMs,
            wallet: req.user?.wallet
        });

        // Call original
        return originalEnd.apply(this, args);
    };

    next();
}

// ============================================
// METRICS AGGREGATION
// ============================================

/**
 * Calculate latency percentiles
 * @param {number[]} percentiles - Percentiles to calculate
 * @returns {Object}
 */
function calculatePercentiles(percentiles = METRICS_CONFIG.percentiles) {
    const now = Date.now();
    const windowStart = now - METRICS_CONFIG.aggregationWindow;

    // Get recent latencies
    const recentLatencies = requestMetrics.latencyHistory
        .filter(r => r.timestamp >= windowStart)
        .map(r => r.latency)
        .sort((a, b) => a - b);

    if (recentLatencies.length === 0) {
        return percentiles.reduce((acc, p) => ({ ...acc, [`p${p}`]: 0 }), {});
    }

    const result = {};
    for (const p of percentiles) {
        const index = Math.ceil((p / 100) * recentLatencies.length) - 1;
        result[`p${p}`] = recentLatencies[Math.max(0, index)];
    }

    return result;
}

/**
 * Get current request rate (requests per second)
 * @returns {number}
 */
function getRequestRate() {
    const elapsed = (Date.now() - currentMinute.startTime) / 1000;
    return elapsed > 0 ? currentMinute.requests / elapsed : 0;
}

/**
 * Get error rate (errors per second)
 * @returns {number}
 */
function getErrorRate() {
    const elapsed = (Date.now() - currentMinute.startTime) / 1000;
    return elapsed > 0 ? currentMinute.errors / elapsed : 0;
}

// ============================================
// METRICS OUTPUT
// ============================================

/**
 * Get summary metrics (public)
 * @returns {Object}
 */
function getSummaryMetrics() {
    const uptime = Date.now() - requestMetrics.startTime;
    const percentiles = calculatePercentiles();

    return {
        uptime: Math.floor(uptime / 1000),
        uptimeHuman: formatUptime(uptime),
        requests: {
            total: requestMetrics.total,
            success: requestMetrics.success,
            errors: requestMetrics.errors,
            successRate: requestMetrics.total > 0
                ? ((requestMetrics.success / requestMetrics.total) * 100).toFixed(2) + '%'
                : '100%'
        },
        latency: {
            ...percentiles,
            unit: 'ms'
        },
        currentRate: {
            requestsPerSecond: getRequestRate().toFixed(2),
            errorsPerSecond: getErrorRate().toFixed(2)
        }
    };
}

/**
 * Get detailed metrics (admin only)
 * @returns {Object}
 */
function getDetailedMetrics() {
    const summary = getSummaryMetrics();

    // Convert maps to objects
    const byEndpoint = {};
    for (const [key, stats] of requestMetrics.byEndpoint) {
        byEndpoint[key] = {
            ...stats,
            avgLatency: stats.count > 0 ? Math.round(stats.totalLatency / stats.count) : 0,
            errorRate: stats.count > 0
                ? ((stats.errors / stats.count) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    const byStatusCode = {};
    for (const [code, count] of requestMetrics.byStatusCode) {
        byStatusCode[code] = count;
    }

    return {
        ...summary,
        endpoints: byEndpoint,
        statusCodes: byStatusCode,
        memory: getMemoryMetrics(),
        config: METRICS_CONFIG
    };
}

/**
 * Get memory metrics
 * @returns {Object}
 */
function getMemoryMetrics() {
    const usage = process.memoryUsage();
    return {
        heapUsed: formatBytes(usage.heapUsed),
        heapTotal: formatBytes(usage.heapTotal),
        rss: formatBytes(usage.rss),
        external: formatBytes(usage.external)
    };
}

/**
 * Get Prometheus-format metrics
 * @returns {string}
 */
function getPrometheusMetrics() {
    const lines = [];

    // Request counters
    lines.push('# HELP asdf_requests_total Total number of requests');
    lines.push('# TYPE asdf_requests_total counter');
    lines.push(`asdf_requests_total ${requestMetrics.total}`);

    lines.push('# HELP asdf_requests_success_total Successful requests');
    lines.push('# TYPE asdf_requests_success_total counter');
    lines.push(`asdf_requests_success_total ${requestMetrics.success}`);

    lines.push('# HELP asdf_requests_errors_total Error requests');
    lines.push('# TYPE asdf_requests_errors_total counter');
    lines.push(`asdf_requests_errors_total ${requestMetrics.errors}`);

    // Latency percentiles
    const percentiles = calculatePercentiles();
    lines.push('# HELP asdf_request_latency_ms Request latency in milliseconds');
    lines.push('# TYPE asdf_request_latency_ms gauge');
    for (const [key, value] of Object.entries(percentiles)) {
        lines.push(`asdf_request_latency_ms{quantile="${key.replace('p', '0.')}"} ${value}`);
    }

    // Memory
    const mem = process.memoryUsage();
    lines.push('# HELP asdf_memory_bytes Memory usage in bytes');
    lines.push('# TYPE asdf_memory_bytes gauge');
    lines.push(`asdf_memory_bytes{type="heap_used"} ${mem.heapUsed}`);
    lines.push(`asdf_memory_bytes{type="heap_total"} ${mem.heapTotal}`);
    lines.push(`asdf_memory_bytes{type="rss"} ${mem.rss}`);

    // Uptime
    lines.push('# HELP asdf_uptime_seconds Server uptime in seconds');
    lines.push('# TYPE asdf_uptime_seconds counter');
    lines.push(`asdf_uptime_seconds ${Math.floor((Date.now() - requestMetrics.startTime) / 1000)}`);

    return lines.join('\n');
}

// ============================================
// UTILITIES
// ============================================

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

/**
 * Format uptime to human readable
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
 * Reset current minute counters
 * Called every minute
 */
function resetMinuteCounters() {
    currentMinute = {
        requests: 0,
        errors: 0,
        startTime: Date.now()
    };
}

// Reset counters every minute
setInterval(resetMinuteCounters, 60000);

module.exports = {
    // Middleware
    metricsMiddleware,

    // Recording
    recordRequest,

    // Output
    getSummaryMetrics,
    getDetailedMetrics,
    getPrometheusMetrics,

    // Config
    METRICS_CONFIG
};
