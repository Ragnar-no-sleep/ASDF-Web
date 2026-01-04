/**
 * Pump Arena RPG - Battle System
 * Combat encounters with ASDF Philosophy integration
 *
 * PHILOSOPHY: Combat reflects the crypto world
 * - Battles represent market challenges, FUD attacks, rug pulls
 * - Stats determine combat effectiveness
 * - Fibonacci-based damage and rewards
 * - Burns benefit everyone (burn tokens for combat buffs)
 *
 * Version: 1.0.0 - ASDF Philosophy Integration
 */

'use strict';

// ============================================
// FIBONACCI HELPER (ASDF Philosophy)
// ============================================

const BATTLE_FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function getBattleFib(n) {
    if (n < 0) return 0;
    if (n < BATTLE_FIB.length) return BATTLE_FIB[n];
    // Calculate for larger indices
    let a = BATTLE_FIB[BATTLE_FIB.length - 2];
    let b = BATTLE_FIB[BATTLE_FIB.length - 1];
    for (let i = BATTLE_FIB.length; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}

// ============================================
// COMBAT STATS CALCULATION
// ============================================

/**
 * Combat roles derived from stats:
 * - ATK (Attack): DEV + STR (Technical + Strategic power)
 * - DEF (Defense): COM + CHA (Community shield + Influence)
 * - SPD (Speed): MKT + LCK (Initiative + Fortune)
 * - CRT (Critical): LCK + DEV (Lucky breaks + Precision)
 */
function calculateCombatStats() {
    const state = window.PumpArenaState?.get();
    if (!state) return null;

    const stats = state.stats;
    const tier = window.PumpArenaState.getCurrentTier();
    const tierBonus = 1 + (tier.index * 0.1); // 10% per tier

    // Base combat stats from character stats
    const baseAtk = Math.floor((stats.dev + stats.str) * tierBonus);
    const baseDef = Math.floor((stats.com + stats.cha) * tierBonus);
    const baseSpd = Math.floor((stats.mkt + stats.lck) * tierBonus);
    const baseCrt = Math.floor((stats.lck + stats.dev) / 2);

    // Health based on level + defense (Fibonacci scaling)
    const level = state.progression.level;
    const maxHp = getBattleFib(level + 5) + (baseDef * 2);

    // Mana/Energy from influence
    const maxMp = state.resources.maxInfluence;

    return {
        atk: baseAtk,
        def: baseDef,
        spd: baseSpd,
        crt: Math.min(baseCrt, 50), // Cap at 50%
        maxHp,
        maxMp,
        level,
        tier: tier.name
    };
}

// ============================================
// ENEMY DEFINITIONS (ASDF Philosophy)
// ============================================

const ENEMY_TYPES = {
    // Tier 1: EMBER enemies (levels 1-10)
    fud_bot: {
        id: 'fud_bot',
        name: 'FUD Bot',
        icon: '🤖',
        description: 'An automated fear-spreader',
        tier: 0,
        baseHp: getBattleFib(8),        // 21
        baseAtk: getBattleFib(5),       // 5
        baseDef: getBattleFib(4),       // 3
        baseSpd: getBattleFib(6),       // 8
        rewards: { xp: getBattleFib(7), tokens: getBattleFib(5) },  // 13 XP, 5 tokens
        drops: ['code_fragment'],
        critChance: 5
    },
    paper_hands: {
        id: 'paper_hands',
        name: 'Paper Hands',
        icon: '📄',
        description: 'Panics at every dip',
        tier: 0,
        baseHp: getBattleFib(7),        // 13
        baseAtk: getBattleFib(6),       // 8
        baseDef: getBattleFib(3),       // 2
        baseSpd: getBattleFib(7),       // 13
        rewards: { xp: getBattleFib(6), tokens: getBattleFib(4) },  // 8 XP, 3 tokens
        drops: ['raw_silicon'],
        critChance: 10
    },
    scam_token: {
        id: 'scam_token',
        name: 'Scam Token',
        icon: '💀',
        description: 'Honeypot in disguise',
        tier: 0,
        baseHp: getBattleFib(9),        // 34
        baseAtk: getBattleFib(7),       // 13
        baseDef: getBattleFib(5),       // 5
        baseSpd: getBattleFib(5),       // 5
        rewards: { xp: getBattleFib(8), tokens: getBattleFib(6) },  // 21 XP, 8 tokens
        drops: ['circuit_board'],
        critChance: 15
    },

    // Tier 2: SPARK enemies (levels 11-20)
    whale_dumper: {
        id: 'whale_dumper',
        name: 'Whale Dumper',
        icon: '🐋',
        description: 'Massive sell pressure incoming',
        tier: 1,
        baseHp: getBattleFib(10),       // 55
        baseAtk: getBattleFib(8),       // 21
        baseDef: getBattleFib(6),       // 8
        baseSpd: getBattleFib(4),       // 3
        rewards: { xp: getBattleFib(9), tokens: getBattleFib(7) },  // 34 XP, 13 tokens
        drops: ['energy_cell', 'circuit_board'],
        critChance: 8
    },
    mev_bot: {
        id: 'mev_bot',
        name: 'MEV Bot',
        icon: '⚡',
        description: 'Front-running your transactions',
        tier: 1,
        baseHp: getBattleFib(9),        // 34
        baseAtk: getBattleFib(9),       // 34
        baseDef: getBattleFib(4),       // 3
        baseSpd: getBattleFib(10),      // 55 - Very fast!
        rewards: { xp: getBattleFib(9), tokens: getBattleFib(8) },  // 34 XP, 21 tokens
        drops: ['code_fragment', 'code_fragment'],
        critChance: 20
    },

    // Tier 3: FLAME enemies (levels 21-35)
    rug_puller: {
        id: 'rug_puller',
        name: 'Rug Puller',
        icon: '🧶',
        description: 'The liquidity is gone...',
        tier: 2,
        baseHp: getBattleFib(11),       // 89
        baseAtk: getBattleFib(10),      // 55
        baseDef: getBattleFib(7),       // 13
        baseSpd: getBattleFib(8),       // 21
        rewards: { xp: getBattleFib(10), tokens: getBattleFib(9) }, // 55 XP, 34 tokens
        drops: ['rare_alloy', 'energy_cell'],
        critChance: 12
    },
    exploit_hacker: {
        id: 'exploit_hacker',
        name: 'Exploit Hacker',
        icon: '👨‍💻',
        description: 'Found a vulnerability in the contract',
        tier: 2,
        baseHp: getBattleFib(10),       // 55
        baseAtk: getBattleFib(11),      // 89 - High damage!
        baseDef: getBattleFib(5),       // 5 - Glass cannon
        baseSpd: getBattleFib(9),       // 34
        rewards: { xp: getBattleFib(10), tokens: getBattleFib(9) }, // 55 XP, 34 tokens
        drops: ['code_fragment', 'ancient_code'],
        critChance: 25
    },

    // Tier 4: BLAZE enemies (levels 36-50)
    bear_market: {
        id: 'bear_market',
        name: 'Bear Market',
        icon: '🐻',
        description: 'Everything is down 90%',
        tier: 3,
        baseHp: getBattleFib(12),       // 144
        baseAtk: getBattleFib(11),      // 89
        baseDef: getBattleFib(9),       // 34
        baseSpd: getBattleFib(6),       // 8
        rewards: { xp: getBattleFib(11), tokens: getBattleFib(10) }, // 89 XP, 55 tokens
        drops: ['rare_alloy', 'quantum_chip'],
        critChance: 10
    },
    sec_investigator: {
        id: 'sec_investigator',
        name: 'SEC Investigator',
        icon: '👔',
        description: 'Your token might be a security...',
        tier: 3,
        baseHp: getBattleFib(11),       // 89
        baseAtk: getBattleFib(10),      // 55
        baseDef: getBattleFib(11),      // 89 - High defense!
        baseSpd: getBattleFib(5),       // 5 - Slow bureaucracy
        rewards: { xp: getBattleFib(11), tokens: getBattleFib(10) }, // 89 XP, 55 tokens
        drops: ['legal_docs', 'rare_alloy'],
        critChance: 5
    },

    // Tier 5: INFERNO bosses (level 50+)
    crypto_winter: {
        id: 'crypto_winter',
        name: 'Crypto Winter',
        icon: '❄️',
        description: 'The coldest season in memory',
        tier: 4,
        baseHp: getBattleFib(13),       // 233
        baseAtk: getBattleFib(12),      // 144
        baseDef: getBattleFib(10),      // 55
        baseSpd: getBattleFib(7),       // 13
        rewards: { xp: getBattleFib(12), tokens: getBattleFib(11) }, // 144 XP, 89 tokens
        drops: ['quantum_chip', 'ancient_code', 'legendary_core'],
        critChance: 15,
        isBoss: true
    },
    exchange_collapse: {
        id: 'exchange_collapse',
        name: 'Exchange Collapse',
        icon: '💥',
        description: 'Your funds are not safu',
        tier: 4,
        baseHp: getBattleFib(14),       // 377
        baseAtk: getBattleFib(13),      // 233
        baseDef: getBattleFib(11),      // 89
        baseSpd: getBattleFib(6),       // 8
        rewards: { xp: getBattleFib(13), tokens: getBattleFib(12) }, // 233 XP, 144 tokens
        drops: ['legendary_core', 'legendary_core'],
        critChance: 20,
        isBoss: true
    }
};

// ============================================
// CARD SYSTEM (ASDF Philosophy)
// ============================================

// Card rarities with Fibonacci-based draw weights
const CARD_RARITY = {
    common: { weight: getBattleFib(8), color: '#9ca3af', name: 'Common' },      // 21
    uncommon: { weight: getBattleFib(7), color: '#22c55e', name: 'Uncommon' },  // 13
    rare: { weight: getBattleFib(6), color: '#3b82f6', name: 'Rare' },          // 8
    epic: { weight: getBattleFib(5), color: '#a855f7', name: 'Epic' },          // 5
    legendary: { weight: getBattleFib(4), color: '#f97316', name: 'Legendary' } // 3
};

// Action cards - player draws these each turn
const ACTION_CARDS = {
    // Common Attack Cards
    quick_strike: {
        id: 'quick_strike',
        name: 'Quick Strike',
        icon: '⚔️',
        description: 'A fast, basic attack',
        type: 'attack',
        rarity: 'common',
        mpCost: 0,
        damage: getBattleFib(6),  // 8 base damage
        effects: []
    },
    code_slash: {
        id: 'code_slash',
        name: 'Code Slash',
        icon: '💻',
        description: 'Attack with coding prowess',
        type: 'attack',
        rarity: 'common',
        mpCost: getBattleFib(4),  // 3 MP
        damage: getBattleFib(7),  // 13 base damage
        statBonus: 'dev',
        effects: []
    },

    // Uncommon Attack Cards
    market_crash: {
        id: 'market_crash',
        name: 'Market Crash',
        icon: '📉',
        description: 'Cause a sudden market crash',
        type: 'attack',
        rarity: 'uncommon',
        mpCost: getBattleFib(5),  // 5 MP
        damage: getBattleFib(8),  // 21 base damage
        effects: ['weaken']  // Reduces enemy ATK
    },
    viral_post: {
        id: 'viral_post',
        name: 'Viral Post',
        icon: '📢',
        description: 'Your marketing goes viral',
        type: 'attack',
        rarity: 'uncommon',
        mpCost: getBattleFib(5),
        damage: getBattleFib(7),
        statBonus: 'mkt',
        effects: ['burn']  // DoT damage
    },

    // Rare Attack Cards
    whale_slam: {
        id: 'whale_slam',
        name: 'Whale Slam',
        icon: '🐋',
        description: 'Call a whale for massive impact',
        type: 'attack',
        rarity: 'rare',
        mpCost: getBattleFib(6),  // 8 MP
        damage: getBattleFib(9),  // 34 base damage
        effects: ['stun']  // Enemy skips next turn
    },
    token_burn: {
        id: 'token_burn',
        name: 'Token Burn',
        icon: '🔥',
        description: 'Burn tokens for massive damage',
        type: 'attack',
        rarity: 'rare',
        mpCost: getBattleFib(4),
        tokenCost: getBattleFib(6),  // 8 tokens
        damage: getBattleFib(10),    // 55 base damage
        effects: []
    },

    // Epic Attack Cards
    fomo_frenzy: {
        id: 'fomo_frenzy',
        name: 'FOMO Frenzy',
        icon: '😱',
        description: 'Damage scales with missing HP',
        type: 'attack',
        rarity: 'epic',
        mpCost: getBattleFib(6),
        damage: getBattleFib(8),
        effects: ['fomo']  // Damage * (1 + missing HP%)
    },
    rug_pull: {
        id: 'rug_pull',
        name: 'Rug Pull',
        icon: '🧶',
        description: 'Pull the rug - devastating attack',
        type: 'attack',
        rarity: 'epic',
        mpCost: getBattleFib(7),
        damage: getBattleFib(10),
        effects: ['lifesteal']  // Heal for 50% damage dealt
    },

    // Legendary Attack Cards
    moon_shot: {
        id: 'moon_shot',
        name: 'Moon Shot',
        icon: '🚀',
        description: 'TO THE MOON! Ultimate attack',
        type: 'attack',
        rarity: 'legendary',
        mpCost: getBattleFib(8),  // 21 MP
        damage: getBattleFib(11), // 89 base damage
        effects: ['pierce']  // Ignores defense
    },

    // Common Defense Cards
    basic_block: {
        id: 'basic_block',
        name: 'Basic Block',
        icon: '🛡️',
        description: 'Block incoming damage',
        type: 'defense',
        rarity: 'common',
        mpCost: 0,
        block: getBattleFib(6),  // Block 8 damage
        effects: []
    },
    community_wall: {
        id: 'community_wall',
        name: 'Community Wall',
        icon: '🧱',
        description: 'Rally community for defense',
        type: 'defense',
        rarity: 'common',
        mpCost: getBattleFib(4),
        block: getBattleFib(7),  // Block 13 damage
        statBonus: 'com',
        effects: ['defense_buff']
    },

    // Uncommon Defense Cards
    diamond_stance: {
        id: 'diamond_stance',
        name: 'Diamond Stance',
        icon: '💎',
        description: 'HODL position - strong defense',
        type: 'defense',
        rarity: 'uncommon',
        mpCost: getBattleFib(5),
        block: getBattleFib(8),  // Block 21 damage
        effects: ['reflect']  // Reflect 25% damage
    },

    // Rare Defense Cards
    audit_shield: {
        id: 'audit_shield',
        name: 'Audit Shield',
        icon: '📋',
        description: 'Audited code protects you',
        type: 'defense',
        rarity: 'rare',
        mpCost: getBattleFib(6),
        block: getBattleFib(9),  // Block 34 damage
        effects: ['immunity']  // Immune to effects this turn
    },

    // Common Support Cards
    quick_heal: {
        id: 'quick_heal',
        name: 'Quick Heal',
        icon: '💚',
        description: 'Heal a small amount',
        type: 'support',
        rarity: 'common',
        mpCost: getBattleFib(4),
        heal: getBattleFib(6),  // Heal 8 HP
        effects: []
    },
    energy_drink: {
        id: 'energy_drink',
        name: 'Energy Drink',
        icon: '⚡',
        description: 'Restore energy (MP)',
        type: 'support',
        rarity: 'common',
        mpCost: 0,
        mpRestore: getBattleFib(6),  // Restore 8 MP
        effects: []
    },

    // Uncommon Support Cards
    pump_it_up: {
        id: 'pump_it_up',
        name: 'Pump It Up',
        icon: '📈',
        description: 'Boost your next attack',
        type: 'support',
        rarity: 'uncommon',
        mpCost: getBattleFib(4),
        effects: ['attack_buff']  // +50% next attack
    },
    market_analysis: {
        id: 'market_analysis',
        name: 'Market Analysis',
        icon: '📊',
        description: 'Analyze enemy weaknesses',
        type: 'support',
        rarity: 'uncommon',
        mpCost: getBattleFib(5),
        effects: ['expose']  // Enemy takes +25% damage
    },

    // Rare Support Cards
    diamond_hands: {
        id: 'diamond_hands',
        name: 'Diamond Hands',
        icon: '💎',
        description: 'Strong HODL - big heal',
        type: 'support',
        rarity: 'rare',
        mpCost: getBattleFib(6),
        heal: getBattleFib(8),  // Heal 21 HP
        effects: ['defense_buff']
    },

    // Epic Support Cards
    bull_run: {
        id: 'bull_run',
        name: 'Bull Run',
        icon: '🐂',
        description: 'Start a bull run - massive buffs',
        type: 'support',
        rarity: 'epic',
        mpCost: getBattleFib(7),
        effects: ['attack_buff', 'defense_buff', 'speed_buff']
    },

    // Common Special Cards
    position_shift: {
        id: 'position_shift',
        name: 'Position Shift',
        icon: '🔄',
        description: 'Move to any adjacent position',
        type: 'special',
        rarity: 'common',
        mpCost: 0,
        effects: ['move']  // Free movement
    },

    // Uncommon Special Cards
    counter_trade: {
        id: 'counter_trade',
        name: 'Counter Trade',
        icon: '↩️',
        description: 'Counter the next attack',
        type: 'special',
        rarity: 'uncommon',
        mpCost: getBattleFib(5),
        effects: ['counter']  // Counter next attack
    },

    // Rare Special Cards
    flash_crash: {
        id: 'flash_crash',
        name: 'Flash Crash',
        icon: '💥',
        description: 'Instant position swap with enemy',
        type: 'special',
        rarity: 'rare',
        mpCost: getBattleFib(6),
        effects: ['swap_positions']
    },

    // Legendary Special Card
    golden_bull: {
        id: 'golden_bull',
        name: 'Golden Bull',
        icon: '🏆',
        description: 'Ultimate card - attack + heal + buff',
        type: 'special',
        rarity: 'legendary',
        mpCost: getBattleFib(8),
        damage: getBattleFib(9),
        heal: getBattleFib(7),
        effects: ['attack_buff', 'defense_buff']
    }
};

// Player's base deck (cards they start with)
const BASE_DECK = [
    'quick_strike', 'quick_strike', 'quick_strike',
    'code_slash', 'code_slash',
    'basic_block', 'basic_block',
    'community_wall',
    'quick_heal', 'quick_heal',
    'energy_drink',
    'position_shift'
];

/**
 * Initialize card deck for battle
 */
function initializeDeck() {
    const deck = [...BASE_DECK];

    // Add bonus cards based on player level
    const state = window.PumpArenaState?.get();
    const level = state?.progression.level || 1;

    // Add uncommon cards at level 5+
    if (level >= 5) {
        deck.push('market_crash', 'viral_post', 'diamond_stance', 'pump_it_up');
    }

    // Add rare cards at level 15+
    if (level >= 15) {
        deck.push('whale_slam', 'token_burn', 'audit_shield', 'diamond_hands', 'counter_trade');
    }

    // Add epic cards at level 25+
    if (level >= 25) {
        deck.push('fomo_frenzy', 'rug_pull', 'bull_run', 'flash_crash');
    }

    // Add legendary cards at level 40+
    if (level >= 40) {
        deck.push('moon_shot', 'golden_bull');
    }

    return shuffleDeck(deck);
}

/**
 * Shuffle deck (Fisher-Yates algorithm)
 */
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Draw cards from deck
 */
function drawCards(count) {
    const drawn = [];
    for (let i = 0; i < count && battleState.deck.length > 0; i++) {
        drawn.push(battleState.deck.pop());
    }

    // If deck is empty, shuffle discard pile back
    if (battleState.deck.length === 0 && battleState.discardPile.length > 0) {
        battleState.deck = shuffleDeck(battleState.discardPile);
        battleState.discardPile = [];
        battleState.log.push('Deck reshuffled!');
    }

    return drawn;
}

// ============================================
// COMBAT SKILLS (Legacy - kept for compatibility)
// ============================================

const COMBAT_SKILLS = {
    // Basic attacks
    basic_attack: {
        id: 'basic_attack',
        name: 'Basic Attack',
        icon: '⚔️',
        description: 'A standard attack',
        type: 'attack',
        mpCost: 0,
        damageMultiplier: 1.0,
        cooldown: 0
    },
    code_strike: {
        id: 'code_strike',
        name: 'Code Strike',
        icon: '💻',
        description: 'Attack with technical prowess',
        type: 'attack',
        mpCost: getBattleFib(5),        // 5
        damageMultiplier: 1.5,
        statBonus: 'dev',
        cooldown: 1
    },
    community_shield: {
        id: 'community_shield',
        name: 'Community Shield',
        icon: '🛡️',
        description: 'Rally the community for defense',
        type: 'defense',
        mpCost: getBattleFib(6),        // 8
        damageMultiplier: 0,
        effect: 'defense_buff',
        buffAmount: getBattleFib(5),    // +5 DEF
        duration: 3,
        cooldown: 3
    },
    viral_campaign: {
        id: 'viral_campaign',
        name: 'Viral Campaign',
        icon: '📢',
        description: 'Marketing blitz damages all enemies',
        type: 'attack',
        mpCost: getBattleFib(7),        // 13
        damageMultiplier: 0.8,
        aoe: true,
        statBonus: 'mkt',
        cooldown: 2
    },
    diamond_hands: {
        id: 'diamond_hands',
        name: 'Diamond Hands',
        icon: '💎',
        description: 'HODL through the pain, heal yourself',
        type: 'support',
        mpCost: getBattleFib(6),        // 8
        damageMultiplier: 0,
        effect: 'heal',
        healAmount: getBattleFib(8),    // 21 HP
        cooldown: 4
    },
    burn_attack: {
        id: 'burn_attack',
        name: 'Token Burn',
        icon: '🔥',
        description: 'Burn tokens for massive damage (costs tokens)',
        type: 'attack',
        mpCost: getBattleFib(4),        // 3
        tokenCost: getBattleFib(6),     // 8 tokens
        damageMultiplier: 3.0,
        cooldown: 5
    },
    lucky_trade: {
        id: 'lucky_trade',
        name: 'Lucky Trade',
        icon: '🍀',
        description: 'High risk, high reward attack',
        type: 'attack',
        mpCost: getBattleFib(5),        // 5
        damageMultiplier: 2.5,
        accuracy: 60, // Only 60% hit chance
        statBonus: 'lck',
        cooldown: 2
    },
    ultimate_pump: {
        id: 'ultimate_pump',
        name: 'Ultimate Pump',
        icon: '🚀',
        description: 'TO THE MOON! Ultimate attack',
        type: 'attack',
        mpCost: getBattleFib(8),        // 21
        damageMultiplier: 5.0,
        cooldown: 8,
        requiresLevel: 20
    },
    // New strategic skills
    market_analysis: {
        id: 'market_analysis',
        name: 'Market Analysis',
        icon: '📊',
        description: 'Analyze enemy weaknesses, boost next attack',
        type: 'support',
        mpCost: getBattleFib(5),        // 5
        damageMultiplier: 0,
        effect: 'attack_buff',
        buffAmount: getBattleFib(6),    // +8 ATK
        duration: 2,
        cooldown: 3
    },
    whale_call: {
        id: 'whale_call',
        name: 'Whale Call',
        icon: '🐋',
        description: 'Call whale support for heavy damage',
        type: 'attack',
        mpCost: getBattleFib(7),        // 13
        damageMultiplier: 2.2,
        cooldown: 4
    },
    fomo_strike: {
        id: 'fomo_strike',
        name: 'FOMO Strike',
        icon: '😱',
        description: 'Fear of missing out - damage scales with missing HP',
        type: 'attack',
        mpCost: getBattleFib(6),        // 8
        damageMultiplier: 1.0,
        effect: 'fomo', // Special: damage increases when low HP
        cooldown: 3
    }
};

// ============================================
// CIRCULAR ARENA SYSTEM (9 positions)
// ============================================

// Arena layout: 9 positions in a circle
// Positions 0-2: Inner ring (CLOSE) - melee advantage
// Positions 3-5: Middle ring (MID) - balanced
// Positions 6-8: Outer ring (FAR) - ranged advantage

const ARENA_POSITIONS = {
    0: { id: 0, ring: 'close', name: 'Center', x: 50, y: 50, angle: 0 },
    1: { id: 1, ring: 'close', name: 'Inner Left', x: 30, y: 40, angle: 120 },
    2: { id: 2, ring: 'close', name: 'Inner Right', x: 70, y: 40, angle: 240 },
    3: { id: 3, ring: 'mid', name: 'Mid Top', x: 50, y: 20, angle: 0 },
    4: { id: 4, ring: 'mid', name: 'Mid Left', x: 20, y: 60, angle: 120 },
    5: { id: 5, ring: 'mid', name: 'Mid Right', x: 80, y: 60, angle: 240 },
    6: { id: 6, ring: 'far', name: 'Outer Top', x: 50, y: 5, angle: 0 },
    7: { id: 7, ring: 'far', name: 'Outer Left', x: 5, y: 75, angle: 120 },
    8: { id: 8, ring: 'far', name: 'Outer Right', x: 95, y: 75, angle: 240 }
};

// Adjacent positions for movement
const ARENA_ADJACENCY = {
    0: [1, 2, 3, 4, 5], // Center connects to inner and mid
    1: [0, 2, 4],
    2: [0, 1, 5],
    3: [0, 4, 5, 6],
    4: [1, 3, 5, 7],
    5: [2, 3, 4, 8],
    6: [3, 7, 8],
    7: [4, 6, 8],
    8: [5, 6, 7]
};

// Ring combat modifiers
const RING_MODIFIERS = {
    close: { melee: 1.3, ranged: 0.7, defense: 0.9 },  // Melee strong, ranged weak
    mid: { melee: 1.0, ranged: 1.0, defense: 1.0 },    // Balanced
    far: { melee: 0.7, ranged: 1.3, defense: 1.1 }     // Ranged strong, melee weak
};

/**
 * Calculate distance between two positions
 */
function getPositionDistance(pos1, pos2) {
    if (pos1 === pos2) return 0;
    const p1 = ARENA_POSITIONS[pos1];
    const p2 = ARENA_POSITIONS[pos2];
    if (p1.ring === p2.ring) return 1;
    if ((p1.ring === 'close' && p2.ring === 'far') || (p1.ring === 'far' && p2.ring === 'close')) return 2;
    return 1;
}

/**
 * Check if movement is valid
 */
function canMoveTo(fromPos, toPos) {
    return ARENA_ADJACENCY[fromPos]?.includes(toPos) || false;
}

// ============================================
// BATTLE STATE
// ============================================

let battleState = {
    active: false,
    player: null,
    enemy: null,
    turn: 0,
    phase: 'player',      // 'player' or 'enemy' - turn-based system
    playerHp: 0,
    playerMp: 0,
    enemyHp: 0,
    playerPosition: 0,    // Player starts at center
    enemyPosition: 6,     // Enemy starts at outer top
    // Card system
    deck: [],             // Draw pile
    hand: [],             // Cards in hand (max 5)
    discardPile: [],      // Used cards
    cardsPerTurn: 3,      // Cards drawn each turn
    maxHandSize: 5,       // Maximum cards in hand
    // Status effects
    buffs: [],
    debuffs: [],
    enemyDebuffs: [],     // Debuffs on enemy
    // Block for this turn
    currentBlock: 0,
    // Special states
    isStunned: false,     // Enemy stunned (skips turn)
    hasCounter: false,    // Player has counter active
    isExposed: false,     // Enemy takes extra damage
    cooldowns: {},
    log: []
};

// ============================================
// BATTLE RATE LIMITER (Security by Design)
// ============================================

const BattleRateLimiter = {
    lastAction: 0,
    actionCount: 0,
    windowStart: Date.now(),

    checkAction() {
        const now = Date.now();

        // Minimum 500ms between actions (fib[5] * 100)
        if (now - this.lastAction < 500) {
            return { allowed: false, message: 'Too fast! Wait a moment.' };
        }

        // Max 30 actions per minute
        if (now - this.windowStart > 60000) {
            this.actionCount = 0;
            this.windowStart = now;
        }

        if (this.actionCount >= 30) {
            return { allowed: false, message: 'Rate limit reached. Wait a minute.' };
        }

        return { allowed: true };
    },

    recordAction() {
        this.lastAction = Date.now();
        this.actionCount++;
    }
};

// ============================================
// BATTLE INITIALIZATION
// ============================================

/**
 * Start a battle with an enemy
 * @param {string} enemyId - Enemy type ID
 * @returns {Object} Battle result
 */
function startBattle(enemyId) {
    // Input validation (Security by Design)
    if (typeof enemyId !== 'string' || !ENEMY_TYPES[enemyId]) {
        return { success: false, message: 'Invalid enemy type' };
    }

    if (battleState.active) {
        return { success: false, message: 'Already in battle' };
    }

    const playerStats = calculateCombatStats();
    if (!playerStats) {
        return { success: false, message: 'Could not load player stats' };
    }

    const enemyTemplate = ENEMY_TYPES[enemyId];
    const playerLevel = playerStats.level;

    // Scale enemy to player level (Fibonacci-based scaling)
    const levelDiff = Math.max(0, playerLevel - (enemyTemplate.tier * 10));
    const levelScale = 1 + (levelDiff * 0.05); // 5% per level

    const enemy = {
        ...enemyTemplate,
        hp: Math.floor(enemyTemplate.baseHp * levelScale),
        maxHp: Math.floor(enemyTemplate.baseHp * levelScale),
        atk: Math.floor(enemyTemplate.baseAtk * levelScale),
        def: Math.floor(enemyTemplate.baseDef * levelScale),
        spd: Math.floor(enemyTemplate.baseSpd * levelScale)
    };

    // Initialize battle state with arena positions
    // Player starts at center (0), enemy at outer ring based on enemy type
    const enemyStartPos = enemy.isBoss ? 6 : (3 + Math.floor(Math.random() * 3)); // Bosses at far, others at mid

    // Initialize card deck
    const deck = initializeDeck();

    battleState = {
        active: true,
        player: playerStats,
        enemy: enemy,
        turn: 1,
        phase: 'player',
        playerHp: playerStats.maxHp,
        playerMp: playerStats.maxMp,
        enemyHp: enemy.hp,
        playerPosition: 0,        // Player starts at center
        enemyPosition: enemyStartPos,
        // Card system
        deck: deck.slice(5),      // Rest of deck after initial draw
        hand: deck.slice(0, 5),   // Draw initial hand of 5 cards
        discardPile: [],
        cardsPerTurn: 3,
        maxHandSize: 5,
        // Status effects
        buffs: [],
        debuffs: [],
        enemyDebuffs: [],
        currentBlock: 0,
        isStunned: false,
        hasCounter: false,
        isExposed: false,
        cooldowns: {},
        log: [`Battle started against ${enemy.name}!`, `You are at ${ARENA_POSITIONS[0].name}, enemy at ${ARENA_POSITIONS[enemyStartPos].name}`, `Drew 5 cards - Choose wisely!`]
    };

    // Dispatch battle start event
    document.dispatchEvent(new CustomEvent('pumparena:battle-start', {
        detail: { enemy: enemy.name, enemyHp: enemy.hp }
    }));

    return {
        success: true,
        battle: getBattleState()
    };
}

/**
 * Move player to a new position
 */
function movePlayer(targetPos) {
    if (!battleState.active) {
        return { success: false, message: 'No active battle' };
    }

    if (typeof targetPos !== 'number' || !ARENA_POSITIONS[targetPos]) {
        return { success: false, message: 'Invalid position' };
    }

    if (targetPos === battleState.playerPosition) {
        return { success: false, message: 'Already at this position' };
    }

    if (targetPos === battleState.enemyPosition) {
        return { success: false, message: 'Position occupied by enemy' };
    }

    if (!canMoveTo(battleState.playerPosition, targetPos)) {
        return { success: false, message: 'Cannot move there from current position' };
    }

    const oldPos = ARENA_POSITIONS[battleState.playerPosition];
    const newPos = ARENA_POSITIONS[targetPos];

    battleState.playerPosition = targetPos;
    battleState.log.push(`Moved from ${oldPos.name} to ${newPos.name}`);

    // Enemy gets a turn after player moves
    if (battleState.enemyHp > 0 && battleState.playerHp > 0) {
        const enemyResult = enemyTurn();
    }

    // Reduce cooldowns
    Object.keys(battleState.cooldowns).forEach(key => {
        if (battleState.cooldowns[key] > 0) {
            battleState.cooldowns[key]--;
        }
    });

    battleState.turn++;

    return {
        success: true,
        message: `Moved to ${newPos.name}`,
        state: getBattleState()
    };
}

/**
 * Get current battle state (safe copy)
 */
function getBattleState() {
    if (!battleState.active) return null;

    const playerPos = ARENA_POSITIONS[battleState.playerPosition];
    const enemyPos = ARENA_POSITIONS[battleState.enemyPosition];
    const distance = getPositionDistance(battleState.playerPosition, battleState.enemyPosition);

    // Get full card objects for hand
    const handCards = battleState.hand.map(cardId => ({
        ...ACTION_CARDS[cardId],
        id: cardId
    })).filter(c => c.name); // Filter out invalid cards

    return {
        active: battleState.active,
        turn: battleState.turn,
        phase: battleState.phase,
        arena: {
            playerPosition: battleState.playerPosition,
            enemyPosition: battleState.enemyPosition,
            playerRing: playerPos?.ring || 'close',
            enemyRing: enemyPos?.ring || 'far',
            distance,
            validMoves: ARENA_ADJACENCY[battleState.playerPosition]?.filter(p => p !== battleState.enemyPosition) || []
        },
        player: {
            hp: battleState.playerHp,
            maxHp: battleState.player.maxHp,
            mp: battleState.playerMp,
            maxMp: battleState.player.maxMp,
            atk: battleState.player.atk,
            def: battleState.player.def,
            block: battleState.currentBlock,
            buffs: [...battleState.buffs],
            hasCounter: battleState.hasCounter
        },
        enemy: {
            name: battleState.enemy.name,
            icon: battleState.enemy.icon,
            hp: battleState.enemyHp,
            maxHp: battleState.enemy.maxHp,
            atk: battleState.enemy.atk,
            def: battleState.enemy.def,
            spd: battleState.enemy.spd,
            isBoss: battleState.enemy.isBoss || false,
            isStunned: battleState.isStunned,
            isExposed: battleState.isExposed,
            debuffs: [...battleState.enemyDebuffs]
        },
        // Card system
        cards: {
            hand: handCards,
            handSize: battleState.hand.length,
            deckSize: battleState.deck.length,
            discardSize: battleState.discardPile.length
        },
        cooldowns: { ...battleState.cooldowns },
        log: [...battleState.log.slice(-5)] // Last 5 log entries
    };
}

// ============================================
// CARD-BASED COMBAT ACTIONS
// ============================================

/**
 * Play a card from hand
 * @param {number} cardIndex - Index of card in hand to play
 * @param {number} targetPosition - Optional target position for movement cards
 * @returns {Object} Result of playing the card
 */
function playCard(cardIndex, targetPosition = null) {
    // Rate limiting
    const rateCheck = BattleRateLimiter.checkAction();
    if (!rateCheck.allowed) {
        return { success: false, message: rateCheck.message };
    }

    if (!battleState.active) {
        return { success: false, message: 'No active battle' };
    }

    if (battleState.phase !== 'player') {
        return { success: false, message: 'Not your turn!' };
    }

    if (cardIndex < 0 || cardIndex >= battleState.hand.length) {
        return { success: false, message: 'Invalid card selection' };
    }

    const cardId = battleState.hand[cardIndex];
    const card = ACTION_CARDS[cardId];

    if (!card) {
        return { success: false, message: 'Invalid card' };
    }

    // Check MP cost
    if (card.mpCost && battleState.playerMp < card.mpCost) {
        return { success: false, message: 'Not enough energy!' };
    }

    // Check token cost
    if (card.tokenCost) {
        const state = window.PumpArenaState?.get();
        if (!state || state.resources.tokens < card.tokenCost) {
            return { success: false, message: 'Not enough tokens!' };
        }
    }

    BattleRateLimiter.recordAction();

    // Deduct costs
    if (card.mpCost) {
        battleState.playerMp -= card.mpCost;
    }
    if (card.tokenCost) {
        window.PumpArenaState.addTokens(-card.tokenCost);
        battleState.log.push(`Burned ${card.tokenCost} tokens!`);
    }

    // Remove card from hand and add to discard pile
    battleState.hand.splice(cardIndex, 1);
    battleState.discardPile.push(cardId);

    // Execute card effect
    const result = executeCardEffect(card, targetPosition);

    battleState.log.push(`Played ${card.name}!`);

    // Check for battle end after player action
    if (battleState.enemyHp <= 0) {
        result.victory = true;
        result.rewards = endBattle(true);
        return { success: true, ...result, state: getBattleState() };
    }

    return { success: true, ...result, state: getBattleState() };
}

/**
 * Execute card effect
 */
function executeCardEffect(card, targetPosition) {
    const result = { damage: 0, healed: 0, blocked: 0, effects: [] };

    // Get position modifiers
    const playerRing = ARENA_POSITIONS[battleState.playerPosition]?.ring || 'mid';
    const ringMod = RING_MODIFIERS[playerRing];
    const distance = getPositionDistance(battleState.playerPosition, battleState.enemyPosition);

    // Handle damage
    if (card.damage) {
        let damage = card.damage;

        // Add player ATK
        damage += Math.floor(battleState.player.atk / 2);

        // Add stat bonus
        if (card.statBonus) {
            const state = window.PumpArenaState?.get();
            if (state) {
                damage += state.stats[card.statBonus] || 0;
            }
        }

        // Apply position modifiers (melee if close, ranged if far)
        const isMelee = distance <= 1;
        if (isMelee) {
            damage = Math.floor(damage * ringMod.melee);
        } else {
            damage = Math.floor(damage * ringMod.ranged);
        }

        // FOMO effect: damage scales with missing HP
        if (card.effects.includes('fomo')) {
            const missingHpPercent = 1 - (battleState.playerHp / battleState.player.maxHp);
            const fomoBonus = 1 + (missingHpPercent * 2);
            damage = Math.floor(damage * fomoBonus);
            if (missingHpPercent > 0.3) {
                battleState.log.push(`FOMO bonus! (+${Math.floor(missingHpPercent * 200)}%)`);
            }
        }

        // Expose effect: enemy takes extra damage
        if (battleState.isExposed) {
            damage = Math.floor(damage * 1.25);
            battleState.log.push('Enemy exposed! (+25% damage)');
        }

        // Pierce effect: ignores defense
        if (!card.effects.includes('pierce')) {
            const defReduction = Math.floor(battleState.enemy.def / getBattleFib(5));
            damage = Math.max(1, damage - defReduction);
        } else {
            battleState.log.push('Piercing attack! Ignores defense');
        }

        // Critical hit check
        if (Math.random() * 100 < battleState.player.crt) {
            damage = Math.floor(damage * 1.5);
            battleState.log.push('CRITICAL HIT!');
            result.critical = true;
        }

        // Apply damage
        battleState.enemyHp -= damage;
        battleState.enemyHp = Math.max(0, battleState.enemyHp);
        result.damage = damage;
        battleState.log.push(`Dealt ${damage} damage!`);

        // Lifesteal effect
        if (card.effects.includes('lifesteal')) {
            const healAmount = Math.floor(damage * 0.5);
            battleState.playerHp = Math.min(battleState.player.maxHp, battleState.playerHp + healAmount);
            result.healed = healAmount;
            battleState.log.push(`Lifesteal: +${healAmount} HP`);
        }
    }

    // Handle block
    if (card.block) {
        let blockAmount = card.block;

        // Add stat bonus
        if (card.statBonus) {
            const state = window.PumpArenaState?.get();
            if (state) {
                blockAmount += Math.floor((state.stats[card.statBonus] || 0) / 2);
            }
        }

        battleState.currentBlock += blockAmount;
        result.blocked = blockAmount;
        battleState.log.push(`Gained ${blockAmount} block`);
    }

    // Handle heal
    if (card.heal) {
        const healAmount = card.heal;
        battleState.playerHp = Math.min(battleState.player.maxHp, battleState.playerHp + healAmount);
        result.healed = (result.healed || 0) + healAmount;
        battleState.log.push(`Healed ${healAmount} HP`);
    }

    // Handle MP restore
    if (card.mpRestore) {
        battleState.playerMp = Math.min(battleState.player.maxMp, battleState.playerMp + card.mpRestore);
        battleState.log.push(`Restored ${card.mpRestore} energy`);
    }

    // Process card effects
    for (const effect of card.effects) {
        switch (effect) {
            case 'weaken':
                battleState.enemyDebuffs.push({ type: 'weaken', amount: getBattleFib(4), duration: 2 });
                battleState.log.push('Enemy weakened! (-ATK)');
                result.effects.push('weaken');
                break;

            case 'burn':
                battleState.enemyDebuffs.push({ type: 'burn', damage: getBattleFib(4), duration: 3 });
                battleState.log.push('Enemy burning! (DoT)');
                result.effects.push('burn');
                break;

            case 'stun':
                battleState.isStunned = true;
                battleState.log.push('Enemy stunned! (Skips next turn)');
                result.effects.push('stun');
                break;

            case 'defense_buff':
                battleState.buffs.push({ type: 'defense_buff', amount: getBattleFib(5), duration: 2 });
                battleState.log.push('Defense increased!');
                result.effects.push('defense_buff');
                break;

            case 'attack_buff':
                battleState.buffs.push({ type: 'attack_buff', amount: getBattleFib(5), duration: 2 });
                battleState.log.push('Attack increased!');
                result.effects.push('attack_buff');
                break;

            case 'speed_buff':
                battleState.buffs.push({ type: 'speed_buff', amount: getBattleFib(4), duration: 2 });
                battleState.log.push('Speed increased!');
                result.effects.push('speed_buff');
                break;

            case 'reflect':
                battleState.buffs.push({ type: 'reflect', amount: 0.25, duration: 1 });
                battleState.log.push('Reflecting damage!');
                result.effects.push('reflect');
                break;

            case 'immunity':
                battleState.buffs.push({ type: 'immunity', duration: 1 });
                battleState.log.push('Immune to effects!');
                result.effects.push('immunity');
                break;

            case 'expose':
                battleState.isExposed = true;
                battleState.log.push('Enemy exposed! (+25% damage taken)');
                result.effects.push('expose');
                break;

            case 'counter':
                battleState.hasCounter = true;
                battleState.log.push('Counter ready!');
                result.effects.push('counter');
                break;

            case 'move':
                // Movement card - handled separately
                if (targetPosition !== null && canMoveTo(battleState.playerPosition, targetPosition)) {
                    const oldPos = ARENA_POSITIONS[battleState.playerPosition];
                    const newPos = ARENA_POSITIONS[targetPosition];
                    battleState.playerPosition = targetPosition;
                    battleState.log.push(`Moved to ${newPos.name}`);
                    result.effects.push('move');
                }
                break;

            case 'swap_positions':
                // Swap positions with enemy
                const tempPos = battleState.playerPosition;
                battleState.playerPosition = battleState.enemyPosition;
                battleState.enemyPosition = tempPos;
                battleState.log.push('Swapped positions with enemy!');
                result.effects.push('swap');
                break;
        }
    }

    return result;
}

/**
 * End player turn and start enemy turn
 */
function endPlayerTurn() {
    if (!battleState.active || battleState.phase !== 'player') {
        return { success: false, message: 'Cannot end turn now' };
    }

    battleState.phase = 'enemy';

    // Process burn damage on enemy
    battleState.enemyDebuffs = battleState.enemyDebuffs.filter(debuff => {
        if (debuff.type === 'burn' && debuff.damage) {
            battleState.enemyHp -= debuff.damage;
            battleState.log.push(`Burn deals ${debuff.damage} damage!`);
        }
        debuff.duration--;
        return debuff.duration > 0;
    });

    // Check if enemy died from burn
    if (battleState.enemyHp <= 0) {
        const rewards = endBattle(true);
        return { success: true, victory: true, rewards, state: getBattleState() };
    }

    // Enemy turn (if not stunned)
    let enemyResult = null;
    if (battleState.isStunned) {
        battleState.log.push(`${battleState.enemy.name} is stunned and skips their turn!`);
        battleState.isStunned = false;
    } else {
        enemyResult = enemyTurn();
    }

    // Check for player defeat
    if (battleState.playerHp <= 0) {
        endBattle(false);
        return { success: true, defeat: true, enemyAction: enemyResult, state: getBattleState() };
    }

    // Start new turn
    battleState.turn++;
    battleState.phase = 'player';

    // Reset block
    battleState.currentBlock = 0;

    // Reset counter
    battleState.hasCounter = false;

    // Reset exposed
    battleState.isExposed = false;

    // Process buff durations
    battleState.buffs = battleState.buffs.filter(buff => {
        buff.duration--;
        return buff.duration > 0;
    });

    // Draw cards (up to max hand size)
    const cardsToDraw = Math.min(battleState.cardsPerTurn, battleState.maxHandSize - battleState.hand.length);
    if (cardsToDraw > 0) {
        const newCards = drawCards(cardsToDraw);
        battleState.hand.push(...newCards);
        battleState.log.push(`Drew ${newCards.length} card${newCards.length > 1 ? 's' : ''}`);
    }

    // Regenerate some MP each turn
    const mpRegen = getBattleFib(4); // 3 MP per turn
    battleState.playerMp = Math.min(battleState.player.maxMp, battleState.playerMp + mpRegen);

    return { success: true, enemyAction: enemyResult, state: getBattleState() };
}

// ============================================
// LEGACY COMBAT ACTIONS (for compatibility)
// ============================================

/**
 * Execute a combat skill
 * @param {string} skillId - Skill to use
 * @returns {Object} Action result
 */
function useSkill(skillId) {
    // Rate limiting (Security by Design)
    const rateCheck = BattleRateLimiter.checkAction();
    if (!rateCheck.allowed) {
        return { success: false, message: rateCheck.message };
    }

    // Validation
    if (!battleState.active) {
        return { success: false, message: 'No active battle' };
    }

    if (typeof skillId !== 'string' || !COMBAT_SKILLS[skillId]) {
        return { success: false, message: 'Invalid skill' };
    }

    const skill = COMBAT_SKILLS[skillId];

    // Check level requirement
    if (skill.requiresLevel && battleState.player.level < skill.requiresLevel) {
        return { success: false, message: `Requires level ${skill.requiresLevel}` };
    }

    // Check cooldown
    if (battleState.cooldowns[skillId] > 0) {
        return { success: false, message: `On cooldown (${battleState.cooldowns[skillId]} turns)` };
    }

    // Check MP cost
    if (battleState.playerMp < skill.mpCost) {
        return { success: false, message: 'Not enough MP' };
    }

    // Check token cost (for burn attacks)
    if (skill.tokenCost) {
        const state = window.PumpArenaState?.get();
        if (!state || state.resources.tokens < skill.tokenCost) {
            return { success: false, message: 'Not enough tokens to burn' };
        }
    }

    BattleRateLimiter.recordAction();

    // Deduct costs
    battleState.playerMp -= skill.mpCost;
    if (skill.tokenCost) {
        window.PumpArenaState.addTokens(-skill.tokenCost);
        battleState.log.push(`Burned ${skill.tokenCost} tokens!`);
    }

    // Set cooldown
    if (skill.cooldown > 0) {
        battleState.cooldowns[skillId] = skill.cooldown;
    }

    // Execute skill effect
    let result = executeSkillEffect(skill);

    // Enemy turn (if battle not over)
    if (battleState.active && battleState.enemyHp > 0 && battleState.playerHp > 0) {
        const enemyResult = enemyTurn();
        result.enemyAction = enemyResult;
    }

    // Check battle end
    if (battleState.enemyHp <= 0) {
        result.victory = true;
        result.rewards = endBattle(true);
    } else if (battleState.playerHp <= 0) {
        result.defeat = true;
        endBattle(false);
    }

    // Reduce cooldowns
    Object.keys(battleState.cooldowns).forEach(key => {
        if (battleState.cooldowns[key] > 0) {
            battleState.cooldowns[key]--;
        }
    });

    // Process buff durations
    battleState.buffs = battleState.buffs.filter(buff => {
        buff.duration--;
        return buff.duration > 0;
    });

    battleState.turn++;

    return {
        success: true,
        ...result,
        state: getBattleState()
    };
}

/**
 * Execute skill effect
 */
function executeSkillEffect(skill) {
    const result = { damage: 0, healed: 0, buffApplied: null };

    // Calculate base damage
    if (skill.damageMultiplier > 0) {
        let baseDamage = battleState.player.atk;

        // Add stat bonus
        if (skill.statBonus) {
            const state = window.PumpArenaState?.get();
            if (state) {
                baseDamage += state.stats[skill.statBonus] || 0;
            }
        }

        // Apply multiplier
        let damage = Math.floor(baseDamage * skill.damageMultiplier);

        // Apply position modifier based on attack type and ring
        const playerRing = ARENA_POSITIONS[battleState.playerPosition]?.ring || 'mid';
        const ringMod = RING_MODIFIERS[playerRing];
        const distance = getPositionDistance(battleState.playerPosition, battleState.enemyPosition);

        // Determine attack type: melee if close, ranged if far
        const isMelee = skill.type === 'attack' && distance <= 1;
        const isRanged = skill.type === 'attack' && distance > 1;

        if (isMelee) {
            damage = Math.floor(damage * ringMod.melee);
            if (ringMod.melee > 1) {
                battleState.log.push(`Close range bonus! (+${Math.floor((ringMod.melee - 1) * 100)}%)`);
            }
        } else if (isRanged) {
            damage = Math.floor(damage * ringMod.ranged);
            if (ringMod.ranged > 1) {
                battleState.log.push(`Long range bonus! (+${Math.floor((ringMod.ranged - 1) * 100)}%)`);
            }
        }

        // Distance penalty for melee attacks at far range
        if (isMelee && distance > 1) {
            const distancePenalty = 0.7;
            damage = Math.floor(damage * distancePenalty);
            battleState.log.push(`Distance penalty (-30%)`);
        }

        // FOMO effect: damage scales with missing HP
        if (skill.effect === 'fomo') {
            const missingHpPercent = 1 - (battleState.playerHp / battleState.player.maxHp);
            const fomoBonus = 1 + (missingHpPercent * 2); // Up to 3x damage at 1 HP
            damage = Math.floor(damage * fomoBonus);
            if (missingHpPercent > 0.5) {
                battleState.log.push(`FOMO intensifies! (${Math.floor(fomoBonus * 100)}% power)`);
            }
        }

        // Check accuracy
        if (skill.accuracy && Math.random() * 100 > skill.accuracy) {
            battleState.log.push(`${skill.name} missed!`);
            return { ...result, missed: true };
        }

        // Critical hit check
        if (Math.random() * 100 < battleState.player.crt) {
            damage = Math.floor(damage * 1.5);
            battleState.log.push(`Critical hit!`);
            result.critical = true;
        }

        // Apply defense reduction (Fibonacci-based)
        const defReduction = Math.floor(battleState.enemy.def / getBattleFib(5));
        damage = Math.max(1, damage - defReduction);

        // Apply attack buffs
        const atkBuff = battleState.buffs.find(b => b.type === 'attack_buff');
        if (atkBuff) {
            damage = Math.floor(damage + atkBuff.amount);
            battleState.log.push(`Attack buff adds +${atkBuff.amount} damage!`);
        }

        battleState.enemyHp -= damage;
        battleState.enemyHp = Math.max(0, battleState.enemyHp);

        result.damage = damage;
        battleState.log.push(`${skill.name} dealt ${damage} damage!`);
    }

    // Apply heal
    if (skill.effect === 'heal') {
        const healAmount = skill.healAmount + Math.floor(battleState.player.def / 2);
        battleState.playerHp = Math.min(battleState.player.maxHp, battleState.playerHp + healAmount);
        result.healed = healAmount;
        battleState.log.push(`Healed for ${healAmount} HP!`);
    }

    // Apply defense buff
    if (skill.effect === 'defense_buff') {
        battleState.buffs.push({
            type: 'defense_buff',
            amount: skill.buffAmount,
            duration: skill.duration
        });
        result.buffApplied = 'Defense Up';
        battleState.log.push(`Defense increased by ${skill.buffAmount}!`);
    }

    // Apply attack buff
    if (skill.effect === 'attack_buff') {
        battleState.buffs.push({
            type: 'attack_buff',
            amount: skill.buffAmount,
            duration: skill.duration
        });
        result.buffApplied = 'Attack Up';
        battleState.log.push(`Attack increased by ${skill.buffAmount}!`);
    }

    return result;
}

/**
 * Enemy turn AI - Strategic behavior based on situation
 */
function enemyTurn() {
    const enemy = battleState.enemy;
    const playerHpPercent = battleState.playerHp / battleState.player.maxHp;
    const enemyHpPercent = battleState.enemyHp / enemy.maxHp;

    // Choose attack type based on situation
    let attackType = 'normal';
    let damageMultiplier = 1.0;
    let attackName = 'attacks';

    // Boss enemies have special attacks
    if (enemy.isBoss) {
        const roll = Math.random();
        if (enemyHpPercent < 0.3 && roll < 0.4) {
            // Desperate attack when low HP
            attackType = 'desperate';
            damageMultiplier = 1.8;
            attackName = 'unleashes a desperate attack';
        } else if (playerHpPercent < 0.3 && roll < 0.5) {
            // Finishing blow attempt
            attackType = 'finisher';
            damageMultiplier = 2.0;
            attackName = 'attempts a finishing blow';
        } else if (roll < 0.25) {
            // Special attack
            attackType = 'special';
            damageMultiplier = 1.5;
            attackName = 'uses a special attack';
        }
    } else {
        // Regular enemies have simpler AI
        const roll = Math.random();
        if (playerHpPercent < 0.2 && roll < 0.3) {
            attackType = 'aggressive';
            damageMultiplier = 1.3;
            attackName = 'attacks aggressively';
        } else if (roll < 0.15) {
            attackType = 'heavy';
            damageMultiplier = 1.4;
            attackName = 'uses a heavy attack';
        }
    }

    // Apply weaken debuff to enemy attack
    const weakenDebuff = battleState.enemyDebuffs.find(d => d.type === 'weaken');
    if (weakenDebuff) {
        damageMultiplier *= (1 - weakenDebuff.amount / 100);
    }

    // Calculate base damage
    let damage = Math.floor(enemy.atk * damageMultiplier);

    // Critical hit check (higher chance on special attacks)
    let critical = false;
    const critChance = attackType === 'special' ? enemy.critChance * 1.5 : enemy.critChance;
    if (Math.random() * 100 < critChance) {
        damage = Math.floor(damage * 1.5);
        critical = true;
    }

    // Apply player defense
    const defBuff = battleState.buffs.find(b => b.type === 'defense_buff');
    const totalDef = battleState.player.def + (defBuff ? defBuff.amount : 0);
    const defReduction = Math.floor(totalDef / getBattleFib(5));
    damage = Math.max(1, damage - defReduction);

    // Check for counter
    if (battleState.hasCounter) {
        const counterDamage = Math.floor(damage * 0.5);
        battleState.enemyHp -= counterDamage;
        battleState.log.push(`Counter! ${enemy.name} takes ${counterDamage} damage!`);
    }

    // Apply block first
    let blockedDamage = 0;
    if (battleState.currentBlock > 0) {
        blockedDamage = Math.min(damage, battleState.currentBlock);
        damage -= blockedDamage;
        battleState.currentBlock -= blockedDamage;
        if (blockedDamage > 0) {
            battleState.log.push(`Blocked ${blockedDamage} damage!`);
        }
    }

    // Check for reflect
    const reflectBuff = battleState.buffs.find(b => b.type === 'reflect');
    if (reflectBuff && damage > 0) {
        const reflectedDamage = Math.floor(damage * reflectBuff.amount);
        battleState.enemyHp -= reflectedDamage;
        battleState.log.push(`Reflected ${reflectedDamage} damage!`);
    }

    // Apply remaining damage to player
    if (damage > 0) {
        battleState.playerHp -= damage;
        battleState.playerHp = Math.max(0, battleState.playerHp);
    }

    let logMsg = '';
    if (critical) {
        logMsg = `${enemy.name} ${attackName} - CRITICAL HIT for ${damage + blockedDamage} damage!`;
    } else {
        logMsg = `${enemy.name} ${attackName} for ${damage + blockedDamage} damage!`;
    }

    battleState.log.push(logMsg);

    return { damage: damage + blockedDamage, actualDamage: damage, blocked: blockedDamage, critical, attackType };
}

// ============================================
// BATTLE END
// ============================================

/**
 * End the battle
 * @param {boolean} victory - Did player win?
 * @returns {Object} Rewards if victory
 */
function endBattle(victory) {
    if (!battleState.active) return null;

    const enemy = battleState.enemy;
    let rewards = null;

    if (victory) {
        // Calculate rewards with Fibonacci tier bonus
        const tier = window.PumpArenaState?.getCurrentTier() || { index: 0 };
        const tierMultiplier = 1 + (tier.index * 0.1);

        const xpReward = Math.floor(enemy.rewards.xp * tierMultiplier);
        const tokenReward = Math.floor(enemy.rewards.tokens * tierMultiplier);

        // Apply rewards
        window.PumpArenaState?.addXP(xpReward);
        window.PumpArenaState?.addTokens(tokenReward);

        // Drop items (Fibonacci-based chance)
        const droppedItems = [];
        if (enemy.drops && enemy.drops.length > 0) {
            enemy.drops.forEach(itemId => {
                // Drop chance: fib[6]/100 = 8% base, improved by luck
                const state = window.PumpArenaState?.get();
                const luckBonus = state ? state.stats.lck : 0;
                const dropChance = getBattleFib(6) + Math.floor(luckBonus / 2);

                if (Math.random() * 100 < dropChance) {
                    droppedItems.push(itemId);
                    // Add to inventory
                    window.PumpArenaInventory?.addItem(itemId, 1);
                }
            });
        }

        rewards = {
            xp: xpReward,
            tokens: tokenReward,
            items: droppedItems
        };

        battleState.log.push(`Victory! Gained ${xpReward} XP and ${tokenReward} tokens!`);

        // Dispatch victory event
        document.dispatchEvent(new CustomEvent('pumparena:battle-victory', {
            detail: { enemy: enemy.name, rewards }
        }));
    } else {
        battleState.log.push(`Defeated by ${enemy.name}...`);

        // Dispatch defeat event
        document.dispatchEvent(new CustomEvent('pumparena:battle-defeat', {
            detail: { enemy: enemy.name }
        }));
    }

    // Reset battle state
    battleState.active = false;

    return rewards;
}

/**
 * Flee from battle (costs influence)
 */
function fleeBattle() {
    if (!battleState.active) {
        return { success: false, message: 'No active battle' };
    }

    // Flee costs fib[5] = 5 influence
    const fleeCost = getBattleFib(5);
    const state = window.PumpArenaState?.get();

    if (!state || state.resources.influence < fleeCost) {
        return { success: false, message: `Need ${fleeCost} influence to flee` };
    }

    window.PumpArenaState.spendInfluence(fleeCost);

    battleState.log.push('Fled from battle!');
    battleState.active = false;

    document.dispatchEvent(new CustomEvent('pumparena:battle-flee', {
        detail: { enemy: battleState.enemy.name }
    }));

    return { success: true, message: 'Escaped successfully!' };
}

// ============================================
// BATTLE ENCOUNTERS
// ============================================

/**
 * Get random enemy for player's level
 */
function getRandomEnemy() {
    const state = window.PumpArenaState?.get();
    if (!state) return null;

    const playerLevel = state.progression.level;
    const playerTier = Math.floor(playerLevel / 10);

    // Filter enemies by tier
    const availableEnemies = Object.values(ENEMY_TYPES).filter(e =>
        e.tier <= playerTier && e.tier >= Math.max(0, playerTier - 1)
    );

    if (availableEnemies.length === 0) {
        return Object.values(ENEMY_TYPES)[0]; // Fallback to first enemy
    }

    // Random selection
    return availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
}

/**
 * Start a random encounter
 */
function randomEncounter() {
    const enemy = getRandomEnemy();
    if (!enemy) {
        return { success: false, message: 'No enemies available' };
    }

    return startBattle(enemy.id);
}

// ============================================
// BATTLE UI RENDERER
// ============================================

function renderBattleUI(container) {
    const state = getBattleState();
    const combatStats = calculateCombatStats();

    if (!state) {
        // No active battle - show arena selection
        container.innerHTML = `
            <div style="background: #12121a; border-radius: 16px; overflow: hidden; border: 2px solid #dc2626;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1a1a24, #2d1515); padding: 20px; border-bottom: 1px solid #dc262640;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #dc2626, #991b1b); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">&#9876;</div>
                        <div>
                            <h3 style="color: #ffffff; margin: 0; font-size: 20px;">Battle Arena</h3>
                            <div style="color: #dc2626; font-size: 12px;">Test your skills against crypto threats!</div>
                        </div>
                    </div>
                </div>

                <!-- Combat Stats Overview -->
                <div style="padding: 15px 20px; background: #1a1a24; border-bottom: 1px solid #333;">
                    <div style="color: #9ca3af; font-size: 11px; margin-bottom: 8px; text-transform: uppercase;">Your Combat Stats</div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #ef4444;">&#9876;</span>
                            <span style="color: #ef4444; font-weight: 600;">${combatStats?.atk || 0}</span>
                            <span style="color: #666; font-size: 11px;">ATK</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #3b82f6;">&#128737;</span>
                            <span style="color: #3b82f6; font-weight: 600;">${combatStats?.def || 0}</span>
                            <span style="color: #666; font-size: 11px;">DEF</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #22c55e;">&#9889;</span>
                            <span style="color: #22c55e; font-weight: 600;">${combatStats?.spd || 0}</span>
                            <span style="color: #666; font-size: 11px;">SPD</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #eab308;">&#9733;</span>
                            <span style="color: #eab308; font-weight: 600;">${combatStats?.crt || 0}%</span>
                            <span style="color: #666; font-size: 11px;">CRIT</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #ec4899;">&#10084;</span>
                            <span style="color: #ec4899; font-weight: 600;">${combatStats?.maxHp || 0}</span>
                            <span style="color: #666; font-size: 11px;">HP</span>
                        </div>
                    </div>
                </div>

                <!-- How Combat Works -->
                <div style="padding: 15px 20px; background: linear-gradient(135deg, #1a1a24, #1a2020); border-bottom: 1px solid #333;">
                    <div style="color: #ffffff; font-size: 13px; font-weight: 600; margin-bottom: 10px;">&#128161; How Combat Works</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; color: #9ca3af;">
                        <div><span style="color: #ef4444;">ATK</span> = Development + Strategy</div>
                        <div><span style="color: #3b82f6;">DEF</span> = Community + Charisma</div>
                        <div><span style="color: #22c55e;">SPD</span> = Marketing + Luck</div>
                        <div><span style="color: #eab308;">CRIT</span> = (Luck + Dev) / 2</div>
                    </div>
                </div>

                <!-- Quick Battle -->
                <div style="padding: 20px;">
                    <button id="random-encounter-btn" style="
                        width: 100%; padding: 15px; margin-bottom: 20px;
                        background: linear-gradient(135deg, #dc2626, #991b1b);
                        border: 2px solid #ef4444; border-radius: 12px;
                        color: #fff; font-size: 16px; font-weight: 600;
                        cursor: pointer; transition: all 0.2s;
                        display: flex; align-items: center; justify-content: center; gap: 10px;
                    " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 0 20px #dc262660';"
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                        <span style="font-size: 20px;">&#127922;</span>
                        Random Encounter
                    </button>

                    <!-- Enemy Selection -->
                    <div style="color: #ffffff; font-size: 14px; font-weight: 600; margin-bottom: 15px;">Choose Your Opponent</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                        ${renderEnemyList()}
                    </div>
                </div>
            </div>
        `;

        container.querySelector('#random-encounter-btn')?.addEventListener('click', () => {
            const result = randomEncounter();
            if (result.success) {
                renderBattleUI(container);
            } else {
                showBattleNotification(result.message, 'error');
            }
        });

        container.querySelectorAll('.enemy-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const enemyId = btn.dataset.enemy;
                const result = startBattle(enemyId);
                if (result.success) {
                    renderBattleUI(container);
                } else {
                    showBattleNotification(result.message, 'error');
                }
            });
        });

        return;
    }

    // Active battle UI
    const playerHpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
    const playerMpPercent = Math.max(0, (state.player.mp / state.player.maxMp) * 100);
    const enemyHpPercent = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100);

    const hpColor = playerHpPercent > 50 ? '#22c55e' : playerHpPercent > 25 ? '#eab308' : '#ef4444';
    const enemyHpColor = enemyHpPercent > 50 ? '#ef4444' : enemyHpPercent > 25 ? '#eab308' : '#22c55e';

    // Strategic advice based on situation
    const playerAdvantage = state.player.hp > state.enemy.hp;
    const lowHealth = playerHpPercent < 30;
    const enemyLowHealth = enemyHpPercent < 30;
    let strategyTip = '';
    if (lowHealth) strategyTip = '⚠️ Low HP! Consider defending or using potions';
    else if (enemyLowHealth) strategyTip = '🎯 Enemy is weak! Go for the kill!';
    else if (playerAdvantage) strategyTip = '💪 You have the advantage! Keep attacking';
    else strategyTip = '⚔️ Stay focused and watch your timing';

    // Calculate estimated damage for skills
    const getSkillDamage = (skill) => {
        if (!skill.damageMultiplier || skill.damageMultiplier === 0) return 0;
        const baseDmg = (combatStats?.atk || 10) * skill.damageMultiplier;
        return Math.floor(baseDmg);
    };

    container.innerHTML = `
        <div style="background: #12121a; border-radius: 16px; overflow: hidden; border: 2px solid #dc2626;">
            <!-- Battle Header -->
            <div style="background: linear-gradient(135deg, #1a1a24, #2d1515); padding: 15px 20px; border-bottom: 1px solid #dc262640;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #dc2626, #991b1b); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 20px;">⚔️</span>
                            </div>
                            <div>
                                <div style="color: #ffffff; font-weight: 600; font-size: 16px;">Turn ${state.turn}</div>
                                <div style="color: #dc2626; font-size: 11px;">Your Move</div>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <div style="padding: 8px 12px; background: #22c55e15; border: 1px solid #22c55e40; border-radius: 8px; text-align: center;">
                            <div style="color: #22c55e; font-size: 14px; font-weight: bold;">${combatStats?.atk || 0}</div>
                            <div style="color: #22c55e80; font-size: 9px;">ATK</div>
                        </div>
                        <div style="padding: 8px 12px; background: #3b82f615; border: 1px solid #3b82f640; border-radius: 8px; text-align: center;">
                            <div style="color: #3b82f6; font-size: 14px; font-weight: bold;">${combatStats?.def || 0}</div>
                            <div style="color: #3b82f680; font-size: 9px;">DEF</div>
                        </div>
                        <button id="flee-btn" style="
                            padding: 8px 16px; background: linear-gradient(135deg, #374151, #1f2937); border: 1px solid #4b5563;
                            border-radius: 8px; color: #9ca3af; font-size: 12px; cursor: pointer; transition: all 0.2s;
                        " onmouseover="this.style.borderColor='#ef4444'; this.style.color='#ef4444';" onmouseout="this.style.borderColor='#4b5563'; this.style.color='#9ca3af';">
                            🏃 Flee
                        </button>
                    </div>
                </div>
            </div>

            <!-- Strategy Tip -->
            <div style="padding: 10px 20px; background: linear-gradient(90deg, #1a1a24, #0a0a0f); border-bottom: 1px solid #333;">
                <div style="color: #fbbf24; font-size: 12px; text-align: center;">${strategyTip}</div>
            </div>

            <!-- Battle Field -->
            <div style="padding: 25px 20px; display: grid; grid-template-columns: 1fr 80px 1fr; gap: 15px; align-items: stretch; background: linear-gradient(180deg, #0a0a0f, #12121a);">
                <!-- Player Side -->
                <div style="background: linear-gradient(135deg, #1a2a1a, #0d200d); border: 2px solid #22c55e50; border-radius: 16px; padding: 20px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #22c55e, transparent);"></div>
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 0 20px #22c55e40;">🧑‍💻</div>
                        <div style="flex: 1;">
                            <div style="color: #22c55e; font-weight: 700; font-size: 16px;">You</div>
                            <div style="color: #86efac; font-size: 11px;">Level ${combatStats?.level || 1} • ${combatStats?.tier || 'EMBER'}</div>
                        </div>
                    </div>

                    <!-- HP Bar -->
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                            <span style="color: #22c55e; font-weight: 600;">❤️ HP</span>
                            <span style="color: ${hpColor}; font-weight: bold;">${state.player.hp} / ${state.player.maxHp}</span>
                        </div>
                        <div style="height: 14px; background: #0d200d; border-radius: 7px; overflow: hidden; border: 1px solid #22c55e30;">
                            <div style="height: 100%; width: ${playerHpPercent}%; background: linear-gradient(90deg, ${hpColor}, ${hpColor}cc); transition: width 0.5s ease; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- MP Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px;">
                            <span style="color: #3b82f6;">⚡ Energy</span>
                            <span style="color: #3b82f6;">${state.player.mp} / ${state.player.maxMp}</span>
                        </div>
                        <div style="height: 8px; background: #0d1520; border-radius: 4px; overflow: hidden; border: 1px solid #3b82f630;">
                            <div style="height: 100%; width: ${playerMpPercent}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.3s;"></div>
                        </div>
                    </div>

                    ${state.player.buffs?.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #22c55e30; display: flex; gap: 6px; flex-wrap: wrap;">
                            ${state.player.buffs.map(b => {
                                const buffInfo = b.type === 'defense_buff'
                                    ? { icon: '🛡️', color: '#3b82f6', name: 'DEF' }
                                    : b.type === 'attack_buff'
                                    ? { icon: '⚔️', color: '#ef4444', name: 'ATK' }
                                    : { icon: '✨', color: '#a855f7', name: 'BUFF' };
                                return `
                                    <span style="padding: 4px 10px; background: linear-gradient(135deg, ${buffInfo.color}30, ${buffInfo.color}10); border: 1px solid ${buffInfo.color}50; border-radius: 6px; font-size: 10px; color: ${buffInfo.color}; display: flex; align-items: center; gap: 4px;">
                                        ${buffInfo.icon} +${b.amount} ${buffInfo.name} <span style="opacity: 0.6;">(${b.duration}t)</span>
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- VS Indicator -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
                    <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #1a1a24, #0a0a0f); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #333; box-shadow: 0 0 30px rgba(0,0,0,0.5);">
                        <span style="color: #ef4444; font-weight: 900; font-size: 20px; text-shadow: 0 0 10px #ef444480;">VS</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                        <div style="width: 8px; height: 8px; background: #333; border-radius: 50%;"></div>
                        <div style="width: 8px; height: 8px; background: #333; border-radius: 50%;"></div>
                        <div style="width: 8px; height: 8px; background: #333; border-radius: 50%;"></div>
                    </div>
                </div>

                <!-- Enemy Side -->
                <div style="background: linear-gradient(135deg, #2d1515, #200d0d); border: 2px solid ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}50; border-radius: 16px; padding: 20px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}, transparent);"></div>
                    ${state.enemy.isBoss ? '<div style="position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; font-size: 9px; padding: 3px 8px; border-radius: 4px; font-weight: bold;">👑 BOSS</div>' : ''}

                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}, ${state.enemy.isBoss ? '#7c3aed' : '#dc2626'}); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 0 20px ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}40;">${state.enemy.icon}</div>
                        <div style="flex: 1;">
                            <div style="color: ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}; font-weight: 700; font-size: 16px;">${escapeHtml(state.enemy.name)}</div>
                            <div style="color: #f87171; font-size: 11px;">ATK: ${state.enemy.atk} • DEF: ${state.enemy.def}</div>
                        </div>
                    </div>

                    <!-- Enemy HP Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                            <span style="color: ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}; font-weight: 600;">❤️ HP</span>
                            <span style="color: ${enemyHpColor}; font-weight: bold;">${state.enemy.hp} / ${state.enemy.maxHp}</span>
                        </div>
                        <div style="height: 14px; background: #200d0d; border-radius: 7px; overflow: hidden; border: 1px solid ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}30;">
                            <div style="height: 100%; width: ${enemyHpPercent}%; background: linear-gradient(90deg, ${enemyHpColor}, ${enemyHpColor}cc); transition: width 0.5s ease; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Circular Arena -->
            <div style="padding: 15px 20px; background: linear-gradient(180deg, #0a0a0f, #05050a); border-top: 1px solid #222;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="color: #666; font-size: 11px; text-transform: uppercase;">🏟️ Arena Position</div>
                    <div style="display: flex; gap: 10px; font-size: 10px;">
                        <span style="color: #22c55e;">● CLOSE (+30% melee)</span>
                        <span style="color: #fbbf24;">● MID (balanced)</span>
                        <span style="color: #3b82f6;">● FAR (+30% ranged)</span>
                    </div>
                </div>
                <div style="position: relative; width: 100%; height: 180px; background: radial-gradient(circle at center, #0a0a0f 30%, #12121a 70%, #1a1a24 100%); border-radius: 50%; border: 2px solid #333; overflow: hidden;">
                    <!-- Arena rings -->
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; height: 60%; border: 2px dashed #fbbf2430; border-radius: 50%;"></div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 85%; border: 2px dashed #3b82f630; border-radius: 50%;"></div>

                    <!-- Position markers -->
                    ${Object.values(ARENA_POSITIONS).map(pos => {
                        const isPlayer = pos.id === state.arena.playerPosition;
                        const isEnemy = pos.id === state.arena.enemyPosition;
                        const canMoveHere = state.arena.validMoves.includes(pos.id);
                        const ringColor = pos.ring === 'close' ? '#22c55e' : pos.ring === 'mid' ? '#fbbf24' : '#3b82f6';

                        let content = '';
                        let bgColor = '#1a1a24';
                        let borderColor = `${ringColor}30`;
                        let cursor = 'default';
                        let size = 28;

                        if (isPlayer) {
                            content = '🧑‍💻';
                            bgColor = 'linear-gradient(135deg, #22c55e, #16a34a)';
                            borderColor = '#22c55e';
                            size = 36;
                        } else if (isEnemy) {
                            content = state.enemy.icon;
                            bgColor = `linear-gradient(135deg, ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}, ${state.enemy.isBoss ? '#7c3aed' : '#dc2626'})`;
                            borderColor = state.enemy.isBoss ? '#a855f7' : '#ef4444';
                            size = 36;
                        } else if (canMoveHere) {
                            content = '👆';
                            bgColor = `${ringColor}20`;
                            borderColor = `${ringColor}80`;
                            cursor = 'pointer';
                        } else {
                            content = '';
                            bgColor = '#12121a';
                        }

                        return `
                            <div class="${canMoveHere && !isPlayer && !isEnemy ? 'move-btn' : ''}"
                                 data-pos="${pos.id}"
                                 style="
                                     position: absolute;
                                     left: ${pos.x}%;
                                     top: ${pos.y}%;
                                     transform: translate(-50%, -50%);
                                     width: ${size}px;
                                     height: ${size}px;
                                     background: ${bgColor};
                                     border: 2px solid ${borderColor};
                                     border-radius: 50%;
                                     display: flex;
                                     align-items: center;
                                     justify-content: center;
                                     font-size: ${size * 0.5}px;
                                     cursor: ${cursor};
                                     transition: all 0.2s;
                                     z-index: ${isPlayer || isEnemy ? 10 : 5};
                                     ${canMoveHere && !isPlayer && !isEnemy ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
                                 "
                                 ${canMoveHere && !isPlayer && !isEnemy ? `
                                     onmouseover="this.style.transform='translate(-50%, -50%) scale(1.2)'; this.style.boxShadow='0 0 15px ${ringColor}';"
                                     onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'; this.style.boxShadow='none';"
                                 ` : ''}
                            >${content}</div>
                        `;
                    }).join('')}

                    <!-- Ring labels -->
                    <div style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); color: #22c55e50; font-size: 9px; font-weight: bold;">CLOSE</div>
                    <div style="position: absolute; top: 25%; left: 50%; transform: translateX(-50%); color: #fbbf2450; font-size: 9px; font-weight: bold;">MID</div>
                    <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); color: #3b82f650; font-size: 9px; font-weight: bold;">FAR</div>
                </div>

                <!-- Current position info -->
                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding: 8px 12px; background: #1a1a24; border-radius: 8px; border: 1px solid #333;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #22c55e;">📍</span>
                        <span style="color: #fff; font-size: 11px;">You: <span style="color: ${state.arena.playerRing === 'close' ? '#22c55e' : state.arena.playerRing === 'mid' ? '#fbbf24' : '#3b82f6'}; font-weight: 600;">${ARENA_POSITIONS[state.arena.playerPosition]?.name || 'Unknown'}</span></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #ef4444;">📍</span>
                        <span style="color: #fff; font-size: 11px;">Enemy: <span style="color: ${state.arena.enemyRing === 'close' ? '#22c55e' : state.arena.enemyRing === 'mid' ? '#fbbf24' : '#3b82f6'}; font-weight: 600;">${ARENA_POSITIONS[state.arena.enemyPosition]?.name || 'Unknown'}</span></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #a855f7;">📏</span>
                        <span style="color: #a855f7; font-size: 11px; font-weight: 600;">Distance: ${state.arena.distance}</span>
                    </div>
                </div>

                <div style="color: #666; font-size: 10px; text-align: center; margin-top: 8px;">
                    💡 Click on a highlighted position to move (uses your turn)
                </div>
            </div>

            <!-- Battle Log -->
            <div style="max-height: 80px; overflow-y: auto; padding: 12px 20px; background: linear-gradient(180deg, #0a0a0f, #05050a); border-top: 1px solid #222;">
                <div style="color: #666; font-size: 10px; margin-bottom: 6px; text-transform: uppercase;">Battle Log</div>
                ${state.log.slice(-4).map((msg, i) => `
                    <div style="color: ${i === state.log.slice(-4).length - 1 ? '#ffffff' : '#6b7280'}; font-size: 12px; padding: 3px 0; ${i < state.log.slice(-4).length - 1 ? 'opacity: 0.7;' : ''}">${i === state.log.slice(-4).length - 1 ? '→ ' : ''}${escapeHtml(msg)}</div>
                `).join('')}
            </div>

            <!-- Card Hand Section -->
            <div style="padding: 20px; background: linear-gradient(180deg, #12121a, #1a1a24);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="color: #ffffff; font-size: 14px; font-weight: 600;">🃏 Your Hand</div>
                        <div style="display: flex; gap: 8px;">
                            <div style="padding: 4px 10px; background: #1a1a2480; border: 1px solid #333; border-radius: 6px; font-size: 10px; color: #666;">
                                📚 Deck: ${state.cards?.deckSize || 0}
                            </div>
                            <div style="padding: 4px 10px; background: #1a1a2480; border: 1px solid #333; border-radius: 6px; font-size: 10px; color: #666;">
                                🗑️ Discard: ${state.cards?.discardSize || 0}
                            </div>
                            ${state.player.block > 0 ? `
                                <div style="padding: 4px 10px; background: #3b82f620; border: 1px solid #3b82f6; border-radius: 6px; font-size: 10px; color: #3b82f6; font-weight: bold;">
                                    🛡️ Block: ${state.player.block}
                                </div>
                            ` : ''}
                            ${state.player.hasCounter ? `
                                <div style="padding: 4px 10px; background: #f9731620; border: 1px solid #f97316; border-radius: 6px; font-size: 10px; color: #f97316; font-weight: bold;">
                                    ↩️ Counter Ready
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <button id="end-turn-btn" style="
                        padding: 10px 20px; background: linear-gradient(135deg, #f97316, #ea580c);
                        border: 2px solid #fb923c; border-radius: 8px;
                        color: #fff; font-size: 12px; font-weight: 600;
                        cursor: pointer; transition: all 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 15px #f9731660';"
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                        ⏭️ End Turn
                    </button>
                </div>

                <!-- Cards Display -->
                <div style="display: flex; gap: 12px; overflow-x: auto; padding: 10px 0;">
                    ${(state.cards?.hand || []).map((card, index) => {
                        const noMp = card.mpCost && state.player.mp < card.mpCost;
                        const noTokens = card.tokenCost && (() => {
                            const playerState = window.PumpArenaState?.get();
                            return !playerState || playerState.resources.tokens < card.tokenCost;
                        })();
                        const disabled = noMp || noTokens;
                        const rarityColor = CARD_RARITY[card.rarity]?.color || '#666';
                        const cardTypeColor = card.type === 'attack' ? '#ef4444' : card.type === 'defense' ? '#3b82f6' : card.type === 'support' ? '#22c55e' : '#a855f7';
                        const cardTypeLabel = card.type === 'attack' ? 'ATK' : card.type === 'defense' ? 'DEF' : card.type === 'support' ? 'SUP' : 'SPL';

                        // Get card effect description
                        let effectDesc = '';
                        if (card.damage) effectDesc = `${card.damage} DMG`;
                        else if (card.block) effectDesc = `${card.block} Block`;
                        else if (card.heal) effectDesc = `+${card.heal} HP`;
                        else if (card.mpRestore) effectDesc = `+${card.mpRestore} MP`;
                        else if (card.effects?.length > 0) effectDesc = card.effects[0].replace('_', ' ');

                        return `
                            <div class="card-btn" data-card-index="${index}" ${disabled ? 'data-disabled="true"' : ''} style="
                                min-width: 120px; max-width: 120px;
                                background: linear-gradient(180deg, #1a1a24, #0a0a0f);
                                border: 2px solid ${disabled ? '#333' : rarityColor};
                                border-radius: 12px;
                                padding: 12px;
                                cursor: ${disabled ? 'not-allowed' : 'pointer'};
                                transition: all 0.2s;
                                opacity: ${disabled ? '0.5' : '1'};
                                position: relative;
                                flex-shrink: 0;
                            ">
                                <!-- Rarity indicator -->
                                <div style="position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 50%; height: 3px; background: ${rarityColor}; border-radius: 0 0 3px 3px;"></div>

                                <!-- Card type badge -->
                                <div style="position: absolute; top: 6px; left: 6px; font-size: 8px; color: ${cardTypeColor}; background: ${cardTypeColor}20; padding: 2px 5px; border-radius: 3px; font-weight: bold;">${cardTypeLabel}</div>

                                <!-- MP cost badge -->
                                <div style="position: absolute; top: 6px; right: 6px; font-size: 9px; color: ${card.mpCost > 0 ? '#3b82f6' : '#22c55e'}; background: ${card.mpCost > 0 ? '#3b82f620' : '#22c55e20'}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                                    ${card.mpCost > 0 ? `⚡${card.mpCost}` : 'FREE'}
                                </div>

                                <!-- Card icon -->
                                <div style="text-align: center; margin: 20px 0 8px 0;">
                                    <span style="font-size: 32px;">${card.icon}</span>
                                </div>

                                <!-- Card name -->
                                <div style="text-align: center; color: #fff; font-size: 11px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${card.name}</div>

                                <!-- Rarity -->
                                <div style="text-align: center; color: ${rarityColor}; font-size: 9px; text-transform: uppercase; margin-bottom: 6px;">${card.rarity}</div>

                                <!-- Effect -->
                                <div style="text-align: center; color: ${cardTypeColor}; font-size: 10px; font-weight: 600; margin-bottom: 6px;">${effectDesc}</div>

                                <!-- Description -->
                                <div style="text-align: center; color: #666; font-size: 9px; line-height: 1.3;">${card.description}</div>

                                ${card.tokenCost ? `
                                    <div style="text-align: center; margin-top: 6px;">
                                        <span style="font-size: 9px; color: #f97316; background: #f9731620; padding: 2px 6px; border-radius: 4px;">🪙 ${card.tokenCost}</span>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}

                    ${(state.cards?.hand || []).length === 0 ? `
                        <div style="flex: 1; text-align: center; color: #666; padding: 30px;">
                            No cards in hand. Click "End Turn" to draw new cards!
                        </div>
                    ` : ''}
                </div>

                <div style="color: #666; font-size: 10px; text-align: center; margin-top: 10px;">
                    💡 Click a card to play it, or End Turn to draw 3 new cards and let the enemy attack
                </div>
            </div>
        </div>
    `;

    // Card button handlers
    container.querySelectorAll('.card-btn:not([data-disabled])').forEach(btn => {
        // Add hover effects
        btn.addEventListener('mouseover', () => {
            btn.style.transform = 'translateY(-8px) scale(1.02)';
            btn.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            btn.style.zIndex = '10';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.transform = 'translateY(0) scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.zIndex = '1';
        });

        btn.addEventListener('click', () => {
            const cardIndex = parseInt(btn.dataset.cardIndex, 10);
            const result = playCard(cardIndex);

            if (result.success) {
                renderBattleUI(container);

                if (result.victory) {
                    showBattleNotification(`Victory! +${result.rewards.xp} XP, +${result.rewards.tokens} tokens`, 'success');
                }
            } else {
                showBattleNotification(result.message, 'error');
            }
        });
    });

    // End Turn button handler
    container.querySelector('#end-turn-btn')?.addEventListener('click', () => {
        const result = endPlayerTurn();

        if (result.success) {
            renderBattleUI(container);

            if (result.victory) {
                showBattleNotification(`Victory! +${result.rewards?.xp || 0} XP, +${result.rewards?.tokens || 0} tokens`, 'success');
            } else if (result.defeat) {
                showBattleNotification('Defeated! Try again when stronger.', 'error');
            }
        } else {
            showBattleNotification(result.message, 'error');
        }
    });

    // Flee button
    container.querySelector('#flee-btn')?.addEventListener('click', () => {
        const result = fleeBattle();
        if (result.success) {
            renderBattleUI(container);
            showBattleNotification('Escaped successfully!', 'info');
        } else {
            showBattleNotification(result.message, 'error');
        }
    });

    // Movement buttons (no longer trigger enemy turn - just preview)
    container.querySelectorAll('.move-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // For movement, we need a movement card or use the move action
            // Show notification that movement requires a Position Shift card
            showBattleNotification('Use a Position Shift card to move!', 'info');
        });
    });
}

