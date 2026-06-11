/**
 * ASDF Games - Modal UI
 *
 * Handles game modal generation and lifecycle
 * Extracted from ui.js for modularity
 */

'use strict';

const ModalUI = {
  /** @type {Element|null} Previously focused element before modal opened */
  _previousFocus: null,

  /** @type {Function|null} Keydown handler for focus trap */
  _focusTrapHandler: null,

  /**
   * Get focusable elements within a container
   * @param {Element} container
   * @returns {Element[]}
   */
  _getFocusableElements(container) {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)).filter(el => !el.disabled);
  },

  /**
   * Set up focus trap for modal
   * @param {Element} modal
   */
  _setupFocusTrap(modal) {
    // Store previous focus to restore later
    this._previousFocus = document.activeElement;

    const focusableElements = this._getFocusableElements(modal);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstFocusable.focus();

    // Handle tab key to trap focus
    this._focusTrapHandler = e => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    modal.addEventListener('keydown', this._focusTrapHandler);
  },

  /**
   * Remove focus trap and restore previous focus
   * @param {Element} modal
   */
  _removeFocusTrap(modal) {
    if (this._focusTrapHandler) {
      modal.removeEventListener('keydown', this._focusTrapHandler);
      this._focusTrapHandler = null;
    }

    // Restore previous focus
    if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
      this._previousFocus.focus();
      this._previousFocus = null;
    }
  },

  /**
   * Generate all game modals
   */
  generate() {
    const container = document.getElementById('game-modals');
    if (!container) return;

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
                        <div class="game-stat hidden" id="timer-stat-${game.id}">
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
                <div class="game-leaderboard-mini hidden" id="leaderboard-panel-${game.id}">
                    <h4 class="mini-leaderboard-title">Top Scores <button class="mini-leaderboard-close" data-action="hide-leaderboard" data-game="${game.id}">&times;</button></h4>
                    <div class="mini-leaderboard-list" id="leaderboard-mini-${game.id}">
                        <div class="leaderboard-loading">Loading...</div>
                    </div>
                </div>
            </div>
        </div>
    `
    ).join('');
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
    if (modal) {
      modal.classList.add('active');
      // Set up focus trap for accessibility
      this._setupFocusTrap(modal);
    }
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
    if (modal) {
      modal.classList.remove('active');
      // Remove focus trap and restore previous focus
      this._removeFocusTrap(modal);
    }
    document.body.style.overflow = '';

    const overlay = document.getElementById(`overlay-${gameId}`);
    if (overlay) overlay.classList.remove('hidden');

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) arena.innerHTML = '';

    // End competitive session if active
    if (activeGameModes[gameId] === 'competitive') {
      endCompetitiveSession();
      CompetitiveUI.resetToPractice(gameId);
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
  window.ASDF = window.ASDF || {};
  window.ASDF.ModalUI = ModalUI;
  window.ModalUI = window.ASDF.ModalUI;
}
