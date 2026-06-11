/**
 * ASDF Reactive HUD Manager
 * Decouples UI rendering from game simulation logic.
 *
 * Support for:
 * - Declarative templates
 * - Resource binding (ECS GameState -> DOM)
 * - Animated transitions
 */

'use strict';

(function () {
  const HUDManager = {
    name: 'HUDManager',
    activeHUDs: new Map(), // gameId -> { container, elements }

    init(kernel) {
      this.kernel = kernel;
      kernel.registerService('hud', this);

      // Listen for kernel lifecycle events
      kernel.on('game:after-launch', ({ gameId, instance }) => {
        this.bindHUD(gameId, instance);
      });
    },

    /**
     * Bind a game instance to its HUD elements
     */
    bindHUD(gameId, instance) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      const elements = {
        score: arena.querySelector('[id$="-score"]'),
        lives: arena.querySelector('[id$="-lives"]'),
        time: arena.querySelector('[id$="-time"]'),
      };

      this.activeHUDs.set(gameId, { container: arena, elements });
      console.log(`[HUDManager] Bound HUD for ${gameId}`);
    },

    /**
     * Fast update for standard HUD elements
     * @param {string} gameId
     * @param {Object} state - The GameState resource from ECS
     */
    update(gameId, state) {
      const hud = this.activeHUDs.get(gameId);
      if (!hud) return;

      const { score, lives, time } = hud.elements;

      if (score && state.score !== undefined) {
        score.textContent = state.score;
      }

      if (lives && state.lives !== undefined) {
        // Simple heart emoji renderer for legacy support
        if (typeof state.lives === 'number') {
          lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
        } else {
          lives.textContent = state.lives;
        }
      }

      if (time && state.timeLeft !== undefined) {
        time.textContent = Math.ceil(state.timeLeft);
      }
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.HUDManager = HUDManager;
})();
