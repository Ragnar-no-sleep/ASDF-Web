/**
 * ASDF API - Helius WebSocket Service
 *
 * Real-time Solana data via WebSocket:
 * - Account change subscriptions
 * - Transaction confirmations
 * - Slot updates
 * - Log subscriptions
 *
 * Features:
 * - Automatic reconnection with backoff
 * - Subscription management
 * - Event-based architecture
 * - Health monitoring
 *
 * @author Helius Engineering Standards
 * @version 1.0.0
 *
 * Security by Design:
 * - API key protection
 * - Subscription limits
 * - Event validation
 */

'use strict';

const WebSocket = require('ws');
const EventEmitter = require('events');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const WS_CONFIG = {
    // Connection settings
    url: process.env.HELIUS_WS_URL || `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,

    // Reconnection settings (Fibonacci backoff)
    reconnectDelays: [1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000],
    maxReconnectAttempts: 10,

    // Health settings
    pingInterval: 30000,       // 30 seconds
    pongTimeout: 10000,        // 10 seconds

    // Subscription limits
    maxSubscriptions: 100,
    maxAccountsPerSub: 50,

    // Message settings
    messageTimeout: 30000,
    maxPendingMessages: 100
};

// Subscription types
const SUBSCRIPTION_TYPES = {
    ACCOUNT: 'accountSubscribe',
    ACCOUNT_UNSUBSCRIBE: 'accountUnsubscribe',
    LOGS: 'logsSubscribe',
    LOGS_UNSUBSCRIBE: 'logsUnsubscribe',
    SIGNATURE: 'signatureSubscribe',
    SIGNATURE_UNSUBSCRIBE: 'signatureUnsubscribe',
    SLOT: 'slotSubscribe',
    SLOT_UNSUBSCRIBE: 'slotUnsubscribe',
    ROOT: 'rootSubscribe',
    ROOT_UNSUBSCRIBE: 'rootUnsubscribe'
};

// ============================================
// HELIUS WEBSOCKET MANAGER
// ============================================

class HeliusWebSocketManager extends EventEmitter {
    constructor() {
        super();

        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempt = 0;
        this.subscriptions = new Map();
        this.pendingRequests = new Map();
        this.requestId = 1;

        // Health tracking
        this.lastPing = null;
        this.lastPong = null;
        this.pingTimer = null;
        this.pongTimer = null;

        // Stats
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnects: 0,
            errors: 0,
            subscriptions: 0
        };
    }

    /**
     * Connect to Helius WebSocket
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.isConnected) {
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(WS_CONFIG.url);

                // Connection timeout
                const timeout = setTimeout(() => {
                    if (!this.isConnected) {
                        this.ws.terminate();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000);

                this.ws.on('open', () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.reconnectAttempt = 0;
                    this.startPingPong();
                    this.resubscribeAll();

                    console.log('[HeliusWS] Connected');
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error) => {
                    console.error('[HeliusWS] Error:', error.message);
                    this.stats.errors++;
                    this.emit('error', error);
                });

                this.ws.on('close', (code, reason) => {
                    this.isConnected = false;
                    this.stopPingPong();
                    console.warn(`[HeliusWS] Disconnected: ${code} ${reason}`);
                    this.emit('disconnected', { code, reason: reason.toString() });
                    this.scheduleReconnect();
                });

                this.ws.on('pong', () => {
                    this.lastPong = Date.now();
                    if (this.pongTimer) {
                        clearTimeout(this.pongTimer);
                        this.pongTimer = null;
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.stopPingPong();
        this.reconnectAttempt = WS_CONFIG.maxReconnectAttempts; // Prevent reconnect

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.isConnected = false;
        this.subscriptions.clear();
        this.pendingRequests.clear();

        console.log('[HeliusWS] Disconnected by client');
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        if (this.reconnectAttempt >= WS_CONFIG.maxReconnectAttempts) {
            console.error('[HeliusWS] Max reconnect attempts reached');
            this.emit('maxReconnectsReached');
            return;
        }

        const delayIndex = Math.min(this.reconnectAttempt, WS_CONFIG.reconnectDelays.length - 1);
        const delay = WS_CONFIG.reconnectDelays[delayIndex];

        console.log(`[HeliusWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);

        setTimeout(async () => {
            this.reconnectAttempt++;
            this.stats.reconnects++;

            try {
                await this.connect();
            } catch (error) {
                console.error('[HeliusWS] Reconnect failed:', error.message);
                this.scheduleReconnect();
            }
        }, delay);
    }

    /**
     * Start ping/pong health check
     */
    startPingPong() {
        this.stopPingPong();

        this.pingTimer = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.lastPing = Date.now();
                this.ws.ping();

                // Set pong timeout
                this.pongTimer = setTimeout(() => {
                    console.warn('[HeliusWS] Pong timeout, reconnecting');
                    this.ws.terminate();
                }, WS_CONFIG.pongTimeout);
            }
        }, WS_CONFIG.pingInterval);
    }

    /**
     * Stop ping/pong health check
     */
    stopPingPong() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
    }

    /**
     * Handle incoming WebSocket message
     * @param {Buffer} data - Message data
     */
    handleMessage(data) {
        this.stats.messagesReceived++;

        try {
            const message = JSON.parse(data.toString());

            // Response to request
            if (message.id !== undefined) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    this.pendingRequests.delete(message.id);
                    clearTimeout(pending.timeout);

                    if (message.error) {
                        pending.reject(new Error(message.error.message));
                    } else {
                        pending.resolve(message.result);
                    }
                }
                return;
            }

            // Subscription notification
            if (message.method === 'accountNotification') {
                this.handleAccountNotification(message);
            } else if (message.method === 'logsNotification') {
                this.handleLogsNotification(message);
            } else if (message.method === 'signatureNotification') {
                this.handleSignatureNotification(message);
            } else if (message.method === 'slotNotification') {
                this.handleSlotNotification(message);
            }

        } catch (error) {
            console.error('[HeliusWS] Message parse error:', error.message);
        }
    }

    /**
     * Send request and wait for response
     * @param {string} method - RPC method
     * @param {Array} params - Method parameters
     * @returns {Promise<any>}
     */
    async sendRequest(method, params = []) {
        if (!this.isConnected) {
            throw new Error('WebSocket not connected');
        }

        const id = this.requestId++;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, WS_CONFIG.messageTimeout);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            const message = JSON.stringify({
                jsonrpc: '2.0',
                id,
                method,
                params
            });

            this.ws.send(message);
            this.stats.messagesSent++;
        });
    }

    // ============================================
    // ACCOUNT SUBSCRIPTIONS
    // ============================================

    /**
     * Subscribe to account changes
     * @param {string} publicKey - Account public key
     * @param {Object} options - Subscription options
     * @returns {Promise<number>} Subscription ID
     */
    async subscribeAccount(publicKey, options = {}) {
        const {
            commitment = 'confirmed',
            encoding = 'base64'
        } = options;

        if (this.subscriptions.size >= WS_CONFIG.maxSubscriptions) {
            throw new Error('Maximum subscriptions reached');
        }

        const subId = await this.sendRequest(SUBSCRIPTION_TYPES.ACCOUNT, [
            publicKey,
            { commitment, encoding }
        ]);

        this.subscriptions.set(subId, {
            type: 'account',
            publicKey,
            options,
            createdAt: Date.now()
        });

        this.stats.subscriptions++;
        console.log(`[HeliusWS] Subscribed to account: ${publicKey.slice(0, 8)}... (${subId})`);

        return subId;
    }

    /**
     * Unsubscribe from account
     * @param {number} subscriptionId - Subscription ID
     * @returns {Promise<boolean>}
     */
    async unsubscribeAccount(subscriptionId) {
        const result = await this.sendRequest(SUBSCRIPTION_TYPES.ACCOUNT_UNSUBSCRIBE, [subscriptionId]);
        this.subscriptions.delete(subscriptionId);
        return result;
    }

    /**
     * Handle account notification
     * @param {Object} message - Notification message
     */
    handleAccountNotification(message) {
        const { subscription, result } = message.params;
        const sub = this.subscriptions.get(subscription);

        this.emit('accountChange', {
            subscriptionId: subscription,
            publicKey: sub?.publicKey,
            slot: result.context?.slot,
            data: result.value?.data,
            lamports: result.value?.lamports,
            owner: result.value?.owner,
            executable: result.value?.executable
        });
    }

    // ============================================
    // SIGNATURE SUBSCRIPTIONS
    // ============================================

    /**
     * Subscribe to transaction signature confirmation
     * @param {string} signature - Transaction signature
     * @param {Object} options - Subscription options
     * @returns {Promise<number>}
     */
    async subscribeSignature(signature, options = {}) {
        const { commitment = 'confirmed' } = options;

        const subId = await this.sendRequest(SUBSCRIPTION_TYPES.SIGNATURE, [
            signature,
            { commitment }
        ]);

        this.subscriptions.set(subId, {
            type: 'signature',
            signature,
            options,
            createdAt: Date.now()
        });

        return subId;
    }

    /**
     * Wait for transaction confirmation
     * @param {string} signature - Transaction signature
     * @param {Object} options - Options
     * @returns {Promise<Object>}
     */
    async waitForConfirmation(signature, options = {}) {
        const { timeout = 60000, commitment = 'confirmed' } = options;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.removeListener('signatureConfirmation', handler);
                reject(new Error('Confirmation timeout'));
            }, timeout);

            const handler = (data) => {
                if (data.signature === signature) {
                    clearTimeout(timer);
                    this.removeListener('signatureConfirmation', handler);
                    resolve(data);
                }
            };

            this.on('signatureConfirmation', handler);

            this.subscribeSignature(signature, { commitment }).catch(reject);
        });
    }

    /**
     * Handle signature notification
     * @param {Object} message - Notification message
     */
    handleSignatureNotification(message) {
        const { subscription, result } = message.params;
        const sub = this.subscriptions.get(subscription);

        // Auto-unsubscribe (one-time notification)
        this.subscriptions.delete(subscription);

        this.emit('signatureConfirmation', {
            subscriptionId: subscription,
            signature: sub?.signature,
            slot: result.context?.slot,
            error: result.value?.err || null,
            confirmed: !result.value?.err
        });
    }

    // ============================================
    // LOG SUBSCRIPTIONS
    // ============================================

    /**
     * Subscribe to program logs
     * @param {string|Object} filter - 'all', 'allWithVotes', or {mentions: [address]}
     * @param {Object} options - Subscription options
     * @returns {Promise<number>}
     */
    async subscribeLogs(filter, options = {}) {
        const { commitment = 'confirmed' } = options;

        const subId = await this.sendRequest(SUBSCRIPTION_TYPES.LOGS, [
            filter,
            { commitment }
        ]);

        this.subscriptions.set(subId, {
            type: 'logs',
            filter,
            options,
            createdAt: Date.now()
        });

        return subId;
    }

    /**
     * Handle logs notification
     * @param {Object} message - Notification message
     */
    handleLogsNotification(message) {
        const { subscription, result } = message.params;

        this.emit('logs', {
            subscriptionId: subscription,
            signature: result.value?.signature,
            logs: result.value?.logs || [],
            error: result.value?.err || null,
            slot: result.context?.slot
        });
    }

    // ============================================
    // SLOT SUBSCRIPTIONS
    // ============================================

    /**
     * Subscribe to slot updates
     * @returns {Promise<number>}
     */
    async subscribeSlot() {
        const subId = await this.sendRequest(SUBSCRIPTION_TYPES.SLOT, []);

        this.subscriptions.set(subId, {
            type: 'slot',
            createdAt: Date.now()
        });

        return subId;
    }

    /**
     * Handle slot notification
     * @param {Object} message - Notification message
     */
    handleSlotNotification(message) {
        const { result } = message.params;

        this.emit('slot', {
            slot: result.slot,
            parent: result.parent,
            root: result.root
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Resubscribe all active subscriptions after reconnect
     */
    async resubscribeAll() {
        const subs = Array.from(this.subscriptions.entries());
        this.subscriptions.clear();

        for (const [oldId, sub] of subs) {
            try {
                let newId;
                switch (sub.type) {
                    case 'account':
                        newId = await this.subscribeAccount(sub.publicKey, sub.options);
                        break;
                    case 'signature':
                        newId = await this.subscribeSignature(sub.signature, sub.options);
                        break;
                    case 'logs':
                        newId = await this.subscribeLogs(sub.filter, sub.options);
                        break;
                    case 'slot':
                        newId = await this.subscribeSlot();
                        break;
                }
                console.log(`[HeliusWS] Resubscribed ${sub.type}: ${oldId} -> ${newId}`);
            } catch (error) {
                console.error(`[HeliusWS] Resubscribe failed for ${sub.type}:`, error.message);
            }
        }
    }

    /**
     * Get all active subscriptions
     * @returns {Object[]}
     */
    getSubscriptions() {
        return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
            id,
            ...sub
        }));
    }

    /**
     * Get WebSocket status
     * @returns {Object}
     */
    getStatus() {
        return {
            connected: this.isConnected,
            subscriptions: this.subscriptions.size,
            reconnectAttempt: this.reconnectAttempt,
            lastPing: this.lastPing,
            lastPong: this.lastPong,
            latency: this.lastPing && this.lastPong ? this.lastPong - this.lastPing : null,
            stats: { ...this.stats }
        };
    }

    /**
     * Health check
     * @returns {Object}
     */
    healthCheck() {
        const now = Date.now();
        const pongAge = this.lastPong ? now - this.lastPong : Infinity;

        return {
            healthy: this.isConnected && pongAge < WS_CONFIG.pingInterval * 2,
            connected: this.isConnected,
            pongAge: this.lastPong ? `${Math.round(pongAge / 1000)}s ago` : 'never',
            subscriptions: this.subscriptions.size,
            pendingRequests: this.pendingRequests.size
        };
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const manager = new HeliusWebSocketManager();

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Manager instance
    manager,

    // Connection
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),

    // Account subscriptions
    subscribeAccount: (pk, opts) => manager.subscribeAccount(pk, opts),
    unsubscribeAccount: (id) => manager.unsubscribeAccount(id),

    // Signature subscriptions
    subscribeSignature: (sig, opts) => manager.subscribeSignature(sig, opts),
    waitForConfirmation: (sig, opts) => manager.waitForConfirmation(sig, opts),

    // Log subscriptions
    subscribeLogs: (filter, opts) => manager.subscribeLogs(filter, opts),

    // Slot subscriptions
    subscribeSlot: () => manager.subscribeSlot(),

    // Event listeners
    on: (event, handler) => manager.on(event, handler),
    off: (event, handler) => manager.off(event, handler),

    // Status
    getStatus: () => manager.getStatus(),
    getSubscriptions: () => manager.getSubscriptions(),
    healthCheck: () => manager.healthCheck(),

    // Configuration
    WS_CONFIG,
    SUBSCRIPTION_TYPES
};
