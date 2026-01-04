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
// COMBAT SKILLS
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
// BATTLE STATE
// ============================================

let battleState = {
    active: false,
    player: null,
    enemy: null,
    turn: 0,
    playerHp: 0,
    playerMp: 0,
    enemyHp: 0,
    buffs: [],
    debuffs: [],
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

    // Initialize battle state
    battleState = {
        active: true,
        player: playerStats,
        enemy: enemy,
        turn: 1,
        playerHp: playerStats.maxHp,
        playerMp: playerStats.maxMp,
        enemyHp: enemy.hp,
        buffs: [],
        debuffs: [],
        cooldowns: {},
        log: [`Battle started against ${enemy.name}!`]
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
 * Get current battle state (safe copy)
 */
function getBattleState() {
    if (!battleState.active) return null;

    return {
        active: battleState.active,
        turn: battleState.turn,
        player: {
            hp: battleState.playerHp,
            maxHp: battleState.player.maxHp,
            mp: battleState.playerMp,
            maxMp: battleState.player.maxMp,
            atk: battleState.player.atk,
            def: battleState.player.def,
            buffs: [...battleState.buffs]
        },
        enemy: {
            name: battleState.enemy.name,
            icon: battleState.enemy.icon,
            hp: battleState.enemyHp,
            maxHp: battleState.enemy.maxHp,
            atk: battleState.enemy.atk,
            def: battleState.enemy.def,
            spd: battleState.enemy.spd,
            isBoss: battleState.enemy.isBoss || false
        },
        cooldowns: { ...battleState.cooldowns },
        log: [...battleState.log.slice(-5)] // Last 5 log entries
    };
}

// ============================================
// COMBAT ACTIONS
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

    battleState.playerHp -= damage;
    battleState.playerHp = Math.max(0, battleState.playerHp);

    let logMsg = '';
    if (critical) {
        logMsg = `${enemy.name} ${attackName} - CRITICAL HIT for ${damage} damage!`;
    } else {
        logMsg = `${enemy.name} ${attackName} for ${damage} damage!`;
    }

    battleState.log.push(logMsg);

    return { damage, critical, attackType };
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

            <!-- Battle Log -->
            <div style="max-height: 80px; overflow-y: auto; padding: 12px 20px; background: linear-gradient(180deg, #0a0a0f, #05050a); border-top: 1px solid #222;">
                <div style="color: #666; font-size: 10px; margin-bottom: 6px; text-transform: uppercase;">Battle Log</div>
                ${state.log.slice(-4).map((msg, i) => `
                    <div style="color: ${i === state.log.slice(-4).length - 1 ? '#ffffff' : '#6b7280'}; font-size: 12px; padding: 3px 0; ${i < state.log.slice(-4).length - 1 ? 'opacity: 0.7;' : ''}">${i === state.log.slice(-4).length - 1 ? '→ ' : ''}${escapeHtml(msg)}</div>
                `).join('')}
            </div>

            <!-- Skills Section -->
            <div style="padding: 20px; background: linear-gradient(180deg, #12121a, #1a1a24);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: 600;">⚔️ Combat Actions</div>
                    <div style="color: #666; font-size: 11px;">Select an action to continue</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                    ${Object.values(COMBAT_SKILLS).map(skill => {
                        const onCooldown = state.cooldowns[skill.id] > 0;
                        const noMp = state.player.mp < skill.mpCost;
                        const levelLocked = skill.requiresLevel && (combatStats?.level || 1) < skill.requiresLevel;
                        const disabled = onCooldown || noMp || levelLocked;
                        const estimatedDmg = getSkillDamage(skill);
                        const skillTypeColor = skill.type === 'attack' ? '#ef4444' : skill.type === 'defense' ? '#3b82f6' : '#22c55e';
                        const skillTypeLabel = skill.type === 'attack' ? 'ATK' : skill.type === 'defense' ? 'DEF' : 'SUP';

                        // Get effect description
                        let effectDesc = '';
                        if (skill.damageMultiplier > 0) {
                            effectDesc = `~${estimatedDmg} DMG`;
                        } else if (skill.effect === 'heal') {
                            effectDesc = `+${skill.healAmount} HP`;
                        } else if (skill.effect === 'defense_buff') {
                            effectDesc = `+${skill.buffAmount} DEF`;
                        } else if (skill.effect === 'attack_buff') {
                            effectDesc = `+${skill.buffAmount} ATK`;
                        } else {
                            effectDesc = 'Support';
                        }

                        return `
                            <button class="skill-btn" data-skill="${skill.id}" ${disabled ? 'disabled' : ''} style="
                                padding: 15px 12px; border-radius: 12px;
                                background: ${disabled ? '#1a1a24' : `linear-gradient(135deg, ${skillTypeColor}15, #12121a)`};
                                border: 2px solid ${disabled ? '#333' : `${skillTypeColor}60`};
                                color: ${disabled ? '#555' : '#fff'};
                                cursor: ${disabled ? 'not-allowed' : 'pointer'};
                                transition: all 0.2s;
                                position: relative;
                                opacity: ${disabled ? '0.5' : '1'};
                                text-align: center;
                            " ${!disabled ? `onmouseover="this.style.borderColor='${skillTypeColor}'; this.style.boxShadow='0 0 20px ${skillTypeColor}30'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='${skillTypeColor}60'; this.style.boxShadow='none'; this.style.transform='translateY(0)';"` : ''}>
                                <div style="position: absolute; top: 6px; left: 6px; font-size: 9px; color: ${skillTypeColor}; background: ${skillTypeColor}20; padding: 2px 5px; border-radius: 3px;">${skillTypeLabel}</div>
                                <div style="font-size: 24px; margin-bottom: 6px;">${skill.icon}</div>
                                <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: ${disabled ? '#555' : '#fff'};">${skill.name}</div>
                                <div style="font-size: 10px; color: ${disabled ? '#444' : skillTypeColor}; font-weight: 600;">${effectDesc}</div>
                                <div style="display: flex; justify-content: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                                    ${skill.mpCost > 0 ? `<span style="font-size: 9px; color: ${disabled ? '#444' : '#3b82f6'}; background: ${disabled ? '#1a1a24' : '#3b82f620'}; padding: 2px 5px; border-radius: 4px;">⚡${skill.mpCost}</span>` : '<span style="font-size: 9px; color: #22c55e; background: #22c55e20; padding: 2px 5px; border-radius: 4px;">FREE</span>'}
                                    ${skill.cooldown > 0 ? `<span style="font-size: 9px; color: ${disabled ? '#444' : '#666'}; background: ${disabled ? '#1a1a24' : '#33333380'}; padding: 2px 5px; border-radius: 4px;">CD${skill.cooldown}</span>` : ''}
                                    ${skill.tokenCost ? `<span style="font-size: 9px; color: ${disabled ? '#444' : '#f97316'}; background: ${disabled ? '#1a1a24' : '#f9731620'}; padding: 2px 5px; border-radius: 4px;">🪙${skill.tokenCost}</span>` : ''}
                                </div>
                                ${onCooldown ? `<div style="position: absolute; top: 6px; right: 6px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${state.cooldowns[skill.id]}T</div>` : ''}
                                ${levelLocked ? `<div style="position: absolute; top: 6px; right: 6px; background: linear-gradient(135deg, #666, #444); color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 4px;">Lv${skill.requiresLevel}</div>` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    // Skill button handlers
    container.querySelectorAll('.skill-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const skillId = btn.dataset.skill;
            const result = useSkill(skillId);

            if (result.success) {
                renderBattleUI(container);

                if (result.victory) {
                    showBattleNotification(`Victory! +${result.rewards.xp} XP, +${result.rewards.tokens} tokens`, 'success');
                } else if (result.defeat) {
                    showBattleNotification('Defeated! Try again when stronger.', 'error');
                }
            } else {
                showBattleNotification(result.message, 'error');
            }
        });
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

        // Encounters
        randomEncounter,
        getRandomEnemy,

        // Combat stats
        calculateCombatStats,

        // UI
        renderPanel: renderBattleUI,

        // Constants
        ENEMIES: ENEMY_TYPES,
        SKILLS: COMBAT_SKILLS,
        getFib: getBattleFib
    };
}
