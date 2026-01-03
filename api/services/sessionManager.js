/**
 * Session Manager - Device Tracking & Multi-Session Management
 * Manages user sessions with device fingerprinting and security controls
 * Security by Design: Device verification, suspicious activity detection
 */

const crypto = require('crypto');

// Configuration with Fibonacci-based values
const SESSION_CONFIG = {
    maxSessionsPerUser: 5,                  // Max concurrent sessions
    sessionTTL: 7 * 24 * 60 * 60 * 1000,   // 7 days
    refreshThreshold: 24 * 60 * 60 * 1000, // Refresh if older than 24h
    deviceFingerprintTTL: 90 * 24 * 60 * 60 * 1000, // 90 days device trust
    maxLoginAttempts: 5,                    // Per device per hour
    lockoutDuration: 60 * 60 * 1000,       // 1 hour lockout
    suspiciousThreshold: 3,                 // Suspicious device count
    cleanupInterval: 15 * 60 * 1000,       // 15 minutes cleanup

    // Device trust levels
    trustLevels: {
        NEW: 'new',
        RECOGNIZED: 'recognized',
        TRUSTED: 'trusted',
        SUSPICIOUS: 'suspicious',
        BLOCKED: 'blocked'
    },

    // Risk factors
    riskFactors: {
        NEW_DEVICE: 20,
        DIFFERENT_COUNTRY: 30,
        DIFFERENT_TIMEZONE: 15,
        TOR_EXIT_NODE: 50,
        VPN_DETECTED: 10,
        RAPID_LOCATION_CHANGE: 40,
        MULTIPLE_FAILED_ATTEMPTS: 25,
        UNUSUAL_HOUR: 10
    }
};

// In-memory storage (use Redis in production)
const sessions = new Map();
const devices = new Map();
const userSessions = new Map(); // userId -> Set of sessionIds
const loginAttempts = new Map(); // deviceFingerprint -> attempts[]

// Statistics
const stats = {
    totalSessions: 0,
    activeSessions: 0,
    expiredSessions: 0,
    revokedSessions: 0,
    devicesTracked: 0,
    suspiciousActivities: 0,
    blockedDevices: 0,
    sessionRefreshes: 0,
    concurrentLimitHits: 0
};

/**
 * Generate device fingerprint from request headers
 */
function generateDeviceFingerprint(req) {
    const components = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        // Screen resolution from client
        req.body?.deviceInfo?.screen || '',
        // Timezone
        req.body?.deviceInfo?.timezone || '',
        // Platform
        req.body?.deviceInfo?.platform || ''
    ];

    return crypto.createHash('sha256')
        .update(components.join('|'))
        .digest('hex')
        .substring(0, 32);
}

/**
 * Parse user agent for device info
 */
function parseUserAgent(userAgent) {
    if (!userAgent) return { type: 'unknown', browser: 'unknown', os: 'unknown' };

    const info = {
        type: 'desktop',
        browser: 'unknown',
        os: 'unknown'
    };

    // Detect device type
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
        info.type = /ipad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    if (/chrome/i.test(userAgent) && !/edge|opr/i.test(userAgent)) {
        info.browser = 'Chrome';
    } else if (/firefox/i.test(userAgent)) {
        info.browser = 'Firefox';
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
        info.browser = 'Safari';
    } else if (/edge/i.test(userAgent)) {
        info.browser = 'Edge';
    } else if (/opr|opera/i.test(userAgent)) {
        info.browser = 'Opera';
    }

    // Detect OS
    if (/windows/i.test(userAgent)) {
        info.os = 'Windows';
    } else if (/macintosh|mac os/i.test(userAgent)) {
        info.os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
        info.os = 'Linux';
    } else if (/android/i.test(userAgent)) {
        info.os = 'Android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        info.os = 'iOS';
    }

    return info;
}

/**
 * Calculate risk score for session
 */
