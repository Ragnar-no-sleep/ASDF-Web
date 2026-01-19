/**
 * Pump Arena RPG - Expanded Quests System
 *
 * 140+ quests organized by faction campaigns
 * Each faction has ~20 quests with branching narratives
 * Choices have mechanical AND narrative consequences
 *
 * ASDF Philosophy: Every choice matters, burns benefit everyone
 */

// ============================================================
// GLOBAL MODULE ACCESSORS (legacy compatibility)
// ============================================================

// RPG State accessors
const getRPGState = () => window.PumpArenaState?.get?.() || {};
const getMajorChoice = (choiceId) => getRPGState().storyFlags?.majorChoices?.[choiceId] || null;
const setMajorChoice = (choiceId, value) => {
    const state = window.PumpArenaState?.get?.();
    if (!state) return;
    state.storyFlags = state.storyFlags || {};
    state.storyFlags.majorChoices = state.storyFlags.majorChoices || {};
    state.storyFlags.majorChoices[choiceId] = value;
    window.PumpArenaState?.save?.();
};

// Factions accessor
const FACTIONS = () => window.PumpArenaFactions?.FACTIONS || {};

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
// QUEST CONSTANTS
// ============================================================

const QUEST_CONSTANTS = deepFreeze({
    // Quest types
    TYPES: {
        MAIN: 'main',
        SIDE: 'side',
        FACTION: 'faction',
        SECRET: 'secret',
        DAILY: 'daily'
    },

    // Objective types
    OBJECTIVES: {
        BATTLE: 'battle',
        COLLECT: 'collect',
        TALK: 'talk',
        EXPLORE: 'explore',
        CHOICE: 'choice',
        BURN: 'burn',
        TRADE: 'trade',
        CRAFT: 'craft'
    },

    // Difficulty (Fibonacci XP multipliers)
    DIFFICULTY: {
        EASY: { xpMult: 1.0, tokenMult: 1.0 },
        NORMAL: { xpMult: 1.21, tokenMult: 1.13 },
        HARD: { xpMult: 1.618, tokenMult: 1.34 },
        EPIC: { xpMult: 2.618, tokenMult: 2.0 },
        LEGENDARY: { xpMult: 4.236, tokenMult: 3.0 }
    },

    // Reputation thresholds
    REP_THRESHOLDS: {
        HATED: -89,
        DISLIKED: -34,
        NEUTRAL: 0,
        LIKED: 34,
        HONORED: 55,
        REVERED: 89
    }
});

// ============================================================
// QUEST TEMPLATE HELPER
// ============================================================

function createQuest(config) {
    return {
        id: config.id,
        name: config.name,
        type: config.type || QUEST_CONSTANTS.TYPES.FACTION,
        faction: config.faction,
        chapter: config.chapter || 1,
        description: config.description,
        difficulty: config.difficulty || 'NORMAL',

        requirements: {
            level: config.minLevel || 1,
            previousQuest: config.requiresQuest || null,
            factionStanding: config.requiresStanding || null,
            storyFlag: config.requiresFlag || null,
            items: config.requiresItems || []
        },

        objectives: config.objectives || [],

        rewards: {
            xp: config.xp || 100,
            tokens: config.tokens || 50,
            items: config.items || [],
            stats: config.stats || {},
            reputation: config.reputation || {},
            unlocks: config.unlocks || []
        },

        choices: config.choices || null,
        dialogue: config.dialogue || {},
        storyFlags: config.storyFlags || [],
        nextQuest: config.nextQuest || null
    };
}

// ============================================================
// ASDF COLLECTIVE CAMPAIGN (21 Quests)
// Chapter 1: Initiation (5)
// Chapter 2: The Collective (5)
// Chapter 3: Rising Flames (5)
// Chapter 4: Faction Wars (4)
// Chapter 5: Finale (2 with multiple endings)
// ============================================================

