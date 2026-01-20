/**
 * ASDF API - WebSocket Broadcast Manager
 *
 * Central coordinator bridging eventBus with WebSocket broadcasts.
 * Inspired by Vibecraft's unified broadcast architecture.
 *
 * Architecture:
 *   eventBus.publish() -> wsBroadcast -> realtimeNotifications -> Clients
 *
 * Philosophy: Fibonacci timing for batching, phi ratios for backpressure
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Event filtering (no sensitive data broadcasted)
 * - Rate limiting per channel
 * - Payload size limits
 * - Audit trail
 */

'use strict';

const { EVENTS, subscribe, getEventHistory } = require('./eventBus');
const notifications = require('./realtimeNotifications');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const BROADCAST_CONFIG = {
    // Batch events before broadcasting (Fibonacci ms)
    batchInterval: 89,  // ~fib(11)

    // Max events per batch
    maxBatchSize: 21,  // fib(8)

    // Rate limits per channel (events/minute)
    channelRateLimits: {
        burns: 100,
        leaderboard: 30,
        global: 60,
        games: 200
    },

    // Payload size limit (bytes)
    maxPayloadSize: 16 * 1024,  // 16KB

    // Enable/disable channels
    enabledChannels: {
        burns: true,
        leaderboard: true,
        global: true,
        games: true,
        events: true
    },

    // Debug mode
    debug: process.env.NODE_ENV !== 'production'
};

// ============================================
// CHANNEL DEFINITIONS
// ============================================

/**
 * Channel -> eventBus event mappings
 * Defines which eventBus events route to which WebSocket channels
 */
const CHANNEL_MAPPINGS = {
    // Burns channel
    burns: [
        EVENTS.BURN_INITIATED,
        EVENTS.BURN_CONFIRMED,
        EVENTS.BURN_FAILED
    ],

    // Leaderboard channel
    leaderboard: [
        EVENTS.HIGH_SCORE,
        EVENTS.USER_TIER_CHANGED
    ],

    // Games channel
    games: [
        EVENTS.GAME_STARTED,
        EVENTS.GAME_COMPLETED,
        EVENTS.HIGH_SCORE
    ],

    // Global channel (system-wide)
    global: [
        EVENTS.WEBHOOK_RECEIVED,
        EVENTS.ERROR_OCCURRED
    ],

    // Events channel (achievements, streaks)
    events: [
        EVENTS.ACHIEVEMENT_UNLOCKED,
        EVENTS.STREAK_UPDATED,
        EVENTS.PURCHASE_COMPLETED,
        EVENTS.REFERRAL_COMPLETED,
        EVENTS.REFERRAL_MILESTONE
    ]
};

// Reverse mapping: event -> channels
const EVENT_TO_CHANNELS = new Map();

// ============================================
// STATE
// ============================================

// Subscription handles for cleanup
const subscriptionHandles = [];

// Event batches per channel
const eventBatches = new Map();

// Rate limiting per channel
const channelRateLimits = new Map();

// Statistics
const stats = {
    eventsReceived: 0,
    eventsBroadcasted: 0,
    eventsDropped: 0,
    batchesSent: 0,
    errors: 0,
    startedAt: null
};

// Batch flush timer
let batchTimer = null;

// Initialized flag
let initialized = false;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the broadcast manager
 * Subscribes to eventBus events and sets up routing
 *
 * @returns {Object} Broadcast manager instance
 */
function initialize() {
    if (initialized) {
        console.warn('[wsBroadcast] Already initialized');
        return getBroadcastManager();
    }

    console.log('[wsBroadcast] Initializing broadcast manager...');

    // Build reverse mapping
    buildEventToChannelsMap();

    // Subscribe to all mapped events
    subscribeToEvents();

    // Start batch processor
    startBatchProcessor();

    // Initialize rate limiters
    initializeRateLimiters();

    stats.startedAt = Date.now();
    initialized = true;

    console.log('[wsBroadcast] Broadcast manager initialized');
    console.log(`[wsBroadcast] Listening to ${subscriptionHandles.length} event types`);

    return getBroadcastManager();
}

/**
 * Build reverse mapping from events to channels
 */
