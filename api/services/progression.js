/**
 * ASDF API - Enhanced Progression System
 *
 * Fibonacci-based XP and leveling:
 * - XP from burns, games, achievements
 * - Streak multipliers (daily/weekly)
 * - Seasonal challenges
 * - Prestige system
 * - Skill trees
 *
 * Philosophy: Fibonacci numbers throughout
 * 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Server-side XP authority
 * - Anti-exploit validation
 * - Audit trail
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// FIBONACCI CONSTANTS
// ============================================

// Fibonacci sequence for calculations
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

/**
 * Get Fibonacci number at index
 * @param {number} n - Index
 * @returns {number}
 */
function fib(n) {
    if (n < FIB.length) return FIB[n];
    // Calculate larger Fibonacci numbers
    let a = FIB[FIB.length - 2];
    let b = FIB[FIB.length - 1];
    for (let i = FIB.length; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}

// ============================================
// CONFIGURATION
// ============================================

const PROGRESSION_CONFIG = {
    // XP sources and base values (Fibonacci-based)
    xpSources: {
        burn: {
            base: 1,                    // 1 XP per token burned
            bonusThresholds: [          // Bonus XP at burn milestones
                { amount: 1000, bonus: 100 },
                { amount: 10000, bonus: 500 },
                { amount: 100000, bonus: 2000 },
                { amount: 1000000, bonus: 8000 }
            ]
        },
        game: {
            completion: 21,             // Base XP for completing a game
            scoreMultiplier: 0.1,       // 0.1 XP per score point
            winBonus: 55,               // Bonus for high scores
            perfectBonus: 89            // Bonus for perfect games
        },
        achievement: {
            common: 100,
            uncommon: 233,
            rare: 610,
            epic: 1597,
            legendary: 4181
        },
        daily: {
            login: 13,                  // Daily login XP
            firstGame: 34,              // First game of the day
            threeGames: 55,             // Three games in a day
            fiveGames: 89               // Five games in a day
        },
        referral: {
            invited: 144,               // When someone uses your code
            milestone: [5, 13, 21, 34]  // Referral count milestones
        }
    },

    // Streak system
    streaks: {
        dailyLoginBonus: FIB.slice(0, 8),     // Days 1-8 streak bonuses
        weeklyMultiplier: [1.0, 1.1, 1.2, 1.3, 1.5, 1.8, 2.1, 2.5],  // Week 1-8
        maxStreak: 89,                         // Max streak days
        streakBreakGrace: 1                    // 1 day grace period
    },

    // Level system (Fibonacci XP requirements)
    levels: {
        maxLevel: 100,
        xpPerLevel: (level) => fib(level + 4) * 1000,  // fib(5)*1000 = 5000 for L1
        prestigeXPBonus: 0.1  // 10% bonus per prestige
    },

    // Prestige system
    prestige: {
        maxPrestige: 10,
        bonusPerPrestige: 0.05,    // 5% XP gain per prestige
        requiredLevel: 100,
        keepPercentage: 0.1        // Keep 10% of XP on prestige
    },

    // Tier names (enhanced from leaderboard)
    tierNames: [
        { name: 'Ember', icon: '🔥', color: '#8B4513' },
        { name: 'Spark', icon: '✨', color: '#FFD700' },
        { name: 'Flame', icon: '🔶', color: '#FF8C00' },
        { name: 'Blaze', icon: '🌟', color: '#FF4500' },
        { name: 'Inferno', icon: '💥', color: '#FF0000' },
        { name: 'Phoenix', icon: '🦅', color: '#9400D3' },
        { name: 'Eternal', icon: '♾️', color: '#4B0082' },
        { name: 'Transcendent', icon: '🌀', color: '#00CED1' },
        { name: 'Divine', icon: '👑', color: '#FFD700' },
        { name: 'Legendary', icon: '⭐', color: '#FF1493' }
    ],

    // Seasonal settings
    seasons: {
        durationDays: 89,           // Fibonacci: 89 days per season
        bonusXPWeekend: 1.5,        // 50% bonus on weekends
        eventMultiplier: 2.0        // 2x during special events
    }
};

// ============================================
// STORAGE
// ============================================

// Player progression data
const playerProgress = new Map();

// Active events/bonuses
const activeEvents = new Map();

// Daily tracking
const dailyTracking = new Map();

// Statistics
const stats = {
    totalXPAwarded: 0,
    totalLevelUps: 0,
    totalPrestiges: 0,
    avgLevel: 0,
    activeStreaks: 0
};

// ============================================
// XP CALCULATION
// ============================================

/**
 * Award XP to a player
 * @param {string} wallet - Player wallet
 * @param {string} source - XP source type
 * @param {Object} context - Context data
 * @returns {{xpAwarded: number, levelUp: boolean, newLevel?: number, bonuses: Object}}
 */
function awardXP(wallet, source, context = {}) {
    const progress = getOrCreateProgress(wallet);
    const today = getDateKey();

    // Calculate base XP
    let baseXP = calculateBaseXP(source, context);

    if (baseXP <= 0) {
        return { xpAwarded: 0, levelUp: false, bonuses: {} };
    }

    // Apply multipliers
    const bonuses = {};

    // 1. Streak multiplier
    const streakMultiplier = calculateStreakMultiplier(progress);
    if (streakMultiplier > 1) {
        bonuses.streak = streakMultiplier;
    }

    // 2. Prestige bonus
    if (progress.prestige > 0) {
        const prestigeBonus = 1 + (progress.prestige * PROGRESSION_CONFIG.prestige.bonusPerPrestige);
        bonuses.prestige = prestigeBonus;
    }

    // 3. Seasonal/Event bonus
    const eventBonus = getEventMultiplier();
    if (eventBonus > 1) {
        bonuses.event = eventBonus;
    }

    // 4. Weekend bonus
    if (isWeekend()) {
        bonuses.weekend = PROGRESSION_CONFIG.seasons.bonusXPWeekend;
    }

    // 5. Daily bonuses
    const dailyBonus = checkDailyBonuses(wallet, source, context);
    if (dailyBonus > 0) {
        bonuses.daily = dailyBonus;
        baseXP += dailyBonus;
    }

    // Calculate total multiplier
    let totalMultiplier = 1;
    for (const mult of Object.values(bonuses)) {
        if (typeof mult === 'number' && mult > 1) {
            totalMultiplier *= mult;
        }
    }

    // Final XP
    const xpAwarded = Math.round(baseXP * totalMultiplier);

    // Update progress
    const oldLevel = progress.level;
    progress.totalXP += xpAwarded;
    progress.currentXP += xpAwarded;
    progress.lastActivity = Date.now();

    // Track source
    if (!progress.xpBySource[source]) {
        progress.xpBySource[source] = 0;
    }
    progress.xpBySource[source] += xpAwarded;

    // Check for level up
    let levelUp = false;
    let newLevel = oldLevel;

    while (progress.currentXP >= getXPForNextLevel(progress.level) &&
           progress.level < PROGRESSION_CONFIG.levels.maxLevel) {

        const required = getXPForNextLevel(progress.level);
        progress.currentXP -= required;
        progress.level++;
        levelUp = true;
        newLevel = progress.level;
        stats.totalLevelUps++;

        logAudit('level_up', {
            wallet: wallet.slice(0, 8) + '...',
            newLevel: progress.level
        });
    }

    // Update tier
    progress.tier = calculateTier(progress.level, progress.prestige);

    // Update stats
    stats.totalXPAwarded += xpAwarded;
    updateGlobalStats();

    return {
        xpAwarded,
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        totalXP: progress.totalXP,
        currentXP: progress.currentXP,
        xpToNext: getXPForNextLevel(progress.level) - progress.currentXP,
        level: progress.level,
        tier: progress.tier,
        bonuses
    };
}

/**
 * Calculate base XP for a source
 * @param {string} source - XP source
 * @param {Object} context - Context data
 * @returns {number}
 */
function calculateBaseXP(source, context) {
    const config = PROGRESSION_CONFIG.xpSources;

    switch (source) {
        case 'burn':
            let burnXP = (context.amount || 0) * config.burn.base;
            // Check bonus thresholds
            for (const threshold of config.burn.bonusThresholds) {
                if (context.amount >= threshold.amount) {
                    burnXP += threshold.bonus;
                }
            }
            return burnXP;

        case 'game':
            let gameXP = config.game.completion;
            gameXP += Math.floor((context.score || 0) * config.game.scoreMultiplier);

            // Win bonus (top percentile)
            if (context.percentile && context.percentile >= 90) {
                gameXP += config.game.winBonus;
            }

            // Perfect bonus
            if (context.perfect) {
                gameXP += config.game.perfectBonus;
            }

            return gameXP;

        case 'achievement':
            const rarity = context.rarity || 'common';
            return config.achievement[rarity] || config.achievement.common;

        case 'referral':
            return config.referral.invited;

        case 'daily':
            return config.daily[context.type] || 0;

        default:
            return 0;
    }
}

/**
 * Get XP required for next level
 * @param {number} level - Current level
 * @returns {number}
 */
function getXPForNextLevel(level) {
    return PROGRESSION_CONFIG.levels.xpPerLevel(level);
}

/**
 * Calculate total XP for a level
 * @param {number} level - Target level
 * @returns {number}
 */
function getTotalXPForLevel(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += getXPForNextLevel(i);
    }
    return total;
}

