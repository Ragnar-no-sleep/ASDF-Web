/**
 * ASDF API - Notification Service
 *
 * Real-time user notification system:
 * - In-app notifications with priority levels
 * - Notification preferences per user
 * - Read/unread tracking
 * - Notification grouping and batching
 *
 * Security by Design:
 * - No sensitive data in notifications
 * - User-scoped access only
 * - Rate limiting on creation
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const NOTIFICATION_CONFIG = {
    // Max notifications per user (Fibonacci)
    maxPerUser: 89,

    // Max unread before auto-cleanup
    maxUnread: 34,

    // Notification TTL (21 days in ms)
    ttlMs: 21 * 24 * 60 * 60 * 1000,

    // Rate limiting
    maxCreatesPerMinute: 13,

    // Batch size for grouped notifications
    batchThreshold: 5
};

// Notification types
const NOTIFICATION_TYPES = {
    // System
    SYSTEM: 'system',
    ANNOUNCEMENT: 'announcement',

    // Achievements
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    TIER_UP: 'tier_up',
    STREAK_MILESTONE: 'streak_milestone',

    // Burns
    BURN_CONFIRMED: 'burn_confirmed',
    BURN_MILESTONE: 'burn_milestone',

    // Shop
    PURCHASE_COMPLETE: 'purchase_complete',
    ITEM_AVAILABLE: 'item_available',

    // Game
    HIGH_SCORE: 'high_score',
    LEADERBOARD_RANK: 'leaderboard_rank',

    // Social
    REFERRAL_JOINED: 'referral_joined',
    REFERRAL_REWARD: 'referral_reward'
};

// Priority levels
const PRIORITY = {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    URGENT: 3
};

// ============================================
// STORAGE
// ============================================

// wallet -> notifications array
const userNotifications = new Map();

// wallet -> preferences object
const userPreferences = new Map();

// Rate limiting
const createRateLimits = new Map();

// ============================================
// NOTIFICATION CREATION
// ============================================

/**
 * Create a notification for a user
 * @param {string} wallet - User wallet
 * @param {Object} notification - Notification data
 * @returns {{success: boolean, notification?: Object, error?: string}}
 */
function createNotification(wallet, notification) {
    // Rate limit check
    if (!checkRateLimit(wallet)) {
        return { success: false, error: 'Rate limit exceeded' };
    }

    // Check user preferences
    const prefs = getPreferences(wallet);
    if (!prefs.enabled) {
        return { success: false, error: 'Notifications disabled' };
    }

    // Check if this type is muted
    if (prefs.mutedTypes.includes(notification.type)) {
        return { success: false, error: 'Notification type muted' };
    }

    // Get or create user's notifications
    let notifications = userNotifications.get(wallet) || [];

    // Check max limit
    if (notifications.length >= NOTIFICATION_CONFIG.maxPerUser) {
        // Remove oldest read notifications
        notifications = cleanupOldNotifications(notifications);
    }

    // Create notification object
    const notif = {
        id: generateNotificationId(),
        type: notification.type || NOTIFICATION_TYPES.SYSTEM,
        title: sanitizeText(notification.title, 100),
        message: sanitizeText(notification.message, 500),
        priority: notification.priority || PRIORITY.NORMAL,
        data: sanitizeData(notification.data),
        icon: notification.icon || null,
        actionUrl: notification.actionUrl || null,
        read: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + NOTIFICATION_CONFIG.ttlMs
    };

    // Check for batching similar notifications
    const batched = tryBatchNotification(notifications, notif);
    if (batched) {
        userNotifications.set(wallet, notifications);
        return { success: true, notification: batched, batched: true };
    }

    // Add to beginning (newest first)
    notifications.unshift(notif);
    userNotifications.set(wallet, notifications);

    logAudit('notification_created', {
        wallet: wallet.slice(0, 8) + '...',
        type: notif.type,
        priority: notif.priority
    });

    return { success: true, notification: notif };
}

/**
 * Create notifications for multiple users
 * @param {string[]} wallets - User wallets
 * @param {Object} notification - Notification data
 * @returns {number} Count of successful notifications
 */