const ASDF_CAMPAIGN = {
    // === CHAPTER 1: INITIATION ===
    asdf_1_1: createQuest({
        id: 'asdf_1_1',
        name: 'The Burning Path',
        faction: 'asdf',
        chapter: 1,
        description: 'Your first step into the ASDF Collective. Prove your commitment to the flame.',
        minLevel: 7,
        difficulty: 'NORMAL',

        objectives: [
            { type: 'talk', target: 'vera_burns', text: 'Speak with Vera Burns' },
            { type: 'choice', id: 'first_burn_choice' },
            { type: 'burn', amount: 100, text: 'Complete your first collective burn' }
        ],

        choices: {
            first_burn_choice: {
                prompt: 'How much of your tokens are you willing to burn for the cause?',
                options: [
                    {
                        id: 'burn_all',
                        text: 'Burn everything I have (All tokens)',
                        consequence: 'Maximum dedication shown',
                        outcomes: {
                            reputation: { asdf: 21 },
                            stats: { lck: 2 },
                            storyFlag: 'true_believer',
                            special: 'burn_all_tokens'
                        }
                    },
                    {
                        id: 'burn_half',
                        text: 'Burn half my tokens',
                        consequence: 'Balanced approach',
                        outcomes: {
                            reputation: { asdf: 13 },
                            stats: { lck: 1 },
                            storyFlag: 'pragmatic_burner'
                        }
                    },
                    {
                        id: 'burn_minimum',
                        text: 'Burn only the required 100',
                        consequence: 'Cautious start',
                        outcomes: {
                            reputation: { asdf: 5 },
                            storyFlag: 'cautious_initiate'
                        }
                    }
                ]
            }
        },

        xp: 200,
        tokens: 0, // Depends on burn choice
        burnRewardTokens: 500, // Tokens bonus pour la section burn
        items: ['badge_asdf_initiate', 'shard_fire'],
        reputation: { asdf: 8 },
        storyFlags: ['asdf_initiated'],
        nextQuest: 'asdf_1_2',

        dialogue: {
            intro: {
                speaker: 'Vera Burns',
                text: "Welcome, newcomer. The ASDF Collective doesn't accept just anyone. We need to see fire in your soul."
            },
            choice_prompt: {
                speaker: 'Vera Burns',
                text: "The first test is simple: burn. Not for profit, not for gain - but for the collective good. How committed are you?"
            }
        }
    }),

    asdf_1_2: createQuest({
        id: 'asdf_1_2',
        name: 'Meet the Founders',
        faction: 'asdf',
        chapter: 1,
        description: 'Learn about the ASDF origins by meeting key members.',
        minLevel: 7,
        requiresQuest: 'asdf_1_1',

        objectives: [
            { type: 'talk', target: 'satoshi_jr', text: 'Meet Satoshi Jr.' },
            { type: 'talk', target: 'the_architect', text: 'Audience with The Architect' },
            { type: 'explore', location: 'asdf_hall_of_burns', text: 'Visit the Hall of Burns' }
        ],

        xp: 150,
        tokens: 100,
        burnRewardTokens: 200, // Bonus burn tokens
        items: ['ember_essence'],
        reputation: { asdf: 5 },
        nextQuest: 'asdf_1_3',

        dialogue: {
            satoshi_intro: {
                speaker: 'Satoshi Jr.',
                text: "My father had a vision - a world where value isn't hoarded but circulated, burned, reborn. ASDF carries that torch."
            },
            architect_intro: {
                speaker: 'The Architect',
                text: "Numbers don't lie. Every burn strengthens the whole. It's mathematics, not ideology. Though the two often align."
            }
        }
    }),

    asdf_1_3: createQuest({
        id: 'asdf_1_3',
        name: 'First Contribution',
        faction: 'asdf',
        chapter: 1,
        description: 'Make your first meaningful contribution to the collective.',
        minLevel: 7,
        requiresQuest: 'asdf_1_2',

        objectives: [
            { type: 'battle', target: 'fud_spreader', count: 3, text: 'Defeat 3 FUD Spreaders' },
            { type: 'collect', item: 'fud_tokens', count: 5, text: 'Collect their FUD tokens' },
            { type: 'choice', id: 'fud_tokens_choice' }
        ],

        choices: {
            fud_tokens_choice: {
                prompt: 'You\'ve collected 5 FUD tokens. What do you do with them?',
                options: [
                    {
                        id: 'burn_fud',
                        text: 'Burn them all immediately',
                        consequence: 'Destroy the FUD forever',
                        outcomes: {
                            reputation: { asdf: 13 },
                            xpBonus: 50
                        }
                    },
                    {
                        id: 'convert_fud',
                        text: 'Convert them to ASDF tokens',
                        consequence: 'Practical approach',
                        outcomes: {
                            tokens: 200,
                            reputation: { asdf: 5 }
                        }
                    },
                    {
                        id: 'study_fud',
                        text: 'Study them first, then burn',
                        consequence: 'Knowledge before destruction',
                        outcomes: {
                            reputation: { asdf: 8 },
                            stats: { int: 1 },
                            storyFlag: 'studied_fud'
                        }
                    }
                ]
            }
        },

        xp: 180,
        tokens: 150,
        burnRewardTokens: 300, // Bonus pour burn de FUD
        items: ['shard_fire', 'shard_fire'],
        reputation: { asdf: 8, pump_lords: -5 },
        nextQuest: 'asdf_1_4'
    }),

    asdf_1_4: createQuest({
        id: 'asdf_1_4',
        name: 'Community Test',
        faction: 'asdf',
        chapter: 1,
        description: 'A fellow member is in trouble. How will you respond?',
        minLevel: 8,
        requiresQuest: 'asdf_1_3',

        objectives: [
            { type: 'talk', target: 'struggling_member', text: 'Find the struggling member' },
            { type: 'choice', id: 'help_member_choice' }
        ],

        choices: {
            help_member_choice: {
                prompt: 'A fellow ASDF member lost everything in a bad trade. They\'re considering leaving.',
                options: [
                    {
                        id: 'donate_tokens',
                        text: 'Donate 500 tokens to help them',
                        consequence: 'Personal sacrifice for community',
                        outcomes: {
                            tokenCost: 500,
                            reputation: { asdf: 21 },
                            storyFlag: 'generous_soul',
                            unlockAlly: 'grateful_member'
                        }
                    },
                    {
                        id: 'teach_burn',
                        text: 'Teach them the power of strategic burning',
                        consequence: 'Education over charity',
                        outcomes: {
                            reputation: { asdf: 13 },
                            storyFlag: 'asdf_teacher',
                            xpBonus: 100
                        }
                    },
                    {
                        id: 'report_weakness',
                        text: 'Report their weakness to leadership',
                        consequence: 'Harsh but honest',
                        outcomes: {
                            reputation: { asdf: 5 },
                            storyFlag: 'strict_adherent'
                        }
                    },
                    {
                        id: 'ignore',
                        text: 'Their problem, not yours',
                        consequence: 'Cold calculation',
                        outcomes: {
                            reputation: { asdf: -8 },
                            storyFlag: 'self_focused'
                        }
                    }
                ]
            }
        },

        xp: 200,
        tokens: 100,
        nextQuest: 'asdf_1_5',

        dialogue: {
            intro: {
                speaker: 'Vera Burns',
                text: "Being ASDF isn't just about burning tokens. It's about community. We have a situation..."
            }
        }
    }),

    asdf_1_5: createQuest({
        id: 'asdf_1_5',
        name: 'Chapter 1 Finale: The First Flame',
        faction: 'asdf',
        chapter: 1,
        description: 'Complete your initiation with the First Flame ceremony.',
        minLevel: 8,
        requiresQuest: 'asdf_1_4',
        difficulty: 'HARD',

        objectives: [
            { type: 'collect', item: 'phoenix_feather', count: 3, text: 'Gather Phoenix Feathers' },
            { type: 'battle', target: 'doubt_manifest', text: 'Face your Doubt Manifest' },
            { type: 'burn', amount: 500, text: 'Participate in the Great Burn' },
            { type: 'choice', id: 'flame_oath' }
        ],

        choices: {
            flame_oath: {
                prompt: 'The Architect asks you to swear the Flame Oath. Choose your vow:',
                options: [
                    {
                        id: 'oath_absolute',
                        text: '"I will burn without hesitation, without doubt."',
                        consequence: 'Absolute commitment to ASDF',
                        outcomes: {
                            reputation: { asdf: 21 },
                            title: 'Flame Sworn',
                            stats: { atk: 2, lck: 1 },
                            permanent: true
                        }
                    },
                    {
                        id: 'oath_balanced',
                        text: '"I will burn wisely, for the good of all."',
                        consequence: 'Thoughtful dedication',
                        outcomes: {
                            reputation: { asdf: 13 },
                            title: 'Wise Flame',
                            stats: { int: 2, def: 1 },
                            permanent: true
                        }
                    },
                    {
                        id: 'oath_personal',
                        text: '"I will burn my own path while supporting the collective."',
                        consequence: 'Independent spirit',
                        outcomes: {
                            reputation: { asdf: 8 },
                            title: 'Free Flame',
                            stats: { spd: 2, hp: 13 },
                            permanent: true
                        }
                    }
                ]
            }
        },

        xp: 500,
        tokens: 300,
        burnRewardTokens: 1000, // Gros bonus burn pour finale Ch1
        items: ['badge_asdf_believer', 'asdf_ember_gauntlets', 'shard_fire'],
        reputation: { asdf: 21 },
        unlocks: ['asdf_chapter_2'],
        storyFlags: ['asdf_chapter_1_complete'],
        nextQuest: 'asdf_2_1',

        dialogue: {
            ceremony: {
                speaker: 'The Architect',
                text: "You've proven yourself. Now it's time to become one with the flame. Whatever you were before... burn it away."
            }
        }
    }),

    // === CHAPTER 2: THE COLLECTIVE (5 quests) ===
    asdf_2_1: createQuest({
        id: 'asdf_2_1',
        name: 'Inner Circle',
        faction: 'asdf',
        chapter: 2,
        description: 'Learn the deeper workings of the ASDF Collective.',
        minLevel: 9,
        requiresQuest: 'asdf_1_5',

        objectives: [
            { type: 'explore', location: 'asdf_vault', text: 'Access the ASDF Vault' },
            { type: 'talk', target: 'council_elder', text: 'Meet with a Council Elder' },
            { type: 'collect', item: 'burn_report', count: 1, text: 'Review the monthly burn report' }
        ],

        xp: 250,
        tokens: 200,
        burnRewardTokens: 400,
        items: ['ember_essence'],
        reputation: { asdf: 8 },
        nextQuest: 'asdf_2_2'
    }),

    asdf_2_2: createQuest({
        id: 'asdf_2_2',
        name: 'The Opposition',
        faction: 'asdf',
        chapter: 2,
        description: 'The Pump Lords are spreading anti-ASDF propaganda.',
        minLevel: 9,
        requiresQuest: 'asdf_2_1',

        objectives: [
            { type: 'explore', location: 'pump_territory', text: 'Infiltrate Pump Lord territory' },
            { type: 'collect', item: 'propaganda_poster', count: 5, text: 'Gather their propaganda' },
            { type: 'choice', id: 'propaganda_response' }
        ],

        choices: {
            propaganda_response: {
                prompt: 'You\'ve gathered the propaganda. How do you respond?',
                options: [
                    {
                        id: 'counter_propaganda',
                        text: 'Create counter-propaganda',
                        consequence: 'Fight fire with fire',
                        outcomes: {
                            reputation: { asdf: 13, pump_lords: -13 },
                            unlockQuest: 'asdf_propaganda_war'
                        }
                    },
                    {
                        id: 'public_burn',
                        text: 'Burn it all publicly',
                        consequence: 'Dramatic statement',
                        outcomes: {
                            reputation: { asdf: 21, pump_lords: -21 },
                            storyFlag: 'public_burner'
                        }
                    },
                    {
                        id: 'analyze_claims',
                        text: 'Analyze their claims objectively',
                        consequence: 'Seek understanding',
                        outcomes: {
                            reputation: { asdf: 5, pump_lords: -5 },
                            stats: { int: 1 },
                            storyFlag: 'diplomatic_thinker'
                        }
                    }
                ]
            }
        },

        xp: 280,
        tokens: 250,
        reputation: { asdf: 8, pump_lords: -8 },
        nextQuest: 'asdf_2_3'
    }),

    asdf_2_3: createQuest({
        id: 'asdf_2_3',
        name: 'Burn Efficiency',
        faction: 'asdf',
        chapter: 2,
        description: 'Help optimize the collective\'s burn mechanisms.',
        minLevel: 9,
        requiresQuest: 'asdf_2_2',

        objectives: [
            { type: 'talk', target: 'burn_engineer', text: 'Consult the Burn Engineer' },
            { type: 'collect', item: 'efficiency_data', count: 3, text: 'Gather efficiency data' },
            { type: 'battle', target: 'rogue_bot', count: 3, text: 'Defeat inefficient bots' },
            { type: 'choice', id: 'efficiency_method' }
        ],

        choices: {
            efficiency_method: {
                prompt: 'Which optimization method should we implement?',
                options: [
                    {
                        id: 'batch_burns',
                        text: 'Batch burning (more efficient, less frequent)',
                        consequence: '+21% burn efficiency',
                        outcomes: {
                            permanentBonus: { burnEfficiency: 0.21 },
                            reputation: { asdf: 13 }
                        }
                    },
                    {
                        id: 'continuous_burns',
                        text: 'Continuous micro-burns (constant, visible)',
                        consequence: '+13% community engagement',
                        outcomes: {
                            permanentBonus: { communityEngagement: 0.13 },
                            reputation: { asdf: 13 }
                        }
                    },
                    {
                        id: 'adaptive_burns',
                        text: 'Adaptive system (complex, best of both)',
                        consequence: 'Requires more resources',
                        outcomes: {
                            tokenCost: 1000,
                            permanentBonus: { burnEfficiency: 0.13, communityEngagement: 0.08 },
                            reputation: { asdf: 21 }
                        }
                    }
                ]
            }
        },

        xp: 300,
        tokens: 300,
        reputation: { asdf: 13 },
        nextQuest: 'asdf_2_4'
    }),

    asdf_2_4: createQuest({
        id: 'asdf_2_4',
        name: 'Defector\'s Dilemma',
        faction: 'asdf',
        chapter: 2,
        description: 'A high-ranking member wants to defect to the Pump Lords.',
        minLevel: 10,
        requiresQuest: 'asdf_2_3',

        objectives: [
            { type: 'talk', target: 'defector', text: 'Confront the potential defector' },
            { type: 'choice', id: 'defector_fate' }
        ],

        choices: {
            defector_fate: {
                prompt: 'The defector has valuable secrets. What do you do?',
                options: [
                    {
                        id: 'convince_stay',
                        text: 'Convince them to stay',
                        consequence: 'Requires high CHA',
                        statRequired: { cha: 15 },
                        outcomes: {
                            reputation: { asdf: 21 },
                            unlockAlly: 'redeemed_defector',
                            storyFlag: 'saved_defector'
                        }
                    },
                    {
                        id: 'let_go',
                        text: 'Let them leave peacefully',
                        consequence: 'Merciful but risky',
                        outcomes: {
                            reputation: { asdf: -8, pump_lords: 5 },
                            storyFlag: 'merciful_choice'
                        }
                    },
                    {
                        id: 'report_council',
                        text: 'Report them to the Council',
                        consequence: 'Follow protocol',
                        outcomes: {
                            reputation: { asdf: 13 },
                            storyFlag: 'by_the_book'
                        }
                    },
                    {
                        id: 'use_information',
                        text: 'Extract their information first',
                        consequence: 'Pragmatic but dark',
                        outcomes: {
                            reputation: { asdf: 8 },
                            stats: { int: 1 },
                            items: ['pump_lord_secrets'],
                            storyFlag: 'information_broker'
                        }
                    }
                ]
            }
        },

        xp: 350,
        tokens: 250,
        reputation: { asdf: 8 },
        nextQuest: 'asdf_2_5'
    }),

    asdf_2_5: createQuest({
        id: 'asdf_2_5',
        name: 'Chapter 2 Finale: Collective Action',
        faction: 'asdf',
        chapter: 2,
        description: 'Lead your first collective burn event.',
        minLevel: 10,
        requiresQuest: 'asdf_2_4',
        difficulty: 'HARD',

        objectives: [
            { type: 'collect', item: 'burn_pledge', count: 10, text: 'Gather 10 burn pledges' },
            { type: 'burn', amount: 2000, text: 'Coordinate the collective burn' },
            { type: 'battle', target: 'fud_lord', text: 'Defeat the FUD Lord who attacks' },
            { type: 'choice', id: 'victory_celebration' }
        ],

        choices: {
            victory_celebration: {
                prompt: 'The burn was successful! How do you celebrate?',
                options: [
                    {
                        id: 'share_rewards',
                        text: 'Share all rewards with participants',
                        consequence: 'Ultimate generosity',
                        outcomes: {
                            reputation: { asdf: 34 },
                            title: 'People\'s Champion',
                            tokenCost: 'all_rewards'
                        }
                    },
                    {
                        id: 'burn_rewards',
                        text: 'Burn the rewards too!',
                        consequence: 'Pure ASDF philosophy',
                        outcomes: {
                            reputation: { asdf: 55 },
                            title: 'True Burner',
                            stats: { lck: 3 },
                            tokenCost: 'all_rewards'
                        }
                    },
                    {
                        id: 'keep_share',
                        text: 'Keep your share, distribute the rest',
                        consequence: 'Fair approach',
                        outcomes: {
                            reputation: { asdf: 13 },
                            tokens: 500
                        }
                    }
                ]
            }
        },

        xp: 600,
        tokens: 500,
        burnRewardTokens: 2000, // Gros bonus burn finale Ch2
        items: ['badge_asdf_phoenix', 'asdf_inferno_boots', 'phoenix_feather'],
        reputation: { asdf: 21 },
        unlocks: ['asdf_chapter_3'],
        storyFlags: ['asdf_chapter_2_complete'],
        nextQuest: 'asdf_3_1'
    }),

    // === CHAPTER 3: RISING FLAMES (5 quests) ===
    asdf_3_1: createQuest({
        id: 'asdf_3_1',
        name: 'Flames of War',
        faction: 'asdf',
        chapter: 3,
        description: 'The Pump Lords have declared open conflict with ASDF.',
        minLevel: 11,
        requiresQuest: 'asdf_2_5',

        objectives: [
            { type: 'battle', target: 'pump_soldier', count: 5, text: 'Repel Pump Lord soldiers' },
            { type: 'talk', target: 'war_council', text: 'Attend the War Council' },
            { type: 'choice', id: 'war_stance' }
        ],

        choices: {
            war_stance: {
                prompt: 'The Council asks for your strategic input:',
                options: [
                    {
                        id: 'aggressive',
                        text: 'Strike first, strike hard',
                        consequence: 'Offensive strategy',
                        outcomes: {
                            reputation: { asdf: 13, pump_lords: -21 },
                            unlockQuest: 'asdf_offensive_campaign'
                        }
                    },
                    {
                        id: 'defensive',
                        text: 'Fortify and defend our values',
                        consequence: 'Defensive strategy',
                        outcomes: {
                            reputation: { asdf: 13 },
                            stats: { def: 2 }
                        }
                    },
                    {
                        id: 'diplomatic',
                        text: 'Seek peaceful resolution',
                        consequence: 'Risky but noble',
                        outcomes: {
                            reputation: { asdf: -5, pump_lords: 8 },
                            storyFlag: 'peace_seeker',
                            unlockQuest: 'asdf_diplomatic_mission'
                        }
                    }
                ]
            }
        },

        xp: 400,
        tokens: 300,
        reputation: { asdf: 8, pump_lords: -8 },
        nextQuest: 'asdf_3_2'
    }),

    asdf_3_2: createQuest({
        id: 'asdf_3_2',
        name: 'Supply Lines',
        faction: 'asdf',
        chapter: 3,
        description: 'Secure supply lines for the conflict.',
        minLevel: 11,
        requiresQuest: 'asdf_3_1',

        objectives: [
            { type: 'explore', location: 'trade_route_alpha', text: 'Scout trade route Alpha' },
            { type: 'battle', target: 'raider', count: 3, text: 'Clear raiders' },
            { type: 'talk', target: 'merchant_guild', text: 'Negotiate with merchants' },
            { type: 'choice', id: 'merchant_deal' }
        ],

        choices: {
            merchant_deal: {
                prompt: 'The merchants offer a deal. What terms do you accept?',
                options: [
                    {
                        id: 'fair_trade',
                        text: 'Fair prices for guaranteed volume',
                        consequence: 'Sustainable partnership',
                        outcomes: {
                            reputation: { asdf: 8 },
                            permanentBonus: { tradePrices: -0.08 }
                        }
                    },
                    {
                        id: 'burn_bonus',
                        text: 'Lower prices if we burn their competitor\'s tokens',
                        consequence: 'Aggressive business',
                        outcomes: {
                            reputation: { asdf: 13 },
                            permanentBonus: { tradePrices: -0.13 },
                            storyFlag: 'competitive_burner'
                        }
                    },
                    {
                        id: 'convert_merchants',
                        text: 'Convince them to join ASDF philosophy',
                        consequence: 'Expand the collective',
                        outcomes: {
                            reputation: { asdf: 21 },
                            unlockNpc: 'merchant_convert'
                        }
                    }
                ]
            }
        },

        xp: 350,
        tokens: 400,
        reputation: { asdf: 8 },
        nextQuest: 'asdf_3_3'
    }),

    asdf_3_3: createQuest({
        id: 'asdf_3_3',
        name: 'The Mole',
        faction: 'asdf',
        chapter: 3,
        description: 'Intelligence suggests there\'s a spy in ASDF.',
        minLevel: 12,
        requiresQuest: 'asdf_3_2',
        difficulty: 'HARD',

        objectives: [
            { type: 'talk', target: 'suspects', count: 4, text: 'Interview 4 suspects' },
            { type: 'collect', item: 'evidence', count: 3, text: 'Gather evidence' },
            { type: 'choice', id: 'mole_accusation' }
        ],

        choices: {
            mole_accusation: {
                prompt: 'Based on evidence, who do you accuse?',
                options: [
                    {
                        id: 'accuse_elder',
                        text: 'The elder with suspicious trades',
                        consequence: 'High risk if wrong',
                        statRequired: { int: 18 },
                        outcomes: {
                            correctAccusation: true,
                            reputation: { asdf: 34 },
                            title: 'Truthseeker',
                            items: ['spy_documents']
                        },
                        wrongOutcomes: {
                            reputation: { asdf: -21 },
                            storyFlag: 'false_accuser'
                        }
                    },
                    {
                        id: 'accuse_recruit',
                        text: 'The new recruit who asks too many questions',
                        consequence: 'Safe choice',
                        outcomes: {
                            correctAccusation: false,
                            reputation: { asdf: -13 },
                            storyFlag: 'wrong_target'
                        }
                    },
                    {
                        id: 'no_accusation',
                        text: 'Admit you need more evidence',
                        consequence: 'Honest but incomplete',
                        outcomes: {
                            reputation: { asdf: 5 },
                            unlockQuest: 'asdf_continued_investigation'
                        }
                    },
                    {
                        id: 'set_trap',
                        text: 'Set a trap with false information',
                        consequence: 'Clever approach',
                        statRequired: { int: 15, lck: 10 },
                        outcomes: {
                            correctAccusation: true,
                            reputation: { asdf: 21 },
                            stats: { int: 1 },
                            items: ['spy_documents']
                        }
                    }
                ]
            }
        },

        xp: 500,
        tokens: 350,
        reputation: { asdf: 13 },
        nextQuest: 'asdf_3_4'
    }),

    asdf_3_4: createQuest({
        id: 'asdf_3_4',
        name: 'Phoenix Rising',
        faction: 'asdf',
        chapter: 3,
        description: 'Unlock the legendary Phoenix Protocol.',
        minLevel: 12,
        requiresQuest: 'asdf_3_3',
        difficulty: 'HARD',

        objectives: [
            { type: 'collect', item: 'phoenix_essence', count: 5, text: 'Gather Phoenix Essences' },
            { type: 'battle', target: 'guardian_flame', text: 'Defeat the Guardian of Flame' },
            { type: 'burn', amount: 5000, text: 'The ultimate burn offering' },
            { type: 'choice', id: 'phoenix_blessing' }
        ],

        choices: {
            phoenix_blessing: {
                prompt: 'The Phoenix grants you one blessing:',
                options: [
                    {
                        id: 'rebirth',
                        text: 'Rebirth - Survive one fatal blow per battle',
                        consequence: 'Defensive blessing',
                        outcomes: {
                            permanentAbility: 'phoenix_rebirth',
                            storyFlag: 'phoenix_blessed_rebirth'
                        }
                    },
                    {
                        id: 'flames',
                        text: 'Flames - All attacks gain fire damage',
                        consequence: 'Offensive blessing',
                        outcomes: {
                            permanentAbility: 'phoenix_flames',
                            storyFlag: 'phoenix_blessed_flames'
                        }
                    },
                    {
                        id: 'ashes',
                        text: 'Ashes - Burns generate bonus rewards',
                        consequence: 'Economic blessing',
                        outcomes: {
                            permanentBonus: { burnRewards: 0.34 },
                            storyFlag: 'phoenix_blessed_ashes'
                        }
                    }
                ]
            }
        },

        xp: 700,
        tokens: 500,
        items: ['phoenix_feather_legendary', 'fire_card_epic'],
        reputation: { asdf: 21 },
        nextQuest: 'asdf_3_5'
    }),

    asdf_3_5: createQuest({
        id: 'asdf_3_5',
        name: 'Chapter 3 Finale: The Great Conflagration',
        faction: 'asdf',
        chapter: 3,
        description: 'Lead the assault on the Pump Lords\' stronghold.',
        minLevel: 13,
        requiresQuest: 'asdf_3_4',
        difficulty: 'EPIC',

        objectives: [
            { type: 'battle', target: 'pump_elite', count: 5, text: 'Defeat Pump Elite guards' },
            { type: 'battle', target: 'lord_pump', text: 'Face Lord Pump' },
            { type: 'choice', id: 'lord_pump_fate' }
        ],

        choices: {
            lord_pump_fate: {
                prompt: 'Lord Pump is defeated. What is his fate?',
                options: [
                    {
                        id: 'burn_everything',
                        text: 'Burn his entire treasury',
                        consequence: 'Ultimate destruction',
                        outcomes: {
                            reputation: { asdf: 55, pump_lords: -89 },
                            storyFlag: 'pump_treasury_burned',
                            marketEvent: 'massive_burn'
                        }
                    },
                    {
                        id: 'convert_treasury',
                        text: 'Convert his treasury to ASDF',
                        consequence: 'Practical victory',
                        outcomes: {
                            reputation: { asdf: 34, pump_lords: -55 },
                            tokens: 10000
                        }
                    },
                    {
                        id: 'offer_mercy',
                        text: 'Offer him a chance to reform',
                        consequence: 'Mercy in victory',
                        outcomes: {
                            reputation: { asdf: 21, pump_lords: -21 },
                            storyFlag: 'pump_lord_spared',
                            unlockQuest: 'pump_lord_redemption'
                        }
                    }
                ]
            }
        },

        xp: 1000,
        tokens: 1000,
        burnRewardTokens: 5000, // Énorme bonus burn finale Ch3
        items: ['badge_asdf_champion', 'asdf_phoenix_robe', 'eternal_flame'],
        reputation: { asdf: 34, pump_lords: -34 },
        unlocks: ['asdf_chapter_4'],
        storyFlags: ['asdf_chapter_3_complete'],
        nextQuest: 'asdf_4_1'
    }),

    // === CHAPTER 4: FACTION WARS (4 quests) ===
    asdf_4_1: createQuest({
        id: 'asdf_4_1',
        name: 'New Alliances',
        faction: 'asdf',
        chapter: 4,
        description: 'Forge alliances with other factions against common enemies.',
        minLevel: 14,
        requiresQuest: 'asdf_3_5',

        objectives: [
            { type: 'talk', target: 'safeyield_leader', text: 'Meet with SafeYield DAO' },
            { type: 'talk', target: 'builders_leader', text: 'Meet with Builders Guild' },
            { type: 'choice', id: 'alliance_priority' }
        ],

        choices: {
            alliance_priority: {
                prompt: 'Who should be our primary ally?',
                options: [
                    {
                        id: 'safeyield',
                        text: 'SafeYield DAO - Stability and resources',
                        consequence: 'Economic alliance',
                        outcomes: {
                            reputation: { safeyield: 21 },
                            permanentBonus: { passiveIncome: 0.08 }
                        }
                    },
                    {
                        id: 'builders',
                        text: 'Builders Guild - Technology and infrastructure',
                        consequence: 'Technical alliance',
                        outcomes: {
                            reputation: { builders_guild: 21 },
                            permanentBonus: { buildSpeed: 0.13 }
                        }
                    },
                    {
                        id: 'both_equal',
                        text: 'Equal alliance with both',
                        consequence: 'Diplomatic balance',
                        outcomes: {
                            reputation: { safeyield: 13, builders_guild: 13 }
                        }
                    }
                ]
            }
        },

        xp: 450,
        tokens: 400,
        reputation: { asdf: 8 },
        nextQuest: 'asdf_4_2'
    }),

    asdf_4_2: createQuest({
        id: 'asdf_4_2',
        name: 'Bear Clan Provocation',
        faction: 'asdf',
        chapter: 4,
        description: 'The Bear Clan sees an opportunity to attack.',
        minLevel: 14,
        requiresQuest: 'asdf_4_1',

        objectives: [
            { type: 'battle', target: 'bear_raider', count: 5, text: 'Repel Bear raiders' },
            { type: 'talk', target: 'bear_messenger', text: 'Receive their ultimatum' },
            { type: 'choice', id: 'bear_response' }
        ],

        choices: {
            bear_response: {
                prompt: 'The Bear Clan demands tribute. Your response?',
                options: [
                    {
                        id: 'defy',
                        text: 'Defy them openly',
                        consequence: 'War with Bear Clan',
                        outcomes: {
                            reputation: { asdf: 21, bear_clan: -55 },
                            storyFlag: 'bear_war',
                            unlockQuest: 'asdf_bear_war'
                        }
                    },
                    {
                        id: 'negotiate',
                        text: 'Counter-offer a trade agreement',
                        consequence: 'Diplomatic approach',
                        outcomes: {
                            reputation: { bear_clan: 8 },
                            storyFlag: 'bear_negotiation'
                        }
                    },
                    {
                        id: 'surprise_attack',
                        text: 'Launch a preemptive strike',
                        consequence: 'Aggressive move',
                        outcomes: {
                            reputation: { asdf: 13, bear_clan: -89 },
                            storyFlag: 'bear_preemptive',
                            battleRequired: true
                        }
                    }
                ]
            }
        },

        xp: 500,
        tokens: 350,
        reputation: { asdf: 13, bear_clan: -13 },
        nextQuest: 'asdf_4_3'
    }),

    asdf_4_3: createQuest({
        id: 'asdf_4_3',
        name: 'Internal Strife',
        faction: 'asdf',
        chapter: 4,
        description: 'A faction within ASDF challenges the current leadership.',
        minLevel: 15,
        requiresQuest: 'asdf_4_2',

        objectives: [
            { type: 'talk', target: 'rebel_leader', text: 'Meet with the dissident leader' },
            { type: 'talk', target: 'the_architect', text: 'Consult with The Architect' },
            { type: 'choice', id: 'internal_conflict' }
        ],

        choices: {
            internal_conflict: {
                prompt: 'The dissidents want faster, more radical action. Choose your side:',
                options: [
                    {
                        id: 'support_architect',
                        text: 'Support The Architect (stability)',
                        consequence: 'Maintain current leadership',
                        outcomes: {
                            reputation: { asdf: 21 },
                            storyFlag: 'architect_loyalist',
                            title: 'Architect\'s Hand'
                        }
                    },
                    {
                        id: 'support_rebels',
                        text: 'Support the dissidents (radical change)',
                        consequence: 'New leadership path',
                        outcomes: {
                            reputation: { asdf: 13 },
                            storyFlag: 'rebel_supporter',
                            unlockQuest: 'asdf_new_order'
                        }
                    },
                    {
                        id: 'unite_both',
                        text: 'Attempt to unite both sides',
                        consequence: 'Requires high charisma',
                        statRequired: { cha: 20 },
                        outcomes: {
                            reputation: { asdf: 34 },
                            storyFlag: 'asdf_unifier',
                            title: 'The Unifier'
                        }
                    }
                ]
            }
        },

        xp: 600,
        tokens: 400,
        reputation: { asdf: 13 },
        nextQuest: 'asdf_4_4'
    }),

    asdf_4_4: createQuest({
        id: 'asdf_4_4',
        name: 'Chapter 4 Finale: The Summit',
        faction: 'asdf',
        chapter: 4,
        description: 'All factions gather for a historic summit.',
        minLevel: 15,
        requiresQuest: 'asdf_4_3',
        difficulty: 'EPIC',

        objectives: [
            { type: 'talk', target: 'all_faction_leaders', text: 'Address all faction leaders' },
            { type: 'choice', id: 'summit_proposal' }
        ],

        choices: {
            summit_proposal: {
                prompt: 'The summit awaits your proposal for the future:',
                options: [
                    {
                        id: 'asdf_dominance',
                        text: 'ASDF philosophy should guide all factions',
                        consequence: 'Ambitious but divisive',
                        outcomes: {
                            reputation: { asdf: 55, pump_lords: -55, bear_clan: -34 },
                            storyFlag: 'asdf_supremacist'
                        }
                    },
                    {
                        id: 'coalition',
                        text: 'Form a coalition with shared governance',
                        consequence: 'Diplomatic unity',
                        outcomes: {
                            reputation: { asdf: 21, safeyield: 21, builders_guild: 21 },
                            storyFlag: 'coalition_founder',
                            unlockQuest: 'coalition_quest_chain'
                        }
                    },
                    {
                        id: 'separate_peace',
                        text: 'Let each faction go their own way',
                        consequence: 'Independence preserved',
                        outcomes: {
                            reputation: { asdf: 13 },
                            storyFlag: 'independence_advocate'
                        }
                    },
                    {
                        id: 'challenge_all',
                        text: 'Challenge all who oppose the flame',
                        consequence: 'War against all rivals',
                        outcomes: {
                            reputation: { asdf: 34, pump_lords: -89, bear_clan: -89 },
                            storyFlag: 'total_war',
                            difficulty: 'increased'
                        }
                    }
                ]
            }
        },

        xp: 800,
        tokens: 600,
        burnRewardTokens: 8000, // Bonus diplomatique burn
        items: ['asdf_burn_badge', 'phoenix_feather', 'phoenix_feather'],
        reputation: { asdf: 21 },
        unlocks: ['asdf_chapter_5'],
        storyFlags: ['asdf_chapter_4_complete'],
        nextQuest: 'asdf_5_1'
    }),

    // === CHAPTER 5: FINALE (2 quests with multiple endings) ===
    asdf_5_1: createQuest({
        id: 'asdf_5_1',
        name: 'The Final Burn',
        faction: 'asdf',
        chapter: 5,
        description: 'Prepare for the ultimate test of ASDF principles.',
        minLevel: 16,
        requiresQuest: 'asdf_4_4',
        difficulty: 'LEGENDARY',

        objectives: [
            { type: 'collect', item: 'legendary_essence', count: 5, text: 'Gather Legendary Essences' },
            { type: 'battle', target: 'final_boss_preview', text: 'Face the Shadow of Greed' },
            { type: 'burn', amount: 10000, text: 'The greatest burn ever recorded' }
        ],

        xp: 1500,
        tokens: 1000,
        items: ['pre_finale_badge'],
        reputation: { asdf: 21 },
        nextQuest: 'asdf_5_2'
    }),

    asdf_5_2: createQuest({
        id: 'asdf_5_2',
        name: 'Chapter 5 Finale: Eternal Flame',
        faction: 'asdf',
        chapter: 5,
        description: 'The culmination of your ASDF journey. Your choices define the ending.',
        minLevel: 17,
        requiresQuest: 'asdf_5_1',
        difficulty: 'LEGENDARY',

        objectives: [
            { type: 'battle', target: 'avatar_of_greed', text: 'Defeat the Avatar of Greed' },
            { type: 'choice', id: 'final_choice' }
        ],

        choices: {
            final_choice: {
                prompt: 'With ultimate power before you, what do you do?',
                options: [
                    {
                        id: 'burn_all_power',
                        text: 'Burn it all - even your own power',
                        consequence: 'ENDING: True Believer',
                        outcomes: {
                            ending: 'true_believer',
                            title: 'The Eternal Flame',
                            permanentBonus: { allStats: 5 },
                            storyFlag: 'ending_true_believer',
                            lore: 'You sacrificed everything for the cause. Your legend inspires generations.'
                        }
                    },
                    {
                        id: 'share_power',
                        text: 'Distribute the power equally to all',
                        consequence: 'ENDING: People\'s Champion',
                        outcomes: {
                            ending: 'peoples_champion',
                            title: 'The People\'s Flame',
                            permanentBonus: { reputation: 0.21 },
                            storyFlag: 'ending_peoples_champion',
                            lore: 'You chose community over self. The ASDF Collective flourishes under shared power.'
                        }
                    },
                    {
                        id: 'keep_power',
                        text: 'Keep the power to lead ASDF',
                        consequence: 'ENDING: Supreme Leader',
                        outcomes: {
                            ending: 'supreme_leader',
                            title: 'The Flame Lord',
                            permanentBonus: { atk: 13, def: 8 },
                            storyFlag: 'ending_supreme_leader',
                            lore: 'You took control. Whether for good or ill, ASDF now follows your will alone.'
                        }
                    }
                ]
            }
        },

        xp: 3000,
        tokens: 2000,
        burnRewardTokens: 21000, // Récompense ultime Fibonacci
        items: ['badge_asdf_legend', 'asdf_burning_crown', 'eternal_flame', 'eternal_flame'],
        reputation: { asdf: 89 },
        storyFlags: ['asdf_campaign_complete'],
        unlocks: ['new_game_plus']
    })
};

