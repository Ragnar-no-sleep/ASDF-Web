/**
 * ASDF API - Achievement & Badge System
 *
 * Gamification through achievements:
 * - Burn milestones
 * - Game achievements
 * - Community badges
 * - Streak rewards
 *
 * Security by Design:
 * - Server-side achievement validation
 * - Audit trail for all unlocks
 * - Anti-gaming measures
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

// Fibonacci-based thresholds
const ACHIEVEMENTS = {
    // ==================
    // BURN ACHIEVEMENTS
    // ==================
    burn_first: {
        id: 'burn_first',
        name: 'First Flame',
        description: 'Complete your first ASDF burn',
        category: 'burn',
        icon: 'flame',
        rarity: 'common',
        xpReward: 100,
        condition: (stats) => stats.totalBurns >= 1
    },
    burn_5: {
        id: 'burn_5',
        name: 'Kindling',
        description: 'Complete 5 burns',
        category: 'burn',
        icon: 'fire',
        rarity: 'common',
        xpReward: 250,
        condition: (stats) => stats.totalBurns >= 5
    },
    burn_13: {
        id: 'burn_13',
        name: 'Pyromaniac',
        description: 'Complete 13 burns',
        category: 'burn',
        icon: 'bonfire',
        rarity: 'uncommon',
        xpReward: 500,
        condition: (stats) => stats.totalBurns >= 13
    },
    burn_34: {
        id: 'burn_34',
        name: 'Inferno Starter',
        description: 'Complete 34 burns',
        category: 'burn',
        icon: 'inferno',
        rarity: 'rare',
        xpReward: 1000,
        condition: (stats) => stats.totalBurns >= 34
    },
    burn_89: {
        id: 'burn_89',
        name: 'Phoenix Risen',
        description: 'Complete 89 burns',
        category: 'burn',
        icon: 'phoenix',
        rarity: 'epic',
        xpReward: 2500,
        condition: (stats) => stats.totalBurns >= 89
    },

    // Amount-based achievements
    burn_1m: {
        id: 'burn_1m',
        name: 'Million Burner',
        description: 'Burn 1,000,000 ASDF tokens',
        category: 'burn',
        icon: 'diamond_flame',
        rarity: 'uncommon',
        xpReward: 1000,
        condition: (stats) => stats.totalBurnedAmount >= 1_000_000
    },
    burn_10m: {
        id: 'burn_10m',
        name: 'Mega Burner',
        description: 'Burn 10,000,000 ASDF tokens',
        category: 'burn',
        icon: 'mega_flame',
        rarity: 'rare',
        xpReward: 5000,
        condition: (stats) => stats.totalBurnedAmount >= 10_000_000
    },
    burn_100m: {
        id: 'burn_100m',
        name: 'Legendary Burner',
        description: 'Burn 100,000,000 ASDF tokens',
        category: 'burn',
        icon: 'legendary_flame',
        rarity: 'legendary',
        xpReward: 25000,
        condition: (stats) => stats.totalBurnedAmount >= 100_000_000
    },

    // ==================
    // GAME ACHIEVEMENTS
    // ==================
    game_first: {
        id: 'game_first',
        name: 'Player One',
        description: 'Complete your first game',
        category: 'game',
        icon: 'controller',
        rarity: 'common',
        xpReward: 50,
        condition: (stats) => stats.totalGames >= 1
    },
    game_8: {
        id: 'game_8',
        name: 'Getting Good',
        description: 'Complete 8 games',
        category: 'game',
        icon: 'gamepad',
        rarity: 'common',
        xpReward: 200,
        condition: (stats) => stats.totalGames >= 8
    },
    game_21: {
        id: 'game_21',
        name: 'Arcade Master',
        description: 'Complete 21 games',
        category: 'game',
        icon: 'arcade',
        rarity: 'uncommon',
        xpReward: 500,
        condition: (stats) => stats.totalGames >= 21
    },
    game_55: {
        id: 'game_55',
        name: 'Gaming Legend',
        description: 'Complete 55 games',
        category: 'game',
        icon: 'trophy',
        rarity: 'rare',
        xpReward: 1500,
        condition: (stats) => stats.totalGames >= 55
    },

    // Score achievements
    score_100: {
        id: 'score_100',
        name: 'Century',
        description: 'Score 100 points in a single game',
        category: 'game',
        icon: 'star',
        rarity: 'common',
        xpReward: 100,
        condition: (stats) => stats.highScore >= 100
    },
    score_500: {
        id: 'score_500',
        name: 'High Scorer',
        description: 'Score 500 points in a single game',
        category: 'game',
        icon: 'star_gold',
        rarity: 'rare',
        xpReward: 500,
        condition: (stats) => stats.highScore >= 500
    },
    score_1000: {
        id: 'score_1000',
        name: 'Score Master',
        description: 'Score 1000 points in a single game',
        category: 'game',
        icon: 'crown',
        rarity: 'epic',
        xpReward: 2000,
        condition: (stats) => stats.highScore >= 1000
    },

    // ==================
    // STREAK ACHIEVEMENTS
    // ==================
    streak_3: {
        id: 'streak_3',
        name: 'Consistent',
        description: 'Maintain a 3-day activity streak',
        category: 'streak',
        icon: 'calendar',
        rarity: 'common',
        xpReward: 150,
        condition: (stats) => stats.currentStreak >= 3
    },
    streak_7: {
        id: 'streak_7',
        name: 'Weekly Warrior',
        description: 'Maintain a 7-day activity streak',
        category: 'streak',
        icon: 'calendar_week',
        rarity: 'uncommon',
        xpReward: 500,
        condition: (stats) => stats.currentStreak >= 7
    },
    streak_21: {
        id: 'streak_21',
        name: 'Dedicated',
        description: 'Maintain a 21-day activity streak',
        category: 'streak',
        icon: 'calendar_fire',
        rarity: 'rare',
        xpReward: 2000,
        condition: (stats) => stats.currentStreak >= 21
    },
    streak_55: {
        id: 'streak_55',
        name: 'Unstoppable',
        description: 'Maintain a 55-day activity streak',
        category: 'streak',
        icon: 'eternal_flame',
        rarity: 'legendary',
        xpReward: 10000,
        condition: (stats) => stats.currentStreak >= 55
    },

    // ==================
    // TIER ACHIEVEMENTS
    // ==================
    tier_spark: {
        id: 'tier_spark',
        name: 'Spark Ignited',
        description: 'Reach Spark tier',
        category: 'tier',
        icon: 'tier_spark',
        rarity: 'common',
        xpReward: 0,  // Tier itself gives XP
        condition: (stats) => stats.tier >= 1
    },
    tier_flame: {
        id: 'tier_flame',
        name: 'Flame Bearer',
        description: 'Reach Flame tier',
        category: 'tier',
        icon: 'tier_flame',
        rarity: 'uncommon',
        xpReward: 0,
        condition: (stats) => stats.tier >= 2
    },
    tier_blaze: {
        id: 'tier_blaze',
        name: 'Blazing',
        description: 'Reach Blaze tier',
        category: 'tier',
        icon: 'tier_blaze',
        rarity: 'rare',
        xpReward: 0,
        condition: (stats) => stats.tier >= 3
    },
    tier_inferno: {
        id: 'tier_inferno',
        name: 'Inferno',
        description: 'Reach Inferno tier',
        category: 'tier',
        icon: 'tier_inferno',
        rarity: 'epic',
        xpReward: 0,
        condition: (stats) => stats.tier >= 4
    },
    tier_phoenix: {
        id: 'tier_phoenix',
        name: 'Phoenix Reborn',
        description: 'Reach Phoenix tier',
        category: 'tier',
        icon: 'tier_phoenix',
        rarity: 'legendary',
        xpReward: 0,
        condition: (stats) => stats.tier >= 5
    },

    // ==================
    // SPECIAL ACHIEVEMENTS
    // ==================
    early_adopter: {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Joined during the beta period',
        category: 'special',
        icon: 'badge_early',
        rarity: 'legendary',
        xpReward: 5000,
        condition: (stats) => stats.isEarlyAdopter
    },
    holder_og: {
        id: 'holder_og',
        name: 'OG Holder',
        description: 'Held ASDF since the beginning',
        category: 'special',
        icon: 'badge_og',
        rarity: 'legendary',
        xpReward: 10000,
        condition: (stats) => stats.isOGHolder
    },
    shop_first: {
        id: 'shop_first',
        name: 'First Purchase',
        description: 'Made your first shop purchase',
        category: 'shop',
        icon: 'shopping_bag',
        rarity: 'common',
        xpReward: 100,
        condition: (stats) => stats.totalPurchases >= 1
    },
    shop_collector: {
        id: 'shop_collector',
        name: 'Collector',
        description: 'Own 10 different items',
        category: 'shop',
        icon: 'collection',
        rarity: 'rare',
        xpReward: 1000,
        condition: (stats) => stats.uniqueItems >= 10
    }
};

// Rarity multipliers for display
const RARITY_CONFIG = {
    common: { color: '#9CA3AF', weight: 1 },
    uncommon: { color: '#22C55E', weight: 2 },
    rare: { color: '#3B82F6', weight: 3 },
    epic: { color: '#A855F7', weight: 5 },
    legendary: { color: '#F59E0B', weight: 8 }
};

// ============================================
// ACHIEVEMENT STORAGE
// ============================================

// wallet -> Set of achievement IDs
const userAchievements = new Map();

// wallet -> stats for condition checking
const userStats = new Map();

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get user's unlocked achievements
 * @param {string} wallet - Wallet address
 * @returns {string[]} Achievement IDs
 */