function broadcastNotification(wallets, notification) {
    let successCount = 0;

    for (const wallet of wallets) {
        const result = createNotification(wallet, notification);
        if (result.success) {
            successCount++;
        }
    }

    logAudit('notification_broadcast', {
        type: notification.type,
        targetCount: wallets.length,
        successCount
    });

    return successCount;
}

/**
 * Generate unique notification ID
 * @returns {string}
 */
function generateNotificationId() {
    return crypto.randomBytes(12).toString('hex');
}

/**
 * Sanitize text content
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Max length
 * @returns {string}
 */
function sanitizeText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';

    // Remove potential XSS
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .slice(0, maxLength)
        .trim();
}

/**
 * Sanitize notification data
 * @param {Object} data - Data object
 * @returns {Object}
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return {};

    // Only allow safe primitive values
    const safe = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            safe[key] = value;
        }
    }

    return safe;
}

/**
 * Try to batch similar notifications
 * @param {Array} notifications - Existing notifications
 * @param {Object} newNotif - New notification
 * @returns {Object|null} Batched notification or null
 */
function tryBatchNotification(notifications, newNotif) {
    // Find recent similar unread notifications
    const cutoff = Date.now() - (5 * 60 * 1000); // Last 5 minutes
    const similar = notifications.filter(n =>
        !n.read &&
        n.type === newNotif.type &&
        n.createdAt > cutoff &&
        !n.batchCount
    );

    if (similar.length >= NOTIFICATION_CONFIG.batchThreshold - 1) {
        // Create batched notification
        const batch = {
            ...newNotif,
            id: generateNotificationId(),
            title: `${similar.length + 1} ${newNotif.title}`,
            batchCount: similar.length + 1,
            batchedIds: similar.map(n => n.id)
        };

        // Remove individual notifications
        for (const s of similar) {
            const idx = notifications.findIndex(n => n.id === s.id);
            if (idx > -1) {
                notifications.splice(idx, 1);
            }
        }

        // Add batch
        notifications.unshift(batch);
        return batch;
    }

    return null;
}

// ============================================
// NOTIFICATION RETRIEVAL
// ============================================

/**
 * Get user's notifications
 * @param {string} wallet - User wallet
 * @param {Object} options - Query options
 * @returns {Object}
 */
function getNotifications(wallet, options = {}) {
    const {
        limit = 20,
        offset = 0,
        unreadOnly = false,
        type = null
    } = options;

    let notifications = userNotifications.get(wallet) || [];

    // Clean expired
    const now = Date.now();
    notifications = notifications.filter(n => n.expiresAt > now);
    userNotifications.set(wallet, notifications);

    // Filter
    let filtered = notifications;

    if (unreadOnly) {
        filtered = filtered.filter(n => !n.read);
    }

    if (type) {
        filtered = filtered.filter(n => n.type === type);
    }

    // Paginate
    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return {
        notifications: items,
        total,
        unreadCount: notifications.filter(n => !n.read).length,
        hasMore: offset + items.length < total
    };
}

/**
 * Get unread count for user
 * @param {string} wallet - User wallet
 * @returns {number}
 */
function getUnreadCount(wallet) {
    const notifications = userNotifications.get(wallet) || [];
    return notifications.filter(n => !n.read).length;
}

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================

/**
 * Mark notification as read
 * @param {string} wallet - User wallet
 * @param {string} notificationId - Notification ID
 * @returns {boolean}
 */
function markAsRead(wallet, notificationId) {
    const notifications = userNotifications.get(wallet);
    if (!notifications) return false;

    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) return false;

    notif.read = true;
    notif.readAt = Date.now();

    return true;
}

/**
 * Mark all notifications as read
 * @param {string} wallet - User wallet
 * @returns {number} Count marked
 */
function markAllAsRead(wallet) {
    const notifications = userNotifications.get(wallet);
    if (!notifications) return 0;

    let count = 0;
    const now = Date.now();

    for (const notif of notifications) {
        if (!notif.read) {
            notif.read = true;
            notif.readAt = now;
            count++;
        }
    }

    return count;
}

/**
 * Delete a notification
 * @param {string} wallet - User wallet
 * @param {string} notificationId - Notification ID
 * @returns {boolean}
 */
