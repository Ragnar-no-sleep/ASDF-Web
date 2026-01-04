/**
 * ASDF API - Helius Metrics Service
 *
 * Prometheus-compatible metrics for Helius integration:
 * - RPC request latency histograms
 * - Rate limit tracking
 * - Error rates by method
 * - Circuit breaker states
 * - WebSocket connection stats
 *
 * @author Helius Engineering Standards
 * @version 1.0.0
 *
 * Security by Design:
 * - No sensitive data in metrics
 * - Memory-bounded storage
 * - Efficient aggregation
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================

const METRICS_CONFIG = {
    // Histogram buckets (in ms, Fibonacci-inspired)
    latencyBuckets: [5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597],

    // Aggregation
    windowMs: 60000,           // 1 minute window
    maxHistorySize: 3600,      // 1 hour at 1/second

    // Labels
    labelCardinality: 100      // Max unique label combinations
};

// ============================================
// STORAGE
// ============================================

// Counter metrics
const counters = {
    rpc_requests_total: new Map(),       // by method, status
    rpc_errors_total: new Map(),         // by method, error_type
    rate_limit_hits_total: 0,
    circuit_breaker_trips_total: 0,
    websocket_connections_total: 0,
    websocket_messages_total: new Map(), // by type
    cache_hits_total: 0,
    cache_misses_total: 0,
    batched_requests_total: 0,
    deduplicated_requests_total: 0
};

// Gauge metrics
const gauges = {
    rpc_pending_requests: 0,
    rate_limit_remaining: 100,
    circuit_breaker_state: new Map(),    // by circuit name
    websocket_active_connections: 0,
    websocket_active_subscriptions: 0,
    cache_size: 0,
    batch_queue_size: 0
};

// Histogram metrics
const histograms = {
    rpc_request_duration_ms: new Map(),  // by method
    websocket_message_latency_ms: [],
    batch_size: [],
    priority_fee_microlamports: []
};

// Summary data (for percentile calculation)
const summaries = {
    rpc_latency: [],
    fee_estimates: []
};

// Start time for uptime
const startTime = Date.now();

// ============================================
// COUNTER METHODS
// ============================================

/**
 * Increment a counter
 * @param {string} name - Metric name
 * @param {Object} labels - Label key-value pairs
 * @param {number} value - Increment value
 */
function incCounter(name, labels = {}, value = 1) {
    const counter = counters[name];
    if (counter === undefined) return;

    if (counter instanceof Map) {
        const key = labelKey(labels);
        const current = counter.get(key) || 0;
        counter.set(key, current + value);

        // Enforce cardinality limit
        if (counter.size > METRICS_CONFIG.labelCardinality) {
            const firstKey = counter.keys().next().value;
            counter.delete(firstKey);
        }
    } else {
        counters[name] += value;
    }
}

/**
 * Record RPC request
 * @param {string} method - RPC method
 * @param {string} status - success|error
 * @param {number} latencyMs - Request latency
 * @param {string} errorType - Error type if failed
 */
function recordRpcRequest(method, status, latencyMs, errorType = null) {
    // Increment request counter
    incCounter('rpc_requests_total', { method, status });

    // Record error if failed
    if (status === 'error' && errorType) {
        incCounter('rpc_errors_total', { method, error_type: errorType });
    }

    // Record latency histogram
    recordHistogram('rpc_request_duration_ms', latencyMs, { method });

    // Add to summary for percentiles
    addToSummary('rpc_latency', latencyMs);
}

/**
 * Record rate limit event
 * @param {boolean} limited - Whether request was rate limited
 * @param {number} remaining - Remaining quota
 */
function recordRateLimit(limited, remaining) {
    if (limited) {
        counters.rate_limit_hits_total++;
    }
    gauges.rate_limit_remaining = remaining;
}

/**
 * Record circuit breaker state
 * @param {string} circuit - Circuit name
 * @param {string} state - closed|open|half_open
 * @param {boolean} tripped - Whether circuit just tripped
 */
function recordCircuitBreaker(circuit, state, tripped = false) {
    const stateValue = state === 'open' ? 1 : (state === 'half_open' ? 0.5 : 0);
    gauges.circuit_breaker_state.set(circuit, stateValue);

    if (tripped) {
        counters.circuit_breaker_trips_total++;
    }
}

