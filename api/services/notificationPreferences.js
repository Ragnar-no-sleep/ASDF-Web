/**
 * ASDF API - Notification Preferences Service
 *
 * User notification settings management:
 * - Per-type enable/disable
 * - Delivery channel preferences
 * - Quiet hours
 * - Digest preferences
 * - Push token management
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Wallet-based access
 * - Token encryption
 * - Preference validation
 */

'use strict';

const crypto = require('crypto');
const { getStorage, keys } = require('./storage');
const { NOTIFICATION_TYPES, CHANNELS } = require('./realtimeNotifications');

// ============================================
// CONFIGURATION
// ============================================

const PREFS_CONFIG = {
    // Default preferences
    defaults: {
        enabled: true,
        channels: {
            websocket: true,
            push: true,
            email: false
        },
        types: {
            // Personal - all enabled by default
            achievement_unlocked: { enabled: true, priority: 'high' },
            level_up: { enabled: true, priority: 'high' },
            tier_up: { enabled: true, priority: 'high' },
            rank_change: { enabled: true, priority: 'normal' },
            streak_milestone: { enabled: true, priority: 'normal' },
            reward_received: { enabled: true, priority: 'high' },

            // Social - configurable
            overtaken: { enabled: true, priority: 'normal' },
            mentioned: { enabled: true, priority: 'high' },
            friend_achievement: { enabled: false, priority: 'low' },

            // Global - less by default
            burn_confirmed: { enabled: true, priority: 'low' },
            whale_burn: { enabled: true, priority: 'normal' },
            leaderboard_update: { enabled: false, priority: 'low' },

            // System - always on
            maintenance: { enabled: true, priority: 'critical', locked: true },
            event_start: { enabled: true, priority: 'high' },
            event_end: { enabled: true, priority: 'normal' },
            announcement: { enabled: true, priority: 'high', locked: true }
        },
        quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timezone: 'UTC',
            allowCritical: true
        },
        digest: {
            enabled: false,
            frequency: 'daily',  // daily, weekly
            time: '09:00',
            timezone: 'UTC'
        },
        sounds: {
            enabled: true,
            achievement: true,
            levelUp: true,
            other: false
        }
    },

    // Valid values
    validFrequencies: ['daily', 'weekly'],
    validPriorities: ['critical', 'high', 'normal', 'low'],
    validTimezones: [
        'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore',
        'Australia/Sydney'
    ]
};

// ============================================
// STORAGE
// ============================================

// In-memory cache of preferences
const prefsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

// Push tokens (encrypted)
const pushTokens = new Map();

// ============================================
// PREFERENCES MANAGEMENT
// ============================================

/**
 * Get user preferences
 * @param {string} wallet - Wallet address
 * @returns {Promise<Object>}
 */
async function getPreferences(wallet) {
    // Check cache
    const cached = prefsCache.get(wallet);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.prefs;
    }

    // Load from storage
    const storage = getStorage();
    const prefsKey = keys.notificationPrefs(wallet);
    let prefs = await storage.get(prefsKey);

    if (!prefs) {
        // Return defaults
        prefs = JSON.parse(JSON.stringify(PREFS_CONFIG.defaults));
    } else {
        // Merge with defaults (in case new options were added)
        prefs = mergeWithDefaults(prefs);
    }

    // Update cache
    prefsCache.set(wallet, { prefs, timestamp: Date.now() });

    return prefs;
}

/**
 * Update user preferences
 * @param {string} wallet - Wallet address
 * @param {Object} updates - Preference updates
 * @returns {Promise<Object>}
 */
async function updatePreferences(wallet, updates) {
    const current = await getPreferences(wallet);

    // Validate and apply updates
    const updated = applyUpdates(current, updates);

    // Save to storage
    const storage = getStorage();
    const prefsKey = keys.notificationPrefs(wallet);
    await storage.set(prefsKey, updated);

    // Update cache
    prefsCache.set(wallet, { prefs: updated, timestamp: Date.now() });

    return updated;
}

/**
 * Reset preferences to defaults
 * @param {string} wallet - Wallet address
 * @returns {Promise<Object>}
 */
async function resetPreferences(wallet) {
    const defaults = JSON.parse(JSON.stringify(PREFS_CONFIG.defaults));

    const storage = getStorage();
    const prefsKey = keys.notificationPrefs(wallet);
    await storage.set(prefsKey, defaults);

    prefsCache.set(wallet, { prefs: defaults, timestamp: Date.now() });

    return defaults;
}

