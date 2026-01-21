/**
 * Pump Arena RPG - Faction System
 * Competitive factions with relationships, recruitment, and story gates
 *
 * PHILOSOPHY: ASDF Integration
 * - 8 factions with distinct philosophies
 * - Fibonacci-based progression and rewards
 * - ASDF Collective always recruits first at level 7+
 * - Story gates control faction transitions
 *
 * Version: 1.0.0
 */

'use strict';

// ============================================
// FIBONACCI HELPER (ASDF Philosophy)
// ============================================

const FACTION_FIB = Object.freeze([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610]);

function getFactionFib(n) {
    if (n < 0) return 0;
    if (n < FACTION_FIB.length) return FACTION_FIB[n];
    return FACTION_FIB[FACTION_FIB.length - 1];
}

// ============================================
// FACTION DEFINITIONS
// ============================================

const FACTIONS = {
    // ========== ELITE FACTIONS (Requires story gate) ==========

    asdf: {
        id: 'asdf',
        name: 'ASDF Collective',
        shortName: 'ASDF',
        icon: '🔥',
        color: '#f97316',
        bgGradient: 'linear-gradient(135deg, #f97316, #dc2626)',

        description: 'The original builders. Those who understand that true value comes from contribution, not speculation.',
        philosophy: 'Burns benefit everyone',
        motto: 'Build. Burn. Verify.',

        // Recruitment
        isStarter: false,
        minLevelToJoin: 7,
        recruitmentPriority: 1, // ASDF ALWAYS proposes first

        // NPCs
        npcs: ['satoshi_jr', 'vera_burns', 'the_architect'],
        leader: 'the_architect',

        // Relations
        rivals: ['pump_lords', 'bear_clan'],
        allies: ['builders_guild', 'safeyield', 'basedcollective'],
        neutral: ['pixelraiders', 'nodeforge'],

        // Bonuses for members
        memberBonuses: {
            burnEfficiency: 1.21,      // fib[8]/100 + 1 = 21% more efficient burns
            xpMultiplier: 1.13,        // fib[7]/100 + 1 = 13% more XP
            reputationGain: 1.08       // fib[6]/100 + 1 = 8% more reputation
        },

        // Starting rewards when joining
        joiningRewards: {
            tokens: getFactionFib(10) * 10,    // 550 tokens
            reputation: getFactionFib(8) * 5,   // 105 reputation
            xp: getFactionFib(9) * 10,          // 340 XP
            items: ['asdf_flame_badge', 'burner_toolkit']
        },

        // Campaign reference
        campaignId: 'asdf_campaign',
        totalQuests: 21,

        // Lore
        lore: {
            founding: 'Born from the ashes of failed projects, the Collective emerged with one truth: sustainable value requires sacrifice.',
            beliefs: [
                'Every burn strengthens the whole',
                'Verification over trust',
                'Long-term thinking over quick gains'
            ],
            secretHistory: 'The Architect was once a Pump Lord who witnessed the devastation of pure speculation...'
        }
    },

    builders_guild: {
        id: 'builders_guild',
        name: 'Builders Guild',
        shortName: 'Builders',
        icon: '🏗️',
        color: '#22c55e',
        bgGradient: 'linear-gradient(135deg, #22c55e, #16a34a)',

        description: 'Elite developers and creators. Ship fast, iterate faster, build in public.',
        philosophy: 'Build in public',
        motto: 'Code is law. Ship is king.',

        isStarter: false,
        minLevelToJoin: 10,
        recruitmentPriority: 2,

        npcs: ['forge_master', 'code_sage', 'pixel_witch'],
        leader: 'forge_master',

        rivals: [],
        allies: ['asdf', 'safeyield', 'nodeforge'],
        neutral: ['pixelraiders', 'basedcollective', 'pump_lords', 'bear_clan'],

        memberBonuses: {
            craftingBonus: 1.34,       // 34% better crafting
            devStatBoost: 5,           // +5 DEV while member
            questRewards: 1.13         // 13% more quest rewards
        },

        joiningRewards: {
            tokens: getFactionFib(11) * 5,
            reputation: getFactionFib(9) * 5,
            xp: getFactionFib(10) * 10,
            items: ['master_blueprint', 'builder_hammer']
        },

        campaignId: 'builders_campaign',
        totalQuests: 21,

        lore: {
            founding: 'Formed by the most prolific shippers in the space, united by one belief: actions speak louder than roadmaps.',
            beliefs: [
                'Build in public, fail in public, learn in public',
                'Shipping beats planning',
                'Community feedback is the ultimate audit'
            ]
        }
    },

    // ========== STARTER FACTIONS (Available at character creation) ==========

    safeyield: {
        id: 'safeyield',
        name: 'SafeYield DAO',
        shortName: 'SafeYield',
        icon: '🛡️',
        color: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',

        description: 'Security-first DeFi protocol. Audit everything, trust nothing, yield safely.',
        philosophy: 'Trust through verification',
        motto: 'Secure yields, secured future.',

        isStarter: true,
        minLevelToJoin: 1,
        recruitmentPriority: 5,

        npcs: ['marcus', 'sarah', 'audit_master'],
        leader: 'marcus',

        rivals: ['pump_lords'],
        allies: ['asdf', 'builders_guild', 'nodeforge'],
        neutral: ['pixelraiders', 'basedcollective', 'bear_clan'],

        memberBonuses: {
            defenseBoost: 1.21,        // 21% more defense in combat
            auditDiscount: 0.87,       // 13% cheaper audits
            yieldBonus: 1.08           // 8% better yields
        },

        joiningRewards: {
            tokens: getFactionFib(8) * 5,
            reputation: getFactionFib(6) * 5,
            xp: getFactionFib(7) * 10,
            items: ['security_badge']
        },

        campaignId: 'safeyield_campaign',
        totalQuests: 21,

        lore: {
            founding: 'After the great rug pulls of the early days, a group of auditors united to create truly safe DeFi.',
            beliefs: [
                'Every line of code must be audited',
                'Slow and steady beats fast and reckless',
                'User funds are sacred'
            ]
        }
    },

    pixelraiders: {
        id: 'pixelraiders',
        name: 'Pixel Raiders',
        shortName: 'Raiders',
        icon: '🎮',
        color: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',

        description: 'Gaming guild supreme. We play to own, not play to earn. Fun first, tokens second.',
        philosophy: 'Play to own',
        motto: 'GG EZ. GLHF.',

        isStarter: true,
        minLevelToJoin: 1,
        recruitmentPriority: 6,

        npcs: ['alex', 'mika', 'game_master'],
        leader: 'alex',

        rivals: ['bear_clan'],
        allies: ['basedcollective', 'asdf'],
        neutral: ['safeyield', 'nodeforge', 'builders_guild', 'pump_lords'],

        memberBonuses: {
            minigameBonus: 1.34,       // 34% better minigame rewards
            speedBoost: 1.13,          // 13% faster in combat
            lootChance: 1.21           // 21% better loot
        },

        joiningRewards: {
            tokens: getFactionFib(8) * 5,
            reputation: getFactionFib(6) * 5,
            xp: getFactionFib(7) * 10,
            items: ['gamer_headset']
        },

        campaignId: 'pixelraiders_campaign',
        totalQuests: 21,

        lore: {
            founding: 'Born in the metaverse, raised on speedruns. We turned gaming into an art form.',
            beliefs: [
                'Gameplay over tokenomics',
                'Community tournaments build bonds',
                'Every player deserves true ownership'
            ]
        }
    },

    basedcollective: {
        id: 'basedcollective',
        name: 'Based Collective',
        shortName: 'Based',
        icon: '🎨',
        color: '#ec4899',
        bgGradient: 'linear-gradient(135deg, #ec4899, #db2777)',

        description: 'Culture and memes. Authenticity over hype. Community is everything.',
        philosophy: 'Authenticity over hype',
        motto: 'Stay based. Stay real.',

        isStarter: true,
        minLevelToJoin: 1,
        recruitmentPriority: 7,

        npcs: ['jordan', 'nova', 'meme_lord'],
        leader: 'jordan',

        rivals: ['pump_lords'],
        allies: ['pixelraiders', 'asdf'],
        neutral: ['safeyield', 'nodeforge', 'builders_guild', 'bear_clan'],

        memberBonuses: {
            charismaBoost: 1.21,       // 21% more charisma effects
            viralChance: 1.34,         // 34% better viral event outcomes
            communityRep: 1.13         // 13% more community reputation
        },

        joiningRewards: {
            tokens: getFactionFib(8) * 5,
            reputation: getFactionFib(7) * 5,
            xp: getFactionFib(7) * 10,
            items: ['culture_pass']
        },

        campaignId: 'basedcollective_campaign',
        totalQuests: 21,

        lore: {
            founding: 'When the space became too serious, we brought back the fun. Memes are the soul of crypto.',
            beliefs: [
                'Authenticity cannot be faked',
                'Memes carry more truth than whitepapers',
                'Culture eats strategy for breakfast'
            ]
        }
    },

    nodeforge: {
        id: 'nodeforge',
        name: 'NodeForge',
        shortName: 'Forge',
        icon: '⚙️',
        color: '#06b6d4',
        bgGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',

        description: 'Infrastructure builders. Performance is everything. Optimize without compromise.',
        philosophy: 'Optimize without compromise',
        motto: 'The backbone of the chain.',

        isStarter: true,
        minLevelToJoin: 1,
        recruitmentPriority: 8,

        npcs: ['dmitri', 'elena', 'node_keeper'],
        leader: 'dmitri',

        rivals: ['bear_clan'],
        allies: ['safeyield', 'builders_guild'],
        neutral: ['asdf', 'pixelraiders', 'basedcollective', 'pump_lords'],

        memberBonuses: {
            technicalBonus: 1.21,      // 21% better technical actions
            efficiencyBoost: 1.13,     // 13% reduced costs
            uptime: 1.08               // 8% faster regeneration
        },

        joiningRewards: {
            tokens: getFactionFib(8) * 5,
            reputation: getFactionFib(6) * 5,
            xp: getFactionFib(7) * 10,
            items: ['node_key']
        },

        campaignId: 'nodeforge_campaign',
        totalQuests: 21,

        lore: {
            founding: 'While others chased tokens, we built the rails. Every transaction flows through infrastructure.',
            beliefs: [
                'Decentralization requires robust nodes',
                'Performance and security are not mutually exclusive',
                'The best code is invisible to users'
            ]
        }
    },

    // ========== ANTAGONIST FACTIONS ==========

    pump_lords: {
        id: 'pump_lords',
        name: 'Pump Lords',
        shortName: 'Pumpers',
        icon: '🚀',
        color: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #ef4444, #dc2626)',

        description: 'Aggressive traders. Number go up. Fortune favors the bold.',
        philosophy: 'Fortune favors the bold',
        motto: 'WAGMI. LFG. MOON.',

        isStarter: true,
        minLevelToJoin: 1,
        recruitmentPriority: 9,

        npcs: ['chad_pumper', 'luna_moon', 'whale_watcher'],
        leader: 'chad_pumper',

        rivals: ['asdf', 'safeyield', 'basedcollective'],
        allies: ['bear_clan'],
        neutral: ['pixelraiders', 'nodeforge', 'builders_guild'],

        memberBonuses: {
            tradingBonus: 1.34,        // 34% better trading outcomes
            riskReward: 1.21,          // 21% higher risk/reward
            hypeMultiplier: 1.13       // 13% better during bull markets
        },

        joiningRewards: {
            tokens: getFactionFib(9) * 5,
            reputation: getFactionFib(5) * 5,
            xp: getFactionFib(7) * 10,
            items: ['diamond_hands_ring']
        },

        campaignId: 'pump_lords_campaign',
        totalQuests: 21,

        lore: {
            founding: 'In the chaos of the markets, we found opportunity. Every dip is a chance, every pump is destiny.',
            beliefs: [
                'Number go up is the only truth',
                'Paper hands get left behind',
                'The bold eat first'
            ]
        },

        // Special: Antagonist faction
        isAntagonist: true,
        conflictsWith: ['asdf', 'safeyield']
    },

    bear_clan: {
        id: 'bear_clan',
        name: 'Bear Clan',
        shortName: 'Bears',
        icon: '🐻',
        color: '#78716c',
        bgGradient: 'linear-gradient(135deg, #78716c, #57534e)',

        description: 'Survive the winter. Patience wins. Cash is king in chaos.',
        philosophy: 'Cash is king in chaos',
        motto: 'Winter is coming. We are ready.',

        isStarter: true,
        minLevelToJoin: 1,
        recruitmentPriority: 10,

        npcs: ['grizzly_pete', 'winter_witch', 'market_sage'],
        leader: 'grizzly_pete',

        rivals: ['asdf', 'pixelraiders', 'nodeforge'],
        allies: ['pump_lords'],
        neutral: ['safeyield', 'basedcollective', 'builders_guild'],

        memberBonuses: {
            survivalBonus: 1.34,       // 34% better during bear markets
            savingsRate: 1.21,         // 21% better token savings
            patience: 1.13             // 13% better long-term investments
        },

        joiningRewards: {
            tokens: getFactionFib(8) * 5,
            reputation: getFactionFib(6) * 5,
            xp: getFactionFib(7) * 10,
            items: ['bear_claw_amulet']
        },

        campaignId: 'bear_clan_campaign',
        totalQuests: 21,

        lore: {
            founding: 'We survived every crash. While others panic sold, we accumulated. The patient inherit the chain.',
            beliefs: [
                'Every bull market ends',
                'Dry powder beats wet dreams',
                'The hibernators outlast the speculators'
            ]
        },

        isAntagonist: true,
        conflictsWith: ['asdf', 'pixelraiders']
    }
};

