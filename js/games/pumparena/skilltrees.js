/**
 * Pump Arena RPG - Skill Trees System
 * Deep character progression with passive bonuses and active abilities
 */

'use strict';

// ============================================
// SKILL TYPES
// ============================================

const SKILL_TYPES = {
    PASSIVE: 'passive',    // Permanent stat bonuses
    ACTIVE: 'active',      // Usable abilities with cooldowns
    ULTIMATE: 'ultimate'   // Powerful abilities unlocked at max tier
};

// ============================================
// SKILL TREE DEFINITIONS
// ============================================

const SKILL_TREES = {
    // ==========================================
    // DEVELOPER SKILL TREE
    // ==========================================
    developer: {
        name: 'Developer Mastery',
        icon: '&#128187;',
        color: '#3b82f6',
        description: 'Master the art of building. Code is law.',
        branches: {
            smart_contracts: {
                name: 'Smart Contracts',
                icon: '&#128221;',
                skills: [
                    {
                        id: 'solidity_basics',
                        name: 'Solidity Basics',
                        icon: '&#128190;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Foundation of blockchain development.',
                        effect: { stat: 'dev', bonus: 3 },
                        requires: []
                    },
                    {
                        id: 'gas_optimizer',
                        name: 'Gas Optimizer',
                        icon: '&#9981;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Reduce influence cost of technical tasks.',
                        effect: { influenceCostReduction: 0.15 },
                        cooldown: 300, // 5 minutes
                        requires: ['solidity_basics']
                    },
                    {
                        id: 'contract_architect',
                        name: 'Contract Architect',
                        icon: '&#127959;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Design complex systems with ease.',
                        effect: { stat: 'dev', bonus: 5, xpBonus: 0.1 },
                        requires: ['gas_optimizer']
                    }
                ]
            },
            security: {
                name: 'Security Expert',
                icon: '&#128274;',
                skills: [
                    {
                        id: 'bug_hunter',
                        name: 'Bug Hunter',
                        icon: '&#128027;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Spot vulnerabilities before they become exploits.',
                        effect: { eventBonusChance: 0.1 },
                        requires: []
                    },
                    {
                        id: 'audit_master',
                        name: 'Audit Master',
                        icon: '&#128269;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Perform deep security analysis for bonus reputation.',
                        effect: { reputationBonus: 50 },
                        cooldown: 600, // 10 minutes
                        requires: ['bug_hunter']
                    },
                    {
                        id: 'white_hat',
                        name: 'White Hat Legend',
                        icon: '&#129489;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Your security reputation precedes you.',
                        effect: { stat: 'str', bonus: 3, reputationGainBonus: 0.15 },
                        requires: ['audit_master']
                    }
                ]
            },
            frontend: {
                name: 'Frontend Wizard',
                icon: '&#127912;',
                skills: [
                    {
                        id: 'ui_sense',
                        name: 'UI/UX Sense',
                        icon: '&#128444;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Create interfaces users love.',
                        effect: { stat: 'mkt', bonus: 2, stat2: 'cha', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'component_library',
                        name: 'Component Library',
                        icon: '&#128230;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Reusable components speed up all work.',
                        effect: { taskSpeedBonus: 0.2 },
                        requires: ['ui_sense']
                    },
                    {
                        id: 'ux_master',
                        name: 'UX Master',
                        icon: '&#10024;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Create viral-worthy user experiences.',
                        effect: { minigameScoreBonus: 0.25 },
                        cooldown: 480,
                        requires: ['component_library']
                    }
                ]
            },
            ultimate: {
                name: 'Ultimate',
                icon: '&#11088;',
                skills: [
                    {
                        id: 'full_stack_legend',
                        name: 'Full Stack Legend',
                        icon: '&#128142;',
                        type: SKILL_TYPES.ULTIMATE,
                        tier: 4,
                        cost: 5,
                        description: 'Master of all development disciplines.',
                        effect: { allStatsBonus: 2, xpBonus: 0.2, influenceRegenBonus: 0.25 },
                        requires: ['contract_architect', 'white_hat', 'ux_master']
                    }
                ]
            }
        }
    },

    // ==========================================
    // COMMUNITY BUILDER SKILL TREE
    // ==========================================
    community: {
        name: 'Community Mastery',
        icon: '&#127908;',
        color: '#f97316',
        description: 'The people are the project. Unite and inspire.',
        branches: {
            engagement: {
                name: 'Engagement',
                icon: '&#128172;',
                skills: [
                    {
                        id: 'active_listener',
                        name: 'Active Listener',
                        icon: '&#128066;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Understanding what people really need.',
                        effect: { stat: 'com', bonus: 3 },
                        requires: []
                    },
                    {
                        id: 'vibe_curator',
                        name: 'Vibe Curator',
                        icon: '&#127926;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Set the mood for maximum engagement.',
                        effect: { relationshipBonus: 10 },
                        cooldown: 300,
                        requires: ['active_listener']
                    },
                    {
                        id: 'community_pulse',
                        name: 'Community Pulse',
                        icon: '&#128147;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Always know the community sentiment.',
                        effect: { stat: 'com', bonus: 5, eventPrediction: true },
                        requires: ['vibe_curator']
                    }
                ]
            },
            growth: {
                name: 'Growth',
                icon: '&#127793;',
                skills: [
                    {
                        id: 'onboarding_pro',
                        name: 'Onboarding Pro',
                        icon: '&#128075;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Make newcomers feel welcome.',
                        effect: { reputationGainBonus: 0.1 },
                        requires: []
                    },
                    {
                        id: 'viral_content',
                        name: 'Viral Content',
                        icon: '&#128293;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Create content that spreads organically.',
                        effect: { xpBonus: 100 },
                        cooldown: 600,
                        requires: ['onboarding_pro']
                    },
                    {
                        id: 'network_effect',
                        name: 'Network Effect',
                        icon: '&#128279;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Your community grows exponentially.',
                        effect: { stat: 'cha', bonus: 4, tokenBonus: 0.15 },
                        requires: ['viral_content']
                    }
                ]
            },
            moderation: {
                name: 'Moderation',
                icon: '&#128737;',
                skills: [
                    {
                        id: 'conflict_resolver',
                        name: 'Conflict Resolver',
                        icon: '&#9878;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Turn drama into harmony.',
                        effect: { stat: 'str', bonus: 2, stat2: 'cha', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'fud_shield',
                        name: 'FUD Shield',
                        icon: '&#128737;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Protect the community from negativity.',
                        effect: { negativeEventResistance: 0.3 },
                        cooldown: 480,
                        requires: ['conflict_resolver']
                    },
                    {
                        id: 'trust_builder',
                        name: 'Trust Builder',
                        icon: '&#129309;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Your word is your bond.',
                        effect: { stat: 'com', bonus: 3, relationshipGainBonus: 0.2 },
                        requires: ['fud_shield']
                    }
                ]
            },
            ultimate: {
                name: 'Ultimate',
                icon: '&#11088;',
                skills: [
                    {
                        id: 'community_legend',
                        name: 'Community Legend',
                        icon: '&#128081;',
                        type: SKILL_TYPES.ULTIMATE,
                        tier: 4,
                        cost: 5,
                        description: 'The heart and soul of every project.',
                        effect: { allStatsBonus: 2, relationshipGainBonus: 0.3, dailyBonusMultiplier: 1.5 },
                        requires: ['community_pulse', 'network_effect', 'trust_builder']
                    }
                ]
            }
        }
    },

    // ==========================================
    // DESIGNER SKILL TREE
    // ==========================================
    designer: {
        name: 'Design Mastery',
        icon: '&#127912;',
        color: '#ec4899',
        description: 'Beauty meets function. Craft unforgettable experiences.',
        branches: {
            visual: {
                name: 'Visual Design',
                icon: '&#127752;',
                skills: [
                    {
                        id: 'color_theory',
                        name: 'Color Theory',
                        icon: '&#127752;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Master the psychology of colors.',
                        effect: { stat: 'mkt', bonus: 3 },
                        requires: []
                    },
                    {
                        id: 'brand_identity',
                        name: 'Brand Identity',
                        icon: '&#128142;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Create memorable brand experiences.',
                        effect: { reputationBonus: 40 },
                        cooldown: 480,
                        requires: ['color_theory']
                    },
                    {
                        id: 'visual_storyteller',
                        name: 'Visual Storyteller',
                        icon: '&#127916;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Every pixel tells a story.',
                        effect: { stat: 'cha', bonus: 4, xpBonus: 0.12 },
                        requires: ['brand_identity']
                    }
                ]
            },
            nft_art: {
                name: 'NFT Artistry',
                icon: '&#128444;',
                skills: [
                    {
                        id: 'pfp_creator',
                        name: 'PFP Creator',
                        icon: '&#129485;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Design profile pictures that pop.',
                        effect: { tokenBonus: 0.1 },
                        requires: []
                    },
                    {
                        id: 'generative_art',
                        name: 'Generative Art',
                        icon: '&#127922;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Create algorithmic masterpieces.',
                        effect: { tokenReward: 75 },
                        cooldown: 600,
                        requires: ['pfp_creator']
                    },
                    {
                        id: 'collection_curator',
                        name: 'Collection Curator',
                        icon: '&#128220;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Your collections define culture.',
                        effect: { stat: 'mkt', bonus: 4, stat2: 'lck', bonus2: 3 },
                        requires: ['generative_art']
                    }
                ]
            },
            motion: {
                name: 'Motion Design',
                icon: '&#127916;',
                skills: [
                    {
                        id: 'animation_basics',
                        name: 'Animation Basics',
                        icon: '&#128250;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Bring static designs to life.',
                        effect: { stat: 'dev', bonus: 2, stat2: 'mkt', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'viral_visuals',
                        name: 'Viral Visuals',
                        icon: '&#128293;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Create content that demands attention.',
                        effect: { influenceBonus: 25 },
                        cooldown: 360,
                        requires: ['animation_basics']
                    },
                    {
                        id: 'cinematic_master',
                        name: 'Cinematic Master',
                        icon: '&#127909;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Hollywood-level production quality.',
                        effect: { minigameScoreBonus: 0.2, xpBonus: 0.1 },
                        requires: ['viral_visuals']
                    }
                ]
            },
            ultimate: {
                name: 'Ultimate',
                icon: '&#11088;',
                skills: [
                    {
                        id: 'creative_genius',
                        name: 'Creative Genius',
                        icon: '&#128161;',
                        type: SKILL_TYPES.ULTIMATE,
                        tier: 4,
                        cost: 5,
                        description: 'Your creativity knows no bounds.',
                        effect: { allStatsBonus: 2, tokenBonus: 0.25, criticalSuccessChance: 0.15 },
                        requires: ['visual_storyteller', 'collection_curator', 'cinematic_master']
                    }
                ]
            }
        }
    },

    // ==========================================
    // MARKETER SKILL TREE
    // ==========================================
    marketer: {
        name: 'Marketing Mastery',
        icon: '&#128227;',
        color: '#a855f7',
        description: 'Attention is currency. Capture it all.',
        branches: {
            content: {
                name: 'Content',
                icon: '&#128221;',
                skills: [
                    {
                        id: 'copywriting',
                        name: 'Copywriting',
                        icon: '&#128203;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Words that convert.',
                        effect: { stat: 'mkt', bonus: 3 },
                        requires: []
                    },
                    {
                        id: 'thread_master',
                        name: 'Thread Master',
                        icon: '&#129525;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Create viral Twitter threads.',
                        effect: { xpBonus: 75, reputationBonus: 30 },
                        cooldown: 480,
                        requires: ['copywriting']
                    },
                    {
                        id: 'narrative_architect',
                        name: 'Narrative Architect',
                        icon: '&#128214;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Control the story, control the market.',
                        effect: { stat: 'str', bonus: 3, stat2: 'mkt', bonus2: 3 },
                        requires: ['thread_master']
                    }
                ]
            },
            growth_hacking: {
                name: 'Growth Hacking',
                icon: '&#128200;',
                skills: [
                    {
                        id: 'metrics_analyst',
                        name: 'Metrics Analyst',
                        icon: '&#128202;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Data-driven decisions.',
                        effect: { stat: 'str', bonus: 2, stat2: 'dev', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'viral_loops',
                        name: 'Viral Loops',
                        icon: '&#128257;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Design self-perpetuating growth.',
                        effect: { tokenReward: 50, influenceBonus: 20 },
                        cooldown: 540,
                        requires: ['metrics_analyst']
                    },
                    {
                        id: 'growth_engine',
                        name: 'Growth Engine',
                        icon: '&#128640;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Automated, unstoppable growth.',
                        effect: { reputationGainBonus: 0.2, xpBonus: 0.15 },
                        requires: ['viral_loops']
                    }
                ]
            },
            influence: {
                name: 'Influence',
                icon: '&#127775;',
                skills: [
                    {
                        id: 'kol_network',
                        name: 'KOL Network',
                        icon: '&#128101;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Know all the key opinion leaders.',
                        effect: { stat: 'cha', bonus: 3 },
                        requires: []
                    },
                    {
                        id: 'shill_army',
                        name: 'Shill Army',
                        icon: '&#129504;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Mobilize supporters on command.',
                        effect: { reputationBonus: 60 },
                        cooldown: 600,
                        requires: ['kol_network']
                    },
                    {
                        id: 'mindshare_king',
                        name: 'Mindshare King',
                        icon: '&#129504;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Live rent-free in everyone\'s mind.',
                        effect: { stat: 'mkt', bonus: 5, eventBonusChance: 0.15 },
                        requires: ['shill_army']
                    }
                ]
            },
            ultimate: {
                name: 'Ultimate',
                icon: '&#11088;',
                skills: [
                    {
                        id: 'attention_merchant',
                        name: 'Attention Merchant',
                        icon: '&#128142;',
                        type: SKILL_TYPES.ULTIMATE,
                        tier: 4,
                        cost: 5,
                        description: 'Every eye, every ear, all yours.',
                        effect: { allStatsBonus: 2, influenceRegenBonus: 0.3, reputationGainBonus: 0.25 },
                        requires: ['narrative_architect', 'growth_engine', 'mindshare_king']
                    }
                ]
            }
        }
    },

    // ==========================================
    // STRATEGIST SKILL TREE
    // ==========================================
    strategist: {
        name: 'Strategy Mastery',
        icon: '&#129504;',
        color: '#22c55e',
        description: 'Chess, not checkers. See five moves ahead.',
        branches: {
            analysis: {
                name: 'Analysis',
                icon: '&#128200;',
                skills: [
                    {
                        id: 'market_reader',
                        name: 'Market Reader',
                        icon: '&#128208;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Read market sentiment like a book.',
                        effect: { stat: 'str', bonus: 3 },
                        requires: []
                    },
                    {
                        id: 'pattern_recognition',
                        name: 'Pattern Recognition',
                        icon: '&#128209;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Spot trends before they happen.',
                        effect: { xpBonus: 60, luckBonus: 5 },
                        cooldown: 420,
                        requires: ['market_reader']
                    },
                    {
                        id: 'alpha_finder',
                        name: 'Alpha Finder',
                        icon: '&#128269;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Find alpha in any market condition.',
                        effect: { stat: 'lck', bonus: 5, tokenBonus: 0.2 },
                        requires: ['pattern_recognition']
                    }
                ]
            },
            risk: {
                name: 'Risk Management',
                icon: '&#128737;',
                skills: [
                    {
                        id: 'risk_assessment',
                        name: 'Risk Assessment',
                        icon: '&#128202;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Know exactly what you\'re getting into.',
                        effect: { negativeEventResistance: 0.1 },
                        requires: []
                    },
                    {
                        id: 'hedge_master',
                        name: 'Hedge Master',
                        icon: '&#128176;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Protect gains in any condition.',
                        effect: { tokenProtection: 0.5 },
                        cooldown: 600,
                        requires: ['risk_assessment']
                    },
                    {
                        id: 'antifragile',
                        name: 'Antifragile',
                        icon: '&#128170;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Grow stronger from chaos.',
                        effect: { stat: 'str', bonus: 5, negativeEventResistance: 0.25 },
                        requires: ['hedge_master']
                    }
                ]
            },
            planning: {
                name: 'Planning',
                icon: '&#128203;',
                skills: [
                    {
                        id: 'roadmap_vision',
                        name: 'Roadmap Vision',
                        icon: '&#128506;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'See the path to success clearly.',
                        effect: { stat: 'dev', bonus: 2, stat2: 'str', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'pivot_master',
                        name: 'Pivot Master',
                        icon: '&#128260;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Adapt quickly to changing conditions.',
                        effect: { influenceBonus: 30, cooldownReduction: 0.2 },
                        cooldown: 480,
                        requires: ['roadmap_vision']
                    },
                    {
                        id: 'execution_king',
                        name: 'Execution King',
                        icon: '&#127942;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Plans mean nothing. Execution is everything.',
                        effect: { stat: 'str', bonus: 4, xpBonus: 0.15 },
                        requires: ['pivot_master']
                    }
                ]
            },
            ultimate: {
                name: 'Ultimate',
                icon: '&#11088;',
                skills: [
                    {
                        id: 'grand_master',
                        name: 'Grand Master',
                        icon: '&#128081;',
                        type: SKILL_TYPES.ULTIMATE,
                        tier: 4,
                        cost: 5,
                        description: 'The chessmaster of crypto.',
                        effect: { allStatsBonus: 3, timerExtension: 10, eventPrediction: true },
                        requires: ['alpha_finder', 'antifragile', 'execution_king']
                    }
                ]
            }
        }
    },

    // ==========================================
    // ANALYST SKILL TREE (Bonus archetype)
    // ==========================================
    analyst: {
        name: 'Analysis Mastery',
        icon: '&#128200;',
        color: '#06b6d4',
        description: 'Data reveals all. Knowledge is power.',
        branches: {
            onchain: {
                name: 'On-Chain',
                icon: '&#128279;',
                skills: [
                    {
                        id: 'wallet_watcher',
                        name: 'Wallet Watcher',
                        icon: '&#128065;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Track smart money movements.',
                        effect: { stat: 'str', bonus: 2, stat2: 'lck', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'whale_tracker',
                        name: 'Whale Tracker',
                        icon: '&#128011;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Know when whales are moving.',
                        effect: { eventBonusChance: 0.2 },
                        cooldown: 480,
                        requires: ['wallet_watcher']
                    },
                    {
                        id: 'chain_oracle',
                        name: 'Chain Oracle',
                        icon: '&#128302;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'The blockchain speaks to you.',
                        effect: { stat: 'dev', bonus: 4, stat2: 'str', bonus2: 4 },
                        requires: ['whale_tracker']
                    }
                ]
            },
            research: {
                name: 'Research',
                icon: '&#128218;',
                skills: [
                    {
                        id: 'due_diligence',
                        name: 'Due Diligence',
                        icon: '&#128270;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Thorough research prevents losses.',
                        effect: { negativeEventResistance: 0.15 },
                        requires: []
                    },
                    {
                        id: 'alpha_report',
                        name: 'Alpha Report',
                        icon: '&#128196;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Publish research that moves markets.',
                        effect: { reputationBonus: 50, xpBonus: 80 },
                        cooldown: 600,
                        requires: ['due_diligence']
                    },
                    {
                        id: 'thought_leader',
                        name: 'Thought Leader',
                        icon: '&#128161;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Your analysis shapes narratives.',
                        effect: { stat: 'mkt', bonus: 4, reputationGainBonus: 0.2 },
                        requires: ['alpha_report']
                    }
                ]
            },
            data: {
                name: 'Data Science',
                icon: '&#128202;',
                skills: [
                    {
                        id: 'data_miner',
                        name: 'Data Miner',
                        icon: '&#9935;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 1,
                        cost: 1,
                        description: 'Extract insights from raw data.',
                        effect: { stat: 'dev', bonus: 2, stat2: 'str', bonus2: 2 },
                        requires: []
                    },
                    {
                        id: 'predictive_model',
                        name: 'Predictive Model',
                        icon: '&#128201;',
                        type: SKILL_TYPES.ACTIVE,
                        tier: 2,
                        cost: 2,
                        description: 'Build models that predict the future.',
                        effect: { luckBonus: 10, timerExtension: 5 },
                        cooldown: 540,
                        requires: ['data_miner']
                    },
                    {
                        id: 'quant_master',
                        name: 'Quant Master',
                        icon: '&#128187;',
                        type: SKILL_TYPES.PASSIVE,
                        tier: 3,
                        cost: 3,
                        description: 'Numbers reveal what others miss.',
                        effect: { stat: 'str', bonus: 5, minigameScoreBonus: 0.25 },
                        requires: ['predictive_model']
                    }
                ]
            },
            ultimate: {
                name: 'Ultimate',
                icon: '&#11088;',
                skills: [
                    {
                        id: 'omniscient',
                        name: 'Omniscient',
                        icon: '&#128065;',
                        type: SKILL_TYPES.ULTIMATE,
                        tier: 4,
                        cost: 5,
                        description: 'See everything. Know everything.',
                        effect: { allStatsBonus: 2, eventPrediction: true, criticalSuccessChance: 0.2 },
                        requires: ['chain_oracle', 'thought_leader', 'quant_master']
                    }
                ]
            }
        }
    }
};

// ============================================
// SKILL TREE MANAGER
// ============================================

const PumpArenaSkillTrees = {
    // Get skill tree for an archetype
    getTree(archetype) {
        return SKILL_TREES[archetype] || null;
    },

    // Get all skills for an archetype (flat list)
    getAllSkills(archetype) {
        const tree = this.getTree(archetype);
        if (!tree) return [];

        const skills = [];
        Object.values(tree.branches).forEach(branch => {
            skills.push(...branch.skills);
        });
        return skills;
    },

    // Get a specific skill
    getSkill(archetype, skillId) {
        const skills = this.getAllSkills(archetype);
        return skills.find(s => s.id === skillId) || null;
    },

    // Check if skill can be unlocked
    canUnlockSkill(archetype, skillId) {
        const state = window.PumpArenaState?.get();
        if (!state) return { can: false, reason: 'No game state' };

        const skill = this.getSkill(archetype, skillId);
        if (!skill) return { can: false, reason: 'Skill not found' };

        // Check if already unlocked
        const unlockedSkills = state.progression.skills || [];
        if (unlockedSkills.includes(skillId)) {
            return { can: false, reason: 'Already unlocked' };
        }

        // Check skill points
        const availablePoints = this.getAvailableSkillPoints();
        if (availablePoints < skill.cost) {
            return { can: false, reason: `Need ${skill.cost} skill point(s), have ${availablePoints}` };
        }

        // Check level requirement (tier * 5)
        const requiredLevel = skill.tier * 5;
        if (state.progression.level < requiredLevel) {
            return { can: false, reason: `Requires level ${requiredLevel}` };
        }

        // Check prerequisites
        for (const reqId of skill.requires) {
            if (!unlockedSkills.includes(reqId)) {
                const reqSkill = this.getSkill(archetype, reqId);
                const reqName = reqSkill ? reqSkill.name : reqId;
                return { can: false, reason: `Requires: ${reqName}` };
            }
        }

        return { can: true };
    },

    // Get available skill points
    getAvailableSkillPoints() {
        const state = window.PumpArenaState?.get();
        if (!state) return 0;

        const totalPoints = state.progression.level; // 1 point per level
        const usedPoints = this.getUsedSkillPoints();
        return Math.max(0, totalPoints - usedPoints);
    },

    // Get used skill points
    getUsedSkillPoints() {
        const state = window.PumpArenaState?.get();
        if (!state) return 0;

        const unlockedSkills = state.progression.skills || [];
        const archetype = state.character?.archetype;
        if (!archetype) return 0;

        let used = 0;
        for (const skillId of unlockedSkills) {
            const skill = this.getSkill(archetype, skillId);
            if (skill) used += skill.cost;
        }
        return used;
    },

    // Unlock a skill
    unlockSkill(archetype, skillId) {
        const canUnlock = this.canUnlockSkill(archetype, skillId);
        if (!canUnlock.can) {
            return { success: false, message: canUnlock.reason };
        }

        const state = window.PumpArenaState?.get();
        if (!state.progression.skills) {
            state.progression.skills = [];
        }

        state.progression.skills.push(skillId);

        // Apply passive effects immediately
        const skill = this.getSkill(archetype, skillId);
        if (skill && skill.type === SKILL_TYPES.PASSIVE) {
            this.applyPassiveEffect(skill);
        }

        window.PumpArenaState.save();

        return { success: true, message: `Unlocked: ${skill.name}` };
    },

    // Apply passive effect to stats
    applyPassiveEffect(skill) {
        const state = window.PumpArenaState?.get();
        if (!state || !skill.effect) return;

        const effect = skill.effect;

        // Apply stat bonuses
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

    // Get all passive bonuses
    getPassiveBonuses() {
        const state = window.PumpArenaState?.get();
        if (!state) return {};

        const archetype = state.character?.archetype;
        const unlockedSkills = state.progression.skills || [];

        const bonuses = {
            xpBonus: 0,
            reputationGainBonus: 0,
            tokenBonus: 0,
            influenceRegenBonus: 0,
            influenceCostReduction: 0,
            negativeEventResistance: 0,
            eventBonusChance: 0,
            minigameScoreBonus: 0,
            relationshipGainBonus: 0,
            taskSpeedBonus: 0,
            timerExtension: 0,
            criticalSuccessChance: 0,
            dailyBonusMultiplier: 1,
            eventPrediction: false
        };

        for (const skillId of unlockedSkills) {
            const skill = this.getSkill(archetype, skillId);
            if (skill && skill.effect) {
                Object.keys(skill.effect).forEach(key => {
                    if (typeof bonuses[key] === 'number' && typeof skill.effect[key] === 'number') {
                        bonuses[key] += skill.effect[key];
                    } else if (typeof bonuses[key] === 'boolean') {
                        bonuses[key] = bonuses[key] || skill.effect[key];
                    }
                });
            }
        }

        return bonuses;
    },

    // Check if skill is unlocked
    isSkillUnlocked(skillId) {
        const state = window.PumpArenaState?.get();
        if (!state) return false;
        return (state.progression.skills || []).includes(skillId);
    },

    // Get active abilities
    getActiveAbilities() {
        const state = window.PumpArenaState?.get();
        if (!state) return [];

        const archetype = state.character?.archetype;
        const unlockedSkills = state.progression.skills || [];

        const abilities = [];
        for (const skillId of unlockedSkills) {
            const skill = this.getSkill(archetype, skillId);
            if (skill && (skill.type === SKILL_TYPES.ACTIVE || skill.type === SKILL_TYPES.ULTIMATE)) {
                abilities.push({
                    ...skill,
                    isOnCooldown: this.isOnCooldown(skillId),
                    cooldownRemaining: this.getCooldownRemaining(skillId)
                });
            }
        }

        return abilities;
    },

    // Use active ability
    useAbility(skillId) {
        const state = window.PumpArenaState?.get();
        if (!state) return { success: false, message: 'No game state' };

        const archetype = state.character?.archetype;
        const skill = this.getSkill(archetype, skillId);

        if (!skill) return { success: false, message: 'Skill not found' };
        if (!this.isSkillUnlocked(skillId)) return { success: false, message: 'Skill not unlocked' };
        if (this.isOnCooldown(skillId)) {
            const remaining = Math.ceil(this.getCooldownRemaining(skillId) / 1000);
            return { success: false, message: `On cooldown (${remaining}s remaining)` };
        }

        // Apply ability effects
        const rewards = this.applyAbilityEffect(skill);

        // Set cooldown
        if (!state.skillCooldowns) state.skillCooldowns = {};
        state.skillCooldowns[skillId] = Date.now() + (skill.cooldown * 1000);
        window.PumpArenaState.save();

        return { success: true, message: `${skill.name} activated!`, rewards };
    },

    // Apply ability effect
    applyAbilityEffect(skill) {
        const effect = skill.effect;
        const rewards = {};

        if (effect.xpBonus) {
            window.PumpArenaState.addXP(effect.xpBonus);
            rewards.xp = effect.xpBonus;
        }
        if (effect.reputationBonus) {
            window.PumpArenaState.addReputation(effect.reputationBonus);
            rewards.reputation = effect.reputationBonus;
        }
        if (effect.tokenReward) {
            const state = window.PumpArenaState.get();
            state.resources.tokens += effect.tokenReward;
            window.PumpArenaState.save();
            rewards.tokens = effect.tokenReward;
        }
        if (effect.influenceBonus) {
            const state = window.PumpArenaState.get();
            state.resources.influence = Math.min(
                state.resources.influence + effect.influenceBonus,
                window.PumpArenaState.getMaxInfluence()
            );
            window.PumpArenaState.save();
            rewards.influence = effect.influenceBonus;
        }
        if (effect.luckBonus) {
            const state = window.PumpArenaState.get();
            state.stats.lck += effect.luckBonus;
            window.PumpArenaState.save();
            rewards.luck = effect.luckBonus;
        }
        if (effect.relationshipBonus) {
            rewards.relationshipBonus = effect.relationshipBonus;
        }

        return rewards;
    },

    // Check if ability is on cooldown
    isOnCooldown(skillId) {
        const state = window.PumpArenaState?.get();
        if (!state || !state.skillCooldowns) return false;
        const cooldownEnd = state.skillCooldowns[skillId];
        return cooldownEnd && Date.now() < cooldownEnd;
    },

    // Get remaining cooldown time
    getCooldownRemaining(skillId) {
        const state = window.PumpArenaState?.get();
        if (!state || !state.skillCooldowns) return 0;
        const cooldownEnd = state.skillCooldowns[skillId];
        if (!cooldownEnd) return 0;
        return Math.max(0, cooldownEnd - Date.now());
    },

    // ==========================================
    // UI RENDERING
    // ==========================================

    renderSkillTreePanel(container) {
        const state = window.PumpArenaState?.get();
        if (!state || !state.character) {
            container.innerHTML = '<p style="color: #fff; padding: 20px;">No character data</p>';
            return;
        }

        const archetype = state.character.archetype;
        const tree = this.getTree(archetype);
        if (!tree) {
            container.innerHTML = '<p style="color: #fff; padding: 20px;">No skill tree for this archetype</p>';
            return;
        }

        const availablePoints = this.getAvailableSkillPoints();
        const usedPoints = this.getUsedSkillPoints();
        const totalPoints = state.progression.level;
        const unlockedSkills = state.progression.skills || [];
        const playerLevel = state.progression.level;

        container.innerHTML = `
            <div style="background: #12121a; border-radius: 16px; overflow: hidden; border: 2px solid ${tree.color};">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1a1a24, ${tree.color}20); padding: 20px; border-bottom: 1px solid ${tree.color}40;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, ${tree.color}, ${tree.color}80); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">${tree.icon}</div>
                        <div style="flex: 1;">
                            <h3 style="color: #ffffff; margin: 0; font-size: 18px;">${tree.name}</h3>
                            <div style="color: ${tree.color}; font-size: 12px;">${tree.description}</div>
                        </div>
                    </div>

                    <!-- Skill Points Display -->
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1; padding: 12px; background: linear-gradient(135deg, ${tree.color}20, ${tree.color}10); border: 2px solid ${tree.color}60; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; color: ${tree.color}; font-weight: bold;">${availablePoints}</div>
                            <div style="font-size: 11px; color: #9ca3af;">Available SP</div>
                        </div>
                        <div style="flex: 1; padding: 12px; background: #1a1a24; border: 1px solid #333; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; color: #666; font-weight: bold;">${usedPoints}/${totalPoints}</div>
                            <div style="font-size: 11px; color: #666;">Used/Total</div>
                        </div>
                    </div>
                </div>

                <!-- How Skills Work -->
                <div style="padding: 12px 20px; background: #1a1a24; border-bottom: 1px solid #333;">
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 11px; color: #9ca3af;">
                        <div>&#128218; <span style="color: #fff;">1 SP</span> per level (You: Lv.${playerLevel})</div>
                        <div>&#128274; Tier 1 = Lv.5 | Tier 2 = Lv.10 | Tier 3 = Lv.15</div>
                        <div>&#128161; Click a skill to view details & unlock</div>
                    </div>
                </div>

                <!-- Skill Branches -->
                <div style="padding: 20px; display: grid; gap: 15px;">
                    ${Object.entries(tree.branches).map(([branchId, branch]) => {
                        const isUltimate = branchId === 'ultimate';
                        return `
                            <div style="background: ${isUltimate ? 'linear-gradient(135deg, #1a1a24, #2d1b4e)' : '#1a1a24'}; border: 1px solid ${isUltimate ? '#a855f7' : '#333'}; border-radius: 12px; overflow: hidden;">
                                <div style="padding: 12px 15px; background: ${isUltimate ? 'linear-gradient(90deg, #a855f720, transparent)' : '#12121a'}; border-bottom: 1px solid ${isUltimate ? '#a855f740' : '#333'}; display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 18px;">${branch.icon}</span>
                                    <span style="color: #ffffff; font-weight: 600;">${branch.name}</span>
                                    ${isUltimate ? '<span style="background: #a855f7; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 4px; margin-left: auto;">ULTIMATE</span>' : ''}
                                </div>
                                <div style="padding: 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                                    ${branch.skills.map(skill => {
                                        const isUnlocked = unlockedSkills.includes(skill.id);
                                        const canUnlock = this.canUnlockSkill(archetype, skill.id);
                                        const requiredLevel = skill.tier * 5;
                                        const levelOk = playerLevel >= requiredLevel;

                                        let statusColor = '#333';
                                        let statusBg = '#1a1a24';
                                        let statusBorder = '#333';
                                        if (isUnlocked) {
                                            statusColor = '#22c55e';
                                            statusBg = 'linear-gradient(135deg, #0d2d1a, #1a4d2e)';
                                            statusBorder = '#22c55e';
                                        } else if (canUnlock.can) {
                                            statusColor = tree.color;
                                            statusBg = 'linear-gradient(135deg, #1a1a24, ' + tree.color + '15)';
                                            statusBorder = tree.color;
                                        }

                                        return `
                                            <div class="skill-node-card" data-skill="${skill.id}" style="
                                                background: ${statusBg};
                                                border: 2px solid ${statusBorder};
                                                border-radius: 10px;
                                                padding: 12px;
                                                cursor: pointer;
                                                transition: all 0.2s;
                                                position: relative;
                                                opacity: ${isUnlocked || canUnlock.can ? '1' : '0.5'};
                                            ">
                                                <!-- Tier Badge -->
                                                <div style="position: absolute; top: 6px; right: 6px; background: #333; color: #888; font-size: 9px; padding: 2px 5px; border-radius: 4px;">T${skill.tier}</div>

                                                <!-- Icon -->
                                                <div style="font-size: 24px; margin-bottom: 8px;">${skill.icon}</div>

                                                <!-- Name -->
                                                <div style="color: ${statusColor}; font-size: 12px; font-weight: 600; margin-bottom: 4px;">${skill.name}</div>

                                                <!-- Type Badge -->
                                                <div style="font-size: 9px; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 8px;
                                                    background: ${skill.type === 'passive' ? '#3b82f620' : skill.type === 'active' ? '#22c55e20' : '#a855f720'};
                                                    color: ${skill.type === 'passive' ? '#3b82f6' : skill.type === 'active' ? '#22c55e' : '#a855f7'};">
                                                    ${skill.type.toUpperCase()}
                                                </div>

                                                <!-- Status -->
                                                ${isUnlocked ? `
                                                    <div style="color: #22c55e; font-size: 11px;">&#10003; Unlocked</div>
                                                ` : canUnlock.can ? `
                                                    <div style="color: ${tree.color}; font-size: 11px;">&#128275; ${skill.cost} SP to unlock</div>
                                                ` : `
                                                    <div style="color: #666; font-size: 10px;">${!levelOk ? 'Lv.' + requiredLevel + ' required' : canUnlock.reason}</div>
                                                `}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Skill Details Panel -->
                <div id="skill-details" style="display: none;"></div>
            </div>
        `;

        // Attach listeners
        container.querySelectorAll('.skill-node-card').forEach(node => {
            node.addEventListener('click', () => {
                const skillId = node.dataset.skill;
                this.showSkillDetails(container, archetype, skillId);
            });

            // Hover effects
            node.addEventListener('mouseover', () => {
                node.style.transform = 'scale(1.03)';
                node.style.boxShadow = '0 0 15px ' + tree.color + '40';
            });
            node.addEventListener('mouseout', () => {
                node.style.transform = 'scale(1)';
                node.style.boxShadow = 'none';
            });
        });
    },

    showSkillDetails(container, archetype, skillId) {
        const skill = this.getSkill(archetype, skillId);
        if (!skill) return;

        const isUnlocked = this.isSkillUnlocked(skillId);
        const canUnlock = this.canUnlockSkill(archetype, skillId);
        const tree = this.getTree(archetype);
        const availablePoints = this.getAvailableSkillPoints();

        const detailsPanel = container.querySelector('#skill-details');
        detailsPanel.style.display = 'block';
        detailsPanel.innerHTML = `
            <div style="margin: 0 20px 20px; background: linear-gradient(135deg, #1a1a24, ${tree.color}10); border: 2px solid ${tree.color}; border-radius: 12px; overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, ${tree.color}30, ${tree.color}10); padding: 15px; border-bottom: 1px solid ${tree.color}40; display: flex; align-items: center; gap: 15px;">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, ${tree.color}, ${tree.color}80); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 26px;">${skill.icon}</div>
                    <div style="flex: 1;">
                        <div style="color: #ffffff; font-size: 16px; font-weight: 600;">${skill.name}</div>
                        <div style="display: flex; gap: 8px; margin-top: 5px;">
                            <span style="font-size: 10px; padding: 2px 8px; border-radius: 4px;
                                background: ${skill.type === 'passive' ? '#3b82f620' : skill.type === 'active' ? '#22c55e20' : '#a855f720'};
                                color: ${skill.type === 'passive' ? '#3b82f6' : skill.type === 'active' ? '#22c55e' : '#a855f7'};">
                                ${skill.type.toUpperCase()}
                            </span>
                            <span style="font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #33333380; color: #888;">Tier ${skill.tier}</span>
                        </div>
                    </div>
                    <button id="close-skill-detail" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">&times;</button>
                </div>

                <!-- Content -->
                <div style="padding: 15px;">
                    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0 0 15px 0;">${skill.description}</p>

                    <!-- Effects -->
                    <div style="background: #12121a; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                        <div style="color: #ffffff; font-size: 12px; font-weight: 600; margin-bottom: 8px;">Effects:</div>
                        <div style="color: #9ca3af; font-size: 12px;">${this.formatSkillEffects(skill.effect)}</div>
                    </div>

                    ${skill.cooldown ? `
                        <div style="color: #888; font-size: 11px; margin-bottom: 10px;">&#9201; Cooldown: ${skill.cooldown}s</div>
                    ` : ''}

                    ${skill.requires.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            <span style="color: #888; font-size: 11px;">Requires: </span>
                            ${skill.requires.map(reqId => {
                                const reqSkill = this.getSkill(archetype, reqId);
                                const isReqUnlocked = this.isSkillUnlocked(reqId);
                                return `<span style="color: ${isReqUnlocked ? '#22c55e' : '#ef4444'}; font-size: 11px;">${isReqUnlocked ? '&#10003;' : '&#128274;'} ${reqSkill?.name || reqId}</span>`;
                            }).join(', ')}
                        </div>
                    ` : ''}

                    <!-- Action Button -->
                    <div style="display: flex; gap: 10px;">
                        ${isUnlocked ? `
                            ${skill.type === SKILL_TYPES.ACTIVE || skill.type === SKILL_TYPES.ULTIMATE ? `
                                <button id="use-ability-btn" ${this.isOnCooldown(skillId) ? 'disabled' : ''} style="
                                    flex: 1; padding: 12px; border-radius: 8px;
                                    background: ${this.isOnCooldown(skillId) ? '#333' : 'linear-gradient(135deg, #22c55e, #16a34a)'};
                                    border: 2px solid ${this.isOnCooldown(skillId) ? '#555' : '#22c55e'};
                                    color: #fff; font-size: 14px; font-weight: 600;
                                    cursor: ${this.isOnCooldown(skillId) ? 'not-allowed' : 'pointer'};
                                    opacity: ${this.isOnCooldown(skillId) ? '0.5' : '1'};
                                ">
                                    ${this.isOnCooldown(skillId) ? `&#9201; Cooldown (${Math.ceil(this.getCooldownRemaining(skillId) / 1000)}s)` : '&#9889; Use Ability'}
                                </button>
                            ` : `
                                <div style="flex: 1; padding: 12px; background: linear-gradient(135deg, #0d2d1a, #1a4d2e); border: 2px solid #22c55e; border-radius: 8px; text-align: center; color: #22c55e; font-size: 14px;">
                                    &#10003; Passive Active
                                </div>
                            `}
                        ` : `
                            <button id="unlock-skill-btn" ${canUnlock.can ? '' : 'disabled'} style="
                                flex: 1; padding: 12px; border-radius: 8px;
                                background: ${canUnlock.can ? 'linear-gradient(135deg, ' + tree.color + ', ' + tree.color + '80)' : '#333'};
                                border: 2px solid ${canUnlock.can ? tree.color : '#555'};
                                color: #fff; font-size: 14px; font-weight: 600;
                                cursor: ${canUnlock.can ? 'pointer' : 'not-allowed'};
                                opacity: ${canUnlock.can ? '1' : '0.5'};
                            ">
                                ${canUnlock.can ? `&#128275; Unlock (${skill.cost} SP)` : canUnlock.reason}
                            </button>
                        `}
                    </div>

                    ${!isUnlocked && !canUnlock.can ? `
                        <div style="margin-top: 10px; padding: 10px; background: #1a1a24; border-radius: 6px; font-size: 11px; color: #888; text-align: center;">
                            &#128161; ${canUnlock.reason.includes('level') ? 'Level up to unlock this skill!' : canUnlock.reason.includes('point') ? 'Earn more skill points by leveling up!' : 'Complete requirements to unlock!'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Close button
        detailsPanel.querySelector('#close-skill-detail').addEventListener('click', () => {
            detailsPanel.style.display = 'none';
        });

        // Unlock button
        const unlockBtn = detailsPanel.querySelector('#unlock-skill-btn');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => {
                const result = this.unlockSkill(archetype, skillId);
                if (result.success) {
                    // Refresh the panel
                    this.renderSkillTreePanel(container);
                    // Dispatch event
                    document.dispatchEvent(new CustomEvent('pumparena:skill-unlocked', {
                        detail: { skillId, skill }
                    }));
                }
            });
        }

        // Use ability button
        const useBtn = detailsPanel.querySelector('#use-ability-btn');
        if (useBtn) {
            useBtn.addEventListener('click', () => {
                const result = this.useAbility(skillId);
                if (result.success) {
                    // Show reward notification
                    if (window.PumpArenaRPG?.showNotification) {
                        let rewardText = result.message;
                        if (result.rewards) {
                            const parts = [];
                            if (result.rewards.xp) parts.push(`+${result.rewards.xp} XP`);
                            if (result.rewards.reputation) parts.push(`+${result.rewards.reputation} Rep`);
                            if (result.rewards.tokens) parts.push(`+${result.rewards.tokens} Tokens`);
                            if (result.rewards.influence) parts.push(`+${result.rewards.influence} Influence`);
                            if (parts.length > 0) rewardText += ' - ' + parts.join(', ');
                        }
                        window.PumpArenaRPG.showNotification(rewardText, 'success');
                    }
                    // Refresh
                    this.renderSkillTreePanel(container);
                } else {
                    if (window.PumpArenaRPG?.showNotification) {
                        window.PumpArenaRPG.showNotification(result.message, 'warning');
                    }
                }
            });
        }
    },

    formatSkillEffects(effect) {
        if (!effect) return '<p>No effects</p>';

        const lines = [];
        const statNames = {
            dev: 'Development',
            com: 'Community',
            mkt: 'Marketing',
            str: 'Strategy',
            cha: 'Charisma',
            lck: 'Luck'
        };

        if (effect.stat && effect.bonus) {
            lines.push(`<li>+${effect.bonus} ${statNames[effect.stat] || effect.stat}</li>`);
        }
        if (effect.stat2 && effect.bonus2) {
            lines.push(`<li>+${effect.bonus2} ${statNames[effect.stat2] || effect.stat2}</li>`);
        }
        if (effect.allStatsBonus) {
            lines.push(`<li>+${effect.allStatsBonus} to ALL stats</li>`);
        }
        if (effect.xpBonus) {
            if (effect.xpBonus < 1) {
                lines.push(`<li>+${Math.round(effect.xpBonus * 100)}% XP gain</li>`);
            } else {
                lines.push(`<li>+${effect.xpBonus} XP</li>`);
            }
        }
        if (effect.reputationBonus) {
            lines.push(`<li>+${effect.reputationBonus} Reputation</li>`);
        }
        if (effect.reputationGainBonus) {
            lines.push(`<li>+${Math.round(effect.reputationGainBonus * 100)}% Reputation gains</li>`);
        }
        if (effect.tokenBonus) {
            lines.push(`<li>+${Math.round(effect.tokenBonus * 100)}% Token rewards</li>`);
        }
        if (effect.tokenReward) {
            lines.push(`<li>+${effect.tokenReward} Tokens</li>`);
        }
        if (effect.influenceBonus) {
            lines.push(`<li>+${effect.influenceBonus} Influence</li>`);
        }
        if (effect.influenceRegenBonus) {
            lines.push(`<li>+${Math.round(effect.influenceRegenBonus * 100)}% Influence regen</li>`);
        }
        if (effect.influenceCostReduction) {
            lines.push(`<li>-${Math.round(effect.influenceCostReduction * 100)}% Influence costs</li>`);
        }
        if (effect.negativeEventResistance) {
            lines.push(`<li>+${Math.round(effect.negativeEventResistance * 100)}% Negative event resistance</li>`);
        }
        if (effect.eventBonusChance) {
            lines.push(`<li>+${Math.round(effect.eventBonusChance * 100)}% Positive event chance</li>`);
        }
        if (effect.minigameScoreBonus) {
            lines.push(`<li>+${Math.round(effect.minigameScoreBonus * 100)}% Mini-game scores</li>`);
        }
        if (effect.relationshipBonus) {
            lines.push(`<li>+${effect.relationshipBonus} Relationship gain</li>`);
        }
        if (effect.relationshipGainBonus) {
            lines.push(`<li>+${Math.round(effect.relationshipGainBonus * 100)}% Relationship gains</li>`);
        }
        if (effect.taskSpeedBonus) {
            lines.push(`<li>+${Math.round(effect.taskSpeedBonus * 100)}% Task speed</li>`);
        }
        if (effect.timerExtension) {
            lines.push(`<li>+${effect.timerExtension}s to all timers</li>`);
        }
        if (effect.criticalSuccessChance) {
            lines.push(`<li>+${Math.round(effect.criticalSuccessChance * 100)}% Critical success chance</li>`);
        }
        if (effect.dailyBonusMultiplier && effect.dailyBonusMultiplier > 1) {
            lines.push(`<li>${effect.dailyBonusMultiplier}x Daily bonus multiplier</li>`);
        }
        if (effect.eventPrediction) {
            lines.push(`<li>Preview upcoming events</li>`);
        }
        if (effect.luckBonus) {
            lines.push(`<li>+${effect.luckBonus} Luck (temporary)</li>`);
        }
        if (effect.cooldownReduction) {
            lines.push(`<li>-${Math.round(effect.cooldownReduction * 100)}% Cooldowns</li>`);
        }
        if (effect.tokenProtection) {
            lines.push(`<li>Protect ${Math.round(effect.tokenProtection * 100)}% of tokens from loss</li>`);
        }

        return lines.length > 0 ? `<ul>${lines.join('')}</ul>` : '<p>Passive bonus active</p>';
    },

    // ==========================================
    // ACTIVE ABILITIES MINI-PANEL
    // ==========================================

    renderAbilitiesBar(container) {
        const abilities = this.getActiveAbilities();

        if (abilities.length === 0) {
            container.innerHTML = '<div class="no-abilities">No active abilities unlocked</div>';
            return;
        }

        container.innerHTML = `
            <div class="abilities-bar">
                ${abilities.map(ability => `
                    <button class="ability-btn ${ability.isOnCooldown ? 'on-cooldown' : ''}"
                            data-ability="${ability.id}"
                            title="${ability.name}: ${ability.description}">
                        <span class="ability-icon">${ability.icon}</span>
                        ${ability.isOnCooldown ? `<span class="cooldown-overlay">${Math.ceil(ability.cooldownRemaining / 1000)}s</span>` : ''}
                    </button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.ability-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const abilityId = btn.dataset.ability;
                const result = this.useAbility(abilityId);

                if (result.success) {
                    if (window.PumpArenaRPG?.showNotification) {
                        window.PumpArenaRPG.showNotification(result.message, 'success');
                    }
                    this.renderAbilitiesBar(container);
                } else {
                    if (window.PumpArenaRPG?.showNotification) {
                        window.PumpArenaRPG.showNotification(result.message, 'warning');
                    }
                }
            });
        });

        // Update cooldowns periodically
        const updateCooldowns = () => {
            abilities.forEach(ability => {
                const btn = container.querySelector(`[data-ability="${ability.id}"]`);
                if (!btn) return;

                const isOnCooldown = this.isOnCooldown(ability.id);
                const cooldownRemaining = this.getCooldownRemaining(ability.id);

                if (isOnCooldown) {
                    btn.classList.add('on-cooldown');
                    let overlay = btn.querySelector('.cooldown-overlay');
                    if (!overlay) {
                        overlay = document.createElement('span');
                        overlay.className = 'cooldown-overlay';
                        btn.appendChild(overlay);
                    }
                    overlay.textContent = Math.ceil(cooldownRemaining / 1000) + 's';
                } else {
                    btn.classList.remove('on-cooldown');
                    const overlay = btn.querySelector('.cooldown-overlay');
                    if (overlay) overlay.remove();
                }
            });
        };

        // Update every second while abilities are on cooldown
        if (abilities.some(a => a.isOnCooldown)) {
            const cooldownTimer = setInterval(() => {
                if (!container.isConnected) {
                    clearInterval(cooldownTimer);
                    return;
                }
                updateCooldowns();
                if (!abilities.some(a => this.isOnCooldown(a.id))) {
                    clearInterval(cooldownTimer);
                }
            }, 1000);
        }
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.PumpArenaSkillTrees = PumpArenaSkillTrees;
}