function getUnlockedAchievements(wallet) {
    return Array.from(userAchievements.get(wallet) || new Set());
}

/**
 * Get user's achievement progress
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function getAchievementProgress(wallet) {
    const unlocked = getUnlockedAchievements(wallet);
    const total = Object.keys(ACHIEVEMENTS).length;

    const byCategory = {};
    const byRarity = {};

    for (const id of unlocked) {
        const achievement = ACHIEVEMENTS[id];
        if (!achievement) continue;

        // By category
        byCategory[achievement.category] = (byCategory[achievement.category] || 0) + 1;

        // By rarity
        byRarity[achievement.rarity] = (byRarity[achievement.rarity] || 0) + 1;
    }

    return {
        unlocked: unlocked.length,
        total,
        percentage: ((unlocked.length / total) * 100).toFixed(1),
        byCategory,
        byRarity,
        totalXPFromAchievements: unlocked.reduce((sum, id) =>
            sum + (ACHIEVEMENTS[id]?.xpReward || 0), 0
        )
    };
}

/**
 * Get detailed achievement info
 * @param {string} wallet - Wallet address
 * @returns {Object[]}
 */
function getDetailedAchievements(wallet) {
    const unlocked = new Set(getUnlockedAchievements(wallet));
    const stats = userStats.get(wallet) || {};

    return Object.values(ACHIEVEMENTS).map(achievement => ({
        ...achievement,
        unlocked: unlocked.has(achievement.id),
        unlockedAt: unlocked.has(achievement.id) ?
            getUnlockTime(wallet, achievement.id) : null,
        rarityColor: RARITY_CONFIG[achievement.rarity]?.color,
        condition: undefined  // Don't expose condition function
    }));
}

