/**
 * ASDF Games - Token Catcher Engine
 *
 * Arcade game: Catch falling ASDF tokens, avoid scam tokens and skulls
 * Uses shared modules for lifecycle, scoring, and input management
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const TokenCatcher = {
  version: '1.3.0', // Power-ups added
  gameId: 'tokencatcher',
  state: null,
  canvas: null,
  ctx: null,
  intervals: null,
  input: null,
  timing: null,
  juice: null,

  // Game constants
  goodTokens: ['🔥', '💰', '⭐', '💎', '🪙'],
  scamTokens: ['🚨', '❌', '🦠'],
  skullToken: '💀',

  // Power-up definitions (Fibonacci durations in frames @ 60fps)
  powerUps: {
    magnet: { icon: '🧲', duration: 233, color: '#3b82f6', name: 'MAGNET' }, // ~3.9s
    slowmo: { icon: '⏱️', duration: 144, color: '#a855f7', name: 'SLOW-MO' }, // ~2.4s
    double: { icon: '✨', duration: 377, color: '#fbbf24', name: '2X SCORE' }, // ~6.3s
    shield: { icon: '🛡️', duration: 233, color: '#22c55e', name: 'SHIELD' }, // ~3.9s
  },

  enemyTypes: [
    { icon: '👾', name: 'INVADER', hp: 3, points: 50, speed: 1.5 },
    { icon: '🤖', name: 'BOT', hp: 3, points: 40, speed: 1.8 },
    { icon: '👹', name: 'DEMON', hp: 3, points: 60, speed: 1.2 },
  ],

  /**
   * Start the game
   * @param {string} gameId - The game ID
   */
  start(gameId) {
    console.log(`[TokenCatcher v${this.version}] Starting - ALL tokens shootable`);
    this.gameId = gameId;
    const arena = document.getElementById(`arena-${gameId}`);
    if (!arena) {
      console.error(`[TokenCatcher] Arena not found: arena-${gameId}`);
      return;
    }

    // Initialize game state with Fibonacci-based values
    this.state = {
      score: 0,
      timeLeft: 34, // fib[8] seconds
      gameOver: false,
      basketPos: 50,
      basketLane: 1,
      moveDirection: 0,
      moveSpeed: 5, // fib[4]
      moveAccel: 0,
      maxAccel: 13, // fib[6]
      tokens: [],
      projectiles: [],
      enemies: [],
      effects: [],
      keys: { left: false, right: false, up: false, down: false },
      lastShot: 0,
      shootCooldown: 233, // fib[11] ms
      mouseX: 0,
      mouseY: 0,
      basketWidth: 89, // fib[10]
      basketHeight: 55, // fib[9]
      laneHeight: 0,
      lanePositions: [],
      // Combo system
      combo: 0,
      comboTimer: 0,
      comboTimeout: 1300, // fib[6] * 100 ms - time to lose combo
      maxCombo: 0,
      // Speed ramping (Fibonacci-based difficulty curve)
      difficultyLevel: 0,
      spawnRate: 500, // Base spawn rate (ms)
      tokenSpeedBase: 3,
      tokenSpeedVariance: 2,
      // Power-ups state
      activePowerUps: {
        magnet: 0, // Remaining frames
        slowmo: 0,
        double: 0,
        shield: 0,
      },
      powerUpTokens: [], // Falling power-up tokens
    };

    // Create arena HTML
    this.createArena(arena);

    // Setup canvas
    this.canvas = document.getElementById('tc-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Cache DOM references for performance (avoid lookups in game loop)
    this.dom = {
      score: document.getElementById('tc-score'),
      time: document.getElementById('tc-time'),
      combo: document.getElementById('tc-combo'),
      comboContainer: document.getElementById('tc-combo-container'),
    };

    this.resizeCanvas();

    // Initialize timing for frame-independent movement
    this.timing = GameTiming.create();

    // Initialize juice system for visual feedback
    if (typeof GameJuice !== 'undefined') {
      this.juice = GameJuice.create(this.canvas, this.ctx);
    }

    // Initialize basket position
    this.state.basketPos = this.canvas.width / 2;

    // Setup input handlers
    this.setupInput();

    // Setup intervals
    this.setupIntervals();

    // Preload sprites for performance
    this.preloadSprites();

    // Start game loop
    this.gameLoop();

    // Register with activeGames for legacy cleanup
    if (typeof activeGames !== 'undefined') {
      activeGames[gameId] = {
        interval: null,
        cleanup: () => this.stop(),
      };
    }
  },

  /**
   * Create the game arena HTML
   * @param {HTMLElement} arena - The arena container
   */
  createArena(arena) {
    arena.innerHTML = `
            <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 50%,#1a1a2e 100%);">
                <canvas id="tc-canvas" style="width:100%;height:100%;"></canvas>
                <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                    <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--text-muted);font-size:12px;">SCORE</span>
                        <div style="color:var(--gold);font-size:20px;font-weight:bold;" id="tc-score">0</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--text-muted);font-size:12px;">TIME</span>
                        <div style="color:var(--accent-fire);font-size:20px;font-weight:bold;" id="tc-time">34</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;" id="tc-combo-container">
                        <span style="color:var(--text-muted);font-size:12px;">COMBO</span>
                        <div style="color:#a855f7;font-size:20px;font-weight:bold;" id="tc-combo">0<span style="font-size:12px;color:var(--text-muted);">x</span></div>
                    </div>
                </div>
                <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:10px;text-align:center;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;">
                    QZSD/Arrows: Move | SPACE/Click: Shoot | &#128128; = Death!
                </div>
            </div>
        `;
  },

  /**
   * Preload sprites for performance
   */
  preloadSprites() {
    const sprites = [
      // Basket
      { emoji: '🧺', size: 60 },
      // Good tokens
      ...this.goodTokens.map(t => ({ emoji: t, size: 30 })),
      // Scam tokens
      ...this.scamTokens.map(t => ({ emoji: t, size: 30 })),
      // Skull
      { emoji: this.skullToken, size: 30 },
      // Power-ups
      ...Object.values(this.powerUps).map(p => ({ emoji: p.icon, size: 28 })),
      // Enemies
      ...this.enemyTypes.map(e => ({ emoji: e.icon, size: 35 })),
    ];
    SpriteCache.preload(sprites);
  },

  /**
   * Resize canvas to fit container
   */
  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Calculate 3 lane positions
    this.state.laneHeight = 50;
    const bottomMargin = 40;
    this.state.lanePositions = [
      this.canvas.height - bottomMargin - this.state.laneHeight * 2.5,
      this.canvas.height - bottomMargin - this.state.laneHeight * 1.5,
      this.canvas.height - bottomMargin - this.state.laneHeight * 0.5,
    ];
  },

  /**
   * Setup input handlers
   */
  setupInput() {
    const self = this;

    this.handleKeyDown = function (e) {
      if (self.state.gameOver) return;
      const key = e.key.toLowerCase();

      if (key === 'q' || key === 'arrowleft') {
        self.state.keys.left = true;
        e.preventDefault();
      } else if (key === 'd' || key === 'arrowright') {
        self.state.keys.right = true;
        e.preventDefault();
      }

      if (key === 'z' || key === 'arrowup') {
        if (self.state.basketLane > 0) {
          self.state.basketLane--;
          recordGameAction(self.gameId, 'lane_change', { lane: self.state.basketLane });
        }
        e.preventDefault();
      } else if (key === 's' || key === 'arrowdown') {
        if (self.state.basketLane < 2) {
          self.state.basketLane++;
          recordGameAction(self.gameId, 'lane_change', { lane: self.state.basketLane });
        }
        e.preventDefault();
      }

      if (key === ' ' || key === 'space') {
        self.shoot(self.state.mouseX, self.state.mouseY);
        recordGameAction(self.gameId, 'shoot', {
          x: self.state.basketPos,
          lane: self.state.basketLane,
          targetX: self.state.mouseX,
          targetY: self.state.mouseY,
        });
        e.preventDefault();
      }
    };

    this.handleKeyUp = function (e) {
      const key = e.key.toLowerCase();
      if (key === 'q' || key === 'arrowleft') {
        self.state.keys.left = false;
      } else if (key === 'd' || key === 'arrowright') {
        self.state.keys.right = false;
      }
    };

    this.handleMouseMove = function (e) {
      const rect = self.canvas.getBoundingClientRect();
      self.state.mouseX = (e.clientX - rect.left) * (self.canvas.width / rect.width);
      self.state.mouseY = (e.clientY - rect.top) * (self.canvas.height / rect.height);
    };

    this.handleTouch = function (e) {
      if (self.state.gameOver) return;
      e.preventDefault();
      const rect = self.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      self.state.basketPos = (touch.clientX - rect.left) * (self.canvas.width / rect.width);
      self.state.basketPos = Math.max(
        self.state.basketWidth / 2,
        Math.min(self.canvas.width - self.state.basketWidth / 2, self.state.basketPos)
      );
    };

    this.handleClick = function (e) {
      if (self.state.gameOver) return;
      const rect = self.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (self.canvas.width / rect.width);
      const clickY = (e.clientY - rect.top) * (self.canvas.height / rect.height);
      self.shoot(clickX, clickY);
      recordGameAction(self.gameId, 'shoot_click', {
        x: self.state.basketPos,
        lane: self.state.basketLane,
        targetX: clickX,
        targetY: clickY,
      });
    };

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('touchmove', this.handleTouch, { passive: false });
    this.canvas.addEventListener('touchstart', this.handleTouch, { passive: false });
    this.canvas.addEventListener('click', this.handleClick);
  },

  /**
   * Setup game intervals
   */
  setupIntervals() {
    const self = this;

    // Token spawn interval
    this.spawnInterval = setInterval(() => {
      if (!self.state.gameOver) {
        self.spawnToken();
        self.spawnPowerUp(); // Chance to spawn power-up
      }
    }, 500);

    // Timer countdown with difficulty progression
    this.timerInterval = setInterval(() => {
      if (self.state.gameOver) return;
      self.state.timeLeft--;
      if (self.dom.time) self.dom.time.textContent = self.state.timeLeft;

      // Update difficulty curve
      self.updateDifficulty();

      if (self.state.timeLeft <= 0) {
        self.state.gameOver = true;
        endGame(self.gameId, self.state.score);
      }
    }, 1000);

    // Enemy spawn interval
    this.enemySpawnInterval = setInterval(() => {
      if (!self.state.gameOver && Math.random() < 0.6) self.spawnEnemy();
    }, 3000);
  },

  /**
   * Spawn a token
   */
  spawnToken() {
    if (this.state.gameOver) return;
    const roll = Math.random();
    const baseSpeed = this.state.tokenSpeedBase;
    const variance = this.state.tokenSpeedVariance;

    if (roll < 0.1) {
      // Skull tokens - deadly, moderate speed
      this.state.tokens.push({
        x: 30 + Math.random() * (this.canvas.width - 60),
        y: -30,
        icon: this.skullToken,
        isSkull: true,
        isScam: false,
        speed: baseSpeed + Math.random() * variance,
      });
    } else if (roll < 0.25) {
      // Scam tokens - faster, penalty on catch
      this.state.tokens.push({
        x: 30 + Math.random() * (this.canvas.width - 60),
        y: -30,
        icon: this.scamTokens[Math.floor(Math.random() * this.scamTokens.length)],
        isSkull: false,
        isScam: true,
        speed: baseSpeed * 1.2 + Math.random() * variance,
      });
    } else {
      // Good tokens - reward on catch
      this.state.tokens.push({
        x: 30 + Math.random() * (this.canvas.width - 60),
        y: -30,
        icon: this.goodTokens[Math.floor(Math.random() * this.goodTokens.length)],
        isSkull: false,
        isScam: false,
        speed: baseSpeed + Math.random() * variance,
      });
    }
  },

  /**
   * Spawn an enemy
   */
  spawnEnemy() {
    if (this.state.gameOver) return;
    const type = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
    this.state.enemies.push({
      x: 30 + Math.random() * (this.canvas.width - 60),
      y: -40,
      ...type,
      currentHp: type.hp,
      speed: type.speed + Math.random() * 0.5,
    });
  },

  /**
   * Spawn a power-up token (rare, ~5% chance per spawn cycle)
   */
  spawnPowerUp() {
    if (this.state.gameOver) return;
    if (Math.random() > 0.05) return; // 5% chance

    const types = Object.keys(this.powerUps);
    const type = types[Math.floor(Math.random() * types.length)];
    const powerUp = this.powerUps[type];

    this.state.powerUpTokens.push({
      x: 50 + Math.random() * (this.canvas.width - 100),
      y: -30,
      type: type,
      icon: powerUp.icon,
      color: powerUp.color,
      speed: 2 + Math.random(), // Slower than regular tokens
    });
  },

  /**
   * Activate a power-up
   */
  activatePowerUp(type) {
    const powerUp = this.powerUps[type];
    this.state.activePowerUps[type] = powerUp.duration;

    // Visual feedback
    this.addEffect(
      this.state.basketPos,
      this.state.lanePositions[this.state.basketLane] - 50,
      powerUp.name,
      powerUp.color,
      { size: 20 }
    );

    if (this.juice) {
      this.juice.triggerFlash(powerUp.color, 200);
      this.juice.burst(this.state.basketPos, this.state.lanePositions[this.state.basketLane], {
        icon: powerUp.icon,
        count: 8,
        spread: 5,
        lifetime: 40,
      });
    }

    // Play sound if available
    if (typeof GameJuice !== 'undefined' && GameJuice.playSound) {
      GameJuice.playSound('powerup');
    }
  },

  /**
   * Check if a power-up is active
   */
  isPowerUpActive(type) {
    return this.state.activePowerUps[type] > 0;
  },

  /**
   * Update power-up timers
   */
  updatePowerUps(dt) {
    for (const type in this.state.activePowerUps) {
      if (this.state.activePowerUps[type] > 0) {
        this.state.activePowerUps[type] -= dt;
        if (this.state.activePowerUps[type] <= 0) {
          this.state.activePowerUps[type] = 0;
        }
      }
    }
  },

  /**
   * Shoot a projectile
   */
  shoot(targetX, targetY) {
    const now = Date.now();
    if (now - this.state.lastShot < this.state.shootCooldown) return;
    this.state.lastShot = now;

    const basketY = this.state.lanePositions[this.state.basketLane];
    const startX = this.state.basketPos;
    const startY = basketY - 30;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);

    const speed = 20; // Increased from 14 for snappier feel
    const vx = dist > 0 ? (dx / dist) * speed : 0;
    const vy = dist > 0 ? (dy / dist) * speed : -speed;

    this.state.projectiles.push({ x: startX, y: startY, vx: vx, vy: vy });
    this.addEffect(startX, startY, '•', '#fbbf24');
  },

  /**
   * Move the basket
   * @param {number} dt - Delta time normalized to 60fps
   */
  moveBasket(dt) {
    if (this.state.keys.left || this.state.keys.right) {
      this.state.moveAccel = Math.min(this.state.moveAccel + 0.6 * dt, this.state.maxAccel);
      const step = (this.state.moveSpeed + this.state.moveAccel) * dt;
      if (this.state.keys.left) this.state.basketPos -= step;
      if (this.state.keys.right) this.state.basketPos += step;
      this.state.basketPos = Math.max(
        this.state.basketWidth / 2,
        Math.min(this.canvas.width - this.state.basketWidth / 2, this.state.basketPos)
      );
    } else {
      this.state.moveAccel = Math.max(0, this.state.moveAccel - 1.5 * dt);
    }
  },

  /**
   * Increment combo and get multiplier
   * Fibonacci-based multiplier: 1x, 1x, 2x, 3x, 5x, 8x...
   */
  incrementCombo() {
    this.state.combo++;
    this.state.comboTimer = this.state.comboTimeout;
    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }
    this.updateComboDisplay();
    return this.getComboMultiplier();
  },

  /**
   * Get current combo multiplier (Fibonacci-based)
   */
  getComboMultiplier() {
    // Fibonacci multiplier: combo 0-2 = 1x, 3-4 = 2x, 5-7 = 3x, 8-12 = 5x, 13+ = 8x
    const combo = this.state.combo;
    if (combo < 3) return 1;
    if (combo < 5) return 2;
    if (combo < 8) return 3;
    if (combo < 13) return 5;
    return 8;
  },

  /**
   * Reset combo on damage
   */
  resetCombo() {
    this.state.combo = 0;
    this.state.comboTimer = 0;
    this.updateComboDisplay();
  },

  /**
   * Update combo display
   */
  updateComboDisplay() {
    const comboEl = this.dom.combo;
    const containerEl = this.dom.comboContainer;
    if (comboEl) {
      const multiplier = this.getComboMultiplier();
      comboEl.innerHTML = `${this.state.combo}<span style="font-size:12px;color:${multiplier > 1 ? '#fbbf24' : 'var(--text-muted)'};">x${multiplier}</span>`;

      // Visual feedback for high combos
      if (containerEl) {
        if (multiplier >= 5) {
          containerEl.style.background = 'rgba(168,85,247,0.4)';
          containerEl.style.boxShadow = '0 0 20px rgba(168,85,247,0.5)';
        } else if (multiplier >= 3) {
          containerEl.style.background = 'rgba(251,191,36,0.3)';
          containerEl.style.boxShadow = '0 0 10px rgba(251,191,36,0.3)';
        } else {
          containerEl.style.background = 'rgba(0,0,0,0.5)';
          containerEl.style.boxShadow = 'none';
        }
      }
    }
  },

  /**
   * Update difficulty (Fibonacci-based progression)
   * Called each second, increases spawn rate and token speed
   */
  updateDifficulty() {
    const elapsed = 34 - this.state.timeLeft;
    // Difficulty increases at fib intervals: 5s, 8s, 13s, 21s
    if (elapsed >= 21) {
      this.state.difficultyLevel = 4;
    } else if (elapsed >= 13) {
      this.state.difficultyLevel = 3;
    } else if (elapsed >= 8) {
      this.state.difficultyLevel = 2;
    } else if (elapsed >= 5) {
      this.state.difficultyLevel = 1;
    }

    // Adjust spawn rate: faster spawns at higher difficulty
    // Base 500ms, decreases by phi factor per level
    const PHI_INV = 0.618;
    this.state.spawnRate = Math.max(
      200,
      Math.floor(500 * Math.pow(PHI_INV, this.state.difficultyLevel * 0.5))
    );

    // Adjust token speed: base 3, increases with difficulty
    this.state.tokenSpeedBase = 3 + this.state.difficultyLevel;
    this.state.tokenSpeedVariance = 2 + this.state.difficultyLevel * 0.5;
  },

  /**
   * Add a visual effect (uses juice system if available)
   */
  addEffect(x, y, text, color, options = {}) {
    // Use juice system if available
    if (this.juice) {
      this.juice.textPop(x, y, text, { color, ...options });

      // Add particle burst for positive effects
      if (text.startsWith('+')) {
        this.juice.burst(x, y, {
          icon: '✨',
          count: 4,
          spread: 2,
          lifetime: 20,
          gravity: 0.05,
        });
      }
    } else {
      // Legacy fallback
      this.state.effects.push({ x, y, text, color, life: 30, vy: -2 });
    }
  },

  /**
   * Trigger impact feedback (shake + flash + particles)
   */
  triggerImpact(x, y, type = 'light') {
    if (!this.juice) return;

    switch (type) {
      case 'catch':
        this.juice.burst(x, y, { preset: 'COLLECT' });
        break;
      case 'damage':
        this.juice.triggerShake(4, 150);
        this.juice.triggerFlash('#ef4444', 80);
        this.juice.burst(x, y, { preset: 'DAMAGE' });
        break;
      case 'death':
        this.juice.triggerShake(12, 400);
        this.juice.triggerFlash('#ef4444', 150);
        this.juice.burst(x, y, { preset: 'DEATH' });
        break;
      case 'enemy_kill':
        this.juice.triggerShake(3, 100);
        this.juice.burst(x, y, { preset: 'EXPLOSION' });
        break;
    }
  },

  /**
   * Update game state
   * @param {number} dt - Delta time normalized to 60fps
   */
  update(dt) {
    if (this.state.gameOver) return;

    // Update combo timer (decay)
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= dt * 16.67; // Convert to ms
      if (this.state.comboTimer <= 0) {
        this.resetCombo();
      }
    }

    // Update power-up timers
    this.updatePowerUps(dt);

    // Calculate speed modifier from slow-mo
    const speedMod = this.isPowerUpActive('slowmo') ? 0.4 : 1.0;

    this.moveBasket(dt);

    const basketX = this.state.basketPos;
    const basketY = this.state.lanePositions[this.state.basketLane];
    const self = this;

    // Update power-up tokens
    this.state.powerUpTokens = this.state.powerUpTokens.filter(pu => {
      pu.y += pu.speed * dt * speedMod;

      // Check collision with basket
      if (
        pu.y + 15 >= basketY - self.state.basketHeight / 2 &&
        pu.y - 15 <= basketY + self.state.basketHeight / 2 &&
        pu.x >= basketX - self.state.basketWidth / 2 &&
        pu.x <= basketX + self.state.basketWidth / 2
      ) {
        self.activatePowerUp(pu.type);
        return false;
      }

      return pu.y < self.canvas.height + 30;
    });

    // Update projectiles
    this.state.projectiles = this.state.projectiles.filter(proj => {
      const prevX = proj.x;
      const prevY = proj.y;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      // Check collision with all tokens (swept collision to prevent tunneling)
      const hitRadius = 30; // Token collision radius
      for (let i = self.state.tokens.length - 1; i >= 0; i--) {
        const token = self.state.tokens[i];

        // Check both previous and current position, plus midpoint for fast projectiles
        const checkPoints = [
          { x: prevX, y: prevY },
          { x: (prevX + proj.x) / 2, y: (prevY + proj.y) / 2 },
          { x: proj.x, y: proj.y },
        ];

        let hit = false;
        for (const pt of checkPoints) {
          const dist = Math.hypot(pt.x - token.x, pt.y - token.y);
          if (dist < hitRadius) {
            hit = true;
            break;
          }
        }

        if (hit) {
          self.state.tokens.splice(i, 1);

          // Different rewards based on token type
          let points, color, effectType;
          if (token.isSkull) {
            points = 25;
            color = '#ef4444';
            effectType = 'enemy_kill';
          } else if (token.isScam) {
            points = 15;
            color = '#a855f7';
            effectType = 'catch';
          } else {
            points = 5;
            color = '#22c55e';
            effectType = 'catch';
          }

          self.state.score += points;
          self.addEffect(token.x, token.y, `+${points}`, color);
          self.triggerImpact(token.x, token.y, effectType);
          self.dom.score.textContent = self.state.score;
          updateScore(self.gameId, self.state.score);
          recordGameAction(self.gameId, 'shoot_token', {
            type: token.isSkull ? 'skull' : token.isScam ? 'scam' : 'good',
            points: points,
          });
          return false;
        }
      }

      // Check collision with enemies (swept collision)
      const enemyHitRadius = 35;
      for (let i = self.state.enemies.length - 1; i >= 0; i--) {
        const enemy = self.state.enemies[i];

        // Check trajectory points
        let hit = false;
        const checkPoints = [
          { x: prevX, y: prevY },
          { x: (prevX + proj.x) / 2, y: (prevY + proj.y) / 2 },
          { x: proj.x, y: proj.y },
        ];
        for (const pt of checkPoints) {
          const dist = Math.hypot(pt.x - enemy.x, pt.y - enemy.y);
          if (dist < enemyHitRadius) {
            hit = true;
            break;
          }
        }

        if (hit) {
          enemy.currentHp--;
          self.addEffect(
            enemy.x,
            enemy.y,
            `-${enemy.currentHp > 0 ? '1' : enemy.points}`,
            enemy.currentHp > 0 ? '#f59e0b' : '#22c55e'
          );
          if (enemy.currentHp <= 0) {
            self.state.enemies.splice(i, 1);
            self.state.score += enemy.points;
            self.addEffect(enemy.x, enemy.y - 20, `+${enemy.points}`, '#22c55e');
            self.triggerImpact(enemy.x, enemy.y, 'enemy_kill');
            self.dom.score.textContent = self.state.score;
            updateScore(self.gameId, self.state.score);
          }
          return false;
        }
      }

      return (
        proj.y > -10 &&
        proj.y < self.canvas.height + 10 &&
        proj.x > -10 &&
        proj.x < self.canvas.width + 10
      );
    });

    // Update tokens
    this.state.tokens = this.state.tokens.filter(token => {
      // Apply slow-mo effect
      token.y += token.speed * dt * speedMod;

      // Magnet effect: attract good tokens toward basket
      if (self.isPowerUpActive('magnet') && !token.isSkull && !token.isScam) {
        const dx = basketX - token.x;
        const dy = basketY - token.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 200 && dist > 0) {
          const magnetStrength = 3 * dt;
          token.x += (dx / dist) * magnetStrength;
          token.y += (dy / dist) * magnetStrength * 0.5;
        }
      }

      // Check collision with basket
      if (
        token.y + 15 >= basketY - self.state.basketHeight / 2 &&
        token.y - 15 <= basketY + self.state.basketHeight / 2 &&
        token.x >= basketX - self.state.basketWidth / 2 &&
        token.x <= basketX + self.state.basketWidth / 2
      ) {
        if (token.isSkull) {
          // Shield blocks skull death
          if (self.isPowerUpActive('shield')) {
            self.state.activePowerUps.shield = 0; // Consume shield
            self.addEffect(token.x, token.y, 'BLOCKED!', '#22c55e');
            self.triggerImpact(token.x, token.y, 'catch');
            recordGameAction(self.gameId, 'shield_block', { blocked: 'skull' });
          } else {
            self.addEffect(token.x, token.y, 'GAME OVER!', '#ef4444');
            self.triggerImpact(token.x, token.y, 'death');
            self.resetCombo();
            recordGameAction(self.gameId, 'catch_skull', { score: self.state.score });
            self.state.gameOver = true;
            setTimeout(() => endGame(self.gameId, self.state.score), 500);
          }
          return false;
        } else if (token.isScam) {
          // Shield blocks scam damage
          if (self.isPowerUpActive('shield')) {
            self.addEffect(token.x, token.y, 'BLOCKED!', '#22c55e');
            self.triggerImpact(token.x, token.y, 'catch');
          } else {
            // Scam breaks combo and deals damage
            const penalty = 21; // fib[7]
            self.state.score = Math.max(0, self.state.score - penalty);
            self.addEffect(token.x, token.y, `-${penalty}`, '#ef4444');
            self.triggerImpact(token.x, token.y, 'damage');
            self.resetCombo();
            recordGameAction(self.gameId, 'catch_scam', {
              score: self.state.score,
              comboLost: true,
            });
          }
        } else {
          // Good token - apply combo multiplier!
          const multiplier = self.incrementCombo();
          const basePoints = 13; // fib[6]
          // Double score power-up
          const doubleBonus = self.isPowerUpActive('double') ? 2 : 1;
          const points = basePoints * multiplier * doubleBonus;
          self.state.score += points;

          // Show combo feedback
          if (multiplier > 1 || doubleBonus > 1) {
            const bonusText = doubleBonus > 1 ? `x${multiplier * 2}` : `x${multiplier}`;
            self.addEffect(token.x, token.y - 20, bonusText, '#a855f7', { size: 16 });
          }
          self.addEffect(token.x, token.y, `+${points}`, '#22c55e');
          self.triggerImpact(token.x, token.y, multiplier >= 3 ? 'enemy_kill' : 'catch');
          recordGameAction(self.gameId, 'catch_token', {
            score: self.state.score,
            combo: self.state.combo,
            multiplier,
            doubleBonus,
          });
        }
        recordScoreUpdate(self.gameId, self.state.score, token.isScam ? -21 : 13);
        self.dom.score.textContent = self.state.score;
        updateScore(self.gameId, self.state.score);
        return false;
      }

      return token.y < self.canvas.height + 30;
    });

    // Update enemies
    this.state.enemies = this.state.enemies.filter(enemy => {
      enemy.y += enemy.speed * dt;

      if (
        enemy.y + 20 >= basketY - self.state.basketHeight / 2 &&
        enemy.y - 20 <= basketY + self.state.basketHeight / 2 &&
        enemy.x >= basketX - self.state.basketWidth / 2 &&
        enemy.x <= basketX + self.state.basketWidth / 2
      ) {
        const penalty = 34; // fib[8]
        self.state.score = Math.max(0, self.state.score - penalty);
        self.addEffect(enemy.x, enemy.y, `-${penalty}`, '#ef4444');
        self.triggerImpact(enemy.x, enemy.y, 'damage');
        self.resetCombo(); // Enemy hit resets combo
        self.dom.score.textContent = self.state.score;
        updateScore(self.gameId, self.state.score);
        return false;
      }

      return enemy.y < self.canvas.height + 40;
    });

    // Update effects (legacy fallback)
    this.state.effects = this.state.effects.filter(e => {
      e.y += e.vy * dt;
      e.life -= dt;
      return e.life > 0;
    });

    // Update juice system
    if (this.juice) {
      this.juice.update(dt, dt * 16.67);
    }
  },

  /**
   * Draw active power-up indicators on the right side
   */
  drawPowerUpIndicators(ctx) {
    const activeList = [];
    for (const type in this.state.activePowerUps) {
      if (this.state.activePowerUps[type] > 0) {
        const pu = this.powerUps[type];
        const duration = pu.duration;
        const remaining = this.state.activePowerUps[type];
        activeList.push({
          type,
          icon: pu.icon,
          color: pu.color,
          name: pu.name,
          percent: remaining / duration,
        });
      }
    }

    if (activeList.length === 0) return;

    const startY = 100;
    const spacing = 50;

    activeList.forEach((pu, i) => {
      const x = this.canvas.width - 60;
      const y = startY + i * spacing;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(x - 35, y - 18, 70, 36, 8);
      ctx.fill();

      // Icon
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.icon, x - 15, y);

      // Timer bar
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 5, y - 4, 25, 8);
      ctx.fillStyle = pu.color;
      ctx.fillRect(x + 5, y - 4, 25 * pu.percent, 8);
    });
  },

  /**
   * Draw game state
   */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply screen shake if juice is active
    if (this.juice) {
      this.juice.renderPre();
    }

    // Draw lane indicators
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    this.state.lanePositions.forEach((y, i) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
      ctx.fillStyle =
        i === this.state.basketLane ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, y - this.state.laneHeight / 2, 5, this.state.laneHeight);
    });

    // Draw projectiles
    ctx.fillStyle = '#fbbf24';
    this.state.projectiles.forEach(proj => {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw power-up tokens (using SpriteCache)
    this.state.powerUpTokens.forEach(pu => {
      SpriteCache.draw(ctx, pu.icon, pu.x, pu.y, 28);
    });

    // Draw falling tokens (using SpriteCache)
    this.state.tokens.forEach(token => {
      SpriteCache.draw(ctx, token.icon, token.x, token.y, 30);
    });

    // Draw active power-up indicators
    this.drawPowerUpIndicators(ctx);

    // Draw enemies with HP indicator (using SpriteCache)
    this.state.enemies.forEach(enemy => {
      SpriteCache.draw(ctx, enemy.icon, enemy.x, enemy.y, 35);
      const barWidth = 30;
      const barHeight = 4;
      const hpRatio = enemy.currentHp / enemy.hp;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y + 22, barWidth, barHeight);
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y + 22, barWidth * hpRatio, barHeight);
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${enemy.currentHp}/${enemy.hp}`, enemy.x, enemy.y + 35);
    });

    // Draw basket (using SpriteCache)
    const basketX = this.state.basketPos;
    const basketY = this.state.lanePositions[this.state.basketLane];
    SpriteCache.draw(ctx, '🧺', basketX, basketY, 60);

    // Draw lane highlight
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    ctx.fillRect(
      basketX - this.state.basketWidth / 2,
      basketY - this.state.laneHeight / 2,
      this.state.basketWidth,
      this.state.laneHeight
    );

    // Draw aiming line
    if (this.state.mouseX > 0 || this.state.mouseY > 0) {
      ctx.strokeStyle = 'rgba(251,191,36,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(basketX, basketY - 30);
      ctx.lineTo(this.state.mouseX, this.state.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(251,191,36,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.state.mouseX, this.state.mouseY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.state.mouseX - 15, this.state.mouseY);
      ctx.lineTo(this.state.mouseX + 15, this.state.mouseY);
      ctx.moveTo(this.state.mouseX, this.state.mouseY - 15);
      ctx.lineTo(this.state.mouseX, this.state.mouseY + 15);
      ctx.stroke();
    }

    // Draw legacy effects (fallback when juice not available)
    if (!this.juice) {
      ctx.font = 'bold 18px Arial';
      this.state.effects.forEach(e => {
        ctx.globalAlpha = e.life / 30;
        ctx.fillStyle = e.color;
        ctx.fillText(e.text, e.x, e.y);
      });
      ctx.globalAlpha = 1;
    }

    // Render juice effects (particles, flash, etc.)
    if (this.juice) {
      this.juice.renderPost();
    }
  },

  /**
   * Main game loop
   */
  gameLoop() {
    const self = this;
    function loop(timestamp) {
      if (self.state.gameOver) return;
      const dt = self.timing.tick(timestamp);
      self.update(dt);
      self.draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  },

  /**
   * Stop the game and cleanup
   * Protected with try/catch to ensure all cleanup runs even if one part fails
   */
  stop() {
    if (this.state) this.state.gameOver = true;

    // Clear intervals (safe even if undefined)
    try {
      if (this.spawnInterval) clearInterval(this.spawnInterval);
      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.enemySpawnInterval) clearInterval(this.enemySpawnInterval);
    } catch (e) {
      console.warn('[TokenCatcher] Interval cleanup error:', e);
    }

    // Remove event listeners (protected)
    try {
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
      if (this.canvas) {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('touchmove', this.handleTouch);
        this.canvas.removeEventListener('touchstart', this.handleTouch);
        this.canvas.removeEventListener('click', this.handleClick);
      }
    } catch (e) {
      console.warn('[TokenCatcher] Event listener cleanup error:', e);
    }

    // Cleanup juice system
    try {
      if (this.juice) {
        this.juice.cleanup();
      }
    } catch (e) {
      console.warn('[TokenCatcher] Juice cleanup error:', e);
    }

    // Clear references (always runs)
    this.juice = null;
    this.canvas = null;
    this.ctx = null;
    this.state = null;
    this.spawnInterval = null;
    this.timerInterval = null;
    this.enemySpawnInterval = null;
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.TokenCatcher = TokenCatcher;
}