function calculateRiskScore(userId, deviceFingerprint, req) {
    let riskScore = 0;
    const reasons = [];

    const userDevices = devices.get(userId) || new Map();
    const device = userDevices.get(deviceFingerprint);

    // New device check
    if (!device) {
        riskScore += SESSION_CONFIG.riskFactors.NEW_DEVICE;
        reasons.push('new_device');
    }

    // Check for rapid location changes
    const existingSessions = userSessions.get(userId);
    if (existingSessions) {
        for (const sessionId of existingSessions) {
            const session = sessions.get(sessionId);
            if (session && session.lastActiveAt > Date.now() - 60 * 60 * 1000) {
                // Active session in last hour
                if (session.ip !== req.ip) {
                    riskScore += SESSION_CONFIG.riskFactors.RAPID_LOCATION_CHANGE;
                    reasons.push('rapid_location_change');
                    break;
                }
            }
        }
    }

    // Check failed login attempts
    const attempts = loginAttempts.get(deviceFingerprint) || [];
    const recentFailures = attempts.filter(a =>
        !a.success && a.timestamp > Date.now() - 60 * 60 * 1000
    );
    if (recentFailures.length >= 2) {
        riskScore += SESSION_CONFIG.riskFactors.MULTIPLE_FAILED_ATTEMPTS;
        reasons.push('multiple_failed_attempts');
    }

    // Check unusual hour (local time 2-6 AM based on timezone)
    const hour = new Date().getUTCHours();
    const timezone = req.body?.deviceInfo?.timezone || 0;
    const localHour = (hour + timezone / 60) % 24;
    if (localHour >= 2 && localHour <= 6) {
        riskScore += SESSION_CONFIG.riskFactors.UNUSUAL_HOUR;
        reasons.push('unusual_hour');
    }

    return { riskScore, reasons };
}

/**
 * Create new session
 */
function createSession(userId, req, options = {}) {
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceInfo = parseUserAgent(req.headers['user-agent']);

    // Check device lockout
    const attempts = loginAttempts.get(deviceFingerprint) || [];
    const recentAttempts = attempts.filter(a => a.timestamp > Date.now() - 60 * 60 * 1000);
    const failedAttempts = recentAttempts.filter(a => !a.success);

    if (failedAttempts.length >= SESSION_CONFIG.maxLoginAttempts) {
        const oldestAttempt = failedAttempts[0];
        const lockoutEnds = oldestAttempt.timestamp + SESSION_CONFIG.lockoutDuration;

        if (Date.now() < lockoutEnds) {
            return {
                success: false,
                error: 'Device temporarily locked',
                retryAfter: Math.ceil((lockoutEnds - Date.now()) / 1000)
            };
        }
    }

    // Calculate risk score
    const { riskScore, reasons } = calculateRiskScore(userId, deviceFingerprint, req);

    // Check concurrent session limit
    const existingSessions = userSessions.get(userId) || new Set();
    if (existingSessions.size >= SESSION_CONFIG.maxSessionsPerUser && !options.forceCreate) {
        stats.concurrentLimitHits++;

        // Revoke oldest session
        const oldestSession = findOldestSession(existingSessions);
        if (oldestSession) {
            revokeSession(oldestSession, 'concurrent_limit');
        }
    }

    // Generate session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Determine device trust level
    let trustLevel = SESSION_CONFIG.trustLevels.NEW;
    const userDevices = devices.get(userId) || new Map();
    const existingDevice = userDevices.get(deviceFingerprint);

    if (existingDevice) {
        if (existingDevice.trustLevel === SESSION_CONFIG.trustLevels.BLOCKED) {
            return {
                success: false,
                error: 'Device is blocked'
            };
        }
        trustLevel = existingDevice.trustLevel;
    }

    // Upgrade to suspicious if risk is high
    if (riskScore >= 50 && trustLevel !== SESSION_CONFIG.trustLevels.TRUSTED) {
        trustLevel = SESSION_CONFIG.trustLevels.SUSPICIOUS;
        stats.suspiciousActivities++;
    }

    // Create session
    const session = {
        id: sessionId,
        userId,
        deviceFingerprint,
        deviceInfo,
        trustLevel,
        riskScore,
        riskReasons: reasons,
        ip: req.ip,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        expiresAt: Date.now() + SESSION_CONFIG.sessionTTL,
        refreshCount: 0,
        metadata: options.metadata || {}
    };

    sessions.set(sessionId, session);

    // Track user sessions
    if (!userSessions.has(userId)) {
        userSessions.set(userId, new Set());
    }
    userSessions.get(userId).add(sessionId);

    // Track device
    if (!devices.has(userId)) {
        devices.set(userId, new Map());
    }

    const deviceRecord = devices.get(userId).get(deviceFingerprint) || {
        fingerprint: deviceFingerprint,
        info: deviceInfo,
        firstSeen: Date.now(),
        trustLevel: SESSION_CONFIG.trustLevels.NEW,
        sessionCount: 0
    };

    deviceRecord.lastSeen = Date.now();
    deviceRecord.lastIp = req.ip;
    deviceRecord.sessionCount++;

    // Upgrade trust level after multiple successful sessions
    if (deviceRecord.sessionCount >= 3 && deviceRecord.trustLevel === SESSION_CONFIG.trustLevels.NEW) {
        deviceRecord.trustLevel = SESSION_CONFIG.trustLevels.RECOGNIZED;
    }
    if (deviceRecord.sessionCount >= 10 && deviceRecord.trustLevel === SESSION_CONFIG.trustLevels.RECOGNIZED) {
        deviceRecord.trustLevel = SESSION_CONFIG.trustLevels.TRUSTED;
    }

    devices.get(userId).set(deviceFingerprint, deviceRecord);

    // Record successful login attempt
    recordLoginAttempt(deviceFingerprint, true);

    stats.totalSessions++;
    stats.activeSessions++;
    stats.devicesTracked = countTotalDevices();

    return {
        success: true,
        sessionId,
        trustLevel,
        riskScore,
        expiresAt: session.expiresAt,
        requiresMFA: riskScore >= 30 || trustLevel === SESSION_CONFIG.trustLevels.SUSPICIOUS
    };
}

