/**
 * Pump Arena RPG - Story Gates System
 *
 * Handles faction recruitment, story transitions, and locked progression
 * ASDF Philosophy: Players commit to factions until story moments unlock exits
 *
 * Key Rules:
 * 1. ASDF Collective ALWAYS recruits first at level 7+ (priority 1)
 * 2. Declining creates 24h cooldown, max 3 declines before blacklist
 * 3. Joining elite faction requires leaving current faction (story gate)
 * 4. Story gates are moments where player can change faction
 */

// ============================================================
// GLOBAL MODULE ACCESSORS (legacy compatibility)
// ============================================================

// Factions module accessors
const _storyGatesFACTIONS = {};  // Populated on init
const _getFactionRelation = (a, b) => window.PumpArenaFactions?.getFactionRelation?.(a, b) || 0;
const _canJoinFaction = (id, state) => window.PumpArenaFactions?.canJoinFaction?.(id, state) || { canJoin: false };

// RPG State accessors - use global functions if available
const _getStoryGatesRPGState = () => {
    if (typeof getRPGState === 'function') return getRPGState();
    return window.PumpArenaState?.get?.() || {};
};
const _getStoryGatesFactionState = () => _getStoryGatesRPGState().faction || {};
const _getCurrentFaction = () => _getStoryGatesFactionState().current || null;
const _setStoryGateCurrentFaction = (id) => {
    const state = _getStoryGatesRPGState();
    if (state.faction) state.faction.current = id;
    window.PumpArenaState?.save?.();
};
const _getStoryGateFactionStanding = (id) => _getStoryGatesFactionState().standing?.[id] || 0;
const _modifyStoryGateFactionStanding = (id, amount) => {
    const state = _getStoryGatesRPGState();
    if (!state.faction?.standing) return 0;
    state.faction.standing[id] = Math.max(-100, Math.min(100, (state.faction.standing[id] || 0) + amount));
    window.PumpArenaState?.save?.();
    return state.faction.standing[id];
};
const _recordStoryGateDeclineLocal = (gateId) => {
    const state = getRPGState();
    if (!state.faction) return;
    state.faction.storyGatesDeclined = state.faction.storyGatesDeclined || {};
    state.faction.storyGatesDeclined[gateId] = (state.faction.storyGatesDeclined[gateId] || 0) + 1;
    state.faction.storyGatesCooldowns = state.faction.storyGatesCooldowns || {};
    state.faction.storyGatesCooldowns[gateId] = Date.now() + 86400000;
    window.PumpArenaState?.save?.();
};
const getStoryGateDeclineCount = (gateId) => getFactionState().storyGatesDeclined?.[gateId] || 0;
const isStoryGateOnCooldown = (gateId) => {
    const cooldown = getFactionState().storyGatesCooldowns?.[gateId] || 0;
    return Date.now() < cooldown;
};
const setMajorChoice = (choiceId, value) => {
    const state = getRPGState();
    state.storyFlags = state.storyFlags || {};
    state.storyFlags.majorChoices = state.storyFlags.majorChoices || {};
    state.storyFlags.majorChoices[choiceId] = value;
    window.PumpArenaState?.save?.();
};
const getMajorChoice = (choiceId) => getRPGState().storyFlags?.majorChoices?.[choiceId] || null;

// ============================================================
// CONSTANTS - Fibonacci-based timing
// ============================================================

const STORY_GATE_CONSTANTS = Object.freeze({
    // Cooldowns (ms) - Fibonacci hours
    RECRUITMENT_COOLDOWN: 86400000,      // 24h after decline
    FACTION_SWITCH_COOLDOWN: 259200000,  // 72h after switching

    // Decline limits
    MAX_DECLINES_BEFORE_BLACKLIST: 3,
    BLACKLIST_DURATION: 604800000,       // 7 days

    // Level requirements
    ELITE_FACTION_MIN_LEVEL: 7,
    BUILDERS_GUILD_MIN_LEVEL: 10,

    // Standing thresholds
    MIN_STANDING_FOR_INVITE: 21,         // Fibonacci
    RIVAL_STANDING_THRESHOLD: -34,       // Below this = cannot join

    // Chapter requirements
    REQUIRED_CHAPTER_FOR_SWITCH: 2       // Must complete chapter 2 to switch
});

