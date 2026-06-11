/**
 * ASDF Games - DexDash Logic System
 */

'use strict';

(function () {
  const DexDashLogic = {
    create(engine) {
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const CONFIG = window.ASDF.DexDashConfig;
        const pIdx = world.getIndex(state.playerId);
        const player = world.componentRegistry.get('Player').props;
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const collider = world.componentRegistry.get('Collider').props;
        const layout = engine._layout || engine.getRoadLayout();

        const difficulty = engine.getDifficulty(state);
        state.level = difficulty.level;
        state.pace = difficulty.pace;
        state.maxSpeed = difficulty.maxSpeed;

        player.speed[pIdx] = Math.min(
          state.maxSpeed,
          player.speed[pIdx] + CONFIG.acceleration * dt * difficulty.pace
        );

        state.distance += player.speed[pIdx] * 0.24 * dt;
        state.roadOffset = (state.roadOffset + player.speed[pIdx] * 7.3 * dt) % 360;
        state.suspensionPhase += dt * (0.052 + player.speed[pIdx] * 0.006);
        state.bounce = Math.max(0, state.bounce - dt * 0.032);

        const left = state.keys.ArrowLeft || state.keys.KeyA;
        const right = state.keys.ArrowRight || state.keys.KeyD;
        if (left) vel.vx[pIdx] -= 1.1 * difficulty.pace * dt;
        if (right) vel.vx[pIdx] += 1.1 * difficulty.pace * dt;
        vel.vx[pIdx] *= Math.pow(0.87, dt);
        player.steer[pIdx] = Math.max(-1, Math.min(1, vel.vx[pIdx] / 14));

        if ((left || right) && Math.abs(player.steer[pIdx]) > 0.08) {
          state.bounce = Math.min(0.5, state.bounce + 0.01 * dt);
        }

        const carHalf = CONFIG.playerWidth * 0.5;
        pos.x[pIdx] = Math.max(
          layout.left + carHalf + 4,
          Math.min(layout.right - carHalf - 4, pos.x[pIdx])
        );
        pos.y[pIdx] = engine.instance.canvas.height * CONFIG.playerYRatio;

        state.spawnTimer += dt;
        const worldSpeed = CONFIG.worldSpeedBase + player.speed[pIdx] * CONFIG.worldSpeedScale;
        const query = engine.trafficQuery || world.createQuery(['Position', 'Renderable']);
        const activeTraffic = query.set.count - 1;
        const crowdFactor = Math.min(1, activeTraffic / Math.max(1, difficulty.maxTraffic));
        const safeSpawnInterval = Math.max(
          difficulty.spawnInterval * (0.8 + crowdFactor * 0.55),
          CONFIG.spawnMinMs
        );

        while (state.spawnTimer >= safeSpawnInterval) {
          engine.spawnTraffic(world);
          state.spawnTimer -= safeSpawnInterval;
        }

        const { dense, count } = query.set;
        const obstacleComp = world.componentRegistry.get('Obstacle');
        const boostComp = world.componentRegistry.get('Boost');
        const obstacleBit = obstacleComp ? obstacleComp.bit : 0;
        const boostBit = boostComp ? boostComp.bit : 0;
        const playerY = pos.y[pIdx];
        const playerHalfWidth = CONFIG.playerWidth * 0.58;
        const playerHalfHeight = CONFIG.playerHeight * 0.62;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === pIdx) continue;
          pos.y[idx] += worldSpeed * dt;

          const dx = Math.abs(pos.x[idx] - pos.x[pIdx]);
          const dy = pos.y[idx] - playerY;

          const hit =
            Math.abs(dy) < (playerHalfHeight + collider.height[idx] * 0.5) * 0.66 &&
            dx < (playerHalfWidth + collider.width[idx] * 0.5) * 0.9;

          if (hit && obstacleBit && (world.entityMasks[idx] & obstacleBit) === obstacleBit) {
            player.speed[pIdx] = Math.max(
              CONFIG.speedStart * 0.76,
              player.speed[pIdx] - obstacleComp.props.damage[idx]
            );
            const penalty = Math.round(Math.max(30, CONFIG.collisionPenalty / 2));
            state.score = Math.max(0, state.score - penalty);
            state.bounce = 1.15;

            if (engine.juice) {
              engine.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'medium' });
              engine.juice.textPop(pos.x[idx], pos.y[idx], `-${penalty}`, {
                color: '#ef4444',
                size: 24,
              });
            } else {
              engine.instance.shake(10, 10);
            }

            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          if (hit && boostBit && (world.entityMasks[idx] & boostBit) === boostBit) {
            const value = boostComp.props.value[idx] || 72;
            player.speed[pIdx] = Math.min(state.maxSpeed + 1.8, player.speed[pIdx] + 1.3);
            const scoreGained = Math.round(value * (1 + difficulty.level * 0.12));
            state.score += scoreGained;
            state.boostUsed += 1;
            state.bounce = Math.max(state.bounce, 0.55);

            if (engine.juice) {
              engine.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'light' });
              engine.juice.textPop(pos.x[idx], pos.y[idx], `+${scoreGained}`, {
                color: '#fbbf24',
                size: 28,
              });
            } else {
              engine.instance.shake(5, 8);
            }

            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          if (pos.y[idx] > playerY + layout.h * 0.5) {
            world.destroyEntity(world.getEntityId(idx));
          }
        }
      };
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDashLogic = DexDashLogic;
})();
