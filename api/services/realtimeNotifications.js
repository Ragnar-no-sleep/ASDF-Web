/**
 * ASDF API - Real-time Notification Service
 *
 * WebSocket-based notification system:
 * - Achievement notifications
 * - Leaderboard updates
 * - Burn feed (global ticker)
 * - System events
 * - Personal notifications
 *
 * Philosophy: Fibonacci reconnect backoff
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - JWT authentication
 * - Rate limiting per connection
 * - Message size limits
 * - Heartbeat monitoring
 */

'use strict';

const WebSocket = require('ws');
const crypto = require('crypto');
const { getStorage, keys } = require('./storage');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const WS_CONFIG = {
    // Server settings
    path: '/ws/notifications',
    maxPayloadSize: 64 * 1024,  // 64KB

    // Connection limits
    maxConnectionsPerWallet: 3,
    maxTotalConnections: 10000,

    // Heartbeat (Fibonacci: 13, 21 seconds)
    heartbeatInterval: 21000,
    heartbeatTimeout: 13000,

    // Rate limiting
    maxMessagesPerMinute: 60,
    maxSubscriptionsPerConnection: 20,

    // Reconnect backoff (Fibonacci)
    reconnectBackoff: [1000, 1000, 2000, 3000, 5000, 8000, 13000],

    // Message types
    messageTypes: {
        // Client -> Server
        SUBSCRIBE: 'subscribe',
        UNSUBSCRIBE: 'unsubscribe',
        PING: 'ping',
        ACK: 'ack',

        // Server -> Client
        NOTIFICATION: 'notification',
        PONG: 'pong',
        ERROR: 'error',
        SUBSCRIBED: 'subscribed',
        UNSUBSCRIBED: 'unsubscribed'
    }
};

// Notification types
const NOTIFICATION_TYPES = {
    // Personal
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    LEVEL_UP: 'level_up',
    TIER_UP: 'tier_up',
    RANK_CHANGE: 'rank_change',
    STREAK_MILESTONE: 'streak_milestone',
    REWARD_RECEIVED: 'reward_received',

    // Social
    OVERTAKEN: 'overtaken',           // Someone passed you
    MENTIONED: 'mentioned',            // Tagged in chat
    FRIEND_ACHIEVEMENT: 'friend_achievement',

    // Global
    BURN_CONFIRMED: 'burn_confirmed',
    WHALE_BURN: 'whale_burn',          // Large burn (>1M)
    LEADERBOARD_UPDATE: 'leaderboard_update',

    // System
    MAINTENANCE: 'maintenance',
    EVENT_START: 'event_start',
    EVENT_END: 'event_end',
    ANNOUNCEMENT: 'announcement'
};

// Channels
const CHANNELS = {
    PERSONAL: 'personal',     // User-specific notifications
    GLOBAL: 'global',         // All users
    BURNS: 'burns',           // Burn feed
    LEADERBOARD: 'leaderboard', // Leaderboard changes
    EVENTS: 'events'          // System events
};

// ============================================
// STATE
// ============================================

// WebSocket server instance
let wss = null;

// Connected clients by wallet
const clientsByWallet = new Map();

// All connections
const connections = new Map();

// Subscriptions
const subscriptions = new Map();  // connectionId -> Set<channel>

// Rate limiting
const rateLimits = new Map();  // connectionId -> {count, windowStart}

// Statistics
const stats = {
    totalConnections: 0,
    currentConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    notificationsSent: 0,
    errors: 0
};

// ============================================
// WEBSOCKET SERVER
// ============================================

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 * @returns {WebSocket.Server}
 */
function initialize(server) {
    wss = new WebSocket.Server({
        server,
        path: WS_CONFIG.path,
        maxPayload: WS_CONFIG.maxPayloadSize,
        verifyClient: verifyClient
    });

    wss.on('connection', handleConnection);
    wss.on('error', (error) => {
        console.error('[WS] Server error:', error.message);
        stats.errors++;
    });

    // Start heartbeat checker
    setInterval(checkHeartbeats, WS_CONFIG.heartbeatInterval);

    console.log(`[WS] Notification server initialized on ${WS_CONFIG.path}`);

    return wss;
}