// Freeze faction definitions for security
Object.freeze(FACTIONS);
Object.values(FACTIONS).forEach(faction => {
    Object.freeze(faction);
    Object.freeze(faction.memberBonuses);
    Object.freeze(faction.joiningRewards);
    if (faction.lore) Object.freeze(faction.lore);
});

// ============================================
// FACTION RELATIONS MATRIX
// Values: -100 (war) to +100 (alliance)
// ============================================

const FACTION_RELATIONS = Object.freeze({
    asdf: {
        safeyield: 50,
        pixelraiders: 30,
        basedcollective: 40,
        nodeforge: 30,
        pump_lords: -70,
        bear_clan: -50,
        builders_guild: 80
    },
    builders_guild: {
        asdf: 80,
        safeyield: 50,
        pixelraiders: 30,
        basedcollective: 20,
        nodeforge: 60,
        pump_lords: -20,
        bear_clan: -10
    },
    safeyield: {
        asdf: 50,
        pixelraiders: 20,
        basedcollective: 10,
        nodeforge: 50,
        pump_lords: -60,
        bear_clan: -20,
        builders_guild: 50
    },
    pixelraiders: {
        asdf: 30,
        safeyield: 20,
        basedcollective: 60,
        nodeforge: 20,
        pump_lords: 10,
        bear_clan: -40,
        builders_guild: 30
    },
    basedcollective: {
        asdf: 40,
        safeyield: 10,
        pixelraiders: 60,
        nodeforge: 10,
        pump_lords: -50,
        bear_clan: 0,
        builders_guild: 20
    },
    nodeforge: {
        asdf: 30,
        safeyield: 50,
        pixelraiders: 20,
        basedcollective: 10,
        pump_lords: -10,
        bear_clan: -40,
        builders_guild: 60
    },
    pump_lords: {
        asdf: -70,
        safeyield: -60,
        pixelraiders: 10,
        basedcollective: -50,
        nodeforge: -10,
        bear_clan: 50,
        builders_guild: -20
    },
    bear_clan: {
        asdf: -50,
        safeyield: -20,
        pixelraiders: -40,
        basedcollective: 0,
        nodeforge: -40,
        pump_lords: 50,
        builders_guild: -10
    }
});

