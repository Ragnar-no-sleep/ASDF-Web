/**
 * Notification Routes Module
 *
 * Handles all notification-related endpoints:
 * - Basic CRUD: list, delete, clear history
 * - Read status: mark read (single/batch/all), unread count
 * - Preferences: get/update notification preferences
 * - Push notifications: register/unregister tokens, VAPID key, test
 * - WebSocket: subscribe info
 * - Admin: send notifications, stats, connections, broadcast stats
 *
 * Consolidated from two sections of index.js (lines 2181-2290 and 4273-4717).
 * When duplicates existed, the later (Phase 15) version is kept as it
 * uses lazy-loaded services and has more complete validation/audit logging.
 */

'use strict';

const express = require('express');
const router = express.Router();

// Helpers
const { sanitizeError, isProduction } = require('./helpers');

// Services
const { authMiddleware } = require('../services/auth');
const { requireAdmin } = require('../services/security');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences: getNotificationPreferences,
  updatePreferences: updateNotificationPreferences,
  getNotificationMetrics,
} = require('../services/notifications');
const { logAudit } = require('../services/leaderboard');

// Audit service (for structured audit logging)
const {
  log: auditLog,
  logAdmin: logAdminAction,
  EVENT_TYPES: AUDIT_EVENTS,
  SEVERITY: AUDIT_SEVERITY,
} = require('../services/audit');

// Validation helper
const { isValidAddress } = require('../services/helius');

// IP extraction helper
const { extractIP } = require('../services/ratelimit');

// ============================================
// LAZY-LOADED NOTIFICATION SERVICES (Phase 15)
// ============================================

let realtimeNotifications = null;
let notificationPreferences = null;
let pushNotifications = null;

function getRealtimeNotifications() {
  if (!realtimeNotifications) {
    realtimeNotifications = require('../services/realtimeNotifications');
  }
  return realtimeNotifications;
}

function getNotificationPreferencesService() {
  if (!notificationPreferences) {
    notificationPreferences = require('../services/notificationPreferences');
  }
  return notificationPreferences;
}

function getPushNotifications() {
  if (!pushNotifications) {
    pushNotifications = require('../services/pushNotifications');
  }
  return pushNotifications;
}

// ============================================
// BASIC NOTIFICATION ROUTES
// ============================================

/**
 * Get user notifications
 * GET /notifications
 */
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unread === 'true';

    const result = getNotifications(req.user.wallet, { limit, offset, unreadOnly });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-notifications') });
  }
});

/**
 * Mark notification as read (single)
 * POST /notifications/:id/read
 */
router.post('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const success = markAsRead(req.user.wallet, req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'mark-read') });
  }
});

/**
 * Mark all notifications as read
 * POST /notifications/read-all
 */
router.post('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const count = markAllAsRead(req.user.wallet);
    res.json({ success: true, markedCount: count });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'mark-all-read') });
  }
});

/**
 * Delete notification
 * DELETE /notifications/:id
 */
router.delete('/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const success = deleteNotification(req.user.wallet, req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'delete-notification') });
  }
});

// ============================================
// PHASE 15 NOTIFICATION ROUTES
// (Later versions supersede earlier duplicates)
// ============================================

/**
 * Get user notification preferences
 * GET /notifications/preferences
 * (Phase 15 version - uses lazy-loaded notificationPreferences service)
 */
router.get('/notifications/preferences', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const preferences = await getNotificationPreferencesService().getPreferences(wallet);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'notification-preferences') });
  }
});

/**
 * Update notification preferences
 * PUT /notifications/preferences
 * (Phase 15 version - includes validation + audit logging)
 */
router.put('/notifications/preferences', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const updates = req.body;

    // Validate updates structure
    const allowedKeys = ['enabled', 'channels', 'quietHours', 'digest'];
    const invalidKeys = Object.keys(updates).filter(k => !allowedKeys.includes(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ error: `Invalid keys: ${invalidKeys.join(', ')}` });
    }

    const result = await getNotificationPreferencesService().updatePreferences(wallet, updates);

    // Log preference change
    auditLog(
      AUDIT_EVENTS.SETTINGS_CHANGE,
      {
        wallet,
        category: 'notification_preferences',
        changes: Object.keys(updates),
      },
      { severity: AUDIT_SEVERITY.LOW }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'update-preferences') });
  }
});

