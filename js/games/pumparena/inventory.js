/**
 * Pump Arena RPG - Inventory System
 * Items, tools, consumables, and collectibles management
 *
 * PHILOSOPHY: ASDF Integration
 * - All prices derived from Fibonacci sequence
 * - Tier discounts reduce prices
 * - Sell prices are fib[n-2] of buy price index
 */

'use strict';

// ============================================
// SECURITY UTILITIES
// Uses global escapeHtml from utils.js (loaded first)
// ============================================

// ============================================
// ASDF FIBONACCI HELPER
// ============================================

const INV_FIB = [
  0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181,
];

function getInvFib(n) {
  if (typeof window.PumpArenaState !== 'undefined' && window.PumpArenaState.getFib) {
    return window.PumpArenaState.getFib(n);
  }
  if (n < 0) return 0;
  if (n < INV_FIB.length) return INV_FIB[n];
  return INV_FIB[INV_FIB.length - 1];
}

/**
 * Get tier discount for purchases (ASDF Philosophy)
 * Higher tiers get fib[tier] percent discount
 */
function getTierDiscount() {
  if (typeof window.PumpArenaState !== 'undefined' && window.PumpArenaState.getTierDiscount) {
    return window.PumpArenaState.getTierDiscount();
  }
  return 0;
}

/**
 * Get price with tier discount applied
 */
function getDiscountedPrice(basePrice) {
  const discount = getTierDiscount();
  return Math.floor(basePrice * (1 - discount));
}

// ============================================
// ITEM TYPES
// ============================================

const ITEM_TYPES = {
  TOOL: 'tool', // Permanent equipment with bonuses
  CONSUMABLE: 'consumable', // Single-use items
  COLLECTIBLE: 'collectible', // Rare items for achievements
  MATERIAL: 'material', // Crafting/upgrade materials
};

// Rarity with Fibonacci-based multipliers
const ITEM_RARITY = {
  COMMON: { id: 'common', name: 'Common', color: '#9ca3af', fibIndex: 7, multiplier: 1 }, // base fib[7]=13 * 10 = 130
  UNCOMMON: { id: 'uncommon', name: 'Uncommon', color: '#22c55e', fibIndex: 9, multiplier: 1.5 }, // fib[9]=34 * 10 = 340
  RARE: { id: 'rare', name: 'Rare', color: '#3b82f6', fibIndex: 11, multiplier: 2 }, // fib[11]=89 * 10 = 890
  EPIC: { id: 'epic', name: 'Epic', color: '#a855f7', fibIndex: 13, multiplier: 3 }, // fib[13]=233 * 10 = 2330
  LEGENDARY: { id: 'legendary', name: 'Legendary', color: '#f97316', fibIndex: 15, multiplier: 5 }, // fib[15]=610 * 10 = 6100
};

/**
 * Calculate item price based on rarity (ASDF Philosophy)
 * Price = fib[rarity.fibIndex] * 10
 * Sell = fib[rarity.fibIndex - 2] * 10
 */
function calculateItemPrice(rarity) {
  const rarityData = typeof rarity === 'string' ? ITEM_RARITY[rarity.toUpperCase()] : rarity;
  if (!rarityData) return { buy: 100, sell: 25 };
  return {
    buy: getInvFib(rarityData.fibIndex) * 10,
    sell: getInvFib(rarityData.fibIndex - 2) * 10,
  };
}

// ============================================
// ITEMS DATABASE
// ============================================

