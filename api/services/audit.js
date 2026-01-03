/**
 * ASDF API - Comprehensive Audit Trail Service
 *
 * Activity logging and compliance:
 * - Structured audit events
 * - Search and filtering
 * - Data retention policies
 * - Suspicious activity detection
 * - Export for compliance
 *
 * Security by Design:
 * - Immutable audit records
 * - PII minimization
 * - Tamper detection
 * - Access logging
 */

'use strict';

const crypto = require('crypto');

// ============================================
// CONFIGURATION
// ============================================

const AUDIT_CONFIG = {
    // Retention (Fibonacci-based days)
    retention: {
        security: 89 * 24 * 60 * 60 * 1000,    // 89 days
        financial: 365 * 24 * 60 * 60 * 1000,  // 1 year
        operational: 21 * 24 * 60 * 60 * 1000, // 21 days
        debug: 3 * 24 * 60 * 60 * 1000         // 3 days
    },

    // Max entries per category
    maxEntriesPerCategory: 100000,

    // Batch settings
    batchSize: 100,
    flushInterval: 5000,

    // Alert thresholds
    alertThresholds: {
        failedLogins: 5,
        rateLimitHits: 20,
        suspiciousActions: 3
    },

    // Hash algorithm for integrity
    hashAlgorithm: 'sha256'
};

// Event categories
const CATEGORIES = {
    SECURITY: 'security',
    FINANCIAL: 'financial',
    OPERATIONAL: 'operational',
    DEBUG: 'debug',
    USER: 'user',
    ADMIN: 'admin',
    SYSTEM: 'system'
};

// Event severities
const SEVERITY = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

// Event types
const EVENT_TYPES = {
    // Authentication
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILURE: 'auth.login.failure',
    LOGOUT: 'auth.logout',
    SESSION_EXPIRED: 'auth.session.expired',
    TOKEN_REFRESH: 'auth.token.refresh',

    // Authorization
    ACCESS_GRANTED: 'authz.access.granted',
    ACCESS_DENIED: 'authz.access.denied',
    PERMISSION_CHANGED: 'authz.permission.changed',

    // User actions
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    PROFILE_VIEWED: 'user.profile.viewed',

    // Financial
    PURCHASE_INITIATED: 'financial.purchase.initiated',
    PURCHASE_COMPLETED: 'financial.purchase.completed',
    PURCHASE_FAILED: 'financial.purchase.failed',
    REFUND_REQUESTED: 'financial.refund.requested',
    REFUND_PROCESSED: 'financial.refund.processed',
    BURN_COMPLETED: 'financial.burn.completed',

    // Admin
    CONFIG_CHANGED: 'admin.config.changed',
    FLAG_TOGGLED: 'admin.flag.toggled',
    USER_BANNED: 'admin.user.banned',
    USER_UNBANNED: 'admin.user.unbanned',
    DATA_EXPORTED: 'admin.data.exported',

    // System
    SERVICE_STARTED: 'system.service.started',
    SERVICE_STOPPED: 'system.service.stopped',
    ERROR_OCCURRED: 'system.error',
    RATE_LIMITED: 'system.rate_limited',
    WEBHOOK_RECEIVED: 'system.webhook.received',

    // Security
    SUSPICIOUS_ACTIVITY: 'security.suspicious',
    ATTACK_DETECTED: 'security.attack',
    IP_BLOCKED: 'security.ip.blocked'
};

// ============================================
// STORAGE
// ============================================

// Audit logs by category
const auditLogs = {
    [CATEGORIES.SECURITY]: [],
    [CATEGORIES.FINANCIAL]: [],
    [CATEGORIES.OPERATIONAL]: [],
    [CATEGORIES.DEBUG]: [],
    [CATEGORIES.USER]: [],
    [CATEGORIES.ADMIN]: [],
    [CATEGORIES.SYSTEM]: []
};

// Pending batch
const pendingEvents = [];

// Event index for fast lookup
const eventIndex = new Map();

// Alert state
const alertState = new Map();

// Stats
const auditStats = {
    totalEvents: 0,
    byCategory: {},
    bySeverity: {},
    alerts: 0
};

// ============================================
// CORE AUDIT FUNCTIONS
// ============================================

/**
 * Log an audit event
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Logging options
 * @returns {{eventId: string}}
 */
