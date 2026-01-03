/**
 * Pump Arena RPG - Random Events System
 * Dynamic events that occur during gameplay
 */

'use strict';

// ============================================
// EVENT DEFINITIONS
// ============================================

const EVENT_TYPES = {
    positive: { name: 'Opportunity', color: '#22c55e', icon: '&#127775;' },
    negative: { name: 'Crisis', color: '#ef4444', icon: '&#9888;' },
    neutral: { name: 'Crossroads', color: '#3b82f6', icon: '&#128268;' },
    special: { name: 'Rare Event', color: '#a855f7', icon: '&#11088;' }
};

const RANDOM_EVENTS = {
    // ========== POSITIVE EVENTS ==========
    whale_alert: {
        id: 'whale_alert',
        type: 'positive',
        name: 'Whale Alert',
        description: 'A whale just followed you on Twitter. They want to chat.',
        rarity: 0.15,
        minReputation: 200,
        choices: [
            {
                id: 'accept',
                text: 'Accept the call',
                icon: '&#128222;',
                hint: 'Could lead to alpha or a new connection',
                outcomes: {
                    success: { chance: 0.7, reputation: 100, tokens: 500, affinity: { whale: 20 } },
                    fail: { chance: 0.3, reputation: -20, message: 'The whale was testing you. They went silent.' }
                }
            },
            {
                id: 'ignore',
                text: 'Politely decline',
                icon: '&#128556;',
                hint: 'Safe but no reward',
                outcomes: {
                    success: { chance: 1.0, reputation: 0, message: 'You stay focused on your work.' }
                }
            },
            {
                id: 'public',
                text: 'Ask for alpha publicly',
                icon: '&#128227;',
                hint: 'High risk - could backfire spectacularly',
                outcomes: {
                    success: { chance: 0.2, reputation: 200, tokens: 1000, xp: 300 },
                    fail: { chance: 0.8, reputation: -150, message: 'The whale blocks you. Others noticed...' }
                }
            }
        ],
        timeLimit: 30
    },

    alpha_leak: {
        id: 'alpha_leak',
        type: 'positive',
        name: 'Alpha Incoming',
        description: 'A trusted source DMs you with insider info about an upcoming announcement.',
        rarity: 0.1,
        minLevel: 5,
        choices: [
            {
                id: 'keep_secret',
                text: 'Keep it to yourself',
                icon: '&#129296;',
                hint: 'Maintain trust, personal benefit',
                outcomes: {
                    success: { chance: 0.9, tokens: 300, affinity: { oracle: 15 } },
                    fail: { chance: 0.1, message: 'The info was wrong. Oh well.' }
                }
            },
            {
                id: 'share_team',
                text: 'Share with your team',
                icon: '&#128101;',
                hint: 'Build team loyalty',
                outcomes: {
                    success: { chance: 0.85, reputation: 75, xp: 150 },
                    fail: { chance: 0.15, reputation: -50, message: 'Someone leaked it. Trust broken.' }
                }
            },
            {
                id: 'verify',
                text: 'Verify before acting',
                icon: '&#128270;',
                hint: 'Safe approach',
                statBonus: { str: 5 },
                outcomes: {
                    success: { chance: 1.0, xp: 100, message: 'Smart move. Always verify.' }
                }
            }
        ],
        timeLimit: 45
    },

    viral_moment: {
        id: 'viral_moment',
        type: 'positive',
        name: 'Going Viral',
        description: 'One of your posts is blowing up! Quick, capitalize on it!',
        rarity: 0.12,
        archetypeBonus: { creator: 0.3, marketer: 0.2 },
        choices: [
            {
                id: 'ride_wave',
                text: 'Ride the wave',
                icon: '&#127754;',
                hint: 'Post follow-up content',
                outcomes: {
                    success: { chance: 0.75, reputation: 150, xp: 200, influence: 30 },
                    fail: { chance: 0.25, reputation: 20, message: 'The moment passed.' }
                }
            },
            {
                id: 'promote_project',
                text: 'Promote your project',
                icon: '&#128640;',
                hint: 'Convert attention to value',
                outcomes: {
                    success: { chance: 0.6, reputation: 100, tokens: 400 },
                    fail: { chance: 0.4, reputation: -30, message: 'People saw through the shill.' }
                }
            },
            {
                id: 'stay_humble',
                text: 'Stay humble',
                icon: '&#128591;',
                hint: 'Let it speak for itself',
                outcomes: {
                    success: { chance: 0.9, reputation: 80, affinity: { sarah: 10 } },
                    fail: { chance: 0.1, message: 'The moment fades quietly.' }
                }
            }
        ],
        timeLimit: 20
    },

    // ========== NEGATIVE EVENTS ==========
    fud_attack: {
        id: 'fud_attack',
        type: 'negative',
        name: 'FUD Attack',
        description: "Someone's spreading lies about your project on CT!",
        rarity: 0.18,
        minReputation: 100,
        choices: [
            {
                id: 'clap_back',
                text: 'Clap back publicly',
                icon: '&#128293;',
                hint: 'High risk, could escalate',
                outcomes: {
                    success: { chance: 0.4, reputation: 100, xp: 150 },
                    fail: { chance: 0.6, reputation: -100, message: 'The drama spiraled. You look bad.' }
                }
            },
            {
                id: 'receipts',
                text: 'Post receipts calmly',
                icon: '&#128203;',
                hint: 'Facts over feelings',
                statBonus: { str: 3, com: 3 },
                outcomes: {
                    success: { chance: 0.8, reputation: 50, xp: 100, affinity: { marcus: 10 } },
                    fail: { chance: 0.2, reputation: -20, message: 'Some believed the FUD anyway.' }
                }
            },
            {
                id: 'silence',
                text: 'Stay silent',
                icon: '&#129296;',
                hint: 'Avoid drama but lose some rep',
                outcomes: {
                    success: { chance: 1.0, reputation: -30, message: 'The noise dies down eventually.' }
                }
            }
        ],
        timeLimit: 30
    },

    bug_discovered: {
        id: 'bug_discovered',
        type: 'negative',
        name: 'Critical Bug',
        description: 'A community member found a bug in the smart contract!',
        rarity: 0.1,
        minLevel: 3,
        choices: [
            {
                id: 'fix_quietly',
                text: 'Fix it quietly',
                icon: '&#128295;',
                hint: 'Risky if discovered',
                statRequired: { dev: 10 },
                outcomes: {
                    success: { chance: 0.6, xp: 200, message: 'Fixed before anyone noticed.' },
                    fail: { chance: 0.4, reputation: -200, message: 'Someone noticed the stealth fix. Trust broken.' }
                }
            },
            {
                id: 'transparent',
                text: 'Announce and fix',
                icon: '&#128227;',
                hint: 'Transparent approach',
                outcomes: {
                    success: { chance: 0.85, reputation: 30, xp: 150, affinity: { marcus: 15 } },
                    fail: { chance: 0.15, reputation: -50, message: 'Some users panicked anyway.' }
                }
            },
            {
                id: 'bounty',
                text: 'Offer a bug bounty',
                icon: '&#128176;',
                hint: 'Cost tokens but build trust',
                outcomes: {
                    success: { chance: 0.95, reputation: 100, tokens: -200, xp: 100 },
                    fail: { chance: 0.05, tokens: -200, message: 'Bounty paid but more bugs found...' }
                }
            }
        ],
        timeLimit: 45
    },

    team_drama: {
        id: 'team_drama',
        type: 'negative',
        name: 'Team Conflict',
        description: 'Two team members are having a public argument. People are watching.',
        rarity: 0.12,
        choices: [
            {
                id: 'mediate',
                text: 'Mediate privately',
                icon: '&#129309;',
                hint: 'Diplomatic approach',
                statBonus: { cha: 5 },
                outcomes: {
                    success: { chance: 0.7, reputation: 40, affinity: { jordan: 10, sarah: 10 } },
                    fail: { chance: 0.3, reputation: -20, message: 'They both blame you now.' }
                }
            },
            {
                id: 'pick_side',
                text: 'Support one side',
                icon: '&#9878;',
                hint: 'Make an ally and an enemy',
                outcomes: {
                    success: { chance: 0.5, affinity: { random: 30 } },
                    fail: { chance: 0.5, affinity: { random: -30 }, message: 'You chose poorly.' }
                }
            },
            {
                id: 'ignore',
                text: 'Stay out of it',
                icon: '&#128566;',
                hint: 'Not your problem',
                outcomes: {
                    success: { chance: 0.6, message: 'It blows over.' },
                    fail: { chance: 0.4, reputation: -30, message: 'People think you lack leadership.' }
                }
            }
        ],
        timeLimit: 60
    },

    // ========== NEUTRAL EVENTS ==========
    crossroads: {
        id: 'crossroads',
        type: 'neutral',
        name: 'Crossroads',
        description: 'Two projects want you at the same time. Choose wisely.',
        rarity: 0.08,
        minLevel: 8,
        choices: [
            {
                id: 'defi',
                text: 'Join the DeFi project',
                icon: '&#127974;',
                hint: 'Technical focus, steady growth',
                outcomes: {
                    success: { chance: 1.0, xp: 200, tokens: 300, path: 'defi' }
                }
            },
            {
                id: 'gaming',
                text: 'Join the Gaming guild',
                icon: '&#127918;',
                hint: 'Community focus, high energy',
                outcomes: {
                    success: { chance: 1.0, xp: 200, reputation: 100, path: 'gaming' }
                }
            },
            {
                id: 'both',
                text: 'Try to juggle both',
                icon: '&#129337;',
                hint: 'Risky but double rewards',
                outcomes: {
                    success: { chance: 0.35, xp: 400, tokens: 300, reputation: 100 },
                    fail: { chance: 0.65, reputation: -100, message: 'You burned out and disappointed everyone.' }
                }
            }
        ],
        timeLimit: 60
    },

    mentor_offer: {
        id: 'mentor_offer',
        type: 'neutral',
        name: 'Mentorship Offer',
        description: 'A respected builder offers to mentor you, but it requires commitment.',
        rarity: 0.07,
        minReputation: 300,
        choices: [
            {
                id: 'accept',
                text: 'Accept mentorship',
                icon: '&#127891;',
                hint: 'Long-term investment',
                outcomes: {
                    success: { chance: 0.9, xp: 500, statBoost: { str: 2, cha: 2 }, affinity: { dmitri: 25 } },
                    fail: { chance: 0.1, message: 'Schedule conflicts. Maybe next time.' }
                }
            },
            {
                id: 'decline',
                text: 'Politely decline',
                icon: '&#128075;',
                hint: 'Stay independent',
                outcomes: {
                    success: { chance: 1.0, message: 'You forge your own path.' }
                }
            },
            {
                id: 'negotiate',
                text: 'Negotiate terms',
                icon: '&#129309;',
                hint: 'Try for better deal',
                statBonus: { cha: 5 },
                outcomes: {
                    success: { chance: 0.5, xp: 600, statBoost: { str: 3, cha: 3 } },
                    fail: { chance: 0.5, reputation: -20, message: 'They withdrew the offer.' }
                }
            }
        ],
        timeLimit: 90
    },

    // ========== SPECIAL EVENTS ==========
    oracle_riddle: {
        id: 'oracle_riddle',
        type: 'special',
        name: "The Oracle's Test",
        description: 'The mysterious Oracle appears with a cryptic challenge.',
        rarity: 0.03,
        minLevel: 10,
        choices: [
            {
                id: 'solve',
                text: 'Attempt the riddle',
                icon: '&#129504;',
                hint: 'Test your wisdom',
                statRequired: { str: 12 },
                outcomes: {
                    success: { chance: 0.5, xp: 1000, tokens: 500, special: 'oracle_blessing', affinity: { oracle: 50 } },
                    fail: { chance: 0.5, xp: 100, message: 'The Oracle smiles mysteriously and vanishes.' }
                }
            },
            {
                id: 'decline',
                text: 'Bow and step back',
                icon: '&#128591;',
                hint: 'Show respect',
                outcomes: {
                    success: { chance: 1.0, affinity: { oracle: 10 }, message: 'The Oracle nods approvingly.' }
                }
            }
        ],
        timeLimit: 120
    },

    airdrop_rush: {
        id: 'airdrop_rush',
        type: 'special',
        name: 'Airdrop Alert!',
        description: 'A massive airdrop just went live! You have seconds to act!',
        rarity: 0.05,
        choices: [
            {
                id: 'fast',
                text: 'CLAIM NOW!',
                icon: '&#9889;',
                hint: 'Speed is everything',
                outcomes: {
                    success: { chance: 0.4, tokens: 1000, xp: 200 },
                    fail: { chance: 0.6, message: 'Too slow. Bots got there first.' }
                }
            },
            {
                id: 'verify',
                text: 'Check if legit first',
                icon: '&#128270;',
                hint: 'Could be a scam',
                statBonus: { str: 10 },
                outcomes: {
                    success: { chance: 0.7, tokens: 500, xp: 150 },
                    fail: { chance: 0.3, message: 'It was legit but you missed it while checking.' }
                }
            },
            {
                id: 'skip',
                text: 'Skip it',
                icon: '&#128556;',
                hint: 'Not worth the risk',
                outcomes: {
                    success: { chance: 1.0, message: 'Probably a scam anyway... right?' }
                }
            }
        ],
        timeLimit: 5
    }
};