/**
 * Record WebSocket event
 * @param {string} event - connect|disconnect|message|subscribe|unsubscribe
 * @param {Object} data - Event data
 */
function recordWebSocket(event, data = {}) {
    switch (event) {
        case 'connect':
            counters.websocket_connections_total++;
            gauges.websocket_active_connections++;
            break;
        case 'disconnect':
            gauges.websocket_active_connections = Math.max(0, gauges.websocket_active_connections - 1);
            break;
        case 'message':
            incCounter('websocket_messages_total', { type: data.type || 'unknown' });
            if (data.latencyMs) {
                histograms.websocket_message_latency_ms.push({
                    value: data.latencyMs,
                    timestamp: Date.now()
                });
            }
            break;
        case 'subscribe':
            gauges.websocket_active_subscriptions++;
            break;
        case 'unsubscribe':
            gauges.websocket_active_subscriptions = Math.max(0, gauges.websocket_active_subscriptions - 1);
            break;
    }
}

/**
 * Record cache event
 * @param {boolean} hit - Whether cache hit
 * @param {number} size - Current cache size
 */
function recordCache(hit, size = null) {
    if (hit) {
        counters.cache_hits_total++;
    } else {
        counters.cache_misses_total++;
    }

    if (size !== null) {
        gauges.cache_size = size;
    }
}

/**
 * Record batch metrics
 * @param {number} batchSize - Size of batch
 * @param {number} deduplicated - Number deduplicated
 */
function recordBatch(batchSize, deduplicated = 0) {
    counters.batched_requests_total += batchSize;
    counters.deduplicated_requests_total += deduplicated;
    histograms.batch_size.push({
        value: batchSize,
        timestamp: Date.now()
    });
}

/**
 * Record priority fee
 * @param {number} feeInMicroLamports - Priority fee
 * @param {string} level - Priority level
 */
function recordPriorityFee(feeInMicroLamports, level = 'medium') {
    histograms.priority_fee_microlamports.push({
        value: feeInMicroLamports,
        level,
        timestamp: Date.now()
    });

    addToSummary('fee_estimates', feeInMicroLamports);
}

// ============================================
// GAUGE METHODS
// ============================================

/**
 * Set gauge value
 * @param {string} name - Metric name
 * @param {number} value - Gauge value
 * @param {Object} labels - Labels
 */
function setGauge(name, value, labels = {}) {
    const gauge = gauges[name];
    if (gauge === undefined) return;

    if (gauge instanceof Map) {
        gauge.set(labelKey(labels), value);
    } else {
        gauges[name] = value;
    }
}

/**
 * Update pending requests gauge
 * @param {number} count - Pending count
 */
function setPendingRequests(count) {
    gauges.rpc_pending_requests = count;
}

/**
 * Update batch queue size
 * @param {number} size - Queue size
 */
function setBatchQueueSize(size) {
    gauges.batch_queue_size = size;
}

// ============================================
// HISTOGRAM METHODS
// ============================================

/**
 * Record histogram value
 * @param {string} name - Metric name
 * @param {number} value - Value
 * @param {Object} labels - Labels
 */
function recordHistogram(name, value, labels = {}) {
    const histogram = histograms[name];
    if (!histogram) return;

    if (histogram instanceof Map) {
        const key = labelKey(labels);
        const buckets = histogram.get(key) || createBuckets();
        addToBuckets(buckets, value);
        histogram.set(key, buckets);

        // Enforce cardinality
        if (histogram.size > METRICS_CONFIG.labelCardinality) {
            const firstKey = histogram.keys().next().value;
            histogram.delete(firstKey);
        }
    } else {
        histogram.push({
            value,
            timestamp: Date.now()
        });

        // Enforce history size
        if (histogram.length > METRICS_CONFIG.maxHistorySize) {
            histogram.shift();
        }
    }
}

/**
 * Create histogram bucket structure
 * @returns {Object}
 */
function createBuckets() {
    const buckets = {};
    for (const bound of METRICS_CONFIG.latencyBuckets) {
        buckets[bound] = 0;
    }
    buckets['+Inf'] = 0;
    buckets._sum = 0;
    buckets._count = 0;
    return buckets;
}

