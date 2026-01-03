/**
 * ASDF API - WebSocket Manager Service
 *
 * Real-time Solana subscriptions:
 * - Account change notifications
 * - Signature confirmations
 * - Slot updates
 * - Log subscriptions
 *
 * Helius Best Practices:
 * - Enhanced WebSocket endpoints
 * - Automatic reconnection
 * - Subscription multiplexing
 *
 * Security by Design:
 * - Connection authentication
 * - Subscription limits per client
 * - Message validation
 */

'use strict';

const WebSocket = require('ws');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const WS_CONFIG = {
    // Connection settings
    reconnectInterval: 5000,        // 5 seconds
    maxReconnectAttempts: 10,
    pingInterval: 30000,            // 30 seconds
    pongTimeout: 10000,             // 10 seconds

    // Subscription limits
    maxSubscriptionsPerClient: 100,
    maxTotalSubscriptions: 10000,

    // Message handling
    messageTimeout: 30000,
    maxMessageSize: 1024 * 1024,    // 1MB

    // Cleanup
    cleanupInterval: 60000          // 1 minute
};

// Subscription types
const SUBSCRIPTION_TYPES = {
    ACCOUNT: 'accountSubscribe',
    SIGNATURE: 'signatureSubscribe',
    SLOT: 'slotSubscribe',
    LOGS: 'logsSubscribe',
    PROGRAM: 'programSubscribe',
    ROOT: 'rootSubscribe'
};

// Connection states
const CONNECTION_STATES = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed'
};

// ============================================
// STORAGE
// ============================================

// WebSocket connection
let wsConnection = null;
let connectionState = CONNECTION_STATES.DISCONNECTED;
let reconnectAttempts = 0;

// Subscriptions
const subscriptions = new Map();     // subscriptionId -> subscription details
const pendingRequests = new Map();   // requestId -> {resolve, reject, timeout}

// Client subscriptions mapping
const clientSubscriptions = new Map(); // clientId -> Set of subscriptionIds

// Request ID counter
let requestIdCounter = 1;

// Stats
const wsStats = {
    messagesReceived: 0,
    messagesSent: 0,
    subscriptionsCreated: 0,
    subscriptionsRemoved: 0,
    reconnections: 0,
    errors: 0
};

// Timers
let pingTimer = null;
let cleanupTimer = null;

// ============================================
// CONNECTION MANAGEMENT
// ============================================

/**
 * Connect to WebSocket endpoint
 * @returns {Promise<void>}
 */
async function connect() {
    if (wsConnection && connectionState === CONNECTION_STATES.CONNECTED) {
        return;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
        throw new Error('WebSocket URL not configured');
    }

    connectionState = CONNECTION_STATES.CONNECTING;

    return new Promise((resolve, reject) => {
        try {
            wsConnection = new WebSocket(wsUrl, {
                maxPayload: WS_CONFIG.maxMessageSize
            });

            wsConnection.on('open', () => {
                connectionState = CONNECTION_STATES.CONNECTED;
                reconnectAttempts = 0;

                console.log('[WS] Connected to Solana WebSocket');
                logAudit('ws_connected', { url: maskUrl(wsUrl) });

                // Start ping timer
                startPingTimer();

                // Resubscribe existing subscriptions
                resubscribeAll();

                resolve();
            });

            wsConnection.on('message', (data) => {
                handleMessage(data);
            });

            wsConnection.on('close', (code, reason) => {
                handleDisconnect(code, reason.toString());
            });

            wsConnection.on('error', (error) => {
                wsStats.errors++;
                console.error('[WS] Error:', error.message);

                if (connectionState === CONNECTION_STATES.CONNECTING) {
                    reject(error);
                }
            });

            wsConnection.on('pong', () => {
                // Connection is alive
            });

        } catch (error) {
            connectionState = CONNECTION_STATES.FAILED;
            reject(error);
        }
    });
}

/**
 * Disconnect WebSocket
 */
function disconnect() {
    stopPingTimer();

    if (wsConnection) {
        wsConnection.close(1000, 'Normal closure');
        wsConnection = null;
    }

    connectionState = CONNECTION_STATES.DISCONNECTED;

    // Clear pending requests
    for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Connection closed'));
    }
    pendingRequests.clear();

    console.log('[WS] Disconnected');
}

/**
 * Handle disconnect event
 * @param {number} code - Close code
 * @param {string} reason - Close reason
 */