/**
 * Check and unlock achievements for user
 * @param {string} wallet - Wallet address
 * @param {Object} newStats - Updated stats
 * @returns {Object[]} Newly unlocked achievements
 */
function checkAchievements(wallet, newStats = {}) {
    // Update stats
    const stats = { ...(userStats.get(wallet) || getDefaultStats()), ...newStats };
    userStats.set(wallet, stats);

    // Get current unlocks
    const unlocked = userAchievements.get(wallet) || new Set();
    const newUnlocks = [];

    // Check each achievement
    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
        if (unlocked.has(id)) continue;

        try {
            if (achievement.condition(stats)) {
                unlocked.add(id);
                newUnlocks.push({
                    ...achievement,
                    unlockedAt: Date.now(),
                    condition: undefined
                });

                logAudit('achievement_unlocked', {
                    wallet: wallet.slice(0, 8) + '...',
                    achievement: id,
                    rarity: achievement.rarity
                });
            }
        } catch (error) {
            console.error(`[Achievements] Error checking ${id}:`, error.message);
        }
    }

    userAchievements.set(wallet, unlocked);

    return newUnlocks;
}

/**
 * Get unlock timestamp for achievement
 * @param {string} wallet - Wallet address
 * @param {string} achievementId - Achievement ID
 * @returns {number|null}
 */
function getUnlockTime(wallet, achievementId) {
    // In production, this would query the database
    return null;
}

/**
 * Get default stats structure
 * @returns {Object}
 */
function getDefaultStats() {
    return {
        totalBurns: 0,
        totalBurnedAmount: 0,
        totalGames: 0,
        highScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        tier: 0,
        totalPurchases: 0,
        uniqueItems: 0,
        isEarlyAdopter: false,
        isOGHolder: false,
        firstActivityDate: null,
        lastActivityDate: null
    };
}

// ============================================
// STAT UPDATE HANDLERS
// ============================================

/**
 * Record a burn and check achievements
 * @param {string} wallet - Wallet address
 * @param {number} amount - Amount burned
 * @returns {Object[]} New achievements
 */
function recordBurnForAchievements(wallet, amount) {
    const stats = userStats.get(wallet) || getDefaultStats();

    stats.totalBurns++;
    stats.totalBurnedAmount += amount;
    stats.lastActivityDate = Date.now();

    return checkAchievements(wallet, stats);
}

/**
 * Record a game and check achievements
 * @param {string} wallet - Wallet address
 * @param {number} score - Game score
 * @returns {Object[]} New achievements
 */
function recordGameForAchievements(wallet, score) {
    const stats = userStats.get(wallet) || getDefaultStats();

    stats.totalGames++;
    stats.highScore = Math.max(stats.highScore, score);
    stats.lastActivityDate = Date.now();

    return checkAchievements(wallet, stats);
}

