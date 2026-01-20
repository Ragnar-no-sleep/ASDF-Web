/**
 * ASDF-Web Realtime Client
 * WebSocket client for real-time notifications
 *
 * Connects to backend /ws/notifications endpoint
 * Integrates with frontend event-bus
 *
 * Philosophy: Fibonacci backoff for reconnection, fire-and-forget
 *
 * @module realtime/client
 */

import { eventBus, EVENTS } from '../core/event-bus.js';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  // WebSocket endpoint (relative to current host)
  endpoint: '/ws/notifications',

  // Reconnection settings (Fibonacci backoff)
  reconnect: {
    enabled: true,
    delays: [1000, 1000, 2000, 3000, 5000, 8000, 13000, 21000],
    maxAttempts: 10
  },

  // Heartbeat
  heartbeat: {
    interval: 21000, // 21 seconds (Fibonacci)
    timeout: 13000
  },

  // Debug mode
  debug: false
};

// ============================================
// CONNECTION STATES
// ============================================

const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

// ============================================
// MESSAGE TYPES (match backend)
// ============================================

const MESSAGE_TYPES = {
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
  UNSUBSCRIBED: 'unsubscribed',
  CONNECTED: 'connected'
};

// ============================================
// CHANNELS (match backend)
// ============================================

const CHANNELS = {
  PERSONAL: 'personal',
  GLOBAL: 'global',
  BURNS: 'burns',
  LEADERBOARD: 'leaderboard',
  EVENTS: 'events'
};

// ============================================
// REALTIME CLIENT CLASS
// ============================================

/**
 * RealtimeClient manages WebSocket connection to backend
 */
