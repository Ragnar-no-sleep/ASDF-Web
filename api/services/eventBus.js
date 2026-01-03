/**
 * ASDF API - Internal Event Bus
 *
 * Decoupled event-driven architecture:
 * - Publish/subscribe pattern
 * - Event history for debugging
 * - Async event handlers
 * - Error isolation
 *
 * Security by Design:
 * - No sensitive data in events
 * - Handler error isolation
 * - Event rate limiting
 * - Audit trail
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const EVENT_CONFIG = {
    // Max handlers per event
    maxHandlersPerEvent: 21,

    // Event history size
    historySize: 100,

    // Handler timeout (ms)
    handlerTimeout: 5000,

    // Rate limiting
    maxEventsPerSecond: 100,

    // Debug mode
    debug: process.env.NODE_ENV !== 'production'
};

// ============================================
// EVENT TYPES
// ============================================

const EVENTS = {
    // User lifecycle
    USER_CREATED: 'user:created',
    USER_AUTHENTICATED: 'user:authenticated',
    USER_TIER_CHANGED: 'user:tier_changed',

    // Burns
    BURN_INITIATED: 'burn:initiated',
    BURN_CONFIRMED: 'burn:confirmed',
    BURN_FAILED: 'burn:failed',

    // Shop
    PURCHASE_INITIATED: 'purchase:initiated',
    PURCHASE_COMPLETED: 'purchase:completed',
    ITEM_EQUIPPED: 'item:equipped',

    // Games
    GAME_STARTED: 'game:started',
    GAME_COMPLETED: 'game:completed',
    HIGH_SCORE: 'game:high_score',

    // Achievements
    ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
    STREAK_UPDATED: 'streak:updated',

    // Referrals
    REFERRAL_COMPLETED: 'referral:completed',
    REFERRAL_MILESTONE: 'referral:milestone',

    // System
    WEBHOOK_RECEIVED: 'webhook:received',
    ERROR_OCCURRED: 'error:occurred',
    RATE_LIMIT_HIT: 'rate_limit:hit'
};

// ============================================
// EVENT BUS CORE
// ============================================

// Event handlers: eventType -> Set of handlers
const handlers = new Map();

// Event history for debugging
const eventHistory = [];

// Rate limiting
let eventsThisSecond = 0;
let secondStart = Date.now();

/**
 * Subscribe to an event
 * @param {string} eventType - Event type to subscribe to
 * @param {Function} handler - Handler function
 * @param {Object} options - Handler options
 * @returns {{unsubscribe: Function}}
 */
function subscribe(eventType, handler, options = {}) {
    if (typeof handler !== 'function') {
        throw new Error('Handler must be a function');
    }

    // Get or create handler set
    let eventHandlers = handlers.get(eventType);
    if (!eventHandlers) {
        eventHandlers = new Set();
        handlers.set(eventType, eventHandlers);
    }

    // Check max handlers
    if (eventHandlers.size >= EVENT_CONFIG.maxHandlersPerEvent) {
        throw new Error(`Max handlers reached for event: ${eventType}`);
    }

    // Create handler wrapper
    const wrappedHandler = {
        fn: handler,
        priority: options.priority || 0,
        once: options.once || false,
        id: generateHandlerId()
    };

    eventHandlers.add(wrappedHandler);

    if (EVENT_CONFIG.debug) {
        console.log(`[EventBus] Subscribed to ${eventType} (${eventHandlers.size} handlers)`);
    }

    // Return unsubscribe function
    return {
        unsubscribe: () => {
            eventHandlers.delete(wrappedHandler);
            if (EVENT_CONFIG.debug) {
                console.log(`[EventBus] Unsubscribed from ${eventType}`);
            }
        }
    };
}

/**
 * Subscribe to an event (one-time)
 * @param {string} eventType - Event type
 * @param {Function} handler - Handler function
 * @returns {{unsubscribe: Function}}
 */