/**
 * Record a purchase and check achievements
 * @param {string} wallet - Wallet address
 * @param {string} itemId - Purchased item
 * @returns {Object[]} New achievements
 */
function recordPurchaseForAchievements(wallet, itemId) {
    const stats = userStats.get(wallet) || getDefaultStats();

    stats.totalPurchases++;
    // uniqueItems would be calculated from inventory
    stats.lastActivityDate = Date.now();

    return checkAchievements(wallet, stats);
}

/**
 * Update streak for user
 * @param {string} wallet - Wallet address
 * @returns {Object[]} New achievements
 */
function updateStreak(wallet) {
    const stats = userStats.get(wallet) || getDefaultStats();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (!stats.lastActivityDate) {
        stats.currentStreak = 1;
    } else {
        const daysSinceActivity = Math.floor((now - stats.lastActivityDate) / dayMs);

        if (daysSinceActivity === 0) {
            // Same day, no change
        } else if (daysSinceActivity === 1) {
            // Consecutive day
            stats.currentStreak++;
        } else {
            // Streak broken
            stats.currentStreak = 1;
        }
    }

    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastActivityDate = now;

    return checkAchievements(wallet, stats);
}

/**
 * Update tier and check achievements
 * @param {string} wallet - Wallet address
 * @param {number} tier - New tier level
 * @returns {Object[]} New achievements
 */
function updateTierForAchievements(wallet, tier) {
    const stats = userStats.get(wallet) || getDefaultStats();
    stats.tier = tier;

    return checkAchievements(wallet, stats);
}

// ============================================
// ADMIN & SPECIAL
// ============================================

/**
 * Grant special achievement (admin only)
 * @param {string} wallet - Wallet address
 * @param {string} achievementId - Achievement ID
 * @returns {{success: boolean, error?: string}}
 */
function grantAchievement(wallet, achievementId) {
    const achievement = ACHIEVEMENTS[achievementId];

    if (!achievement) {
        return { success: false, error: 'Achievement not found' };
    }

    const unlocked = userAchievements.get(wallet) || new Set();

    if (unlocked.has(achievementId)) {
        return { success: false, error: 'Already unlocked' };
    }

    unlocked.add(achievementId);
    userAchievements.set(wallet, unlocked);

    logAudit('achievement_granted', {
        wallet: wallet.slice(0, 8) + '...',
        achievement: achievementId,
        admin: true
    });

    return { success: true, achievement };
}

/**
 * Get achievement leaderboard
 * @param {number} limit - Max entries
 * @returns {Object[]}
 */
function getAchievementLeaderboard(limit = 20) {
    const scores = [];

    for (const [wallet, achievements] of userAchievements.entries()) {
        let score = 0;
        for (const id of achievements) {
            const achievement = ACHIEVEMENTS[id];
            if (achievement) {
                score += RARITY_CONFIG[achievement.rarity]?.weight || 1;
            }
        }

        scores.push({
            wallet,
            achievementCount: achievements.size,
            score
        });
    }

    return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry, index) => ({
            rank: index + 1,
            ...entry,
            wallet: entry.wallet.slice(0, 4) + '...' + entry.wallet.slice(-4)
        }));
}

// ============================================
// METRICS
// ============================================

/**
 * Get achievement system metrics
 * @returns {Object}
 */
function getAchievementMetrics() {
    const totalUnlocks = Array.from(userAchievements.values())
        .reduce((sum, set) => sum + set.size, 0);

    const unlocksByAchievement = {};
    for (const [, achievements] of userAchievements) {
        for (const id of achievements) {
            unlocksByAchievement[id] = (unlocksByAchievement[id] || 0) + 1;
        }
    }

    // Find rarest unlocked
    const rarestUnlocked = Object.entries(unlocksByAchievement)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 5)
        .map(([id, count]) => ({
            id,
            name: ACHIEVEMENTS[id]?.name,
            unlocks: count
        }));

    return {
        totalAchievements: Object.keys(ACHIEVEMENTS).length,
        playersWithAchievements: userAchievements.size,
        totalUnlocks,
        averageUnlocksPerPlayer: userAchievements.size > 0
            ? (totalUnlocks / userAchievements.size).toFixed(2)
            : 0,
        rarestUnlocked
    };
}

module.exports = {
    // Core
    getUnlockedAchievements,
    getAchievementProgress,
    getDetailedAchievements,
    checkAchievements,

    // Recording
    recordBurnForAchievements,
    recordGameForAchievements,
    recordPurchaseForAchievements,
    updateStreak,
    updateTierForAchievements,

    // Admin
    grantAchievement,
    getAchievementLeaderboard,

    // Metrics
    getAchievementMetrics,

    // Config
    ACHIEVEMENTS,
    RARITY_CONFIG
};
