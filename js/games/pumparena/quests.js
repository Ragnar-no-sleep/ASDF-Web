/**
 * Pump Arena RPG - Quest System
 * Main campaigns, side quests, and objectives
 */

'use strict';

// ============================================
// QUEST DEFINITIONS
// ============================================

const QUEST_TYPES = {
    main: { name: 'Main Quest', color: '#f97316', icon: '&#128081;' },
    side: { name: 'Side Quest', color: '#3b82f6', icon: '&#128203;' },
    daily: { name: 'Daily', color: '#22c55e', icon: '&#128197;' },
    event: { name: 'Event', color: '#a855f7', icon: '&#127881;' }
};

// Main Campaign Quests
const CAMPAIGNS = {
    safeyield: {
        id: 'safeyield',
        name: 'The DeFi Dream',
        description: 'Join SafeYield DAO and help build the future of decentralized finance.',
        project: 'safeyield',
        chapters: [
            {
                id: 'sy_ch1',
                name: 'Chapter 1: First Impressions',
                description: 'Make your mark at SafeYield DAO',
                quests: [
                    {
                        id: 'sy_q1_meet_marcus',
                        name: 'Meet the Lead',
                        description: 'Introduce yourself to Marcus Chen, the protocol lead.',
                        type: 'main',
                        objectives: [
                            { type: 'meet_npc', target: 'marcus', description: 'Meet Marcus Chen' }
                        ],
                        rewards: { xp: 100, reputation: 20, tokens: 50 },
                        dialogue: {
                            intro: "SafeYield's headquarters is impressive. Time to find the person in charge.",
                            complete: "Marcus seems cautious but willing to give you a chance."
                        }
                    },
                    {
                        id: 'sy_q1_community',
                        name: 'Community Vibes',
                        description: 'Get to know the SafeYield community through Sarah.',
                        type: 'main',
                        requires: ['sy_q1_meet_marcus'],
                        objectives: [
                            { type: 'meet_npc', target: 'sarah', description: 'Meet Sarah Kim' },
                            { type: 'choice', description: 'Help with community activity' }
                        ],
                        rewards: { xp: 150, reputation: 30, tokens: 75 },
                        dialogue: {
                            intro: "Marcus mentioned you should talk to Sarah about getting involved.",
                            complete: "Sarah's enthusiasm is contagious. The community welcomes you."
                        }
                    },
                    {
                        id: 'sy_q1_first_task',
                        name: 'Prove Your Worth',
                        description: 'Complete your first real task for SafeYield.',
                        type: 'main',
                        requires: ['sy_q1_community'],
                        objectives: [
                            { type: 'choice', description: 'Choose how to contribute' },
                            { type: 'stat_check', stat: 'dev', min: 5, description: 'Show technical ability' }
                        ],
                        rewards: { xp: 200, reputation: 50, tokens: 100 },
                        choices: [
                            {
                                id: 'technical',
                                text: 'Review smart contract code',
                                statRequired: { dev: 8 },
                                outcomes: {
                                    success: { xpBonus: 50, affinityChange: { marcus: 10 } },
                                    fail: { xpBonus: 0, affinityChange: { marcus: -5 } }
                                }
                            },
                            {
                                id: 'community',
                                text: 'Help moderate Discord',
                                statRequired: { com: 6 },
                                outcomes: {
                                    success: { xpBonus: 30, affinityChange: { sarah: 15 } },
                                    fail: { xpBonus: 0, affinityChange: { sarah: -5 } }
                                }
                            },
                            {
                                id: 'marketing',
                                text: 'Create educational content',
                                statRequired: { mkt: 7 },
                                outcomes: {
                                    success: { xpBonus: 40, reputationBonus: 20 },
                                    fail: { xpBonus: 0 }
                                }
                            }
                        ],
                        dialogue: {
                            intro: "It's time to show what you can do. How will you contribute?",
                            complete: "You've proven yourself. SafeYield officially welcomes you to the team."
                        }
                    }
                ]
            },
            {
                id: 'sy_ch2',
                name: 'Chapter 2: The Audit',
                description: 'A critical security audit reveals problems...',
                requires: ['sy_ch1'],
                quests: [
                    {
                        id: 'sy_q2_crisis',
                        name: 'Code Red',
                        description: 'Marcus needs your help with an urgent security issue.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'marcus', description: 'Speak with Marcus urgently' }
                        ],
                        rewards: { xp: 150, tokens: 50 },
                        timed: true,
                        timeLimit: 60,
                        dialogue: {
                            intro: "You get an urgent message from Marcus. Something's wrong.",
                            complete: "The audit found a critical vulnerability. This is serious."
                        }
                    },
                    {
                        id: 'sy_q2_decision',
                        name: 'Critical Decision',
                        description: 'The vulnerability must be handled. But how?',
                        type: 'main',
                        requires: ['sy_q2_crisis'],
                        objectives: [
                            { type: 'choice', description: 'Decide how to handle the vulnerability' }
                        ],
                        rewards: { xp: 250, reputation: 75, tokens: 150 },
                        choices: [
                            {
                                id: 'disclose',
                                text: 'Public disclosure - be transparent',
                                outcomes: {
                                    success: { reputationBonus: 50, affinityChange: { sarah: 15 } }
                                }
                            },
                            {
                                id: 'silent_fix',
                                text: 'Silent fix - patch quietly',
                                statRequired: { dev: 10 },
                                outcomes: {
                                    success: { xpBonus: 100, affinityChange: { marcus: 20 } }
                                }
                            },
                            {
                                id: 'bounty',
                                text: 'Bug bounty - reward the finder',
                                outcomes: {
                                    success: { tokensBonus: -100, reputationBonus: 100 }
                                }
                            }
                        ],
                        dialogue: {
                            intro: "This is the moment that defines SafeYield. Choose wisely.",
                            complete: "The crisis is averted, but the memory lingers. Trust is fragile."
                        }
                    },
                    {
                        id: 'sy_q2_rebuild',
                        name: 'Rebuilding Trust',
                        description: 'Help restore confidence in SafeYield.',
                        type: 'main',
                        requires: ['sy_q2_decision'],
                        objectives: [
                            { type: 'talk_npc', target: 'sarah', description: 'Coordinate with Sarah on communications' },
                            { type: 'stat_check', stat: 'com', min: 6, description: 'Engage with the community' }
                        ],
                        rewards: { xp: 200, reputation: 100, tokens: 100 },
                        dialogue: {
                            intro: "The technical fix is done. Now for the harder part: people.",
                            complete: "The community rallies. SafeYield emerges stronger than before."
                        }
                    }
                ]
            },
            {
                id: 'sy_ch3',
                name: 'Chapter 3: The Fork',
                description: 'A governance proposal divides the community...',
                requires: ['sy_ch2'],
                quests: [
                    {
                        id: 'sy_q3_proposal',
                        name: 'The Proposal',
                        description: 'A controversial proposal threatens to split SafeYield.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'marcus', description: 'Get Marcus\' perspective' },
                            { type: 'talk_npc', target: 'sarah', description: 'Get Sarah\'s perspective' }
                        ],
                        rewards: { xp: 200, tokens: 75 },
                        dialogue: {
                            intro: "A proposal to change the tokenomics has ignited fierce debate.",
                            complete: "Both sides make valid points. This won't be easy."
                        }
                    },
                    {
                        id: 'sy_q3_mediator',
                        name: 'The Mediator',
                        description: 'Can you find a middle ground?',
                        type: 'main',
                        requires: ['sy_q3_proposal'],
                        objectives: [
                            { type: 'stat_check', stat: 'cha', min: 10, description: 'Mediate between factions' },
                            { type: 'choice', description: 'Propose a compromise' }
                        ],
                        rewards: { xp: 400, reputation: 150, tokens: 250 },
                        choices: [
                            {
                                id: 'side_marcus',
                                text: 'Support Marcus\'s conservative approach',
                                outcomes: { affinityChange: { marcus: 25, sarah: -10 } }
                            },
                            {
                                id: 'side_sarah',
                                text: 'Support Sarah\'s progressive vision',
                                outcomes: { affinityChange: { sarah: 25, marcus: -10 } }
                            },
                            {
                                id: 'compromise',
                                text: 'Propose a phased implementation',
                                statRequired: { str: 12 },
                                outcomes: { affinityChange: { marcus: 15, sarah: 15 }, xpBonus: 100 }
                            }
                        ],
                        dialogue: {
                            intro: "The community looks to you. Your voice carries weight now.",
                            complete: "The vote passes. SafeYield adapts and evolves."
                        }
                    }
                ]
            }
        ]
    },

    pixelraiders: {
        id: 'pixelraiders',
        name: 'Level Up',
        description: 'Join Pixel Raiders and help create the next big web3 game.',
        project: 'pixelraiders',
        chapters: [
            {
                id: 'pr_ch1',
                name: 'Chapter 1: Player One',
                description: 'Enter the world of Pixel Raiders',
                quests: [
                    {
                        id: 'pr_q1_meet_alex',
                        name: 'Meet the Creator',
                        description: 'Find Alex Reyes and show your passion for gaming.',
                        type: 'main',
                        objectives: [
                            { type: 'meet_npc', target: 'alex', description: 'Meet Alex Reyes' }
                        ],
                        rewards: { xp: 100, reputation: 20, tokens: 50 },
                        dialogue: {
                            intro: "Pixel Raiders' studio is full of energy. Game development in progress everywhere.",
                            complete: "Alex's vision is inspiring. This could be the game that changes everything."
                        }
                    },
                    {
                        id: 'pr_q1_compete',
                        name: 'Trial by Fire',
                        description: 'Prove your skills in a Pixel Raiders tournament.',
                        type: 'main',
                        requires: ['pr_q1_meet_alex'],
                        objectives: [
                            { type: 'minigame', game: 'raid_simulator', minScore: 500, description: 'Score 500+ in Raid Simulator' }
                        ],
                        rewards: { xp: 200, reputation: 40, tokens: 100 },
                        dialogue: {
                            intro: "Alex wants to see what you're made of. Time to play.",
                            complete: "Impressive performance! Mika noticed your skills."
                        }
                    },
                    {
                        id: 'pr_q1_mika',
                        name: 'The Manager',
                        description: 'Mika wants to discuss competitive opportunities.',
                        type: 'main',
                        requires: ['pr_q1_compete'],
                        objectives: [
                            { type: 'meet_npc', target: 'mika', description: 'Meet Mika Tanaka' }
                        ],
                        rewards: { xp: 100, reputation: 25, tokens: 50 },
                        dialogue: {
                            intro: "Mika's office is covered with esports trophies and team photos.",
                            complete: "Mika sees potential in you. The esports path opens."
                        }
                    }
                ]
            },
            {
                id: 'pr_ch2',
                name: 'Chapter 2: The Tournament',
                description: 'Your first official Pixel Raiders tournament...',
                requires: ['pr_ch1'],
                quests: [
                    {
                        id: 'pr_q2_signup',
                        name: 'Tournament Registration',
                        description: 'Sign up for the Pixel Raiders Open.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'mika', description: 'Register with Mika' },
                            { type: 'resource_check', resource: 'influence', min: 30, description: 'Have enough influence to compete' }
                        ],
                        rewards: { xp: 100, tokens: 25 },
                        dialogue: {
                            intro: "The Pixel Raiders Open is next week. Registration is open.",
                            complete: "You're officially registered. Time to train."
                        }
                    },
                    {
                        id: 'pr_q2_training',
                        name: 'Training Montage',
                        description: 'Prepare for the tournament.',
                        type: 'main',
                        requires: ['pr_q2_signup'],
                        objectives: [
                            { type: 'minigame', game: 'code_sprint', minScore: 300, description: 'Improve your reflexes' },
                            { type: 'minigame', game: 'chart_analysis', minScore: 400, description: 'Sharpen your analysis' }
                        ],
                        rewards: { xp: 300, reputation: 50, tokens: 100 },
                        dialogue: {
                            intro: "Practice makes perfect. Every edge counts.",
                            complete: "You're as ready as you'll ever be."
                        }
                    },
                    {
                        id: 'pr_q2_compete',
                        name: 'The Big Day',
                        description: 'Compete in the Pixel Raiders Open!',
                        type: 'main',
                        requires: ['pr_q2_training'],
                        objectives: [
                            { type: 'minigame', game: 'raid_simulator', minScore: 1000, description: 'Win the tournament' }
                        ],
                        rewards: { xp: 500, reputation: 150, tokens: 500 },
                        choices: [
                            {
                                id: 'victory',
                                text: 'Victory - you dominate the competition',
                                scoreRequired: 1500,
                                outcomes: { xpBonus: 200, reputationBonus: 100, achievement: 'tournament_champion' }
                            },
                            {
                                id: 'top_3',
                                text: 'Top 3 finish - respectable showing',
                                scoreRequired: 1000,
                                outcomes: { xpBonus: 100, reputationBonus: 50 }
                            },
                            {
                                id: 'participated',
                                text: 'Participation - you tried your best',
                                outcomes: { xpBonus: 25 }
                            }
                        ],
                        dialogue: {
                            intro: "The crowd roars. Cameras flash. This is your moment.",
                            complete: "The tournament ends. Win or lose, you've made your mark."
                        }
                    }
                ]
            },
            {
                id: 'pr_ch3',
                name: 'Chapter 3: Going Pro',
                description: 'The opportunity of a lifetime appears...',
                requires: ['pr_ch2'],
                quests: [
                    {
                        id: 'pr_q3_offer',
                        name: 'The Offer',
                        description: 'A pro team wants to recruit you.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'alex', description: 'Discuss the offer with Alex' },
                            { type: 'talk_npc', target: 'mika', description: 'Get Mika\'s advice' }
                        ],
                        rewards: { xp: 150, tokens: 75 },
                        dialogue: {
                            intro: "Your performance caught the attention of Team Nexus.",
                            complete: "Big decisions ahead. Your path diverges."
                        }
                    },
                    {
                        id: 'pr_q3_decision',
                        name: 'Crossroads',
                        description: 'Choose your gaming future.',
                        type: 'main',
                        requires: ['pr_q3_offer'],
                        objectives: [
                            { type: 'choice', description: 'Decide your path' }
                        ],
                        rewards: { xp: 400, reputation: 200, tokens: 300 },
                        choices: [
                            {
                                id: 'join_team',
                                text: 'Join Team Nexus as a pro player',
                                outcomes: { affinityChange: { mika: 20 }, achievement: 'pro_gamer' }
                            },
                            {
                                id: 'stay_builder',
                                text: 'Stay with Pixel Raiders as a builder',
                                outcomes: { affinityChange: { alex: 25 }, xpBonus: 100 }
                            },
                            {
                                id: 'start_own',
                                text: 'Start your own team',
                                statRequired: { cha: 12, str: 10 },
                                outcomes: { reputationBonus: 150, tokensBonus: -200, achievement: 'team_founder' }
                            }
                        ],
                        dialogue: {
                            intro: "Every path has its rewards. Choose what calls to you.",
                            complete: "The choice is made. A new chapter begins."
                        }
                    }
                ]
            }
        ]
    },

    basedcollective: {
        id: 'basedcollective',
        name: 'The Movement',
        description: 'Join Based Collective and help shape decentralized culture.',
        project: 'basedcollective',
        chapters: [
            {
                id: 'bc_ch1',
                name: 'Chapter 1: Finding Your Tribe',
                description: 'Discover what Based Collective is all about',
                quests: [
                    {
                        id: 'bc_q1_meet_jordan',
                        name: 'Governance 101',
                        description: 'Learn about DAO governance from Jordan.',
                        type: 'main',
                        objectives: [
                            { type: 'meet_npc', target: 'jordan', description: 'Meet Jordan Blake' }
                        ],
                        rewards: { xp: 100, reputation: 25, tokens: 50 },
                        dialogue: {
                            intro: "Based Collective runs differently. Everyone has a voice here.",
                            complete: "Jordan's patient explanation helps you understand the power of collective decision-making."
                        }
                    },
                    {
                        id: 'bc_q1_culture',
                        name: 'Culture Check',
                        description: 'Meet the creative heart of Based Collective.',
                        type: 'main',
                        requires: ['bc_q1_meet_jordan'],
                        objectives: [
                            { type: 'meet_npc', target: 'nova', description: 'Meet Nova' }
                        ],
                        rewards: { xp: 100, reputation: 30, tokens: 50 },
                        dialogue: {
                            intro: "Jordan mentioned someone you need to meet. Someone... different.",
                            complete: "Nova is unlike anyone you've met. Their energy is infectious."
                        }
                    },
                    {
                        id: 'bc_q1_first_vote',
                        name: 'Your First Vote',
                        description: 'Participate in a DAO proposal.',
                        type: 'main',
                        requires: ['bc_q1_culture'],
                        objectives: [
                            { type: 'choice', description: 'Vote on the proposal' }
                        ],
                        rewards: { xp: 150, reputation: 50, tokens: 75 },
                        choices: [
                            {
                                id: 'vote_yes',
                                text: 'Vote YES - expand the collective',
                                outcomes: { affinityChange: { nova: 10, jordan: 5 } }
                            },
                            {
                                id: 'vote_no',
                                text: 'Vote NO - maintain focus',
                                outcomes: { affinityChange: { jordan: 10, nova: -5 } }
                            },
                            {
                                id: 'abstain',
                                text: 'Abstain - need more information',
                                outcomes: { xpBonus: 25 }
                            }
                        ],
                        dialogue: {
                            intro: "A proposal to partner with a new project is up for vote.",
                            complete: "Your vote is counted. This is what decentralization feels like."
                        }
                    }
                ]
            },
            {
                id: 'bc_ch2',
                name: 'Chapter 2: The Raid',
                description: 'Based Collective plans its biggest raid yet...',
                requires: ['bc_ch1'],
                quests: [
                    {
                        id: 'bc_q2_plan',
                        name: 'Operation Thunder',
                        description: 'Help plan a coordinated community action.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'nova', description: 'Get Nova\'s meme strategy' },
                            { type: 'talk_npc', target: 'jordan', description: 'Discuss with Jordan' }
                        ],
                        rewards: { xp: 150, tokens: 50 },
                        dialogue: {
                            intro: "A rival community has been spreading FUD. It's time to respond.",
                            complete: "The plan is set. Tomorrow, the raid begins."
                        }
                    },
                    {
                        id: 'bc_q2_raid',
                        name: 'The Raid',
                        description: 'Execute the community raid!',
                        type: 'main',
                        requires: ['bc_q2_plan'],
                        objectives: [
                            { type: 'minigame', game: 'raid_simulator', minScore: 800, description: 'Lead the raid to victory' }
                        ],
                        rewards: { xp: 300, reputation: 100, tokens: 200 },
                        dialogue: {
                            intro: "Notifications explode. The timeline is on fire. Go!",
                            complete: "The raid was legendary. CT will remember this day."
                        }
                    },
                    {
                        id: 'bc_q2_aftermath',
                        name: 'The Aftermath',
                        description: 'Deal with the consequences of the raid.',
                        type: 'main',
                        requires: ['bc_q2_raid'],
                        objectives: [
                            { type: 'choice', description: 'Handle the attention' }
                        ],
                        rewards: { xp: 200, reputation: 75, tokens: 100 },
                        choices: [
                            {
                                id: 'victory_lap',
                                text: 'Take a victory lap - post receipts',
                                outcomes: { reputationBonus: 50, affinityChange: { nova: 15 } }
                            },
                            {
                                id: 'extend_olive',
                                text: 'Extend an olive branch - mend fences',
                                outcomes: { reputationBonus: 25, affinityChange: { jordan: 15 } }
                            },
                            {
                                id: 'stay_silent',
                                text: 'Stay silent - let actions speak',
                                outcomes: { xpBonus: 50 }
                            }
                        ],
                        dialogue: {
                            intro: "The raid made waves. Now comes the response.",
                            complete: "The dust settles. Based Collective's reputation grows."
                        }
                    }
                ]
            },
            {
                id: 'bc_ch3',
                name: 'Chapter 3: The DAO Vote',
                description: 'A pivotal vote that will shape the collective\'s future...',
                requires: ['bc_ch2'],
                quests: [
                    {
                        id: 'bc_q3_proposal',
                        name: 'The Big Proposal',
                        description: 'A major proposal divides the collective.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'jordan', description: 'Understand the proposal' },
                            { type: 'talk_npc', target: 'nova', description: 'Get Nova\'s perspective' }
                        ],
                        rewards: { xp: 200, tokens: 100 },
                        dialogue: {
                            intro: "Should Based Collective launch its own token? The community is split.",
                            complete: "Both sides have compelling arguments. This is democracy in action."
                        }
                    },
                    {
                        id: 'bc_q3_campaign',
                        name: 'Campaign Season',
                        description: 'Build support for your position.',
                        type: 'main',
                        requires: ['bc_q3_proposal'],
                        objectives: [
                            { type: 'stat_check', stat: 'cha', min: 10, description: 'Rally community support' },
                            { type: 'stat_check', stat: 'com', min: 8, description: 'Engage in discussions' }
                        ],
                        rewards: { xp: 250, reputation: 100, tokens: 150 },
                        dialogue: {
                            intro: "The vote is in one week. Every voice matters.",
                            complete: "The campaign was intense. Now we wait."
                        }
                    },
                    {
                        id: 'bc_q3_vote',
                        name: 'Judgment Day',
                        description: 'The vote happens. History is made.',
                        type: 'main',
                        requires: ['bc_q3_campaign'],
                        objectives: [
                            { type: 'choice', description: 'Cast your final vote' }
                        ],
                        rewards: { xp: 500, reputation: 200, tokens: 300 },
                        choices: [
                            {
                                id: 'launch_token',
                                text: 'Vote FOR the token launch',
                                outcomes: { affinityChange: { nova: 20, jordan: -5 }, achievement: 'kingmaker' }
                            },
                            {
                                id: 'no_token',
                                text: 'Vote AGAINST the token',
                                outcomes: { affinityChange: { jordan: 20, nova: -5 }, xpBonus: 100 }
                            }
                        ],
                        dialogue: {
                            intro: "The moment of truth. Your vote could tip the scales.",
                            complete: "The votes are counted. A new era begins for Based Collective."
                        }
                    }
                ]
            }
        ]
    },

    nodeforge: {
        id: 'nodeforge',
        name: 'Foundation',
        description: 'Join NodeForge and help build blockchain infrastructure.',
        project: 'nodeforge',
        chapters: [
            {
                id: 'nf_ch1',
                name: 'Chapter 1: Deep Tech',
                description: 'Enter the world of blockchain infrastructure',
                quests: [
                    {
                        id: 'nf_q1_meet_dmitri',
                        name: 'The Architect',
                        description: 'Impress Dmitri with your technical knowledge.',
                        type: 'main',
                        objectives: [
                            { type: 'meet_npc', target: 'dmitri', description: 'Meet Dmitri Volkov' },
                            { type: 'stat_check', stat: 'dev', min: 8, description: 'Demonstrate technical expertise' }
                        ],
                        rewards: { xp: 150, reputation: 30, tokens: 75 },
                        dialogue: {
                            intro: "NodeForge's office is minimal. Efficiency is everything here.",
                            complete: "Dmitri doesn't waste words. His slight nod means you've passed."
                        }
                    },
                    {
                        id: 'nf_q1_elena',
                        name: 'The Bridge',
                        description: 'Meet Elena, who bridges the gap between tech and community.',
                        type: 'main',
                        requires: ['nf_q1_meet_dmitri'],
                        objectives: [
                            { type: 'meet_npc', target: 'elena', description: 'Meet Elena Santos' }
                        ],
                        rewards: { xp: 100, reputation: 25, tokens: 50 },
                        dialogue: {
                            intro: "Dmitri mentioned Elena would help you get oriented.",
                            complete: "Elena is warm and welcoming. A breath of fresh air after Dmitri's intensity."
                        }
                    },
                    {
                        id: 'nf_q1_first_pr',
                        name: 'First Contribution',
                        description: 'Submit your first pull request to NodeForge.',
                        type: 'main',
                        requires: ['nf_q1_elena'],
                        objectives: [
                            { type: 'minigame', game: 'code_sprint', minScore: 400, description: 'Write quality code' },
                            { type: 'stat_check', stat: 'dev', min: 10, description: 'Pass code review' }
                        ],
                        rewards: { xp: 250, reputation: 50, tokens: 100 },
                        dialogue: {
                            intro: "There's an open issue that needs attention. Time to code.",
                            complete: "Your PR is merged. You're officially a NodeForge contributor."
                        }
                    }
                ]
            },
            {
                id: 'nf_ch2',
                name: 'Chapter 2: The Benchmark',
                description: 'NodeForge faces a critical performance test...',
                requires: ['nf_ch1'],
                quests: [
                    {
                        id: 'nf_q2_benchmark',
                        name: 'Benchmark Day',
                        description: 'A major protocol wants to test NodeForge\'s claims.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'dmitri', description: 'Prepare for the benchmark' }
                        ],
                        rewards: { xp: 150, tokens: 50 },
                        dialogue: {
                            intro: "A top-10 protocol wants to see if NodeForge can handle their load.",
                            complete: "The stakes are high. If we pass this test, everything changes."
                        }
                    },
                    {
                        id: 'nf_q2_optimize',
                        name: 'Optimization Sprint',
                        description: 'Squeeze every bit of performance from the codebase.',
                        type: 'main',
                        requires: ['nf_q2_benchmark'],
                        objectives: [
                            { type: 'minigame', game: 'code_sprint', minScore: 600, description: 'Optimize critical paths' },
                            { type: 'stat_check', stat: 'dev', min: 12, description: 'Implement advanced optimizations' }
                        ],
                        rewards: { xp: 400, reputation: 100, tokens: 200 },
                        dialogue: {
                            intro: "72 hours until the benchmark. Every millisecond counts.",
                            complete: "The code is as fast as it's ever been. Now we wait."
                        }
                    },
                    {
                        id: 'nf_q2_result',
                        name: 'The Results',
                        description: 'The benchmark results are in.',
                        type: 'main',
                        requires: ['nf_q2_optimize'],
                        objectives: [
                            { type: 'talk_npc', target: 'dmitri', description: 'Get the results from Dmitri' }
                        ],
                        rewards: { xp: 300, reputation: 150, tokens: 300 },
                        dialogue: {
                            intro: "Dmitri rarely shows emotion. But today might be different.",
                            complete: "We crushed it. 3x better than their current solution. NodeForge is going mainstream."
                        }
                    }
                ]
            },
            {
                id: 'nf_ch3',
                name: 'Chapter 3: Scale',
                description: 'Success brings new challenges...',
                requires: ['nf_ch2'],
                quests: [
                    {
                        id: 'nf_q3_growth',
                        name: 'Growing Pains',
                        description: 'The team needs to expand. Fast.',
                        type: 'main',
                        objectives: [
                            { type: 'talk_npc', target: 'elena', description: 'Discuss hiring strategy' },
                            { type: 'talk_npc', target: 'dmitri', description: 'Set technical standards' }
                        ],
                        rewards: { xp: 200, tokens: 100 },
                        dialogue: {
                            intro: "Ten new projects want to integrate. We need more hands.",
                            complete: "A plan is in place. Now comes the hard part: execution."
                        }
                    },
                    {
                        id: 'nf_q3_lead',
                        name: 'Leadership Test',
                        description: 'Dmitri wants you to lead a team.',
                        type: 'main',
                        requires: ['nf_q3_growth'],
                        objectives: [
                            { type: 'stat_check', stat: 'cha', min: 8, description: 'Lead the new team' },
                            { type: 'stat_check', stat: 'dev', min: 14, description: 'Maintain technical excellence' }
                        ],
                        rewards: { xp: 400, reputation: 150, tokens: 250 },
                        dialogue: {
                            intro: "Three new engineers are starting. They're your responsibility.",
                            complete: "The team is performing. You've proven you can lead."
                        }
                    },
                    {
                        id: 'nf_q3_future',
                        name: 'The Future',
                        description: 'Dmitri shares his vision for NodeForge\'s future.',
                        type: 'main',
                        requires: ['nf_q3_lead'],
                        objectives: [
                            { type: 'choice', description: 'Choose your role in the future' }
                        ],
                        rewards: { xp: 500, reputation: 200, tokens: 500 },
                        choices: [
                            {
                                id: 'technical',
                                text: 'Stay on the technical track - build the next breakthrough',
                                outcomes: { affinityChange: { dmitri: 25 }, achievement: 'master_engineer' }
                            },
                            {
                                id: 'leadership',
                                text: 'Move into leadership - grow the team',
                                outcomes: { affinityChange: { elena: 20 }, xpBonus: 100 }
                            },
                            {
                                id: 'hybrid',
                                text: 'Stay hybrid - code and lead',
                                statRequired: { dev: 16, cha: 12 },
                                outcomes: { affinityChange: { dmitri: 15, elena: 15 }, achievement: 'tech_lead' }
                            }
                        ],
                        dialogue: {
                            intro: "NodeForge is at an inflection point. Where do you fit?",
                            complete: "Your path is set. The foundation you helped build will stand for generations."
                        }
                    }
                ]
            }
        ]
    }
};

