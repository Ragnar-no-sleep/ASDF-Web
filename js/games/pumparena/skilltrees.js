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
            container.innerHTML = '<p>No character data</p>';
            return;
        }

        const archetype = state.character.archetype;
        const tree = this.getTree(archetype);
        if (!tree) {
            container.innerHTML = '<p>No skill tree for this archetype</p>';
            return;
        }

        const availablePoints = this.getAvailableSkillPoints();
        const unlockedSkills = state.progression.skills || [];

        container.innerHTML = `
            <div class="skill-tree-container">
                <div class="skill-tree-header">
                    <div class="tree-icon" style="background: ${tree.color}33; color: ${tree.color};">
                        ${tree.icon}
                    </div>
                    <div class="tree-info">
                        <h4>${tree.name}</h4>
                        <p>${tree.description}</p>
                    </div>
                    <div class="skill-points-display">
                        <span class="points-label">Skill Points:</span>
                        <span class="points-value">${availablePoints}</span>
                    </div>
                </div>

                <div class="skill-branches">
                    ${Object.entries(tree.branches).map(([branchId, branch]) => `
                        <div class="skill-branch ${branchId === 'ultimate' ? 'ultimate-branch' : ''}" data-branch="${branchId}">
                            <div class="branch-header">
                                <span class="branch-icon">${branch.icon}</span>
                                <span class="branch-name">${branch.name}</span>
                            </div>
                            <div class="branch-skills">
                                ${branch.skills.map(skill => {
                                    const isUnlocked = unlockedSkills.includes(skill.id);
                                    const canUnlock = this.canUnlockSkill(archetype, skill.id);
                                    const statusClass = isUnlocked ? 'unlocked' : (canUnlock.can ? 'available' : 'locked');

                                    return `
                                        <div class="skill-node ${statusClass}" data-skill="${skill.id}">
                                            <div class="skill-tier">T${skill.tier}</div>
                                            <div class="skill-icon">${skill.icon}</div>
                                            <div class="skill-name">${skill.name}</div>
                                            <div class="skill-type-badge ${skill.type}">${skill.type}</div>
                                            ${!isUnlocked ? `<div class="skill-cost">${skill.cost} SP</div>` : ''}
                                            ${isUnlocked ? '<div class="unlocked-badge">&#10003;</div>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="skill-details-panel" id="skill-details" style="display: none;"></div>
            </div>
        `;

        // Attach listeners
        container.querySelectorAll('.skill-node').forEach(node => {
            node.addEventListener('click', () => {
                const skillId = node.dataset.skill;
                this.showSkillDetails(container, archetype, skillId);
            });
        });
    },

    showSkillDetails(container, archetype, skillId) {
        const skill = this.getSkill(archetype, skillId);
        if (!skill) return;

        const isUnlocked = this.isSkillUnlocked(skillId);
        const canUnlock = this.canUnlockSkill(archetype, skillId);
        const tree = this.getTree(archetype);

        const detailsPanel = container.querySelector('#skill-details');
        detailsPanel.style.display = 'block';
        detailsPanel.innerHTML = `
            <div class="skill-detail-card" style="border-color: ${tree.color};">
                <div class="skill-detail-header">
                    <div class="skill-detail-icon" style="background: ${tree.color}33;">
                        ${skill.icon}
                    </div>
                    <div class="skill-detail-info">
                        <h4>${skill.name}</h4>
                        <span class="skill-type-badge ${skill.type}">${skill.type}</span>
                    </div>
                    <button class="skill-detail-close" id="close-skill-detail">&times;</button>
                </div>

                <p class="skill-description">${skill.description}</p>

                <div class="skill-effect-list">
                    <h5>Effects:</h5>
                    ${this.formatSkillEffects(skill.effect)}
                </div>

                ${skill.cooldown ? `<div class="skill-cooldown-info">Cooldown: ${skill.cooldown}s</div>` : ''}

                ${skill.requires.length > 0 ? `
                    <div class="skill-requires">
                        <span>Requires: </span>
                        ${skill.requires.map(reqId => {
                            const reqSkill = this.getSkill(archetype, reqId);
                            const isReqUnlocked = this.isSkillUnlocked(reqId);
                            return `<span class="req-skill ${isReqUnlocked ? 'met' : 'unmet'}">${reqSkill?.name || reqId}</span>`;
                        }).join(', ')}
                    </div>
                ` : ''}

                <div class="skill-detail-actions">
                    ${isUnlocked ? `
                        ${skill.type === SKILL_TYPES.ACTIVE || skill.type === SKILL_TYPES.ULTIMATE ? `
                            <button class="btn-use-ability" id="use-ability-btn" ${this.isOnCooldown(skillId) ? 'disabled' : ''}>
                                ${this.isOnCooldown(skillId) ? `Cooldown (${Math.ceil(this.getCooldownRemaining(skillId) / 1000)}s)` : 'Use Ability'}
                            </button>
                        ` : `
                            <span class="passive-active-label">&#10003; Active</span>
                        `}
                    ` : `
                        <button class="btn-unlock-skill" id="unlock-skill-btn" ${canUnlock.can ? '' : 'disabled'}>
                            ${canUnlock.can ? `Unlock (${skill.cost} SP)` : canUnlock.reason}
                        </button>
                    `}
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
