/**
 * Pump Arena RPG - Character Creation System
 * Full character creation wizard with archetypes, backgrounds, and stats
 */

'use strict';

// ============================================
// ARCHETYPES DEFINITION
// ============================================

const ARCHETYPES = {
    developer: {
        id: 'developer',
        name: 'Developer',
        icon: '&#x1F4BB;',
        tagline: 'Code is law. You build the future, one commit at a time.',
        description: 'Masters of smart contracts and blockchain architecture. Developers solve problems with elegant code and understand the technical foundations that make crypto possible.',
        baseStats: { dev: 15, com: 5, mkt: 3, str: 7, cha: 5, lck: 5 },
        bonus: '+20% XP from technical tasks',
        bonusType: 'xp_technical',
        bonusValue: 0.2,
        startingSkill: 'code_review',
        color: '#00d4ff'
    },
    community: {
        id: 'community',
        name: 'Community Builder',
        icon: '&#x1F3A4;',
        tagline: 'The people are the project. You unite and inspire.',
        description: 'Natural leaders who bring people together. Community Builders create engaged, loyal groups and know how to turn strangers into die-hard supporters.',
        baseStats: { dev: 3, com: 15, mkt: 7, str: 5, cha: 10, lck: 0 },
        bonus: '+15% relationship gains',
        bonusType: 'relationship',
        bonusValue: 0.15,
        startingSkill: 'rally_troops',
        color: '#ff6b35'
    },
    designer: {
        id: 'designer',
        name: 'Designer',
        icon: '&#x1F3A8;',
        tagline: 'Beauty meets function. You craft experiences.',
        description: 'Visual storytellers who make complex things simple and ugly things beautiful. Designers shape how users feel about a project before they understand it.',
        baseStats: { dev: 7, com: 5, mkt: 10, str: 8, cha: 5, lck: 5 },
        bonus: '+10% to all creative tasks',
        bonusType: 'creative',
        bonusValue: 0.1,
        startingSkill: 'brand_vision',
        color: '#a855f7'
    },
    marketer: {
        id: 'marketer',
        name: 'Marketer',
        icon: '&#x1F4E2;',
        tagline: 'Attention is currency. You capture it.',
        description: 'Masters of narrative and viral growth. Marketers know how to cut through the noise, create FOMO, and turn a project into a movement.',
        baseStats: { dev: 2, com: 8, mkt: 15, str: 5, cha: 8, lck: 2 },
        bonus: '+25% influence gains',
        bonusType: 'influence',
        bonusValue: 0.25,
        startingSkill: 'viral_thread',
        color: '#22c55e'
    },
    strategist: {
        id: 'strategist',
        name: 'Strategist',
        icon: '&#x1F9E0;',
        tagline: 'Chess, not checkers. You see five moves ahead.',
        description: 'Big-picture thinkers who plan for every scenario. Strategists excel at tokenomics, partnerships, and turning chaos into opportunity.',
        baseStats: { dev: 5, com: 5, mkt: 5, str: 15, cha: 5, lck: 5 },
        bonus: 'Better event predictions',
        bonusType: 'prediction',
        bonusValue: 0.3,
        startingSkill: 'calculated_risk',
        color: '#eab308'
    },
    creator: {
        id: 'creator',
        name: 'Content Creator',
        icon: '&#x1F3AC;',
        tagline: 'Stories spread. You make them unforgettable.',
        description: 'Masters of narrative and engagement. Content Creators craft viral threads, produce compelling videos, and turn complex ideas into shareable moments that captivate audiences.',
        baseStats: { dev: 2, com: 10, mkt: 12, str: 3, cha: 12, lck: 6 },
        bonus: '+30% viral chance on content',
        bonusType: 'viral',
        bonusValue: 0.3,
        startingSkill: 'viral_hook',
        color: '#ec4899'
    }
};

// ============================================
// BACKGROUNDS DEFINITION
// ============================================

