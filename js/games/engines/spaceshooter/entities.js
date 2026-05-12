/**
 * Space Shooter - Entity System (Ship, Bullets, Enemies, Boss)
 *
 * Factory functions for creating game entities
 * 4 enemy types: SCOUT, FIGHTER, TANKER, BOMBER
 * Boss with 3-phase behavior
 *
 * @module games/engines/spaceshooter/entities
 */

'use strict';

const SpaceEntities = {
  /**
   * Create entity system
   * @returns {Object} Entity manager
   */
  create() {
    const enemies = {
      SCOUT: { hp: 1, speed: 2.5, points: 1, width: 12, height: 20 },
      FIGHTER: { hp: 3, speed: 1.8, points: 3, width: 16, height: 24 },
      TANKER: { hp: 8, speed: 0.8, points: 5, width: 32, height: 24 },
      BOMBER: { hp: 5, speed: 1.2, points: 8, width: 20, height: 20 },
    };

    return {
      /**
       * Create ship entity
       * @param {number} canvasW
       * @param {number} canvasH
       * @param {Object} upgrades - Upgrade levels
       * @returns {Object}
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
       * @param {Object} ship
       * @param {number} spreadLevel - 0, 1, or 2
       * @returns {Array}
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
       * @param {string} type - SCOUT, FIGHTER, TANKER, BOMBER
       * @param {number} wave
       * @param {number} canvasW
       * @returns {Object}
       */
      createEnemy(type, wave, canvasW) {
        const spec = enemies[type] || enemies.SCOUT;
        const speedMult = 1 + wave * 0.05; // Difficulty scaling

        return {
          type,
          x: Math.random() * canvasW,
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
       * @param {number} wave
       * @param {number} canvasW
       * @param {number} canvasH
       * @returns {Object}
       */
      createBoss(wave, canvasW, canvasH) {
        return {
          x: canvasW / 2,
          y: 80,
          vx: 0,
          vy: 0,
          width: 64,
          height: 48,
          maxHp: 89 + wave * 13, // Fibonacci scaling
          hp: 89 + wave * 13,
          points: 34, // fib[8]
          phase: 1,
          shootTimer: 0,
          shootInterval: 377,
          movementTimer: 0,
          minions: [],
        };
      },

      /**
       * Create power-up
       * @param {number} x
       * @param {number} y
       * @returns {Object}
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
          life: 5000, // 5 seconds
        };
      },

      /**
       * Update all entities
       * @param {number} dt
       * @param {Object} state
       * @param {number} canvasW
       * @param {number} canvasH
       */
      update(dt, state, canvasW, canvasH) {
        const ship = state.ship;

        // Update ship
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        ship.x = Math.max(ship.width / 2, Math.min(canvasW - ship.width / 2, ship.x));
        ship.y = Math.max(0, Math.min(canvasH - ship.height, ship.y));

        if (ship.rapidFireActive) {
          ship.rapidFireTimer -= dt;
          if (ship.rapidFireTimer <= 0) {
            ship.fireRate = 233; // Reset to base
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

          // Enemy AI
          if (e.type === 'SCOUT') {
            e.vx = Math.sin(e.sineTimer * 2) * 1.5;
          } else if (e.type === 'FIGHTER') {
            const diff = ship.x - e.x;
            e.vx = GameTiming.lerp(e.vx, Math.max(-1, Math.min(1, diff * 0.002)), 0.3, dt);
            if (e.shootTimer <= 0) {
              state.enemyBullets.push({
                x: e.x,
                y: e.y + e.height,
                vx: 0,
                vy: 3,
                width: 2,
                height: 6,
              });
              e.shootTimer = e.shootInterval;
            }
          } else if (e.type === 'TANKER') {
            e.vx = Math.sin(e.sineTimer) * 1;
          } else if (e.type === 'BOMBER') {
            e.vx = Math.cos(e.sineTimer * 1.5) * 2;
            if (e.shootTimer <= 0) {
              for (let j = -2; j <= 2; j++) {
                state.enemyBullets.push({
                  x: e.x + j * 6,
                  y: e.y + e.height,
                  vx: j * 0.5,
                  vy: 3.5,
                  width: 2,
                  height: 6,
                });
              }
              e.shootTimer = e.shootInterval;
            }
          }

          if (e.y > canvasH) {
            state.enemies.splice(i, 1);
          }
        }

        // Update boss
        if (state.boss) {
          const b = state.boss;
          b.shootTimer -= dt;
          b.movementTimer -= dt;

          // Boss phases based on HP
          const hpPercent = b.hp / b.maxHp;
          b.phase = hpPercent > 0.66 ? 1 : hpPercent > 0.33 ? 2 : 3;

          if (b.phase === 1) {
            // Sweep pattern
            if (b.movementTimer <= 0) {
              b.vx = b.vx === 0 ? 2 : -b.vx;
              b.movementTimer = 2000;
            }
          } else if (b.phase === 2) {
            // Spiral + minions
            const angle = (performance.now() * 0.002) % (Math.PI * 2);
            b.vx = Math.cos(angle) * 2;
          } else {
            // Enrage: faster, regenerate
            b.vx = Math.sin((performance.now() * 0.003) % (Math.PI * 2)) * 3;
            if (b.shootTimer % 100 < 50) {
              b.hp = Math.min(b.maxHp, b.hp + 0.1);
            }
          }

          b.x += b.vx * dt;
          b.x = Math.max(40, Math.min(canvasW - 40, b.x));

          if (b.shootTimer <= 0) {
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              state.enemyBullets.push({
                x: b.x,
                y: b.y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                width: 3,
                height: 3,
              });
            }
            b.shootTimer = 377;
          }
        }

        // Update power-ups
        state.powerUps = state.powerUps.filter(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          return p.life > 0 && p.y < canvasH;
        });

        // Update enemy bullets
        state.enemyBullets = state.enemyBullets.filter(b => {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          return b.y > -10 && b.y < canvasH + 10 && b.x > -10 && b.x < canvasW + 10;
        });
      },

      /**
       * Check collisions
       * @param {Object} state
       */
      checkCollisions(state) {
        const ship = state.ship;

        // Bullets vs enemies
        for (let b = state.bullets.length - 1; b >= 0; b--) {
          const bullet = state.bullets[b];
          for (let e = state.enemies.length - 1; e >= 0; e--) {
            const enemy = state.enemies[e];
            if (this.aabbCollision(bullet, enemy)) {
              enemy.hp -= bullet.damage;
              state.bullets.splice(b, 1);
              if (enemy.hp <= 0) {
                state.score += enemy.points;
                const pu = Math.random() < 0.3;
                if (pu) {
                  state.powerUps.push(this.createPowerUp(enemy.x, enemy.y));
                }
                state.enemies.splice(e, 1);
              }
              break;
            }
          }
        }

        // Bullets vs boss
        if (state.boss) {
          for (let b = state.bullets.length - 1; b >= 0; b--) {
            const bullet = state.bullets[b];
            if (this.aabbCollision(bullet, state.boss)) {
              state.boss.hp -= bullet.damage;
              state.bullets.splice(b, 1);
              if (state.boss.hp <= 0) {
                state.score += state.boss.points;
                state.boss = null;
              }
              break;
            }
          }
        }

        // Enemy bullets vs ship
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
          const bullet = state.enemyBullets[i];
          if (this.aabbCollision(bullet, ship)) {
            if (ship.shield > 0) {
              ship.shield -= 10;
            } else if (ship.invincibleTimer <= 0) {
              ship.hp -= 10;
              ship.invincibleTimer = 300;
            }
            state.enemyBullets.splice(i, 1);
          }
        }

        // Enemies vs ship
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const enemy = state.enemies[i];
          if (this.aabbCollision(enemy, ship) && ship.invincibleTimer <= 0) {
            ship.hp -= 20;
            ship.invincibleTimer = 300;
            state.enemies.splice(i, 1);
          }
        }

        // Power-ups vs ship
        for (let i = state.powerUps.length - 1; i >= 0; i--) {
          const pu = state.powerUps[i];
          if (this.aabbCollision(pu, ship)) {
            this.applyPowerUp(pu.type, state);
            state.powerUps.splice(i, 1);
          }
        }
      },

      /**
       * AABB collision test
       * @param {Object} a
       * @param {Object} b
       * @returns {boolean}
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
       * Apply power-up effect
       * @param {string} type
       * @param {Object} state
       */
      applyPowerUp(type, state) {
        const ship = state.ship;
        if (type === 'SHIELD') {
          ship.shield = Math.min(ship.maxShield, ship.shield + 34);
        } else if (type === 'RAPID_FIRE') {
          ship.fireRate = 55;
          ship.rapidFireActive = true;
          ship.rapidFireTimer = 377;
        } else if (type === 'SPREAD_SHOT') {
          ship.spreadLevel = Math.min(2, ship.spreadLevel + 1);
          setTimeout(() => {
            ship.spreadLevel = Math.max(0, ship.spreadLevel - 1);
          }, 233);
        } else if (type === 'NUKE') {
          ship.nukeCharges = Math.min(3, ship.nukeCharges + 1);
        } else if (type === 'HEALTH_PACK') {
          ship.hp = Math.min(ship.maxHp, ship.hp + 34);
        }
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceEntities = SpaceEntities;
}