// ============================================
// EVENT STATE
// ============================================

let eventState = {
    activeEvent: null,
    eventHistory: [],
    cooldowns: {},
    lastEventTime: 0
};

// ============================================
// EVENT FUNCTIONS
// ============================================

function initEventSystem() {
    const state = window.PumpArenaState.get();
    if (state.events) {
        eventState = { ...eventState, ...state.events };
    }
    return eventState;
}

function checkForRandomEvent() {
    const state = window.PumpArenaState.get();
    const now = Date.now();

    // Cooldown between events (minimum 2 minutes)
    if (now - eventState.lastEventTime < 120000) {
        return null;
    }

    // Base chance modified by luck stat
    const luckBonus = (state.stats.lck || 5) * 0.01;
    const baseChance = 0.15 + luckBonus;

    if (Math.random() > baseChance) {
        return null;
    }

    // Get eligible events
    const eligibleEvents = Object.values(RANDOM_EVENTS).filter(event => {
        // Check minimum requirements
        if (event.minLevel && state.progression.level < event.minLevel) return false;
        if (event.minReputation && state.resources.reputation < event.minReputation) return false;

        // Check cooldown
        if (eventState.cooldowns[event.id] && now < eventState.cooldowns[event.id]) return false;

        return true;
    });

    if (eligibleEvents.length === 0) return null;

    // Weight by rarity and archetype bonus
    const weights = eligibleEvents.map(event => {
        let weight = event.rarity;

        // Apply archetype bonus
        if (event.archetypeBonus && event.archetypeBonus[state.character.archetype]) {
            weight += event.archetypeBonus[state.character.archetype];
        }

        return weight;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < eligibleEvents.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return eligibleEvents[i];
        }
    }

    return eligibleEvents[0];
}