/**
 * Merge user prefs with defaults
 * @param {Object} prefs - User preferences
 * @returns {Object}
 */
function mergeWithDefaults(prefs) {
    const defaults = PREFS_CONFIG.defaults;
    const merged = { ...defaults };

    // Merge top level
    if (prefs.enabled !== undefined) merged.enabled = prefs.enabled;

    // Merge channels
    if (prefs.channels) {
        merged.channels = { ...defaults.channels, ...prefs.channels };
    }

    // Merge notification types
    if (prefs.types) {
        merged.types = { ...defaults.types };
        for (const [type, settings] of Object.entries(prefs.types)) {
            if (merged.types[type]) {
                // Don't allow modifying locked settings
                if (!merged.types[type].locked) {
                    merged.types[type] = { ...merged.types[type], ...settings };
                }
            }
        }
    }

    // Merge quiet hours
    if (prefs.quietHours) {
        merged.quietHours = { ...defaults.quietHours, ...prefs.quietHours };
    }

    // Merge digest
    if (prefs.digest) {
        merged.digest = { ...defaults.digest, ...prefs.digest };
    }

    // Merge sounds
    if (prefs.sounds) {
        merged.sounds = { ...defaults.sounds, ...prefs.sounds };
    }

    return merged;
}

/**
 * Apply updates with validation
 * @param {Object} current - Current preferences
 * @param {Object} updates - Updates to apply
 * @returns {Object}
 */
function applyUpdates(current, updates) {
    const result = JSON.parse(JSON.stringify(current));

    // Update enabled
    if (updates.enabled !== undefined) {
        result.enabled = Boolean(updates.enabled);
    }

    // Update channels
    if (updates.channels) {
        for (const [channel, enabled] of Object.entries(updates.channels)) {
            if (result.channels[channel] !== undefined) {
                result.channels[channel] = Boolean(enabled);
            }
        }
    }

    // Update notification types
    if (updates.types) {
        for (const [type, settings] of Object.entries(updates.types)) {
            if (result.types[type] && !result.types[type].locked) {
                if (settings.enabled !== undefined) {
                    result.types[type].enabled = Boolean(settings.enabled);
                }
                if (settings.priority && PREFS_CONFIG.validPriorities.includes(settings.priority)) {
                    result.types[type].priority = settings.priority;
                }
            }
        }
    }

    // Update quiet hours
    if (updates.quietHours) {
        const qh = updates.quietHours;

        if (qh.enabled !== undefined) {
            result.quietHours.enabled = Boolean(qh.enabled);
        }
        if (qh.start && isValidTime(qh.start)) {
            result.quietHours.start = qh.start;
        }
        if (qh.end && isValidTime(qh.end)) {
            result.quietHours.end = qh.end;
        }
        if (qh.timezone && PREFS_CONFIG.validTimezones.includes(qh.timezone)) {
            result.quietHours.timezone = qh.timezone;
        }
        if (qh.allowCritical !== undefined) {
            result.quietHours.allowCritical = Boolean(qh.allowCritical);
        }
    }

    // Update digest
    if (updates.digest) {
        const d = updates.digest;

        if (d.enabled !== undefined) {
            result.digest.enabled = Boolean(d.enabled);
        }
        if (d.frequency && PREFS_CONFIG.validFrequencies.includes(d.frequency)) {
            result.digest.frequency = d.frequency;
        }
        if (d.time && isValidTime(d.time)) {
            result.digest.time = d.time;
        }
        if (d.timezone && PREFS_CONFIG.validTimezones.includes(d.timezone)) {
            result.digest.timezone = d.timezone;
        }
    }

    // Update sounds
    if (updates.sounds) {
        for (const [sound, enabled] of Object.entries(updates.sounds)) {
            if (result.sounds[sound] !== undefined) {
                result.sounds[sound] = Boolean(enabled);
            }
        }
    }

    return result;
}

// ============================================
// NOTIFICATION FILTERING
// ============================================

/**
 * Check if notification should be sent
 * @param {string} wallet - Wallet address
 * @param {string} notificationType - Notification type
 * @param {string} channel - Delivery channel
 * @returns {Promise<{send: boolean, reason?: string}>}
 */
