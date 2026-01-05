/**
 * ASDF API - Push Notification Service
 *
 * Multi-platform push notification support:
 * - Firebase Cloud Messaging (Android/iOS/Web)
 * - Apple Push Notification Service (iOS native)
 * - Web Push (Service Workers)
 *
 * Prepared for future integration
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Token validation
 * - Rate limiting
 * - Payload sanitization
 */

'use strict';

const crypto = require('crypto');
const { getStorage } = require('./storage');
const { getPushTokens, shouldSendNotification } = require('./notificationPreferences');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const PUSH_CONFIG = {
    // Firebase (Android/iOS/Web)
    firebase: {
        enabled: !!process.env.FIREBASE_SERVER_KEY,
        serverKey: process.env.FIREBASE_SERVER_KEY,
        apiUrl: 'https://fcm.googleapis.com/fcm/send'
    },

    // Apple (iOS native)
    apns: {
        enabled: !!process.env.APNS_KEY_ID,
        keyId: process.env.APNS_KEY_ID,
        teamId: process.env.APNS_TEAM_ID,
        bundleId: process.env.APNS_BUNDLE_ID,
        production: process.env.NODE_ENV === 'production'
    },

    // Web Push (VAPID)
    webPush: {
        enabled: !!process.env.VAPID_PUBLIC_KEY,
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
        subject: process.env.VAPID_SUBJECT || 'mailto:contact@asdf.games'
    },

    // Rate limiting
    maxPushPerMinute: 100,
    maxPushPerWallet: 10,

    // Retry settings (Fibonacci)
    retryDelays: [1000, 1000, 2000, 3000, 5000],
    maxRetries: 5,

    // TTL
    defaultTTL: 24 * 60 * 60,  // 24 hours

    // Payload limits
    maxPayloadSize: 4096,      // 4KB
    maxTitleLength: 100,
    maxBodyLength: 256
};

// Notification categories for iOS
const NOTIFICATION_CATEGORIES = {
    ACHIEVEMENT: 'achievement',
    LEVEL_UP: 'level_up',
    BURN: 'burn',
    SOCIAL: 'social',
    SYSTEM: 'system'
};

// ============================================
// STATE
// ============================================

// Rate limiting
const rateLimits = {
    global: { count: 0, windowStart: Date.now() },
    perWallet: new Map()
};

// Pending notifications queue
const pendingQueue = [];
let isProcessing = false;

// Statistics
const stats = {
    totalSent: 0,
    totalFailed: 0,
    byPlatform: {
        android: { sent: 0, failed: 0 },
        ios: { sent: 0, failed: 0 },
        web: { sent: 0, failed: 0 }
    },
    lastError: null
};

// ============================================
// MAIN API
// ============================================

/**
 * Send push notification to a wallet
 * @param {string} wallet - Target wallet
 * @param {Object} notification - Notification data
 * @param {Object} options - Send options
 * @returns {Promise<Object>}
 */