function renderEnemyList() {
    const state = window.PumpArenaState?.get();
    const playerLevel = state?.progression.level || 1;
    const playerTier = Math.floor(playerLevel / 10);

    const tierColors = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];
    const tierNames = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'];

    return Object.values(ENEMY_TYPES)
        .filter(e => e.tier <= playerTier)
        .slice(0, 6) // Show max 6 enemies
        .map(enemy => {
            const tierColor = tierColors[enemy.tier] || '#666';
            const tierName = tierNames[enemy.tier] || '???';

            return `
                <div style="
                    background: linear-gradient(135deg, #1a1a24, ${tierColor}10);
                    border: 2px solid ${tierColor}40;
                    border-radius: 12px;
                    padding: 12px;
                    transition: all 0.2s;
                " onmouseover="this.style.borderColor='${tierColor}'; this.style.boxShadow='0 0 15px ${tierColor}30';"
                   onmouseout="this.style.borderColor='${tierColor}40'; this.style.boxShadow='none';">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${tierColor}, ${tierColor}80); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">${enemy.icon}</div>
                        <div style="flex: 1;">
                            <div style="color: #ffffff; font-weight: 600; font-size: 13px;">${escapeHtml(enemy.name)}</div>
                            <div style="color: ${tierColor}; font-size: 10px;">${tierName}</div>
                        </div>
                        ${enemy.isBoss ? '<div style="background: #a855f7; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 4px;">BOSS</div>' : ''}
                    </div>
                    <div style="color: #888; font-size: 11px; margin-bottom: 10px; line-height: 1.4;">${escapeHtml(enemy.description)}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 8px; font-size: 10px; color: #666;">
                            <span>&#10084; ${enemy.baseHp}</span>
                            <span>&#9876; ${enemy.baseAtk}</span>
                        </div>
                        <button class="enemy-select-btn" data-enemy="${enemy.id}" style="
                            padding: 6px 14px; background: linear-gradient(135deg, ${tierColor}, ${tierColor}80);
                            border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600;
                            cursor: pointer; transition: all 0.2s;
                        " onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">Fight</button>
                    </div>
                </div>
            `;
        }).join('');
}