/**
 * Verify client connection
 * @param {Object} info - Connection info
 * @param {Function} callback - Verification callback
 */
function verifyClient(info, callback) {
    // Check total connections limit
    if (connections.size >= WS_CONFIG.maxTotalConnections) {
        callback(false, 503, 'Server at capacity');
        return;
    }

    // Extract token from query string
    const url = new URL(info.req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
        // Allow anonymous connections for global feed
        callback(true);
        return;
    }

    // Verify JWT (simplified - should use auth service)
    try {
        const decoded = verifyToken(token);
        info.req.wallet = decoded.wallet;
        callback(true);
    } catch (error) {
        callback(false, 401, 'Invalid token');
    }
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket instance
 * @param {Object} req - HTTP request
 */
function handleConnection(ws, req) {
    const connectionId = generateConnectionId();
    const wallet = req.wallet || null;

    stats.totalConnections++;
    stats.currentConnections++;

    // Check per-wallet limit
    if (wallet) {
        const walletConnections = clientsByWallet.get(wallet) || new Set();
        if (walletConnections.size >= WS_CONFIG.maxConnectionsPerWallet) {
            ws.close(4000, 'Too many connections');
            return;
        }
        walletConnections.add(connectionId);
        clientsByWallet.set(wallet, walletConnections);
    }

    // Store connection
    const connection = {
        id: connectionId,
        ws,
        wallet,
        subscriptions: new Set(),
        lastHeartbeat: Date.now(),
        connectedAt: Date.now(),
        messagesReceived: 0,
        messagesSent: 0
    };

    connections.set(connectionId, connection);
    subscriptions.set(connectionId, new Set());

    // Auto-subscribe to global channel
    subscribe(connectionId, CHANNELS.GLOBAL);

    // Auto-subscribe to personal if authenticated
    if (wallet) {
        subscribe(connectionId, `${CHANNELS.PERSONAL}:${wallet}`);
    }

    // Set up event handlers
    ws.on('message', (data) => handleMessage(connectionId, data));
    ws.on('close', () => handleClose(connectionId));
    ws.on('error', (error) => handleError(connectionId, error));
    ws.on('pong', () => handlePong(connectionId));

    // Send welcome message
    sendToConnection(connectionId, {
        type: 'connected',
        connectionId,
        authenticated: !!wallet,
        channels: Array.from(subscriptions.get(connectionId))
    });

    logAudit('ws_connected', {
        connectionId,
        wallet: wallet ? wallet.slice(0, 8) + '...' : 'anonymous'
    });
}

/**
 * Handle incoming message
 * @param {string} connectionId - Connection ID
 * @param {Buffer} data - Message data
 */
function handleMessage(connectionId, data) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    stats.messagesReceived++;
    connection.messagesReceived++;

    // Rate limiting
    if (!checkRateLimit(connectionId)) {
        sendError(connectionId, 'Rate limit exceeded', 429);
        return;
    }

    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (error) {
        sendError(connectionId, 'Invalid JSON');
        return;
    }

    // Handle message types
    switch (message.type) {
        case WS_CONFIG.messageTypes.SUBSCRIBE:
            handleSubscribe(connectionId, message);
            break;

        case WS_CONFIG.messageTypes.UNSUBSCRIBE:
            handleUnsubscribe(connectionId, message);
            break;

        case WS_CONFIG.messageTypes.PING:
            sendToConnection(connectionId, { type: WS_CONFIG.messageTypes.PONG });
            break;

        case WS_CONFIG.messageTypes.ACK:
            handleAck(connectionId, message);
            break;

        default:
            sendError(connectionId, 'Unknown message type');
    }
}

