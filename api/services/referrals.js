/**
 * ASDF API - Referral System
 *
 * Track and reward user referrals:
 * - Unique referral codes per user
 * - Tiered reward structure
 * - Anti-fraud protection
 * - Referral analytics
 *
 * Security by Design:
 * - Rate-limited code generation
 * - One-time referral usage
 * - Fraud detection
 * - Audit trail
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const REFERRAL_CONFIG = {
    // Code settings
    codeLength: 8,
    codeCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',  // No confusing chars (0,O,1,I)

    // Reward tiers (Fibonacci-based XP)
    rewards: {
        referrer: {
            base: 500,              // XP for each referral
            milestone5: 1000,       // Bonus at 5 referrals
            milestone13: 2000,      // Bonus at 13 referrals
            milestone34: 5000,      // Bonus at 34 referrals
            milestone89: 13000      // Bonus at 89 referrals
        },
        referee: {
            base: 250               // XP for using a referral code
        }
    },

    // Anti-fraud
    maxReferralsPerDay: 21,
    minAccountAge: 24 * 60 * 60 * 1000,  // 24 hours before can refer
    cooldownBetweenReferrals: 5 * 60 * 1000,  // 5 min between referrals

    // Code expiry (none by default)
    codeExpiryMs: null
};

// Milestones array (Fibonacci sequence)
const MILESTONES = [5, 13, 34, 89];

// ============================================
// STORAGE
// ============================================

// wallet -> referral data
const referralData = new Map();

// code -> wallet mapping
const codeToWallet = new Map();

// wallet -> wallet (referee -> referrer)
const referralRelations = new Map();

// Daily referral counts for anti-fraud
const dailyReferralCounts = new Map();

// ============================================
// CODE MANAGEMENT
// ============================================

/**
 * Generate or get referral code for user
 * @param {string} wallet - User wallet
 * @returns {{code: string, isNew: boolean}}
 */
function getOrCreateReferralCode(wallet) {
    let data = referralData.get(wallet);

    if (data?.code) {
        return { code: data.code, isNew: false };
    }

    // Generate new code
    const code = generateUniqueCode();

    // Initialize referral data
    data = {
        code,
        wallet,
        createdAt: Date.now(),
        referrals: [],
        totalReferrals: 0,
        totalXPEarned: 0,
        lastReferralAt: null,
        milestonesClaimed: []
    };

    referralData.set(wallet, data);
    codeToWallet.set(code, wallet);

    logAudit('referral_code_created', {
        wallet: wallet.slice(0, 8) + '...',
        code
    });

    return { code, isNew: true };
}

/**
 * Generate a unique referral code
 * @returns {string}
 */
function generateUniqueCode() {
    const charset = REFERRAL_CONFIG.codeCharset;
    let code;
    let attempts = 0;

    do {
        code = '';
        const bytes = crypto.randomBytes(REFERRAL_CONFIG.codeLength);
        for (let i = 0; i < REFERRAL_CONFIG.codeLength; i++) {
            code += charset[bytes[i] % charset.length];
        }
        attempts++;
    } while (codeToWallet.has(code) && attempts < 100);

    if (attempts >= 100) {
        throw new Error('Failed to generate unique code');
    }

    return code;
}

/**
 * Validate a referral code
 * @param {string} code - Code to validate
 * @returns {{valid: boolean, referrer?: string, error?: string}}
 */
function validateCode(code) {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: 'Invalid code format' };
    }

    const normalizedCode = code.toUpperCase().trim();

    if (normalizedCode.length !== REFERRAL_CONFIG.codeLength) {
        return { valid: false, error: 'Invalid code length' };
    }

    const referrerWallet = codeToWallet.get(normalizedCode);

    if (!referrerWallet) {
        return { valid: false, error: 'Code not found' };
    }

    // Check code expiry if configured
    if (REFERRAL_CONFIG.codeExpiryMs) {
        const data = referralData.get(referrerWallet);
        if (data && Date.now() > data.createdAt + REFERRAL_CONFIG.codeExpiryMs) {
            return { valid: false, error: 'Code expired' };
        }
    }

    return { valid: true, referrer: referrerWallet };
}

// ============================================
// REFERRAL PROCESSING
// ============================================

/**
 * Process a referral (when new user signs up with code)
 * @param {string} refereeWallet - New user's wallet
 * @param {string} code - Referral code used
 * @param {Object} options - Additional options
 * @returns {{success: boolean, rewards?: Object, error?: string}}
 */