function triggerEvent(eventId) {
    const event = RANDOM_EVENTS[eventId];
    if (!event) return { success: false, message: 'Event not found' };

    eventState.activeEvent = {
        ...event,
        startedAt: Date.now(),
        expiresAt: event.timeLimit ? Date.now() + (event.timeLimit * 1000) : null
    };

    eventState.lastEventTime = Date.now();
    saveEventState();

    document.dispatchEvent(new CustomEvent('pumparena:event-triggered', {
        detail: { event: eventState.activeEvent }
    }));

    return { success: true, event: eventState.activeEvent };
}

function handleEventChoice(choiceId) {
    if (!eventState.activeEvent) return { success: false, message: 'No active event' };

    const event = eventState.activeEvent;
    const choice = event.choices.find(c => c.id === choiceId);

    if (!choice) return { success: false, message: 'Invalid choice' };

    const state = window.PumpArenaState.get();

    // Check stat requirements
    if (choice.statRequired) {
        for (const [stat, min] of Object.entries(choice.statRequired)) {
            if ((state.stats[stat] || 0) < min) {
                return { success: false, message: `Requires ${stat.toUpperCase()} ${min}` };
            }
        }
    }

    // Calculate success with stat bonuses
    let successChance = choice.outcomes.success?.chance || 0;

    if (choice.statBonus) {
        for (const [stat, bonus] of Object.entries(choice.statBonus)) {
            const statValue = state.stats[stat] || 5;
            successChance += (statValue / 100) * bonus;
        }
    }

    // Luck affects all outcomes slightly
    successChance += (state.stats.lck || 5) * 0.005;
    successChance = Math.min(successChance, 0.95); // Cap at 95%

    const isSuccess = Math.random() < successChance;
    const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.fail;

    // Apply rewards/penalties
    const result = applyEventOutcome(outcome);

    // Record in history
    eventState.eventHistory.unshift({
        eventId: event.id,
        choiceId,
        success: isSuccess,
        timestamp: Date.now()
    });

    // Keep last 50 events
    if (eventState.eventHistory.length > 50) {
        eventState.eventHistory.pop();
    }

    // Set cooldown for this event (1 hour)
    eventState.cooldowns[event.id] = Date.now() + 3600000;

    // Clear active event
    eventState.activeEvent = null;
    saveEventState();

    document.dispatchEvent(new CustomEvent('pumparena:event-resolved', {
        detail: { event, choice, success: isSuccess, result }
    }));

    return {
        success: true,
        isSuccess,
        outcome,
        result,
        message: outcome.message || (isSuccess ? 'Success!' : 'Failed...')
    };
}

