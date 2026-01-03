/**
 * Pump Arena RPG - NPCs & Relationships System
 * Named characters with personalities, dialogue, and relationship progression
 */

'use strict';

// ============================================
// NPC DEFINITIONS
// ============================================

const NPCS = {
    // DeFi Project NPCs
    marcus: {
        id: 'marcus',
        name: 'Marcus Chen',
        title: 'DeFi Protocol Lead',
        project: 'safeyield',
        icon: '&#128104;',
        color: '#3b82f6',
        personality: ['analytical', 'cautious', 'loyal'],
        likes: ['technical discussions', 'security audits', 'long-term thinking'],
        dislikes: ['rushed decisions', 'hype culture', 'shortcuts'],
        greeting: "Good to see you. Let's talk strategy.",
        bio: "Former Wall Street quant who saw the light. Marcus built SafeYield from scratch and values security above all else.",
        dialogueStyle: 'formal',
        giftPreferences: {
            loved: ['audit_report', 'security_tool'],
            liked: ['coffee', 'tech_book'],
            disliked: ['meme_nft']
        }
    },

    sarah: {
        id: 'sarah',
        name: 'Sarah Kim',
        title: 'Community Lead',
        project: 'safeyield',
        icon: '&#128105;',
        color: '#ec4899',
        personality: ['energetic', 'empathetic', 'optimistic'],
        likes: ['community events', 'helping newcomers', 'positive vibes'],
        dislikes: ['toxicity', 'elitism', 'gatekeeping'],
        greeting: "Hey! Always happy to see friendly faces!",
        bio: "Started as a Discord mod, now runs one of the most engaged communities in DeFi. Sarah believes crypto should be for everyone.",
        dialogueStyle: 'casual',
        giftPreferences: {
            loved: ['community_badge', 'event_ticket'],
            liked: ['coffee', 'stickers'],
            disliked: ['boring_report']
        }
    },

    // Gaming Project NPCs
    alex: {
        id: 'alex',
        name: 'Alex Reyes',
        title: 'Game Director',
        project: 'pixelraiders',
        icon: '&#128102;',
        color: '#8b5cf6',
        personality: ['creative', 'competitive', 'perfectionist'],
        likes: ['game design', 'esports', 'pixel art'],
        dislikes: ['pay-to-win', 'lazy design', 'copycats'],
        greeting: "Ready to level up? Let's make something epic.",
        bio: "Indie game dev turned crypto gaming pioneer. Alex wants to prove that web3 games can actually be fun.",
        dialogueStyle: 'enthusiastic',
        giftPreferences: {
            loved: ['rare_skin', 'game_concept'],
            liked: ['energy_drink', 'controller'],
            disliked: ['spreadsheet']
        }
    },

    mika: {
        id: 'mika',
        name: 'Mika Tanaka',
        title: 'Esports Manager',
        project: 'pixelraiders',
        icon: '&#128103;',
        color: '#f59e0b',
        personality: ['strategic', 'ambitious', 'charismatic'],
        likes: ['tournaments', 'team building', 'winning'],
        dislikes: ['quitters', 'drama', 'excuses'],
        greeting: "Champions don't wait. What's your play?",
        bio: "Built esports teams from nothing. Mika sees Pixel Raiders as the next big competitive scene.",
        dialogueStyle: 'motivational',
        giftPreferences: {
            loved: ['trophy', 'team_jersey'],
            liked: ['protein_bar', 'headset'],
            disliked: ['participation_award']
        }
    },

    // Community/DAO NPCs
    jordan: {
        id: 'jordan',
        name: 'Jordan Blake',
        title: 'DAO Coordinator',
        project: 'basedcollective',
        icon: '&#129333;',
        color: '#22c55e',
        personality: ['diplomatic', 'patient', 'idealistic'],
        likes: ['governance', 'consensus', 'decentralization'],
        dislikes: ['centralization', 'apathy', 'power grabs'],
        greeting: "Every voice matters. What's on your mind?",
        bio: "Believes in the power of collective decision-making. Jordan has helped dozens of DAOs find their footing.",
        dialogueStyle: 'thoughtful',
        giftPreferences: {
            loved: ['governance_token', 'proposal_template'],
            liked: ['tea', 'philosophy_book'],
            disliked: ['veto_stamp']
        }
    },

    nova: {
        id: 'nova',
        name: 'Nova',
        title: 'Culture Lead',
        project: 'basedcollective',
        icon: '&#129489;',
        color: '#f97316',
        personality: ['artistic', 'rebellious', 'authentic'],
        likes: ['memes', 'art', 'authenticity'],
        dislikes: ['corporate speak', 'fake people', 'boring content'],
        greeting: "Vibes check! You pass. Barely.",
        bio: "Anonymous artist who became the soul of Based Collective. Nova's memes have moved markets.",
        dialogueStyle: 'playful',
        giftPreferences: {
            loved: ['rare_meme', 'art_commission'],
            liked: ['spray_paint', 'music_playlist'],
            disliked: ['brand_guidelines']
        }
    },

    // Infrastructure NPCs
    dmitri: {
        id: 'dmitri',
        name: 'Dmitri Volkov',
        title: 'Chief Architect',
        project: 'nodeforge',
        icon: '&#128104;',
        color: '#06b6d4',
        personality: ['brilliant', 'intense', 'perfectionist'],
        likes: ['optimization', 'elegant code', 'solving hard problems'],
        dislikes: ['technical debt', 'shortcuts', 'meetings'],
        greeting: "Time is TPS. Make it count.",
        bio: "Ex-Google engineer who left to build infrastructure that actually scales. Dmitri doesn't do small talk.",
        dialogueStyle: 'direct',
        giftPreferences: {
            loved: ['benchmark_results', 'rare_hardware'],
            liked: ['coffee', 'mechanical_keyboard'],
            disliked: ['motivational_poster']
        }
    },

    elena: {
        id: 'elena',
        name: 'Elena Santos',
        title: 'DevRel Lead',
        project: 'nodeforge',
        icon: '&#128105;',
        color: '#a855f7',
        personality: ['helpful', 'patient', 'knowledgeable'],
        likes: ['documentation', 'tutorials', 'developer success'],
        dislikes: ['gatekeeping', 'unclear docs', 'elitism'],
        greeting: "Here to help! What are you building?",
        bio: "Makes the complex simple. Elena has onboarded thousands of developers to NodeForge.",
        dialogueStyle: 'supportive',
        giftPreferences: {
            loved: ['tutorial_feedback', 'bug_report'],
            liked: ['notebook', 'stickers'],
            disliked: ['rtfm_meme']
        }
    },

    // Neutral/Mentor NPCs
    oracle: {
        id: 'oracle',
        name: 'The Oracle',
        title: 'Mysterious Advisor',
        project: null,
        icon: '&#129668;',
        color: '#fbbf24',
        personality: ['cryptic', 'wise', 'unpredictable'],
        likes: ['riddles', 'patience', 'seekers of truth'],
        dislikes: ['impatience', 'greed', 'closed minds'],
        greeting: "The path reveals itself to those who walk it...",
        bio: "No one knows who The Oracle really is. They appear when you least expect it, offering guidance wrapped in mystery.",
        dialogueStyle: 'cryptic',
        giftPreferences: {
            loved: ['ancient_artifact', 'rare_knowledge'],
            liked: ['incense', 'crystal'],
            disliked: ['rushed_question']
        }
    },

    whale: {
        id: 'whale',
        name: 'DeepBlue',
        title: 'Anonymous Whale',
        project: null,
        icon: '&#128051;',
        color: '#0ea5e9',
        personality: ['mysterious', 'influential', 'calculated'],
        likes: ['alpha', 'discretion', 'loyalty'],
        dislikes: ['leakers', 'paper hands', 'noise'],
        greeting: "Interesting... You have potential.",
        bio: "Wallet worth 9 figures. Identity unknown. DeepBlue moves markets with a single transaction.",
        dialogueStyle: 'measured',
        giftPreferences: {
            loved: ['exclusive_alpha', 'loyalty_proof'],
            liked: ['rare_nft', 'privacy_tool'],
            disliked: ['public_mention']
        }
    }
};