const BACKGROUNDS = {
    degen: {
        id: 'degen',
        name: 'The Degen',
        icon: '&#x1F3B0;',
        description: 'Ex-trader seeking meaning. You\'ve made and lost fortunes, and now you want to build something that lasts.',
        bonus: '+10 initial reputation',
        effect: { reputation: 10 }
    },
    newbie: {
        id: 'newbie',
        name: 'The Newbie',
        icon: '&#x1F331;',
        description: 'Fresh to crypto, eager to learn. Your enthusiasm is infectious and you see opportunities others overlook.',
        bonus: '+1 to all base stats',
        effect: { allStats: 1 }
    },
    veteran: {
        id: 'veteran',
        name: 'The Veteran',
        icon: '&#x1F3C6;',
        description: 'Old hand with many contacts. You\'ve seen cycles come and go, and your reputation precedes you.',
        bonus: 'Start with 2 NPC relationships',
        effect: { relationships: 2 }
    },
    influencer: {
        id: 'influencer',
        name: 'The Influencer',
        icon: '&#x1F4F1;',
        description: 'You already have an audience. Your followers trust your takes, now you want to build with a team.',
        bonus: '+50 initial influence',
        effect: { influence: 50 }
    },
    builder: {
        id: 'builder',
        name: 'The Failed Founder',
        icon: '&#x1F6A7;',
        description: 'Your last project didn\'t make it. But failure taught you more than success ever could.',
        bonus: '+20% XP gain',
        effect: { xpBonus: 0.2 }
    }
};

// ============================================
// MOTIVATIONS DEFINITION
// ============================================

const MOTIVATIONS = {
    legacy: {
        id: 'legacy',
        name: 'Build Legacy',
        icon: '&#x1F3DB;',
        description: 'You want to create something that outlasts you. Long-term projects and sustainable growth are your focus.',
        questBonus: 'long_term'
    },
    alpha: {
        id: 'alpha',
        name: 'Chase Alpha',
        icon: '&#x26A1;',
        description: 'You\'re here for the opportunities. High-risk, high-reward situations are where you thrive.',
        questBonus: 'high_risk'
    },
    community_focus: {
        id: 'community_focus',
        name: 'Find Community',
        icon: '&#x1F91D;',
        description: 'You\'re looking for your tribe. Building relationships and finding like-minded builders is your priority.',
        questBonus: 'social'
    },
    fame: {
        id: 'fame',
        name: 'Grow Fame',
        icon: '&#x2B50;',
        description: 'You want to be known. Building a personal brand and becoming a respected voice in the space drives you.',
        questBonus: 'visibility'
    },
    wealth: {
        id: 'wealth',
        name: 'Stack Bags',
        icon: '&#x1F4B0;',
        description: 'Let\'s be honest - you\'re here to make money. Profitable opportunities and token rewards catch your eye.',
        questBonus: 'financial'
    }
};

// ============================================
// PORTRAITS DEFINITION
// ============================================

const PORTRAITS = [
    { id: 0, name: 'The Optimist', style: 'bright', gender: 'neutral' },
    { id: 1, name: 'The Analyst', style: 'serious', gender: 'neutral' },
    { id: 2, name: 'The Rebel', style: 'edgy', gender: 'neutral' },
    { id: 3, name: 'The Visionary', style: 'mystical', gender: 'neutral' },
    { id: 4, name: 'The Hacker', style: 'tech', gender: 'neutral' },
    { id: 5, name: 'The Artist', style: 'creative', gender: 'neutral' },
    { id: 6, name: 'The Leader', style: 'confident', gender: 'neutral' },
    { id: 7, name: 'The Thinker', style: 'contemplative', gender: 'neutral' },
    { id: 8, name: 'The Hustler', style: 'energetic', gender: 'neutral' },
    { id: 9, name: 'The Sage', style: 'wise', gender: 'neutral' },
    { id: 10, name: 'The Wildcard', style: 'chaotic', gender: 'neutral' },
    { id: 11, name: 'The Ghost', style: 'mysterious', gender: 'neutral' },
    { id: 12, name: 'The Streamer', style: 'vibrant', gender: 'neutral' },
    { id: 13, name: 'The Trader', style: 'sharp', gender: 'neutral' },
    { id: 14, name: 'The Whale', style: 'powerful', gender: 'neutral' },
    { id: 15, name: 'The Anon', style: 'hidden', gender: 'neutral' },
    { id: 16, name: 'The Degen', style: 'wild', gender: 'neutral' },
    { id: 17, name: 'The Builder', style: 'focused', gender: 'neutral' }
];

