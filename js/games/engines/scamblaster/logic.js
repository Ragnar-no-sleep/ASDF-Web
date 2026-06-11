/**
 * ASDF Games - ScamBlaster Logic
 */

'use strict';

(function () {
  const Logic = {
    create(engine) {
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.phase === 'select') return;

        const CONFIG = window.ASDF.ScamBlasterConfig;

        if (state.phase === 'countdown') {
          state.countdown -= dt / 60;
          if (state.countdown <= 0) {
            state.phase = 'playing';
            engine.dom.countdown.classList.remove('sb-countdown--visible');
          } else {
            engine.dom.countdown.textContent = Math.ceil(state.countdown);
          }
          return;
        }

        const diff = engine.getDifficulty(state);
        state.elapsed += dt / 60;
        state.wave = diff.wave;
        state.level = diff.level;
        state.spawnTimer += dt;
        state.threatCount = engine._enemyQuery ? engine._enemyQuery.set.count : 0;

        const maxEnemies = Math.min(44, CONFIG.baseMaxThreats + state.wave * 2);
        if (state.threatCount < maxEnemies && state.spawnTimer >= diff.spawnInterval) {
          const toSpawn = Math.min(2, Math.max(1, Math.floor((state.wave + 1) / 2)));
          for (let i = 0; i < toSpawn; i++) engine.spawnEnemy(world, diff, i);
          state.spawnTimer = Math.max(0, state.spawnTimer - diff.spawnInterval);
        }

        const { dense, count } = engine._enemyQuery
          ? engine._enemyQuery.set
          : { dense: [], count: 0 };
        const pos = world.componentRegistry.get('Position').props;
        const meta = world.componentRegistry.get('ThreatMeta').props;
        const canvasH = engine.instance.canvas.height;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          meta.age[idx] += dt;
          if (state.gameMode === 'fall' && pos.y[idx] > canvasH - 52) {
            engine.loseLife(world, world.getEntityId(idx));
          }
        }

        const { dense: lsDense, count: lsCount } = engine._lifespanQuery
          ? engine._lifespanQuery.set
          : { dense: [], count: 0 };
        const lifeProps = world.componentRegistry.get('Lifespan').props;
        const enemyBit = world.componentRegistry.get('Enemy')?.bit || 0;
        for (let i = lsCount - 1; i >= 0; i--) {
          const idx = lsDense[i];
          lifeProps.remaining[idx] -= dt;
          if (lifeProps.remaining[idx] <= 0) {
            const isEnemy = enemyBit && (world.entityMasks[idx] & enemyBit) === enemyBit;
            if (isEnemy && state.gameMode === 'pop') engine.loseLife(world, world.getEntityId(idx));
            else world.destroyEntity(world.getEntityId(idx));
          }
        }
        engine.updateUI(state);
      };
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlasterLogic = Logic;
})();
