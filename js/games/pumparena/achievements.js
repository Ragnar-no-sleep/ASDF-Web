/**
 * Pump Arena RPG - Achievements System
 * Track milestones and reward players
 */

'use strict';

// ============================================
// ACHIEVEMENT CATEGORIES
// ============================================

const ACHIEVEMENT_CATEGORIES = {
    PROGRESSION: 'progression',
    SOCIAL: 'social',
    BUILDER: 'builder',
    COLLECTOR: 'collector',
    CHALLENGE: 'challenge',
    SECRET: 'secret'
};

// ============================================
// ACHIEVEMENTS DATABASE
// ============================================

const ACHIEVEMENTS = {
    // ==========================================
    // PROGRESSION ACHIEVEMENTS
    // ==========================================

    first_steps: {
        id: 'first_steps',
        name: 'First Steps',
        icon: '&#128694;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Create your first character',
        hint: 'Begin your journey',
        reward: { tokens: 50 },
        check: (state) => state.character?.created
    },
    level_5: {
        id: 'level_5',
        name: 'Getting Started',
        icon: '&#11088;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Reach level 5',
        hint: 'Keep grinding!',
        reward: { tokens: 100, xp: 50 },
        check: (state) => state.progression?.level >= 5
    },
    level_10: {
        id: 'level_10',
        name: 'Rising Star',
        icon: '&#127775;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Reach level 10',
        hint: 'Halfway to greatness',
        reward: { tokens: 250, xp: 100 },
        check: (state) => state.progression?.level >= 10
    },
    level_25: {
        id: 'level_25',
        name: 'Veteran Builder',
        icon: '&#128142;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Reach level 25',
        hint: 'A true crypto veteran',
        reward: { tokens: 500, xp: 250 },
        check: (state) => state.progression?.level >= 25
    },
    level_50: {
        id: 'level_50',
        name: 'Legendary Status',
        icon: '&#128081;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Reach level 50',
        hint: 'Maximum power achieved',
        reward: { tokens: 1000, xp: 500, title: 'Legend' },
        check: (state) => state.progression?.level >= 50
    },
    first_skill: {
        id: 'first_skill',
        name: 'Skill Unlocked',
        icon: '&#127795;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Unlock your first skill',
        hint: 'Visit the skill tree',
        reward: { tokens: 50 },
        check: (state) => (state.progression?.skills?.length || 0) >= 1
    },
    skill_master: {
        id: 'skill_master',
        name: 'Skill Master',
        icon: '&#129504;',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        description: 'Unlock 10 skills',
        hint: 'Diversify your abilities',
        reward: { tokens: 300, xp: 150 },
        check: (state) => (state.progression?.skills?.length || 0) >= 10
    },

    // ==========================================
    // SOCIAL ACHIEVEMENTS
    // ==========================================

    first_friend: {
        id: 'first_friend',
        name: 'First Connection',
        icon: '&#129309;',
        category: ACHIEVEMENT_CATEGORIES.SOCIAL,
        description: 'Reach Friend status with an NPC',
        hint: 'Build relationships',
        reward: { tokens: 75, reputation: 25 },
        check: (state) => {
            const relationships = state.relationships || {};
            return Object.values(relationships).some(r => r >= 40);
        }
    },
    networking_pro: {
        id: 'networking_pro',
        name: 'Networking Pro',
        icon: '&#128101;',
        category: ACHIEVEMENT_CATEGORIES.SOCIAL,
        description: 'Have 5 NPCs as Friends or higher',
        hint: 'Your network is your net worth',
        reward: { tokens: 200, reputation: 100 },
        check: (state) => {
            const relationships = state.relationships || {};
            return Object.values(relationships).filter(r => r >= 40).length >= 5
        }
    },
    best_allies: {
        id: 'best_allies',
        name: 'Inner Circle',
        icon: '&#128106;',
        category: ACHIEVEMENT_CATEGORIES.SOCIAL,
        description: 'Reach Ally status with 3 NPCs',
        hint: 'Your trusted partners',
        reward: { tokens: 400, reputation: 200 },
        check: (state) => {
            const relationships = state.relationships || {};
            return Object.values(relationships).filter(r => r >= 60).length >= 3
        }
    },
    partner_achieved: {
        id: 'partner_achieved',
        name: 'True Partner',
        icon: '&#128150;',
        category: ACHIEVEMENT_CATEGORIES.SOCIAL,
        description: 'Reach Partner status with any NPC',
        hint: 'The highest bond',
        reward: { tokens: 500, reputation: 300, title: 'Partner' },
        check: (state) => {
            const relationships = state.relationships || {};
            return Object.values(relationships).some(r => r >= 80);
        }
    },

    // ==========================================
    // BUILDER ACHIEVEMENTS
    // ==========================================

    first_quest: {
        id: 'first_quest',
        name: 'Quest Accepted',
        icon: '&#128220;',
        category: ACHIEVEMENT_CATEGORIES.BUILDER,
        description: 'Complete your first quest',
        hint: 'Start building',
        reward: { tokens: 50, xp: 25 },
        check: (state) => (state.quests?.completed?.length || 0) >= 1
    },
    quest_hunter: {
        id: 'quest_hunter',
        name: 'Quest Hunter',
        icon: '&#128203;',
        category: ACHIEVEMENT_CATEGORIES.BUILDER,
        description: 'Complete 10 quests',
        hint: 'Keep completing missions',
        reward: { tokens: 200, xp: 100 },
        check: (state) => (state.quests?.completed?.length || 0) >= 10
    },
    quest_master: {
        id: 'quest_master',
        name: 'Quest Master',
        icon: '&#127942;',
        category: ACHIEVEMENT_CATEGORIES.BUILDER,
        description: 'Complete 50 quests',
        hint: 'A true completionist',
        reward: { tokens: 500, xp: 300, title: 'Quest Master' },
        check: (state) => (state.quests?.completed?.length || 0) >= 50
    },
    campaign_complete: {
        id: 'campaign_complete',
        name: 'Campaign Victory',
        icon: '&#127937;',
        category: ACHIEVEMENT_CATEGORIES.BUILDER,
        description: 'Complete your first campaign',
        hint: 'Finish a project story',
        reward: { tokens: 300, reputation: 150 },
        check: (state) => {
            const progress = state.quests?.campaignProgress || {};
            return Object.values(progress).some(p => p.completed);
        }
    },
    multi_project: {
        id: 'multi_project',
        name: 'Multi-Project Builder',
        icon: '&#128736;',
        category: ACHIEVEMENT_CATEGORIES.BUILDER,
        description: 'Work with 3 different projects',
        hint: 'Diversify your portfolio',
        reward: { tokens: 400, reputation: 200 },
        check: (state) => {
            const progress = state.quests?.campaignProgress || {};
            return Object.keys(progress).length >= 3;
        }
    },

    // ==========================================
    // COLLECTOR ACHIEVEMENTS
    // ==========================================

    first_tool: {
        id: 'first_tool',
        name: 'Tooled Up',
        icon: '&#128295;',
        category: ACHIEVEMENT_CATEGORIES.COLLECTOR,
        description: 'Acquire your first tool',
        hint: 'Visit the shop',
        reward: { tokens: 50 },
        check: (state) => (state.inventory?.tools?.length || 0) >= 1
    },
    gear_collector: {
        id: 'gear_collector',
        name: 'Gear Collector',
        icon: '&#127890;',
        category: ACHIEVEMENT_CATEGORIES.COLLECTOR,
        description: 'Own 5 different tools',
        hint: 'Expand your toolkit',
        reward: { tokens: 200 },
        check: (state) => (state.inventory?.tools?.length || 0) >= 5
    },
    legendary_finder: {
        id: 'legendary_finder',
        name: 'Legendary Finder',
        icon: '&#128142;',
        category: ACHIEVEMENT_CATEGORIES.COLLECTOR,
        description: 'Acquire a legendary item',
        hint: 'The rarest of the rare',
        reward: { tokens: 500, title: 'Collector' },
        check: (state) => {
            const tools = state.inventory?.tools || [];
            const collectibles = state.inventory?.collectibles || [];
            const allItems = [...tools, ...collectibles];
            return allItems.some(item => {
                const def = window.ITEMS?.[item.id];
                return def?.rarity === 'legendary';
            });
        }
    },
    collectible_hunter: {
        id: 'collectible_hunter',
        name: 'Collectible Hunter',
        icon: '&#128444;',
        category: ACHIEVEMENT_CATEGORIES.COLLECTOR,
        description: 'Find 3 collectibles',
        hint: 'Explore and discover',
        reward: { tokens: 300, xp: 150 },
        check: (state) => (state.inventory?.collectibles?.length || 0) >= 3
    },
    museum_curator: {
        id: 'museum_curator',
        name: 'Museum Curator',
        icon: '&#127963;',
        category: ACHIEVEMENT_CATEGORIES.COLLECTOR,
        description: 'Collect all collectibles',
        hint: 'Complete your collection',
        reward: { tokens: 1000, title: 'Curator' },
        check: (state) => {
            const collectibles = state.inventory?.collectibles || [];
            const totalCollectibles = Object.values(window.ITEMS || {})
                .filter(i => i.type === 'collectible').length;
            return collectibles.length >= totalCollectibles && totalCollectibles > 0;
        }
    },

    // ==========================================
    // CHALLENGE ACHIEVEMENTS
    // ==========================================

    daily_streak_7: {
        id: 'daily_streak_7',
        name: 'Week Warrior',
        icon: '&#128293;',
        category: ACHIEVEMENT_CATEGORIES.CHALLENGE,
        description: 'Maintain a 7-day login streak',
        hint: 'Play every day',
        reward: { tokens: 150, influence: 50 },
        check: (state) => (state.daily?.loginStreak || 0) >= 7
    },
    daily_streak_30: {
        id: 'daily_streak_30',
        name: 'Monthly Dedication',
        icon: '&#128170;',
        category: ACHIEVEMENT_CATEGORIES.CHALLENGE,
        description: 'Maintain a 30-day login streak',
        hint: 'True commitment',
        reward: { tokens: 500, reputation: 200, title: 'Dedicated' },
        check: (state) => (state.daily?.loginStreak || 0) >= 30
    },
    minigame_master: {
        id: 'minigame_master',
        name: 'Mini-Game Master',
        icon: '&#127918;',
        category: ACHIEVEMENT_CATEGORIES.CHALLENGE,
        description: 'Get an S rank in any mini-game',
        hint: 'Perfect performance',
        reward: { tokens: 200, xp: 100 },
        check: (state) => {
            const scores = state.statistics?.minigameHighScores || {};
            return Object.values(scores).some(s => s >= 1000); // S rank threshold
        }
    },
    event_survivor: {
        id: 'event_survivor',
        name: 'Event Survivor',
        icon: '&#128737;',
        category: ACHIEVEMENT_CATEGORIES.CHALLENGE,
        description: 'Successfully handle 10 random events',
        hint: 'Navigate the chaos',
        reward: { tokens: 200, reputation: 100 },
        check: (state) => (state.statistics?.eventsHandled || 0) >= 10
    },
    decision_maker: {
        id: 'decision_maker',
        name: 'Decision Maker',
        icon: '&#129300;',
        category: ACHIEVEMENT_CATEGORIES.CHALLENGE,
        description: 'Make 50 story choices',
        hint: 'Your choices matter',
        reward: { tokens: 150, xp: 75 },
        check: (state) => (state.statistics?.decisionsCount || 0) >= 50
    },

    // ==========================================
    // SECRET ACHIEVEMENTS
    // ==========================================

    early_bird: {
        id: 'early_bird',
        name: 'Early Bird',
        icon: '&#128038;',
        category: ACHIEVEMENT_CATEGORIES.SECRET,
        description: 'Play during morning hours',
        hint: '???',
        reward: { tokens: 75 },
        check: () => {
            const hour = new Date().getHours();
            return hour >= 5 && hour < 8;
        },
        secret: true
    },
    night_owl: {
        id: 'night_owl',
        name: 'Night Owl',
        icon: '&#129417;',
        category: ACHIEVEMENT_CATEGORIES.SECRET,
        description: 'Play during late night hours',
        hint: '???',
        reward: { tokens: 75 },
        check: () => {
            const hour = new Date().getHours();
            return hour >= 0 && hour < 4;
        },
        secret: true
    },
    lucky_7: {
        id: 'lucky_7',
        name: 'Lucky 7',
        icon: '&#127808;',
        category: ACHIEVEMENT_CATEGORIES.SECRET,
        description: 'Have exactly 777 tokens',
        hint: '???',
        reward: { tokens: 77, xp: 77 },
        check: (state) => state.resources?.tokens === 777,
        secret: true
    },
    whale_watcher: {
        id: 'whale_watcher',
        name: 'Whale Watcher',
        icon: '&#128011;',
        category: ACHIEVEMENT_CATEGORIES.SECRET,
        description: 'Accumulate 10,000 tokens',
        hint: '???',
        reward: { tokens: 1000, title: 'Whale' },
        check: (state) => (state.resources?.tokens || 0) >= 10000,
        secret: true
    },
    prestige_one: {
        id: 'prestige_one',
        name: 'New Game+',
        icon: '&#128260;',
        category: ACHIEVEMENT_CATEGORIES.SECRET,
        description: 'Enter Prestige mode for the first time',
        hint: '???',
        reward: { tokens: 500, title: 'Prestige' },
        check: (state) => (state.progression?.prestigeLevel || 0) >= 1,
        secret: true
    }
};