// ============================================
// CHARACTER CREATION STATE
// ============================================

let creationState = {
    step: 0,
    name: '',
    portrait: 0,
    archetype: null,
    background: null,
    motivation: null,
    bonusStats: { dev: 0, com: 0, mkt: 0, str: 0, cha: 0, lck: 0 },
    bonusPointsRemaining: 10
};

const CREATION_STEPS = [
    'identity',
    'archetype',
    'background',
    'motivation',
    'stats',
    'confirm'
];

// ============================================
// CHARACTER CREATION WIZARD
// ============================================

function startCharacterCreation(container) {
    creationState = {
        step: 0,
        name: '',
        portrait: 0,
        archetype: null,
        background: null,
        motivation: null,
        bonusStats: { dev: 0, com: 0, mkt: 0, str: 0, cha: 0, lck: 0 },
        bonusPointsRemaining: 10
    };

    renderCreationStep(container);
}

function renderCreationStep(container) {
    const step = CREATION_STEPS[creationState.step];

    switch (step) {
        case 'identity':
            renderIdentityStep(container);
            break;
        case 'archetype':
            renderArchetypeStep(container);
            break;
        case 'background':
            renderBackgroundStep(container);
            break;
        case 'motivation':
            renderMotivationStep(container);
            break;
        case 'stats':
            renderStatsStep(container);
            break;
        case 'confirm':
            renderConfirmStep(container);
            break;
    }
}

// ============================================
// STEP RENDERERS
// ============================================

