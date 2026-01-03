/**
 * Pump Arena RPG - Main Entry Point
 * Orchestrates all game systems and manages game flow
 */

'use strict';

// ============================================
// GAME CONFIGURATION
// ============================================

/**
 * GAME_CONFIG - ASDF Philosophy Aligned
 * All values derived from Fibonacci sequence for mathematical harmony
 * fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610...]
 */
const GAME_CONFIG = {
    name: 'Pump Arena',
    version: '2.0.0',
    minLevel: 1,
    maxLevel: 55,                    // fib[10] = 55 (level cap)
    baseInfluence: 55,               // fib[10] = 55 (base energy)
    influencePerLevel: 5,            // fib[5] = 5 (energy per level)
    influenceRegenRate: 21000,       // fib[8] * 1000 = 21 seconds per point
    dailyLoginInfluence: 21          // fib[8] = 21 (daily bonus)
};

// ============================================
// SECURITY UTILITIES (Security by Design)
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 * @param {*} str - Input to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (typeof str !== 'string') {
        str = String(str ?? '');
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validate and sanitize CSS color value
 * Only allows valid hex colors and named colors
 * @param {string} color - Color to validate
 * @returns {string} Safe color or fallback
 */
function sanitizeColor(color) {
    if (typeof color !== 'string') return '#6b7280';

    // Allow only hex colors (#RGB, #RRGGBB, #RRGGBBAA)
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (hexPattern.test(color)) {
        return color;
    }

    // Allow only safe named colors
    const safeColors = [
        'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
        'gray', 'grey', 'white', 'black', 'transparent'
    ];
    if (safeColors.includes(color.toLowerCase())) {
        return color;
    }

    return '#6b7280'; // Default fallback
}

/**
 * Sanitize number for display
 * @param {*} num - Number to sanitize
 * @returns {number} Safe number
 */
function sanitizeNumber(num) {
    const parsed = Number(num);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
}

// ============================================
// GAME STATE
// ============================================

let gameState = {
    initialized: false,
    currentScreen: null,
    currentScene: null,
    isPaused: false,
    modalStack: [],
    container: null
};

// ============================================
// INITIALIZATION
// ============================================

async function initPumpArenaRPG(containerId) {
    const container = document.getElementById(containerId) || document.getElementById('arena-pumparena');

    if (!container) {
        console.error('[PumpArena] Container not found:', containerId);
        return false;
    }

    gameState.container = container;

    // Load state
    window.PumpArenaState.load();

    // Start session
    window.PumpArenaState.startSession();

    // Initialize daily system
    if (window.PumpArenaDaily) {
        window.PumpArenaDaily.init();
    }

    // Initialize NPC system
    if (window.PumpArenaNPCs) {
        window.PumpArenaNPCs.init();
    }

    // Initialize Quest system
    if (window.PumpArenaQuests) {
        window.PumpArenaQuests.init();
    }

    // Initialize Events system
    if (window.PumpArenaEvents) {
        window.PumpArenaEvents.init();
    }

    // Initialize Achievements system
    if (window.startAchievementChecker) {
        window.startAchievementChecker();
    }

    // Check for existing character
    if (window.PumpArenaState.hasCharacter()) {
        // Returning player - check daily reset and show main game
        const isNewDay = window.PumpArenaDaily ? window.PumpArenaDaily.checkReset() : false;
        showMainGame();

        // Show daily popup if it's a new day and reward not claimed
        if (window.PumpArenaDaily) {
            const dailyState = window.PumpArenaDaily.getState();
            if (!dailyState.todayClaimed) {
                setTimeout(() => showDailyPopup(), 500);
            }
        }
    } else {
        // New player - show character creation
        showCharacterCreation();
    }

    // Set up event listeners
    setupEventListeners();

    gameState.initialized = true;

    console.log('[PumpArena] RPG initialized successfully');
    return true;
}

function setupEventListeners() {
    // Character creation complete
    document.addEventListener('pumparena:character-created', (e) => {
        console.log('[PumpArena] Character created:', e.detail.character.name);
        showWelcomeSequence();
    });

    // Level up
    document.addEventListener('pumparena:levelup', (e) => {
        showLevelUpNotification(e.detail.level);
    });

    // Handle window unload
    window.addEventListener('beforeunload', () => {
        window.PumpArenaState.endSession();
    });

    // Handle visibility change (pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            gameState.isPaused = true;
        } else {
            gameState.isPaused = false;
            window.PumpArenaState.regenerateInfluence();
        }
    });
}

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showCharacterCreation() {
    gameState.currentScreen = 'character-creation';
    gameState.container.innerHTML = `
        <div class="pumparena-rpg character-creation-screen">
            <div class="creation-container" id="creation-container">
                <div class="loading-creation">Loading character creation...</div>
            </div>
        </div>
    `;

    // Start character creation wizard
    setTimeout(() => {
        const creationContainer = document.getElementById('creation-container');
        if (window.PumpArenaCharacter) {
            window.PumpArenaCharacter.startCreation(creationContainer);
        }
    }, 100);
}

function showWelcomeSequence() {
    const character = window.PumpArenaState.getCharacter();
    const archetype = window.PumpArenaCharacter.getArchetype(character.archetype);

    // Sanitize user data (Security by Design)
    const safeCharName = escapeHtml(character.name);
    const safeArchetypeName = escapeHtml(archetype?.name || 'Builder');
    const safePortrait = sanitizeNumber(character.portrait);

    gameState.currentScreen = 'welcome';
    gameState.container.innerHTML = `
        <div class="pumparena-rpg welcome-screen">
            <div class="welcome-content">
                <div class="welcome-animation">
                    <div class="character-reveal">
                        <div class="portrait-glow" style="background: linear-gradient(135deg, hsl(${safePortrait * 30}, 70%, 40%), hsl(${safePortrait * 30 + 40}, 70%, 30%));">
                            <span class="portrait-icon-xl">${window.PumpArenaCharacter.getPortraitIcon(safePortrait)}</span>
                        </div>
                    </div>
                </div>

                <h1 class="welcome-title">Welcome, ${safeCharName}</h1>
                <p class="welcome-subtitle">Your journey as a ${safeArchetypeName} begins now.</p>

                <div class="welcome-intro">
                    <p>The crypto ecosystem awaits. Projects need builders like you.</p>
                    <p>Make connections. Build your reputation. Shape the future.</p>
                </div>

                <button class="btn-primary btn-start-journey" id="start-journey-btn">
                    Enter Crypto Valley
                </button>
            </div>
        </div>
    `;

    document.getElementById('start-journey-btn').addEventListener('click', () => {
        showMainGame();
    });
}

function showMainGame() {
    gameState.currentScreen = 'main';

    // Check for daily login bonus
    const dailyCheck = window.PumpArenaState.checkDailyReset();

    // Regenerate influence
    window.PumpArenaState.regenerateInfluence();

    // Render main game UI
    renderMainGameUI();

    // Show daily bonus notification if applicable
    if (dailyCheck.isNewDay) {
        showDailyBonusNotification(dailyCheck);
    }

    // Start first scene if no campaign in progress
    const state = window.PumpArenaState.get();
    if (!state.quests.currentCampaign) {
        showProjectSelection();
    }
}