// ============================================================
// STORY GATE DEFINITIONS
// ============================================================

/**
 * Story gates define moments where faction transitions can occur
 * Each gate has triggers, requirements, and outcomes
 */
const STORY_GATES = {
    // ===== ASDF Recruitment (Always First Priority) =====
    asdf_recruitment: {
        id: 'asdf_recruitment',
        type: 'faction_invite',
        factionId: 'asdf',
        priority: 1, // ASDF ALWAYS proposes first

        trigger: {
            minLevel: 7,
            minTotalBurned: 1000,
            mustHaveCompletedChapter: 2,
            noActiveStoryGate: true
        },

        requirements: {
            factionStanding: { asdf: 21 },
            notBlacklisted: true,
            notOnCooldown: true
        },

        dialogue: {
            intro: {
                speaker: 'The Architect',
                avatar: '🔥',
                text: "Nous t'observons depuis un moment, {playerName}. Tes actions parlent plus fort que les mots."
            },
            proposal: {
                speaker: 'The Architect',
                avatar: '🔥',
                text: "L'ASDF Collective t'invite à rejoindre notre cause. Ensemble, nous brûlons ce qui ne sert plus pour construire ce qui compte vraiment. Burns benefit everyone.",
                choices: [
                    {
                        id: 'accept',
                        text: "Je suis prêt à brûler avec vous 🔥",
                        consequence: "Rejoindre l'ASDF Collective"
                    },
                    {
                        id: 'decline',
                        text: "Pas maintenant, j'ai d'autres engagements",
                        consequence: "Refuser (cooldown 24h, autres factions proposeront)"
                    },
                    {
                        id: 'ask_more',
                        text: "Parlez-moi plus de l'ASDF...",
                        consequence: "En savoir plus avant de décider"
                    }
                ]
            },
            moreInfo: {
                speaker: 'The Architect',
                avatar: '🔥',
                text: "L'ASDF n'est pas une faction ordinaire. Nous croyons que la destruction créative est nécessaire au progrès. Chaque token brûlé renforce l'écosystème. En nous rejoignant, tu recevras des bonus de burn (+21%), un multiplicateur XP (+13%), et accès à nos quêtes exclusives.",
                choices: [
                    {
                        id: 'accept',
                        text: "Convaincu. Je rejoins l'ASDF! 🔥",
                        consequence: "Rejoindre l'ASDF Collective"
                    },
                    {
                        id: 'decline',
                        text: "Intéressant, mais je décline pour l'instant",
                        consequence: "Refuser (cooldown 24h)"
                    }
                ]
            },
            accept: {
                speaker: 'The Architect',
                avatar: '🔥',
                text: "Bienvenue dans la flamme, {playerName}. À partir de maintenant, chaque burn que tu fais contribue à notre mission collective. Burns benefit everyone!",
                rewards: true
            },
            decline: {
                speaker: 'The Architect',
                avatar: '🔥',
                text: "Je comprends. Le chemin n'est pas pour tout le monde. Mais sache que notre porte reste ouverte... pour un temps.",
                warning: "D'autres factions pourraient te contacter prochainement."
            }
        },

        onAccept: {
            leavePreviousFaction: true,
            joinFaction: 'asdf',
            unlockQuests: ['asdf_q1_burning_path', 'asdf_q2_meet_founders'],
            unlockAchievement: 'asdf_initiate',
            rewards: {
                tokens: 500,
                xp: 200,
                items: ['asdf_badge', 'phoenix_feather'],
                stats: { lck: 1 }
            },
            storyFlags: {
                set: ['joined_asdf', 'burned_for_cause'],
                chapter: 'asdf_chapter_1'
            }
        },

        onDecline: {
            cooldownMs: 86400000, // 24h
            standingChange: { asdf: -5 },
            triggerRivalRecruitment: true,
            storyFlags: {
                set: ['declined_asdf']
            }
        }
    },

    // ===== Pump Lords Recruitment (Antagonist) =====
    pump_lords_recruitment: {
        id: 'pump_lords_recruitment',
        type: 'faction_invite',
        factionId: 'pump_lords',
        priority: 5, // After ASDF decline

        trigger: {
            minLevel: 5,
            hasDeclined: ['asdf_recruitment'],
            noActiveStoryGate: true
        },

        requirements: {
            factionStanding: { pump_lords: 13 },
            notBlacklisted: true,
            notOnCooldown: true
        },

        dialogue: {
            intro: {
                speaker: 'Lord Pump',
                avatar: '📈',
                text: "J'ai entendu dire que tu avais refusé ces pyromanes de l'ASDF. Sage décision."
            },
            proposal: {
                speaker: 'Lord Pump',
                avatar: '📈',
                text: "Les Pump Lords savent reconnaître le potentiel. Avec nous, le number go up n'est pas un meme, c'est une philosophie. Rejoins-nous et profit ensemble.",
                choices: [
                    {
                        id: 'accept',
                        text: "Number go up! Je suis partant 📈",
                        consequence: "Rejoindre les Pump Lords"
                    },
                    {
                        id: 'decline',
                        text: "Trop risqué pour moi",
                        consequence: "Refuser (cooldown 24h)"
                    }
                ]
            },
            accept: {
                speaker: 'Lord Pump',
                avatar: '📈',
                text: "Excellent choix! Prépare-toi pour les gains. Dans ce jeu, seuls les winners survivent.",
                rewards: true
            },
            decline: {
                speaker: 'Lord Pump',
                avatar: '📈',
                text: "Tu rates quelque chose de grand. Mais hey, NGMI c'est aussi un choix.",
                warning: "Les Pump Lords n'oublient pas facilement."
            }
        },

        onAccept: {
            leavePreviousFaction: true,
            joinFaction: 'pump_lords',
            unlockQuests: ['pump_q1_first_pump', 'pump_q2_shilling_101'],
            rewards: {
                tokens: 300,
                xp: 150,
                items: ['pump_badge', 'green_candle']
            },
            storyFlags: {
                set: ['joined_pump_lords']
            }
        },

        onDecline: {
            cooldownMs: 86400000,
            standingChange: { pump_lords: -8 }
        }
    },

    // ===== Bear Clan Recruitment (Antagonist) =====
    bear_clan_recruitment: {
        id: 'bear_clan_recruitment',
        type: 'faction_invite',
        factionId: 'bear_clan',
        priority: 5,

        trigger: {
            minLevel: 5,
            hasDeclined: ['asdf_recruitment'],
            noActiveStoryGate: true
        },

        requirements: {
            factionStanding: { bear_clan: 13 },
            notBlacklisted: true,
            notOnCooldown: true
        },

        dialogue: {
            intro: {
                speaker: 'Bear Mother',
                avatar: '🐻',
                text: "Le marché est cyclique, jeune trader. Ceux qui refusent de le voir finissent ruinés."
            },
            proposal: {
                speaker: 'Bear Mother',
                avatar: '🐻',
                text: "Le Bear Clan protège les siens quand les marchés s'effondrent. Cash is king - et nous avons beaucoup de cash. Rejoins-nous.",
                choices: [
                    {
                        id: 'accept',
                        text: "Cash is king! Je rejoins le Clan 🐻",
                        consequence: "Rejoindre le Bear Clan"
                    },
                    {
                        id: 'decline',
                        text: "Je préfère rester optimiste",
                        consequence: "Refuser (cooldown 24h)"
                    }
                ]
            },
            accept: {
                speaker: 'Bear Mother',
                avatar: '🐻',
                text: "Bienvenue dans la tanière. Ici, on survit aux hivers crypto.",
                rewards: true
            },
            decline: {
                speaker: 'Bear Mother',
                avatar: '🐻',
                text: "L'optimisme aveugle mène à la ruine. Tu t'en souviendras.",
                warning: "Le Bear Clan se souvient de ceux qui les snobent."
            }
        },

        onAccept: {
            leavePreviousFaction: true,
            joinFaction: 'bear_clan',
            unlockQuests: ['bear_q1_first_short', 'bear_q2_hedge_basics'],
            rewards: {
                tokens: 400,
                xp: 150,
                items: ['bear_badge', 'red_candle']
            }
        },

        onDecline: {
            cooldownMs: 86400000,
            standingChange: { bear_clan: -8 }
        }
    },

    // ===== Builders Guild Recruitment (Elite) =====
    builders_guild_recruitment: {
        id: 'builders_guild_recruitment',
        type: 'faction_invite',
        factionId: 'builders_guild',
        priority: 2, // Second only to ASDF

        trigger: {
            minLevel: 10,
            mustHaveCompletedChapter: 3,
            hasContributed: true, // Special flag
            noActiveStoryGate: true
        },

        requirements: {
            factionStanding: { builders_guild: 34 },
            achievements: ['shipped_something'],
            notBlacklisted: true,
            notOnCooldown: true
        },

        dialogue: {
            intro: {
                speaker: 'Master Builder',
                avatar: '🔨',
                text: "Ton travail parle pour toi. Nous avons vu ce que tu as construit."
            },
            proposal: {
                speaker: 'Master Builder',
                avatar: '🔨',
                text: "La Builders Guild accueille ceux qui créent, pas ceux qui spéculent. Build in public, ship or die. Es-tu prêt à construire avec nous?",
                choices: [
                    {
                        id: 'accept',
                        text: "Ship it! Je rejoins les Builders 🔨",
                        consequence: "Rejoindre la Builders Guild"
                    },
                    {
                        id: 'decline',
                        text: "J'ai encore des choses à finir ailleurs",
                        consequence: "Refuser (cooldown 24h)"
                    }
                ]
            },
            accept: {
                speaker: 'Master Builder',
                avatar: '🔨',
                text: "Bienvenue, Builder. Ici, on juge sur le code, pas sur les mots. Ton premier projet t'attend.",
                rewards: true
            },
            decline: {
                speaker: 'Master Builder',
                avatar: '🔨',
                text: "Understandable. Reviens quand tu seras prêt à ship.",
                warning: null
            }
        },

        onAccept: {
            leavePreviousFaction: true,
            joinFaction: 'builders_guild',
            unlockQuests: ['builders_q1_first_commit', 'builders_q2_code_review'],
            rewards: {
                tokens: 800,
                xp: 300,
                items: ['builder_badge', 'golden_hammer'],
                stats: { int: 2 }
            }
        },

        onDecline: {
            cooldownMs: 86400000,
            standingChange: { builders_guild: -3 }
        }
    },

    // ===== Story Gate: Chapter End Decision =====
    chapter_end_decision: {
        id: 'chapter_end_decision',
        type: 'story_choice',
        priority: 10, // High priority - story moment

        trigger: {
            completedChapter: true,
            chapterNumber: 'any'
        },

        dialogue: {
            intro: {
                speaker: 'Narrator',
                avatar: '📖',
                text: "Tu as terminé ce chapitre de ton histoire. Un moment de réflexion s'impose."
            },
            proposal: {
                speaker: 'Narrator',
                avatar: '📖',
                text: "Que souhaites-tu faire maintenant?",
                choices: [
                    {
                        id: 'continue',
                        text: "Continuer avec ma faction actuelle",
                        consequence: "Débloquer le prochain chapitre"
                    },
                    {
                        id: 'leave',
                        text: "Quitter ma faction et explorer",
                        consequence: "Devenir indépendant (Story Gate)"
                    },
                    {
                        id: 'switch',
                        text: "Chercher une nouvelle faction",
                        consequence: "Activer recrutement des autres factions"
                    }
                ]
            }
        },

        outcomes: {
            continue: {
                unlockNextChapter: true,
                bonusXp: 100
            },
            leave: {
                leaveFaction: true,
                standingPenalty: -13,
                cooldownBeforeRejoin: 259200000 // 72h
            },
            switch: {
                activateRecruitment: true,
                leaveFactionOnAccept: true
            }
        }
    },

    // ===== Betrayal Story Gate =====
    faction_betrayal: {
        id: 'faction_betrayal',
        type: 'story_consequence',
        priority: 1, // Highest - immediate consequence

        trigger: {
            standingBelow: -50,
            withCurrentFaction: true
        },

        dialogue: {
            intro: {
                speaker: 'Faction Leader',
                avatar: '⚠️',
                text: "Tes actions récentes n'ont pas échappé à notre attention..."
            },
            proposal: {
                speaker: 'Faction Leader',
                avatar: '⚠️',
                text: "Tu as trahi la confiance de notre faction. Il est temps de choisir.",
                choices: [
                    {
                        id: 'apologize',
                        text: "Je regrette mes actions, laissez-moi me racheter",
                        consequence: "Quête de rédemption (difficile)"
                    },
                    {
                        id: 'defiant',
                        text: "Je ne regrette rien!",
                        consequence: "Expulsion immédiate + devenir ennemi"
                    },
                    {
                        id: 'escape',
                        text: "Je pars avant que ça n'empire...",
                        consequence: "Quitter sans devenir ennemi"
                    }
                ]
            }
        },

        outcomes: {
            apologize: {
                unlockQuest: 'redemption_arc',
                standingReset: -30,
                storyFlag: 'seeking_redemption'
            },
            defiant: {
                forcedExpulsion: true,
                becomeEnemy: true,
                standingSet: -89,
                unlockQuest: 'faction_war_personal',
                storyFlag: 'faction_enemy'
            },
            escape: {
                leaveFaction: true,
                standingSet: -34,
                cooldownBeforeInteraction: 604800000 // 7 days
            }
        }
    }
};