// Side Quests (available after meeting certain NPCs)
const SIDE_QUESTS = [
    {
        id: 'sq_oracle_riddle',
        name: 'The Oracle\'s Riddle',
        description: 'The mysterious Oracle has a challenge for you.',
        type: 'side',
        requires: { relationship: { oracle: 20 } },
        objectives: [
            { type: 'choice', description: 'Solve the riddle' }
        ],
        rewards: { xp: 300, tokens: 200, special: 'oracle_blessing' },
        repeatable: false,
        dialogue: {
            intro: "The Oracle beckons you. 'I have seen your path. Will you face my riddle?'",
            complete: "The Oracle smiles. 'Wisdom grows. Remember what you have learned.'"
        }
    },
    {
        id: 'sq_whale_watching',
        name: 'Whale Watching',
        description: 'DeepBlue wants to test your discretion.',
        type: 'side',
        requires: { reputation: 500 },
        objectives: [
            { type: 'meet_npc', target: 'whale', description: 'Meet DeepBlue' },
            { type: 'choice', description: 'Prove your loyalty' }
        ],
        rewards: { xp: 500, tokens: 1000, reputation: 100 },
        repeatable: false,
        dialogue: {
            intro: "A DM from an anonymous account. 'We should talk. Discretion required.'",
            complete: "DeepBlue nods. 'You've earned my trust. Few have.'"
        }
    },
    {
        id: 'sq_nova_collab',
        name: 'Meme Machine',
        description: 'Nova wants help creating the ultimate meme.',
        type: 'side',
        requires: { relationship: { nova: 30 } },
        objectives: [
            { type: 'talk_npc', target: 'nova', description: 'Brainstorm with Nova' },
            { type: 'stat_check', stat: 'mkt', min: 8, description: 'Create the meme' }
        ],
        rewards: { xp: 200, tokens: 150, reputation: 50 },
        repeatable: false,
        dialogue: {
            intro: "Nova slides into your DMs. 'I have an idea. It's going to break CT.'",
            complete: "The meme goes viral. You and Nova have created art."
        }
    },
    {
        id: 'sq_sarah_event',
        name: 'Community Crisis',
        description: 'Sarah needs help with a Discord drama situation.',
        type: 'side',
        requires: { relationship: { sarah: 40 } },
        objectives: [
            { type: 'talk_npc', target: 'sarah', description: 'Get the details' },
            { type: 'stat_check', stat: 'com', min: 10, description: 'Defuse the situation' }
        ],
        rewards: { xp: 250, tokens: 100, reputation: 75 },
        repeatable: false,
        choices: [
            {
                id: 'mediate',
                text: 'Mediate between the parties',
                outcomes: { affinityChange: { sarah: 15 }, xpBonus: 50 }
            },
            {
                id: 'ban',
                text: 'Ban the troublemaker',
                outcomes: { reputationBonus: -25, xpBonus: 25 }
            },
            {
                id: 'ignore',
                text: 'Let them work it out',
                outcomes: { affinityChange: { sarah: -10 } }
            }
        ],
        dialogue: {
            intro: "Sarah is stressed. 'Two of our biggest contributors are fighting. Help?'",
            complete: "The storm passes. Sarah hugs you. 'I owe you one.'"
        }
    },
    {
        id: 'sq_alex_bug',
        name: 'Game Breaking Bug',
        description: 'Alex needs a critical bug fixed before launch.',
        type: 'side',
        requires: { relationship: { alex: 30 } },
        objectives: [
            { type: 'talk_npc', target: 'alex', description: 'Understand the bug' },
            { type: 'minigame', game: 'code_sprint', minScore: 500, description: 'Debug the code' }
        ],
        rewards: { xp: 300, tokens: 200, reputation: 50 },
        repeatable: false,
        dialogue: {
            intro: "Alex pings you at 3 AM. 'Emergency. The leaderboard is broken. Help!'",
            complete: "Bug squashed. Alex adds you to the credits. 'You're a lifesaver.'"
        }
    },
    {
        id: 'sq_dmitri_theory',
        name: 'Theoretical Problem',
        description: 'Dmitri has a complex technical challenge.',
        type: 'side',
        requires: { relationship: { dmitri: 40 } },
        objectives: [
            { type: 'talk_npc', target: 'dmitri', description: 'Understand the problem' },
            { type: 'stat_check', stat: 'dev', min: 14, description: 'Propose a solution' }
        ],
        rewards: { xp: 400, tokens: 300, reputation: 100 },
        repeatable: false,
        dialogue: {
            intro: "Dmitri rarely asks for help. 'I have a problem. I think you might see it differently.'",
            complete: "Dmitri actually smiles. 'Your approach was... unexpected. And correct.'"
        }
    },
    {
        id: 'sq_marcus_investment',
        name: 'Strategic Investment',
        description: 'Marcus wants your opinion on a potential partnership.',
        type: 'side',
        requires: { relationship: { marcus: 50 } },
        objectives: [
            { type: 'talk_npc', target: 'marcus', description: 'Review the proposal' },
            { type: 'stat_check', stat: 'str', min: 12, description: 'Analyze the deal' }
        ],
        rewards: { xp: 350, tokens: 500, reputation: 100 },
        repeatable: false,
        choices: [
            {
                id: 'approve',
                text: 'Recommend approval',
                outcomes: { tokensBonus: 200, affinityChange: { marcus: 10 } }
            },
            {
                id: 'reject',
                text: 'Recommend rejection',
                outcomes: { xpBonus: 100, affinityChange: { marcus: 5 } }
            },
            {
                id: 'negotiate',
                text: 'Suggest better terms',
                statRequired: { cha: 10 },
                outcomes: { tokensBonus: 400, affinityChange: { marcus: 15 } }
            }
        ],
        dialogue: {
            intro: "Marcus pulls you into a private meeting. 'I trust your judgment on this.'",
            complete: "The deal is done. Marcus nods. 'Good call.'"
        }
    },
    {
        id: 'sq_jordan_proposal',
        name: 'Draft the Proposal',
        description: 'Jordan needs help writing a governance proposal.',
        type: 'side',
        requires: { relationship: { jordan: 35 } },
        objectives: [
            { type: 'talk_npc', target: 'jordan', description: 'Understand the proposal' },
            { type: 'stat_check', stat: 'str', min: 8, description: 'Help draft the language' },
            { type: 'stat_check', stat: 'cha', min: 6, description: 'Make it compelling' }
        ],
        rewards: { xp: 200, tokens: 100, reputation: 75 },
        repeatable: false,
        dialogue: {
            intro: "Jordan shares a doc. 'I need this to pass. Help me make it bulletproof?'",
            complete: "The proposal passes. Jordan credits you publicly. 'Co-authored by a true builder.'"
        }
    },
    {
        id: 'sq_first_alpha',
        name: 'Alpha Discovery',
        description: 'You stumbled onto something interesting...',
        type: 'side',
        requires: { level: 5 },
        objectives: [
            { type: 'minigame', game: 'chart_analysis', minScore: 600, description: 'Analyze the opportunity' }
        ],
        rewards: { xp: 200, tokens: 300, reputation: 25 },
        repeatable: false,
        dialogue: {
            intro: "While researching, you notice an unusual pattern in on-chain data...",
            complete: "Your analysis was correct. The trade worked out perfectly."
        }
    },
    {
        id: 'sq_mentoring',
        name: 'Pay It Forward',
        description: 'A newcomer asks for your guidance.',
        type: 'side',
        requires: { reputation: 300 },
        objectives: [
            { type: 'stat_check', stat: 'com', min: 6, description: 'Share your knowledge' }
        ],
        rewards: { xp: 150, reputation: 50 },
        repeatable: true,
        dialogue: {
            intro: "A DM: 'Hi, I\'m new here. Everyone says you\'re the one to talk to...'",
            complete: "They thank you profusely. 'I\'ll pay it forward someday.'"
        }
    },
    {
        id: 'sq_quiz_master',
        name: 'Trivia Night',
        description: 'The community is hosting a crypto trivia competition.',
        type: 'side',
        requires: { level: 3 },
        objectives: [
            { type: 'minigame', game: 'shill_quiz', minScore: 700, description: 'Win the quiz' }
        ],
        rewards: { xp: 200, tokens: 150, reputation: 30 },
        repeatable: true,
        repeatCooldown: 86400000, // 24 hours
        dialogue: {
            intro: "It's trivia night! Test your crypto knowledge for prizes!",
            complete: "You crushed it! The community cheers."
        }
    },
    {
        id: 'sq_networking',
        name: 'The Conference',
        description: 'A major crypto conference is happening. Time to network.',
        type: 'side',
        requires: { level: 8, reputation: 500 },
        objectives: [
            { type: 'stat_check', stat: 'cha', min: 10, description: 'Network effectively' },
            { type: 'choice', description: 'Make strategic connections' }
        ],
        rewards: { xp: 400, tokens: 250, reputation: 150 },
        repeatable: false,
        choices: [
            {
                id: 'vcs',
                text: 'Focus on VCs - chase funding',
                outcomes: { tokensBonus: 500, reputationBonus: 50 }
            },
            {
                id: 'builders',
                text: 'Focus on builders - find collaborators',
                outcomes: { xpBonus: 200, reputationBonus: 100 }
            },
            {
                id: 'media',
                text: 'Focus on media - build your brand',
                outcomes: { reputationBonus: 200 }
            }
        ],
        dialogue: {
            intro: "The conference floor is buzzing. Who will you connect with?",
            complete: "You leave with a stack of contacts and new opportunities."
        }
    },
    {
        id: 'sq_hack_response',
        name: 'Crisis Response',
        description: 'A protocol you follow just got hacked. Help is needed.',
        type: 'event',
        requires: { level: 10 },
        objectives: [
            { type: 'stat_check', stat: 'dev', min: 12, description: 'Help investigate' },
            { type: 'choice', description: 'Decide your role' }
        ],
        rewards: { xp: 500, tokens: 300, reputation: 200 },
        repeatable: false,
        choices: [
            {
                id: 'investigate',
                text: 'Lead the investigation',
                statRequired: { dev: 15 },
                outcomes: { xpBonus: 200, reputationBonus: 150, achievement: 'white_hat' }
            },
            {
                id: 'communicate',
                text: 'Handle community communications',
                outcomes: { reputationBonus: 100, affinityChange: { sarah: 10 } }
            },
            {
                id: 'support',
                text: 'Support affected users',
                outcomes: { reputationBonus: 75, xpBonus: 100 }
            }
        ],
        dialogue: {
            intro: "Breaking news: A major exploit. The community is in panic.",
            complete: "The crisis passes. Your contribution didn't go unnoticed."
        }
    }
];

