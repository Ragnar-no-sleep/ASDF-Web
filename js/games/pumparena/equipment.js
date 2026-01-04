/**
 * Pump Arena RPG - Equipment System
 * Equippable items with stat bonuses
 *
 * PHILOSOPHY: ASDF Integration
 * - 5 equipment slots (Fibonacci: fib[5] = 5)
 * - Rarity tiers scale with Fibonacci bonuses
 * - Set bonuses require Fibonacci piece counts (2, 3, 5)
 *
 * Version: 1.0.0 - ASDF Philosophy Integration
 */

'use strict';

// ============================================
// FIBONACCI HELPER
// ============================================

const EQUIP_FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

function getEquipFib(n) {
    if (n < 0) return 0;
    if (n < EQUIP_FIB.length) return EQUIP_FIB[n];
    let a = EQUIP_FIB[EQUIP_FIB.length - 2];
    let b = EQUIP_FIB[EQUIP_FIB.length - 1];
    for (let i = EQUIP_FIB.length; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}

// ============================================
// EQUIPMENT SLOTS (5 slots = fib[5])
// ============================================

const EQUIPMENT_SLOTS = {
    head: {
        id: 'head',
        name: 'Head',
        icon: '🎩',
        description: 'Headwear and accessories',
        primaryStat: 'str'  // Strategy focus
    },
    body: {
        id: 'body',
        name: 'Body',
        icon: '👕',
        description: 'Main clothing and armor',
        primaryStat: 'def'  // Defense focus
    },
    hands: {
        id: 'hands',
        name: 'Hands',
        icon: '🧤',
        description: 'Gloves and tools',
        primaryStat: 'dev'  // Development focus
    },
    feet: {
        id: 'feet',
        name: 'Feet',
        icon: '👟',
        description: 'Footwear',
        primaryStat: 'mkt'  // Marketing/speed focus
    },
    accessory: {
        id: 'accessory',
        name: 'Accessory',
        icon: '💍',
        description: 'Rings, badges, and trinkets',
        primaryStat: 'lck'  // Luck focus
    }
};

// ============================================
// RARITY SYSTEM (Fibonacci-based bonuses)
// ============================================

const EQUIPMENT_RARITY = {
    common: {
        id: 'common',
        name: 'Common',
        color: '#9ca3af',
        statMultiplier: 1.0,
        bonusSlots: 0
    },
    uncommon: {
        id: 'uncommon',
        name: 'Uncommon',
        color: '#22c55e',
        statMultiplier: 1.0 + (getEquipFib(4) / 100),  // +3%
        bonusSlots: 1
    },
    rare: {
        id: 'rare',
        name: 'Rare',
        color: '#3b82f6',
        statMultiplier: 1.0 + (getEquipFib(6) / 100),  // +8%
        bonusSlots: 2
    },
    epic: {
        id: 'epic',
        name: 'Epic',
        color: '#a855f7',
        statMultiplier: 1.0 + (getEquipFib(7) / 100),  // +13%
        bonusSlots: 3
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary',
        color: '#f97316',
        statMultiplier: 1.0 + (getEquipFib(8) / 100),  // +21%
        bonusSlots: 4
    }
};

// ============================================
// EQUIPMENT ITEMS
// ============================================

const EQUIPMENT_ITEMS = {
    // ===== HEAD SLOT =====
    thinking_cap: {
        id: 'thinking_cap',
        name: 'Thinking Cap',
        slot: 'head',
        rarity: 'common',
        icon: '🎓',
        description: 'Helps you think strategically',
        baseStats: { str: getEquipFib(4) },  // +3 STR
        levelRequired: 1
    },
    vr_headset: {
        id: 'vr_headset',
        name: 'VR Headset',
        slot: 'head',
        rarity: 'uncommon',
        icon: '🥽',
        description: 'See the metaverse clearly',
        baseStats: { str: getEquipFib(5), dev: getEquipFib(3) },  // +5 STR, +2 DEV
        levelRequired: 5
    },
    brain_implant: {
        id: 'brain_implant',
        name: 'Neural Implant',
        slot: 'head',
        rarity: 'rare',
        icon: '🧠',
        description: 'Direct neural interface',
        baseStats: { str: getEquipFib(6), dev: getEquipFib(5), lck: getEquipFib(3) },
        levelRequired: 15,
        setId: 'cyborg'
    },
    crown_of_degens: {
        id: 'crown_of_degens',
        name: 'Crown of Degens',
        slot: 'head',
        rarity: 'legendary',
        icon: '👑',
        description: 'Worn by the most fearless traders',
        baseStats: { str: getEquipFib(8), lck: getEquipFib(7), cha: getEquipFib(5) },
        levelRequired: 40,
        specialEffect: 'critBonus',
        effectValue: getEquipFib(6)  // +8% crit
    },

    // ===== BODY SLOT =====
    basic_hoodie: {
        id: 'basic_hoodie',
        name: 'Dev Hoodie',
        slot: 'body',
        rarity: 'common',
        icon: '🧥',
        description: 'Standard developer attire',
        baseStats: { com: getEquipFib(3), dev: getEquipFib(3) },
        levelRequired: 1
    },
    branded_merch: {
        id: 'branded_merch',
        name: 'Branded Merch',
        slot: 'body',
        rarity: 'uncommon',
        icon: '👔',
        description: 'Show your project pride',
        baseStats: { com: getEquipFib(5), mkt: getEquipFib(4) },
        levelRequired: 8
    },
    cyber_armor: {
        id: 'cyber_armor',
        name: 'Cyber Armor',
        slot: 'body',
        rarity: 'rare',
        icon: '🦾',
        description: 'Advanced protection suit',
        baseStats: { com: getEquipFib(6), dev: getEquipFib(5), str: getEquipFib(4) },
        levelRequired: 20,
        setId: 'cyborg'
    },
    diamond_vest: {
        id: 'diamond_vest',
        name: 'Diamond Hands Vest',
        slot: 'body',
        rarity: 'epic',
        icon: '💎',
        description: 'Forged from pure diamond hands energy',
        baseStats: { com: getEquipFib(7), str: getEquipFib(6), cha: getEquipFib(5) },
        levelRequired: 30,
        specialEffect: 'defenseBonus',
        effectValue: getEquipFib(7)  // +13 defense in combat
    },

    // ===== HANDS SLOT =====
    basic_keyboard: {
        id: 'basic_keyboard',
        name: 'Mechanical Keyboard',
        slot: 'hands',
        rarity: 'common',
        icon: '⌨️',
        description: 'Click-clack productivity',
        baseStats: { dev: getEquipFib(4) },
        levelRequired: 1
    },
    gaming_mouse: {
        id: 'gaming_mouse',
        name: 'Gaming Mouse',
        slot: 'hands',
        rarity: 'uncommon',
        icon: '🖱️',
        description: 'Precision clicking',
        baseStats: { dev: getEquipFib(5), lck: getEquipFib(3) },
        levelRequired: 10
    },
    cyber_gloves: {
        id: 'cyber_gloves',
        name: 'Cyber Gloves',
        slot: 'hands',
        rarity: 'rare',
        icon: '🧤',
        description: 'Haptic feedback enhancement',
        baseStats: { dev: getEquipFib(6), str: getEquipFib(4) },
        levelRequired: 18,
        setId: 'cyborg'
    },
    infinity_gauntlet: {
        id: 'infinity_gauntlet',
        name: 'Infinity Gauntlet',
        slot: 'hands',
        rarity: 'legendary',
        icon: '🤜',
        description: 'Snap your fingers, change the market',
        baseStats: { dev: getEquipFib(8), str: getEquipFib(7), lck: getEquipFib(6) },
        levelRequired: 45,
        specialEffect: 'burnBonus',
        effectValue: getEquipFib(5)  // +5% burn rewards
    },

    // ===== FEET SLOT =====
    sneakers: {
        id: 'sneakers',
        name: 'Running Sneakers',
        slot: 'feet',
        rarity: 'common',
        icon: '👟',
        description: 'Stay nimble in the market',
        baseStats: { mkt: getEquipFib(3), lck: getEquipFib(2) },
        levelRequired: 1
    },
    rocket_boots: {
        id: 'rocket_boots',
        name: 'Rocket Boots',
        slot: 'feet',
        rarity: 'uncommon',
        icon: '🚀',
        description: 'To the moon!',
        baseStats: { mkt: getEquipFib(5), str: getEquipFib(3) },
        levelRequired: 12
    },
    cyber_legs: {
        id: 'cyber_legs',
        name: 'Cyber Legs',
        slot: 'feet',
        rarity: 'rare',
        icon: '🦿',
        description: 'Enhanced mobility',
        baseStats: { mkt: getEquipFib(6), dev: getEquipFib(4) },
        levelRequired: 22,
        setId: 'cyborg'
    },
    moonwalk_shoes: {
        id: 'moonwalk_shoes',
        name: 'Moonwalk Shoes',
        slot: 'feet',
        rarity: 'epic',
        icon: '🌙',
        description: 'Walk where others cannot',
        baseStats: { mkt: getEquipFib(7), lck: getEquipFib(6), cha: getEquipFib(4) },
        levelRequired: 35,
        specialEffect: 'speedBonus',
        effectValue: getEquipFib(6)  // +8 speed in combat
    },

    // ===== ACCESSORY SLOT =====
    lucky_coin: {
        id: 'lucky_coin',
        name: 'Lucky Coin',
        slot: 'accessory',
        rarity: 'common',
        icon: '🪙',
        description: 'A simple lucky charm',
        baseStats: { lck: getEquipFib(4) },
        levelRequired: 1
    },
    diamond_ring: {
        id: 'diamond_ring',
        name: 'Diamond Ring',
        slot: 'accessory',
        rarity: 'uncommon',
        icon: '💍',
        description: 'Commitment to holding',
        baseStats: { lck: getEquipFib(5), cha: getEquipFib(3) },
        levelRequired: 7
    },
    whale_badge: {
        id: 'whale_badge',
        name: 'Whale Badge',
        slot: 'accessory',
        rarity: 'rare',
        icon: '🐋',
        description: 'Recognition of massive holdings',
        baseStats: { lck: getEquipFib(6), str: getEquipFib(5), mkt: getEquipFib(4) },
        levelRequired: 25
    },
    genesis_nft: {
        id: 'genesis_nft',
        name: 'Genesis NFT',
        slot: 'accessory',
        rarity: 'legendary',
        icon: '🖼️',
        description: 'The first of its kind',
        baseStats: { lck: getEquipFib(8), cha: getEquipFib(7), com: getEquipFib(6) },
        levelRequired: 50,
        specialEffect: 'xpBonus',
        effectValue: getEquipFib(6)  // +8% XP
    },

    // ===== CYBORG SET (5 pieces) =====
    cyber_eye: {
        id: 'cyber_eye',
        name: 'Cyber Eye',
        slot: 'accessory',
        rarity: 'rare',
        icon: '👁️',
        description: 'See through the noise',
        baseStats: { lck: getEquipFib(5), str: getEquipFib(5), dev: getEquipFib(4) },
        levelRequired: 20,
        setId: 'cyborg'
    }
};

// ============================================
// EQUIPMENT SETS (Fibonacci piece requirements)
// ============================================

const EQUIPMENT_SETS = {
    cyborg: {
        id: 'cyborg',
        name: 'Cyborg Enhancement',
        pieces: ['brain_implant', 'cyber_armor', 'cyber_gloves', 'cyber_legs', 'cyber_eye'],
        bonuses: {
            2: { // 2-piece bonus (fib[3])
                description: '+5 to all stats',
                stats: { dev: 5, com: 5, mkt: 5, str: 5, cha: 5, lck: 5 }
            },
            3: { // 3-piece bonus (fib[4])
                description: '+10% XP gain',
                effect: 'xpBonus',
                value: 10
            },
            5: { // 5-piece bonus (fib[5])
                description: 'Cyber Overdrive: +21% all combat stats',
                effect: 'combatBonus',
                value: 21
            }
        }
    }
};

// ============================================
// EQUIPMENT CRAFTING SYSTEM
// ============================================

const EQUIPMENT_CRAFTING_RECIPES = {
    // Tier 1 - Basic Equipment (from quest materials)
    crypto_visor: {
        id: 'crypto_visor',
        name: 'Crypto Visor',
        icon: '🥽',
        slot: 'head',
        rarity: 'uncommon',
        result: {
            baseStats: { str: getEquipFib(5), dev: getEquipFib(4) },
            levelRequired: 8
        },
        materials: [
            { id: 'raw_silicon', name: 'Raw Silicon', icon: '💎', quantity: 3 },
            { id: 'circuit_board', name: 'Circuit Board', icon: '📟', quantity: 2 }
        ],
        craftTime: 0 // Instant
    },
    blockchain_jacket: {
        id: 'blockchain_jacket',
        name: 'Blockchain Jacket',
        icon: '🧥',
        slot: 'body',
        rarity: 'uncommon',
        result: {
            baseStats: { com: getEquipFib(5), str: getEquipFib(4) },
            levelRequired: 10
        },
        materials: [
            { id: 'code_fragment', name: 'Code Fragment', icon: '📝', quantity: 4 },
            { id: 'raw_silicon', name: 'Raw Silicon', icon: '💎', quantity: 2 }
        ],
        craftTime: 0
    },
    hacker_gloves: {
        id: 'hacker_gloves',
        name: 'Hacker Gloves',
        icon: '🧤',
        slot: 'hands',
        rarity: 'rare',
        result: {
            baseStats: { dev: getEquipFib(6), lck: getEquipFib(4) },
            levelRequired: 15
        },
        materials: [
            { id: 'circuit_board', name: 'Circuit Board', icon: '📟', quantity: 3 },
            { id: 'energy_cell', name: 'Energy Cell', icon: '🔋', quantity: 2 },
            { id: 'code_fragment', name: 'Code Fragment', icon: '📝', quantity: 3 }
        ],
        craftTime: 0
    },
    speed_boots: {
        id: 'speed_boots',
        name: 'DeFi Speed Boots',
        icon: '👢',
        slot: 'feet',
        rarity: 'rare',
        result: {
            baseStats: { mkt: getEquipFib(6), str: getEquipFib(4) },
            levelRequired: 18
        },
        materials: [
            { id: 'energy_cell', name: 'Energy Cell', icon: '🔋', quantity: 4 },
            { id: 'rare_alloy', name: 'Rare Alloy', icon: '⚙️', quantity: 2 }
        ],
        craftTime: 0
    },
    nft_badge: {
        id: 'nft_badge',
        name: 'NFT Badge',
        icon: '🏅',
        slot: 'accessory',
        rarity: 'rare',
        result: {
            baseStats: { lck: getEquipFib(6), cha: getEquipFib(5) },
            levelRequired: 20
        },
        materials: [
            { id: 'code_fragment', name: 'Code Fragment', icon: '📝', quantity: 5 },
            { id: 'ancient_code', name: 'Ancient Code', icon: '📜', quantity: 1 }
        ],
        craftTime: 0
    },
    // Tier 2 - Epic Equipment
    quantum_helmet: {
        id: 'quantum_helmet',
        name: 'Quantum Helmet',
        icon: '⚗️',
        slot: 'head',
        rarity: 'epic',
        result: {
            baseStats: { str: getEquipFib(7), dev: getEquipFib(6), lck: getEquipFib(5) },
            levelRequired: 30,
            specialEffect: 'critBonus',
            effectValue: 5
        },
        materials: [
            { id: 'quantum_chip', name: 'Quantum Chip', icon: '🔮', quantity: 2 },
            { id: 'rare_alloy', name: 'Rare Alloy', icon: '⚙️', quantity: 4 },
            { id: 'energy_cell', name: 'Energy Cell', icon: '🔋', quantity: 5 }
        ],
        craftTime: 0
    },
    dao_armor: {
        id: 'dao_armor',
        name: 'DAO Armor',
        icon: '🛡️',
        slot: 'body',
        rarity: 'epic',
        result: {
            baseStats: { com: getEquipFib(7), cha: getEquipFib(6), str: getEquipFib(5) },
            levelRequired: 35,
            specialEffect: 'defenseBonus',
            effectValue: 10
        },
        materials: [
            { id: 'ancient_code', name: 'Ancient Code', icon: '📜', quantity: 2 },
            { id: 'quantum_chip', name: 'Quantum Chip', icon: '🔮', quantity: 2 },
            { id: 'rare_alloy', name: 'Rare Alloy', icon: '⚙️', quantity: 3 }
        ],
        craftTime: 0
    },
    // Legendary Tier
    genesis_ring: {
        id: 'genesis_ring',
        name: 'Genesis Ring',
        icon: '💫',
        slot: 'accessory',
        rarity: 'legendary',
        result: {
            baseStats: { lck: getEquipFib(8), cha: getEquipFib(7), dev: getEquipFib(6) },
            levelRequired: 45,
            specialEffect: 'xpBonus',
            effectValue: 10
        },
        materials: [
            { id: 'legendary_core', name: 'Legendary Core', icon: '💎', quantity: 1 },
            { id: 'quantum_chip', name: 'Quantum Chip', icon: '🔮', quantity: 3 },
            { id: 'ancient_code', name: 'Ancient Code', icon: '📜', quantity: 3 }
        ],
        craftTime: 0
    }
};

// Crafting materials that can drop from quests
const EQUIPMENT_MATERIALS = {
    raw_silicon: { id: 'raw_silicon', name: 'Raw Silicon', icon: '💎', rarity: 'common', description: 'Basic crafting material' },
    circuit_board: { id: 'circuit_board', name: 'Circuit Board', icon: '📟', rarity: 'common', description: 'For tech equipment' },
    code_fragment: { id: 'code_fragment', name: 'Code Fragment', icon: '📝', rarity: 'common', description: 'Essential for crafting' },
    energy_cell: { id: 'energy_cell', name: 'Energy Cell', icon: '🔋', rarity: 'uncommon', description: 'Powers advanced gear' },
    rare_alloy: { id: 'rare_alloy', name: 'Rare Alloy', icon: '⚙️', rarity: 'rare', description: 'Strong metal alloy' },
    ancient_code: { id: 'ancient_code', name: 'Ancient Code', icon: '📜', rarity: 'rare', description: 'Lost programming secrets' },
    quantum_chip: { id: 'quantum_chip', name: 'Quantum Chip', icon: '🔮', rarity: 'epic', description: 'Quantum computing core' },
    legendary_core: { id: 'legendary_core', name: 'Legendary Core', icon: '💎', rarity: 'legendary', description: 'Ultimate crafting material' }
};

/**
 * Craft an equipment item
 */
function craftItem(recipeId) {
    const recipe = EQUIPMENT_CRAFTING_RECIPES[recipeId];
    if (!recipe) {
        return { success: false, message: 'Recipe not found' };
    }

    const state = window.PumpArenaState?.get();
    if (!state) {
        return { success: false, message: 'Game not loaded' };
    }

    // Check if player has all materials
    const inventory = window.PumpArenaInventory?.getInventory() || [];
    const missingMaterials = [];

    for (const material of recipe.materials) {
        const invItem = inventory.find(i => i.id === material.id);
        const owned = invItem ? invItem.quantity : 0;
        if (owned < material.quantity) {
            missingMaterials.push({
                ...material,
                owned,
                needed: material.quantity - owned
            });
        }
    }

    if (missingMaterials.length > 0) {
        const missing = missingMaterials.map(m => `${m.name} (${m.needed} more)`).join(', ');
        return { success: false, message: `Missing materials: ${missing}` };
    }

    // Consume materials
    for (const material of recipe.materials) {
        window.PumpArenaInventory?.removeItem(material.id, material.quantity);
    }

    // Create the crafted item and add to EQUIPMENT_ITEMS if not exists
    const craftedItemId = `crafted_${recipe.id}`;
    if (!EQUIPMENT_ITEMS[craftedItemId]) {
        EQUIPMENT_ITEMS[craftedItemId] = {
            id: craftedItemId,
            name: recipe.name,
            slot: recipe.slot,
            rarity: recipe.rarity,
            icon: recipe.icon,
            description: `Crafted ${recipe.name}`,
            baseStats: recipe.result.baseStats,
            levelRequired: recipe.result.levelRequired,
            specialEffect: recipe.result.specialEffect,
            effectValue: recipe.result.effectValue,
            crafted: true
        };
    }

    // Add crafted item to inventory
    window.PumpArenaInventory?.addItem(craftedItemId, 1);

    return {
        success: true,
        message: `Crafted ${recipe.name}!`,
        item: EQUIPMENT_ITEMS[craftedItemId]
    };
}

/**
 * Check if a recipe can be crafted
 */
function canCraft(recipeId) {
    const recipe = EQUIPMENT_CRAFTING_RECIPES[recipeId];
    if (!recipe) return false;

    const inventory = window.PumpArenaInventory?.getInventory() || [];

    for (const material of recipe.materials) {
        const invItem = inventory.find(i => i.id === material.id);
        const owned = invItem ? invItem.quantity : 0;
        if (owned < material.quantity) return false;
    }

    return true;
}

// ============================================
// EQUIPMENT STATE
// ============================================

const EQUIPMENT_STORAGE_KEY = 'asdf_pumparena_equipment_v1';

let equipmentState = {
    equipped: {
        head: null,
        body: null,
        hands: null,
        feet: null,
        accessory: null
    },
    bonusStats: {},
    activeSetBonuses: []
};

// ============================================
// SECURITY: INPUT VALIDATION
// ============================================

function validateItemId(itemId) {
    return typeof itemId === 'string' &&
           itemId.length > 0 &&
           itemId.length < 50 &&
           /^[a-z0-9_]+$/.test(itemId) &&
           EQUIPMENT_ITEMS[itemId];
}

function validateSlot(slot) {
    return typeof slot === 'string' && EQUIPMENT_SLOTS[slot];
}

// ============================================
// EQUIPMENT FUNCTIONS
// ============================================

/**
 * Load equipment state from storage
 */
function loadEquipmentState() {
    try {
        const saved = localStorage.getItem(EQUIPMENT_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);

            // Validate loaded data (Security by Design)
            if (parsed.equipped && typeof parsed.equipped === 'object') {
                Object.keys(EQUIPMENT_SLOTS).forEach(slot => {
                    const itemId = parsed.equipped[slot];
                    if (itemId && validateItemId(itemId)) {
                        const item = EQUIPMENT_ITEMS[itemId];
                        if (item && item.slot === slot) {
                            equipmentState.equipped[slot] = itemId;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Failed to load equipment state:', e);
    }

    recalculateBonuses();
}

/**
 * Save equipment state to storage
 */
function saveEquipmentState() {
    try {
        localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify({
            equipped: equipmentState.equipped,
            version: '1.0.0'
        }));
    } catch (e) {
        console.warn('Failed to save equipment state:', e);
    }
}

/**
 * Equip an item
 * @param {string} itemId - Item to equip
 * @returns {Object} Result
 */
function equipItem(itemId) {
    // Validation (Security by Design)
    if (!validateItemId(itemId)) {
        return { success: false, message: 'Invalid item' };
    }

    const item = EQUIPMENT_ITEMS[itemId];
    const state = window.PumpArenaState?.get();

    // Check level requirement
    if (state && state.progression.level < item.levelRequired) {
        return { success: false, message: `Requires level ${item.levelRequired}` };
    }

    // Check if player owns the item
    if (window.PumpArenaInventory) {
        const inventory = window.PumpArenaInventory.getInventory();
        const hasItem = inventory.some(i => i.id === itemId && i.quantity > 0);
        if (!hasItem) {
            return { success: false, message: 'You don\'t own this item' };
        }
    }

    // Store previously equipped item
    const previousItem = equipmentState.equipped[item.slot];

    // Equip the new item
    equipmentState.equipped[item.slot] = itemId;

    // Recalculate bonuses
    recalculateBonuses();

    // Save state
    saveEquipmentState();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('pumparena:equipment-changed', {
        detail: {
            slot: item.slot,
            equipped: itemId,
            unequipped: previousItem
        }
    }));

    return {
        success: true,
        message: `Equipped ${item.name}`,
        previousItem,
        bonuses: equipmentState.bonusStats
    };
}

/**
 * Unequip an item
 * @param {string} slot - Slot to unequip
 * @returns {Object} Result
 */
function unequipItem(slot) {
    if (!validateSlot(slot)) {
        return { success: false, message: 'Invalid slot' };
    }

    const itemId = equipmentState.equipped[slot];
    if (!itemId) {
        return { success: false, message: 'Nothing equipped in this slot' };
    }

    equipmentState.equipped[slot] = null;
    recalculateBonuses();
    saveEquipmentState();

    document.dispatchEvent(new CustomEvent('pumparena:equipment-changed', {
        detail: { slot, equipped: null, unequipped: itemId }
    }));

    return { success: true, message: 'Item unequipped', item: itemId };
}

/**
 * Get currently equipped items
 */
function getEquipped() {
    const result = {};
    Object.keys(equipmentState.equipped).forEach(slot => {
        const itemId = equipmentState.equipped[slot];
        if (itemId && EQUIPMENT_ITEMS[itemId]) {
            result[slot] = {
                ...EQUIPMENT_ITEMS[itemId],
                itemId
            };
        } else {
            result[slot] = null;
        }
    });
    return result;
}

/**
 * Get total stat bonuses from equipment
 */
function getEquipmentBonuses() {
    return { ...equipmentState.bonusStats };
}

/**
 * Get active set bonuses
 */
function getActiveSetBonuses() {
    return [...equipmentState.activeSetBonuses];
}

/**
 * Recalculate all bonuses from equipped items
 */
function recalculateBonuses() {
    const bonuses = {
        dev: 0, com: 0, mkt: 0, str: 0, cha: 0, lck: 0,
        xpBonus: 0,
        critBonus: 0,
        defenseBonus: 0,
        speedBonus: 0,
        burnBonus: 0,
        combatBonus: 0
    };

    const equippedSets = {};

    // Calculate item bonuses
    Object.values(equipmentState.equipped).forEach(itemId => {
        if (!itemId || !EQUIPMENT_ITEMS[itemId]) return;

        const item = EQUIPMENT_ITEMS[itemId];
        const rarity = EQUIPMENT_RARITY[item.rarity];

        // Apply base stats with rarity multiplier
        if (item.baseStats) {
            Object.entries(item.baseStats).forEach(([stat, value]) => {
                if (bonuses.hasOwnProperty(stat)) {
                    bonuses[stat] += Math.floor(value * rarity.statMultiplier);
                }
            });
        }

        // Apply special effects
        if (item.specialEffect && item.effectValue) {
            if (bonuses.hasOwnProperty(item.specialEffect)) {
                bonuses[item.specialEffect] += item.effectValue;
            }
        }

        // Track set pieces
        if (item.setId) {
            equippedSets[item.setId] = (equippedSets[item.setId] || 0) + 1;
        }
    });

    // Calculate set bonuses
    equipmentState.activeSetBonuses = [];

    Object.entries(equippedSets).forEach(([setId, pieceCount]) => {
        const set = EQUIPMENT_SETS[setId];
        if (!set) return;

        // Check each bonus threshold (2, 3, 5)
        [2, 3, 5].forEach(threshold => {
            if (pieceCount >= threshold && set.bonuses[threshold]) {
                const bonus = set.bonuses[threshold];

                // Apply stat bonuses
                if (bonus.stats) {
                    Object.entries(bonus.stats).forEach(([stat, value]) => {
                        if (bonuses.hasOwnProperty(stat)) {
                            bonuses[stat] += value;
                        }
                    });
                }

                // Apply effect bonuses
                if (bonus.effect && bonus.value) {
                    if (bonuses.hasOwnProperty(bonus.effect)) {
                        bonuses[bonus.effect] += bonus.value;
                    }
                }

                equipmentState.activeSetBonuses.push({
                    setId,
                    pieces: threshold,
                    description: bonus.description
                });
            }
        });
    });

    equipmentState.bonusStats = bonuses;
}

/**
 * Get effective stats (base + equipment)
 */
function getEffectiveStats() {
    const state = window.PumpArenaState?.get();
    if (!state) return null;

    const baseStats = state.stats;
    const equipBonuses = equipmentState.bonusStats;

    return {
        dev: baseStats.dev + (equipBonuses.dev || 0),
        com: baseStats.com + (equipBonuses.com || 0),
        mkt: baseStats.mkt + (equipBonuses.mkt || 0),
        str: baseStats.str + (equipBonuses.str || 0),
        cha: baseStats.cha + (equipBonuses.cha || 0),
        lck: baseStats.lck + (equipBonuses.lck || 0)
    };
}

// ============================================
// EQUIPMENT UI
// ============================================

let equipmentPanelTab = 'equipment'; // 'equipment' or 'crafting'

function renderEquipmentPanel(container) {
    const equipped = getEquipped();
    const bonuses = getEquipmentBonuses();
    const effectiveStats = getEffectiveStats();
    const setBonuses = getActiveSetBonuses();

    const statColors = {
        dev: '#3b82f6', com: '#22c55e', mkt: '#f97316',
        str: '#a855f7', cha: '#ec4899', lck: '#eab308'
    };
    const rarityColors = { common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f97316' };

    container.innerHTML = `
        <div class="equipment-panel" style="background: #12121a; padding: 0; border-radius: 16px; overflow: hidden; border: 2px solid #a855f7;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2e1a2e, #200d20); padding: 20px; border-bottom: 2px solid #a855f740;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 32px;">🛡️</span>
                    <div>
                        <h3 style="color: #a855f7; margin: 0; font-size: 20px;">Equipment & Crafting</h3>
                        <div style="color: #c4b5fd; font-size: 12px;">Gear up and craft powerful items</div>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display: flex; border-bottom: 1px solid #333;">
                <button id="tab-equipment" style="
                    flex: 1; padding: 15px; background: ${equipmentPanelTab === 'equipment' ? '#1a1a24' : 'transparent'};
                    border: none; border-bottom: ${equipmentPanelTab === 'equipment' ? '3px solid #a855f7' : '3px solid transparent'};
                    color: ${equipmentPanelTab === 'equipment' ? '#a855f7' : '#666'}; font-size: 14px; font-weight: 600;
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
                ">
                    <span>🛡️</span> Equipment
                </button>
                <button id="tab-crafting" style="
                    flex: 1; padding: 15px; background: ${equipmentPanelTab === 'crafting' ? '#1a1a24' : 'transparent'};
                    border: none; border-bottom: ${equipmentPanelTab === 'crafting' ? '3px solid #f97316' : '3px solid transparent'};
                    color: ${equipmentPanelTab === 'crafting' ? '#f97316' : '#666'}; font-size: 14px; font-weight: 600;
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
                ">
                    <span>⚒️</span> Crafting
                </button>
            </div>

            ${equipmentPanelTab === 'equipment' ? renderEquipmentTabContent(equipped, bonuses, effectiveStats, setBonuses, statColors) : renderCraftingTabContent(rarityColors)}
        </div>
    `;

    // Tab handlers
    container.querySelector('#tab-equipment')?.addEventListener('click', () => {
        equipmentPanelTab = 'equipment';
        renderEquipmentPanel(container);
    });
    container.querySelector('#tab-crafting')?.addEventListener('click', () => {
        equipmentPanelTab = 'crafting';
        renderEquipmentPanel(container);
    });

    // Unequip button handlers
    container.querySelectorAll('.btn-unequip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slot = btn.dataset.slot;
            const result = unequipItem(slot);
            if (result.success) {
                showEquipmentNotification(result.message, 'info');
                renderEquipmentPanel(container);
            }
        });
    });

    // Equip button handlers
    container.querySelectorAll('.btn-equip').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.item;
            const result = equipItem(itemId);
            if (result.success) {
                showEquipmentNotification(result.message, 'success');
                renderEquipmentPanel(container);
            } else {
                showEquipmentNotification(result.message, 'error');
            }
        });
    });

    // Craft button handlers
    container.querySelectorAll('.btn-craft').forEach(btn => {
        btn.addEventListener('click', () => {
            const recipeId = btn.dataset.recipe;
            const result = craftItem(recipeId);
            if (result.success) {
                showEquipmentNotification(result.message, 'success');
                renderEquipmentPanel(container);
            } else {
                showEquipmentNotification(result.message, 'error');
            }
        });
    });
}

