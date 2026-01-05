/**
 * Pump Arena RPG - Quest Items System
 *
 * Exclusive items obtainable through quests:
 * - Faction Equipment (unique gear per faction)
 * - Equipment Pieces (crafting materials)
 * - Achievement Badges (collectible badges)
 *
 * ASDF Philosophy: Fibonacci-based stats, faction identity
 */

'use strict';

// ============================================================
// FIBONACCI HELPER
// ============================================================

const QUEST_FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

function getQuestFib(n) {
    if (n < 0) return 0;
    if (n < QUEST_FIB.length) return QUEST_FIB[n];
    return QUEST_FIB[QUEST_FIB.length - 1];
}

// ============================================================
// ITEM CATEGORIES
// ============================================================

const QUEST_ITEM_TYPES = {
    EQUIPMENT: 'equipment',
    PIECE: 'piece',
    BADGE: 'badge',
    RECIPE: 'recipe'
};

// ============================================================
// FACTION EQUIPMENT - Unique items per faction
// ============================================================

const FACTION_EQUIPMENT = {
    // ========================================
    // ASDF COLLECTIVE EQUIPMENT
    // ========================================
    asdf_burning_crown: {
        id: 'asdf_burning_crown',
        name: 'Burning Crown',
        slot: 'head',
        rarity: 'legendary',
        icon: '👑',
        faction: 'asdf',
        description: 'A crown wreathed in eternal flames. Symbol of the true burner.',
        baseStats: { str: getQuestFib(8), lck: getQuestFib(7) },
        bonusEffect: { burnBonus: 0.21 },
        levelRequired: 15,
        questUnlock: 'asdf_ch5_finale',
        lore: 'Forged from the ashes of a million burned tokens.'
    },
    asdf_phoenix_robe: {
        id: 'asdf_phoenix_robe',
        name: 'Phoenix Robe',
        slot: 'body',
        rarity: 'epic',
        icon: '🔥',
        faction: 'asdf',
        description: 'Rises from the ashes of every crash.',
        baseStats: { def: getQuestFib(7), str: getQuestFib(5) },
        bonusEffect: { survivalBonus: 0.13 },
        levelRequired: 10,
        questUnlock: 'asdf_ch3_q5',
        lore: 'Woven from threads of regenerating phoenix feathers.'
    },
    asdf_ember_gauntlets: {
        id: 'asdf_ember_gauntlets',
        name: 'Ember Gauntlets',
        slot: 'hands',
        rarity: 'rare',
        icon: '🧤',
        faction: 'asdf',
        description: 'Hands that ignite everything they touch.',
        baseStats: { dev: getQuestFib(6), str: getQuestFib(4) },
        bonusEffect: { critChance: 0.08 },
        levelRequired: 7,
        questUnlock: 'asdf_ch2_q5',
        lore: 'Still warm from the last token sacrifice.'
    },
    asdf_inferno_boots: {
        id: 'asdf_inferno_boots',
        name: 'Inferno Treads',
        slot: 'feet',
        rarity: 'rare',
        icon: '👢',
        faction: 'asdf',
        description: 'Leave a trail of fire wherever you walk.',
        baseStats: { mkt: getQuestFib(6), lck: getQuestFib(4) },
        bonusEffect: { speedBonus: 0.13 },
        levelRequired: 7,
        questUnlock: 'asdf_ch2_q3',
        lore: 'The ground smolders in your wake.'
    },
    asdf_burn_badge: {
        id: 'asdf_burn_badge',
        name: 'True Burner Badge',
        slot: 'accessory',
        rarity: 'epic',
        icon: '🏅',
        faction: 'asdf',
        description: 'Proof of your commitment to the burn.',
        baseStats: { lck: getQuestFib(7), str: getQuestFib(5) },
        bonusEffect: { xpBonus: 0.13 },
        levelRequired: 10,
        questUnlock: 'asdf_ch3_q3',
        lore: 'Earned through sacrifice, worn with pride.'
    },

    // ========================================
    // SAFEYIELD DAO EQUIPMENT
    // ========================================
    safeyield_guardian_helm: {
        id: 'safeyield_guardian_helm',
        name: 'Guardian Helm',
        slot: 'head',
        rarity: 'epic',
        icon: '⛑️',
        faction: 'safeyield',
        description: 'Protection above all else.',
        baseStats: { def: getQuestFib(8), str: getQuestFib(4) },
        bonusEffect: { damageReduction: 0.13 },
        levelRequired: 12,
        questUnlock: 'safeyield_ch4_q5',
        lore: 'No rug can pull what is well protected.'
    },
    safeyield_vault_armor: {
        id: 'safeyield_vault_armor',
        name: 'Vault Keeper Armor',
        slot: 'body',
        rarity: 'rare',
        icon: '🛡️',
        faction: 'safeyield',
        description: 'Impenetrable like a hardware wallet.',
        baseStats: { def: getQuestFib(7), lck: getQuestFib(3) },
        bonusEffect: { tokenProtection: 0.08 },
        levelRequired: 8,
        questUnlock: 'safeyield_ch2_q5',
        lore: 'Cold storage for your body.'
    },
    safeyield_audit_gloves: {
        id: 'safeyield_audit_gloves',
        name: 'Auditor Gloves',
        slot: 'hands',
        rarity: 'uncommon',
        icon: '🧤',
        faction: 'safeyield',
        description: 'Find vulnerabilities before they find you.',
        baseStats: { dev: getQuestFib(5), def: getQuestFib(4) },
        bonusEffect: { detectHidden: true },
        levelRequired: 5,
        questUnlock: 'safeyield_ch1_q5',
        lore: 'Every line of code tells a story.'
    },

    // ========================================
    // PIXEL RAIDERS EQUIPMENT
    // ========================================
    pixel_crown: {
        id: 'pixel_crown',
        name: '8-Bit Crown',
        slot: 'head',
        rarity: 'epic',
        icon: '👾',
        faction: 'pixel_raiders',
        description: 'Retro royalty status confirmed.',
        baseStats: { str: getQuestFib(6), mkt: getQuestFib(6) },
        bonusEffect: { nftBonus: 0.21 },
        levelRequired: 12,
        questUnlock: 'pixel_ch4_q5',
        lore: 'Each pixel contains a different power.'
    },
    pixel_armor: {
        id: 'pixel_armor',
        name: 'Sprite Armor',
        slot: 'body',
        rarity: 'rare',
        icon: '🎮',
        faction: 'pixel_raiders',
        description: 'Low resolution, high protection.',
        baseStats: { def: getQuestFib(5), dev: getQuestFib(5) },
        bonusEffect: { retroBonus: 0.08 },
        levelRequired: 8,
        questUnlock: 'pixel_ch2_q5',
        lore: 'From the golden age of gaming.'
    },
    pixel_gloves: {
        id: 'pixel_gloves',
        name: 'Controller Gloves',
        slot: 'hands',
        rarity: 'uncommon',
        icon: '🕹️',
        faction: 'pixel_raiders',
        description: 'Perfect input precision.',
        baseStats: { dev: getQuestFib(5), lck: getQuestFib(3) },
        bonusEffect: { inputSpeed: 0.13 },
        levelRequired: 5,
        questUnlock: 'pixel_ch1_q5',
        lore: 'Frame-perfect execution guaranteed.'
    },

    // ========================================
    // BASED COLLECTIVE EQUIPMENT
    // ========================================
    based_truth_crown: {
        id: 'based_truth_crown',
        name: 'Crown of Authenticity',
        slot: 'head',
        rarity: 'epic',
        icon: '💎',
        faction: 'based',
        description: 'Only the real recognize the real.',
        baseStats: { str: getQuestFib(7), lck: getQuestFib(5) },
        bonusEffect: { fakeDetection: true, reputationBonus: 0.13 },
        levelRequired: 12,
        questUnlock: 'based_ch4_q5',
        lore: 'Cuts through the noise like truth cuts through lies.'
    },
    based_hoodie: {
        id: 'based_hoodie',
        name: 'Based Hoodie',
        slot: 'body',
        rarity: 'rare',
        icon: '🧥',
        faction: 'based',
        description: 'Keep it simple, keep it real.',
        baseStats: { def: getQuestFib(5), mkt: getQuestFib(5) },
        bonusEffect: { antiHype: 0.08 },
        levelRequired: 8,
        questUnlock: 'based_ch2_q5',
        lore: 'No flashy logos, just pure vibes.'
    },

    // ========================================
    // NODEFORGE EQUIPMENT
    // ========================================
    nodeforge_neural_helm: {
        id: 'nodeforge_neural_helm',
        name: 'Neural Interface Helm',
        slot: 'head',
        rarity: 'epic',
        icon: '🧠',
        faction: 'nodeforge',
        description: 'Direct connection to the network.',
        baseStats: { dev: getQuestFib(8), str: getQuestFib(4) },
        bonusEffect: { computeBonus: 0.21 },
        levelRequired: 12,
        questUnlock: 'nodeforge_ch4_q5',
        lore: 'Think in code, dream in data.'
    },
    nodeforge_server_vest: {
        id: 'nodeforge_server_vest',
        name: 'Server Rack Vest',
        slot: 'body',
        rarity: 'rare',
        icon: '🖥️',
        faction: 'nodeforge',
        description: 'Distributed processing power.',
        baseStats: { def: getQuestFib(6), dev: getQuestFib(5) },
        bonusEffect: { parallelProcessing: true },
        levelRequired: 8,
        questUnlock: 'nodeforge_ch2_q5',
        lore: 'Run nodes on the go.'
    },
    nodeforge_typing_gloves: {
        id: 'nodeforge_typing_gloves',
        name: 'Optimal Typing Gloves',
        slot: 'hands',
        rarity: 'uncommon',
        icon: '⌨️',
        faction: 'nodeforge',
        description: 'Maximum WPM achieved.',
        baseStats: { dev: getQuestFib(6), mkt: getQuestFib(2) },
        bonusEffect: { typingSpeed: 0.21 },
        levelRequired: 5,
        questUnlock: 'nodeforge_ch1_q5',
        lore: 'Cherry MX switches sewn into the fabric.'
    },

    // ========================================
    // PUMP LORDS EQUIPMENT (Antagonist)
    // ========================================
    pump_hype_crown: {
        id: 'pump_hype_crown',
        name: 'Hype King Crown',
        slot: 'head',
        rarity: 'epic',
        icon: '📈',
        faction: 'pump_lords',
        description: 'Number go up mentality.',
        baseStats: { mkt: getQuestFib(8), lck: getQuestFib(4) },
        bonusEffect: { pumpBonus: 0.21 },
        levelRequired: 12,
        questUnlock: 'pump_ch4_q5',
        lore: 'Worn by those who believe in eternal pumps.'
    },
    pump_shill_armor: {
        id: 'pump_shill_armor',
        name: 'Diamond Hands Armor',
        slot: 'body',
        rarity: 'rare',
        icon: '💎',
        faction: 'pump_lords',
        description: 'Never sell, only buy.',
        baseStats: { def: getQuestFib(5), mkt: getQuestFib(6) },
        bonusEffect: { holdingBonus: 0.13 },
        levelRequired: 8,
        questUnlock: 'pump_ch2_q5',
        lore: 'Paper hands need not apply.'
    },

    // ========================================
    // BEAR CLAN EQUIPMENT (Antagonist)
    // ========================================
    bear_doom_helm: {
        id: 'bear_doom_helm',
        name: 'Doom Prophet Helm',
        slot: 'head',
        rarity: 'epic',
        icon: '📉',
        faction: 'bear_clan',
        description: 'See the crash before it happens.',
        baseStats: { str: getQuestFib(6), def: getQuestFib(6) },
        bonusEffect: { crashPrediction: true },
        levelRequired: 12,
        questUnlock: 'bear_ch4_q5',
        lore: 'Every bull market ends the same way.'
    },
    bear_short_armor: {
        id: 'bear_short_armor',
        name: 'Short Seller Vest',
        slot: 'body',
        rarity: 'rare',
        icon: '🐻',
        faction: 'bear_clan',
        description: 'Profit from the pain of others.',
        baseStats: { def: getQuestFib(6), lck: getQuestFib(4) },
        bonusEffect: { shortBonus: 0.13 },
        levelRequired: 8,
        questUnlock: 'bear_ch2_q5',
        lore: 'Cash is king, always has been.'
    },

    // ========================================
    // BUILDERS GUILD EQUIPMENT (Elite)
    // ========================================
    builders_architect_crown: {
        id: 'builders_architect_crown',
        name: 'Architect Crown',
        slot: 'head',
        rarity: 'legendary',
        icon: '🏗️',
        faction: 'builders_guild',
        description: 'Master of all construction.',
        baseStats: { dev: getQuestFib(9), str: getQuestFib(5) },
        bonusEffect: { buildSpeed: 0.34, qualityBonus: 0.21 },
        levelRequired: 20,
        questUnlock: 'builders_ch5_finale',
        lore: 'The greatest structures begin with a single thought.'
    },
    builders_forge_apron: {
        id: 'builders_forge_apron',
        name: 'Forge Master Apron',
        slot: 'body',
        rarity: 'epic',
        icon: '🔨',
        faction: 'builders_guild',
        description: 'Protection during intense building.',
        baseStats: { def: getQuestFib(7), dev: getQuestFib(6) },
        bonusEffect: { craftingBonus: 0.21 },
        levelRequired: 15,
        questUnlock: 'builders_ch3_q5',
        lore: 'Stained with the marks of a thousand projects.'
    },

    // ========================================
    // ADDITIONAL FACTION EQUIPMENT
    // ========================================

    // Based Collective Additional
    based_visor: { id: 'based_visor', name: 'Based Visor', slot: 'accessory', rarity: 'uncommon', icon: '🕶️', faction: 'based_collective', description: 'See through the hype.', baseStats: { lck: getQuestFib(5) }, levelRequired: 3, questUnlock: 'based_ch1_q5' },
    based_jacket: { id: 'based_jacket', name: 'Authentic Jacket', slot: 'body', rarity: 'rare', icon: '🧥', faction: 'based_collective', description: 'No brands, just truth.', baseStats: { def: getQuestFib(6), mkt: getQuestFib(4) }, levelRequired: 6, questUnlock: 'based_ch2_q5' },
    based_boots: { id: 'based_boots', name: 'Grounded Boots', slot: 'feet', rarity: 'epic', icon: '👢', faction: 'based_collective', description: 'Stay grounded in reality.', baseStats: { def: getQuestFib(6), lck: getQuestFib(5) }, levelRequired: 9, questUnlock: 'based_ch3_q5' },
    based_crown: { id: 'based_crown', name: 'Crown of Truth', slot: 'head', rarity: 'epic', icon: '👑', faction: 'based_collective', description: 'The ultimate symbol of authenticity.', baseStats: { str: getQuestFib(7), mkt: getQuestFib(5) }, levelRequired: 11, questUnlock: 'based_ch4_q3' },
    based_legendary_mic: { id: 'based_legendary_mic', name: 'Legendary Mic of Truth', slot: 'accessory', rarity: 'legendary', icon: '🎤', faction: 'based_collective', description: 'Your voice cuts through all noise.', baseStats: { mkt: getQuestFib(8), lck: getQuestFib(6) }, bonusEffect: { voiceAmplify: 0.34 }, levelRequired: 13, questUnlock: 'based_ch5_q2' },

    // NodeForge Additional
    nodeforge_gloves: { id: 'nodeforge_gloves', name: 'Dev Gloves', slot: 'hands', rarity: 'uncommon', icon: '🧤', faction: 'nodeforge', description: 'Type at light speed.', baseStats: { dev: getQuestFib(5), lck: getQuestFib(2) }, levelRequired: 3, questUnlock: 'nodeforge_ch1_q5' },
    nodeforge_vest: { id: 'nodeforge_vest', name: 'Server Vest', slot: 'body', rarity: 'rare', icon: '🎽', faction: 'nodeforge', description: 'Built-in cooling system.', baseStats: { def: getQuestFib(6), dev: getQuestFib(5) }, levelRequired: 6, questUnlock: 'nodeforge_ch2_q5' },
    nodeforge_boots: { id: 'nodeforge_boots', name: 'Node Runner Boots', slot: 'feet', rarity: 'epic', icon: '👟', faction: 'nodeforge', description: 'Run nodes everywhere you go.', baseStats: { dev: getQuestFib(6), mkt: getQuestFib(4) }, levelRequired: 9, questUnlock: 'nodeforge_ch3_q5' },
    nodeforge_helmet: { id: 'nodeforge_helmet', name: 'Neural Helmet', slot: 'head', rarity: 'epic', icon: '🪖', faction: 'nodeforge', description: 'Direct brain-to-code interface.', baseStats: { dev: getQuestFib(7), str: getQuestFib(4) }, levelRequired: 11, questUnlock: 'nodeforge_ch4_q3' },
    nodeforge_legendary_keyboard: { id: 'nodeforge_legendary_keyboard', name: 'Legendary Mechanical Keyboard', slot: 'accessory', rarity: 'legendary', icon: '⌨️', faction: 'nodeforge', description: 'The ultimate coding tool.', baseStats: { dev: getQuestFib(8), lck: getQuestFib(6) }, bonusEffect: { codeSpeed: 0.34 }, levelRequired: 13, questUnlock: 'nodeforge_ch5_q2' },

    // Pump Lords Additional
    pump_visor: { id: 'pump_visor', name: 'Green Candle Visor', slot: 'accessory', rarity: 'uncommon', icon: '🕶️', faction: 'pump_lords', description: 'Only see green.', baseStats: { mkt: getQuestFib(5) }, levelRequired: 3, questUnlock: 'pump_ch1_q5' },
    pump_suit: { id: 'pump_suit', name: 'Power Suit', slot: 'body', rarity: 'rare', icon: '🤵', faction: 'pump_lords', description: 'Dress for the pump you want.', baseStats: { mkt: getQuestFib(6), lck: getQuestFib(4) }, levelRequired: 6, questUnlock: 'pump_ch2_q5' },
    pump_boots: { id: 'pump_boots', name: 'Moon Boots', slot: 'feet', rarity: 'epic', icon: '🌙', faction: 'pump_lords', description: 'Walk on the moon.', baseStats: { mkt: getQuestFib(6), str: getQuestFib(4) }, levelRequired: 9, questUnlock: 'pump_ch3_q5' },
    pump_crown: { id: 'pump_crown', name: 'Pump King Crown', slot: 'head', rarity: 'epic', icon: '📈', faction: 'pump_lords', description: 'Rule the green candles.', baseStats: { mkt: getQuestFib(7), lck: getQuestFib(5) }, levelRequired: 11, questUnlock: 'pump_ch4_q3' },
    pump_legendary_scepter: { id: 'pump_legendary_scepter', name: 'Scepter of Eternal Pumps', slot: 'accessory', rarity: 'legendary', icon: '🏆', faction: 'pump_lords', description: 'Command the markets.', baseStats: { mkt: getQuestFib(8), lck: getQuestFib(7) }, bonusEffect: { pumpPower: 0.34 }, levelRequired: 13, questUnlock: 'pump_ch5_q2' },

    // Bear Clan Additional
    bear_visor: { id: 'bear_visor', name: 'Red Vision Visor', slot: 'accessory', rarity: 'uncommon', icon: '🕶️', faction: 'bear_clan', description: 'Only see red.', baseStats: { def: getQuestFib(5) }, levelRequired: 3, questUnlock: 'bear_ch1_q5' },
    bear_jacket: { id: 'bear_jacket', name: 'Hibernation Jacket', slot: 'body', rarity: 'rare', icon: '🧥', faction: 'bear_clan', description: 'Stay warm during the winter.', baseStats: { def: getQuestFib(6), str: getQuestFib(4) }, levelRequired: 6, questUnlock: 'bear_ch2_q5' },
    bear_boots: { id: 'bear_boots', name: 'Cave Boots', slot: 'feet', rarity: 'epic', icon: '🥾', faction: 'bear_clan', description: 'Retreat safely.', baseStats: { def: getQuestFib(6), lck: getQuestFib(4) }, levelRequired: 9, questUnlock: 'bear_ch3_q5' },
    bear_crown: { id: 'bear_crown', name: 'Bear Market Crown', slot: 'head', rarity: 'epic', icon: '🐻', faction: 'bear_clan', description: 'Rule the red candles.', baseStats: { def: getQuestFib(7), str: getQuestFib(5) }, levelRequired: 11, questUnlock: 'bear_ch4_q3' },
    bear_legendary_cloak: { id: 'bear_legendary_cloak', name: 'Cloak of Eternal Winter', slot: 'accessory', rarity: 'legendary', icon: '❄️', faction: 'bear_clan', description: 'Survive any market crash.', baseStats: { def: getQuestFib(8), lck: getQuestFib(7) }, bonusEffect: { crashProtection: 0.34 }, levelRequired: 13, questUnlock: 'bear_ch5_q2' },

    // Builders Guild Additional
    builders_gloves: { id: 'builders_gloves', name: 'Artisan Gloves', slot: 'hands', rarity: 'uncommon', icon: '🧤', faction: 'builders_guild', description: 'Build with precision.', baseStats: { dev: getQuestFib(5), str: getQuestFib(2) }, levelRequired: 12, questUnlock: 'builders_ch1_q5' },
    builders_vest: { id: 'builders_vest', name: 'Workshop Vest', slot: 'body', rarity: 'rare', icon: '🎽', faction: 'builders_guild', description: 'Protection in the forge.', baseStats: { def: getQuestFib(6), dev: getQuestFib(5) }, levelRequired: 14, questUnlock: 'builders_ch2_q5' },
    builders_boots: { id: 'builders_boots', name: 'Steel Toe Boots', slot: 'feet', rarity: 'epic', icon: '👢', faction: 'builders_guild', description: 'Walk the construction site.', baseStats: { def: getQuestFib(6), str: getQuestFib(5) }, levelRequired: 17, questUnlock: 'builders_ch3_q5' },
    builders_helmet: { id: 'builders_helmet', name: 'Hard Hat of Wisdom', slot: 'head', rarity: 'epic', icon: '⛑️', faction: 'builders_guild', description: 'Protect your ideas.', baseStats: { dev: getQuestFib(7), def: getQuestFib(5) }, levelRequired: 18, questUnlock: 'builders_ch4_q3' },
    builders_legendary_blueprint: { id: 'builders_legendary_blueprint', name: 'Legendary Master Blueprint', slot: 'accessory', rarity: 'legendary', icon: '📐', faction: 'builders_guild', description: 'The plans for everything.', baseStats: { dev: getQuestFib(9), str: getQuestFib(5) }, bonusEffect: { buildMaster: 0.34 }, levelRequired: 20, questUnlock: 'builders_ch5_q2' },

    // SafeYield Additional
    safeyield_shield_boots: { id: 'safeyield_shield_boots', name: 'Vault Boots', slot: 'feet', rarity: 'rare', icon: '👢', faction: 'safeyield', description: 'Stand on solid ground.', baseStats: { def: getQuestFib(6), lck: getQuestFib(4) }, levelRequired: 9, questUnlock: 'safeyield_ch3_q5' },
    safeyield_ultimate_shield: { id: 'safeyield_ultimate_shield', name: 'Ultimate Shield', slot: 'accessory', rarity: 'legendary', icon: '🛡️', faction: 'safeyield', description: 'Impenetrable defense.', baseStats: { def: getQuestFib(9), lck: getQuestFib(5) }, bonusEffect: { ultimateDefense: 0.34 }, levelRequired: 13, questUnlock: 'safeyield_ch5_q2' },

    // Pixel Raiders Additional
    pixel_boots: { id: 'pixel_boots', name: 'Speed Run Boots', slot: 'feet', rarity: 'epic', icon: '👟', faction: 'pixel_raiders', description: 'Frame-perfect movement.', baseStats: { str: getQuestFib(6), lck: getQuestFib(5) }, levelRequired: 9, questUnlock: 'pixel_ch3_q5' },
    pixel_legendary_controller: { id: 'pixel_legendary_controller', name: 'Legendary Pro Controller', slot: 'accessory', rarity: 'legendary', icon: '🎮', faction: 'pixel_raiders', description: 'The ultimate gaming tool.', baseStats: { str: getQuestFib(7), dev: getQuestFib(6) }, bonusEffect: { gamingMaster: 0.34 }, levelRequired: 13, questUnlock: 'pixel_ch5_q2' }
};