// Deep freeze helper - use global from utils.js
// deepFreeze is defined in js/games/utils.js

// Freeze all story gates
deepFreeze(STORY_GATES);

// ============================================================
// STORY GATE MANAGER
// ============================================================

class StoryGateManager {
    constructor() {
        this.activeGate = null;
        this.pendingGates = [];
    }

    /**
     * Check all gates and return the highest priority one that triggers
     */
    checkForTriggeredGates(gameState) {
        const triggeredGates = [];

        for (const [gateId, gate] of Object.entries(STORY_GATES)) {
            if (this.meetsGateTrigger(gate, gameState) &&
                this.meetsGateRequirements(gate, gameState)) {
                triggeredGates.push(gate);
            }
        }

        // Sort by priority (lower = higher priority)
        triggeredGates.sort((a, b) => a.priority - b.priority);

        return triggeredGates[0] || null;
    }

    /**
     * Check if gate trigger conditions are met
     */
    meetsGateTrigger(gate, gameState) {
        const trigger = gate.trigger;
        const character = gameState.character || {};
        const factionState = gameState.faction || {};

        // Level check
        if (trigger.minLevel && character.level < trigger.minLevel) {
            return false;
        }

        // Total burned check
        if (trigger.minTotalBurned) {
            const burned = character.totalBurned || 0;
            if (burned < trigger.minTotalBurned) return false;
        }

        // Chapter completion check
        if (trigger.mustHaveCompletedChapter) {
            const currentFaction = factionState.current;
            if (currentFaction) {
                const chapterProgress = factionState.chapterProgress?.[currentFaction] || 0;
                if (chapterProgress < trigger.mustHaveCompletedChapter) return false;
            }
        }

        // Decline check
        if (trigger.hasDeclined) {
            const declinedGates = Object.keys(factionState.storyGatesDeclined || {});
            const hasDeclinedRequired = trigger.hasDeclined.every(g => declinedGates.includes(g));
            if (!hasDeclinedRequired) return false;
        }

        // Standing check for betrayal
        if (trigger.standingBelow !== undefined && trigger.withCurrentFaction) {
            const currentFaction = factionState.current;
            if (currentFaction) {
                const standing = factionState.standing?.[currentFaction] || 0;
                if (standing >= trigger.standingBelow) return false;
            } else {
                return false;
            }
        }

        // No active gate check
        if (trigger.noActiveStoryGate && this.activeGate) {
            return false;
        }

        return true;
    }

