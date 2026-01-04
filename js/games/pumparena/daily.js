/**
 * Pump Arena RPG - Daily System
 * Daily login bonuses, streaks, and challenges
 *
 * PHILOSOPHY: ASDF Integration
 * - All reward values derived from Fibonacci sequence
 * - Streak bonuses scale with fib[streak]
 * - Challenge rewards use Fibonacci multipliers
 */

'use strict';

// ============================================
// ASDF FIBONACCI HELPER
// ============================================

const DAILY_FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

function getDailyFib(n) {
    if (typeof window.PumpArenaState !== 'undefined' && window.PumpArenaState.getFib) {
        return window.PumpArenaState.getFib(n);
    }
    if (n < 0) return 0;
    if (n < DAILY_FIB.length) return DAILY_FIB[n];
    return DAILY_FIB[DAILY_FIB.length - 1];
}

// ============================================
// DAILY LOGIN REWARDS (ASDF Philosophy)
// All amounts are Fibonacci-based: fib[day + offset] * multiplier
// ============================================

const DAILY_REWARDS = [
    // Week 1: fib[day + 4] for tokens, fib[day + 2] for others
    { day: 1, type: 'tokens', amount: getDailyFib(5) * 10, label: `${getDailyFib(5) * 10} Tokens` },           // 50
    { day: 2, type: 'influence', amount: getDailyFib(6), label: `+${getDailyFib(6)} Influence` },               // 8
    { day: 3, type: 'tokens', amount: getDailyFib(7) * 10, label: `${getDailyFib(7) * 10} Tokens` },           // 130
    { day: 4, type: 'xp', amount: getDailyFib(8) * 10, label: `+${getDailyFib(8) * 10} XP` },                   // 210
    { day: 5, type: 'tokens', amount: getDailyFib(8) * 10, label: `${getDailyFib(8) * 10} Tokens` },           // 210
    { day: 6, type: 'reputation', amount: getDailyFib(7), label: `+${getDailyFib(7)} Reputation` },             // 13
    { day: 7, type: 'tokens', amount: getDailyFib(12) * 3, label: `${getDailyFib(12) * 3} Tokens`, special: true }, // 432

    // Week 2: Higher Fibonacci indices
    { day: 8, type: 'tokens', amount: getDailyFib(6) * 10, label: `${getDailyFib(6) * 10} Tokens` },           // 80
    { day: 9, type: 'influence', amount: getDailyFib(8), label: `+${getDailyFib(8)} Influence` },               // 21
    { day: 10, type: 'tokens', amount: getDailyFib(9) * 10, label: `${getDailyFib(9) * 10} Tokens` },          // 340
    { day: 11, type: 'xp', amount: getDailyFib(10) * 10, label: `+${getDailyFib(10) * 10} XP` },                // 550
    { day: 12, type: 'tokens', amount: getDailyFib(9) * 10, label: `${getDailyFib(9) * 10} Tokens` },          // 340
    { day: 13, type: 'reputation', amount: getDailyFib(9), label: `+${getDailyFib(9)} Reputation` },            // 34
    { day: 14, type: 'tokens', amount: getDailyFib(14) * 3, label: `${getDailyFib(14) * 3} Tokens`, special: true }, // 1131 (fib[14]=377)

    // Beyond day 14: cycle with Fibonacci bonus
    { day: 15, type: 'tokens', amount: getDailyFib(7) * 10, label: `${getDailyFib(7) * 10} Tokens` },          // 130
];

// ============================================
// DAILY CHALLENGES (ASDF Philosophy)
// Rewards use Fibonacci multipliers based on difficulty
// Easy: fib[5-6], Medium: fib[7-8], Hard: fib[9-10]
// ============================================