/**
 * Add value to histogram buckets
 * @param {Object} buckets - Bucket structure
 * @param {number} value - Value to add
 */
function addToBuckets(buckets, value) {
    buckets._sum += value;
    buckets._count++;

    for (const bound of METRICS_CONFIG.latencyBuckets) {
        if (value <= bound) {
            buckets[bound]++;
        }
    }
    buckets['+Inf']++;
}

// ============================================
// SUMMARY METHODS
// ============================================

/**
 * Add value to summary
 * @param {string} name - Summary name
 * @param {number} value - Value
 */
function addToSummary(name, value) {
    const summary = summaries[name];
    if (!summary) return;

    summary.push({
        value,
        timestamp: Date.now()
    });

    // Keep only recent values
    if (summary.length > METRICS_CONFIG.maxHistorySize) {
        summary.shift();
    }
}

/**
 * Calculate percentiles from summary
 * @param {string} name - Summary name
 * @param {number[]} percentiles - Percentiles to calculate
 * @returns {Object}
 */
function calculatePercentiles(name, percentiles = [50, 90, 95, 99]) {
    const summary = summaries[name];
    if (!summary || summary.length === 0) {
        return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
    }

    const values = summary.map(s => s.value).sort((a, b) => a - b);
    const result = {};

    for (const p of percentiles) {
        const index = Math.ceil((p / 100) * values.length) - 1;
        result[p] = values[Math.max(0, index)];
    }

    return result;
}

// ============================================
// PROMETHEUS EXPORT
// ============================================

/**
 * Generate Prometheus-format metrics
 * @returns {string}
 */