function renderEquipmentTabContent(equipped, bonuses, effectiveStats, setBonuses, statColors) {
    return `
        <div style="padding: 20px; max-height: 65vh; overflow-y: auto;">
            <!-- Equipment Slots Grid -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                ${Object.entries(EQUIPMENT_SLOTS).map(([slotId, slot]) => {
                    const item = equipped[slotId];
                    const rarity = item ? EQUIPMENT_RARITY[item.rarity] : null;
                    const borderColor = item ? rarity.color : '#333';
                    const bgColor = item ? `${rarity.color}15` : '#1a1a24';

                    return `
                        <div style="
                            background: ${bgColor}; padding: 15px; border-radius: 12px;
                            border: 2px solid ${borderColor}; position: relative;
                            transition: all 0.2s; cursor: pointer;
                        " data-slot="${slotId}">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="font-size: 24px; filter: ${item ? 'none' : 'grayscale(0.7)'};">${item ? item.icon : slot.icon}</div>
                                <div>
                                    <div style="color: #888; font-size: 10px; text-transform: uppercase;">${slot.name}</div>
                                    ${item ? `
                                        <div style="color: ${rarity.color}; font-size: 13px; font-weight: 600;">${escapeHtml(item.name)}</div>
                                    ` : '<div style="color: #555; font-size: 12px; font-style: italic;">Empty</div>'}
                                </div>
                            </div>
                            ${item ? `
                                <button class="btn-unequip" data-slot="${slotId}" style="
                                    position: absolute; top: 8px; right: 8px;
                                    width: 20px; height: 20px; border-radius: 50%;
                                    background: #ef444440; border: 1px solid #ef4444;
                                    color: #ef4444; font-size: 12px; cursor: pointer;
                                    display: flex; align-items: center; justify-content: center;
                                ">✕</button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Set Bonuses -->
            ${setBonuses.length > 0 ? `
                <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                    <h4 style="color: #fbbf24; margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <span>⚡</span> Active Set Bonuses
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${setBonuses.map(bonus => `
                            <div style="background: #fbbf2410; padding: 10px; border-radius: 8px; border-left: 3px solid #fbbf24;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="color: #fbbf24; font-weight: 600;">${EQUIPMENT_SETS[bonus.setId]?.name || bonus.setId}</span>
                                    <span style="background: #fbbf2430; color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${bonus.pieces}pc</span>
                                </div>
                                <div style="color: #888; font-size: 12px; margin-top: 4px;">${escapeHtml(bonus.description)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Stats Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <!-- Equipment Bonuses -->
                <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 15px;">
                    <h4 style="color: #22c55e; margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <span>📈</span> Equipment Bonuses
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        ${['dev', 'com', 'mkt', 'str', 'cha', 'lck'].map(stat => {
                            const bonus = bonuses[stat] || 0;
                            const color = statColors[stat];
                            return `
                                <div style="background: ${bonus > 0 ? `${color}20` : '#12121a'}; padding: 8px; border-radius: 6px; text-align: center; border: 1px solid ${bonus > 0 ? `${color}40` : '#333'};">
                                    <div style="color: ${bonus > 0 ? color : '#555'}; font-size: 10px;">${stat.toUpperCase()}</div>
                                    <div style="color: ${bonus > 0 ? color : '#555'}; font-weight: bold; font-size: 14px;">${bonus > 0 ? `+${bonus}` : '0'}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Effective Stats -->
                <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 15px;">
                    <h4 style="color: #3b82f6; margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <span>📊</span> Total Stats
                    </h4>
                    ${effectiveStats ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                            ${Object.entries(effectiveStats).map(([stat, value]) => {
                                const color = statColors[stat];
                                return `
                                    <div style="background: ${color}15; padding: 8px; border-radius: 6px; text-align: center; border: 1px solid ${color}40;">
                                        <div style="color: ${color}; font-size: 10px;">${stat.toUpperCase()}</div>
                                        <div style="color: ${color}; font-weight: bold; font-size: 16px;">${value}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : '<p style="color: #666; text-align: center;">Loading stats...</p>'}
                </div>
            </div>

            <!-- Available Equipment -->
            <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 15px;">
                <h4 style="color: #ffffff; margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    <span style="color: #ec4899;">🎒</span> Available Equipment
                </h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${renderAvailableEquipment()}
                </div>
            </div>
        </div>
    `;
}

function renderCraftingTabContent(rarityColors) {
    const inventory = window.PumpArenaInventory?.getInventory() || [];

    // Get material counts
    const getMaterialCount = (id) => {
        const item = inventory.find(i => i.id === id);
        return item ? item.quantity : 0;
    };

    return `
        <div style="padding: 20px; max-height: 65vh; overflow-y: auto;">
            <!-- Materials Inventory -->
            <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #3b82f6; margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    <span>📦</span> Your Materials
                    <span style="color: #666; font-size: 11px; font-weight: normal;">(Earn from quests & battles)</span>
                </h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                    ${Object.values(EQUIPMENT_MATERIALS).map(mat => {
                        const count = getMaterialCount(mat.id);
                        const color = rarityColors[mat.rarity] || '#666';
                        return `
                            <div style="background: ${count > 0 ? `${color}15` : '#12121a'}; padding: 10px; border-radius: 8px; text-align: center; border: 1px solid ${count > 0 ? `${color}40` : '#333'};">
                                <div style="font-size: 20px; margin-bottom: 4px;">${mat.icon}</div>
                                <div style="color: ${count > 0 ? '#fff' : '#555'}; font-size: 10px;">${mat.name}</div>
                                <div style="color: ${count > 0 ? color : '#444'}; font-weight: bold; font-size: 14px;">${count}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Crafting Recipes -->
            <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 15px;">
                <h4 style="color: #f97316; margin: 0 0 15px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    <span>⚒️</span> Recipes
                </h4>
                <div style="display: grid; gap: 12px;">
                    ${Object.values(EQUIPMENT_CRAFTING_RECIPES).map(recipe => {
                        const canCraftRecipe = canCraft(recipe.id);
                        const color = rarityColors[recipe.rarity] || '#666';

                        return `
                            <div style="background: linear-gradient(135deg, #12121a, ${color}10); border: 2px solid ${canCraftRecipe ? color : '#333'}; border-radius: 12px; padding: 15px; opacity: ${canCraftRecipe ? '1' : '0.7'};">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <!-- Result Item -->
                                    <div style="text-align: center; min-width: 80px;">
                                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, ${color}30, ${color}10); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 6px; border: 2px solid ${color}50;">
                                            ${recipe.icon}
                                        </div>
                                        <div style="color: ${color}; font-weight: 600; font-size: 12px;">${recipe.name}</div>
                                        <div style="color: #666; font-size: 10px; text-transform: uppercase;">${recipe.rarity} • ${EQUIPMENT_SLOTS[recipe.slot]?.name || recipe.slot}</div>
                                    </div>

                                    <!-- Materials Required -->
                                    <div style="flex: 1; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                                        ${recipe.materials.map(mat => {
                                            const owned = getMaterialCount(mat.id);
                                            const hasEnough = owned >= mat.quantity;
                                            return `
                                                <div style="display: flex; align-items: center; gap: 4px; background: ${hasEnough ? '#22c55e15' : '#ef444415'}; padding: 6px 10px; border-radius: 6px; border: 1px solid ${hasEnough ? '#22c55e40' : '#ef444440'};">
                                                    <span style="font-size: 16px;">${mat.icon}</span>
                                                    <span style="color: ${hasEnough ? '#22c55e' : '#ef4444'}; font-size: 11px; font-weight: 600;">${owned}/${mat.quantity}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>

                                    <!-- Craft Button -->
                                    <button class="btn-craft" data-recipe="${recipe.id}" ${!canCraftRecipe ? 'disabled' : ''} style="
                                        padding: 12px 20px; min-width: 100px;
                                        background: ${canCraftRecipe ? `linear-gradient(135deg, ${color}, ${color}cc)` : '#333'};
                                        border: none; border-radius: 8px;
                                        color: ${canCraftRecipe ? '#fff' : '#666'}; font-size: 13px; font-weight: 600;
                                        cursor: ${canCraftRecipe ? 'pointer' : 'not-allowed'};
                                        transition: all 0.2s;
                                    ">
                                        ${canCraftRecipe ? '⚒️ Craft' : '🔒 Missing'}
                                    </button>
                                </div>

                                <!-- Stats Preview -->
                                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; display: flex; gap: 10px; flex-wrap: wrap;">
                                    ${Object.entries(recipe.result.baseStats || {}).map(([stat, val]) => `
                                        <span style="color: #888; font-size: 11px;">+${val} <span style="color: #666;">${stat.toUpperCase()}</span></span>
                                    `).join('')}
                                    ${recipe.result.specialEffect ? `
                                        <span style="color: #fbbf24; font-size: 11px;">✨ +${recipe.result.effectValue}% ${recipe.result.specialEffect.replace('Bonus', '')}</span>
                                    ` : ''}
                                    <span style="color: #555; font-size: 11px; margin-left: auto;">Req. Level ${recipe.result.levelRequired}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderAvailableEquipment() {
    const state = window.PumpArenaState?.get();
    const playerLevel = state?.progression.level || 1;
    const equipped = equipmentState.equipped;

    // Get items that can be equipped
    const available = Object.values(EQUIPMENT_ITEMS)
        .filter(item => {
            // Not already equipped
            if (equipped[item.slot] === item.id) return false;
            // Meets level requirement (or within 5 levels)
            if (item.levelRequired > playerLevel + 5) return false;
            return true;
        })
        .sort((a, b) => a.levelRequired - b.levelRequired)
        .slice(0, 8);

    if (available.length === 0) {
        return `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #666;">
            <div style="font-size: 32px; margin-bottom: 10px;">📦</div>
            <div>No equipment available at your level</div>
        </div>`;
    }

    return available.map(item => {
        const rarity = EQUIPMENT_RARITY[item.rarity];
        const canEquip = playerLevel >= item.levelRequired;
        const statsText = Object.entries(item.baseStats || {})
            .map(([stat, val]) => `<span style="color: #888;">+${val}</span> <span style="color: #666;">${stat.toUpperCase()}</span>`)
            .join(' ');

        return `
            <div style="
                background: ${canEquip ? `${rarity.color}10` : '#12121a'};
                padding: 12px; border-radius: 10px;
                border: 1px solid ${canEquip ? rarity.color : '#333'};
                opacity: ${canEquip ? '1' : '0.6'};
                transition: all 0.2s;
            " ${canEquip ? 'onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'"' : ''}>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <div style="font-size: 24px;">${item.icon}</div>
                    <div style="flex: 1;">
                        <div style="color: ${rarity.color}; font-size: 13px; font-weight: 600;">${escapeHtml(item.name)}</div>
                        <div style="color: #666; font-size: 10px;">${EQUIPMENT_SLOTS[item.slot].name}</div>
                    </div>
                    <span style="background: ${rarity.color}30; color: ${rarity.color}; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase;">${item.rarity}</span>
                </div>
                <div style="font-size: 11px; margin-bottom: 8px;">${statsText}</div>
                <button class="btn-equip" data-item="${item.id}" ${!canEquip ? 'disabled' : ''} style="
                    width: 100%; padding: 8px;
                    background: ${canEquip ? `linear-gradient(135deg, ${rarity.color}, ${rarity.color}dd)` : '#333'};
                    border: none; border-radius: 6px;
                    color: ${canEquip ? 'white' : '#666'}; font-size: 12px; font-weight: 600;
                    cursor: ${canEquip ? 'pointer' : 'not-allowed'};
                ">
                    ${canEquip ? 'Equip' : `🔒 Lvl ${item.levelRequired}`}
                </button>
            </div>
        `;
    }).join('');
}

function showEquipmentNotification(message, type) {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        console.log(`[Equipment ${type}] ${message}`);
    }
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INITIALIZATION
// ============================================

// Load state on module load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', loadEquipmentState);
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaEquipment = {
        // Core functions
        load: loadEquipmentState,
        save: saveEquipmentState,
        equip: equipItem,
        unequip: unequipItem,

        // Crafting functions
        craft: craftItem,
        canCraft,

        // Getters
        getEquipped,
        getBonuses: getEquipmentBonuses,
        getSetBonuses: getActiveSetBonuses,
        getEffectiveStats,

        // UI
        renderPanel: renderEquipmentPanel,

        // Constants
        SLOTS: EQUIPMENT_SLOTS,
        ITEMS: EQUIPMENT_ITEMS,
        RARITY: EQUIPMENT_RARITY,
        SETS: EQUIPMENT_SETS,
        RECIPES: EQUIPMENT_CRAFTING_RECIPES,
        MATERIALS: EQUIPMENT_MATERIALS,
        getFib: getEquipFib
    };
}
