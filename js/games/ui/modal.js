/**
 * ASDF Games - Modal UI
 *
 * Handles game modal generation and lifecycle
 * Extracted from ui.js for modularity
 */

'use strict';

const ModalUI = {
  /**
   * Generate all game modals
   */
  generate() {
    const container = document.getElementById('game-modals');
    if (!container) return;

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
  },

  /**
   * Open a game modal
   * @param {string} gameId - The game ID
   */
  open(gameId) {
    if (!isValidGameId(gameId)) return;
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;

    // All games accessible - no holder restriction
    const modal = document.getElementById(`modal-${gameId}`);
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Load mini leaderboard for this game
    loadMiniLeaderboard(gameId);
  },

  /**
   * Close a game modal
   * @param {string} gameId - The game ID
   */
  close(gameId) {
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
  },

  /**
   * Restart a game
   * @param {string} gameId - The game ID
   */
  restart(gameId) {
    if (!isValidGameId(gameId)) return;

    stopGame(gameId);
    const scoreEl = document.getElementById(`score-${gameId}`);
    if (scoreEl) scoreEl.textContent = '0';

    const gameOver = document.getElementById(`gameover-${gameId}`);
    if (gameOver) gameOver.remove();

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) arena.innerHTML = '';

    startGame(gameId);
  },
};

// Legacy function exports for backwards compatibility
function generateGameModals() {
  return ModalUI.generate();
}

function openGame(gameId) {
  return ModalUI.open(gameId);
}

function closeGame(gameId) {
  return ModalUI.close(gameId);
}

function restartGame(gameId) {
  return ModalUI.restart(gameId);
}

function playFeaturedGame() {
  const game = getCurrentGame();
  ModalUI.open(game.id);
}

function scrollToGames() {
  const section = document.getElementById('games-section');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.ModalUI = ModalUI;
}