// ============================================================
// OTHER FACTION CAMPAIGNS (Abbreviated for size)
// Each has 20 quests following similar patterns
// ============================================================

const SAFEYIELD_CAMPAIGN = {
    // Chapter 1: Security Basics (5 quests)
    sy_1_1: createQuest({
        id: 'sy_1_1', name: 'Safe Haven', faction: 'safeyield', chapter: 1,
        description: 'Begin your journey with SafeYield DAO.',
        minLevel: 1, xp: 100, tokens: 50, nextQuest: 'sy_1_2',
        objectives: [{ type: 'talk', target: 'safeyield_intro', text: 'Meet SafeYield mentor' }]
    }),
    sy_1_2: createQuest({
        id: 'sy_1_2', name: 'Risk Assessment', faction: 'safeyield', chapter: 1,
        description: 'Learn to assess project risks.',
        minLevel: 1, requiresQuest: 'sy_1_1', xp: 120, tokens: 60, nextQuest: 'sy_1_3',
        objectives: [{ type: 'collect', item: 'risk_report', count: 3, text: 'Analyze 3 projects' }]
    }),
    sy_1_3: createQuest({
        id: 'sy_1_3', name: 'Insurance Pool', faction: 'safeyield', chapter: 1,
        description: 'Contribute to the insurance pool.',
        minLevel: 2, requiresQuest: 'sy_1_2', xp: 150, tokens: 80, nextQuest: 'sy_1_4',
        objectives: [{ type: 'trade', item: 'insurance_contribution', text: 'Make your contribution' }]
    }),
    sy_1_4: createQuest({
        id: 'sy_1_4', name: 'First Claim', faction: 'safeyield', chapter: 1,
        description: 'Process your first insurance claim.',
        minLevel: 2, requiresQuest: 'sy_1_3', xp: 180, tokens: 100, nextQuest: 'sy_1_5',
        objectives: [{ type: 'talk', target: 'claimant', text: 'Help a member with their claim' }]
    }),
    sy_1_5: createQuest({
        id: 'sy_1_5', name: 'Chapter 1 Finale: Audit Pass', faction: 'safeyield', chapter: 1,
        description: 'Pass the security audit.',
        minLevel: 3, requiresQuest: 'sy_1_4', difficulty: 'HARD',
        xp: 300, tokens: 200, nextQuest: 'sy_2_1',
        items: ['badge_safeyield_novice', 'safeyield_audit_gloves', 'shard_ice'],
        objectives: [
            { type: 'battle', target: 'vulnerability_bot', count: 3, text: 'Fix vulnerabilities' },
            { type: 'choice', id: 'audit_approach' }
        ],
        choices: {
            audit_approach: {
                prompt: 'How do you approach the final audit?',
                options: [
                    { id: 'thorough', text: 'Thorough review (takes longer)', consequence: '+21% security rating', outcomes: { stats: { def: 2 } } },
                    { id: 'efficient', text: 'Efficient review (faster)', consequence: 'Standard rating', outcomes: { tokens: 100 } },
                    { id: 'automated', text: 'Use automated tools', consequence: 'May miss edge cases', outcomes: { stats: { int: 1 } } }
                ]
            }
        }
    }),
    // Chapter 2-5: Abbreviated (15 more quests)
    sy_2_1: createQuest({ id: 'sy_2_1', name: 'Advanced Security', faction: 'safeyield', chapter: 2, minLevel: 4, requiresQuest: 'sy_1_5', xp: 200, tokens: 150, description: 'Learn advanced security protocols.' }),
    sy_2_2: createQuest({ id: 'sy_2_2', name: 'Whale Protection', faction: 'safeyield', chapter: 2, minLevel: 4, requiresQuest: 'sy_2_1', xp: 220, tokens: 170, description: 'Protect a large holder.' }),
    sy_2_3: createQuest({ id: 'sy_2_3', name: 'Flash Loan Defense', faction: 'safeyield', chapter: 2, minLevel: 5, requiresQuest: 'sy_2_2', xp: 250, tokens: 200, description: 'Defend against flash loan attacks.' }),
    sy_2_4: createQuest({ id: 'sy_2_4', name: 'Oracle Guardian', faction: 'safeyield', chapter: 2, minLevel: 5, requiresQuest: 'sy_2_3', xp: 280, tokens: 230, description: 'Protect the price oracles.' }),
    sy_2_5: createQuest({ id: 'sy_2_5', name: 'Chapter 2 Finale', faction: 'safeyield', chapter: 2, minLevel: 6, requiresQuest: 'sy_2_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['safeyield_vault_armor', 'shard_ice', 'shard_ice'], description: 'Prevent a major exploit.' }),
    sy_3_1: createQuest({ id: 'sy_3_1', name: 'Risk Manager', faction: 'safeyield', chapter: 3, minLevel: 7, requiresQuest: 'sy_2_5', xp: 350, tokens: 280, description: 'Become a risk manager.' }),
    sy_3_2: createQuest({ id: 'sy_3_2', name: 'Protocol Audit', faction: 'safeyield', chapter: 3, minLevel: 7, requiresQuest: 'sy_3_1', xp: 380, tokens: 300, description: 'Audit a new protocol.' }),
    sy_3_3: createQuest({ id: 'sy_3_3', name: 'Insurance Expansion', faction: 'safeyield', chapter: 3, minLevel: 8, requiresQuest: 'sy_3_2', xp: 400, tokens: 320, description: 'Expand insurance coverage.' }),
    sy_3_4: createQuest({ id: 'sy_3_4', name: 'Cross-Chain Security', faction: 'safeyield', chapter: 3, minLevel: 8, requiresQuest: 'sy_3_3', xp: 450, tokens: 350, description: 'Secure cross-chain bridges.' }),
    sy_3_5: createQuest({ id: 'sy_3_5', name: 'Chapter 3 Finale', faction: 'safeyield', chapter: 3, minLevel: 9, requiresQuest: 'sy_3_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['safeyield_shield_boots', 'essence_security'], description: 'Stop a coordinated attack.' }),
    sy_4_1: createQuest({ id: 'sy_4_1', name: 'Council Member', faction: 'safeyield', chapter: 4, minLevel: 10, requiresQuest: 'sy_3_5', xp: 500, tokens: 400, description: 'Join the governance council.' }),
    sy_4_2: createQuest({ id: 'sy_4_2', name: 'Emergency Response', faction: 'safeyield', chapter: 4, minLevel: 10, requiresQuest: 'sy_4_1', xp: 550, tokens: 450, description: 'Lead emergency response.' }),
    sy_4_3: createQuest({ id: 'sy_4_3', name: 'Chapter 4 Finale', faction: 'safeyield', chapter: 4, minLevel: 11, requiresQuest: 'sy_4_2', difficulty: 'EPIC', xp: 700, tokens: 600, items: ['safeyield_guardian_helm', 'badge_safeyield_guardian'], description: 'Defend against faction attack.' }),
    sy_5_1: createQuest({ id: 'sy_5_1', name: 'Ultimate Guardian', faction: 'safeyield', chapter: 5, minLevel: 12, requiresQuest: 'sy_4_3', xp: 800, tokens: 700, description: 'Prepare for the final test.' }),
    sy_5_2: createQuest({ id: 'sy_5_2', name: 'SafeYield Finale', faction: 'safeyield', chapter: 5, minLevel: 13, requiresQuest: 'sy_5_1', difficulty: 'LEGENDARY', xp: 1500, tokens: 1200, items: ['safeyield_ultimate_shield', 'core_guardian'], description: 'Become the ultimate guardian.' })
};

const PIXEL_RAIDERS_CAMPAIGN = {
    pr_1_1: createQuest({ id: 'pr_1_1', name: 'Enter the Arena', faction: 'pixel_raiders', chapter: 1, minLevel: 1, xp: 100, tokens: 50, description: 'Join the Pixel Raiders.' }),
    pr_1_2: createQuest({ id: 'pr_1_2', name: 'First NFT', faction: 'pixel_raiders', chapter: 1, minLevel: 1, requiresQuest: 'pr_1_1', xp: 120, tokens: 60, description: 'Mint your first gaming NFT.' }),
    pr_1_3: createQuest({ id: 'pr_1_3', name: 'Guild Battle', faction: 'pixel_raiders', chapter: 1, minLevel: 2, requiresQuest: 'pr_1_2', xp: 150, tokens: 80, description: 'Win your first guild battle.' }),
    pr_1_4: createQuest({ id: 'pr_1_4', name: 'Loot Share', faction: 'pixel_raiders', chapter: 1, minLevel: 2, requiresQuest: 'pr_1_3', xp: 180, tokens: 100, description: 'Distribute raid loot fairly.' }),
    pr_1_5: createQuest({ id: 'pr_1_5', name: 'Raid Boss', faction: 'pixel_raiders', chapter: 1, minLevel: 3, requiresQuest: 'pr_1_4', difficulty: 'HARD', xp: 300, tokens: 200, items: ['badge_pixel_gamer', 'pixel_gloves', 'shard_pixel'], description: 'Defeat the first raid boss.' }),
    pr_2_1: createQuest({ id: 'pr_2_1', name: 'Tournament Entry', faction: 'pixel_raiders', chapter: 2, minLevel: 4, requiresQuest: 'pr_1_5', xp: 200, tokens: 150, description: 'Enter the grand tournament.' }),
    pr_2_2: createQuest({ id: 'pr_2_2', name: 'Team Building', faction: 'pixel_raiders', chapter: 2, minLevel: 4, requiresQuest: 'pr_2_1', xp: 220, tokens: 170, description: 'Build your raid team.' }),
    pr_2_3: createQuest({ id: 'pr_2_3', name: 'Legendary Drop', faction: 'pixel_raiders', chapter: 2, minLevel: 5, requiresQuest: 'pr_2_2', xp: 250, tokens: 200, description: 'Find a legendary item.' }),
    pr_2_4: createQuest({ id: 'pr_2_4', name: 'Guild Wars', faction: 'pixel_raiders', chapter: 2, minLevel: 5, requiresQuest: 'pr_2_3', xp: 280, tokens: 230, description: 'Compete in guild wars.' }),
    pr_2_5: createQuest({ id: 'pr_2_5', name: 'Chapter 2 Finale', faction: 'pixel_raiders', chapter: 2, minLevel: 6, requiresQuest: 'pr_2_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['pixel_armor', 'shard_pixel', 'shard_pixel'], description: 'Win the tournament.' }),
    pr_3_1: createQuest({ id: 'pr_3_1', name: 'World Boss', faction: 'pixel_raiders', chapter: 3, minLevel: 7, requiresQuest: 'pr_2_5', xp: 350, tokens: 280, description: 'Challenge a world boss.' }),
    pr_3_2: createQuest({ id: 'pr_3_2', name: 'Metaverse Expansion', faction: 'pixel_raiders', chapter: 3, minLevel: 7, requiresQuest: 'pr_3_1', xp: 380, tokens: 300, description: 'Expand to new metaverses.' }),
    pr_3_3: createQuest({ id: 'pr_3_3', name: 'Play to Earn', faction: 'pixel_raiders', chapter: 3, minLevel: 8, requiresQuest: 'pr_3_2', xp: 400, tokens: 320, description: 'Maximize earning potential.' }),
    pr_3_4: createQuest({ id: 'pr_3_4', name: 'Asset Trading', faction: 'pixel_raiders', chapter: 3, minLevel: 8, requiresQuest: 'pr_3_3', xp: 450, tokens: 350, description: 'Master asset trading.' }),
    pr_3_5: createQuest({ id: 'pr_3_5', name: 'Chapter 3 Finale', faction: 'pixel_raiders', chapter: 3, minLevel: 9, requiresQuest: 'pr_3_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['pixel_boots', 'essence_gaming'], description: 'Become a renowned raider.' }),
    pr_4_1: createQuest({ id: 'pr_4_1', name: 'Guild Master', faction: 'pixel_raiders', chapter: 4, minLevel: 10, requiresQuest: 'pr_3_5', xp: 500, tokens: 400, description: 'Lead your own guild.' }),
    pr_4_2: createQuest({ id: 'pr_4_2', name: 'Inter-Game Alliance', faction: 'pixel_raiders', chapter: 4, minLevel: 10, requiresQuest: 'pr_4_1', xp: 550, tokens: 450, description: 'Form cross-game alliances.' }),
    pr_4_3: createQuest({ id: 'pr_4_3', name: 'Chapter 4 Finale', faction: 'pixel_raiders', chapter: 4, minLevel: 11, requiresQuest: 'pr_4_2', difficulty: 'EPIC', xp: 700, tokens: 600, items: ['pixel_crown', 'badge_pixel_master'], description: 'Unite the gaming guilds.' }),
    pr_5_1: createQuest({ id: 'pr_5_1', name: 'Ultimate Raid', faction: 'pixel_raiders', chapter: 5, minLevel: 12, requiresQuest: 'pr_4_3', xp: 800, tokens: 700, description: 'Prepare for the ultimate raid.' }),
    pr_5_2: createQuest({ id: 'pr_5_2', name: 'Pixel Raiders Finale', faction: 'pixel_raiders', chapter: 5, minLevel: 13, requiresQuest: 'pr_5_1', difficulty: 'LEGENDARY', xp: 1500, tokens: 1200, items: ['pixel_legendary_controller', 'core_gaming'], description: 'Conquer the final realm.' })
};

const BASED_COLLECTIVE_CAMPAIGN = {
    bc_1_1: createQuest({ id: 'bc_1_1', name: 'Stay Based', faction: 'based_collective', chapter: 1, minLevel: 1, xp: 100, tokens: 50, description: 'Learn the Based philosophy.' }),
    bc_1_2: createQuest({ id: 'bc_1_2', name: 'Cut the Hype', faction: 'based_collective', chapter: 1, minLevel: 1, requiresQuest: 'bc_1_1', xp: 120, tokens: 60, description: 'Identify and call out hype.' }),
    bc_1_3: createQuest({ id: 'bc_1_3', name: 'Authentic Voice', faction: 'based_collective', chapter: 1, minLevel: 2, requiresQuest: 'bc_1_2', xp: 150, tokens: 80, description: 'Find your authentic voice.' }),
    bc_1_4: createQuest({ id: 'bc_1_4', name: 'Community Truth', faction: 'based_collective', chapter: 1, minLevel: 2, requiresQuest: 'bc_1_3', xp: 180, tokens: 100, description: 'Share uncomfortable truths.' }),
    bc_1_5: createQuest({ id: 'bc_1_5', name: 'Based Initiation', faction: 'based_collective', chapter: 1, minLevel: 3, requiresQuest: 'bc_1_4', difficulty: 'HARD', xp: 300, tokens: 200, items: ['badge_based_authentic', 'based_visor', 'shard_truth'], description: 'Complete your initiation.' }),
    bc_2_1: createQuest({ id: 'bc_2_1', name: 'Hype Buster', faction: 'based_collective', chapter: 2, minLevel: 4, requiresQuest: 'bc_1_5', xp: 200, tokens: 150, description: 'Expose a major hype project.' }),
    bc_2_2: createQuest({ id: 'bc_2_2', name: 'Real Value', faction: 'based_collective', chapter: 2, minLevel: 4, requiresQuest: 'bc_2_1', xp: 220, tokens: 170, description: 'Identify projects with real value.' }),
    bc_2_3: createQuest({ id: 'bc_2_3', name: 'Counter Narrative', faction: 'based_collective', chapter: 2, minLevel: 5, requiresQuest: 'bc_2_2', xp: 250, tokens: 200, description: 'Create a counter-narrative.' }),
    bc_2_4: createQuest({ id: 'bc_2_4', name: 'Based Network', faction: 'based_collective', chapter: 2, minLevel: 5, requiresQuest: 'bc_2_3', xp: 280, tokens: 230, description: 'Build a network of truth-tellers.' }),
    bc_2_5: createQuest({ id: 'bc_2_5', name: 'Chapter 2 Finale', faction: 'based_collective', chapter: 2, minLevel: 6, requiresQuest: 'bc_2_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['based_jacket', 'shard_truth', 'shard_truth'], description: 'Take down a major scam.' }),
    bc_3_1: createQuest({ id: 'bc_3_1', name: 'Truth Campaign', faction: 'based_collective', chapter: 3, minLevel: 7, requiresQuest: 'bc_2_5', xp: 350, tokens: 280, description: 'Launch a truth campaign.' }),
    bc_3_2: createQuest({ id: 'bc_3_2', name: 'Pump Lords Clash', faction: 'based_collective', chapter: 3, minLevel: 7, requiresQuest: 'bc_3_1', xp: 380, tokens: 300, description: 'Confront the Pump Lords.' }),
    bc_3_3: createQuest({ id: 'bc_3_3', name: 'Community Defense', faction: 'based_collective', chapter: 3, minLevel: 8, requiresQuest: 'bc_3_2', xp: 400, tokens: 320, description: 'Defend the community from FUD.' }),
    bc_3_4: createQuest({ id: 'bc_3_4', name: 'Based Journalism', faction: 'based_collective', chapter: 3, minLevel: 8, requiresQuest: 'bc_3_3', xp: 450, tokens: 350, description: 'Practice based journalism.' }),
    bc_3_5: createQuest({ id: 'bc_3_5', name: 'Chapter 3 Finale', faction: 'based_collective', chapter: 3, minLevel: 9, requiresQuest: 'bc_3_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['based_boots', 'essence_truth'], description: 'Expose a systemic fraud.' }),
    bc_4_1: createQuest({ id: 'bc_4_1', name: 'Based Leader', faction: 'based_collective', chapter: 4, minLevel: 10, requiresQuest: 'bc_3_5', xp: 500, tokens: 400, description: 'Become a Based leader.' }),
    bc_4_2: createQuest({ id: 'bc_4_2', name: 'Alliance of Truth', faction: 'based_collective', chapter: 4, minLevel: 10, requiresQuest: 'bc_4_1', xp: 550, tokens: 450, description: 'Form alliances with truth-seekers.' }),
    bc_4_3: createQuest({ id: 'bc_4_3', name: 'Chapter 4 Finale', faction: 'based_collective', chapter: 4, minLevel: 11, requiresQuest: 'bc_4_2', difficulty: 'EPIC', xp: 700, tokens: 600, items: ['based_crown', 'badge_based_legend'], description: 'Lead a truth revolution.' }),
    bc_5_1: createQuest({ id: 'bc_5_1', name: 'Ultimate Truth', faction: 'based_collective', chapter: 5, minLevel: 12, requiresQuest: 'bc_4_3', xp: 800, tokens: 700, description: 'Prepare to reveal the ultimate truth.' }),
    bc_5_2: createQuest({ id: 'bc_5_2', name: 'Based Finale', faction: 'based_collective', chapter: 5, minLevel: 13, requiresQuest: 'bc_5_1', difficulty: 'LEGENDARY', xp: 1500, tokens: 1200, items: ['based_legendary_mic', 'core_truth'], description: 'Become the Voice of Truth.' })
};

const NODEFORGE_CAMPAIGN = {
    nf_1_1: createQuest({ id: 'nf_1_1', name: 'Code Initiate', faction: 'nodeforge', chapter: 1, minLevel: 1, xp: 100, tokens: 50, description: 'Start your NodeForge journey.' }),
    nf_1_2: createQuest({ id: 'nf_1_2', name: 'First Optimization', faction: 'nodeforge', chapter: 1, minLevel: 1, requiresQuest: 'nf_1_1', xp: 120, tokens: 60, description: 'Optimize your first function.' }),
    nf_1_3: createQuest({ id: 'nf_1_3', name: 'Gas Efficiency', faction: 'nodeforge', chapter: 1, minLevel: 2, requiresQuest: 'nf_1_2', xp: 150, tokens: 80, description: 'Learn gas optimization.' }),
    nf_1_4: createQuest({ id: 'nf_1_4', name: 'Node Setup', faction: 'nodeforge', chapter: 1, minLevel: 2, requiresQuest: 'nf_1_3', xp: 180, tokens: 100, description: 'Set up your first node.' }),
    nf_1_5: createQuest({ id: 'nf_1_5', name: 'Code Review', faction: 'nodeforge', chapter: 1, minLevel: 3, requiresQuest: 'nf_1_4', difficulty: 'HARD', xp: 300, tokens: 200, items: ['badge_nodeforge_dev', 'nodeforge_gloves', 'shard_code'], description: 'Pass the code review.' }),
    nf_2_1: createQuest({ id: 'nf_2_1', name: 'Protocol Design', faction: 'nodeforge', chapter: 2, minLevel: 4, requiresQuest: 'nf_1_5', xp: 200, tokens: 150, description: 'Design a protocol improvement.' }),
    nf_2_2: createQuest({ id: 'nf_2_2', name: 'Network Analysis', faction: 'nodeforge', chapter: 2, minLevel: 4, requiresQuest: 'nf_2_1', xp: 220, tokens: 170, description: 'Analyze network performance.' }),
    nf_2_3: createQuest({ id: 'nf_2_3', name: 'Scaling Solution', faction: 'nodeforge', chapter: 2, minLevel: 5, requiresQuest: 'nf_2_2', xp: 250, tokens: 200, description: 'Develop a scaling solution.' }),
    nf_2_4: createQuest({ id: 'nf_2_4', name: 'Security Audit', faction: 'nodeforge', chapter: 2, minLevel: 5, requiresQuest: 'nf_2_3', xp: 280, tokens: 230, description: 'Conduct a security audit.' }),
    nf_2_5: createQuest({ id: 'nf_2_5', name: 'Chapter 2 Finale', faction: 'nodeforge', chapter: 2, minLevel: 6, requiresQuest: 'nf_2_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['nodeforge_vest', 'shard_code', 'shard_code'], description: 'Deploy your optimization.' }),
    nf_3_1: createQuest({ id: 'nf_3_1', name: 'Core Developer', faction: 'nodeforge', chapter: 3, minLevel: 7, requiresQuest: 'nf_2_5', xp: 350, tokens: 280, description: 'Become a core developer.' }),
    nf_3_2: createQuest({ id: 'nf_3_2', name: 'Zero Knowledge', faction: 'nodeforge', chapter: 3, minLevel: 7, requiresQuest: 'nf_3_1', xp: 380, tokens: 300, description: 'Master ZK proofs.' }),
    nf_3_3: createQuest({ id: 'nf_3_3', name: 'Cross-Chain Bridge', faction: 'nodeforge', chapter: 3, minLevel: 8, requiresQuest: 'nf_3_2', xp: 400, tokens: 320, description: 'Build a cross-chain bridge.' }),
    nf_3_4: createQuest({ id: 'nf_3_4', name: 'MEV Protection', faction: 'nodeforge', chapter: 3, minLevel: 8, requiresQuest: 'nf_3_3', xp: 450, tokens: 350, description: 'Implement MEV protection.' }),
    nf_3_5: createQuest({ id: 'nf_3_5', name: 'Chapter 3 Finale', faction: 'nodeforge', chapter: 3, minLevel: 9, requiresQuest: 'nf_3_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['nodeforge_boots', 'essence_code'], description: 'Complete a major upgrade.' }),
    nf_4_1: createQuest({ id: 'nf_4_1', name: 'Lead Developer', faction: 'nodeforge', chapter: 4, minLevel: 10, requiresQuest: 'nf_3_5', xp: 500, tokens: 400, description: 'Lead a development team.' }),
    nf_4_2: createQuest({ id: 'nf_4_2', name: 'Protocol Council', faction: 'nodeforge', chapter: 4, minLevel: 10, requiresQuest: 'nf_4_1', xp: 550, tokens: 450, description: 'Join the protocol council.' }),
    nf_4_3: createQuest({ id: 'nf_4_3', name: 'Chapter 4 Finale', faction: 'nodeforge', chapter: 4, minLevel: 11, requiresQuest: 'nf_4_2', difficulty: 'EPIC', xp: 700, tokens: 600, items: ['nodeforge_helmet', 'badge_nodeforge_architect'], description: 'Defend against a network attack.' }),
    nf_5_1: createQuest({ id: 'nf_5_1', name: 'Architect Role', faction: 'nodeforge', chapter: 5, minLevel: 12, requiresQuest: 'nf_4_3', xp: 800, tokens: 700, description: 'Prepare for the architect role.' }),
    nf_5_2: createQuest({ id: 'nf_5_2', name: 'NodeForge Finale', faction: 'nodeforge', chapter: 5, minLevel: 13, requiresQuest: 'nf_5_1', difficulty: 'LEGENDARY', xp: 1500, tokens: 1200, items: ['nodeforge_legendary_keyboard', 'core_code'], description: 'Become the Master Architect.' })
};

const PUMP_LORDS_CAMPAIGN = {
    pl_1_1: createQuest({ id: 'pl_1_1', name: 'Number Go Up', faction: 'pump_lords', chapter: 1, minLevel: 1, xp: 100, tokens: 50, description: 'Learn the Pump philosophy.' }),
    pl_1_2: createQuest({ id: 'pl_1_2', name: 'First Pump', faction: 'pump_lords', chapter: 1, minLevel: 1, requiresQuest: 'pl_1_1', xp: 120, tokens: 60, description: 'Execute your first pump.' }),
    pl_1_3: createQuest({ id: 'pl_1_3', name: 'Shill Training', faction: 'pump_lords', chapter: 1, minLevel: 2, requiresQuest: 'pl_1_2', xp: 150, tokens: 80, description: 'Master the art of shilling.' }),
    pl_1_4: createQuest({ id: 'pl_1_4', name: 'FOMO Creation', faction: 'pump_lords', chapter: 1, minLevel: 2, requiresQuest: 'pl_1_3', xp: 180, tokens: 100, description: 'Create FOMO effectively.' }),
    pl_1_5: createQuest({ id: 'pl_1_5', name: 'Pump Initiation', faction: 'pump_lords', chapter: 1, minLevel: 3, requiresQuest: 'pl_1_4', difficulty: 'HARD', xp: 300, tokens: 200, items: ['pump_visor', 'shard_pump'], description: 'Complete your initiation.' }),
    pl_2_1: createQuest({ id: 'pl_2_1', name: 'Whale Hunting', faction: 'pump_lords', chapter: 2, minLevel: 4, requiresQuest: 'pl_1_5', xp: 200, tokens: 150, description: 'Attract whale investors.' }),
    pl_2_2: createQuest({ id: 'pl_2_2', name: 'Chart Manipulation', faction: 'pump_lords', chapter: 2, minLevel: 4, requiresQuest: 'pl_2_1', xp: 220, tokens: 170, description: 'Learn chart patterns.' }),
    pl_2_3: createQuest({ id: 'pl_2_3', name: 'Influencer Network', faction: 'pump_lords', chapter: 2, minLevel: 5, requiresQuest: 'pl_2_2', xp: 250, tokens: 200, description: 'Build an influencer network.' }),
    pl_2_4: createQuest({ id: 'pl_2_4', name: 'Coordinated Pump', faction: 'pump_lords', chapter: 2, minLevel: 5, requiresQuest: 'pl_2_3', xp: 280, tokens: 230, description: 'Execute a coordinated pump.' }),
    pl_2_5: createQuest({ id: 'pl_2_5', name: 'Chapter 2 Finale', faction: 'pump_lords', chapter: 2, minLevel: 6, requiresQuest: 'pl_2_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['pump_suit', 'shard_pump', 'shard_pump'], description: '100x a token.' }),
    pl_3_1: createQuest({ id: 'pl_3_1', name: 'Market Maker', faction: 'pump_lords', chapter: 3, minLevel: 7, requiresQuest: 'pl_2_5', xp: 350, tokens: 280, description: 'Become a market maker.' }),
    pl_3_2: createQuest({ id: 'pl_3_2', name: 'ASDF Sabotage', faction: 'pump_lords', chapter: 3, minLevel: 7, requiresQuest: 'pl_3_1', xp: 380, tokens: 300, description: 'Sabotage the ASDF.' }),
    pl_3_3: createQuest({ id: 'pl_3_3', name: 'Pump Empire', faction: 'pump_lords', chapter: 3, minLevel: 8, requiresQuest: 'pl_3_2', xp: 400, tokens: 320, description: 'Build your pump empire.' }),
    pl_3_4: createQuest({ id: 'pl_3_4', name: 'Dump Planning', faction: 'pump_lords', chapter: 3, minLevel: 8, requiresQuest: 'pl_3_3', xp: 450, tokens: 350, description: 'Plan the perfect dump.' }),
    pl_3_5: createQuest({ id: 'pl_3_5', name: 'Chapter 3 Finale', faction: 'pump_lords', chapter: 3, minLevel: 9, requiresQuest: 'pl_3_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['pump_boots', 'essence_pump'], description: 'Massive pump and dump.' }),
    pl_4_1: createQuest({ id: 'pl_4_1', name: 'Lord Status', faction: 'pump_lords', chapter: 4, minLevel: 10, requiresQuest: 'pl_3_5', xp: 500, tokens: 400, description: 'Achieve Lord status.' }),
    pl_4_2: createQuest({ id: 'pl_4_2', name: 'Market Control', faction: 'pump_lords', chapter: 4, minLevel: 10, requiresQuest: 'pl_4_1', xp: 550, tokens: 450, description: 'Control a market segment.' }),
    pl_4_3: createQuest({ id: 'pl_4_3', name: 'Chapter 4 Finale', faction: 'pump_lords', chapter: 4, minLevel: 11, requiresQuest: 'pl_4_2', difficulty: 'EPIC', xp: 700, tokens: 600, items: ['pump_crown', 'core_pump'], description: 'Face the ASDF in open war.' }),
    pl_5_1: createQuest({ id: 'pl_5_1', name: 'Supreme Lord', faction: 'pump_lords', chapter: 5, minLevel: 12, requiresQuest: 'pl_4_3', xp: 800, tokens: 700, description: 'Prepare for ultimate power.' }),
    pl_5_2: createQuest({ id: 'pl_5_2', name: 'Pump Lords Finale', faction: 'pump_lords', chapter: 5, minLevel: 13, requiresQuest: 'pl_5_1', difficulty: 'LEGENDARY', xp: 1500, tokens: 1200, items: ['pump_legendary_scepter'], description: 'Become the Supreme Pump Lord.' })
};

const BEAR_CLAN_CAMPAIGN = {
    br_1_1: createQuest({ id: 'br_1_1', name: 'Cash Is King', faction: 'bear_clan', chapter: 1, minLevel: 1, xp: 100, tokens: 50, description: 'Learn Bear philosophy.' }),
    br_1_2: createQuest({ id: 'br_1_2', name: 'First Short', faction: 'bear_clan', chapter: 1, minLevel: 1, requiresQuest: 'br_1_1', xp: 120, tokens: 60, description: 'Execute your first short.' }),
    br_1_3: createQuest({ id: 'br_1_3', name: 'Risk Management', faction: 'bear_clan', chapter: 1, minLevel: 2, requiresQuest: 'br_1_2', xp: 150, tokens: 80, description: 'Master risk management.' }),
    br_1_4: createQuest({ id: 'br_1_4', name: 'Market Cycles', faction: 'bear_clan', chapter: 1, minLevel: 2, requiresQuest: 'br_1_3', xp: 180, tokens: 100, description: 'Understand market cycles.' }),
    br_1_5: createQuest({ id: 'br_1_5', name: 'Bear Initiation', faction: 'bear_clan', chapter: 1, minLevel: 3, requiresQuest: 'br_1_4', difficulty: 'HARD', xp: 300, tokens: 200, items: ['bear_visor', 'shard_bear'], description: 'Complete your initiation.' }),
    br_2_1: createQuest({ id: 'br_2_1', name: 'Hedge Strategy', faction: 'bear_clan', chapter: 2, minLevel: 4, requiresQuest: 'br_1_5', xp: 200, tokens: 150, description: 'Develop hedge strategies.' }),
    br_2_2: createQuest({ id: 'br_2_2', name: 'Bear Raid', faction: 'bear_clan', chapter: 2, minLevel: 4, requiresQuest: 'br_2_1', xp: 220, tokens: 170, description: 'Participate in a bear raid.' }),
    br_2_3: createQuest({ id: 'br_2_3', name: 'Market Intelligence', faction: 'bear_clan', chapter: 2, minLevel: 5, requiresQuest: 'br_2_2', xp: 250, tokens: 200, description: 'Gather market intelligence.' }),
    br_2_4: createQuest({ id: 'br_2_4', name: 'Crash Prediction', faction: 'bear_clan', chapter: 2, minLevel: 5, requiresQuest: 'br_2_3', xp: 280, tokens: 230, description: 'Predict market crashes.' }),
    br_2_5: createQuest({ id: 'br_2_5', name: 'Chapter 2 Finale', faction: 'bear_clan', chapter: 2, minLevel: 6, requiresQuest: 'br_2_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['bear_jacket', 'shard_bear', 'shard_bear'], description: 'Profit from a major crash.' }),
    br_3_1: createQuest({ id: 'br_3_1', name: 'Bear General', faction: 'bear_clan', chapter: 3, minLevel: 7, requiresQuest: 'br_2_5', xp: 350, tokens: 280, description: 'Become a Bear General.' }),
    br_3_2: createQuest({ id: 'br_3_2', name: 'Bull Hunter', faction: 'bear_clan', chapter: 3, minLevel: 7, requiresQuest: 'br_3_1', xp: 380, tokens: 300, description: 'Hunt overconfident bulls.' }),
    br_3_3: createQuest({ id: 'br_3_3', name: 'Market Manipulation', faction: 'bear_clan', chapter: 3, minLevel: 8, requiresQuest: 'br_3_2', xp: 400, tokens: 320, description: 'Learn market manipulation.' }),
    br_3_4: createQuest({ id: 'br_3_4', name: 'FUD Campaign', faction: 'bear_clan', chapter: 3, minLevel: 8, requiresQuest: 'br_3_3', xp: 450, tokens: 350, description: 'Run a FUD campaign.' }),
    br_3_5: createQuest({ id: 'br_3_5', name: 'Chapter 3 Finale', faction: 'bear_clan', chapter: 3, minLevel: 9, requiresQuest: 'br_3_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['bear_boots', 'essence_bear'], description: 'Engineer a market crash.' }),
    br_4_1: createQuest({ id: 'br_4_1', name: 'Clan Elder', faction: 'bear_clan', chapter: 4, minLevel: 10, requiresQuest: 'br_3_5', xp: 500, tokens: 400, description: 'Become a Clan Elder.' }),
    br_4_2: createQuest({ id: 'br_4_2', name: 'Crypto Winter', faction: 'bear_clan', chapter: 4, minLevel: 10, requiresQuest: 'br_4_1', xp: 550, tokens: 450, description: 'Prepare for crypto winter.' }),
    br_4_3: createQuest({ id: 'br_4_3', name: 'Chapter 4 Finale', faction: 'bear_clan', chapter: 4, minLevel: 11, requiresQuest: 'br_4_2', difficulty: 'EPIC', xp: 700, tokens: 600, items: ['bear_crown', 'core_bear'], description: 'Dominate the bear market.' }),
    br_5_1: createQuest({ id: 'br_5_1', name: 'Bear Mother', faction: 'bear_clan', chapter: 5, minLevel: 12, requiresQuest: 'br_4_3', xp: 800, tokens: 700, description: 'Prepare for leadership.' }),
    br_5_2: createQuest({ id: 'br_5_2', name: 'Bear Clan Finale', faction: 'bear_clan', chapter: 5, minLevel: 13, requiresQuest: 'br_5_1', difficulty: 'LEGENDARY', xp: 1500, tokens: 1200, items: ['bear_legendary_cloak'], description: 'Become the Bear Mother.' })
};

const BUILDERS_GUILD_CAMPAIGN = {
    bg_1_1: createQuest({ id: 'bg_1_1', name: 'First Commit', faction: 'builders_guild', chapter: 1, minLevel: 10, xp: 200, tokens: 150, description: 'Make your first contribution.' }),
    bg_1_2: createQuest({ id: 'bg_1_2', name: 'Code Standards', faction: 'builders_guild', chapter: 1, minLevel: 10, requiresQuest: 'bg_1_1', xp: 220, tokens: 170, description: 'Learn guild coding standards.' }),
    bg_1_3: createQuest({ id: 'bg_1_3', name: 'Pull Request', faction: 'builders_guild', chapter: 1, minLevel: 11, requiresQuest: 'bg_1_2', xp: 250, tokens: 200, description: 'Get a PR approved.' }),
    bg_1_4: createQuest({ id: 'bg_1_4', name: 'Documentation', faction: 'builders_guild', chapter: 1, minLevel: 11, requiresQuest: 'bg_1_3', xp: 280, tokens: 230, description: 'Write comprehensive docs.' }),
    bg_1_5: createQuest({ id: 'bg_1_5', name: 'Ship It', faction: 'builders_guild', chapter: 1, minLevel: 12, requiresQuest: 'bg_1_4', difficulty: 'HARD', xp: 400, tokens: 300, items: ['badge_builders_apprentice', 'builders_gloves', 'shard_code'], description: 'Ship your first feature.' }),
    bg_2_1: createQuest({ id: 'bg_2_1', name: 'Open Source', faction: 'builders_guild', chapter: 2, minLevel: 12, requiresQuest: 'bg_1_5', xp: 350, tokens: 280, description: 'Contribute to open source.' }),
    bg_2_2: createQuest({ id: 'bg_2_2', name: 'Protocol Improvement', faction: 'builders_guild', chapter: 2, minLevel: 13, requiresQuest: 'bg_2_1', xp: 380, tokens: 300, description: 'Propose a protocol improvement.' }),
    bg_2_3: createQuest({ id: 'bg_2_3', name: 'Team Leadership', faction: 'builders_guild', chapter: 2, minLevel: 13, requiresQuest: 'bg_2_2', xp: 400, tokens: 320, description: 'Lead a development team.' }),
    bg_2_4: createQuest({ id: 'bg_2_4', name: 'Architecture Review', faction: 'builders_guild', chapter: 2, minLevel: 14, requiresQuest: 'bg_2_3', xp: 450, tokens: 350, description: 'Conduct architecture reviews.' }),
    bg_2_5: createQuest({ id: 'bg_2_5', name: 'Chapter 2 Finale', faction: 'builders_guild', chapter: 2, minLevel: 14, requiresQuest: 'bg_2_4', difficulty: 'EPIC', xp: 600, tokens: 500, items: ['builders_vest', 'shard_code', 'shard_code'], description: 'Complete a major project.' }),
    bg_3_1: createQuest({ id: 'bg_3_1', name: 'Guild Council', faction: 'builders_guild', chapter: 3, minLevel: 15, requiresQuest: 'bg_2_5', xp: 500, tokens: 400, description: 'Join the Guild Council.' }),
    bg_3_2: createQuest({ id: 'bg_3_2', name: 'Mentorship Program', faction: 'builders_guild', chapter: 3, minLevel: 15, requiresQuest: 'bg_3_1', xp: 550, tokens: 450, description: 'Mentor new builders.' }),
    bg_3_3: createQuest({ id: 'bg_3_3', name: 'Innovation Grant', faction: 'builders_guild', chapter: 3, minLevel: 16, requiresQuest: 'bg_3_2', xp: 600, tokens: 500, description: 'Award innovation grants.' }),
    bg_3_4: createQuest({ id: 'bg_3_4', name: 'Public Goods', faction: 'builders_guild', chapter: 3, minLevel: 16, requiresQuest: 'bg_3_3', xp: 650, tokens: 550, description: 'Build public goods.' }),
    bg_3_5: createQuest({ id: 'bg_3_5', name: 'Chapter 3 Finale', faction: 'builders_guild', chapter: 3, minLevel: 17, requiresQuest: 'bg_3_4', difficulty: 'EPIC', xp: 800, tokens: 700, items: ['builders_boots', 'essence_code'], description: 'Revolutionize the ecosystem.' }),
    bg_4_1: createQuest({ id: 'bg_4_1', name: 'Master Builder', faction: 'builders_guild', chapter: 4, minLevel: 17, requiresQuest: 'bg_3_5', xp: 700, tokens: 600, description: 'Achieve Master Builder status.' }),
    bg_4_2: createQuest({ id: 'bg_4_2', name: 'Legacy Project', faction: 'builders_guild', chapter: 4, minLevel: 18, requiresQuest: 'bg_4_1', xp: 750, tokens: 650, description: 'Start your legacy project.' }),
    bg_4_3: createQuest({ id: 'bg_4_3', name: 'Chapter 4 Finale', faction: 'builders_guild', chapter: 4, minLevel: 18, requiresQuest: 'bg_4_2', difficulty: 'LEGENDARY', xp: 1000, tokens: 800, items: ['builders_helmet', 'badge_builders_master', 'core_code'], description: 'Complete your masterwork.' }),
    bg_5_1: createQuest({ id: 'bg_5_1', name: 'Guild Leader', faction: 'builders_guild', chapter: 5, minLevel: 19, requiresQuest: 'bg_4_3', xp: 1200, tokens: 1000, description: 'Prepare for guild leadership.' }),
    bg_5_2: createQuest({ id: 'bg_5_2', name: 'Builders Finale', faction: 'builders_guild', chapter: 5, minLevel: 20, requiresQuest: 'bg_5_1', difficulty: 'LEGENDARY', xp: 2000, tokens: 1500, items: ['builders_legendary_blueprint'], description: 'Become the Grand Architect.' })
};

// ============================================================
// SIDE QUESTS (20 universal quests)
// ============================================================

const SIDE_QUESTS = {
    sq_tutorial_combat: createQuest({
        id: 'sq_tutorial_combat', name: 'Combat Tutorial', type: 'side',
        description: 'Learn the basics of tactical grid combat.',
        minLevel: 1, xp: 50, tokens: 25,
        objectives: [{ type: 'battle', target: 'training_dummy', text: 'Complete combat training' }]
    }),
    sq_first_creature: createQuest({
        id: 'sq_first_creature', name: 'First Companion', type: 'side',
        description: 'Find your first creature companion.',
        minLevel: 2, xp: 100, tokens: 50,
        objectives: [{ type: 'explore', location: 'forest_edge', text: 'Search the forest' }]
    }),
    sq_merchant_help: createQuest({
        id: 'sq_merchant_help', name: 'Merchant\'s Request', type: 'side',
        description: 'Help a merchant with a delivery.',
        minLevel: 3, xp: 80, tokens: 100,
        objectives: [
            { type: 'collect', item: 'merchant_package', count: 1 },
            { type: 'talk', target: 'merchant_client' }
        ]
    }),
    sq_lost_tokens: createQuest({
        id: 'sq_lost_tokens', name: 'Lost Tokens', type: 'side',
        description: 'Help find someone\'s lost tokens.',
        minLevel: 2, xp: 60, tokens: 75,
        objectives: [{ type: 'explore', location: 'marketplace', text: 'Search the marketplace' }]
    }),
    sq_arena_debut: createQuest({
        id: 'sq_arena_debut', name: 'Arena Debut', type: 'side',
        description: 'Win your first arena battle.',
        minLevel: 4, xp: 150, tokens: 100,
        objectives: [{ type: 'battle', target: 'arena_opponent', text: 'Win in the arena' }]
    }),
    sq_deck_master: createQuest({
        id: 'sq_deck_master', name: 'Deck Building 101', type: 'side',
        description: 'Build a complete deck of 20+ cards.',
        minLevel: 3, xp: 100, tokens: 50,
        objectives: [{ type: 'craft', item: 'complete_deck', text: 'Build your deck' }]
    }),
    sq_element_mastery: createQuest({
        id: 'sq_element_mastery', name: 'Element Mastery', type: 'side',
        description: 'Master all elemental types.',
        minLevel: 8, xp: 300, tokens: 200,
        objectives: [{ type: 'battle', target: 'elemental_champion', count: 8 }]
    }),
    sq_treasure_hunt: createQuest({
        id: 'sq_treasure_hunt', name: 'Treasure Hunt', type: 'side',
        description: 'Follow the treasure map.',
        minLevel: 5, xp: 200, tokens: 500,
        objectives: [
            { type: 'explore', location: 'treasure_spot_1' },
            { type: 'explore', location: 'treasure_spot_2' },
            { type: 'explore', location: 'treasure_spot_3' }
        ]
    }),
    sq_bounty_hunter: createQuest({
        id: 'sq_bounty_hunter', name: 'Bounty Hunter', type: 'side',
        description: 'Defeat 10 wanted targets.',
        minLevel: 6, xp: 250, tokens: 300,
        objectives: [{ type: 'battle', target: 'bounty_target', count: 10 }]
    }),
    sq_creature_breeder: createQuest({
        id: 'sq_creature_breeder', name: 'Creature Breeder', type: 'side',
        description: 'Evolve your first creature.',
        minLevel: 7, xp: 200, tokens: 150,
        objectives: [{ type: 'craft', item: 'evolved_creature' }]
    }),
    sq_card_collector: createQuest({
        id: 'sq_card_collector', name: 'Card Collector', type: 'side',
        description: 'Collect 30 unique cards.',
        minLevel: 5, xp: 180, tokens: 200,
        objectives: [{ type: 'collect', item: 'unique_card', count: 30 }]
    }),
    sq_explorer: createQuest({
        id: 'sq_explorer', name: 'Explorer', type: 'side',
        description: 'Discover all map regions.',
        minLevel: 8, xp: 300, tokens: 250,
        objectives: [{ type: 'explore', location: 'all_regions' }]
    }),
    sq_npc_friend: createQuest({
        id: 'sq_npc_friend', name: 'Making Friends', type: 'side',
        description: 'Reach 50 affinity with an NPC.',
        minLevel: 4, xp: 150, tokens: 100,
        objectives: [{ type: 'talk', target: 'any_npc', count: 10 }]
    }),
    sq_daily_grind: createQuest({
        id: 'sq_daily_grind', name: 'Daily Grind', type: 'side',
        description: 'Complete 7 daily challenges.',
        minLevel: 3, xp: 200, tokens: 150,
        objectives: [{ type: 'collect', item: 'daily_completion', count: 7 }]
    }),
    sq_pvp_champion: createQuest({
        id: 'sq_pvp_champion', name: 'PvP Champion', type: 'side',
        description: 'Win 10 PvP battles.',
        minLevel: 10, xp: 400, tokens: 400,
        objectives: [{ type: 'battle', target: 'pvp_opponent', count: 10 }]
    }),
    sq_market_mogul: createQuest({
        id: 'sq_market_mogul', name: 'Market Mogul', type: 'side',
        description: 'Make 10,000 tokens from trading.',
        minLevel: 8, xp: 350, tokens: 500,
        objectives: [{ type: 'trade', item: 'trade_profit', count: 10000 }]
    }),
    sq_burn_master: createQuest({
        id: 'sq_burn_master', name: 'Burn Master', type: 'side',
        description: 'Burn 50,000 tokens total.',
        minLevel: 10, xp: 500, tokens: 0,
        objectives: [{ type: 'burn', amount: 50000 }]
    }),
    sq_alliance_builder: createQuest({
        id: 'sq_alliance_builder', name: 'Alliance Builder', type: 'side',
        description: 'Unlock 3 NPC allies.',
        minLevel: 9, xp: 350, tokens: 300,
        objectives: [{ type: 'collect', item: 'ally_unlock', count: 3 }]
    }),
    sq_legendary_hunter: createQuest({
        id: 'sq_legendary_hunter', name: 'Legendary Hunter', type: 'side',
        description: 'Defeat a legendary boss.',
        minLevel: 15, difficulty: 'LEGENDARY', xp: 1000, tokens: 800,
        objectives: [{ type: 'battle', target: 'legendary_boss' }]
    }),
    sq_completionist: createQuest({
        id: 'sq_completionist', name: 'Completionist', type: 'side',
        description: 'Complete all other side quests.',
        minLevel: 15, xp: 2000, tokens: 1500,
        objectives: [{ type: 'collect', item: 'side_quest_complete', count: 19 }]
    })
};

// ============================================================
// QUEST MANAGER & EXPORTS
// ============================================================

const ALL_QUESTS = {
    ...ASDF_CAMPAIGN,
    ...SAFEYIELD_CAMPAIGN,
    ...PIXEL_RAIDERS_CAMPAIGN,
    ...BASED_COLLECTIVE_CAMPAIGN,
    ...NODEFORGE_CAMPAIGN,
    ...PUMP_LORDS_CAMPAIGN,
    ...BEAR_CLAN_CAMPAIGN,
    ...BUILDERS_GUILD_CAMPAIGN,
    ...SIDE_QUESTS
};

// Deep freeze all quests for immutability
deepFreeze(ALL_QUESTS);

class QuestManager {
    constructor() {
        this.quests = ALL_QUESTS;
    }

    getQuest(questId) {
        return this.quests[questId] || null;
    }

    getQuestsForFaction(factionId) {
        return Object.values(this.quests).filter(q => q.faction === factionId);
    }

    getQuestsByChapter(factionId, chapter) {
        return this.getQuestsForFaction(factionId).filter(q => q.chapter === chapter);
    }

    getAvailableQuests(gameState) {
        const available = [];
        const completedQuests = gameState.quests?.completed || [];
        const level = gameState.character?.level || 1;
        const currentFaction = gameState.faction?.current;

        for (const quest of Object.values(this.quests)) {
            // Skip completed
            if (completedQuests.includes(quest.id)) continue;

            // Check level
            if (level < quest.requirements.level) continue;

            // Check previous quest
            if (quest.requirements.previousQuest &&
                !completedQuests.includes(quest.requirements.previousQuest)) continue;

            // Check faction for faction quests
            if (quest.faction && quest.faction !== currentFaction &&
                quest.type === QUEST_CONSTANTS.TYPES.FACTION) continue;

            available.push(quest);
        }

        return available;
    }

    getSideQuests() {
        return Object.values(SIDE_QUESTS);
    }

    getTotalQuestCount() {
        return Object.keys(this.quests).length;
    }

    getQuestCountByFaction(factionId) {
        return this.getQuestsForFaction(factionId).length;
    }
}

const questManager = new QuestManager();

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaQuestsExpanded = {
    QUEST_CONSTANTS,
    ALL_QUESTS,
    ASDF_CAMPAIGN,
    SAFEYIELD_CAMPAIGN,
    PIXEL_RAIDERS_CAMPAIGN,
    BASED_COLLECTIVE_CAMPAIGN,
    NODEFORGE_CAMPAIGN,
    PUMP_LORDS_CAMPAIGN,
    BEAR_CLAN_CAMPAIGN,
    BUILDERS_GUILD_CAMPAIGN,
    SIDE_QUESTS,
    questManager,
    getQuest: (id) => questManager.getQuest(id),
    getAvailableQuests: (gs) => questManager.getAvailableQuests(gs),
    getFactionQuests: (fid) => questManager.getQuestsForFaction(fid),
    getTotalQuestCount: () => questManager.getTotalQuestCount()
};

console.log(`Quests loaded: ${questManager.getTotalQuestCount()} total quests`);
