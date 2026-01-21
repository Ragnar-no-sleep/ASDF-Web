/**
 * ASDF Games - UI Components
 * Grid, leaderboard, modals
 */

'use strict';

// ============================================
// ROTATION SYSTEM
// ============================================

function getCurrentWeekIndex() {
    const now = Date.now();
    const epochMs = CONFIG.ROTATION_EPOCH.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceEpoch = Math.floor((now - epochMs) / weekMs);
    return weeksSinceEpoch % CONFIG.CYCLE_WEEKS;
}

function getCurrentGame() {
    return GAMES[getCurrentWeekIndex()];
}

function getNextRotationTime() {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    return nextMonday;
}

function updateCountdown() {
    const now = Date.now();
    const target = getNextRotationTime().getTime();
    const diff = Math.max(0, target - now);

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((diff % (60 * 1000)) / 1000);

    document.getElementById('countdown-days').textContent = days;
    document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('countdown-mins').textContent = mins.toString().padStart(2, '0');
    document.getElementById('countdown-secs').textContent = secs.toString().padStart(2, '0');
}

// ============================================
// GAMES GRID
// ============================================

function renderGamesGrid() {
    const grid = document.getElementById('games-grid');
    const currentGame = getCurrentGame();

    grid.innerHTML = GAMES.map(game => {
        const isFeatured = game.id === currentGame.id;
        // All games accessible - no holder restriction
        const isLocked = false;
        const highScore = appState.practiceScores[game.id] || 0;

        return `
            <div class="game-card ${isFeatured ? 'featured' : ''}" data-game="${game.id}" data-action="open-game" style="cursor: pointer;">
                <div class="game-icon">${game.icon}</div>
                <h3 class="game-name">${escapeHtml(game.name)}</h3>
                <p class="game-type">${escapeHtml(game.type)}</p>
                <div class="game-highscore">
                    Best: ${highScore}
                </div>
                <button class="btn game-play-btn" data-action="open-game" data-game="${game.id}">
                    Play
                </button>
            </div>
        `;
    }).join('');
}

function updateFeaturedGame() {
    const game = getCurrentGame();
    document.getElementById('featured-game-icon').textContent = game.icon;
    document.getElementById('featured-game-name').textContent = game.name;
    document.getElementById('featured-game-desc').textContent = game.description;
}

// ============================================
// LEADERBOARD
// ============================================

async function renderLeaderboards() {
    const currentGame = getCurrentGame();

    const weeklyEl = document.getElementById('weekly-leaderboard');
    const cycleEl = document.getElementById('cycle-leaderboard');

    if (weeklyEl) weeklyEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
    if (cycleEl) cycleEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

    try {
        const [weeklyResponse, cycleResponse] = await Promise.all([
            ApiClient.getWeeklyLeaderboard(currentGame.id, 10).catch(() => ({ leaderboard: [] })),
            ApiClient.getCycleLeaderboard(10).catch(() => ({ leaderboard: [] }))
        ]);

        const weeklyData = weeklyResponse.leaderboard || [];
        const cycleData = cycleResponse.leaderboard || [];

        if (weeklyEl) {
            weeklyEl.innerHTML = weeklyData.length > 0
                ? renderWeeklyLeaderboard(weeklyData)
                : '<div class="leaderboard-empty">No scores yet this week. Be the first!</div>';
        }

        if (cycleEl) {
            cycleEl.innerHTML = cycleData.length > 0
                ? renderCycleLeaderboard(cycleData)
                : '<div class="leaderboard-empty">No reward slots earned yet.</div>';
        }
    } catch (error) {
        console.error('Failed to load leaderboards:', error);

        const mockWeeklyData = [{ rank: 1, player: 'Connect to see...', score: 0 }];
        const mockCycleData = [{ rank: 1, player: 'Connect to see...', slots: 0 }];

        if (weeklyEl) weeklyEl.innerHTML = renderWeeklyLeaderboard(mockWeeklyData);
        if (cycleEl) cycleEl.innerHTML = renderCycleLeaderboard(mockCycleData);
    }
}