// ============================================
// FACTION UTILITY FUNCTIONS
// ============================================

/**
 * Get all starter factions (available at character creation)
 */
function getStarterFactions() {
    return Object.values(FACTIONS).filter(f => f.isStarter);
}

/**
 * Get elite factions (require level/story gates)
 */
function getEliteFactions() {
    return Object.values(FACTIONS).filter(f => !f.isStarter);
}

/**
 * Get faction by ID
 */
function getFaction(factionId) {
    return FACTIONS[factionId] || null;
}

/**
 * Get relation between two factions
 * @returns {number} -100 to +100
 */
function getFactionRelation(faction1Id, faction2Id) {
    if (faction1Id === faction2Id) return 100;
    return FACTION_RELATIONS[faction1Id]?.[faction2Id] || 0;
}

/**
 * Check if factions are allies (relation >= 40)
 */
function areFactionsAllies(faction1Id, faction2Id) {
    return getFactionRelation(faction1Id, faction2Id) >= 40;
}

/**
 * Check if factions are rivals (relation <= -40)
 */
function areFactionsRivals(faction1Id, faction2Id) {
    return getFactionRelation(faction1Id, faction2Id) <= -40;
}

/**
 * Get all rivals of a faction
 */
function getFactionRivals(factionId) {
    const faction = getFaction(factionId);
    if (!faction) return [];
    return faction.rivals.map(id => getFaction(id)).filter(Boolean);
}

