/**
 * Pump Arena RPG - Deck Builder System
 *
 * Expanded card system with 60+ cards for tactical combat
 * - Attack cards (21)
 * - Defense cards (11)
 * - Support cards (16)
 * - Movement cards (6)
 * - Summon cards (8)
 *
 * ASDF Philosophy: Card costs and effects based on Fibonacci numbers
 */

// ============================================================
// GLOBAL MODULE ACCESSORS (legacy compatibility)
// ============================================================

// RPG State accessors
const getDeckState = () => window.PumpArenaState?.get?.()?.deckbuilding || { collection: [], activeDeck: [], presets: {} };
const getActiveDeck = () => getDeckState().activeDeck || [];
const addCardToCollection = (cardId) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.deckbuilding) return;
    state.deckbuilding.collection = state.deckbuilding.collection || [];
    state.deckbuilding.collection.push(cardId);
    window.PumpArenaState?.save?.();
};
const setActiveDeck = (deck) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.deckbuilding) return;
    state.deckbuilding.activeDeck = deck;
    window.PumpArenaState?.save?.();
};
const saveDeckPreset = (name, deck) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.deckbuilding) return;
    state.deckbuilding.presets = state.deckbuilding.presets || {};
    state.deckbuilding.presets[name] = deck;
    window.PumpArenaState?.save?.();
};
const loadDeckPreset = (name) => {
    return getDeckState().presets?.[name] || null;
};

// ============================================================
// SECURITY UTILITIES
// ============================================================