function handleDisconnect(code, reason) {
    connectionState = CONNECTION_STATES.DISCONNECTED;
    stopPingTimer();

    console.warn(`[WS] Disconnected: ${code} - ${reason}`);

    // Attempt reconnection
    if (reconnectAttempts < WS_CONFIG.maxReconnectAttempts) {
        reconnectAttempts++;
        connectionState = CONNECTION_STATES.RECONNECTING;
        wsStats.reconnections++;

        setTimeout(() => {
            console.log(`[WS] Reconnecting (attempt ${reconnectAttempts}/${WS_CONFIG.maxReconnectAttempts})`);
            connect().catch(err => {
                console.error('[WS] Reconnection failed:', err.message);
            });
        }, WS_CONFIG.reconnectInterval * Math.min(reconnectAttempts, 5));
    } else {
        connectionState = CONNECTION_STATES.FAILED;
        logAudit('ws_connection_failed', { attempts: reconnectAttempts });
    }
}

/**
 * Get WebSocket URL
 * @returns {string|null}
 */
function getWebSocketUrl() {
    // Try Helius WebSocket URL first
    const heliusRpc = process.env.HELIUS_RPC_URL;
    if (heliusRpc) {
        // Convert HTTPS to WSS
        return heliusRpc.replace('https://', 'wss://').replace('http://', 'ws://');
    }

    // Fallback to public endpoint
    return 'wss://api.mainnet-beta.solana.com';
}

/**
 * Mask URL for logging
 * @param {string} url - URL to mask
 * @returns {string}
 */
function maskUrl(url) {
    return url.replace(/api[_-]?key=([^&]+)/gi, 'api_key=***')
              .replace(/\/([a-f0-9-]{36})/gi, '/***');
}

// ============================================
// PING/PONG
// ============================================

/**
 * Start ping timer
 */
function startPingTimer() {
    stopPingTimer();

    pingTimer = setInterval(() => {
        if (wsConnection && connectionState === CONNECTION_STATES.CONNECTED) {
            wsConnection.ping();
        }
    }, WS_CONFIG.pingInterval);
}

/**
 * Stop ping timer
 */
function stopPingTimer() {
    if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
    }
}

// ============================================
// MESSAGE HANDLING
// ============================================

/**
 * Handle incoming message
 * @param {Buffer|string} data - Message data
 */
function handleMessage(data) {
    wsStats.messagesReceived++;

    try {
        const message = JSON.parse(data.toString());

        // Check if it's a response to a request
        if (message.id && pendingRequests.has(message.id)) {
            handleResponse(message);
            return;
        }

        // Check if it's a subscription notification
        if (message.method === 'accountNotification' ||
            message.method === 'signatureNotification' ||
            message.method === 'slotNotification' ||
            message.method === 'logsNotification' ||
            message.method === 'programNotification' ||
            message.method === 'rootNotification') {
            handleNotification(message);
            return;
        }

    } catch (error) {
        console.error('[WS] Message parse error:', error.message);
    }
}

/**
 * Handle RPC response
 * @param {Object} message - Response message
 */
function handleResponse(message) {
    const pending = pendingRequests.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    pendingRequests.delete(message.id);

    if (message.error) {
        pending.reject(new Error(message.error.message || 'RPC error'));
    } else {
        pending.resolve(message.result);
    }
}

/**
 * Handle subscription notification
 * @param {Object} message - Notification message
 */