// ============================================
// QUEST STATE
// ============================================

let questState = {
    activeQuests: [],       // Currently tracked quests
    completedQuests: [],    // Finished quest IDs
    currentCampaign: null,  // Active campaign ID
    campaignProgress: {},   // Campaign -> chapter -> quest progress
    questLog: []            // Journal entries
};

// ============================================
// QUEST FUNCTIONS
// ============================================

function initQuestSystem() {
    const state = window.PumpArenaState.get();

    if (state.quests) {
        questState = { ...questState, ...state.quests };
    }

    return questState;
}

function startCampaign(campaignId) {
    const campaign = CAMPAIGNS[campaignId];
    if (!campaign) return { success: false, message: 'Campaign not found' };

    questState.currentCampaign = campaignId;
    questState.campaignProgress[campaignId] = {
        started: Date.now(),
        currentChapter: 0,
        chaptersCompleted: []
    };

    // Start first quest of first chapter
    const firstChapter = campaign.chapters[0];
    const firstQuest = firstChapter.quests[0];

    startQuest(firstQuest.id);
    saveQuestState();

    addToQuestLog(`Started campaign: ${campaign.name}`);

    return { success: true, campaign, firstQuest };
}

function startQuest(questId) {
    // Find quest in campaigns or side quests
    let quest = findQuest(questId);
    if (!quest) return { success: false, message: 'Quest not found' };

    // Check requirements
    if (quest.requires) {
        const meetsRequirements = checkQuestRequirements(quest.requires);
        if (!meetsRequirements) {
            return { success: false, message: 'Requirements not met' };
        }
    }

    // Check if already active
    if (questState.activeQuests.find(q => q.id === questId)) {
        return { success: false, message: 'Quest already active' };
    }

    // Check if already completed (and not repeatable)
    if (questState.completedQuests.includes(questId) && !quest.repeatable) {
        return { success: false, message: 'Quest already completed' };
    }

    // Add to active quests
    const activeQuest = {
        ...quest,
        startedAt: Date.now(),
        objectiveProgress: quest.objectives.map(() => false)
    };

    questState.activeQuests.push(activeQuest);
    saveQuestState();

    addToQuestLog(`Started quest: ${quest.name}`);

    document.dispatchEvent(new CustomEvent('pumparena:quest-started', {
        detail: { quest: activeQuest }
    }));

    return { success: true, quest: activeQuest };
}