function applyEventOutcome(outcome) {
    if (!outcome) return {};

    const result = {};

    if (outcome.xp) {
        window.PumpArenaState.addXP(outcome.xp);
        result.xp = outcome.xp;
    }

    if (outcome.tokens) {
        window.PumpArenaState.addTokens(outcome.tokens);
        result.tokens = outcome.tokens;
    }

    if (outcome.reputation) {
        window.PumpArenaState.addReputation(outcome.reputation);
        result.reputation = outcome.reputation;
    }

    if (outcome.influence) {
        const state = window.PumpArenaState.get();
        state.resources.influence = Math.min(
            state.resources.influence + outcome.influence,
            window.PumpArenaState.getMaxInfluence()
        );
        window.PumpArenaState.save();
        result.influence = outcome.influence;
    }

    if (outcome.affinity && window.PumpArenaNPCs) {
        for (const [npcId, change] of Object.entries(outcome.affinity)) {
            if (npcId === 'random') {
                // Pick a random NPC
                const npcs = Object.keys(window.PumpArenaNPCs.NPCS);
                const randomNpc = npcs[Math.floor(Math.random() * npcs.length)];
                window.PumpArenaNPCs.changeAffinity(randomNpc, change);
            } else {
                window.PumpArenaNPCs.changeAffinity(npcId, change);
            }
        }
        result.affinity = outcome.affinity;
    }

    if (outcome.statBoost) {
        const state = window.PumpArenaState.get();
        for (const [stat, boost] of Object.entries(outcome.statBoost)) {
            state.stats[stat] = (state.stats[stat] || 5) + boost;
        }
        window.PumpArenaState.save();
        result.statBoost = outcome.statBoost;
    }

    if (outcome.special) {
        // Handle special rewards (achievements, unlocks, etc.)
        result.special = outcome.special;
    }

    return result;
}

