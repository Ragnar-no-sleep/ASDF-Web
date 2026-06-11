'use strict';

const SpaceWaves = {
  enemyMixes: [
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
  ],

  spawnTimer: 0,
  spawnedCount: 0,

  /**
   * Update wave spawning
   */
  update(dt, state) {
    if (!state) return;
    this.spawnTimer -= dt;

    const wave = state.wave;
    const diffFib = [144, 89, 55, 34, 21, 13, 8, 5, 3, 2];
    const spawnInterval = diffFib[Math.min(9, wave)] || 30;
    const maxEnemies = 5 + Math.floor(wave * 1.5);

    const canvasW = 800; // Hardcoded default, typically passed, but simplified for pool. Or get from state.
    // We should rely on state.canvasWidth or window.innerWidth if possible, but let's assume 800 for now.
    const getCanvasW = () => {
      const canvas = document.getElementById('shs-canvas') || document.querySelector('.shs-canvas');
      return canvas ? canvas.width : 800;
    };

    const currentEnemyCount = state.enemyPool ? state.enemyPool.activeCount : state.enemies.length;

    if (currentEnemyCount < maxEnemies && this.spawnTimer <= 0) {
      const mix = this.enemyMixes[Math.min(9, wave)];
      const types = [];
      for (const [type, count] of Object.entries(mix)) {
        for (let i = 0; i < count; i++) types.push(type);
      }
      const typeStr = types[Math.floor(Math.random() * types.length)];

      if (typeof SpaceEntities !== 'undefined') {
        const cw = getCanvasW();

        if (state.enemyPool) {
          const idx = state.enemyPool.acquire();
          if (idx !== -1) {
            const offset = idx * state.enemyPool.itemSize;
            const data = state.enemyPool.data;
            const spec = SpaceEntities.enemySpecs[typeStr] || SpaceEntities.enemySpecs.SCOUT;
            const speedMult = 1 + wave * 0.05;
            const typeInt = SpaceEntities.enemyTypeToInt[typeStr] || 0;

            data[offset + 0] = Math.random() * (cw - spec.width) + spec.width / 2; // x
            data[offset + 1] = -40; // y
            data[offset + 2] = 0; // vx
            data[offset + 3] = spec.speed * speedMult; // vy
            data[offset + 4] = spec.width; // width
            data[offset + 5] = spec.height; // height
            data[offset + 6] = typeInt; // typeInt
            data[offset + 7] = spec.hp; // hp
            data[offset + 8] = spec.points; // points
            data[offset + 9] = 0; // timer

            this.spawnedCount++;
            this.spawnTimer = spawnInterval;
          }
        } else if (SpaceEntities.createEnemy) {
          state.enemies.push(SpaceEntities.createEnemy(typeStr, wave, cw));
          this.spawnedCount++;
          this.spawnTimer = spawnInterval;
        }
      }
    }

    const currentBulletCount = state.enemyBulletPool
      ? state.enemyBulletPool.activeCount
      : state.enemyBullets.length;

    if (
      currentEnemyCount === 0 &&
      currentBulletCount === 0 &&
      !state.boss &&
      this.spawnedCount > 0
    ) {
      this.nextWave(state);
    }
  },

  /**
   * Start new wave
   */
  startWave(state, canvasW, canvasH) {
    this.spawnTimer = 50;
    this.spawnedCount = 0;

    if (state.wave % 5 === 0) {
      if (typeof SpaceEntities !== 'undefined' && SpaceEntities.createBoss) {
        state.boss = SpaceEntities.createBoss(state.wave, canvasW, canvasH);
        state.phase = 'boss';
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
   */
  nextWave(state) {
    state.wave++;
    state.phase = 'upgrading';
    this.spawnedCount = 0;
  },
};

if (typeof window !== 'undefined') {
  window.SpaceWaves = SpaceWaves;
}
