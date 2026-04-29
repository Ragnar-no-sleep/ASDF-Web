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
  update(dt, state, canvasW) {
    if (!state) return;
    this.spawnTimer -= dt;

    const wave = state.wave;
    const diffFib = [144, 89, 55, 34, 21, 13, 8, 5, 3, 2];
    const spawnInterval = diffFib[Math.min(9, wave)] || 30;
    const maxEnemies = 5 + Math.floor(wave * 1.5);

    if (state.enemies.length < maxEnemies && this.spawnTimer <= 0) {
      const mix = this.enemyMixes[Math.min(9, wave)];
      const types = [];
      for (const [type, count] of Object.entries(mix)) {
        for (let i = 0; i < count; i++) types.push(type);
      }
      const type = types[Math.floor(Math.random() * types.length)];

      if (typeof SpaceEntities !== 'undefined' && SpaceEntities.createEnemy) {
        state.enemies.push(SpaceEntities.createEnemy(type, wave, canvasW));
        this.spawnedCount++;
        this.spawnTimer = spawnInterval;
      }
    }

    if (state.enemies.length === 0 && state.enemyBullets.length === 0 && !state.boss && this.spawnedCount > 0) {
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
