/**
 * ASDF Engage - XP & Tier Progression System
 *
 * PHILOSOPHY: BURN = XP = PROGRESSION
 * - All XP comes from burning (directly or indirectly)
 * - 1 token burned = 1 XP (identity ratio)
 * - Higher tiers = better benefits
 * - Flywheel: burn -> xp -> tier -> benefits -> more burn
 *
 * SOURCES OF XP:
 * 1. Direct burn: 1:1 ratio
 * 2. Shop purchase: 100% goes to burn, user gets XP
 * 3. Game score: score * tier multiplier
 * 4. Learn completion: fib[level+3] * 100
 */

'use strict';

// Storage keys
const ENGAGE_STORAGE_KEY = 'asdf_engage_v1';
const ENGAGE_INTEGRITY_KEY = 'asdf_engage_integrity';

// Engage state
const EngageState = {
    totalXp: 0,
    totalBurned: 0,           // Tokens this user has burned
    xpFromBurns: 0,           // XP from direct burns
    xpFromShop: 0,            // XP from shop purchases
    xpFromGames: 0,           // XP from game scores
    xpFromLearn: 0,           // XP from completing lessons
    burnHistory: [],          // Recent burn records
    tierHistory: [],          // Tier progression history
    lastUpdate: null
};

// ============================================
// INTEGRITY CHECKING
// ============================================

/**
 * Generate hash for integrity checking
 */
