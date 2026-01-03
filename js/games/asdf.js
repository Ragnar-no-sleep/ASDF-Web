/**
 * ASDF Core - Unified Configuration & Systems
 *
 * PHILOSOPHY: "THIS IS FINE"
 * - All values derived from Fibonacci sequence
 * - No magic numbers - everything is mathematically harmonious
 * - Burns benefit everyone
 * - Verify everything
 *
 * DERIVATION CHAIN:
 * fib[] (mathematical constant) + initialSupply (given) = ALL VALUES
 */

'use strict';

const ASDF = {
    // ============================================
    // FIBONACCI SEQUENCE (Mathematical Constant)
    // ============================================
    fib: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025],

    // ============================================
    // GIVEN CONSTANTS (Not Magic)
    // ============================================
    initialSupply: 1_000_000_000,

    // ============================================
    // STRUCTURE CONFIGURATION (User-Defined)
    // ============================================
    numEngageTiers: 5,      // EMBER, SPARK, FLAME, BLAZE, INFERNO
    numShopTiers: 10,       // common -> transcendent
    numAvatarLayers: 7,     // background, aura, skin, outfit, eyes, head, held
    numGames: 9,            // Total games in ecosystem

    // ============================================
    // ENGAGE TIER NAMES
    // ============================================
    engageTierNames: ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'],

    // ============================================
    // SHOP TIER NAMES
    // ============================================
    shopTierNames: [
        'common',       // fib[0] = 0
        'uncommon',     // fib[1] = 1
        'rare',         // fib[2] = 1
        'epic',         // fib[3] = 2
        'legendary',    // fib[4] = 3
        'mythic',       // fib[5] = 5
        'divine',       // fib[6] = 8
        'cosmic',       // fib[7] = 13
        'eternal',      // fib[8] = 21
        'transcendent'  // fib[9] = 34
    ],

    // ============================================
    // AVATAR LAYERS
    // ============================================
    avatarLayers: [
        { id: 'background', index: 0, required: true,  zIndex: 0 },
        { id: 'aura',       index: 1, required: false, zIndex: 1 },
        { id: 'skin',       index: 2, required: true,  zIndex: 2 },
        { id: 'outfit',     index: 3, required: false, zIndex: 3 },
        { id: 'eyes',       index: 4, required: false, zIndex: 4 },
        { id: 'head',       index: 5, required: false, zIndex: 5 },
        { id: 'held',       index: 6, required: false, zIndex: 6 }
    ],

    // ============================================
    // XP SYSTEM - DERIVED FROM FIBONACCI
    // ============================================
    xp: {
        /**
         * Convert burned tokens to XP
         * 1 token burned = 1 XP (identity ratio, no magic)
         * @param {number} tokensBurned - Tokens burned
         * @returns {number} XP gained
         */
        fromBurn(tokensBurned) {
            return Math.floor(tokensBurned);
        },

        /**
         * Get XP threshold for a tier
         * Formula: fib[tier * numEngageTiers]
         * Spacing = numEngageTiers (self-referential, no magic)
         *
         * Tier 0 (EMBER):   fib[0]  = 0
         * Tier 1 (SPARK):   fib[5]  = 5
         * Tier 2 (FLAME):   fib[10] = 55
         * Tier 3 (BLAZE):   fib[15] = 610
         * Tier 4 (INFERNO): fib[20] = 6,765
         *
         * @param {number} tier - Tier index (0-4)
         * @returns {number} XP threshold
         */
        getThreshold(tier) {
            const index = tier * ASDF.numEngageTiers;
            return ASDF.fib[index] || 0;
        },

        /**
         * Get cumulative XP needed to reach a tier
         * @param {number} tier - Target tier
         * @returns {number} Total XP needed
         */
        getCumulativeThreshold(tier) {
            let total = 0;
            for (let i = 0; i <= tier; i++) {
                total += this.getThreshold(i);
            }
            return total;
        }
    },

    // ============================================
    // ENGAGE SYSTEM - DERIVED FROM XP
    // ============================================
    engage: {
        /**
         * Get user's engagement tier from total XP
         * @param {number} totalXP - User's total XP
         * @returns {Object} Tier info
         */
        getTier(totalXP) {
            // Build thresholds array from Fibonacci
            const thresholds = [];
            for (let i = 0; i < ASDF.numEngageTiers; i++) {
                thresholds.push(ASDF.xp.getThreshold(i));
            }

            // Find current tier (highest threshold met)
            let tierIndex = 0;
            for (let i = ASDF.numEngageTiers - 1; i >= 0; i--) {
                if (totalXP >= thresholds[i]) {
                    tierIndex = i;
                    break;
                }
            }

            const currentThreshold = thresholds[tierIndex];
            const nextThreshold = thresholds[tierIndex + 1] || Infinity;
            const isMaxTier = tierIndex === ASDF.numEngageTiers - 1;

            return {
                index: tierIndex,
                name: ASDF.engageTierNames[tierIndex],
                xp: totalXP,
                threshold: currentThreshold,
                next: nextThreshold,
                xpToNext: isMaxTier ? 0 : nextThreshold - totalXP,
                progress: isMaxTier ? 1 : (totalXP - currentThreshold) / (nextThreshold - currentThreshold),
                isMax: isMaxTier
            };
        },

        /**
         * Get shop discount for a tier
         * Formula: fib[tier] / 100 = fib[tier]%
         * @param {number} tier - Tier index
         * @returns {number} Discount as decimal (0.01 = 1%)
         */
        getDiscount(tier) {
            return (ASDF.fib[tier] || 0) / 100;
        },

        /**
         * Get airdrop boost multiplier for a tier
         * Formula: fib[tier] or 1 (minimum 1x)
         * @param {number} tier - Tier index
         * @returns {number} Multiplier
         */
        getAirdropBoost(tier) {
            return Math.max(1, ASDF.fib[tier] || 1);
        },

        /**
         * Get exclusive shop tiers unlocked at this engage tier
         * @param {number} tier - Engage tier index
         * @returns {Array<string>} Unlocked shop tier names
         */
        getExclusiveTiers(tier) {
            // Each engage tier unlocks corresponding shop tier
            // EMBER (0): common only
            // SPARK (1): + uncommon
            // FLAME (2): + rare
            // BLAZE (3): + epic
            // INFERNO (4): + legendary
            const exclusiveMap = [
                [],                     // EMBER: no exclusives
                ['uncommon'],           // SPARK
                ['rare'],               // FLAME
                ['epic'],               // BLAZE
                ['legendary']           // INFERNO
            ];
            return exclusiveMap[tier] || [];
        }
    },

    // ============================================
    // SHOP SYSTEM - DERIVED FROM SUPPLY
    // ============================================
    shop: {
        /**
         * Get price for a cosmetic item
         * Formula: fib[tier] * currentSupply / initialSupply
         *
         * When supply = initial: price = fib[tier]
         * As supply burns: price decreases proportionally
         *
         * @param {number} tier - Shop tier index (0-9)
         * @param {number} currentSupply - Current token supply
         * @returns {number} Price in tokens
         */
        getPrice(tier, currentSupply) {
            return Math.floor(ASDF.fib[tier] * currentSupply / ASDF.initialSupply);
        },

        /**
         * Get maximum supply for a cosmetic tier
         * Formula: totalBurned / (fib[tier] * initialSupply)
         *
         * Higher tiers = rarer items (fewer available)
         * More burns = more items unlocked
         *
         * @param {number} tier - Shop tier index (0-9)
         * @param {number} totalBurned - Total tokens burned by ecosystem
         * @returns {number} Max supply of items
         */
        getMaxSupply(tier, totalBurned) {
            const fibTier = ASDF.fib[tier];
            if (fibTier === 0) return Infinity; // Common items unlimited
            return Math.floor(totalBurned / (fibTier * ASDF.initialSupply));
        },

        /**
         * Apply engage tier discount to price
         * @param {number} basePrice - Original price
         * @param {number} engageTier - User's engage tier
         * @returns {number} Discounted price
         */
        applyDiscount(basePrice, engageTier) {
            const discount = ASDF.engage.getDiscount(engageTier);
            return Math.floor(basePrice * (1 - discount));
        },

        /**
         * Check if user can access a shop tier
         * @param {number} shopTier - Shop tier to check
         * @param {number} engageTier - User's engage tier
         * @returns {boolean} Has access
         */
        canAccess(shopTier, engageTier) {
            // Common (0) through rare (2) always accessible
            if (shopTier <= 2) return true;

            // Higher tiers require corresponding engage tier
            // epic (3) needs BLAZE (3)
            // legendary (4) needs INFERNO (4)
            // mythic+ (5-9) need INFERNO (4)
            const requiredEngageTier = Math.min(shopTier, ASDF.numEngageTiers - 1);
            return engageTier >= requiredEngageTier;
        }
    },

    // ============================================
    // LEARN SYSTEM - DERIVED FROM FIBONACCI
    // ============================================
    learn: {
        numLevels: 5,

        /**
         * Get XP required to complete a level
         * Formula: fib[level + 3] * 100
         * +3 offset so level 1 = fib[4] = 3, giving meaningful XP
         *
         * @param {number} level - Level number (1-5)
         * @returns {number} XP on completion
         */
        getXpReward(level) {
            return ASDF.fib[level + 3] * 100;
        }
    },

    // ============================================
    // PLAY SYSTEM - GAME SCORING
    // ============================================
    play: {
        /**
         * Convert game score to XP
         * Formula: score * fib[tier] / fib[maxTier]
         * Higher engage tier = better XP rate
         *
         * @param {number} score - Game score
         * @param {number} engageTier - User's engage tier
         * @returns {number} XP gained
         */
        scoreToXp(score, engageTier) {
            const maxTier = ASDF.numEngageTiers - 1;
            const multiplier = ASDF.fib[engageTier + 1] / ASDF.fib[maxTier + 1];
            return Math.floor(score * multiplier);
        },

        /**
         * Get airdrop slots per rank
         * Derived from Fibonacci: 1st = fib[4], 2nd = fib[2], 3rd = fib[1]
         * @returns {Object} Slots per rank
         */
        getAirdropSlots() {
            return {
                1: ASDF.fib[4],  // 3 slots for 1st place
                2: ASDF.fib[2],  // 1 slot for 2nd place
                3: ASDF.fib[1]   // 1 slot for 3rd place
            };
        }
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Get Fibonacci number at index
     * @param {number} n - Index
     * @returns {number} Fibonacci number
     */
    getFib(n) {
        if (n < 0) return 0;
        if (n < this.fib.length) return this.fib[n];
        // Calculate if beyond cached range
        let a = this.fib[this.fib.length - 2];
        let b = this.fib[this.fib.length - 1];
        for (let i = this.fib.length; i <= n; i++) {
            const temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    },

    /**
     * Format large numbers for display
     * @param {number} num - Number to format
     * @returns {string} Formatted string
     */
    formatNumber(num) {
        const n = Number(num);
        if (!Number.isFinite(n)) return '0';
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
        return n.toLocaleString();
    },

    /**
     * Get tier color for UI
     * @param {number} tier - Tier index
     * @param {string} type - 'engage' or 'shop'
     * @returns {string} CSS color variable
     */
    getTierColor(tier, type = 'engage') {
        const colors = {
            engage: [
                'var(--text-muted)',      // EMBER
                'var(--accent-spark)',    // SPARK
                'var(--accent-flame)',    // FLAME
                'var(--accent-blaze)',    // BLAZE
                'var(--accent-inferno)'   // INFERNO
            ],
            shop: [
                '#808080',  // common (gray)
                '#1eff00',  // uncommon (green)
                '#0070dd',  // rare (blue)
                '#a335ee',  // epic (purple)
                '#ff8000',  // legendary (orange)
                '#e6cc80',  // mythic (gold)
                '#00ccff',  // divine (cyan)
                '#ff00ff',  // cosmic (magenta)
                '#ffffff',  // eternal (white)
                '#ff4500'   // transcendent (fire)
            ]
        };
        return colors[type]?.[tier] || colors[type]?.[0] || '#ffffff';
    }
};

// Freeze to prevent modifications
Object.freeze(ASDF.fib);
Object.freeze(ASDF.engageTierNames);
Object.freeze(ASDF.shopTierNames);
Object.freeze(ASDF.avatarLayers);
Object.freeze(ASDF.xp);
Object.freeze(ASDF.engage);
Object.freeze(ASDF.shop);
Object.freeze(ASDF.learn);
Object.freeze(ASDF.play);

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ASDF;
}
