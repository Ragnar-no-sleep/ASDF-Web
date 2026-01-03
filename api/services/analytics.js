/**
 * ASDF API - Analytics Service
 *
 * User behavior and metrics tracking:
 * - Event tracking with properties
 * - Funnel analysis
 * - Cohort metrics
 * - Time-series aggregation
 *
 * Security by Design:
 * - No PII in analytics
 * - Anonymized wallet addresses
 * - Data retention policies
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const ANALYTICS_CONFIG = {
    // Retention periods (Fibonacci days)
    retention: {
        rawEvents: 8 * 24 * 60 * 60 * 1000,     // 8 days
        hourlyAggregates: 21 * 24 * 60 * 60 * 1000,  // 21 days
        dailyAggregates: 89 * 24 * 60 * 60 * 1000    // 89 days (~3 months)
    },

    // Sampling for high-volume events
    samplingRate: 1.0,  // 100% by default

    // Max events in memory
    maxRawEvents: 10000,

    // Aggregation intervals
    aggregationIntervals: {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000
    }
};

// Standard event types
const EVENT_TYPES = {
    // User events
    USER_SIGNUP: 'user_signup',
    USER_LOGIN: 'user_login',
    USER_SESSION: 'user_session',

    // Wallet events
    WALLET_CONNECTED: 'wallet_connected',
    WALLET_BALANCE_CHECK: 'wallet_balance_check',

    // Burn events
    BURN_INITIATED: 'burn_initiated',
    BURN_COMPLETED: 'burn_completed',
    BURN_FAILED: 'burn_failed',

    // Shop events
    SHOP_VIEW: 'shop_view',
    ITEM_VIEW: 'item_view',
    PURCHASE_INITIATED: 'purchase_initiated',
    PURCHASE_COMPLETED: 'purchase_completed',

    // Game events
    GAME_START: 'game_start',
    GAME_END: 'game_end',
    GAME_SCORE: 'game_score',

    // Achievement events
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    TIER_UP: 'tier_up',

    // Referral events
    REFERRAL_CODE_CREATED: 'referral_code_created',
    REFERRAL_CODE_USED: 'referral_code_used',

    // Page views
    PAGE_VIEW: 'page_view',
    FEATURE_USED: 'feature_used'
};

// ============================================
// STORAGE
// ============================================

// Raw events (recent)
const rawEvents = [];

// Aggregated metrics
const hourlyMetrics = new Map();  // hour key -> metrics
const dailyMetrics = new Map();   // day key -> metrics

// User sessions
const userSessions = new Map();  // sessionId -> session data

// Funnels
const funnelData = new Map();    // funnel name -> step data

// ============================================
// EVENT TRACKING
// ============================================

/**
 * Track an analytics event
 * @param {string} eventType - Event type
 * @param {Object} properties - Event properties
 * @param {Object} context - Event context
 * @returns {{tracked: boolean, eventId?: string}}
 */
function track(eventType, properties = {}, context = {}) {
    // Sampling check
    if (Math.random() > ANALYTICS_CONFIG.samplingRate) {
        return { tracked: false, sampled: true };
    }

    const event = {
        id: generateEventId(),
        type: eventType,
        properties: sanitizeProperties(properties),
        context: {
            timestamp: Date.now(),
            sessionId: context.sessionId || null,
            userId: context.wallet ? anonymizeWallet(context.wallet) : null,
            userAgent: context.userAgent || null,
            ip: context.ip ? hashIP(context.ip) : null,
            referrer: context.referrer || null,
            page: context.page || null
        }
    };

    // Store raw event
    rawEvents.push(event);

    // Enforce max events
    if (rawEvents.length > ANALYTICS_CONFIG.maxRawEvents) {
        rawEvents.shift();
    }

    // Update aggregates
    updateAggregates(event);

    // Update funnel if applicable
    updateFunnels(event);

    return { tracked: true, eventId: event.id };
}

/**
 * Track page view
 * @param {string} page - Page path
 * @param {Object} context - Event context
 */
function trackPageView(page, context = {}) {
    return track(EVENT_TYPES.PAGE_VIEW, { page }, { ...context, page });
}

/**
 * Track user action
 * @param {string} action - Action name
 * @param {Object} properties - Action properties
 * @param {Object} context - Event context
 */
function trackAction(action, properties = {}, context = {}) {
    return track(EVENT_TYPES.FEATURE_USED, { action, ...properties }, context);
}