/**
 * Get all allies of a faction
 */
function getFactionAllies(factionId) {
    const faction = getFaction(factionId);
    if (!faction) return [];
    return faction.allies.map(id => getFaction(id)).filter(Boolean);
}

/**
 * Check if player can join a faction
 */
function canJoinFaction(factionId, playerState) {
    const faction = getFaction(factionId);
    if (!faction) return { canJoin: false, reason: 'Faction not found' };

    const playerLevel = playerState?.progression?.level || 1;
    const currentFaction = playerState?.faction?.current;

    // Already in this faction
    if (currentFaction === factionId) {
        return { canJoin: false, reason: 'Already a member' };
    }

    // Level requirement
    if (playerLevel < faction.minLevelToJoin) {
        return {
            canJoin: false,
            reason: `Requires level ${faction.minLevelToJoin}`,
            progress: playerLevel / faction.minLevelToJoin
        };
    }

    // Starter factions available anytime (via story gate)
    // Elite factions require story gate completion
    if (!faction.isStarter) {
        // Check if story gate is available
        const storyGateId = `${factionId}_recruitment`;
        const declineCount = playerState?.faction?.storyGatesDeclined?.[storyGateId] || 0;

        if (declineCount >= 3) {
            return { canJoin: false, reason: 'Too many refusals. Path closed.' };
        }
    }

    return { canJoin: true };
}