function log(eventType, data = {}, options = {}) {
    const {
        category = categorizeEvent(eventType),
        severity = SEVERITY.INFO,
        actor = null,
        target = null,
        ip = null,
        userAgent = null,
        requestId = null,
        metadata = {}
    } = options;

    const event = {
        id: generateEventId(),
        type: eventType,
        category,
        severity,
        timestamp: Date.now(),
        isoTimestamp: new Date().toISOString(),
        actor: actor ? sanitizeActor(actor) : null,
        target: target ? sanitizeTarget(target) : null,
        ip: ip ? hashIP(ip) : null,
        userAgent: userAgent ? truncate(userAgent, 200) : null,
        requestId,
        data: sanitizeData(data),
        metadata,
        checksum: null
    };

    // Generate checksum for integrity
    event.checksum = generateChecksum(event);

    // Add to batch
    pendingEvents.push(event);

    // Index for fast lookup
    indexEvent(event);

    // Update stats
    updateStats(event);

    // Check for alerts
    checkAlertConditions(event);

    // Flush if batch is full
    if (pendingEvents.length >= AUDIT_CONFIG.batchSize) {
        flush();
    }

    return { eventId: event.id };
}

/**
 * Log security event
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Options
 * @returns {{eventId: string}}
 */
function logSecurity(eventType, data, options = {}) {
    return log(eventType, data, {
        ...options,
        category: CATEGORIES.SECURITY,
        severity: options.severity || SEVERITY.WARNING
    });
}

/**
 * Log financial event
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Options
 * @returns {{eventId: string}}
 */
function logFinancial(eventType, data, options = {}) {
    return log(eventType, data, {
        ...options,
        category: CATEGORIES.FINANCIAL,
        severity: options.severity || SEVERITY.INFO
    });
}

/**
 * Log admin action
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Options
 * @returns {{eventId: string}}
 */
function logAdmin(eventType, data, options = {}) {
    return log(eventType, data, {
        ...options,
        category: CATEGORIES.ADMIN,
        severity: options.severity || SEVERITY.WARNING
    });
}

/**
 * Log system event
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Options
 * @returns {{eventId: string}}
 */