// ============================================
// STREAK SYSTEM
// ============================================

/**
 * Update player streak
 * @param {string} wallet - Player wallet
 * @returns {{streak: number, bonus: number, broken: boolean}}
 */
function updateStreak(wallet) {
    const progress = getOrCreateProgress(wallet);
    const today = getDateKey();

    if (progress.lastStreakUpdate === today) {
        return {
            streak: progress.streak,
            bonus: getStreakBonus(progress.streak),
            broken: false
        };
    }

    const yesterday = getDateKey(Date.now() - 24 * 60 * 60 * 1000);
    const dayBefore = getDateKey(Date.now() - 48 * 60 * 60 * 1000);

    let broken = false;

    if (progress.lastStreakUpdate === yesterday ||
        progress.lastStreakUpdate === dayBefore) {  // Grace period
        // Continue streak
        progress.streak = Math.min(
            progress.streak + 1,
            PROGRESSION_CONFIG.streaks.maxStreak
        );
    } else if (progress.lastStreakUpdate) {
        // Streak broken
        progress.streak = 1;
        broken = true;
    } else {
        // First streak day
        progress.streak = 1;
    }

    progress.lastStreakUpdate = today;

    // Track max streak
    if (progress.streak > progress.maxStreak) {
        progress.maxStreak = progress.streak;
    }

    const bonus = getStreakBonus(progress.streak);

    if (bonus > 0) {
        awardXP(wallet, 'daily', { type: 'login' });
    }

    return { streak: progress.streak, bonus, broken };
}