function findQuest(questId) {
    // Search in campaigns
    for (const campaign of Object.values(CAMPAIGNS)) {
        for (const chapter of campaign.chapters) {
            const quest = chapter.quests.find(q => q.id === questId);
            if (quest) return { ...quest, campaign: campaign.id, chapter: chapter.id };
        }
    }

    // Search in side quests
    const sideQuest = SIDE_QUESTS.find(q => q.id === questId);
    if (sideQuest) return sideQuest;

    return null;
}

function checkQuestRequirements(requires) {
    const state = window.PumpArenaState.get();

    // Check required quests
    if (Array.isArray(requires)) {
        return requires.every(qId => questState.completedQuests.includes(qId));
    }

    // Check relationship requirements
    if (requires.relationship) {
        for (const [npcId, minAffinity] of Object.entries(requires.relationship)) {
            const relationship = state.relationships[npcId];
            if (!relationship || relationship.affinity < minAffinity) {
                return false;
            }
        }
    }

    // Check reputation requirement
    if (requires.reputation && state.resources.reputation < requires.reputation) {
        return false;
    }

    // Check level requirement
    if (requires.level && state.progression.level < requires.level) {
        return false;
    }

    return true;
}

function updateQuestObjective(questId, objectiveIndex, completed = true) {
    const activeQuest = questState.activeQuests.find(q => q.id === questId);
    if (!activeQuest) return false;

    activeQuest.objectiveProgress[objectiveIndex] = completed;

    // Check if all objectives complete
    const allComplete = activeQuest.objectiveProgress.every(p => p === true);
    if (allComplete) {
        completeQuest(questId);
    }

    saveQuestState();
    return true;
}