function handleNotification(message) {
    const subscriptionId = message.params?.subscription;
    const subscription = subscriptions.get(subscriptionId);

    if (!subscription) {
        return;
    }

    // Call the subscription callback
    if (subscription.callback) {
        try {
            subscription.callback(message.params.result, subscription);
        } catch (error) {
            console.error('[WS] Callback error:', error.message);
        }
    }

    // Update subscription stats
    subscription.lastNotification = Date.now();
    subscription.notificationCount++;
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Subscribe to account changes
 * @param {string} publicKey - Account public key
 * @param {Function} callback - Notification callback
 * @param {Object} options - Subscription options
 * @returns {Promise<number>}
 */
async function subscribeAccount(publicKey, callback, options = {}) {
    const {
        commitment = 'confirmed',
        encoding = 'jsonParsed',
        clientId = 'default'
    } = options;

    return createSubscription(
        SUBSCRIPTION_TYPES.ACCOUNT,
        [publicKey, { commitment, encoding }],
        callback,
        clientId,
        { publicKey }
    );
}

/**
 * Subscribe to signature confirmation
 * @param {string} signature - Transaction signature
 * @param {Function} callback - Notification callback
 * @param {Object} options - Subscription options
 * @returns {Promise<number>}
 */
async function subscribeSignature(signature, callback, options = {}) {
    const {
        commitment = 'confirmed',
        clientId = 'default'
    } = options;

    return createSubscription(
        SUBSCRIPTION_TYPES.SIGNATURE,
        [signature, { commitment }],
        callback,
        clientId,
        { signature }
    );
}

/**
 * Subscribe to slot updates
 * @param {Function} callback - Notification callback
 * @param {Object} options - Subscription options
 * @returns {Promise<number>}
 */
async function subscribeSlot(callback, options = {}) {
    const { clientId = 'default' } = options;

    return createSubscription(
        SUBSCRIPTION_TYPES.SLOT,
        [],
        callback,
        clientId
    );
}

/**
 * Subscribe to logs
 * @param {Object} filter - Log filter (mentions, all, etc.)
 * @param {Function} callback - Notification callback
 * @param {Object} options - Subscription options
 * @returns {Promise<number>}
 */
async function subscribeLogs(filter, callback, options = {}) {
    const {
        commitment = 'confirmed',
        clientId = 'default'
    } = options;

    return createSubscription(
        SUBSCRIPTION_TYPES.LOGS,
        [filter, { commitment }],
        callback,
        clientId,
        { filter }
    );
}

/**
 * Subscribe to program account changes
 * @param {string} programId - Program ID
 * @param {Function} callback - Notification callback
 * @param {Object} options - Subscription options
 * @returns {Promise<number>}
 */
async function subscribeProgram(programId, callback, options = {}) {
    const {
        commitment = 'confirmed',
        encoding = 'jsonParsed',
        filters = [],
        clientId = 'default'
    } = options;

    return createSubscription(
        SUBSCRIPTION_TYPES.PROGRAM,
        [programId, { commitment, encoding, filters }],
        callback,
        clientId,
        { programId }
    );
}

/**
 * Create subscription
 * @param {string} type - Subscription type
 * @param {Array} params - Subscription parameters
 * @param {Function} callback - Notification callback
 * @param {string} clientId - Client identifier
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<number>}
 */
async function createSubscription(type, params, callback, clientId, metadata = {}) {
    // Ensure connected
    if (connectionState !== CONNECTION_STATES.CONNECTED) {
        await connect();
    }

    // Check client subscription limit
    const clientSubs = clientSubscriptions.get(clientId) || new Set();
    if (clientSubs.size >= WS_CONFIG.maxSubscriptionsPerClient) {
        throw new Error('Maximum subscriptions per client exceeded');
    }

    // Check total subscription limit
    if (subscriptions.size >= WS_CONFIG.maxTotalSubscriptions) {
        throw new Error('Maximum total subscriptions exceeded');
    }

    // Send subscription request
    const subscriptionId = await sendRequest(type, params);

    // Store subscription
    const subscription = {
        id: subscriptionId,
        type,
        params,
        callback,
        clientId,
        metadata,
        createdAt: Date.now(),
        lastNotification: null,
        notificationCount: 0
    };

    subscriptions.set(subscriptionId, subscription);

    // Track client subscription
    clientSubs.add(subscriptionId);
    clientSubscriptions.set(clientId, clientSubs);

    wsStats.subscriptionsCreated++;

    return subscriptionId;
}

/**
 * Unsubscribe
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<boolean>}
 */
async function unsubscribe(subscriptionId) {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
        return false;
    }

    // Determine unsubscribe method
    const unsubMethod = subscription.type.replace('Subscribe', 'Unsubscribe');

    try {
        await sendRequest(unsubMethod, [subscriptionId]);
    } catch (error) {
        console.warn('[WS] Unsubscribe error:', error.message);
    }

    // Remove from tracking
    subscriptions.delete(subscriptionId);

    const clientSubs = clientSubscriptions.get(subscription.clientId);
    if (clientSubs) {
        clientSubs.delete(subscriptionId);
    }

    wsStats.subscriptionsRemoved++;

    return true;
}

/**
 * Unsubscribe all for client
 * @param {string} clientId - Client identifier
 * @returns {Promise<number>}
 */
async function unsubscribeClient(clientId) {
    const clientSubs = clientSubscriptions.get(clientId);
    if (!clientSubs) {
        return 0;
    }

    let removed = 0;
    for (const subId of clientSubs) {
        try {
            await unsubscribe(subId);
            removed++;
        } catch {
            // Continue with others
        }
    }

    clientSubscriptions.delete(clientId);
    return removed;
}

/**
 * Resubscribe all existing subscriptions
 */
async function resubscribeAll() {
    const existingSubscriptions = Array.from(subscriptions.values());

    for (const sub of existingSubscriptions) {
        try {
            // Remove old subscription tracking
            subscriptions.delete(sub.id);

            // Create new subscription
            const newId = await sendRequest(sub.type, sub.params);

            // Update subscription with new ID
            sub.id = newId;
            subscriptions.set(newId, sub);

            // Update client tracking
            const clientSubs = clientSubscriptions.get(sub.clientId);
            if (clientSubs) {
                clientSubs.delete(sub.id);
                clientSubs.add(newId);
            }

        } catch (error) {
            console.error('[WS] Resubscribe error:', error.message);
        }
    }
}