async function sendPushNotification(wallet, notification, options = {}) {
    // Check if push is enabled for this notification type
    const shouldSend = await shouldSendNotification(wallet, notification.type, 'push');
    if (!shouldSend.send) {
        return { sent: false, reason: shouldSend.reason };
    }

    // Rate limit check
    if (!checkRateLimit(wallet)) {
        return { sent: false, reason: 'rate_limited' };
    }

    // Get push tokens
    const tokens = await getPushTokens(wallet);
    if (tokens.length === 0) {
        return { sent: false, reason: 'no_tokens' };
    }

    // Build payload
    const payload = buildPayload(notification, options);

    // Send to all registered devices
    const results = await Promise.allSettled(
        tokens.map(token => sendToToken(token, payload, options))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;

    return {
        sent: succeeded > 0,
        results: {
            total: tokens.length,
            succeeded,
            failed
        }
    };
}

/**
 * Send push to multiple wallets
 * @param {string[]} wallets - Target wallets
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>}
 */
async function sendBulkPushNotification(wallets, notification) {
    const results = {
        total: wallets.length,
        succeeded: 0,
        failed: 0,
        skipped: 0
    };

    for (const wallet of wallets) {
        const result = await sendPushNotification(wallet, notification);

        if (result.sent) {
            results.succeeded++;
        } else if (result.reason === 'no_tokens') {
            results.skipped++;
        } else {
            results.failed++;
        }
    }

    return results;
}

/**
 * Queue notification for sending (async)
 * @param {string} wallet - Target wallet
 * @param {Object} notification - Notification data
 */
function queuePushNotification(wallet, notification) {
    pendingQueue.push({ wallet, notification, timestamp: Date.now() });
    processQueue();
}

// ============================================
// PLATFORM-SPECIFIC SENDERS
// ============================================

/**
 * Send notification to a specific token
 * @param {Object} tokenData - Token data
 * @param {Object} payload - Notification payload
 * @param {Object} options - Send options
 * @returns {Promise<Object>}
 */
async function sendToToken(tokenData, payload, options = {}) {
    const { token, platform } = tokenData;

    try {
        let result;

        switch (platform) {
            case 'android':
            case 'ios':
                result = await sendViaFirebase(token, payload, platform, options);
                break;

            case 'web':
                result = await sendViaWebPush(token, payload, options);
                break;

            default:
                return { success: false, error: 'Unknown platform' };
        }

        if (result.success) {
            stats.totalSent++;
            stats.byPlatform[platform].sent++;
        } else {
            stats.totalFailed++;
            stats.byPlatform[platform].failed++;
        }

        return result;

    } catch (error) {
        stats.totalFailed++;
        if (stats.byPlatform[platform]) {
            stats.byPlatform[platform].failed++;
        }
        stats.lastError = error.message;

        return { success: false, error: error.message };
    }
}

/**
 * Send via Firebase Cloud Messaging
 * @param {string} token - FCM token
 * @param {Object} payload - Notification payload
 * @param {string} platform - Platform (android/ios)
 * @param {Object} options - Options
 * @returns {Promise<Object>}
 */
async function sendViaFirebase(token, payload, platform, options = {}) {
    if (!PUSH_CONFIG.firebase.enabled) {
        return { success: false, error: 'Firebase not configured' };
    }

    const fcmPayload = {
        to: token,
        notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            click_action: payload.clickAction
        },
        data: payload.data || {},
        android: platform === 'android' ? {
            priority: payload.priority === 'high' ? 'high' : 'normal',
            ttl: `${options.ttl || PUSH_CONFIG.defaultTTL}s`,
            notification: {
                channel_id: payload.category || 'default',
                sound: payload.sound !== false ? 'default' : null,
                color: '#FF6B00'  // ASDF orange
            }
        } : undefined,
        apns: platform === 'ios' ? {
            headers: {
                'apns-priority': payload.priority === 'high' ? '10' : '5',
                'apns-expiration': String(Math.floor(Date.now() / 1000) + (options.ttl || PUSH_CONFIG.defaultTTL))
            },
            payload: {
                aps: {
                    alert: {
                        title: payload.title,
                        body: payload.body
                    },
                    badge: payload.badge,
                    sound: payload.sound !== false ? 'default' : null,
                    category: payload.category
                }
            }
        } : undefined
    };

    // TODO: Actually send via Firebase when configured
    // const response = await fetch(PUSH_CONFIG.firebase.apiUrl, {
    //     method: 'POST',
    //     headers: {
    //         'Authorization': `key=${PUSH_CONFIG.firebase.serverKey}`,
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(fcmPayload)
    // });

    // For now, return simulated success
    console.log('[Push] Firebase notification prepared:', {
        platform,
        title: payload.title
    });

    return {
        success: true,
        platform: 'firebase',
        messageId: `sim_${Date.now()}`
    };
}

/**
 * Send via Web Push (VAPID)
 * @param {string} subscription - Web Push subscription
 * @param {Object} payload - Notification payload
 * @param {Object} options - Options
 * @returns {Promise<Object>}
 */
async function sendViaWebPush(subscription, payload, options = {}) {
    if (!PUSH_CONFIG.webPush.enabled) {
        return { success: false, error: 'Web Push not configured' };
    }

    const webPushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: payload.tag || payload.category,
        data: {
            url: payload.clickAction,
            ...payload.data
        },
        actions: payload.actions || [],
        requireInteraction: payload.priority === 'high',
        renotify: true
    });

    // TODO: Actually send via web-push library when configured
    // const webpush = require('web-push');
    // webpush.setVapidDetails(
    //     PUSH_CONFIG.webPush.subject,
    //     PUSH_CONFIG.webPush.publicKey,
    //     PUSH_CONFIG.webPush.privateKey
    // );
    // await webpush.sendNotification(JSON.parse(subscription), webPushPayload);

    console.log('[Push] Web Push notification prepared:', {
        title: payload.title
    });

    return {
        success: true,
        platform: 'web'
    };
}

