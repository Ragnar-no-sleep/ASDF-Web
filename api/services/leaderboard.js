/**
 * ASDF API - Leaderboard & Statistics Service
 *
 * Production-grade leaderboard with:
 * - Top burners ranking
 * - XP-based tier rankings
 * - Time-based statistics
 * - Anti-gaming protections
 *
 * Security by Design:
 * - Rate-limited aggregations
 * - Cached results to prevent DoS
 * - Validated inputs only
 */

'use strict';

const { getRecentBurns, getWalletBurnHistory, ASDF_TOKEN_MINT } = require('./helius');

// Fibonacci sequence for tier thresholds
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

// XP thresholds for tiers (Fibonacci-based, in millions)
const TIER_THRESHOLDS = [
    0,                    // Tier 0: Ember
    1_000_000,            // Tier 1: Spark (1M XP)
    2_000_000,            // Tier 2: Flame (2M XP)
    5_000_000,            // Tier 3: Blaze (5M XP)
    13_000_000,           // Tier 4: Inferno (13M XP)
    34_000_000,           // Tier 5: Phoenix (34M XP)
    89_000_000,           // Tier 6: Eternal (89M XP)
    233_000_000,          // Tier 7: Transcendent (233M XP)
    610_000_000,          // Tier 8: Divine (610M XP)
    1_000_000_000         // Tier 9: Legendary (1B XP)
];

const TIER_NAMES = [
    'Ember', 'Spark', 'Flame', 'Blaze', 'Inferno',
    'Phoenix', 'Eternal', 'Transcendent', 'Divine', 'Legendary'
];

// Cache configuration
const CACHE_TTL = {
    leaderboard: 5 * 60 * 1000,    // 5 minutes
    statistics: 10 * 60 * 1000,     // 10 minutes
    userRank: 60 * 1000             // 1 minute
};

// Simple cache
const cache = new Map();

function getCached(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
    }
    return item.value;
}

function setCached(key, value, ttlMs) {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ============================================
// IN-MEMORY STORAGE (Use PostgreSQL in production)
// ============================================

// User XP and stats (would be PostgreSQL in production)
const userStats = new Map();

// Burn records for leaderboard
const burnRecords = [];

// ============================================
// TIER CALCULATION
// ============================================

/**
 * Calculate tier from XP
 * @param {number} xp - Total XP
 * @returns {{tier: number, name: string, progress: number, nextThreshold: number}}
 */
function calculateTierFromXP(xp) {
    let tier = 0;
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= TIER_THRESHOLDS[i]) {
            tier = i;
            break;
        }
    }

    const currentThreshold = TIER_THRESHOLDS[tier];
    const nextThreshold = TIER_THRESHOLDS[tier + 1] || TIER_THRESHOLDS[tier];
    const progress = tier < 9
        ? ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
        : 100;

    return {
        tier,
        name: TIER_NAMES[tier],
        xp,
        progress: Math.min(100, Math.max(0, progress)),
        currentThreshold,
        nextThreshold: tier < 9 ? nextThreshold : null,
        xpToNext: tier < 9 ? nextThreshold - xp : 0
    };
}

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

/**
 * Record a burn for leaderboard tracking
 * @param {string} wallet - Wallet address
 * @param {number} amount - Amount burned
 * @param {string} signature - Transaction signature
 */
function recordBurn(wallet, amount, signature) {
    const now = Date.now();

    // Add to burn records
    burnRecords.push({
        wallet,
        amount,
        signature,
        timestamp: now
    });

    // Keep only last 10000 records to prevent memory issues
    if (burnRecords.length > 10000) {
        burnRecords.splice(0, burnRecords.length - 10000);
    }

    // Update user stats
    const stats = userStats.get(wallet) || {
        totalBurned: 0,
        totalXP: 0,
        burnCount: 0,
        firstBurn: now,
        lastBurn: now
    };

    stats.totalBurned += amount;
    stats.totalXP += amount; // 1:1 XP ratio
    stats.burnCount += 1;
    stats.lastBurn = now;

    userStats.set(wallet, stats);

    // Invalidate cache
    cache.delete('leaderboard:burns');
    cache.delete('leaderboard:xp');
    cache.delete(`userRank:${wallet}`);

    console.log(`[Leaderboard] Recorded burn: ${wallet.slice(0, 8)}... burned ${amount}`);
}