/**
 * Find oldest session for a user
 */
function findOldestSession(sessionIds) {
    let oldest = null;
    let oldestTime = Date.now();

    for (const sessionId of sessionIds) {
        const session = sessions.get(sessionId);
        if (session && session.lastActiveAt < oldestTime) {
            oldest = sessionId;
            oldestTime = session.lastActiveAt;
        }
    }

    return oldest;
}

/**
 * Record login attempt
 */
function recordLoginAttempt(deviceFingerprint, success) {
    if (!loginAttempts.has(deviceFingerprint)) {
        loginAttempts.set(deviceFingerprint, []);
    }

    const attempts = loginAttempts.get(deviceFingerprint);
    attempts.push({
        timestamp: Date.now(),
        success
    });

    // Keep only recent attempts
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    loginAttempts.set(
        deviceFingerprint,
        attempts.filter(a => a.timestamp > cutoff)
    );
}

/**
 * Validate session
 */
function validateSession(sessionId, req = null) {
    const session = sessions.get(sessionId);

    if (!session) {
        return { valid: false, reason: 'Session not found' };
    }

    // Check expiration
    if (session.expiresAt < Date.now()) {
        revokeSession(sessionId, 'expired');
        stats.expiredSessions++;
        return { valid: false, reason: 'Session expired' };
    }

    // Verify device fingerprint if request provided
    if (req) {
        const currentFingerprint = generateDeviceFingerprint(req);
        if (currentFingerprint !== session.deviceFingerprint) {
            stats.suspiciousActivities++;
            return {
                valid: false,
                reason: 'Device fingerprint mismatch',
                suspicious: true
            };
        }
    }

    // Update last active time
    session.lastActiveAt = Date.now();

    // Check if refresh is needed
    const needsRefresh = session.expiresAt - Date.now() < SESSION_CONFIG.refreshThreshold;

    return {
        valid: true,
        session: {
            id: session.id,
            userId: session.userId,
            trustLevel: session.trustLevel,
            deviceInfo: session.deviceInfo,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt
        },
        needsRefresh
    };
}

/**
 * Refresh session
 */
function refreshSession(sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    if (session.expiresAt < Date.now()) {
        return { success: false, error: 'Session expired' };
    }

    session.expiresAt = Date.now() + SESSION_CONFIG.sessionTTL;
    session.refreshCount++;
    session.lastActiveAt = Date.now();

    stats.sessionRefreshes++;

    return {
        success: true,
        expiresAt: session.expiresAt,
        refreshCount: session.refreshCount
    };
}

/**
 * Revoke session
 */
function revokeSession(sessionId, reason = 'manual') {
    const session = sessions.get(sessionId);

    if (!session) {
        return false;
    }

    // Remove from user sessions
    const userSessionSet = userSessions.get(session.userId);
    if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
            userSessions.delete(session.userId);
        }
    }

    sessions.delete(sessionId);
    stats.activeSessions--;
    stats.revokedSessions++;

    console.log(`[SessionManager] Session revoked: ${sessionId.substring(0, 8)}... Reason: ${reason}`);

    return true;
}

/**
 * Revoke all sessions for a user
 */
function revokeAllUserSessions(userId, exceptSessionId = null) {
    const userSessionSet = userSessions.get(userId);

    if (!userSessionSet) {
        return 0;
    }

    let count = 0;
    for (const sessionId of userSessionSet) {
        if (sessionId !== exceptSessionId) {
            revokeSession(sessionId, 'revoke_all');
            count++;
        }
    }

    return count;
}

