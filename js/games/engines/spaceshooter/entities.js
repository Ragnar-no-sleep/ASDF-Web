'use strict';

const SpaceEntities = {
  // Shared enemy specs
  enemySpecs: {
    SCOUT: { hp: 1, speed: 2.5, points: 1, width: 12, height: 20 },
    FIGHTER: { hp: 3, speed: 1.8, points: 3, width: 16, height: 24 },
    TANKER: { hp: 8, speed: 0.8, points: 5, width: 32, height: 24 },
    BOMBER: { hp: 5, speed: 1.2, points: 8, width: 20, height: 20 },
  },

  /**
   * Create ship entity
   */
  createShip(canvasW, canvasH, upgrades) {
    const hullStats = [100, 134, 179, 233];
    const speedStats = [4, 5, 6, 8];
    const fireRateStats = [233, 144, 89, 55];
    const shieldStats = [0, 34, 55, 89];

    return {
      x: canvasW / 2,
      y: canvasH - 60,
      vx: 0,
      vy: 0,
      width: 24,
      height: 32,
      maxHp: hullStats[upgrades.hull] || 100,
      hp: hullStats[upgrades.hull] || 100,
      maxShield: shieldStats[upgrades.shields] || 0,
      shield: shieldStats[upgrades.shields] || 0,
      speed: speedStats[upgrades.engine] || 4,
      fireRate: fireRateStats[upgrades.weapons] || 233,
      lastShot: 0,
      spreadLevel: 0,
      rapidFireActive: false,
      rapidFireTimer: 0,
      invincibleTimer: 0,
      nukeCharges: 0,
    };
  },

  /**
   * Create bullet(s)
   */
  createBullet(ship, spreadLevel) {
    const bullets = [];
    const centerBullet = {
      x: ship.x,
      y: ship.y - ship.height / 2,
      vx: 0,
      vy: -6,
      width: 2,
      height: 8,
      damage: 1,
    };
    bullets.push(centerBullet);

    if (spreadLevel >= 1) {
      bullets.push({
        x: ship.x - 8,
        y: ship.y - ship.height / 2,
        vx: -2,
        vy: -5.5,
        width: 2,
        height: 8,
        damage: 1,
      });
      bullets.push({
        x: ship.x + 8,
        y: ship.y - ship.height / 2,
        vx: 2,
        vy: -5.5,
        width: 2,
        height: 8,
        damage: 1,
      });
    }

    if (spreadLevel >= 2) {
      bullets.push({
        x: ship.x - 16,
        y: ship.y - ship.height / 2,
        vx: -3.5,
        vy: -5,
        width: 2,
        height: 8,
        damage: 1,
      });
      bullets.push({
        x: ship.x + 16,
        y: ship.y - ship.height / 2,
        vx: 3.5,
        vy: -5,
        width: 2,
        height: 8,
        damage: 1,
      });
    }

    return bullets;
  },

  /**
   * Create enemy
   */
  createEnemy(type, wave, canvasW) {
    const spec = this.enemySpecs[type] || this.enemySpecs.SCOUT;
    const speedMult = 1 + wave * 0.05;

    return {
      type,
      x: Math.random() * (canvasW - spec.width) + spec.width / 2,
      y: -40,
      vx: 0,
      vy: spec.speed * speedMult,
      width: spec.width,
      height: spec.height,
      maxHp: spec.hp,
      hp: spec.hp,
      points: spec.points,
      shootTimer: 0,
      shootInterval: type === 'FIGHTER' ? 500 : type === 'BOMBER' ? 800 : 9999,
      targetX: canvasW / 2,
      sineTimer: 0,
    };
  },

  /**
   * Create boss
   */
  createBoss(wave, canvasW, canvasH) {
    return {
      x: canvasW / 2,
      y: 80,
      vx: 0,
      vy: 0,
      width: 64,
      height: 48,
      maxHp: 89 + wave * 13,
      hp: 89 + wave * 13,
      points: 34,
      phase: 1,
      shootTimer: 0,
      shootInterval: 377,
      movementTimer: 0,
      minions: [],
    };
  },

  /**
   * Create power-up
   */
  createPowerUp(x, y) {
    const types = ['SHIELD', 'RAPID_FIRE', 'SPREAD_SHOT', 'NUKE', 'HEALTH_PACK'];
    const weights = [2, 2, 2, 1, 2];
    let roll = Math.random() * weights.reduce((a, b) => a + b);
    let type = 'SHIELD';
    for (let i = 0; i < types.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        type = types[i];
        break;
      }
    }

    return {
      type,
      x,
      y,
      vx: 0,
      vy: 1.5,
      width: 16,
      height: 16,
      life: 5000,
    };
  },

  /**
   * Update all entities
   */
  update(dt, state, canvasW, canvasH) {
    if (!state || !state.ship) return;
    const ship = state.ship;

    // Update ship
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = Math.max(ship.width / 2, Math.min(canvasW - ship.width / 2, ship.x));
    ship.y = Math.max(0, Math.min(canvasH - ship.height, ship.y));

    if (ship.rapidFireActive) {
      ship.rapidFireTimer -= dt;
      if (ship.rapidFireTimer <= 0) {
        ship.fireRate = 233;
        ship.rapidFireActive = false;
      }
    }

    if (ship.invincibleTimer > 0) {
      ship.invincibleTimer -= dt;
    }

    // Update bullets
    state.bullets = state.bullets.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.y > -10 && b.y < canvasH + 10;
    });

    // Update enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.shootTimer -= dt;
      e.sineTimer += dt;

      if (e.type === 'SCOUT') {
        e.vx = Math.sin(e.sineTimer * 0.05) * 2;
      } else if (e.type === 'FIGHTER') {
        const diff = ship.x - e.x;
        e.vx = diff * 0.02;
        if (e.shootTimer <= 0) {
          state.enemyBullets.push({
            x: e.x,
            y: e.y + e.height,
            vx: 0,
            vy: 3,
            width: 2,
            height: 6,
            damage: 10,
          });
          e.shootTimer = e.shootInterval;
        }
      }

      if (e.y > canvasH + 50) {
        state.enemies.splice(i, 1);
      }
    }

    // Update enemy bullets
    state.enemyBullets = state.enemyBullets.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.y < canvasH + 20;
    });

    // Update power-ups
    state.powerUps = state.powerUps.filter(p => {
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0 && p.y < canvasH + 20;
    });
  },

  /**
   * Check collisions
   */
  checkCollisions(state) {
    const ship = state.ship;
    if (!ship || ship.hp <= 0) return;

    // Ship vs Enemy Bullets
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      if (this.aabbCollision(ship, b)) {
        if (ship.shield > 0) {
          ship.shield -= 10;
        } else if (ship.invincibleTimer <= 0) {
          ship.hp -= 10;
          ship.invincibleTimer = 30;
        }
        state.enemyBullets.splice(i, 1);
      }
    }

    // Ship vs Enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (this.aabbCollision(ship, e)) {
        if (ship.invincibleTimer <= 0) {
          ship.hp -= 20;
          ship.invincibleTimer = 50;
        }
        state.enemies.splice(i, 1);
      }
    }

    // Ship vs Power-ups
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
      const p = state.powerUps[i];
      if (this.aabbCollision(ship, p)) {
        this.applyPowerUp(p.type, state);
        state.powerUps.splice(i, 1);
      }
    }

    // Bullets vs Enemies
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (this.aabbCollision(b, e)) {
          e.hp -= b.damage || 1;
          state.bullets.splice(i, 1);
          if (e.hp <= 0) {
            state.score += e.points;
            if (Math.random() < 0.2) {
              state.powerUps.push(this.createPowerUp(e.x, e.y));
            }
            state.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  },

  /**
   * Collision check
   */
  aabbCollision(a, b) {
    return (
      a.x - a.width / 2 < b.x + b.width / 2 &&
      a.x + a.width / 2 > b.x - b.width / 2 &&
      a.y - a.height / 2 < b.y + b.height / 2 &&
      a.y + a.height / 2 > b.y - b.height / 2
    );
  },

  /**
   * Apply power-up
   */
  applyPowerUp(type, state) {
    const ship = state.ship;
    switch (type) {
      case 'HEALTH_PACK':
        ship.hp = Math.min(ship.maxHp, ship.hp + 20);
        break;
      case 'SHIELD':
        ship.shield = Math.min(ship.maxShield, ship.shield + 50);
        break;
      case 'RAPID_FIRE':
        ship.fireRate = 80;
        ship.rapidFireActive = true;
        ship.rapidFireTimer = 300;
        break;
      case 'SPREAD_SHOT':
        ship.spreadLevel = Math.min(2, ship.spreadLevel + 1);
        break;
      case 'NUKE':
        ship.nukeCharges = Math.min(3, ship.nukeCharges + 1);
        break;
    }
  },
};

if (typeof window !== 'undefined') {
  window.SpaceEntities = SpaceEntities;
}