function buildEventToChannelsMap() {
    EVENT_TO_CHANNELS.clear();

    for (const [channel, events] of Object.entries(CHANNEL_MAPPINGS)) {
        for (const event of events) {
            if (!EVENT_TO_CHANNELS.has(event)) {
                EVENT_TO_CHANNELS.set(event, new Set());
            }
            EVENT_TO_CHANNELS.get(event).add(channel);
        }
    }

    if (BROADCAST_CONFIG.debug) {
        console.log('[wsBroadcast] Event->Channel mappings:',
            Object.fromEntries(
                Array.from(EVENT_TO_CHANNELS.entries())
                    .map(([k, v]) => [k, Array.from(v)])
            )
        );
    }
}

/**
 * Subscribe to all eventBus events that need broadcasting
 */
function subscribeToEvents() {
    // Get unique events from all channels
    const allEvents = new Set();
    for (const events of Object.values(CHANNEL_MAPPINGS)) {
        events.forEach(e => allEvents.add(e));
    }

    // Subscribe to each event
    for (const eventType of allEvents) {
        const handle = subscribe(eventType, (event) => handleEvent(event), {
            priority: 5  // Medium priority - after core handlers
        });
        subscriptionHandles.push(handle);
    }
}

/**
 * Initialize rate limiters for each channel
 */
function initializeRateLimiters() {
    for (const [channel, limit] of Object.entries(BROADCAST_CONFIG.channelRateLimits)) {
        channelRateLimits.set(channel, {
            count: 0,
            windowStart: Date.now(),
            limit
        });
    }
}

/**
 * Start the batch processor
 */
function startBatchProcessor() {
    if (batchTimer) {
        clearInterval(batchTimer);
    }

    batchTimer = setInterval(() => {
        flushAllBatches();
    }, BROADCAST_CONFIG.batchInterval);
}

// ============================================
// EVENT HANDLING
// ============================================

/**
 * Handle incoming event from eventBus
 * @param {Object} event - Event object from eventBus
 */
function handleEvent(event) {
    stats.eventsReceived++;

    // Get target channels for this event
    const channels = EVENT_TO_CHANNELS.get(event.type);
    if (!channels || channels.size === 0) {
        return;
    }

    // Transform event for broadcast
    const broadcastPayload = transformEventForBroadcast(event);
    if (!broadcastPayload) {
        stats.eventsDropped++;
        return;
    }

    // Add to batches for each channel
    for (const channel of channels) {
        if (!BROADCAST_CONFIG.enabledChannels[channel]) {
            continue;
        }

        // Check rate limit
        if (!checkChannelRateLimit(channel)) {
            stats.eventsDropped++;
            if (BROADCAST_CONFIG.debug) {
                console.log(`[wsBroadcast] Rate limited: ${channel}`);
            }
            continue;
        }

        // Add to batch
        addToBatch(channel, broadcastPayload);
    }
}

/**
 * Transform eventBus event for WebSocket broadcast
 * Removes sensitive data, adds broadcast metadata
 *
 * @param {Object} event - Raw event
 * @returns {Object|null} Transformed payload or null if should not broadcast
 */
function transformEventForBroadcast(event) {
    // Don't broadcast errors or rate limit events to clients
    if (event.type === EVENTS.ERROR_OCCURRED || event.type === EVENTS.RATE_LIMIT_HIT) {
        return null;
    }

    const payload = {
        event: event.type,
        data: sanitizeData(event.data),
        timestamp: event.timestamp || Date.now(),
        id: event.id
    };

    // Check payload size
    const payloadStr = JSON.stringify(payload);
    if (payloadStr.length > BROADCAST_CONFIG.maxPayloadSize) {
        console.warn(`[wsBroadcast] Payload too large for ${event.type}: ${payloadStr.length} bytes`);
        stats.eventsDropped++;
        return null;
    }

    return payload;
}

/**
 * Sanitize data for broadcast (remove sensitive fields)
 * @param {Object} data - Raw data
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sanitized = { ...data };

    // Fields that should never be broadcasted
    const sensitiveFields = [
        'privateKey', 'secret', 'password', 'token',
        'signature', 'nonce', 'challenge', 'ip'
    ];

    for (const field of sensitiveFields) {
        if (field in sanitized) {
            delete sanitized[field];
        }
    }

    return sanitized;
}

// ============================================
// BATCHING
// ============================================

/**
 * Add event to channel batch
 * @param {string} channel - Channel name
 * @param {Object} payload - Event payload
 */
function addToBatch(channel, payload) {
    if (!eventBatches.has(channel)) {
        eventBatches.set(channel, []);
    }

    const batch = eventBatches.get(channel);
    batch.push(payload);

    // Flush immediately if batch is full
    if (batch.length >= BROADCAST_CONFIG.maxBatchSize) {
        flushBatch(channel);
    }
}