function getTimeRemaining() {
    if (!eventState.activeEvent || !eventState.activeEvent.expiresAt) {
        return null;
    }
    return Math.max(0, eventState.activeEvent.expiresAt - Date.now());
}

function saveEventState() {
    const state = window.PumpArenaState.get();
    state.events = {
        eventHistory: eventState.eventHistory,
        cooldowns: eventState.cooldowns,
        lastEventTime: eventState.lastEventTime
    };
    window.PumpArenaState.save();
}

// ============================================
// EVENT UI RENDERING
// ============================================

function renderEventPopup(container) {
    const event = eventState.activeEvent;
    if (!event) return;

    const eventType = EVENT_TYPES[event.type];
    const timeRemaining = getTimeRemaining();
    const state = window.PumpArenaState.get();

    const popup = document.createElement('div');
    popup.className = 'event-popup-overlay';
    popup.innerHTML = `
        <div class="event-popup" style="--event-color: ${eventType.color}">
            <div class="event-header">
                <span class="event-type-icon">${eventType.icon}</span>
                <span class="event-type-label">${eventType.name}</span>
                ${timeRemaining !== null ? `
                    <div class="event-timer" id="event-timer">
                        <span class="timer-icon">&#9201;</span>
                        <span class="timer-value">${Math.ceil(timeRemaining / 1000)}s</span>
                    </div>
                ` : ''}
            </div>

            <h3 class="event-title">${event.name}</h3>
            <p class="event-description">${event.description}</p>

            <div class="event-choices">
                ${event.choices.map(choice => {
                    const canChoose = !choice.statRequired || Object.entries(choice.statRequired).every(
                        ([stat, min]) => (state.stats[stat] || 0) >= min
                    );
                    return `
                        <button class="event-choice ${!canChoose ? 'locked' : ''}"
                                data-choice="${choice.id}"
                                ${!canChoose ? 'disabled' : ''}>
                            <span class="choice-icon">${choice.icon}</span>
                            <div class="choice-content">
                                <span class="choice-text">${choice.text}</span>
                                <span class="choice-hint">${choice.hint}</span>
                                ${choice.statRequired ? `
                                    <span class="choice-req ${canChoose ? 'met' : 'unmet'}">
                                        Requires: ${Object.entries(choice.statRequired).map(([s, v]) => `${s.toUpperCase()} ${v}`).join(', ')}
                                    </span>
                                ` : ''}
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.appendChild(popup);

    // Timer countdown
    if (timeRemaining !== null) {
        const timerInterval = setInterval(() => {
            const remaining = getTimeRemaining();
            const timerEl = popup.querySelector('#event-timer .timer-value');

            if (remaining <= 0 || !eventState.activeEvent) {
                clearInterval(timerInterval);
                if (eventState.activeEvent) {
                    // Time expired - auto-select last (safest) option
                    const lastChoice = event.choices[event.choices.length - 1];
                    handleEventChoice(lastChoice.id);
                    popup.remove();
                    showEventResult(container, lastChoice.id, true);
                }
                return;
            }

            if (timerEl) {
                timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;

                // Urgency animation
                if (remaining < 10000) {
                    timerEl.classList.add('urgent');
                }
            }
        }, 1000);
    }

    // Choice handlers
    popup.querySelectorAll('.event-choice:not(.locked)').forEach(btn => {
        btn.addEventListener('click', () => {
            const choiceId = btn.dataset.choice;
            const result = handleEventChoice(choiceId);
            popup.remove();
            showEventResult(container, choiceId, result);
        });
    });
}