function deleteNotification(wallet, notificationId) {
    const notifications = userNotifications.get(wallet);
    if (!notifications) return false;

    const idx = notifications.findIndex(n => n.id === notificationId);
    if (idx === -1) return false;

    notifications.splice(idx, 1);
    return true;
}

/**
 * Clear all notifications for user
 * @param {string} wallet - User wallet
 * @returns {number} Count cleared
 */
function clearAllNotifications(wallet) {
    const notifications = userNotifications.get(wallet);
    if (!notifications) return 0;

    const count = notifications.length;
    userNotifications.delete(wallet);

    return count;
}

// ============================================
// PREFERENCES
// ============================================

/**
 * Get user notification preferences
 * @param {string} wallet - User wallet
 * @returns {Object}
 */
function getPreferences(wallet) {
    return userPreferences.get(wallet) || {
        enabled: true,
        mutedTypes: [],
        emailEnabled: false,
        pushEnabled: false
    };
}

/**
 * Update user preferences
 * @param {string} wallet - User wallet
 * @param {Object} updates - Preference updates
 * @returns {Object}
 */
function updatePreferences(wallet, updates) {
    const current = getPreferences(wallet);

    const updated = {
        ...current,
        enabled: updates.enabled ?? current.enabled,
        mutedTypes: Array.isArray(updates.mutedTypes) ? updates.mutedTypes : current.mutedTypes,
        emailEnabled: updates.emailEnabled ?? current.emailEnabled,
        pushEnabled: updates.pushEnabled ?? current.pushEnabled
    };

    userPreferences.set(wallet, updated);

    logAudit('notification_prefs_updated', {
        wallet: wallet.slice(0, 8) + '...'
    });

    return updated;
}

/**
 * Mute a notification type
 * @param {string} wallet - User wallet
 * @param {string} type - Notification type
 * @returns {boolean}
 */
function muteType(wallet, type) {
    const prefs = getPreferences(wallet);

    if (!prefs.mutedTypes.includes(type)) {
        prefs.mutedTypes.push(type);
        userPreferences.set(wallet, prefs);
    }

    return true;
}

/**
 * Unmute a notification type
 * @param {string} wallet - User wallet
 * @param {string} type - Notification type
 * @returns {boolean}
 */
function unmuteType(wallet, type) {
    const prefs = getPreferences(wallet);

    const idx = prefs.mutedTypes.indexOf(type);
    if (idx > -1) {
        prefs.mutedTypes.splice(idx, 1);
        userPreferences.set(wallet, prefs);
    }

    return true;
}

// ============================================
// CLEANUP & RATE LIMITING
// ============================================

/**
 * Cleanup old notifications
 * @param {Array} notifications - Notification array
 * @returns {Array} Cleaned array
 */
function cleanupOldNotifications(notifications) {
    // Sort by: unread first, then by date
    notifications.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return b.createdAt - a.createdAt;
    });

    // Keep unread and recent read
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);

    // Keep all unread up to max, then fill with read
    const maxUnread = Math.min(unread.length, NOTIFICATION_CONFIG.maxUnread);
    const maxRead = NOTIFICATION_CONFIG.maxPerUser - maxUnread;

    return [
        ...unread.slice(0, maxUnread),
        ...read.slice(0, maxRead)
    ];
}

/**
 * Check rate limit for notification creation
 * @param {string} wallet - User wallet
 * @returns {boolean}
 */
function checkRateLimit(wallet) {
    const now = Date.now();
    const windowStart = now - 60000;

    let record = createRateLimits.get(wallet);

    if (!record || record.windowStart < windowStart) {
        record = { windowStart: now, count: 0 };
    }

    if (record.count >= NOTIFICATION_CONFIG.maxCreatesPerMinute) {
        return false;
    }

    record.count++;
    createRateLimits.set(wallet, record);

    return true;
}

// Cleanup expired notifications every hour
setInterval(() => {
    const now = Date.now();
    let totalCleaned = 0;

    for (const [wallet, notifications] of userNotifications.entries()) {
        const before = notifications.length;
        const cleaned = notifications.filter(n => n.expiresAt > now);

        if (cleaned.length < before) {
            userNotifications.set(wallet, cleaned);
            totalCleaned += before - cleaned.length;
        }
    }

    if (totalCleaned > 0) {
        console.log(`[Notifications] Cleaned ${totalCleaned} expired notifications`);
    }
}, 60 * 60 * 1000);