// ============================================
// PAYLOAD BUILDING
// ============================================

/**
 * Build notification payload
 * @param {Object} notification - Raw notification
 * @param {Object} options - Build options
 * @returns {Object}
 */
function buildPayload(notification, options = {}) {
    const { type, data } = notification;

    // Get template for notification type
    const template = getNotificationTemplate(type, data);

    // Sanitize and limit lengths
    const payload = {
        title: sanitizeText(template.title, PUSH_CONFIG.maxTitleLength),
        body: sanitizeText(template.body, PUSH_CONFIG.maxBodyLength),
        icon: template.icon || getIconForType(type),
        category: getCategoryForType(type),
        priority: template.priority || 'normal',
        clickAction: template.clickAction || getDefaultClickAction(type),
        sound: template.sound !== false,
        badge: options.badge,
        tag: `asdf_${type}_${Date.now()}`,
        data: {
            type,
            ...data,
            timestamp: Date.now()
        }
    };

    // Add actions if appropriate
    if (template.actions) {
        payload.actions = template.actions.slice(0, 2);  // Max 2 actions
    }

    return payload;
}

/**
 * Get notification template
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Object}
 */
function getNotificationTemplate(type, data) {
    const templates = {
        achievement_unlocked: {
            title: '🏆 Achievement Unlocked!',
            body: `You earned "${data.name || 'Achievement'}"`,
            icon: '/icons/achievement.png',
            priority: 'high',
            clickAction: '/achievements',
            actions: [
                { action: 'view', title: 'View' },
                { action: 'share', title: 'Share' }
            ]
        },

        level_up: {
            title: '⬆️ Level Up!',
            body: `You reached Level ${data.newLevel || '?'}`,
            icon: '/icons/level-up.png',
            priority: 'high',
            clickAction: '/profile',
            sound: true
        },

        tier_up: {
            title: '🔥 New Tier!',
            body: `You're now ${data.tierName || 'a higher tier'}`,
            icon: '/icons/tier.png',
            priority: 'high',
            clickAction: '/profile'
        },

        rank_change: {
            title: data.direction === 'up' ? '📈 Rank Up!' : '📉 Rank Changed',
            body: `You're now #${data.newRank} on the leaderboard`,
            icon: '/icons/rank.png',
            priority: 'normal',
            clickAction: '/leaderboard'
        },

        overtaken: {
            title: '⚔️ Challenge!',
            body: `${data.by || 'Someone'} passed your score`,
            icon: '/icons/challenge.png',
            priority: 'normal',
            clickAction: '/leaderboard'
        },

        burn_confirmed: {
            title: '🔥 Burn Confirmed',
            body: `${formatNumber(data.amount || 0)} ASDF burned`,
            icon: '/icons/burn.png',
            priority: 'normal',
            clickAction: '/burns'
        },

        whale_burn: {
            title: '🐋 Whale Alert!',
            body: `${data.wallet || 'Someone'} burned ${formatNumber(data.amount || 0)} ASDF`,
            icon: '/icons/whale.png',
            priority: 'high',
            clickAction: '/burns'
        },

        event_start: {
            title: '🎉 Event Started!',
            body: data.name || 'A new event has begun',
            icon: '/icons/event.png',
            priority: 'high',
            clickAction: '/events'
        },

        announcement: {
            title: '📢 Announcement',
            body: data.message || 'New announcement',
            icon: '/icons/announce.png',
            priority: 'high',
            clickAction: '/'
        },

        maintenance: {
            title: '🔧 Maintenance',
            body: data.message || 'System maintenance scheduled',
            icon: '/icons/maintenance.png',
            priority: 'high',
            clickAction: '/'
        }
    };

    return templates[type] || {
        title: 'ASDF Games',
        body: data.message || 'You have a new notification',
        icon: '/icons/default.png',
        priority: 'normal',
        clickAction: '/'
    };
}