// ============================================================
// EQUIPMENT PIECES - Crafting materials for equipment
// ============================================================

const EQUIPMENT_PIECES = {
    // ========================================
    // COMMON PIECES
    // ========================================
    shard_fire: {
        id: 'shard_fire',
        name: 'Fire Shard',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '🔶',
        description: 'A fragment of crystallized flame.',
        faction: 'asdf',
        usedFor: ['asdf_ember_gauntlets', 'asdf_inferno_boots'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },
    shard_ice: {
        id: 'shard_ice',
        name: 'Ice Shard',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '🔷',
        description: 'A fragment of eternal ice.',
        faction: 'safeyield',
        usedFor: ['safeyield_vault_armor', 'safeyield_guardian_helm'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },
    shard_pixel: {
        id: 'shard_pixel',
        name: 'Pixel Fragment',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '🟪',
        description: 'A corrupted sprite data fragment.',
        faction: 'pixel_raiders',
        usedFor: ['pixel_armor', 'pixel_gloves'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },
    shard_code: {
        id: 'shard_code',
        name: 'Code Fragment',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '💾',
        description: 'A piece of optimized bytecode.',
        faction: 'nodeforge',
        usedFor: ['nodeforge_typing_gloves', 'nodeforge_server_vest'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },
    shard_truth: {
        id: 'shard_truth',
        name: 'Truth Shard',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '💠',
        description: 'A fragment of pure authenticity.',
        faction: 'based_collective',
        usedFor: ['based_visor', 'based_jacket'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },
    shard_pump: {
        id: 'shard_pump',
        name: 'Pump Shard',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '📈',
        description: 'A fragment of pure green energy.',
        faction: 'pump_lords',
        usedFor: ['pump_visor', 'pump_suit'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },
    shard_bear: {
        id: 'shard_bear',
        name: 'Bear Shard',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'common',
        icon: '📉',
        description: 'A fragment of market pessimism.',
        faction: 'bear_clan',
        usedFor: ['bear_visor', 'bear_jacket'],
        dropChance: 0.3,
        stackable: true,
        maxStack: 99
    },

    // ========================================
    // UNCOMMON PIECES
    // ========================================
    ember_essence: {
        id: 'ember_essence',
        name: 'Ember Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🔥',
        description: 'Concentrated burning energy.',
        faction: 'asdf',
        usedFor: ['asdf_phoenix_robe', 'asdf_burn_badge'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    vault_core: {
        id: 'vault_core',
        name: 'Vault Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🔐',
        description: 'The heart of a secure vault.',
        faction: 'safeyield',
        usedFor: ['safeyield_guardian_helm', 'safeyield_audit_gloves'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    sprite_data: {
        id: 'sprite_data',
        name: 'Sprite Data',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🎮',
        description: 'Raw pixel animation data.',
        faction: 'pixel_raiders',
        usedFor: ['pixel_crown', 'pixel_armor'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    neural_wire: {
        id: 'neural_wire',
        name: 'Neural Wire',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🔌',
        description: 'High-bandwidth neural connector.',
        faction: 'nodeforge',
        usedFor: ['nodeforge_neural_helm', 'nodeforge_server_vest'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    authenticity_seal: {
        id: 'authenticity_seal',
        name: 'Authenticity Seal',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '✅',
        description: 'Proof of genuine origin.',
        faction: 'based',
        usedFor: ['based_truth_crown', 'based_hoodie'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    essence_security: {
        id: 'essence_security',
        name: 'Security Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🛡️',
        description: 'Concentrated defensive energy.',
        faction: 'safeyield',
        usedFor: ['safeyield_shield_boots', 'safeyield_guardian_helm'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    essence_gaming: {
        id: 'essence_gaming',
        name: 'Gaming Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🎯',
        description: 'Pure competitive spirit.',
        faction: 'pixel_raiders',
        usedFor: ['pixel_boots', 'pixel_crown'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    essence_truth: {
        id: 'essence_truth',
        name: 'Truth Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '💡',
        description: 'The essence of authenticity.',
        faction: 'based_collective',
        usedFor: ['based_boots', 'based_crown'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    essence_code: {
        id: 'essence_code',
        name: 'Code Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '⚡',
        description: 'Pure algorithmic power.',
        faction: 'nodeforge',
        usedFor: ['nodeforge_boots', 'nodeforge_helmet'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    essence_pump: {
        id: 'essence_pump',
        name: 'Pump Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🚀',
        description: 'Concentrated bullish energy.',
        faction: 'pump_lords',
        usedFor: ['pump_boots', 'pump_crown'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },
    essence_bear: {
        id: 'essence_bear',
        name: 'Bear Essence',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'uncommon',
        icon: '🐻',
        description: 'Concentrated bearish wisdom.',
        faction: 'bear_clan',
        usedFor: ['bear_boots', 'bear_crown'],
        dropChance: 0.15,
        stackable: true,
        maxStack: 50
    },

    // ========================================
    // RARE PIECES
    // ========================================
    phoenix_feather: {
        id: 'phoenix_feather',
        name: 'Phoenix Feather',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'rare',
        icon: '🪶',
        description: 'A feather from a reborn phoenix.',
        faction: 'asdf',
        usedFor: ['asdf_burning_crown', 'asdf_phoenix_robe'],
        dropChance: 0.05,
        stackable: true,
        maxStack: 21
    },
    diamond_core: {
        id: 'diamond_core',
        name: 'Diamond Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'rare',
        icon: '💎',
        description: 'An unbreakable crystalline core.',
        faction: 'safeyield',
        usedFor: ['safeyield_guardian_helm'],
        dropChance: 0.05,
        stackable: true,
        maxStack: 21
    },
    ancient_cartridge: {
        id: 'ancient_cartridge',
        name: 'Ancient Cartridge',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'rare',
        icon: '📼',
        description: 'Contains legendary game data.',
        faction: 'pixel_raiders',
        usedFor: ['pixel_crown'],
        dropChance: 0.05,
        stackable: true,
        maxStack: 21
    },
    quantum_chip: {
        id: 'quantum_chip',
        name: 'Quantum Chip',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'rare',
        icon: '🔮',
        description: 'Processes in superposition.',
        faction: 'nodeforge',
        usedFor: ['nodeforge_neural_helm'],
        dropChance: 0.05,
        stackable: true,
        maxStack: 21
    },

    // ========================================
    // EPIC PIECES
    // ========================================
    eternal_flame: {
        id: 'eternal_flame',
        name: 'Eternal Flame',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '🌟',
        description: 'A flame that never dies.',
        faction: 'asdf',
        usedFor: ['asdf_burning_crown'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    genesis_block: {
        id: 'genesis_block',
        name: 'Genesis Block Fragment',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '🧱',
        description: 'A piece of the first block.',
        faction: 'builders_guild',
        usedFor: ['builders_architect_crown', 'builders_forge_apron'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    core_guardian: {
        id: 'core_guardian',
        name: 'Guardian Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '🔰',
        description: 'The heart of ultimate protection.',
        faction: 'safeyield',
        usedFor: ['safeyield_ultimate_shield'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    core_gaming: {
        id: 'core_gaming',
        name: 'Gaming Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '🎮',
        description: 'Pure legendary gaming power.',
        faction: 'pixel_raiders',
        usedFor: ['pixel_legendary_controller'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    core_truth: {
        id: 'core_truth',
        name: 'Truth Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '💎',
        description: 'The core of absolute authenticity.',
        faction: 'based_collective',
        usedFor: ['based_legendary_mic'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    core_code: {
        id: 'core_code',
        name: 'Code Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '💻',
        description: 'The essence of perfect code.',
        faction: 'nodeforge',
        usedFor: ['nodeforge_legendary_keyboard'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    core_pump: {
        id: 'core_pump',
        name: 'Pump Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '🚀',
        description: 'Concentrated bullish power.',
        faction: 'pump_lords',
        usedFor: ['pump_legendary_scepter'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    },
    core_bear: {
        id: 'core_bear',
        name: 'Bear Core',
        type: QUEST_ITEM_TYPES.PIECE,
        rarity: 'epic',
        icon: '🐻',
        description: 'Concentrated bearish wisdom.',
        faction: 'bear_clan',
        usedFor: ['bear_legendary_cloak'],
        dropChance: 0.02,
        stackable: true,
        maxStack: 8
    }
};

// ============================================================
// ACHIEVEMENT BADGES - Collectible quest completion badges
// ============================================================

const ACHIEVEMENT_BADGES = {
    // ========================================
    // FACTION CHAPTER COMPLETION BADGES
    // ========================================
    badge_asdf_initiate: {
        id: 'badge_asdf_initiate',
        name: 'ASDF Initiate',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'uncommon',
        icon: '🔰',
        faction: 'asdf',
        description: 'Completed ASDF Chapter 1: Initiation',
        chapter: 1,
        bonusStats: { str: 2 },
        unlockCondition: 'Complete all Chapter 1 ASDF quests'
    },
    badge_asdf_believer: {
        id: 'badge_asdf_believer',
        name: 'True Believer',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'rare',
        icon: '🔥',
        faction: 'asdf',
        description: 'Completed ASDF Chapter 2: The Collective',
        chapter: 2,
        bonusStats: { str: 5, lck: 3 },
        unlockCondition: 'Complete all Chapter 2 ASDF quests'
    },
    badge_asdf_phoenix: {
        id: 'badge_asdf_phoenix',
        name: 'Rising Phoenix',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '🦅',
        faction: 'asdf',
        description: 'Completed ASDF Chapter 3: Rising Flames',
        chapter: 3,
        bonusStats: { str: 8, lck: 5, def: 3 },
        unlockCondition: 'Complete all Chapter 3 ASDF quests'
    },
    badge_asdf_champion: {
        id: 'badge_asdf_champion',
        name: 'Faction Champion',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '⚔️',
        faction: 'asdf',
        description: 'Completed ASDF Chapter 4: Faction Wars',
        chapter: 4,
        bonusStats: { str: 13, lck: 8, def: 5 },
        unlockCondition: 'Complete all Chapter 4 ASDF quests'
    },
    badge_asdf_legend: {
        id: 'badge_asdf_legend',
        name: 'Burn Legend',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'legendary',
        icon: '👑',
        faction: 'asdf',
        description: 'Completed ASDF Chapter 5: Finale',
        chapter: 5,
        bonusStats: { str: 21, lck: 13, def: 8, mkt: 5 },
        unlockCondition: 'Complete all Chapter 5 ASDF quests'
    },

    // SafeYield Badges
    badge_safeyield_novice: {
        id: 'badge_safeyield_novice',
        name: 'Safety Novice',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'uncommon',
        icon: '🛡️',
        faction: 'safeyield',
        description: 'Completed SafeYield Chapter 1',
        chapter: 1,
        bonusStats: { def: 3 },
        unlockCondition: 'Complete all Chapter 1 SafeYield quests'
    },
    badge_safeyield_guardian: {
        id: 'badge_safeyield_guardian',
        name: 'Vault Guardian',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '🔒',
        faction: 'safeyield',
        description: 'Completed SafeYield Campaign',
        chapter: 5,
        bonusStats: { def: 21, lck: 8 },
        unlockCondition: 'Complete all SafeYield quests'
    },

    // Pixel Raiders Badges
    badge_pixel_gamer: {
        id: 'badge_pixel_gamer',
        name: 'Retro Gamer',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'uncommon',
        icon: '🎮',
        faction: 'pixel_raiders',
        description: 'Completed Pixel Raiders Chapter 1',
        chapter: 1,
        bonusStats: { dev: 2, lck: 1 },
        unlockCondition: 'Complete all Chapter 1 Pixel Raiders quests'
    },
    badge_pixel_master: {
        id: 'badge_pixel_master',
        name: 'Pixel Master',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '👾',
        faction: 'pixel_raiders',
        description: 'Completed Pixel Raiders Campaign',
        chapter: 5,
        bonusStats: { dev: 13, mkt: 8, lck: 5 },
        unlockCondition: 'Complete all Pixel Raiders quests'
    },

    // Based Collective Badges
    badge_based_authentic: {
        id: 'badge_based_authentic',
        name: 'Authentically Based',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'uncommon',
        icon: '💯',
        faction: 'based',
        description: 'Completed Based Collective Chapter 1',
        chapter: 1,
        bonusStats: { str: 2, mkt: 1 },
        unlockCondition: 'Complete all Chapter 1 Based quests'
    },
    badge_based_legend: {
        id: 'badge_based_legend',
        name: 'Based Legend',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '🏆',
        faction: 'based',
        description: 'Completed Based Collective Campaign',
        chapter: 5,
        bonusStats: { str: 13, mkt: 13, lck: 8 },
        unlockCondition: 'Complete all Based quests'
    },

    // NodeForge Badges
    badge_nodeforge_dev: {
        id: 'badge_nodeforge_dev',
        name: 'Junior Dev',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'uncommon',
        icon: '💻',
        faction: 'nodeforge',
        description: 'Completed NodeForge Chapter 1',
        chapter: 1,
        bonusStats: { dev: 3 },
        unlockCondition: 'Complete all Chapter 1 NodeForge quests'
    },
    badge_nodeforge_architect: {
        id: 'badge_nodeforge_architect',
        name: 'System Architect',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '🏛️',
        faction: 'nodeforge',
        description: 'Completed NodeForge Campaign',
        chapter: 5,
        bonusStats: { dev: 21, str: 8 },
        unlockCondition: 'Complete all NodeForge quests'
    },

    // Builders Guild Badges
    badge_builders_apprentice: {
        id: 'badge_builders_apprentice',
        name: 'Builder Apprentice',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'rare',
        icon: '🔧',
        faction: 'builders_guild',
        description: 'Accepted into Builders Guild',
        chapter: 1,
        bonusStats: { dev: 5, def: 3 },
        unlockCondition: 'Join the Builders Guild'
    },
    badge_builders_master: {
        id: 'badge_builders_master',
        name: 'Master Builder',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'legendary',
        icon: '🏗️',
        faction: 'builders_guild',
        description: 'Completed Builders Guild Campaign',
        chapter: 5,
        bonusStats: { dev: 34, def: 13, str: 8 },
        unlockCondition: 'Complete all Builders Guild quests'
    },

    // ========================================
    // SPECIAL ACHIEVEMENT BADGES
    // ========================================
    badge_first_burn: {
        id: 'badge_first_burn',
        name: 'First Flame',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'common',
        icon: '🕯️',
        faction: null,
        description: 'Burned tokens for the first time',
        bonusStats: { lck: 1 },
        unlockCondition: 'Burn any amount of tokens'
    },
    badge_thousand_burns: {
        id: 'badge_thousand_burns',
        name: 'Thousand Flames',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'rare',
        icon: '🔥',
        faction: null,
        description: 'Burned 1000+ tokens total',
        bonusStats: { str: 5, lck: 3 },
        unlockCondition: 'Burn 1000 tokens total'
    },
    badge_faction_hopper: {
        id: 'badge_faction_hopper',
        name: 'Faction Explorer',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'rare',
        icon: '🌍',
        faction: null,
        description: 'Joined 3 different factions',
        bonusStats: { mkt: 5, lck: 5 },
        unlockCondition: 'Join 3 different factions'
    },
    badge_completionist: {
        id: 'badge_completionist',
        name: 'Completionist',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'legendary',
        icon: '🎖️',
        faction: null,
        description: 'Completed all faction campaigns',
        bonusStats: { str: 13, def: 13, dev: 13, mkt: 13, lck: 13 },
        unlockCondition: 'Complete all 8 faction campaigns'
    },
    badge_side_master: {
        id: 'badge_side_master',
        name: 'Side Quest Master',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '📜',
        faction: null,
        description: 'Completed all side quests',
        bonusStats: { lck: 21, mkt: 8 },
        unlockCondition: 'Complete all side quests'
    },
    badge_choice_maker: {
        id: 'badge_choice_maker',
        name: 'Decisive Leader',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'uncommon',
        icon: '⚖️',
        faction: null,
        description: 'Made 10 major story choices',
        bonusStats: { str: 3, lck: 2 },
        unlockCondition: 'Make 10 major story choices'
    },
    badge_ally_collector: {
        id: 'badge_ally_collector',
        name: 'Friend to All',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'rare',
        icon: '🤝',
        faction: null,
        description: 'Recruited all possible allies',
        bonusStats: { mkt: 8, lck: 5 },
        unlockCondition: 'Recruit all 6 possible allies'
    },
    badge_creature_master: {
        id: 'badge_creature_master',
        name: 'Creature Master',
        type: QUEST_ITEM_TYPES.BADGE,
        rarity: 'epic',
        icon: '🐉',
        faction: null,
        description: 'Unlocked all creatures',
        bonusStats: { str: 8, lck: 8, dev: 5 },
        unlockCondition: 'Unlock all 12 creatures'
    }
};

// ============================================================
// CRAFTING RECIPES
// ============================================================

const EQUIPMENT_RECIPES = {
    // ASDF Recipes
    asdf_ember_gauntlets_recipe: {
        id: 'asdf_ember_gauntlets_recipe',
        result: 'asdf_ember_gauntlets',
        materials: [
            { piece: 'shard_fire', quantity: 5 },
            { piece: 'ember_essence', quantity: 2 }
        ],
        faction: 'asdf',
        levelRequired: 7
    },
    asdf_inferno_boots_recipe: {
        id: 'asdf_inferno_boots_recipe',
        result: 'asdf_inferno_boots',
        materials: [
            { piece: 'shard_fire', quantity: 5 },
            { piece: 'ember_essence', quantity: 2 }
        ],
        faction: 'asdf',
        levelRequired: 7
    },
    asdf_phoenix_robe_recipe: {
        id: 'asdf_phoenix_robe_recipe',
        result: 'asdf_phoenix_robe',
        materials: [
            { piece: 'ember_essence', quantity: 5 },
            { piece: 'phoenix_feather', quantity: 3 }
        ],
        faction: 'asdf',
        levelRequired: 10
    },
    asdf_burning_crown_recipe: {
        id: 'asdf_burning_crown_recipe',
        result: 'asdf_burning_crown',
        materials: [
            { piece: 'phoenix_feather', quantity: 5 },
            { piece: 'eternal_flame', quantity: 3 }
        ],
        faction: 'asdf',
        levelRequired: 15
    },

    // SafeYield Recipes
    safeyield_audit_gloves_recipe: {
        id: 'safeyield_audit_gloves_recipe',
        result: 'safeyield_audit_gloves',
        materials: [
            { piece: 'shard_ice', quantity: 5 },
            { piece: 'vault_core', quantity: 2 }
        ],
        faction: 'safeyield',
        levelRequired: 5
    },
    safeyield_vault_armor_recipe: {
        id: 'safeyield_vault_armor_recipe',
        result: 'safeyield_vault_armor',
        materials: [
            { piece: 'vault_core', quantity: 5 },
            { piece: 'diamond_core', quantity: 2 }
        ],
        faction: 'safeyield',
        levelRequired: 8
    },

    // Pixel Raiders Recipes
    pixel_gloves_recipe: {
        id: 'pixel_gloves_recipe',
        result: 'pixel_gloves',
        materials: [
            { piece: 'shard_pixel', quantity: 5 },
            { piece: 'sprite_data', quantity: 2 }
        ],
        faction: 'pixel_raiders',
        levelRequired: 5
    },
    pixel_crown_recipe: {
        id: 'pixel_crown_recipe',
        result: 'pixel_crown',
        materials: [
            { piece: 'sprite_data', quantity: 5 },
            { piece: 'ancient_cartridge', quantity: 3 }
        ],
        faction: 'pixel_raiders',
        levelRequired: 12
    },

    // NodeForge Recipes
    nodeforge_typing_gloves_recipe: {
        id: 'nodeforge_typing_gloves_recipe',
        result: 'nodeforge_typing_gloves',
        materials: [
            { piece: 'shard_code', quantity: 5 },
            { piece: 'neural_wire', quantity: 2 }
        ],
        faction: 'nodeforge',
        levelRequired: 5
    },
    nodeforge_neural_helm_recipe: {
        id: 'nodeforge_neural_helm_recipe',
        result: 'nodeforge_neural_helm',
        materials: [
            { piece: 'neural_wire', quantity: 5 },
            { piece: 'quantum_chip', quantity: 3 }
        ],
        faction: 'nodeforge',
        levelRequired: 12
    },

    // Builders Guild Recipes
    builders_forge_apron_recipe: {
        id: 'builders_forge_apron_recipe',
        result: 'builders_forge_apron',
        materials: [
            { piece: 'genesis_block', quantity: 3 }
        ],
        faction: 'builders_guild',
        levelRequired: 15
    },
    builders_architect_crown_recipe: {
        id: 'builders_architect_crown_recipe',
        result: 'builders_architect_crown',
        materials: [
            { piece: 'genesis_block', quantity: 5 },
            { piece: 'eternal_flame', quantity: 2 },
            { piece: 'quantum_chip', quantity: 2 }
        ],
        faction: 'builders_guild',
        levelRequired: 20
    }
};

// ============================================================
// QUEST REWARD PRESETS
// ============================================================

const QUEST_REWARD_PRESETS = {
    // Chapter 1 rewards (starter items)
    chapter1_early: {
        pieces: [{ id: null, quantity: 1, chance: 0.5 }],  // faction-specific common piece
        tokens: 50,
        xp: 100
    },
    chapter1_mid: {
        pieces: [{ id: null, quantity: 2, chance: 0.7 }],
        tokens: 75,
        xp: 150
    },
    chapter1_finale: {
        pieces: [{ id: null, quantity: 3, chance: 1.0 }],
        badge: null,  // chapter completion badge
        equipment: null,  // uncommon equipment
        tokens: 150,
        xp: 300
    },

    // Chapter 2 rewards
    chapter2_early: {
        pieces: [
            { id: null, quantity: 1, chance: 0.5 },  // common
            { id: null, quantity: 1, chance: 0.2 }   // uncommon
        ],
        tokens: 100,
        xp: 200
    },
    chapter2_finale: {
        pieces: [{ id: null, quantity: 5, chance: 1.0 }],
        badge: null,
        equipment: null,  // rare equipment
        tokens: 250,
        xp: 500
    },

    // Chapter 3-4 rewards
    chapter_mid_finale: {
        pieces: [
            { id: null, quantity: 3, chance: 1.0 },
            { id: null, quantity: 1, chance: 0.3 }  // rare piece
        ],
        badge: null,
        equipment: null,
        tokens: 400,
        xp: 800
    },

    // Chapter 5 finale rewards
    chapter5_finale: {
        pieces: [
            { id: null, quantity: 5, chance: 1.0 },
            { id: null, quantity: 2, chance: 0.5 }  // epic piece
        ],
        badge: null,  // legendary badge
        equipment: null,  // legendary equipment
        tokens: 1000,
        xp: 2000
    },

    // Side quest rewards
    side_quest_easy: {
        pieces: [{ id: null, quantity: 1, chance: 0.3 }],
        tokens: 50,
        xp: 75
    },
    side_quest_hard: {
        pieces: [{ id: null, quantity: 2, chance: 0.5 }],
        badge: null,
        tokens: 150,
        xp: 250
    }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all equipment for a specific faction
 */
function getFactionEquipment(factionId) {
    return Object.values(FACTION_EQUIPMENT).filter(e => e.faction === factionId);
}

/**
 * Get all pieces for a specific faction
 */
function getFactionPieces(factionId) {
    return Object.values(EQUIPMENT_PIECES).filter(p => p.faction === factionId);
}

/**
 * Get all badges for a specific faction
 */
function getFactionBadges(factionId) {
    return Object.values(ACHIEVEMENT_BADGES).filter(b => b.faction === factionId);
}

/**
 * Get recipe for a specific equipment
 */
function getRecipeFor(equipmentId) {
    return Object.values(EQUIPMENT_RECIPES).find(r => r.result === equipmentId);
}

/**
 * Check if player can craft equipment
 */
function canCraft(recipeId, playerInventory) {
    const recipe = EQUIPMENT_RECIPES[recipeId];
    if (!recipe) return { canCraft: false, reason: 'Recipe not found' };

    for (const material of recipe.materials) {
        const owned = playerInventory[material.piece] || 0;
        if (owned < material.quantity) {
            return {
                canCraft: false,
                reason: `Need ${material.quantity - owned} more ${EQUIPMENT_PIECES[material.piece]?.name || material.piece}`
            };
        }
    }

    return { canCraft: true };
}

/**
 * Generate random piece drop from quest
 */
function rollPieceDrop(factionId, rarity = 'common') {
    const factionPieces = getFactionPieces(factionId).filter(p => p.rarity === rarity);
    if (factionPieces.length === 0) return null;

    const piece = factionPieces[Math.floor(Math.random() * factionPieces.length)];
    if (Math.random() < piece.dropChance) {
        return { pieceId: piece.id, quantity: 1 };
    }
    return null;
}

// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.PumpArenaQuestItems = {
    // Constants
    QUEST_ITEM_TYPES,
    FACTION_EQUIPMENT,
    EQUIPMENT_PIECES,
    ACHIEVEMENT_BADGES,
    EQUIPMENT_RECIPES,
    QUEST_REWARD_PRESETS,

    // Helper functions
    getFactionEquipment,
    getFactionPieces,
    getFactionBadges,
    getRecipeFor,
    canCraft,
    rollPieceDrop,

    // Direct access
    getEquipment: (id) => FACTION_EQUIPMENT[id],
    getPiece: (id) => EQUIPMENT_PIECES[id],
    getBadge: (id) => ACHIEVEMENT_BADGES[id],
    getRecipe: (id) => EQUIPMENT_RECIPES[id]
};