class RealtimeClient {
  constructor(config = {}) {
    /** @type {Object} Configuration */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {WebSocket|null} */
    this.ws = null;

    /** @type {string} */
    this.state = CONNECTION_STATE.DISCONNECTED;

    /** @type {string|null} */
    this.connectionId = null;

    /** @type {Set<string>} */
    this.subscriptions = new Set();

    /** @type {number} */
    this.reconnectAttempts = 0;

    /** @type {number|null} */
    this.reconnectTimer = null;

    /** @type {number|null} */
    this.heartbeatTimer = null;

    /** @type {number} */
    this.lastPong = 0;

    /** @type {string|null} Auth token */
    this.token = null;

    /** @type {Object} Stats */
    this.stats = {
      connected: 0,
      disconnected: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      reconnections: 0
    };

    // Bind methods
    this._onOpen = this._onOpen.bind(this);
    this._onClose = this._onClose.bind(this);
    this._onError = this._onError.bind(this);
    this._onMessage = this._onMessage.bind(this);
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  /**
   * Connect to WebSocket server
   * @param {string} [token] - Optional auth token
   * @returns {Promise<boolean>}
   */
  async connect(token = null) {
    if (this.state === CONNECTION_STATE.CONNECTED) {
      return true;
    }

    if (this.state === CONNECTION_STATE.CONNECTING) {
      return false;
    }

    this.token = token;
    this.state = CONNECTION_STATE.CONNECTING;

    return new Promise((resolve) => {
      try {
        const url = this._buildUrl();
        this._debug('Connecting to', url);

        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
          this._onOpen();
          resolve(true);
        };
        this.ws.onclose = this._onClose;
        this.ws.onerror = (e) => {
          this._onError(e);
          if (this.state === CONNECTION_STATE.CONNECTING) {
            resolve(false);
          }
        };
        this.ws.onmessage = this._onMessage;

      } catch (error) {
        this._debug('Connection error:', error.message);
        this.state = CONNECTION_STATE.FAILED;
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this._clearTimers();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.state = CONNECTION_STATE.DISCONNECTED;
    this.connectionId = null;
    this.subscriptions.clear();

    eventBus.emit(EVENTS.WS_DISCONNECTED, { reason: 'client' });
  }

  /**
   * Build WebSocket URL
   * @returns {string}
   * @private
   */
  _buildUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    let url = `${protocol}//${host}${this.config.endpoint}`;

    if (this.token) {
      url += `?token=${encodeURIComponent(this.token)}`;
    }

    return url;
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle connection open
   * @private
   */
  _onOpen() {
    this._debug('Connected');
    this.state = CONNECTION_STATE.CONNECTED;
    this.reconnectAttempts = 0;
    this.stats.connected++;
    this.lastPong = Date.now();

    // Start heartbeat
    this._startHeartbeat();

    eventBus.emit(EVENTS.WS_CONNECTED, {
      timestamp: Date.now()
    });
  }

  /**
   * Handle connection close
   * @param {CloseEvent} event
   * @private
   */
  _onClose(event) {
    this._debug('Disconnected:', event.code, event.reason);
    this._clearTimers();
    this.stats.disconnected++;

    const wasConnected = this.state === CONNECTION_STATE.CONNECTED;
    this.state = CONNECTION_STATE.DISCONNECTED;
    this.connectionId = null;

    eventBus.emit(EVENTS.WS_DISCONNECTED, {
      code: event.code,
      reason: event.reason,
      wasConnected
    });

    // Attempt reconnection
    if (wasConnected && this.config.reconnect.enabled) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   * @param {Event} event
   * @private
   */
  _onError(event) {
    this._debug('Error:', event);
    this.stats.errors++;

    eventBus.emit(EVENTS.WS_ERROR, {
      error: 'Connection error',
      timestamp: Date.now()
    });
  }

  /**
   * Handle incoming message
   * @param {MessageEvent} event
   * @private
   */
  _onMessage(event) {
    this.stats.messagesReceived++;

    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      this._debug('Invalid message:', event.data);
      return;
    }

    this._debug('Received:', message.type);

    switch (message.type) {
      case MESSAGE_TYPES.CONNECTED:
        this._handleConnected(message);
        break;

      case MESSAGE_TYPES.NOTIFICATION:
        this._handleNotification(message);
        break;

      case MESSAGE_TYPES.PONG:
        this._handlePong();
        break;

      case MESSAGE_TYPES.SUBSCRIBED:
        this._handleSubscribed(message);
        break;

      case MESSAGE_TYPES.UNSUBSCRIBED:
        this._handleUnsubscribed(message);
        break;

      case MESSAGE_TYPES.ERROR:
        this._handleError(message);
        break;

      default:
        this._debug('Unknown message type:', message.type);
    }
  }

  // ============================================
  // MESSAGE HANDLERS
  // ============================================

  /**
   * Handle connected message
   * @param {Object} message
   * @private
   */
  _handleConnected(message) {
    this.connectionId = message.connectionId;

    // Store initial subscriptions
    if (message.channels) {
      this.subscriptions = new Set(message.channels);
    }

    eventBus.emit(EVENTS.WS_READY, {
      connectionId: this.connectionId,
      authenticated: message.authenticated,
      channels: Array.from(this.subscriptions)
    });
  }

  /**
   * Handle notification message
   * @param {Object} message
   * @private
   */
  _handleNotification(message) {
    const notification = message.notification;

    // Emit to event bus
    eventBus.emit(EVENTS.WS_NOTIFICATION, notification);

    // Emit specific event based on notification type
    const eventType = this._mapNotificationToEvent(notification.type);
    if (eventType) {
      eventBus.emit(eventType, notification.data);
    }
  }

  /**
   * Map notification type to event bus event
   * @param {string} notificationType
   * @returns {string|null}
   * @private
   */
  _mapNotificationToEvent(notificationType) {
    const mapping = {
      'achievement_unlocked': EVENTS.ACHIEVEMENT_UNLOCKED,
      'level_up': EVENTS.LEVEL_UP,
      'burn_confirmed': EVENTS.BURN_CONFIRMED,
      'leaderboard_update': EVENTS.LEADERBOARD_UPDATE,
      'rank_change': EVENTS.RANK_CHANGED,
      'whale_burn': EVENTS.WHALE_BURN,
      'announcement': EVENTS.ANNOUNCEMENT
    };

    return mapping[notificationType] || null;
  }

  /**
   * Handle pong message
   * @private
   */
  _handlePong() {
    this.lastPong = Date.now();
  }

  /**
   * Handle subscribed message
   * @param {Object} message
   * @private
   */
  _handleSubscribed(message) {
    this.subscriptions.add(message.channel);
    this._debug('Subscribed to:', message.channel);
  }

  /**
   * Handle unsubscribed message
   * @param {Object} message
   * @private
   */
  _handleUnsubscribed(message) {
    this.subscriptions.delete(message.channel);
    this._debug('Unsubscribed from:', message.channel);
  }

  /**
   * Handle error message
   * @param {Object} message
   * @private
   */
  _handleError(message) {
    this._debug('Server error:', message.error);
    eventBus.emit(EVENTS.WS_ERROR, {
      error: message.error,
      code: message.code
    });
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   * @returns {boolean}
   */
  subscribe(channel) {
    if (!this._isConnected()) {
      return false;
    }

    this._send({
      type: MESSAGE_TYPES.SUBSCRIBE,
      channel
    });

    return true;
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   * @returns {boolean}
   */
  unsubscribe(channel) {
    if (!this._isConnected()) {
      return false;
    }

    this._send({
      type: MESSAGE_TYPES.UNSUBSCRIBE,
      channel
    });

    return true;
  }

  /**
   * Acknowledge a notification (mark as read)
   * @param {string} notificationId
   * @returns {boolean}
   */
  acknowledge(notificationId) {
    if (!this._isConnected()) {
      return false;
    }

    this._send({
      type: MESSAGE_TYPES.ACK,
      notificationId
    });

    return true;
  }

  /**
   * Get current subscriptions
   * @returns {string[]}
   */
  getSubscriptions() {
    return Array.from(this.subscriptions);
  }

  // ============================================
  // HEARTBEAT
  // ============================================

  /**
   * Start heartbeat timer
   * @private
   */
  _startHeartbeat() {
    this._stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this._isConnected()) {
        return;
      }

      // Check if we got a pong recently
      const elapsed = Date.now() - this.lastPong;
      if (elapsed > this.config.heartbeat.timeout * 2) {
        this._debug('Heartbeat timeout, reconnecting');
        this.ws?.close(4000, 'Heartbeat timeout');
        return;
      }

      // Send ping
      this._send({ type: MESSAGE_TYPES.PING });
    }, this.config.heartbeat.interval);
  }

  /**
   * Stop heartbeat timer
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================
  // RECONNECTION
  // ============================================

  /**
   * Schedule reconnection attempt
   * @private
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      this._debug('Max reconnect attempts reached');
      this.state = CONNECTION_STATE.FAILED;
      eventBus.emit(EVENTS.WS_FAILED, {
        attempts: this.reconnectAttempts
      });
      return;
    }

    this.state = CONNECTION_STATE.RECONNECTING;

    // Get delay from Fibonacci sequence
    const delays = this.config.reconnect.delays;
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];

    this._debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      this.stats.reconnections++;

      const success = await this.connect(this.token);

      if (!success && this.config.reconnect.enabled) {
        this._scheduleReconnect();
      }
    }, delay);
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Send message to server
   * @param {Object} message
   * @returns {boolean}
   * @private
   */
  _send(message) {
    if (!this._isConnected()) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
      return true;
    } catch (error) {
      this._debug('Send error:', error.message);
      return false;
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   * @private
   */
  _isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Clear all timers
   * @private
   */
  _clearTimers() {
    this._stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Debug logging
   * @param  {...any} args
   * @private
   */
  _debug(...args) {
    if (this.config.debug) {
      console.log('[Realtime]', ...args);
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get connection state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.state === CONNECTION_STATE.CONNECTED;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      state: this.state,
      connectionId: this.connectionId,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Set debug mode
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this.config.debug = enabled;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/** @type {RealtimeClient} */
export const realtime = new RealtimeClient();

// Export class for testing
export { RealtimeClient };

// Export constants
export { CONNECTION_STATE, MESSAGE_TYPES, CHANNELS };

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Connect to realtime service
 * @param {string} [token] - Auth token
 * @returns {Promise<boolean>}
 */
export async function connect(token) {
  return realtime.connect(token);
}

/**
 * Disconnect from realtime service
 */
export function disconnect() {
  realtime.disconnect();
}

/**
 * Subscribe to a channel
 * @param {string} channel
 * @returns {boolean}
 */
export function subscribe(channel) {
  return realtime.subscribe(channel);
}

/**
 * Unsubscribe from a channel
 * @param {string} channel
 * @returns {boolean}
 */
export function unsubscribe(channel) {
  return realtime.unsubscribe(channel);
}

/**
 * Check if connected
 * @returns {boolean}
 */
export function isConnected() {
  return realtime.isConnected();
}

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.realtime = realtime;
}