// ============================================
// SESSION TRACKING
// ============================================

/**
 * Start a user session
 * @param {string} wallet - User wallet
 * @param {Object} context - Session context
 * @returns {{sessionId: string}}
 */
function startSession(wallet, context = {}) {
    const sessionId = generateSessionId();
    const userId = anonymizeWallet(wallet);

    const session = {
        id: sessionId,
        userId,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        pageViews: 0,
        events: 0,
        context: {
            userAgent: context.userAgent,
            referrer: context.referrer
        }
    };

    userSessions.set(sessionId, session);

    track(EVENT_TYPES.USER_SESSION, { action: 'start' }, { wallet, sessionId });

    return { sessionId };
}

/**
 * Update session activity
 * @param {string} sessionId - Session ID
 */
function touchSession(sessionId) {
    const session = userSessions.get(sessionId);
    if (session) {
        session.lastActivityAt = Date.now();
        session.events++;
    }
}

/**
 * End a user session
 * @param {string} sessionId - Session ID
 */
function endSession(sessionId) {
    const session = userSessions.get(sessionId);
    if (!session) return;

    const duration = Date.now() - session.startedAt;

    track(EVENT_TYPES.USER_SESSION, {
        action: 'end',
        duration,
        pageViews: session.pageViews,
        events: session.events
    }, { sessionId });

    userSessions.delete(sessionId);
}

// ============================================
// AGGREGATION
// ============================================

/**
 * Update aggregate metrics
 * @param {Object} event - Event to aggregate
 */
function updateAggregates(event) {
    const hourKey = getHourKey(event.context.timestamp);
    const dayKey = getDayKey(event.context.timestamp);

    // Update hourly
    updateMetricsBucket(hourlyMetrics, hourKey, event);

    // Update daily
    updateMetricsBucket(dailyMetrics, dayKey, event);
}

/**
 * Update a metrics bucket
 * @param {Map} bucket - Metrics bucket
 * @param {string} key - Bucket key
 * @param {Object} event - Event
 */
function updateMetricsBucket(bucket, key, event) {
    let metrics = bucket.get(key);

    if (!metrics) {
        metrics = {
            key,
            startTime: getTimeFromKey(key),
            totalEvents: 0,
            uniqueUsers: new Set(),
            eventCounts: {},
            properties: {}
        };
        bucket.set(key, metrics);
    }

    metrics.totalEvents++;

    if (event.context.userId) {
        metrics.uniqueUsers.add(event.context.userId);
    }

    // Count by event type
    metrics.eventCounts[event.type] = (metrics.eventCounts[event.type] || 0) + 1;

    // Aggregate numeric properties
    for (const [prop, value] of Object.entries(event.properties)) {
        if (typeof value === 'number') {
            if (!metrics.properties[prop]) {
                metrics.properties[prop] = { sum: 0, count: 0, min: value, max: value };
            }
            const p = metrics.properties[prop];
            p.sum += value;
            p.count++;
            p.min = Math.min(p.min, value);
            p.max = Math.max(p.max, value);
        }
    }
}

/**
 * Get aggregated metrics for time range
 * @param {string} interval - 'hour' or 'day'
 * @param {number} count - Number of intervals
 * @returns {Object[]}
 */
function getAggregatedMetrics(interval, count = 24) {
    const bucket = interval === 'day' ? dailyMetrics : hourlyMetrics;
    const intervalMs = ANALYTICS_CONFIG.aggregationIntervals[interval] ||
                       ANALYTICS_CONFIG.aggregationIntervals.hour;

    const results = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const time = now - (i * intervalMs);
        const key = interval === 'day' ? getDayKey(time) : getHourKey(time);
        const metrics = bucket.get(key);

        if (metrics) {
            results.push({
                key,
                time: metrics.startTime,
                totalEvents: metrics.totalEvents,
                uniqueUsers: metrics.uniqueUsers.size,
                eventCounts: metrics.eventCounts,
                properties: serializeProperties(metrics.properties)
            });
        } else {
            results.push({
                key,
                time: getTimeFromKey(key),
                totalEvents: 0,
                uniqueUsers: 0,
                eventCounts: {},
                properties: {}
            });
        }
    }

    return results.reverse();
}

// ============================================
// FUNNEL ANALYSIS
// ============================================

/**
 * Define a funnel
 * @param {string} name - Funnel name
 * @param {string[]} steps - Event types in order
 */
