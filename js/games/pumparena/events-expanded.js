/**
 * Pump Arena RPG - Expanded Events System
 *
 * 45+ random events organized by category:
 * - Market Events (12)
 * - NPC Encounters (10)
 * - Catastrophes (8)
 * - Opportunities (9)
 * - Secrets (6)
 *
 * ASDF Philosophy: Events have real consequences, choices matter
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

// Faction state accessors
const getFactionStanding = (id) => getRPGState().faction?.standing?.[id] || 0;
const modifyFactionStanding = (id, amount) => {
    const state = window.PumpArenaState?.get?.();
    if (!state?.faction?.standing) return 0;
    state.faction.standing[id] = Math.max(-100, Math.min(100, (state.faction.standing[id] || 0) + amount));
    window.PumpArenaState?.save?.();
    return state.faction.standing[id];
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
// EVENT CONSTANTS
// ============================================================

const EVENT_CONSTANTS = deepFreeze({
    // Event categories
    CATEGORIES: {
        MARKET: 'market',
        NPC: 'npc',
        CATASTROPHE: 'catastrophe',
        OPPORTUNITY: 'opportunity',
        SECRET: 'secret'
    },

    // Rarity weights (lower = rarer)
    RARITY: {
        COMMON: 0.40,
        UNCOMMON: 0.30,
        RARE: 0.20,
        EPIC: 0.08,
        LEGENDARY: 0.02
    },

    // Trigger conditions
    TRIGGERS: {
        LEVEL: 'level',
        TIME: 'time',
        LOCATION: 'location',
        FACTION: 'faction',
        RANDOM: 'random',
        MARKET: 'market',
        STORY: 'story'
    },

    // Event cooldowns (Fibonacci-based, in ms)
    COOLDOWNS: {
        SHORT: 3600000,      // 1h
        MEDIUM: 21600000,    // 6h
        LONG: 86400000,      // 24h
        VERY_LONG: 259200000 // 72h
    }
});

// ============================================================
// EVENT TEMPLATE HELPER
// ============================================================

function createEvent(config) {
    return {
        id: config.id,
        name: config.name,
        category: config.category,
        rarity: config.rarity || EVENT_CONSTANTS.RARITY.COMMON,
        icon: config.icon || '⚡',

        trigger: {
            type: config.triggerType || EVENT_CONSTANTS.TRIGGERS.RANDOM,
            minLevel: config.minLevel || 1,
            maxLevel: config.maxLevel || 99,
            requiredFaction: config.requiredFaction || null,
            requiredFlag: config.requiredFlag || null,
            excludeFlag: config.excludeFlag || null,
            marketCondition: config.marketCondition || null
        },

        description: config.description,
        narrative: config.narrative || '',

        choices: config.choices || [],

        cooldown: config.cooldown || EVENT_CONSTANTS.COOLDOWNS.MEDIUM,
        oneTime: config.oneTime || false,
        chainEvent: config.chainEvent || null
    };
}

// ============================================================
// MARKET EVENTS (12)
// ============================================================

const MARKET_EVENTS = {
    // === Common Market Events ===
    evt_bull_run: createEvent({
        id: 'evt_bull_run',
        name: 'Bull Run!',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '📈',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 2,
        description: 'The market is pumping! Green candles everywhere!',
        narrative: 'Traders are euphoric as prices surge across the board. This could be your chance to profit.',

        choices: [
            {
                id: 'ride_wave',
                text: 'Ride the wave (Buy more)',
                statRequired: null,
                outcomes: {
                    success: { chance: 0.70, tokens: 300, reputation: { pump_lords: 5 } },
                    fail: { chance: 0.30, tokens: -150, message: 'You bought the top!' }
                }
            },
            {
                id: 'take_profit',
                text: 'Take profits now',
                outcomes: {
                    success: { chance: 1.0, tokens: 150, message: 'Smart move, profits secured.' }
                }
            },
            {
                id: 'wait_observe',
                text: 'Wait and observe',
                outcomes: {
                    success: { chance: 0.50, tokens: 200, stats: { int: 1 } },
                    fail: { chance: 0.50, tokens: 0, message: 'The opportunity passed.' }
                }
            }
        ]
    }),

    evt_bear_market: createEvent({
        id: 'evt_bear_market',
        name: 'Bear Market',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '📉',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 2,
        description: 'Everything is red. Panic is spreading.',
        narrative: 'The market has turned bearish. Weak hands are selling, but is this an opportunity?',

        choices: [
            {
                id: 'panic_sell',
                text: 'Panic sell everything',
                outcomes: {
                    success: { chance: 0.40, tokens: -200, reputation: { bear_clan: 5 }, message: 'Sold near the bottom.' },
                    fail: { chance: 0.60, tokens: -500, message: 'Sold at the absolute bottom!' }
                }
            },
            {
                id: 'buy_dip',
                text: 'Buy the dip',
                statRequired: { lck: 10 },
                outcomes: {
                    success: { chance: 0.55, tokens: 500, reputation: { asdf: 5 }, message: 'Great timing!' },
                    fail: { chance: 0.45, tokens: -300, message: 'The dip kept dipping.' }
                }
            },
            {
                id: 'hodl',
                text: 'HODL strong',
                outcomes: {
                    success: { chance: 0.70, tokens: 100, stats: { def: 1 }, message: 'Diamond hands pay off.' },
                    fail: { chance: 0.30, tokens: -100, message: 'Still down, but holding.' }
                }
            }
        ]
    }),

    evt_flash_crash: createEvent({
        id: 'evt_flash_crash',
        name: 'Flash Crash!',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '⚡',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'Sudden violent drop! -30% in minutes!',
        narrative: 'A flash crash has hit the market. Everything is dropping fast. Liquidations everywhere!',

        choices: [
            {
                id: 'emergency_sell',
                text: 'Emergency sell to protect capital',
                outcomes: {
                    success: { chance: 0.60, tokens: -100, message: 'Limited losses.' },
                    fail: { chance: 0.40, tokens: -300, message: 'Sold into the crash.' }
                }
            },
            {
                id: 'aggressive_buy',
                text: 'Aggressively buy the crash',
                statRequired: { lck: 15, tokens: 500 },
                outcomes: {
                    success: { chance: 0.40, tokens: 1000, title: 'Crash Buyer', message: 'Legendary timing!' },
                    fail: { chance: 0.60, tokens: -500, message: 'Caught the falling knife.' }
                }
            },
            {
                id: 'do_nothing',
                text: 'Close the app and wait',
                outcomes: {
                    success: { chance: 0.80, tokens: 50, message: 'Ignorance was bliss.' },
                    fail: { chance: 0.20, tokens: -50, message: 'Still hurts when you look.' }
                }
            }
        ]
    }),

    evt_new_listing: createEvent({
        id: 'evt_new_listing',
        name: 'New Token Listing',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🆕',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 3,
        description: 'A new token is being listed on the exchange!',
        narrative: 'The community is buzzing about a new listing. Early investors could see massive gains... or losses.',

        choices: [
            {
                id: 'ape_in',
                text: 'Ape in immediately',
                outcomes: {
                    success: { chance: 0.35, tokens: 800, reputation: { pump_lords: 8 }, message: 'You caught a 10x!' },
                    fail: { chance: 0.65, tokens: -400, message: 'Rug pulled. Classic.' }
                }
            },
            {
                id: 'research_first',
                text: 'Research before buying',
                statRequired: { int: 12 },
                outcomes: {
                    success: { chance: 0.60, tokens: 400, stats: { int: 1 }, message: 'Due diligence paid off.' },
                    fail: { chance: 0.40, tokens: -100, message: 'Missed the pump while researching.' }
                }
            },
            {
                id: 'skip',
                text: 'Skip this one',
                outcomes: {
                    success: { chance: 0.70, tokens: 0, message: 'Dodged a bullet.' },
                    fail: { chance: 0.30, tokens: 0, message: 'It actually 100x\'d. Ouch.' }
                }
            }
        ]
    }),

    evt_whale_alert: createEvent({
        id: 'evt_whale_alert',
        name: 'Whale Alert!',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🐋',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'A massive wallet just moved tokens!',
        narrative: 'Blockchain watchers detected a whale moving millions. Is it accumulation or distribution?',

        choices: [
            {
                id: 'follow_whale',
                text: 'Follow the whale',
                outcomes: {
                    success: { chance: 0.50, tokens: 600, message: 'Whale was buying. Good call!' },
                    fail: { chance: 0.50, tokens: -400, message: 'Whale was selling. You got dumped on.' }
                }
            },
            {
                id: 'opposite_whale',
                text: 'Do the opposite',
                outcomes: {
                    success: { chance: 0.50, tokens: 500, message: 'Contrarian strategy worked!' },
                    fail: { chance: 0.50, tokens: -350, message: 'Should have followed...' }
                }
            },
            {
                id: 'ignore_whale',
                text: 'Ignore the noise',
                outcomes: {
                    success: { chance: 1.0, tokens: 50, stats: { def: 1 }, message: 'Stayed focused on your strategy.' }
                }
            }
        ]
    }),

    // === Rare Market Events ===
    evt_airdrop: createEvent({
        id: 'evt_airdrop',
        name: 'Surprise Airdrop!',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🪂',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 4,
        description: 'Free tokens from the sky!',
        narrative: 'You\'ve been selected for an airdrop! But there are multiple options...',

        choices: [
            {
                id: 'claim_all',
                text: 'Claim everything immediately',
                outcomes: {
                    success: { chance: 0.80, tokens: 500, items: ['airdrop_token'], message: 'Free money!' },
                    fail: { chance: 0.20, tokens: -100, message: 'It was a scam. Lost gas fees.' }
                }
            },
            {
                id: 'verify_first',
                text: 'Verify legitimacy first',
                statRequired: { int: 10 },
                outcomes: {
                    success: { chance: 0.95, tokens: 400, stats: { int: 1 }, message: 'Confirmed legit. Safe claim.' },
                    fail: { chance: 0.05, tokens: 100, message: 'Was legit but you missed the deadline.' }
                }
            },
            {
                id: 'share_info',
                text: 'Share with your community first',
                outcomes: {
                    success: { chance: 0.90, tokens: 300, reputation: { all: 5 }, message: 'Community appreciates you.' },
                    fail: { chance: 0.10, tokens: 0, message: 'Others claimed it all first.' }
                }
            }
        ]
    }),

    evt_market_manipulation: createEvent({
        id: 'evt_market_manipulation',
        name: 'Market Manipulation Detected',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🎭',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 8,
        description: 'Clear signs of manipulation in the market.',
        narrative: 'You\'ve spotted coordinated buying/selling. This is either a pump group or institutional play.',

        choices: [
            {
                id: 'front_run',
                text: 'Try to front-run the manipulation',
                statRequired: { spd: 15, lck: 12 },
                outcomes: {
                    success: { chance: 0.40, tokens: 1000, reputation: { pump_lords: -10 }, message: 'Beat them at their game!' },
                    fail: { chance: 0.60, tokens: -600, message: 'They saw you coming.' }
                }
            },
            {
                id: 'report_it',
                text: 'Report to the community',
                outcomes: {
                    success: { chance: 0.90, reputation: { based_collective: 15, asdf: 10 }, message: 'Community thanks you.' },
                    fail: { chance: 0.10, reputation: { pump_lords: -20 }, message: 'Made enemies with powerful people.' }
                }
            },
            {
                id: 'stay_away',
                text: 'Stay completely away',
                outcomes: {
                    success: { chance: 1.0, tokens: 0, message: 'Smart. Not your circus, not your monkeys.' }
                }
            }
        ]
    }),

    // === Epic/Legendary Market Events ===
    evt_golden_bull: createEvent({
        id: 'evt_golden_bull',
        name: 'Golden Bull Run',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🏆',
        rarity: EVENT_CONSTANTS.RARITY.EPIC,
        minLevel: 10,
        description: 'The biggest bull run in history is happening!',
        narrative: 'This is it. The legendary bull run everyone talked about. Everything is mooning.',

        choices: [
            {
                id: 'all_in',
                text: 'Go all in',
                outcomes: {
                    success: { chance: 0.60, tokens: 5000, title: 'Bull Run Survivor', stats: { lck: 2 } },
                    fail: { chance: 0.40, tokens: -2000, message: 'Bought the top of the cycle.' }
                }
            },
            {
                id: 'gradual_profit',
                text: 'Take profits gradually',
                outcomes: {
                    success: { chance: 0.85, tokens: 2000, stats: { int: 2 }, message: 'Maximized risk-adjusted returns.' },
                    fail: { chance: 0.15, tokens: 1000, message: 'Could have made more, but still profit.' }
                }
            },
            {
                id: 'sell_everything',
                text: 'Sell everything at the peak',
                statRequired: { lck: 20 },
                outcomes: {
                    success: { chance: 0.25, tokens: 8000, title: 'Perfect Seller', message: 'LEGENDARY! You called the top!' },
                    fail: { chance: 0.75, tokens: 1500, message: 'Close to the top, still great.' }
                }
            }
        ]
    }),

    evt_black_swan: createEvent({
        id: 'evt_black_swan',
        name: 'Black Swan Event',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🦢',
        rarity: EVENT_CONSTANTS.RARITY.LEGENDARY,
        minLevel: 12,
        oneTime: true,
        description: 'An impossible event has occurred. Market is in chaos.',
        narrative: 'A major exchange has collapsed. Billions in customer funds are gone. The entire market is in freefall.',

        choices: [
            {
                id: 'emergency_withdraw',
                text: 'Emergency withdraw from all exchanges',
                outcomes: {
                    success: { chance: 0.70, tokens: -500, items: ['lesson_learned'], stats: { def: 3 }, message: 'Saved most of your funds.' },
                    fail: { chance: 0.30, tokens: -2000, message: 'Withdrawals are frozen. Trapped.' }
                }
            },
            {
                id: 'buy_blood',
                text: 'When there\'s blood in the streets... buy',
                statRequired: { lck: 25, int: 20 },
                outcomes: {
                    success: { chance: 0.30, tokens: 10000, title: 'Black Swan Survivor', stats: { all: 3 } },
                    fail: { chance: 0.70, tokens: -3000, message: 'It got worse before it got better.' }
                }
            },
            {
                id: 'help_others',
                text: 'Focus on helping others in the community',
                outcomes: {
                    success: { chance: 1.0, tokens: -300, reputation: { all: 30 }, title: 'Crisis Helper', message: 'You\'ll be remembered for this.' }
                }
            }
        ]
    }),

    evt_regulation_news: createEvent({
        id: 'evt_regulation_news',
        name: 'Regulation Announcement',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '⚖️',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 6,
        description: 'Major regulatory news is breaking!',
        narrative: 'A major country just announced new crypto regulations. The market is reacting violently.',

        choices: [
            {
                id: 'sell_news',
                text: 'Sell the news',
                outcomes: {
                    success: { chance: 0.55, tokens: 300, message: 'Market overreacted, you profited.' },
                    fail: { chance: 0.45, tokens: -200, message: 'News was actually bullish.' }
                }
            },
            {
                id: 'buy_fear',
                text: 'Buy the fear',
                outcomes: {
                    success: { chance: 0.50, tokens: 500, reputation: { asdf: 5 }, message: 'Fear was overblown.' },
                    fail: { chance: 0.50, tokens: -350, message: 'Fear was justified.' }
                }
            },
            {
                id: 'wait_clarity',
                text: 'Wait for clarity',
                outcomes: {
                    success: { chance: 0.80, tokens: 100, stats: { int: 1 }, message: 'Patience rewarded.' },
                    fail: { chance: 0.20, tokens: 0, message: 'Missed the move either way.' }
                }
            }
        ]
    }),

    evt_partnership: createEvent({
        id: 'evt_partnership',
        name: 'Major Partnership Announced',
        category: EVENT_CONSTANTS.CATEGORIES.MARKET,
        icon: '🤝',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 5,
        description: 'A huge partnership has been announced!',
        narrative: 'A major company just partnered with a crypto project. This could be massive.',

        choices: [
            {
                id: 'buy_rumor',
                text: 'Buy immediately',
                outcomes: {
                    success: { chance: 0.55, tokens: 700, message: 'Early bird gets the worm!' },
                    fail: { chance: 0.45, tokens: -300, message: 'Was already priced in.' }
                }
            },
            {
                id: 'verify_partnership',
                text: 'Verify the partnership details',
                statRequired: { int: 14 },
                outcomes: {
                    success: { chance: 0.75, tokens: 500, stats: { int: 1 }, message: 'Details checked out. Smart entry.' },
                    fail: { chance: 0.25, tokens: 0, message: 'By the time you verified, pump was over.' }
                }
            },
            {
                id: 'sell_news_partnership',
                text: 'Sell the news',
                outcomes: {
                    success: { chance: 0.45, tokens: 400, message: 'Classic sell the news worked.' },
                    fail: { chance: 0.55, tokens: -200, message: 'This time it kept pumping.' }
                }
            }
        ]
    })
};

// ============================================================
// NPC ENCOUNTER EVENTS (10)
// ============================================================

const NPC_EVENTS = {
    evt_mysterious_trader: createEvent({
        id: 'evt_mysterious_trader',
        name: 'Mysterious Trader',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '🎭',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 3,
        description: 'A shadowy figure approaches with an offer.',
        narrative: '"I have something special for you... if you\'re willing to take a risk."',

        choices: [
            {
                id: 'accept_offer',
                text: 'Accept the mysterious offer',
                outcomes: {
                    success: { chance: 0.50, items: ['mystery_box'], tokens: 300, message: 'The box contains treasure!' },
                    fail: { chance: 0.50, tokens: -200, message: 'It was a trap. Lost your investment.' }
                }
            },
            {
                id: 'negotiate',
                text: 'Try to negotiate better terms',
                statRequired: { cha: 12 },
                outcomes: {
                    success: { chance: 0.60, items: ['rare_card'], tokens: 200, message: 'Negotiated a better deal.' },
                    fail: { chance: 0.40, tokens: 0, message: 'They walked away offended.' }
                }
            },
            {
                id: 'refuse_mystery',
                text: 'Refuse politely',
                outcomes: {
                    success: { chance: 1.0, reputation: { shadow_guild: 5 }, message: '"Wise choice. Another time, perhaps."' }
                }
            }
        ]
    }),

    evt_old_friend: createEvent({
        id: 'evt_old_friend',
        name: 'Old Friend Appears',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '👋',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 4,
        description: 'An old acquaintance from your past appears.',
        narrative: '"Hey! Remember me? I have a proposition for you..."',

        choices: [
            {
                id: 'help_friend',
                text: 'Help them with their request',
                outcomes: {
                    success: { chance: 0.70, tokens: 200, reputation: { all: 5 }, unlockNpc: 'old_friend', message: 'A renewed friendship!' },
                    fail: { chance: 0.30, tokens: -100, message: 'They took advantage of your kindness.' }
                }
            },
            {
                id: 'business_only',
                text: 'Keep it strictly business',
                outcomes: {
                    success: { chance: 0.80, tokens: 150, message: 'Fair transaction completed.' },
                    fail: { chance: 0.20, tokens: 50, message: 'Deal fell through but no hard feelings.' }
                }
            },
            {
                id: 'decline_friend',
                text: 'You\'ve changed. Decline.',
                outcomes: {
                    success: { chance: 1.0, tokens: 0, message: '"I understand. Good luck out there."' }
                }
            }
        ]
    }),

    evt_faction_recruiter: createEvent({
        id: 'evt_faction_recruiter',
        name: 'Faction Recruiter',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '📜',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'A faction representative approaches you.',
        narrative: '"Your reputation precedes you. We\'d like to discuss... opportunities."',

        choices: [
            {
                id: 'listen_offer',
                text: 'Hear their offer',
                outcomes: {
                    success: { chance: 1.0, reputation: { random_faction: 10 }, unlockQuest: 'faction_trial', message: 'Interesting proposition...' }
                }
            },
            {
                id: 'loyal_faction',
                text: 'I\'m loyal to my current faction',
                outcomes: {
                    success: { chance: 1.0, reputation: { current_faction: 15 }, message: 'Your loyalty is noted.' }
                }
            },
            {
                id: 'play_factions',
                text: 'Play both sides',
                statRequired: { cha: 15, int: 12 },
                outcomes: {
                    success: { chance: 0.40, reputation: { both: 5 }, tokens: 300, message: 'Masterful diplomacy.' },
                    fail: { chance: 0.60, reputation: { both: -15 }, message: 'They found out. Trust broken.' }
                }
            }
        ]
    }),

    evt_lost_traveler: createEvent({
        id: 'evt_lost_traveler',
        name: 'Lost Traveler',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '🧭',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 2,
        description: 'A confused newcomer asks for help.',
        narrative: '"Excuse me, I\'m new here and completely lost. Can you help?"',

        choices: [
            {
                id: 'help_extensively',
                text: 'Spend time helping them learn',
                outcomes: {
                    success: { chance: 0.90, xp: 100, reputation: { all: 5 }, unlockNpc: 'grateful_newbie', message: 'They\'ll remember your kindness.' },
                    fail: { chance: 0.10, xp: 50, message: 'They got confused but appreciated the effort.' }
                }
            },
            {
                id: 'quick_help',
                text: 'Give quick directions',
                outcomes: {
                    success: { chance: 0.70, xp: 50, message: 'Hopefully that was enough.' },
                    fail: { chance: 0.30, xp: 25, message: 'They got more lost.' }
                }
            },
            {
                id: 'ignore_traveler',
                text: 'Too busy, ignore them',
                outcomes: {
                    success: { chance: 1.0, reputation: { all: -2 }, message: 'They looked disappointed.' }
                }
            }
        ]
    }),

    evt_mentor_appears: createEvent({
        id: 'evt_mentor_appears',
        name: 'Mentor Appears',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '🧙',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 6,
        description: 'A legendary figure offers to teach you.',
        narrative: '"I see potential in you. Would you learn from my experience?"',

        choices: [
            {
                id: 'accept_training',
                text: 'Accept their training',
                outcomes: {
                    success: { chance: 0.95, stats: { random: 2 }, skills: ['mentor_skill'], message: 'Wisdom gained!' },
                    fail: { chance: 0.05, xp: 200, message: 'Training was too advanced for now.' }
                }
            },
            {
                id: 'ask_secrets',
                text: 'Ask about their secrets',
                statRequired: { int: 15 },
                outcomes: {
                    success: { chance: 0.60, items: ['ancient_wisdom'], stats: { int: 2 }, message: 'They shared hidden knowledge.' },
                    fail: { chance: 0.40, stats: { int: 1 }, message: '"Some things must be discovered, not told."' }
                }
            },
            {
                id: 'decline_mentor',
                text: 'Thank them but decline',
                outcomes: {
                    success: { chance: 1.0, tokens: 100, message: '"I respect your independence. Here\'s something to help."' }
                }
            }
        ]
    }),

    evt_rival_encounter: createEvent({
        id: 'evt_rival_encounter',
        name: 'Rival Encounter',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '⚔️',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'Your rival has found you.',
        narrative: '"We meet again. Shall we settle this once and for all?"',

        choices: [
            {
                id: 'accept_duel',
                text: 'Accept the duel',
                outcomes: {
                    success: { chance: 0.50, tokens: 500, reputation: { all: 10 }, title: 'Duel Victor', message: 'Victory! Your rival retreats.' },
                    fail: { chance: 0.50, tokens: -300, reputation: { all: -5 }, message: 'Defeated. Your rival gloats.' }
                }
            },
            {
                id: 'negotiate_peace',
                text: 'Propose a truce',
                statRequired: { cha: 14 },
                outcomes: {
                    success: { chance: 0.55, reputation: { all: 5 }, unlockNpc: 'former_rival', message: '"Perhaps we\'re better as allies."' },
                    fail: { chance: 0.45, reputation: { all: -3 }, message: 'They see it as weakness.' }
                }
            },
            {
                id: 'walk_away',
                text: 'Walk away',
                outcomes: {
                    success: { chance: 0.70, tokens: 0, message: '"Running? Typical."' },
                    fail: { chance: 0.30, tokens: -100, message: 'They attack from behind!' }
                }
            }
        ]
    }),

    evt_beggar: createEvent({
        id: 'evt_beggar',
        name: 'Beggar in Need',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '🙏',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 1,
        description: 'A poor soul asks for help.',
        narrative: '"Please, I lost everything in a rug pull. Can you spare some tokens?"',

        choices: [
            {
                id: 'give_generously',
                text: 'Give 100 tokens',
                outcomes: {
                    success: { chance: 0.80, tokenCost: 100, reputation: { all: 8 }, karma: 10, message: 'Blessings upon you!' },
                    fail: { chance: 0.20, tokenCost: 100, message: 'They ran off without thanking you.' }
                }
            },
            {
                id: 'give_small',
                text: 'Give 20 tokens',
                outcomes: {
                    success: { chance: 0.90, tokenCost: 20, reputation: { all: 3 }, message: '"Every bit helps. Thank you."' },
                    fail: { chance: 0.10, tokenCost: 20, message: '"That\'s all?" They seem ungrateful.' }
                }
            },
            {
                id: 'teach_fish',
                text: 'Teach them how to earn instead',
                statRequired: { int: 10 },
                outcomes: {
                    success: { chance: 0.70, reputation: { all: 10 }, xp: 100, message: 'They become self-sufficient!' },
                    fail: { chance: 0.30, reputation: { all: -2 }, message: 'They wanted tokens, not lessons.' }
                }
            },
            {
                id: 'ignore_beggar',
                text: 'Ignore and walk past',
                outcomes: {
                    success: { chance: 1.0, karma: -5, message: 'You feel a twinge of guilt.' }
                }
            }
        ]
    }),

    evt_oracle_vision: createEvent({
        id: 'evt_oracle_vision',
        name: 'Oracle Vision',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '🔮',
        rarity: EVENT_CONSTANTS.RARITY.EPIC,
        minLevel: 10,
        description: 'The Oracle has summoned you.',
        narrative: '"The threads of fate converge here. I see your path, but which will you choose?"',

        choices: [
            {
                id: 'hear_fortune',
                text: 'Hear your fortune',
                outcomes: {
                    success: { chance: 0.80, revealQuest: true, stats: { lck: 2 }, message: 'The future becomes clearer.' },
                    fail: { chance: 0.20, stats: { lck: 1 }, message: 'The vision was clouded.' }
                }
            },
            {
                id: 'change_fate',
                text: 'Ask to change your fate',
                statRequired: { int: 18, lck: 15 },
                outcomes: {
                    success: { chance: 0.30, resetNegativeFlags: true, stats: { all: 1 }, message: 'Fate bends to your will!' },
                    fail: { chance: 0.70, tokens: -500, message: 'Fate is not easily changed.' }
                }
            },
            {
                id: 'refuse_knowledge',
                text: 'Refuse to know the future',
                outcomes: {
                    success: { chance: 1.0, stats: { def: 2 }, message: '"Wise. Some knowledge is a burden."' }
                }
            }
        ]
    }),

    evt_ghost_npc: createEvent({
        id: 'evt_ghost_npc',
        name: 'Spirit of the Fallen',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '👻',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 8,
        description: 'A ghostly figure appears before you.',
        narrative: '"I was once like you... Let me share what I learned before my downfall."',

        choices: [
            {
                id: 'listen_ghost',
                text: 'Listen to their story',
                outcomes: {
                    success: { chance: 0.90, xp: 300, stats: { int: 2 }, items: ['ghost_wisdom'], message: 'Valuable lessons from beyond.' },
                    fail: { chance: 0.10, xp: 100, message: 'Their words fade before finishing.' }
                }
            },
            {
                id: 'help_ghost',
                text: 'Ask how you can help them find peace',
                outcomes: {
                    success: { chance: 0.70, unlockQuest: 'ghost_redemption', reputation: { all: 10 }, message: 'A new quest begins!' },
                    fail: { chance: 0.30, xp: 150, message: 'They cannot be helped.' }
                }
            },
            {
                id: 'flee_ghost',
                text: 'Flee in terror',
                outcomes: {
                    success: { chance: 1.0, stats: { spd: 1 }, message: 'You run faster than ever before.' }
                }
            }
        ]
    }),

    evt_imposter: createEvent({
        id: 'evt_imposter',
        name: 'Imposter Detected',
        category: EVENT_CONSTANTS.CATEGORIES.NPC,
        icon: '🎭',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 6,
        description: 'Someone is pretending to be a faction leader!',
        narrative: 'You notice inconsistencies in their behavior. This "leader" might be a fraud.',

        choices: [
            {
                id: 'expose_imposter',
                text: 'Expose them publicly',
                statRequired: { int: 13 },
                outcomes: {
                    success: { chance: 0.75, reputation: { affected_faction: 20 }, tokens: 400, message: 'Hero! You saved the faction.' },
                    fail: { chance: 0.25, reputation: { affected_faction: -15 }, message: 'They weren\'t an imposter. Awkward.' }
                }
            },
            {
                id: 'blackmail_imposter',
                text: 'Blackmail them',
                outcomes: {
                    success: { chance: 0.60, tokens: 600, reputation: { all: -10 }, message: 'Dirty money acquired.' },
                    fail: { chance: 0.40, tokens: -200, reputation: { all: -5 }, message: 'They called your bluff.' }
                }
            },
            {
                id: 'report_quietly',
                text: 'Report to authorities quietly',
                outcomes: {
                    success: { chance: 0.90, reputation: { affected_faction: 10 }, message: 'Handled professionally.' },
                    fail: { chance: 0.10, tokens: -50, message: 'Report was ignored.' }
                }
            }
        ]
    })
};

// ============================================================
// CATASTROPHE EVENTS (8)
// ============================================================

const CATASTROPHE_EVENTS = {
    evt_hack_attack: createEvent({
        id: 'evt_hack_attack',
        name: 'Hack Attack!',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '💀',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'A protocol you use has been hacked!',
        narrative: 'Hackers have exploited a vulnerability. Funds are being drained!',

        choices: [
            {
                id: 'emergency_revoke',
                text: 'Emergency revoke all approvals',
                outcomes: {
                    success: { chance: 0.70, tokens: -200, stats: { spd: 1 }, message: 'Quick action saved most funds!' },
                    fail: { chance: 0.30, tokens: -800, message: 'Too late. Significant losses.' }
                }
            },
            {
                id: 'wait_fix',
                text: 'Wait for the team to fix it',
                outcomes: {
                    success: { chance: 0.40, tokens: 0, message: 'Team patched it in time!' },
                    fail: { chance: 0.60, tokens: -500, message: 'Team response too slow.' }
                }
            },
            {
                id: 'front_run_hacker',
                text: 'Try to front-run the hacker',
                statRequired: { int: 18, spd: 15 },
                outcomes: {
                    success: { chance: 0.25, tokens: 1000, title: 'White Hat Hero', message: 'You saved funds and earned a bounty!' },
                    fail: { chance: 0.75, tokens: -600, message: 'Hacker was faster.' }
                }
            }
        ]
    }),

    evt_rug_pull: createEvent({
        id: 'evt_rug_pull',
        name: 'Rug Pull!',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '🏃',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 4,
        description: 'The team has abandoned the project!',
        narrative: 'Liquidity has been pulled. The token is crashing to zero. Chaos ensues!',

        choices: [
            {
                id: 'salvage_what_can',
                text: 'Try to salvage what you can',
                outcomes: {
                    success: { chance: 0.50, tokens: -300, stats: { spd: 1 }, message: 'Saved some value.' },
                    fail: { chance: 0.50, tokens: -700, message: 'Nothing left to salvage.' }
                }
            },
            {
                id: 'warn_others',
                text: 'Focus on warning others',
                outcomes: {
                    success: { chance: 0.90, tokens: -500, reputation: { all: 15 }, message: 'Lost money but saved others.' },
                    fail: { chance: 0.10, tokens: -500, reputation: { all: 5 }, message: 'Warning came too late for most.' }
                }
            },
            {
                id: 'track_ruggers',
                text: 'Try to track the ruggers',
                statRequired: { int: 16 },
                outcomes: {
                    success: { chance: 0.40, reputation: { all: 20 }, items: ['rugger_info'], message: 'Got useful intel on them!' },
                    fail: { chance: 0.60, tokens: -400, message: 'They covered their tracks well.' }
                }
            }
        ]
    }),

    evt_smart_contract_bug: createEvent({
        id: 'evt_smart_contract_bug',
        name: 'Smart Contract Bug',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '🐛',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 7,
        description: 'A critical bug has been found in a major contract!',
        narrative: 'Funds are at risk. The bug could be exploited any moment.',

        choices: [
            {
                id: 'exploit_for_good',
                text: 'White hat exploit to save funds',
                statRequired: { int: 20 },
                outcomes: {
                    success: { chance: 0.50, tokens: 2000, reputation: { all: 30 }, title: 'White Hat', message: 'Heroic save!' },
                    fail: { chance: 0.50, tokens: -500, reputation: { all: -10 }, message: 'Exploit failed. You look suspicious.' }
                }
            },
            {
                id: 'report_bug',
                text: 'Report to the team immediately',
                outcomes: {
                    success: { chance: 0.80, tokens: 500, reputation: { all: 15 }, message: 'Bug bounty earned!' },
                    fail: { chance: 0.20, tokens: 0, message: 'They already knew. No bounty.' }
                }
            },
            {
                id: 'withdraw_quietly',
                text: 'Quietly withdraw your funds',
                outcomes: {
                    success: { chance: 0.90, tokens: -100, message: 'Safe but feels wrong.' },
                    fail: { chance: 0.10, tokens: -400, message: 'Withdrawal reverted.' }
                }
            }
        ]
    }),

    evt_exchange_freeze: createEvent({
        id: 'evt_exchange_freeze',
        name: 'Exchange Freeze!',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '🧊',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 4,
        description: 'Your exchange has frozen withdrawals!',
        narrative: '"Temporary maintenance" they say. But the rumors are spreading...',

        choices: [
            {
                id: 'wait_patiently',
                text: 'Wait patiently for resolution',
                outcomes: {
                    success: { chance: 0.60, tokens: 0, stats: { def: 1 }, message: 'They reopened. Crisis averted.' },
                    fail: { chance: 0.40, tokens: -1000, message: 'They never reopened. Funds gone.' }
                }
            },
            {
                id: 'legal_action',
                text: 'Threaten legal action',
                outcomes: {
                    success: { chance: 0.30, tokens: 500, message: 'They prioritized your withdrawal.' },
                    fail: { chance: 0.70, tokens: -100, message: 'They don\'t care about your threats.' }
                }
            },
            {
                id: 'community_organize',
                text: 'Organize community response',
                statRequired: { cha: 14 },
                outcomes: {
                    success: { chance: 0.50, tokens: 200, reputation: { all: 10 }, message: 'United pressure worked!' },
                    fail: { chance: 0.50, tokens: -300, reputation: { all: 5 }, message: 'Exchange ignored the community.' }
                }
            }
        ]
    }),

    evt_regulatory_crackdown: createEvent({
        id: 'evt_regulatory_crackdown',
        name: 'Regulatory Crackdown',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '🚔',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 8,
        description: 'Regulators are targeting our space!',
        narrative: 'Multiple projects are being investigated. Fear is spreading.',

        choices: [
            {
                id: 'go_decentralized',
                text: 'Move everything to DeFi',
                outcomes: {
                    success: { chance: 0.70, tokens: -200, stats: { int: 1 }, reputation: { nodeforge: 10 }, message: 'Decentralization protects you.' },
                    fail: { chance: 0.30, tokens: -500, message: 'Gas fees ate your savings.' }
                }
            },
            {
                id: 'cash_out',
                text: 'Cash out completely',
                outcomes: {
                    success: { chance: 0.80, tokens: -30, message: 'Safe but boring.' },
                    fail: { chance: 0.20, tokens: -300, message: 'Bank account frozen.' }
                }
            },
            {
                id: 'lobby_fight',
                text: 'Contribute to lobbying efforts',
                outcomes: {
                    success: { chance: 0.40, tokenCost: 500, reputation: { all: 20 }, message: 'Fighting the good fight.' },
                    fail: { chance: 0.60, tokenCost: 500, message: 'Regulators don\'t care.' }
                }
            }
        ]
    }),

    evt_team_drama: createEvent({
        id: 'evt_team_drama',
        name: 'Team Drama!',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '😤',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 3,
        description: 'Internal team conflict goes public!',
        narrative: 'Founders are fighting on Twitter. The community is divided.',

        choices: [
            {
                id: 'pick_side',
                text: 'Pick a side publicly',
                outcomes: {
                    success: { chance: 0.50, reputation: { one_side: 15, other_side: -15 }, message: 'Your side won!' },
                    fail: { chance: 0.50, reputation: { one_side: -15, other_side: -5 }, message: 'Your side lost. Awkward.' }
                }
            },
            {
                id: 'stay_neutral',
                text: 'Stay neutral and observe',
                outcomes: {
                    success: { chance: 0.80, tokens: 50, stats: { int: 1 }, message: 'Wisdom in neutrality.' },
                    fail: { chance: 0.20, reputation: { all: -5 }, message: '"Either with us or against us" - both sides' }
                }
            },
            {
                id: 'mediate',
                text: 'Try to mediate',
                statRequired: { cha: 15 },
                outcomes: {
                    success: { chance: 0.35, reputation: { all: 20 }, title: 'Peacemaker', message: 'You brought them together!' },
                    fail: { chance: 0.65, reputation: { all: -5 }, message: 'Both sides blame you now.' }
                }
            }
        ]
    }),

    evt_natural_disaster: createEvent({
        id: 'evt_natural_disaster',
        name: 'Infrastructure Failure',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '⚠️',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 6,
        description: 'Major infrastructure is down!',
        narrative: 'Cloud providers are experiencing outages. Many services are offline.',

        choices: [
            {
                id: 'wait_restore',
                text: 'Wait for restoration',
                outcomes: {
                    success: { chance: 0.70, tokens: -100, message: 'Services restored after hours.' },
                    fail: { chance: 0.30, tokens: -400, message: 'Extended outage caused losses.' }
                }
            },
            {
                id: 'manual_operations',
                text: 'Find manual workarounds',
                statRequired: { int: 14 },
                outcomes: {
                    success: { chance: 0.60, tokens: 200, stats: { int: 1 }, message: 'Clever workarounds saved the day.' },
                    fail: { chance: 0.40, tokens: -200, message: 'Workarounds failed.' }
                }
            },
            {
                id: 'setup_redundancy',
                text: 'Learn and set up redundancy',
                outcomes: {
                    success: { chance: 0.90, tokenCost: 300, stats: { int: 1, def: 1 }, message: 'Better prepared for next time.' },
                    fail: { chance: 0.10, tokenCost: 300, message: 'Redundancy setup failed.' }
                }
            }
        ]
    }),

    evt_liquidity_crisis: createEvent({
        id: 'evt_liquidity_crisis',
        name: 'Liquidity Crisis',
        category: EVENT_CONSTANTS.CATEGORIES.CATASTROPHE,
        icon: '💧',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 6,
        description: 'Liquidity has dried up across markets!',
        narrative: 'Spreads are massive. Any large trade will move the market significantly.',

        choices: [
            {
                id: 'provide_liquidity',
                text: 'Provide liquidity for rewards',
                outcomes: {
                    success: { chance: 0.55, tokens: 800, reputation: { nodeforge: 10 }, message: 'LP rewards are massive!' },
                    fail: { chance: 0.45, tokens: -600, message: 'Impermanent loss hit hard.' }
                }
            },
            {
                id: 'wait_liquidity',
                text: 'Wait for liquidity to return',
                outcomes: {
                    success: { chance: 0.70, tokens: 0, message: 'Markets normalized eventually.' },
                    fail: { chance: 0.30, tokens: -200, message: 'Forced to exit at bad prices.' }
                }
            },
            {
                id: 'exploit_spreads',
                text: 'Try to profit from spreads',
                statRequired: { int: 16, spd: 14 },
                outcomes: {
                    success: { chance: 0.40, tokens: 1500, message: 'Arbitrage successful!' },
                    fail: { chance: 0.60, tokens: -400, message: 'Got sandwiched.' }
                }
            }
        ]
    })
};

// ============================================================
// OPPORTUNITY EVENTS (9)
// ============================================================

const OPPORTUNITY_EVENTS = {
    evt_alpha_leak: createEvent({
        id: 'evt_alpha_leak',
        name: 'Alpha Leak',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🔮',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 7,
        description: 'You\'ve stumbled upon insider information!',
        narrative: 'A reliable source shares upcoming news that will move the market.',

        choices: [
            {
                id: 'act_on_alpha',
                text: 'Act on the information',
                outcomes: {
                    success: { chance: 0.65, tokens: 1500, message: 'Alpha paid off massively!' },
                    fail: { chance: 0.35, tokens: -500, message: 'The alpha was wrong or priced in.' }
                }
            },
            {
                id: 'share_alpha',
                text: 'Share with your community',
                outcomes: {
                    success: { chance: 0.80, tokens: 500, reputation: { all: 15 }, message: 'Community appreciates the alpha!' },
                    fail: { chance: 0.20, tokens: 200, reputation: { all: -5 }, message: 'Alpha was wrong. Community upset.' }
                }
            },
            {
                id: 'verify_alpha',
                text: 'Verify before acting',
                statRequired: { int: 15 },
                outcomes: {
                    success: { chance: 0.75, tokens: 1000, stats: { int: 1 }, message: 'Verified and profited.' },
                    fail: { chance: 0.25, tokens: 0, message: 'Verification took too long.' }
                }
            }
        ]
    }),

    evt_early_access: createEvent({
        id: 'evt_early_access',
        name: 'Early Access Opportunity',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🎫',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'You\'ve been offered early access to a new project!',
        narrative: 'A promising new protocol is launching. You can get in before the public.',

        choices: [
            {
                id: 'max_allocation',
                text: 'Take maximum allocation',
                outcomes: {
                    success: { chance: 0.50, tokens: 2000, message: 'Early entry pays off big!' },
                    fail: { chance: 0.50, tokens: -800, message: 'Project underperformed.' }
                }
            },
            {
                id: 'small_allocation',
                text: 'Take small allocation',
                outcomes: {
                    success: { chance: 0.60, tokens: 600, message: 'Nice return on small risk.' },
                    fail: { chance: 0.40, tokens: -200, message: 'Minor loss, no big deal.' }
                }
            },
            {
                id: 'pass_opportunity',
                text: 'Pass on this one',
                outcomes: {
                    success: { chance: 0.50, tokens: 0, message: 'Dodged a bullet!' },
                    fail: { chance: 0.50, tokens: 0, message: 'It 50x\'d. Major regret.' }
                }
            }
        ]
    }),

    evt_whale_follow: createEvent({
        id: 'evt_whale_follow',
        name: 'Whale Following',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🐋',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 6,
        description: 'A known profitable whale just made a big move!',
        narrative: 'Tracking shows a whale with 90% win rate just accumulated a position.',

        choices: [
            {
                id: 'copy_whale',
                text: 'Copy their position exactly',
                outcomes: {
                    success: { chance: 0.70, tokens: 800, message: 'Whale wins again!' },
                    fail: { chance: 0.30, tokens: -400, message: 'Even whales are wrong sometimes.' }
                }
            },
            {
                id: 'smaller_position',
                text: 'Take a smaller position',
                outcomes: {
                    success: { chance: 0.70, tokens: 400, message: 'Smart risk management.' },
                    fail: { chance: 0.30, tokens: -150, message: 'Small loss, no worries.' }
                }
            },
            {
                id: 'inverse_whale',
                text: 'Bet against the whale',
                outcomes: {
                    success: { chance: 0.20, tokens: 1200, message: 'Contrarian play worked!' },
                    fail: { chance: 0.80, tokens: -500, message: 'Don\'t bet against whales.' }
                }
            }
        ]
    }),

    evt_hidden_gem: createEvent({
        id: 'evt_hidden_gem',
        name: 'Hidden Gem Found',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '💎',
        rarity: EVENT_CONSTANTS.RARITY.RARE,
        minLevel: 8,
        description: 'You\'ve discovered an undervalued project!',
        narrative: 'After deep research, you found a project that seems severely undervalued.',

        choices: [
            {
                id: 'accumulate_gem',
                text: 'Quietly accumulate',
                outcomes: {
                    success: { chance: 0.60, tokens: 2500, title: 'Gem Hunter', message: 'Found a 100x gem!' },
                    fail: { chance: 0.40, tokens: -700, message: 'It was undervalued for a reason.' }
                }
            },
            {
                id: 'share_gem',
                text: 'Share the find with friends',
                outcomes: {
                    success: { chance: 0.65, tokens: 1500, reputation: { all: 10 }, message: 'Everyone wins!' },
                    fail: { chance: 0.35, tokens: -400, reputation: { all: -5 }, message: 'Friends lost money on your call.' }
                }
            },
            {
                id: 'wait_confirmation',
                text: 'Wait for more confirmation',
                outcomes: {
                    success: { chance: 0.50, tokens: 800, stats: { int: 1 }, message: 'Patience rewarded.' },
                    fail: { chance: 0.50, tokens: 0, message: 'Missed the boat while waiting.' }
                }
            }
        ]
    }),

    evt_staking_bonus: createEvent({
        id: 'evt_staking_bonus',
        name: 'Limited Staking Bonus',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🎁',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 3,
        description: 'A protocol is offering boosted staking rewards!',
        narrative: 'Limited time offer: 3x APY for the next 24 hours.',

        choices: [
            {
                id: 'stake_all',
                text: 'Stake everything',
                outcomes: {
                    success: { chance: 0.85, tokens: 400, message: 'Bonus rewards claimed!' },
                    fail: { chance: 0.15, tokens: -200, message: 'Smart contract bug lost some funds.' }
                }
            },
            {
                id: 'stake_partial',
                text: 'Stake 50% of holdings',
                outcomes: {
                    success: { chance: 0.90, tokens: 200, message: 'Safe bonus collected.' },
                    fail: { chance: 0.10, tokens: -50, message: 'Minor issue but overall fine.' }
                }
            },
            {
                id: 'skip_staking',
                text: 'Skip - too good to be true',
                outcomes: {
                    success: { chance: 0.40, tokens: 0, stats: { int: 1 }, message: 'Was actually a scam. Dodged!' },
                    fail: { chance: 0.60, tokens: 0, message: 'It was legit. Missed free money.' }
                }
            }
        ]
    }),

    evt_governance_proposal: createEvent({
        id: 'evt_governance_proposal',
        name: 'Governance Opportunity',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🗳️',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 6,
        description: 'Your vote could swing a major governance proposal!',
        narrative: 'A contentious proposal is nearly tied. Your participation matters.',

        choices: [
            {
                id: 'vote_yes',
                text: 'Vote YES on the proposal',
                outcomes: {
                    success: { chance: 0.50, tokens: 300, reputation: { proposer_faction: 10 }, message: 'Proposal passed with your help!' },
                    fail: { chance: 0.50, tokens: 0, reputation: { opposer_faction: -5 }, message: 'Proposal failed anyway.' }
                }
            },
            {
                id: 'vote_no',
                text: 'Vote NO on the proposal',
                outcomes: {
                    success: { chance: 0.50, tokens: 300, reputation: { opposer_faction: 10 }, message: 'Proposal defeated!' },
                    fail: { chance: 0.50, tokens: 0, reputation: { proposer_faction: -5 }, message: 'It passed anyway.' }
                }
            },
            {
                id: 'abstain',
                text: 'Abstain from voting',
                outcomes: {
                    success: { chance: 1.0, tokens: 50, message: 'Neutrality preserved.' }
                }
            }
        ]
    }),

    evt_nft_mint: createEvent({
        id: 'evt_nft_mint',
        name: 'Rare NFT Mint',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🖼️',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 4,
        description: 'A hyped NFT collection is minting!',
        narrative: 'Everyone is talking about this mint. Gas wars are expected.',

        choices: [
            {
                id: 'mint_rush',
                text: 'Rush to mint',
                outcomes: {
                    success: { chance: 0.45, tokens: 1000, items: ['rare_nft'], message: 'Got a rare mint!' },
                    fail: { chance: 0.55, tokens: -400, message: 'Failed mint. Lost gas.' }
                }
            },
            {
                id: 'wait_secondary',
                text: 'Wait for secondary market',
                outcomes: {
                    success: { chance: 0.55, tokens: 500, message: 'Got a better deal on secondary.' },
                    fail: { chance: 0.45, tokens: -200, message: 'Prices pumped too fast.' }
                }
            },
            {
                id: 'skip_mint',
                text: 'Skip this mint',
                outcomes: {
                    success: { chance: 0.50, tokens: 0, message: 'Collection rugged. Lucky you!' },
                    fail: { chance: 0.50, tokens: 0, message: 'It was the next BAYC. Ouch.' }
                }
            }
        ]
    }),

    evt_contest_entry: createEvent({
        id: 'evt_contest_entry',
        name: 'Trading Contest',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '🏆',
        rarity: EVENT_CONSTANTS.RARITY.UNCOMMON,
        minLevel: 5,
        description: 'A trading competition is starting!',
        narrative: 'Top traders win massive prizes. Entry is free but stakes are high.',

        choices: [
            {
                id: 'enter_aggressive',
                text: 'Enter with aggressive strategy',
                statRequired: { lck: 12 },
                outcomes: {
                    success: { chance: 0.30, tokens: 3000, title: 'Contest Winner', message: 'Won the contest!' },
                    fail: { chance: 0.70, tokens: -500, message: 'Risky strategy backfired.' }
                }
            },
            {
                id: 'enter_conservative',
                text: 'Enter with conservative strategy',
                outcomes: {
                    success: { chance: 0.50, tokens: 500, message: 'Placed in top 20%!' },
                    fail: { chance: 0.50, tokens: -100, message: 'Didn\'t place but learned a lot.' }
                }
            },
            {
                id: 'skip_contest',
                text: 'Skip the contest',
                outcomes: {
                    success: { chance: 1.0, tokens: 0, message: 'Watched from the sidelines.' }
                }
            }
        ]
    }),

    evt_referral_bonus: createEvent({
        id: 'evt_referral_bonus',
        name: 'Referral Program',
        category: EVENT_CONSTANTS.CATEGORIES.OPPORTUNITY,
        icon: '👥',
        rarity: EVENT_CONSTANTS.RARITY.COMMON,
        minLevel: 2,
        description: 'A lucrative referral program is launching!',
        narrative: 'Refer friends and earn tokens for each signup.',

        choices: [
            {
                id: 'share_widely',
                text: 'Share your referral everywhere',
                outcomes: {
                    success: { chance: 0.70, tokens: 300, reputation: { all: 5 }, message: 'Multiple signups!' },
                    fail: { chance: 0.30, tokens: 50, message: 'Few people clicked.' }
                }
            },
            {
                id: 'share_friends',
                text: 'Only share with close friends',
                outcomes: {
                    success: { chance: 0.85, tokens: 150, reputation: { all: 8 }, message: 'Friends appreciated the opportunity.' },
                    fail: { chance: 0.15, tokens: 0, message: 'Friends weren\'t interested.' }
                }
            },
            {
                id: 'skip_referral',
                text: 'Don\'t participate',
                outcomes: {
                    success: { chance: 1.0, tokens: 0, message: 'Not your style.' }
                }
            }
        ]
    })
};

// ============================================================
// SECRET EVENTS (6)
// ============================================================

const SECRET_EVENTS = {
    evt_hidden_quest: createEvent({
        id: 'evt_hidden_quest',
        name: 'Hidden Path',
        category: EVENT_CONSTANTS.CATEGORIES.SECRET,
        icon: '🗝️',
        rarity: EVENT_CONSTANTS.RARITY.EPIC,
        minLevel: 10,
        oneTime: true,
        description: 'You\'ve discovered something no one else has seen...',
        narrative: 'A hidden doorway reveals itself. Ancient symbols glow faintly.',

        choices: [
            {
                id: 'enter_portal',
                text: 'Enter the mysterious portal',
                outcomes: {
                    success: { chance: 0.70, unlockQuest: 'secret_quest_chain', items: ['ancient_key'], stats: { all: 1 }, message: 'A secret world opens before you!' },
                    fail: { chance: 0.30, tokens: -300, stats: { lck: -1 }, message: 'The portal rejects you violently.' }
                }
            },
            {
                id: 'study_symbols',
                text: 'Study the symbols first',
                statRequired: { int: 18 },
                outcomes: {
                    success: { chance: 0.80, items: ['ancient_wisdom', 'decoder_ring'], stats: { int: 2 }, message: 'The secrets reveal themselves!' },
                    fail: { chance: 0.20, items: ['partial_map'], message: 'Some mysteries remain.' }
                }
            },
            {
                id: 'mark_location',
                text: 'Mark and leave for later',
                outcomes: {
                    success: { chance: 1.0, storyFlag: 'portal_marked', message: 'Location saved. The mystery waits.' }
                }
            }
        ]
    }),

    evt_easter_egg: createEvent({
        id: 'evt_easter_egg',
        name: 'Developer Easter Egg',
        category: EVENT_CONSTANTS.CATEGORIES.SECRET,
        icon: '🥚',
        rarity: EVENT_CONSTANTS.RARITY.LEGENDARY,
        minLevel: 8,
        oneTime: true,
        description: 'You found something the developers hid...',
        narrative: '"Congratulations! You found our secret. Here\'s a special reward."',

        choices: [
            {
                id: 'claim_egg',
                text: 'Claim the reward',
                outcomes: {
                    success: { chance: 1.0, items: ['dev_badge', 'rare_card_legendary'], tokens: 1000, title: 'Easter Egg Hunter', message: 'Ultra rare items obtained!' }
                }
            },
            {
                id: 'share_secret',
                text: 'Share the secret with the community',
                outcomes: {
                    success: { chance: 1.0, items: ['dev_badge'], tokens: 500, reputation: { all: 20 }, message: 'Community celebrates your find!' }
                }
            }
        ]
    }),

    evt_time_capsule: createEvent({
        id: 'evt_time_capsule',
        name: 'Time Capsule',
        category: EVENT_CONSTANTS.CATEGORIES.SECRET,
        icon: '⏳',
        rarity: EVENT_CONSTANTS.RARITY.EPIC,
        minLevel: 12,
        oneTime: true,
        description: 'An ancient time capsule from the early days...',
        narrative: 'Contains relics from the beginning of the blockchain era.',

        choices: [
            {
                id: 'open_capsule',
                text: 'Open the time capsule',
                outcomes: {
                    success: { chance: 0.80, items: ['genesis_token', 'founders_note'], tokens: 2000, message: 'Historical treasures found!' },
                    fail: { chance: 0.20, items: ['old_newspaper'], message: 'It was mostly junk.' }
                }
            },
            {
                id: 'donate_museum',
                text: 'Donate to the blockchain museum',
                outcomes: {
                    success: { chance: 1.0, reputation: { all: 30 }, title: 'Preservationist', message: 'History preserved for all.' }
                }
            },
            {
                id: 'reseal_capsule',
                text: 'Reseal for future generations',
                outcomes: {
                    success: { chance: 1.0, stats: { def: 2 }, karma: 20, message: 'Some treasures should wait.' }
                }
            }
        ]
    }),

    evt_satoshi_message: createEvent({
        id: 'evt_satoshi_message',
        name: 'Message from Satoshi',
        category: EVENT_CONSTANTS.CATEGORIES.SECRET,
        icon: '📜',
        rarity: EVENT_CONSTANTS.RARITY.LEGENDARY,
        minLevel: 15,
        oneTime: true,
        description: 'An encrypted message attributed to Satoshi Nakamoto...',
        narrative: 'The signature appears authentic. This could change everything.',

        choices: [
            {
                id: 'decrypt_message',
                text: 'Attempt to decrypt the message',
                statRequired: { int: 25 },
                outcomes: {
                    success: { chance: 0.40, items: ['satoshi_wisdom'], stats: { all: 3 }, title: 'Satoshi\'s Student', message: 'The message reveals profound insights!' },
                    fail: { chance: 0.60, items: ['encrypted_fragment'], stats: { int: 2 }, message: 'Partial decryption achieved.' }
                }
            },
            {
                id: 'publish_message',
                text: 'Publish it for all to see',
                outcomes: {
                    success: { chance: 0.70, reputation: { all: 50 }, title: 'Truth Revealer', message: 'The world reads Satoshi\'s words!' },
                    fail: { chance: 0.30, reputation: { all: -20 }, message: 'Called a fraud. Message dismissed.' }
                }
            },
            {
                id: 'keep_secret',
                text: 'Keep it secret, keep it safe',
                outcomes: {
                    success: { chance: 1.0, items: ['satoshi_letter'], stats: { def: 3 }, message: 'Some knowledge is personal.' }
                }
            }
        ]
    }),

    evt_void_rift: createEvent({
        id: 'evt_void_rift',
        name: 'Void Rift',
        category: EVENT_CONSTANTS.CATEGORIES.SECRET,
        icon: '🕳️',
        rarity: EVENT_CONSTANTS.RARITY.LEGENDARY,
        minLevel: 18,
        oneTime: true,
        requiredFlag: 'portal_marked',
        description: 'A tear in reality itself appears before you...',
        narrative: 'The void calls. Those who enter may gain power beyond imagination... or lose everything.',

        choices: [
            {
                id: 'enter_void',
                text: 'Enter the void',
                outcomes: {
                    success: { chance: 0.50, unlockCreature: 'void_wisp', stats: { all: 5 }, title: 'Void Walker', message: 'You return changed, powerful beyond measure.' },
                    fail: { chance: 0.50, tokens: -50, stats: { all: -2 }, message: 'The void rejected you. You barely escape.' }
                }
            },
            {
                id: 'study_void',
                text: 'Study the rift from a distance',
                outcomes: {
                    success: { chance: 0.80, items: ['void_fragment'], stats: { int: 3 }, message: 'Knowledge of the void gained.' },
                    fail: { chance: 0.20, stats: { int: 1 }, message: 'The rift defies understanding.' }
                }
            },
            {
                id: 'seal_rift',
                text: 'Attempt to seal the rift',
                statRequired: { def: 20, int: 20 },
                outcomes: {
                    success: { chance: 0.60, reputation: { all: 40 }, title: 'Rift Sealer', stats: { def: 3 }, message: 'Reality stabilizes. Heroes remember you.' },
                    fail: { chance: 0.40, tokens: -1000, message: 'The rift explodes. Massive damage.' }
                }
            }
        ]
    }),

    evt_founders_blessing: createEvent({
        id: 'evt_founders_blessing',
        name: 'Founder\'s Blessing',
        category: EVENT_CONSTANTS.CATEGORIES.SECRET,
        icon: '✨',
        rarity: EVENT_CONSTANTS.RARITY.LEGENDARY,
        minLevel: 20,
        oneTime: true,
        description: 'The spirit of a crypto founder appears...',
        narrative: '"You have walked the path of the true believer. I offer you my blessing."',

        choices: [
            {
                id: 'accept_blessing',
                text: 'Accept the blessing',
                outcomes: {
                    success: { chance: 1.0, permanentBonus: { all: 0.10 }, title: 'Founder Blessed', items: ['founder_amulet'], message: 'Permanent power increase!' }
                }
            },
            {
                id: 'share_blessing',
                text: 'Ask to share it with your community',
                outcomes: {
                    success: { chance: 0.70, permanentBonus: { all: 0.05 }, reputation: { all: 100 }, title: 'People\'s Blessed', message: 'Blessing spreads to all!' },
                    fail: { chance: 0.30, permanentBonus: { all: 0.03 }, message: 'Partial blessing shared.' }
                }
            },
            {
                id: 'decline_blessing',
                text: 'Decline - you want to earn everything',
                outcomes: {
                    success: { chance: 1.0, stats: { all: 3 }, title: 'Self-Made', karma: 50, message: '"I respect your conviction." Wisdom gained instead.' }
                }
            }
        ]
    })
};

// ============================================================
// EVENT MANAGER & EXPORTS
// ============================================================

const ALL_EVENTS = {
    ...MARKET_EVENTS,
    ...NPC_EVENTS,
    ...CATASTROPHE_EVENTS,
    ...OPPORTUNITY_EVENTS,
    ...SECRET_EVENTS
};

// Deep freeze all events for immutability
deepFreeze(ALL_EVENTS);

class EventManager {
    constructor() {
        this.events = ALL_EVENTS;
        this.eventHistory = [];
        this.cooldowns = {};
    }

    getEvent(eventId) {
        return this.events[eventId] || null;
    }

    getEventsByCategory(category) {
        return Object.values(this.events).filter(e => e.category === category);
    }

    /**
     * Get a random event based on game state
     */
    rollForEvent(gameState) {
        const eligibleEvents = this.getEligibleEvents(gameState);
        if (eligibleEvents.length === 0) return null;

        // Weight by rarity
        const totalWeight = eligibleEvents.reduce((sum, e) => sum + e.rarity, 0);
        let random = Math.random() * totalWeight;

        for (const event of eligibleEvents) {
            random -= event.rarity;
            if (random <= 0) {
                return event;
            }
        }

        return eligibleEvents[0];
    }

    /**
     * Get all events the player can encounter
     */
    getEligibleEvents(gameState) {
        const level = gameState.character?.level || 1;
        const completedEvents = gameState.events?.completed || [];
        const currentFaction = gameState.faction?.current;
        const storyFlags = gameState.storyFlags?.majorChoices || {};

        return Object.values(this.events).filter(event => {
            // Level check
            if (level < event.trigger.minLevel) return false;
            if (level > event.trigger.maxLevel) return false;

            // One-time check
            if (event.oneTime && completedEvents.includes(event.id)) return false;

            // Cooldown check
            if (this.isOnCooldown(event.id)) return false;

            // Required faction
            if (event.trigger.requiredFaction &&
                currentFaction !== event.trigger.requiredFaction) return false;

            // Required flag
            if (event.trigger.requiredFlag &&
                !storyFlags[event.trigger.requiredFlag]) return false;

            // Exclude flag
            if (event.trigger.excludeFlag &&
                storyFlags[event.trigger.excludeFlag]) return false;

            return true;
        });
    }

    /**
     * Check if event is on cooldown
     */
    isOnCooldown(eventId) {
        const cooldownEnd = this.cooldowns[eventId];
        if (!cooldownEnd) return false;
        return Date.now() < cooldownEnd;
    }

    /**
     * Set cooldown for event
     */
    setCooldown(eventId, durationMs) {
        this.cooldowns[eventId] = Date.now() + durationMs;
    }

    /**
     * Process choice outcome
     */
    processChoice(event, choiceId, gameState) {
        const choice = event.choices.find(c => c.id === choiceId);
        if (!choice) return null;

        // Check stat requirement
        if (choice.statRequired) {
            for (const [stat, required] of Object.entries(choice.statRequired)) {
                const playerStat = gameState.character?.stats?.[stat] || 0;
                if (playerStat < required) {
                    return {
                        success: false,
                        message: `Requires ${stat} ${required}+`,
                        outcomes: choice.outcomes.fail || { chance: 1.0, message: 'Failed stat check.' }
                    };
                }
            }
        }

        // Roll for success
        const outcomes = choice.outcomes;
        const roll = Math.random();

        if (roll < (outcomes.success?.chance || 1.0)) {
            return {
                success: true,
                result: outcomes.success
            };
        } else {
            return {
                success: false,
                result: outcomes.fail
            };
        }
    }

    getTotalEventCount() {
        return Object.keys(this.events).length;
    }
}