    /**
     * Check if gate requirements are met
     */
    meetsGateRequirements(gate, gameState) {
        const req = gate.requirements;
        if (!req) return true;

        const factionState = gameState.faction || {};
        const achievements = gameState.achievements || [];

        // Faction standing requirements
        if (req.factionStanding) {
            for (const [faction, minStanding] of Object.entries(req.factionStanding)) {
                const standing = factionState.standing?.[faction] || 0;
                if (standing < minStanding) return false;
            }
        }

        // Blacklist check
        if (req.notBlacklisted) {
            const blacklist = factionState.blacklistedFrom || [];
            if (blacklist.includes(gate.factionId)) return false;
        }

        // Cooldown check
        if (req.notOnCooldown) {
            if (isStoryGateOnCooldown(gate.id)) return false;
        }

        // Achievement requirements
        if (req.achievements) {
            const hasAll = req.achievements.every(a => achievements.includes(a));
            if (!hasAll) return false;
        }

        return true;
    }

    /**
     * Start a story gate interaction
     */
    startGate(gate, gameState) {
        this.activeGate = {
            ...gate,
            startedAt: Date.now(),
            state: 'intro'
        };

        return this.getGateDialogue('intro', gameState);
    }

    /**
     * Get current dialogue for gate
     */
    getGateDialogue(phase, gameState) {
        if (!this.activeGate) return null;

        const dialogue = this.activeGate.dialogue[phase];
        if (!dialogue) return null;

        // Replace placeholders
        const playerName = gameState.character?.name || 'Adventurer';

        return {
            ...dialogue,
            text: dialogue.text.replace('{playerName}', playerName),
            gateId: this.activeGate.id,
            phase
        };
    }