function renderMainGameUI() {
    const state = window.PumpArenaState.get();
    const character = state.character;
    const progression = state.progression;
    const resources = state.resources;
    const stats = state.stats;
    const archetype = window.PumpArenaCharacter.getArchetype(character.archetype);
    const rank = window.PumpArenaState.getReputationRank();
    const xpForLevel = window.PumpArenaState.getXPForLevel(progression.level);
    const xpProgress = Math.min(100, Math.max(0, (progression.xp / xpForLevel) * 100));

    // ASDF Tier System
    const tier = window.PumpArenaState.getCurrentTier();
    const burnStats = window.PumpArenaState.getBurnStats();

    // Sanitize all user-controllable data (Security by Design)
    const safeTierColor = sanitizeColor(tier.color);
    const safeTierName = escapeHtml(tier.name);
    const safeCharName = escapeHtml(character.name);
    const safeRankName = escapeHtml(rank.name);
    const safeRankColor = sanitizeColor(rank.color || archetype?.color);
    const safeArchetypeColor = sanitizeColor(archetype?.color);
    const safeLevel = sanitizeNumber(progression.level);
    const safePortrait = sanitizeNumber(character.portrait);
    const safeDayCount = sanitizeNumber(state.world.dayCount);
    const safeTimeOfDay = escapeHtml(state.world.timeOfDay);
    const safeLocation = escapeHtml(state.world.currentLocation);
    const safeTotalBurned = sanitizeNumber(burnStats.totalBurned);

    gameState.container.innerHTML = `
        <div class="pumparena-rpg main-game">
            <!-- Top Bar -->
            <div class="game-topbar">
                <div class="topbar-location">
                    <span class="location-icon">&#127968;</span>
                    <span class="location-name">${formatLocationName(safeLocation)}</span>
                </div>
                <!-- ASDF Tier Badge -->
                <div class="topbar-tier" style="background: ${safeTierColor}22; border: 1px solid ${safeTierColor}; padding: 4px 12px; border-radius: 12px;">
                    <span class="tier-icon">&#128293;</span>
                    <span class="tier-name" style="color: ${safeTierColor}; font-weight: bold;">${safeTierName}</span>
                </div>
                <div class="topbar-time">
                    <span class="time-icon">${getTimeIcon(safeTimeOfDay)}</span>
                    <span class="time-text">Day ${safeDayCount} - ${capitalize(safeTimeOfDay)}</span>
                </div>
                <div class="topbar-notifications">
                    <button class="notif-btn" id="events-btn">
                        <span class="notif-icon">&#128276;</span>
                        <span class="notif-badge" id="event-badge" style="display: none;">0</span>
                    </button>
                </div>
                <div class="topbar-menu">
                    <button class="menu-btn" id="menu-btn">&#9881;</button>
                </div>
            </div>

            <!-- Main Layout -->
            <div class="game-layout">
                <!-- Sidebar -->
                <div class="game-sidebar">
                    <div class="sidebar-portrait">
                        <div class="portrait-frame" style="background: linear-gradient(135deg, ${safeTierColor}66, ${safeTierColor}33);">
                            <div class="portrait-avatar" style="background: linear-gradient(135deg, hsl(${safePortrait * 30}, 70%, 40%), hsl(${safePortrait * 30 + 40}, 70%, 30%));">
                                <span class="portrait-icon">${window.PumpArenaCharacter.getPortraitIcon(safePortrait)}</span>
                            </div>
                        </div>
                        <div class="portrait-level">Lv. ${safeLevel}</div>
                    </div>

                    <div class="sidebar-name">${safeCharName}</div>
                    <div class="sidebar-rank" style="color: ${safeRankColor}">${safeRankName}</div>

                    <div class="sidebar-xp">
                        <div class="xp-bar">
                            <div class="xp-fill" style="width: ${xpProgress}%"></div>
                        </div>
                        <span class="xp-text">${formatNumber(progression.xp)} / ${formatNumber(xpForLevel)} XP</span>
                    </div>

                    <div class="sidebar-resources">
                        <div class="resource-item">
                            <span class="resource-icon">&#9889;</span>
                            <span class="resource-value" id="influence-value">${resources.influence}</span>
                            <span class="resource-max">/ ${window.PumpArenaState.getMaxInfluence()}</span>
                            <span class="resource-label">Influence</span>
                        </div>
                        <div class="resource-item">
                            <span class="resource-icon">&#11088;</span>
                            <span class="resource-value">${formatNumber(resources.reputation)}</span>
                            <span class="resource-label">Reputation</span>
                        </div>
                        <div class="resource-item">
                            <span class="resource-icon">&#129689;</span>
                            <span class="resource-value" id="tokens-value">${formatNumber(resources.tokens)}</span>
                            <span class="resource-label">Tokens</span>
                        </div>
                    </div>

                    <!-- ASDF Burn Stats -->
                    <div class="sidebar-burn" style="background: linear-gradient(135deg, #dc262622, #f9731622); padding: 8px; border-radius: 8px; margin-top: 8px;">
                        <div class="burn-header" style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #f97316;">
                            <span>&#128293;</span>
                            <span>Total Burned: ${formatNumber(safeTotalBurned)}</span>
                        </div>
                    </div>

                    <div class="sidebar-divider"></div>

                    <div class="sidebar-actions">
                        <button class="action-btn" id="btn-daily" title="Daily Rewards">
                            <span class="action-icon">&#128293;</span>
                            <span class="action-label">Daily</span>
                        </button>
                        <button class="action-btn" id="btn-quests" title="Quests">
                            <span class="action-icon">&#128203;</span>
                            <span class="action-label">Quests</span>
                        </button>
                        <button class="action-btn" id="btn-minigames" title="Mini-Games">
                            <span class="action-icon">&#127918;</span>
                            <span class="action-label">Games</span>
                        </button>
                        <button class="action-btn" id="btn-burn" title="Burn Tokens" style="background: linear-gradient(135deg, #dc2626, #f97316);">
                            <span class="action-icon">&#128293;</span>
                            <span class="action-label">Burn</span>
                        </button>
                        <button class="action-btn" id="btn-inventory" title="Inventory">
                            <span class="action-icon">&#127890;</span>
                            <span class="action-label">Inventory</span>
                        </button>
                        <button class="action-btn" id="btn-skills" title="Skills">
                            <span class="action-icon">&#127795;</span>
                            <span class="action-label">Skills</span>
                        </button>
                        <button class="action-btn" id="btn-relations" title="Relationships">
                            <span class="action-icon">&#128101;</span>
                            <span class="action-label">Relations</span>
                        </button>
                        <button class="action-btn" id="btn-map" title="Map">
                            <span class="action-icon">&#128506;</span>
                            <span class="action-label">Map</span>
                        </button>
                        <button class="action-btn" id="btn-stats" title="Character Sheet">
                            <span class="action-icon">&#128196;</span>
                            <span class="action-label">Stats</span>
                        </button>
                        <button class="action-btn" id="btn-achievements" title="Achievements">
                            <span class="action-icon">&#127942;</span>
                            <span class="action-label">Achieve</span>
                        </button>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="game-content" id="game-content">
                    <div class="content-placeholder">
                        <p>Select a project to begin your journey...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attach event listeners
    attachMainGameListeners();
}

function attachMainGameListeners() {
    document.getElementById('menu-btn')?.addEventListener('click', showSettingsMenu);
    document.getElementById('btn-daily')?.addEventListener('click', showDailyPopup);
    document.getElementById('btn-quests')?.addEventListener('click', showQuestsPanel);
    document.getElementById('btn-minigames')?.addEventListener('click', showMinigamesPanel);
    document.getElementById('btn-burn')?.addEventListener('click', showBurnPanel);
    document.getElementById('btn-inventory')?.addEventListener('click', showInventoryPanel);
    document.getElementById('btn-skills')?.addEventListener('click', showSkillsPanel);
    document.getElementById('btn-relations')?.addEventListener('click', showRelationsPanel);
    document.getElementById('btn-map')?.addEventListener('click', showMapPanel);
    document.getElementById('btn-stats')?.addEventListener('click', showCharacterSheet);
    document.getElementById('btn-achievements')?.addEventListener('click', showAchievementsPanel);
    document.getElementById('events-btn')?.addEventListener('click', checkAndShowEvent);

    // Listen for tier up events
    document.addEventListener('pumparena:tierup', (e) => {
        showTierUpNotification(e.detail.tier, e.detail.previousTier);
    });

    // Start random event checker
    startEventChecker();
}

// ============================================
// BURN PANEL (ASDF Philosophy)
// ============================================

function showBurnPanel() {
    const state = window.PumpArenaState.get();
    const tier = window.PumpArenaState.getCurrentTier();
    const burnStats = window.PumpArenaState.getBurnStats();
    const tokens = sanitizeNumber(state.resources.tokens);

    // Sanitize tier data (Security by Design)
    const safeTierName = escapeHtml(tier.name);
    const safeTierColor = sanitizeColor(tier.color);
    const safeTierIndex = sanitizeNumber(tier.index);

    // Calculate conversion rates
    const xpRate = 1;  // 1:1 per ASDF philosophy
    const repConversionRate = sanitizeNumber(window.PumpArenaState.getFib(safeTierIndex + 5));  // 5, 8, 13, 21, 34
    const safeTotalBurned = sanitizeNumber(burnStats.totalBurned);

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay burn-modal';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #dc262633, #f9731633); border-bottom: 2px solid #f97316;">
                <h3 style="display: flex; align-items: center; gap: 8px;">
                    <span>&#128293;</span>
                    <span>Token Furnace</span>
                    <span style="background: ${safeTierColor}; padding: 2px 8px; border-radius: 8px; font-size: 11px;">${safeTierName}</span>
                </h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="burn-intro" style="text-align: center; margin-bottom: 20px; padding: 15px; background: #1a1a1a; border-radius: 8px;">
                    <p style="color: #f97316; font-style: italic; margin: 0;">"Burns benefit everyone" - ASDF Philosophy</p>
                    <p style="font-size: 12px; color: #888; margin-top: 8px;">Convert tokens to permanent progress. Every burn counts.</p>
                </div>

                <div class="burn-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="stat-box" style="background: #222; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; color: #f97316;">&#129689;</div>
                        <div style="font-size: 20px; font-weight: bold;" id="burn-tokens-display">${formatNumber(tokens)}</div>
                        <div style="font-size: 11px; color: #888;">Available Tokens</div>
                    </div>
                    <div class="stat-box" style="background: #222; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; color: #dc2626;">&#128293;</div>
                        <div style="font-size: 20px; font-weight: bold;">${formatNumber(safeTotalBurned)}</div>
                        <div style="font-size: 11px; color: #888;">Total Burned</div>
                    </div>
                </div>

                <div class="burn-options">
                    <!-- Burn for XP -->
                    <div class="burn-option" style="background: #1f1f1f; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #333;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <h4 style="margin: 0; color: #22c55e;">&#10024; Burn for XP</h4>
                                <p style="font-size: 11px; color: #888; margin: 4px 0 0;">1 token = 1 XP (identity ratio)</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" id="burn-xp-amount" min="1" max="${tokens}" value="${Math.min(100, tokens)}"
                                style="flex: 1; padding: 8px; background: #333; border: 1px solid #555; border-radius: 4px; color: white;">
                            <button class="btn-primary" id="burn-xp-btn" style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 8px 16px;">
                                Burn &#128293;
                            </button>
                        </div>
                        <div style="font-size: 11px; color: #22c55e; margin-top: 5px;">
                            = <span id="xp-preview">${Math.min(100, tokens)}</span> XP
                        </div>
                    </div>

                    <!-- Burn for Reputation -->
                    <div class="burn-option" style="background: #1f1f1f; padding: 15px; border-radius: 8px; border: 1px solid #333;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <h4 style="margin: 0; color: #fbbf24;">&#11088; Burn for Reputation</h4>
                                <p style="font-size: 11px; color: #888; margin: 4px 0 0;">${repConversionRate} tokens = 1 reputation (${tier.name} rate)</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" id="burn-rep-amount" min="${repConversionRate}" max="${tokens}" value="${Math.max(repConversionRate, Math.min(repConversionRate * 10, tokens))}" step="${repConversionRate}"
                                style="flex: 1; padding: 8px; background: #333; border: 1px solid #555; border-radius: 4px; color: white;">
                            <button class="btn-primary" id="burn-rep-btn" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 8px 16px;">
                                Burn &#128293;
                            </button>
                        </div>
                        <div style="font-size: 11px; color: #fbbf24; margin-top: 5px;">
                            = <span id="rep-preview">${Math.floor(Math.max(repConversionRate, Math.min(repConversionRate * 10, tokens)) / repConversionRate)}</span> Reputation
                        </div>
                    </div>
                </div>

                <div class="burn-philosophy" style="margin-top: 20px; padding: 12px; background: #111; border-radius: 8px; border-left: 3px solid #f97316;">
                    <p style="font-size: 11px; color: #888; margin: 0;">
                        <strong style="color: #f97316;">ASDF Philosophy:</strong> Higher tiers get better reputation conversion rates.
                        Current tier bonus: ${safeTierName} (fib[${safeTierIndex + 5}] = ${repConversionRate} tokens/rep)
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Preview updates
    const xpInput = modal.querySelector('#burn-xp-amount');
    const repInput = modal.querySelector('#burn-rep-amount');
    const xpPreview = modal.querySelector('#xp-preview');
    const repPreview = modal.querySelector('#rep-preview');

    xpInput?.addEventListener('input', () => {
        xpPreview.textContent = formatNumber(parseInt(xpInput.value) || 0);
    });

    repInput?.addEventListener('input', () => {
        repPreview.textContent = Math.floor((parseInt(repInput.value) || 0) / repConversionRate);
    });

    // Burn for XP
    modal.querySelector('#burn-xp-btn')?.addEventListener('click', () => {
        const amount = parseInt(xpInput.value) || 0;
        if (amount <= 0) {
            showNotification('Enter a valid amount', 'warning');
            return;
        }
        const result = window.PumpArenaState.burnTokensForXP(amount);
        if (result.success) {
            showNotification(`Burned ${formatNumber(amount)} tokens for ${formatNumber(result.xpGained)} XP!`, 'success');
            modal.remove();
            renderMainGameUI();
        } else {
            showNotification(result.message, 'error');
        }
    });

    // Burn for Reputation
    modal.querySelector('#burn-rep-btn')?.addEventListener('click', () => {
        const amount = parseInt(repInput.value) || 0;
        if (amount < repConversionRate) {
            showNotification(`Need at least ${repConversionRate} tokens`, 'warning');
            return;
        }
        const result = window.PumpArenaState.burnTokensForReputation(amount);
        if (result.success) {
            showNotification(`Burned ${formatNumber(result.tokensUsed)} tokens for ${result.repGained} reputation!`, 'success');
            modal.remove();
            renderMainGameUI();
        } else {
            showNotification(result.message, 'error');
        }
    });

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showTierUpNotification(newTier, previousTier) {
    // Sanitize inputs (Security by Design)
    const safeNewTierColor = sanitizeColor(newTier?.color);
    const safeNewTierName = escapeHtml(newTier?.name);
    const safePreviousTier = escapeHtml(previousTier);
    const safeMinLevel = sanitizeNumber(newTier?.minLevel);

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay tier-up-modal';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 400px; text-align: center;">
            <div class="modal-body" style="padding: 30px;">
                <div style="font-size: 60px; margin-bottom: 15px;">&#128293;</div>
                <h2 style="color: ${safeNewTierColor}; margin: 0;">TIER UP!</h2>
                <p style="color: #888; margin: 10px 0;">${safePreviousTier} &#8594; ${safeNewTierName}</p>
                <div style="background: ${safeNewTierColor}22; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: ${safeNewTierColor}; font-size: 18px; font-weight: bold; margin: 0;">${safeNewTierName}</p>
                    <p style="font-size: 12px; color: #888; margin: 8px 0 0;">Level ${safeMinLevel}+ unlocked</p>
                </div>
                <p style="font-size: 12px; color: #888;">New benefits: Better XP rates, faster regeneration, improved burn ratios</p>
                <button class="btn-primary" style="margin-top: 15px; background: ${safeNewTierColor};" id="tier-up-close">Awesome!</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#tier-up-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ============================================
// PROJECT SELECTION (Initial Game Flow)
// ============================================

function showProjectSelection() {
    const content = document.getElementById('game-content');
    if (!content) return;

    const projects = [
        {
            id: 'defi',
            name: 'DeFi Builders',
            icon: '&#127974;',
            color: '#3b82f6',
            description: 'Build decentralized finance protocols. Smart contracts, audits, and governance.',
            difficulty: 'Technical',
            campaigns: ['safeyield', 'flashdao', 'stablecore']
        },
        {
            id: 'gamefi',
            name: 'GameFi Creators',
            icon: '&#127918;',
            color: '#a855f7',
            description: 'Create gaming experiences. Play-to-earn, NFTs, and community engagement.',
            difficulty: 'Creative',
            campaigns: ['pixelraiders', 'chainarena', 'lootverse']
        },
        {
            id: 'community',
            name: 'Community Projects',
            icon: '&#129309;',
            color: '#f97316',
            description: 'Grassroots community building. Memes, raids, and organic growth.',
            difficulty: 'Social',
            campaigns: ['basedcollective', 'memelegion', 'alphahunters']
        },
        {
            id: 'infra',
            name: 'Infrastructure',
            icon: '&#9889;',
            color: '#22c55e',
            description: 'Build blockchain backbone. Nodes, tools, and developer infrastructure.',
            difficulty: 'Advanced',
            campaigns: ['nodeforge', 'chaintools', 'validatordao']
        }
    ];

    content.innerHTML = `
        <div class="project-selection">
            <div class="selection-header">
                <h2>Choose Your First Project</h2>
                <p>Each project type offers unique challenges and rewards. Where will you begin?</p>
            </div>

            <div class="projects-grid">
                ${projects.map(p => `
                    <div class="project-card" data-project="${p.id}" style="--project-color: ${p.color}">
                        <div class="project-icon">${p.icon}</div>
                        <h3 class="project-name">${p.name}</h3>
                        <p class="project-desc">${p.description}</p>
                        <div class="project-meta">
                            <span class="difficulty-badge">${p.difficulty}</span>
                        </div>
                        <button class="btn-explore" data-project="${p.id}">Explore</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    content.querySelectorAll('.btn-explore').forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId = btn.dataset.project;
            showBuildersForProject(projectId);
        });
    });
}

function showBuildersForProject(projectId) {
    const content = document.getElementById('game-content');
    if (!content) return;

    // Builder definitions (sample - would be expanded)
    const buildersByProject = {
        defi: [
            {
                id: 'safeyield',
                name: 'SafeYield DAO',
                tagline: 'Security-first DeFi for everyone',
                npc: 'Marcus Chen',
                team: '15 builders',
                community: '2.5K members',
                potential: 0.8
            },
            {
                id: 'flashdao',
                name: 'FlashDAO',
                tagline: 'Democratizing advanced DeFi',
                npc: 'Luna Torres',
                team: '8 builders',
                community: '1.2K members',
                potential: 0.7
            },
            {
                id: 'stablecore',
                name: 'StableCore',
                tagline: 'Stable value for unstable times',
                npc: 'Viktor Petrov',
                team: '12 builders',
                community: '3.1K members',
                potential: 0.85
            }
        ],
        gamefi: [
            {
                id: 'pixelraiders',
                name: 'Pixel Raiders',
                tagline: 'Retro gaming meets modern rewards',
                npc: 'Yuki Tanaka',
                team: '20 builders',
                community: '8.5K members',
                potential: 0.75
            },
            {
                id: 'chainarena',
                name: 'Chain Arena',
                tagline: 'PvP battles on the blockchain',
                npc: 'Alex Storm',
                team: '10 builders',
                community: '4.2K members',
                potential: 0.6
            },
            {
                id: 'lootverse',
                name: 'Lootverse',
                tagline: 'Adventure awaits in every block',
                npc: 'Maya Rivers',
                team: '18 builders',
                community: '6.7K members',
                potential: 0.9
            }
        ],
        community: [
            {
                id: 'basedcollective',
                name: 'Based Collective',
                tagline: 'Culture is the product',
                npc: 'Chad Miller',
                team: '5 core, 50+ contributors',
                community: '15K members',
                potential: 0.65
            },
            {
                id: 'memelegion',
                name: 'Meme Legion',
                tagline: 'Memes are forever',
                npc: 'Pepe Lord',
                team: '3 core, 100+ memelords',
                community: '25K members',
                potential: 0.55
            },
            {
                id: 'alphahunters',
                name: 'Alpha Hunters',
                tagline: 'Find alpha before anyone else',
                npc: 'Cipher',
                team: '7 researchers',
                community: '5K members',
                potential: 0.7
            }
        ],
        infra: [
            {
                id: 'nodeforge',
                name: 'NodeForge',
                tagline: 'Powering the decentralized future',
                npc: 'Dr. Sarah Lin',
                team: '12 engineers',
                community: '1.8K members',
                potential: 0.85
            },
            {
                id: 'chaintools',
                name: 'Chain Tools',
                tagline: 'Developer tools that just work',
                npc: 'Dev Dave',
                team: '8 builders',
                community: '3.2K developers',
                potential: 0.75
            },
            {
                id: 'validatordao',
                name: 'Validator DAO',
                tagline: 'Decentralize everything',
                npc: 'Node Master',
                team: '20 operators',
                community: '2.1K members',
                potential: 0.8
            }
        ]
    };

    const builders = buildersByProject[projectId] || [];
    const projectColors = {
        defi: '#3b82f6',
        gamefi: '#a855f7',
        community: '#f97316',
        infra: '#22c55e'
    };

    content.innerHTML = `
        <div class="builders-selection">
            <div class="selection-header">
                <button class="btn-back" id="back-to-projects">&#8592; Back</button>
                <h2>Choose Your Team</h2>
                <p>Each team has their own vision and needs. Who resonates with you?</p>
            </div>

            <div class="builders-grid">
                ${builders.map(b => `
                    <div class="builder-card" data-builder="${b.id}" style="--builder-color: ${projectColors[projectId]}">
                        <h3 class="builder-name">${b.name}</h3>
                        <p class="builder-tagline">"${b.tagline}"</p>

                        <div class="builder-details">
                            <div class="builder-npc">
                                <span class="detail-label">Lead:</span>
                                <span class="detail-value">${b.npc}</span>
                            </div>
                            <div class="builder-team">
                                <span class="detail-label">Team:</span>
                                <span class="detail-value">${b.team}</span>
                            </div>
                            <div class="builder-community">
                                <span class="detail-label">Community:</span>
                                <span class="detail-value">${b.community}</span>
                            </div>
                        </div>

                        <div class="builder-potential">
                            <span class="potential-label">Potential</span>
                            <div class="potential-bar">
                                <div class="potential-fill" style="width: ${b.potential * 100}%"></div>
                            </div>
                        </div>

                        <button class="btn-join" data-builder="${b.id}" data-project="${projectId}">Join Team</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('back-to-projects').addEventListener('click', showProjectSelection);

    content.querySelectorAll('.btn-join').forEach(btn => {
        btn.addEventListener('click', () => {
            const builderId = btn.dataset.builder;
            const projectType = btn.dataset.project;
            startCampaign(projectType, builderId);
        });
    });
}

function startCampaign(projectType, builderId) {
    const state = window.PumpArenaState.get();

    // Check if this is the first campaign (for tutorial)
    const isFirstCampaign = Object.keys(state.quests.campaignProgress || {}).length === 0;

    // Use the quest system to start the campaign properly
    if (window.PumpArenaQuests) {
        const result = window.PumpArenaQuests.startCampaign(builderId);
        if (!result.success) {
            console.warn('[PumpArena] Failed to start campaign:', result.message);
        }
    } else {
        // Fallback if quest system not loaded
        state.quests.currentCampaign = builderId;
        state.quests.campaignProgress[builderId] = {
            chapter: 1,
            started: Date.now(),
            choices: []
        };
        window.PumpArenaState.save();
    }

    // Show tutorial popup if this is the first project
    if (isFirstCampaign) {
        showQuestTutorial();
    }

    // Show first scene
    showCampaignScene(builderId, 1);
}

function showQuestTutorial() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay tutorial-modal';
    modal.innerHTML = `
        <div class="game-modal-panel tutorial-panel" style="max-width: 400px;">
            <div class="modal-header">
                <h3>&#127919; Welcome to Your First Project!</h3>
            </div>
            <div class="modal-body">
                <div class="tutorial-content">
                    <div class="tutorial-icon">&#128203;</div>
                    <p class="tutorial-text">
                        Your journey has begun! Track your progress and missions in the <strong>Quests</strong> panel.
                    </p>
                    <div class="tutorial-highlight">
                        <div class="tutorial-arrow">&#8592;</div>
                        <div class="tutorial-hint">
                            Click the <strong>Quests</strong> button in the sidebar to see your active missions and objectives.
                        </div>
                    </div>
                    <p class="tutorial-tip">
                        Complete quests to earn XP, tokens, and reputation. Each project has its own storyline!
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary btn-tutorial-close" id="tutorial-close-btn">Got it!</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Highlight the quests button
    const questsBtn = document.getElementById('btn-quests');
    if (questsBtn) {
        questsBtn.classList.add('tutorial-highlight-btn');
    }

    // Close button
    modal.querySelector('#tutorial-close-btn').addEventListener('click', () => {
        modal.remove();
        if (questsBtn) {
            questsBtn.classList.remove('tutorial-highlight-btn');
        }
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (questsBtn) {
                questsBtn.classList.remove('tutorial-highlight-btn');
            }
        }
    });
}

function showCampaignScene(campaignId, chapter) {
    const content = document.getElementById('game-content');
    if (!content) return;

    // Placeholder for campaign content
    // This would be expanded with full narrative system
    content.innerHTML = `
        <div class="campaign-scene">
            <div class="scene-header">
                <span class="chapter-badge">Chapter ${chapter}</span>
            </div>

            <div class="scene-narrative">
                <div class="narrative-box">
                    <p class="narrative-text">
                        You take a deep breath as you approach the ${campaignId} headquarters.
                        The door opens, and a figure emerges...
                    </p>
                    <p class="narrative-text">
                        "So, you're the new builder everyone's been talking about. Let's see what you've got."
                    </p>
                </div>
            </div>

            <div class="scene-choices">
                <button class="choice-btn" data-choice="confident">
                    <span class="choice-icon">&#128170;</span>
                    <span class="choice-text">"I'm ready to prove myself."</span>
                    <span class="choice-hint">Confident approach</span>
                </button>
                <button class="choice-btn" data-choice="humble">
                    <span class="choice-icon">&#128591;</span>
                    <span class="choice-text">"I'm here to learn and contribute."</span>
                    <span class="choice-hint">Humble approach</span>
                </button>
                <button class="choice-btn" data-choice="curious">
                    <span class="choice-icon">&#129300;</span>
                    <span class="choice-text">"Tell me more about the project first."</span>
                    <span class="choice-hint">Curious approach</span>
                </button>
            </div>
        </div>
    `;

    content.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const choice = btn.dataset.choice;
            handleSceneChoice(campaignId, chapter, choice);
        });
    });
}