function completeQuest(questId) {
    const questIndex = questState.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) return { success: false };

    const quest = questState.activeQuests[questIndex];

    // Remove from active
    questState.activeQuests.splice(questIndex, 1);

    // Add to completed
    questState.completedQuests.push(questId);

    // Apply rewards
    if (quest.rewards) {
        if (quest.rewards.xp) window.PumpArenaState.addXP(quest.rewards.xp);
        if (quest.rewards.tokens) window.PumpArenaState.addTokens(quest.rewards.tokens);
        if (quest.rewards.reputation) window.PumpArenaState.addReputation(quest.rewards.reputation);
    }

    addToQuestLog(`Completed quest: ${quest.name}`);

    // Check for next quest in campaign
    if (quest.campaign) {
        checkCampaignProgress(quest.campaign, quest.chapter, questId);
    }

    saveQuestState();

    document.dispatchEvent(new CustomEvent('pumparena:quest-completed', {
        detail: { quest, rewards: quest.rewards }
    }));

    return { success: true, quest, rewards: quest.rewards };
}

function checkCampaignProgress(campaignId, chapterId, completedQuestId) {
    const campaign = CAMPAIGNS[campaignId];
    const progress = questState.campaignProgress[campaignId];

    const chapter = campaign.chapters.find(c => c.id === chapterId);
    const questsInChapter = chapter.quests.map(q => q.id);
    const completedInChapter = questsInChapter.filter(qId => questState.completedQuests.includes(qId));

    // Check if chapter complete
    if (completedInChapter.length === questsInChapter.length) {
        progress.chaptersCompleted.push(chapterId);

        // Start next chapter if available
        const currentChapterIndex = campaign.chapters.findIndex(c => c.id === chapterId);
        const nextChapter = campaign.chapters[currentChapterIndex + 1];

        if (nextChapter) {
            progress.currentChapter = currentChapterIndex + 1;
            // Start first quest of next chapter
            startQuest(nextChapter.quests[0].id);

            addToQuestLog(`Completed chapter: ${chapter.name}`);
            addToQuestLog(`Started chapter: ${nextChapter.name}`);
        } else {
            // Campaign complete!
            addToQuestLog(`CAMPAIGN COMPLETE: ${campaign.name}`);

            document.dispatchEvent(new CustomEvent('pumparena:campaign-completed', {
                detail: { campaign }
            }));
        }
    } else {
        // Find and start next quest in chapter
        const currentQuestIndex = chapter.quests.findIndex(q => q.id === completedQuestId);
        const nextQuest = chapter.quests[currentQuestIndex + 1];

        if (nextQuest && !questState.activeQuests.find(q => q.id === nextQuest.id)) {
            // Check if requirements met
            if (!nextQuest.requires || checkQuestRequirements(nextQuest.requires)) {
                startQuest(nextQuest.id);
            }
        }
    }
}