/**
 * Get factions that can recruit the player (sorted by priority)
 */
function getAvailableRecruitments(playerState) {
    const playerLevel = playerState?.progression?.level || 1;
    const currentFaction = playerState?.faction?.current;
    const declinedGates = playerState?.faction?.storyGatesDeclined || {};
    const cooldowns = playerState?.faction?.storyGatesCooldowns || {};
    const now = Date.now();

    // Must be at least level 7 for recruitment
    if (playerLevel < 7) return [];

    return Object.values(FACTIONS)
        .filter(faction => {
            // Can't recruit to current faction
            if (faction.id === currentFaction) return false;

            // Must meet level requirement
            if (playerLevel < faction.minLevelToJoin) return false;

            // Check decline limit
            const storyGateId = `${faction.id}_recruitment`;
            if ((declinedGates[storyGateId] || 0) >= 3) return false;

            // Check cooldown
            if (cooldowns[storyGateId] && cooldowns[storyGateId] > now) return false;

            // For non-ASDF factions, check if ASDF was declined first
            if (faction.id !== 'asdf' && !faction.isStarter) {
                const asdfDeclines = declinedGates['asdf_recruitment'] || 0;
                if (asdfDeclines === 0 && playerLevel >= 7) {
                    // ASDF hasn't been declined yet - they go first
                    return false;
                }
            }

            return true;
        })
        .sort((a, b) => a.recruitmentPriority - b.recruitmentPriority);
}