function getPrometheusMetrics() {
    const lines = [];

    // Uptime
    lines.push('# HELP helius_uptime_seconds Service uptime in seconds');
    lines.push('# TYPE helius_uptime_seconds gauge');
    lines.push(`helius_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}`);

    // RPC Request counters
    lines.push('');
    lines.push('# HELP helius_rpc_requests_total Total RPC requests');
    lines.push('# TYPE helius_rpc_requests_total counter');
    for (const [labels, value] of counters.rpc_requests_total) {
        lines.push(`helius_rpc_requests_total{${labels}} ${value}`);
    }

    // RPC Errors
    lines.push('');
    lines.push('# HELP helius_rpc_errors_total Total RPC errors');
    lines.push('# TYPE helius_rpc_errors_total counter');
    for (const [labels, value] of counters.rpc_errors_total) {
        lines.push(`helius_rpc_errors_total{${labels}} ${value}`);
    }

    // Rate limiting
    lines.push('');
    lines.push('# HELP helius_rate_limit_hits_total Total rate limit hits');
    lines.push('# TYPE helius_rate_limit_hits_total counter');
    lines.push(`helius_rate_limit_hits_total ${counters.rate_limit_hits_total}`);

    lines.push('# HELP helius_rate_limit_remaining Remaining rate limit quota');
    lines.push('# TYPE helius_rate_limit_remaining gauge');
    lines.push(`helius_rate_limit_remaining ${gauges.rate_limit_remaining}`);

    // Circuit breaker
    lines.push('');
    lines.push('# HELP helius_circuit_breaker_trips_total Total circuit breaker trips');
    lines.push('# TYPE helius_circuit_breaker_trips_total counter');
    lines.push(`helius_circuit_breaker_trips_total ${counters.circuit_breaker_trips_total}`);

    lines.push('# HELP helius_circuit_breaker_state Circuit breaker state (0=closed, 0.5=half_open, 1=open)');
    lines.push('# TYPE helius_circuit_breaker_state gauge');
    for (const [circuit, state] of gauges.circuit_breaker_state) {
        lines.push(`helius_circuit_breaker_state{circuit="${circuit}"} ${state}`);
    }

    // WebSocket
    lines.push('');
    lines.push('# HELP helius_websocket_connections_total Total WebSocket connections');
    lines.push('# TYPE helius_websocket_connections_total counter');
    lines.push(`helius_websocket_connections_total ${counters.websocket_connections_total}`);

    lines.push('# HELP helius_websocket_active_connections Active WebSocket connections');
    lines.push('# TYPE helius_websocket_active_connections gauge');
    lines.push(`helius_websocket_active_connections ${gauges.websocket_active_connections}`);

    lines.push('# HELP helius_websocket_subscriptions Active subscriptions');
    lines.push('# TYPE helius_websocket_subscriptions gauge');
    lines.push(`helius_websocket_subscriptions ${gauges.websocket_active_subscriptions}`);

    lines.push('# HELP helius_websocket_messages_total Total WebSocket messages');
    lines.push('# TYPE helius_websocket_messages_total counter');
    for (const [labels, value] of counters.websocket_messages_total) {
        lines.push(`helius_websocket_messages_total{${labels}} ${value}`);
    }

    // Cache
    lines.push('');
    lines.push('# HELP helius_cache_hits_total Cache hits');
    lines.push('# TYPE helius_cache_hits_total counter');
    lines.push(`helius_cache_hits_total ${counters.cache_hits_total}`);

    lines.push('# HELP helius_cache_misses_total Cache misses');
    lines.push('# TYPE helius_cache_misses_total counter');
    lines.push(`helius_cache_misses_total ${counters.cache_misses_total}`);

    lines.push('# HELP helius_cache_size Current cache size');
    lines.push('# TYPE helius_cache_size gauge');
    lines.push(`helius_cache_size ${gauges.cache_size}`);

    // Batching
    lines.push('');
    lines.push('# HELP helius_batched_requests_total Total batched requests');
    lines.push('# TYPE helius_batched_requests_total counter');
    lines.push(`helius_batched_requests_total ${counters.batched_requests_total}`);

    lines.push('# HELP helius_deduplicated_requests_total Total deduplicated requests');
    lines.push('# TYPE helius_deduplicated_requests_total counter');
    lines.push(`helius_deduplicated_requests_total ${counters.deduplicated_requests_total}`);

    lines.push('# HELP helius_pending_requests Current pending RPC requests');
    lines.push('# TYPE helius_pending_requests gauge');
    lines.push(`helius_pending_requests ${gauges.rpc_pending_requests}`);

    lines.push('# HELP helius_batch_queue_size Current batch queue size');
    lines.push('# TYPE helius_batch_queue_size gauge');
    lines.push(`helius_batch_queue_size ${gauges.batch_queue_size}`);

    // RPC Latency histogram
    lines.push('');
    lines.push('# HELP helius_rpc_request_duration_ms RPC request duration in milliseconds');
    lines.push('# TYPE helius_rpc_request_duration_ms histogram');
    for (const [labels, buckets] of histograms.rpc_request_duration_ms) {
        const labelStr = labels ? `{${labels}}` : '';
        for (const bound of METRICS_CONFIG.latencyBuckets) {
            lines.push(`helius_rpc_request_duration_ms_bucket{le="${bound}"${labelStr ? ',' + labels : ''}} ${buckets[bound]}`);
        }
        lines.push(`helius_rpc_request_duration_ms_bucket{le="+Inf"${labelStr ? ',' + labels : ''}} ${buckets['+Inf']}`);
        lines.push(`helius_rpc_request_duration_ms_sum${labelStr} ${buckets._sum}`);
        lines.push(`helius_rpc_request_duration_ms_count${labelStr} ${buckets._count}`);
    }

    // RPC Latency summary
    const latencyPercentiles = calculatePercentiles('rpc_latency');
    lines.push('');
    lines.push('# HELP helius_rpc_latency_ms RPC request latency percentiles');
    lines.push('# TYPE helius_rpc_latency_ms summary');
    for (const [percentile, value] of Object.entries(latencyPercentiles)) {
        lines.push(`helius_rpc_latency_ms{quantile="${percentile / 100}"} ${value}`);
    }

    // Priority fee summary
    const feePercentiles = calculatePercentiles('fee_estimates');
    lines.push('');
    lines.push('# HELP helius_priority_fee_microlamports Priority fee estimates');
    lines.push('# TYPE helius_priority_fee_microlamports summary');
    for (const [percentile, value] of Object.entries(feePercentiles)) {
        lines.push(`helius_priority_fee_microlamports{quantile="${percentile / 100}"} ${value}`);
    }

    return lines.join('\n');
}

// ============================================
// JSON EXPORT
// ============================================

/**
 * Get metrics as JSON
 * @returns {Object}
 */