/**
 * Handle subscribe request
 * @param {string} connectionId - Connection ID
 * @param {Object} message - Subscribe message
 */
function handleSubscribe(connectionId, message) {
    const { channel } = message;
    const connection = connections.get(connectionId);

    if (!channel) {
        sendError(connectionId, 'Channel required');
        return;
    }

    // Check subscription limit
    const subs = subscriptions.get(connectionId);
    if (subs.size >= WS_CONFIG.maxSubscriptionsPerConnection) {
        sendError(connectionId, 'Subscription limit reached');
        return;
    }

    // Validate channel access
    if (channel.startsWith(`${CHANNELS.PERSONAL}:`)) {
        const channelWallet = channel.split(':')[1];
        if (connection.wallet !== channelWallet) {
            sendError(connectionId, 'Unauthorized channel', 403);
            return;
        }
    }

    subscribe(connectionId, channel);

    sendToConnection(connectionId, {
        type: WS_CONFIG.messageTypes.SUBSCRIBED,
        channel
    });
}

/**
 * Handle unsubscribe request
 * @param {string} connectionId - Connection ID
 * @param {Object} message - Unsubscribe message
 */
function handleUnsubscribe(connectionId, message) {
    const { channel } = message;

    if (!channel) {
        sendError(connectionId, 'Channel required');
        return;
    }

    unsubscribe(connectionId, channel);

    sendToConnection(connectionId, {
        type: WS_CONFIG.messageTypes.UNSUBSCRIBED,
        channel
    });
}

/**
 * Handle acknowledgment
 * @param {string} connectionId - Connection ID
 * @param {Object} message - Ack message
 */
function handleAck(connectionId, message) {
    const { notificationId } = message;
    const connection = connections.get(connectionId);

    if (notificationId && connection.wallet) {
        // Mark notification as read in storage
        markNotificationRead(connection.wallet, notificationId);
    }
}

/**
 * Handle connection close
 * @param {string} connectionId - Connection ID
 */
function handleClose(connectionId) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    stats.currentConnections--;

    // Remove from wallet connections
    if (connection.wallet) {
        const walletConnections = clientsByWallet.get(connection.wallet);
        if (walletConnections) {
            walletConnections.delete(connectionId);
            if (walletConnections.size === 0) {
                clientsByWallet.delete(connection.wallet);
            }
        }
    }

    // Clean up subscriptions
    subscriptions.delete(connectionId);
    rateLimits.delete(connectionId);
    connections.delete(connectionId);

    logAudit('ws_disconnected', {
        connectionId,
        duration: Date.now() - connection.connectedAt
    });
}

/**
 * Handle connection error
 * @param {string} connectionId - Connection ID
 * @param {Error} error - Error
 */
function handleError(connectionId, error) {
    stats.errors++;
    console.error(`[WS] Connection ${connectionId} error:`, error.message);
}

/**
 * Handle pong response
 * @param {string} connectionId - Connection ID
 */