// ============================================
// RELATIONSHIP STAGES
// ============================================

const RELATIONSHIP_STAGES = {
    stranger: { min: 0, max: 19, name: 'Stranger', color: '#6b7280' },
    acquaintance: { min: 20, max: 39, name: 'Acquaintance', color: '#3b82f6' },
    friend: { min: 40, max: 59, name: 'Friend', color: '#22c55e' },
    ally: { min: 60, max: 79, name: 'Ally', color: '#a855f7' },
    partner: { min: 80, max: 100, name: 'Partner', color: '#f97316' }
};

// ============================================
// NPC CONVERSATIONS (Full dialogue trees)
// ============================================

const NPC_CONVERSATIONS = {
    marcus: {
        topics: {
            work: {
                title: 'About SafeYield',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "SafeYield is all about security-first DeFi. We audit everything three times before deployment.",
                        options: [
                            { text: "That sounds thorough", response: "It's the only way. Too many projects rush to market and pay the price.", affinity: 2 },
                            { text: "Isn't that slow?", response: "Speed kills in DeFi. Ask any project that got exploited.", affinity: -1 }
                        ]
                    },
                    friend: {
                        npc: "Between us? The real innovation isn't the code. It's the governance model. True decentralization.",
                        options: [
                            { text: "Tell me more", response: "Every major decision goes through a 7-day timelock. No shortcuts, even for me.", affinity: 5, xp: 25 },
                            { text: "Sounds bureaucratic", response: "Bureaucracy saves funds. Trust me on this.", affinity: 0 }
                        ]
                    },
                    partner: {
                        npc: "I've been thinking... What if SafeYield expanded into insurance? With your insights, we could build something revolutionary.",
                        options: [
                            { text: "I'm in. Let's design it.", response: "I knew I could count on you. This stays between us for now.", affinity: 10, xp: 100, unlocks: 'safeyield_insurance_quest' },
                            { text: "Need time to think", response: "Take your time. This is big.", affinity: 0 }
                        ]
                    }
                }
            },
            personal: {
                title: 'Personal',
                stages: ['friend', 'ally', 'partner'],
                dialogues: {
                    friend: {
                        npc: "I don't talk about this much... but I lost my savings in a rug pull. That's why security matters to me.",
                        options: [
                            { text: "I'm sorry. That must have been hard.", response: "It was. But it gave me purpose. Never again.", affinity: 8 },
                            { text: "At least you learned from it", response: "Cold comfort at the time. But yes.", affinity: 3 }
                        ]
                    },
                    partner: {
                        npc: "You know, I've never trusted anyone in this space like I trust you. Whatever happens next, remember that.",
                        options: [
                            { text: "The feeling is mutual.", response: "Then let's build something that outlasts us both.", affinity: 15, achievement: 'marcus_partner' }
                        ]
                    }
                }
            },
            advice: {
                title: 'Ask for Advice',
                stages: ['acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    acquaintance: {
                        npc: "Advice? Read the audits. Always. If a project won't share them, run.",
                        options: [
                            { text: "Good tip, thanks", response: "Common sense. Sadly not common enough.", affinity: 2, xp: 15 }
                        ]
                    },
                    ally: {
                        npc: "You want real advice? Build relationships before you need them. When crisis hits, your network is everything.",
                        options: [
                            { text: "Speaking from experience?", response: "The 2022 crash taught me that. Some people showed their true colors. Others... became lifelong allies.", affinity: 5, xp: 40 }
                        ]
                    }
                }
            }
        }
    },

    sarah: {
        topics: {
            community: {
                title: 'About Community',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "Community isn't about numbers. It's about people who actually care. Quality over quantity!",
                        options: [
                            { text: "How do you build that?", response: "One genuine conversation at a time. No shortcuts!", affinity: 3 },
                            { text: "Sounds idealistic", response: "Maybe! But idealists change the world. Cynics just watch.", affinity: 0 }
                        ]
                    },
                    friend: {
                        npc: "Want to know my secret? I remember names. Everyone. Every new member gets a personal welcome.",
                        options: [
                            { text: "That's impressive dedication", response: "It takes time but it's worth it. People feel seen.", affinity: 5, xp: 20 },
                            { text: "How do you scale that?", response: "You train others to do the same. Culture is contagious!", affinity: 3, xp: 15 }
                        ]
                    },
                    partner: {
                        npc: "I've been drafting a community playbook. All my learnings from the past 3 years. Want to co-author it?",
                        options: [
                            { text: "Absolutely! Let's do this!", response: "YAY! This is going to help so many builders!", affinity: 12, xp: 150, unlocks: 'community_playbook_quest' }
                        ]
                    }
                }
            },
            personal: {
                title: 'Personal Life',
                stages: ['friend', 'ally', 'partner'],
                dialogues: {
                    friend: {
                        npc: "Sometimes I wonder if I care too much? Like, I literally lose sleep over Discord drama...",
                        options: [
                            { text: "That's what makes you great at this", response: "You think? Sometimes it just feels exhausting.", affinity: 6, xp: 25 },
                            { text: "You should set boundaries", response: "I know, I know... it's just hard when people need help.", affinity: 4 }
                        ]
                    },
                    partner: {
                        npc: "Can I tell you something? You're the first person in crypto I feel like I can be real with. No performance, no masks.",
                        options: [
                            { text: "Same here. It means a lot.", response: "*hugs* Okay I'm getting emotional. But seriously, thank you.", affinity: 15, achievement: 'sarah_partner' }
                        ]
                    }
                }
            },
            fun: {
                title: 'Just Chat',
                stages: ['acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    acquaintance: {
                        npc: "Oh! Did you see that meme in the general chat yesterday? I laughed for like 10 minutes!",
                        options: [
                            { text: "The one about gas fees? Classic!", response: "YES! Someone added the crying cat and I lost it!", affinity: 3 },
                            { text: "I missed it", response: "I'll send it to you! It's too good!", affinity: 2 }
                        ]
                    },
                    friend: {
                        npc: "Random thought: What if we did a community talent show? Singing, art, whatever! Fun for fun's sake!",
                        options: [
                            { text: "I love that idea!", response: "Right?! No prizes, no competition, just vibes!", affinity: 5, xp: 20 },
                            { text: "Could be chaotic", response: "EMBRACE THE CHAOS! That's where the magic happens!", affinity: 3 }
                        ]
                    }
                }
            }
        }
    },

    alex: {
        topics: {
            game: {
                title: 'Game Design',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "Most web3 games are just Ponzis with pixels. Pixel Raiders is different. Fun first, tokens second.",
                        options: [
                            { text: "How do you balance that?", response: "You make a game people would play WITHOUT the tokens. Then you add them.", affinity: 3, xp: 10 },
                            { text: "Bold claim", response: "Play for 10 minutes. Then judge.", affinity: 1 }
                        ]
                    },
                    friend: {
                        npc: "I'm working on a secret boss. Nobody knows about it yet. Want a sneak peek?",
                        options: [
                            { text: "Show me!", response: "*shows tablet* It's called 'The Founding Dev'. Easter egg that rewards OG players.", affinity: 8, xp: 50 },
                            { text: "Keep it secret", response: "Respect. True gamer mindset.", affinity: 5 }
                        ]
                    },
                    partner: {
                        npc: "Real talk: I want you to help me design the expansion. Your ideas, my code. 50/50 creative control.",
                        options: [
                            { text: "Let's make gaming history!", response: "NOW you're talking! First design doc due next week!", affinity: 15, xp: 200, unlocks: 'pixel_raiders_expansion' }
                        ]
                    }
                }
            },
            esports: {
                title: 'Competitive Scene',
                stages: ['acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    acquaintance: {
                        npc: "We're building an esports league. Proper tournaments, proper prizes. The works.",
                        options: [
                            { text: "Can I compete?", response: "Season 2 open qualifiers start soon. Practice up.", affinity: 3, xp: 15 },
                            { text: "Who's sponsoring?", response: "Can't say yet. But big names are interested.", affinity: 2 }
                        ]
                    },
                    ally: {
                        npc: "There's a spot on the dev team's in-house roster. Interested?",
                        options: [
                            { text: "Wait, really? Yes!", response: "You've got skill. And more importantly, you understand the game's soul.", affinity: 10, xp: 75, unlocks: 'esports_team_member' }
                        ]
                    }
                }
            }
        }
    },

    dmitri: {
        topics: {
            tech: {
                title: 'Technical Discussion',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "Current EVM throughput is pathetic. NodeForge achieves 10x better with our custom execution layer.",
                        options: [
                            { text: "How?", response: "Parallel transaction processing. State sharding. No magic. Just engineering.", affinity: 3, xp: 20 },
                            { text: "Impressive numbers", response: "Numbers mean nothing without reliability. We have both.", affinity: 2 }
                        ]
                    },
                    friend: {
                        npc: "I'll show you something. *opens laptop* This is our internal benchmark suite. These numbers aren't public.",
                        options: [
                            { text: "These latencies are incredible", response: "Still not good enough. But we're getting there.", affinity: 8, xp: 60 },
                            { text: "What's the bottleneck?", response: "Consensus finality. Always consensus. It's a physics problem as much as CS.", affinity: 10, xp: 80 }
                        ]
                    },
                    partner: {
                        npc: "I need a technical co-lead. Someone who understands scale AND can talk to humans. Interested?",
                        options: [
                            { text: "I'm honored. Yes.", response: "Good. First task: review the L3 architecture proposal. Have notes ready by Monday.", affinity: 15, xp: 250, unlocks: 'nodeforge_colead' }
                        ]
                    }
                }
            },
            philosophy: {
                title: 'Deep Thoughts',
                stages: ['friend', 'ally', 'partner'],
                dialogues: {
                    friend: {
                        npc: "Sometimes I wonder if we're building tools for liberation or just more efficient cages.",
                        options: [
                            { text: "The tool doesn't decide. Users do.", response: "Convenient answer. But tools shape behavior. We're not neutral.", affinity: 5, xp: 30 },
                            { text: "Heavy thoughts for a Tuesday", response: "*almost smiles* Every day is good for existential doubt.", affinity: 3 }
                        ]
                    },
                    partner: {
                        npc: "You're one of the few people I can have these conversations with. Most just want to talk tokenomics.",
                        options: [
                            { text: "Meaning matters more than money", response: "Exactly. Though money helps fund the meaning.", affinity: 12, achievement: 'dmitri_partner' }
                        ]
                    }
                }
            }
        }
    },

    nova: {
        topics: {
            art: {
                title: 'Art & Culture',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "Art in crypto isn't about jpegs. It's about cultural ownership. Who controls the narrative?",
                        options: [
                            { text: "The community does", response: "Correct answer! Gold star for you.", affinity: 5 },
                            { text: "Usually the founders", response: "Cynical but often true. That's what we're trying to change.", affinity: 2 }
                        ]
                    },
                    friend: {
                        npc: "I'm working on something new. Not telling anyone what it is. But you can be the first to see it.",
                        options: [
                            { text: "I'm honored", response: "*shows phone* It's a generative meme engine. AI trained on 5 years of CT culture.", affinity: 10, xp: 50 },
                            { text: "Why me?", response: "Because you actually get it. Most people just see pixels. You see language.", affinity: 8 }
                        ]
                    },
                    partner: {
                        npc: "I want to reveal my identity. But only to you first. Before anyone else. You ready?",
                        options: [
                            { text: "Your secret is safe with me.", response: "I know. That's why you're the first. *removes mask* Hi. Real me.", affinity: 20, achievement: 'nova_identity', xp: 300 }
                        ]
                    }
                }
            },
            memes: {
                title: 'Meme Talk',
                stages: ['acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    acquaintance: {
                        npc: "Rate my latest meme. Scale of 1 to 'quit posting forever'.",
                        options: [
                            { text: "Solid 8/10", response: "I'll take it. The wojak could be better but the caption slaps.", affinity: 4 },
                            { text: "9/10 banger", response: "Okay now I don't trust you. Nobody gives 9s.", affinity: 3 }
                        ]
                    },
                    friend: {
                        npc: "Plot twist: What if WE are the meme? The whole crypto space? Performing for each other?",
                        options: [
                            { text: "We're all playing characters", response: "EXACTLY! The meta-awareness makes it art!", affinity: 8, xp: 40 },
                            { text: "Too deep for a Wednesday", response: "Every day is meme day. There is no Wednesday.", affinity: 5 }
                        ]
                    }
                }
            }
        }
    },

    oracle: {
        topics: {
            wisdom: {
                title: 'Seek Wisdom',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "You seek answers. But have you considered... the questions themselves are the answer?",
                        options: [
                            { text: "Can you be more specific?", response: "Specificity is the enemy of truth. Embrace ambiguity.", affinity: 2 },
                            { text: "That's frustratingly vague", response: "Frustration is clarity trying to emerge. Good.", affinity: 5 }
                        ]
                    },
                    friend: {
                        npc: "The patterns speak to me. Bull. Bear. Neither. Both. The market breathes, young builder.",
                        options: [
                            { text: "What do the patterns say now?", response: "Consolidation precedes transformation. Whether up or down... that depends on you.", affinity: 8, xp: 50 },
                            { text: "Are you ever just... wrong?", response: "Always. And also never. Time is circular.", affinity: 6 }
                        ]
                    },
                    partner: {
                        npc: "You have earned what few ever earn. A question answered directly: The next cycle begins in spring. Prepare.",
                        options: [
                            { text: "Thank you, Oracle.", response: "Thank yourself. You walked the path. I merely pointed.", affinity: 20, xp: 500, achievement: 'oracle_prophecy' }
                        ]
                    }
                }
            },
            riddles: {
                title: 'Request a Riddle',
                stages: ['acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    acquaintance: {
                        npc: "A riddle, then. 'What grows stronger when you give it away?' Think carefully.",
                        options: [
                            { text: "Knowledge", response: "Acceptable. But also: trust, community, alpha. All grow when shared wisely.", affinity: 5, xp: 30 },
                            { text: "Reputation", response: "Hmm. Interesting interpretation. Not wrong.", affinity: 3, xp: 20 }
                        ]
                    },
                    ally: {
                        npc: "Final riddle: 'What is the one thing no amount of money can buy in crypto?' Answer truly.",
                        options: [
                            { text: "Time. You can't buy back missed opportunities.", response: "Profound. And correct. You have learned well.", affinity: 15, xp: 100 },
                            { text: "Genuine community trust.", response: "Also true. Perhaps there are multiple answers after all.", affinity: 12, xp: 80 }
                        ]
                    }
                }
            }
        }
    },

    whale: {
        topics: {
            alpha: {
                title: 'Request Alpha',
                stages: ['friend', 'ally', 'partner'],
                dialogues: {
                    friend: {
                        npc: "You want alpha? Fine. Watch wallet 0x7f3...2a9. When it moves, follow within 24 hours. Don't ask why.",
                        options: [
                            { text: "I'll watch it. Thank you.", response: "Don't thank me yet. Prove you can act on information.", affinity: 8, xp: 100 },
                            { text: "Can you tell me more?", response: "No. Either trust me or don't. There is no middle.", affinity: 3 }
                        ]
                    },
                    partner: {
                        npc: "The next big narrative isn't AI. It's not RWA. It's something no one is talking about yet. I'll share... but you never heard it from me.",
                        options: [
                            { text: "My lips are sealed.", response: "*whispers* DePIN for satellites. Space crypto. 18 months out. You're welcome.", affinity: 20, xp: 500, achievement: 'whale_alpha', tokens: 500 }
                        ]
                    }
                }
            },
            trust: {
                title: 'Build Trust',
                stages: ['stranger', 'acquaintance', 'friend', 'ally', 'partner'],
                dialogues: {
                    stranger: {
                        npc: "Trust is earned in drops and lost in buckets. Why should I trust you?",
                        options: [
                            { text: "I have nothing to prove. Actions speak.", response: "Hmm. Confident. We'll see if it's earned.", affinity: 5 },
                            { text: "Because I keep my mouth shut.", response: "That's the right answer. Discretion is everything in this game.", affinity: 8, xp: 25 }
                        ]
                    },
                    ally: {
                        npc: "You've proven yourself. I don't say that lightly. What do you want?",
                        options: [
                            { text: "Nothing. Just respect.", response: "Then you've earned it. Welcome to the inner circle.", affinity: 15, achievement: 'whale_trust' },
                            { text: "Access to your network.", response: "Direct. I appreciate that. Earn it step by step.", affinity: 10 }
                        ]
                    }
                }
            }
        }
    }
};

