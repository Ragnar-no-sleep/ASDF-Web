/**
 * ASDF Games - Scam Blaster Engine
 *
 * Shooter game: Shoot down scam tokens and rug projects
 * Two modes: Fall mode (protect wallet) and Pop mode (click before vanish)
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const ScamBlaster = {
  ...GameEngineBase,
  version: '1.2.1', // Zero-allocation update
  gameId: 'scamblaster',
  state: null,
  canvas: null,
  ctx: null,
  timing: null,
  juice: null,

  // Enemy types with Fibonacci-based points: 8, 13, 21, 34, 55
  enemyTypes: [
    { icon: '🪙', name: 'SCAM COIN', points: 8, speed: 1, size: 34 }, // fib[5], fib[8]
    { icon: '🔴', name: 'RUG TOKEN', points: 13, speed: 1.2, size: 40 }, // fib[6]
    { icon: '💀', name: 'HONEYPOT', points: 21, speed: 1.4, size: 45 }, // fib[7]
    { icon: '🦠', name: 'MALWARE', points: 34, speed: 1.6, size: 34 }, // fib[8]
    { icon: '👤', name: 'FAKE DEV', points: 55, speed: 1.3, size: 55 }, // fib[9]
    // Shielded enemies (need 2 hits)
    { icon: '🛡️', name: 'SHIELDED', points: 89, speed: 0.8, size: 50, shield: true, hp: 2 },
    // Splitter enemies (split on hit)
    { icon: '🧬', name: 'SPLITTER', points: 34, speed: 1.1, size: 45, splitter: true },
  ],

  // Boss types (every 5th wave)
  bossTypes: [
    {
      icon: '👹',
      name: 'RUG LORD',
      points: 233,
      speed: 0.5,
      size: 80,
      hp: 5,
      patterns: ['zigzag'],
    },
    {
      icon: '🐙',
      name: 'KRAKEN',
      points: 377,
      speed: 0.4,
      size: 90,
      hp: 8,
      patterns: ['spiral', 'spawn'],
    },
    {
      icon: '🤖',
      name: 'BOT KING',
      points: 610,
      speed: 0.3,
      size: 100,
      hp: 13,
      patterns: ['laser', 'shield'],
    },
  ],

  // Weapon types
  weapons: {
    normal: { name: 'BLASTER', icon: '🔫', damage: 1, spread: 0, pierce: false, cooldown: 0 },
    spread: { name: 'SPREAD', icon: '🌟', damage: 1, spread: 3, pierce: false, cooldown: 8 },
    pierce: { name: 'PIERCE', icon: '⚡', damage: 1, spread: 0, pierce: true, cooldown: 13 },
    slow: {
      name: 'FREEZE',
      icon: '❄️',
      damage: 1,
      spread: 0,
      pierce: false,
      cooldown: 21,
      effect: 'slow',
    },
  },

  // Power-up types (dropped by enemies)
  powerUpTypes: [
    { icon: '❤️', name: 'LIFE', effect: 'life', chance: 0.05 },
    { icon: '🌟', name: 'SPREAD', effect: 'spread', chance: 0.08, duration: 300 },
    { icon: '⚡', name: 'PIERCE', effect: 'pierce', chance: 0.08, duration: 300 },
    { icon: '❄️', name: 'FREEZE', effect: 'slow', chance: 0.06, duration: 200 },
    { icon: '💰', name: 'BONUS', effect: 'score', chance: 0.1 },
  ],

  /**
   * Start the game
   */
  start(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    if (!arena) return;

    this.createArena(arena);
    const canvas = document.getElementById('sb-canvas');
    this.init(gameId, canvas);
    this.resizeCanvas();

    this.state = {
      score: 0,
      lives: 3,
      wave: 1,
      gameOver: false,
      phase: 'select',
      countdown: 3,
      gameMode: null,
      crosshair: { x: 0, y: 0 },

      // Initialize Typed Object Pools (Zero-Allocation 2026 Standard)
      // enemyPool itemSize 9: x, y, vy, type, hp, maxHp, size, slowed, lifespan
      enemyPool: typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(100, 9) : null,
      enemies: [], // fallback

      // explosionPool itemSize 4: x, y, life, type
      explosionPool: typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(200, 4) : null,
      explosions: [], // fallback

      // powerUpPool itemSize 5: x, y, vy, life, type
      powerUpPool: typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(20, 5) : null,
      powerUps: [], // fallback

      spawnTimer: 0,
      spawnRate: 89, // fib[10]
      baseSpeed: 1.618, // PHI
      enemySpeed: 1.618,
      frameCount: 0,
      // Wave difficulty scaling
      difficultyLevel: 0,
      // Boss system
      boss: null,
      bossPhase: false,
      bossDefeated: 0,
      // Weapon system
      weapon: 'normal',
      weaponTimer: 0,
      activeEffects: {
        spread: { active: false, endFrame: 0 },
        pierce: { active: false, endFrame: 0 },
        slow: { active: false, endFrame: 0 },
      },
      // Combo system (Fibonacci multipliers: 1, 1, 2, 3, 5)
      combo: 0,
      comboTimer: 0,
      maxComboTime: 89, // fib[10] frames to maintain combo
      lastKillFrame: 0,
    };

    // Initialize timing for frame-independent movement
    this.timing = GameTiming.create();

    // Track resize for modal visibility changes
    this.track(window, 'resize', () => this.resizeCanvas());

    this.setupModeSelection();
    this.setupInput();
    this.preloadSprites();

    // Initialize Game Ticker (2026 Scalable Standard)
    if (typeof GameShared !== 'undefined' && GameShared.Ticker) {
      GameShared.Ticker.start(
        dt => this.update(dt),
        alpha => this.draw(alpha)
      );
    } else if (typeof GameTicker !== 'undefined') {
      GameTicker.start(
        dt => this.update(dt),
        alpha => this.draw(alpha)
      );
    } else {
      console.warn('[ScamBlaster] Ticker missing, falling back to legacy loop');
      this.gameLoop();
    }

    this.registerActiveGame(gameId);
  },

  /**
   * Create arena HTML
   */
  createArena(arena) {
    arena.innerHTML = `
            <div class="sb-container">
                <canvas id="sb-canvas" class="game-canvas"></canvas>
                <div id="sb-mode-select" class="game-mode-overlay">
                    <h2 class="sb-title">&#127919; SCAM BLASTER</h2>
                    <p class="sb-subtitle">Choose your game mode:</p>
                    <div class="game-flex-row">
                        <button id="sb-select-fall" class="game-btn game-btn-success">
                            <div class="game-btn-icon">&#128229;</div>
                            <div class="game-btn-title">FALL MODE</div>
                            <div class="game-btn-desc">Enemies fall down<br>Protect your wallet!</div>
                        </button>
                        <button id="sb-select-pop" class="game-btn game-btn-purple">
                            <div class="game-btn-icon">&#128165;</div>
                            <div class="game-btn-title">POP MODE</div>
                            <div class="game-btn-desc">Enemies pop up anywhere<br>Click before they vanish!</div>
                        </button>
                    </div>
                </div>
                <div id="sb-hud" class="game-hidden">
                    <div class="game-hud-tl">
                        <div class="game-hud-stat">
                            <span class="game-hud-stat-label">SCORE</span>
                            <div class="sb-score-value" id="sb-score">0</div>
                        </div>
                        <div class="game-hud-stat">
                            <span class="game-hud-stat-label">WAVE</span>
                            <div class="sb-wave-value" id="sb-wave">1</div>
                        </div>
                        <div class="game-hud-stat">
                            <span class="game-hud-stat-label">COMBO</span>
                            <div class="sb-combo-value" id="sb-combo">-</div>
                        </div>
                    </div>
                    <div class="game-hud-tr">
                        <div class="game-hud-stat" id="sb-weapon">
                            <span class="sb-weapon-icon">&#128299;</span>
                        </div>
                        <div class="game-hud-stat" id="sb-lives">&#10084;&#10084;&#10084;</div>
                    </div>
                    <div id="sb-wallet" class="sb-wallet">
                        <span class="sb-wallet-icon">&#128188;</span>
                        <span class="sb-wallet-label">YOUR WALLET</span>
                    </div>
                    <div id="sb-boss-hud" class="sb-boss-hud">
                        <div class="sb-boss-name" id="sb-boss-name">BOSS</div>
                        <div class="sb-boss-hp-bar">
                            <div id="sb-boss-hp" class="sb-boss-hp-fill"></div>
                        </div>
                    </div>
                </div>
                <div id="sb-countdown" class="game-countdown"></div>
            </div>
        `;
  },

  /**
   * Preload sprites for performance
   */
  preloadSprites() {
    const sprites = [
      // Enemies
      ...this.enemyTypes.map(e => ({ emoji: e.icon, size: e.size || 40 })),
      // Bosses
      ...this.bossTypes.map(b => ({ emoji: b.icon, size: b.size || 80 })),
      // Power-ups
      ...this.powerUpTypes.map(p => ({ emoji: p.icon, size: 24 })),
      // Explosion
      { emoji: '💥', size: 35 },
    ];
    SpriteCache.preload(sprites);
  },

  /**
   * Resize canvas
   */
  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;

    this.canvas.width = w > 0 ? w : 800;
    this.canvas.height = h > 0 ? h : 600;
    this.walletZone = { y: this.canvas.height - 90, height: 50 };
  },

  /**
   * Setup mode selection
   */
  setupModeSelection() {
    const self = this;
    document.getElementById('sb-select-fall').onclick = () => self.selectMode('fall');
    document.getElementById('sb-select-pop').onclick = () => self.selectMode('pop');
  },

  /**
   * Select game mode
   */
  selectMode(mode) {
    this.state.gameMode = mode;
    document.getElementById('sb-mode-select').style.display = 'none';
    document.getElementById('sb-hud').style.display = 'block';
    document.getElementById('sb-countdown').style.display = 'block';

    if (mode === 'fall') {
      document.getElementById('sb-wallet').style.display = 'flex';
    }

    this.state.phase = 'countdown';
    this.state.countdown = 3;
    document.getElementById('sb-countdown').textContent = '3';
  },

  /**
   * Setup input handlers
   */
  setupInput() {
    const self = this;

    this.handleMove = e => {
      // Use pointer events for zero-latency tracking
      const rect = self.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      self.state.crosshair.x = x * (self.canvas.width / rect.width);
      self.state.crosshair.y = y * (self.canvas.height / rect.height);
    };

    this.handleClick = e => {
      // Prevent default to avoid double-firing on touch devices
      if (e.cancelable) e.preventDefault();
      self.handleMove(e);
      // Instant action on mouse DOWN, not mouse UP
      self.shoot(self.state.crosshair.x, self.state.crosshair.y);
    };

    // Modern zero-latency input standard (Pointer Events)
    // Avoids the 300ms touch delay and click (mouse up) delay
    this.canvas.style.touchAction = 'none'; // Critical for mobile fast-response
    this.track(this.canvas, 'pointermove', this.handleMove);
    this.track(this.canvas, 'pointerdown', this.handleClick);
  },

  /**
   * Add explosion effect (Zero-Allocation using TypedObjectPool)
   */
  addExplosion(x, y, life, icon) {
    if (this.state.explosionPool) {
      const idx = this.state.explosionPool.acquire();
      if (idx !== -1) {
        const offset = idx * this.state.explosionPool.itemSize;
        const data = this.state.explosionPool.data;
        const iconMap = { '💥': 0, '🎆': 1, '✨': 2, '💔': 3, '💨': 4 };
        data[offset + 0] = x;
        data[offset + 1] = y;
        data[offset + 2] = life;
        data[offset + 3] = iconMap[icon] || 0;
      }
    } else {
      this.state.explosions.push({ x, y, life, icon });
    }
  },

  /**
   * Spawn enemy (Zero-Allocation)
   */
  spawnEnemy() {
    if (this.state.enemyPool) {
      // Limit regular enemies - skip if too many (Fib-based limit)
      const maxEnemies = 13 + this.state.wave * 2;
      if (this.state.enemyPool.activeCount >= maxEnemies) return;

      // Choose enemy type based on wave (higher waves unlock harder enemies)
      const maxTypeIndex = Math.min(this.state.wave + 2, this.enemyTypes.length - 1);
      const typeIndex = Math.floor(Math.random() * (maxTypeIndex + 1));
      const type = this.enemyTypes[typeIndex];

      const idx = this.state.enemyPool.acquire();
      if (idx !== -1) {
        const offset = idx * this.state.enemyPool.itemSize;
        const data = this.state.enemyPool.data;
        // itemSize 9: x, y, vy, type, hp, maxHp, size, slowed, lifespan

        if (this.state.gameMode === 'fall') {
          data[offset + 0] = Math.random() * (this.canvas.width - 80) + 40; // x
          data[offset + 1] = -50; // y
          data[offset + 2] = type.speed * this.state.enemySpeed; // vy
          data[offset + 8] = 0; // lifespan not used in fall mode
        } else {
          data[offset + 0] = 60 + Math.random() * (this.canvas.width - 120); // x
          data[offset + 1] = 60 + Math.random() * (this.canvas.height - 180); // y
          data[offset + 2] = 0; // vy
          data[offset + 8] = 90 + Math.random() * 60; // lifespan
        }

        data[offset + 3] = typeIndex; // type
        data[offset + 4] = type.hp || 1; // hp
        data[offset + 5] = type.hp || 1; // maxHp
        data[offset + 6] = type.size || 40; // size
        data[offset + 7] = 0; // slowed (false)
      }
    } else {
      // Legacy fallback
      const maxEnemies = 13 + this.state.wave * 2;
      if (this.state.enemies.length >= maxEnemies) return;

      const maxTypeIndex = Math.min(this.state.wave + 2, this.enemyTypes.length - 1);
      const type = this.enemyTypes[Math.floor(Math.random() * (maxTypeIndex + 1))];

      const enemy = {
        ...type,
        hp: type.hp || 1,
        maxHp: type.hp || 1,
      };

      if (this.state.gameMode === 'fall') {
        enemy.x = Math.random() * (this.canvas.width - 80) + 40;
        enemy.y = -50;
        enemy.vy = type.speed * this.state.enemySpeed;
        this.state.enemies.push(enemy);
      } else {
        enemy.x = 60 + Math.random() * (this.canvas.width - 120);
        enemy.y = 60 + Math.random() * (this.canvas.height - 180);
        enemy.vy = 0;
        enemy.lifespan = 90 + Math.random() * 60;
        enemy.maxLife = enemy.lifespan;
        this.state.enemies.push(enemy);
      }
    }
  },

  /**
   * Spawn boss (every 5th wave)
   */
  spawnBoss() {
    const bossIndex = Math.min(Math.floor(this.state.wave / 5) - 1, this.bossTypes.length - 1);
    const bossType = this.bossTypes[bossIndex];

    this.state.boss = {
      ...bossType,
      x: this.canvas.width / 2,
      y: this.state.gameMode === 'fall' ? -80 : this.canvas.height / 3,
      hp: bossType.hp,
      maxHp: bossType.hp,
      phase: 0,
      patternTimer: 0,
      angle: 0,
    };

    this.state.bossPhase = true;

    // Show boss HUD
    const bossHud = document.getElementById('sb-boss-hud');
    const bossName = document.getElementById('sb-boss-name');
    if (bossHud) bossHud.style.display = 'block';
    if (bossName) bossName.textContent = `👹 ${bossType.name}`;
  },

  /**
   * Calculate combo multiplier (Fibonacci sequence)
   */
  getComboMultiplier() {
    const fib = [1, 1, 2, 3, 5, 8, 13];
    return fib[Math.min(this.state.combo, fib.length - 1)];
  },

  /**
   * Update combo state
   */
  updateCombo(killed) {
    if (killed) {
      this.state.combo++;
      this.state.lastKillFrame = this.state.frameCount;
      // Update combo display
      const comboEl = document.getElementById('sb-combo');
      if (comboEl) {
        const mult = this.getComboMultiplier();
        comboEl.textContent = mult > 1 ? `x${mult}` : '-';
        comboEl.style.color = mult >= 5 ? '#ef4444' : mult >= 3 ? '#f97316' : '#fbbf24';
      }
    } else if (this.state.combo > 0) {
      // Check if combo expired
      if (this.state.frameCount - this.state.lastKillFrame > this.state.maxComboTime) {
        this.state.combo = 0;
        const comboEl = document.getElementById('sb-combo');
        if (comboEl) comboEl.textContent = '-';
      }
    }
  },

  /**
   * Maybe drop power-up from killed enemy
   */
  maybeDropPowerUp(x, y) {
    for (const powerUp of this.powerUpTypes) {
      if (Math.random() < powerUp.chance) {
        this.state.powerUps.push({
          x,
          y,
          vy: 1,
          ...powerUp,
          life: 300, // Fib[13] frames to collect
        });
        return; // Only one power-up per kill
      }
    }
  },

  /**
   * Collect power-up
   */
  collectPowerUp(powerUp) {
    switch (powerUp.effect) {
      case 'life':
        this.state.lives = Math.min(this.state.lives + 1, 5);
        document.getElementById('sb-lives').innerHTML = '❤️'.repeat(this.state.lives);
        break;
      case 'spread':
      case 'pierce':
      case 'slow':
        this.state.activeEffects[powerUp.effect] = {
          active: true,
          endFrame: this.state.frameCount + powerUp.duration,
        };
        break;
      case 'score':
        this.state.score += 50 * this.getComboMultiplier();
        break;
    }
    this.addExplosion(powerUp.x, powerUp.y, 20, powerUp.icon);
  },

  /**
   * Spawn split enemies (from splitter type)
   */
  spawnSplitEnemies(x, y) {
    for (let i = 0; i < 2; i++) {
      const smallEnemy = {
        icon: '🔴',
        name: 'SPLIT',
        points: 8,
        speed: 1.5,
        size: 24,
        hp: 1,
        maxHp: 1,
        x: x + (i === 0 ? -20 : 20),
        y: y,
        vy: this.state.gameMode === 'fall' ? 2 : 0,
      };
      if (this.state.gameMode === 'pop') {
        smallEnemy.lifespan = 60;
        smallEnemy.maxLife = 60;
      }
      this.state.enemies.push(smallEnemy);
    }
  },

  /**
   * Shoot at position
   */
  shoot(x, y) {
    if (this.state.gameOver || this.state.phase !== 'playing') return;

    // Check for active weapon effects
    const hasSpread = this.state.activeEffects.spread.active;
    const hasPierce = this.state.activeEffects.pierce.active;
    const hasSlow = this.state.activeEffects.slow.active;

    // Generate hit points (spread = multiple points)
    const hitPoints = [{ x, y }];
    if (hasSpread) {
      // Add spread shots in a fan pattern
      const spreadAngle = Math.PI / 8;
      for (let i = 1; i <= 2; i++) {
        hitPoints.push(
          { x: x + Math.cos(spreadAngle * i) * 40, y: y + Math.sin(spreadAngle * i) * 40 },
          { x: x + Math.cos(-spreadAngle * i) * 40, y: y + Math.sin(-spreadAngle * i) * 40 }
        );
      }
    }

    let totalHits = 0;
    const self = this;

    // Check boss hit first
    if (this.state.boss && !this.state.boss.defeated) {
      for (const point of hitPoints) {
        const dx = point.x - this.state.boss.x;
        const dy = point.y - this.state.boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.state.boss.size) {
          this.state.boss.hp--;
          totalHits++;
          this.addExplosion(this.state.boss.x, this.state.boss.y, 15, '💥');

          // Update boss HP bar
          const bossHpEl = document.getElementById('sb-boss-hp');
          if (bossHpEl) {
            bossHpEl.style.width = `${(this.state.boss.hp / this.state.boss.maxHp) * 100}%`;
          }

          // Check boss death
          if (this.state.boss.hp <= 0) {
            this.state.score += this.state.boss.points * this.getComboMultiplier();
            this.addExplosion(this.state.boss.x, this.state.boss.y, 40, '🎆');
            this.state.bossDefeated++;
            this.state.boss = null;
            this.state.bossPhase = false;
            // Reset boss HP bar before hiding to prevent stale data on next boss
            const bossHpBar = document.getElementById('sb-boss-hp');
            if (bossHpBar) bossHpBar.style.width = '100%';
            document.getElementById('sb-boss-hud').style.display = 'none';
          }

          if (!hasPierce) break;
        }
      }
    }

    // Check enemy hits (Zero-Allocation Pool)
    if (this.state.enemyPool) {
      const pool = this.state.enemyPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          // data: 0:x, 1:y, 2:vy, 3:type, 4:hp, 5:maxHp, 6:size, 7:slowed, 8:lifespan

          for (let pIdx = 0; pIdx < hitPoints.length; pIdx++) {
            const point = hitPoints[pIdx];
            if (!point.active && pIdx !== 0) continue; // Skip consumed pierce points, 0 is always active for simplicity unless set

            const dx = point.x - data[offset + 0];
            const dy = point.y - data[offset + 1];
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < data[offset + 6]) {
              // Apply slow effect
              if (hasSlow && data[offset + 7] === 0) {
                data[offset + 7] = 1;
                data[offset + 2] *= 0.5; // vy *= 0.5
                if (data[offset + 8] > 0) data[offset + 8] *= 1.5; // lifespan *= 1.5
              }

              data[offset + 4]--; // hp--
              totalHits++;

              if (data[offset + 4] <= 0) {
                // Enemy killed
                const typeObj = this.enemyTypes[Math.floor(data[offset + 3])];
                const comboMult = this.getComboMultiplier();
                this.state.score += typeObj.points * comboMult;
                this.addExplosion(data[offset + 0], data[offset + 1], 20, '💥');

                if (typeObj.splitter) {
                  this.spawnSplitEnemies(data[offset + 0], data[offset + 1]);
                }

                this.maybeDropPowerUp(data[offset + 0], data[offset + 1]);
                this.updateCombo(true);

                pool.release(i);
              } else {
                // Damaged
                this.addExplosion(data[offset + 0], data[offset + 1], 10, '✨');
              }

              if (!hasPierce) {
                point.active = false; // Mark bullet point as consumed
                if (pIdx === 0) hitPoints.length = 0; // if main bullet, consume all (simple logic)
              }
              break; // Move to next enemy
            }
          }
        }
      }
    } else {
      // Legacy Check enemy hits
      this.state.enemies = this.state.enemies.filter(enemy => {
        for (const point of hitPoints) {
          const dx = point.x - enemy.x;
          const dy = point.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < enemy.size) {
            // Apply slow effect
            if (hasSlow && !enemy.slowed) {
              enemy.slowed = true;
              enemy.vy *= 0.5;
              if (enemy.lifespan) enemy.lifespan *= 1.5;
            }

            enemy.hp--;
            totalHits++;

            if (enemy.hp <= 0) {
              // Enemy killed
              const comboMult = self.getComboMultiplier();
              self.state.score += enemy.points * comboMult;
              self.addExplosion(enemy.x, enemy.y, 20, '💥');

              // Handle splitter
              if (enemy.splitter) {
                self.spawnSplitEnemies(enemy.x, enemy.y);
              }

              // Maybe drop power-up
              self.maybeDropPowerUp(enemy.x, enemy.y);

              // Update combo
              self.updateCombo(true);

              if (!hasPierce) return false;
              return false; // Remove enemy
            } else {
              // Enemy damaged but not killed
              self.addExplosion(enemy.x, enemy.y, 10, '✨');
              if (!hasPierce) return true;
            }
          }
        }
        return true;
      });
    }

    if (totalHits === 0) {
      this.addExplosion(x, y, 10, '💨');
    }
  },

  /**
   * Update game state
   * @param {number} dt - Delta time normalized to 60fps
   */
  update(dt) {
    if (this.state.gameOver) return;
    if (this.state.phase === 'select' || !this.state.gameMode) return;

    if (this.state.phase === 'countdown') {
      this.state.frameCount += dt;
      if (this.state.frameCount >= 60) {
        this.state.countdown--;
        this.state.frameCount = 0;
        if (this.state.countdown <= 0) {
          this.state.phase = 'playing';
          document.getElementById('sb-countdown').style.display = 'none';
        } else {
          document.getElementById('sb-countdown').textContent = this.state.countdown;
        }
      }
      return;
    }

    this.state.frameCount += dt;

    const timeBonus = this.state.frameCount * 0.00003;
    this.state.enemySpeed = this.state.baseSpeed + this.state.wave * 0.4 + timeBonus;

    // Update combo timer
    this.updateCombo(false);

    // Update weapon effects expiration
    for (const effect of Object.keys(this.state.activeEffects)) {
      if (
        this.state.activeEffects[effect].active &&
        this.state.frameCount > this.state.activeEffects[effect].endFrame
      ) {
        this.state.activeEffects[effect].active = false;
      }
    }

    // Update weapon display
    const weaponEl = document.getElementById('sb-weapon');
    if (weaponEl) {
      let icon = '🔫';
      if (this.state.activeEffects.spread.active) icon = '🌟';
      else if (this.state.activeEffects.pierce.active) icon = '⚡';
      else if (this.state.activeEffects.slow.active) icon = '❄️';
      weaponEl.innerHTML = `<span class="sb-weapon-icon">${icon}</span>`;
    }

    // Check for boss wave (every 5th wave)
    if (this.state.wave % 5 === 0 && !this.state.bossPhase && !this.state.boss) {
      // Clear remaining enemies before boss
      const enemyCount = this.state.enemyPool
        ? this.state.enemyPool.activeCount
        : this.state.enemies.length;
      if (enemyCount === 0) {
        this.spawnBoss();
      }
    }

    // Update boss
    if (this.state.boss) {
      // Boss movement patterns
      this.state.boss.patternTimer += dt;
      this.state.boss.angle += 0.02 * dt;

      if (this.state.gameMode === 'fall') {
        // Move down slowly, zigzag
        if (this.state.boss.y < 100) {
          this.state.boss.y += 0.5 * dt;
        }
        this.state.boss.x = this.canvas.width / 2 + Math.sin(this.state.boss.angle) * 100;
      } else {
        // Move around in pop mode
        this.state.boss.x = this.canvas.width / 2 + Math.sin(this.state.boss.angle) * 80;
        this.state.boss.y = this.canvas.height / 3 + Math.cos(this.state.boss.angle * 0.7) * 50;
      }
    }

    // Spawn enemies (not during boss phase)
    if (!this.state.bossPhase) {
      this.state.spawnTimer += dt;
      const dynamicSpawnRate = Math.max(
        25,
        this.state.spawnRate - this.state.wave * 8 - this.state.frameCount * 0.01
      );
      if (this.state.spawnTimer >= dynamicSpawnRate) {
        this.spawnEnemy();
        this.state.spawnTimer = 0;
      }
    }

    const livesEl = document.getElementById('sb-lives');
    const scoreEl = document.getElementById('sb-score');
    const waveEl = document.getElementById('sb-wave');
    const self = this;

    // Update Enemies (Zero-Allocation Pool)
    if (this.state.enemyPool) {
      const pool = this.state.enemyPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;

          if (self.state.gameMode === 'fall') {
            data[offset + 1] += data[offset + 2] * dt; // y += vy

            if (data[offset + 1] > self.walletZone.y) {
              self.state.lives--;
              self.addExplosion(data[offset + 0], data[offset + 1], 25, '💔');
              if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

              if (self.state.lives <= 0) {
                self.state.gameOver = true;
                endGame(self.gameId, self.state.score);
              }
              pool.release(i);
            }
          } else {
            // Pop mode
            data[offset + 8] -= self.state.enemySpeed * 0.5 * dt; // lifespan -= ...
            if (data[offset + 8] <= 0) {
              self.state.lives--;
              self.addExplosion(data[offset + 0], data[offset + 1], 25, '💔');
              if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

              if (self.state.lives <= 0) {
                self.state.gameOver = true;
                endGame(self.gameId, self.state.score);
              }
              pool.release(i);
            }
          }
        }
      }
    } else {
      // Legacy enemies update
      this.state.enemies = this.state.enemies.filter(enemy => {
        if (self.state.gameMode === 'fall') {
          enemy.y += enemy.vy * self.state.enemySpeed * dt;

          if (enemy.y > self.walletZone.y) {
            self.state.lives--;
            self.addExplosion(enemy.x, enemy.y, 25, '💔');
            if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

            if (self.state.lives <= 0) {
              self.state.gameOver = true;
              endGame(self.gameId, self.state.score);
            }
            return false;
          }
        } else {
          enemy.lifespan -= self.state.enemySpeed * 0.5 * dt;
          if (enemy.lifespan <= 0) {
            self.state.lives--;
            self.addExplosion(enemy.x, enemy.y, 25, '💔');
            if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

            if (self.state.lives <= 0) {
              self.state.gameOver = true;
              endGame(self.gameId, self.state.score);
            }
            return false;
          }
        }
        return true;
      });
    }

    if (this.state.score >= this.state.wave * 300) {
      this.state.wave++;
      if (waveEl) waveEl.textContent = this.state.wave;
      this.state.baseSpeed += 0.3;
    }

    // Update explosions (TypedObjectPool Zero-Allocation)
    if (this.state.explosionPool) {
      const pool = this.state.explosionPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;

          data[offset + 2] -= dt; // life -= dt
          if (data[offset + 2] <= 0) {
            pool.release(i);
          }
        }
      }
    } else {
      // Legacy fallback
      this.state.explosions = this.state.explosions.filter(exp => {
        exp.life -= dt;
        return exp.life > 0;
      });
    }

    // Update power-ups
    const crosshair = this.state.crosshair;
    if (this.state.powerUpPool) {
      const pool = this.state.powerUpPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          // data: 0:x, 1:y, 2:vy, 3:life, 4:type

          data[offset + 1] += data[offset + 2] * dt; // y += vy
          data[offset + 3] -= dt; // life -= dt

          const dx = crosshair.x - data[offset + 0];
          const dy = crosshair.y - data[offset + 1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) {
            const powerUpDef = this.powerUpTypes[Math.floor(data[offset + 4])];
            this.collectPowerUp({
              x: data[offset + 0],
              y: data[offset + 1],
              effect: powerUpDef.effect,
              duration: powerUpDef.duration,
              icon: powerUpDef.icon,
            });
            pool.release(i);
            continue;
          }

          if (data[offset + 3] <= 0 || data[offset + 1] > this.canvas.height) {
            pool.release(i);
          }
        }
      }
    } else {
      this.state.powerUps = this.state.powerUps.filter(powerUp => {
        powerUp.y += powerUp.vy * dt;
        powerUp.life -= dt;

        // Check collection (click near power-up)
        const dx = crosshair.x - powerUp.x;
        const dy = crosshair.y - powerUp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          self.collectPowerUp(powerUp);
          return false;
        }

        return powerUp.life > 0 && powerUp.y < this.canvas.height;
      });
    }

    if (scoreEl) scoreEl.textContent = this.state.score;
    updateScore(this.gameId, this.state.score);
  },

  /**
   * Draw game
   */
  draw() {
    const ctx = this.ctx;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(0.5, '#151530');
    bgGrad.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw enemies (TypedObjectPool Zero-Allocation)
    if (this.state.enemyPool) {
      const pool = this.state.enemyPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          const typeObj = this.enemyTypes[Math.floor(data[offset + 3])];

          if (this.state.gameMode === 'pop') {
            const maxLife = 90 + Math.random() * 60; // Approximate fallback for maxLife not stored
            const progress = data[offset + 8] / 120; // estimate
            const radius = data[offset + 6] + 8;

            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(data[offset + 0] | 0, data[offset + 1] | 0, radius | 0, 0, Math.PI * 2);
            ctx.stroke();

            const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#fbbf24' : '#ef4444';
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(
              data[offset + 0] | 0,
              data[offset + 1] | 0,
              radius | 0,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * Math.max(0, progress)
            );
            ctx.stroke();
          }

          if (typeObj.shield || data[offset + 4] > 1) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
              data[offset + 0] | 0,
              data[offset + 1] | 0,
              (data[offset + 6] * 0.7) | 0,
              0,
              Math.PI * 2
            );
            ctx.stroke();

            if (data[offset + 5] > 1) {
              ctx.fillStyle = '#3b82f6';
              ctx.font = '12px Arial';
              ctx.fillText(
                `${data[offset + 4]}/${data[offset + 5]}`,
                data[offset + 0] | 0,
                (data[offset + 1] + data[offset + 6] * 0.6) | 0
              );
            }
          }

          if (data[offset + 7] === 1) {
            ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
            ctx.beginPath();
            ctx.arc(
              data[offset + 0] | 0,
              data[offset + 1] | 0,
              (data[offset + 6] * 0.8) | 0,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }

          SpriteCache.draw(ctx, typeObj.icon, data[offset + 0], data[offset + 1], data[offset + 6]);
        }
      }
    } else {
      // Legacy enemies draw
      this.state.enemies.forEach(enemy => {
        // Pop mode timer ring
        if (this.state.gameMode === 'pop' && enemy.lifespan !== undefined) {
          const progress = enemy.lifespan / enemy.maxLife;
          const radius = enemy.size + 8;

          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(enemy.x | 0, enemy.y | 0, radius | 0, 0, Math.PI * 2);
          ctx.stroke();

          const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#fbbf24' : '#ef4444';
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(
            enemy.x | 0,
            enemy.y | 0,
            radius | 0,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * progress
          );
          ctx.stroke();
        }

        // Shield indicator for shielded enemies (no shadowBlur for performance)
        if (enemy.shield || enemy.hp > 1) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(enemy.x | 0, enemy.y | 0, (enemy.size * 0.7) | 0, 0, Math.PI * 2);
          ctx.stroke();

          // HP indicator
          if (enemy.maxHp > 1) {
            ctx.fillStyle = '#3b82f6';
            ctx.font = '12px Arial';
            ctx.fillText(
              `${enemy.hp}/${enemy.maxHp}`,
              enemy.x | 0,
              (enemy.y + enemy.size * 0.6) | 0
            );
          }
        }

        // Slowed indicator
        if (enemy.slowed) {
          ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
          ctx.beginPath();
          ctx.arc(enemy.x | 0, enemy.y | 0, (enemy.size * 0.8) | 0, 0, Math.PI * 2);
          ctx.fill();
        }

        SpriteCache.draw(ctx, enemy.icon, enemy.x, enemy.y, enemy.size);
      });
    }

    // Draw boss (using SpriteCache)
    if (this.state.boss) {
      const boss = this.state.boss;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(boss.x | 0, boss.y | 0, (boss.size * 0.8) | 0, 0, Math.PI * 2);
      ctx.stroke();

      // Boss icon
      SpriteCache.draw(ctx, boss.icon, boss.x, boss.y, boss.size);
    }

    // Draw power-ups (TypedObjectPool Zero-Allocation)
    if (this.state.powerUpPool) {
      const pool = this.state.powerUpPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;
          const powerUp = this.powerUpTypes[Math.floor(data[offset + 4])];

          const pulse = Math.sin(this.state.frameCount * 0.1) * 0.2 + 1;
          SpriteCache.drawTransformed(ctx, powerUp.icon, data[offset + 0], data[offset + 1], 24, {
            scaleX: pulse,
            scaleY: pulse,
          });
        }
      }
    } else {
      this.state.powerUps.forEach(powerUp => {
        const pulse = Math.sin(this.state.frameCount * 0.1) * 0.2 + 1;
        SpriteCache.drawTransformed(ctx, powerUp.icon, powerUp.x, powerUp.y, 24, {
          scaleX: pulse,
          scaleY: pulse,
        });
      });
    }

    // Explosions (TypedObjectPool Zero-Allocation)
    if (this.state.explosionPool) {
      const icons = ['💥', '🎆', '✨', '💔', '💨'];
      this.state.explosionPool.forEach((i, data, offset) => {
        // x, y, life, type
        const life = data[offset + 2];
        const icon = icons[Math.floor(data[offset + 3])] || '💥';
        const scale = 1 + (25 - life) * 0.06;
        SpriteCache.drawTransformed(ctx, icon, data[offset + 0], data[offset + 1], 35, {
          scaleX: scale,
          scaleY: scale,
          alpha: life / 25,
        });
      });
    } else {
      // Legacy fallback
      this.state.explosions.forEach(exp => {
        const scale = 1 + (25 - exp.life) * 0.06;
        SpriteCache.drawTransformed(ctx, exp.icon, exp.x, exp.y, 35, {
          scaleX: scale,
          scaleY: scale,
          alpha: exp.life / 25,
        });
      });
    }

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.state.crosshair.x | 0, this.state.crosshair.y | 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((this.state.crosshair.x - 25) | 0, this.state.crosshair.y | 0);
    ctx.lineTo((this.state.crosshair.x - 8) | 0, this.state.crosshair.y | 0);
    ctx.moveTo((this.state.crosshair.x + 8) | 0, this.state.crosshair.y | 0);
    ctx.lineTo((this.state.crosshair.x + 25) | 0, this.state.crosshair.y | 0);
    ctx.moveTo(this.state.crosshair.x | 0, (this.state.crosshair.y - 25) | 0);
    ctx.lineTo(this.state.crosshair.x | 0, (this.state.crosshair.y - 8) | 0);
    ctx.moveTo(this.state.crosshair.x | 0, (this.state.crosshair.y + 8) | 0);
    ctx.lineTo(this.state.crosshair.x | 0, (this.state.crosshair.y + 25) | 0);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(this.state.crosshair.x | 0, this.state.crosshair.y | 0, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  /**
   * Stop the game
   */
  stop() {
    GameEngineBase.stop.call(this);
    if (typeof GameShared !== 'undefined' && GameShared.Ticker) {
      GameShared.Ticker.stop();
    } else if (typeof GameTicker !== 'undefined') {
      GameTicker.stop();
    }
  },
};

// Export
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlaster = ScamBlaster;
  window.ScamBlaster = window.ASDF.ScamBlaster;
}