function renderIdentityStep(container) {
    container.innerHTML = `
        <div class="creation-step identity-step">
            <div class="step-header">
                <h2>Who Are You?</h2>
                <p class="step-subtitle">Every builder has a name and a face. Choose wisely.</p>
            </div>

            <div class="identity-form">
                <div class="name-input-group">
                    <label for="char-name">Your Builder Name</label>
                    <input type="text" id="char-name" maxlength="20" placeholder="Enter name..." value="${creationState.name}">
                    <span class="char-count"><span id="name-count">${creationState.name.length}</span>/20</span>
                </div>

                <div class="portrait-selection">
                    <label>Choose Your Look</label>
                    <div class="portraits-grid">
                        ${PORTRAITS.map(p => `
                            <div class="portrait-option ${creationState.portrait === p.id ? 'selected' : ''}"
                                 data-portrait="${p.id}">
                                <div class="portrait-avatar" style="background: linear-gradient(135deg, hsl(${p.id * 30}, 70%, 40%), hsl(${p.id * 30 + 40}, 70%, 30%));">
                                    <span class="portrait-icon">${getPortraitIcon(p.id)}</span>
                                </div>
                                <span class="portrait-name">${p.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="step-navigation">
                <button class="btn-secondary" disabled>Back</button>
                <button class="btn-primary" id="next-step-btn" ${!creationState.name ? 'disabled' : ''}>
                    Next <span class="arrow">&#8594;</span>
                </button>
            </div>

            <div class="step-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((creationState.step + 1) / CREATION_STEPS.length) * 100}%"></div>
                </div>
                <span class="progress-text">Step ${creationState.step + 1} of ${CREATION_STEPS.length}</span>
            </div>
        </div>
    `;

    // Event listeners
    const nameInput = container.querySelector('#char-name');
    const nameCount = container.querySelector('#name-count');
    const nextBtn = container.querySelector('#next-step-btn');

    nameInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, '').slice(0, 20);
        e.target.value = value;
        creationState.name = value;
        nameCount.textContent = value.length;
        nextBtn.disabled = value.length < 2;
    });

    container.querySelectorAll('.portrait-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.portrait-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            creationState.portrait = parseInt(opt.dataset.portrait);
        });
    });

    nextBtn.addEventListener('click', () => {
        if (creationState.name.length >= 2) {
            creationState.step++;
            renderCreationStep(container);
        }
    });
}

function renderArchetypeStep(container) {
    container.innerHTML = `
        <div class="creation-step archetype-step">
            <div class="step-header">
                <h2>Choose Your Path</h2>
                <p class="step-subtitle">Your archetype defines your strengths and how you approach challenges.</p>
            </div>

            <div class="archetypes-grid">
                ${Object.values(ARCHETYPES).map(arch => `
                    <div class="archetype-card ${creationState.archetype === arch.id ? 'selected' : ''}"
                         data-archetype="${arch.id}"
                         style="--archetype-color: ${arch.color}">
                        <div class="archetype-icon">${arch.icon}</div>
                        <h3 class="archetype-name">${arch.name}</h3>
                        <p class="archetype-tagline">"${arch.tagline}"</p>
                        <p class="archetype-desc">${arch.description}</p>
                        <div class="archetype-stats">
                            <div class="stat-preview">
                                <span class="stat-label">DEV</span>
                                <div class="stat-bar"><div class="stat-fill" style="width: ${arch.baseStats.dev * 5}%"></div></div>
                                <span class="stat-value">${arch.baseStats.dev}</span>
                            </div>
                            <div class="stat-preview">
                                <span class="stat-label">COM</span>
                                <div class="stat-bar"><div class="stat-fill" style="width: ${arch.baseStats.com * 5}%"></div></div>
                                <span class="stat-value">${arch.baseStats.com}</span>
                            </div>
                            <div class="stat-preview">
                                <span class="stat-label">MKT</span>
                                <div class="stat-bar"><div class="stat-fill" style="width: ${arch.baseStats.mkt * 5}%"></div></div>
                                <span class="stat-value">${arch.baseStats.mkt}</span>
                            </div>
                            <div class="stat-preview">
                                <span class="stat-label">STR</span>
                                <div class="stat-bar"><div class="stat-fill" style="width: ${arch.baseStats.str * 5}%"></div></div>
                                <span class="stat-value">${arch.baseStats.str}</span>
                            </div>
                            <div class="stat-preview">
                                <span class="stat-label">CHA</span>
                                <div class="stat-bar"><div class="stat-fill" style="width: ${arch.baseStats.cha * 5}%"></div></div>
                                <span class="stat-value">${arch.baseStats.cha}</span>
                            </div>
                            <div class="stat-preview">
                                <span class="stat-label">LCK</span>
                                <div class="stat-bar"><div class="stat-fill" style="width: ${arch.baseStats.lck * 5}%"></div></div>
                                <span class="stat-value">${arch.baseStats.lck}</span>
                            </div>
                        </div>
                        <div class="archetype-bonus">
                            <span class="bonus-label">Bonus:</span> ${arch.bonus}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="step-navigation">
                <button class="btn-secondary" id="prev-step-btn">
                    <span class="arrow">&#8592;</span> Back
                </button>
                <button class="btn-primary" id="next-step-btn" ${!creationState.archetype ? 'disabled' : ''}>
                    Next <span class="arrow">&#8594;</span>
                </button>
            </div>

            <div class="step-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((creationState.step + 1) / CREATION_STEPS.length) * 100}%"></div>
                </div>
                <span class="progress-text">Step ${creationState.step + 1} of ${CREATION_STEPS.length}</span>
            </div>
        </div>
    `;

    // Event listeners
    container.querySelectorAll('.archetype-card').forEach(card => {
        card.addEventListener('click', () => {
            container.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            creationState.archetype = card.dataset.archetype;
            container.querySelector('#next-step-btn').disabled = false;
        });
    });

    container.querySelector('#prev-step-btn').addEventListener('click', () => {
        creationState.step--;
        renderCreationStep(container);
    });

    container.querySelector('#next-step-btn').addEventListener('click', () => {
        if (creationState.archetype) {
            creationState.step++;
            renderCreationStep(container);
        }
    });
}

function renderBackgroundStep(container) {
    container.innerHTML = `
        <div class="creation-step background-step">
            <div class="step-header">
                <h2>Where Did You Come From?</h2>
                <p class="step-subtitle">Your past shapes your present. Choose your origin story.</p>
            </div>

            <div class="backgrounds-list">
                ${Object.values(BACKGROUNDS).map(bg => `
                    <div class="background-option ${creationState.background === bg.id ? 'selected' : ''}"
                         data-background="${bg.id}">
                        <div class="background-icon">${bg.icon}</div>
                        <div class="background-content">
                            <h3 class="background-name">${bg.name}</h3>
                            <p class="background-desc">${bg.description}</p>
                            <div class="background-bonus">
                                <span class="bonus-icon">&#9733;</span> ${bg.bonus}
                            </div>
                        </div>
                        <div class="background-check">&#10003;</div>
                    </div>
                `).join('')}
            </div>

            <div class="step-navigation">
                <button class="btn-secondary" id="prev-step-btn">
                    <span class="arrow">&#8592;</span> Back
                </button>
                <button class="btn-primary" id="next-step-btn" ${!creationState.background ? 'disabled' : ''}>
                    Next <span class="arrow">&#8594;</span>
                </button>
            </div>

            <div class="step-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((creationState.step + 1) / CREATION_STEPS.length) * 100}%"></div>
                </div>
                <span class="progress-text">Step ${creationState.step + 1} of ${CREATION_STEPS.length}</span>
            </div>
        </div>
    `;

    container.querySelectorAll('.background-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.background-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            creationState.background = opt.dataset.background;
            container.querySelector('#next-step-btn').disabled = false;
        });
    });

    container.querySelector('#prev-step-btn').addEventListener('click', () => {
        creationState.step--;
        renderCreationStep(container);
    });

    container.querySelector('#next-step-btn').addEventListener('click', () => {
        if (creationState.background) {
            creationState.step++;
            renderCreationStep(container);
        }
    });
}