// ============================================
// RELATIONSHIP MILESTONES
// ============================================

const RELATIONSHIP_MILESTONES = {
    acquaintance: {
        threshold: 20,
        rewards: { xp: 50, reputation: 10 },
        message: "You've become acquaintances with {npcName}!"
    },
    friend: {
        threshold: 40,
        rewards: { xp: 150, reputation: 25, tokens: 50 },
        message: "{npcName} now considers you a friend!"
    },
    ally: {
        threshold: 60,
        rewards: { xp: 300, reputation: 50, tokens: 100 },
        message: "You and {npcName} are now trusted allies!",
        unlocks: 'ally_quests'
    },
    partner: {
        threshold: 80,
        rewards: { xp: 500, reputation: 100, tokens: 250 },
        message: "You've reached max bond with {npcName}!",
        unlocks: 'partner_storyline',
        achievement: true
    }
};

// ============================================
// DIALOGUE TEMPLATES
// ============================================

const DIALOGUE_TEMPLATES = {
    first_meeting: {
        formal: [
            "Ah, you must be {playerName}. I've heard about you. I'm {npcName}.",
            "Welcome. I don't usually meet with newcomers, but something tells me you're different.",
        ],
        casual: [
            "Oh hey! You're {playerName} right? I'm {npcName}! So cool to meet you!",
            "Yooo, new face! I'm {npcName}. Welcome to the chaos!",
        ],
        enthusiastic: [
            "No way! {playerName}! I've been wanting to meet you! I'm {npcName}!",
            "Finally! Someone who looks like they actually care! I'm {npcName}!",
        ],
        cryptic: [
            "The winds spoke of your arrival, {playerName}. They call me... {npcName}.",
            "So you've found your way here. Interesting. I am known as {npcName}.",
        ],
        direct: [
            "{playerName}. {npcName}. Let's skip the pleasantries.",
            "You're {playerName}. I'm {npcName}. Time is valuable. What do you need?",
        ],
        playful: [
            "Ohhh look who wandered in! {playerName}! I'm {npcName}, your new favorite person!",
            "A wild {playerName} appears! I'm {npcName}. This is gonna be fun!",
        ],
        supportive: [
            "Hi there! You must be {playerName}. I'm {npcName}, and I'm here to help!",
            "Welcome, {playerName}! I'm {npcName}. Don't worry, everyone starts somewhere!",
        ],
        motivational: [
            "{playerName}! I can see the fire in your eyes. I'm {npcName}. Let's win together.",
            "So you're {playerName}. {npcName} here. I only work with winners. You one?",
        ],
        thoughtful: [
            "Ah, {playerName}. I've been thinking about community lately. I'm {npcName}.",
            "Welcome, {playerName}. I'm {npcName}. I believe you have something valuable to offer.",
        ],
        measured: [
            "{playerName}. Hmm. {npcName}. I'll be watching your moves.",
            "So you're {playerName}. I'm {npcName}. Prove you're worth my time.",
        ]
    },

    greeting_by_stage: {
        stranger: [
            "Oh, it's you again.",
            "Did you need something?",
            "We've met before, right?"
        ],
        acquaintance: [
            "Hey, good to see you!",
            "Back again? Nice.",
            "How's it going?"
        ],
        friend: [
            "There's my favorite builder!",
            "Always happy when you show up!",
            "Perfect timing, I was just thinking about you!"
        ],
        ally: [
            "My trusted ally! What's the mission?",
            "You know I've always got your back.",
            "Together we're unstoppable!"
        ],
        partner: [
            "My partner in crime! Let's change the world!",
            "There's no one I trust more than you.",
            "Whatever it is, I'm in. Always."
        ]
    }
};

