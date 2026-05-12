/**
 * Space Shooter - Wave Manager
 *
 * Spawns enemies with Fibonacci difficulty curve
 * Boss trigger: wave % 5 === 0
 * Token rewards: Fibonacci-based (SCOUT:1, FIGHTER:3, TANKER:5, BOMBER:8, BOSS:34)
 *
 * @module games/engines/spaceshooter/waves
 */

'use strict';

const SpaceWaves = {
  /**
   * Create wave manager
   * @param {number} canvasW
   * @param {number} canvasH
   * @returns {Object}
   */
  create(canvasW, canvasH) {
    const enemyMixes = [
      { SCOUT: 6, FIGHTER: 0, TANKER: 0, BOMBER: 0 },
      { SCOUT: 5, FIGHTER: 1, TANKER: 0, BOMBER: 0 },
      { SCOUT: 4, FIGHTER: 2, TANKER: 0, BOMBER: 0 },
      { SCOUT: 3, FIGHTER: 2, TANKER: 1, BOMBER: 0 },
      { SCOUT: 2, FIGHTER: 2, TANKER: 1, BOMBER: 1 },
      { SCOUT: 1, FIGHTER: 3, TANKER: 2, BOMBER: 1 },
      { SCOUT: 0, FIGHTER: 3, TANKER: 2, BOMBER: 2 },
      { SCOUT: 0, FIGHTER: 2, TANKER: 3, BOMBER: 2 },
      { SCOUT: 0, FIGHTER: 1, TANKER: 3, BOMBER: 3 },
      { SCOUT: 0, FIGHTER: 0, TANKER: 4, BOMBER: 3 },
    ];

    let spawnTimer = 0;
    let spawnedCount = 0;

    return {
      /**
       * Update wave spawning
       * @param {number} dt
       * @param {Object} state
       */
      update(dt, state) {
        spawnTimer -= dt;

        // Fibonacci difficulty curve
        const wave = state.wave;
        const diffFib = [144, 89, 55, 34, 21, 13, 8, 5, 3, 2];
        const spawnInterval = diffFib[Math.min(9, wave)];
        const maxEnemies = FIBONACCI[Math.min(8, 3 + Math.floor(wave / 3))]; // 5→8→13→21→34

        if (state.enemies.length < maxEnemies && spawnTimer <= 0) {
          // Spawn enemy
          const mix = enemyMixes[Math.min(9, wave)];
          const types = [];
          for (const [type, count] of Object.entries(mix)) {
            for (let i = 0; i < count; i++) types.push(type);
          }
          const type = types[Math.floor(Math.random() * types.length)];

          state.enemies.push(SpaceEntities.createEnemy(type, wave, canvasW));
          spawnedCount++;
          spawnTimer = spawnInterval;
        }

        // Wave clear check
        if (
          state.enemies.length === 0 &&
          state.enemyBullets.length === 0 &&
          !state.boss &&
          spawnedCount > 0
        ) {
          this.nextWave(state);
        }
      },

      /**
       * Start new wave
       * @param {Object} state
       */
      startWave(state) {
        spawnTimer = 800;
        spawnedCount = 0;

        if (state.wave % 5 === 0) {
          // Boss wave
          state.boss = SpaceEntities.createBoss(state.wave, canvasW, canvasH);
          state.phase = 'boss';
          if (window.GameEvents) {
            GameEvents.emit('wave:boss', { wave: state.wave });
          }
        } else {
          state.phase = 'playing';
        }

        if (window.GameEvents) {
          GameEvents.emit('wave:start', { wave: state.wave });
        }
      },

      /**
       * Advance to next wave
       * @param {Object} state
       */
      nextWave(state) {
        state.wave++;
        state.phase = 'upgrading';

        // Pause for upgrade screen
        setTimeout(() => {
          if (state && !state.gameOver) {
            state.phase = 'playing';
            this.startWave(state);
          }
        }, 2100); // fib[7] * 100
      },

      /**
       * Get difficulty params for wave
       * @param {number} wave
       * @returns {Object}
       */
      getDifficulty(wave) {
        const diffFib = [144, 89, 55, 34, 21, 13, 8, 5, 3, 2];
        return {
          spawnInterval: diffFib[Math.min(9, wave)],
          maxEnemies: FIBONACCI[Math.min(8, 3 + Math.floor(wave / 3))],
          enemyMix: enemyMixes[Math.min(9, wave)],
          enemySpeed: 1 + wave * 0.05,
        };
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceWaves = SpaceWaves;
}