/**
 * Get all sessions for a user
 */
function getUserSessions(userId) {
    const userSessionSet = userSessions.get(userId);

    if (!userSessionSet) {
        return [];
    }

    return Array.from(userSessionSet).map(sessionId => {
        const session = sessions.get(sessionId);
        if (!session) return null;

        return {
            id: session.id,
            deviceInfo: session.deviceInfo,
            trustLevel: session.trustLevel,
            ip: session.ip,
            createdAt: session.createdAt,
            lastActiveAt: session.lastActiveAt,
            expiresAt: session.expiresAt,
            current: false // Set by caller
        };
    }).filter(Boolean);
}

/**
 * Get user devices
 */
function getUserDevices(userId) {
    const userDevices = devices.get(userId);

    if (!userDevices) {
        return [];
    }

    return Array.from(userDevices.values()).map(device => ({
        fingerprint: device.fingerprint.substring(0, 8) + '...',
        info: device.info,
        trustLevel: device.trustLevel,
        firstSeen: device.firstSeen,
        lastSeen: device.lastSeen,
        sessionCount: device.sessionCount
    }));
}

/**
 * Block device
 */
function blockDevice(userId, deviceFingerprint) {
    const userDevices = devices.get(userId);

    if (!userDevices) {
        return false;
    }

    const device = userDevices.get(deviceFingerprint);
    if (!device) {
        return false;
    }

    device.trustLevel = SESSION_CONFIG.trustLevels.BLOCKED;
    stats.blockedDevices++;

    // Revoke all sessions for this device
    const userSessionSet = userSessions.get(userId);
    if (userSessionSet) {
        for (const sessionId of userSessionSet) {
            const session = sessions.get(sessionId);
            if (session && session.deviceFingerprint === deviceFingerprint) {
                revokeSession(sessionId, 'device_blocked');
            }
        }
    }

    return true;
}

/**
 * Trust device
 */
function trustDevice(userId, deviceFingerprint) {
    const userDevices = devices.get(userId);

    if (!userDevices) {
        return false;
    }

    const device = userDevices.get(deviceFingerprint);
    if (!device) {
        return false;
    }

    device.trustLevel = SESSION_CONFIG.trustLevels.TRUSTED;
    return true;
}

/**
 * Count total devices across all users
 */
function countTotalDevices() {
    let count = 0;
    for (const userDevices of devices.values()) {
        count += userDevices.size;
    }
    return count;
}

/**
 * Cleanup expired sessions and old data
 */
function cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup expired sessions
    for (const [sessionId, session] of sessions.entries()) {
        if (session.expiresAt < now) {
            revokeSession(sessionId, 'expired');
            cleaned++;
        }
    }

    // Cleanup old login attempts
    for (const [fingerprint, attempts] of loginAttempts.entries()) {
        const recent = attempts.filter(a => a.timestamp > now - 24 * 60 * 60 * 1000);
        if (recent.length === 0) {
            loginAttempts.delete(fingerprint);
        } else {
            loginAttempts.set(fingerprint, recent);
        }
    }

    if (cleaned > 0) {
        console.log(`[SessionManager] Cleaned ${cleaned} expired sessions`);
    }
}

/**
 * Get statistics
 */
function getStats() {
    return {
        ...stats,
        memoryUsage: {
            sessions: sessions.size,
            devices: countTotalDevices(),
            userSessions: userSessions.size,
            loginAttempts: loginAttempts.size
        },
        config: {
            maxSessionsPerUser: SESSION_CONFIG.maxSessionsPerUser,
            sessionTTL: SESSION_CONFIG.sessionTTL,
            maxLoginAttempts: SESSION_CONFIG.maxLoginAttempts
        }
    };
}

// Start cleanup interval
const cleanupTimer = setInterval(cleanup, SESSION_CONFIG.cleanupInterval);
cleanupTimer.unref();

// Graceful shutdown
function shutdown() {
    clearInterval(cleanupTimer);
    sessions.clear();
    devices.clear();
    userSessions.clear();
    loginAttempts.clear();
    console.log('[SessionManager] Service shut down');
}

module.exports = {
    createSession,
    validateSession,
    refreshSession,
    revokeSession,
    revokeAllUserSessions,
    getUserSessions,
    getUserDevices,
    blockDevice,
    trustDevice,
    generateDeviceFingerprint,
    recordLoginAttempt,
    getStats,
    shutdown,
    SESSION_CONFIG
};
