/**
 * ASDF Games - TokenCatcher Logic
 */

'use strict';

(function () {
  const Logic = {
    create(engine) {
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const CONFIG = window.ASDF.TokenCatcherConfig;
        state.timeLeft -= dt / 60;
        if (state.timeLeft <= 0) {
          state.gameOver = true;
          if (typeof endGame === 'function') endGame(engine.gameId, state.score);
          return;
        }

        state.frameCount++;
        state.difficulty = Math.min(10, state.score / 500);
        state.spawnTimer += dt;

        const spawnRate = Math.max(
          CONFIG.spawnIntervalFloor,
          CONFIG.spawnIntervalBase - state.difficulty * 4
        );
        if (state.spawnTimer >= spawnRate) {
          engine.spawnToken(world);
          state.spawnTimer = 0;
        }

        // Handle active powerups
        for (let i = 0; i < state.activePowerUps.length; i++) {
          if (state.activePowerUps[i] > 0) state.activePowerUps[i] -= dt;
        }

        engine.updateEntities(world, dt);
        engine.updateUI(state);
      };
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.TokenCatcherLogic = Logic;
})();