function once(eventType, handler) {
    return subscribe(eventType, handler, { once: true });
}

/**
 * Publish an event
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @returns {Promise<{success: boolean, handlerResults: Array}>}
 */
async function publish(eventType, data = {}) {
    // Rate limiting
    const now = Date.now();
    if (now - secondStart > 1000) {
        eventsThisSecond = 0;
        secondStart = now;
    }

    if (eventsThisSecond >= EVENT_CONFIG.maxEventsPerSecond) {
        logAudit('event_rate_limited', { eventType });
        return { success: false, error: 'Rate limit exceeded' };
    }
    eventsThisSecond++;

    // Create event object
    const event = {
        type: eventType,
        data: sanitizeEventData(data),
        timestamp: now,
        id: generateEventId()
    };

    // Record in history
    recordEvent(event);

    // Get handlers
    const eventHandlers = handlers.get(eventType);
    if (!eventHandlers || eventHandlers.size === 0) {
        if (EVENT_CONFIG.debug) {
            console.log(`[EventBus] No handlers for ${eventType}`);
        }
        return { success: true, handlerResults: [] };
    }

    // Sort by priority (higher first)
    const sortedHandlers = Array.from(eventHandlers)
        .sort((a, b) => b.priority - a.priority);

    // Execute handlers
    const results = [];
    const toRemove = [];

    for (const handler of sortedHandlers) {
        try {
            const result = await executeHandler(handler, event);
            results.push({ handlerId: handler.id, success: true, result });

            // Mark once handlers for removal
            if (handler.once) {
                toRemove.push(handler);
            }
        } catch (error) {
            console.error(`[EventBus] Handler error for ${eventType}:`, error.message);
            results.push({ handlerId: handler.id, success: false, error: error.message });

            // Don't let one handler error affect others
            logAudit('event_handler_error', {
                eventType,
                error: error.message
            });
        }
    }

    // Remove once handlers
    for (const handler of toRemove) {
        eventHandlers.delete(handler);
    }

    if (EVENT_CONFIG.debug) {
        console.log(`[EventBus] Published ${eventType} to ${sortedHandlers.length} handlers`);
    }

    return { success: true, handlerResults: results };
}

/**
 * Execute a handler with timeout
 * @param {Object} handler - Handler object
 * @param {Object} event - Event object
 * @returns {Promise<any>}
 */
