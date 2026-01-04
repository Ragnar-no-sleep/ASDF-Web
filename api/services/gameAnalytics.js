/**
 * ASDF API - Game Analytics Service
 *
 * Production-ready game analytics:
 * - Player engagement tracking
 * - Game performance metrics
 * - Cohort analysis
 * - Retention tracking
 * - A/B testing support
 * - Real-time dashboards
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Privacy-first (no PII)
 * - Aggregated data only
 * - Data retention policies
 */

'use strict';

const crypto = require('crypto');

// ============================================
// CONFIGURATION
// ============================================

const ANALYTICS_CONFIG = {
    // Aggregation windows
    windows: {
        realtime: 5 * 60 * 1000,      // 5 minutes
        hourly: 60 * 60 * 1000,        // 1 hour
        daily: 24 * 60 * 60 * 1000,    // 24 hours
        weekly: 7 * 24 * 60 * 60 * 1000 // 7 days
    },

    // Retention
    retentionDays: {
        realtime: 1,      // Keep 1 day of realtime
        hourly: 7,        // Keep 7 days of hourly
        daily: 90,        // Keep 90 days of daily
        weekly: 365       // Keep 1 year of weekly
    },

    // Cohort settings
    cohortPeriods: ['day', 'week', 'month'],

    // Memory limits
    maxEventsBuffer: 10000,
    maxUniqueUsers: 50000
};

// Event types
const EVENT_TYPES = {
    // Session events
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',

    // Game events
    GAME_START: 'game_start',
    GAME_END: 'game_end',
    GAME_PAUSE: 'game_pause',
    GAME_RESUME: 'game_resume',

    // Score events
    SCORE_UPDATE: 'score_update',
    SCORE_SUBMIT: 'score_submit',
    HIGH_SCORE: 'high_score',

    // Progression events
    LEVEL_UP: 'level_up',
    ACHIEVEMENT: 'achievement',
    PRESTIGE: 'prestige',

    // Economy events
    BURN: 'burn',
    PURCHASE: 'purchase',

    // Social events
    REFERRAL: 'referral',
    SHARE: 'share'
};

// ============================================
// STORAGE
// ============================================

// Raw event buffer (recent events)
const eventBuffer = [];

// Aggregated metrics
const metrics = {
    realtime: new Map(),   // Last 5 minutes
    hourly: new Map(),     // By hour
    daily: new Map(),      // By day
    weekly: new Map()      // By week
};

// User tracking (anonymized)
const userActivity = new Map();

// Cohort data
const cohorts = new Map();

// Game-specific metrics
const gameMetrics = new Map();

// Funnel tracking
const funnels = new Map();

// A/B test tracking
const experiments = new Map();

// Statistics
const stats = {
    totalEvents: 0,
    eventsToday: 0,
    uniqueUsersToday: 0,
    avgSessionDuration: 0,
    avgGamesPerSession: 0
};

// ============================================
// EVENT TRACKING
// ============================================

/**
 * Track an analytics event
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @returns {{tracked: boolean, eventId: string}}
 */
function trackEvent(eventType, data = {}) {
    const timestamp = Date.now();
    const eventId = generateEventId();

    // Anonymize wallet
    const userId = data.wallet ? hashUserId(data.wallet) : null;

    const event = {
        id: eventId,
        type: eventType,
        timestamp,
        userId,
        gameType: data.gameType || null,
        value: data.value || null,
        metadata: sanitizeMetadata(data.metadata || {}),
        sessionId: data.sessionId || null
    };

    // Add to buffer
    eventBuffer.push(event);
    stats.totalEvents++;

    // Enforce buffer limit
    while (eventBuffer.length > ANALYTICS_CONFIG.maxEventsBuffer) {
        eventBuffer.shift();
    }

    // Update user activity
    if (userId) {
        updateUserActivity(userId, eventType, timestamp);
    }

    // Update game metrics
    if (data.gameType) {
        updateGameMetrics(data.gameType, eventType, data);
    }

    // Update realtime aggregates
    updateRealtimeMetrics(eventType, data);

    // Track in funnels
    trackFunnelStep(userId, eventType, data);

    // Track experiments
    if (data.experiment) {
        trackExperiment(data.experiment, eventType, data);
    }

    return { tracked: true, eventId };
}

/**
 * Track session start
 * @param {string} wallet - Player wallet
 * @param {Object} context - Session context
 * @returns {string} Session ID
 */