function defineFunnel(name, steps) {
    funnelData.set(name, {
        name,
        steps,
        stepCounts: new Map(),
        conversions: new Map()
    });
}

/**
 * Update funnel data
 * @param {Object} event - Event
 */
function updateFunnels(event) {
    for (const [, funnel] of funnelData) {
        const stepIndex = funnel.steps.indexOf(event.type);
        if (stepIndex === -1) continue;

        const userId = event.context.userId;
        if (!userId) continue;

        // Track step completion
        if (!funnel.stepCounts.has(userId)) {
            funnel.stepCounts.set(userId, new Set());
        }
        funnel.stepCounts.get(userId).add(stepIndex);

        // Check conversion (completed all steps)
        const userSteps = funnel.stepCounts.get(userId);
        if (userSteps.size === funnel.steps.length) {
            funnel.conversions.set(userId, Date.now());
        }
    }
}

/**
 * Get funnel analysis
 * @param {string} name - Funnel name
 * @returns {Object}
 */
function getFunnelAnalysis(name) {
    const funnel = funnelData.get(name);
    if (!funnel) return null;

    const stepStats = funnel.steps.map((step, idx) => {
        let count = 0;
        for (const userSteps of funnel.stepCounts.values()) {
            if (userSteps.has(idx)) count++;
        }
        return { step, index: idx, users: count };
    });

    // Calculate conversion rates
    for (let i = 1; i < stepStats.length; i++) {
        const prev = stepStats[i - 1].users;
        const curr = stepStats[i].users;
        stepStats[i].conversionRate = prev > 0 ? ((curr / prev) * 100).toFixed(2) + '%' : '0%';
        stepStats[i].dropoff = prev - curr;
    }
    stepStats[0].conversionRate = '100%';
    stepStats[0].dropoff = 0;

    return {
        name: funnel.name,
        steps: stepStats,
        totalUsers: funnel.stepCounts.size,
        conversions: funnel.conversions.size,
        overallConversionRate: funnel.stepCounts.size > 0
            ? ((funnel.conversions.size / funnel.stepCounts.size) * 100).toFixed(2) + '%'
            : '0%'
    };
}

// ============================================
// QUERIES
// ============================================

/**
 * Get event counts by type
 * @param {number} hours - Hours to look back
 * @returns {Object}
 */
function getEventCounts(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const counts = {};

    for (const event of rawEvents) {
        if (event.context.timestamp >= cutoff) {
            counts[event.type] = (counts[event.type] || 0) + 1;
        }
    }

    return counts;
}

/**
 * Get unique users
 * @param {number} hours - Hours to look back
 * @returns {number}
 */
function getUniqueUsers(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const users = new Set();

    for (const event of rawEvents) {
        if (event.context.timestamp >= cutoff && event.context.userId) {
            users.add(event.context.userId);
        }
    }

    return users.size;
}

/**
 * Get top events
 * @param {number} limit - Max events
 * @param {number} hours - Hours to look back
 * @returns {Object[]}
 */
function getTopEvents(limit = 10, hours = 24) {
    const counts = getEventCounts(hours);

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([type, count]) => ({ type, count }));
}

/**
 * Get recent events
 * @param {number} limit - Max events
 * @param {string} eventType - Filter by type
 * @returns {Object[]}
 */