const CHALLENGE_POOL = {
    easy: [
        { id: 'login', name: 'Show Up', description: 'Log in today', reward: { tokens: getDailyFib(5) * 5, xp: getDailyFib(6) * 5 }, auto: true },  // 25 tokens, 40 xp
        { id: 'first_choice', name: 'Decision Maker', description: 'Make a choice in any scenario', reward: { tokens: getDailyFib(6) * 5, xp: getDailyFib(7) * 5 } },  // 40 tokens, 65 xp
        { id: 'check_stats', name: 'Self Aware', description: 'View your character sheet', reward: { tokens: getDailyFib(5) * 5, xp: getDailyFib(5) * 5 } },  // 25 tokens, 25 xp
        { id: 'burn_tokens', name: 'Fuel the Fire', description: 'Burn tokens for XP or reputation', reward: { tokens: getDailyFib(6) * 5, xp: getDailyFib(7) * 5 } },  // 40 tokens, 65 xp
    ],
    medium: [
        { id: 'complete_scenario', name: 'Story Time', description: 'Complete a full scenario', reward: { tokens: getDailyFib(8) * 5, xp: getDailyFib(9) * 5 } },  // 105 tokens, 170 xp
        { id: 'earn_rep', name: 'Rising Star', description: `Earn ${getDailyFib(9)}+ reputation today`, reward: { tokens: getDailyFib(8) * 5, xp: getDailyFib(9) * 5 } },  // 105 tokens, 170 xp
        { id: 'meet_npc', name: 'Networking', description: 'Meet a new NPC', reward: { tokens: getDailyFib(7) * 5, xp: getDailyFib(8) * 5 } },  // 65 tokens, 105 xp
        { id: 'tier_progress', name: 'Climbing Higher', description: 'Gain a level toward next tier', reward: { tokens: getDailyFib(8) * 5, xp: getDailyFib(9) * 5 } },  // 105 tokens, 170 xp
    ],
    hard: [
        { id: 'perfect_choice', name: 'Perfect Play', description: `Make ${getDailyFib(5)} optimal choices in a row`, reward: { tokens: getDailyFib(10) * 5, xp: getDailyFib(11) * 5, reputation: getDailyFib(7) } },  // 275 tokens, 445 xp, 13 rep
        { id: 'full_campaign', name: 'Marathon Runner', description: 'Complete an entire campaign chapter', reward: { tokens: getDailyFib(11) * 5, xp: getDailyFib(12) * 5 } },  // 445 tokens, 720 xp
        { id: 'max_rep_day', name: 'Viral Moment', description: `Earn ${getDailyFib(11)}+ reputation in one day`, reward: { tokens: getDailyFib(10) * 5, xp: getDailyFib(11) * 5, influence: getDailyFib(8) } },  // 275 tokens, 445 xp, 21 influence
        { id: 'big_burn', name: 'Inferno', description: `Burn ${getDailyFib(10)}+ tokens in one day`, reward: { tokens: getDailyFib(10) * 3, xp: getDailyFib(12) * 5, reputation: getDailyFib(8) } },  // 165 tokens, 720 xp, 21 rep
    ]
};

// ============================================
// DAILY SYSTEM STATE
// ============================================

let dailyState = {
    lastLogin: null,
    streak: 0,
    todayClaimed: false,
    challenges: [],
    challengesCompleted: []
};

// ============================================
// DAILY FUNCTIONS
// ============================================

function initDailySystem() {
    const state = window.PumpArenaState.get();

    if (state.daily) {
        dailyState = { ...dailyState, ...state.daily };
    }

    checkDailyReset();
    return dailyState;
}

function checkDailyReset() {
    const now = new Date();
    const today = now.toDateString();

    if (dailyState.lastLogin !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if streak continues
        if (dailyState.lastLogin === yesterday.toDateString()) {
            dailyState.streak++;
        } else if (dailyState.lastLogin !== null) {
            // Streak broken
            dailyState.streak = 1;
        } else {
            dailyState.streak = 1;
        }

        dailyState.lastLogin = today;
        dailyState.todayClaimed = false;
        dailyState.challenges = generateDailyChallenges();
        dailyState.challengesCompleted = [];

        saveDailyState();
        return true;
    }

    return false;
}

function generateDailyChallenges() {
    const challenges = [];

    // Always include 1 easy challenge
    const easyPool = [...CHALLENGE_POOL.easy];
    const easyIndex = Math.floor(Math.random() * easyPool.length);
    challenges.push({ ...easyPool[easyIndex], difficulty: 'easy' });

    // Include 1-2 medium challenges
    const mediumPool = [...CHALLENGE_POOL.medium];
    const mediumCount = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < mediumCount && mediumPool.length > 0; i++) {
        const index = Math.floor(Math.random() * mediumPool.length);
        challenges.push({ ...mediumPool.splice(index, 1)[0], difficulty: 'medium' });
    }

    // 30% chance of hard challenge
    if (Math.random() < 0.3) {
        const hardPool = [...CHALLENGE_POOL.hard];
        const hardIndex = Math.floor(Math.random() * hardPool.length);
        challenges.push({ ...hardPool[hardIndex], difficulty: 'hard' });
    }

    return challenges;
}

function claimDailyReward() {
    if (dailyState.todayClaimed) {
        return { success: false, message: 'Already claimed today!' };
    }

    const dayIndex = ((dailyState.streak - 1) % DAILY_REWARDS.length);
    const reward = DAILY_REWARDS[dayIndex];

    // Apply reward
    const state = window.PumpArenaState.get();

    switch (reward.type) {
        case 'tokens':
            window.PumpArenaState.addTokens(reward.amount);
            break;
        case 'xp':
            window.PumpArenaState.addXP(reward.amount);
            break;
        case 'influence':
            state.resources.influence = Math.min(
                state.resources.influence + reward.amount,
                state.resources.maxInfluence
            );
            window.PumpArenaState.save();
            break;
        case 'reputation':
            window.PumpArenaState.addReputation(reward.amount);
            break;
    }

    dailyState.todayClaimed = true;
    saveDailyState();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('pumparena:daily-claimed', {
        detail: { reward, streak: dailyState.streak }
    }));

    return {
        success: true,
        reward,
        streak: dailyState.streak,
        message: `Day ${dailyState.streak} reward claimed: ${reward.label}!`
    };
}