function trackSessionStart(wallet, context = {}) {
    const sessionId = generateSessionId();

    trackEvent(EVENT_TYPES.SESSION_START, {
        wallet,
        sessionId,
        metadata: {
            platform: context.platform,
            referrer: context.referrer,
            userAgent: context.userAgent ? hashUserAgent(context.userAgent) : null
        }
    });

    return sessionId;
}

/**
 * Track session end
 * @param {string} wallet - Player wallet
 * @param {string} sessionId - Session ID
 * @param {Object} sessionData - Session data
 */
function trackSessionEnd(wallet, sessionId, sessionData = {}) {
    trackEvent(EVENT_TYPES.SESSION_END, {
        wallet,
        sessionId,
        value: sessionData.duration,
        metadata: {
            gamesPlayed: sessionData.gamesPlayed,
            totalScore: sessionData.totalScore,
            xpEarned: sessionData.xpEarned
        }
    });

    // Update session stats
    updateSessionStats(sessionData);
}

/**
 * Track game event
 * @param {string} eventType - Game event type
 * @param {string} wallet - Player wallet
 * @param {string} gameType - Game type
 * @param {Object} data - Event data
 */
function trackGameEvent(eventType, wallet, gameType, data = {}) {
    trackEvent(eventType, {
        wallet,
        gameType,
        value: data.value,
        sessionId: data.sessionId,
        metadata: data.metadata
    });
}

// ============================================
// USER ACTIVITY
// ============================================

/**
 * Update user activity tracking
 * @param {string} userId - Hashed user ID
 * @param {string} eventType - Event type
 * @param {number} timestamp - Event timestamp
 */
function updateUserActivity(userId, eventType, timestamp) {
    let activity = userActivity.get(userId);

    if (!activity) {
        activity = {
            firstSeen: timestamp,
            lastSeen: timestamp,
            eventCount: 0,
            gameCount: 0,
            sessionCount: 0,
            cohort: getCohortKey(timestamp)
        };
        userActivity.set(userId, activity);

        // Enforce memory limit
        if (userActivity.size > ANALYTICS_CONFIG.maxUniqueUsers) {
            pruneOldUsers();
        }
    }

    activity.lastSeen = timestamp;
    activity.eventCount++;

    if (eventType === EVENT_TYPES.GAME_END) {
        activity.gameCount++;
    }

    if (eventType === EVENT_TYPES.SESSION_START) {
        activity.sessionCount++;
    }
}

/**
 * Prune old users to free memory
 */
function pruneOldUsers() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;  // 30 days

    for (const [userId, activity] of userActivity.entries()) {
        if (activity.lastSeen < cutoff) {
            userActivity.delete(userId);
        }
    }
}

// ============================================
// GAME METRICS
// ============================================

/**
 * Update game-specific metrics
 * @param {string} gameType - Game type
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
function updateGameMetrics(gameType, eventType, data) {
    let gameData = gameMetrics.get(gameType);

    if (!gameData) {
        gameData = {
            totalPlays: 0,
            totalScore: 0,
            avgScore: 0,
            maxScore: 0,
            avgDuration: 0,
            completionRate: 0,
            scoreDistribution: new Map()
        };
        gameMetrics.set(gameType, gameData);
    }

    if (eventType === EVENT_TYPES.GAME_END) {
        gameData.totalPlays++;

        const score = data.value || 0;
        gameData.totalScore += score;
        gameData.avgScore = gameData.totalScore / gameData.totalPlays;

        if (score > gameData.maxScore) {
            gameData.maxScore = score;
        }

        // Update score distribution (buckets)
        const bucket = Math.floor(score / 100) * 100;
        const bucketCount = gameData.scoreDistribution.get(bucket) || 0;
        gameData.scoreDistribution.set(bucket, bucketCount + 1);

        // Update duration
        if (data.metadata?.duration) {
            const n = gameData.totalPlays;
            gameData.avgDuration = ((gameData.avgDuration * (n - 1)) + data.metadata.duration) / n;
        }
    }
}

// ============================================
// REALTIME METRICS
// ============================================

/**
 * Update realtime aggregates
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
function updateRealtimeMetrics(eventType, data) {
    const now = Date.now();
    const windowKey = getWindowKey(now, 'realtime');

    let windowData = metrics.realtime.get(windowKey);

    if (!windowData) {
        windowData = {
            timestamp: now,
            events: 0,
            uniqueUsers: new Set(),
            byType: new Map(),
            byGame: new Map()
        };
        metrics.realtime.set(windowKey, windowData);
    }

    windowData.events++;

    if (data.wallet) {
        windowData.uniqueUsers.add(hashUserId(data.wallet));
    }

    // By type
    const typeCount = windowData.byType.get(eventType) || 0;
    windowData.byType.set(eventType, typeCount + 1);

    // By game
    if (data.gameType) {
        const gameCount = windowData.byGame.get(data.gameType) || 0;
        windowData.byGame.set(data.gameType, gameCount + 1);
    }

    // Cleanup old windows
    cleanupOldWindows('realtime');
}

/**
 * Get window key for timestamp
 * @param {number} timestamp - Timestamp
 * @param {string} windowType - Window type
 * @returns {string}
 */
