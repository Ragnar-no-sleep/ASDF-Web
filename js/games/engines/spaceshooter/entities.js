'use strict';

const SpaceEntities = {
  // Shared enemy specs
  enemySpecs: {
    SCOUT: { hp: 1, speed: 2.5, points: 1, width: 12, height: 20 },
    FIGHTER: { hp: 3, speed: 1.8, points: 3, width: 16, height: 24 },
    TANKER: { hp: 8, speed: 0.8, points: 5, width: 32, height: 24 },
    BOMBER: { hp: 5, speed: 1.2, points: 8, width: 20, height: 20 },
  },

  // Maps type names to integers for TypedObjectPool
  enemyTypeToInt: { SCOUT: 0, FIGHTER: 1, TANKER: 2, BOMBER: 3 },
  intToEnemyType: ['SCOUT', 'FIGHTER', 'TANKER', 'BOMBER'],

  powerUpTypeToInt: { SHIELD: 0, RAPID_FIRE: 1, SPREAD_SHOT: 2, NUKE: 3, HEALTH_PACK: 4 },
  intToPowerUpType: ['SHIELD', 'RAPID_FIRE', 'SPREAD_SHOT', 'NUKE', 'HEALTH_PACK'],

  /**
   * Initialize TypedObjectPools in the state (Zero-Allocation 2026 Standard)
   */
  initPools(state) {
    if (typeof TypedObjectPool !== 'undefined') {
      // itemSize 7: x, y, vx, vy, width, height, damage
      state.bulletPool = new TypedObjectPool(200, 7);
      state.enemyBulletPool = new TypedObjectPool(200, 7);

      // itemSize 10: x, y, vx, vy, width, height, typeInt, hp, points, timer
      state.enemyPool = new TypedObjectPool(100, 10);

      // itemSize 7: x, y, vy, width, height, life, typeInt
      state.powerUpPool = new TypedObjectPool(20, 7);
    }
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
   * Create bullet(s) (Zero-Allocation)
   */
  createBullet(state, ship, spreadLevel) {
    // Helper to spawn a single bullet into the pool or fallback array
    const spawnSingleBullet = (bx, by, bvx, bvy) => {
      if (state.bulletPool) {
        const idx = state.bulletPool.acquire();
        if (idx !== -1) {
          const offset = idx * state.bulletPool.itemSize;
          const data = state.bulletPool.data;
          data[offset + 0] = bx;
          data[offset + 1] = by;
          data[offset + 2] = bvx;
          data[offset + 3] = bvy;
          data[offset + 4] = 2; // width
          data[offset + 5] = 8; // height
          data[offset + 6] = 1; // damage
        }
      } else {
        state.bullets.push({
          x: bx,
          y: by,
          vx: bvx,
          vy: bvy,
          width: 2,
          height: 8,
          damage: 1,
        });
      }
    };

    // Center bullet
    spawnSingleBullet(ship.x, ship.y - ship.height / 2, 0, -6);

    if (spreadLevel >= 1) {
      spawnSingleBullet(ship.x - 8, ship.y - ship.height / 2, -2, -5.5);
      spawnSingleBullet(ship.x + 8, ship.y - ship.height / 2, 2, -5.5);
    }

    if (spreadLevel >= 2) {
      spawnSingleBullet(ship.x - 16, ship.y - ship.height / 2, -3.5, -5);
      spawnSingleBullet(ship.x + 16, ship.y - ship.height / 2, 3.5, -5);
    }
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
   * Update all entities (Zero-Allocation)
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

    // Update bullets (Pool)
    if (state.bulletPool) {
      const pool = state.bulletPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          data[offset + 0] += data[offset + 2] * dt; // x += vx
          data[offset + 1] += data[offset + 3] * dt; // y += vy

          if (data[offset + 1] < -10 || data[offset + 1] > canvasH + 10) {
            pool.release(i);
          }
        }
      }
    } else {
      state.bullets = state.bullets.filter(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        return b.y > -10 && b.y < canvasH + 10;
      });
    }

    // Update enemies (Pool)
    if (state.enemyPool) {
      const pool = state.enemyPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          // x, y, vx, vy, width, height, typeInt, hp, points, timer
          data[offset + 0] += data[offset + 2] * dt; // x += vx
          data[offset + 1] += data[offset + 3] * dt; // y += vy
          data[offset + 9] += dt; // timer (used for shooting and sine wave)

          const typeInt = data[offset + 6];

          if (typeInt === 0) {
            // SCOUT
            data[offset + 2] = Math.sin(data[offset + 9] * 0.05) * 2; // vx
          } else if (typeInt === 1) {
            // FIGHTER
            const diff = ship.x - data[offset + 0];
            data[offset + 2] = diff * 0.02; // vx

            // Handle shooting (using timer modulo)
            const shootInterval = 50; // Simplified for Float32Array tracking
            if (data[offset + 9] > shootInterval) {
              if (state.enemyBulletPool) {
                const bIdx = state.enemyBulletPool.acquire();
                if (bIdx !== -1) {
                  const bOffset = bIdx * state.enemyBulletPool.itemSize;
                  const bData = state.enemyBulletPool.data;
                  bData[bOffset + 0] = data[offset + 0]; // x
                  bData[bOffset + 1] = data[offset + 1] + data[offset + 5]; // y + height
                  bData[bOffset + 2] = 0; // vx
                  bData[bOffset + 3] = 3; // vy
                  bData[bOffset + 4] = 2; // width
                  bData[bOffset + 5] = 6; // height
                  bData[bOffset + 6] = 10; // damage
                }
              }
              data[offset + 9] = 0; // Reset timer
            }
          }

          if (data[offset + 1] > canvasH + 50) {
            pool.release(i);
          }
        }
      }
    } else {
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
    }

    // Update enemy bullets (Pool)
    if (state.enemyBulletPool) {
      const pool = state.enemyBulletPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          data[offset + 0] += data[offset + 2] * dt; // x += vx
          data[offset + 1] += data[offset + 3] * dt; // y += vy

          if (data[offset + 1] > canvasH + 20) {
            pool.release(i);
          }
        }
      }
    } else {
      state.enemyBullets = state.enemyBullets.filter(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        return b.y < canvasH + 20;
      });
    }

    // Update power-ups (Pool)
    if (state.powerUpPool) {
      const pool = state.powerUpPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          // x, y, vy, width, height, life, typeInt
          data[offset + 1] += data[offset + 2] * dt; // y += vy
          data[offset + 5] -= dt; // life -= dt

          if (data[offset + 5] <= 0 || data[offset + 1] > canvasH + 20) {
            pool.release(i);
          }
        }
      }
    } else {
      state.powerUps = state.powerUps.filter(p => {
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0 && p.y < canvasH + 20;
      });
    }
  },

  /**
   * Check collisions (Zero-Allocation)
   */
  checkCollisions(state) {
    const ship = state.ship;
    if (!ship || ship.hp <= 0) return;

    // Ship vs Enemy Bullets (Pool)
    if (state.enemyBulletPool) {
      const bPool = state.enemyBulletPool;
      for (let i = 0; i < bPool.capacity; i++) {
        if (bPool.active[i] === 1) {
          const bOffset = i * bPool.itemSize;
          if (this.aabbCollisionPoolVsObj(bPool.data, bOffset, ship)) {
            if (ship.shield > 0) {
              ship.shield -= 10;
            } else if (ship.invincibleTimer <= 0) {
              ship.hp -= 10;
              ship.invincibleTimer = 30;
            }
            bPool.release(i);
          }
        }
      }
    } else {
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
    }

    // Ship vs Enemies (Pool)
    if (state.enemyPool) {
      const ePool = state.enemyPool;
      for (let i = 0; i < ePool.capacity; i++) {
        if (ePool.active[i] === 1) {
          const eOffset = i * ePool.itemSize;
          if (this.aabbCollisionPoolVsObj(ePool.data, eOffset, ship)) {
            if (ship.invincibleTimer <= 0) {
              ship.hp -= 20;
              ship.invincibleTimer = 50;
            }
            ePool.release(i);
          }
        }
      }
    } else {
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
    }

    // Ship vs Power-ups (Pool)
    if (state.powerUpPool) {
      const pPool = state.powerUpPool;
      for (let i = 0; i < pPool.capacity; i++) {
        if (pPool.active[i] === 1) {
          const pOffset = i * pPool.itemSize;
          if (this.aabbCollisionPoolVsObj(pPool.data, pOffset, ship)) {
            const typeStr = this.intToPowerUpType[pPool.data[pOffset + 6]];
            this.applyPowerUp(typeStr, state);
            pPool.release(i);
          }
        }
      }
    } else {
      for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const p = state.powerUps[i];
        if (this.aabbCollision(ship, p)) {
          this.applyPowerUp(p.type, state);
          state.powerUps.splice(i, 1);
        }
      }
    }

    // Bullets vs Enemies (Pools)
    if (state.bulletPool && state.enemyPool) {
      const bPool = state.bulletPool;
      const ePool = state.enemyPool;
      for (let i = 0; i < bPool.capacity; i++) {
        if (bPool.active[i] === 1) {
          const bOffset = i * bPool.itemSize;

          for (let j = 0; j < ePool.capacity; j++) {
            if (ePool.active[j] === 1) {
              const eOffset = j * ePool.itemSize;

              if (this.aabbCollisionPools(bPool.data, bOffset, ePool.data, eOffset)) {
                ePool.data[eOffset + 7] -= bPool.data[bOffset + 6] || 1; // hp -= damage
                bPool.release(i);

                if (ePool.data[eOffset + 7] <= 0) {
                  state.score += ePool.data[eOffset + 8]; // score += points

                  // Drop powerup chance (20%)
                  if (Math.random() < 0.2 && state.powerUpPool) {
                    const pIdx = state.powerUpPool.acquire();
                    if (pIdx !== -1) {
                      const pOffset = pIdx * state.powerUpPool.itemSize;
                      const pData = state.powerUpPool.data;

                      const types = [0, 1, 2, 3, 4]; // SHIELD, RAPID, SPREAD, NUKE, HEALTH
                      const weights = [2, 2, 2, 1, 2];
                      let roll = Math.random() * 9; // sum of weights
                      let typeInt = 0;
                      for (let k = 0; k < types.length; k++) {
                        roll -= weights[k];
                        if (roll <= 0) {
                          typeInt = types[k];
                          break;
                        }
                      }

                      // itemSize 7: x, y, vy, width, height, life, typeInt
                      pData[pOffset + 0] = ePool.data[eOffset + 0]; // x
                      pData[pOffset + 1] = ePool.data[eOffset + 1]; // y
                      pData[pOffset + 2] = 1.5; // vy
                      pData[pOffset + 3] = 16; // width
                      pData[pOffset + 4] = 16; // height
                      pData[pOffset + 5] = 5000; // life
                      pData[pOffset + 6] = typeInt;
                    }
                  }
                  ePool.release(j);
                }
                break; // Bullet destroyed, stop checking other enemies for this bullet
              }
            }
          }
        }
      }
    } else {
      // Legacy Bullets vs Enemies
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
    }
  },

  /**
   * Collision check (Legacy Objects)
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
   * Collision check (Pool Data vs Object)
   * offset + 0 = x, + 1 = y, + 4 = width, + 5 = height
   */
  aabbCollisionPoolVsObj(poolData, offset, obj) {
    return (
      poolData[offset + 0] - poolData[offset + 4] / 2 < obj.x + obj.width / 2 &&
      poolData[offset + 0] + poolData[offset + 4] / 2 > obj.x - obj.width / 2 &&
      poolData[offset + 1] - poolData[offset + 5] / 2 < obj.y + obj.height / 2 &&
      poolData[offset + 1] + poolData[offset + 5] / 2 > obj.y - obj.height / 2
    );
  },

  /**
   * Collision check (Pool Data vs Pool Data)
   */
  aabbCollisionPools(dataA, offsetA, dataB, offsetB) {
    return (
      dataA[offsetA + 0] - dataA[offsetA + 4] / 2 < dataB[offsetB + 0] + dataB[offsetB + 4] / 2 &&
      dataA[offsetA + 0] + dataA[offsetA + 4] / 2 > dataB[offsetB + 0] - dataB[offsetB + 4] / 2 &&
      dataA[offsetA + 1] - dataA[offsetA + 5] / 2 < dataB[offsetB + 1] + dataB[offsetB + 5] / 2 &&
      dataA[offsetA + 1] + dataA[offsetA + 5] / 2 > dataB[offsetB + 1] - dataB[offsetB + 5] / 2
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