function renderMotivationStep(container) {
    container.innerHTML = `
        <div class="creation-step motivation-step">
            <div class="step-header">
                <h2>What Drives You?</h2>
                <p class="step-subtitle">Your motivation shapes the quests and opportunities you'll encounter.</p>
            </div>

            <div class="motivations-list">
                ${Object.values(MOTIVATIONS).map(mot => `
                    <div class="motivation-option ${creationState.motivation === mot.id ? 'selected' : ''}"
                         data-motivation="${mot.id}">
                        <div class="motivation-icon">${mot.icon}</div>
                        <div class="motivation-content">
                            <h3 class="motivation-name">${mot.name}</h3>
                            <p class="motivation-desc">${mot.description}</p>
                        </div>
                        <div class="motivation-check">&#10003;</div>
                    </div>
                `).join('')}
            </div>

            <div class="step-navigation">
                <button class="btn-secondary" id="prev-step-btn">
                    <span class="arrow">&#8592;</span> Back
                </button>
                <button class="btn-primary" id="next-step-btn" ${!creationState.motivation ? 'disabled' : ''}>
                    Next <span class="arrow">&#8594;</span>
                </button>
            </div>

            <div class="step-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((creationState.step + 1) / CREATION_STEPS.length) * 100}%"></div>
                </div>
                <span class="progress-text">Step ${creationState.step + 1} of ${CREATION_STEPS.length}</span>
            </div>
        </div>
    `;

    container.querySelectorAll('.motivation-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.motivation-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            creationState.motivation = opt.dataset.motivation;
            container.querySelector('#next-step-btn').disabled = false;
        });
    });

    container.querySelector('#prev-step-btn').addEventListener('click', () => {
        creationState.step--;
        renderCreationStep(container);
    });

    container.querySelector('#next-step-btn').addEventListener('click', () => {
        if (creationState.motivation) {
            creationState.step++;
            renderCreationStep(container);
        }
    });
}