function getJsonMetrics() {
    const latencyPercentiles = calculatePercentiles('rpc_latency');
    const feePercentiles = calculatePercentiles('fee_estimates');

    // Calculate cache hit rate
    const cacheTotal = counters.cache_hits_total + counters.cache_misses_total;
    const cacheHitRate = cacheTotal > 0
        ? ((counters.cache_hits_total / cacheTotal) * 100).toFixed(2) + '%'
        : 'N/A';

    // Calculate RPC error rate
    let totalRequests = 0;
    let totalErrors = 0;
    for (const value of counters.rpc_requests_total.values()) {
        totalRequests += value;
    }
    for (const value of counters.rpc_errors_total.values()) {
        totalErrors += value;
    }
    const errorRate = totalRequests > 0
        ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%'
        : '0%';

    return {
        uptime: Math.floor((Date.now() - startTime) / 1000),
        rpc: {
            totalRequests,
            errorRate,
            pendingRequests: gauges.rpc_pending_requests,
            latencyPercentiles: {
                p50: `${latencyPercentiles[50]}ms`,
                p90: `${latencyPercentiles[90]}ms`,
                p95: `${latencyPercentiles[95]}ms`,
                p99: `${latencyPercentiles[99]}ms`
            }
        },
        rateLimit: {
            hits: counters.rate_limit_hits_total,
            remaining: gauges.rate_limit_remaining
        },
        circuitBreaker: {
            trips: counters.circuit_breaker_trips_total,
            states: Object.fromEntries(gauges.circuit_breaker_state)
        },
        websocket: {
            totalConnections: counters.websocket_connections_total,
            activeConnections: gauges.websocket_active_connections,
            activeSubscriptions: gauges.websocket_active_subscriptions
        },
        cache: {
            hits: counters.cache_hits_total,
            misses: counters.cache_misses_total,
            hitRate: cacheHitRate,
            size: gauges.cache_size
        },
        batching: {
            totalBatched: counters.batched_requests_total,
            totalDeduplicated: counters.deduplicated_requests_total,
            queueSize: gauges.batch_queue_size
        },
        priorityFee: {
            p50: `${feePercentiles[50]} microlamports`,
            p90: `${feePercentiles[90]} microlamports`,
            p99: `${feePercentiles[99]} microlamports`
        }
    };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate label key string
 * @param {Object} labels - Label key-value pairs
 * @returns {string}
 */
function labelKey(labels) {
    return Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .sort()
        .join(',');
}

/**
 * Reset all metrics
 */
function reset() {
    // Reset counters
    for (const key of Object.keys(counters)) {
        if (counters[key] instanceof Map) {
            counters[key].clear();
        } else {
            counters[key] = 0;
        }
    }

    // Reset gauges
    for (const key of Object.keys(gauges)) {
        if (gauges[key] instanceof Map) {
            gauges[key].clear();
        } else {
            gauges[key] = 0;
        }
    }

    // Reset histograms
    for (const key of Object.keys(histograms)) {
        if (histograms[key] instanceof Map) {
            histograms[key].clear();
        } else {
            histograms[key].length = 0;
        }
    }

    // Reset summaries
    for (const key of Object.keys(summaries)) {
        summaries[key].length = 0;
    }
}

// ============================================
// CLEANUP
// ============================================

// Clean old histogram/summary entries every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - METRICS_CONFIG.windowMs * 60; // Keep 1 hour

    for (const key of Object.keys(histograms)) {
        if (Array.isArray(histograms[key])) {
            histograms[key] = histograms[key].filter(h => h.timestamp > cutoff);
        }
    }

    for (const key of Object.keys(summaries)) {
        summaries[key] = summaries[key].filter(s => s.timestamp > cutoff);
    }
}, 5 * 60 * 1000);

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Recording
    recordRpcRequest,
    recordRateLimit,
    recordCircuitBreaker,
    recordWebSocket,
    recordCache,
    recordBatch,
    recordPriorityFee,

    // Gauges
    setGauge,
    setPendingRequests,
    setBatchQueueSize,

    // Generic
    incCounter,
    recordHistogram,

    // Export
    getPrometheusMetrics,
    getJsonMetrics,
    calculatePercentiles,

    // Management
    reset,

    // Config
    METRICS_CONFIG
};