function getRecentEvents(limit = 50, eventType = null) {
    let events = rawEvents.slice(-limit * 2);

    if (eventType) {
        events = events.filter(e => e.type === eventType);
    }

    return events.slice(-limit).reverse().map(e => ({
        id: e.id,
        type: e.type,
        properties: e.properties,
        timestamp: e.context.timestamp
    }));
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate event ID
 * @returns {string}
 */
function generateEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Generate session ID
 * @returns {string}
 */
function generateSessionId() {
    return `ses_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Anonymize wallet address
 * @param {string} wallet - Wallet address
 * @returns {string}
 */
function anonymizeWallet(wallet) {
    if (!wallet) return null;
    return crypto.createHash('sha256').update(wallet).digest('hex').slice(0, 16);
}

/**
 * Hash IP address
 * @param {string} ip - IP address
 * @returns {string}
 */
function hashIP(ip) {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip + 'salt').digest('hex').slice(0, 8);
}

/**
 * Sanitize event properties
 * @param {Object} properties - Properties to sanitize
 * @returns {Object}
 */
function sanitizeProperties(properties) {
    if (!properties || typeof properties !== 'object') return {};

    const sanitized = {};
    const sensitiveFields = ['wallet', 'email', 'phone', 'password', 'secret', 'token'];

    for (const [key, value] of Object.entries(properties)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
            continue;  // Skip sensitive fields
        }

        if (typeof value === 'string') {
            sanitized[key] = value.slice(0, 200);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Get hour key from timestamp
 * @param {number} timestamp - Timestamp
 * @returns {string}
 */
function getHourKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
}

/**
 * Get day key from timestamp
 * @param {number} timestamp - Timestamp
 * @returns {string}
 */
function getDayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Get timestamp from key
 * @param {string} key - Time key
 * @returns {number}
 */
function getTimeFromKey(key) {
    const parts = key.split('-');
    if (parts.length === 4) {
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3])).getTime();
    }
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getTime();
}

/**
 * Serialize properties for output
 * @param {Object} properties - Properties with aggregates
 * @returns {Object}
 */
function serializeProperties(properties) {
    const result = {};
    for (const [key, value] of Object.entries(properties)) {
        result[key] = {
            avg: value.count > 0 ? (value.sum / value.count).toFixed(2) : 0,
            sum: value.sum,
            min: value.min,
            max: value.max,
            count: value.count
        };
    }
    return result;
}

// ============================================
// CLEANUP
// ============================================

/**
 * Cleanup old data
 */
function cleanup() {
    const now = Date.now();

    // Cleanup raw events
    const rawCutoff = now - ANALYTICS_CONFIG.retention.rawEvents;
    while (rawEvents.length > 0 && rawEvents[0].context.timestamp < rawCutoff) {
        rawEvents.shift();
    }

    // Cleanup hourly
    const hourlyCutoff = now - ANALYTICS_CONFIG.retention.hourlyAggregates;
    for (const [key, metrics] of hourlyMetrics.entries()) {
        if (metrics.startTime < hourlyCutoff) {
            hourlyMetrics.delete(key);
        }
    }

    // Cleanup daily
    const dailyCutoff = now - ANALYTICS_CONFIG.retention.dailyAggregates;
    for (const [key, metrics] of dailyMetrics.entries()) {
        if (metrics.startTime < dailyCutoff) {
            dailyMetrics.delete(key);
        }
    }

    // Cleanup old sessions (inactive > 30 min)
    const sessionCutoff = now - (30 * 60 * 1000);
    for (const [sessionId, session] of userSessions.entries()) {
        if (session.lastActivityAt < sessionCutoff) {
            endSession(sessionId);
        }
    }
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);

// ============================================
// METRICS
// ============================================

/**
 * Get analytics service metrics
 * @returns {Object}
 */
function getAnalyticsMetrics() {
    return {
        rawEvents: rawEvents.length,
        hourlyBuckets: hourlyMetrics.size,
        dailyBuckets: dailyMetrics.size,
        activeSessions: userSessions.size,
        definedFunnels: funnelData.size,
        last24h: {
            totalEvents: getEventCounts(24),
            uniqueUsers: getUniqueUsers(24),
            topEvents: getTopEvents(5, 24)
        },
        config: {
            samplingRate: ANALYTICS_CONFIG.samplingRate,
            retention: ANALYTICS_CONFIG.retention
        }
    };
}

// Define default funnels
defineFunnel('onboarding', [
    EVENT_TYPES.WALLET_CONNECTED,
    EVENT_TYPES.USER_LOGIN,
    EVENT_TYPES.SHOP_VIEW,
    EVENT_TYPES.PURCHASE_COMPLETED
]);

defineFunnel('burn', [
    EVENT_TYPES.WALLET_BALANCE_CHECK,
    EVENT_TYPES.BURN_INITIATED,
    EVENT_TYPES.BURN_COMPLETED
]);

module.exports = {
    // Event types
    EVENT_TYPES,

    // Tracking
    track,
    trackPageView,
    trackAction,

    // Sessions
    startSession,
    touchSession,
    endSession,

    // Aggregation
    getAggregatedMetrics,

    // Funnels
    defineFunnel,
    getFunnelAnalysis,

    // Queries
    getEventCounts,
    getUniqueUsers,
    getTopEvents,
    getRecentEvents,

    // Metrics
    getAnalyticsMetrics,

    // Config
    ANALYTICS_CONFIG
};