function logSystem(eventType, data, options = {}) {
    return log(eventType, data, {
        ...options,
        category: CATEGORIES.SYSTEM
    });
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Flush pending events to storage
 */
function flush() {
    if (pendingEvents.length === 0) return;

    const events = pendingEvents.splice(0, pendingEvents.length);

    for (const event of events) {
        const log = auditLogs[event.category] || auditLogs[CATEGORIES.OPERATIONAL];
        log.push(event);

        // Enforce max entries
        const maxEntries = AUDIT_CONFIG.maxEntriesPerCategory;
        if (log.length > maxEntries) {
            log.splice(0, log.length - maxEntries);
        }
    }
}

// Start flush interval
setInterval(flush, AUDIT_CONFIG.flushInterval);

// ============================================
// QUERIES
// ============================================

/**
 * Search audit logs
 * @param {Object} query - Search query
 * @returns {{events: Object[], total: number, hasMore: boolean}}
 */
function search(query = {}) {
    const {
        category = null,
        eventType = null,
        severity = null,
        actor = null,
        startTime = null,
        endTime = null,
        ip = null,
        limit = 50,
        offset = 0,
        sort = 'desc'
    } = query;

    // Flush pending events
    flush();

    let results = [];

    // Select categories to search
    const categories = category
        ? [category]
        : Object.keys(auditLogs);

    for (const cat of categories) {
        const logs = auditLogs[cat] || [];
        results = results.concat(logs);
    }

    // Apply filters
    results = results.filter(event => {
        if (eventType && event.type !== eventType) return false;
        if (severity && event.severity !== severity) return false;
        if (actor && event.actor?.id !== actor) return false;
        if (ip && event.ip !== hashIP(ip)) return false;
        if (startTime && event.timestamp < startTime) return false;
        if (endTime && event.timestamp > endTime) return false;
        return true;
    });

    // Sort
    results.sort((a, b) => {
        return sort === 'desc'
            ? b.timestamp - a.timestamp
            : a.timestamp - b.timestamp;
    });

    const total = results.length;
    const paged = results.slice(offset, offset + limit);

    return {
        events: paged,
        total,
        hasMore: offset + paged.length < total
    };
}

/**
 * Get event by ID
 * @param {string} eventId - Event ID
 * @returns {Object|null}
 */
function getEvent(eventId) {
    const indexed = eventIndex.get(eventId);
    if (!indexed) return null;

    const logs = auditLogs[indexed.category] || [];
    return logs.find(e => e.id === eventId) || null;
}

/**
 * Get events for actor
 * @param {string} actorId - Actor ID
 * @param {number} limit - Max events
 * @returns {Object[]}
 */
function getActorEvents(actorId, limit = 50) {
    return search({
        actor: actorId,
        limit
    }).events;
}

/**
 * Get recent events
 * @param {number} minutes - Time window
 * @param {string} category - Optional category filter
 * @returns {Object[]}
 */
function getRecentEvents(minutes = 60, category = null) {
    const startTime = Date.now() - (minutes * 60 * 1000);
    return search({
        category,
        startTime,
        limit: 1000
    }).events;
}

/**
 * Get event timeline for actor
 * @param {string} actorId - Actor ID
 * @param {number} days - Days to look back
 * @returns {Object}
 */
function getActorTimeline(actorId, days = 7) {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const events = search({
        actor: actorId,
        startTime,
        limit: 1000
    }).events;

    // Group by day
    const timeline = {};
    for (const event of events) {
        const day = new Date(event.timestamp).toISOString().split('T')[0];
        if (!timeline[day]) {
            timeline[day] = [];
        }
        timeline[day].push({
            id: event.id,
            type: event.type,
            timestamp: event.timestamp,
            severity: event.severity
        });
    }

    return timeline;
}

// ============================================
// ALERTING
// ============================================

/**
 * Check alert conditions
 * @param {Object} event - Audit event
 */
function checkAlertConditions(event) {
    const actorId = event.actor?.id || 'unknown';
    const alertKey = `${event.type}:${actorId}`;

    // Track event counts
    let state = alertState.get(alertKey);
    if (!state) {
        state = { count: 0, firstSeen: Date.now(), lastSeen: Date.now() };
        alertState.set(alertKey, state);
    }

    state.count++;
    state.lastSeen = Date.now();

    // Reset if first event was more than 1 hour ago
    if (Date.now() - state.firstSeen > 60 * 60 * 1000) {
        state.count = 1;
        state.firstSeen = Date.now();
    }

    // Check thresholds
    if (event.type === EVENT_TYPES.LOGIN_FAILURE &&
        state.count >= AUDIT_CONFIG.alertThresholds.failedLogins) {
        raiseAlert('too_many_failed_logins', {
            actorId,
            count: state.count,
            window: Date.now() - state.firstSeen
        });
    }

    if (event.type === EVENT_TYPES.RATE_LIMITED &&
        state.count >= AUDIT_CONFIG.alertThresholds.rateLimitHits) {
        raiseAlert('excessive_rate_limiting', {
            actorId,
            count: state.count,
            window: Date.now() - state.firstSeen
        });
    }

    if (event.type === EVENT_TYPES.SUSPICIOUS_ACTIVITY &&
        state.count >= AUDIT_CONFIG.alertThresholds.suspiciousActions) {
        raiseAlert('suspicious_pattern_detected', {
            actorId,
            count: state.count,
            window: Date.now() - state.firstSeen
        });
    }
}

/**
 * Raise alert
 * @param {string} alertType - Alert type
 * @param {Object} data - Alert data
 */
function raiseAlert(alertType, data) {
    auditStats.alerts++;

    // Log the alert as a critical security event
    log(EVENT_TYPES.SUSPICIOUS_ACTIVITY, {
        alertType,
        ...data
    }, {
        category: CATEGORIES.SECURITY,
        severity: SEVERITY.CRITICAL
    });

    console.warn(`[Audit] ALERT: ${alertType}`, data);
}

/**
 * Get active alerts
 * @returns {Object[]}
 */
function getActiveAlerts() {
    const alerts = [];
    const now = Date.now();
    const window = 60 * 60 * 1000;  // 1 hour

    for (const [key, state] of alertState.entries()) {
        if (now - state.lastSeen < window) {
            const [eventType, actorId] = key.split(':');
            alerts.push({
                eventType,
                actorId,
                count: state.count,
                firstSeen: state.firstSeen,
                lastSeen: state.lastSeen
            });
        }
    }

    return alerts.sort((a, b) => b.count - a.count);
}

// ============================================
// DATA SANITIZATION
// ============================================

/**
 * Sanitize actor information
 * @param {Object|string} actor - Actor info
 * @returns {Object}
 */
function sanitizeActor(actor) {
    if (typeof actor === 'string') {
        return { id: hashId(actor), type: 'user' };
    }

    return {
        id: actor.id ? hashId(actor.id) : null,
        type: actor.type || 'user',
        role: actor.role || null
    };
}

/**
 * Sanitize target information
 * @param {Object|string} target - Target info
 * @returns {Object}
 */
function sanitizeTarget(target) {
    if (typeof target === 'string') {
        return { id: target, type: 'resource' };
    }

    return {
        id: target.id || null,
        type: target.type || 'resource',
        name: target.name ? truncate(target.name, 100) : null
    };
}

/**
 * Sanitize event data
 * @param {Object} data - Raw data
 * @returns {Object}
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return {};

    const sanitized = {};
    const sensitiveFields = ['password', 'secret', 'token', 'privateKey', 'apiKey'];

    for (const [key, value] of Object.entries(data)) {
        // Redact sensitive fields
        if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
            sanitized[key] = '[REDACTED]';
            continue;
        }

        // Truncate long strings
        if (typeof value === 'string') {
            sanitized[key] = truncate(value, 500);
        } else if (typeof value === 'object' && value !== null) {
            // Shallow sanitize nested objects
            sanitized[key] = JSON.stringify(value).slice(0, 1000);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

// ============================================
// INTEGRITY
// ============================================

/**
 * Generate event checksum
 * @param {Object} event - Event without checksum
 * @returns {string}
 */
function generateChecksum(event) {
    const data = JSON.stringify({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        actor: event.actor,
        data: event.data
    });

    return crypto
        .createHash(AUDIT_CONFIG.hashAlgorithm)
        .update(data)
        .digest('hex');
}

/**
 * Verify event integrity
 * @param {Object} event - Event to verify
 * @returns {boolean}
 */
function verifyIntegrity(event) {
    const originalChecksum = event.checksum;
    const eventCopy = { ...event, checksum: null };
    const computedChecksum = generateChecksum(eventCopy);
    return originalChecksum === computedChecksum;
}

// ============================================
// EXPORT
// ============================================

/**
 * Export audit logs
 * @param {Object} options - Export options
 * @returns {Object}
 */
function exportLogs(options = {}) {
    const {
        category = null,
        startTime = null,
        endTime = null,
        format = 'json'
    } = options;

    const result = search({
        category,
        startTime,
        endTime,
        limit: 100000
    });

    const exportData = {
        exportedAt: new Date().toISOString(),
        totalEvents: result.total,
        filters: { category, startTime, endTime },
        events: result.events
    };

    // Log the export
    logAdmin(EVENT_TYPES.DATA_EXPORTED, {
        category,
        eventCount: result.total
    });

    if (format === 'csv') {
        return exportToCSV(exportData.events);
    }

    return exportData;
}

/**
 * Export to CSV format
 * @param {Object[]} events - Events to export
 * @returns {string}
 */
function exportToCSV(events) {
    const headers = ['id', 'type', 'category', 'severity', 'timestamp', 'actor', 'data'];
    const rows = [headers.join(',')];

    for (const event of events) {
        const row = [
            event.id,
            event.type,
            event.category,
            event.severity,
            event.isoTimestamp,
            event.actor?.id || '',
            JSON.stringify(event.data).replace(/"/g, '""')
        ];
        rows.push(row.map(v => `"${v}"`).join(','));
    }

    return rows.join('\n');
}

// ============================================
// CLEANUP
// ============================================

/**
 * Cleanup old audit logs based on retention
 */
function cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [category, logs] of Object.entries(auditLogs)) {
        const retention = AUDIT_CONFIG.retention[category] ||
            AUDIT_CONFIG.retention.operational;
        const cutoff = now - retention;

        const initialLength = logs.length;
        const filtered = logs.filter(e => e.timestamp >= cutoff);
        auditLogs[category] = filtered;
        cleaned += initialLength - filtered.length;
    }

    // Cleanup alert state
    for (const [key, state] of alertState.entries()) {
        if (now - state.lastSeen > 24 * 60 * 60 * 1000) {
            alertState.delete(key);
        }
    }

    // Cleanup event index
    for (const [eventId, indexed] of eventIndex.entries()) {
        if (now - indexed.timestamp > AUDIT_CONFIG.retention.security) {
            eventIndex.delete(eventId);
        }
    }

    if (cleaned > 0) {
        console.log(`[Audit] Cleaned ${cleaned} old entries`);
    }
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);