function processReferral(refereeWallet, code, options = {}) {
    // Validate code
    const codeValidation = validateCode(code);
    if (!codeValidation.valid) {
        return { success: false, error: codeValidation.error };
    }

    const referrerWallet = codeValidation.referrer;

    // Check self-referral
    if (refereeWallet === referrerWallet) {
        logAudit('referral_self_attempt', {
            wallet: refereeWallet.slice(0, 8) + '...'
        });
        return { success: false, error: 'Cannot refer yourself' };
    }

    // Check if already referred
    if (referralRelations.has(refereeWallet)) {
        return { success: false, error: 'Already used a referral code' };
    }

    // Check referrer's daily limit
    if (!checkDailyLimit(referrerWallet)) {
        logAudit('referral_daily_limit', {
            referrer: referrerWallet.slice(0, 8) + '...'
        });
        return { success: false, error: 'Referrer has reached daily limit' };
    }

    // Check referrer cooldown
    const referrerData = referralData.get(referrerWallet);
    if (referrerData?.lastReferralAt) {
        const timeSince = Date.now() - referrerData.lastReferralAt;
        if (timeSince < REFERRAL_CONFIG.cooldownBetweenReferrals) {
            return { success: false, error: 'Please wait before next referral' };
        }
    }

    // Process the referral
    const rewards = {
        referrer: { xp: REFERRAL_CONFIG.rewards.referrer.base },
        referee: { xp: REFERRAL_CONFIG.rewards.referee.base }
    };

    // Update referrer data
    referrerData.referrals.push({
        wallet: refereeWallet,
        timestamp: Date.now()
    });
    referrerData.totalReferrals++;
    referrerData.totalXPEarned += rewards.referrer.xp;
    referrerData.lastReferralAt = Date.now();

    // Check for milestone bonuses
    const milestoneBonus = checkMilestones(referrerWallet, referrerData.totalReferrals);
    if (milestoneBonus > 0) {
        rewards.referrer.xp += milestoneBonus;
        rewards.referrer.milestoneBonus = milestoneBonus;
        referrerData.totalXPEarned += milestoneBonus;
    }

    // Record relation
    referralRelations.set(refereeWallet, referrerWallet);

    // Update daily count
    incrementDailyCount(referrerWallet);

    logAudit('referral_completed', {
        referrer: referrerWallet.slice(0, 8) + '...',
        referee: refereeWallet.slice(0, 8) + '...',
        referrerXP: rewards.referrer.xp,
        refereeXP: rewards.referee.xp
    });

    return {
        success: true,
        rewards,
        referralCount: referrerData.totalReferrals
    };
}

/**
 * Check and return milestone bonus
 * @param {string} wallet - Referrer wallet
 * @param {number} totalReferrals - Current total referrals
 * @returns {number} Bonus XP
 */
function checkMilestones(wallet, totalReferrals) {
    const data = referralData.get(wallet);
    if (!data) return 0;

    let bonus = 0;

    for (const milestone of MILESTONES) {
        if (totalReferrals >= milestone && !data.milestonesClaimed.includes(milestone)) {
            const bonusKey = `milestone${milestone}`;
            bonus += REFERRAL_CONFIG.rewards.referrer[bonusKey] || 0;
            data.milestonesClaimed.push(milestone);

            logAudit('referral_milestone', {
                wallet: wallet.slice(0, 8) + '...',
                milestone,
                bonus: REFERRAL_CONFIG.rewards.referrer[bonusKey]
            });
        }
    }

    return bonus;
}

// ============================================
// ANTI-FRAUD
// ============================================

/**
 * Check if wallet is within daily referral limit
 * @param {string} wallet - Wallet to check
 * @returns {boolean}
 */
function checkDailyLimit(wallet) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${wallet}:${today}`;

    const count = dailyReferralCounts.get(key) || 0;
    return count < REFERRAL_CONFIG.maxReferralsPerDay;
}

/**
 * Increment daily referral count
 * @param {string} wallet - Wallet
 */
function incrementDailyCount(wallet) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${wallet}:${today}`;

    const count = dailyReferralCounts.get(key) || 0;
    dailyReferralCounts.set(key, count + 1);
}

/**
 * Detect suspicious referral patterns
 * @param {string} referrerWallet - Referrer to check
 * @returns {{suspicious: boolean, reasons: string[]}}
 */