/**
 * Get streak bonus XP
 * @param {number} streak - Current streak
 * @returns {number}
 */
function getStreakBonus(streak) {
    const bonuses = PROGRESSION_CONFIG.streaks.dailyLoginBonus;
    const index = Math.min(streak - 1, bonuses.length - 1);
    return bonuses[Math.max(0, index)] || 0;
}

/**
 * Calculate streak multiplier
 * @param {Object} progress - Player progress
 * @returns {number}
 */
function calculateStreakMultiplier(progress) {
    const weeks = Math.floor(progress.streak / 7);
    const multipliers = PROGRESSION_CONFIG.streaks.weeklyMultiplier;
    const index = Math.min(weeks, multipliers.length - 1);
    return multipliers[index] || 1;
}

// ============================================
// PRESTIGE SYSTEM
// ============================================

/**
 * Prestige a player (reset with bonuses)
 * @param {string} wallet - Player wallet
 * @returns {{success: boolean, newPrestige?: number, keptXP?: number, error?: string}}
 */
function prestige(wallet) {
    const progress = getOrCreateProgress(wallet);
    const config = PROGRESSION_CONFIG.prestige;

    // Check requirements
    if (progress.level < config.requiredLevel) {
        return {
            success: false,
            error: `Must be level ${config.requiredLevel} to prestige`
        };
    }

    if (progress.prestige >= config.maxPrestige) {
        return {
            success: false,
            error: 'Maximum prestige reached'
        };
    }

    // Calculate kept XP
    const keptXP = Math.floor(progress.totalXP * config.keepPercentage);

    // Perform prestige
    progress.prestige++;
    progress.level = 1;
    progress.currentXP = keptXP;
    progress.prestigeHistory.push({
        timestamp: Date.now(),
        previousXP: progress.totalXP,
        keptXP
    });

    // Keep total XP for historical tracking
    // progress.totalXP stays unchanged

    // Update tier
    progress.tier = calculateTier(progress.level, progress.prestige);

    stats.totalPrestiges++;

    logAudit('prestige', {
        wallet: wallet.slice(0, 8) + '...',
        newPrestige: progress.prestige,
        keptXP
    });

    return {
        success: true,
        newPrestige: progress.prestige,
        keptXP,
        newBonus: (progress.prestige * config.bonusPerPrestige * 100) + '%'
    };
}