const eventManager = new EventManager();

export {
    EVENT_CONSTANTS,
    ALL_EVENTS,
    MARKET_EVENTS,
    NPC_EVENTS,
    CATASTROPHE_EVENTS,
    OPPORTUNITY_EVENTS,
    SECRET_EVENTS,
    eventManager
};

export function getEvent(id) {
    return eventManager.getEvent(id);
}

export function getEventsByCategory(category) {
    return eventManager.getEventsByCategory(category);
}

export function rollForRandomEvent(gameState) {
    return eventManager.rollForEvent(gameState);
}

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaEventsExpanded = {
    EVENT_CONSTANTS,
    ALL_EVENTS,
    MARKET_EVENTS,
    NPC_EVENTS,
    CATASTROPHE_EVENTS,
    OPPORTUNITY_EVENTS,
    SECRET_EVENTS,
    eventManager,
    getEvent: (id) => eventManager.getEvent(id),
    getEventsByCategory: (cat) => eventManager.getEventsByCategory(cat),
    rollForRandomEvent: (gs) => eventManager.rollForEvent(gs)
};

export function processEventChoice(event, choiceId, gameState) {
    return eventManager.processChoice(event, choiceId, gameState);
}

export function getTotalEventCount() {
    return eventManager.getTotalEventCount();
}

console.log(`Events loaded: ${eventManager.getTotalEventCount()} total events`);