// ============================================
// UTILITIES
// ============================================

/**
 * Generate event ID
 * @returns {string}
 */
function generateEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Categorize event by type
 * @param {string} eventType - Event type
 * @returns {string}
 */
function categorizeEvent(eventType) {
    if (eventType.startsWith('auth.') || eventType.startsWith('security.')) {
        return CATEGORIES.SECURITY;
    }
    if (eventType.startsWith('financial.')) {
        return CATEGORIES.FINANCIAL;
    }
    if (eventType.startsWith('admin.')) {
        return CATEGORIES.ADMIN;
    }
    if (eventType.startsWith('system.')) {
        return CATEGORIES.SYSTEM;
    }
    if (eventType.startsWith('user.')) {
        return CATEGORIES.USER;
    }
    return CATEGORIES.OPERATIONAL;
}

/**
 * Index event for fast lookup
 * @param {Object} event - Event to index
 */
function indexEvent(event) {
    eventIndex.set(event.id, {
        category: event.category,
        timestamp: event.timestamp
    });

    // Limit index size
    if (eventIndex.size > 100000) {
        const oldest = Array.from(eventIndex.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, 10000);
        for (const [key] of oldest) {
            eventIndex.delete(key);
        }
    }
}

/**
 * Update statistics
 * @param {Object} event - Logged event
 */