// ============================================
// NPC SYSTEM STATE
// ============================================

let npcState = {
    relationships: {},  // npcId -> { affinity: 0-100, stage, interactions, lastInteraction, gifts, questsCompleted }
    activeDialogue: null,
    metNPCs: [],
    favoriteNPC: null
};

// ============================================
// NPC FUNCTIONS
// ============================================

function initNPCSystem() {
    const state = window.PumpArenaState.get();

    if (state.relationships) {
        npcState.relationships = state.relationships;
    }

    // Initialize any NPCs with starting relationships
    if (state.character.startingRelationships > 0) {
        initStartingRelationships(state.character.startingRelationships);
    }

    return npcState;
}

function initStartingRelationships(count) {
    const availableNPCs = Object.keys(NPCS).filter(id => !npcState.relationships[id]);

    for (let i = 0; i < count && availableNPCs.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableNPCs.length);
        const npcId = availableNPCs.splice(randomIndex, 1)[0];

        npcState.relationships[npcId] = createRelationship(25); // Start as acquaintance
        npcState.metNPCs.push(npcId);
    }

    saveNPCState();
}

function createRelationship(initialAffinity = 0) {
    return {
        affinity: initialAffinity,
        stage: getRelationshipStage(initialAffinity),
        interactions: 0,
        lastInteraction: null,
        gifts: [],
        questsCompleted: [],
        firstMet: Date.now(),
        specialFlags: []
    };
}