function handleSceneChoice(campaignId, chapter, choice) {
    const state = window.PumpArenaState.get();

    // Initialize campaign progress if not exists
    if (!state.quests.campaignProgress[campaignId]) {
        state.quests.campaignProgress[campaignId] = {
            currentChapter: 1,
            choices: [],
            started: Date.now()
        };
    }

    // Ensure choices array exists
    if (!state.quests.campaignProgress[campaignId].choices) {
        state.quests.campaignProgress[campaignId].choices = [];
    }

    // Record choice
    state.quests.campaignProgress[campaignId].choices.push({
        chapter,
        choice,
        timestamp: Date.now()
    });

    // Update statistics
    state.statistics.decisionsCount++;

    // Apply rewards based on choice
    const rewards = calculateChoiceRewards(choice);
    window.PumpArenaState.addXP(rewards.xp);
    window.PumpArenaState.addReputation(rewards.reputation);

    // Show result
    showChoiceResult(campaignId, chapter, choice, rewards);
}

function calculateChoiceRewards(choice) {
    // Base rewards - would be more sophisticated in full implementation
    const baseXP = 50;
    const baseRep = 10;

    return {
        xp: baseXP + Math.floor(Math.random() * 30),
        reputation: baseRep + Math.floor(Math.random() * 15)
    };
}

function showChoiceResult(campaignId, chapter, choice, rewards) {
    const content = document.getElementById('game-content');
    if (!content) return;

    content.innerHTML = `
        <div class="choice-result">
            <div class="result-icon">&#10003;</div>
            <h3>Choice Made</h3>

            <div class="rewards-summary">
                <div class="reward-item">
                    <span class="reward-icon">&#10024;</span>
                    <span class="reward-value">+${rewards.xp} XP</span>
                </div>
                <div class="reward-item">
                    <span class="reward-icon">&#11088;</span>
                    <span class="reward-value">+${rewards.reputation} Reputation</span>
                </div>
            </div>

            <button class="btn-primary btn-continue" id="continue-btn">Continue</button>
            <div class="auto-continue-hint">Auto-continue in <span id="countdown">3</span>s</div>
        </div>
    `;

    const continueAction = () => {
        // Refresh UI to show updated stats
        renderMainGameUI();
        // Show active quest if any, otherwise stay on main game
        showActiveQuestInContent();
    };

    document.getElementById('continue-btn').addEventListener('click', continueAction);

    // Auto-continue countdown
    let countdown = 3;
    const countdownEl = document.getElementById('countdown');
    const autoTimer = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(autoTimer);
            continueAction();
        }
    }, 1000);
}

// ============================================
// QUEST GAMEPLAY SYSTEM
// ============================================