async function executeHandler(handler, event) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Handler timeout'));
        }, EVENT_CONFIG.handlerTimeout);

        Promise.resolve(handler.fn(event))
            .then(result => {
                clearTimeout(timeout);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate unique handler ID
 * @returns {string}
 */
function generateHandlerId() {
    return `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate unique event ID
 * @returns {string}
 */
function generateEventId() {
    return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sanitize event data (remove sensitive info)
 * @param {Object} data - Event data
 * @returns {Object}
 */
function sanitizeEventData(data) {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };

    // Remove or mask sensitive fields
    const sensitiveFields = ['privateKey', 'secret', 'password', 'token', 'signature'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    // Mask wallet addresses
    if (sanitized.wallet && typeof sanitized.wallet === 'string') {
        sanitized.wallet = sanitized.wallet.slice(0, 4) + '...' + sanitized.wallet.slice(-4);
    }

    return sanitized;
}

/**
 * Record event in history
 * @param {Object} event - Event to record
 */
function recordEvent(event) {
    eventHistory.push({
        ...event,
        recordedAt: Date.now()
    });

    // Keep history bounded
    if (eventHistory.length > EVENT_CONFIG.historySize) {
        eventHistory.shift();
    }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get event history
 * @param {Object} options - Query options
 * @returns {Object[]}
 */
function getEventHistory(options = {}) {
    const {
        limit = 50,
        eventType = null,
        since = null
    } = options;

    let filtered = eventHistory;

    if (eventType) {
        filtered = filtered.filter(e => e.type === eventType);
    }

    if (since) {
        filtered = filtered.filter(e => e.timestamp >= since);
    }

    return filtered.slice(-limit).reverse();
}

/**
 * Get handler count for event type
 * @param {string} eventType - Event type
 * @returns {number}
 */
function getHandlerCount(eventType) {
    const eventHandlers = handlers.get(eventType);
    return eventHandlers ? eventHandlers.size : 0;
}

/**
 * Get all registered event types
 * @returns {string[]}
 */
function getRegisteredEvents() {
    return Array.from(handlers.keys());
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Emit user created event
 * @param {string} wallet - User wallet
 * @param {Object} data - Additional data
 */
function emitUserCreated(wallet, data = {}) {
    return publish(EVENTS.USER_CREATED, { wallet, ...data });
}

/**
 * Emit burn confirmed event
 * @param {string} wallet - User wallet
 * @param {number} amount - Burn amount
 * @param {string} signature - Transaction signature
 */
function emitBurnConfirmed(wallet, amount, signature) {
    return publish(EVENTS.BURN_CONFIRMED, { wallet, amount, signature });
}

/**
 * Emit achievement unlocked event
 * @param {string} wallet - User wallet
 * @param {Object} achievement - Achievement data
 */
function emitAchievementUnlocked(wallet, achievement) {
    return publish(EVENTS.ACHIEVEMENT_UNLOCKED, {
        wallet,
        achievementId: achievement.id,
        name: achievement.name,
        rarity: achievement.rarity
    });
}

/**
 * Emit game completed event
 * @param {string} wallet - User wallet
 * @param {string} gameType - Game type
 * @param {number} score - Final score
 */
function emitGameCompleted(wallet, gameType, score) {
    return publish(EVENTS.GAME_COMPLETED, { wallet, gameType, score });
}

/**
 * Emit purchase completed event
 * @param {string} wallet - User wallet
 * @param {string} itemId - Item ID
 * @param {number} price - Purchase price
 */
function emitPurchaseCompleted(wallet, itemId, price) {
    return publish(EVENTS.PURCHASE_COMPLETED, { wallet, itemId, price });
}

/**
 * Emit referral completed event
 * @param {string} referrer - Referrer wallet
 * @param {string} referee - Referee wallet
 * @param {Object} rewards - Rewards data
 */
function emitReferralCompleted(referrer, referee, rewards) {
    return publish(EVENTS.REFERRAL_COMPLETED, { referrer, referee, rewards });
}

// ============================================
// METRICS
// ============================================

/**
 * Get event bus metrics
 * @returns {Object}
 */
function getEventBusMetrics() {
    const handlerCounts = {};
    for (const [eventType, eventHandlers] of handlers.entries()) {
        handlerCounts[eventType] = eventHandlers.size;
    }

    // Count events by type in history
    const eventCounts = {};
    for (const event of eventHistory) {
        eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    }

    return {
        registeredEvents: handlers.size,
        totalHandlers: Array.from(handlers.values())
            .reduce((sum, set) => sum + set.size, 0),
        handlerCounts,
        historySize: eventHistory.length,
        recentEventCounts: eventCounts,
        eventsPerSecond: eventsThisSecond,
        config: EVENT_CONFIG
    };
}

/**
 * Clear all handlers (for testing)
 */
function clearAllHandlers() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot clear handlers in production');
    }

    handlers.clear();
    console.log('[EventBus] All handlers cleared');
}

module.exports = {
    // Event types
    EVENTS,

    // Core
    subscribe,
    once,
    publish,

    // Queries
    getEventHistory,
    getHandlerCount,
    getRegisteredEvents,

    // Convenience
    emitUserCreated,
    emitBurnConfirmed,
    emitAchievementUnlocked,
    emitGameCompleted,
    emitPurchaseCompleted,
    emitReferralCompleted,

    // Metrics
    getEventBusMetrics,

    // Testing
    clearAllHandlers
};