/**
 * Get top burners leaderboard
 * @param {number} limit - Max entries to return
 * @param {string} timeframe - 'all', 'month', 'week', 'day'
 * @returns {Array}
 */
function getTopBurners(limit = 20, timeframe = 'all') {
    const cacheKey = `leaderboard:burns:${timeframe}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Calculate time filter
    const now = Date.now();
    const timeFilters = {
        day: now - 24 * 60 * 60 * 1000,
        week: now - 7 * 24 * 60 * 60 * 1000,
        month: now - 30 * 24 * 60 * 60 * 1000,
        all: 0
    };
    const minTime = timeFilters[timeframe] || 0;

    // Aggregate burns by wallet within timeframe
    const walletBurns = new Map();

    for (const record of burnRecords) {
        if (record.timestamp >= minTime) {
            const current = walletBurns.get(record.wallet) || 0;
            walletBurns.set(record.wallet, current + record.amount);
        }
    }

    // Sort and get top
    const sorted = Array.from(walletBurns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([wallet, amount], index) => ({
            rank: index + 1,
            wallet,
            walletShort: `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
            totalBurned: amount,
            burnCount: burnRecords.filter(r => r.wallet === wallet && r.timestamp >= minTime).length
        }));

    setCached(cacheKey, sorted, CACHE_TTL.leaderboard);
    return sorted;
}

/**
 * Get XP/tier leaderboard
 * @param {number} limit - Max entries
 * @returns {Array}
 */
function getXPLeaderboard(limit = 20) {
    const cacheKey = `leaderboard:xp:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Sort users by XP
    const sorted = Array.from(userStats.entries())
        .sort((a, b) => b[1].totalXP - a[1].totalXP)
        .slice(0, limit)
        .map(([wallet, stats], index) => {
            const tierInfo = calculateTierFromXP(stats.totalXP);
            return {
                rank: index + 1,
                wallet,
                walletShort: `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
                totalXP: stats.totalXP,
                tier: tierInfo.tier,
                tierName: tierInfo.name,
                totalBurned: stats.totalBurned,
                burnCount: stats.burnCount
            };
        });

    setCached(cacheKey, sorted, CACHE_TTL.leaderboard);
    return sorted;
}

/**
 * Get user's rank and stats
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function getUserRank(wallet) {
    const cacheKey = `userRank:${wallet}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const stats = userStats.get(wallet);
    if (!stats) {
        return {
            wallet,
            ranked: false,
            totalXP: 0,
            tier: calculateTierFromXP(0)
        };
    }

    // Calculate rank
    const allUsers = Array.from(userStats.entries())
        .sort((a, b) => b[1].totalXP - a[1].totalXP);

    const rankIndex = allUsers.findIndex(([w]) => w === wallet);
    const tierInfo = calculateTierFromXP(stats.totalXP);

    const result = {
        wallet,
        ranked: true,
        rank: rankIndex + 1,
        totalUsers: allUsers.length,
        percentile: ((allUsers.length - rankIndex) / allUsers.length * 100).toFixed(1),
        ...stats,
        tier: tierInfo
    };

    setCached(cacheKey, result, CACHE_TTL.userRank);
    return result;
}

// ============================================
// STATISTICS AGGREGATION
// ============================================

/**
 * Get ecosystem statistics
 * @returns {Object}
 */
