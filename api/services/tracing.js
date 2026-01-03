/**
 * ASDF API - Request Tracing Service
 *
 * Distributed tracing for debugging:
 * - Trace ID propagation
 * - Span creation and nesting
 * - Context management
 * - Performance profiling
 *
 * Security by Design:
 * - PII redaction in traces
 * - Sensitive header filtering
 * - Configurable sampling
 */

'use strict';

const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

// ============================================
// CONFIGURATION
// ============================================

const TRACING_CONFIG = {
    // Sampling
    sampleRate: 1.0,  // 100% in dev, reduce in production
    alwaysSampleErrors: true,

    // Retention
    maxTraces: 10000,
    traceRetention: 60 * 60 * 1000,  // 1 hour

    // Performance
    maxSpansPerTrace: 100,
    maxSpanTags: 50,

    // Headers
    traceIdHeader: 'x-trace-id',
    spanIdHeader: 'x-span-id',
    parentSpanHeader: 'x-parent-span-id',
    sampledHeader: 'x-trace-sampled',

    // Sensitive headers to redact
    sensitiveHeaders: [
        'authorization',
        'cookie',
        'x-api-key',
        'x-auth-token'
    ],

    // Sensitive fields to redact in tags
    sensitiveFields: [
        'password',
        'secret',
        'token',
        'privateKey',
        'apiKey',
        'signature'
    ]
};

// ============================================
// STORAGE
// ============================================

// Async local storage for trace context
const asyncLocalStorage = new AsyncLocalStorage();

// Active traces
const traces = new Map();

// Completed traces (for querying)
const completedTraces = [];

// Stats
const tracingStats = {
    tracesCreated: 0,
    spansCreated: 0,
    tracesSampled: 0,
    tracesDropped: 0
};

// ============================================
// TRACE CLASS
// ============================================

class Trace {
    /**
     * Create a new trace
     * @param {string} traceId - Trace ID
     * @param {Object} options - Trace options
     */
    constructor(traceId, options = {}) {
        this.id = traceId;
        this.sampled = options.sampled ?? shouldSample();
        this.startTime = Date.now();
        this.endTime = null;
        this.rootSpan = null;
        this.spans = new Map();
        this.tags = {};
        this.logs = [];
        this.error = null;

        // Metadata
        this.serviceName = options.serviceName || 'asdf-api';
        this.operationName = options.operationName || 'request';

        tracingStats.tracesCreated++;
        if (this.sampled) {
            tracingStats.tracesSampled++;
        }
    }

    /**
     * Add a tag to the trace
     * @param {string} key - Tag key
     * @param {any} value - Tag value
     * @returns {Trace}
     */
    setTag(key, value) {
        if (Object.keys(this.tags).length < TRACING_CONFIG.maxSpanTags) {
            this.tags[key] = redactSensitive(key, value);
        }
        return this;
    }

    /**
     * Add multiple tags
     * @param {Object} tags - Tags to add
     * @returns {Trace}
     */
    setTags(tags) {
        for (const [key, value] of Object.entries(tags)) {
            this.setTag(key, value);
        }
        return this;
    }

    /**
     * Add a log entry
     * @param {Object} log - Log entry
     * @returns {Trace}
     */
    log(log) {
        this.logs.push({
            timestamp: Date.now(),
            ...log
        });
        return this;
    }

    /**
     * Mark trace as errored
     * @param {Error} error - Error that occurred
     * @returns {Trace}
     */
    setError(error) {
        this.error = {
            message: error.message,
            stack: error.stack,
            name: error.name
        };
        return this;
    }

    /**
     * End the trace
     */
    finish() {
        this.endTime = Date.now();

        // Store if sampled
        if (this.sampled || (TRACING_CONFIG.alwaysSampleErrors && this.error)) {
            storeCompletedTrace(this);
        }

        // Remove from active traces
        traces.delete(this.id);
    }

