/**
 * Pump Arena RPG - Faction Skills System
 * Combat and faction-specific abilities that unlock through quests and faction progression
 */

'use strict';

// ============================================
// SKILL TYPES (Combat Extended)
// ============================================

const FACTION_SKILL_TYPES = {
    PASSIVE: 'passive',
    ACTIVE: 'active',
    COMBAT: 'combat',      // Combat-only abilities
    ULTIMATE: 'ultimate',
    SIGNATURE: 'signature' // Faction-exclusive ultimate
};

// Fibonacci for stat scaling
const getFactionFib = (n) => {
    const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    return fib[Math.min(n, fib.length - 1)];
};

// ============================================
// FACTION SKILL TREES
// ============================================

const FACTION_SKILLS = {
    // ==========================================
    // ASDF COLLECTIVE - Fire & Burn Theme
    // ==========================================
    asdf: {
        name: 'Flame Mastery',
        icon: '🔥',
        color: '#ef4444',
        description: 'Harness the purifying flames. Burn away weakness.',
        faction: 'asdf',
        branches: {
            inferno: {
                name: 'Inferno Path',
                icon: '🌋',
                skills: [
                    {
                        id: 'asdf_ember_touch',
                        name: 'Ember Touch',
                        icon: '✨',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Your attacks leave lingering burn damage.',
                        effect: { stat: 'str', bonus: getFactionFib(5), burnDamage: 0.05 },
                        requires: []
                    },
                    {
                        id: 'asdf_flame_burst',
                        name: 'Flame Burst',
                        icon: '💥',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Deal fire damage to all adjacent enemies.',
                        effect: { damage: getFactionFib(7), aoe: true, range: 1 },
                        energyCost: 3,
                        cooldown: 2,
                        requires: ['asdf_ember_touch']
                    },
                    {
                        id: 'asdf_phoenix_aura',
                        name: 'Phoenix Aura',
                        icon: '🔆',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Regenerate HP when you deal burn damage.',
                        effect: { hpRegen: getFactionFib(5), burnHeal: 0.21 },
                        requires: ['asdf_flame_burst']
                    }
                ]
            },
            sacrifice: {
                name: 'Sacrifice Path',
                icon: '⚰️',
                skills: [
                    {
                        id: 'asdf_burning_sacrifice',
                        name: 'Burning Sacrifice',
                        icon: '🩸',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Sacrifice HP to boost all allies attack.',
                        effect: { hpCost: 0.1, allyAtkBoost: 0.21, duration: 3 },
                        cooldown: 300,
                        requires: []
                    },
                    {
                        id: 'asdf_token_pyre',
                        name: 'Token Pyre',
                        icon: '🪙',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Burn tokens for massive damage boost.',
                        effect: { tokenCost: 100, damageBoost: 0.55, duration: 5 },
                        cooldown: 600,
                        requires: ['asdf_burning_sacrifice']
                    },
                    {
                        id: 'asdf_collective_burn',
                        name: 'Collective Burn',
                        icon: '🔥',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Burn rewards increase based on party size.',
                        effect: { burnRewardBonus: 0.13, partyMultiplier: true },
                        requires: ['asdf_token_pyre']
                    }
                ]
            },
            rebirth: {
                name: 'Rebirth Path',
                icon: '🦅',
                skills: [
                    {
                        id: 'asdf_rising_flames',
                        name: 'Rising Flames',
                        icon: '📈',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Damage increases as HP decreases.',
                        effect: { lowHpDamageBoost: 0.34 },
                        requires: []
                    },
                    {
                        id: 'asdf_from_ashes',
                        name: 'From the Ashes',
                        icon: '💫',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Once per battle, revive with 21% HP when killed.',
                        effect: { revive: true, reviveHp: 0.21 },
                        energyCost: 0,
                        cooldown: 0,
                        requires: ['asdf_rising_flames']
                    },
                    {
                        id: 'asdf_eternal_flame',
                        name: 'Eternal Flame',
                        icon: '🌟',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Cannot be one-shot. Fatal damage leaves you at 1 HP.',
                        effect: { deathProtection: true, minHp: 1 },
                        requires: ['asdf_from_ashes']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'asdf_conflagration',
                        name: 'The Great Conflagration',
                        icon: '☀️',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Burn everything. Deal massive damage to all enemies and heal all allies.',
                        effect: {
                            allEnemyDamage: getFactionFib(10),
                            allAllyHeal: getFactionFib(9),
                            burnAll: true,
                            burnDuration: 5
                        },
                        energyCost: 8,
                        cooldown: 10,
                        requires: ['asdf_phoenix_aura', 'asdf_collective_burn', 'asdf_eternal_flame']
                    }
                ]
            }
        }
    },

    // ==========================================
    // SAFEYIELD DAO - Defense & Protection Theme
    // ==========================================
    safeyield: {
        name: 'Guardian Mastery',
        icon: '🛡️',
        color: '#3b82f6',
        description: 'Protect what matters. Security through preparation.',
        faction: 'safeyield',
        branches: {
            fortification: {
                name: 'Fortification',
                icon: '🏰',
                skills: [
                    {
                        id: 'sy_iron_guard',
                        name: 'Iron Guard',
                        icon: '🛡️',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Permanent defense boost.',
                        effect: { stat: 'def', bonus: getFactionFib(6) },
                        requires: []
                    },
                    {
                        id: 'sy_damage_reduction',
                        name: 'Damage Reduction',
                        icon: '🔰',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Reduce all incoming damage by 13%.',
                        effect: { damageReduction: 0.13 },
                        requires: ['sy_iron_guard']
                    },
                    {
                        id: 'sy_unbreakable',
                        name: 'Unbreakable',
                        icon: '💎',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Become immune to damage for 2 turns.',
                        effect: { invincible: true, duration: 2 },
                        energyCost: 5,
                        cooldown: 5,
                        requires: ['sy_damage_reduction']
                    }
                ]
            },
            audit: {
                name: 'Audit Protocol',
                icon: '🔍',
                skills: [
                    {
                        id: 'sy_vulnerability_scan',
                        name: 'Vulnerability Scan',
                        icon: '👁️',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 1,
                        cost: 1,
                        description: 'Reveal enemy weaknesses, increasing damage dealt.',
                        effect: { debuff: 'vulnerable', damageTaken: 0.21, duration: 3 },
                        energyCost: 2,
                        cooldown: 3,
                        requires: []
                    },
                    {
                        id: 'sy_exploit_patch',
                        name: 'Exploit Patch',
                        icon: '🔧',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Remove all debuffs from yourself and allies.',
                        effect: { cleanse: 'all', target: 'allies' },
                        cooldown: 180,
                        requires: ['sy_vulnerability_scan']
                    },
                    {
                        id: 'sy_security_audit',
                        name: 'Security Audit',
                        icon: '📋',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Immune to critical hits. Reduce damage from debuffs.',
                        effect: { critImmune: true, debuffReduction: 0.34 },
                        requires: ['sy_exploit_patch']
                    }
                ]
            },
            vault: {
                name: 'Vault Protocol',
                icon: '🏦',
                skills: [
                    {
                        id: 'sy_token_shield',
                        name: 'Token Shield',
                        icon: '💰',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Prevent token loss from negative events.',
                        effect: { tokenProtection: 0.34 },
                        requires: []
                    },
                    {
                        id: 'sy_yield_generation',
                        name: 'Yield Generation',
                        icon: '📈',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Earn bonus tokens passively each battle.',
                        effect: { tokenPerBattle: getFactionFib(5) },
                        requires: ['sy_token_shield']
                    },
                    {
                        id: 'sy_insurance_protocol',
                        name: 'Insurance Protocol',
                        icon: '📜',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 3,
                        cost: 3,
                        description: 'On defeat, recover 50% of tokens spent in battle.',
                        effect: { tokenRecovery: 0.5, onDefeat: true },
                        cooldown: 900,
                        requires: ['sy_yield_generation']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'sy_ultimate_vault',
                        name: 'Ultimate Vault Lock',
                        icon: '🔐',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Lock the entire party in a protective vault. Complete immunity for 3 turns, then heal all.',
                        effect: {
                            partyInvincible: true,
                            duration: 3,
                            healAfter: getFactionFib(9)
                        },
                        energyCost: 10,
                        cooldown: 15,
                        requires: ['sy_unbreakable', 'sy_security_audit', 'sy_insurance_protocol']
                    }
                ]
            }
        }
    },

    // ==========================================
    // PIXEL RAIDERS - Speed & Combo Theme
    // ==========================================
    pixel_raiders: {
        name: 'Raider Mastery',
        icon: '🎮',
        color: '#a855f7',
        description: 'Play to win. Speed and precision dominate.',
        faction: 'pixel_raiders',
        branches: {
            speedrun: {
                name: 'Speedrun',
                icon: '⚡',
                skills: [
                    {
                        id: 'pr_quick_input',
                        name: 'Quick Input',
                        icon: '🕹️',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Increase action speed by 21%.',
                        effect: { stat: 'spd', bonus: getFactionFib(5), actionSpeed: 0.21 },
                        requires: []
                    },
                    {
                        id: 'pr_frame_perfect',
                        name: 'Frame Perfect',
                        icon: '🎯',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Critical hits deal 50% more damage.',
                        effect: { critDamage: 0.5 },
                        requires: ['pr_quick_input']
                    },
                    {
                        id: 'pr_any_percent',
                        name: 'Any% Run',
                        icon: '🏃',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Skip directly to attacking the boss. Ignore minions for 3 turns.',
                        effect: { ignoreMinions: true, duration: 3, bossTarget: true },
                        energyCost: 4,
                        cooldown: 6,
                        requires: ['pr_frame_perfect']
                    }
                ]
            },
            combo: {
                name: 'Combo Master',
                icon: '🔗',
                skills: [
                    {
                        id: 'pr_combo_starter',
                        name: 'Combo Starter',
                        icon: '1️⃣',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'First hit builds combo meter.',
                        effect: { comboStart: true, comboGain: 1 },
                        requires: []
                    },
                    {
                        id: 'pr_combo_extender',
                        name: 'Combo Extender',
                        icon: '🔄',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Chain attacks deal increasing damage up to 5x.',
                        effect: { comboDamage: 0.21, maxCombo: 5, chainable: true },
                        energyCost: 1,
                        cooldown: 0,
                        requires: ['pr_combo_starter']
                    },
                    {
                        id: 'pr_ultra_combo',
                        name: 'Ultra Combo',
                        icon: '💥',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'At max combo, unleash devastating finisher.',
                        effect: { finisherDamage: getFactionFib(9), requiresMaxCombo: true },
                        energyCost: 5,
                        cooldown: 4,
                        requires: ['pr_combo_extender']
                    }
                ]
            },
            loot: {
                name: 'Loot Goblin',
                icon: '💎',
                skills: [
                    {
                        id: 'pr_rare_drop',
                        name: 'Rare Drop Hunter',
                        icon: '🎁',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Increase rare item drop chance by 21%.',
                        effect: { rareDropBonus: 0.21, stat: 'lck', bonus: getFactionFib(4) },
                        requires: []
                    },
                    {
                        id: 'pr_double_loot',
                        name: 'Double Loot',
                        icon: '2️⃣',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Next battle drops double rewards.',
                        effect: { lootMultiplier: 2, nextBattle: true },
                        cooldown: 600,
                        requires: ['pr_rare_drop']
                    },
                    {
                        id: 'pr_legendary_hunter',
                        name: 'Legendary Hunter',
                        icon: '👑',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Can find legendary items. Legendary drop +5%.',
                        effect: { legendaryDropBonus: 0.05, canFindLegendary: true },
                        requires: ['pr_double_loot']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'pr_gg_ez',
                        name: 'GG EZ',
                        icon: '🏆',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Execute enemies below 21% HP instantly. Works on bosses at 13%.',
                        effect: {
                            executeThreshold: 0.21,
                            bossExecuteThreshold: 0.13,
                            instantKill: true
                        },
                        energyCost: 6,
                        cooldown: 8,
                        requires: ['pr_any_percent', 'pr_ultra_combo', 'pr_legendary_hunter']
                    }
                ]
            }
        }
    },

    // ==========================================
    // BASED COLLECTIVE - Truth & Debuff Theme
    // ==========================================
    based_collective: {
        name: 'Truth Mastery',
        icon: '💎',
        color: '#22c55e',
        description: 'Cut through the noise. Authenticity conquers all.',
        faction: 'based_collective',
        branches: {
            expose: {
                name: 'Expose',
                icon: '🔦',
                skills: [
                    {
                        id: 'bc_call_out',
                        name: 'Call Out',
                        icon: '📢',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 1,
                        cost: 1,
                        description: 'Expose enemy weakness, reducing their defense.',
                        effect: { debuff: 'exposed', defReduction: 0.21, duration: 3 },
                        energyCost: 2,
                        cooldown: 2,
                        requires: []
                    },
                    {
                        id: 'bc_fact_check',
                        name: 'Fact Check',
                        icon: '✅',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Cancel enemy buffs and deal bonus damage.',
                        effect: { dispel: 'buffs', bonusDamage: getFactionFib(6) },
                        energyCost: 3,
                        cooldown: 3,
                        requires: ['bc_call_out']
                    },
                    {
                        id: 'bc_rug_reveal',
                        name: 'Rug Reveal',
                        icon: '🚨',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'See through enemy tricks. Immune to stealth and illusions.',
                        effect: { trueVision: true, stealthImmune: true },
                        requires: ['bc_fact_check']
                    }
                ]
            },
            authenticity: {
                name: 'Authenticity',
                icon: '💯',
                skills: [
                    {
                        id: 'bc_no_cap',
                        name: 'No Cap',
                        icon: '🎓',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Your words hit harder. Increase all damage.',
                        effect: { stat: 'str', bonus: getFactionFib(5), damageBoost: 0.13 },
                        requires: []
                    },
                    {
                        id: 'bc_based_take',
                        name: 'Based Take',
                        icon: '💬',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Inspire allies with truth. Boost party morale.',
                        effect: { partyBuff: 'inspired', atkBoost: 0.21, defBoost: 0.13, duration: 4 },
                        cooldown: 300,
                        requires: ['bc_no_cap']
                    },
                    {
                        id: 'bc_unbothered',
                        name: 'Unbothered',
                        icon: '😎',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Immune to taunt, fear, and confusion effects.',
                        effect: { ccImmune: ['taunt', 'fear', 'confusion'] },
                        requires: ['bc_based_take']
                    }
                ]
            },
            clout: {
                name: 'Clout',
                icon: '📈',
                skills: [
                    {
                        id: 'bc_reputation_armor',
                        name: 'Reputation Armor',
                        icon: '🛡️',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Defense scales with your reputation.',
                        effect: { defScalesWithRep: true, repDefBonus: 0.001 },
                        requires: []
                    },
                    {
                        id: 'bc_viral_moment',
                        name: 'Viral Moment',
                        icon: '🌟',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Critical hit chance increases dramatically for one battle.',
                        effect: { critChance: 0.34, duration: 'battle' },
                        cooldown: 480,
                        requires: ['bc_reputation_armor']
                    },
                    {
                        id: 'bc_main_character',
                        name: 'Main Character Energy',
                        icon: '👑',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Enemies prioritize you but you take reduced damage.',
                        effect: { taunt: true, damageReduction: 0.21 },
                        requires: ['bc_viral_moment']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'bc_touch_grass',
                        name: 'Touch Grass',
                        icon: '🌱',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Force all enemies to confront reality. Massive damage + silence.',
                        effect: {
                            allEnemyDamage: getFactionFib(9),
                            silence: true,
                            silenceDuration: 3,
                            removesAllBuffs: true
                        },
                        energyCost: 7,
                        cooldown: 10,
                        requires: ['bc_rug_reveal', 'bc_unbothered', 'bc_main_character']
                    }
                ]
            }
        }
    },

    // ==========================================
    // NODEFORGE - Optimization & Tech Theme
    // ==========================================
    nodeforge: {
        name: 'Code Mastery',
        icon: '💻',
        color: '#06b6d4',
        description: 'Optimize without compromise. Code is power.',
        faction: 'nodeforge',
        branches: {
            optimization: {
                name: 'Optimization',
                icon: '⚙️',
                skills: [
                    {
                        id: 'nf_gas_efficient',
                        name: 'Gas Efficient',
                        icon: '⛽',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'All abilities cost 1 less energy (minimum 1).',
                        effect: { energyCostReduction: 1 },
                        requires: []
                    },
                    {
                        id: 'nf_overclock',
                        name: 'Overclock',
                        icon: '🔥',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Double action speed but take 13% more damage.',
                        effect: { speedBoost: 2, damageTaken: 0.13, duration: 3 },
                        cooldown: 240,
                        requires: ['nf_gas_efficient']
                    },
                    {
                        id: 'nf_parallel_processing',
                        name: 'Parallel Processing',
                        icon: '🔀',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Execute two actions in one turn.',
                        effect: { doubleAction: true },
                        energyCost: 5,
                        cooldown: 4,
                        requires: ['nf_overclock']
                    }
                ]
            },
            algorithms: {
                name: 'Algorithms',
                icon: '📊',
                skills: [
                    {
                        id: 'nf_pattern_match',
                        name: 'Pattern Match',
                        icon: '🔍',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Learn enemy patterns. Dodge chance increases per turn.',
                        effect: { dodgePerTurn: 0.03, maxDodge: 0.21 },
                        requires: []
                    },
                    {
                        id: 'nf_predictive_model',
                        name: 'Predictive Model',
                        icon: '🎯',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'See enemy next action. Counter attacks deal 34% more damage.',
                        effect: { seeNextAction: true, counterDamage: 0.34 },
                        requires: ['nf_pattern_match']
                    },
                    {
                        id: 'nf_recursive_loop',
                        name: 'Recursive Loop',
                        icon: '🔄',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Trap enemy in a loop. They repeat their last action.',
                        effect: { forceRepeat: true, duration: 2 },
                        energyCost: 4,
                        cooldown: 5,
                        requires: ['nf_predictive_model']
                    }
                ]
            },
            network: {
                name: 'Network',
                icon: '🌐',
                skills: [
                    {
                        id: 'nf_node_sync',
                        name: 'Node Sync',
                        icon: '🔗',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Allies share 8% of their stats with you.',
                        effect: { statShare: 0.08, fromAllies: true },
                        requires: []
                    },
                    {
                        id: 'nf_distributed_compute',
                        name: 'Distributed Compute',
                        icon: '💾',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Split damage among all party members.',
                        effect: { damageShare: true, duration: 3 },
                        cooldown: 300,
                        requires: ['nf_node_sync']
                    },
                    {
                        id: 'nf_mesh_network',
                        name: 'Mesh Network',
                        icon: '🕸️',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'When an ally uses a skill, you gain 1 energy.',
                        effect: { energyOnAllySkill: 1 },
                        requires: ['nf_distributed_compute']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'nf_zero_day',
                        name: 'Zero Day Exploit',
                        icon: '💀',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Bypass all defenses. Deal pure damage ignoring armor and shields.',
                        effect: {
                            pureDamage: getFactionFib(10),
                            ignoreDefense: true,
                            ignoreShield: true,
                            piercing: true
                        },
                        energyCost: 8,
                        cooldown: 12,
                        requires: ['nf_parallel_processing', 'nf_recursive_loop', 'nf_mesh_network']
                    }
                ]
            }
        }
    },

    // ==========================================
    // PUMP LORDS - Aggression & Risk Theme
    // ==========================================
    pump_lords: {
        name: 'Pump Mastery',
        icon: '📈',
        color: '#22c55e',
        description: 'Number go up. Aggression rewarded.',
        faction: 'pump_lords',
        branches: {
            fomo: {
                name: 'FOMO',
                icon: '😰',
                skills: [
                    {
                        id: 'pl_ape_in',
                        name: 'Ape In',
                        icon: '🦍',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 1,
                        cost: 1,
                        description: 'Rush attack with bonus damage but lower accuracy.',
                        effect: { damage: getFactionFib(7), accuracy: 0.7, bonusDamage: 0.34 },
                        energyCost: 2,
                        cooldown: 1,
                        requires: []
                    },
                    {
                        id: 'pl_full_send',
                        name: 'Full Send',
                        icon: '🚀',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'All-in attack. Triple damage but stunned next turn.',
                        effect: { damageMultiplier: 3, selfStun: 1 },
                        energyCost: 4,
                        cooldown: 3,
                        requires: ['pl_ape_in']
                    },
                    {
                        id: 'pl_momentum',
                        name: 'Momentum',
                        icon: '📊',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Each consecutive attack increases damage by 13%.',
                        effect: { stackingDamage: 0.13, maxStacks: 5 },
                        requires: ['pl_full_send']
                    }
                ]
            },
            diamond_hands: {
                name: 'Diamond Hands',
                icon: '💎',
                skills: [
                    {
                        id: 'pl_hodl',
                        name: 'HODL',
                        icon: '✊',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Gain damage bonus the longer you stay in battle.',
                        effect: { damagePerTurn: 0.05, maxBonus: 0.34 },
                        requires: []
                    },
                    {
                        id: 'pl_never_sell',
                        name: 'Never Sell',
                        icon: '🔒',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Cannot flee from battle. Gain 21% damage.',
                        effect: { noFlee: true, damageBoost: 0.21 },
                        requires: ['pl_hodl']
                    },
                    {
                        id: 'pl_moon_shot',
                        name: 'Moon Shot',
                        icon: '🌙',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Bet big. 50% chance to deal 5x damage or miss entirely.',
                        effect: { gambleDamage: 5, hitChance: 0.5 },
                        energyCost: 3,
                        cooldown: 2,
                        requires: ['pl_never_sell']
                    }
                ]
            },
            hype: {
                name: 'Hype Machine',
                icon: '📣',
                skills: [
                    {
                        id: 'pl_shill',
                        name: 'Shill',
                        icon: '📢',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Boost ally attack by 34% for 2 turns.',
                        effect: { allyBuff: 'hyped', atkBoost: 0.34, duration: 2 },
                        cooldown: 180,
                        requires: []
                    },
                    {
                        id: 'pl_pump_it',
                        name: 'Pump It Up',
                        icon: '💪',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Increase all party damage by 21% this turn.',
                        effect: { partyDamageBoost: 0.21, duration: 1 },
                        energyCost: 3,
                        cooldown: 3,
                        requires: ['pl_shill']
                    },
                    {
                        id: 'pl_to_the_moon',
                        name: 'To The Moon',
                        icon: '🚀',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'When an ally kills an enemy, gain +55% damage for 2 turns.',
                        effect: { onAllyKill: true, damageBoost: 0.55, duration: 2 },
                        requires: ['pl_pump_it']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'pl_number_go_up',
                        name: 'Number Go Up',
                        icon: '📈',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Endless pump. Each kill in this battle permanently increases your stats.',
                        effect: {
                            statGainPerKill: getFactionFib(3),
                            allStats: true,
                            permanent: false, // Battle only
                            stacks: 'infinite'
                        },
                        energyCost: 6,
                        cooldown: 0, // Toggle
                        requires: ['pl_momentum', 'pl_moon_shot', 'pl_to_the_moon']
                    }
                ]
            }
        }
    },

    // ==========================================
    // BEAR CLAN - Defense & Counter Theme
    // ==========================================
    bear_clan: {
        name: 'Bear Mastery',
        icon: '🐻',
        color: '#dc2626',
        description: 'Survive the winter. Profit from pain.',
        faction: 'bear_clan',
        branches: {
            hibernation: {
                name: 'Hibernation',
                icon: '😴',
                skills: [
                    {
                        id: 'br_thick_skin',
                        name: 'Thick Skin',
                        icon: '🛡️',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Reduce all physical damage taken by 13%.',
                        effect: { stat: 'def', bonus: getFactionFib(5), physicalReduction: 0.13 },
                        requires: []
                    },
                    {
                        id: 'br_hibernate',
                        name: 'Hibernate',
                        icon: '💤',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Skip turn to heal 34% HP and remove debuffs.',
                        effect: { selfHeal: 0.34, cleanse: true },
                        energyCost: 3,
                        cooldown: 4,
                        requires: ['br_thick_skin']
                    },
                    {
                        id: 'br_endurance',
                        name: 'Endurance',
                        icon: '❤️',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Maximum HP increased by 34%.',
                        effect: { maxHpBoost: 0.34 },
                        requires: ['br_hibernate']
                    }
                ]
            },
            short: {
                name: 'Short Selling',
                icon: '📉',
                skills: [
                    {
                        id: 'br_short_position',
                        name: 'Short Position',
                        icon: '📊',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Gain tokens when enemies deal damage to you.',
                        effect: { tokensOnDamageTaken: getFactionFib(3) },
                        requires: []
                    },
                    {
                        id: 'br_liquidation',
                        name: 'Liquidation',
                        icon: '💸',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Deal bonus damage based on enemy missing HP.',
                        effect: { executeDamage: 0.5, basedOnMissingHp: true },
                        energyCost: 3,
                        cooldown: 2,
                        requires: ['br_short_position']
                    },
                    {
                        id: 'br_crash_profit',
                        name: 'Crash Profit',
                        icon: '💰',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'When enemies die, gain bonus tokens and XP.',
                        effect: { bonusOnKill: true, tokenBonus: getFactionFib(6), xpBonus: getFactionFib(5) },
                        requires: ['br_liquidation']
                    }
                ]
            },
            counter: {
                name: 'Counter Attack',
                icon: '⚔️',
                skills: [
                    {
                        id: 'br_thorns',
                        name: 'Thorns',
                        icon: '🌹',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Reflect 13% of damage taken back to attacker.',
                        effect: { damageReflect: 0.13 },
                        requires: []
                    },
                    {
                        id: 'br_revenge',
                        name: 'Revenge',
                        icon: '😤',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'After being hit, next attack deals 34% more damage.',
                        effect: { revengeBoost: 0.34, afterHit: true },
                        requires: ['br_thorns']
                    },
                    {
                        id: 'br_bear_trap',
                        name: 'Bear Trap',
                        icon: '🪤',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Set a trap. Next enemy to attack you is stunned and takes damage.',
                        effect: { trap: true, stunDuration: 2, trapDamage: getFactionFib(7) },
                        energyCost: 4,
                        cooldown: 5,
                        requires: ['br_revenge']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'br_nuclear_winter',
                        name: 'Nuclear Winter',
                        icon: '❄️',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Crash the market. All enemies lose 21% current HP and are slowed.',
                        effect: {
                            percentHpDamage: 0.21,
                            slow: 0.5,
                            slowDuration: 3,
                            freezeChance: 0.21
                        },
                        energyCost: 7,
                        cooldown: 10,
                        requires: ['br_endurance', 'br_crash_profit', 'br_bear_trap']
                    }
                ]
            }
        }
    },

    // ==========================================
    // BUILDERS GUILD - Construction & Support Theme
    // ==========================================
    builders_guild: {
        name: 'Builder Mastery',
        icon: '🔨',
        color: '#f59e0b',
        description: 'Build in public. Create lasting value.',
        faction: 'builders_guild',
        branches: {
            construction: {
                name: 'Construction',
                icon: '🏗️',
                skills: [
                    {
                        id: 'bg_foundation',
                        name: 'Strong Foundation',
                        icon: '🧱',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Increase all base stats by 5%.',
                        effect: { allStatsBoost: 0.05 },
                        requires: []
                    },
                    {
                        id: 'bg_scaffold',
                        name: 'Scaffolding',
                        icon: '🏢',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Build temporary structures that increase party defense.',
                        effect: { partyDefBuff: getFactionFib(6), duration: 4 },
                        energyCost: 3,
                        cooldown: 4,
                        requires: ['bg_foundation']
                    },
                    {
                        id: 'bg_fortress',
                        name: 'Fortress',
                        icon: '🏰',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Build a fortress. Party takes 34% less damage for 3 turns.',
                        effect: { partyDamageReduction: 0.34, duration: 3 },
                        energyCost: 5,
                        cooldown: 6,
                        requires: ['bg_scaffold']
                    }
                ]
            },
            tools: {
                name: 'Tools',
                icon: '🔧',
                skills: [
                    {
                        id: 'bg_repair',
                        name: 'Repair',
                        icon: '🔩',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 1,
                        cost: 1,
                        description: 'Heal an ally for moderate amount.',
                        effect: { heal: getFactionFib(7), target: 'ally' },
                        energyCost: 2,
                        cooldown: 2,
                        requires: []
                    },
                    {
                        id: 'bg_upgrade',
                        name: 'Upgrade',
                        icon: '⬆️',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 2,
                        cost: 2,
                        description: 'Upgrade ally equipment temporarily. Boost their damage.',
                        effect: { allyDamageBoost: 0.34, duration: 3 },
                        energyCost: 3,
                        cooldown: 3,
                        requires: ['bg_repair']
                    },
                    {
                        id: 'bg_overhaul',
                        name: 'Overhaul',
                        icon: '🛠️',
                        type: FACTION_SKILL_TYPES.ACTIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Fully restore an ally HP and remove all debuffs.',
                        effect: { fullHeal: true, cleanse: 'all', target: 'ally' },
                        cooldown: 600,
                        requires: ['bg_upgrade']
                    }
                ]
            },
            innovation: {
                name: 'Innovation',
                icon: '💡',
                skills: [
                    {
                        id: 'bg_prototype',
                        name: 'Prototype',
                        icon: '🔬',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Skills have 13% chance to cost no energy.',
                        effect: { freeSkillChance: 0.13 },
                        requires: []
                    },
                    {
                        id: 'bg_iteration',
                        name: 'Rapid Iteration',
                        icon: '🔄',
                        type: FACTION_SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Reduce all cooldowns by 21%.',
                        effect: { cooldownReduction: 0.21 },
                        requires: ['bg_prototype']
                    },
                    {
                        id: 'bg_breakthrough',
                        name: 'Breakthrough',
                        icon: '💥',
                        type: FACTION_SKILL_TYPES.COMBAT,
                        tier: 3,
                        cost: 3,
                        description: 'Reset all ally skill cooldowns.',
                        effect: { resetCooldowns: 'allies' },
                        energyCost: 6,
                        cooldown: 10,
                        requires: ['bg_iteration']
                    }
                ]
            },
            signature: {
                name: 'Signature',
                icon: '⭐',
                skills: [
                    {
                        id: 'bg_masterpiece',
                        name: 'Masterpiece',
                        icon: '🏛️',
                        type: FACTION_SKILL_TYPES.SIGNATURE,
                        tier: 4,
                        cost: 5,
                        description: 'Create your masterpiece. All allies gain massive buffs for the rest of battle.',
                        effect: {
                            partyAllStats: getFactionFib(8),
                            partyHeal: getFactionFib(9),
                            partyShield: getFactionFib(8),
                            duration: 'battle'
                        },
                        energyCost: 10,
                        cooldown: 'once', // Once per battle
                        requires: ['bg_fortress', 'bg_overhaul', 'bg_breakthrough']
                    }
                ]
            }
        }
    }
};