function getActiveQuests() {
    return [...questState.activeQuests];
}

function getQuestLog() {
    return [...questState.questLog];
}

function addToQuestLog(entry) {
    questState.questLog.unshift({
        text: entry,
        timestamp: Date.now()
    });

    // Keep last 50 entries
    if (questState.questLog.length > 50) {
        questState.questLog.pop();
    }
}

function saveQuestState() {
    const state = window.PumpArenaState.get();
    state.quests = {
        activeQuests: questState.activeQuests,
        completedQuests: questState.completedQuests,
        currentCampaign: questState.currentCampaign,
        campaignProgress: questState.campaignProgress,
        questLog: questState.questLog
    };
    window.PumpArenaState.save();
}

// ============================================
// QUEST UI RENDERING
// ============================================

function renderQuestPanel(container) {
    const activeQuests = getActiveQuests();

    container.innerHTML = `
        <div class="quest-panel">
            <div class="panel-header">
                <h3>Active Quests</h3>
                <span class="quest-count">${activeQuests.length} active</span>
            </div>

            ${activeQuests.length === 0 ? `
                <div class="no-quests">
                    <p>No active quests.</p>
                    <p>Explore projects to find opportunities!</p>
                </div>
            ` : `
                <div class="quest-list">
                    ${activeQuests.map(quest => renderQuestCard(quest)).join('')}
                </div>
            `}

            <div class="quest-log-section">
                <h4>Journal</h4>
                <div class="quest-log">
                    ${questState.questLog.slice(0, 10).map(entry => `
                        <div class="log-entry">
                            <span class="log-time">${formatTime(entry.timestamp)}</span>
                            <span class="log-text">${entry.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderQuestCard(quest) {
    const questType = QUEST_TYPES[quest.type];
    const progressCount = quest.objectiveProgress.filter(p => p).length;
    const totalObjectives = quest.objectives.length;
    const progressPercent = (progressCount / totalObjectives) * 100;

    return `
        <div class="quest-card" data-quest="${quest.id}" style="--quest-color: ${questType.color}">
            <div class="quest-header">
                <span class="quest-type-icon">${questType.icon}</span>
                <span class="quest-name">${quest.name}</span>
                <span class="quest-type-label" style="background: ${questType.color}">${questType.name}</span>
            </div>
            <p class="quest-description">${quest.description}</p>
            <div class="quest-objectives">
                ${quest.objectives.map((obj, i) => `
                    <div class="objective ${quest.objectiveProgress[i] ? 'complete' : ''}">
                        <span class="objective-check">${quest.objectiveProgress[i] ? '&#10003;' : '&#9675;'}</span>
                        <span class="objective-text">${obj.description}</span>
                    </div>
                `).join('')}
            </div>
            <div class="quest-progress">
                <div class="quest-progress-bar">
                    <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="quest-progress-text">${progressCount}/${totalObjectives}</span>
            </div>
            <div class="quest-rewards">
                ${quest.rewards.xp ? `<span class="reward-item">&#10024; ${quest.rewards.xp} XP</span>` : ''}
                ${quest.rewards.tokens ? `<span class="reward-item">&#128176; ${quest.rewards.tokens}</span>` : ''}
                ${quest.rewards.reputation ? `<span class="reward-item">&#11088; ${quest.rewards.reputation}</span>` : ''}
            </div>
        </div>
    `;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaQuests = {
        CAMPAIGNS,
        SIDE_QUESTS,
        QUEST_TYPES,
        init: initQuestSystem,
        startCampaign,
        startQuest,
        findQuest,
        updateObjective: updateQuestObjective,
        completeQuest,
        getActiveQuests,
        getQuestLog,
        renderQuestPanel,
        renderQuestCard
    };
}