function completeChallenge(challengeId) {
    if (dailyState.challengesCompleted.includes(challengeId)) {
        return { success: false, message: 'Challenge already completed!' };
    }

    const challenge = dailyState.challenges.find(c => c.id === challengeId);
    if (!challenge) {
        return { success: false, message: 'Challenge not found!' };
    }

    // Apply rewards
    if (challenge.reward.tokens) {
        window.PumpArenaState.addTokens(challenge.reward.tokens);
    }
    if (challenge.reward.xp) {
        window.PumpArenaState.addXP(challenge.reward.xp);
    }
    if (challenge.reward.reputation) {
        window.PumpArenaState.addReputation(challenge.reward.reputation);
    }
    if (challenge.reward.influence) {
        const state = window.PumpArenaState.get();
        state.resources.influence = Math.min(
            state.resources.influence + challenge.reward.influence,
            state.resources.maxInfluence
        );
        window.PumpArenaState.save();
    }

    dailyState.challengesCompleted.push(challengeId);
    saveDailyState();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('pumparena:challenge-completed', {
        detail: { challenge }
    }));

    return {
        success: true,
        challenge,
        message: `Challenge "${challenge.name}" completed!`
    };
}

function saveDailyState() {
    const state = window.PumpArenaState.get();
    state.daily = dailyState;
    window.PumpArenaState.save();
}

function getDailyState() {
    return { ...dailyState };
}

function getTodayReward() {
    const dayIndex = ((dailyState.streak) % DAILY_REWARDS.length);
    return DAILY_REWARDS[dayIndex];
}

function getNextRewards(count = 7) {
    const rewards = [];
    for (let i = 0; i < count; i++) {
        const dayIndex = ((dailyState.streak + i) % DAILY_REWARDS.length);
        rewards.push({
            ...DAILY_REWARDS[dayIndex],
            day: dailyState.streak + i + 1,
            isToday: i === 0
        });
    }
    return rewards;
}

// ============================================
// DAILY UI RENDERING
// ============================================

function renderDailyPanel(container) {
    const todayReward = getTodayReward();
    const upcomingRewards = getNextRewards(7);

    container.innerHTML = `
        <div class="daily-panel">
            <div class="daily-header">
                <h3>Daily Rewards</h3>
                <div class="streak-display">
                    <span class="streak-icon">&#128293;</span>
                    <span class="streak-count">${dailyState.streak}</span>
                    <span class="streak-label">day streak</span>
                </div>
            </div>

            <div class="daily-reward-main ${dailyState.todayClaimed ? 'claimed' : ''}">
                <div class="reward-day">Day ${dailyState.streak || 1}</div>
                <div class="reward-icon">${getRewardIcon(todayReward.type)}</div>
                <div class="reward-label">${todayReward.label}</div>
                ${todayReward.special ? '<div class="reward-special">SPECIAL!</div>' : ''}
                <button class="btn-claim ${dailyState.todayClaimed ? 'claimed' : ''}" id="claim-daily-btn">
                    ${dailyState.todayClaimed ? '✓ Claimed' : 'Claim Reward'}
                </button>
            </div>

            <div class="daily-calendar">
                <h4>Upcoming Rewards</h4>
                <div class="reward-timeline">
                    ${upcomingRewards.slice(1, 7).map((r, i) => `
                        <div class="reward-future ${r.special ? 'special' : ''}">
                            <div class="reward-day-small">Day ${r.day}</div>
                            <div class="reward-icon-small">${getRewardIcon(r.type)}</div>
                            <div class="reward-label-small">${r.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="daily-challenges">
                <h4>Daily Challenges</h4>
                <div class="challenges-list">
                    ${dailyState.challenges.map(c => `
                        <div class="challenge-item ${dailyState.challengesCompleted.includes(c.id) ? 'completed' : ''}"
                             data-difficulty="${c.difficulty}">
                            <div class="challenge-status">
                                ${dailyState.challengesCompleted.includes(c.id) ? '&#10003;' : '&#9675;'}
                            </div>
                            <div class="challenge-info">
                                <div class="challenge-name">${c.name}</div>
                                <div class="challenge-desc">${c.description}</div>
                            </div>
                            <div class="challenge-reward">
                                ${c.reward.tokens ? `<span>&#128176; ${c.reward.tokens}</span>` : ''}
                                ${c.reward.xp ? `<span>&#10024; ${c.reward.xp}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Event listener for claim button
    const claimBtn = container.querySelector('#claim-daily-btn');
    if (claimBtn && !dailyState.todayClaimed) {
        claimBtn.addEventListener('click', () => {
            const result = claimDailyReward();
            if (result.success) {
                renderDailyPanel(container);
                // Show notification
                window.PumpArenaRPG?.showNotification?.(result.message, 'success');
            }
        });
    }
}

function getRewardIcon(type) {
    switch (type) {
        case 'tokens': return '&#128176;';
        case 'xp': return '&#10024;';
        case 'influence': return '&#9889;';
        case 'reputation': return '&#11088;';
        default: return '&#127873;';
    }
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaDaily = {
        init: initDailySystem,
        checkReset: checkDailyReset,
        claimReward: claimDailyReward,
        completeChallenge,
        getState: getDailyState,
        getTodayReward,
        getNextRewards,
        render: renderDailyPanel,
        DAILY_REWARDS,
        CHALLENGE_POOL
    };
}