// ============================================
// FACTION SKILLS MANAGER
// ============================================

const PumpArenaFactionSkills = {
    SKILL_TYPES: FACTION_SKILL_TYPES,
    SKILLS: FACTION_SKILLS,

    // Get skill tree for a faction
    getTree(faction) {
        return FACTION_SKILLS[faction] || null;
    },

    // Get all skills for a faction (flat list)
    getAllSkills(faction) {
        const tree = this.getTree(faction);
        if (!tree) return [];

        const skills = [];
        Object.values(tree.branches).forEach(branch => {
            skills.push(...branch.skills);
        });
        return skills;
    },

    // Get specific skill
    getSkill(faction, skillId) {
        const skills = this.getAllSkills(faction);
        return skills.find(s => s.id === skillId) || null;
    },

    // Check if skill can be unlocked
    canUnlockSkill(faction, skillId) {
        const state = window.PumpArenaState?.get?.();
        if (!state) return { can: false, reason: 'No game state' };

        const skill = this.getSkill(faction, skillId);
        if (!skill) return { can: false, reason: 'Skill not found' };

        // Check faction membership
        const playerFaction = state.faction?.current;
        if (playerFaction !== faction) {
            return { can: false, reason: `Must be in ${faction} faction` };
        }

        // Check if already unlocked
        const unlockedSkills = state.factionSkills || [];
        if (unlockedSkills.includes(skillId)) {
            return { can: false, reason: 'Already unlocked' };
        }

        // Check faction standing (tier * 20 standing required)
        const requiredStanding = skill.tier * 20;
        const currentStanding = state.faction?.standing?.[faction] || 0;
        if (currentStanding < requiredStanding) {
            return { can: false, reason: `Need ${requiredStanding} faction standing` };
        }

        // Check prerequisites
        for (const reqId of skill.requires) {
            if (!unlockedSkills.includes(reqId)) {
                const reqSkill = this.getSkill(faction, reqId);
                const reqName = reqSkill ? reqSkill.name : reqId;
                return { can: false, reason: `Requires: ${reqName}` };
            }
        }

        return { can: true };
    },

    // Unlock a faction skill
    unlockSkill(faction, skillId) {
        const canUnlock = this.canUnlockSkill(faction, skillId);
        if (!canUnlock.can) {
            return { success: false, message: canUnlock.reason };
        }

        const state = window.PumpArenaState?.get?.();
        if (!state.factionSkills) {
            state.factionSkills = [];
        }

        state.factionSkills.push(skillId);

        const skill = this.getSkill(faction, skillId);

        // Apply passive effects
        if (skill && skill.type === FACTION_SKILL_TYPES.PASSIVE) {
            this.applyPassiveEffect(skill);
        }

        window.PumpArenaState?.save?.();

        return { success: true, message: `Unlocked: ${skill.name}` };
    },

    // Apply passive effect
    applyPassiveEffect(skill) {
        const state = window.PumpArenaState?.get?.();
        if (!state || !skill.effect) return;

        const effect = skill.effect;

        // Apply stat bonuses
        if (effect.stat && effect.bonus) {
            state.stats[effect.stat] = (state.stats[effect.stat] || 0) + effect.bonus;
        }

        window.PumpArenaState?.save?.();
    },

    // Check if skill is unlocked
    isSkillUnlocked(skillId) {
        const state = window.PumpArenaState?.get?.();
        if (!state) return false;
        return (state.factionSkills || []).includes(skillId);
    },

    // Get combat abilities for battle
    getCombatAbilities(faction) {
        const state = window.PumpArenaState?.get?.();
        if (!state) return [];

        const unlockedSkills = state.factionSkills || [];
        const abilities = [];

        for (const skillId of unlockedSkills) {
            const skill = this.getSkill(faction, skillId);
            if (skill && (skill.type === FACTION_SKILL_TYPES.COMBAT ||
                         skill.type === FACTION_SKILL_TYPES.SIGNATURE)) {
                abilities.push({
                    ...skill,
                    isOnCooldown: this.isOnCooldown(skillId),
                    cooldownRemaining: this.getCooldownRemaining(skillId)
                });
            }
        }

        return abilities;
    },

    // Get all passive effects
    getPassiveEffects(faction) {
        const state = window.PumpArenaState?.get?.();
        if (!state) return {};

        const unlockedSkills = state.factionSkills || [];
        const effects = {};

        for (const skillId of unlockedSkills) {
            const skill = this.getSkill(faction, skillId);
            if (skill && skill.type === FACTION_SKILL_TYPES.PASSIVE) {
                Object.entries(skill.effect).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        effects[key] = (effects[key] || 0) + value;
                    } else if (typeof value === 'boolean') {
                        effects[key] = effects[key] || value;
                    }
                });
            }
        }

        return effects;
    },

    // Cooldown management
    isOnCooldown(skillId) {
        const state = window.PumpArenaState?.get?.();
        if (!state || !state.factionSkillCooldowns) return false;
        const cooldownEnd = state.factionSkillCooldowns[skillId];
        return cooldownEnd && Date.now() < cooldownEnd;
    },

    getCooldownRemaining(skillId) {
        const state = window.PumpArenaState?.get?.();
        if (!state || !state.factionSkillCooldowns) return 0;
        const cooldownEnd = state.factionSkillCooldowns[skillId];
        if (!cooldownEnd) return 0;
        return Math.max(0, cooldownEnd - Date.now());
    },

    // Use a combat ability
    useCombatAbility(faction, skillId, battleContext) {
        const skill = this.getSkill(faction, skillId);
        if (!skill) return { success: false, message: 'Skill not found' };
        if (!this.isSkillUnlocked(skillId)) return { success: false, message: 'Not unlocked' };
        if (this.isOnCooldown(skillId)) {
            return { success: false, message: 'On cooldown' };
        }

        // Check energy cost
        if (skill.energyCost && battleContext) {
            const currentEnergy = battleContext.energy || 0;
            if (currentEnergy < skill.energyCost) {
                return { success: false, message: 'Not enough energy' };
            }
        }

        // Set cooldown
        const state = window.PumpArenaState?.get?.();
        if (state && skill.cooldown && skill.cooldown !== 'once') {
            if (!state.factionSkillCooldowns) state.factionSkillCooldowns = {};
            // Combat cooldown is in turns, convert to ms for tracking
            state.factionSkillCooldowns[skillId] = Date.now() + (skill.cooldown * 60000);
            window.PumpArenaState?.save?.();
        }

        return {
            success: true,
            message: `${skill.name} activated!`,
            effect: skill.effect,
            energyCost: skill.energyCost || 0
        };
    },

    // Get available skill points (based on faction standing)
    getAvailableSkillPoints(faction) {
        const state = window.PumpArenaState?.get?.();
        if (!state) return 0;

        const standing = state.faction?.standing?.[faction] || 0;
        const totalPoints = Math.floor(standing / 20); // 1 point per 20 standing
        const usedPoints = this.getUsedSkillPoints(faction);
        return Math.max(0, totalPoints - usedPoints);
    },

    getUsedSkillPoints(faction) {
        const state = window.PumpArenaState?.get?.();
        if (!state) return 0;

        const unlockedSkills = state.factionSkills || [];
        let used = 0;

        for (const skillId of unlockedSkills) {
            const skill = this.getSkill(faction, skillId);
            if (skill) used += skill.cost;
        }

        return used;
    }
};

// Global exports
if (typeof window !== 'undefined') {
    window.PumpArenaFactionSkills = PumpArenaFactionSkills;
}