function renderWeeklyLeaderboard(data) {
    return data.map(entry => {
        // Validate numeric values from API (defense-in-depth)
        const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
        const score = Number.isFinite(entry.score) ? Math.floor(entry.score) : 0;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const isYou = appState.wallet && typeof entry.player === 'string' && entry.player.includes(appState.wallet.slice(0, 4));
        const slots = REWARD_SLOTS[rank] || 0;
        const slotBadge = slots > 0 ? `<span style="color: var(--gold); font-size: 11px; margin-left: 8px;">+${slots} slots</span>` : '';

        return `
            <div class="leaderboard-item ${isYou ? 'you' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player" style="flex: 1;">
                    ${isYou ? ' You' : escapeHtml(String(entry.player || ''))}
                    ${slotBadge}
                </div>
                <div class="leaderboard-score">${score.toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

function renderCycleLeaderboard(data) {
    return data.map(entry => {
        // Validate numeric values from API (defense-in-depth)
        const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
        const slots = Number.isFinite(entry.slots) ? Math.floor(entry.slots) : 0;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const isYou = appState.wallet && typeof entry.player === 'string' && entry.player.includes(appState.wallet.slice(0, 4));

        return `
            <div class="leaderboard-item ${isYou ? 'you' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player">${isYou ? ' You' : escapeHtml(String(entry.player || ''))}</div>
                <div class="leaderboard-score" style="color: var(--gold);">${slots} slots</div>
            </div>
        `;
    }).join('');
}

/**
 * Switch between leaderboard tabs (weekly/cycle)
 */
function switchLeaderboardTab(period) {
    // Update tab buttons
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.period === period);
    });

    // Show/hide leaderboard lists
    document.querySelectorAll('.leaderboard-list').forEach(list => {
        list.classList.remove('active');
    });

    const activeList = document.getElementById(`${period}-leaderboard`);
    if (activeList) {
        activeList.classList.add('active');
    }
}

/**
 * Update global competitive timer display in header
 */
function updateGlobalCompetitiveTimer() {
    const timerContainer = document.getElementById('competitive-timer-global');
    const timerValue = document.getElementById('competitive-time-remaining');

    if (!timerContainer || !timerValue) return;

    // Show timer only if wallet connected or in test mode
    if (appState.wallet || testMode) {
        timerContainer.style.display = 'flex';
        timerValue.textContent = formatCompetitiveTimeRemaining();

        const remaining = getCompetitiveTimeRemaining();
        if (remaining <= 5 * 60 * 1000) {
            timerValue.classList.add('time-low');
        } else {
            timerValue.classList.remove('time-low');
        }

        if (remaining <= 0) {
            timerValue.classList.add('time-exhausted');
        } else {
            timerValue.classList.remove('time-exhausted');
        }
    } else {
        timerContainer.style.display = 'none';
    }
}

// ============================================
// GAME MODALS
// ============================================

function generateGameModals() {
    const container = document.getElementById('game-modals');

    container.innerHTML = GAMES.map(game => `
        <div class="game-modal" id="modal-${game.id}">
            <div class="game-modal-content">
                <div class="game-modal-header">
                    <h2 class="game-modal-title">
                        <span>${game.icon}</span>
                        <span>${escapeHtml(game.name)}</span>
                    </h2>
                    <button class="game-modal-close" data-action="close-game" data-game="${game.id}">&times;</button>
                </div>
                <div class="game-modal-body">
                    <div class="game-arena" id="arena-${game.id}">
                        <div class="game-start-overlay" id="overlay-${game.id}">
                            <div class="game-instructions">
                                <h3>${escapeHtml(game.name)}</h3>
                                <p>${escapeHtml(game.description)}</p>
                            </div>
                            <button class="btn btn-primary" data-action="start-game" data-game="${game.id}">
                                START GAME
                            </button>
                        </div>
                    </div>
                </div>
                <div class="game-controls">
                    <div class="game-stats">
                        <div class="game-stat">
                            <div class="game-stat-value" id="score-${game.id}">0</div>
                            <div class="game-stat-label">Score</div>
                        </div>
                        <div class="game-stat">
                            <div class="game-stat-value" id="best-${game.id}">${appState.practiceScores[game.id] || 0}</div>
                            <div class="game-stat-label">Best</div>
                        </div>
                        <div class="game-stat" id="timer-stat-${game.id}" style="display: none;">
                            <div class="game-stat-value" id="timer-${game.id}">--:--</div>
                            <div class="game-stat-label">Time Left</div>
                        </div>
                    </div>
                    <div class="game-mode-toggle">
                        <button class="mode-btn" data-action="show-leaderboard" data-game="${game.id}" title="View Leaderboard">🏆</button>
                        <button class="mode-btn" data-action="restart-game" data-game="${game.id}" title="Restart Game">Restart</button>
                        <button class="mode-btn active" id="practice-btn-${game.id}">Practice</button>
                        <button class="mode-btn" id="competitive-btn-${game.id}" data-action="toggle-competitive" data-game="${game.id}">
                            Competitive
                        </button>
                    </div>
                </div>
                <!-- Mini Leaderboard (hidden by default) -->
                <div class="game-leaderboard-mini" id="leaderboard-panel-${game.id}" style="display:none;">
                    <h4 class="mini-leaderboard-title">Top Scores <button style="float:right;background:none;border:none;color:#888;cursor:pointer;font-size:16px;" data-action="hide-leaderboard" data-game="${game.id}">&times;</button></h4>
                    <div class="mini-leaderboard-list" id="leaderboard-mini-${game.id}">
                        <div class="leaderboard-loading">Loading...</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function showLeaderboard(gameId) {
    const panel = document.getElementById(`leaderboard-panel-${gameId}`);
    if (panel) {
        panel.style.display = 'block';
        loadMiniLeaderboard(gameId);
    }
}

function hideLeaderboard(gameId) {
    const panel = document.getElementById(`leaderboard-panel-${gameId}`);
    if (panel) {
        panel.style.display = 'none';
    }
}

/**
 * Load mini leaderboard for a specific game
 */
async function loadMiniLeaderboard(gameId) {
    const container = document.getElementById(`leaderboard-mini-${gameId}`);
    if (!container) return;

    try {
        const response = await ApiClient.getWeeklyLeaderboard(gameId, 5);
        const data = response.leaderboard || [];

        if (data.length === 0) {
            container.innerHTML = '<div class="leaderboard-empty">No scores yet</div>';
            return;
        }

        container.innerHTML = data.map(entry => {
            const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
            const score = Number.isFinite(entry.score) ? Math.floor(entry.score) : 0;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const isYou = appState.wallet && typeof entry.player === 'string' && entry.player.includes(appState.wallet.slice(0, 4));

            return `
                <div class="mini-leaderboard-item ${isYou ? 'you' : ''}">
                    <span class="mini-rank ${rankClass}">#${rank}</span>
                    <span class="mini-player">${isYou ? 'You' : escapeHtml(String(entry.player || ''))}</span>
                    <span class="mini-score">${score.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<div class="leaderboard-empty">Unable to load</div>';
    }
}

function openGame(gameId) {
    if (!isValidGameId(gameId)) return;
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;

    // All games accessible - no holder restriction
    document.getElementById(`modal-${gameId}`).classList.add('active');
    document.body.style.overflow = 'hidden';

    // Load mini leaderboard for this game
    loadMiniLeaderboard(gameId);
}

function closeGame(gameId) {
    if (!isValidGameId(gameId)) return;

    const modal = document.getElementById(`modal-${gameId}`);
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';

    const overlay = document.getElementById(`overlay-${gameId}`);
    if (overlay) overlay.classList.remove('hidden');

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) arena.innerHTML = '';

    // End competitive session if active
    if (activeGameModes[gameId] === 'competitive') {
        endCompetitiveSession();
        // Reset to practice mode for next time
        activeGameModes[gameId] = 'practice';
        const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);
        const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
        if (competitiveBtn) competitiveBtn.classList.remove('active');
        if (practiceBtn) practiceBtn.classList.add('active');
        // Hide timer
        const timerStat = document.getElementById(`timer-stat-${gameId}`);
        if (timerStat) timerStat.style.display = 'none';
    }

    stopGame(gameId);
}

function playFeaturedGame() {
    const game = getCurrentGame();
    openGame(game.id);
}

function scrollToGames() {
    document.getElementById('games-section').scrollIntoView({ behavior: 'smooth' });
}

function restartGame(gameId) {
    if (!isValidGameId(gameId)) return;

    stopGame(gameId);
    document.getElementById(`score-${gameId}`).textContent = '0';

    const gameOver = document.getElementById(`gameover-${gameId}`);
    if (gameOver) gameOver.remove();

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) arena.innerHTML = '';

    startGame(gameId);
}

// ============================================
// COMPETITIVE MODE (30min/day limit)
// ============================================

function toggleCompetitive(gameId) {
    const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
    const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);

    const wantCompetitive = !competitiveBtn.classList.contains('active');

    if (wantCompetitive) {
        // Check if user can play competitive (only time limit check now)
        if (!canPlayCompetitive(gameId)) {
            alert('Temps compétitif épuisé pour aujourd\'hui! Revenez demain.');
            return;
        }

        // Switch to competitive mode
        practiceBtn.classList.remove('active');
        competitiveBtn.classList.add('active');
        activeGameModes[gameId] = 'competitive';

        // Show timer
        const timerStat = document.getElementById(`timer-stat-${gameId}`);
        if (timerStat) timerStat.style.display = 'block';
        updateCompetitiveTimerDisplay(gameId);

    } else {
        // Switch to practice mode
        competitiveBtn.classList.remove('active');
        practiceBtn.classList.add('active');
        activeGameModes[gameId] = 'practice';

        // End competitive session if active
        endCompetitiveSession();

        // Hide timer
        const timerStat = document.getElementById(`timer-stat-${gameId}`);
        if (timerStat) timerStat.style.display = 'none';
    }
}

/**
 * Update the competitive timer display for a game
 */
function updateCompetitiveTimerDisplay(gameId) {
    const timerEl = document.getElementById(`timer-${gameId}`);
    if (timerEl) {
        const remaining = getCompetitiveTimeRemaining();
        timerEl.textContent = formatCompetitiveTimeRemaining();

        // Add warning style when low on time
        if (remaining <= 5 * 60 * 1000) { // Less than 5 minutes
            timerEl.classList.add('time-low');
        } else {
            timerEl.classList.remove('time-low');
        }

        if (remaining <= 0) {
            timerEl.classList.add('time-exhausted');
            // Force switch to practice mode if time exhausted
            const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);
            if (competitiveBtn && competitiveBtn.classList.contains('active')) {
                toggleCompetitive(gameId);
            }
        }
    }
}

/**
 * Update all active competitive timers
 */
function updateAllCompetitiveTimers() {
    // Update global timer in header
    updateGlobalCompetitiveTimer();

    // Update per-game timers
    GAMES.forEach(game => {
        if (activeGameModes[game.id] === 'competitive') {
            updateCompetitiveTimerDisplay(game.id);
        }
    });
}