function getRelationshipStage(affinity) {
    for (const [key, stage] of Object.entries(RELATIONSHIP_STAGES)) {
        if (affinity >= stage.min && affinity <= stage.max) {
            return key;
        }
    }
    return 'stranger';
}

function getNPC(npcId) {
    return NPCS[npcId] || null;
}

function getRelationship(npcId) {
    if (!npcState.relationships[npcId]) {
        npcState.relationships[npcId] = createRelationship();
    }
    return npcState.relationships[npcId];
}

function meetNPC(npcId) {
    if (!NPCS[npcId]) return null;

    const npc = NPCS[npcId];
    const relationship = getRelationship(npcId);
    const playerName = window.PumpArenaState.get().character.name;

    if (!npcState.metNPCs.includes(npcId)) {
        npcState.metNPCs.push(npcId);

        // Generate first meeting dialogue
        const templates = DIALOGUE_TEMPLATES.first_meeting[npc.dialogueStyle] || DIALOGUE_TEMPLATES.first_meeting.casual;
        const template = templates[Math.floor(Math.random() * templates.length)];
        const dialogue = template
            .replace('{playerName}', playerName)
            .replace('{npcName}', npc.name);

        // Small affinity boost for first meeting
        changeAffinity(npcId, 5);

        saveNPCState();

        return {
            npc,
            dialogue,
            isFirstMeeting: true,
            relationship
        };
    }

    // Returning visitor
    const stageGreetings = DIALOGUE_TEMPLATES.greeting_by_stage[relationship.stage];
    const greeting = stageGreetings[Math.floor(Math.random() * stageGreetings.length)];

    return {
        npc,
        dialogue: greeting,
        isFirstMeeting: false,
        relationship
    };
}