    /**
     * Progress gate to proposal phase
     */
    showProposal(gameState) {
        if (!this.activeGate) return null;
        this.activeGate.state = 'proposal';
        return this.getGateDialogue('proposal', gameState);
    }

    /**
     * Show more info (if available)
     */
    showMoreInfo(gameState) {
        if (!this.activeGate) return null;
        if (!this.activeGate.dialogue.moreInfo) {
            return this.showProposal(gameState);
        }
        this.activeGate.state = 'moreInfo';
        return this.getGateDialogue('moreInfo', gameState);
    }

    /**
     * Process player's choice
     */
    processChoice(choiceId, gameState) {
        if (!this.activeGate) return null;

        const gate = this.activeGate;
        const result = {
            gateId: gate.id,
            choice: choiceId,
            effects: [],
            dialogue: null
        };

        if (choiceId === 'accept') {
            result.effects = this.applyAcceptEffects(gate, gameState);
            result.dialogue = this.getGateDialogue('accept', gameState);
            result.success = true;
        } else if (choiceId === 'decline') {
            result.effects = this.applyDeclineEffects(gate, gameState);
            result.dialogue = this.getGateDialogue('decline', gameState);
            result.success = true;
        } else if (choiceId === 'ask_more') {
            result.dialogue = this.showMoreInfo(gameState);
            return result; // Don't close gate yet
        } else {
            // Custom outcome (for story_choice types)
            const outcomes = gate.outcomes?.[choiceId];
            if (outcomes) {
                result.effects = this.applyCustomOutcome(outcomes, gameState);
                result.success = true;
            }
        }

        // Close gate if processed
        if (result.success && choiceId !== 'ask_more') {
            this.activeGate = null;
        }

        return result;
    }