function handlePong(connectionId) {
    const connection = connections.get(connectionId);
    if (connection) {
        connection.lastHeartbeat = Date.now();
    }
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Subscribe connection to channel
 * @param {string} connectionId - Connection ID
 * @param {string} channel - Channel name
 */
function subscribe(connectionId, channel) {
    const subs = subscriptions.get(connectionId);
    if (subs) {
        subs.add(channel);
    }
}

/**
 * Unsubscribe connection from channel
 * @param {string} connectionId - Connection ID
 * @param {string} channel - Channel name
 */
function unsubscribe(connectionId, channel) {
    const subs = subscriptions.get(connectionId);
    if (subs) {
        subs.delete(channel);
    }
}

/**
 * Get connections subscribed to channel
 * @param {string} channel - Channel name
 * @returns {string[]}
 */
function getChannelSubscribers(channel) {
    const subscribers = [];

    for (const [connectionId, subs] of subscriptions.entries()) {
        if (subs.has(channel)) {
            subscribers.push(connectionId);
        }
    }

    return subscribers;
}

// ============================================
// NOTIFICATION DISPATCH
// ============================================

/**
 * Send notification to a specific wallet
 * @param {string} wallet - Target wallet
 * @param {Object} notification - Notification data
 * @returns {number} Number of connections notified
 */
function notifyWallet(wallet, notification) {
    const enrichedNotification = enrichNotification(notification);

    // Store notification for history
    storeNotification(wallet, enrichedNotification);

    // Send to all wallet connections
    const channel = `${CHANNELS.PERSONAL}:${wallet}`;
    return broadcastToChannel(channel, {
        type: WS_CONFIG.messageTypes.NOTIFICATION,
        notification: enrichedNotification
    });
}

/**
 * Broadcast to a channel
 * @param {string} channel - Channel name
 * @param {Object} message - Message to send
 * @returns {number} Number of connections sent to
 */
function broadcastToChannel(channel, message) {
    const subscribers = getChannelSubscribers(channel);
    let sent = 0;

    for (const connectionId of subscribers) {
        if (sendToConnection(connectionId, message)) {
            sent++;
        }
    }

    stats.notificationsSent += sent;
    return sent;
}

/**
 * Broadcast to all connections
 * @param {Object} message - Message to send
 * @returns {number}
 */
function broadcastToAll(message) {
    return broadcastToChannel(CHANNELS.GLOBAL, message);
}

/**
 * Send burn notification
 * @param {Object} burnData - Burn data
 */
function notifyBurn(burnData) {
    const notification = {
        type: NOTIFICATION_TYPES.BURN_CONFIRMED,
        data: {
            wallet: burnData.wallet.slice(0, 4) + '...' + burnData.wallet.slice(-4),
            amount: burnData.amount,
            timestamp: Date.now(),
            signature: burnData.signature?.slice(0, 8) + '...'
        }
    };

    // Broadcast to burns channel
    broadcastToChannel(CHANNELS.BURNS, {
        type: WS_CONFIG.messageTypes.NOTIFICATION,
        notification: enrichNotification(notification)
    });

    // Notify wallet owner
    notifyWallet(burnData.wallet, notification);

    // Check for whale burn
    if (burnData.amount >= 1000000) {
        broadcastToChannel(CHANNELS.GLOBAL, {
            type: WS_CONFIG.messageTypes.NOTIFICATION,
            notification: enrichNotification({
                type: NOTIFICATION_TYPES.WHALE_BURN,
                data: notification.data
            })
        });
    }
}

/**
 * Send achievement notification
 * @param {string} wallet - Wallet address
 * @param {Object} achievement - Achievement data
 */
function notifyAchievement(wallet, achievement) {
    notifyWallet(wallet, {
        type: NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
        data: {
            achievementId: achievement.id,
            name: achievement.name,
            description: achievement.description,
            rarity: achievement.rarity,
            xpReward: achievement.xpReward,
            icon: achievement.icon
        }
    });
}

/**
 * Send level up notification
 * @param {string} wallet - Wallet address
 * @param {Object} levelData - Level data
 */
function notifyLevelUp(wallet, levelData) {
    notifyWallet(wallet, {
        type: NOTIFICATION_TYPES.LEVEL_UP,
        data: {
            newLevel: levelData.level,
            xpRequired: levelData.xpRequired,
            rewards: levelData.rewards || []
        }
    });
}

/**
 * Send rank change notification
 * @param {string} wallet - Wallet address
 * @param {Object} rankData - Rank change data
 */
function notifyRankChange(wallet, rankData) {
    notifyWallet(wallet, {
        type: NOTIFICATION_TYPES.RANK_CHANGE,
        data: {
            leaderboard: rankData.leaderboard,
            previousRank: rankData.previousRank,
            newRank: rankData.newRank,
            direction: rankData.newRank < rankData.previousRank ? 'up' : 'down'
        }
    });
}

/**
 * Send leaderboard update
 * @param {string} leaderboardType - Leaderboard type
 * @param {Array} topPlayers - Top players
 */
function notifyLeaderboardUpdate(leaderboardType, topPlayers) {
    broadcastToChannel(CHANNELS.LEADERBOARD, {
        type: WS_CONFIG.messageTypes.NOTIFICATION,
        notification: enrichNotification({
            type: NOTIFICATION_TYPES.LEADERBOARD_UPDATE,
            data: {
                leaderboard: leaderboardType,
                top: topPlayers.slice(0, 10).map(p => ({
                    rank: p.rank,
                    wallet: p.wallet.slice(0, 4) + '...' + p.wallet.slice(-4),
                    score: p.score
                }))
            }
        })
    });
}

/**
 * Send system announcement
 * @param {Object} announcement - Announcement data
 */
function notifyAnnouncement(announcement) {
    broadcastToAll({
        type: WS_CONFIG.messageTypes.NOTIFICATION,
        notification: enrichNotification({
            type: NOTIFICATION_TYPES.ANNOUNCEMENT,
            data: announcement,
            priority: 'high'
        })
    });
}

// ============================================
// NOTIFICATION STORAGE
// ============================================

/**
 * Store notification for history
 * @param {string} wallet - Wallet address
 * @param {Object} notification - Notification data
 */
async function storeNotification(wallet, notification) {
    const storage = getStorage();
    const listKey = keys.notificationList(wallet);
    const unreadKey = keys.notificationUnread(wallet);

    // Add to list
    await storage.lpush(listKey, notification);

    // Trim to last 100 notifications
    await storage.ltrim(listKey, 0, 99);

    // Increment unread count
    await storage.incr(unreadKey);

    // Set TTL (30 days)
    await storage.expire(listKey, 30 * 24 * 60 * 60);
}

/**
 * Get notification history
 * @param {string} wallet - Wallet address
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getNotificationHistory(wallet, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const storage = getStorage();
    const listKey = keys.notificationList(wallet);
    const unreadKey = keys.notificationUnread(wallet);

    const [notifications, unreadCount] = await Promise.all([
        storage.lrange(listKey, offset, offset + limit - 1),
        storage.get(unreadKey)
    ]);

    return {
        notifications,
        unreadCount: unreadCount || 0,
        total: await storage.llen(listKey)
    };
}

/**
 * Mark notification as read
 * @param {string} wallet - Wallet address
 * @param {string} notificationId - Notification ID
 */
async function markNotificationRead(wallet, notificationId) {
    const storage = getStorage();
    const unreadKey = keys.notificationUnread(wallet);

    const current = await storage.get(unreadKey) || 0;
    if (current > 0) {
        await storage.set(unreadKey, current - 1);
    }
}

/**
 * Mark all notifications as read
 * @param {string} wallet - Wallet address
 */
async function markAllRead(wallet) {
    const storage = getStorage();
    const unreadKey = keys.notificationUnread(wallet);
    await storage.set(unreadKey, 0);
}

/**
 * Clear notification history
 * @param {string} wallet - Wallet address
 */
async function clearHistory(wallet) {
    const storage = getStorage();
    await storage.del(keys.notificationList(wallet));
    await storage.del(keys.notificationUnread(wallet));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Send message to specific connection
 * @param {string} connectionId - Connection ID
 * @param {Object} message - Message to send
 * @returns {boolean}
 */
function sendToConnection(connectionId, message) {
    const connection = connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
        return false;
    }

    try {
        connection.ws.send(JSON.stringify(message));
        connection.messagesSent++;
        stats.messagesSent++;
        return true;
    } catch (error) {
        stats.errors++;
        return false;
    }
}

/**
 * Send error message
 * @param {string} connectionId - Connection ID
 * @param {string} message - Error message
 * @param {number} code - Error code
 */
function sendError(connectionId, message, code = 400) {
    sendToConnection(connectionId, {
        type: WS_CONFIG.messageTypes.ERROR,
        error: message,
        code
    });
}

/**
 * Enrich notification with metadata
 * @param {Object} notification - Raw notification
 * @returns {Object}
 */
function enrichNotification(notification) {
    return {
        id: generateNotificationId(),
        ...notification,
        timestamp: Date.now(),
        read: false
    };
}

/**
 * Generate connection ID
 * @returns {string}
 */
function generateConnectionId() {
    return `conn_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Generate notification ID
 * @returns {string}
 */
function generateNotificationId() {
    return `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Verify JWT token (simplified)
 * @param {string} token - JWT token
 * @returns {Object}
 */
function verifyToken(token) {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[RealtimeNotifications] CRITICAL: JWT_SECRET not configured');
        throw new Error('Authentication not configured');
    }
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

/**
 * Check rate limit
 * @param {string} connectionId - Connection ID
 * @returns {boolean}
 */
function checkRateLimit(connectionId) {
    const now = Date.now();
    let limit = rateLimits.get(connectionId);

    if (!limit || now - limit.windowStart > 60000) {
        limit = { count: 0, windowStart: now };
        rateLimits.set(connectionId, limit);
    }

    limit.count++;
    return limit.count <= WS_CONFIG.maxMessagesPerMinute;
}

/**
 * Check heartbeats and disconnect stale connections
 */
function checkHeartbeats() {
    const now = Date.now();
    const timeout = WS_CONFIG.heartbeatTimeout;

    for (const [connectionId, connection] of connections.entries()) {
        if (now - connection.lastHeartbeat > timeout) {
            // Send ping
            if (connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.ping();
            }
        }

        // Disconnect if no response for 2x timeout
        if (now - connection.lastHeartbeat > timeout * 2) {
            connection.ws.terminate();
        }
    }
}

// ============================================
// METRICS
// ============================================

/**
 * Get WebSocket statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...stats,
        activeConnections: connections.size,
        authenticatedConnections: Array.from(connections.values()).filter(c => c.wallet).length,
        uniqueWallets: clientsByWallet.size,
        totalSubscriptions: Array.from(subscriptions.values())
            .reduce((sum, subs) => sum + subs.size, 0)
    };
}

/**
 * Get connection info
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function getConnectionInfo(wallet) {
    const walletConnections = clientsByWallet.get(wallet);
    if (!walletConnections) {
        return { connected: false, connections: 0 };
    }

    const conns = Array.from(walletConnections).map(connId => {
        const conn = connections.get(connId);
        return {
            id: connId,
            connectedAt: conn.connectedAt,
            subscriptions: Array.from(conn.subscriptions),
            messagesReceived: conn.messagesReceived,
            messagesSent: conn.messagesSent
        };
    });

    return {
        connected: true,
        connections: conns.length,
        details: conns
    };
}

/**
 * Shutdown WebSocket server
 */
function shutdown() {
    if (!wss) return;

    // Close all connections gracefully
    for (const connection of connections.values()) {
        connection.ws.close(1001, 'Server shutting down');
    }

    wss.close();
    wss = null;

    console.log('[WS] Notification server shutdown');
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Server
    initialize,
    shutdown,

    // Notifications
    notifyWallet,
    notifyBurn,
    notifyAchievement,
    notifyLevelUp,
    notifyRankChange,
    notifyLeaderboardUpdate,
    notifyAnnouncement,

    // Broadcast
    broadcastToChannel,
    broadcastToAll,

    // History
    getNotificationHistory,
    markNotificationRead,
    markAllRead,
    clearHistory,

    // Metrics
    getStats,
    getConnectionInfo,

    // Types
    NOTIFICATION_TYPES,
    CHANNELS,
    WS_CONFIG
};