function updateStats(event) {
    auditStats.totalEvents++;
    auditStats.byCategory[event.category] = (auditStats.byCategory[event.category] || 0) + 1;
    auditStats.bySeverity[event.severity] = (auditStats.bySeverity[event.severity] || 0) + 1;
}

/**
 * Hash ID for privacy
 * @param {string} id - ID to hash
 * @returns {string}
 */
function hashId(id) {
    return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 16);
}

/**
 * Hash IP for privacy
 * @param {string} ip - IP to hash
 * @returns {string}
 */
function hashIP(ip) {
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);
}

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} maxLength - Max length
 * @returns {string}
 */
function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Create audit middleware
 * @param {Object} options - Middleware options
 * @returns {Function}
 */
function createMiddleware(options = {}) {
    const {
        logRequests = true,
        logResponses = true,
        excludePaths = ['/health', '/api/health']
    } = options;

    return (req, res, next) => {
        // Skip excluded paths
        if (excludePaths.some(p => req.path.startsWith(p))) {
            return next();
        }

        const requestId = crypto.randomBytes(8).toString('hex');
        req.requestId = requestId;

        const startTime = Date.now();

        if (logRequests) {
            log('system.request.received', {
                method: req.method,
                path: req.path,
                query: Object.keys(req.query || {})
            }, {
                category: CATEGORIES.OPERATIONAL,
                severity: SEVERITY.DEBUG,
                ip: req.ip || req.socket?.remoteAddress,
                userAgent: req.get('user-agent'),
                requestId
            });
        }

        if (logResponses) {
            const originalSend = res.send;
            res.send = function(body) {
                const duration = Date.now() - startTime;

                log('system.request.completed', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration
                }, {
                    category: CATEGORIES.OPERATIONAL,
                    severity: res.statusCode >= 500 ? SEVERITY.ERROR :
                        res.statusCode >= 400 ? SEVERITY.WARNING : SEVERITY.DEBUG,
                    requestId
                });

                return originalSend.call(this, body);
            };
        }

        next();
    };
}

// ============================================
// METRICS
// ============================================

/**
 * Get audit statistics
 * @returns {Object}
 */
function getStats() {
    let totalStored = 0;
    for (const logs of Object.values(auditLogs)) {
        totalStored += logs.length;
    }

    return {
        ...auditStats,
        storedEvents: totalStored,
        pendingEvents: pendingEvents.length,
        indexSize: eventIndex.size,
        alertStateSize: alertState.size,
        activeAlerts: getActiveAlerts().length
    };
}

module.exports = {
    // Constants
    CATEGORIES,
    SEVERITY,
    EVENT_TYPES,

    // Core logging
    log,
    logSecurity,
    logFinancial,
    logAdmin,
    logSystem,

    // Queries
    search,
    getEvent,
    getActorEvents,
    getRecentEvents,
    getActorTimeline,

    // Alerting
    getActiveAlerts,

    // Integrity
    verifyIntegrity,

    // Export
    exportLogs,

    // Middleware
    createMiddleware,

    // Control
    flush,
    cleanup,

    // Stats
    getStats,

    // Config
    AUDIT_CONFIG
};