/**
 * Deep freeze an object and all nested objects
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            deepFreeze(obj[key]);
        }
    });
    return Object.freeze(obj);
}

// ============================================================
// DECK CONSTANTS - Fibonacci based
// ============================================================

const DECK_CONSTANTS = deepFreeze({
    // Deck size limits
    MIN_DECK_SIZE: 20,
    MAX_DECK_SIZE: 30,

    // Copy limits per rarity
    MAX_COPIES: {
        common: 3,
        uncommon: 3,
        rare: 2,
        epic: 1,
        legendary: 1
    },

    // Hand size
    STARTING_HAND_SIZE: 5,
    MAX_HAND_SIZE: 8,

    // Energy system
    STARTING_ENERGY: 3,
    MAX_ENERGY: 8,
    ENERGY_GAIN_PER_TURN: 1,

    // Draw
    CARDS_DRAWN_PER_TURN: 2,

    // Card upgrade costs (tokens)
    UPGRADE_COST: {
        common: 100,
        uncommon: 233,
        rare: 610,
        epic: 1597,
        legendary: 4181
    }
});

// ============================================================
// CARD TYPE DEFINITIONS
// ============================================================

const CARD_TYPES = Object.freeze({
    ATTACK: 'attack',
    DEFENSE: 'defense',
    SUPPORT: 'support',
    MOVEMENT: 'movement',
    SUMMON: 'summon'
});

const CARD_RARITIES = Object.freeze({
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
});

// ============================================================
// ALL CARDS - 62 Total
// ============================================================

const CARDS = {
    // ========================================
    // ATTACK CARDS (21)
    // ========================================

    // === Common Attacks (7) ===
    quick_strike: {
        id: 'quick_strike',
        name: 'Quick Strike',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        damage: 8,
        range: 1,
        description: 'A fast, basic attack.',
        icon: '⚔️',
        upgraded: {
            name: 'Swift Strike',
            damage: 13,
            bonusEffect: 'Draw 1 card'
        }
    },

    power_attack: {
        id: 'power_attack',
        name: 'Power Attack',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        damage: 21,
        range: 1,
        description: 'A strong melee attack.',
        icon: '💪',
        upgraded: {
            name: 'Mighty Blow',
            damage: 34
        }
    },

    ranged_shot: {
        id: 'ranged_shot',
        name: 'Ranged Shot',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        damage: 8,
        range: 5,
        description: 'Attack from a distance.',
        icon: '🎯',
        upgraded: {
            name: 'Precision Shot',
            damage: 13,
            critBonus: 0.21
        }
    },

    double_tap: {
        id: 'double_tap',
        name: 'Double Tap',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        damage: 8,
        hits: 2,
        range: 3,
        description: 'Hit twice for moderate damage.',
        icon: '✌️',
        upgraded: {
            name: 'Triple Tap',
            hits: 3
        }
    },

    cleave: {
        id: 'cleave',
        name: 'Cleave',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        damage: 13,
        range: 1,
        aoe: true,
        aoeRange: 1,
        description: 'Hit all adjacent enemies.',
        icon: '🪓',
        upgraded: {
            name: 'Great Cleave',
            damage: 21
        }
    },

    jab: {
        id: 'jab',
        name: 'Jab',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 0,
        damage: 5,
        range: 1,
        description: 'Free but weak attack.',
        icon: '👊',
        upgraded: {
            name: 'Rapid Jab',
            damage: 8,
            bonusEffect: 'Gain 1 energy'
        }
    },

    aimed_shot: {
        id: 'aimed_shot',
        name: 'Aimed Shot',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        damage: 13,
        range: 6,
        critBonus: 0.13,
        description: 'Careful aim for better critical chance.',
        icon: '👁️',
        upgraded: {
            name: 'Perfect Shot',
            damage: 21,
            critBonus: 0.21
        }
    },

    // === Uncommon Attacks (6) ===
    flame_slash: {
        id: 'flame_slash',
        name: 'Flame Slash',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        damage: 21,
        range: 2,
        element: 'fire',
        statusEffect: { type: 'burn', duration: 2, damage: 5 },
        description: 'Fiery attack that burns over time.',
        icon: '🔥',
        upgraded: {
            name: 'Inferno Slash',
            damage: 34,
            statusEffect: { type: 'burn', duration: 3, damage: 8 }
        }
    },

    frost_bolt: {
        id: 'frost_bolt',
        name: 'Frost Bolt',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        damage: 13,
        range: 4,
        element: 'ice',
        statusEffect: { type: 'slow', duration: 2 },
        description: 'Icy projectile that slows enemies.',
        icon: '❄️',
        upgraded: {
            name: 'Blizzard Bolt',
            damage: 21,
            statusEffect: { type: 'freeze', duration: 1 }
        }
    },

    thunder_strike: {
        id: 'thunder_strike',
        name: 'Thunder Strike',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 3,
        damage: 34,
        range: 3,
        element: 'lightning',
        chainTargets: 2,
        chainDamageReduction: 0.21,
        description: 'Lightning that chains to nearby enemies.',
        icon: '⚡',
        upgraded: {
            name: 'Storm Strike',
            damage: 55,
            chainTargets: 3
        }
    },

    poison_dart: {
        id: 'poison_dart',
        name: 'Poison Dart',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 1,
        damage: 5,
        range: 5,
        statusEffect: { type: 'poison', duration: 3, damage: 8 },
        description: 'Low damage but strong poison.',
        icon: '🎯',
        upgraded: {
            name: 'Venom Dart',
            statusEffect: { type: 'poison', duration: 5, damage: 13 }
        }
    },

    crushing_blow: {
        id: 'crushing_blow',
        name: 'Crushing Blow',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 3,
        damage: 34,
        range: 1,
        armorPierce: 0.34,
        description: 'Heavy hit that ignores some armor.',
        icon: '🔨',
        upgraded: {
            name: 'Armor Breaker',
            damage: 55,
            armorPierce: 0.55
        }
    },

    shadow_strike: {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        damage: 21,
        range: 2,
        element: 'dark',
        critBonus: 0.21,
        description: 'Attack from shadows with high crit.',
        icon: '🌑',
        upgraded: {
            name: 'Umbral Strike',
            damage: 34,
            critBonus: 0.34
        }
    },

    // === Rare Attacks (5) ===
    berserker_rage: {
        id: 'berserker_rage',
        name: 'Berserker Rage',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.RARE,
        cost: 3,
        damage: 55,
        range: 1,
        selfDamage: 13,
        description: 'Devastating attack at cost of health.',
        icon: '😡',
        upgraded: {
            name: 'Primal Fury',
            damage: 89,
            selfDamage: 8
        }
    },

    meteor_strike: {
        id: 'meteor_strike',
        name: 'Meteor Strike',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.RARE,
        cost: 4,
        damage: 55,
        range: 5,
        element: 'fire',
        aoe: true,
        aoeRange: 2,
        description: 'Call down a meteor on the battlefield.',
        icon: '☄️',
        upgraded: {
            name: 'Apocalypse',
            damage: 89,
            aoeRange: 3
        }
    },

    execute: {
        id: 'execute',
        name: 'Execute',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.RARE,
        cost: 2,
        damage: 21,
        range: 1,
        bonusDamageVsLowHp: 2.0,
        lowHpThreshold: 0.34,
        description: 'Deal double damage to low HP enemies.',
        icon: '💀',
        upgraded: {
            name: 'Finishing Blow',
            damage: 34,
            bonusDamageVsLowHp: 3.0
        }
    },

    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.RARE,
        cost: 3,
        damage: 34,
        range: 4,
        element: 'lightning',
        chainTargets: 4,
        chainDamageReduction: 0.13,
        description: 'Lightning bounces between many enemies.',
        icon: '⚡',
        upgraded: {
            name: 'Thunder Storm',
            damage: 55,
            chainTargets: 6
        }
    },

    soul_drain: {
        id: 'soul_drain',
        name: 'Soul Drain',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.RARE,
        cost: 3,
        damage: 34,
        range: 3,
        element: 'dark',
        lifesteal: 0.55,
        description: 'Steal life force from enemies.',
        icon: '👻',
        upgraded: {
            name: 'Soul Harvest',
            damage: 55,
            lifesteal: 0.89
        }
    },

    // === Epic Attacks (2) ===
    void_blast: {
        id: 'void_blast',
        name: 'Void Blast',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.EPIC,
        cost: 5,
        damage: 89,
        range: 6,
        element: 'void',
        ignoreDefense: true,
        description: 'Attack that bypasses all defenses.',
        icon: '🕳️',
        upgraded: {
            name: 'Oblivion',
            damage: 144
        }
    },

    divine_judgment: {
        id: 'divine_judgment',
        name: 'Divine Judgment',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.EPIC,
        cost: 5,
        damage: 55,
        range: 5,
        element: 'light',
        aoe: true,
        aoeRange: 3,
        bonusDamageVsDark: 1.0,
        description: 'Holy attack devastating to dark enemies.',
        icon: '⚖️',
        upgraded: {
            name: 'Armageddon',
            damage: 89,
            aoeRange: 4
        }
    },

    // === Legendary Attack (1) ===
    burn_it_all: {
        id: 'burn_it_all',
        name: 'Burn It All',
        type: CARD_TYPES.ATTACK,
        rarity: CARD_RARITIES.LEGENDARY,
        cost: 8,
        damage: 144,
        range: 8,
        element: 'fire',
        aoe: true,
        aoeRange: 4,
        selfDamage: 34,
        factionExclusive: 'asdf',
        description: 'The ultimate ASDF technique. Burns benefit everyone.',
        icon: '🔥',
        upgraded: {
            name: 'Phoenix Apocalypse',
            damage: 233,
            healOnKill: 55
        }
    },

    // ========================================
    // DEFENSE CARDS (11)
    // ========================================

    // === Common Defense (4) ===
    guard: {
        id: 'guard',
        name: 'Guard',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        block: 8,
        description: 'Basic defensive stance.',
        icon: '🛡️',
        upgraded: {
            name: 'Iron Guard',
            block: 13
        }
    },

    dodge: {
        id: 'dodge',
        name: 'Dodge',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        dodgeChance: 0.34,
        duration: 1,
        description: 'Chance to avoid next attack.',
        icon: '💨',
        upgraded: {
            name: 'Evasion',
            dodgeChance: 0.55
        }
    },

    shield_bash: {
        id: 'shield_bash',
        name: 'Shield Bash',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        block: 13,
        damage: 8,
        range: 1,
        description: 'Block and counter-attack.',
        icon: '🛡️',
        upgraded: {
            name: 'Shield Slam',
            block: 21,
            damage: 13
        }
    },

    brace: {
        id: 'brace',
        name: 'Brace',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.COMMON,
        cost: 0,
        block: 5,
        description: 'Free but weak defense.',
        icon: '✋',
        upgraded: {
            name: 'Steady Brace',
            block: 8,
            bonusEffect: 'Draw 1 card'
        }
    },

    // === Uncommon Defense (4) ===
    iron_skin: {
        id: 'iron_skin',
        name: 'Iron Skin',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        defBonus: 13,
        duration: 3,
        description: 'Increase DEF for several turns.',
        icon: '🔩',
        upgraded: {
            name: 'Steel Skin',
            defBonus: 21,
            duration: 4
        }
    },

    reflect: {
        id: 'reflect',
        name: 'Reflect',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        reflectDamage: 0.34,
        duration: 2,
        description: 'Return portion of damage to attacker.',
        icon: '🪞',
        upgraded: {
            name: 'Mirror Shield',
            reflectDamage: 0.55
        }
    },

    fortify: {
        id: 'fortify',
        name: 'Fortify',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        block: 21,
        bonusIfStationary: 13,
        description: 'Extra block if you didn\'t move.',
        icon: '🏰',
        upgraded: {
            name: 'Stronghold',
            block: 34,
            bonusIfStationary: 21
        }
    },

    parry: {
        id: 'parry',
        name: 'Parry',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 1,
        counterAttackDamage: 21,
        description: 'Negate melee attack and counter.',
        icon: '⚔️',
        upgraded: {
            name: 'Riposte',
            counterAttackDamage: 34,
            bonusEffect: 'Gain 1 energy on success'
        }
    },

    // === Rare Defense (2) ===
    impenetrable: {
        id: 'impenetrable',
        name: 'Impenetrable',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.RARE,
        cost: 3,
        immunityTurns: 1,
        description: 'Immune to all damage for 1 turn.',
        icon: '🛡️',
        upgraded: {
            name: 'Absolute Defense',
            immunityTurns: 1,
            bonusEffect: 'Draw 2 cards'
        }
    },

    last_stand: {
        id: 'last_stand',
        name: 'Last Stand',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.RARE,
        cost: 2,
        surviveLethalChance: 1.0,
        hpAfterSurvive: 1,
        duration: 1,
        description: 'Survive any lethal damage with 1 HP.',
        icon: '💪',
        upgraded: {
            name: 'Undying Will',
            hpAfterSurvive: 21
        }
    },

    // === Epic Defense (1) ===
    diamond_shell: {
        id: 'diamond_shell',
        name: 'Diamond Shell',
        type: CARD_TYPES.DEFENSE,
        rarity: CARD_RARITIES.EPIC,
        cost: 4,
        block: 55,
        reflectDamage: 0.21,
        duration: 3,
        description: 'Massive block with damage reflection.',
        icon: '💎',
        upgraded: {
            name: 'Prism Fortress',
            block: 89,
            reflectDamage: 0.34
        }
    },

    // ========================================
    // SUPPORT CARDS (16)
    // ========================================

    // === Common Support (5) ===
    heal: {
        id: 'heal',
        name: 'Heal',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        heal: 13,
        targetSelf: true,
        description: 'Restore some health.',
        icon: '💚',
        upgraded: {
            name: 'Greater Heal',
            heal: 21
        }
    },

    draw_power: {
        id: 'draw_power',
        name: 'Draw Power',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        drawCards: 2,
        description: 'Draw additional cards.',
        icon: '🃏',
        upgraded: {
            name: 'Power Draw',
            drawCards: 3
        }
    },

    energy_surge: {
        id: 'energy_surge',
        name: 'Energy Surge',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.COMMON,
        cost: 0,
        energyGain: 2,
        description: 'Gain energy this turn.',
        icon: '⚡',
        upgraded: {
            name: 'Power Surge',
            energyGain: 3
        }
    },

    focus: {
        id: 'focus',
        name: 'Focus',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        atkBonus: 8,
        duration: 2,
        description: 'Increase attack temporarily.',
        icon: '🎯',
        upgraded: {
            name: 'Deep Focus',
            atkBonus: 13,
            duration: 3
        }
    },

    refresh: {
        id: 'refresh',
        name: 'Refresh',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        removeDebuffs: 1,
        description: 'Remove one negative effect.',
        icon: '✨',
        upgraded: {
            name: 'Purify',
            removeDebuffs: 'all'
        }
    },

    // === Uncommon Support (6) ===
    battle_cry: {
        id: 'battle_cry',
        name: 'Battle Cry',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        atkBonus: 8,
        duration: 3,
        aoe: true,
        targetAllies: true,
        description: 'Boost all allies\' attack.',
        icon: '📣',
        upgraded: {
            name: 'War Cry',
            atkBonus: 13
        }
    },

    shared_strength: {
        id: 'shared_strength',
        name: 'Shared Strength',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        splitHp: true,
        targetCreature: true,
        description: 'Share HP with a creature.',
        icon: '🤝',
        upgraded: {
            name: 'Soul Link',
            bonusHeal: 13
        }
    },

    empower: {
        id: 'empower',
        name: 'Empower',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        nextCardBoost: 0.55,
        description: 'Next card deals +55% damage.',
        icon: '💪',
        upgraded: {
            name: 'Supercharge',
            nextCardBoost: 0.89
        }
    },

    haste: {
        id: 'haste',
        name: 'Haste',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        spdBonus: 13,
        extraMovement: 2,
        duration: 2,
        description: 'Increase speed and movement.',
        icon: '💨',
        upgraded: {
            name: 'Blitz',
            spdBonus: 21,
            extraMovement: 3
        }
    },

    regenerate: {
        id: 'regenerate',
        name: 'Regenerate',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 3,
        healPerTurn: 8,
        duration: 3,
        description: 'Heal over time.',
        icon: '💗',
        upgraded: {
            name: 'Vitality',
            healPerTurn: 13,
            duration: 5
        }
    },

    tactical_insight: {
        id: 'tactical_insight',
        name: 'Tactical Insight',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 1,
        revealEnemyIntents: true,
        duration: 2,
        drawCards: 1,
        description: 'See enemy actions in advance.',
        icon: '👁️',
        upgraded: {
            name: 'Battle Vision',
            duration: 3,
            drawCards: 2
        }
    },

    // === Rare Support (3) ===
    mass_heal: {
        id: 'mass_heal',
        name: 'Mass Heal',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.RARE,
        cost: 4,
        heal: 21,
        aoe: true,
        targetAllies: true,
        description: 'Heal all allies.',
        icon: '💚',
        upgraded: {
            name: 'Divine Restoration',
            heal: 34,
            removeDebuffs: 1
        }
    },

    time_warp: {
        id: 'time_warp',
        name: 'Time Warp',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.RARE,
        cost: 4,
        extraTurn: true,
        description: 'Take an additional turn.',
        icon: '⏰',
        upgraded: {
            name: 'Temporal Shift',
            energyRefund: 2
        }
    },

    sacrifice: {
        id: 'sacrifice',
        name: 'Sacrifice',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.RARE,
        cost: 0,
        sacrificeCreature: true,
        healAmount: 'creature_max_hp',
        description: 'Sacrifice a creature to heal fully.',
        icon: '🩸',
        upgraded: {
            name: 'Blood Pact',
            bonusAtk: 21,
            duration: 3
        }
    },

    // === Epic Support (2) ===
    resurrection: {
        id: 'resurrection',
        name: 'Resurrection',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.EPIC,
        cost: 6,
        reviveAlly: true,
        reviveHpPercent: 0.34,
        description: 'Bring back a fallen ally.',
        icon: '✝️',
        upgraded: {
            name: 'Phoenix Down',
            reviveHpPercent: 0.55,
            targetCreaturesToo: true
        }
    },

    burning_passion: {
        id: 'burning_passion',
        name: 'Burning Passion',
        type: CARD_TYPES.SUPPORT,
        rarity: CARD_RARITIES.EPIC,
        cost: 3,
        atkBonus: 21,
        critBonus: 0.21,
        burnTokens: 100,
        duration: 3,
        factionExclusive: 'asdf',
        description: 'ASDF card. Burn tokens for power.',
        icon: '🔥',
        upgraded: {
            name: 'Infernal Spirit',
            atkBonus: 34,
            critBonus: 0.34
        }
    },

    // ========================================
    // MOVEMENT CARDS (6)
    // ========================================

    tactical_retreat: {
        id: 'tactical_retreat',
        name: 'Tactical Retreat',
        type: CARD_TYPES.MOVEMENT,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        extraMovement: 3,
        mustMoveAway: true,
        description: 'Move away from enemies quickly.',
        icon: '🏃',
        upgraded: {
            name: 'Strategic Withdrawal',
            extraMovement: 5,
            dodgeChance: 0.21
        }
    },

    charge: {
        id: 'charge',
        name: 'Charge',
        type: CARD_TYPES.MOVEMENT,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        extraMovement: 2,
        damage: 8,
        mustMoveToward: true,
        description: 'Rush toward enemy and attack.',
        icon: '🐃',
        upgraded: {
            name: 'Reckless Charge',
            extraMovement: 3,
            damage: 13
        }
    },

    flank: {
        id: 'flank',
        name: 'Flank',
        type: CARD_TYPES.MOVEMENT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        teleportBehindEnemy: true,
        damage: 13,
        description: 'Appear behind an enemy.',
        icon: '🔄',
        upgraded: {
            name: 'Backstep Strike',
            damage: 21,
            bonusFromBehind: 0.55
        }
    },

    swap_positions: {
        id: 'swap_positions',
        name: 'Swap Positions',
        type: CARD_TYPES.MOVEMENT,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 1,
        swapWithAlly: true,
        description: 'Switch places with an ally.',
        icon: '🔀',
        upgraded: {
            name: 'Tactical Swap',
            bothGainBlock: 8
        }
    },

    blink: {
        id: 'blink',
        name: 'Blink',
        type: CARD_TYPES.MOVEMENT,
        rarity: CARD_RARITIES.RARE,
        cost: 2,
        teleportRange: 5,
        description: 'Teleport to any nearby cell.',
        icon: '✨',
        upgraded: {
            name: 'Phase Step',
            teleportRange: 8,
            bonusEffect: 'Draw 1 card'
        }
    },

    shadow_step: {
        id: 'shadow_step',
        name: 'Shadow Step',
        type: CARD_TYPES.MOVEMENT,
        rarity: CARD_RARITIES.RARE,
        cost: 2,
        teleportRange: 4,
        stealthTurns: 1,
        description: 'Teleport and become invisible.',
        icon: '🌑',
        upgraded: {
            name: 'Umbral Shift',
            teleportRange: 6,
            stealthTurns: 2
        }
    },

    // ========================================
    // SUMMON CARDS (8)
    // ========================================

    summon_creature: {
        id: 'summon_creature',
        name: 'Summon Creature',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.COMMON,
        cost: 2,
        summonFromParty: true,
        description: 'Call a creature from your party.',
        icon: '🐾',
        upgraded: {
            name: 'Greater Summon',
            healCreature: 21
        }
    },

    creature_command: {
        id: 'creature_command',
        name: 'Creature Command',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.COMMON,
        cost: 1,
        creatureExtraAction: true,
        description: 'Give a creature an extra action.',
        icon: '📢',
        upgraded: {
            name: 'Pack Command',
            allCreaturesExtraAction: true
        }
    },

    buff_creature: {
        id: 'buff_creature',
        name: 'Buff Creature',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 2,
        targetCreature: true,
        atkBonus: 13,
        defBonus: 8,
        duration: 3,
        description: 'Enhance a creature\'s stats.',
        icon: '💪',
        upgraded: {
            name: 'Empower Beast',
            atkBonus: 21,
            defBonus: 13
        }
    },

    pack_attack: {
        id: 'pack_attack',
        name: 'Pack Attack',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.UNCOMMON,
        cost: 3,
        allCreaturesAttack: true,
        bonusDamage: 8,
        description: 'All creatures attack same target.',
        icon: '🐺',
        upgraded: {
            name: 'Coordinated Strike',
            bonusDamage: 13,
            bonusCrit: 0.13
        }
    },

    evolution_burst: {
        id: 'evolution_burst',
        name: 'Evolution Burst',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.RARE,
        cost: 4,
        targetCreature: true,
        temporaryEvolution: true,
        duration: 3,
        description: 'Temporarily evolve a creature.',
        icon: '🔮',
        upgraded: {
            name: 'Mega Evolution',
            duration: 5,
            statBoost: 0.34
        }
    },

    fusion: {
        id: 'fusion',
        name: 'Fusion',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.EPIC,
        cost: 5,
        fuseCreatures: 2,
        duration: 3,
        description: 'Combine two creatures into one powerful form.',
        icon: '🌟',
        upgraded: {
            name: 'Ultimate Fusion',
            duration: 5,
            keepBothAbilities: true
        }
    },

    primal_roar: {
        id: 'primal_roar',
        name: 'Primal Roar',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.RARE,
        cost: 3,
        allCreaturesBoost: true,
        atkBonus: 13,
        healCreatures: 13,
        description: 'Boost and heal all creatures.',
        icon: '🦁',
        upgraded: {
            name: 'King\'s Roar',
            atkBonus: 21,
            healCreatures: 21,
            fearEnemies: true
        }
    },

    call_of_the_wild: {
        id: 'call_of_the_wild',
        name: 'Call of the Wild',
        type: CARD_TYPES.SUMMON,
        rarity: CARD_RARITIES.LEGENDARY,
        cost: 7,
        summonAllCreatures: true,
        healAllCreatures: 34,
        atkBonus: 21,
        duration: 3,
        description: 'Summon all creatures at once, empowered.',
        icon: '🌲',
        upgraded: {
            name: 'Nature\'s Fury',
            healAllCreatures: 55,
            atkBonus: 34
        }
    }
};

// Deep freeze all cards
deepFreeze(CARDS);

// ============================================================
// DECK BUILDER CLASS
// ============================================================

class DeckBuilder {
    constructor() {
        this.currentDeck = [];
        this.collection = [];
    }

    /**
     * Initialize with player's collection
     */
    loadCollection() {
        const deckState = getDeckState();
        this.collection = deckState.collection.map(id => ({
            cardId: id,
            ...CARDS[id]
        }));
        this.currentDeck = deckState.activeDeck.map(id => ({
            cardId: id,
            ...CARDS[id]
        }));
    }

    /**
     * Get all cards in collection
     */
    getCollection() {
        return this.collection;
    }

    /**
     * Get current deck
     */
    getDeck() {
        return this.currentDeck;
    }

    /**
     * Add card to deck
     */
    addToDeck(cardId) {
        const card = CARDS[cardId];
        if (!card) return { success: false, reason: 'Card not found' };

        // Check deck size
        if (this.currentDeck.length >= DECK_CONSTANTS.MAX_DECK_SIZE) {
            return { success: false, reason: 'Deck is full' };
        }

        // Check copy limit
        const copies = this.currentDeck.filter(c => c.cardId === cardId).length;
        const maxCopies = DECK_CONSTANTS.MAX_COPIES[card.rarity];
        if (copies >= maxCopies) {
            return { success: false, reason: `Maximum ${maxCopies} copies allowed` };
        }

        // Check if in collection
        const inCollection = this.collection.some(c => c.cardId === cardId);
        if (!inCollection) {
            return { success: false, reason: 'Card not in collection' };
        }

        this.currentDeck.push({ cardId, ...card });
        return { success: true };
    }

    /**
     * Remove card from deck
     */
    removeFromDeck(cardId) {
        const index = this.currentDeck.findIndex(c => c.cardId === cardId);
        if (index === -1) return { success: false, reason: 'Card not in deck' };

        this.currentDeck.splice(index, 1);
        return { success: true };
    }

    /**
     * Validate deck for battle
     */
    validateDeck() {
        const errors = [];

        if (this.currentDeck.length < DECK_CONSTANTS.MIN_DECK_SIZE) {
            errors.push(`Deck needs at least ${DECK_CONSTANTS.MIN_DECK_SIZE} cards (has ${this.currentDeck.length})`);
        }

        if (this.currentDeck.length > DECK_CONSTANTS.MAX_DECK_SIZE) {
            errors.push(`Deck cannot exceed ${DECK_CONSTANTS.MAX_DECK_SIZE} cards`);
        }

        // Check copy limits
        const cardCounts = {};
        this.currentDeck.forEach(card => {
            cardCounts[card.cardId] = (cardCounts[card.cardId] || 0) + 1;
        });

        for (const [cardId, count] of Object.entries(cardCounts)) {
            const card = CARDS[cardId];
            const maxCopies = DECK_CONSTANTS.MAX_COPIES[card.rarity];
            if (count > maxCopies) {
                errors.push(`Too many copies of ${card.name} (${count}/${maxCopies})`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Save current deck
     */
    saveDeck() {
        const cardIds = this.currentDeck.map(c => c.cardId);
        setActiveDeck(cardIds);
        return { success: true };
    }

    /**
     * Save deck as preset
     */
    savePreset(presetName) {
        const cardIds = this.currentDeck.map(c => c.cardId);
        saveDeckPreset(presetName, cardIds);
        return { success: true };
    }

    /**
     * Load deck preset
     */
    loadPreset(presetName) {
        const preset = loadDeckPreset(presetName);
        if (!preset) return { success: false, reason: 'Preset not found' };

        this.currentDeck = preset.map(id => ({
            cardId: id,
            ...CARDS[id]
        }));

        return { success: true };
    }

    /**
     * Get deck statistics
     */
    getDeckStats() {
        const stats = {
            totalCards: this.currentDeck.length,
            byType: {},
            byRarity: {},
            averageCost: 0,
            totalCost: 0
        };

        this.currentDeck.forEach(card => {
            // By type
            stats.byType[card.type] = (stats.byType[card.type] || 0) + 1;

            // By rarity
            stats.byRarity[card.rarity] = (stats.byRarity[card.rarity] || 0) + 1;

            // Cost
            stats.totalCost += card.cost;
        });

        stats.averageCost = stats.totalCards > 0
            ? (stats.totalCost / stats.totalCards).toFixed(1)
            : 0;

        return stats;
    }

    /**
     * Get recommended cards based on playstyle
     */
    getRecommendations(playstyle = 'balanced') {
        const recommendations = {
            aggressive: ['berserker_rage', 'charge', 'pack_attack', 'battle_cry'],
            defensive: ['iron_skin', 'reflect', 'fortify', 'mass_heal'],
            tactical: ['blink', 'tactical_insight', 'time_warp', 'creature_command'],
            balanced: ['power_attack', 'guard', 'heal', 'draw_power']
        };

        return (recommendations[playstyle] || recommendations.balanced)
            .map(id => CARDS[id])
            .filter(Boolean);
    }

    /**
     * Auto-build a deck for given strategy
     */
    autoBuild(strategy = 'balanced') {
        this.currentDeck = [];

        const cardPool = Object.values(CARDS);
        const targetSize = 25;

        // Define ratios based on strategy
        const ratios = {
            aggressive: { attack: 0.5, defense: 0.1, support: 0.2, movement: 0.1, summon: 0.1 },
            defensive: { attack: 0.2, defense: 0.4, support: 0.2, movement: 0.1, summon: 0.1 },
            tactical: { attack: 0.3, defense: 0.2, support: 0.2, movement: 0.2, summon: 0.1 },
            balanced: { attack: 0.35, defense: 0.2, support: 0.2, movement: 0.1, summon: 0.15 }
        };

        const ratio = ratios[strategy] || ratios.balanced;

        // Add cards by type
        for (const [type, percentage] of Object.entries(ratio)) {
            const count = Math.floor(targetSize * percentage);
            const typeCards = cardPool
                .filter(c => c.type === type)
                .sort((a, b) => {
                    // Prioritize by rarity (higher is better)
                    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
                    return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                });

            let added = 0;
            for (const card of typeCards) {
                if (added >= count) break;

                // Check if in collection
                const inCollection = this.collection.some(c => c.cardId === card.id);
                if (!inCollection) continue;

                // Check copy limit
                const copies = this.currentDeck.filter(c => c.cardId === card.id).length;
                const maxCopies = DECK_CONSTANTS.MAX_COPIES[card.rarity];
                if (copies >= maxCopies) continue;

                this.currentDeck.push({ cardId: card.id, ...card });
                added++;
            }
        }

        return { success: true, deckSize: this.currentDeck.length };
    }
}

// ============================================================
// BATTLE HAND CLASS
// ============================================================

class BattleHand {
    constructor(deck) {
        this.deck = [...deck];
        this.hand = [];
        this.discard = [];
        this.energy = DECK_CONSTANTS.STARTING_ENERGY;
        this.maxEnergy = DECK_CONSTANTS.STARTING_ENERGY;

        this.shuffleDeck();
    }

    /**
     * Shuffle the deck
     */
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    /**
     * Draw cards to hand
     */
    drawCards(count = 1) {
        const drawn = [];

        for (let i = 0; i < count; i++) {
            if (this.hand.length >= DECK_CONSTANTS.MAX_HAND_SIZE) break;

            // Reshuffle discard if deck empty
            if (this.deck.length === 0) {
                this.deck = [...this.discard];
                this.discard = [];
                this.shuffleDeck();
            }

            if (this.deck.length > 0) {
                const card = this.deck.pop();
                this.hand.push(card);
                drawn.push(card);
            }
        }

        return drawn;
    }

    /**
     * Draw starting hand
     */
    drawStartingHand() {
        return this.drawCards(DECK_CONSTANTS.STARTING_HAND_SIZE);
    }

    /**
     * Play a card from hand
     */
    playCard(cardIndex) {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return { success: false, reason: 'Invalid card index' };
        }

        const card = this.hand[cardIndex];

        if (card.cost > this.energy) {
            return { success: false, reason: 'Not enough energy' };
        }

        this.energy -= card.cost;
        this.hand.splice(cardIndex, 1);
        this.discard.push(card);

        return { success: true, card };
    }

    /**
     * Discard a card
     */
    discardCard(cardIndex) {
        if (cardIndex < 0 || cardIndex >= this.hand.length) {
            return { success: false, reason: 'Invalid card index' };
        }

        const card = this.hand.splice(cardIndex, 1)[0];
        this.discard.push(card);

        return { success: true, card };
    }

    /**
     * Start new turn
     */
    startTurn() {
        // Gain energy
        if (this.maxEnergy < DECK_CONSTANTS.MAX_ENERGY) {
            this.maxEnergy += DECK_CONSTANTS.ENERGY_GAIN_PER_TURN;
        }
        this.energy = this.maxEnergy;

        // Draw cards
        return this.drawCards(DECK_CONSTANTS.CARDS_DRAWN_PER_TURN);
    }

    /**
     * Get hand state for UI
     */
    getHandState() {
        return {
            hand: this.hand,
            deckSize: this.deck.length,
            discardSize: this.discard.length,
            energy: this.energy,
            maxEnergy: this.maxEnergy
        };
    }
}

// ============================================================
// STARTER DECK DEFINITIONS
// ============================================================

const STARTER_DECKS = {
    warrior: {
        name: 'Warrior\'s Path',
        description: 'Balanced melee-focused deck',
        cards: [
            'quick_strike', 'quick_strike', 'quick_strike',
            'power_attack', 'power_attack',
            'cleave', 'cleave',
            'guard', 'guard', 'guard',
            'shield_bash', 'shield_bash',
            'heal', 'heal',
            'focus',
            'charge', 'charge',
            'summon_creature', 'summon_creature',
            'creature_command'
        ]
    },

    ranger: {
        name: 'Ranger\'s Arsenal',
        description: 'Ranged and tactical deck',
        cards: [
            'ranged_shot', 'ranged_shot', 'ranged_shot',
            'aimed_shot', 'aimed_shot',
            'poison_dart', 'poison_dart',
            'dodge', 'dodge',
            'guard', 'guard',
            'heal',
            'draw_power', 'draw_power',
            'tactical_retreat',
            'flank',
            'tactical_insight',
            'summon_creature', 'summon_creature',
            'creature_command'
        ]
    },

    mage: {
        name: 'Elemental Mastery',
        description: 'Magic and elemental damage',
        cards: [
            'flame_slash', 'flame_slash',
            'frost_bolt', 'frost_bolt',
            'thunder_strike', 'thunder_strike',
            'brace', 'brace',
            'dodge',
            'energy_surge', 'energy_surge',
            'draw_power', 'draw_power',
            'focus', 'focus',
            'blink',
            'summon_creature',
            'buff_creature',
            'creature_command'
        ]
    },

    summoner: {
        name: 'Beast Master',
        description: 'Creature and summon focused',
        cards: [
            'quick_strike', 'quick_strike',
            'ranged_shot', 'ranged_shot',
            'guard', 'guard',
            'heal', 'heal',
            'shared_strength',
            'summon_creature', 'summon_creature', 'summon_creature',
            'creature_command', 'creature_command',
            'buff_creature', 'buff_creature',
            'pack_attack',
            'primal_roar',
            'swap_positions'
        ]
    }
};

// Deep freeze all starter decks
deepFreeze(STARTER_DECKS);

// ============================================================
// EXPORTS
// ============================================================

const deckBuilder = new DeckBuilder();

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaDeckBuilder = {
    DECK_CONSTANTS,
    CARD_TYPES,
    CARD_RARITIES,
    CARDS,
    STARTER_DECKS,
    DeckBuilder,
    BattleHand,
    deckBuilder,
    getCard: (id) => CARDS[id],
    getCardsByType: (type) => Object.values(CARDS).filter(c => c.type === type),
    getCardsByRarity: (rarity) => Object.values(CARDS).filter(c => c.rarity === rarity),
    getCardsByFaction: (factionId) => Object.values(CARDS).filter(c => c.factionExclusive === factionId),
    createBattleHand: (deck) => new BattleHand(deck),
    getStarterDeck: (deckId) => STARTER_DECKS[deckId]
};