function renderStatsStep(container) {
    const archetype = ARCHETYPES[creationState.archetype];
    const background = BACKGROUNDS[creationState.background];

    // Calculate final stats
    const finalStats = calculateFinalStats();

    container.innerHTML = `
        <div class="creation-step stats-step">
            <div class="step-header">
                <h2>Fine-Tune Your Build</h2>
                <p class="step-subtitle">Distribute 10 bonus points to customize your strengths.</p>
            </div>

            <div class="stats-allocator">
                <div class="points-remaining">
                    <span class="points-label">Bonus Points:</span>
                    <span class="points-value" id="points-remaining">${creationState.bonusPointsRemaining}</span>
                </div>

                <div class="stats-grid">
                    ${renderStatAllocator('dev', 'Development', 'Technical skills & coding', finalStats.dev)}
                    ${renderStatAllocator('com', 'Community', 'Social engagement & growth', finalStats.com)}
                    ${renderStatAllocator('mkt', 'Marketing', 'Promotion & visibility', finalStats.mkt)}
                    ${renderStatAllocator('str', 'Strategy', 'Planning & decision making', finalStats.str)}
                    ${renderStatAllocator('cha', 'Charisma', 'Influence & persuasion', finalStats.cha)}
                    ${renderStatAllocator('lck', 'Luck', 'Random event outcomes', finalStats.lck)}
                </div>

                <button class="btn-reset" id="reset-stats-btn">Reset Points</button>
            </div>

            <div class="step-navigation">
                <button class="btn-secondary" id="prev-step-btn">
                    <span class="arrow">&#8592;</span> Back
                </button>
                <button class="btn-primary" id="next-step-btn">
                    Review Build <span class="arrow">&#8594;</span>
                </button>
            </div>

            <div class="step-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((creationState.step + 1) / CREATION_STEPS.length) * 100}%"></div>
                </div>
                <span class="progress-text">Step ${creationState.step + 1} of ${CREATION_STEPS.length}</span>
            </div>
        </div>
    `;

    // Stat allocation event listeners
    container.querySelectorAll('.stat-btn-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const stat = btn.dataset.stat;
            if (creationState.bonusStats[stat] > 0) {
                creationState.bonusStats[stat]--;
                creationState.bonusPointsRemaining++;
                updateStatsDisplay(container);
            }
        });
    });

    container.querySelectorAll('.stat-btn-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const stat = btn.dataset.stat;
            if (creationState.bonusPointsRemaining > 0 && creationState.bonusStats[stat] < 10) {
                creationState.bonusStats[stat]++;
                creationState.bonusPointsRemaining--;
                updateStatsDisplay(container);
            }
        });
    });

    container.querySelector('#reset-stats-btn').addEventListener('click', () => {
        creationState.bonusStats = { dev: 0, com: 0, mkt: 0, str: 0, cha: 0, lck: 0 };
        creationState.bonusPointsRemaining = 10;
        updateStatsDisplay(container);
    });

    container.querySelector('#prev-step-btn').addEventListener('click', () => {
        creationState.step--;
        renderCreationStep(container);
    });

    container.querySelector('#next-step-btn').addEventListener('click', () => {
        creationState.step++;
        renderCreationStep(container);
    });
}

function renderStatAllocator(statId, statName, statDesc, value) {
    return `
        <div class="stat-allocator">
            <div class="stat-info">
                <span class="stat-name">${statName}</span>
                <span class="stat-desc">${statDesc}</span>
            </div>
            <div class="stat-controls">
                <button class="stat-btn stat-btn-minus" data-stat="${statId}" ${creationState.bonusStats[statId] <= 0 ? 'disabled' : ''}>-</button>
                <div class="stat-value-display">
                    <span class="stat-base">${value - creationState.bonusStats[statId]}</span>
                    ${creationState.bonusStats[statId] > 0 ? `<span class="stat-bonus">+${creationState.bonusStats[statId]}</span>` : ''}
                    <span class="stat-total" id="stat-total-${statId}">${value}</span>
                </div>
                <button class="stat-btn stat-btn-plus" data-stat="${statId}" ${creationState.bonusPointsRemaining <= 0 || creationState.bonusStats[statId] >= 10 ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `;
}

