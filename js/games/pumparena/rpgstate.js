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
 *
 * ============================================
 * SECURITY NOTICE - CLIENT-SIDE LIMITATIONS
 * ============================================
 *
 * This is a client-side only game. All security measures implemented here
 * (rate limiting, integrity checking, schema validation, input sanitization)
 * are DEFENSE IN DEPTH and can be bypassed by a determined attacker with
 * access to browser DevTools.
 *
 * For any future features requiring true security (leaderboards, multiplayer,
 * real-money transactions, competitive modes), SERVER-SIDE VALIDATION is
 * MANDATORY. The client should NEVER be trusted for authoritative game state.
 *
 * Current client-side security measures:
 * - XSS prevention via escapeHtml() and sanitizeColor()
 * - Prototype pollution prevention in deepMerge() and data imports
 * - Schema validation for localStorage and imported saves
 * - Rate limiting to discourage casual exploitation
 * - Integrity hashing (djb2+sdbm) for tamper detection (NOT cryptographic)
 *
 * These measures prevent accidental corruption and casual cheating, but
 * should NOT be relied upon for competitive integrity.
 */

'use strict';

const PUMPARENA_STORAGE_KEY = 'asdf_pumparena_rpg_v2';
const PUMPARENA_INTEGRITY_KEY = 'asdf_pumparena_integrity_v2';
const PUMPARENA_VERSION = '2.0.0';

// SECURITY: Maximum burn amount to prevent integer overflow (2^52 - half of MAX_SAFE_INTEGER)
const MAX_BURN_AMOUNT = Math.pow(2, 52);

// SECURITY: List of dangerous property keys (prototype pollution prevention)
const DANGEROUS_PROPERTY_KEYS = ['__proto__', 'constructor', 'prototype'];

// ============================================
// RATE LIMITING (Security by Design)
// ============================================

/**
 * Client-side rate limiter to prevent action abuse
 * Limits based on action type with Fibonacci-scaled cooldowns
 */
const ActionRateLimiter = {
    // Track last action timestamps per action type
    _actionTimestamps: {},

    // Cooldowns in milliseconds (Fibonacci-based: fib[n] * 100ms)
    _cooldowns: {
        burn: 2100,          // fib[8] * 100 = 21 * 100 = 2100ms
        buy: 1300,           // fib[7] * 100 = 13 * 100 = 1300ms
        sell: 1300,          // fib[7] * 100 = 1300ms
        save: 500,           // fib[5] * 100 = 5 * 100 = 500ms
        relationship: 800,   // fib[6] * 100 = 8 * 100 = 800ms
        xp: 300,             // fib[4] * 100 = 3 * 100 = 300ms
        quest: 1300          // fib[7] * 100 = 1300ms
    },

    // Action counters for burst detection
    _actionCounts: {},
    _countWindowStart: {},

    // Burst limits (max actions per 60 seconds)
    _burstLimits: {
        burn: 10,
        buy: 20,
        sell: 20,
        save: 60,
        relationship: 30,
        xp: 100,
        quest: 15
    },

    /**
     * Check if an action is allowed
     * @param {string} actionType - Type of action (burn, buy, sell, etc.)
     * @returns {Object} { allowed: boolean, waitTime: number, message: string }
     */
    checkAction(actionType) {
        const now = Date.now();
        const cooldown = this._cooldowns[actionType] || 1000;
        const lastAction = this._actionTimestamps[actionType] || 0;
        const elapsed = now - lastAction;

        // Check cooldown
        if (elapsed < cooldown) {
            const waitTime = cooldown - elapsed;
            return {
                allowed: false,
                waitTime,
                message: `Please wait ${Math.ceil(waitTime / 100) / 10}s`
            };
        }

        // Check burst limit
        const windowStart = this._countWindowStart[actionType] || 0;
        const burstLimit = this._burstLimits[actionType] || 30;

        // Reset window every 60 seconds
        if (now - windowStart > 60000) {
            this._actionCounts[actionType] = 0;
            this._countWindowStart[actionType] = now;
        }

        const currentCount = this._actionCounts[actionType] || 0;
        if (currentCount >= burstLimit) {
            const windowRemaining = 60000 - (now - windowStart);
            return {
                allowed: false,
                waitTime: windowRemaining,
                message: `Rate limit exceeded. Wait ${Math.ceil(windowRemaining / 1000)}s`
            };
        }

        return { allowed: true, waitTime: 0, message: '' };
    },

    /**
     * Record an action (call after action succeeds)
     * @param {string} actionType - Type of action
     */
    recordAction(actionType) {
        const now = Date.now();
        this._actionTimestamps[actionType] = now;

        // Initialize count window if needed
        if (!this._countWindowStart[actionType] || now - this._countWindowStart[actionType] > 60000) {
            this._countWindowStart[actionType] = now;
            this._actionCounts[actionType] = 0;
        }

        this._actionCounts[actionType] = (this._actionCounts[actionType] || 0) + 1;
    },

    /**
     * Get remaining cooldown for an action
     * @param {string} actionType - Type of action
     * @returns {number} Remaining cooldown in ms (0 if ready)
     */
    getRemainingCooldown(actionType) {
        const now = Date.now();
        const cooldown = this._cooldowns[actionType] || 1000;
        const lastAction = this._actionTimestamps[actionType] || 0;
        return Math.max(0, cooldown - (now - lastAction));
    },

    /**
     * Reset rate limiter (for testing or admin)
     */
    reset() {
        this._actionTimestamps = {};
        this._actionCounts = {};
        this._countWindowStart = {};
    }
};

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
        skillPoints: 1,   // Start with 1 skill point
        statPoints: 5,    // Start with 5 stat points to allocate (fib[5])
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

    // Faction Skills (combat abilities from faction membership)
    factionSkills: [],
    factionSkillCooldowns: {},

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
    },

    // Faction System (New)
    faction: {
        current: null,              // Current faction ID
        standing: {},               // faction_id -> reputation (-100 to +100)
        joinedAt: null,             // Timestamp when joined current faction
        previousFactions: [],       // History of factions player was in
        storyGatesDeclined: {},     // gate_id -> decline count
        storyGatesCooldowns: {},    // gate_id -> cooldown timestamp
        chapterProgress: {}         // faction_id -> { chapter, questsCompleted }
    },

    // Summons System (New)
    summons: {
        unlockedCreatures: [],      // Creature IDs player can use
        unlockedAllies: [],         // Ally IDs (NPC-based) player can use
        activeParty: {
            creatures: [],          // Max 3 creature IDs for battle
            allies: []              // Max 3 ally IDs for battle
        },
        creatureExp: {},            // creature_id -> experience points
        creatureLevels: {},         // creature_id -> level (1-10)
        creatureAffinity: {}        // creature_id -> bond level (0-100)
    },

    // Deckbuilding System (New)
    deckbuilding: {
        collection: [],             // All owned card IDs
        activeDeck: [],             // Current deck (20-30 cards)
        deckPresets: {},            // Named deck configurations { name: [cardIds] }
        cardCopies: {},             // card_id -> count owned
        favoriteCards: []           // Starred cards for quick access
    },

    // Story Flags (New) - Tracks player choices for branching narratives
    storyFlags: {
        majorChoices: {},           // choice_id -> selected_option
        factionEvents: {},          // event_id -> outcome
        secretsDiscovered: [],      // Secret IDs found
        endings: []                 // Ending IDs achieved
    }
};