/**
 * Get notification history
 * GET /notifications/history
 */
router.get('/notifications/history', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const { limit = 50, offset = 0, type, unreadOnly } = req.query;

    const notifications = await getRealtimeNotifications().getNotificationHistory(wallet, {
      limit: Math.min(parseInt(limit) || 50, 200),
      offset: parseInt(offset) || 0,
      type: type || null,
      unreadOnly: unreadOnly === 'true',
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'notification-history') });
  }
});

/**
 * Get unread notification count
 * GET /notifications/unread-count
 * (Phase 15 version - uses realtime notifications service)
 */
router.get('/notifications/unread-count', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const history = await getRealtimeNotifications().getNotificationHistory(wallet, { limit: 0 });
    res.json({ count: history.unreadCount });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'unread-count') });
  }
});

/**
 * Mark notification(s) as read (batch)
 * POST /notifications/read
 */
router.post('/notifications/read', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const { notificationIds, all = false } = req.body;

    if (all) {
      await getRealtimeNotifications().markAllRead(wallet);
      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'notificationIds array required or set all=true' });
    }

    // Limit batch size
    if (notificationIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 notifications per request' });
    }

    // Mark each notification as read
    for (const id of notificationIds) {
      await getRealtimeNotifications().markNotificationRead(wallet, id);
    }
    res.json({ success: true, marked: notificationIds.length });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'mark-read') });
  }
});

/**
 * Clear all notification history
 * DELETE /notifications
 */
router.delete('/notifications', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    await getRealtimeNotifications().clearHistory(wallet);
    res.json({ success: true, message: 'Notification history cleared' });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'delete-notifications') });
  }
});

// ============================================
// PUSH NOTIFICATION ROUTES
// ============================================

/**
 * Register push notification token
 * POST /notifications/push/register
 */
router.post('/notifications/push/register', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const { platform, token, subscription } = req.body;

    // Validate platform
    const validPlatforms = ['android', 'ios', 'web'];
    if (!platform || !validPlatforms.includes(platform)) {
      return res
        .status(400)
        .json({ error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
    }

    // Validate token/subscription based on platform
    if (platform === 'web') {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res
          .status(400)
          .json({ error: 'Web push requires subscription object with endpoint and keys' });
      }
    } else {
      if (!token) {
        return res.status(400).json({ error: 'Mobile push requires token' });
      }
    }

    const tokenData = {
      platform,
      token: platform === 'web' ? null : token,
      subscription: platform === 'web' ? subscription : null,
      userAgent: req.headers['user-agent'],
      ip: extractIP(req),
      registeredAt: Date.now(),
    };

    const result = await getNotificationPreferencesService().registerPushToken(wallet, tokenData);

    // Log token registration
    auditLog(
      AUDIT_EVENTS.DEVICE_LINKED,
      {
        wallet,
        platform,
        tokenPrefix: token ? token.slice(0, 20) + '...' : 'web-push',
      },
      { severity: AUDIT_SEVERITY.LOW }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'register-push') });
  }
});

/**
 * Unregister push notification token
 * DELETE /notifications/push/token
 */
router.delete('/notifications/push/token', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId required' });
    }

    const result = await getNotificationPreferencesService().unregisterPushToken(wallet, tokenId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'unregister-push') });
  }
});

/**
 * Get VAPID public key for web push
 * GET /notifications/push/vapid-key
 */
router.get('/notifications/push/vapid-key', (req, res) => {
  try {
    const vapidKey = getPushNotifications().getVapidPublicKey();

    if (!vapidKey) {
      return res.status(503).json({ error: 'Web push not configured' });
    }

    res.json({ publicKey: vapidKey });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'vapid-key') });
  }
});

/**
 * Get user's registered push tokens
 * GET /notifications/push/tokens
 */
router.get('/notifications/push/tokens', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const tokens = await getNotificationPreferencesService().getPushTokens(wallet);

    // Return sanitized token info (hide full tokens)
    const sanitizedTokens = tokens.map(t => ({
      id: t.id,
      platform: t.platform,
      registeredAt: t.registeredAt,
      lastUsed: t.lastUsed,
      active: t.active,
    }));

    res.json({ tokens: sanitizedTokens });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-tokens') });
  }
});