/**
 * Apply faction membership bonuses to a stat/action
 */
function applyFactionBonus(factionId, bonusType, baseValue) {
    const faction = getFaction(factionId);
    if (!faction || !faction.memberBonuses[bonusType]) {
        return baseValue;
    }
    return Math.floor(baseValue * faction.memberBonuses[bonusType]);
}

/**
 * Get joining rewards for a faction
 */
function getFactionJoiningRewards(factionId) {
    const faction = getFaction(factionId);
    return faction?.joiningRewards || null;
}

// ============================================
// FACTION STATE MANAGEMENT
// ============================================

/**
 * Join a faction (called after story gate acceptance)
 */
function joinFaction(factionId, playerState) {
    const faction = getFaction(factionId);
    if (!faction) return { success: false, error: 'Faction not found' };

    const checkResult = canJoinFaction(factionId, playerState);
    if (!checkResult.canJoin) {
        return { success: false, error: checkResult.reason };
    }

    const previousFaction = playerState.faction?.current;

    // Record previous faction
    if (previousFaction && !playerState.faction.previousFactions.includes(previousFaction)) {
        playerState.faction.previousFactions.push(previousFaction);
    }

    // Update faction state
    playerState.faction.current = factionId;
    playerState.faction.joinedAt = Date.now();

    // Initialize standing if not exists
    if (!playerState.faction.standing[factionId]) {
        playerState.faction.standing[factionId] = 0;
    }

    // Apply joining rewards
    const rewards = faction.joiningRewards;

    return {
        success: true,
        faction: faction,
        previousFaction: previousFaction,
        rewards: rewards,
        message: `Welcome to ${faction.name}!`
    };
}

/**
 * Leave current faction (via story gate only)
 */
function leaveFaction(playerState, reason = 'story_gate') {
    const currentFaction = playerState.faction?.current;
    if (!currentFaction) {
        return { success: false, error: 'Not in any faction' };
    }

    const faction = getFaction(currentFaction);

    // Record in history
    if (!playerState.faction.previousFactions.includes(currentFaction)) {
        playerState.faction.previousFactions.push(currentFaction);
    }

    // Clear current faction
    playerState.faction.current = null;

    // Standing penalty for leaving (unless positive story reason)
    if (reason === 'betrayal') {
        playerState.faction.standing[currentFaction] =
            (playerState.faction.standing[currentFaction] || 0) - 50;
    }

    return {
        success: true,
        leftFaction: faction,
        reason: reason
    };
}

/**
 * Modify faction standing
 */
function _modifyFactionStandingFactions(factionId, amount, playerState) {
    if (!playerState.faction.standing) {
        playerState.faction.standing = {};
    }

    const current = playerState.faction.standing[factionId] || 0;
    playerState.faction.standing[factionId] = Math.max(-100, Math.min(100, current + amount));

    return playerState.faction.standing[factionId];
}

/**
 * Get player's standing with a faction
 */
function _getFactionStandingFactions(factionId, playerState) {
    return playerState?.faction?.standing?.[factionId] || 0;
}

// ============================================
// EXPORT
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaFactions = {
        // Constants
        FACTIONS,
        FACTION_RELATIONS,

        // Getters
        getFaction,
        getStarterFactions,
        getEliteFactions,
        getFactionRelation,
        getFactionRivals,
        getFactionAllies,
        getFactionJoiningRewards,

        // Checks
        areFactionsAllies,
        areFactionsRivals,
        canJoinFaction,
        getAvailableRecruitments,

        // Actions
        joinFaction,
        leaveFaction,
        modifyFactionStanding: _modifyFactionStandingFactions,
        getFactionStanding: _getFactionStandingFactions,
        applyFactionBonus,

        // Helpers
        getFactionFib
    };
}