    /**
     * Get trace duration
     * @returns {number}
     */
    getDuration() {
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    /**
     * Export trace for storage/transmission
     * @returns {Object}
     */
    toJSON() {
        return {
            traceId: this.id,
            serviceName: this.serviceName,
            operationName: this.operationName,
            sampled: this.sampled,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.getDuration(),
            tags: this.tags,
            logs: this.logs,
            error: this.error,
            spans: Array.from(this.spans.values()).map(s => s.toJSON())
        };
    }
}

// ============================================
// SPAN CLASS
// ============================================

class Span {
    /**
     * Create a new span
     * @param {Trace} trace - Parent trace
     * @param {string} operationName - Span operation name
     * @param {Object} options - Span options
     */
    constructor(trace, operationName, options = {}) {
        this.id = generateSpanId();
        this.traceId = trace.id;
        this.trace = trace;
        this.operationName = operationName;
        this.parentSpanId = options.parentSpanId || null;
        this.startTime = Date.now();
        this.endTime = null;
        this.tags = {};
        this.logs = [];
        this.error = null;
        this.children = [];

        // Register with trace
        if (trace.spans.size < TRACING_CONFIG.maxSpansPerTrace) {
            trace.spans.set(this.id, this);
        }

        // Set as root if first span
        if (!trace.rootSpan) {
            trace.rootSpan = this;
        }

        tracingStats.spansCreated++;
    }

    /**
     * Add a tag to the span
     * @param {string} key - Tag key
     * @param {any} value - Tag value
     * @returns {Span}
     */
    setTag(key, value) {
        if (Object.keys(this.tags).length < TRACING_CONFIG.maxSpanTags) {
            this.tags[key] = redactSensitive(key, value);
        }
        return this;
    }

    /**
     * Add multiple tags
     * @param {Object} tags - Tags to add
     * @returns {Span}
     */
    setTags(tags) {
        for (const [key, value] of Object.entries(tags)) {
            this.setTag(key, value);
        }
        return this;
    }

    /**
     * Add a log entry
     * @param {Object} log - Log entry
     * @returns {Span}
     */
    log(log) {
        this.logs.push({
            timestamp: Date.now(),
            ...log
        });
        return this;
    }

    /**
     * Mark span as errored
     * @param {Error} error - Error that occurred
     * @returns {Span}
     */
    setError(error) {
        this.error = {
            message: error.message,
            name: error.name
        };
        this.setTag('error', true);
        return this;
    }

    /**
     * Create a child span
     * @param {string} operationName - Child operation name
     * @returns {Span}
     */
    createChild(operationName) {
        const child = new Span(this.trace, operationName, {
            parentSpanId: this.id
        });
        this.children.push(child.id);
        return child;
    }

    /**
     * End the span
     */
    finish() {
        this.endTime = Date.now();
    }