// ============================================
// TITLES DATABASE
// ============================================

const TITLES = {
    newcomer: { id: 'newcomer', name: 'Newcomer', description: 'Just getting started', default: true },
    legend: { id: 'legend', name: 'Legend', description: 'Reached level 50' },
    partner: { id: 'partner', name: 'Partner', description: 'Formed a true partnership' },
    quest_master: { id: 'quest_master', name: 'Quest Master', description: 'Completed 50 quests' },
    collector: { id: 'collector', name: 'Collector', description: 'Found legendary items' },
    curator: { id: 'curator', name: 'Curator', description: 'Completed the collection' },
    dedicated: { id: 'dedicated', name: 'Dedicated', description: '30-day streak' },
    whale: { id: 'whale', name: 'Whale', description: 'Accumulated massive wealth' },
    prestige: { id: 'prestige', name: 'Prestige', description: 'Entered New Game+' }
};

// ============================================
// ACHIEVEMENTS MANAGER
// ============================================

const PumpArenaAchievements = {
    // Check all achievements and unlock new ones
    checkAchievements() {
        const state = window.PumpArenaState?.get();
        if (!state) return [];

        const newlyUnlocked = [];
        const unlocked = state.achievements?.unlocked || [];

        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            // Skip already unlocked
            if (unlocked.includes(id)) continue;

            // Check if conditions are met
            try {
                if (achievement.check(state)) {
                    newlyUnlocked.push(achievement);
                    this.unlockAchievement(id);
                }
            } catch (e) {
                console.warn(`[Achievements] Error checking ${id}:`, e);
            }
        }

        return newlyUnlocked;
    },

    // Unlock a specific achievement
    unlockAchievement(achievementId) {
        const state = window.PumpArenaState?.get();
        if (!state) return { success: false };

        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) return { success: false, message: 'Achievement not found' };

        // Initialize if needed
        if (!state.achievements) {
            state.achievements = { unlocked: [], currentTitle: 'newcomer' };
        }
        if (!state.achievements.unlocked) {
            state.achievements.unlocked = [];
        }

        // Check if already unlocked
        if (state.achievements.unlocked.includes(achievementId)) {
            return { success: false, message: 'Already unlocked' };
        }

        // Add to unlocked
        state.achievements.unlocked.push(achievementId);

        // Apply rewards
        if (achievement.reward) {
            if (achievement.reward.tokens) {
                state.resources.tokens = (state.resources.tokens || 0) + achievement.reward.tokens;
            }
            if (achievement.reward.xp) {
                window.PumpArenaState.addXP(achievement.reward.xp);
            }
            if (achievement.reward.reputation) {
                window.PumpArenaState.addReputation(achievement.reward.reputation);
            }
            if (achievement.reward.influence) {
                const maxInfluence = window.PumpArenaState.getMaxInfluence();
                state.resources.influence = Math.min(
                    (state.resources.influence || 0) + achievement.reward.influence,
                    maxInfluence
                );
            }
            if (achievement.reward.title) {
                // Unlock title but don't auto-equip
                if (!state.achievements.unlockedTitles) {
                    state.achievements.unlockedTitles = ['newcomer'];
                }
                if (!state.achievements.unlockedTitles.includes(achievement.reward.title.toLowerCase())) {
                    state.achievements.unlockedTitles.push(achievement.reward.title.toLowerCase());
                }
            }
        }

        window.PumpArenaState.save();

        // Dispatch event
        document.dispatchEvent(new CustomEvent('pumparena:achievement-unlocked', {
            detail: { achievement }
        }));

        return { success: true, achievement };
    },

    // Get all achievements
    getAllAchievements() {
        return ACHIEVEMENTS;
    },

    // Get achievement by ID
    getAchievement(id) {
        return ACHIEVEMENTS[id] || null;
    },

    // Get unlocked achievements
    getUnlockedAchievements() {
        const state = window.PumpArenaState?.get();
        const unlocked = state?.achievements?.unlocked || [];
        return unlocked.map(id => ACHIEVEMENTS[id]).filter(Boolean);
    },

    // Get achievement progress
    getProgress() {
        const state = window.PumpArenaState?.get();
        const unlocked = state?.achievements?.unlocked || [];
        const total = Object.keys(ACHIEVEMENTS).length;
        const visibleTotal = Object.values(ACHIEVEMENTS).filter(a => !a.secret).length;
        const unlockedVisible = unlocked.filter(id => !ACHIEVEMENTS[id]?.secret).length;

        return {
            unlocked: unlocked.length,
            total,
            visibleTotal,
            unlockedVisible,
            percentage: Math.round((unlocked.length / total) * 100)
        };
    },

    // Get achievements by category
    getByCategory(category) {
        return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
    },

    // Get current title
    getCurrentTitle() {
        const state = window.PumpArenaState?.get();
        const titleId = state?.achievements?.currentTitle || 'newcomer';
        return TITLES[titleId] || TITLES.newcomer;
    },

    // Set current title
    setTitle(titleId) {
        const state = window.PumpArenaState?.get();
        if (!state) return { success: false };

        const title = TITLES[titleId];
        if (!title) return { success: false, message: 'Title not found' };

        // Check if unlocked
        const unlockedTitles = state.achievements?.unlockedTitles || ['newcomer'];
        if (!unlockedTitles.includes(titleId) && !title.default) {
            return { success: false, message: 'Title not unlocked' };
        }

        state.achievements.currentTitle = titleId;
        window.PumpArenaState.save();

        return { success: true, title };
    },

    // Get all unlocked titles
    getUnlockedTitles() {
        const state = window.PumpArenaState?.get();
        const unlockedTitles = state?.achievements?.unlockedTitles || ['newcomer'];
        return unlockedTitles.map(id => TITLES[id]).filter(Boolean);
    },

    // ==========================================
    // UI RENDERING
    // ==========================================

    renderAchievementsPanel(container) {
        const state = window.PumpArenaState?.get();
        const unlocked = state?.achievements?.unlocked || [];
        const progress = this.getProgress();

        container.innerHTML = `
            <div class="achievements-container">
                <div class="achievements-header">
                    <div class="achievements-progress">
                        <div class="progress-circle">
                            <svg viewBox="0 0 36 36">
                                <path class="progress-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="#1a1a24" stroke-width="3"/>
                                <path class="progress-fill"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none" stroke="var(--rpg-accent-primary)" stroke-width="3"
                                    stroke-dasharray="${progress.percentage}, 100"/>
                            </svg>
                            <span class="progress-text">${progress.percentage}%</span>
                        </div>
                        <div class="progress-info">
                            <div class="progress-count">${progress.unlockedVisible} / ${progress.visibleTotal}</div>
                            <div class="progress-label">Achievements</div>
                        </div>
                    </div>
                    <div class="title-display">
                        <span class="title-label">Current Title:</span>
                        <button class="title-badge" id="change-title-btn">
                            ${this.getCurrentTitle().name}
                        </button>
                    </div>
                </div>

                <div class="achievements-tabs">
                    ${Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => `
                        <button class="ach-tab ${key === 'PROGRESSION' ? 'active' : ''}" data-category="${cat}">
                            ${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}
                        </button>
                    `).join('')}
                </div>

                <div class="achievements-list" id="achievements-list">
                    ${this.renderAchievementsList(ACHIEVEMENT_CATEGORIES.PROGRESSION, unlocked)}
                </div>
            </div>
        `;

        // Tab switching
        container.querySelectorAll('.ach-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.ach-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const category = tab.dataset.category;
                container.querySelector('#achievements-list').innerHTML =
                    this.renderAchievementsList(category, unlocked);
            });
        });

        // Title change
        container.querySelector('#change-title-btn')?.addEventListener('click', () => {
            this.showTitleSelector(container);
        });
    },

    renderAchievementsList(category, unlocked) {
        const achievements = this.getByCategory(category);

        if (achievements.length === 0) {
            return '<div class="no-achievements">No achievements in this category</div>';
        }

        return `
            <div class="ach-grid">
                ${achievements.map(ach => {
                    const isUnlocked = unlocked.includes(ach.id);
                    const isSecret = ach.secret && !isUnlocked;

                    return `
                        <div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSecret ? 'secret' : ''}">
                            <div class="ach-icon">${isSecret ? '&#10067;' : ach.icon}</div>
                            <div class="ach-info">
                                <div class="ach-name">${isSecret ? '???' : ach.name}</div>
                                <div class="ach-desc">${isSecret ? 'Secret achievement' : ach.description}</div>
                                ${!isUnlocked && !isSecret ? `<div class="ach-hint">Hint: ${ach.hint}</div>` : ''}
                                ${isUnlocked && ach.reward ? `
                                    <div class="ach-reward">
                                        ${ach.reward.tokens ? `<span>+${ach.reward.tokens} &#129689;</span>` : ''}
                                        ${ach.reward.xp ? `<span>+${ach.reward.xp} XP</span>` : ''}
                                        ${ach.reward.title ? `<span>Title: ${ach.reward.title}</span>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                            ${isUnlocked ? '<div class="ach-check">&#10003;</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    showTitleSelector(container) {
        const unlockedTitles = this.getUnlockedTitles();
        const currentTitle = this.getCurrentTitle();

        const modal = document.createElement('div');
        modal.className = 'title-selector-overlay';
        modal.innerHTML = `
            <div class="title-selector-panel">
                <div class="title-selector-header">
                    <h4>Select Title</h4>
                    <button class="title-close">&times;</button>
                </div>
                <div class="titles-list">
                    ${unlockedTitles.map(title => `
                        <div class="title-option ${title.id === currentTitle.id ? 'selected' : ''}" data-title="${title.id}">
                            <div class="title-name">${title.name}</div>
                            <div class="title-desc">${title.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.appendChild(modal);

        modal.querySelector('.title-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelectorAll('.title-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const titleId = opt.dataset.title;
                const result = this.setTitle(titleId);
                if (result.success) {
                    modal.remove();
                    this.renderAchievementsPanel(container);
                }
            });
        });
    },

    getCategoryIcon(category) {
        const icons = {
            [ACHIEVEMENT_CATEGORIES.PROGRESSION]: '&#11088;',
            [ACHIEVEMENT_CATEGORIES.SOCIAL]: '&#128101;',
            [ACHIEVEMENT_CATEGORIES.BUILDER]: '&#128736;',
            [ACHIEVEMENT_CATEGORIES.COLLECTOR]: '&#127873;',
            [ACHIEVEMENT_CATEGORIES.CHALLENGE]: '&#127942;',
            [ACHIEVEMENT_CATEGORIES.SECRET]: '&#128274;'
        };
        return icons[category] || '&#127942;';
    },

    getCategoryName(category) {
        const names = {
            [ACHIEVEMENT_CATEGORIES.PROGRESSION]: 'Progress',
            [ACHIEVEMENT_CATEGORIES.SOCIAL]: 'Social',
            [ACHIEVEMENT_CATEGORIES.BUILDER]: 'Builder',
            [ACHIEVEMENT_CATEGORIES.COLLECTOR]: 'Collector',
            [ACHIEVEMENT_CATEGORIES.CHALLENGE]: 'Challenge',
            [ACHIEVEMENT_CATEGORIES.SECRET]: 'Secret'
        };
        return names[category] || category;
    },

    // Show achievement popup
    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-popup-content">
                <div class="popup-icon">${achievement.icon}</div>
                <div class="popup-info">
                    <div class="popup-title">Achievement Unlocked!</div>
                    <div class="popup-name">${achievement.name}</div>
                    <div class="popup-desc">${achievement.description}</div>
                    ${achievement.reward ? `
                        <div class="popup-reward">
                            ${achievement.reward.tokens ? `+${achievement.reward.tokens} Tokens` : ''}
                            ${achievement.reward.xp ? ` +${achievement.reward.xp} XP` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Animate in
        setTimeout(() => popup.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 4000);
    }
};

// Auto-check achievements periodically
let achievementCheckInterval = null;

function startAchievementChecker() {
    if (achievementCheckInterval) return;

    // Check every 30 seconds
    achievementCheckInterval = setInterval(() => {
        const newAchievements = PumpArenaAchievements.checkAchievements();
        for (const ach of newAchievements) {
            PumpArenaAchievements.showAchievementPopup(ach);
        }
    }, 30000);

    // Also check immediately
    setTimeout(() => {
        const newAchievements = PumpArenaAchievements.checkAchievements();
        for (const ach of newAchievements) {
            PumpArenaAchievements.showAchievementPopup(ach);
        }
    }, 5000);
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PumpArenaAchievements = PumpArenaAchievements;
    window.startAchievementChecker = startAchievementChecker;
    window.ACHIEVEMENTS = ACHIEVEMENTS;
    window.TITLES = TITLES;
}
