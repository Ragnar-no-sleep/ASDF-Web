/**
 * Pump Arena RPG - State Management
 * Handles save/load with integrity checking
 *
 * PHILOSOPHY: Integrated with ASDF Core
 * - All values derived from Fibonacci sequence
 * - No magic numbers - everything is mathematically harmonious
 * - Burns benefit everyone
 * - Verify everything
 *
 * Version: 2.0.0 - ASDF Philosophy Integration
 */

'use strict';

const PUMPARENA_STORAGE_KEY = 'asdf_pumparena_rpg_v2';
const PUMPARENA_INTEGRITY_KEY = 'asdf_pumparena_integrity_v2';
const PUMPARENA_VERSION = '2.0.0';

// ============================================
// ASDF INTEGRATION - Fibonacci Constants
// ============================================

// Local Fibonacci cache (fallback if ASDF not loaded)
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025];

/**
 * Get Fibonacci number - uses ASDF if available
 * @param {number} n - Index in Fibonacci sequence
 * @returns {number} Fibonacci number
 */
function getFib(n) {
    if (typeof ASDF !== 'undefined' && ASDF.getFib) {
        return ASDF.getFib(n);
    }
    if (n < 0) return 0;
    if (n < FIB.length) return FIB[n];
    // Calculate beyond cache
    let a = FIB[FIB.length - 2];
    let b = FIB[FIB.length - 1];
    for (let i = FIB.length; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// ============================================
// ASDF TIER SYSTEM
// ============================================

const ASDF_TIERS = {
    EMBER: { index: 0, name: 'EMBER', color: '#6b7280', minLevel: 1, xpThreshold: 0 },
    SPARK: { index: 1, name: 'SPARK', color: '#fbbf24', minLevel: 10, xpThreshold: getFib(5) },      // 5
    FLAME: { index: 2, name: 'FLAME', color: '#f97316', minLevel: 20, xpThreshold: getFib(10) },     // 55
    BLAZE: { index: 3, name: 'BLAZE', color: '#ef4444', minLevel: 35, xpThreshold: getFib(15) },     // 610
    INFERNO: { index: 4, name: 'INFERNO', color: '#dc2626', minLevel: 50, xpThreshold: getFib(20) }  // 6765
};

const TIER_NAMES = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'];

/**
 * Get player's ASDF tier based on level
 * @param {number} level - Player level
 * @returns {Object} Tier info
 */
function getASDF_Tier(level) {
    if (level >= 50) return ASDF_TIERS.INFERNO;
    if (level >= 35) return ASDF_TIERS.BLAZE;
    if (level >= 20) return ASDF_TIERS.FLAME;
    if (level >= 10) return ASDF_TIERS.SPARK;
    return ASDF_TIERS.EMBER;
}

// Default RPG State Structure
const DEFAULT_RPG_STATE = {
    version: PUMPARENA_VERSION,

    // Character Core
    character: {
        id: null,
        name: '',
        portrait: 0,
        archetype: null,
        background: null,
        motivation: null,
        created: false,
        xpMultiplier: 1,
        archetypeBonus: null,
        startingRelationships: 0
    },

    // Progression
    progression: {
        level: 1,
        xp: 0,
        skillPoints: 0,
        statPoints: 0,
        prestigeLevel: 0,
        skills: []  // Unlocked skill IDs from skill trees
    },

    // Stats (6 primary stats)
    stats: {
        dev: 5,         // Development/Technical
        com: 5,         // Community
        mkt: 5,         // Marketing
        str: 5,         // Strategy
        cha: 5,         // Charisma
        lck: 5          // Luck
    },

    // Resources (ASDF Philosophy: Fibonacci-based)
    resources: {
        influence: 55,          // Energy (fib[10] = 55 base)
        maxInfluence: 55,       // Max energy (Fibonacci scaling)
        reputation: 0,          // Fame/standing
        tokens: 0,              // Currency
        burnedTotal: 0,         // Total tokens burned (ASDF burn philosophy)
        lastInfluenceRegen: null
    },

    // ASDF Tier (derived from level)
    asdfTier: {
        current: 'EMBER',
        index: 0,
        totalBurned: 0          // Contribution to collective burn
    },

    // Skills (unlocked skill node IDs)
    skills: {
        unlockedNodes: [],
        activeAbilities: [],
        passiveEffects: {}
    },

    // Skill Cooldowns (timestamp when ability can be used again)
    skillCooldowns: {},

    // Inventory
    inventory: {
        tools: [],
        consumables: [],
        collectibles: []
    },

    // Relationships with NPCs
    relationships: {},

    // Quest Progress
    quests: {
        active: [],
        completed: [],
        currentCampaign: null,
        campaignProgress: {}
    },

    // Daily System
    daily: {
        lastLogin: null,
        loginStreak: 0,
        dailyMissions: [],
        dailyMissionsCompleted: [],
        lastMissionRefresh: null
    },

    // Achievements & Titles
    achievements: {
        unlocked: [],
        currentTitle: null
    },

    // World State
    world: {
        currentLocation: 'crypto_valley',
        unlockedLocations: ['crypto_valley'],
        dayCount: 1,
        timeOfDay: 'morning'
    },

    // Statistics
    statistics: {
        totalPlaytime: 0,
        sessionsPlayed: 0,
        decisionsCount: 0,
        questsCompleted: 0,
        npcsMaxFriendship: 0,
        minigamesWon: 0,
        eventsHandled: 0,
        bestStreak: 0
    },

    // Session tracking
    session: {
        startTime: null,
        lastSave: null
    }
};

// Current RPG State (mutable copy)
let rpgState = JSON.parse(JSON.stringify(DEFAULT_RPG_STATE));

// ============================================
// INTEGRITY CHECKING
// ============================================

function generateRPGHash(data) {
    const str = JSON.stringify({
        character: data.character,
        progression: data.progression,
        stats: data.stats,
        resources: data.resources,
        skills: data.skills,
        quests: data.quests,
        achievements: data.achievements
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const fp = navigator.userAgent.length + screen.width + screen.height;
    return ((hash ^ fp) >>> 0).toString(36);
}

function verifyRPGIntegrity(data) {
    try {
        const storedHash = localStorage.getItem(PUMPARENA_INTEGRITY_KEY);
        if (!storedHash) return true;
        const currentHash = generateRPGHash(data);
        return storedHash === currentHash;
    } catch {
        return false;
    }
}

// ============================================
// SCHEMA VALIDATION
// ============================================

function validateRPGSchema(data) {
    if (typeof data !== 'object' || data === null) return false;

    // Version check
    if (typeof data.version !== 'string') return false;

    // Character validation
    if (!data.character || typeof data.character !== 'object') return false;
    if (data.character.name && typeof data.character.name !== 'string') return false;
    if (data.character.name && data.character.name.length > 20) return false;

    // Progression validation
    if (!data.progression || typeof data.progression !== 'object') return false;
    if (typeof data.progression.level !== 'number' || data.progression.level < 1) return false;
    if (typeof data.progression.xp !== 'number' || data.progression.xp < 0) return false;

    // Stats validation
    if (!data.stats || typeof data.stats !== 'object') return false;
    const statKeys = ['dev', 'com', 'mkt', 'str', 'cha', 'lck'];
    for (const key of statKeys) {
        if (typeof data.stats[key] !== 'number' || data.stats[key] < 0 || data.stats[key] > 999) {
            return false;
        }
    }

    // Resources validation
    if (!data.resources || typeof data.resources !== 'object') return false;
    if (typeof data.resources.influence !== 'number' || data.resources.influence < 0) return false;
    if (typeof data.resources.reputation !== 'number') return false;
    if (typeof data.resources.tokens !== 'number' || data.resources.tokens < 0) return false;

    return true;
}

// ============================================
// SAVE / LOAD
// ============================================

function saveRPGState() {
    try {
        rpgState.session.lastSave = Date.now();

        const safeState = JSON.parse(JSON.stringify(rpgState));
        localStorage.setItem(PUMPARENA_STORAGE_KEY, JSON.stringify(safeState));
        localStorage.setItem(PUMPARENA_INTEGRITY_KEY, generateRPGHash(safeState));

        return true;
    } catch (e) {
        console.error('[PumpArena] Failed to save state:', e);
        return false;
    }
}

function loadRPGState() {
    try {
        const saved = localStorage.getItem(PUMPARENA_STORAGE_KEY);
        if (!saved) {
            console.log('[PumpArena] No saved state found, using defaults');
            return false;
        }

        const parsed = JSON.parse(saved);

        // Validate schema
        if (!validateRPGSchema(parsed)) {
            console.warn('[PumpArena] Invalid state schema, resetting');
            resetRPGState();
            return false;
        }

        // Verify integrity
        if (!verifyRPGIntegrity(parsed)) {
            console.warn('[PumpArena] State integrity check failed, resetting');
            resetRPGState();
            return false;
        }

        // Migration handling for version differences
        if (parsed.version !== PUMPARENA_VERSION) {
            parsed = migrateState(parsed);
        }

        // Deep merge with defaults to handle missing fields
        rpgState = deepMerge(JSON.parse(JSON.stringify(DEFAULT_RPG_STATE)), parsed);

        console.log('[PumpArena] State loaded successfully');
        return true;
    } catch (e) {
        console.error('[PumpArena] Failed to load state:', e);
        resetRPGState();
        return false;
    }
}

function resetRPGState() {
    rpgState = JSON.parse(JSON.stringify(DEFAULT_RPG_STATE));
    localStorage.removeItem(PUMPARENA_STORAGE_KEY);
    localStorage.removeItem(PUMPARENA_INTEGRITY_KEY);
}

function migrateState(oldState) {
    // Future migration logic here
    // For now, just return with updated version
    oldState.version = PUMPARENA_VERSION;
    return oldState;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (target[key] && typeof target[key] === 'object') {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

function generateCharacterId() {
    return 'char_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// STATE ACCESSORS & MUTATORS
// ============================================

function getRPGState() {
    return rpgState;
}

function getCharacter() {
    return rpgState.character;
}

function getProgression() {
    return rpgState.progression;
}

function getStats() {
    return rpgState.stats;
}

function getResources() {
    return rpgState.resources;
}

function getRelationships() {
    return rpgState.relationships;
}

function hasCharacter() {
    return rpgState.character.created === true && rpgState.character.name.length > 0;
}

// ============================================
// PROGRESSION HELPERS
// ============================================

/**
 * XP required for a level (ASDF Philosophy)
 * Formula: fib[level + 4] * 100
 * Level 1: fib[5] * 100 = 500
 * Level 2: fib[6] * 100 = 800
 * etc.
 */
function getXPForLevel(level) {
    return getFib(level + 4) * 100;
}

function getTotalXPForLevel(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += getXPForLevel(i);
    }
    return total;
}

/**
 * Max Influence (ASDF Philosophy)
 * Base: fib[10] = 55
 * Per level: +fib[level mod 10 + 3]
 * This creates Fibonacci-scaled growth
 */
function getMaxInfluence() {
    const level = rpgState.progression.level;
    const base = getFib(10);  // 55 base
    const tierBonus = getASDF_Tier(level).index * getFib(8);  // 21 per tier
    const levelBonus = getFib(Math.min(level, 20) + 2);  // Fibonacci scaling
    return base + tierBonus + levelBonus;
}

/**
 * Reputation Ranks (ASDF Philosophy)
 * Thresholds based on Fibonacci sequence
 * fib[7]=13, fib[10]=55, fib[13]=233, fib[16]=987, fib[19]=4181
 */
const REPUTATION_RANKS = [
    { name: 'Unknown', tier: 0, threshold: 0, color: '#6b7280' },
    { name: 'Newcomer', tier: 1, threshold: getFib(7) * 10, color: '#9ca3af' },       // 130
    { name: 'Contributor', tier: 2, threshold: getFib(10) * 10, color: '#fbbf24' },   // 550
    { name: 'Builder', tier: 3, threshold: getFib(13) * 10, color: '#f97316' },       // 2330
    { name: 'Core Team', tier: 4, threshold: getFib(16) * 10, color: '#ef4444' },     // 9870
    { name: 'Legend', tier: 5, threshold: getFib(19) * 10, color: '#dc2626' }         // 41810
];

function getReputationRank() {
    const rep = rpgState.resources.reputation;
    for (let i = REPUTATION_RANKS.length - 1; i >= 0; i--) {
        if (rep >= REPUTATION_RANKS[i].threshold) {
            return REPUTATION_RANKS[i];
        }
    }
    return REPUTATION_RANKS[0];
}

/**
 * Get current ASDF tier for the player
 */
function getCurrentTier() {
    return getASDF_Tier(rpgState.progression.level);
}

/**
 * Get tier discount (ASDF Philosophy)
 * fib[tier] percent discount
 */
function getTierDiscount() {
    const tier = getCurrentTier();
    return getFib(tier.index) / 100;  // 0%, 1%, 1%, 2%, 3%
}

/**
 * Get tier XP multiplier (ASDF Philosophy)
 * Higher tiers earn more XP
 */
function getTierXPMultiplier() {
    const tier = getCurrentTier();
    return 1 + (getFib(tier.index + 2) / 100);  // 1.01, 1.01, 1.02, 1.03, 1.05
}

// ============================================
// RESOURCE MANAGEMENT
// ============================================

/**
 * Add XP (ASDF Philosophy)
 * Applies tier multiplier and character bonus
 */
function addXP(amount) {
    if (amount <= 0) return false;

    // Apply XP multipliers (ASDF tier + character background)
    const tierMultiplier = getTierXPMultiplier();
    const characterMultiplier = rpgState.character.xpMultiplier || 1;
    const finalAmount = Math.floor(amount * tierMultiplier * characterMultiplier);

    rpgState.progression.xp += finalAmount;

    // Check for level up
    let leveledUp = false;
    while (rpgState.progression.xp >= getXPForLevel(rpgState.progression.level)) {
        rpgState.progression.xp -= getXPForLevel(rpgState.progression.level);
        rpgState.progression.level++;
        rpgState.progression.skillPoints++;
        leveledUp = true;

        // Recalculate max influence (Fibonacci-based)
        rpgState.resources.maxInfluence = getMaxInfluence();

        // Bonus stat point every fib[5]=5 levels
        if (rpgState.progression.level % 5 === 0) {
            rpgState.progression.statPoints++;
        }

        // Update ASDF tier
        const newTier = getCurrentTier();
        const oldTierIndex = rpgState.asdfTier.index;
        if (newTier.index > oldTierIndex) {
            rpgState.asdfTier.current = newTier.name;
            rpgState.asdfTier.index = newTier.index;

            // Dispatch tier up event
            document.dispatchEvent(new CustomEvent('pumparena:tierup', {
                detail: {
                    tier: newTier,
                    previousTier: TIER_NAMES[oldTierIndex]
                }
            }));
        }

        // Dispatch level up event
        document.dispatchEvent(new CustomEvent('pumparena:levelup', {
            detail: {
                level: rpgState.progression.level,
                skillPoints: rpgState.progression.skillPoints,
                maxInfluence: rpgState.resources.maxInfluence,
                tier: getCurrentTier()
            }
        }));
    }

    saveRPGState();
    return { success: true, amount: finalAmount, leveledUp };
}

function addReputation(amount) {
    rpgState.resources.reputation += amount;
    saveRPGState();
    return true;
}

function addTokens(amount) {
    if (rpgState.resources.tokens + amount < 0) return false;
    rpgState.resources.tokens += amount;
    saveRPGState();
    return true;
}

function spendInfluence(amount) {
    if (rpgState.resources.influence < amount) return false;
    rpgState.resources.influence -= amount;
    saveRPGState();
    return true;
}

/**
 * Regenerate Influence (ASDF Philosophy)
 * Regen rate: fib[8] = 21 seconds per point (faster for higher tiers)
 * Tier bonus: reduces time by fib[tier] seconds
 */
function regenerateInfluence() {
    const now = Date.now();
    const lastRegen = rpgState.resources.lastInfluenceRegen || now;
    const elapsed = now - lastRegen;

    // Base: fib[8] * 1000 = 21 seconds per influence
    // Tier bonus: -fib[tier] * 1000ms
    const tier = getCurrentTier();
    const baseRate = getFib(8) * 1000;  // 21000ms = 21 seconds
    const tierReduction = getFib(tier.index) * 1000;  // 0, 1, 1, 2, 3 seconds faster
    const regenRate = Math.max(baseRate - tierReduction, getFib(6) * 1000);  // Min 8 seconds

    const regenAmount = Math.floor(elapsed / regenRate);

    if (regenAmount > 0) {
        const maxInf = getMaxInfluence();
        rpgState.resources.influence = Math.min(maxInf, rpgState.resources.influence + regenAmount);
        rpgState.resources.lastInfluenceRegen = now;
        saveRPGState();
    }
}

// ============================================
// BURN SYSTEM (ASDF Philosophy: Burns benefit everyone)
// ============================================

/**
 * Burn tokens for XP (ASDF Philosophy)
 * 1 token burned = 1 XP (identity ratio)
 * Burns contribute to collective pool
 * @param {number} amount - Amount of tokens to burn (must be positive integer)
 * @returns {Object} Result object with success status
 */
function burnTokensForXP(amount) {
    // Input validation (Security by Design)
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        return { success: false, message: 'Invalid amount type' };
    }

    // Ensure integer and positive
    amount = Math.floor(amount);
    if (amount <= 0) {
        return { success: false, message: 'Amount must be positive' };
    }

    // Cap to prevent integer overflow (max safe integer / 2)
    const MAX_BURN = 4503599627370496; // 2^52
    if (amount > MAX_BURN) {
        return { success: false, message: 'Amount exceeds maximum' };
    }

    if (rpgState.resources.tokens < amount) {
        return { success: false, message: 'Insufficient tokens' };
    }

    // Deduct tokens
    rpgState.resources.tokens -= amount;

    // Track burn
    rpgState.resources.burnedTotal += amount;
    rpgState.asdfTier.totalBurned += amount;

    // Convert to XP (1:1 ratio per ASDF philosophy)
    const xpGained = amount;
    addXP(xpGained);

    // Dispatch burn event
    document.dispatchEvent(new CustomEvent('pumparena:burn', {
        detail: {
            amount,
            totalBurned: rpgState.resources.burnedTotal,
            xpGained
        }
    }));

    saveRPGState();
    return {
        success: true,
        xpGained,
        totalBurned: rpgState.resources.burnedTotal
    };
}

/**
 * Burn tokens for reputation (ASDF Philosophy)
 * Fibonacci conversion: fib[tier+5] tokens = 1 reputation
 * @param {number} amount - Amount of tokens to burn (must be positive integer)
 * @returns {Object} Result object with success status
 */
function burnTokensForReputation(amount) {
    // Input validation (Security by Design)
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        return { success: false, message: 'Invalid amount type' };
    }

    // Ensure integer and positive
    amount = Math.floor(amount);
    if (amount <= 0) {
        return { success: false, message: 'Amount must be positive' };
    }

    // Cap to prevent integer overflow
    const MAX_BURN = 4503599627370496; // 2^52
    if (amount > MAX_BURN) {
        return { success: false, message: 'Amount exceeds maximum' };
    }

    if (rpgState.resources.tokens < amount) {
        return { success: false, message: 'Insufficient tokens' };
    }

    const tier = getCurrentTier();
    const conversionRate = getFib(tier.index + 5);  // 5, 8, 13, 21, 34 tokens per rep
    const repGained = Math.floor(amount / conversionRate);

    if (repGained <= 0) {
        return { success: false, message: `Need at least ${conversionRate} tokens` };
    }

    const tokensUsed = repGained * conversionRate;

    // Deduct tokens
    rpgState.resources.tokens -= tokensUsed;
    rpgState.resources.burnedTotal += tokensUsed;
    rpgState.asdfTier.totalBurned += tokensUsed;

    // Add reputation
    addReputation(repGained);

    saveRPGState();
    return {
        success: true,
        repGained,
        tokensUsed,
        totalBurned: rpgState.resources.burnedTotal
    };
}

/**
 * Get burn statistics
 */
function getBurnStats() {
    return {
        totalBurned: rpgState.resources.burnedTotal,
        tierContribution: rpgState.asdfTier.totalBurned,
        currentTier: getCurrentTier()
    };
}

// ============================================
// RELATIONSHIP MANAGEMENT
// ============================================

function getRelationship(npcId) {
    if (!rpgState.relationships[npcId]) {
        rpgState.relationships[npcId] = {
            affinity: 0,
            stage: 'stranger',
            history: []
        };
    }
    return rpgState.relationships[npcId];
}

/**
 * Modify Relationship (ASDF Philosophy)
 * Stages based on Fibonacci thresholds:
 * stranger: 0, acquaintance: fib[6]=8, friend: fib[8]=21, ally: fib[9]=34, partner: fib[10]=55
 */
const RELATIONSHIP_THRESHOLDS = {
    stranger: 0,
    acquaintance: getFib(6),    // 8
    friend: getFib(8),           // 21
    ally: getFib(9),             // 34
    partner: getFib(10)          // 55
};

function modifyRelationship(npcId, amount) {
    const rel = getRelationship(npcId);

    // Apply tier bonus to relationship gains
    const tier = getCurrentTier();
    const tierBonus = 1 + (getFib(tier.index) / 100);  // +0%, +1%, +1%, +2%, +3%
    const finalAmount = Math.floor(amount * tierBonus);

    rel.affinity = Math.max(-100, Math.min(100, rel.affinity + finalAmount));

    // Update stage based on Fibonacci thresholds
    if (rel.affinity >= RELATIONSHIP_THRESHOLDS.partner) rel.stage = 'partner';
    else if (rel.affinity >= RELATIONSHIP_THRESHOLDS.ally) rel.stage = 'ally';
    else if (rel.affinity >= RELATIONSHIP_THRESHOLDS.friend) rel.stage = 'friend';
    else if (rel.affinity >= RELATIONSHIP_THRESHOLDS.acquaintance) rel.stage = 'acquaintance';
    else rel.stage = 'stranger';

    saveRPGState();
    return rel;
}

// ============================================
// DAILY SYSTEM (ASDF Philosophy)
// ============================================

/**
 * Daily login bonus (ASDF Philosophy)
 * Base: fib[5] = 5 tokens
 * Streak bonus: fib[min(streak, 14)] tokens
 * This creates exponential rewards for consistent players
 */
function getDailyBonus(streak) {
    const base = getFib(5);  // 5 tokens
    const streakIndex = Math.min(streak, 14);  // Cap at fib[14] = 377
    const streakBonus = getFib(streakIndex);
    return {
        base,
        streakBonus,
        total: base + streakBonus
    };
}

/**
 * Daily influence restore (ASDF Philosophy)
 * Restore fib[tier + 6] influence on login
 */
function getDailyInfluenceRestore() {
    const tier = getCurrentTier();
    return getFib(tier.index + 6);  // 8, 13, 21, 34, 55
}

function checkDailyReset() {
    const today = new Date().toDateString();
    const lastLogin = rpgState.daily.lastLogin;

    if (lastLogin !== today) {
        // Check login streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastLogin === yesterday.toDateString()) {
            rpgState.daily.loginStreak++;
        } else if (lastLogin !== today) {
            rpgState.daily.loginStreak = 1;
        }

        rpgState.daily.lastLogin = today;
        rpgState.daily.dailyMissionsCompleted = [];

        // Grant daily login bonus (Fibonacci-based)
        const bonus = getDailyBonus(rpgState.daily.loginStreak);
        addTokens(bonus.total);

        // Restore influence (Fibonacci-based, tier-scaled)
        const influenceRestore = getDailyInfluenceRestore();
        rpgState.resources.influence = Math.min(
            getMaxInfluence(),
            rpgState.resources.influence + influenceRestore
        );

        saveRPGState();

        return {
            isNewDay: true,
            streak: rpgState.daily.loginStreak,
            bonus: bonus.total,
            bonusDetails: bonus,
            influenceRestored: influenceRestore
        };
    }

    return { isNewDay: false };
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function startSession() {
    rpgState.session.startTime = Date.now();
    rpgState.statistics.sessionsPlayed++;
    regenerateInfluence();
    checkDailyReset();
    saveRPGState();
}

function endSession() {
    if (rpgState.session.startTime) {
        const sessionDuration = Date.now() - rpgState.session.startTime;
        rpgState.statistics.totalPlaytime += sessionDuration;
        rpgState.session.startTime = null;
        saveRPGState();
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.PumpArenaState = {
        // Core
        load: loadRPGState,
        save: saveRPGState,
        reset: resetRPGState,
        get: getRPGState,

        // Character
        getCharacter,
        hasCharacter,
        generateCharacterId,

        // Progression
        getProgression,
        getStats,
        getXPForLevel,
        getTotalXPForLevel,
        addXP,

        // Resources
        getResources,
        getMaxInfluence,
        getReputationRank,
        addReputation,
        addTokens,
        spendInfluence,
        regenerateInfluence,

        // Relationships
        getRelationship,
        getRelationships,
        modifyRelationship,

        // Daily
        checkDailyReset,
        getDailyBonus,
        getDailyInfluenceRestore,

        // Session
        startSession,
        endSession,

        // ASDF Philosophy Integration
        getCurrentTier,
        getASDF_Tier,
        getTierDiscount,
        getTierXPMultiplier,
        getFib,

        // Burn System
        burnTokensForXP,
        burnTokensForReputation,
        getBurnStats,

        // Constants
        VERSION: PUMPARENA_VERSION,
        ASDF_TIERS,
        TIER_NAMES,
        REPUTATION_RANKS,
        RELATIONSHIP_THRESHOLDS
    };
}