function showActiveQuestInContent() {
    const content = document.getElementById('game-content');
    if (!content) return;

    const activeQuests = window.PumpArenaQuests ? window.PumpArenaQuests.getActiveQuests() : [];

    if (activeQuests.length === 0) {
        // Show default content when no active quests
        showDefaultGameContent();
        return;
    }

    const quest = activeQuests[0]; // Show first active quest
    const questType = window.PumpArenaQuests.QUEST_TYPES[quest.type];

    content.innerHTML = `
        <div class="active-quest-view">
            <div class="quest-header-banner" style="--quest-color: ${questType.color}">
                <div class="quest-type-badge">${questType.icon} ${questType.name}</div>
                <h2 class="quest-title">${quest.name}</h2>
                <p class="quest-description">${quest.description}</p>
            </div>

            ${quest.dialogue?.intro ? `
                <div class="quest-narrative">
                    <div class="narrative-box">
                        <p>${quest.dialogue.intro}</p>
                    </div>
                </div>
            ` : ''}

            <div class="quest-objectives-panel">
                <h3>Objectives</h3>
                <div class="objectives-list">
                    ${quest.objectives.map((obj, i) => `
                        <div class="objective-item ${quest.objectiveProgress[i] ? 'completed' : 'active'}" data-index="${i}">
                            <span class="obj-check">${quest.objectiveProgress[i] ? '&#10003;' : '&#9675;'}</span>
                            <span class="obj-text">${obj.description}</span>
                            ${!quest.objectiveProgress[i] ? `
                                <button class="btn-do-objective" data-quest="${quest.id}" data-obj="${i}" data-type="${obj.type}" data-target="${obj.target || ''}" data-game="${obj.game || ''}" data-min="${obj.minScore || obj.min || 0}">
                                    ${getObjectiveButtonText(obj)}
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="quest-rewards-preview">
                <h4>Rewards</h4>
                <div class="rewards-row">
                    ${quest.rewards.xp ? `<span class="reward-badge">&#10024; ${quest.rewards.xp} XP</span>` : ''}
                    ${quest.rewards.tokens ? `<span class="reward-badge">&#128176; ${quest.rewards.tokens}</span>` : ''}
                    ${quest.rewards.reputation ? `<span class="reward-badge">&#11088; ${quest.rewards.reputation}</span>` : ''}
                </div>
            </div>
        </div>
    `;

    // Add objective action handlers
    content.querySelectorAll('.btn-do-objective').forEach(btn => {
        btn.addEventListener('click', () => {
            const questId = btn.dataset.quest;
            const objIndex = parseInt(btn.dataset.obj);
            const objType = btn.dataset.type;
            const target = btn.dataset.target;
            const game = btn.dataset.game;
            const minScore = parseInt(btn.dataset.min) || 0;

            handleObjectiveAction(questId, objIndex, objType, target, game, minScore);
        });
    });
}

function getObjectiveButtonText(obj) {
    switch (obj.type) {
        case 'meet_npc':
        case 'talk_npc':
            return 'Go';
        case 'minigame':
            return 'Play';
        case 'stat_check':
            return 'Check';
        case 'choice':
            return 'Choose';
        case 'resource_check':
            return 'Verify';
        default:
            return 'Do';
    }
}

function handleObjectiveAction(questId, objIndex, objType, target, game, minScore) {
    switch (objType) {
        case 'meet_npc':
        case 'talk_npc':
            showNPCMeetingForQuest(questId, objIndex, target);
            break;
        case 'minigame':
            showMiniGame(game, minScore, (success, score) => {
                if (success) {
                    window.PumpArenaQuests.updateObjective(questId, objIndex, true);
                    showNotification(`Mini-game completed! Score: ${score}`, 'success');
                    showActiveQuestInContent();
                } else {
                    showNotification(`Try again! Need ${minScore} points.`, 'warning');
                }
            });
            break;
        case 'stat_check':
            performStatCheck(questId, objIndex, target, minScore);
            break;
        case 'choice':
            showQuestChoice(questId, objIndex);
            break;
        case 'resource_check':
            performResourceCheck(questId, objIndex, target, minScore);
            break;
        default:
            // Auto-complete unknown objectives
            window.PumpArenaQuests.updateObjective(questId, objIndex, true);
            showActiveQuestInContent();
    }
}

function showNPCMeetingForQuest(questId, objIndex, npcId) {
    if (!window.PumpArenaNPCs) {
        showNotification('NPC system not loaded', 'error');
        return;
    }

    const npc = window.PumpArenaNPCs.getNPC(npcId);
    if (!npc) {
        showNotification('NPC not found', 'error');
        return;
    }

    // Meet the NPC
    const meeting = window.PumpArenaNPCs.meetNPC(npcId);

    // Sanitize NPC data (Security by Design)
    const safeNpcColor = sanitizeColor(npc.color);
    const safeNpcName = escapeHtml(npc.name);
    const safeNpcTitle = escapeHtml(npc.title);
    const safeNpcIcon = escapeHtml(npc.icon);
    const safeDialogue = escapeHtml(meeting.isFirstMeeting ? meeting.dialogue : npc.greeting);

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel npc-meeting-panel" style="max-width: 500px;">
            <div class="npc-meeting-header" style="background: ${safeNpcColor}22; border-bottom: 2px solid ${safeNpcColor};">
                <div class="npc-icon-large">${safeNpcIcon}</div>
                <div class="npc-info">
                    <h3>${safeNpcName}</h3>
                    <p class="npc-title">${safeNpcTitle}</p>
                </div>
            </div>
            <div class="modal-body">
                <div class="npc-dialogue">
                    <p class="dialogue-text">"${safeDialogue}"</p>
                </div>
                <div class="meeting-result">
                    <p>You've met <strong>${safeNpcName}</strong>!</p>
                    ${meeting.isFirstMeeting ? '<p class="first-meeting-bonus">+5 Relationship</p>' : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" id="npc-continue-btn">Continue</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#npc-continue-btn').addEventListener('click', () => {
        modal.remove();
        // Complete the objective
        window.PumpArenaQuests.updateObjective(questId, objIndex, true);
        showNotification(`Met ${safeNpcName}!`, 'success');
        showActiveQuestInContent();
    });
}

function performStatCheck(questId, objIndex, stat, minValue) {
    const state = window.PumpArenaState.get();
    const currentStat = state.stats[stat] || 0;

    if (currentStat >= minValue) {
        window.PumpArenaQuests.updateObjective(questId, objIndex, true);
        showNotification(`Stat check passed! (${stat.toUpperCase()}: ${currentStat}/${minValue})`, 'success');
    } else {
        showNotification(`Need ${stat.toUpperCase()} ${minValue}. You have ${currentStat}.`, 'warning');
    }
    showActiveQuestInContent();
}

function performResourceCheck(questId, objIndex, resource, minValue) {
    const state = window.PumpArenaState.get();
    const current = state.resources[resource] || 0;

    if (current >= minValue) {
        window.PumpArenaQuests.updateObjective(questId, objIndex, true);
        showNotification(`Resource check passed!`, 'success');
    } else {
        showNotification(`Need ${minValue} ${resource}. You have ${current}.`, 'warning');
    }
    showActiveQuestInContent();
}

function showQuestChoice(questId, objIndex) {
    const quest = window.PumpArenaQuests.findQuest(questId);
    if (!quest || !quest.choices) {
        // Auto-complete if no choices defined
        window.PumpArenaQuests.updateObjective(questId, objIndex, true);
        showActiveQuestInContent();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel choice-panel" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Make a Choice</h3>
            </div>
            <div class="modal-body">
                <div class="choices-list">
                    ${quest.choices.map((choice, i) => {
                        const canChoose = !choice.statRequired || checkStatRequirement(choice.statRequired);
                        return `
                            <button class="choice-option ${canChoose ? '' : 'locked'}" data-choice="${i}" ${canChoose ? '' : 'disabled'}>
                                <span class="choice-text">${choice.text}</span>
                                ${choice.statRequired ? `<span class="stat-req ${canChoose ? 'met' : 'unmet'}">${formatStatReq(choice.statRequired)}</span>` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.choice-option:not(.locked)').forEach(btn => {
        btn.addEventListener('click', () => {
            const choiceIndex = parseInt(btn.dataset.choice);
            const choice = quest.choices[choiceIndex];

            modal.remove();

            // Apply outcomes
            if (choice.outcomes) {
                applyChoiceOutcomes(choice.outcomes);
            }

            // Complete objective
            window.PumpArenaQuests.updateObjective(questId, objIndex, true);
            showNotification('Choice made!', 'success');
            showActiveQuestInContent();
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function checkStatRequirement(statReq) {
    const state = window.PumpArenaState.get();
    for (const [stat, min] of Object.entries(statReq)) {
        if ((state.stats[stat] || 0) < min) return false;
    }
    return true;
}

function formatStatReq(statReq) {
    return Object.entries(statReq).map(([stat, min]) => `${stat.toUpperCase()} ${min}`).join(', ');
}

function applyChoiceOutcomes(outcomes) {
    if (outcomes.xpBonus) window.PumpArenaState.addXP(outcomes.xpBonus);
    if (outcomes.tokensBonus) window.PumpArenaState.addTokens(outcomes.tokensBonus);
    if (outcomes.reputationBonus) window.PumpArenaState.addReputation(outcomes.reputationBonus);
    if (outcomes.affinityChange && window.PumpArenaNPCs) {
        for (const [npcId, change] of Object.entries(outcomes.affinityChange)) {
            window.PumpArenaNPCs.changeAffinity(npcId, change);
        }
    }
    if (outcomes.achievement && window.PumpArenaAchievements) {
        window.PumpArenaAchievements.unlockAchievement(outcomes.achievement);
    }
}

function showDefaultGameContent() {
    const content = document.getElementById('game-content');
    if (!content) return;

    const state = window.PumpArenaState.get();

    // Sanitize user data (Security by Design)
    const safeCharName = escapeHtml(state.character.name);

    content.innerHTML = `
        <div class="default-game-content">
            <div class="welcome-section">
                <h2>Welcome, ${safeCharName}!</h2>
                <p>What would you like to do today?</p>
            </div>

            <div class="quick-actions">
                <button class="quick-action-btn" id="btn-explore">
                    <span class="qa-icon">&#127758;</span>
                    <span class="qa-label">Explore Projects</span>
                </button>
                <button class="quick-action-btn" id="btn-relationships">
                    <span class="qa-icon">&#128101;</span>
                    <span class="qa-label">Talk to NPCs</span>
                </button>
                <button class="quick-action-btn" id="btn-daily">
                    <span class="qa-icon">&#128197;</span>
                    <span class="qa-label">Daily Challenges</span>
                </button>
                <button class="quick-action-btn" id="btn-minigames-play">
                    <span class="qa-icon">&#127918;</span>
                    <span class="qa-label">Mini-Games</span>
                </button>
            </div>
        </div>
    `;

    content.querySelector('#btn-explore')?.addEventListener('click', showProjectSelection);
    content.querySelector('#btn-relationships')?.addEventListener('click', showRelationsPanel);
    content.querySelector('#btn-daily')?.addEventListener('click', showDailyPanel);
    content.querySelector('#btn-minigames-play')?.addEventListener('click', showMinigamesPanel);
}

// ============================================
// MINI-GAMES
// ============================================

function showMiniGame(gameType, minScore, callback) {
    switch (gameType) {
        case 'code_sprint':
            showCodeSprintGame(minScore, callback);
            break;
        case 'chart_analysis':
            showChartAnalysisGame(minScore, callback);
            break;
        case 'raid_simulator':
            showRaidSimulatorGame(minScore, callback);
            break;
        case 'shill_quiz':
            showShillQuizGame(minScore, callback);
            break;
        default:
            // Generic minigame
            showGenericMinigame(gameType, minScore, callback);
    }
}

function showCodeSprintGame(minScore, callback) {
    const codeSnippets = [
        'const wallet = await connectWallet();',
        'function transfer(address to, uint amount) external;',
        'mapping(address => uint256) public balances;',
        'require(msg.sender == owner, "Not authorized");',
        'emit Transfer(from, to, amount);',
        'contract Token is ERC20, Ownable {}',
        'bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");',
        'modifier onlyOwner() { require(owner == msg.sender); _; }'
    ];

    let score = 0;
    let currentRound = 0;
    const totalRounds = 5;
    let gameActive = true;
    let startTime;

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay minigame-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel minigame-panel" style="max-width: 600px;">
            <div class="minigame-header">
                <h3>&#128187; Code Sprint</h3>
                <div class="minigame-stats">
                    <span class="score">Score: <span id="mg-score">0</span></span>
                    <span class="round">Round: <span id="mg-round">1</span>/${totalRounds}</span>
                </div>
            </div>
            <div class="minigame-body">
                <p class="minigame-instruction">Type the code below as fast as you can!</p>
                <div class="code-display" id="code-display"></div>
                <input type="text" class="code-input" id="code-input" placeholder="Start typing..." autocomplete="off">
                <div class="typing-feedback" id="typing-feedback"></div>
            </div>
            <div class="minigame-footer">
                <p class="minigame-target">Target: ${minScore} points</p>
                <button class="btn-secondary" id="mg-quit">Quit</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const codeDisplay = modal.querySelector('#code-display');
    const codeInput = modal.querySelector('#code-input');
    const scoreEl = modal.querySelector('#mg-score');
    const roundEl = modal.querySelector('#mg-round');
    const feedbackEl = modal.querySelector('#typing-feedback');

    function startRound() {
        if (currentRound >= totalRounds) {
            endGame();
            return;
        }

        const snippet = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        codeDisplay.textContent = snippet;
        codeInput.value = '';
        codeInput.focus();
        startTime = Date.now();
        currentRound++;
        roundEl.textContent = currentRound;
    }

    function checkInput() {
        const target = codeDisplay.textContent;
        const input = codeInput.value;

        if (input === target) {
            const timeTaken = (Date.now() - startTime) / 1000;
            const roundScore = Math.max(10, Math.floor(100 - timeTaken * 10));
            score += roundScore;
            scoreEl.textContent = score;
            feedbackEl.textContent = `+${roundScore} points!`;
            feedbackEl.className = 'typing-feedback success';

            setTimeout(() => {
                feedbackEl.textContent = '';
                startRound();
            }, 500);
        } else if (!target.startsWith(input)) {
            feedbackEl.textContent = 'Typo! Keep going...';
            feedbackEl.className = 'typing-feedback error';
        } else {
            feedbackEl.textContent = '';
            feedbackEl.className = 'typing-feedback';
        }
    }

    function endGame() {
        gameActive = false;
        const success = score >= minScore;

        modal.querySelector('.minigame-body').innerHTML = `
            <div class="minigame-result ${success ? 'success' : 'failed'}">
                <div class="result-icon">${success ? '&#127942;' : '&#128546;'}</div>
                <h3>${success ? 'Great Job!' : 'Try Again!'}</h3>
                <p class="final-score">Final Score: ${score}</p>
                <p class="score-target">${success ? 'You beat the target!' : `Target: ${minScore}`}</p>
            </div>
        `;

        modal.querySelector('.minigame-footer').innerHTML = `
            <button class="btn-primary" id="mg-done">Done</button>
        `;

        modal.querySelector('#mg-done').addEventListener('click', () => {
            modal.remove();
            callback(success, score);
        });
    }

    codeInput.addEventListener('input', checkInput);
    modal.querySelector('#mg-quit').addEventListener('click', () => {
        modal.remove();
        callback(false, score);
    });

    startRound();
}

function showChartAnalysisGame(minScore, callback) {
    const patterns = [
        { name: 'Double Bottom', emoji: '📈', correct: 'bullish' },
        { name: 'Head and Shoulders', emoji: '📉', correct: 'bearish' },
        { name: 'Cup and Handle', emoji: '☕', correct: 'bullish' },
        { name: 'Rising Wedge', emoji: '📐', correct: 'bearish' },
        { name: 'Bull Flag', emoji: '🚩', correct: 'bullish' },
        { name: 'Descending Triangle', emoji: '🔻', correct: 'bearish' },
        { name: 'Inverse Head & Shoulders', emoji: '🔄', correct: 'bullish' },
        { name: 'Death Cross', emoji: '💀', correct: 'bearish' }
    ];

    let score = 0;
    let currentRound = 0;
    const totalRounds = 6;
    let currentPattern;

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay minigame-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel minigame-panel" style="max-width: 500px;">
            <div class="minigame-header">
                <h3>&#128200; Chart Analysis</h3>
                <div class="minigame-stats">
                    <span class="score">Score: <span id="mg-score">0</span></span>
                    <span class="round">Round: <span id="mg-round">1</span>/${totalRounds}</span>
                </div>
            </div>
            <div class="minigame-body" id="mg-body">
                <p class="minigame-instruction">Is this pattern bullish or bearish?</p>
                <div class="pattern-display" id="pattern-display"></div>
                <div class="choice-buttons">
                    <button class="btn-bullish" data-answer="bullish">📈 Bullish</button>
                    <button class="btn-bearish" data-answer="bearish">📉 Bearish</button>
                </div>
            </div>
            <div class="minigame-footer">
                <p class="minigame-target">Target: ${minScore} points</p>
                <button class="btn-secondary" id="mg-quit">Quit</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const patternDisplay = modal.querySelector('#pattern-display');
    const scoreEl = modal.querySelector('#mg-score');
    const roundEl = modal.querySelector('#mg-round');

    function startRound() {
        if (currentRound >= totalRounds) {
            endGame();
            return;
        }

        currentPattern = patterns[Math.floor(Math.random() * patterns.length)];
        patternDisplay.innerHTML = `
            <div class="pattern-emoji">${currentPattern.emoji}</div>
            <div class="pattern-name">${currentPattern.name}</div>
        `;
        currentRound++;
        roundEl.textContent = currentRound;
    }

    function checkAnswer(answer) {
        const correct = answer === currentPattern.correct;
        if (correct) {
            score += 100;
            scoreEl.textContent = score;
        }

        patternDisplay.innerHTML += `
            <div class="answer-feedback ${correct ? 'correct' : 'wrong'}">
                ${correct ? '✓ Correct!' : '✗ Wrong! It was ' + currentPattern.correct}
            </div>
        `;

        setTimeout(startRound, 1000);
    }

    function endGame() {
        const success = score >= minScore;
        modal.querySelector('#mg-body').innerHTML = `
            <div class="minigame-result ${success ? 'success' : 'failed'}">
                <div class="result-icon">${success ? '&#127942;' : '&#128546;'}</div>
                <h3>${success ? 'Expert Analyst!' : 'Keep Practicing!'}</h3>
                <p class="final-score">Final Score: ${score}</p>
            </div>
        `;
        modal.querySelector('.minigame-footer').innerHTML = `
            <button class="btn-primary" id="mg-done">Done</button>
        `;
        modal.querySelector('#mg-done').addEventListener('click', () => {
            modal.remove();
            callback(success, score);
        });
    }

    modal.querySelectorAll('[data-answer]').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(btn.dataset.answer));
    });
    modal.querySelector('#mg-quit').addEventListener('click', () => {
        modal.remove();
        callback(false, score);
    });

    startRound();
}

function showRaidSimulatorGame(minScore, callback) {
    let score = 0;
    let combo = 0;
    let timeLeft = 30;
    let gameActive = true;

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay minigame-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel minigame-panel" style="max-width: 500px;">
            <div class="minigame-header">
                <h3>&#128165; Raid Simulator</h3>
                <div class="minigame-stats">
                    <span class="score">Score: <span id="mg-score">0</span></span>
                    <span class="time">Time: <span id="mg-time">30</span>s</span>
                    <span class="combo">Combo: <span id="mg-combo">0</span>x</span>
                </div>
            </div>
            <div class="minigame-body">
                <p class="minigame-instruction">Click the targets as they appear!</p>
                <div class="raid-arena" id="raid-arena"></div>
            </div>
            <div class="minigame-footer">
                <p class="minigame-target">Target: ${minScore} points</p>
                <button class="btn-secondary" id="mg-quit">Quit</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const arena = modal.querySelector('#raid-arena');
    const scoreEl = modal.querySelector('#mg-score');
    const timeEl = modal.querySelector('#mg-time');
    const comboEl = modal.querySelector('#mg-combo');

    function spawnTarget() {
        if (!gameActive) return;

        const target = document.createElement('div');
        target.className = 'raid-target';
        target.innerHTML = ['🐦', '💬', '❤️', '🔄', '📢'][Math.floor(Math.random() * 5)];
        target.style.left = Math.random() * 80 + 10 + '%';
        target.style.top = Math.random() * 80 + 10 + '%';

        target.addEventListener('click', () => {
            if (!gameActive) return;
            combo++;
            const points = 10 * (1 + Math.floor(combo / 3));
            score += points;
            scoreEl.textContent = score;
            comboEl.textContent = combo;
            target.remove();
        });

        arena.appendChild(target);

        setTimeout(() => {
            if (target.parentNode) {
                target.remove();
                combo = 0;
                comboEl.textContent = combo;
            }
        }, 1500);
    }

    const spawnInterval = setInterval(() => {
        if (gameActive) spawnTarget();
    }, 600);

    const timerInterval = setInterval(() => {
        timeLeft--;
        timeEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            gameActive = false;
            clearInterval(spawnInterval);
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);

    function endGame() {
        const success = score >= minScore;
        modal.querySelector('.minigame-body').innerHTML = `
            <div class="minigame-result ${success ? 'success' : 'failed'}">
                <div class="result-icon">${success ? '&#127942;' : '&#128546;'}</div>
                <h3>${success ? 'Raid Master!' : 'Try Again!'}</h3>
                <p class="final-score">Final Score: ${score}</p>
            </div>
        `;
        modal.querySelector('.minigame-footer').innerHTML = `
            <button class="btn-primary" id="mg-done">Done</button>
        `;
        modal.querySelector('#mg-done').addEventListener('click', () => {
            modal.remove();
            callback(success, score);
        });
    }

    modal.querySelector('#mg-quit').addEventListener('click', () => {
        gameActive = false;
        clearInterval(spawnInterval);
        clearInterval(timerInterval);
        modal.remove();
        callback(false, score);
    });
}

function showShillQuizGame(minScore, callback) {
    const questions = [
        { q: 'What does "WAGMI" stand for?', a: ["We're All Gonna Make It", "We Are Getting More Income", "Wallet And Gaming Money Index"], correct: 0 },
        { q: 'What is a "rug pull"?', a: ["A floor decoration", "When developers abandon a project with funds", "A trading strategy"], correct: 1 },
        { q: 'What does "HODL" mean?', a: ["Hold On for Dear Life", "High Output Distributed Ledger", "Happy On-chain Data Link"], correct: 0 },
        { q: 'What is "gas" in Ethereum?', a: ["Fuel for cars", "Transaction fee unit", "A type of token"], correct: 1 },
        { q: 'What is a "whale"?', a: ["A marine mammal", "A large holder of crypto", "A blockchain protocol"], correct: 1 },
        { q: 'What does "DYOR" mean?', a: ["Do Your Own Research", "Digital Yield On Return", "Decentralized Yearly Output Rate"], correct: 0 },
        { q: 'What is "alpha" in crypto?', a: ["The first letter", "Early/valuable information", "A type of blockchain"], correct: 1 },
        { q: 'What is a "degen"?', a: ["Degenerate gambler/trader", "Decentralized generator", "Digital engineer"], correct: 0 }
    ];

    let score = 0;
    let currentQ = 0;
    const totalQ = 5;
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, totalQ);

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay minigame-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel minigame-panel" style="max-width: 550px;">
            <div class="minigame-header">
                <h3>&#129504; Crypto Quiz</h3>
                <div class="minigame-stats">
                    <span class="score">Score: <span id="mg-score">0</span></span>
                    <span class="round">Q: <span id="mg-round">1</span>/${totalQ}</span>
                </div>
            </div>
            <div class="minigame-body" id="mg-body"></div>
            <div class="minigame-footer">
                <p class="minigame-target">Target: ${minScore} points</p>
                <button class="btn-secondary" id="mg-quit">Quit</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const body = modal.querySelector('#mg-body');
    const scoreEl = modal.querySelector('#mg-score');
    const roundEl = modal.querySelector('#mg-round');

    function showQuestion() {
        if (currentQ >= totalQ) {
            endGame();
            return;
        }

        const q = shuffled[currentQ];
        body.innerHTML = `
            <div class="quiz-question">
                <p class="question-text">${q.q}</p>
                <div class="quiz-answers">
                    ${q.a.map((ans, i) => `
                        <button class="quiz-answer" data-index="${i}">${ans}</button>
                    `).join('')}
                </div>
            </div>
        `;

        body.querySelectorAll('.quiz-answer').forEach(btn => {
            btn.addEventListener('click', () => checkAnswer(parseInt(btn.dataset.index)));
        });
    }

    function checkAnswer(index) {
        const q = shuffled[currentQ];
        const correct = index === q.correct;

        if (correct) {
            score += 150;
            scoreEl.textContent = score;
        }

        body.querySelectorAll('.quiz-answer').forEach((btn, i) => {
            btn.disabled = true;
            if (i === q.correct) btn.classList.add('correct');
            else if (i === index && !correct) btn.classList.add('wrong');
        });

        currentQ++;
        roundEl.textContent = Math.min(currentQ + 1, totalQ);

        setTimeout(showQuestion, 1200);
    }

    function endGame() {
        const success = score >= minScore;
        body.innerHTML = `
            <div class="minigame-result ${success ? 'success' : 'failed'}">
                <div class="result-icon">${success ? '&#127942;' : '&#128546;'}</div>
                <h3>${success ? 'Quiz Master!' : 'Study More!'}</h3>
                <p class="final-score">Final Score: ${score}</p>
            </div>
        `;
        modal.querySelector('.minigame-footer').innerHTML = `
            <button class="btn-primary" id="mg-done">Done</button>
        `;
        modal.querySelector('#mg-done').addEventListener('click', () => {
            modal.remove();
            callback(success, score);
        });
    }

    modal.querySelector('#mg-quit').addEventListener('click', () => {
        modal.remove();
        callback(false, score);
    });

    showQuestion();
}

function showGenericMinigame(gameType, minScore, callback) {
    // Fallback for undefined minigames
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 400px;">
            <div class="modal-header">
                <h3>&#127918; Mini-Game: ${gameType}</h3>
            </div>
            <div class="modal-body" style="text-align: center; padding: 2rem;">
                <p>Click rapidly to fill the bar!</p>
                <div class="click-bar-container">
                    <div class="click-bar" id="click-bar" style="width: 0%"></div>
                </div>
                <button class="btn-primary btn-large" id="click-btn" style="margin-top: 1rem; padding: 1rem 2rem;">CLICK!</button>
                <p id="click-score" style="margin-top: 1rem;">Score: 0</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    let clickScore = 0;
    const clickBar = modal.querySelector('#click-bar');
    const clickScoreEl = modal.querySelector('#click-score');

    modal.querySelector('#click-btn').addEventListener('click', () => {
        clickScore += 10;
        clickBar.style.width = Math.min(clickScore / minScore * 100, 100) + '%';
        clickScoreEl.textContent = `Score: ${clickScore}`;

        if (clickScore >= minScore) {
            setTimeout(() => {
                modal.remove();
                callback(true, clickScore);
            }, 300);
        }
    });
}

// ============================================
// PANEL PLACEHOLDERS (To be implemented)
// ============================================

/**
 * Settings Menu - ASDF Philosophy Aligned
 * Provides user preferences with Fibonacci-based defaults
 */
function showSettingsMenu() {
    // Load current settings
    const settings = loadSettings();
    const state = window.PumpArenaState.get();
    const tier = window.PumpArenaState.getCurrentTier();

    // Sanitize data (Security by Design)
    const safeTierName = escapeHtml(tier.name);
    const safeTierColor = sanitizeColor(tier.color);
    const safeCharName = escapeHtml(state.character.name || 'Builder');

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay settings-modal';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 550px; max-height: 85vh;">
            <div class="modal-header" style="background: linear-gradient(135deg, #1a1a2e, #16213e);">
                <h3>&#9881; Settings</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y: auto; max-height: 60vh;">
                <!-- Profile Section -->
                <div class="settings-section">
                    <h4 style="color: ${safeTierColor};">&#128100; Profile</h4>
                    <div class="settings-profile" style="display: flex; align-items: center; gap: 15px; padding: 10px; background: #1a1a1a; border-radius: 8px;">
                        <div style="font-size: 32px;">${window.PumpArenaCharacter?.getPortraitIcon(state.character.portrait) || '👤'}</div>
                        <div>
                            <div style="font-weight: bold;">${safeCharName}</div>
                            <div style="font-size: 12px; color: ${safeTierColor};">Tier: ${safeTierName}</div>
                            <div style="font-size: 11px; color: #888;">Level ${sanitizeNumber(state.progression.level)}</div>
                        </div>
                    </div>
                </div>

                <!-- Gameplay Settings -->
                <div class="settings-section" style="margin-top: 20px;">
                    <h4>&#127918; Gameplay</h4>
                    <div class="settings-row">
                        <label>
                            <span>Auto-save Interval</span>
                            <span class="setting-hint">fib[${settings.autoSaveIndex}] = ${getFibForSettings(settings.autoSaveIndex)} seconds</span>
                        </label>
                        <select id="setting-autosave" class="settings-select">
                            <option value="5" ${settings.autoSaveIndex === 5 ? 'selected' : ''}>5 sec (fib[5])</option>
                            <option value="6" ${settings.autoSaveIndex === 6 ? 'selected' : ''}>8 sec (fib[6])</option>
                            <option value="7" ${settings.autoSaveIndex === 7 ? 'selected' : ''}>13 sec (fib[7])</option>
                            <option value="8" ${settings.autoSaveIndex === 8 ? 'selected' : ''}>21 sec (fib[8])</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <label>
                            <span>Show Tutorials</span>
                            <span class="setting-hint">Display helpful hints</span>
                        </label>
                        <input type="checkbox" id="setting-tutorials" class="settings-toggle" ${settings.showTutorials ? 'checked' : ''}>
                    </div>
                    <div class="settings-row">
                        <label>
                            <span>Confirm Burns</span>
                            <span class="setting-hint">Ask before burning tokens</span>
                        </label>
                        <input type="checkbox" id="setting-confirmburns" class="settings-toggle" ${settings.confirmBurns ? 'checked' : ''}>
                    </div>
                </div>

                <!-- Visual Settings -->
                <div class="settings-section" style="margin-top: 20px;">
                    <h4>&#127912; Visuals</h4>
                    <div class="settings-row">
                        <label>
                            <span>Animations</span>
                            <span class="setting-hint">Enable smooth transitions</span>
                        </label>
                        <input type="checkbox" id="setting-animations" class="settings-toggle" ${settings.animations ? 'checked' : ''}>
                    </div>
                    <div class="settings-row">
                        <label>
                            <span>Particle Effects</span>
                            <span class="setting-hint">Show burn particles & effects</span>
                        </label>
                        <input type="checkbox" id="setting-particles" class="settings-toggle" ${settings.particles ? 'checked' : ''}>
                    </div>
                    <div class="settings-row">
                        <label>
                            <span>Compact Mode</span>
                            <span class="setting-hint">Reduce UI spacing</span>
                        </label>
                        <input type="checkbox" id="setting-compact" class="settings-toggle" ${settings.compactMode ? 'checked' : ''}>
                    </div>
                </div>

                <!-- Notification Settings -->
                <div class="settings-section" style="margin-top: 20px;">
                    <h4>&#128276; Notifications</h4>
                    <div class="settings-row">
                        <label>
                            <span>Level Up Alerts</span>
                            <span class="setting-hint">Show popup on level up</span>
                        </label>
                        <input type="checkbox" id="setting-levelup" class="settings-toggle" ${settings.levelUpAlerts ? 'checked' : ''}>
                    </div>
                    <div class="settings-row">
                        <label>
                            <span>Achievement Popups</span>
                            <span class="setting-hint">Show achievement unlocks</span>
                        </label>
                        <input type="checkbox" id="setting-achievements" class="settings-toggle" ${settings.achievementPopups ? 'checked' : ''}>
                    </div>
                    <div class="settings-row">
                        <label>
                            <span>Event Alerts</span>
                            <span class="setting-hint">Notify on random events</span>
                        </label>
                        <input type="checkbox" id="setting-events" class="settings-toggle" ${settings.eventAlerts ? 'checked' : ''}>
                    </div>
                </div>

                <!-- Data Management -->
                <div class="settings-section" style="margin-top: 20px;">
                    <h4>&#128190; Data Management</h4>
                    <div class="settings-buttons">
                        <button class="btn-secondary" id="btn-export-data" style="flex: 1;">
                            &#128229; Export Save
                        </button>
                        <button class="btn-secondary" id="btn-import-data" style="flex: 1;">
                            &#128228; Import Save
                        </button>
                    </div>
                    <div class="settings-buttons" style="margin-top: 10px;">
                        <button class="btn-danger" id="btn-reset-game" style="flex: 1; background: #dc2626;">
                            &#128465; Reset Game
                        </button>
                    </div>
                    <input type="file" id="import-file-input" style="display: none;" accept=".json">
                </div>

                <!-- ASDF Philosophy Info -->
                <div class="settings-section" style="margin-top: 20px; background: linear-gradient(135deg, #f9731622, #dc262622); padding: 15px; border-radius: 8px; border-left: 3px solid #f97316;">
                    <h4 style="color: #f97316;">&#128293; ASDF Philosophy</h4>
                    <p style="font-size: 12px; color: #ccc; margin: 8px 0;">
                        "THIS IS FINE" - All values in Pump Arena are derived from the Fibonacci sequence.
                    </p>
                    <p style="font-size: 11px; color: #888; margin: 0;">
                        Burns benefit everyone. Verify everything. Build for the long term.
                    </p>
                </div>
            </div>
            <div class="modal-footer" style="border-top: 1px solid #333; padding-top: 15px;">
                <button class="btn-secondary" id="btn-settings-cancel">Cancel</button>
                <button class="btn-primary" id="btn-settings-save">Save Settings</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Settings event handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#btn-settings-cancel').addEventListener('click', () => modal.remove());

    // Save settings
    modal.querySelector('#btn-settings-save').addEventListener('click', () => {
        const newSettings = {
            autoSaveIndex: parseInt(modal.querySelector('#setting-autosave').value),
            showTutorials: modal.querySelector('#setting-tutorials').checked,
            confirmBurns: modal.querySelector('#setting-confirmburns').checked,
            animations: modal.querySelector('#setting-animations').checked,
            particles: modal.querySelector('#setting-particles').checked,
            compactMode: modal.querySelector('#setting-compact').checked,
            levelUpAlerts: modal.querySelector('#setting-levelup').checked,
            achievementPopups: modal.querySelector('#setting-achievements').checked,
            eventAlerts: modal.querySelector('#setting-events').checked
        };
        saveSettings(newSettings);
        applySettings(newSettings);
        showNotification('Settings saved!', 'success');
        modal.remove();
    });

    // Export data
    modal.querySelector('#btn-export-data').addEventListener('click', () => {
        exportGameData();
    });

    // Import data
    modal.querySelector('#btn-import-data').addEventListener('click', () => {
        modal.querySelector('#import-file-input').click();
    });

    modal.querySelector('#import-file-input').addEventListener('change', (e) => {
        importGameData(e.target.files[0]);
    });

    // Reset game
    modal.querySelector('#btn-reset-game').addEventListener('click', () => {
        showResetConfirmation(modal);
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Get Fibonacci number for settings
 */
function getFibForSettings(n) {
    const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    return fib[n] || fib[fib.length - 1];
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const defaults = {
        autoSaveIndex: 7,        // fib[7] = 13 seconds
        showTutorials: true,
        confirmBurns: true,
        animations: true,
        particles: true,
        compactMode: false,
        levelUpAlerts: true,
        achievementPopups: true,
        eventAlerts: true
    };

    try {
        const saved = localStorage.getItem('asdf_pumparena_settings');
        if (saved) {
            return { ...defaults, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('[PumpArena] Failed to load settings:', e);
    }
    return defaults;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings) {
    try {
        localStorage.setItem('asdf_pumparena_settings', JSON.stringify(settings));
    } catch (e) {
        console.error('[PumpArena] Failed to save settings:', e);
    }
}

/**
 * Apply settings to the game
 */
function applySettings(settings) {
    // Apply compact mode
    if (settings.compactMode) {
        document.body.classList.add('pumparena-compact');
    } else {
        document.body.classList.remove('pumparena-compact');
    }

    // Apply animations
    if (!settings.animations) {
        document.body.classList.add('pumparena-no-animations');
    } else {
        document.body.classList.remove('pumparena-no-animations');
    }
}

/**
 * Export game data as JSON file
 */
function exportGameData() {
    try {
        const state = window.PumpArenaState.get();
        const settings = loadSettings();
        const exportData = {
            version: GAME_CONFIG.version,
            exportDate: new Date().toISOString(),
            state: state,
            settings: settings
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pumparena_save_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('Save exported successfully!', 'success');
    } catch (e) {
        console.error('[PumpArena] Export failed:', e);
        showNotification('Export failed', 'error');
    }
}

/**
 * Import game data from JSON file
 */
function importGameData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate import data
            if (!data.version || !data.state) {
                showNotification('Invalid save file', 'error');
                return;
            }

            // Confirm import
            if (confirm('This will replace your current save. Are you sure?')) {
                // Import state
                localStorage.setItem('asdf_pumparena_rpg_v2', JSON.stringify(data.state));
                if (data.settings) {
                    localStorage.setItem('asdf_pumparena_settings', JSON.stringify(data.settings));
                }

                showNotification('Save imported! Reloading...', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        } catch (e) {
            console.error('[PumpArena] Import failed:', e);
            showNotification('Import failed: Invalid file', 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Show reset confirmation dialog
 */
function showResetConfirmation(parentModal) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'game-modal-overlay';
    confirmModal.style.zIndex = '10001';
    confirmModal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 400px; text-align: center;">
            <div class="modal-body" style="padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">&#9888;</div>
                <h3 style="color: #dc2626;">Reset Game?</h3>
                <p style="color: #888; margin: 15px 0;">
                    This will permanently delete ALL your progress including:
                </p>
                <ul style="text-align: left; color: #ccc; margin: 10px 0; padding-left: 20px;">
                    <li>Character & Level</li>
                    <li>Tokens & Items</li>
                    <li>Quests & Achievements</li>
                    <li>Relationships & Stats</li>
                </ul>
                <p style="color: #f97316; font-weight: bold; margin-top: 15px;">
                    This action cannot be undone!
                </p>
            </div>
            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: center; padding: 15px;">
                <button class="btn-secondary" id="btn-reset-cancel">Cancel</button>
                <button class="btn-danger" id="btn-reset-confirm" style="background: #dc2626;">
                    &#128293; Reset Everything
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    confirmModal.querySelector('#btn-reset-cancel').addEventListener('click', () => {
        confirmModal.remove();
    });

    confirmModal.querySelector('#btn-reset-confirm').addEventListener('click', () => {
        // Clear all game data
        window.PumpArenaState.reset();
        localStorage.removeItem('asdf_pumparena_settings');
        localStorage.removeItem('asdf_pumparena_daily');

        showNotification('Game reset. Reloading...', 'success');
        setTimeout(() => location.reload(), 1500);
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmModal.remove();
    });
}

function showQuestsPanel() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 650px; max-height: 80vh;">
            <div class="modal-header">
                <h3>&#128203; Active Quests</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="quests-panel-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render quests
    if (window.PumpArenaQuests) {
        window.PumpArenaQuests.renderQuestPanel(modal.querySelector('#quests-panel-content'));
    } else {
        modal.querySelector('#quests-panel-content').innerHTML = '<p>Quest system loading...</p>';
    }

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showInventoryPanel() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 650px; max-height: 85vh;">
            <div class="modal-header">
                <h3>&#127890; Inventory</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="inventory-panel-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render inventory
    if (window.PumpArenaInventory) {
        window.PumpArenaInventory.renderInventoryPanel(modal.querySelector('#inventory-panel-content'));
    } else {
        modal.querySelector('#inventory-panel-content').innerHTML = '<p>Inventory system loading...</p>';
    }

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showAchievementsPanel() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 700px; max-height: 85vh;">
            <div class="modal-header">
                <h3>&#127942; Achievements</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="achievements-panel-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render achievements
    if (window.PumpArenaAchievements) {
        window.PumpArenaAchievements.renderAchievementsPanel(modal.querySelector('#achievements-panel-content'));
    } else {
        modal.querySelector('#achievements-panel-content').innerHTML = '<p>Achievements system loading...</p>';
    }

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showMinigamesPanel() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 700px; max-height: 85vh;">
            <div class="modal-header">
                <h3>&#127918; Mini-Games</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="minigames-panel-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render minigames
    if (window.PumpArenaMinigames) {
        window.PumpArenaMinigames.renderPanel(modal.querySelector('#minigames-panel-content'));
    } else {
        modal.querySelector('#minigames-panel-content').innerHTML = '<p>Mini-games loading...</p>';
    }

    // Listen for game close to refresh
    document.addEventListener('pumparena:minigame-closed', () => {
        if (window.PumpArenaMinigames) {
            window.PumpArenaMinigames.renderPanel(modal.querySelector('#minigames-panel-content'));
        }
        refreshSidebarResources();
    }, { once: true });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showSkillsPanel() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 750px; max-height: 85vh;">
            <div class="modal-header">
                <h3>&#127795; Skill Tree</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="skills-panel-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render skill tree
    if (window.PumpArenaSkillTrees) {
        window.PumpArenaSkillTrees.renderSkillTreePanel(modal.querySelector('#skills-panel-content'));
    } else {
        modal.querySelector('#skills-panel-content').innerHTML = '<p>Skill system loading...</p>';
    }

    // Listen for skill unlocks to refresh UI
    document.addEventListener('pumparena:skill-unlocked', (e) => {
        showNotification(`Skill Unlocked: ${e.detail.skill.name}`, 'success');
        refreshSidebarResources();
    }, { once: true });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showRelationsPanel() {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 650px; max-height: 85vh;">
            <div class="modal-header">
                <h3>&#128101; Relationships</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="relations-panel-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render relationships list
    renderRelationshipsList(modal.querySelector('#relations-panel-content'));

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function renderRelationshipsList(container) {
    if (!window.PumpArenaNPCs) {
        container.innerHTML = '<p>NPC system loading...</p>';
        return;
    }

    const metNPCs = window.PumpArenaNPCs.getMetNPCs();
    const allNPCs = window.PumpArenaNPCs.getAvailableNPCs();

    container.innerHTML = `
        <div class="relationships-panel">
            <div class="panel-section">
                <div class="section-header">
                    <h4>Known Contacts</h4>
                    <span class="count">${metNPCs.length} / ${allNPCs.length}</span>
                </div>

                ${metNPCs.length === 0 ? `
                    <div class="empty-state">
                        <p>You haven't met anyone yet.</p>
                        <p>Explore projects to meet new people!</p>
                    </div>
                ` : `
                    <div class="npc-list">
                        ${metNPCs.map(npc => {
                            const stage = window.PumpArenaNPCs.RELATIONSHIP_STAGES[npc.relationship.stage];
                            return `
                                <div class="npc-list-item" data-npc="${npc.id}" style="--npc-color: ${npc.color}">
                                    <div class="npc-avatar-sm">${npc.icon}</div>
                                    <div class="npc-info-sm">
                                        <div class="npc-name-sm">${npc.name}</div>
                                        <div class="npc-title-xs">${npc.title}</div>
                                    </div>
                                    <div class="npc-affinity-sm">
                                        <div class="affinity-bar-sm" style="--progress: ${npc.relationship.affinity}%; --color: ${stage.color}">
                                            <div class="affinity-fill-sm"></div>
                                        </div>
                                        <span class="stage-label" style="color: ${stage.color}">${stage.name}</span>
                                    </div>
                                    <button class="btn-talk-sm" data-npc="${npc.id}">Talk</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            ${metNPCs.length < allNPCs.length ? `
                <div class="panel-section">
                    <div class="section-header">
                        <h4>Undiscovered</h4>
                    </div>
                    <div class="undiscovered-hint">
                        <p>There are ${allNPCs.length - metNPCs.length} more people to meet in the crypto world...</p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    // Add click handlers for talk buttons
    container.querySelectorAll('.btn-talk-sm').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showNPCConversation(btn.dataset.npc);
        });
    });

    // Add click handlers for NPC items
    container.querySelectorAll('.npc-list-item').forEach(item => {
        item.addEventListener('click', () => {
            showNPCConversation(item.dataset.npc);
        });
    });
}

function showNPCConversation(npcId) {
    const npc = window.PumpArenaNPCs.getNPC(npcId);
    if (!npc) return;

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 550px; max-height: 85vh;">
            <div class="modal-header" style="border-bottom-color: ${npc.color}33;">
                <h3>${npc.icon} ${npc.name}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="npc-conversation-content" style="overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Render full NPC panel
    window.PumpArenaNPCs.renderFullNPCPanel(modal.querySelector('#npc-conversation-content'), npcId);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

/**
 * World Map System - ASDF Philosophy Aligned
 * Locations unlock based on level and tier progression
 * Travel costs based on Fibonacci sequence
 */

// Location definitions with Fibonacci-based requirements
const WORLD_LOCATIONS = {
    crypto_valley: {
        id: 'crypto_valley',
        name: 'Crypto Valley',
        icon: '&#127968;',
        description: 'The starting hub. A bustling town of builders, dreamers, and degens.',
        region: 'central',
        unlockLevel: 1,          // Always unlocked
        travelCost: 0,           // Home base
        bonuses: { xpMultiplier: 1.0 },
        npcs: ['marcus', 'sarah'],
        quests: ['safeyield'],
        color: '#22c55e'
    },
    defi_district: {
        id: 'defi_district',
        name: 'DeFi District',
        icon: '&#127974;',
        description: 'Where protocols are born. Smart contracts hum with activity.',
        region: 'east',
        unlockLevel: 5,          // fib[5] = 5
        travelCost: 8,           // fib[6] = 8 influence
        bonuses: { xpMultiplier: 1.1, devBonus: 2 },
        npcs: ['luna', 'viktor'],
        quests: ['flashdao', 'stablecore'],
        color: '#3b82f6'
    },
    nft_gallery: {
        id: 'nft_gallery',
        name: 'NFT Gallery',
        icon: '&#127912;',
        description: 'Art meets blockchain. Creators showcase their masterpieces.',
        region: 'west',
        unlockLevel: 8,          // fib[6] = 8
        travelCost: 13,          // fib[7] = 13 influence
        bonuses: { xpMultiplier: 1.1, mktBonus: 2 },
        npcs: ['maya', 'alex'],
        quests: ['pixelraiders', 'lootverse'],
        color: '#a855f7'
    },
    meme_arcade: {
        id: 'meme_arcade',
        name: 'Meme Arcade',
        icon: '&#127918;',
        description: 'Where viral moments are born. Chaos reigns supreme.',
        region: 'south',
        unlockLevel: 13,         // fib[7] = 13
        travelCost: 21,          // fib[8] = 21 influence
        bonuses: { xpMultiplier: 1.15, chaBonus: 3, lckBonus: 2 },
        npcs: ['chad', 'pepe'],
        quests: ['basedcollective', 'memelegion'],
        color: '#f97316'
    },
    alpha_lounge: {
        id: 'alpha_lounge',
        name: 'Alpha Lounge',
        icon: '&#128373;',
        description: 'Exclusive intel flows here. Only the worthy enter.',
        region: 'north',
        unlockLevel: 21,         // fib[8] = 21
        travelCost: 34,          // fib[9] = 34 influence
        bonuses: { xpMultiplier: 1.2, strBonus: 3 },
        npcs: ['cipher', 'oracle'],
        quests: ['alphahunters'],
        color: '#eab308',
        requiresTier: 'SPARK'    // Requires SPARK tier
    },
    whale_waters: {
        id: 'whale_waters',
        name: 'Whale Waters',
        icon: '&#128011;',
        description: 'Deep liquidity pools. Where the big players swim.',
        region: 'deep',
        unlockLevel: 34,         // fib[9] = 34
        travelCost: 55,          // fib[10] = 55 influence
        bonuses: { xpMultiplier: 1.25, tokenBonus: 0.1 },
        npcs: ['whale', 'anchor'],
        quests: [],
        color: '#06b6d4',
        requiresTier: 'FLAME'    // Requires FLAME tier
    },
    validator_citadel: {
        id: 'validator_citadel',
        name: 'Validator Citadel',
        icon: '&#127983;',
        description: 'The backbone of consensus. Infrastructure legends gather here.',
        region: 'heights',
        unlockLevel: 55,         // fib[10] = 55 (max level cap)
        travelCost: 89,          // fib[11] = 89 influence
        bonuses: { xpMultiplier: 1.3, allStatsBonus: 1 },
        npcs: ['dr_lin', 'node_master'],
        quests: ['nodeforge', 'validatordao'],
        color: '#dc2626',
        requiresTier: 'BLAZE'    // Requires BLAZE tier
    }
};

function showMapPanel() {
    const state = window.PumpArenaState.get();
    const currentLocation = state.world.currentLocation;
    const unlockedLocations = state.world.unlockedLocations || ['crypto_valley'];
    const playerLevel = state.progression.level;
    const playerTier = window.PumpArenaState.getCurrentTier();
    const influence = state.resources.influence;

    // Check which locations are unlocked/accessible
    const locationStatuses = {};
    Object.entries(WORLD_LOCATIONS).forEach(([id, loc]) => {
        const levelUnlocked = playerLevel >= loc.unlockLevel;
        const tierUnlocked = !loc.requiresTier || getTierIndex(playerTier.name) >= getTierIndex(loc.requiresTier);
        const isUnlocked = levelUnlocked && tierUnlocked;
        const canTravel = isUnlocked && influence >= loc.travelCost && id !== currentLocation;
        const isDiscovered = unlockedLocations.includes(id) || isUnlocked;

        locationStatuses[id] = {
            isUnlocked,
            canTravel,
            isDiscovered,
            isCurrent: id === currentLocation,
            levelNeeded: loc.unlockLevel,
            tierNeeded: loc.requiresTier
        };
    });

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay map-modal';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 800px; max-height: 90vh;">
            <div class="modal-header" style="background: linear-gradient(135deg, #0f172a, #1e293b);">
                <h3>&#128506; World Map</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0; overflow: hidden;">
                <!-- Current Location Info -->
                <div class="map-current-location" style="padding: 15px; background: ${sanitizeColor(WORLD_LOCATIONS[currentLocation]?.color || '#333')}22; border-bottom: 2px solid ${sanitizeColor(WORLD_LOCATIONS[currentLocation]?.color || '#333')};">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">${WORLD_LOCATIONS[currentLocation]?.icon || '&#127968;'}</span>
                        <div>
                            <div style="font-weight: bold; font-size: 16px;">Currently at: ${escapeHtml(WORLD_LOCATIONS[currentLocation]?.name || 'Unknown')}</div>
                            <div style="font-size: 12px; color: #888;">Influence: ${influence} ⚡</div>
                        </div>
                    </div>
                </div>

                <!-- Map Grid -->
                <div class="map-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 20px; max-height: 55vh; overflow-y: auto;">
                    ${Object.entries(WORLD_LOCATIONS).map(([id, loc]) => {
                        const status = locationStatuses[id];
                        const safeColor = sanitizeColor(loc.color);
                        const safeName = escapeHtml(loc.name);
                        const safeDesc = escapeHtml(loc.description);

                        if (!status.isDiscovered) {
                            return `
                                <div class="map-location locked" style="background: #1a1a1a; border: 2px dashed #333; padding: 15px; border-radius: 12px; opacity: 0.5;">
                                    <div style="font-size: 32px; text-align: center; filter: blur(3px);">&#10067;</div>
                                    <div style="text-align: center; color: #666; margin-top: 10px;">
                                        <div>???</div>
                                        <div style="font-size: 11px;">Level ${loc.unlockLevel} to discover</div>
                                    </div>
                                </div>
                            `;
                        }

                        return `
                            <div class="map-location ${status.isCurrent ? 'current' : ''} ${status.isUnlocked ? 'unlocked' : 'locked'}"
                                 data-location="${id}"
                                 style="background: ${status.isUnlocked ? safeColor + '22' : '#1a1a1a'};
                                        border: 2px solid ${status.isCurrent ? safeColor : (status.isUnlocked ? safeColor + '66' : '#333')};
                                        padding: 15px; border-radius: 12px; cursor: ${status.canTravel ? 'pointer' : 'default'};
                                        transition: all 0.2s ease;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <span style="font-size: 28px;">${loc.icon}</span>
                                    ${status.isCurrent ? '<span style="background: ' + safeColor + '; padding: 2px 8px; border-radius: 8px; font-size: 10px;">HERE</span>' : ''}
                                </div>
                                <div style="font-weight: bold; margin-top: 8px; color: ${status.isUnlocked ? safeColor : '#666'};">${safeName}</div>
                                <div style="font-size: 11px; color: #888; margin-top: 5px; line-height: 1.4;">${safeDesc}</div>

                                ${status.isUnlocked ? `
                                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${safeColor}33;">
                                        <div style="font-size: 10px; color: #888;">Bonuses:</div>
                                        <div style="font-size: 11px; color: ${safeColor};">
                                            ${loc.bonuses.xpMultiplier > 1 ? `+${Math.round((loc.bonuses.xpMultiplier - 1) * 100)}% XP` : ''}
                                            ${loc.bonuses.devBonus ? ` +${loc.bonuses.devBonus} DEV` : ''}
                                            ${loc.bonuses.mktBonus ? ` +${loc.bonuses.mktBonus} MKT` : ''}
                                            ${loc.bonuses.chaBonus ? ` +${loc.bonuses.chaBonus} CHA` : ''}
                                            ${loc.bonuses.strBonus ? ` +${loc.bonuses.strBonus} STR` : ''}
                                            ${loc.bonuses.lckBonus ? ` +${loc.bonuses.lckBonus} LCK` : ''}
                                            ${loc.bonuses.tokenBonus ? ` +${Math.round(loc.bonuses.tokenBonus * 100)}% Tokens` : ''}
                                            ${loc.bonuses.allStatsBonus ? ` +${loc.bonuses.allStatsBonus} All Stats` : ''}
                                        </div>
                                    </div>
                                    ${!status.isCurrent ? `
                                        <button class="btn-travel ${status.canTravel ? 'btn-primary' : 'btn-disabled'}"
                                                data-location="${id}"
                                                ${status.canTravel ? '' : 'disabled'}
                                                style="width: 100%; margin-top: 10px; padding: 8px; font-size: 12px;">
                                            ${status.canTravel ? `Travel (${loc.travelCost} ⚡)` : (influence < loc.travelCost ? `Need ${loc.travelCost} ⚡` : 'Current')}
                                        </button>
                                    ` : ''}
                                ` : `
                                    <div style="margin-top: 10px; padding: 8px; background: #222; border-radius: 6px; font-size: 11px; color: #888; text-align: center;">
                                        &#128274; Requires Level ${loc.unlockLevel}
                                        ${loc.requiresTier ? `<br>+ ${loc.requiresTier} Tier` : ''}
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Map Legend -->
                <div class="map-legend" style="padding: 15px; background: #111; border-top: 1px solid #333;">
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 11px; color: #888;">
                        <div>&#128293; Travel costs Influence (Fibonacci-based)</div>
                        <div>&#10024; Higher regions = better XP bonuses</div>
                        <div>&#128274; Some locations require specific Tiers</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Travel button handlers
    modal.querySelectorAll('.btn-travel:not([disabled])').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const locationId = btn.dataset.location;
            travelToLocation(locationId, modal);
        });
    });

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Get tier index for comparison
 */
function getTierIndex(tierName) {
    const tiers = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'];
    return tiers.indexOf(tierName);
}

/**
 * Travel to a new location
 */
function travelToLocation(locationId, modal) {
    const location = WORLD_LOCATIONS[locationId];
    if (!location) return;

    const state = window.PumpArenaState.get();

    // Check if can afford travel
    if (state.resources.influence < location.travelCost) {
        showNotification(`Not enough Influence! Need ${location.travelCost}`, 'error');
        return;
    }

    // Rate limit check
    const rateCheck = window.PumpArenaState.RateLimiter?.checkAction('relationship') || { allowed: true };
    if (!rateCheck.allowed) {
        showNotification(rateCheck.message, 'warning');
        return;
    }

    // Deduct travel cost
    window.PumpArenaState.spendInfluence(location.travelCost);
    window.PumpArenaState.RateLimiter?.recordAction('relationship');

    // Update location
    state.world.currentLocation = locationId;

    // Add to unlocked locations if not already
    if (!state.world.unlockedLocations) {
        state.world.unlockedLocations = ['crypto_valley'];
    }
    if (!state.world.unlockedLocations.includes(locationId)) {
        state.world.unlockedLocations.push(locationId);
    }

    // Apply location bonuses to active session
    applyLocationBonuses(location);

    // Save state
    window.PumpArenaState.save();

    // Show travel animation/notification
    showTravelAnimation(location, () => {
        modal.remove();
        renderMainGameUI();
        showNotification(`Welcome to ${location.name}!`, 'success');
    });
}

/**
 * Apply location bonuses
 */
function applyLocationBonuses(location) {
    // Store active location bonuses in session
    if (typeof window.activeLocationBonuses === 'undefined') {
        window.activeLocationBonuses = {};
    }
    window.activeLocationBonuses = location.bonuses || {};
}

/**
 * Show travel animation
 */
function showTravelAnimation(location, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'travel-overlay';
    overlay.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10000;">
            <div style="font-size: 64px; animation: pulse 0.5s ease-in-out infinite alternate;">${location.icon}</div>
            <div style="font-size: 24px; color: ${sanitizeColor(location.color)}; margin-top: 20px;">Traveling to...</div>
            <div style="font-size: 32px; font-weight: bold; color: white; margin-top: 10px;">${escapeHtml(location.name)}</div>
        </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.remove();
        if (callback) callback();
    }, 1500);
}

function showCharacterSheet() {
    const state = window.PumpArenaState.get();
    const stats = state.stats;

    showModal('Character Sheet', `
        <div class="character-sheet">
            <div class="stats-detail">
                <div class="stat-row"><span>Development:</span> <span>${stats.dev}</span></div>
                <div class="stat-row"><span>Community:</span> <span>${stats.com}</span></div>
                <div class="stat-row"><span>Marketing:</span> <span>${stats.mkt}</span></div>
                <div class="stat-row"><span>Strategy:</span> <span>${stats.str}</span></div>
                <div class="stat-row"><span>Charisma:</span> <span>${stats.cha}</span></div>
                <div class="stat-row"><span>Luck:</span> <span>${stats.lck}</span></div>
            </div>
        </div>
    `);
}

// ============================================
// NOTIFICATIONS
// ============================================

function showLevelUpNotification(level) {
    showNotification(`Level Up! You are now level ${level}`, 'success');
}

function showDailyBonusNotification(dailyCheck) {
    showNotification(`Daily Login Bonus: +${dailyCheck.bonus} Tokens! Streak: ${dailyCheck.streak} days`, 'info');
}

function showDailyPopup() {
    if (!window.PumpArenaDaily) return;

    const dailyState = window.PumpArenaDaily.getState();
    const todayReward = window.PumpArenaDaily.getTodayReward();
    const upcomingRewards = window.PumpArenaDaily.getNextRewards(7);

    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay daily-modal';
    modal.innerHTML = `
        <div class="game-modal-panel" style="max-width: 450px;">
            <div class="modal-header">
                <h3>&#128293; Daily Rewards</h3>
                <button class="modal-close" id="close-daily-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="daily-panel">
                    <div class="daily-header">
                        <div class="streak-display">
                            <span class="streak-icon">&#128293;</span>
                            <span class="streak-count">${dailyState.streak || 1}</span>
                            <span class="streak-label">day streak</span>
                        </div>
                    </div>

                    <div class="daily-reward-main ${dailyState.todayClaimed ? 'claimed' : ''}">
                        <div class="reward-day">Day ${dailyState.streak || 1}</div>
                        <div class="reward-icon">${getRewardIcon(todayReward.type)}</div>
                        <div class="reward-label">${todayReward.label}</div>
                        ${todayReward.special ? '<div class="reward-special">SPECIAL!</div>' : ''}
                        <button class="btn-claim ${dailyState.todayClaimed ? 'claimed' : ''}" id="claim-daily-popup-btn">
                            ${dailyState.todayClaimed ? '✓ Claimed' : 'Claim Reward'}
                        </button>
                    </div>

                    <div class="daily-calendar">
                        <h4>Upcoming Rewards</h4>
                        <div class="reward-timeline">
                            ${upcomingRewards.slice(1, 7).map(r => `
                                <div class="reward-future ${r.special ? 'special' : ''}">
                                    <div class="reward-day-small">Day ${r.day}</div>
                                    <div class="reward-icon-small">${getRewardIcon(r.type)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button
    modal.querySelector('#close-daily-modal').addEventListener('click', () => {
        modal.remove();
    });

    // Claim button
    const claimBtn = modal.querySelector('#claim-daily-popup-btn');
    if (claimBtn && !dailyState.todayClaimed) {
        claimBtn.addEventListener('click', () => {
            const result = window.PumpArenaDaily.claimReward();
            if (result.success) {
                showNotification(result.message, 'success');
                modal.remove();
                // Refresh sidebar resources
                refreshSidebarResources();
            }
        });
    }

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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

function refreshSidebarResources() {
    const state = window.PumpArenaState.get();
    const influenceEl = document.getElementById('influence-value');
    if (influenceEl) {
        influenceEl.textContent = state.resources.influence;
    }
    // Refresh other elements if needed
}

// ============================================
// RANDOM EVENTS SYSTEM
// ============================================

let eventCheckInterval = null;

function startEventChecker() {
    // Check for random events every 30 seconds
    if (eventCheckInterval) clearInterval(eventCheckInterval);

    eventCheckInterval = setInterval(() => {
        if (gameState.isPaused || gameState.currentScreen !== 'main') return;
        if (window.PumpArenaEvents?.getActiveEvent()) return;

        const event = window.PumpArenaEvents?.checkForRandomEvent();
        if (event) {
            triggerRandomEvent(event);
        }
    }, 30000);

    // Also check once shortly after game loads
    setTimeout(() => {
        if (gameState.currentScreen === 'main' && !window.PumpArenaEvents?.getActiveEvent()) {
            const event = window.PumpArenaEvents?.checkForRandomEvent();
            if (event) {
                triggerRandomEvent(event);
            }
        }
    }, 10000);
}

function triggerRandomEvent(event) {
    if (!window.PumpArenaEvents) return;

    const result = window.PumpArenaEvents.triggerEvent(event.id);
    if (result.success) {
        // Show event notification badge
        updateEventBadge(1);
        showNotification(`${event.name} - Check your notifications!`, 'warning');
    }
}

function checkAndShowEvent() {
    if (!window.PumpArenaEvents) {
        showNotification('No active events', 'info');
        return;
    }

    const activeEvent = window.PumpArenaEvents.getActiveEvent();
    if (activeEvent) {
        showEventPopup(activeEvent);
    } else {
        // Try to trigger a new event
        const event = window.PumpArenaEvents.checkForRandomEvent();
        if (event) {
            triggerRandomEvent(event);
            setTimeout(() => {
                const newEvent = window.PumpArenaEvents.getActiveEvent();
                if (newEvent) showEventPopup(newEvent);
            }, 100);
        } else {
            showNotification('No events right now. Keep playing!', 'info');
        }
    }
}

function showEventPopup(event) {
    const overlay = document.createElement('div');
    overlay.className = 'game-modal-overlay event-overlay';

    window.PumpArenaEvents.renderEventPopup(overlay);

    document.body.appendChild(overlay);

    // Update badge
    updateEventBadge(0);

    // Listen for resolution
    document.addEventListener('pumparena:event-resolved', (e) => {
        overlay.innerHTML = '';
        window.PumpArenaEvents.showEventResult(overlay, e.detail.choice.id, e.detail);

        // Refresh resources
        setTimeout(() => {
            refreshSidebarResources();
            renderMainGameUI();
        }, 500);
    }, { once: true });

    overlay.addEventListener('click', (e) => {
        // Don't close on popup content click, only on overlay
        if (e.target === overlay && !window.PumpArenaEvents.getActiveEvent()) {
            overlay.remove();
        }
    });
}

function updateEventBadge(count) {
    const badge = document.getElementById('event-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `game-notification notif-${type}`;
    // SECURITY: Use textContent instead of innerHTML for defense in depth
    const span = document.createElement('span');
    span.textContent = message;
    notif.appendChild(span);

    document.body.appendChild(notif);

    setTimeout(() => {
        notif.classList.add('fade-out');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'game-modal-overlay';
    modal.innerHTML = `
        <div class="game-modal-panel">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&#10005;</button>
            </div>
            <div class="modal-body">${content}</div>
        </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatLocationName(location) {
    return location.split('_').map(capitalize).join(' ');
}

function getTimeIcon(timeOfDay) {
    const icons = {
        morning: '&#127749;',
        afternoon: '&#9728;',
        evening: '&#127751;',
        night: '&#127769;'
    };
    return icons[timeOfDay] || '&#9728;';
}

// ============================================
// PUBLIC API
// ============================================

function closePumpArenaRPG() {
    window.PumpArenaState.endSession();
    gameState.initialized = false;
    if (gameState.container) {
        gameState.container.innerHTML = '';
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PumpArenaRPG = {
        init: initPumpArenaRPG,
        close: closePumpArenaRPG,
        getState: () => gameState,
        showProjectSelection,
        showNotification,
        showModal,
        CONFIG: GAME_CONFIG
    };
}