const ITEMS = {
  // ==========================================
  // TOOLS (Permanent Equipment)
  // ==========================================

  // Developer Tools
  laptop_basic: {
    id: 'laptop_basic',
    name: 'Basic Laptop',
    icon: '&#128187;',
    type: ITEM_TYPES.TOOL,
    rarity: 'common',
    description: 'A reliable machine for everyday coding.',
    effect: { stat: 'dev', bonus: 2 },
    price: 100,
    sellPrice: 25,
  },
  laptop_pro: {
    id: 'laptop_pro',
    name: 'Pro Workstation',
    icon: '&#128421;',
    type: ITEM_TYPES.TOOL,
    rarity: 'rare',
    description: 'High-performance machine for serious developers.',
    effect: { stat: 'dev', bonus: 5, xpBonus: 0.05 },
    price: 500,
    sellPrice: 125,
  },
  mechanical_keyboard: {
    id: 'mechanical_keyboard',
    name: 'Mechanical Keyboard',
    icon: '&#9000;',
    type: ITEM_TYPES.TOOL,
    rarity: 'uncommon',
    description: 'The satisfying click of productivity.',
    effect: { stat: 'dev', bonus: 3, taskSpeedBonus: 0.1 },
    price: 200,
    sellPrice: 50,
  },

  // Community Tools
  microphone: {
    id: 'microphone',
    name: 'Streaming Mic',
    icon: '&#127908;',
    type: ITEM_TYPES.TOOL,
    rarity: 'uncommon',
    description: 'Crystal clear communication with your community.',
    effect: { stat: 'com', bonus: 3, stat2: 'cha', bonus2: 2 },
    price: 250,
    sellPrice: 60,
  },
  ring_light: {
    id: 'ring_light',
    name: 'Ring Light',
    icon: '&#128161;',
    type: ITEM_TYPES.TOOL,
    rarity: 'common',
    description: 'Look good on camera, feel confident.',
    effect: { stat: 'cha', bonus: 3 },
    price: 100,
    sellPrice: 25,
  },

  // Marketing Tools
  analytics_suite: {
    id: 'analytics_suite',
    name: 'Analytics Suite',
    icon: '&#128202;',
    type: ITEM_TYPES.TOOL,
    rarity: 'rare',
    description: 'Data-driven insights for growth hacking.',
    effect: { stat: 'mkt', bonus: 4, stat2: 'str', bonus2: 3 },
    price: 400,
    sellPrice: 100,
  },
  social_scheduler: {
    id: 'social_scheduler',
    name: 'Social Scheduler',
    icon: '&#128197;',
    type: ITEM_TYPES.TOOL,
    rarity: 'uncommon',
    description: 'Never miss the perfect posting time.',
    effect: { stat: 'mkt', bonus: 3, influenceRegenBonus: 0.1 },
    price: 200,
    sellPrice: 50,
  },

  // Strategy Tools
  whiteboard: {
    id: 'whiteboard',
    name: 'Digital Whiteboard',
    icon: '&#128203;',
    type: ITEM_TYPES.TOOL,
    rarity: 'common',
    description: 'Visualize your grand plans.',
    effect: { stat: 'str', bonus: 2 },
    price: 100,
    sellPrice: 25,
  },
  market_terminal: {
    id: 'market_terminal',
    name: 'Market Terminal',
    icon: '&#128200;',
    type: ITEM_TYPES.TOOL,
    rarity: 'epic',
    description: 'Real-time data from every exchange.',
    effect: { stat: 'str', bonus: 6, stat2: 'lck', bonus2: 3, eventBonusChance: 0.1 },
    price: 1000,
    sellPrice: 250,
  },

  // Legendary Tools
  satoshi_notebook: {
    id: 'satoshi_notebook',
    name: "Satoshi's Notebook",
    icon: '&#128213;',
    type: ITEM_TYPES.TOOL,
    rarity: 'legendary',
    description: 'Rumored to contain the original Bitcoin notes.',
    effect: { allStatsBonus: 3, xpBonus: 0.15 },
    price: 5000,
    sellPrice: 1250,
  },
  vitalik_hoodie: {
    id: 'vitalik_hoodie',
    name: "Vitalik's Hoodie",
    icon: '&#129509;',
    type: ITEM_TYPES.TOOL,
    rarity: 'legendary',
    description: 'The iconic grey hoodie. Imbued with Ethereum energy.',
    effect: { stat: 'dev', bonus: 10, stat2: 'str', bonus2: 5 },
    price: 5000,
    sellPrice: 1250,
  },

  // ==========================================
  // CONSUMABLES (Single-use)
  // ==========================================

  coffee: {
    id: 'coffee',
    name: 'Coffee',
    icon: '&#9749;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'common',
    description: 'A quick energy boost.',
    effect: { influenceRestore: 15 },
    price: 20,
    sellPrice: 5,
    stackable: true,
    maxStack: 10,
  },
  energy_drink: {
    id: 'energy_drink',
    name: 'Energy Drink',
    icon: '&#9889;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'uncommon',
    description: 'Serious energy for serious builders.',
    effect: { influenceRestore: 35 },
    price: 50,
    sellPrice: 12,
    stackable: true,
    maxStack: 5,
  },
  power_smoothie: {
    id: 'power_smoothie',
    name: 'Power Smoothie',
    icon: '&#127865;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'rare',
    description: 'The ultimate productivity fuel.',
    effect: { influenceRestore: 60, tempStatBoost: { all: 2, duration: 300 } },
    price: 150,
    sellPrice: 40,
    stackable: true,
    maxStack: 3,
  },
  vacation_ticket: {
    id: 'vacation_ticket',
    name: 'Vacation Ticket',
    icon: '&#127965;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'epic',
    description: 'Full mental reset. Come back refreshed.',
    effect: { influenceRestoreFull: true, bonusXP: 100 },
    price: 500,
    sellPrice: 125,
    stackable: true,
    maxStack: 2,
  },

  // XP Boosters
  xp_scroll_small: {
    id: 'xp_scroll_small',
    name: 'XP Scroll (Small)',
    icon: '&#128220;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'common',
    description: 'Grants a small amount of experience.',
    effect: { grantXP: 50 },
    price: 30,
    sellPrice: 8,
    stackable: true,
    maxStack: 10,
  },
  xp_scroll_medium: {
    id: 'xp_scroll_medium',
    name: 'XP Scroll (Medium)',
    icon: '&#128220;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'uncommon',
    description: 'Grants a moderate amount of experience.',
    effect: { grantXP: 150 },
    price: 80,
    sellPrice: 20,
    stackable: true,
    maxStack: 5,
  },
  xp_scroll_large: {
    id: 'xp_scroll_large',
    name: 'XP Scroll (Large)',
    icon: '&#128220;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'rare',
    description: 'Grants a large amount of experience.',
    effect: { grantXP: 400 },
    price: 200,
    sellPrice: 50,
    stackable: true,
    maxStack: 3,
  },

  // Reputation Boosters
  reputation_badge: {
    id: 'reputation_badge',
    name: 'Reputation Badge',
    icon: '&#127942;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'uncommon',
    description: 'Instant street cred.',
    effect: { grantReputation: 50 },
    price: 100,
    sellPrice: 25,
    stackable: true,
    maxStack: 5,
  },
  viral_moment: {
    id: 'viral_moment',
    name: 'Viral Moment',
    icon: '&#128293;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'rare',
    description: 'Capture lightning in a bottle.',
    effect: { grantReputation: 150, grantXP: 100 },
    price: 300,
    sellPrice: 75,
    stackable: true,
    maxStack: 2,
  },

  // Special Consumables
  lucky_charm: {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    icon: '&#127808;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'rare',
    description: 'Temporary boost to luck for better event outcomes.',
    effect: { tempStatBoost: { lck: 10, duration: 600 } },
    price: 200,
    sellPrice: 50,
    stackable: true,
    maxStack: 3,
  },
  fud_shield_potion: {
    id: 'fud_shield_potion',
    name: 'FUD Shield Potion',
    icon: '&#128737;',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'rare',
    description: 'Protects against the next negative event.',
    effect: { negativeEventShield: 1 },
    price: 250,
    sellPrice: 60,
    stackable: true,
    maxStack: 3,
  },

  // ==========================================
  // COLLECTIBLES (Rare Achievement Items)
  // ==========================================

  genesis_block: {
    id: 'genesis_block',
    name: 'Genesis Block Shard',
    icon: '&#129689;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'legendary',
    description: 'A fragment from the very first Bitcoin block.',
    lore: 'January 3, 2009. "Chancellor on brink of second bailout for banks."',
    achievement: 'genesis_collector',
  },
  eth_merge_coin: {
    id: 'eth_merge_coin',
    name: 'Merge Commemorative Coin',
    icon: '&#128142;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'epic',
    description: 'Celebrating the historic Ethereum merge.',
    lore: 'September 15, 2022. The day Ethereum went green.',
    achievement: 'eth_historian',
  },
  doge_plushie: {
    id: 'doge_plushie',
    name: 'Doge Plushie',
    icon: '&#128054;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'rare',
    description: 'Much wow. Very collect. So rare.',
    lore: 'A reminder that memes can move markets.',
    achievement: 'meme_lord',
  },
  nft_frame: {
    id: 'nft_frame',
    name: 'First NFT Frame',
    icon: '&#128444;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'epic',
    description: 'Display your most prized digital art.',
    lore: 'Digital ownership, eternally on-chain.',
    achievement: 'art_collector',
  },
  rug_pull_survivor: {
    id: 'rug_pull_survivor',
    name: 'Rug Pull Survivor Badge',
    icon: '&#129526;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'rare',
    description: 'You lived to tell the tale.',
    lore: 'Battle scars are the best teachers.',
    achievement: 'survivor',
  },
  diamond_hands: {
    id: 'diamond_hands',
    name: 'Diamond Hands Trophy',
    icon: '&#128142;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'epic',
    description: 'Proof that you never sold.',
    lore: 'Through crashes and FUD, you held strong.',
    achievement: 'diamond_hands',
  },
  whale_tooth: {
    id: 'whale_tooth',
    name: 'Whale Tooth',
    icon: '&#129435;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'legendary',
    description: 'A gift from a crypto whale.',
    lore: 'They said the whales would never notice us...',
    achievement: 'whale_friend',
  },
  golden_key: {
    id: 'golden_key',
    name: 'Golden Private Key',
    icon: '&#128477;',
    type: ITEM_TYPES.COLLECTIBLE,
    rarity: 'legendary',
    description: 'Not your keys, not your crypto. This one is yours.',
    lore: 'The ultimate symbol of self-custody.',
    achievement: 'master_builder',
  },

  // ==========================================
  // MATERIALS (For future crafting)
  // ==========================================

  code_fragment: {
    id: 'code_fragment',
    name: 'Code Fragment',
    icon: '&#128190;',
    type: ITEM_TYPES.MATERIAL,
    rarity: 'common',
    description: 'A snippet of useful code.',
    price: 10,
    sellPrice: 2,
    stackable: true,
    maxStack: 99,
  },
  smart_contract_template: {
    id: 'smart_contract_template',
    name: 'Smart Contract Template',
    icon: '&#128221;',
    type: ITEM_TYPES.MATERIAL,
    rarity: 'uncommon',
    description: 'A reusable contract foundation.',
    price: 50,
    sellPrice: 12,
    stackable: true,
    maxStack: 20,
  },
  audit_report: {
    id: 'audit_report',
    name: 'Audit Report',
    icon: '&#128269;',
    type: ITEM_TYPES.MATERIAL,
    rarity: 'rare',
    description: 'Professional security documentation.',
    price: 150,
    sellPrice: 40,
    stackable: true,
    maxStack: 10,
  },
};

// ============================================
// SHOP CATEGORIES
// ============================================