/**
 * Flush a single channel's batch
 * @param {string} channel - Channel name
 */
function flushBatch(channel) {
    const batch = eventBatches.get(channel);
    if (!batch || batch.length === 0) {
        return;
    }

    // Clear batch first (in case broadcast is slow)
    eventBatches.set(channel, []);

    // Map channel name to notifications channel
    const notificationChannel = mapToNotificationChannel(channel);

    // Broadcast
    try {
        if (batch.length === 1) {
            // Single event - send directly
            notifications.broadcastToChannel(notificationChannel, {
                type: 'broadcast',
                channel,
                payload: batch[0]
            });
        } else {
            // Multiple events - send as batch
            notifications.broadcastToChannel(notificationChannel, {
                type: 'broadcast_batch',
                channel,
                payloads: batch,
                count: batch.length
            });
        }

        stats.eventsBroadcasted += batch.length;
        stats.batchesSent++;

        if (BROADCAST_CONFIG.debug) {
            console.log(`[wsBroadcast] Flushed ${batch.length} events to ${channel}`);
        }
    } catch (error) {
        console.error(`[wsBroadcast] Broadcast error for ${channel}:`, error.message);
        stats.errors++;
    }
}

/**
 * Flush all channel batches
 */
function flushAllBatches() {
    for (const channel of eventBatches.keys()) {
        flushBatch(channel);
    }
}

/**
 * Map internal channel name to realtimeNotifications channel
 * @param {string} channel - Internal channel name
 * @returns {string} Notification channel name
 */