    /**
     * Apply effects when player accepts
     */
    applyAcceptEffects(gate, gameState) {
        const effects = [];
        const onAccept = gate.onAccept;
        if (!onAccept) return effects;

        // Leave previous faction
        if (onAccept.leavePreviousFaction) {
            const previous = getCurrentFaction();
            if (previous) {
                effects.push({ type: 'left_faction', faction: previous });
                this.leaveFaction(previous, gameState);
            }
        }

        // Join new faction
        if (onAccept.joinFaction) {
            setCurrentFaction(onAccept.joinFaction);
            effects.push({ type: 'joined_faction', faction: onAccept.joinFaction });
        }

        // Unlock quests
        if (onAccept.unlockQuests) {
            effects.push({ type: 'quests_unlocked', quests: onAccept.unlockQuests });
        }

        // Grant rewards
        if (onAccept.rewards) {
            effects.push({ type: 'rewards', rewards: onAccept.rewards });
        }

        // Set story flags
        if (onAccept.storyFlags?.set) {
            onAccept.storyFlags.set.forEach(flag => {
                setMajorChoice(flag, true);
            });
            effects.push({ type: 'story_flags', flags: onAccept.storyFlags.set });
        }

        // Unlock achievement
        if (onAccept.unlockAchievement) {
            effects.push({ type: 'achievement', id: onAccept.unlockAchievement });
        }

        return effects;
    }

