/**
 * ASDF Games - UI Components
 * Grid rendering and modal management
 *
 * Note: Rotation, leaderboard, and competitive functions
 * have been extracted to ui/ subdirectory modules
 */

'use strict';

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

// ============================================
// GAME MODALS
// ============================================

function generateGameModals() {
  const container = document.getElementById('game-modals');

  container.innerHTML = GAMES.map(
    game => `
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
    `
  ).join('');
}

// ============================================
// GAME LIFECYCLE
// ============================================

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