function showEventResult(container, choiceId, result) {
    const resultPopup = document.createElement('div');
    resultPopup.className = 'event-result-overlay';

    const isPositive = result.isSuccess || (result.outcome && (
        (result.outcome.xp && result.outcome.xp > 0) ||
        (result.outcome.tokens && result.outcome.tokens > 0) ||
        (result.outcome.reputation && result.outcome.reputation > 0)
    ));

    resultPopup.innerHTML = `
        <div class="event-result ${isPositive ? 'success' : 'failure'}">
            <div class="result-icon">${isPositive ? '&#10003;' : '&#10007;'}</div>
            <h3 class="result-title">${isPositive ? 'Success!' : 'Failed...'}</h3>
            <p class="result-message">${result.message || ''}</p>

            ${result.result ? `
                <div class="result-rewards">
                    ${result.result.xp ? `<div class="reward-item ${result.result.xp > 0 ? 'positive' : 'negative'}">&#10024; ${result.result.xp > 0 ? '+' : ''}${result.result.xp} XP</div>` : ''}
                    ${result.result.tokens ? `<div class="reward-item ${result.result.tokens > 0 ? 'positive' : 'negative'}">&#128176; ${result.result.tokens > 0 ? '+' : ''}${result.result.tokens} Tokens</div>` : ''}
                    ${result.result.reputation ? `<div class="reward-item ${result.result.reputation > 0 ? 'positive' : 'negative'}">&#11088; ${result.result.reputation > 0 ? '+' : ''}${result.result.reputation} Rep</div>` : ''}
                    ${result.result.influence ? `<div class="reward-item positive">&#9889; +${result.result.influence} Influence</div>` : ''}
                </div>
            ` : ''}

            <button class="btn-primary btn-event-close">Continue</button>
        </div>
    `;

    container.appendChild(resultPopup);

    resultPopup.querySelector('.btn-event-close').addEventListener('click', () => {
        resultPopup.remove();
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (resultPopup.parentNode) {
            resultPopup.remove();
        }
    }, 5000);
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaEvents = {
        RANDOM_EVENTS,
        EVENT_TYPES,
        init: initEventSystem,
        checkForRandomEvent,
        triggerEvent,
        handleChoice: handleEventChoice,
        getActiveEvent: () => eventState.activeEvent,
        getTimeRemaining,
        renderEventPopup,
        showEventResult
    };
}