    /**
     * Apply effects when player declines
     */
    applyDeclineEffects(gate, gameState) {
        const effects = [];
        const onDecline = gate.onDecline;
        if (!onDecline) return effects;

        // Record decline
        recordStoryGateDecline(gate.id, onDecline.cooldownMs || STORY_GATE_CONSTANTS.RECRUITMENT_COOLDOWN);
        effects.push({ type: 'gate_declined', gateId: gate.id });

        // Check for blacklist
        const declineCount = getStoryGateDeclineCount(gate.id);
        if (declineCount >= STORY_GATE_CONSTANTS.MAX_DECLINES_BEFORE_BLACKLIST) {
            effects.push({ type: 'blacklisted', faction: gate.factionId });
        }

        // Standing change
        if (onDecline.standingChange) {
            for (const [faction, change] of Object.entries(onDecline.standingChange)) {
                modifyFactionStanding(faction, change);
                effects.push({ type: 'standing_change', faction, change });
            }
        }

        // Trigger rival recruitment
        if (onDecline.triggerRivalRecruitment) {
            effects.push({ type: 'trigger_rival_recruitment' });
        }

        // Set story flags
        if (onDecline.storyFlags?.set) {
            onDecline.storyFlags.set.forEach(flag => {
                setMajorChoice(flag, true);
            });
        }

        return effects;
    }

    /**
     * Apply custom outcome effects
     */
    applyCustomOutcome(outcomes, gameState) {
        const effects = [];

        if (outcomes.unlockNextChapter) {
            effects.push({ type: 'chapter_unlocked' });
        }

        if (outcomes.leaveFaction) {
            const current = getCurrentFaction();
            if (current) {
                this.leaveFaction(current, gameState);
                effects.push({ type: 'left_faction', faction: current });
            }
        }

        if (outcomes.forcedExpulsion) {
            effects.push({ type: 'expelled' });
        }

        if (outcomes.becomeEnemy) {
            effects.push({ type: 'became_enemy' });
        }

        if (outcomes.unlockQuest) {
            effects.push({ type: 'quest_unlocked', quest: outcomes.unlockQuest });
        }

        if (outcomes.storyFlag) {
            setMajorChoice(outcomes.storyFlag, true);
            effects.push({ type: 'story_flag', flag: outcomes.storyFlag });
        }

        if (outcomes.standingReset !== undefined) {
            const current = getCurrentFaction();
            if (current) {
                modifyFactionStanding(current, outcomes.standingReset);
            }
        }

        if (outcomes.standingSet !== undefined) {
            const current = getCurrentFaction();
            if (current) {
                // Get current and calculate difference
                const currentStanding = getFactionStanding(current);
                const diff = outcomes.standingSet - currentStanding;
                modifyFactionStanding(current, diff);
            }
        }

        if (outcomes.bonusXp) {
            effects.push({ type: 'bonus_xp', amount: outcomes.bonusXp });
        }

        if (outcomes.activateRecruitment) {
            effects.push({ type: 'recruitment_activated' });
        }

        return effects;
    }

    /**
     * Leave a faction
     */
    leaveFaction(factionId, gameState) {
        const factionState = getFactionState();

        // Add to previous factions
        if (!factionState.previousFactions.includes(factionId)) {
            factionState.previousFactions.push(factionId);
        }

        // Clear current
        setCurrentFaction(null);

        // Reduce standing
        modifyFactionStanding(factionId, -13);
    }