async function shouldSendNotification(wallet, notificationType, channel = 'websocket') {
    const prefs = await getPreferences(wallet);

    // Check master switch
    if (!prefs.enabled) {
        return { send: false, reason: 'notifications_disabled' };
    }

    // Check channel
    if (!prefs.channels[channel]) {
        return { send: false, reason: 'channel_disabled' };
    }

    // Check notification type
    const typeSettings = prefs.types[notificationType];
    if (!typeSettings) {
        // Unknown type - allow by default
        return { send: true };
    }

    if (!typeSettings.enabled) {
        return { send: false, reason: 'type_disabled' };
    }

    // Check quiet hours
    if (prefs.quietHours.enabled) {
        const inQuietHours = isInQuietHours(prefs.quietHours);
        if (inQuietHours) {
            // Allow critical during quiet hours if configured
            if (prefs.quietHours.allowCritical && typeSettings.priority === 'critical') {
                return { send: true, quietHours: true };
            }
            return { send: false, reason: 'quiet_hours' };
        }
    }

    return { send: true };
}

/**
 * Check if current time is in quiet hours
 * @param {Object} quietHours - Quiet hours config
 * @returns {boolean}
 */
function isInQuietHours(quietHours) {
    const now = new Date();

    // Convert to user's timezone (simplified - would use proper timezone library)
    const offset = getTimezoneOffset(quietHours.timezone);
    const userTime = new Date(now.getTime() + offset);

    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();
    const startMinutes = parseTime(quietHours.start);
    const endMinutes = parseTime(quietHours.end);

    // Handle overnight quiet hours
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get notifications filtered by preferences
 * @param {string} wallet - Wallet address
 * @param {Array} notifications - Notifications to filter
 * @param {string} channel - Delivery channel
 * @returns {Promise<Array>}
 */
async function filterNotifications(wallet, notifications, channel = 'websocket') {
    const prefs = await getPreferences(wallet);
    const filtered = [];

    for (const notification of notifications) {
        const check = await shouldSendNotification(wallet, notification.type, channel);
        if (check.send) {
            filtered.push({
                ...notification,
                quietHours: check.quietHours || false
            });
        }
    }

    return filtered;
}

// ============================================
// PUSH TOKEN MANAGEMENT
// ============================================

/**
 * Register push token
 * @param {string} wallet - Wallet address
 * @param {Object} tokenData - Push token data
 * @returns {Promise<boolean>}
 */
async function registerPushToken(wallet, tokenData) {
    const { token, platform, deviceId } = tokenData;

    if (!token || !platform) {
        throw new Error('Token and platform required');
    }

    // Validate platform
    const validPlatforms = ['ios', 'android', 'web'];
    if (!validPlatforms.includes(platform)) {
        throw new Error('Invalid platform');
    }

    // Encrypt token for storage
    const encryptedToken = encryptToken(token);

    // Get existing tokens
    const storage = getStorage();
    const tokensKey = `push:tokens:${wallet}`;
    const existing = await storage.get(tokensKey) || [];

    // Check for duplicate device
    const deviceIndex = existing.findIndex(t => t.deviceId === deviceId);
    if (deviceIndex >= 0) {
        existing[deviceIndex] = {
            token: encryptedToken,
            platform,
            deviceId,
            registeredAt: Date.now()
        };
    } else {
        // Limit tokens per wallet
        if (existing.length >= 5) {
            existing.shift();  // Remove oldest
        }
        existing.push({
            token: encryptedToken,
            platform,
            deviceId,
            registeredAt: Date.now()
        });
    }

    await storage.set(tokensKey, existing);

    return true;
}

/**
 * Unregister push token
 * @param {string} wallet - Wallet address
 * @param {string} deviceId - Device ID
 * @returns {Promise<boolean>}
 */
async function unregisterPushToken(wallet, deviceId) {
    const storage = getStorage();
    const tokensKey = `push:tokens:${wallet}`;
    const existing = await storage.get(tokensKey) || [];

    const filtered = existing.filter(t => t.deviceId !== deviceId);

    if (filtered.length === existing.length) {
        return false;  // Token not found
    }

    await storage.set(tokensKey, filtered);
    return true;
}

/**
 * Get push tokens for wallet
 * @param {string} wallet - Wallet address
 * @returns {Promise<Array>}
 */
async function getPushTokens(wallet) {
    const storage = getStorage();
    const tokensKey = `push:tokens:${wallet}`;
    const tokens = await storage.get(tokensKey) || [];

    // Decrypt tokens for use
    return tokens.map(t => ({
        token: decryptToken(t.token),
        platform: t.platform,
        deviceId: t.deviceId,
        registeredAt: t.registeredAt
    }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time string
 * @returns {boolean}
 */
function isValidTime(time) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Parse time string to minutes
 * @param {string} time - Time string (HH:MM)
 * @returns {number}
 */
function parseTime(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Get timezone offset in ms (simplified)
 * @param {string} timezone - Timezone name
 * @returns {number}
 */
function getTimezoneOffset(timezone) {
    const offsets = {
        'UTC': 0,
        'America/New_York': -5 * 60 * 60 * 1000,
        'America/Los_Angeles': -8 * 60 * 60 * 1000,
        'America/Chicago': -6 * 60 * 60 * 1000,
        'Europe/London': 0,
        'Europe/Paris': 1 * 60 * 60 * 1000,
        'Europe/Berlin': 1 * 60 * 60 * 1000,
        'Asia/Tokyo': 9 * 60 * 60 * 1000,
        'Asia/Shanghai': 8 * 60 * 60 * 1000,
        'Asia/Singapore': 8 * 60 * 60 * 1000,
        'Australia/Sydney': 11 * 60 * 60 * 1000
    };
    return offsets[timezone] || 0;
}

/**
 * Encrypt push token
 * @param {string} token - Plain token
 * @returns {string}
 */
function encryptToken(token) {
    const secret = process.env.PUSH_TOKEN_SECRET;
    if (!secret) {
        console.error('[NotificationPreferences] CRITICAL: PUSH_TOKEN_SECRET not configured');
        throw new Error('Encryption not configured');
    }
    // Use createCipheriv with proper IV for security
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(secret, 'asdf-push-salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Return IV + encrypted data (IV is needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt push token
 * @param {string} encrypted - Encrypted token
 * @returns {string}
 */
function decryptToken(encrypted) {
    try {
        const secret = process.env.PUSH_TOKEN_SECRET;
        if (!secret) {
            console.error('[NotificationPreferences] CRITICAL: PUSH_TOKEN_SECRET not configured');
            return null;
        }
        // Parse IV and encrypted data
        const parts = encrypted.split(':');
        if (parts.length !== 2) {
            // Legacy format without IV - cannot decrypt securely
            console.warn('[NotificationPreferences] Legacy encrypted token format detected');
            return null;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];
        const key = crypto.scryptSync(secret, 'asdf-push-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('[NotificationPreferences] Decryption error:', error.message);
        return null;
    }
}

// ============================================
// DIGEST GENERATION
// ============================================

/**
 * Get users due for digest
 * @returns {Promise<Array>}
 */
async function getUsersDueForDigest() {
    // This would scan preferences and find users due for digest
    // Implementation depends on having a user list
    return [];
}

/**
 * Generate digest for user
 * @param {string} wallet - Wallet address
 * @returns {Promise<Object>}
 */
async function generateDigest(wallet) {
    const prefs = await getPreferences(wallet);

    if (!prefs.digest.enabled) {
        return null;
    }

    // Get notifications since last digest
    const storage = getStorage();
    const listKey = keys.notificationList(wallet);
    const notifications = await storage.lrange(listKey, 0, -1);

    // Filter by time window
    const window = prefs.digest.frequency === 'daily'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    const cutoff = Date.now() - window;
    const recent = notifications.filter(n => n.timestamp > cutoff);

    // Group by type
    const grouped = {};
    for (const notification of recent) {
        if (!grouped[notification.type]) {
            grouped[notification.type] = [];
        }
        grouped[notification.type].push(notification);
    }

    return {
        wallet,
        period: prefs.digest.frequency,
        generated: Date.now(),
        summary: {
            total: recent.length,
            byType: Object.entries(grouped).map(([type, items]) => ({
                type,
                count: items.length
            }))
        },
        highlights: recent
            .filter(n => ['high', 'critical'].includes(prefs.types[n.type]?.priority))
            .slice(0, 5)
    };
}

// ============================================
// STATS
// ============================================

/**
 * Get preference service stats
 * @returns {Object}
 */
function getStats() {
    return {
        cachedPreferences: prefsCache.size,
        timestamp: Date.now()
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Preferences
    getPreferences,
    updatePreferences,
    resetPreferences,

    // Filtering
    shouldSendNotification,
    filterNotifications,

    // Push tokens
    registerPushToken,
    unregisterPushToken,
    getPushTokens,

    // Digest
    getUsersDueForDigest,
    generateDigest,

    // Helpers
    isInQuietHours,

    // Stats
    getStats,

    // Config
    PREFS_CONFIG
};