function getWindowKey(timestamp, windowType) {
    const window = ANALYTICS_CONFIG.windows[windowType];
    return Math.floor(timestamp / window).toString();
}

/**
 * Cleanup old windows
 * @param {string} windowType - Window type
 */
function cleanupOldWindows(windowType) {
    const window = ANALYTICS_CONFIG.windows[windowType];
    const retention = ANALYTICS_CONFIG.retentionDays[windowType] * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retention;
    const cutoffKey = Math.floor(cutoff / window).toString();

    const windowMap = metrics[windowType];

    for (const key of windowMap.keys()) {
        if (key < cutoffKey) {
            windowMap.delete(key);
        }
    }
}

// ============================================
// COHORT ANALYSIS
// ============================================

/**
 * Get cohort key for timestamp
 * @param {number} timestamp - Timestamp
 * @param {string} period - Cohort period
 * @returns {string}
 */
function getCohortKey(timestamp, period = 'week') {
    const date = new Date(timestamp);

    switch (period) {
        case 'day':
            return date.toISOString().split('T')[0];
        case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            return weekStart.toISOString().split('T')[0];
        case 'month':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        default:
            return date.toISOString().split('T')[0];
    }
}

/**
 * Get cohort retention data
 * @param {string} cohortKey - Cohort key
 * @returns {Object}
 */
function getCohortRetention(cohortKey) {
    let cohort = cohorts.get(cohortKey);

    if (!cohort) {
        cohort = {
            key: cohortKey,
            users: new Set(),
            retention: {}  // day -> active users
        };
        cohorts.set(cohortKey, cohort);
    }

    return cohort;
}

/**
 * Calculate retention rates
 * @param {string} cohortKey - Cohort key
 * @returns {Object}
 */
function calculateRetention(cohortKey) {
    const cohort = cohorts.get(cohortKey);

    if (!cohort || cohort.users.size === 0) {
        return { days: [], rates: [] };
    }

    const totalUsers = cohort.users.size;
    const days = Object.keys(cohort.retention).sort((a, b) => a - b);
    const rates = days.map(day => ({
        day: parseInt(day),
        activeUsers: cohort.retention[day],
        rate: ((cohort.retention[day] / totalUsers) * 100).toFixed(1)
    }));

    return { totalUsers, days, rates };
}

// ============================================
// FUNNEL TRACKING
// ============================================

/**
 * Define a funnel
 * @param {string} funnelId - Funnel ID
 * @param {string[]} steps - Funnel steps (event types)
 */
function defineFunnel(funnelId, steps) {
    funnels.set(funnelId, {
        id: funnelId,
        steps,
        userProgress: new Map(),
        completions: 0,
        dropoffs: steps.map(() => 0)
    });
}

/**
 * Track funnel step
 * @param {string} userId - User ID
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
function trackFunnelStep(userId, eventType, data) {
    if (!userId) return;

    for (const [funnelId, funnel] of funnels.entries()) {
        const stepIndex = funnel.steps.indexOf(eventType);
        if (stepIndex === -1) continue;

        let userProgress = funnel.userProgress.get(userId);

        if (!userProgress) {
            if (stepIndex === 0) {
                // Start tracking user
                userProgress = { currentStep: 0, timestamp: Date.now() };
                funnel.userProgress.set(userId, userProgress);
            }
            continue;
        }

        // Check if this is the expected next step
        if (stepIndex === userProgress.currentStep + 1 ||
            (stepIndex === userProgress.currentStep && stepIndex === 0)) {

            userProgress.currentStep = stepIndex;
            userProgress.timestamp = Date.now();

            // Check for completion
            if (stepIndex === funnel.steps.length - 1) {
                funnel.completions++;
                funnel.userProgress.delete(userId);
            }
        }
    }
}

/**
 * Get funnel analysis
 * @param {string} funnelId - Funnel ID
 * @returns {Object}
 */