function updateStatsDisplay(container) {
    const finalStats = calculateFinalStats();

    container.querySelector('#points-remaining').textContent = creationState.bonusPointsRemaining;

    ['dev', 'com', 'mkt', 'str', 'cha', 'lck'].forEach(stat => {
        const baseValue = finalStats[stat] - creationState.bonusStats[stat];
        const totalEl = container.querySelector(`#stat-total-${stat}`);
        const allocator = container.querySelector(`.stat-allocator .stat-btn-minus[data-stat="${stat}"]`).closest('.stat-allocator');
        const valueDisplay = allocator.querySelector('.stat-value-display');

        totalEl.textContent = finalStats[stat];

        // Update bonus display
        const existingBonus = valueDisplay.querySelector('.stat-bonus');
        if (creationState.bonusStats[stat] > 0) {
            if (existingBonus) {
                existingBonus.textContent = `+${creationState.bonusStats[stat]}`;
            } else {
                const bonusSpan = document.createElement('span');
                bonusSpan.className = 'stat-bonus';
                bonusSpan.textContent = `+${creationState.bonusStats[stat]}`;
                valueDisplay.querySelector('.stat-base').after(bonusSpan);
            }
        } else if (existingBonus) {
            existingBonus.remove();
        }

        valueDisplay.querySelector('.stat-base').textContent = baseValue;

        // Update button states
        container.querySelector(`.stat-btn-minus[data-stat="${stat}"]`).disabled = creationState.bonusStats[stat] <= 0;
        container.querySelector(`.stat-btn-plus[data-stat="${stat}"]`).disabled =
            creationState.bonusPointsRemaining <= 0 || creationState.bonusStats[stat] >= 10;
    });
}