// Current RPG State (mutable copy)
let rpgState = JSON.parse(JSON.stringify(DEFAULT_RPG_STATE));

// ============================================
// INTEGRITY CHECKING
// ============================================

/**
 * Generate secure hash for save data integrity
 * Uses multiple factors for tamper detection
 * @param {Object} data - State data to hash
 * @returns {string} Hash string
 */
function generateRPGHash(data) {
    // Extract critical fields for hashing
    const criticalData = {
        character: data.character,
        progression: data.progression,
        stats: data.stats,
        resources: data.resources,
        asdfTier: data.asdfTier,
        session: {
            totalPlayTime: data.session?.totalPlayTime || 0,
            lastSave: data.session?.lastSave || 0
        }
    };

    const str = JSON.stringify(criticalData);

    // Multi-pass hash for better distribution
    let hash1 = 0;
    let hash2 = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        // First hash (djb2 algorithm)
        hash1 = ((hash1 << 5) + hash1) + char;
        hash1 = hash1 & hash1;
        // Second hash (sdbm algorithm)
        hash2 = char + (hash2 << 6) + (hash2 << 16) - hash2;
        hash2 = hash2 & hash2;
    }

    // Device fingerprint with more factors
    const fp = generateDeviceFingerprint();

    // Combine hashes with XOR and fingerprint
    const combined = ((hash1 ^ hash2) ^ fp) >>> 0;

    // Add checksum byte
    const checksum = (hash1 & 0xFF) ^ (hash2 & 0xFF) ^ (fp & 0xFF);

    return combined.toString(36) + '-' + checksum.toString(16);
}

/**
 * Generate device fingerprint for hash salting
 * Makes it harder to forge hashes on different devices
 * NOTE: Only use STABLE factors that don't change between sessions
 */
function generateDeviceFingerprint() {
    let fp = 0;

    // Browser/UA factors (stable)
    if (typeof navigator !== 'undefined') {
        fp += navigator.userAgent?.length || 0;
        fp += navigator.language?.length || 0;
        fp += navigator.hardwareConcurrency || 0;
    }

    // Screen factors (stable unless display changes)
    if (typeof screen !== 'undefined') {
        fp += screen.width || 0;
        fp += screen.height || 0;
        fp += screen.colorDepth || 0;
    }

    // Timezone offset (stable unless timezone changes)
    fp += new Date().getTimezoneOffset();

    // NOTE: Removed performance.timeOrigin - it changes on every page load!
    // This was causing integrity checks to fail on every reload.

    return fp;
}

/**
 * Enhanced encryption for sensitive data
 * Uses XOR cipher with rotating key (Fibonacci-based)
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {string} Encrypted text (base64)
 */
function encryptData(text, key) {
    if (!text || !key) return text;

    // Generate key stream from Fibonacci + key
    const keyStream = [];
    let a = 1, b = 1;
    for (let i = 0; i < text.length; i++) {
        [a, b] = [b, a + b];
        keyStream.push((b + key.charCodeAt(i % key.length)) & 0xFF);
    }

    // XOR encrypt
    const encrypted = [];
    for (let i = 0; i < text.length; i++) {
        encrypted.push(text.charCodeAt(i) ^ keyStream[i]);
    }

    // Convert to base64
    return btoa(String.fromCharCode(...encrypted));
}