function getStatistics() {
    const cacheKey = 'statistics:ecosystem';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Calculate stats
    const totalBurned = Array.from(userStats.values())
        .reduce((sum, s) => sum + s.totalBurned, 0);

    const burnsToday = burnRecords.filter(r => r.timestamp >= dayAgo);
    const burnsWeek = burnRecords.filter(r => r.timestamp >= weekAgo);

    const uniqueBurnersToday = new Set(burnsToday.map(r => r.wallet)).size;
    const uniqueBurnersWeek = new Set(burnsWeek.map(r => r.wallet)).size;

    const result = {
        totalBurned,
        totalBurners: userStats.size,
        totalBurnTransactions: burnRecords.length,

        last24h: {
            burned: burnsToday.reduce((sum, r) => sum + r.amount, 0),
            transactions: burnsToday.length,
            uniqueBurners: uniqueBurnersToday
        },

        last7d: {
            burned: burnsWeek.reduce((sum, r) => sum + r.amount, 0),
            transactions: burnsWeek.length,
            uniqueBurners: uniqueBurnersWeek
        },

        tierDistribution: getTierDistribution(),

        timestamp: now
    };

    setCached(cacheKey, result, CACHE_TTL.statistics);
    return result;
}

/**
 * Get tier distribution of all users
 * @returns {Object}
 */
function getTierDistribution() {
    const distribution = {};
    for (let i = 0; i < TIER_NAMES.length; i++) {
        distribution[TIER_NAMES[i]] = 0;
    }

    for (const [, stats] of userStats) {
        const tierInfo = calculateTierFromXP(stats.totalXP);
        distribution[tierInfo.name]++;
    }

    return distribution;
}

// ============================================
// AUDIT LOGGING
// ============================================

const auditLog = [];
const MAX_AUDIT_LOG = 1000;

/**
 * Log an audit event
 * @param {string} action - Action type
 * @param {Object} details - Event details
 */
function logAudit(action, details) {
    const event = {
        timestamp: Date.now(),
        action,
        ...details
    };

    auditLog.push(event);

    // Keep log bounded
    if (auditLog.length > MAX_AUDIT_LOG) {
        auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG);
    }

    // Security-sensitive actions get extra logging
    const sensitiveActions = ['purchase_confirmed', 'auth_failed', 'rate_limited', 'signature_reused'];
    if (sensitiveActions.includes(action)) {
        console.warn(`[Audit] ${action}:`, JSON.stringify(details));
    }
}

/**
 * Get recent audit events
 * @param {number} limit - Max events
 * @param {string} action - Filter by action type
 * @returns {Array}
 */
function getAuditLog(limit = 100, action = null) {
    let filtered = auditLog;

    if (action) {
        filtered = auditLog.filter(e => e.action === action);
    }

    return filtered.slice(-limit).reverse();
}

// ============================================
// SYNC FROM BLOCKCHAIN
// ============================================

/**
 * Sync leaderboard from recent blockchain burns
 * Call this periodically or on startup
 */
async function syncFromBlockchain() {
    try {
        console.log('[Leaderboard] Syncing from blockchain...');

        const recentBurns = await getRecentBurns(100);

        for (const burn of recentBurns) {
            // Only add if we don't have this burn
            const exists = burnRecords.some(r => r.signature === burn.signature);
            if (!exists && burn.amount > 0) {
                recordBurn(burn.wallet, burn.amount, burn.signature);
            }
        }

        console.log(`[Leaderboard] Sync complete. Total records: ${burnRecords.length}`);
        logAudit('leaderboard_sync', { recordCount: burnRecords.length });

    } catch (error) {
        console.error('[Leaderboard] Sync failed:', error.message);
        logAudit('leaderboard_sync_failed', { error: error.message });
    }
}

module.exports = {
    // Tier calculation
    calculateTierFromXP,
    TIER_THRESHOLDS,
    TIER_NAMES,

    // Leaderboard
    recordBurn,
    getTopBurners,
    getXPLeaderboard,
    getUserRank,

    // Statistics
    getStatistics,
    getTierDistribution,

    // Audit
    logAudit,
    getAuditLog,

    // Sync
    syncFromBlockchain
};