// ============================================
// NOTIFICATION HELPERS
// ============================================

/**
 * Create achievement notification
 * @param {string} wallet - User wallet
 * @param {Object} achievement - Achievement data
 */
function notifyAchievementUnlocked(wallet, achievement) {
    return createNotification(wallet, {
        type: NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
        title: 'Achievement Unlocked!',
        message: `You earned "${achievement.name}"`,
        priority: PRIORITY.HIGH,
        icon: achievement.icon,
        data: {
            achievementId: achievement.id,
            rarity: achievement.rarity,
            xpReward: achievement.xpReward
        }
    });
}

/**
 * Create tier up notification
 * @param {string} wallet - User wallet
 * @param {string} newTier - New tier name
 * @param {number} tierIndex - Tier index
 */
function notifyTierUp(wallet, newTier, tierIndex) {
    return createNotification(wallet, {
        type: NOTIFICATION_TYPES.TIER_UP,
        title: 'Tier Up!',
        message: `You reached ${newTier} tier!`,
        priority: PRIORITY.HIGH,
        icon: `tier_${tierIndex}`,
        data: { tier: newTier, tierIndex }
    });
}

/**
 * Create burn confirmed notification
 * @param {string} wallet - User wallet
 * @param {number} amount - Burn amount
 * @param {string} signature - Transaction signature
 */
function notifyBurnConfirmed(wallet, amount, signature) {
    return createNotification(wallet, {
        type: NOTIFICATION_TYPES.BURN_CONFIRMED,
        title: 'Burn Confirmed',
        message: `${amount.toLocaleString()} ASDF burned successfully`,
        priority: PRIORITY.NORMAL,
        icon: 'flame',
        data: {
            amount,
            signature: signature.slice(0, 16) + '...'
        }
    });
}

/**
 * Create purchase complete notification
 * @param {string} wallet - User wallet
 * @param {Object} item - Purchased item
 */
function notifyPurchaseComplete(wallet, item) {
    return createNotification(wallet, {
        type: NOTIFICATION_TYPES.PURCHASE_COMPLETE,
        title: 'Purchase Complete',
        message: `You now own "${item.name}"`,
        priority: PRIORITY.NORMAL,
        icon: item.icon || 'shopping_bag',
        data: { itemId: item.id, itemName: item.name }
    });
}

/**
 * Create referral notification
 * @param {string} wallet - Referrer wallet
 * @param {number} rewardAmount - Reward amount
 */
function notifyReferralReward(wallet, rewardAmount) {
    return createNotification(wallet, {
        type: NOTIFICATION_TYPES.REFERRAL_REWARD,
        title: 'Referral Reward',
        message: `You earned ${rewardAmount} XP from a referral!`,
        priority: PRIORITY.HIGH,
        icon: 'gift',
        data: { xpReward: rewardAmount }
    });
}

// ============================================
// METRICS
// ============================================

/**
 * Get notification service metrics
 * @returns {Object}
 */
function getNotificationMetrics() {
    let totalNotifications = 0;
    let totalUnread = 0;

    for (const notifications of userNotifications.values()) {
        totalNotifications += notifications.length;
        totalUnread += notifications.filter(n => !n.read).length;
    }

    return {
        usersWithNotifications: userNotifications.size,
        totalNotifications,
        totalUnread,
        usersWithPreferences: userPreferences.size,
        config: NOTIFICATION_CONFIG
    };
}

module.exports = {
    // Types
    NOTIFICATION_TYPES,
    PRIORITY,

    // Core
    createNotification,
    broadcastNotification,
    getNotifications,
    getUnreadCount,

    // Management
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,

    // Preferences
    getPreferences,
    updatePreferences,
    muteType,
    unmuteType,

    // Helpers
    notifyAchievementUnlocked,
    notifyTierUp,
    notifyBurnConfirmed,
    notifyPurchaseComplete,
    notifyReferralReward,

    // Metrics
    getNotificationMetrics
};