/**
 * Decrypt data encrypted with encryptData
 * @param {string} encrypted - Encrypted text (base64)
 * @param {string} key - Encryption key
 * @returns {string} Decrypted text
 */
function decryptData(encrypted, key) {
    if (!encrypted || !key) return encrypted;

    try {
        // Decode base64
        const decoded = atob(encrypted);

        // Generate same key stream
        const keyStream = [];
        let a = 1, b = 1;
        for (let i = 0; i < decoded.length; i++) {
            [a, b] = [b, a + b];
            keyStream.push((b + key.charCodeAt(i % key.length)) & 0xFF);
        }

        // XOR decrypt
        const decrypted = [];
        for (let i = 0; i < decoded.length; i++) {
            decrypted.push(decoded.charCodeAt(i) ^ keyStream[i]);
        }

        return String.fromCharCode(...decrypted);
    } catch {
        return null;
    }
}

// Hash algorithm version - increment when changing generateDeviceFingerprint or generateRPGHash
const HASH_VERSION = 2; // v2: removed unstable performance.timeOrigin from fingerprint
const HASH_VERSION_KEY = 'pumparena_hash_version';

function verifyRPGIntegrity(data) {
    try {
        const storedHash = localStorage.getItem(PUMPARENA_INTEGRITY_KEY);
        const hasSaveData = localStorage.getItem(PUMPARENA_STORAGE_KEY);
        const storedHashVersion = parseInt(localStorage.getItem(HASH_VERSION_KEY) || '1', 10);

        // SECURITY: If there's save data but no integrity hash, that's suspicious
        // This could indicate tampering (deleting the hash to bypass checks)
        if (!storedHash) {
            // Only return true if this is genuinely a new game (no save data exists)
            if (hasSaveData) {
                console.warn('[Security] Save data exists but integrity hash is missing - possible tampering');
                return false;
            }
            return true; // New game, no data yet
        }

        const currentHash = generateRPGHash(data);

        // If hash matches, we're good
        if (storedHash === currentHash) {
            return true;
        }

        // Hash mismatch - check if it's due to algorithm version change
        if (storedHashVersion < HASH_VERSION) {
            console.log('[PumpArena] Hash algorithm updated, migrating to v' + HASH_VERSION);
            // One-time migration: regenerate hash with new algorithm
            // This is safe because we're upgrading our own algorithm, not accepting tampered data
            localStorage.setItem(PUMPARENA_INTEGRITY_KEY, currentHash);
            localStorage.setItem(HASH_VERSION_KEY, String(HASH_VERSION));
            return true;
        }

        // Hash mismatch with current algorithm version = tampering
        console.warn('[Security] Hash mismatch detected - possible tampering');
        return false;
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
    // SECURITY: Use whitelist approach for character names (letters, numbers, spaces, underscores, hyphens)
    // This is more secure than blacklisting XSS characters as it prevents unicode encoding attacks
    if (data.character.name && !/^[a-zA-Z0-9_\- À-ÿ]+$/.test(data.character.name)) return false;

    // Progression validation
    if (!data.progression || typeof data.progression !== 'object') return false;
    if (typeof data.progression.level !== 'number' || data.progression.level < 1) return false;
    if (typeof data.progression.xp !== 'number' || data.progression.xp < 0) return false;
    // Level cap validation (prevent absurd values)
    if (data.progression.level > 999) return false;
    if (data.progression.xp > Number.MAX_SAFE_INTEGER) return false;

    // Stats validation
    if (!data.stats || typeof data.stats !== 'object') return false;
    const statKeys = ['dev', 'com', 'mkt', 'str', 'cha', 'lck'];
    for (const key of statKeys) {
        if (typeof data.stats[key] !== 'number' || data.stats[key] < 0 || data.stats[key] > 999) {
            return false;
        }
        // Ensure integer (prevent floating point exploits)
        if (!Number.isInteger(data.stats[key])) return false;
    }

    // Resources validation
    if (!data.resources || typeof data.resources !== 'object') return false;
    if (typeof data.resources.influence !== 'number' || data.resources.influence < 0) return false;
    if (typeof data.resources.reputation !== 'number') return false;
    if (typeof data.resources.tokens !== 'number' || data.resources.tokens < 0) return false;
    // Validate burnedTotal (ASDF field)
    if (data.resources.burnedTotal !== undefined) {
        if (typeof data.resources.burnedTotal !== 'number' || data.resources.burnedTotal < 0) return false;
        if (data.resources.burnedTotal > Number.MAX_SAFE_INTEGER) return false;
    }
    // Ensure resource values are within safe bounds
    if (data.resources.tokens > Number.MAX_SAFE_INTEGER) return false;
    if (data.resources.influence > 99999) return false;  // Max influence cap
    if (Math.abs(data.resources.reputation) > Number.MAX_SAFE_INTEGER) return false;

    // ASDF Tier validation (Security by Design)
    if (data.asdfTier) {
        if (typeof data.asdfTier !== 'object') return false;
        // Validate tier name
        if (data.asdfTier.current && !TIER_NAMES.includes(data.asdfTier.current)) return false;
        // Validate tier index
        if (typeof data.asdfTier.index !== 'number' || data.asdfTier.index < 0 || data.asdfTier.index > 4) return false;
        if (!Number.isInteger(data.asdfTier.index)) return false;
        // Validate totalBurned
        if (data.asdfTier.totalBurned !== undefined) {
            if (typeof data.asdfTier.totalBurned !== 'number' || data.asdfTier.totalBurned < 0) return false;
            if (data.asdfTier.totalBurned > Number.MAX_SAFE_INTEGER) return false;
        }
    }

    // Relationships validation (prevent prototype pollution)
    if (data.relationships) {
        if (typeof data.relationships !== 'object') return false;
        // Check for dangerous keys
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        for (const key of Object.keys(data.relationships)) {
            if (dangerousKeys.includes(key)) return false;
            // Validate NPC ID format
            if (typeof key !== 'string' || key.length > 50) return false;
        }
    }

    // Inventory validation
    if (data.inventory) {
        if (typeof data.inventory !== 'object') return false;
        const inventoryLimits = { tools: 100, consumables: 999, collectibles: 500 };
        for (const [slot, limit] of Object.entries(inventoryLimits)) {
            if (data.inventory[slot] && !Array.isArray(data.inventory[slot])) return false;
            if (data.inventory[slot] && data.inventory[slot].length > limit) return false;

            // SECURITY: Validate individual inventory items
            if (data.inventory[slot] && Array.isArray(data.inventory[slot])) {
                for (const item of data.inventory[slot]) {
                    // Each item must be an object with valid id
                    if (typeof item !== 'object' || item === null) return false;
                    if (typeof item.id !== 'string' || item.id.length > 50) return false;
                    // Prevent prototype pollution in item properties
                    if (DANGEROUS_PROPERTY_KEYS.some(key => key in item)) return false;
                    // Validate quantity if present
                    if ('quantity' in item && (typeof item.quantity !== 'number' || item.quantity < 0 || item.quantity > 9999)) return false;
                }
            }
        }
    }

    // Session validation (prevent time manipulation)
    if (data.session) {
        if (data.session.startTime && typeof data.session.startTime !== 'number') return false;
        if (data.session.lastSave && typeof data.session.lastSave !== 'number') return false;

        const now = Date.now();
        const futureBuffer = 60000; // 1 minute buffer for clock drift
        const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year maximum age

        // Prevent future timestamps
        if (data.session.startTime && data.session.startTime > now + futureBuffer) return false;
        if (data.session.lastSave && data.session.lastSave > now + futureBuffer) return false;

        // SECURITY: Prevent unreasonably old timestamps (could be used to exploit time-based mechanics)
        if (data.session.startTime && data.session.startTime < now - maxAge) return false;
        if (data.session.lastSave && data.session.lastSave < now - maxAge) return false;
    }

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
        localStorage.setItem(HASH_VERSION_KEY, String(HASH_VERSION));

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

        let parsed = JSON.parse(saved);

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

        // Migration handling for version differences or invalid stats
        const needsMigration = parsed.version !== PUMPARENA_VERSION ||
            (parsed.stats && Object.values(parsed.stats).some(v => typeof v !== 'number' || v < 5));

        if (needsMigration) {
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
    console.log('[PumpArena] Migrating state from version', oldState.version, 'to', PUMPARENA_VERSION);

    // Migration: Ensure minimum stats of 5 (base starting value)
    // This fixes old save data that may have had stats initialized at 0
    if (oldState.stats) {
        const minStat = 5; // Base stat value (fib[5] = 5)
        const statsToCheck = ['dev', 'com', 'mkt', 'str', 'cha', 'lck'];
        statsToCheck.forEach(stat => {
            if (typeof oldState.stats[stat] !== 'number' || oldState.stats[stat] < minStat) {
                oldState.stats[stat] = minStat;
                console.log(`[PumpArena] Migrated ${stat} stat to minimum ${minStat}`);
            }
        });
    }

    // Migration: Ensure progression has stat/skill points fields
    if (oldState.progression) {
        if (typeof oldState.progression.statPoints !== 'number') {
            oldState.progression.statPoints = 0;
        }
        if (typeof oldState.progression.skillPoints !== 'number') {
            oldState.progression.skillPoints = 0;
        }
    }

    // Update version
    oldState.version = PUMPARENA_VERSION;
    return oldState;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// SECURITY: Keys that could cause prototype pollution
const DANGEROUS_PROTOTYPE_KEYS = ['__proto__', 'constructor', 'prototype'];

function deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
        // SECURITY: Prevent prototype pollution attacks
        if (DANGEROUS_PROTOTYPE_KEYS.includes(key) || !Object.hasOwn(source, key)) {
            console.warn(`[Security] Blocked potentially dangerous key in deepMerge: ${key}`);
            continue;
        }
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
    // Use slice instead of deprecated substr
    return 'char_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
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

        // Give 3 stat points per level (ASDF Philosophy: fib[4] = 3)
        rpgState.progression.statPoints += 3;

        // Bonus stat points at milestone levels (5, 10, 15, 20, ...)
        if (rpgState.progression.level % 5 === 0) {
            rpgState.progression.statPoints += 2; // Extra bonus at milestones
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

// ============================================
// STAT POINT ALLOCATION
// ============================================

/**
 * Get available stat points
 * @returns {number} Available stat points
 */
function getStatPoints() {
    return rpgState.progression.statPoints || 0;
}

/**
 * Get available skill points (based on progression.skillPoints)
 * @returns {number} Available skill points
 */
function getSkillPoints() {
    return rpgState.progression.skillPoints || 0;
}

/**
 * Allocate a stat point to a specific stat
 * @param {string} statName - Stat to increase (dev, com, mkt, str, cha, lck)
 * @returns {Object} Result with success status
 */
function allocateStatPoint(statName) {
    // Valid stat names
    const validStats = ['dev', 'com', 'mkt', 'str', 'cha', 'lck'];

    if (!validStats.includes(statName)) {
        return { success: false, message: 'Invalid stat name' };
    }

    if (rpgState.progression.statPoints <= 0) {
        return { success: false, message: 'No stat points available' };
    }

    // Fibonacci-based max stat: fib[12] = 144
    const maxStat = 144;
    if (rpgState.stats[statName] >= maxStat) {
        return { success: false, message: `${statName.toUpperCase()} is already at maximum` };
    }

    // Allocate the point
    rpgState.progression.statPoints--;
    rpgState.stats[statName]++;

    saveRPGState();

    // Dispatch stat change event
    document.dispatchEvent(new CustomEvent('pumparena:stat-allocated', {
        detail: {
            stat: statName,
            newValue: rpgState.stats[statName],
            remainingPoints: rpgState.progression.statPoints
        }
    }));

    return {
        success: true,
        stat: statName,
        newValue: rpgState.stats[statName],
        remainingPoints: rpgState.progression.statPoints
    };
}

/**
 * Allocate multiple stat points at once
 * @param {Object} allocation - Object with stat names as keys and points as values
 * @returns {Object} Result with success status
 */
function allocateStatPoints(allocation) {
    const validStats = ['dev', 'com', 'mkt', 'str', 'cha', 'lck'];
    const maxStat = 144;

    // Calculate total points needed
    let totalNeeded = 0;
    for (const [stat, points] of Object.entries(allocation)) {
        if (!validStats.includes(stat)) {
            return { success: false, message: `Invalid stat: ${stat}` };
        }
        if (typeof points !== 'number' || points < 0 || !Number.isInteger(points)) {
            return { success: false, message: 'Points must be positive integers' };
        }
        if (rpgState.stats[stat] + points > maxStat) {
            return { success: false, message: `${stat.toUpperCase()} would exceed maximum` };
        }
        totalNeeded += points;
    }

    if (totalNeeded > rpgState.progression.statPoints) {
        return { success: false, message: `Need ${totalNeeded} points, have ${rpgState.progression.statPoints}` };
    }

    // Apply allocations
    for (const [stat, points] of Object.entries(allocation)) {
        rpgState.stats[stat] += points;
    }
    rpgState.progression.statPoints -= totalNeeded;

    saveRPGState();

    return {
        success: true,
        allocated: allocation,
        remainingPoints: rpgState.progression.statPoints
    };
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
 * Validate burn amount (DRY helper - Security by Design)
 * Performs rate limiting, type validation, and bounds checking
 * @param {*} amount - Amount to validate
 * @returns {Object} { valid: boolean, amount?: number, error?: Object }
 */
function validateBurnAmount(amount) {
    // Rate limiting check
    const rateCheck = ActionRateLimiter.checkAction('burn');
    if (!rateCheck.allowed) {
        return { valid: false, error: { success: false, message: rateCheck.message, rateLimited: true } };
    }

    // Type validation
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        return { valid: false, error: { success: false, message: 'Invalid amount type' } };
    }

    // Ensure integer and positive
    const validatedAmount = Math.floor(amount);
    if (validatedAmount <= 0) {
        return { valid: false, error: { success: false, message: 'Amount must be positive' } };
    }

    // Cap to prevent integer overflow
    if (validatedAmount > MAX_BURN_AMOUNT) {
        return { valid: false, error: { success: false, message: 'Amount exceeds maximum' } };
    }

    // Check sufficient tokens
    if (rpgState.resources.tokens < validatedAmount) {
        return { valid: false, error: { success: false, message: 'Insufficient tokens' } };
    }

    return { valid: true, amount: validatedAmount };
}

/**
 * Burn tokens for XP (ASDF Philosophy)
 * 1 token burned = 1 XP (identity ratio)
 * Burns contribute to collective pool
 * @param {number} amount - Amount of tokens to burn (must be positive integer)
 * @returns {Object} Result object with success status
 */
function burnTokensForXP(amount) {
    // Validate burn amount (DRY helper)
    const validation = validateBurnAmount(amount);
    if (!validation.valid) {
        return validation.error;
    }
    amount = validation.amount;

    // Deduct tokens
    rpgState.resources.tokens -= amount;

    // Track burn
    rpgState.resources.burnedTotal += amount;
    rpgState.asdfTier.totalBurned += amount;

    // Convert to XP (1:1 ratio per ASDF philosophy)
    const xpGained = amount;
    addXP(xpGained);

    // Record successful action for rate limiting
    ActionRateLimiter.recordAction('burn');

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
    // Validate burn amount (DRY helper)
    const validation = validateBurnAmount(amount);
    if (!validation.valid) {
        return validation.error;
    }
    amount = validation.amount;

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

    // Record successful action for rate limiting
    ActionRateLimiter.recordAction('burn');

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
    // SECURITY: Validate npcId to prevent prototype pollution
    if (typeof npcId !== 'string' || DANGEROUS_PROPERTY_KEYS.includes(npcId)) {
        console.warn('[Security] Invalid NPC ID:', npcId);
        return { affinity: 0, stage: 'stranger', history: [] };
    }

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

// ============================================
// PRESTIGE SYSTEM (NEW GAME+ ASDF Philosophy)
// Fibonacci-based bonuses for each prestige level
// ============================================

/**
 * Prestige Level Requirements (Fibonacci-based)
 * Each prestige requires reaching max level + completing specific challenges
 */
const PRESTIGE_REQUIREMENTS = {
    minLevel: 55,              // fib[10] = 55 (max level cap)
    minTier: 'BLAZE',          // Must reach BLAZE tier
    minQuestsCompleted: 21,    // fib[8] = 21 quests
    minBurned: 987             // fib[16] = 987 tokens burned
};

/**
 * Prestige bonuses per level (ASDF Philosophy: Fibonacci multipliers)
 * Each prestige gives permanent bonuses that persist through New Game+
 */
const PRESTIGE_BONUSES = {
    // Per prestige level bonuses
    xpMultiplierBonus: 0.05,       // +5% XP per prestige (fib[5]/100)
    statBonus: 1,                  // +1 to all base stats per prestige
    influenceBonus: 5,             // +5 max influence per prestige (fib[5])
    burnEfficiencyBonus: 0.02,     // +2% burn efficiency per prestige
    shopDiscountBonus: 0.01        // +1% shop discount per prestige
};

/**
 * Get prestige level
 */
function getPrestigeLevel() {
    return rpgState.progression.prestigeLevel || 0;
}

/**
 * Check if player can prestige
 */
function canPrestige() {
    const state = rpgState;

    // Check level
    if (state.progression.level < PRESTIGE_REQUIREMENTS.minLevel) {
        return {
            canPrestige: false,
            reason: `Requires Level ${PRESTIGE_REQUIREMENTS.minLevel}`,
            progress: state.progression.level / PRESTIGE_REQUIREMENTS.minLevel
        };
    }

    // Check tier
    const tierIndex = TIER_NAMES.indexOf(state.asdfTier.current);
    const requiredTierIndex = TIER_NAMES.indexOf(PRESTIGE_REQUIREMENTS.minTier);
    if (tierIndex < requiredTierIndex) {
        return {
            canPrestige: false,
            reason: `Requires ${PRESTIGE_REQUIREMENTS.minTier} Tier`,
            progress: tierIndex / requiredTierIndex
        };
    }

    // Check quests completed
    if (state.statistics.questsCompleted < PRESTIGE_REQUIREMENTS.minQuestsCompleted) {
        return {
            canPrestige: false,
            reason: `Requires ${PRESTIGE_REQUIREMENTS.minQuestsCompleted} quests completed`,
            progress: state.statistics.questsCompleted / PRESTIGE_REQUIREMENTS.minQuestsCompleted
        };
    }

    // Check burn total
    if (state.resources.burnedTotal < PRESTIGE_REQUIREMENTS.minBurned) {
        return {
            canPrestige: false,
            reason: `Requires ${PRESTIGE_REQUIREMENTS.minBurned} tokens burned`,
            progress: state.resources.burnedTotal / PRESTIGE_REQUIREMENTS.minBurned
        };
    }

    return { canPrestige: true, reason: 'Ready to Prestige!' };
}

/**
 * Get all prestige bonuses for current prestige level
 */
function getPrestigeBonuses() {
    const level = getPrestigeLevel();
    return {
        xpMultiplier: 1 + (level * PRESTIGE_BONUSES.xpMultiplierBonus),
        allStatsBonus: level * PRESTIGE_BONUSES.statBonus,
        maxInfluenceBonus: level * PRESTIGE_BONUSES.influenceBonus,
        burnEfficiency: level * PRESTIGE_BONUSES.burnEfficiencyBonus,
        shopDiscount: level * PRESTIGE_BONUSES.shopDiscountBonus,
        prestigeLevel: level
    };
}

/**
 * Perform prestige (New Game+)
 * Resets most progress but keeps prestige bonuses and some achievements
 */
function performPrestige() {
    const check = canPrestige();
    if (!check.canPrestige) {
        return { success: false, message: check.reason };
    }

    // Store prestige data to keep
    const newPrestigeLevel = (rpgState.progression.prestigeLevel || 0) + 1;
    const keepAchievements = rpgState.achievements.unlocked.slice();
    const keepTitle = rpgState.achievements.currentTitle;
    const keepTotalBurned = rpgState.resources.burnedTotal;
    const keepStatistics = {
        totalPlaytime: rpgState.statistics.totalPlaytime,
        sessionsPlayed: rpgState.statistics.sessionsPlayed,
        bestStreak: Math.max(rpgState.statistics.bestStreak, rpgState.daily.loginStreak)
    };

    // Reset state to defaults
    rpgState = JSON.parse(JSON.stringify(DEFAULT_RPG_STATE));

    // Apply prestige data
    rpgState.progression.prestigeLevel = newPrestigeLevel;
    rpgState.achievements.unlocked = keepAchievements;
    rpgState.achievements.currentTitle = keepTitle;
    rpgState.resources.burnedTotal = keepTotalBurned;
    rpgState.statistics.totalPlaytime = keepStatistics.totalPlaytime;
    rpgState.statistics.sessionsPlayed = keepStatistics.sessionsPlayed;
    rpgState.statistics.bestStreak = keepStatistics.bestStreak;

    // Apply prestige bonuses
    const bonuses = getPrestigeBonuses();

    // Add stat bonuses
    for (const stat of Object.keys(rpgState.stats)) {
        rpgState.stats[stat] += bonuses.allStatsBonus;
    }

    // Add max influence bonus
    rpgState.resources.maxInfluence += bonuses.maxInfluenceBonus;
    rpgState.resources.influence = rpgState.resources.maxInfluence;

    // Set XP multiplier (character will be re-created, but base is set)
    rpgState.character.xpMultiplier = bonuses.xpMultiplier;

    // Save state
    saveRPGState();

    // Dispatch prestige event
    document.dispatchEvent(new CustomEvent('pumparena:prestige', {
        detail: {
            prestigeLevel: newPrestigeLevel,
            bonuses: bonuses
        }
    }));

    return {
        success: true,
        prestigeLevel: newPrestigeLevel,
        message: `Prestige ${newPrestigeLevel}! You keep your wisdom and start anew.`,
        bonuses: bonuses
    };
}

/**
 * Show prestige requirements and progress
 */
function getPrestigeProgress() {
    const state = rpgState;

    return {
        level: {
            current: state.progression.level,
            required: PRESTIGE_REQUIREMENTS.minLevel,
            met: state.progression.level >= PRESTIGE_REQUIREMENTS.minLevel
        },
        tier: {
            current: state.asdfTier.current,
            required: PRESTIGE_REQUIREMENTS.minTier,
            met: TIER_NAMES.indexOf(state.asdfTier.current) >= TIER_NAMES.indexOf(PRESTIGE_REQUIREMENTS.minTier)
        },
        quests: {
            current: state.statistics.questsCompleted,
            required: PRESTIGE_REQUIREMENTS.minQuestsCompleted,
            met: state.statistics.questsCompleted >= PRESTIGE_REQUIREMENTS.minQuestsCompleted
        },
        burned: {
            current: state.resources.burnedTotal,
            required: PRESTIGE_REQUIREMENTS.minBurned,
            met: state.resources.burnedTotal >= PRESTIGE_REQUIREMENTS.minBurned
        },
        prestigeLevel: getPrestigeLevel(),
        currentBonuses: getPrestigeBonuses()
    };
}

// ============================================
// FACTION STATE ACCESSORS
// ============================================

function getFactionState() {
    return rpgState.faction;
}

function getCurrentFaction() {
    return rpgState.faction.current;
}

function setCurrentFaction(factionId) {
    rpgState.faction.current = factionId;
    rpgState.faction.joinedAt = Date.now();
    saveRPGState();
}

function getFactionStanding(factionId) {
    return rpgState.faction.standing[factionId] || 0;
}

function modifyFactionStanding(factionId, amount) {
    if (!rpgState.faction.standing[factionId]) {
        rpgState.faction.standing[factionId] = 0;
    }
    rpgState.faction.standing[factionId] = Math.max(-100,
        Math.min(100, rpgState.faction.standing[factionId] + amount));
    saveRPGState();
    return rpgState.faction.standing[factionId];
}

function recordStoryGateDecline(gateId) {
    if (!rpgState.faction.storyGatesDeclined[gateId]) {
        rpgState.faction.storyGatesDeclined[gateId] = 0;
    }
    rpgState.faction.storyGatesDeclined[gateId]++;
    // Set 24-hour cooldown
    rpgState.faction.storyGatesCooldowns[gateId] = Date.now() + 86400000;
    saveRPGState();
}

function getStoryGateDeclineCount(gateId) {
    return rpgState.faction.storyGatesDeclined[gateId] || 0;
}

function isStoryGateOnCooldown(gateId) {
    const cooldown = rpgState.faction.storyGatesCooldowns[gateId];
    return cooldown && cooldown > Date.now();
}

// ============================================
// SUMMONS STATE ACCESSORS
// ============================================

function getSummonsState() {
    return rpgState.summons;
}

function getActiveParty() {
    return rpgState.summons.activeParty;
}

function unlockCreature(creatureId) {
    if (!rpgState.summons.unlockedCreatures.includes(creatureId)) {
        rpgState.summons.unlockedCreatures.push(creatureId);
        rpgState.summons.creatureLevels[creatureId] = 1;
        rpgState.summons.creatureExp[creatureId] = 0;
        rpgState.summons.creatureAffinity[creatureId] = 0;
        saveRPGState();
        return true;
    }
    return false;
}

function unlockAlly(allyId) {
    if (!rpgState.summons.unlockedAllies.includes(allyId)) {
        rpgState.summons.unlockedAllies.push(allyId);
        saveRPGState();
        return true;
    }
    return false;
}

function setActiveCreatures(creatureIds) {
    // Max 3 creatures
    rpgState.summons.activeParty.creatures = creatureIds.slice(0, 3);
    saveRPGState();
}

function setActiveAllies(allyIds) {
    // Max 3 allies
    rpgState.summons.activeParty.allies = allyIds.slice(0, 3);
    saveRPGState();
}

function addCreatureExp(creatureId, amount) {
    if (!rpgState.summons.creatureExp[creatureId]) {
        rpgState.summons.creatureExp[creatureId] = 0;
    }
    rpgState.summons.creatureExp[creatureId] += amount;

    // Level up check (Fibonacci XP thresholds)
    const currentLevel = rpgState.summons.creatureLevels[creatureId] || 1;
    const xpNeeded = getFib(currentLevel + 6) * 10; // fib[7]*10=130, fib[8]*10=210, etc.

    if (rpgState.summons.creatureExp[creatureId] >= xpNeeded && currentLevel < 10) {
        rpgState.summons.creatureLevels[creatureId] = currentLevel + 1;
        rpgState.summons.creatureExp[creatureId] -= xpNeeded;
        saveRPGState();
        return { leveledUp: true, newLevel: currentLevel + 1 };
    }

    saveRPGState();
    return { leveledUp: false };
}

// ============================================
// DECKBUILDING STATE ACCESSORS
// ============================================

function getDeckState() {
    return rpgState.deckbuilding;
}

function getActiveDeck() {
    return rpgState.deckbuilding.activeDeck;
}

function addCardToCollection(cardId, count = 1) {
    if (!rpgState.deckbuilding.cardCopies[cardId]) {
        rpgState.deckbuilding.cardCopies[cardId] = 0;
    }
    rpgState.deckbuilding.cardCopies[cardId] += count;

    if (!rpgState.deckbuilding.collection.includes(cardId)) {
        rpgState.deckbuilding.collection.push(cardId);
    }
    saveRPGState();
}

function setActiveDeck(cardIds) {
    // Validate deck size (20-30 cards)
    if (cardIds.length < 20 || cardIds.length > 30) {
        return { success: false, error: 'Deck must have 20-30 cards' };
    }
    rpgState.deckbuilding.activeDeck = cardIds;
    saveRPGState();
    return { success: true };
}

function saveDeckPreset(name, cardIds) {
    rpgState.deckbuilding.deckPresets[name] = cardIds;
    saveRPGState();
}

function loadDeckPreset(name) {
    return rpgState.deckbuilding.deckPresets[name] || null;
}

// ============================================
// STORY FLAGS ACCESSORS
// ============================================

function getStoryFlags() {
    return rpgState.storyFlags;
}

function setMajorChoice(choiceId, selectedOption) {
    rpgState.storyFlags.majorChoices[choiceId] = selectedOption;
    rpgState.statistics.decisionsCount++;
    saveRPGState();
}

function getMajorChoice(choiceId) {
    return rpgState.storyFlags.majorChoices[choiceId] || null;
}

function discoverSecret(secretId) {
    if (!rpgState.storyFlags.secretsDiscovered.includes(secretId)) {
        rpgState.storyFlags.secretsDiscovered.push(secretId);
        saveRPGState();
        return true;
    }
    return false;
}

function hasDiscoveredSecret(secretId) {
    return rpgState.storyFlags.secretsDiscovered.includes(secretId);
}

function recordEnding(endingId) {
    if (!rpgState.storyFlags.endings.includes(endingId)) {
        rpgState.storyFlags.endings.push(endingId);
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

        // Stat/Skill Points
        getStatPoints,
        getSkillPoints,
        allocateStatPoint,
        allocateStatPoints,

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

        // Prestige System (New Game+)
        getPrestigeLevel,
        getPrestigeBonuses,
        getPrestigeProgress,
        canPrestige,
        performPrestige,

        // Rate Limiting (Security by Design)
        RateLimiter: ActionRateLimiter,

        // Constants
        VERSION: PUMPARENA_VERSION,
        ASDF_TIERS,
        TIER_NAMES,
        REPUTATION_RANKS,
        RELATIONSHIP_THRESHOLDS,
        PRESTIGE_REQUIREMENTS,
        PRESTIGE_BONUSES,

        // Faction System
        getFactionState,
        getCurrentFaction,
        setCurrentFaction,
        getFactionStanding,
        modifyFactionStanding,
        recordStoryGateDecline,
        getStoryGateDeclineCount,
        isStoryGateOnCooldown,

        // Summons System
        getSummonsState,
        getActiveParty,
        unlockCreature,
        unlockAlly,
        setActiveCreatures,
        setActiveAllies,
        addCreatureExp,

        // Deckbuilding System
        getDeckState,
        getActiveDeck,
        addCardToCollection,
        setActiveDeck,
        saveDeckPreset,
        loadDeckPreset,

        // Story Flags
        getStoryFlags,
        setMajorChoice,
        getMajorChoice,
        discoverSecret,
        hasDiscoveredSecret,
        recordEnding
    };
}