function renderConfirmStep(container) {
    const archetype = ARCHETYPES[creationState.archetype];
    const background = BACKGROUNDS[creationState.background];
    const motivation = MOTIVATIONS[creationState.motivation];
    const finalStats = calculateFinalStats();
    const portrait = PORTRAITS[creationState.portrait];

    container.innerHTML = `
        <div class="creation-step confirm-step">
            <div class="step-header">
                <h2>Ready to Begin?</h2>
                <p class="step-subtitle">Review your builder and confirm your choices.</p>
            </div>

            <div class="character-preview">
                <div class="preview-portrait" style="background: linear-gradient(135deg, hsl(${creationState.portrait * 30}, 70%, 40%), hsl(${creationState.portrait * 30 + 40}, 70%, 30%));">
                    <span class="portrait-icon-large">${getPortraitIcon(creationState.portrait)}</span>
                </div>

                <div class="preview-info">
                    <h3 class="preview-name">${creationState.name}</h3>
                    <div class="preview-tags">
                        <span class="tag archetype-tag" style="background: ${archetype.color}">${archetype.icon} ${archetype.name}</span>
                        <span class="tag background-tag">${background.icon} ${background.name}</span>
                        <span class="tag motivation-tag">${motivation.icon} ${motivation.name}</span>
                    </div>
                </div>

                <div class="preview-stats">
                    <h4>Final Stats</h4>
                    <div class="stats-summary">
                        <div class="stat-row"><span>DEV</span><div class="stat-bar-small"><div class="fill" style="width: ${finalStats.dev * 3.3}%"></div></div><span>${finalStats.dev}</span></div>
                        <div class="stat-row"><span>COM</span><div class="stat-bar-small"><div class="fill" style="width: ${finalStats.com * 3.3}%"></div></div><span>${finalStats.com}</span></div>
                        <div class="stat-row"><span>MKT</span><div class="stat-bar-small"><div class="fill" style="width: ${finalStats.mkt * 3.3}%"></div></div><span>${finalStats.mkt}</span></div>
                        <div class="stat-row"><span>STR</span><div class="stat-bar-small"><div class="fill" style="width: ${finalStats.str * 3.3}%"></div></div><span>${finalStats.str}</span></div>
                        <div class="stat-row"><span>CHA</span><div class="stat-bar-small"><div class="fill" style="width: ${finalStats.cha * 3.3}%"></div></div><span>${finalStats.cha}</span></div>
                        <div class="stat-row"><span>LCK</span><div class="stat-bar-small"><div class="fill" style="width: ${finalStats.lck * 3.3}%"></div></div><span>${finalStats.lck}</span></div>
                    </div>
                </div>

                <div class="preview-bonuses">
                    <h4>Starting Bonuses</h4>
                    <ul>
                        <li>${archetype.bonus}</li>
                        <li>${background.bonus}</li>
                    </ul>
                </div>
            </div>

            <div class="step-navigation">
                <button class="btn-secondary" id="prev-step-btn">
                    <span class="arrow">&#8592;</span> Back
                </button>
                <button class="btn-primary btn-confirm" id="confirm-btn">
                    Start Your Journey &#9889;
                </button>
            </div>
        </div>
    `;

    container.querySelector('#prev-step-btn').addEventListener('click', () => {
        creationState.step--;
        renderCreationStep(container);
    });

    container.querySelector('#confirm-btn').addEventListener('click', () => {
        finalizeCharacter();
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPortraitIcon(id) {
    const icons = [
        '&#128512;', // 0: Optimist - 😀
        '&#129300;', // 1: Analyst - 🤔
        '&#128526;', // 2: Rebel - 😎
        '&#10024;',  // 3: Visionary - ✨
        '&#128187;', // 4: Hacker - 💻
        '&#127912;', // 5: Artist - 🎨
        '&#128081;', // 6: Leader - 👑
        '&#129504;', // 7: Thinker - 🧠
        '&#128293;', // 8: Hustler - 🔥
        '&#129668;', // 9: Sage - 🧙
        '&#127183;', // 10: Wildcard - 🃏
        '&#128123;', // 11: Ghost - 👻
        '&#127909;', // 12: Streamer - 🎥
        '&#128200;', // 13: Trader - 📈
        '&#128051;', // 14: Whale - 🐳
        '&#128373;', // 15: Anon - 🕵
        '&#127920;', // 16: Degen - 🎰
        '&#128736;'  // 17: Builder - 🔨
    ];
    return icons[id] || '&#128100;';
}

function calculateFinalStats() {
    const archetype = ARCHETYPES[creationState.archetype];
    const background = BACKGROUNDS[creationState.background];

    const stats = { ...archetype.baseStats };

    // Apply background bonus
    if (background.effect.allStats) {
        Object.keys(stats).forEach(key => {
            stats[key] += background.effect.allStats;
        });
    }

    // Apply bonus points
    Object.keys(creationState.bonusStats).forEach(key => {
        stats[key] += creationState.bonusStats[key];
    });

    return stats;
}

function finalizeCharacter() {
    const state = window.PumpArenaState.get();
    const archetype = ARCHETYPES[creationState.archetype];
    const background = BACKGROUNDS[creationState.background];
    const finalStats = calculateFinalStats();

    // Update character data
    state.character.id = window.PumpArenaState.generateCharacterId();
    state.character.name = creationState.name;
    state.character.portrait = creationState.portrait;
    state.character.archetype = creationState.archetype;
    state.character.background = creationState.background;
    state.character.motivation = creationState.motivation;
    state.character.created = true;

    // Set stats
    state.stats = finalStats;

    // Apply background effects
    if (background.effect.reputation) {
        state.resources.reputation += background.effect.reputation;
    }
    if (background.effect.influence) {
        state.resources.influence = Math.min(
            state.resources.influence + background.effect.influence,
            state.resources.maxInfluence
        );
    }
    if (background.effect.xpBonus) {
        state.character.xpMultiplier = 1 + background.effect.xpBonus;
    }
    if (background.effect.relationships) {
        // Will be handled when NPCs are initialized
        state.character.startingRelationships = background.effect.relationships;
    }

    // Apply archetype bonus
    state.character.archetypeBonus = {
        type: archetype.bonusType,
        value: archetype.bonusValue
    };

    // Save and dispatch event
    window.PumpArenaState.save();

    document.dispatchEvent(new CustomEvent('pumparena:character-created', {
        detail: { character: state.character, stats: state.stats }
    }));
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaCharacter = {
        ARCHETYPES,
        BACKGROUNDS,
        MOTIVATIONS,
        PORTRAITS,
        startCreation: startCharacterCreation,
        getArchetype: (id) => ARCHETYPES[id],
        getBackground: (id) => BACKGROUNDS[id],
        getMotivation: (id) => MOTIVATIONS[id],
        getPortraitIcon
    };
}