function changeAffinity(npcId, amount) {
    const relationship = getRelationship(npcId);
    const oldStage = relationship.stage;

    // Apply archetype bonus
    const state = window.PumpArenaState.get();
    if (state.character.archetypeBonus?.type === 'relationship' && amount > 0) {
        amount = Math.floor(amount * (1 + state.character.archetypeBonus.value));
    }

    relationship.affinity = Math.max(0, Math.min(100, relationship.affinity + amount));
    relationship.stage = getRelationshipStage(relationship.affinity);
    relationship.interactions++;
    relationship.lastInteraction = Date.now();

    saveNPCState();

    // Check for stage change
    if (relationship.stage !== oldStage) {
        document.dispatchEvent(new CustomEvent('pumparena:relationship-stage-change', {
            detail: {
                npcId,
                npc: NPCS[npcId],
                oldStage,
                newStage: relationship.stage,
                affinity: relationship.affinity
            }
        }));
    }

    return relationship;
}

function giveGift(npcId, giftId) {
    const npc = NPCS[npcId];
    if (!npc) return { success: false, message: 'NPC not found' };

    const relationship = getRelationship(npcId);
    let affinityChange = 5; // Base gift value
    let reaction = 'neutral';

    // Check gift preference
    if (npc.giftPreferences.loved.includes(giftId)) {
        affinityChange = 15;
        reaction = 'loved';
    } else if (npc.giftPreferences.liked.includes(giftId)) {
        affinityChange = 10;
        reaction = 'liked';
    } else if (npc.giftPreferences.disliked.includes(giftId)) {
        affinityChange = -5;
        reaction = 'disliked';
    }

    relationship.gifts.push({ giftId, date: Date.now(), reaction });
    changeAffinity(npcId, affinityChange);

    return {
        success: true,
        reaction,
        affinityChange,
        message: getGiftReactionMessage(npc, reaction)
    };
}

function getGiftReactionMessage(npc, reaction) {
    const messages = {
        loved: [
            `${npc.name}'s eyes light up! "This is perfect! How did you know?"`,
            `${npc.name} is genuinely moved. "I... thank you. This means a lot."`,
        ],
        liked: [
            `${npc.name} smiles. "That's really thoughtful, thanks!"`,
            `${npc.name} nods approvingly. "Nice choice. I appreciate it."`,
        ],
        neutral: [
            `${npc.name} accepts the gift politely. "Oh, thanks."`,
            `${npc.name} seems neither impressed nor disappointed. "I'll find a use for this."`,
        ],
        disliked: [
            `${npc.name} frowns slightly. "Uh... thanks, I guess?"`,
            `${npc.name} tries to hide their disappointment. "That's... interesting."`,
        ]
    };

    const options = messages[reaction] || messages.neutral;
    return options[Math.floor(Math.random() * options.length)];
}

function saveNPCState() {
    const state = window.PumpArenaState.get();
    state.relationships = npcState.relationships;
    window.PumpArenaState.save();
}

function getMetNPCs() {
    return npcState.metNPCs.map(id => ({
        ...NPCS[id],
        relationship: getRelationship(id)
    }));
}

function getNPCsByProject(projectId) {
    return Object.values(NPCS).filter(npc => npc.project === projectId);
}

function getAvailableNPCs() {
    return Object.values(NPCS);
}

// ============================================
// NPC UI RENDERING
// ============================================