function mapToNotificationChannel(channel) {
    const mapping = {
        burns: notifications.CHANNELS.BURNS,
        leaderboard: notifications.CHANNELS.LEADERBOARD,
        global: notifications.CHANNELS.GLOBAL,
        games: notifications.CHANNELS.GLOBAL,  // Games go to global for now
        events: notifications.CHANNELS.EVENTS
    };

    return mapping[channel] || notifications.CHANNELS.GLOBAL;
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check if channel is within rate limit
 * @param {string} channel - Channel name
 * @returns {boolean}
 */
function checkChannelRateLimit(channel) {
    const limiter = channelRateLimits.get(channel);
    if (!limiter) {
        return true;  // No limit configured
    }

    const now = Date.now();

    // Reset window if expired (1 minute)
    if (now - limiter.windowStart > 60000) {
        limiter.count = 0;
        limiter.windowStart = now;
    }

    // Check limit
    if (limiter.count >= limiter.limit) {
        return false;
    }

    limiter.count++;
    return true;
}

// ============================================
// DIRECT BROADCAST API
// ============================================

/**
 * Broadcast directly to a channel (bypass eventBus)
 * Use sparingly - prefer eventBus.publish() for most cases
 *
 * @param {string} channel - Channel name
 * @param {Object} payload - Data to broadcast
 * @returns {boolean} Success
 */
function broadcast(channel, payload) {
    if (!initialized) {
        console.warn('[wsBroadcast] Not initialized, call initialize() first');
        return false;
    }

    if (!BROADCAST_CONFIG.enabledChannels[channel]) {
        return false;
    }

    if (!checkChannelRateLimit(channel)) {
        stats.eventsDropped++;
        return false;
    }

    const sanitizedPayload = {
        event: 'direct_broadcast',
        data: sanitizeData(payload),
        timestamp: Date.now()
    };

    addToBatch(channel, sanitizedPayload);
    return true;
}

/**
 * Broadcast immediately (no batching)
 * Use for time-critical updates
 *
 * @param {string} channel - Channel name
 * @param {Object} payload - Data to broadcast
 * @returns {number} Number of clients reached
 */
function broadcastImmediate(channel, payload) {
    if (!initialized) {
        console.warn('[wsBroadcast] Not initialized');
        return 0;
    }

    const notificationChannel = mapToNotificationChannel(channel);

    try {
        const sent = notifications.broadcastToChannel(notificationChannel, {
            type: 'broadcast',
            channel,
            payload: sanitizeData(payload),
            timestamp: Date.now(),
            immediate: true
        });

        stats.eventsBroadcasted++;
        return sent;
    } catch (error) {
        console.error('[wsBroadcast] Immediate broadcast error:', error.message);
        stats.errors++;
        return 0;
    }
}

/**
 * Broadcast burn event (convenience method)
 * @param {Object} burnData - Burn data
 */
function broadcastBurn(burnData) {
    return broadcast('burns', {
        type: 'burn',
        wallet: burnData.wallet ?
            burnData.wallet.slice(0, 4) + '...' + burnData.wallet.slice(-4) :
            'unknown',
        amount: burnData.amount,
        signature: burnData.signature?.slice(0, 8)
    });
}

/**
 * Broadcast leaderboard update (convenience method)
 * @param {string} leaderboardType - Type of leaderboard
 * @param {Array} topPlayers - Top players array
 */
function broadcastLeaderboard(leaderboardType, topPlayers) {
    return broadcast('leaderboard', {
        type: 'leaderboard_update',
        leaderboard: leaderboardType,
        top: topPlayers.slice(0, 10).map((p, i) => ({
            rank: i + 1,
            wallet: p.wallet ? p.wallet.slice(0, 4) + '...' + p.wallet.slice(-4) : 'anon',
            score: p.score
        })),
        updatedAt: Date.now()
    });
}

/**
 * Broadcast game event (convenience method)
 * @param {string} eventType - Game event type
 * @param {Object} gameData - Game data
 */
function broadcastGame(eventType, gameData) {
    return broadcast('games', {
        type: eventType,
        game: gameData.gameType,
        wallet: gameData.wallet ?
            gameData.wallet.slice(0, 4) + '...' + gameData.wallet.slice(-4) :
            'anon',
        score: gameData.score,
        achievement: gameData.achievement
    });
}

// ============================================
// METRICS & MANAGEMENT
// ============================================

/**
 * Get broadcast manager statistics
 * @returns {Object}
 */
function getStats() {
    const channelStats = {};
    for (const [channel, limiter] of channelRateLimits.entries()) {
        channelStats[channel] = {
            eventsThisMinute: limiter.count,
            limit: limiter.limit
        };
    }

    const pendingEvents = {};
    for (const [channel, batch] of eventBatches.entries()) {
        if (batch.length > 0) {
            pendingEvents[channel] = batch.length;
        }
    }

    return {
        ...stats,
        uptime: stats.startedAt ? Date.now() - stats.startedAt : 0,
        channelStats,
        pendingEvents,
        subscriptions: subscriptionHandles.length,
        config: {
            batchInterval: BROADCAST_CONFIG.batchInterval,
            maxBatchSize: BROADCAST_CONFIG.maxBatchSize,
            enabledChannels: BROADCAST_CONFIG.enabledChannels
        }
    };
}

/**
 * Enable/disable a channel
 * @param {string} channel - Channel name
 * @param {boolean} enabled - Enable state
 */
function setChannelEnabled(channel, enabled) {
    if (channel in BROADCAST_CONFIG.enabledChannels) {
        BROADCAST_CONFIG.enabledChannels[channel] = enabled;
        logAudit('ws_channel_toggle', { channel, enabled });
    }
}

/**
 * Get broadcast manager instance
 * @returns {Object}
 */
function getBroadcastManager() {
    return {
        broadcast,
        broadcastImmediate,
        broadcastBurn,
        broadcastLeaderboard,
        broadcastGame,
        getStats,
        setChannelEnabled,
        flush: flushAllBatches
    };
}

/**
 * Shutdown broadcast manager
 */
function shutdown() {
    console.log('[wsBroadcast] Shutting down...');

    // Stop batch processor
    if (batchTimer) {
        clearInterval(batchTimer);
        batchTimer = null;
    }

    // Flush remaining batches
    flushAllBatches();

    // Unsubscribe from all events
    for (const handle of subscriptionHandles) {
        handle.unsubscribe();
    }
    subscriptionHandles.length = 0;

    // Clear state
    eventBatches.clear();
    channelRateLimits.clear();

    initialized = false;

    console.log('[wsBroadcast] Shutdown complete');
    logAudit('ws_broadcast_shutdown', { stats });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Lifecycle
    initialize,
    shutdown,

    // Direct broadcast API
    broadcast,
    broadcastImmediate,

    // Convenience methods
    broadcastBurn,
    broadcastLeaderboard,
    broadcastGame,

    // Management
    getStats,
    setChannelEnabled,
    flush: flushAllBatches,

    // For testing
    getBroadcastManager,

    // Constants
    CHANNEL_MAPPINGS,
    BROADCAST_CONFIG
};