    /**
     * Get span duration
     * @returns {number}
     */
    getDuration() {
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    /**
     * Export span for storage/transmission
     * @returns {Object}
     */
    toJSON() {
        return {
            spanId: this.id,
            traceId: this.traceId,
            operationName: this.operationName,
            parentSpanId: this.parentSpanId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.getDuration(),
            tags: this.tags,
            logs: this.logs,
            error: this.error,
            childrenCount: this.children.length
        };
    }
}

// ============================================
// CONTEXT MANAGEMENT
// ============================================

/**
 * Get current trace context
 * @returns {Object|null}
 */
function getContext() {
    return asyncLocalStorage.getStore() || null;
}

/**
 * Run function with trace context
 * @param {Object} context - Trace context
 * @param {Function} fn - Function to run
 * @returns {any}
 */
function runWithContext(context, fn) {
    return asyncLocalStorage.run(context, fn);
}

/**
 * Get current trace
 * @returns {Trace|null}
 */
function getCurrentTrace() {
    const context = getContext();
    return context?.trace || null;
}

/**
 * Get current span
 * @returns {Span|null}
 */
function getCurrentSpan() {
    const context = getContext();
    return context?.span || null;
}

// ============================================
// TRACE OPERATIONS
// ============================================

/**
 * Start a new trace
 * @param {string} operationName - Root operation name
 * @param {Object} options - Trace options
 * @returns {Object} Trace context
 */
function startTrace(operationName, options = {}) {
    const traceId = options.traceId || generateTraceId();

    const trace = new Trace(traceId, {
        operationName,
        sampled: options.sampled,
        ...options
    });

    traces.set(traceId, trace);

    // Create root span
    const rootSpan = new Span(trace, operationName);

    return {
        trace,
        span: rootSpan,
        traceId,
        spanId: rootSpan.id
    };
}

/**
 * Start a new span in current trace
 * @param {string} operationName - Span operation name
 * @returns {Span|null}
 */
function startSpan(operationName) {
    const context = getContext();
    if (!context?.trace) {
        return null;
    }

    const parentSpan = context.span;
    const span = parentSpan
        ? parentSpan.createChild(operationName)
        : new Span(context.trace, operationName);

    return span;
}

/**
 * End current span
 * @param {Span} span - Span to end
 */
function endSpan(span) {
    if (span) {
        span.finish();
    }
}

/**
 * End trace and clean up
 * @param {Trace} trace - Trace to end
 */
function endTrace(trace) {
    if (trace) {
        // End any unfinished spans
        for (const span of trace.spans.values()) {
            if (!span.endTime) {
                span.finish();
            }
        }
        trace.finish();
    }
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Create tracing middleware
 * @param {Object} options - Middleware options
 * @returns {Function}
 */
function createMiddleware(options = {}) {
    const {
        serviceName = 'asdf-api',
        skip = () => false,
        tagRequest = true,
        tagResponse = true
    } = options;

    return (req, res, next) => {
        // Skip if configured
        if (skip(req)) {
            return next();
        }

        // Extract or generate trace ID
        const traceId = req.headers[TRACING_CONFIG.traceIdHeader] || generateTraceId();
        const parentSpanId = req.headers[TRACING_CONFIG.parentSpanHeader] || null;
        const sampled = req.headers[TRACING_CONFIG.sampledHeader] !== '0';

        // Start trace
        const context = startTrace(`${req.method} ${req.path}`, {
            traceId,
            sampled,
            serviceName
        });

        const { trace, span } = context;

        // Set request ID on response
        res.setHeader(TRACING_CONFIG.traceIdHeader, traceId);
        res.setHeader(TRACING_CONFIG.spanIdHeader, span.id);

        // Add request info to span
        if (tagRequest) {
            span.setTags({
                'http.method': req.method,
                'http.url': req.path,
                'http.host': req.hostname,
                'http.user_agent': req.get('user-agent'),
                'request.ip': req.ip
            });

            // Add safe query params
            if (Object.keys(req.query).length > 0) {
                span.setTag('http.query', sanitizeQueryParams(req.query));
            }
        }

        // Run with context
        runWithContext(context, () => {
            // Capture response
            const originalEnd = res.end;
            res.end = function (chunk, encoding) {
                // Tag response
                if (tagResponse) {
                    span.setTags({
                        'http.status_code': res.statusCode,
                        'http.response_size': res.get('content-length') || 0
                    });

                    if (res.statusCode >= 400) {
                        span.setTag('error', true);
                    }
                }

                // End trace
                endSpan(span);
                endTrace(trace);

                return originalEnd.call(this, chunk, encoding);
            };

            next();
        });
    };
}

// ============================================
// QUERYING
// ============================================

/**
 * Get trace by ID
 * @param {string} traceId - Trace ID
 * @returns {Object|null}
 */
function getTrace(traceId) {
    // Check active traces
    const active = traces.get(traceId);
    if (active) {
        return active.toJSON();
    }

    // Check completed traces
    const completed = completedTraces.find(t => t.traceId === traceId);
    return completed || null;
}

/**
 * Search traces
 * @param {Object} query - Search query
 * @returns {Object[]}
 */
function searchTraces(query = {}) {
    const {
        operationName = null,
        hasError = null,
        minDuration = null,
        maxDuration = null,
        tags = {},
        limit = 50,
        offset = 0
    } = query;

    let results = [...completedTraces];

    // Apply filters
    if (operationName) {
        results = results.filter(t => t.operationName.includes(operationName));
    }

    if (hasError !== null) {
        results = results.filter(t => hasError ? t.error !== null : t.error === null);
    }

    if (minDuration !== null) {
        results = results.filter(t => t.duration >= minDuration);
    }

    if (maxDuration !== null) {
        results = results.filter(t => t.duration <= maxDuration);
    }

    // Filter by tags
    for (const [key, value] of Object.entries(tags)) {
        results = results.filter(t => t.tags[key] === value);
    }

    // Sort by start time (most recent first)
    results.sort((a, b) => b.startTime - a.startTime);

    // Apply pagination
    return results.slice(offset, offset + limit);
}

/**
 * Get slow traces
 * @param {number} threshold - Duration threshold in ms
 * @param {number} limit - Max traces
 * @returns {Object[]}
 */
function getSlowTraces(threshold = 1000, limit = 20) {
    return searchTraces({
        minDuration: threshold,
        limit
    });
}

/**
 * Get error traces
 * @param {number} limit - Max traces
 * @returns {Object[]}
 */
function getErrorTraces(limit = 20) {
    return searchTraces({
        hasError: true,
        limit
    });
}

/**
 * Get recent traces
 * @param {number} limit - Max traces
 * @returns {Object[]}
 */
function getRecentTraces(limit = 50) {
    return completedTraces.slice(-limit).reverse();
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate trace ID
 * @returns {string}
 */
function generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate span ID
 * @returns {string}
 */
function generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
}

/**
 * Should this request be sampled
 * @returns {boolean}
 */
function shouldSample() {
    return Math.random() < TRACING_CONFIG.sampleRate;
}

/**
 * Redact sensitive values
 * @param {string} key - Field key
 * @param {any} value - Field value
 * @returns {any}
 */
function redactSensitive(key, value) {
    const lowerKey = key.toLowerCase();

    // Check if key is sensitive
    if (TRACING_CONFIG.sensitiveFields.some(f => lowerKey.includes(f.toLowerCase()))) {
        return '[REDACTED]';
    }

    // Redact string values that look like tokens
    if (typeof value === 'string' && value.length > 40) {
        return value.slice(0, 8) + '...[TRUNCATED]';
    }

    return value;
}

/**
 * Sanitize query parameters
 * @param {Object} query - Query params
 * @returns {Object}
 */
function sanitizeQueryParams(query) {
    const sanitized = {};
    for (const [key, value] of Object.entries(query)) {
        sanitized[key] = redactSensitive(key, value);
    }
    return sanitized;
}

/**
 * Store completed trace
 * @param {Trace} trace - Trace to store
 */
function storeCompletedTrace(trace) {
    const traceData = trace.toJSON();
    completedTraces.push(traceData);

    // Enforce max traces
    while (completedTraces.length > TRACING_CONFIG.maxTraces) {
        completedTraces.shift();
    }

    // Cleanup old traces
    const cutoff = Date.now() - TRACING_CONFIG.traceRetention;
    while (completedTraces.length > 0 && completedTraces[0].startTime < cutoff) {
        completedTraces.shift();
    }
}

// ============================================
// METRICS
// ============================================

/**
 * Get tracing statistics
 * @returns {Object}
 */
function getStats() {
    // Calculate percentiles
    const durations = completedTraces.map(t => t.duration).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

    const errorCount = completedTraces.filter(t => t.error).length;

    return {
        ...tracingStats,
        activeTraces: traces.size,
        storedTraces: completedTraces.length,
        sampleRate: TRACING_CONFIG.sampleRate,
        percentiles: {
            p50,
            p95,
            p99
        },
        errorRate: completedTraces.length > 0
            ? ((errorCount / completedTraces.length) * 100).toFixed(2) + '%'
            : '0%'
    };
}

/**
 * Set sample rate
 * @param {number} rate - Rate between 0 and 1
 */
function setSampleRate(rate) {
    TRACING_CONFIG.sampleRate = Math.max(0, Math.min(1, rate));
}

module.exports = {
    // Classes
    Trace,
    Span,

    // Context
    getContext,
    runWithContext,
    getCurrentTrace,
    getCurrentSpan,

    // Operations
    startTrace,
    startSpan,
    endSpan,
    endTrace,

    // Middleware
    createMiddleware,

    // Querying
    getTrace,
    searchTraces,
    getSlowTraces,
    getErrorTraces,
    getRecentTraces,

    // Utilities
    generateTraceId,
    generateSpanId,

    // Metrics
    getStats,
    setSampleRate,

    // Config
    TRACING_CONFIG
};