/**
 * Test push notification (development only)
 * POST /notifications/push/test
 */
router.post('/notifications/push/test', authMiddleware, async (req, res) => {
  try {
    // Only allow in development
    if (isProduction) {
      return res.status(403).json({ error: 'Test endpoint disabled in production' });
    }

    const wallet = req.wallet;
    const { title = 'Test Notification', body = 'This is a test from ASDF!' } = req.body;

    const result = await getPushNotifications().sendPushNotification(wallet, {
      type: 'test',
      title,
      body,
      data: { test: true, timestamp: Date.now() },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'test-push') });
  }
});

// ============================================
// WEBSOCKET SUBSCRIPTION INFO
// ============================================

/**
 * Subscribe to WebSocket notifications
 * GET /notifications/subscribe-info
 * Returns WebSocket connection info
 */
router.get('/notifications/subscribe-info', authMiddleware, (req, res) => {
  try {
    const wsPort = process.env.WS_PORT || 3002;
    const wsHost = process.env.WS_HOST || (isProduction ? req.hostname : 'localhost');
    const wsProtocol = isProduction ? 'wss' : 'ws';

    res.json({
      url: `${wsProtocol}://${wsHost}:${wsPort}`,
      protocols: ['asdf-notifications-v1'],
      heartbeatInterval: 21000, // 21 seconds (Fibonacci)
      reconnectDelay: 1000,
      maxReconnectDelay: 34000, // 34 seconds (Fibonacci)
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'subscribe-info') });
  }
});

// ============================================
// ADMIN NOTIFICATION ROUTES
// ============================================

/**
 * Send notification (admin/internal only)
 * POST /admin/notifications/send
 */
router.post('/admin/notifications/send', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { wallet, type, title, body, data, broadcast = false } = req.body;

    // Validate required fields
    if (!type || !title) {
      return res.status(400).json({ error: 'type and title required' });
    }

    // Validate notification type
    const validTypes = Object.values(getRealtimeNotifications().NOTIFICATION_TYPES);
    if (!validTypes.includes(type)) {
      return res
        .status(400)
        .json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Either wallet or broadcast required
    if (!wallet && !broadcast) {
      return res.status(400).json({ error: 'Either wallet or broadcast=true required' });
    }

    const notification = {
      type,
      title,
      body: body || '',
      data: data || {},
      createdAt: Date.now(),
    };

    let result;
    if (broadcast) {
      getRealtimeNotifications().broadcastToAll({
        type: 'notification',
        notification,
      });
      result = { success: true, broadcast: true };
    } else {
      if (!isValidAddress(wallet)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      result = await getRealtimeNotifications().notifyWallet(wallet, notification);
    }

    // Log admin action
    logAdminAction(AUDIT_EVENTS.ADMIN_ACTION, {
      action: 'send_notification',
      adminWallet: req.wallet,
      targetWallet: wallet || 'broadcast',
      notificationType: type,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'admin-send-notification') });
  }
});

/**
 * Get notification stats (admin)
 * GET /admin/notifications/stats
 */
router.get('/admin/notifications/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const wsStats = getRealtimeNotifications().getStats();
    const pushStats = getPushNotifications().getStats();
    const prefStats = getNotificationPreferencesService().getStats();

    res.json({
      websocket: wsStats,
      push: pushStats,
      preferences: prefStats,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'notification-stats') });
  }
});

/**
 * Get connected WebSocket clients (admin)
 * GET /admin/notifications/connections
 */
router.get('/admin/notifications/connections', authMiddleware, requireAdmin, (req, res) => {
  try {
    const connectionInfo = getRealtimeNotifications().getConnectionInfo();
    res.json(connectionInfo);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'notification-connections') });
  }
});

/**
 * Get WebSocket broadcast manager stats (admin)
 * GET /admin/broadcast/stats
 */
router.get('/admin/broadcast/stats', authMiddleware, requireAdmin, (req, res) => {
  try {
    const wsBroadcast = require('../services/wsBroadcast');
    const stats = wsBroadcast.getStats();
    res.json({
      ...stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'broadcast-stats') });
  }
});

module.exports = router;