function generateEngageHash(data) {
    const str = JSON.stringify({
        totalXp: data.totalXp,
        totalBurned: data.totalBurned
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const fp = navigator.userAgent.length + screen.width;
    return ((hash ^ fp) >>> 0).toString(36);
}

/**
 * Verify engage state integrity
 */
function verifyEngageIntegrity(data) {
    try {
        const storedHash = localStorage.getItem(ENGAGE_INTEGRITY_KEY);
        if (!storedHash) return true;
        return storedHash === generateEngageHash(data);
    } catch {
        return false;
    }
}

/**
 * Validate engage state schema
 */
function validateEngageSchema(data) {
    if (typeof data !== 'object' || data === null) return false;
    if (typeof data.totalXp !== 'number' || !Number.isFinite(data.totalXp) || data.totalXp < 0) return false;
    if (typeof data.totalBurned !== 'number' || !Number.isFinite(data.totalBurned) || data.totalBurned < 0) return false;
    if (typeof data.xpFromBurns !== 'number' || !Number.isFinite(data.xpFromBurns)) return false;
    if (typeof data.xpFromShop !== 'number' || !Number.isFinite(data.xpFromShop)) return false;
    if (typeof data.xpFromGames !== 'number' || !Number.isFinite(data.xpFromGames)) return false;
    if (typeof data.xpFromLearn !== 'number' || !Number.isFinite(data.xpFromLearn)) return false;
    if (!Array.isArray(data.burnHistory)) return false;
    if (!Array.isArray(data.tierHistory)) return false;
    return true;
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Load engage state from storage
 */
function loadEngageState() {
    try {
        const saved = localStorage.getItem(ENGAGE_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (validateEngageSchema(parsed)) {
                if (!verifyEngageIntegrity(parsed)) {
                    console.warn('Engage integrity check failed, resetting');
                    resetEngageState();
                    return;
                }
                Object.assign(EngageState, parsed);
            } else {
                console.warn('Invalid engage schema, using defaults');
                resetEngageState();
            }
        }
    } catch (e) {
        console.warn('Failed to load engage state:', e);
        resetEngageState();
    }
}

/**
 * Save engage state to storage
 */
function saveEngageState() {
    try {
        EngageState.lastUpdate = Date.now();
        localStorage.setItem(ENGAGE_STORAGE_KEY, JSON.stringify(EngageState));
        localStorage.setItem(ENGAGE_INTEGRITY_KEY, generateEngageHash(EngageState));
    } catch (e) {
        console.warn('Failed to save engage state:', e);
    }
}

/**
 * Reset engage state
 */
function resetEngageState() {
    EngageState.totalXp = 0;
    EngageState.totalBurned = 0;
    EngageState.xpFromBurns = 0;
    EngageState.xpFromShop = 0;
    EngageState.xpFromGames = 0;
    EngageState.xpFromLearn = 0;
    EngageState.burnHistory = [];
    EngageState.tierHistory = [];
    EngageState.lastUpdate = null;
    localStorage.removeItem(ENGAGE_STORAGE_KEY);
    localStorage.removeItem(ENGAGE_INTEGRITY_KEY);
}

// ============================================
// XP OPERATIONS
// ============================================

/**
 * Add XP from burning tokens
 * @param {number} tokensBurned - Amount of tokens burned
 * @param {string} source - Source of burn ('direct', 'shop', 'game')
 * @returns {Object} XP gain info
 */
function addXpFromBurn(tokensBurned, source = 'direct') {
    if (!Number.isFinite(tokensBurned) || tokensBurned <= 0) {
        return { success: false, error: 'Invalid burn amount' };
    }

    const xpGained = ASDF.xp.fromBurn(tokensBurned);
    const previousTier = ASDF.engage.getTier(EngageState.totalXp);

    // Update totals
    EngageState.totalXp += xpGained;
    EngageState.totalBurned += tokensBurned;

    // Track by source
    switch (source) {
        case 'shop':
            EngageState.xpFromShop += xpGained;
            break;
        case 'game':
            EngageState.xpFromGames += xpGained;
            break;
        case 'learn':
            EngageState.xpFromLearn += xpGained;
            break;
        default:
            EngageState.xpFromBurns += xpGained;
    }

    // Record burn history (keep last 50)
    EngageState.burnHistory.unshift({
        amount: tokensBurned,
        xp: xpGained,
        source: source,
        timestamp: Date.now()
    });
    if (EngageState.burnHistory.length > 50) {
        EngageState.burnHistory.pop();
    }

    const newTier = ASDF.engage.getTier(EngageState.totalXp);

    // Check for tier up
    if (newTier.index > previousTier.index) {
        EngageState.tierHistory.unshift({
            from: previousTier.name,
            to: newTier.name,
            xp: EngageState.totalXp,
            timestamp: Date.now()
        });
        if (EngageState.tierHistory.length > 10) {
            EngageState.tierHistory.pop();
        }
    }

    saveEngageState();

    return {
        success: true,
        xpGained: xpGained,
        totalXp: EngageState.totalXp,
        tier: newTier,
        tieredUp: newTier.index > previousTier.index,
        previousTier: previousTier.name,
        newTier: newTier.name
    };
}

/**
 * Add XP from game score (no burn, just XP)
 * @param {number} score - Game score
 * @returns {Object} XP gain info
 */
function addXpFromGame(score) {
    if (!Number.isFinite(score) || score <= 0) {
        return { success: false, error: 'Invalid score' };
    }

    const currentTier = ASDF.engage.getTier(EngageState.totalXp);
    const xpGained = ASDF.play.scoreToXp(score, currentTier.index);

    const previousTier = currentTier;
    EngageState.totalXp += xpGained;
    EngageState.xpFromGames += xpGained;

    const newTier = ASDF.engage.getTier(EngageState.totalXp);

    if (newTier.index > previousTier.index) {
        EngageState.tierHistory.unshift({
            from: previousTier.name,
            to: newTier.name,
            xp: EngageState.totalXp,
            timestamp: Date.now()
        });
    }

    saveEngageState();

    return {
        success: true,
        xpGained: xpGained,
        totalXp: EngageState.totalXp,
        tier: newTier,
        tieredUp: newTier.index > previousTier.index
    };
}

/**
 * Add XP from completing a learn level
 * @param {number} level - Level completed (1-5)
 * @returns {Object} XP gain info
 */
function addXpFromLearn(level) {
    if (!Number.isInteger(level) || level < 1 || level > ASDF.learn.numLevels) {
        return { success: false, error: 'Invalid level' };
    }

    const xpGained = ASDF.learn.getXpReward(level);
    const previousTier = ASDF.engage.getTier(EngageState.totalXp);

    EngageState.totalXp += xpGained;
    EngageState.xpFromLearn += xpGained;

    const newTier = ASDF.engage.getTier(EngageState.totalXp);

    if (newTier.index > previousTier.index) {
        EngageState.tierHistory.unshift({
            from: previousTier.name,
            to: newTier.name,
            xp: EngageState.totalXp,
            timestamp: Date.now()
        });
    }

    saveEngageState();

    return {
        success: true,
        xpGained: xpGained,
        totalXp: EngageState.totalXp,
        tier: newTier,
        tieredUp: newTier.index > previousTier.index
    };
}

// ============================================
// GETTERS
// ============================================

/**
 * Get current engage state
 * @returns {Object} Current state
 */
function getEngageState() {
    const tier = ASDF.engage.getTier(EngageState.totalXp);
    return {
        ...EngageState,
        tier: tier,
        discount: ASDF.engage.getDiscount(tier.index),
        rewardBoost: ASDF.engage.getRewardBoost(tier.index),
        exclusiveTiers: ASDF.engage.getExclusiveTiers(tier.index)
    };
}

/**
 * Get current tier info
 * @returns {Object} Tier info
 */
function getCurrentTier() {
    return ASDF.engage.getTier(EngageState.totalXp);
}

/**
 * Get XP breakdown by source
 * @returns {Object} XP breakdown
 */
function getXpBreakdown() {
    return {
        total: EngageState.totalXp,
        burns: EngageState.xpFromBurns,
        shop: EngageState.xpFromShop,
        games: EngageState.xpFromGames,
        learn: EngageState.xpFromLearn
    };
}

/**
 * Get recent burn history
 * @param {number} limit - Max records to return
 * @returns {Array} Burn records
 */
function getBurnHistory(limit = 10) {
    return EngageState.burnHistory.slice(0, limit);
}

/**
 * Get tier progression history
 * @returns {Array} Tier history
 */
function getTierHistory() {
    return EngageState.tierHistory;
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get progress bar data for current tier
 * @returns {Object} Progress data
 */
function getTierProgress() {
    const tier = ASDF.engage.getTier(EngageState.totalXp);
    return {
        tier: tier.name,
        current: EngageState.totalXp,
        threshold: tier.threshold,
        next: tier.next,
        progress: tier.progress,
        progressPercent: Math.round(tier.progress * 100),
        xpToNext: tier.xpToNext,
        isMax: tier.isMax
    };
}

/**
 * Get all tier thresholds for UI display
 * @returns {Array} Tier data
 */
function getAllTierThresholds() {
    const thresholds = [];
    for (let i = 0; i < ASDF.numEngageTiers; i++) {
        thresholds.push({
            index: i,
            name: ASDF.engageTierNames[i],
            threshold: ASDF.xp.getThreshold(i),
            discount: ASDF.engage.getDiscount(i),
            rewardBoost: ASDF.engage.getRewardBoost(i),
            exclusives: ASDF.engage.getExclusiveTiers(i),
            color: ASDF.getTierColor(i, 'engage')
        });
    }
    return thresholds;
}

/**
 * Render XP notification
 * @param {number} xpGained - XP gained
 * @param {string} source - Source of XP
 */
function showXpNotification(xpGained, source = '') {
    const container = document.getElementById('xp-notifications') || createXpNotificationContainer();

    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.textContent = `+${ASDF.formatNumber(xpGained)} XP`;
    if (source) {
        const sourceSpan = document.createElement('span');
        sourceSpan.className = 'xp-source';
        sourceSpan.textContent = ` (${source})`;
        notification.appendChild(sourceSpan);
    }

    container.appendChild(notification);

    // Animate and remove
    requestAnimationFrame(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.add('fade');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    });
}

/**
 * Create XP notification container if not exists
 */
function createXpNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'xp-notifications';
    container.className = 'xp-notification-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Show tier up celebration
 * @param {string} fromTier - Previous tier name
 * @param {string} toTier - New tier name
 */
function showTierUpCelebration(fromTier, toTier) {
    const overlay = document.createElement('div');
    overlay.className = 'tier-up-overlay';

    const modal = document.createElement('div');
    modal.className = 'tier-up-modal';

    const tierIndex = ASDF.engageTierNames.indexOf(toTier);
    const color = ASDF.getTierColor(tierIndex, 'engage');

    modal.innerHTML = `
        <div class="tier-up-icon" style="color: ${color}">&#x1F525;</div>
        <div class="tier-up-title">TIER UP!</div>
        <div class="tier-up-progression">
            <span class="tier-from">${fromTier}</span>
            <span class="tier-arrow">&#x2192;</span>
            <span class="tier-to" style="color: ${color}">${toTier}</span>
        </div>
        <div class="tier-up-benefits">
            <div>Discount: ${(ASDF.engage.getDiscount(tierIndex) * 100).toFixed(0)}%</div>
            <div>Reward Boost: ${ASDF.engage.getRewardBoost(tierIndex)}x</div>
        </div>
        <button class="tier-up-close">Continue</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Show animation
    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });

    // Close handler
    const closeBtn = modal.querySelector('.tier-up-close');
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    });

    // Auto-close after 5s
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    }, 5000);
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize engage system
 */
function initEngage() {
    loadEngageState();
    console.log('[ASDF Engage] Initialized:', getCurrentTier());
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngage);
} else {
    initEngage();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EngageState,
        addXpFromBurn,
        addXpFromGame,
        addXpFromLearn,
        getEngageState,
        getCurrentTier,
        getXpBreakdown,
        getBurnHistory,
        getTierHistory,
        getTierProgress,
        getAllTierThresholds,
        showXpNotification,
        showTierUpCelebration,
        resetEngageState
    };
}