const SHOP_CATEGORIES = {
  tools: {
    name: 'Tools',
    icon: '&#128295;',
    items: [
      'laptop_basic',
      'laptop_pro',
      'mechanical_keyboard',
      'microphone',
      'ring_light',
      'analytics_suite',
      'social_scheduler',
      'whiteboard',
      'market_terminal',
    ],
  },
  consumables: {
    name: 'Consumables',
    icon: '&#127873;',
    items: [
      'coffee',
      'energy_drink',
      'power_smoothie',
      'vacation_ticket',
      'xp_scroll_small',
      'xp_scroll_medium',
      'xp_scroll_large',
      'reputation_badge',
      'viral_moment',
      'lucky_charm',
      'fud_shield_potion',
    ],
  },
  legendary: {
    name: 'Legendary',
    icon: '&#11088;',
    items: ['satoshi_notebook', 'vitalik_hoodie'],
    requiresLevel: 25,
  },
};

// ============================================
// INVENTORY MANAGER
// ============================================

const PumpArenaInventory = {
  // Get item definition
  getItem(itemId) {
    return ITEMS[itemId] || null;
  },

  // Get all items of a type
  getItemsByType(type) {
    return Object.values(ITEMS).filter(item => item.type === type);
  },

  // Get player inventory
  getInventory() {
    const state = window.PumpArenaState?.get();
    return state?.inventory || { tools: [], consumables: [], collectibles: [], materials: [] };
  },

  // Check if player has item
  hasItem(itemId) {
    const inventory = this.getInventory();
    return [
      ...inventory.tools,
      ...inventory.consumables,
      ...inventory.collectibles,
      ...inventory.materials,
    ].some(item => item.id === itemId);
  },

  // Get item count (for stackables)
  getItemCount(itemId) {
    const inventory = this.getInventory();
    const allItems = [
      ...inventory.tools,
      ...inventory.consumables,
      ...inventory.collectibles,
      ...inventory.materials,
    ];
    const item = allItems.find(i => i.id === itemId);
    return item?.quantity || 0;
  },

  // Add item to inventory
  addItem(itemId, quantity = 1) {
    const state = window.PumpArenaState?.get();
    if (!state) return { success: false, message: 'No game state' };

    const itemDef = this.getItem(itemId);
    if (!itemDef) return { success: false, message: 'Item not found' };

    // Determine category
    let category;
    switch (itemDef.type) {
      case ITEM_TYPES.TOOL:
        category = 'tools';
        break;
      case ITEM_TYPES.CONSUMABLE:
        category = 'consumables';
        break;
      case ITEM_TYPES.COLLECTIBLE:
        category = 'collectibles';
        break;
      case ITEM_TYPES.MATERIAL:
        category = 'materials';
        break;
      default:
        return { success: false, message: 'Invalid item type' };
    }

    // Initialize category if needed
    if (!state.inventory[category]) {
      state.inventory[category] = [];
    }

    // Check if stackable and already exists
    if (itemDef.stackable) {
      const existing = state.inventory[category].find(i => i.id === itemId);
      if (existing) {
        const maxStack = itemDef.maxStack || 99;
        const newQty = Math.min(existing.quantity + quantity, maxStack);
        const added = newQty - existing.quantity;
        existing.quantity = newQty;
        window.PumpArenaState.save();
        return { success: true, message: `Added ${added}x ${itemDef.name}`, added };
      }
    }

    // Add new item
    state.inventory[category].push({
      id: itemId,
      quantity: quantity,
      acquired: Date.now(),
    });

    // Apply tool effect immediately if it's equipment
    if (itemDef.type === ITEM_TYPES.TOOL && itemDef.effect) {
      this.applyToolEffect(itemDef);
    }

    window.PumpArenaState.save();

    // Check for collectible achievements
    if (itemDef.type === ITEM_TYPES.COLLECTIBLE && itemDef.achievement) {
      document.dispatchEvent(
        new CustomEvent('pumparena:collectible-found', {
          detail: { item: itemDef },
        })
      );
    }

    return { success: true, message: `Acquired: ${itemDef.name}` };
  },

  // Remove item from inventory
  removeItem(itemId, quantity = 1) {
    const state = window.PumpArenaState?.get();
    if (!state) return { success: false, message: 'No game state' };

    const itemDef = this.getItem(itemId);
    if (!itemDef) return { success: false, message: 'Item not found' };

    let category;
    switch (itemDef.type) {
      case ITEM_TYPES.TOOL:
        category = 'tools';
        break;
      case ITEM_TYPES.CONSUMABLE:
        category = 'consumables';
        break;
      case ITEM_TYPES.COLLECTIBLE:
        category = 'collectibles';
        break;
      case ITEM_TYPES.MATERIAL:
        category = 'materials';
        break;
      default:
        return { success: false, message: 'Invalid item type' };
    }

    const index = state.inventory[category]?.findIndex(i => i.id === itemId);
    if (index === -1 || index === undefined) {
      return { success: false, message: 'Item not in inventory' };
    }

    const item = state.inventory[category][index];
    if (item.quantity > quantity) {
      item.quantity -= quantity;
    } else {
      state.inventory[category].splice(index, 1);
      // Remove tool effect if it was equipment
      if (itemDef.type === ITEM_TYPES.TOOL && itemDef.effect) {
        this.removeToolEffect(itemDef);
      }
    }

    window.PumpArenaState.save();
    return { success: true, message: `Removed: ${itemDef.name}` };
  },

  // Apply tool effect to stats
  applyToolEffect(itemDef) {
    const state = window.PumpArenaState?.get();
    if (!state || !itemDef.effect) return;

    const effect = itemDef.effect;
    if (effect.stat && effect.bonus) {
      state.stats[effect.stat] = (state.stats[effect.stat] || 0) + effect.bonus;
    }
    if (effect.stat2 && effect.bonus2) {
      state.stats[effect.stat2] = (state.stats[effect.stat2] || 0) + effect.bonus2;
    }
    if (effect.allStatsBonus) {
      Object.keys(state.stats).forEach(stat => {
        state.stats[stat] = (state.stats[stat] || 0) + effect.allStatsBonus;
      });
    }
    window.PumpArenaState.save();
  },

  // Remove tool effect from stats
  removeToolEffect(itemDef) {
    const state = window.PumpArenaState?.get();
    if (!state || !itemDef.effect) return;

    const effect = itemDef.effect;
    if (effect.stat && effect.bonus) {
      state.stats[effect.stat] = Math.max(0, (state.stats[effect.stat] || 0) - effect.bonus);
    }
    if (effect.stat2 && effect.bonus2) {
      state.stats[effect.stat2] = Math.max(0, (state.stats[effect.stat2] || 0) - effect.bonus2);
    }
    if (effect.allStatsBonus) {
      Object.keys(state.stats).forEach(stat => {
        state.stats[stat] = Math.max(0, (state.stats[stat] || 0) - effect.allStatsBonus);
      });
    }
    window.PumpArenaState.save();
  },

  // Use consumable item
  useItem(itemId) {
    const state = window.PumpArenaState?.get();
    if (!state) return { success: false, message: 'No game state' };

    const itemDef = this.getItem(itemId);
    if (!itemDef) return { success: false, message: 'Item not found' };
    if (itemDef.type !== ITEM_TYPES.CONSUMABLE) {
      return { success: false, message: 'Item is not consumable' };
    }

    // Check if player has item
    if (!this.hasItem(itemId)) {
      return { success: false, message: 'Item not in inventory' };
    }

    // Apply effects
    const rewards = this.applyConsumableEffect(itemDef);

    // Remove from inventory
    this.removeItem(itemId, 1);

    return { success: true, message: `Used: ${itemDef.name}`, rewards };
  },

  // Apply consumable effect
  applyConsumableEffect(itemDef) {
    const state = window.PumpArenaState?.get();
    if (!state || !itemDef.effect) return {};

    const effect = itemDef.effect;
    const rewards = {};

    // Influence restore
    if (effect.influenceRestore) {
      const maxInfluence = window.PumpArenaState.getMaxInfluence();
      const oldInfluence = state.resources.influence;
      state.resources.influence = Math.min(oldInfluence + effect.influenceRestore, maxInfluence);
      rewards.influence = state.resources.influence - oldInfluence;
    }

    // Full influence restore
    if (effect.influenceRestoreFull) {
      const maxInfluence = window.PumpArenaState.getMaxInfluence();
      rewards.influence = maxInfluence - state.resources.influence;
      state.resources.influence = maxInfluence;
    }

    // Grant XP
    if (effect.grantXP) {
      window.PumpArenaState.addXP(effect.grantXP);
      rewards.xp = effect.grantXP;
    }
    if (effect.bonusXP) {
      window.PumpArenaState.addXP(effect.bonusXP);
      rewards.xp = (rewards.xp || 0) + effect.bonusXP;
    }

    // Grant reputation
    if (effect.grantReputation) {
      window.PumpArenaState.addReputation(effect.grantReputation);
      rewards.reputation = effect.grantReputation;
    }

    // Temporary stat boost
    if (effect.tempStatBoost) {
      this.applyTempBoost(effect.tempStatBoost);
      rewards.tempBoost = effect.tempStatBoost;
    }

    // Negative event shield
    if (effect.negativeEventShield) {
      if (!state.buffs) state.buffs = {};
      state.buffs.negativeEventShield =
        (state.buffs.negativeEventShield || 0) + effect.negativeEventShield;
      rewards.shield = effect.negativeEventShield;
    }

    window.PumpArenaState.save();
    return rewards;
  },

  // Apply temporary stat boost
  applyTempBoost(boost) {
    const state = window.PumpArenaState?.get();
    if (!state) return;

    if (!state.tempBoosts) state.tempBoosts = [];

    const duration = boost.duration || 300; // Default 5 minutes
    const expiry = Date.now() + duration * 1000;

    if (boost.all) {
      state.tempBoosts.push({ type: 'all', bonus: boost.all, expiry });
    }
    if (boost.lck) {
      state.tempBoosts.push({ type: 'lck', bonus: boost.lck, expiry });
    }

    window.PumpArenaState.save();
  },

  // Buy item from shop (ASDF Philosophy: tier discounts)
  buyItem(itemId, quantity = 1) {
    // Rate limiting check (Security by Design)
    const rateLimiter = window.PumpArenaState?.RateLimiter;
    if (rateLimiter) {
      const rateCheck = rateLimiter.checkAction('buy');
      if (!rateCheck.allowed) {
        return { success: false, message: rateCheck.message, rateLimited: true };
      }
    }

    // Input validation (Security by Design)
    if (typeof itemId !== 'string' || itemId.length === 0 || itemId.length > 100) {
      return { success: false, message: 'Invalid item ID' };
    }

    // Validate quantity
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      return { success: false, message: 'Invalid quantity type' };
    }
    quantity = Math.floor(quantity);
    if (quantity <= 0 || quantity > 999) {
      return { success: false, message: 'Quantity must be between 1 and 999' };
    }

    const state = window.PumpArenaState?.get();
    if (!state) return { success: false, message: 'No game state' };

    const itemDef = this.getItem(itemId);
    if (!itemDef) return { success: false, message: 'Item not found' };
    if (!itemDef.price || typeof itemDef.price !== 'number') {
      return { success: false, message: 'Item not for sale' };
    }

    // Apply tier discount (ASDF Philosophy)
    const basePrice = itemDef.price * quantity;
    const totalCost = getDiscountedPrice(basePrice);
    const savings = basePrice - totalCost;

    if (state.resources.tokens < totalCost) {
      return { success: false, message: `Not enough tokens (need ${totalCost})` };
    }

    // Check level requirement for legendary (ASDF: requires BLAZE tier = level 35)
    if (itemDef.rarity === 'legendary' && state.progression.level < 35) {
      return { success: false, message: 'Requires BLAZE tier (level 35)' };
    }

    // Deduct tokens
    state.resources.tokens -= totalCost;
    window.PumpArenaState.save();

    // Add item
    const result = this.addItem(itemId, quantity);
    if (!result.success) {
      // Refund if failed
      state.resources.tokens += totalCost;
      window.PumpArenaState.save();
      return result;
    }

    // Record successful action for rate limiting
    if (rateLimiter) {
      rateLimiter.recordAction('buy');
    }

    const message =
      savings > 0
        ? `Purchased: ${itemDef.name} (saved ${savings} tokens with tier discount!)`
        : `Purchased: ${itemDef.name}`;

    return { success: true, message, cost: totalCost, savings };
  },

  // Sell item (Security by Design)
  sellItem(itemId, quantity = 1) {
    // Rate limiting check (Security by Design)
    const rateLimiter = window.PumpArenaState?.RateLimiter;
    if (rateLimiter) {
      const rateCheck = rateLimiter.checkAction('sell');
      if (!rateCheck.allowed) {
        return { success: false, message: rateCheck.message, rateLimited: true };
      }
    }

    // Input validation
    if (typeof itemId !== 'string' || itemId.length === 0 || itemId.length > 100) {
      return { success: false, message: 'Invalid item ID' };
    }

    // Validate quantity
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      return { success: false, message: 'Invalid quantity type' };
    }
    quantity = Math.floor(quantity);
    if (quantity <= 0 || quantity > 999) {
      return { success: false, message: 'Quantity must be between 1 and 999' };
    }

    const state = window.PumpArenaState?.get();
    if (!state) return { success: false, message: 'No game state' };

    const itemDef = this.getItem(itemId);
    if (!itemDef) return { success: false, message: 'Item not found' };
    if (!itemDef.sellPrice || typeof itemDef.sellPrice !== 'number') {
      return { success: false, message: 'Item cannot be sold' };
    }
    if (itemDef.type === ITEM_TYPES.COLLECTIBLE) {
      return { success: false, message: 'Collectibles cannot be sold' };
    }

    // Check if player has enough
    const currentCount = this.getItemCount(itemId);
    if (currentCount < quantity) {
      return { success: false, message: 'Not enough items' };
    }

    // Remove items
    const removeResult = this.removeItem(itemId, quantity);
    if (!removeResult.success) return removeResult;

    // Add tokens
    const totalValue = itemDef.sellPrice * quantity;
    state.resources.tokens += totalValue;
    window.PumpArenaState.save();

    // Record successful action for rate limiting
    if (rateLimiter) {
      rateLimiter.recordAction('sell');
    }

    return {
      success: true,
      message: `Sold ${quantity}x ${itemDef.name} for ${totalValue} tokens`,
      earned: totalValue,
    };
  },

  // Get equipped tools bonuses
  getToolBonuses() {
    const inventory = this.getInventory();
    const bonuses = {
      xpBonus: 0,
      taskSpeedBonus: 0,
      influenceRegenBonus: 0,
      eventBonusChance: 0,
    };

    for (const tool of inventory.tools) {
      const itemDef = this.getItem(tool.id);
      if (itemDef?.effect) {
        if (itemDef.effect.xpBonus) bonuses.xpBonus += itemDef.effect.xpBonus;
        if (itemDef.effect.taskSpeedBonus) bonuses.taskSpeedBonus += itemDef.effect.taskSpeedBonus;
        if (itemDef.effect.influenceRegenBonus)
          bonuses.influenceRegenBonus += itemDef.effect.influenceRegenBonus;
        if (itemDef.effect.eventBonusChance)
          bonuses.eventBonusChance += itemDef.effect.eventBonusChance;
      }
    }

    return bonuses;
  },

  // ==========================================
  // UI RENDERING
  // ==========================================

  renderInventoryPanel(container) {
    const inventory = this.getInventory();
    const state = window.PumpArenaState?.get();

    container.innerHTML = `
            <div class="inventory-container">
                <div class="inventory-header">
                    <div class="inventory-tabs">
                        <button class="inv-tab active" data-tab="tools">&#128295; Tools</button>
                        <button class="inv-tab" data-tab="consumables">&#127873; Items</button>
                        <button class="inv-tab" data-tab="collectibles">&#128142; Collection</button>
                        <button class="inv-tab" data-tab="shop">&#128176; Shop</button>
                    </div>
                    <div class="inventory-tokens">
                        <span class="token-icon">&#129689;</span>
                        <span class="token-value">${state?.resources?.tokens || 0}</span>
                    </div>
                </div>

                <div class="inventory-content" id="inv-content">
                    ${this.renderToolsTab(inventory.tools)}
                </div>
            </div>
        `;

    // Tab switching
    container.querySelectorAll('.inv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        const content = container.querySelector('#inv-content');

        switch (tabId) {
          case 'tools':
            content.innerHTML = this.renderToolsTab(inventory.tools);
            break;
          case 'consumables':
            content.innerHTML = this.renderConsumablesTab(inventory.consumables);
            this.attachConsumableListeners(content);
            break;
          case 'collectibles':
            content.innerHTML = this.renderCollectiblesTab(inventory.collectibles);
            break;
          case 'shop':
            content.innerHTML = this.renderShopTab();
            this.attachShopListeners(content, container);
            break;
        }
      });
    });
  },

  renderToolsTab(tools) {
    if (!tools || tools.length === 0) {
      return `
                <div class="inv-empty">
                    <div class="empty-icon">&#128295;</div>
                    <p>No tools equipped yet.</p>
                    <p class="empty-hint">Visit the shop to get started!</p>
                </div>
            `;
    }

    return `
            <div class="inv-grid tools-grid">
                ${tools
                  .map(item => {
                    const def = this.getItem(item.id);
                    if (!def) return '';
                    const rarity = ITEM_RARITY[def.rarity?.toUpperCase()] || ITEM_RARITY.COMMON;
                    // SECURITY: Escape user-controllable content
                    return `
                        <div class="inv-item tool-item" style="border-color: ${rarity.color}">
                            <div class="item-icon">${def.icon}</div>
                            <div class="item-info">
                                <div class="item-name" style="color: ${rarity.color}">${escapeHtml(def.name)}</div>
                                <div class="item-desc">${escapeHtml(def.description)}</div>
                                <div class="item-effect">${escapeHtml(this.formatEffect(def.effect))}</div>
                            </div>
                            <div class="item-rarity" style="background: ${rarity.color}">${escapeHtml(rarity.name)}</div>
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;
  },

  renderConsumablesTab(consumables) {
    if (!consumables || consumables.length === 0) {
      return `
                <div class="inv-empty">
                    <div class="empty-icon">&#127873;</div>
                    <p>No items in your bag.</p>
                    <p class="empty-hint">Buy consumables from the shop!</p>
                </div>
            `;
    }

    return `
            <div class="inv-grid consumables-grid">
                ${consumables
                  .map(item => {
                    const def = this.getItem(item.id);
                    if (!def) return '';
                    const rarity = ITEM_RARITY[def.rarity?.toUpperCase()] || ITEM_RARITY.COMMON;
                    // SECURITY: Escape user-controllable content
                    return `
                        <div class="inv-item consumable-item" data-item="${escapeHtml(item.id)}" style="border-color: ${rarity.color}">
                            <div class="item-quantity">${escapeHtml(item.quantity)}x</div>
                            <div class="item-icon">${def.icon}</div>
                            <div class="item-info">
                                <div class="item-name" style="color: ${rarity.color}">${escapeHtml(def.name)}</div>
                                <div class="item-effect">${escapeHtml(this.formatConsumableEffect(def.effect))}</div>
                            </div>
                            <button class="btn-use-item" data-item="${escapeHtml(item.id)}">Use</button>
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;
  },

  renderCollectiblesTab(collectibles) {
    const allCollectibles = Object.values(ITEMS).filter(i => i.type === ITEM_TYPES.COLLECTIBLE);
    const ownedIds = (collectibles || []).map(c => c.id);

    return `
            <div class="collectibles-header">
                <span>Collection: ${ownedIds.length} / ${allCollectibles.length}</span>
            </div>
            <div class="inv-grid collectibles-grid">
                ${allCollectibles
                  .map(def => {
                    const owned = ownedIds.includes(def.id);
                    const rarity = ITEM_RARITY[def.rarity?.toUpperCase()] || ITEM_RARITY.COMMON;
                    // SECURITY: Escape user-controllable content
                    return `
                        <div class="inv-item collectible-item ${owned ? 'owned' : 'locked'}" style="border-color: ${owned ? rarity.color : 'var(--rpg-border)'}">
                            <div class="item-icon ${owned ? '' : 'locked-icon'}">${owned ? def.icon : '&#10067;'}</div>
                            <div class="item-info">
                                <div class="item-name" style="color: ${owned ? rarity.color : 'var(--rpg-text-muted)'}">
                                    ${owned ? escapeHtml(def.name) : '???'}
                                </div>
                                ${
                                  owned
                                    ? `
                                    <div class="item-desc">${escapeHtml(def.description)}</div>
                                    <div class="item-lore">"${escapeHtml(def.lore)}"</div>
                                `
                                    : `
                                    <div class="item-locked-hint">Find this collectible in-game</div>
                                `
                                }
                            </div>
                            ${owned ? `<div class="item-rarity" style="background: ${rarity.color}">${escapeHtml(rarity.name)}</div>` : ''}
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;
  },

  renderShopTab() {
    const state = window.PumpArenaState?.get();
    const playerLevel = state?.progression?.level || 1;

    return `
            <div class="shop-container">
                ${Object.entries(SHOP_CATEGORIES)
                  .map(([catId, cat]) => {
                    const locked = cat.requiresLevel && playerLevel < cat.requiresLevel;
                    return `
                        <div class="shop-category ${locked ? 'locked' : ''}">
                            <div class="category-header">
                                <span class="category-icon">${cat.icon}</span>
                                <span class="category-name">${cat.name}</span>
                                ${locked ? `<span class="category-lock">Lv.${cat.requiresLevel}</span>` : ''}
                            </div>
                            ${
                              !locked
                                ? `
                                <div class="shop-items">
                                    ${cat.items
                                      .map(itemId => {
                                        const def = this.getItem(itemId);
                                        if (!def) return '';
                                        const rarity =
                                          ITEM_RARITY[def.rarity?.toUpperCase()] ||
                                          ITEM_RARITY.COMMON;
                                        const owned =
                                          this.hasItem(itemId) && def.type === ITEM_TYPES.TOOL;
                                        // SECURITY: Escape user-controllable content
                                        return `
                                            <div class="shop-item ${owned ? 'owned' : ''}" data-item="${escapeHtml(itemId)}" style="border-color: ${rarity.color}">
                                                <div class="shop-item-icon">${def.icon}</div>
                                                <div class="shop-item-info">
                                                    <div class="shop-item-name" style="color: ${rarity.color}">${escapeHtml(def.name)}</div>
                                                    <div class="shop-item-desc">${escapeHtml(def.description)}</div>
                                                </div>
                                                <div class="shop-item-price">
                                                    ${
                                                      owned
                                                        ? '<span class="owned-label">Owned</span>'
                                                        : `
                                                        <span class="price-value">&#129689; ${escapeHtml(def.price)}</span>
                                                        <button class="btn-buy" data-item="${escapeHtml(itemId)}">Buy</button>
                                                    `
                                                    }
                                                </div>
                                            </div>
                                        `;
                                      })
                                      .join('')}
                                </div>
                            `
                                : `
                                <div class="category-locked-msg">Reach level ${cat.requiresLevel} to unlock</div>
                            `
                            }
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;
  },

  attachConsumableListeners(container) {
    container.querySelectorAll('.btn-use-item').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const itemId = btn.dataset.item;
        const result = this.useItem(itemId);

        if (result.success) {
          if (window.PumpArenaRPG?.showNotification) {
            let msg = result.message;
            if (result.rewards) {
              const parts = [];
              if (result.rewards.influence) parts.push(`+${result.rewards.influence} Influence`);
              if (result.rewards.xp) parts.push(`+${result.rewards.xp} XP`);
              if (result.rewards.reputation) parts.push(`+${result.rewards.reputation} Rep`);
              if (parts.length) msg += ' - ' + parts.join(', ');
            }
            window.PumpArenaRPG.showNotification(msg, 'success');
          }
          // Refresh tab
          const inventory = this.getInventory();
          container.innerHTML = this.renderConsumablesTab(inventory.consumables);
          this.attachConsumableListeners(container);
        } else {
          if (window.PumpArenaRPG?.showNotification) {
            window.PumpArenaRPG.showNotification(result.message, 'error');
          }
        }
      });
    });
  },

  attachShopListeners(content, container) {
    content.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const itemId = btn.dataset.item;
        const result = this.buyItem(itemId);

        if (result.success) {
          if (window.PumpArenaRPG?.showNotification) {
            window.PumpArenaRPG.showNotification(result.message, 'success');
          }
          // Refresh panel
          this.renderInventoryPanel(container);
          // Switch to shop tab
          container.querySelector('[data-tab="shop"]').click();
        } else {
          if (window.PumpArenaRPG?.showNotification) {
            window.PumpArenaRPG.showNotification(result.message, 'error');
          }
        }
      });
    });
  },

  formatEffect(effect) {
    if (!effect) return '';
    const parts = [];
    const statNames = { dev: 'DEV', com: 'COM', mkt: 'MKT', str: 'STR', cha: 'CHA', lck: 'LCK' };

    if (effect.stat && effect.bonus)
      parts.push(`+${effect.bonus} ${statNames[effect.stat] || effect.stat}`);
    if (effect.stat2 && effect.bonus2)
      parts.push(`+${effect.bonus2} ${statNames[effect.stat2] || effect.stat2}`);
    if (effect.allStatsBonus) parts.push(`+${effect.allStatsBonus} ALL`);
    if (effect.xpBonus) parts.push(`+${Math.round(effect.xpBonus * 100)}% XP`);
    if (effect.taskSpeedBonus) parts.push(`+${Math.round(effect.taskSpeedBonus * 100)}% Speed`);
    if (effect.influenceRegenBonus)
      parts.push(`+${Math.round(effect.influenceRegenBonus * 100)}% Regen`);
    if (effect.eventBonusChance)
      parts.push(`+${Math.round(effect.eventBonusChance * 100)}% Events`);

    return parts.join(' | ');
  },

  formatConsumableEffect(effect) {
    if (!effect) return '';
    const parts = [];

    if (effect.influenceRestore) parts.push(`+${effect.influenceRestore} Influence`);
    if (effect.influenceRestoreFull) parts.push('Full Influence');
    if (effect.grantXP) parts.push(`+${effect.grantXP} XP`);
    if (effect.bonusXP) parts.push(`+${effect.bonusXP} XP`);
    if (effect.grantReputation) parts.push(`+${effect.grantReputation} Rep`);
    if (effect.tempStatBoost) parts.push('Temp Buff');
    if (effect.negativeEventShield) parts.push('FUD Shield');

    return parts.join(' | ');
  },
};