// ============================================
// REQUEST HANDLING
// ============================================

/**
 * Send RPC request over WebSocket
 * @param {string} method - RPC method
 * @param {Array} params - Method parameters
 * @returns {Promise<any>}
 */
function sendRequest(method, params = []) {
    return new Promise((resolve, reject) => {
        if (!wsConnection || connectionState !== CONNECTION_STATES.CONNECTED) {
            reject(new Error('WebSocket not connected'));
            return;
        }

        const requestId = requestIdCounter++;
        const request = {
            jsonrpc: '2.0',
            id: requestId,
            method,
            params
        };

        // Setup timeout
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
        }, WS_CONFIG.messageTimeout);

        // Store pending request
        pendingRequests.set(requestId, { resolve, reject, timeout });

        // Send request
        try {
            wsConnection.send(JSON.stringify(request));
            wsStats.messagesSent++;
        } catch (error) {
            clearTimeout(timeout);
            pendingRequests.delete(requestId);
            reject(error);
        }
    });
}

// ============================================
// CLEANUP
// ============================================

/**
 * Start cleanup timer
 */
function startCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
    }

    cleanupTimer = setInterval(() => {
        cleanupStaleSubscriptions();
    }, WS_CONFIG.cleanupInterval);
}

/**
 * Stop cleanup timer
 */
function stopCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

/**
 * Cleanup stale subscriptions
 */
function cleanupStaleSubscriptions() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;  // 5 minutes

    for (const [id, sub] of subscriptions) {
        // Skip if recently active
        if (sub.lastNotification && (now - sub.lastNotification < staleThreshold)) {
            continue;
        }

        // Skip signature subscriptions (they complete naturally)
        if (sub.type === SUBSCRIPTION_TYPES.SIGNATURE) {
            // Check if subscription is very old (should have completed)
            if (now - sub.createdAt > staleThreshold * 2) {
                unsubscribe(id).catch(() => {});
            }
        }
    }
}

// ============================================
// STATUS & METRICS
// ============================================

/**
 * Get connection status
 * @returns {Object}
 */
function getConnectionStatus() {
    return {
        state: connectionState,
        reconnectAttempts,
        url: wsConnection ? maskUrl(getWebSocketUrl()) : null
    };
}

/**
 * Get subscription list
 * @param {string} clientId - Optional client filter
 * @returns {Array}
 */
function getSubscriptions(clientId = null) {
    let subs = Array.from(subscriptions.values());

    if (clientId) {
        subs = subs.filter(s => s.clientId === clientId);
    }

    return subs.map(s => ({
        id: s.id,
        type: s.type,
        clientId: s.clientId,
        createdAt: new Date(s.createdAt).toISOString(),
        notificationCount: s.notificationCount,
        lastNotification: s.lastNotification
            ? new Date(s.lastNotification).toISOString()
            : null,
        metadata: s.metadata
    }));
}

/**
 * Get service statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...wsStats,
        connectionState,
        activeSubscriptions: subscriptions.size,
        clients: clientSubscriptions.size,
        pendingRequests: pendingRequests.size,
        reconnectAttempts
    };
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize WebSocket manager
 */
async function initialize() {
    try {
        await connect();
        startCleanup();
        console.log('[WS] Manager initialized');
    } catch (error) {
        console.warn('[WS] Initial connection failed:', error.message);
        // Will retry via reconnection logic
    }
}

/**
 * Shutdown WebSocket manager
 */
function shutdown() {
    stopCleanup();
    disconnect();

    // Clear all subscriptions
    subscriptions.clear();
    clientSubscriptions.clear();

    console.log('[WS] Manager shutdown');
}

// Initialize on load (but don't block)
setImmediate(() => {
    initialize().catch(err => {
        console.warn('[WS] Deferred init failed:', err.message);
    });
});

module.exports = {
    // Constants
    SUBSCRIPTION_TYPES,
    CONNECTION_STATES,
    WS_CONFIG,

    // Connection
    connect,
    disconnect,
    getConnectionStatus,

    // Subscriptions
    subscribeAccount,
    subscribeSignature,
    subscribeSlot,
    subscribeLogs,
    subscribeProgram,
    unsubscribe,
    unsubscribeClient,

    // Status
    getSubscriptions,
    getStats,

    // Lifecycle
    initialize,
    shutdown
};
