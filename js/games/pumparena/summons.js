/**
 * Pump Arena RPG - Summons System
 *
 * Manages creatures (elemental animals) and allies (NPC companions)
 * Players can have up to 3 creatures + 3 allies in battle
 *
 * ASDF Philosophy: Fibonacci-based stats, creatures represent elements
 */

// ============================================================
// GLOBAL MODULE ACCESSORS (legacy compatibility)
// ============================================================

// RPG State accessors
const getSummonsState = () => window.PumpArenaState?.get?.()?.summons || { creatures: {}, allies: {}, activeParty: { creatures: [], allies: [] } };
const getActiveParty = () => getSummonsState().activeParty || { creatures: [], allies: [] };
const unlockCreature = (id) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.summons) return;
    state.summons.creatures = state.summons.creatures || {};
    state.summons.creatures[id] = { unlocked: true, level: 1, exp: 0 };
    window.PumpArenaState?.save?.();
};
const unlockAlly = (id) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.summons) return;
    state.summons.allies = state.summons.allies || {};
    state.summons.allies[id] = { unlocked: true };
    window.PumpArenaState?.save?.();
};
const addCreatureExp = (id, exp) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.summons?.creatures?.[id]) return;
    state.summons.creatures[id].exp = (state.summons.creatures[id].exp || 0) + exp;
    window.PumpArenaState?.save?.();
};