// ============================================
// CRAFTING SYSTEM - ASDF PHILOSOPHY ALIGNED
// Recipe costs and outputs based on Fibonacci
// ============================================

/**
 * Crafting Recipes
 * All material costs use Fibonacci numbers
 * Higher tier recipes require more rare materials
 */
const CRAFTING_RECIPES = {
  // Tool Upgrades
  laptop_pro_upgrade: {
    id: 'laptop_pro_upgrade',
    name: 'Upgrade to Pro Workstation',
    icon: '&#128421;',
    description: 'Upgrade your basic laptop to a pro workstation',
    category: 'upgrade',
    materials: [
      { item: 'laptop_basic', quantity: 1 },
      { item: 'code_fragment', quantity: 5 }, // fib[5] = 5
      { item: 'circuit_board', quantity: 3 }, // fib[4] = 3
    ],
    output: { item: 'laptop_pro', quantity: 1 },
    influenceCost: 13, // fib[7] = 13
    xpReward: 55, // fib[10] = 55
    unlockLevel: 8, // fib[6] = 8
  },

  analytics_bundle: {
    id: 'analytics_bundle',
    name: 'Analytics Suite Bundle',
    icon: '&#128202;',
    description: 'Combine tools to create analytics suite',
    category: 'upgrade',
    materials: [
      { item: 'whiteboard', quantity: 1 },
      { item: 'social_scheduler', quantity: 1 },
      { item: 'data_crystal', quantity: 8 }, // fib[6] = 8
    ],
    output: { item: 'analytics_suite', quantity: 1 },
    influenceCost: 21, // fib[8] = 21
    xpReward: 89, // fib[11] = 89
    unlockLevel: 13, // fib[7] = 13
  },

  // Consumable Crafting
  energy_drink_pack: {
    id: 'energy_drink_pack',
    name: 'Energy Drink Pack',
    icon: '&#9889;',
    description: 'Craft multiple energy drinks from materials',
    category: 'consumable',
    materials: [
      { item: 'caffeine_essence', quantity: 3 }, // fib[4] = 3
      { item: 'pure_water', quantity: 2 }, // fib[3] = 2
    ],
    output: { item: 'energy_drink', quantity: 5 }, // fib[5] = 5 outputs
    influenceCost: 5, // fib[5] = 5
    xpReward: 21, // fib[8] = 21
    unlockLevel: 5, // fib[5] = 5
  },

  boost_elixir: {
    id: 'boost_elixir',
    name: 'XP Boost Elixir',
    icon: '&#9883;',
    description: 'Powerful potion for enhanced XP gain',
    category: 'consumable',
    materials: [
      { item: 'xp_shard', quantity: 5 }, // fib[5] = 5
      { item: 'rare_essence', quantity: 2 }, // fib[3] = 2
      { item: 'golden_flask', quantity: 1 },
    ],
    output: { item: 'xp_boost_potion', quantity: 1 },
    influenceCost: 13, // fib[7] = 13
    xpReward: 34, // fib[9] = 34
    unlockLevel: 13, // fib[7] = 13
  },

  // Material Refinement
  circuit_board_refined: {
    id: 'circuit_board_refined',
    name: 'Refined Circuit Board',
    icon: '&#128144;',
    description: 'Refine basic components into quality circuits',
    category: 'material',
    materials: [
      { item: 'raw_silicon', quantity: 8 }, // fib[6] = 8
      { item: 'copper_wire', quantity: 5 }, // fib[5] = 5
    ],
    output: { item: 'circuit_board', quantity: 3 }, // fib[4] = 3
    influenceCost: 3, // fib[4] = 3
    xpReward: 13, // fib[7] = 13
    unlockLevel: 3, // fib[4] = 3
  },

  code_fragment_synthesis: {
    id: 'code_fragment_synthesis',
    name: 'Code Fragment Synthesis',
    icon: '&#128187;',
    description: 'Synthesize code fragments from digital essence',
    category: 'material',
    materials: [
      { item: 'digital_dust', quantity: 13 }, // fib[7] = 13
      { item: 'logic_core', quantity: 2 }, // fib[3] = 2
    ],
    output: { item: 'code_fragment', quantity: 5 }, // fib[5] = 5
    influenceCost: 5, // fib[5] = 5
    xpReward: 21, // fib[8] = 21
    unlockLevel: 5, // fib[5] = 5
  },

  // Legendary Crafting
  satoshi_forge: {
    id: 'satoshi_forge',
    name: "Satoshi's Notebook Forge",
    icon: '&#128213;',
    description: 'Legendary item creation - requires max dedication',
    category: 'legendary',
    materials: [
      { item: 'ancient_code', quantity: 13 }, // fib[7] = 13
      { item: 'genesis_block_shard', quantity: 5 }, // fib[5] = 5
      { item: 'legendary_essence', quantity: 3 }, // fib[4] = 3
      { item: 'market_terminal', quantity: 1 }, // Sacrifice epic item
    ],
    output: { item: 'satoshi_notebook', quantity: 1 },
    influenceCost: 89, // fib[11] = 89
    xpReward: 233, // fib[13] = 233
    unlockLevel: 34, // fib[9] = 34
    requiresTier: 'FLAME',
  },
};