function getFunnelAnalysis(funnelId) {
    const funnel = funnels.get(funnelId);

    if (!funnel) {
        return { found: false };
    }

    // Count users at each step
    const stepCounts = funnel.steps.map(() => 0);

    for (const progress of funnel.userProgress.values()) {
        stepCounts[progress.currentStep]++;
    }

    // Calculate conversion rates
    const totalStarted = stepCounts[0] + funnel.completions;
    const conversions = funnel.steps.map((step, i) => {
        const usersAtStep = i === funnel.steps.length - 1
            ? funnel.completions
            : stepCounts.slice(i).reduce((a, b) => a + b, 0) + funnel.completions;

        return {
            step,
            users: usersAtStep,
            conversionRate: totalStarted > 0
                ? ((usersAtStep / totalStarted) * 100).toFixed(1) + '%'
                : '0%',
            dropoffRate: i > 0
                ? (((stepCounts[i - 1] - usersAtStep) / stepCounts[i - 1]) * 100).toFixed(1) + '%'
                : '0%'
        };
    });

    return {
        found: true,
        funnelId,
        totalStarted,
        completions: funnel.completions,
        overallConversion: totalStarted > 0
            ? ((funnel.completions / totalStarted) * 100).toFixed(1) + '%'
            : '0%',
        steps: conversions
    };
}

// ============================================
// A/B TESTING
// ============================================

/**
 * Define an experiment
 * @param {string} experimentId - Experiment ID
 * @param {string[]} variants - Variant names
 */
function defineExperiment(experimentId, variants) {
    experiments.set(experimentId, {
        id: experimentId,
        variants,
        assignments: new Map(),
        metrics: variants.reduce((acc, v) => {
            acc[v] = { users: 0, conversions: 0, totalValue: 0 };
            return acc;
        }, {})
    });
}

/**
 * Get variant for user
 * @param {string} experimentId - Experiment ID
 * @param {string} userId - User ID
 * @returns {string|null}
 */
function getVariant(experimentId, userId) {
    const experiment = experiments.get(experimentId);
    if (!experiment) return null;

    // Check existing assignment
    if (experiment.assignments.has(userId)) {
        return experiment.assignments.get(userId);
    }

    // Assign variant deterministically based on user ID
    const hash = crypto.createHash('md5').update(userId + experimentId).digest('hex');
    const variantIndex = parseInt(hash.slice(0, 8), 16) % experiment.variants.length;
    const variant = experiment.variants[variantIndex];

    experiment.assignments.set(userId, variant);
    experiment.metrics[variant].users++;

    return variant;
}

/**
 * Track experiment conversion
 * @param {Object} experimentData - Experiment data
 * @param {string} eventType - Conversion event
 * @param {Object} data - Event data
 */
function trackExperiment(experimentData, eventType, data) {
    const { experimentId, variant, conversionEvent, conversionValue } = experimentData;
    const experiment = experiments.get(experimentId);

    if (!experiment || !experiment.metrics[variant]) return;

    if (eventType === conversionEvent) {
        experiment.metrics[variant].conversions++;
        experiment.metrics[variant].totalValue += conversionValue || 1;
    }
}

/**
 * Get experiment results
 * @param {string} experimentId - Experiment ID
 * @returns {Object}
 */
function getExperimentResults(experimentId) {
    const experiment = experiments.get(experimentId);

    if (!experiment) {
        return { found: false };
    }

    const results = {};
    let controlRate = null;

    for (const [variant, data] of Object.entries(experiment.metrics)) {
        const conversionRate = data.users > 0
            ? (data.conversions / data.users)
            : 0;

        results[variant] = {
            users: data.users,
            conversions: data.conversions,
            conversionRate: (conversionRate * 100).toFixed(2) + '%',
            avgValue: data.conversions > 0
                ? (data.totalValue / data.conversions).toFixed(2)
                : '0'
        };

        if (variant === experiment.variants[0]) {
            controlRate = conversionRate;
        } else if (controlRate !== null && controlRate > 0) {
            results[variant].lift = (((conversionRate - controlRate) / controlRate) * 100).toFixed(1) + '%';
        }
    }

    return {
        found: true,
        experimentId,
        variants: experiment.variants,
        results
    };
}

// ============================================
// HELPER FUNCTIONS
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
 * Hash user ID for privacy
 * @param {string} wallet - Wallet address
 * @returns {string}
 */
function hashUserId(wallet) {
    return crypto.createHash('sha256')
        .update(wallet + 'salt_analytics')
        .digest('hex')
        .substring(0, 16);
}

