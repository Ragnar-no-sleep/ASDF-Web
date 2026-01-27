/**
 * ASDF Games - Grid UI
 *
 * Handles games grid rendering
 * Extracted from ui.js for modularity
 */

'use strict';

const GridUI = {
  /**
   * Render the games grid
   */
  render() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;

    const currentGame = getCurrentGame();

    grid.innerHTML = GAMES.map(game => {
      const isFeatured = game.id === currentGame.id;
      // All games accessible - no holder restriction
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
  },
};

// Legacy function export for backwards compatibility
function renderGamesGrid() {
  return GridUI.render();
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.GridUI = GridUI;
}