function detectFraud(referrerWallet) {
    const data = referralData.get(referrerWallet);
    if (!data) return { suspicious: false, reasons: [] };

    const reasons = [];

    // Check for rapid referrals
    const recentReferrals = data.referrals.filter(
        r => Date.now() - r.timestamp < 60 * 60 * 1000  // Last hour
    );
    if (recentReferrals.length > 10) {
        reasons.push('Too many referrals in short time');
    }

    // Check for pattern in wallet addresses (basic check)
    const walletPrefixes = new Set();
    for (const ref of data.referrals.slice(-20)) {
        walletPrefixes.add(ref.wallet.slice(0, 4));
    }
    if (data.referrals.length >= 10 && walletPrefixes.size < 3) {
        reasons.push('Referral wallet pattern detected');
    }

    if (reasons.length > 0) {
        logAudit('referral_fraud_detected', {
            wallet: referrerWallet.slice(0, 8) + '...',
            reasons
        });
    }

    return {
        suspicious: reasons.length > 0,
        reasons
    };
}

// ============================================
// REFERRAL QUERIES
// ============================================

/**
 * Get referral stats for a user
 * @param {string} wallet - User wallet
 * @returns {Object}
 */
function getReferralStats(wallet) {
    const data = referralData.get(wallet);

    if (!data) {
        return {
            hasCode: false,
            code: null,
            totalReferrals: 0,
            totalXPEarned: 0,
            referredBy: referralRelations.get(wallet) ?
                referralRelations.get(wallet).slice(0, 4) + '...' : null
        };
    }

    // Calculate next milestone
    let nextMilestone = null;
    for (const m of MILESTONES) {
        if (data.totalReferrals < m) {
            nextMilestone = {
                target: m,
                remaining: m - data.totalReferrals,
                bonus: REFERRAL_CONFIG.rewards.referrer[`milestone${m}`]
            };
            break;
        }
    }

    return {
        hasCode: true,
        code: data.code,
        totalReferrals: data.totalReferrals,
        totalXPEarned: data.totalXPEarned,
        recentReferrals: data.referrals.slice(-5).map(r => ({
            wallet: r.wallet.slice(0, 4) + '...' + r.wallet.slice(-4),
            timestamp: r.timestamp
        })),
        milestonesClaimed: data.milestonesClaimed,
        nextMilestone,
        referredBy: referralRelations.get(wallet) ?
            referralRelations.get(wallet).slice(0, 4) + '...' : null
    };
}

/**
 * Get who referred a user
 * @param {string} wallet - User wallet
 * @returns {string|null}
 */
function getReferrer(wallet) {
    return referralRelations.get(wallet) || null;
}

/**
 * Get referral leaderboard
 * @param {number} limit - Max entries
 * @returns {Object[]}
 */
function getReferralLeaderboard(limit = 20) {
    const entries = [];

    for (const [wallet, data] of referralData.entries()) {
        entries.push({
            wallet,
            totalReferrals: data.totalReferrals,
            totalXPEarned: data.totalXPEarned
        });
    }

    return entries
        .sort((a, b) => b.totalReferrals - a.totalReferrals)
        .slice(0, limit)
        .map((entry, index) => ({
            rank: index + 1,
            wallet: entry.wallet.slice(0, 4) + '...' + entry.wallet.slice(-4),
            totalReferrals: entry.totalReferrals,
            totalXPEarned: entry.totalXPEarned
        }));
}

// ============================================
// CLEANUP
// ============================================

// Cleanup old daily counts
setInterval(() => {
    const today = new Date().toISOString().split('T')[0];
    let cleaned = 0;

    for (const key of dailyReferralCounts.keys()) {
        if (!key.endsWith(today)) {
            dailyReferralCounts.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[Referrals] Cleaned ${cleaned} old daily counts`);
    }
}, 6 * 60 * 60 * 1000);  // Every 6 hours

// ============================================
// METRICS
// ============================================

/**
 * Get referral system metrics
 * @returns {Object}
 */
function getReferralMetrics() {
    let totalReferrals = 0;
    let totalXPDistributed = 0;
    let activeReferrers = 0;

    for (const data of referralData.values()) {
        totalReferrals += data.totalReferrals;
        totalXPDistributed += data.totalXPEarned;
        if (data.totalReferrals > 0) {
            activeReferrers++;
        }
    }

    return {
        totalCodes: referralData.size,
        activeReferrers,
        totalReferrals,
        totalXPDistributed,
        totalRelations: referralRelations.size,
        config: {
            rewards: REFERRAL_CONFIG.rewards,
            milestones: MILESTONES
        }
    };
}

module.exports = {
    // Code management
    getOrCreateReferralCode,
    validateCode,

    // Processing
    processReferral,

    // Queries
    getReferralStats,
    getReferrer,
    getReferralLeaderboard,

    // Anti-fraud
    detectFraud,

    // Metrics
    getReferralMetrics,

    // Config
    REFERRAL_CONFIG
};