    /**
     * Get available recruitment gates for player
     */
    getAvailableRecruitmentGates(gameState) {
        const available = [];

        for (const [gateId, gate] of Object.entries(STORY_GATES)) {
            if (gate.type !== 'faction_invite') continue;

            if (this.meetsGateTrigger(gate, gameState) &&
                this.meetsGateRequirements(gate, gameState)) {
                available.push(gate);
            }
        }

        // Sort by priority
        return available.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Check if player can leave current faction
     */
    canLeaveFaction(gameState) {
        const factionState = gameState.faction || {};
        const currentFaction = factionState.current;

        if (!currentFaction) return { canLeave: true, reason: 'No faction' };

        // Check chapter progress
        const chapterProgress = factionState.chapterProgress?.[currentFaction] || 0;

        // Cannot leave mid-chapter
        if (chapterProgress < STORY_GATE_CONSTANTS.REQUIRED_CHAPTER_FOR_SWITCH) {
            return {
                canLeave: false,
                reason: `Vous devez terminer le chapitre ${STORY_GATE_CONSTANTS.REQUIRED_CHAPTER_FOR_SWITCH} avant de pouvoir quitter ${FACTIONS[currentFaction]?.name || currentFaction}.`,
                requiredChapter: STORY_GATE_CONSTANTS.REQUIRED_CHAPTER_FOR_SWITCH,
                currentChapter: chapterProgress
            };
        }

        // Check cooldown
        const lastSwitch = factionState.lastFactionSwitch || 0;
        const cooldownEnd = lastSwitch + STORY_GATE_CONSTANTS.FACTION_SWITCH_COOLDOWN;

        if (Date.now() < cooldownEnd) {
            const remaining = cooldownEnd - Date.now();
            const hours = Math.ceil(remaining / 3600000);
            return {
                canLeave: false,
                reason: `Cooldown actif: ${hours}h avant de pouvoir changer de faction.`,
                cooldownEnds: cooldownEnd
            };
        }

        return { canLeave: true };
    }

    /**
     * Get faction recruitment priority order
     */
    getRecruitmentOrder(gameState) {
        const order = [];
        const factionState = gameState.faction || {};
        const declinedGates = factionState.storyGatesDeclined || {};

        // ASDF always first if not blacklisted/declined
        if (!declinedGates.asdf_recruitment ||
            getStoryGateDeclineCount('asdf_recruitment') < STORY_GATE_CONSTANTS.MAX_DECLINES_BEFORE_BLACKLIST) {
            order.push('asdf');
        }

        // Then Builders Guild
        if (!declinedGates.builders_guild_recruitment ||
            getStoryGateDeclineCount('builders_guild_recruitment') < STORY_GATE_CONSTANTS.MAX_DECLINES_BEFORE_BLACKLIST) {
            order.push('builders_guild');
        }

        // Then rivals based on who was declined
        if (declinedGates.asdf_recruitment) {
            // Pump Lords and Bear Clan become available after declining ASDF
            if (!declinedGates.pump_lords_recruitment) order.push('pump_lords');
            if (!declinedGates.bear_clan_recruitment) order.push('bear_clan');
        }

        return order;
    }
}

// ============================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================

const storyGateManager = new StoryGateManager();

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaStoryGates = {
    STORY_GATES,
    STORY_GATE_CONSTANTS,
    storyGateManager,
    checkForStoryGates: (gs) => storyGateManager.checkForTriggeredGates(gs),
    startStoryGate: (g, gs) => storyGateManager.startGate(g, gs),
    processStoryGateChoice: (c, gs) => storyGateManager.processChoice(c, gs),
    getActiveStoryGate: () => storyGateManager.activeGate,
    canPlayerLeaveFaction: (gs) => storyGateManager.canLeaveFaction(gs),
    getRecruitmentOrder: (gs) => storyGateManager.getRecruitmentOrder(gs),
    getAvailableRecruitmentGates: (gs) => storyGateManager.getAvailableRecruitmentGates(gs),
    getStoryGate: (id) => STORY_GATES[id] || null,
    getGatesForFaction: (fid) => Object.values(STORY_GATES).filter(g => g.factionId === fid)
};