/**
 * Crafting materials (added to ITEMS)
 */
const CRAFTING_MATERIALS = {
  // Basic Materials
  raw_silicon: {
    id: 'raw_silicon',
    name: 'Raw Silicon',
    icon: '&#128312;',
    type: 'material',
    rarity: 'common',
    description: 'Basic building block of circuits.',
    stackable: true,
    maxStack: 99,
  },
  copper_wire: {
    id: 'copper_wire',
    name: 'Copper Wire',
    icon: '&#127744;',
    type: 'material',
    rarity: 'common',
    description: 'Conductive wiring for electronics.',
    stackable: true,
    maxStack: 99,
  },
  digital_dust: {
    id: 'digital_dust',
    name: 'Digital Dust',
    icon: '&#10024;',
    type: 'material',
    rarity: 'common',
    description: 'Residue from blockchain operations.',
    stackable: true,
    maxStack: 99,
  },
  logic_core: {
    id: 'logic_core',
    name: 'Logic Core',
    icon: '&#128308;',
    type: 'material',
    rarity: 'uncommon',
    description: 'Processing unit for advanced crafting.',
    stackable: true,
    maxStack: 55,
  },
  circuit_board: {
    id: 'circuit_board',
    name: 'Circuit Board',
    icon: '&#128286;',
    type: 'material',
    rarity: 'uncommon',
    description: 'Essential component for tech upgrades.',
    stackable: true,
    maxStack: 55,
  },
  code_fragment: {
    id: 'code_fragment',
    name: 'Code Fragment',
    icon: '&#128203;',
    type: 'material',
    rarity: 'uncommon',
    description: 'Piece of optimized smart contract code.',
    stackable: true,
    maxStack: 55,
  },
  data_crystal: {
    id: 'data_crystal',
    name: 'Data Crystal',
    icon: '&#128142;',
    type: 'material',
    rarity: 'rare',
    description: 'Crystallized blockchain data.',
    stackable: true,
    maxStack: 34,
  },
  xp_shard: {
    id: 'xp_shard',
    name: 'XP Shard',
    icon: '&#11088;',
    type: 'material',
    rarity: 'rare',
    description: 'Concentrated experience essence.',
    stackable: true,
    maxStack: 34,
  },
  rare_essence: {
    id: 'rare_essence',
    name: 'Rare Essence',
    icon: '&#128156;',
    type: 'material',
    rarity: 'rare',
    description: 'Refined power for potion crafting.',
    stackable: true,
    maxStack: 21,
  },
  golden_flask: {
    id: 'golden_flask',
    name: 'Golden Flask',
    icon: '&#129346;',
    type: 'material',
    rarity: 'rare',
    description: 'Container for magical elixirs.',
    stackable: true,
    maxStack: 13,
  },
  caffeine_essence: {
    id: 'caffeine_essence',
    name: 'Caffeine Essence',
    icon: '&#9749;',
    type: 'material',
    rarity: 'common',
    description: 'Pure productivity in liquid form.',
    stackable: true,
    maxStack: 99,
  },
  pure_water: {
    id: 'pure_water',
    name: 'Pure Water',
    icon: '&#128167;',
    type: 'material',
    rarity: 'common',
    description: 'Crystal clear hydration.',
    stackable: true,
    maxStack: 99,
  },
  // Legendary Materials
  ancient_code: {
    id: 'ancient_code',
    name: 'Ancient Code',
    icon: '&#128220;',
    type: 'material',
    rarity: 'legendary',
    description: 'Code from the genesis era. Extremely rare.',
    stackable: true,
    maxStack: 8,
  },
  genesis_block_shard: {
    id: 'genesis_block_shard',
    name: 'Genesis Block Shard',
    icon: '&#128310;',
    type: 'material',
    rarity: 'legendary',
    description: 'Fragment from the first block ever mined.',
    stackable: true,
    maxStack: 5,
  },
  legendary_essence: {
    id: 'legendary_essence',
    name: 'Legendary Essence',
    icon: '&#127775;',
    type: 'material',
    rarity: 'legendary',
    description: 'Distilled power of ancient protocols.',
    stackable: true,
    maxStack: 3,
  },
};