/**
 * Hash user agent for grouping
 * @param {string} userAgent - User agent string
 * @returns {string}
 */
function hashUserAgent(userAgent) {
    // Extract browser/platform info only
    const simplified = userAgent
        .replace(/\d+(\.\d+)*/g, 'X')  // Remove versions
        .substring(0, 50);
    return crypto.createHash('md5').update(simplified).digest('hex').substring(0, 8);
}

/**
 * Sanitize metadata (remove sensitive data)
 * @param {Object} metadata - Raw metadata
 * @returns {Object}
 */
function sanitizeMetadata(metadata) {
    const allowed = ['platform', 'gameType', 'duration', 'score', 'level', 'referrer'];
    const sanitized = {};

    for (const key of allowed) {
        if (metadata[key] !== undefined) {
            sanitized[key] = metadata[key];
        }
    }

    return sanitized;
}

/**
 * Update session statistics
 * @param {Object} sessionData - Session data
 */
function updateSessionStats(sessionData) {
    const n = stats.totalEvents;

    if (sessionData.duration) {
        stats.avgSessionDuration =
            ((stats.avgSessionDuration * (n - 1)) + sessionData.duration) / n;
    }

    if (sessionData.gamesPlayed !== undefined) {
        stats.avgGamesPerSession =
            ((stats.avgGamesPerSession * (n - 1)) + sessionData.gamesPlayed) / n;
    }
}

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * Get realtime dashboard data
 * @returns {Object}
 */
function getRealtimeDashboard() {
    const now = Date.now();
    const windowKey = getWindowKey(now, 'realtime');
    const currentWindow = metrics.realtime.get(windowKey);

    if (!currentWindow) {
        return {
            activeUsers: 0,
            eventsLast5Min: 0,
            topGames: [],
            topEvents: []
        };
    }

    // Top games
    const topGames = Array.from(currentWindow.byGame.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([game, count]) => ({ game, count }));

    // Top events
    const topEvents = Array.from(currentWindow.byType.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

    return {
        activeUsers: currentWindow.uniqueUsers.size,
        eventsLast5Min: currentWindow.events,
        topGames,
        topEvents
    };
}

/**
 * Get game dashboard data
 * @param {string} gameType - Game type
 * @returns {Object}
 */
function getGameDashboard(gameType) {
    const data = gameMetrics.get(gameType);

    if (!data) {
        return { found: false };
    }

    // Convert score distribution to array
    const distribution = Array.from(data.scoreDistribution.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([bucket, count]) => ({
            range: `${bucket}-${bucket + 99}`,
            count
        }));

    return {
        found: true,
        gameType,
        totalPlays: data.totalPlays,
        avgScore: Math.round(data.avgScore),
        maxScore: data.maxScore,
        avgDuration: `${Math.round(data.avgDuration / 1000)}s`,
        scoreDistribution: distribution
    };
}

/**
 * Get analytics statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...stats,
        uniqueUsersTracked: userActivity.size,
        gamesTracked: gameMetrics.size,
        activeFunnels: funnels.size,
        activeExperiments: experiments.size,
        avgSessionDuration: `${Math.round(stats.avgSessionDuration / 1000)}s`,
        avgGamesPerSession: stats.avgGamesPerSession.toFixed(1)
    };
}

// ============================================
// CLEANUP
// ============================================

// Aggregate and cleanup periodically
setInterval(() => {
    // Update daily counters
    const today = new Date().toISOString().split('T')[0];
    let dailyEvents = 0;
    const dailyUsers = new Set();

    for (const event of eventBuffer) {
        if (new Date(event.timestamp).toISOString().split('T')[0] === today) {
            dailyEvents++;
            if (event.userId) {
                dailyUsers.add(event.userId);
            }
        }
    }

    stats.eventsToday = dailyEvents;
    stats.uniqueUsersToday = dailyUsers.size;

    // Cleanup old windows
    for (const windowType of ['realtime', 'hourly', 'daily', 'weekly']) {
        cleanupOldWindows(windowType);
    }
}, 60 * 1000);  // Every minute

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Event tracking
    trackEvent,
    trackSessionStart,
    trackSessionEnd,
    trackGameEvent,

    // Funnels
    defineFunnel,
    getFunnelAnalysis,

    // Experiments
    defineExperiment,
    getVariant,
    getExperimentResults,

    // Dashboards
    getRealtimeDashboard,
    getGameDashboard,
    getCohortRetention,
    calculateRetention,

    // Stats
    getStats,

    // Types
    EVENT_TYPES,

    // Config
    ANALYTICS_CONFIG
};