function showBattleNotification(message, type) {
    // Use global notification if available
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        console.log(`[Battle ${type}] ${message}`);
    }
}

// Check if battle has ended after movement
function checkBattleEnd() {
    if (!battleState.active) return null;

    if (battleState.enemyHp <= 0) {
        // Victory
        const rewards = calculateRewards();
        applyRewards(rewards);
        battleState.active = false;
        return { victory: true, rewards };
    }

    if (battleState.playerHp <= 0) {
        // Defeat
        battleState.active = false;
        return { defeat: true };
    }

    return null;
}

// Security helper
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaBattle = {
        // Core functions
        start: startBattle,
        getState: getBattleState,
        useSkill,
        flee: fleeBattle,
        move: movePlayer,

        // Card system
        playCard,
        endTurn: endPlayerTurn,
        drawCards,
        CARDS: ACTION_CARDS,
        CARD_RARITY,

        // Encounters
        randomEncounter,
        getRandomEnemy,

        // Combat stats
        calculateCombatStats,

        // Arena system
        ARENA_POSITIONS,
        RING_MODIFIERS,
        getPositionDistance,
        canMoveTo,

        // UI
        renderPanel: renderBattleUI,

        // Constants
        ENEMIES: ENEMY_TYPES,
        SKILLS: COMBAT_SKILLS,
        getFib: getBattleFib
    };
}