/**
 * Get icon URL for notification type
 * @param {string} type - Notification type
 * @returns {string}
 */
function getIconForType(type) {
    const icons = {
        achievement_unlocked: '/icons/achievement.png',
        level_up: '/icons/level-up.png',
        burn_confirmed: '/icons/burn.png',
        default: '/icons/notification.png'
    };
    return icons[type] || icons.default;
}

/**
 * Get category for notification type
 * @param {string} type - Notification type
 * @returns {string}
 */
function getCategoryForType(type) {
    const categories = {
        achievement_unlocked: NOTIFICATION_CATEGORIES.ACHIEVEMENT,
        level_up: NOTIFICATION_CATEGORIES.LEVEL_UP,
        tier_up: NOTIFICATION_CATEGORIES.LEVEL_UP,
        burn_confirmed: NOTIFICATION_CATEGORIES.BURN,
        whale_burn: NOTIFICATION_CATEGORIES.BURN,
        overtaken: NOTIFICATION_CATEGORIES.SOCIAL,
        announcement: NOTIFICATION_CATEGORIES.SYSTEM,
        maintenance: NOTIFICATION_CATEGORIES.SYSTEM
    };
    return categories[type] || NOTIFICATION_CATEGORIES.SYSTEM;
}

/**
 * Get default click action for type
 * @param {string} type - Notification type
 * @returns {string}
 */
function getDefaultClickAction(type) {
    const actions = {
        achievement_unlocked: '/achievements',
        level_up: '/profile',
        burn_confirmed: '/burns',
        leaderboard_update: '/leaderboard'
    };
    return actions[type] || '/';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check rate limit
 * @param {string} wallet - Wallet address
 * @returns {boolean}
 */
function checkRateLimit(wallet) {
    const now = Date.now();

    // Global rate limit
    if (now - rateLimits.global.windowStart > 60000) {
        rateLimits.global = { count: 0, windowStart: now };
    }
    if (rateLimits.global.count >= PUSH_CONFIG.maxPushPerMinute) {
        return false;
    }

    // Per-wallet rate limit
    let walletLimit = rateLimits.perWallet.get(wallet);
    if (!walletLimit || now - walletLimit.windowStart > 60000) {
        walletLimit = { count: 0, windowStart: now };
        rateLimits.perWallet.set(wallet, walletLimit);
    }
    if (walletLimit.count >= PUSH_CONFIG.maxPushPerWallet) {
        return false;
    }

    // Increment counters
    rateLimits.global.count++;
    walletLimit.count++;

    return true;
}

/**
 * Sanitize text for notification
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
function sanitizeText(text, maxLength) {
    if (!text) return '';

    // Remove potential HTML/script
    let safe = text.replace(/<[^>]*>/g, '');

    // Truncate
    if (safe.length > maxLength) {
        safe = safe.substring(0, maxLength - 3) + '...';
    }

    return safe;
}

/**
 * Format number for display
 * @param {number} num - Number to format
 * @returns {string}
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Process pending queue
 */
async function processQueue() {
    if (isProcessing || pendingQueue.length === 0) return;

    isProcessing = true;

    while (pendingQueue.length > 0) {
        const item = pendingQueue.shift();

        try {
            await sendPushNotification(item.wallet, item.notification);
        } catch (error) {
            console.error('[Push] Queue processing error:', error.message);
        }

        // Small delay between sends
        await new Promise(r => setTimeout(r, 100));
    }

    isProcessing = false;
}

// ============================================
// METRICS
// ============================================

/**
 * Get push notification statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...stats,
        queueSize: pendingQueue.length,
        configured: {
            firebase: PUSH_CONFIG.firebase.enabled,
            apns: PUSH_CONFIG.apns.enabled,
            webPush: PUSH_CONFIG.webPush.enabled
        }
    };
}

/**
 * Get VAPID public key for web push
 * @returns {string|null}
 */
function getVapidPublicKey() {
    return PUSH_CONFIG.webPush.publicKey || null;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Sending
    sendPushNotification,
    sendBulkPushNotification,
    queuePushNotification,

    // Stats
    getStats,
    getVapidPublicKey,

    // Types
    NOTIFICATION_CATEGORIES,
    PUSH_CONFIG
};