// Add crafting materials to ITEMS
Object.assign(ITEMS, CRAFTING_MATERIALS);

/**
 * Crafting System Manager
 */
const PumpArenaCrafting = {
  recipes: CRAFTING_RECIPES,
  materials: CRAFTING_MATERIALS,

  /**
   * Check if player can craft a recipe
   */
  canCraft(recipeId) {
    const recipe = CRAFTING_RECIPES[recipeId];
    if (!recipe) return { canCraft: false, reason: 'Recipe not found' };

    const state = window.PumpArenaState?.get();
    if (!state) return { canCraft: false, reason: 'State not available' };

    // Check level requirement
    if (state.progression.level < recipe.unlockLevel) {
      return { canCraft: false, reason: `Requires Level ${recipe.unlockLevel}` };
    }

    // Check tier requirement
    if (recipe.requiresTier) {
      const currentTier = window.PumpArenaState?.getCurrentTier();
      const tierIndex = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'].indexOf(
        currentTier?.name || 'EMBER'
      );
      const requiredIndex = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'].indexOf(
        recipe.requiresTier
      );
      if (tierIndex < requiredIndex) {
        return { canCraft: false, reason: `Requires ${recipe.requiresTier} Tier` };
      }
    }

    // Check influence
    if (state.resources.influence < recipe.influenceCost) {
      return { canCraft: false, reason: `Need ${recipe.influenceCost} Influence` };
    }

    // Check materials
    const inventory = PumpArenaInventory.getInventory();
    for (const material of recipe.materials) {
      const owned = this.countItem(inventory, material.item);
      if (owned < material.quantity) {
        const itemName = ITEMS[material.item]?.name || material.item;
        return { canCraft: false, reason: `Need ${material.quantity - owned} more ${itemName}` };
      }
    }

    return { canCraft: true, reason: 'Ready to craft' };
  },

  /**
   * Count how many of an item the player has
   */
  countItem(inventory, itemId) {
    let count = 0;
    for (const invItem of inventory) {
      if (invItem.itemId === itemId) {
        count += invItem.quantity || 1;
      }
    }
    return count;
  },

  /**
   * Craft an item
   */
  craft(recipeId) {
    const check = this.canCraft(recipeId);
    if (!check.canCraft) {
      return { success: false, message: check.reason };
    }

    const recipe = CRAFTING_RECIPES[recipeId];
    const state = window.PumpArenaState.get();

    // Deduct influence
    window.PumpArenaState.spendInfluence(recipe.influenceCost);

    // Remove materials from inventory
    for (const material of recipe.materials) {
      PumpArenaInventory.removeFromInventory(material.item, material.quantity);
    }

    // Add output to inventory
    PumpArenaInventory.addToInventory(recipe.output.item, recipe.output.quantity);

    // Grant XP
    window.PumpArenaState.addXP(recipe.xpReward);

    // Track crafting statistics
    if (!state.statistics.itemsCrafted) state.statistics.itemsCrafted = 0;
    state.statistics.itemsCrafted++;

    // Save state
    window.PumpArenaState.save();

    const outputItem = ITEMS[recipe.output.item];
    return {
      success: true,
      message: `Crafted ${outputItem?.name || recipe.output.item}! +${recipe.xpReward} XP`,
    };
  },

  /**
   * Get available recipes for player's level
   */
  getAvailableRecipes() {
    const state = window.PumpArenaState?.get();
    if (!state) return [];

    const level = state.progression.level;
    const available = [];

    for (const [id, recipe] of Object.entries(CRAFTING_RECIPES)) {
      if (level >= recipe.unlockLevel) {
        const check = this.canCraft(id);
        available.push({
          ...recipe,
          canCraft: check.canCraft,
          reason: check.reason,
        });
      }
    }

    return available;
  },

  /**
   * Render crafting panel
   */
  renderCraftingPanel(container) {
    const recipes = this.getAvailableRecipes();
    const lockedCount = Object.keys(CRAFTING_RECIPES).length - recipes.length;

    const categories = {
      material: { name: 'Materials', icon: '&#127760;' },
      consumable: { name: 'Consumables', icon: '&#9889;' },
      upgrade: { name: 'Upgrades', icon: '&#128295;' },
      legendary: { name: 'Legendary', icon: '&#128142;' },
    };

    container.innerHTML = `
            <div class="crafting-panel">
                <div class="crafting-header" style="padding: 15px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-bottom: 2px solid #f97316;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        &#128295; Crafting Workshop
                        <span style="font-size: 12px; color: #888; font-weight: normal;">ASDF Fibonacci-Based</span>
                    </h3>
                </div>

                <div class="crafting-categories" style="display: flex; gap: 10px; padding: 15px; background: #111;">
                    ${Object.entries(categories)
                      .map(
                        ([key, cat]) => `
                        <button class="craft-cat-btn" data-category="${key}" style="flex: 1; padding: 10px; background: #222; border: 1px solid #333; border-radius: 8px; cursor: pointer; color: #ccc;">
                            <span style="font-size: 18px;">${cat.icon}</span>
                            <div style="font-size: 11px; margin-top: 5px;">${cat.name}</div>
                        </button>
                    `
                      )
                      .join('')}
                </div>

                <div class="crafting-recipes" style="padding: 15px; max-height: 400px; overflow-y: auto;">
                    ${
                      recipes.length === 0
                        ? `
                        <div style="text-align: center; color: #666; padding: 40px;">
                            <div style="font-size: 48px;">&#128274;</div>
                            <p>No recipes unlocked yet. Level up to discover crafting!</p>
                        </div>
                    `
                        : recipes
                            .map(recipe => {
                              const outputItem = ITEMS[recipe.output.item];
                              const rarityColor =
                                ITEM_RARITY[outputItem?.rarity?.toUpperCase()]?.color || '#888';

                              return `
                            <div class="recipe-card" data-recipe="${recipe.id}" style="background: #1a1a1a; border: 1px solid ${recipe.canCraft ? '#22c55e44' : '#33333366'}; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                                        <div style="font-size: 32px; background: ${rarityColor}22; padding: 8px; border-radius: 8px;">${recipe.icon}</div>
                                        <div>
                                            <div style="font-weight: bold; color: ${rarityColor};">${recipe.name}</div>
                                            <div style="font-size: 11px; color: #888; margin-top: 4px;">${recipe.description}</div>
                                            <div style="font-size: 10px; color: #666; margin-top: 4px;">
                                                Output: ${recipe.output.quantity}x ${outputItem?.name || recipe.output.item}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 11px; color: #f97316;">${recipe.influenceCost} ⚡</div>
                                        <div style="font-size: 10px; color: #22c55e;">+${recipe.xpReward} XP</div>
                                    </div>
                                </div>

                                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">
                                    <div style="font-size: 10px; color: #888; margin-bottom: 8px;">Required Materials:</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                        ${recipe.materials
                                          .map(mat => {
                                            const matItem = ITEMS[mat.item];
                                            const owned = this.countItem(
                                              PumpArenaInventory.getInventory(),
                                              mat.item
                                            );
                                            const hasEnough = owned >= mat.quantity;
                                            return `
                                                <div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: ${hasEnough ? '#22c55e22' : '#dc262622'}; border-radius: 4px; font-size: 11px;">
                                                    <span>${matItem?.icon || '?'}</span>
                                                    <span style="color: ${hasEnough ? '#22c55e' : '#dc2626'};">${owned}/${mat.quantity}</span>
                                                </div>
                                            `;
                                          })
                                          .join('')}
                                    </div>
                                </div>

                                <button class="btn-craft ${recipe.canCraft ? 'btn-primary' : 'btn-disabled'}"
                                        data-recipe="${recipe.id}"
                                        ${recipe.canCraft ? '' : 'disabled'}
                                        style="width: 100%; margin-top: 12px; padding: 10px;">
                                    ${recipe.canCraft ? '&#128295; Craft' : recipe.reason}
                                </button>
                            </div>
                        `;
                            })
                            .join('')
                    }

                    ${
                      lockedCount > 0
                        ? `
                        <div style="text-align: center; color: #666; padding: 20px; border: 1px dashed #333; border-radius: 8px;">
                            &#128274; ${lockedCount} more recipes to unlock
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `;

    // Attach craft button handlers
    container.querySelectorAll('.btn-craft:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset.recipe;
        const result = this.craft(recipeId);

        if (window.PumpArenaRPG?.showNotification) {
          window.PumpArenaRPG.showNotification(
            result.message,
            result.success ? 'success' : 'error'
          );
        }

        // Refresh panel
        this.renderCraftingPanel(container);
      });
    });

    // Category filter handlers
    container.querySelectorAll('.craft-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        // Toggle active state
        container.querySelectorAll('.craft-cat-btn').forEach(b => {
          b.style.borderColor = b === btn ? '#f97316' : '#333';
          b.style.background = b === btn ? '#f9731622' : '#222';
        });
        // Filter recipes
        container.querySelectorAll('.recipe-card').forEach(card => {
          const recipe = CRAFTING_RECIPES[card.dataset.recipe];
          card.style.display = recipe?.category === category ? 'block' : 'none';
        });
      });
    });
  },
};

// Export for global access
if (typeof window !== 'undefined') {
  window.PumpArenaInventory = PumpArenaInventory;
  window.PumpArenaCrafting = PumpArenaCrafting;
  window.ITEMS = ITEMS;
  window.ITEM_RARITY = ITEM_RARITY;
  window.CRAFTING_RECIPES = CRAFTING_RECIPES;

  // ASDF Philosophy helpers
  window.PumpArenaInventory.getDiscountedPrice = getDiscountedPrice;
  window.PumpArenaInventory.getTierDiscount = getTierDiscount;
  window.PumpArenaInventory.calculateItemPrice = calculateItemPrice;
}