// Battle Grid constants (local copy for initialization, syncs after battle-grid.js loads)
const GRID_CONSTANTS = {
    ATTACK_RANGE: { MELEE: 1, SHORT: 2, MID: 3, LONG: 5, RANGED: 8 }
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
// SUMMON CONSTANTS - Fibonacci based
// ============================================================

const SUMMON_CONSTANTS = deepFreeze({
    // Party limits
    MAX_CREATURES: 3,
    MAX_ALLIES: 3,

    // Level system
    MAX_CREATURE_LEVEL: 21,
    EXP_PER_LEVEL: [0, 100, 233, 433, 700, 1100, 1700, 2600, 4000, 6100, 9300, 14200, 21700, 33100, 50500, 77100, 117800, 179900, 274700, 419500, 640500],

    // Affinity thresholds (for allies)
    AFFINITY_TO_RECRUIT: 55,
    AFFINITY_TO_UNLOCK_SKILLS: 89,

    // Stat growth per level (multipliers)
    STAT_GROWTH: {
        hp: 1.13,    // Golden ratio fragments
        atk: 1.08,
        def: 1.05,
        spd: 1.03
    },

    // Evolution levels
    EVOLUTION_LEVELS: [8, 13, 21],

    // Rarity multipliers for base stats
    RARITY_MULTIPLIER: {
        common: 1.0,
        uncommon: 1.13,
        rare: 1.21,
        epic: 1.34,
        legendary: 1.618
    }
});

// ============================================================
// ELEMENTS & TYPE CHART
// ============================================================

const ELEMENTS = deepFreeze({
    fire: { id: 'fire', name: 'Fire', icon: '🔥', color: '#ef4444' },
    ice: { id: 'ice', name: 'Ice', icon: '❄️', color: '#38bdf8' },
    lightning: { id: 'lightning', name: 'Lightning', icon: '⚡', color: '#facc15' },
    earth: { id: 'earth', name: 'Earth', icon: '🪨', color: '#a16207' },
    dark: { id: 'dark', name: 'Dark', icon: '🌑', color: '#6b21a8' },
    light: { id: 'light', name: 'Light', icon: '✨', color: '#fef08a' },
    nature: { id: 'nature', name: 'Nature', icon: '🌿', color: '#22c55e' },
    void: { id: 'void', name: 'Void', icon: '🕳️', color: '#1e1b4b' }
});

// Type effectiveness chart (attacker -> defender)
const TYPE_CHART = deepFreeze({
    fire:      { ice: 1.5, nature: 1.5, fire: 0.5, earth: 0.5 },
    ice:       { nature: 1.5, lightning: 1.5, fire: 0.5, ice: 0.5 },
    lightning: { ice: 1.5, dark: 1.5, earth: 0.5, lightning: 0.5 },
    earth:     { fire: 1.5, lightning: 1.5, nature: 0.5, earth: 0.5 },
    dark:      { light: 1.5, nature: 1.5, dark: 0.5, void: 0.5 },
    light:     { dark: 1.5, void: 1.5, light: 0.5, nature: 0.5 },
    nature:    { earth: 1.5, ice: 1.5, fire: 0.5, nature: 0.5 },
    void:      { light: 1.5, fire: 1.5, void: 0.5, dark: 0.5 }
});

// ============================================================
// CREATURE DEFINITIONS
// ============================================================

const CREATURES = {
    // ===== FIRE CREATURES =====
    fire_salamander: {
        id: 'fire_salamander',
        name: 'Fire Salamander',
        element: 'fire',
        rarity: 'common',
        icon: '🦎',

        baseStats: {
            hp: 34,
            atk: 21,
            def: 8,
            spd: 13
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.SHORT,
        movementRange: 3,

        abilities: [
            { id: 'flame_breath', name: 'Flame Breath', unlockLevel: 1 },
            { id: 'heat_aura', name: 'Heat Aura', unlockLevel: 5 },
            { id: 'inferno', name: 'Inferno', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Blaze Salamander', statBoost: 1.21 },
            13: { name: 'Infernal Drake', statBoost: 1.34 }
        },

        unlockCondition: { type: 'quest', questId: 'find_fire_egg' },
        lore: "Born in volcanic vents, this creature channels the primal heat of the earth."
    },

    phoenix_chick: {
        id: 'phoenix_chick',
        name: 'Phoenix Chick',
        element: 'fire',
        rarity: 'rare',
        icon: '🐦‍🔥',

        baseStats: {
            hp: 21,
            atk: 34,
            def: 5,
            spd: 21
        },

        attackType: 'ranged',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MID,
        movementRange: 3,

        abilities: [
            { id: 'ember_shot', name: 'Ember Shot', unlockLevel: 1 },
            { id: 'rebirth', name: 'Rebirth', unlockLevel: 8, passive: true },
            { id: 'supernova', name: 'Supernova', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Rising Phoenix', statBoost: 1.21 },
            13: { name: 'Eternal Phoenix', statBoost: 1.618 }
        },

        unlockCondition: { type: 'faction', factionId: 'asdf', standing: 55 },
        lore: "A mythical firebird that rises from its own ashes. Sacred to the ASDF Collective."
    },

    // ===== ICE CREATURES =====
    frost_wolf: {
        id: 'frost_wolf',
        name: 'Frost Wolf',
        element: 'ice',
        rarity: 'common',
        icon: '🐺',

        baseStats: {
            hp: 34,
            atk: 21,
            def: 13,
            spd: 21
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MELEE,
        movementRange: 4,

        abilities: [
            { id: 'ice_bite', name: 'Ice Bite', unlockLevel: 1 },
            { id: 'pack_howl', name: 'Pack Howl', unlockLevel: 5 },
            { id: 'blizzard_rush', name: 'Blizzard Rush', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Glacier Wolf', statBoost: 1.21 },
            13: { name: 'Fenrir', statBoost: 1.34 }
        },

        unlockCondition: { type: 'level', level: 3 },
        lore: "Pack hunters of the frozen wastes. Their howl freezes the blood of prey."
    },

    ice_serpent: {
        id: 'ice_serpent',
        name: 'Ice Serpent',
        element: 'ice',
        rarity: 'uncommon',
        icon: '🐍',

        baseStats: {
            hp: 21,
            atk: 34,
            def: 8,
            spd: 34
        },

        attackType: 'ranged',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.LONG,
        movementRange: 2,

        abilities: [
            { id: 'frost_fang', name: 'Frost Fang', unlockLevel: 1 },
            { id: 'constrict', name: 'Constrict', unlockLevel: 5 },
            { id: 'absolute_zero', name: 'Absolute Zero', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Glacial Wyrm', statBoost: 1.21 }
        },

        unlockCondition: { type: 'achievement', achievementId: 'beat_ice_boss' },
        lore: "Ancient serpent from the deepest glaciers. Its gaze alone can freeze."
    },

    // ===== LIGHTNING CREATURES =====
    thunder_hawk: {
        id: 'thunder_hawk',
        name: 'Thunder Hawk',
        element: 'lightning',
        rarity: 'common',
        icon: '🦅',

        baseStats: {
            hp: 21,
            atk: 34,
            def: 5,
            spd: 34
        },

        attackType: 'ranged',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.LONG,
        movementRange: 5,

        abilities: [
            { id: 'lightning_dive', name: 'Lightning Dive', unlockLevel: 1 },
            { id: 'static_field', name: 'Static Field', unlockLevel: 5 },
            { id: 'thunderstorm', name: 'Thunderstorm', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Storm Eagle', statBoost: 1.21 },
            13: { name: 'Thunderbird', statBoost: 1.34 }
        },

        unlockCondition: { type: 'level', level: 5 },
        lore: "Masters of the sky, their wings crackle with raw electrical energy."
    },

    spark_fox: {
        id: 'spark_fox',
        name: 'Spark Fox',
        element: 'lightning',
        rarity: 'rare',
        icon: '🦊',

        baseStats: {
            hp: 34,
            atk: 21,
            def: 13,
            spd: 55
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.SHORT,
        movementRange: 5,

        abilities: [
            { id: 'shock_pounce', name: 'Shock Pounce', unlockLevel: 1 },
            { id: 'illusion', name: 'Illusion', unlockLevel: 8 },
            { id: 'chain_lightning', name: 'Chain Lightning', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Thunder Kitsune', statBoost: 1.21 }
        },

        unlockCondition: { type: 'event', eventId: 'lightning_storm' },
        lore: "Trickster spirits that play with lightning like toys."
    },

    // ===== EARTH CREATURES =====
    stone_turtle: {
        id: 'stone_turtle',
        name: 'Stone Turtle',
        element: 'earth',
        rarity: 'common',
        icon: '🐢',

        baseStats: {
            hp: 89,
            atk: 8,
            def: 34,
            spd: 5
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MELEE,
        movementRange: 1,

        abilities: [
            { id: 'shell_bash', name: 'Shell Bash', unlockLevel: 1 },
            { id: 'fortify', name: 'Fortify', unlockLevel: 5 },
            { id: 'earthquake', name: 'Earthquake', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Boulder Tortoise', statBoost: 1.21 },
            13: { name: 'Mountain Titan', statBoost: 1.34 }
        },

        unlockCondition: { type: 'starter' },
        lore: "Ancient guardians whose shells are made of mountain stone."
    },

    crystal_golem: {
        id: 'crystal_golem',
        name: 'Crystal Golem',
        element: 'earth',
        rarity: 'epic',
        icon: '💎',

        baseStats: {
            hp: 55,
            atk: 21,
            def: 55,
            spd: 8
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MELEE,
        movementRange: 2,

        abilities: [
            { id: 'crystal_smash', name: 'Crystal Smash', unlockLevel: 1 },
            { id: 'refract', name: 'Refract', unlockLevel: 8 },
            { id: 'diamond_storm', name: 'Diamond Storm', unlockLevel: 13 }
        ],

        evolution: {
            13: { name: 'Prism Colossus', statBoost: 1.618 }
        },

        unlockCondition: { type: 'quest', questId: 'builders_masterwork' },
        lore: "Crafted by ancient builders from pure crystallized mana."
    },

    // ===== DARK CREATURES =====
    shadow_panther: {
        id: 'shadow_panther',
        name: 'Shadow Panther',
        element: 'dark',
        rarity: 'uncommon',
        icon: '🐆',

        baseStats: {
            hp: 34,
            atk: 34,
            def: 8,
            spd: 34
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.SHORT,
        movementRange: 4,

        abilities: [
            { id: 'shadow_strike', name: 'Shadow Strike', unlockLevel: 1 },
            { id: 'stealth', name: 'Stealth', unlockLevel: 5 },
            { id: 'nightmare_pounce', name: 'Nightmare Pounce', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Void Stalker', statBoost: 1.21 },
            13: { name: 'Umbral Predator', statBoost: 1.34 }
        },

        unlockCondition: { type: 'level', level: 8 },
        lore: "Hunters that exist between shadow and reality."
    },

    nightmare_bat: {
        id: 'nightmare_bat',
        name: 'Nightmare Bat',
        element: 'dark',
        rarity: 'rare',
        icon: '🦇',

        baseStats: {
            hp: 21,
            atk: 21,
            def: 5,
            spd: 55
        },

        attackType: 'ranged',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MID,
        movementRange: 5,

        abilities: [
            { id: 'sonic_screech', name: 'Sonic Screech', unlockLevel: 1 },
            { id: 'life_drain', name: 'Life Drain', unlockLevel: 5 },
            { id: 'fear_aura', name: 'Fear Aura', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Terror Wing', statBoost: 1.21 }
        },

        unlockCondition: { type: 'faction', factionId: 'bear_clan', standing: 34 },
        lore: "Creatures of pure fear that feed on nightmares."
    },

    // ===== LIGHT CREATURES =====
    star_sprite: {
        id: 'star_sprite',
        name: 'Star Sprite',
        element: 'light',
        rarity: 'uncommon',
        icon: '⭐',

        baseStats: {
            hp: 21,
            atk: 13,
            def: 8,
            spd: 34
        },

        attackType: 'magic',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.LONG,
        movementRange: 4,

        abilities: [
            { id: 'starlight', name: 'Starlight', unlockLevel: 1 },
            { id: 'healing_glow', name: 'Healing Glow', unlockLevel: 5 },
            { id: 'celestial_burst', name: 'Celestial Burst', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Nova Sprite', statBoost: 1.21 },
            13: { name: 'Celestial Guardian', statBoost: 1.34 }
        },

        unlockCondition: { type: 'faction', factionId: 'safeyield', standing: 34 },
        lore: "Fragments of starlight given life and purpose."
    },

    // ===== NATURE CREATURES =====
    vine_serpent: {
        id: 'vine_serpent',
        name: 'Vine Serpent',
        element: 'nature',
        rarity: 'common',
        icon: '🌱',

        baseStats: {
            hp: 34,
            atk: 21,
            def: 13,
            spd: 21
        },

        attackType: 'ranged',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MID,
        movementRange: 3,

        abilities: [
            { id: 'vine_whip', name: 'Vine Whip', unlockLevel: 1 },
            { id: 'entangle', name: 'Entangle', unlockLevel: 5 },
            { id: 'forest_wrath', name: 'Forest Wrath', unlockLevel: 13 }
        ],

        evolution: {
            8: { name: 'Grove Serpent', statBoost: 1.21 },
            13: { name: 'World Tree Serpent', statBoost: 1.34 }
        },

        unlockCondition: { type: 'starter' },
        lore: "Guardians of the ancient forests, they command plant life itself."
    },

    // ===== VOID CREATURES =====
    void_wisp: {
        id: 'void_wisp',
        name: 'Void Wisp',
        element: 'void',
        rarity: 'legendary',
        icon: '👁️',

        baseStats: {
            hp: 13,
            atk: 55,
            def: 13,
            spd: 55
        },

        attackType: 'magic',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.RANGED,
        movementRange: 6,

        abilities: [
            { id: 'void_bolt', name: 'Void Bolt', unlockLevel: 1 },
            { id: 'phase_shift', name: 'Phase Shift', unlockLevel: 8 },
            { id: 'singularity', name: 'Singularity', unlockLevel: 21 }
        ],

        evolution: {
            13: { name: 'Reality Tear', statBoost: 1.618 },
            21: { name: 'The Anomaly', statBoost: 2.618 }
        },

        unlockCondition: { type: 'secret', requirement: 'discover_void_rift' },
        lore: "A fragment of the space between realities. Its very existence defies logic."
    }
};

// Deep freeze all creatures
deepFreeze(CREATURES);

// ============================================================
// CREATURE ABILITIES
// ============================================================

const CREATURE_ABILITIES = {
    // === Fire Abilities ===
    flame_breath: {
        id: 'flame_breath',
        name: 'Flame Breath',
        type: 'attack',
        element: 'fire',
        damage: 21,
        range: 2,
        aoe: false,
        cooldown: 0,
        description: 'Breathe fire at a target, dealing fire damage.'
    },
    heat_aura: {
        id: 'heat_aura',
        name: 'Heat Aura',
        type: 'buff',
        element: 'fire',
        effect: { atk: 8 },
        duration: 3,
        aoe: true,
        aoeRange: 1,
        cooldown: 3,
        description: 'Increase ATK of nearby allies.'
    },
    inferno: {
        id: 'inferno',
        name: 'Inferno',
        type: 'attack',
        element: 'fire',
        damage: 55,
        range: 3,
        aoe: true,
        aoeRange: 2,
        cooldown: 5,
        description: 'Unleash a devastating fire attack in an area.'
    },
    ember_shot: {
        id: 'ember_shot',
        name: 'Ember Shot',
        type: 'attack',
        element: 'fire',
        damage: 13,
        range: 4,
        aoe: false,
        cooldown: 0,
        description: 'Fire a concentrated ember at long range.'
    },
    rebirth: {
        id: 'rebirth',
        name: 'Rebirth',
        type: 'passive',
        element: 'fire',
        effect: 'Once per battle, revive with 34% HP when killed.',
        description: 'Rise from the ashes once per battle.'
    },
    supernova: {
        id: 'supernova',
        name: 'Supernova',
        type: 'attack',
        element: 'fire',
        damage: 89,
        range: 5,
        aoe: true,
        aoeRange: 3,
        cooldown: 8,
        selfDamage: 21,
        description: 'Massive explosion dealing huge damage to all enemies.'
    },

    // === Ice Abilities ===
    ice_bite: {
        id: 'ice_bite',
        name: 'Ice Bite',
        type: 'attack',
        element: 'ice',
        damage: 21,
        range: 1,
        aoe: false,
        cooldown: 0,
        statusEffect: { type: 'slow', duration: 2 },
        description: 'Bite with freezing fangs, slowing the target.'
    },
    pack_howl: {
        id: 'pack_howl',
        name: 'Pack Howl',
        type: 'buff',
        element: 'ice',
        effect: { spd: 13, atk: 5 },
        duration: 3,
        aoe: true,
        aoeRange: 3,
        cooldown: 4,
        description: 'Howl to boost all allies\' speed and attack.'
    },
    blizzard_rush: {
        id: 'blizzard_rush',
        name: 'Blizzard Rush',
        type: 'attack',
        element: 'ice',
        damage: 34,
        range: 3,
        aoe: false,
        cooldown: 3,
        bonusMove: 2,
        description: 'Rush through enemies in a line, dealing damage.'
    },
    frost_fang: {
        id: 'frost_fang',
        name: 'Frost Fang',
        type: 'attack',
        element: 'ice',
        damage: 34,
        range: 5,
        aoe: false,
        cooldown: 1,
        description: 'Long range icy strike.'
    },
    constrict: {
        id: 'constrict',
        name: 'Constrict',
        type: 'control',
        element: 'ice',
        damage: 13,
        range: 2,
        duration: 2,
        cooldown: 3,
        statusEffect: { type: 'immobilize', duration: 2 },
        description: 'Wrap around target, immobilizing them.'
    },
    absolute_zero: {
        id: 'absolute_zero',
        name: 'Absolute Zero',
        type: 'attack',
        element: 'ice',
        damage: 89,
        range: 4,
        aoe: true,
        aoeRange: 2,
        cooldown: 6,
        statusEffect: { type: 'freeze', duration: 1 },
        description: 'Flash freeze everything in an area.'
    },

    // === Lightning Abilities ===
    lightning_dive: {
        id: 'lightning_dive',
        name: 'Lightning Dive',
        type: 'attack',
        element: 'lightning',
        damage: 34,
        range: 5,
        aoe: false,
        cooldown: 2,
        bonusMove: 3,
        description: 'Dive at a target from above with lightning speed.'
    },
    static_field: {
        id: 'static_field',
        name: 'Static Field',
        type: 'debuff',
        element: 'lightning',
        range: 3,
        aoe: true,
        aoeRange: 2,
        cooldown: 3,
        effect: { def: -8 },
        duration: 3,
        description: 'Create a field that reduces enemy defense.'
    },
    thunderstorm: {
        id: 'thunderstorm',
        name: 'Thunderstorm',
        type: 'attack',
        element: 'lightning',
        damage: 21,
        range: 6,
        aoe: true,
        aoeRange: 3,
        cooldown: 5,
        hits: 3,
        description: 'Call down multiple lightning strikes randomly in area.'
    },
    shock_pounce: {
        id: 'shock_pounce',
        name: 'Shock Pounce',
        type: 'attack',
        element: 'lightning',
        damage: 21,
        range: 2,
        aoe: false,
        cooldown: 1,
        bonusMove: 1,
        description: 'Quick shocking attack with movement.'
    },
    illusion: {
        id: 'illusion',
        name: 'Illusion',
        type: 'utility',
        element: 'lightning',
        cooldown: 4,
        effect: 'Create a decoy that draws enemy attacks for 2 turns.',
        description: 'Create an illusion of yourself.'
    },
    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        type: 'attack',
        element: 'lightning',
        damage: 21,
        range: 4,
        aoe: false,
        cooldown: 3,
        chains: 3,
        chainDamageReduction: 0.21,
        description: 'Lightning that jumps between nearby enemies.'
    },

    // === Earth Abilities ===
    shell_bash: {
        id: 'shell_bash',
        name: 'Shell Bash',
        type: 'attack',
        element: 'earth',
        damage: 13,
        range: 1,
        aoe: false,
        cooldown: 0,
        knockback: 1,
        description: 'Bash with shell, pushing enemy back.'
    },
    fortify: {
        id: 'fortify',
        name: 'Fortify',
        type: 'buff',
        element: 'earth',
        effect: { def: 21 },
        duration: 3,
        cooldown: 3,
        description: 'Greatly increase defense temporarily.'
    },
    earthquake: {
        id: 'earthquake',
        name: 'Earthquake',
        type: 'attack',
        element: 'earth',
        damage: 34,
        range: 2,
        aoe: true,
        aoeRange: 3,
        cooldown: 5,
        statusEffect: { type: 'stun', duration: 1 },
        description: 'Shake the ground, damaging and stunning enemies.'
    },
    crystal_smash: {
        id: 'crystal_smash',
        name: 'Crystal Smash',
        type: 'attack',
        element: 'earth',
        damage: 34,
        range: 1,
        aoe: false,
        cooldown: 1,
        armorPierce: 0.21,
        description: 'Smash with crystal fist, piercing armor.'
    },
    refract: {
        id: 'refract',
        name: 'Refract',
        type: 'buff',
        element: 'light',
        cooldown: 4,
        effect: 'Reflect 21% of damage back to attacker for 3 turns.',
        duration: 3,
        description: 'Crystal body refracts incoming attacks.'
    },
    diamond_storm: {
        id: 'diamond_storm',
        name: 'Diamond Storm',
        type: 'attack',
        element: 'earth',
        damage: 55,
        range: 3,
        aoe: true,
        aoeRange: 2,
        cooldown: 6,
        description: 'Launch razor-sharp crystals in all directions.'
    },

    // === Dark Abilities ===
    shadow_strike: {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        type: 'attack',
        element: 'dark',
        damage: 34,
        range: 2,
        aoe: false,
        cooldown: 1,
        critBonus: 0.21,
        description: 'Strike from the shadows with increased crit chance.'
    },
    stealth: {
        id: 'stealth',
        name: 'Stealth',
        type: 'utility',
        element: 'dark',
        cooldown: 4,
        duration: 2,
        effect: 'Become untargetable for 2 turns. Next attack has +50% damage.',
        description: 'Vanish into shadows.'
    },
    nightmare_pounce: {
        id: 'nightmare_pounce',
        name: 'Nightmare Pounce',
        type: 'attack',
        element: 'dark',
        damage: 55,
        range: 3,
        aoe: false,
        cooldown: 4,
        bonusMove: 2,
        statusEffect: { type: 'fear', duration: 2 },
        description: 'Terrifying pounce that inflicts fear.'
    },
    sonic_screech: {
        id: 'sonic_screech',
        name: 'Sonic Screech',
        type: 'attack',
        element: 'dark',
        damage: 13,
        range: 3,
        aoe: true,
        aoeRange: 2,
        cooldown: 2,
        statusEffect: { type: 'confuse', duration: 1 },
        description: 'Disorienting screech that confuses enemies.'
    },
    life_drain: {
        id: 'life_drain',
        name: 'Life Drain',
        type: 'attack',
        element: 'dark',
        damage: 21,
        range: 3,
        aoe: false,
        cooldown: 3,
        lifesteal: 0.55,
        description: 'Drain life force from target, healing self.'
    },
    fear_aura: {
        id: 'fear_aura',
        name: 'Fear Aura',
        type: 'debuff',
        element: 'dark',
        range: 0,
        aoe: true,
        aoeRange: 2,
        cooldown: 5,
        effect: { atk: -13, spd: -8 },
        duration: 3,
        description: 'Emanate terror, weakening nearby enemies.'
    },

    // === Light Abilities ===
    starlight: {
        id: 'starlight',
        name: 'Starlight',
        type: 'attack',
        element: 'light',
        damage: 13,
        range: 5,
        aoe: false,
        cooldown: 0,
        description: 'Basic light attack from distance.'
    },
    healing_glow: {
        id: 'healing_glow',
        name: 'Healing Glow',
        type: 'heal',
        element: 'light',
        heal: 21,
        range: 4,
        aoe: true,
        aoeRange: 1,
        cooldown: 3,
        description: 'Heal allies in an area.'
    },
    celestial_burst: {
        id: 'celestial_burst',
        name: 'Celestial Burst',
        type: 'attack',
        element: 'light',
        damage: 55,
        range: 4,
        aoe: true,
        aoeRange: 2,
        cooldown: 5,
        bonusDamageVsDark: 0.55,
        description: 'Powerful light burst, extra effective vs dark.'
    },

    // === Nature Abilities ===
    vine_whip: {
        id: 'vine_whip',
        name: 'Vine Whip',
        type: 'attack',
        element: 'nature',
        damage: 21,
        range: 3,
        aoe: false,
        cooldown: 0,
        description: 'Whip target with thorny vines.'
    },
    entangle: {
        id: 'entangle',
        name: 'Entangle',
        type: 'control',
        element: 'nature',
        damage: 8,
        range: 3,
        aoe: true,
        aoeRange: 2,
        cooldown: 3,
        statusEffect: { type: 'root', duration: 2 },
        description: 'Vines erupt from ground, rooting enemies.'
    },
    forest_wrath: {
        id: 'forest_wrath',
        name: 'Forest Wrath',
        type: 'attack',
        element: 'nature',
        damage: 55,
        range: 4,
        aoe: true,
        aoeRange: 3,
        cooldown: 6,
        description: 'Call upon the forest to attack all enemies.'
    },

    // === Void Abilities ===
    void_bolt: {
        id: 'void_bolt',
        name: 'Void Bolt',
        type: 'attack',
        element: 'void',
        damage: 34,
        range: 8,
        aoe: false,
        cooldown: 1,
        ignoreDefense: true,
        description: 'Attack that ignores all defense.'
    },
    phase_shift: {
        id: 'phase_shift',
        name: 'Phase Shift',
        type: 'utility',
        element: 'void',
        cooldown: 3,
        effect: 'Teleport to any visible cell on the grid.',
        description: 'Instantly teleport anywhere.'
    },
    singularity: {
        id: 'singularity',
        name: 'Singularity',
        type: 'attack',
        element: 'void',
        damage: 89,
        range: 6,
        aoe: true,
        aoeRange: 2,
        cooldown: 8,
        pullEffect: true,
        description: 'Create a void singularity that pulls and damages enemies.'
    }
};

// Deep freeze all creature abilities
deepFreeze(CREATURE_ABILITIES);

// ============================================================
// ALLY DEFINITIONS
// ============================================================

const ALLIES = {
    marcus_ally: {
        id: 'marcus_ally',
        name: 'Marcus',
        npcId: 'marcus',
        role: 'tank',
        icon: '🛡️',

        baseStats: {
            hp: 89,
            atk: 13,
            def: 34,
            spd: 8
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MELEE,
        movementRange: 2,

        abilities: [
            { id: 'shield_wall', name: 'Shield Wall', unlockAffinity: 55 },
            { id: 'taunt', name: 'Taunt', unlockAffinity: 70 },
            { id: 'last_stand', name: 'Last Stand', unlockAffinity: 89 }
        ],

        unlockCondition: { type: 'affinity', npcId: 'marcus', required: 55 },
        lore: "Former security guard turned crypto defender. His shield has saved many."
    },

    nova_ally: {
        id: 'nova_ally',
        name: 'Nova',
        npcId: 'nova',
        role: 'dps',
        icon: '⚡',

        baseStats: {
            hp: 34,
            atk: 55,
            def: 8,
            spd: 34
        },

        attackType: 'ranged',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.LONG,
        movementRange: 3,

        abilities: [
            { id: 'precision_shot', name: 'Precision Shot', unlockAffinity: 55 },
            { id: 'overcharge', name: 'Overcharge', unlockAffinity: 70 },
            { id: 'nova_blast', name: 'Nova Blast', unlockAffinity: 89 }
        ],

        unlockCondition: { type: 'affinity', npcId: 'nova', required: 55 },
        lore: "Tech prodigy who sees code in everything. Her attacks are algorithmically precise."
    },

    zephyr_ally: {
        id: 'zephyr_ally',
        name: 'Zephyr',
        npcId: 'zephyr',
        role: 'support',
        icon: '🌬️',

        baseStats: {
            hp: 34,
            atk: 21,
            def: 13,
            spd: 55
        },

        attackType: 'magic',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MID,
        movementRange: 4,

        abilities: [
            { id: 'wind_barrier', name: 'Wind Barrier', unlockAffinity: 55 },
            { id: 'haste', name: 'Haste', unlockAffinity: 70 },
            { id: 'cyclone', name: 'Cyclone', unlockAffinity: 89 }
        ],

        unlockCondition: { type: 'affinity', npcId: 'zephyr', required: 55 },
        lore: "Free spirit who flows like the wind. Always appears where needed most."
    },

    vera_ally: {
        id: 'vera_ally',
        name: 'Vera Burns',
        npcId: 'vera_burns',
        role: 'support',
        icon: '🔥',
        factionExclusive: 'asdf',

        baseStats: {
            hp: 34,
            atk: 34,
            def: 13,
            spd: 21
        },

        attackType: 'magic',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.MID,
        movementRange: 3,

        abilities: [
            { id: 'burn_aura', name: 'Burn Aura', unlockAffinity: 55 },
            { id: 'sacrifice', name: 'Sacrifice', unlockAffinity: 70 },
            { id: 'phoenix_flame', name: 'Phoenix Flame', unlockAffinity: 89 }
        ],

        unlockCondition: { type: 'faction', factionId: 'asdf', standing: 70 },
        lore: "ASDF's burn specialist. Believes in creative destruction."
    },

    shadow_ally: {
        id: 'shadow_ally',
        name: 'Shadow',
        npcId: 'shadow_trader',
        role: 'assassin',
        icon: '🗡️',

        baseStats: {
            hp: 21,
            atk: 55,
            def: 5,
            spd: 55
        },

        attackType: 'melee',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.SHORT,
        movementRange: 5,

        abilities: [
            { id: 'backstab', name: 'Backstab', unlockAffinity: 55 },
            { id: 'vanish', name: 'Vanish', unlockAffinity: 70 },
            { id: 'death_mark', name: 'Death Mark', unlockAffinity: 89 }
        ],

        unlockCondition: { type: 'affinity', npcId: 'shadow_trader', required: 70 },
        lore: "Nobody knows their real name. Deadly efficient in combat."
    },

    oracle_ally: {
        id: 'oracle_ally',
        name: 'The Oracle',
        npcId: 'oracle',
        role: 'support',
        icon: '🔮',

        baseStats: {
            hp: 34,
            atk: 21,
            def: 21,
            spd: 21
        },

        attackType: 'magic',
        attackRange: GRID_CONSTANTS.ATTACK_RANGE.LONG,
        movementRange: 2,

        abilities: [
            { id: 'foresight', name: 'Foresight', unlockAffinity: 55 },
            { id: 'blessing', name: 'Blessing', unlockAffinity: 70 },
            { id: 'destiny', name: 'Destiny', unlockAffinity: 89 }
        ],

        unlockCondition: { type: 'secret', requirement: 'find_oracle' },
        lore: "Sees threads of fate in the blockchain. Speaks only in riddles."
    }
};

// Deep freeze all allies
deepFreeze(ALLIES);

// ============================================================
// ALLY ABILITIES
// ============================================================

const ALLY_ABILITIES = {
    // === Tank Abilities ===
    shield_wall: {
        id: 'shield_wall',
        name: 'Shield Wall',
        type: 'buff',
        cooldown: 3,
        duration: 2,
        effect: { def: 34 },
        description: 'Massively increase defense for 2 turns.'
    },
    taunt: {
        id: 'taunt',
        name: 'Taunt',
        type: 'control',
        cooldown: 4,
        duration: 2,
        aoe: true,
        aoeRange: 3,
        effect: 'Force all enemies in range to target Marcus.',
        description: 'Draw enemy attacks to yourself.'
    },
    last_stand: {
        id: 'last_stand',
        name: 'Last Stand',
        type: 'passive',
        effect: 'When HP drops below 21%, gain +89 DEF and immunity to one-shots.',
        description: 'Become nearly invincible at low health.'
    },

    // === DPS Abilities ===
    precision_shot: {
        id: 'precision_shot',
        name: 'Precision Shot',
        type: 'attack',
        damage: 34,
        range: 6,
        cooldown: 2,
        critBonus: 0.34,
        description: 'High accuracy shot with increased crit chance.'
    },
    overcharge: {
        id: 'overcharge',
        name: 'Overcharge',
        type: 'buff',
        cooldown: 5,
        duration: 3,
        effect: { atk: 21, spd: 13 },
        selfDamage: 8,
        description: 'Boost stats at the cost of some HP.'
    },
    nova_blast: {
        id: 'nova_blast',
        name: 'Nova Blast',
        type: 'attack',
        damage: 89,
        range: 5,
        aoe: true,
        aoeRange: 2,
        cooldown: 8,
        description: 'Devastating energy blast hitting multiple enemies.'
    },

    // === Support Abilities ===
    wind_barrier: {
        id: 'wind_barrier',
        name: 'Wind Barrier',
        type: 'buff',
        cooldown: 4,
        duration: 3,
        aoe: true,
        aoeRange: 2,
        effect: 'Allies in range have +21% dodge chance.',
        description: 'Create protective wind currents around allies.'
    },
    haste: {
        id: 'haste',
        name: 'Haste',
        type: 'buff',
        cooldown: 3,
        duration: 2,
        range: 4,
        effect: { spd: 21, movementRange: 2 },
        description: 'Greatly increase an ally\'s speed.'
    },
    cyclone: {
        id: 'cyclone',
        name: 'Cyclone',
        type: 'control',
        cooldown: 6,
        range: 4,
        aoe: true,
        aoeRange: 2,
        effect: 'Push all enemies away from center and deal 21 damage.',
        damage: 21,
        description: 'Create a powerful cyclone that scatters enemies.'
    },

    // === ASDF Abilities ===
    burn_aura: {
        id: 'burn_aura',
        name: 'Burn Aura',
        type: 'buff',
        cooldown: 4,
        duration: 3,
        aoe: true,
        aoeRange: 2,
        effect: 'Allies deal +21% damage, enemies take 5 burn damage/turn.',
        description: 'Emanate burning energy that helps allies and hurts enemies.'
    },
    sacrifice: {
        id: 'sacrifice',
        name: 'Sacrifice',
        type: 'heal',
        cooldown: 5,
        range: 3,
        heal: 55,
        selfDamage: 34,
        description: 'Sacrifice own HP to heal an ally significantly.'
    },
    phoenix_flame: {
        id: 'phoenix_flame',
        name: 'Phoenix Flame',
        type: 'utility',
        cooldown: 10,
        effect: 'Revive one fallen ally with 34% HP.',
        description: 'Call upon the phoenix to resurrect an ally.'
    },

    // === Assassin Abilities ===
    backstab: {
        id: 'backstab',
        name: 'Backstab',
        type: 'attack',
        damage: 55,
        range: 1,
        cooldown: 2,
        bonusFromBehind: 1.0,
        description: 'Attack from behind for double damage.'
    },
    vanish: {
        id: 'vanish',
        name: 'Vanish',
        type: 'utility',
        cooldown: 5,
        duration: 2,
        effect: 'Become invisible and gain free movement.',
        description: 'Disappear from sight completely.'
    },
    death_mark: {
        id: 'death_mark',
        name: 'Death Mark',
        type: 'debuff',
        cooldown: 6,
        duration: 3,
        range: 5,
        effect: 'Target takes +55% damage from all sources.',
        description: 'Mark a target for death.'
    },

    // === Oracle Abilities ===
    foresight: {
        id: 'foresight',
        name: 'Foresight',
        type: 'utility',
        cooldown: 4,
        effect: 'Reveal enemy intents for 2 turns. +21% dodge for party.',
        duration: 2,
        description: 'See into the immediate future.'
    },
    blessing: {
        id: 'blessing',
        name: 'Blessing',
        type: 'heal',
        cooldown: 5,
        heal: 34,
        range: 6,
        aoe: true,
        aoeRange: 2,
        bonusEffect: { allStats: 5 },
        duration: 3,
        description: 'Bless allies with healing and stat boosts.'
    },
    destiny: {
        id: 'destiny',
        name: 'Destiny',
        type: 'utility',
        cooldown: 10,
        effect: 'Guarantee next 3 attacks will critically hit.',
        duration: 3,
        description: 'Align fate in your favor.'
    }
};

// Deep freeze all ally abilities
deepFreeze(ALLY_ABILITIES);

// ============================================================
// SUMMON MANAGER CLASS
// ============================================================

class SummonManager {
    constructor() {
        this.activeCreatures = [];
        this.activeAllies = [];
    }

    /**
     * Get all available creatures for the player
     */
    getUnlockedCreatures() {
        const summonsState = getSummonsState();
        return summonsState.unlockedCreatures.map(id => ({
            ...CREATURES[id],
            level: summonsState.creatureLevels[id] || 1,
            exp: summonsState.creatureExp[id] || 0,
            affinity: summonsState.creatureAffinity[id] || 0
        }));
    }

    /**
     * Get all available allies for the player
     */
    getUnlockedAllies() {
        const summonsState = getSummonsState();
        return summonsState.unlockedAllies.map(id => ALLIES[id]);
    }

    /**
     * Check if creature can be unlocked
     */
    canUnlockCreature(creatureId, gameState) {
        const creature = CREATURES[creatureId];
        if (!creature) return { canUnlock: false, reason: 'Creature not found' };

        const condition = creature.unlockCondition;

        switch (condition.type) {
            case 'starter':
                return { canUnlock: true };

            case 'level':
                const level = gameState.character?.level || 1;
                return {
                    canUnlock: level >= condition.level,
                    reason: `Requires level ${condition.level}`
                };

            case 'quest':
                const completedQuests = gameState.quests?.completed || [];
                return {
                    canUnlock: completedQuests.includes(condition.questId),
                    reason: `Complete quest: ${condition.questId}`
                };

            case 'achievement':
                const achievements = gameState.achievements || [];
                return {
                    canUnlock: achievements.includes(condition.achievementId),
                    reason: `Unlock achievement: ${condition.achievementId}`
                };

            case 'faction':
                const standing = gameState.faction?.standing?.[condition.factionId] || 0;
                return {
                    canUnlock: standing >= condition.standing,
                    reason: `Requires ${condition.standing} standing with ${condition.factionId}`
                };

            case 'event':
                const triggeredEvents = gameState.events?.triggered || [];
                return {
                    canUnlock: triggeredEvents.includes(condition.eventId),
                    reason: `Trigger event: ${condition.eventId}`
                };

            case 'secret':
                const secrets = gameState.storyFlags?.secretsDiscovered || [];
                return {
                    canUnlock: secrets.includes(condition.requirement),
                    reason: 'Discover the secret'
                };

            default:
                return { canUnlock: false, reason: 'Unknown condition' };
        }
    }

    /**
     * Check if ally can be unlocked
     */
    canUnlockAlly(allyId, gameState) {
        const ally = ALLIES[allyId];
        if (!ally) return { canUnlock: false, reason: 'Ally not found' };

        const condition = ally.unlockCondition;

        // Check faction exclusive
        if (ally.factionExclusive) {
            const currentFaction = gameState.faction?.current;
            if (currentFaction !== ally.factionExclusive) {
                return {
                    canUnlock: false,
                    reason: `Exclusive to ${ally.factionExclusive} faction`
                };
            }
        }

        switch (condition.type) {
            case 'affinity':
                const npcAffinity = gameState.relationships?.[condition.npcId]?.affinity || 0;
                return {
                    canUnlock: npcAffinity >= condition.required,
                    reason: `Requires ${condition.required} affinity with ${condition.npcId}`
                };

            case 'faction':
                const standing = gameState.faction?.standing?.[condition.factionId] || 0;
                return {
                    canUnlock: standing >= condition.standing,
                    reason: `Requires ${condition.standing} standing with ${condition.factionId}`
                };

            case 'secret':
                const secrets = gameState.storyFlags?.secretsDiscovered || [];
                return {
                    canUnlock: secrets.includes(condition.requirement),
                    reason: 'Discover the secret'
                };

            default:
                return { canUnlock: false, reason: 'Unknown condition' };
        }
    }

    /**
     * Calculate creature stats at given level
     */
    calculateCreatureStats(creatureId, level) {
        const creature = CREATURES[creatureId];
        if (!creature) return null;

        const rarityMult = SUMMON_CONSTANTS.RARITY_MULTIPLIER[creature.rarity];
        const stats = { ...creature.baseStats };

        // Apply level scaling
        for (const [stat, baseValue] of Object.entries(stats)) {
            const growth = SUMMON_CONSTANTS.STAT_GROWTH[stat] || 1.05;
            stats[stat] = Math.floor(baseValue * rarityMult * Math.pow(growth, level - 1));
        }

        // Check for evolution
        for (const [evoLevel, evoData] of Object.entries(creature.evolution || {})) {
            if (level >= parseInt(evoLevel)) {
                for (const stat of Object.keys(stats)) {
                    stats[stat] = Math.floor(stats[stat] * evoData.statBoost);
                }
            }
        }

        return stats;
    }

    /**
     * Get creature's current evolution name
     */
    getCreatureEvolutionName(creatureId, level) {
        const creature = CREATURES[creatureId];
        if (!creature) return null;

        let name = creature.name;
        const evolutions = Object.entries(creature.evolution || {})
            .sort(([a], [b]) => parseInt(a) - parseInt(b));

        for (const [evoLevel, evoData] of evolutions) {
            if (level >= parseInt(evoLevel)) {
                name = evoData.name;
            }
        }

        return name;
    }

    /**
     * Get unlocked abilities for creature at level
     */
    getCreatureAbilities(creatureId, level) {
        const creature = CREATURES[creatureId];
        if (!creature) return [];

        return creature.abilities
            .filter(a => level >= a.unlockLevel)
            .map(a => ({
                ...a,
                ...CREATURE_ABILITIES[a.id]
            }));
    }

    /**
     * Get unlocked abilities for ally at affinity
     */
    getAllyAbilities(allyId, affinity) {
        const ally = ALLIES[allyId];
        if (!ally) return [];

        return ally.abilities
            .filter(a => affinity >= a.unlockAffinity)
            .map(a => ({
                ...a,
                ...ALLY_ABILITIES[a.id]
            }));
    }

    /**
     * Add exp to creature
     */
    grantCreatureExp(creatureId, expAmount) {
        const summonsState = getSummonsState();
        const currentExp = summonsState.creatureExp[creatureId] || 0;
        const currentLevel = summonsState.creatureLevels[creatureId] || 1;
        const newExp = currentExp + expAmount;

        // Check for level up
        let newLevel = currentLevel;
        while (newLevel < SUMMON_CONSTANTS.MAX_CREATURE_LEVEL &&
               newExp >= SUMMON_CONSTANTS.EXP_PER_LEVEL[newLevel]) {
            newLevel++;
        }

        addCreatureExp(creatureId, expAmount);

        if (newLevel > currentLevel) {
            return {
                leveledUp: true,
                oldLevel: currentLevel,
                newLevel,
                creature: CREATURES[creatureId]
            };
        }

        return { leveledUp: false, currentLevel, currentExp: newExp };
    }

    /**
     * Get type effectiveness multiplier
     */
    getTypeEffectiveness(attackerElement, defenderElement) {
        const chart = TYPE_CHART[attackerElement];
        if (!chart) return 1.0;
        return chart[defenderElement] || 1.0;
    }

    /**
     * Create battle-ready creature data
     */
    createBattleCreature(creatureId) {
        const summonsState = getSummonsState();
        const creature = CREATURES[creatureId];
        if (!creature) return null;

        const level = summonsState.creatureLevels[creatureId] || 1;
        const stats = this.calculateCreatureStats(creatureId, level);
        const abilities = this.getCreatureAbilities(creatureId, level);

        return {
            ...creature,
            name: this.getCreatureEvolutionName(creatureId, level),
            level,
            ...stats,
            abilities,
            element: ELEMENTS[creature.element]
        };
    }

    /**
     * Create battle-ready ally data
     */
    createBattleAlly(allyId, gameState) {
        const ally = ALLIES[allyId];
        if (!ally) return null;

        const affinity = gameState.relationships?.[ally.npcId]?.affinity || 55;
        const abilities = this.getAllyAbilities(allyId, affinity);

        return {
            ...ally,
            affinity,
            abilities,
            ...ally.baseStats
        };
    }

    /**
     * Get recommended party for battle
     */
    getRecommendedParty(enemyTypes, gameState) {
        const unlockedCreatures = this.getUnlockedCreatures();
        const unlockedAllies = this.getUnlockedAllies();

        // Score creatures based on type advantage
        const scoredCreatures = unlockedCreatures.map(c => {
            let score = c.level * 10;
            enemyTypes.forEach(enemyType => {
                score += (this.getTypeEffectiveness(c.element, enemyType) - 1) * 50;
            });
            return { ...c, score };
        });

        // Sort by score and take top 3
        scoredCreatures.sort((a, b) => b.score - a.score);

        return {
            creatures: scoredCreatures.slice(0, 3),
            allies: unlockedAllies.slice(0, 3)
        };
    }
}

// ============================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================

const summonManager = new SummonManager();

export {
    SUMMON_CONSTANTS,
    ELEMENTS,
    TYPE_CHART,
    CREATURES,
    CREATURE_ABILITIES,
    ALLIES,
    ALLY_ABILITIES,
    summonManager
};

// Convenience exports
export function getCreature(id) {
    return CREATURES[id];
}

export function getAlly(id) {
    return ALLIES[id];
}

export function getAbility(id) {
    return CREATURE_ABILITIES[id] || ALLY_ABILITIES[id];
}

export function getElement(id) {
    return ELEMENTS[id];
}

export function calculateTypeEffectiveness(attacker, defender) {
    return summonManager.getTypeEffectiveness(attacker, defender);
}

export function createBattleCreature(creatureId) {
    return summonManager.createBattleCreature(creatureId);
}

export function createBattleAlly(allyId, gameState) {
    return summonManager.createBattleAlly(allyId, gameState);
}

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaSummons = {
    SUMMON_CONSTANTS,
    ELEMENTS,
    TYPE_CHART,
    CREATURES,
    CREATURE_ABILITIES,
    ALLIES,
    ALLY_ABILITIES,
    summonManager,
    getCreature: (id) => CREATURES[id],
    getAlly: (id) => ALLIES[id],
    getAbility: (id) => CREATURE_ABILITIES[id] || ALLY_ABILITIES[id],
    getElement: (id) => ELEMENTS[id],
    calculateTypeEffectiveness: (a, d) => summonManager.getTypeEffectiveness(a, d),
    createBattleCreature: (id) => summonManager.createBattleCreature(id),
    createBattleAlly: (id, s) => summonManager.createBattleAlly(id, s)
};