// ============================================
// TIER SYSTEM
// ============================================

/**
 * Calculate tier from level and prestige
 * @param {number} level - Player level
 * @param {number} prestige - Prestige level
 * @returns {Object}
 */
function calculateTier(level, prestige) {
    const tiers = PROGRESSION_CONFIG.tierNames;

    // Base tier from level (every 10 levels = 1 tier)
    let tierIndex = Math.floor(level / 10);

    // Prestige adds bonus tiers
    tierIndex += prestige;

    // Cap at max tier
    tierIndex = Math.min(tierIndex, tiers.length - 1);

    const tier = tiers[tierIndex];

    return {
        index: tierIndex,
        name: tier.name,
        icon: tier.icon,
        color: tier.color,
        prestige: prestige > 0 ? `P${prestige}` : null
    };
}

// ============================================
// DAILY TRACKING
// ============================================

/**
 * Check and award daily bonuses
 * @param {string} wallet - Player wallet
 * @param {string} source - XP source
 * @param {Object} context - Context
 * @returns {number} Bonus XP
 */
function checkDailyBonuses(wallet, source, context) {
    const today = getDateKey();
    const key = `${wallet}:${today}`;

    let daily = dailyTracking.get(key);
    if (!daily) {
        daily = {
            gamesPlayed: 0,
            firstGameAwarded: false,
            threeGamesAwarded: false,
            fiveGamesAwarded: false
        };
        dailyTracking.set(key, daily);
    }

    let bonus = 0;
    const config = PROGRESSION_CONFIG.xpSources.daily;

    if (source === 'game') {
        daily.gamesPlayed++;

        if (!daily.firstGameAwarded) {
            daily.firstGameAwarded = true;
            bonus += config.firstGame;
        }

        if (daily.gamesPlayed >= 3 && !daily.threeGamesAwarded) {
            daily.threeGamesAwarded = true;
            bonus += config.threeGames;
        }

        if (daily.gamesPlayed >= 5 && !daily.fiveGamesAwarded) {
            daily.fiveGamesAwarded = true;
            bonus += config.fiveGames;
        }
    }

    return bonus;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create player progress
 * @param {string} wallet - Player wallet
 * @returns {Object}
 */
function getOrCreateProgress(wallet) {
    if (playerProgress.has(wallet)) {
        return playerProgress.get(wallet);
    }

    const progress = {
        wallet,
        level: 1,
        prestige: 0,
        currentXP: 0,
        totalXP: 0,
        tier: calculateTier(1, 0),
        streak: 0,
        maxStreak: 0,
        lastStreakUpdate: null,
        lastActivity: Date.now(),
        xpBySource: {},
        prestigeHistory: [],
        achievements: [],
        createdAt: Date.now()
    };

    playerProgress.set(wallet, progress);
    return progress;
}

/**
 * Get date key for tracking
 * @param {number} timestamp - Optional timestamp
 * @returns {string}
 */
function getDateKey(timestamp = Date.now()) {
    return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Check if current time is weekend
 * @returns {boolean}
 */
function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
}

/**
 * Get current event multiplier
 * @returns {number}
 */
function getEventMultiplier() {
    let multiplier = 1;

    for (const event of activeEvents.values()) {
        if (event.expiresAt > Date.now()) {
            multiplier *= event.multiplier;
        }
    }

    return multiplier;
}

/**
 * Update global statistics
 */
function updateGlobalStats() {
    let totalLevel = 0;
    let count = 0;
    let activeStreakCount = 0;

    for (const progress of playerProgress.values()) {
        totalLevel += progress.level;
        count++;
        if (progress.streak > 0) {
            activeStreakCount++;
        }
    }

    stats.avgLevel = count > 0 ? totalLevel / count : 0;
    stats.activeStreaks = activeStreakCount;
}

// ============================================
// EVENT MANAGEMENT
// ============================================

/**
 * Start an XP event
 * @param {string} eventId - Event ID
 * @param {number} multiplier - XP multiplier
 * @param {number} durationMs - Duration in ms
 * @returns {Object}
 */
function startEvent(eventId, multiplier, durationMs) {
    const event = {
        id: eventId,
        multiplier,
        startedAt: Date.now(),
        expiresAt: Date.now() + durationMs
    };

    activeEvents.set(eventId, event);

    logAudit('xp_event_started', { eventId, multiplier, durationMs });

    return event;
}

/**
 * End an XP event
 * @param {string} eventId - Event ID
 */
function endEvent(eventId) {
    activeEvents.delete(eventId);
    logAudit('xp_event_ended', { eventId });
}

// ============================================
// API
// ============================================

/**
 * Get player progress
 * @param {string} wallet - Player wallet
 * @returns {Object}
 */
function getProgress(wallet) {
    const progress = playerProgress.get(wallet);

    if (!progress) {
        return {
            found: false,
            level: 1,
            prestige: 0,
            currentXP: 0,
            totalXP: 0,
            tier: calculateTier(1, 0),
            streak: 0
        };
    }

    return {
        found: true,
        level: progress.level,
        prestige: progress.prestige,
        currentXP: progress.currentXP,
        totalXP: progress.totalXP,
        xpToNext: getXPForNextLevel(progress.level) - progress.currentXP,
        xpProgress: (progress.currentXP / getXPForNextLevel(progress.level) * 100).toFixed(1) + '%',
        tier: progress.tier,
        streak: progress.streak,
        maxStreak: progress.maxStreak,
        xpBySource: progress.xpBySource,
        memberSince: progress.createdAt
    };
}

/**
 * Get leaderboard by level/XP
 * @param {Object} options - Query options
 * @returns {Array}
 */
function getLeaderboard(options = {}) {
    const { limit = 100, sortBy = 'totalXP' } = options;

    const players = Array.from(playerProgress.values())
        .sort((a, b) => {
            if (sortBy === 'level') {
                if (a.prestige !== b.prestige) return b.prestige - a.prestige;
                if (a.level !== b.level) return b.level - a.level;
                return b.currentXP - a.currentXP;
            }
            return b.totalXP - a.totalXP;
        })
        .slice(0, limit);

    return players.map((p, i) => ({
        rank: i + 1,
        wallet: p.wallet.slice(0, 4) + '...' + p.wallet.slice(-4),
        level: p.level,
        prestige: p.prestige,
        totalXP: p.totalXP,
        tier: p.tier
    }));
}

/**
 * Get progression statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...stats,
        trackedPlayers: playerProgress.size,
        avgLevel: stats.avgLevel.toFixed(1),
        activeEvents: activeEvents.size,
        currentEventMultiplier: getEventMultiplier()
    };
}

/**
 * Get XP table for levels
 * @param {number} maxLevel - Max level to show
 * @returns {Array}
 */
function getXPTable(maxLevel = 20) {
    const table = [];
    let cumulativeXP = 0;

    for (let level = 1; level <= maxLevel; level++) {
        const xpRequired = getXPForNextLevel(level);
        cumulativeXP += xpRequired;

        table.push({
            level,
            xpRequired,
            cumulativeXP,
            tier: calculateTier(level, 0)
        });
    }

    return table;
}

// ============================================
// CLEANUP
// ============================================

// Clean daily tracking at midnight
setInterval(() => {
    const today = getDateKey();

    for (const key of dailyTracking.keys()) {
        if (!key.includes(today)) {
            dailyTracking.delete(key);
        }
    }

    // Clean expired events
    for (const [id, event] of activeEvents.entries()) {
        if (event.expiresAt < Date.now()) {
            activeEvents.delete(id);
        }
    }
}, 60 * 60 * 1000);  // Every hour

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // XP
    awardXP,
    getXPForNextLevel,
    getTotalXPForLevel,

    // Streaks
    updateStreak,
    getStreakBonus,

    // Prestige
    prestige,

    // Progress
    getProgress,
    getLeaderboard,

    // Events
    startEvent,
    endEvent,

    // Stats
    getStats,
    getXPTable,

    // Utilities
    fib,
    calculateTier,

    // Config
    PROGRESSION_CONFIG
};