function renderNPCCard(npcId, compact = false) {
    const npc = NPCS[npcId];
    if (!npc) return '';

    const relationship = getRelationship(npcId);
    const stage = RELATIONSHIP_STAGES[relationship.stage];
    const hasMetBefore = npcState.metNPCs.includes(npcId);

    if (compact) {
        return `
            <div class="npc-card-compact" data-npc="${npcId}" style="--npc-color: ${npc.color}">
                <div class="npc-avatar">${npc.icon}</div>
                <div class="npc-info">
                    <div class="npc-name">${npc.name}</div>
                    <div class="npc-title">${npc.title}</div>
                </div>
                <div class="npc-affinity" style="color: ${stage.color}">
                    <div class="affinity-bar">
                        <div class="affinity-fill" style="width: ${relationship.affinity}%; background: ${stage.color}"></div>
                    </div>
                    <span class="affinity-stage">${stage.name}</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="npc-card" data-npc="${npcId}" style="--npc-color: ${npc.color}">
            <div class="npc-header">
                <div class="npc-avatar-large">${npc.icon}</div>
                <div class="npc-identity">
                    <h3 class="npc-name">${npc.name}</h3>
                    <div class="npc-title">${npc.title}</div>
                    ${npc.project ? `<div class="npc-project">${formatProjectName(npc.project)}</div>` : ''}
                </div>
            </div>

            <div class="npc-relationship">
                <div class="relationship-stage" style="color: ${stage.color}">${stage.name}</div>
                <div class="relationship-bar">
                    <div class="relationship-fill" style="width: ${relationship.affinity}%; background: ${stage.color}"></div>
                </div>
                <div class="relationship-value">${relationship.affinity}/100</div>
            </div>

            <div class="npc-bio">
                <p>${hasMetBefore ? npc.bio : '???'}</p>
            </div>

            ${hasMetBefore ? `
                <div class="npc-traits">
                    <div class="trait-section">
                        <span class="trait-label">Likes:</span>
                        <span class="trait-values">${npc.likes.slice(0, 2).join(', ')}</span>
                    </div>
                    <div class="trait-section">
                        <span class="trait-label">Dislikes:</span>
                        <span class="trait-values">${npc.dislikes.slice(0, 2).join(', ')}</span>
                    </div>
                </div>
            ` : ''}

            <div class="npc-actions">
                <button class="btn-npc-talk" data-npc="${npcId}">Talk</button>
                ${relationship.affinity >= 20 ? `<button class="btn-npc-gift" data-npc="${npcId}">Gift</button>` : ''}
            </div>
        </div>
    `;
}

function renderRelationshipsPanel(container) {
    const metNPCs = getMetNPCs();

    container.innerHTML = `
        <div class="relationships-panel">
            <div class="panel-header">
                <h3>Relationships</h3>
                <span class="met-count">${metNPCs.length} / ${Object.keys(NPCS).length} met</span>
            </div>

            ${metNPCs.length === 0 ? `
                <div class="no-relationships">
                    <p>You haven't met anyone yet.</p>
                    <p>Explore projects to meet new people!</p>
                </div>
            ` : `
                <div class="relationships-list">
                    ${metNPCs.map(npc => renderNPCCard(npc.id, true)).join('')}
                </div>
            `}
        </div>
    `;

    // Add click handlers
    container.querySelectorAll('.npc-card-compact').forEach(card => {
        card.addEventListener('click', () => {
            showNPCDetail(card.dataset.npc);
        });
    });
}

function showNPCDetail(npcId) {
    const npc = NPCS[npcId];
    if (!npc) return;

    const content = renderNPCCard(npcId, false);

    if (window.PumpArenaRPG && window.PumpArenaRPG.showModal) {
        window.PumpArenaRPG.showModal(npc.name, content);
    }
}

function formatProjectName(projectId) {
    const names = {
        safeyield: 'SafeYield DAO',
        pixelraiders: 'Pixel Raiders',
        basedcollective: 'Based Collective',
        nodeforge: 'NodeForge'
    };
    return names[projectId] || projectId;
}

// ============================================
// CONVERSATION SYSTEM
// ============================================

function getAvailableTopics(npcId) {
    const npc = NPCS[npcId];
    if (!npc) return [];

    const conversations = NPC_CONVERSATIONS[npcId];
    if (!conversations) return [];

    const relationship = getRelationship(npcId);
    const stage = relationship.stage;
    const topics = [];

    for (const [topicId, topic] of Object.entries(conversations.topics)) {
        if (topic.stages.includes(stage)) {
            const dialogue = topic.dialogues[stage];
            if (dialogue) {
                topics.push({
                    id: topicId,
                    title: topic.title,
                    available: true
                });
            }
        } else {
            // Show locked topics
            const requiredStage = topic.stages[0];
            topics.push({
                id: topicId,
                title: topic.title,
                available: false,
                requiredStage: RELATIONSHIP_STAGES[requiredStage]?.name || requiredStage
            });
        }
    }

    return topics;
}

function startConversation(npcId, topicId) {
    const npc = NPCS[npcId];
    if (!npc) return null;

    const conversations = NPC_CONVERSATIONS[npcId];
    if (!conversations || !conversations.topics[topicId]) return null;

    const relationship = getRelationship(npcId);
    const topic = conversations.topics[topicId];
    const dialogue = topic.dialogues[relationship.stage];

    if (!dialogue) return null;

    npcState.activeDialogue = {
        npcId,
        topicId,
        stage: relationship.stage,
        dialogue
    };

    return {
        npc,
        topic: topic.title,
        text: dialogue.npc,
        options: dialogue.options.map((opt, idx) => ({
            index: idx,
            text: opt.text,
            preview: getOptionPreview(opt)
        }))
    };
}

function selectDialogueOption(optionIndex) {
    if (!npcState.activeDialogue) return null;

    const { npcId, topicId, stage, dialogue } = npcState.activeDialogue;
    const option = dialogue.options[optionIndex];

    if (!option) return null;

    const npc = NPCS[npcId];
    const results = {
        response: option.response,
        rewards: {}
    };

    // Apply affinity change
    if (option.affinity) {
        changeAffinity(npcId, option.affinity);
        results.rewards.affinity = option.affinity;
    }

    // Apply XP reward
    if (option.xp) {
        window.PumpArenaState.addXP(option.xp);
        results.rewards.xp = option.xp;
    }

    // Apply token reward
    if (option.tokens) {
        window.PumpArenaState.addTokens(option.tokens);
        results.rewards.tokens = option.tokens;
    }

    // Check for achievement
    if (option.achievement) {
        if (window.PumpArenaAchievements) {
            window.PumpArenaAchievements.unlockAchievement(option.achievement);
        }
        results.rewards.achievement = option.achievement;
    }

    // Check for quest unlock
    if (option.unlocks) {
        if (window.PumpArenaQuests) {
            window.PumpArenaQuests.unlockQuest(option.unlocks);
        }
        results.unlocked = option.unlocks;
    }

    // Dispatch event
    document.dispatchEvent(new CustomEvent('pumparena:dialogue-complete', {
        detail: {
            npcId,
            npc,
            topicId,
            option: option.text,
            results
        }
    }));

    npcState.activeDialogue = null;

    return results;
}

function getOptionPreview(option) {
    const previews = [];

    if (option.affinity > 0) previews.push(`+${option.affinity} ❤️`);
    else if (option.affinity < 0) previews.push(`${option.affinity} 💔`);

    if (option.xp) previews.push(`+${option.xp} XP`);
    if (option.tokens) previews.push(`+${option.tokens} 🪙`);

    return previews.length > 0 ? previews.join(' ') : null;
}

// ============================================
// CONVERSATION UI
// ============================================

function renderConversationUI(container, npcId) {
    const meeting = meetNPC(npcId);
    if (!meeting) {
        container.innerHTML = '<p>NPC not found.</p>';
        return;
    }

    const topics = getAvailableTopics(npcId);
    const npc = meeting.npc;
    const relationship = meeting.relationship;
    const stage = RELATIONSHIP_STAGES[relationship.stage];

    container.innerHTML = `
        <div class="conversation-panel">
            <div class="conversation-header">
                <div class="npc-portrait" style="background: ${npc.color}33; border-color: ${npc.color};">
                    <span class="npc-icon-large">${npc.icon}</span>
                </div>
                <div class="npc-details">
                    <h3>${npc.name}</h3>
                    <div class="npc-title-small">${npc.title}</div>
                    <div class="npc-stage" style="color: ${stage.color}">${stage.name}</div>
                </div>
                <div class="affinity-display">
                    <div class="affinity-circle" style="--progress: ${relationship.affinity}%; --color: ${stage.color}">
                        <span>${relationship.affinity}</span>
                    </div>
                </div>
            </div>

            <div class="conversation-greeting">
                <div class="speech-bubble">
                    <p>${meeting.isFirstMeeting ? meeting.dialogue : `"${npc.greeting}"`}</p>
                </div>
            </div>

            <div class="conversation-topics">
                <h4>What would you like to discuss?</h4>
                <div class="topics-list">
                    ${topics.map(topic => `
                        <button class="topic-btn ${topic.available ? '' : 'locked'}"
                                data-topic="${topic.id}"
                                ${topic.available ? '' : 'disabled'}>
                            <span class="topic-title">${topic.title}</span>
                            ${!topic.available ? `<span class="topic-lock">🔒 ${topic.requiredStage}</span>` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="conversation-dialogue" id="dialogue-area" style="display: none;">
            </div>
        </div>
    `;

    // Add topic click handlers
    container.querySelectorAll('.topic-btn:not(.locked)').forEach(btn => {
        btn.addEventListener('click', () => {
            const topicId = btn.dataset.topic;
            showTopicDialogue(container, npcId, topicId);
        });
    });
}

function showTopicDialogue(container, npcId, topicId) {
    const convo = startConversation(npcId, topicId);
    if (!convo) return;

    const dialogueArea = container.querySelector('#dialogue-area');
    const topicsArea = container.querySelector('.conversation-topics');
    const greetingArea = container.querySelector('.conversation-greeting');

    // Hide topics, show dialogue
    topicsArea.style.display = 'none';
    greetingArea.style.display = 'none';
    dialogueArea.style.display = 'block';

    dialogueArea.innerHTML = `
        <div class="dialogue-content">
            <div class="speech-bubble npc-speech">
                <p>${convo.text}</p>
            </div>

            <div class="dialogue-options">
                ${convo.options.map(opt => `
                    <button class="dialogue-option" data-option="${opt.index}">
                        <span class="option-text">${opt.text}</span>
                        ${opt.preview ? `<span class="option-preview">${opt.preview}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // Add option click handlers
    dialogueArea.querySelectorAll('.dialogue-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const optionIndex = parseInt(btn.dataset.option);
            showDialogueResponse(container, npcId, optionIndex);
        });
    });
}

function showDialogueResponse(container, npcId, optionIndex) {
    const results = selectDialogueOption(optionIndex);
    if (!results) return;

    const dialogueArea = container.querySelector('#dialogue-area');

    dialogueArea.innerHTML = `
        <div class="dialogue-response">
            <div class="speech-bubble npc-speech">
                <p>${results.response}</p>
            </div>

            ${Object.keys(results.rewards).length > 0 ? `
                <div class="dialogue-rewards">
                    ${results.rewards.affinity ? `<span class="reward ${results.rewards.affinity > 0 ? 'positive' : 'negative'}">
                        ${results.rewards.affinity > 0 ? '+' : ''}${results.rewards.affinity} ❤️
                    </span>` : ''}
                    ${results.rewards.xp ? `<span class="reward positive">+${results.rewards.xp} XP</span>` : ''}
                    ${results.rewards.tokens ? `<span class="reward positive">+${results.rewards.tokens} 🪙</span>` : ''}
                    ${results.rewards.achievement ? `<span class="reward special">🏆 Achievement Unlocked!</span>` : ''}
                </div>
            ` : ''}

            ${results.unlocked ? `
                <div class="quest-unlocked">
                    <span class="unlock-icon">📜</span>
                    <span class="unlock-text">New quest available!</span>
                </div>
            ` : ''}

            <button class="btn-continue" id="continue-convo">Continue</button>
        </div>
    `;

    container.querySelector('#continue-convo').addEventListener('click', () => {
        renderConversationUI(container, npcId);
    });
}

function renderFullNPCPanel(container, npcId) {
    const npc = NPCS[npcId];
    if (!npc) {
        container.innerHTML = '<p>NPC not found.</p>';
        return;
    }

    const relationship = getRelationship(npcId);
    const stage = RELATIONSHIP_STAGES[relationship.stage];
    const hasMetBefore = npcState.metNPCs.includes(npcId);

    container.innerHTML = `
        <div class="npc-full-panel">
            <div class="npc-panel-tabs">
                <button class="tab-btn active" data-tab="talk">Talk</button>
                <button class="tab-btn" data-tab="info">Info</button>
                <button class="tab-btn" data-tab="gifts">Gifts</button>
            </div>

            <div class="tab-content" id="tab-talk">
                <div id="conversation-container"></div>
            </div>

            <div class="tab-content" id="tab-info" style="display: none;">
                <div class="npc-info-full">
                    <div class="info-section">
                        <h4>Biography</h4>
                        <p>${hasMetBefore ? npc.bio : '???'}</p>
                    </div>
                    ${hasMetBefore ? `
                        <div class="info-section">
                            <h4>Personality</h4>
                            <div class="trait-tags">
                                ${npc.personality.map(p => `<span class="trait-tag">${p}</span>`).join('')}
                            </div>
                        </div>
                        <div class="info-section">
                            <h4>Likes</h4>
                            <ul class="likes-list">${npc.likes.map(l => `<li>✓ ${l}</li>`).join('')}</ul>
                        </div>
                        <div class="info-section">
                            <h4>Dislikes</h4>
                            <ul class="dislikes-list">${npc.dislikes.map(d => `<li>✗ ${d}</li>`).join('')}</ul>
                        </div>
                    ` : '<p class="locked-info">Get to know them better to learn more...</p>'}
                </div>
            </div>

            <div class="tab-content" id="tab-gifts" style="display: none;">
                <div class="gift-section">
                    <h4>Send a Gift</h4>
                    ${relationship.affinity >= 20 ? `
                        <div class="gift-grid" id="gift-grid">
                            <p>Select an item from your inventory to give as a gift.</p>
                        </div>
                    ` : `
                        <p class="locked-info">Become acquaintances to send gifts.</p>
                    `}
                </div>
                <div class="gift-history">
                    <h4>Gift History</h4>
                    ${relationship.gifts.length > 0 ? `
                        <ul class="gift-list">
                            ${relationship.gifts.slice(-5).map(g => `
                                <li class="gift-item ${g.reaction}">
                                    ${g.giftId} - ${g.reaction}
                                </li>
                            `).join('')}
                        </ul>
                    ` : '<p>No gifts given yet.</p>'}
                </div>
            </div>
        </div>
    `;

    // Initialize conversation tab
    renderConversationUI(container.querySelector('#conversation-container'), npcId);

    // Tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            container.querySelector(`#tab-${btn.dataset.tab}`).style.display = 'block';
        });
    });
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaNPCs = {
        NPCS,
        RELATIONSHIP_STAGES,
        NPC_CONVERSATIONS,
        RELATIONSHIP_MILESTONES,
        init: initNPCSystem,
        getNPC,
        getRelationship,
        meetNPC,
        changeAffinity,
        giveGift,
        getMetNPCs,
        getNPCsByProject,
        getAvailableNPCs,
        renderNPCCard,
        renderRelationshipsPanel,
        showNPCDetail,
        // Conversation system
        getAvailableTopics,
        startConversation,
        selectDialogueOption,
        renderConversationUI,
        renderFullNPCPanel
    };
}
