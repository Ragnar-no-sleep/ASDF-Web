/**
 * ASDF Games - Burn Runner Engine
 *
 * Endless runner game: Run through the blockchain, collect tokens, avoid obstacles
 * Features: Double jump, dash ability, shield ability, platform physics
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const BurnRunner = {
  ...GameEngineBase,
  version: '1.2.1', // Standardized with GameEngineBase
  gameId: 'burnrunner',
  juice: null, // GameJuice integration

  // Deadly obstacles
  obstacleTypes: [
    { icon: '💀', name: 'SCAM', width: 35, height: 40, deadly: true },
    { icon: '🚫', name: 'RUG', width: 35, height: 35, deadly: true },
    { icon: '📉', name: 'FUD', width: 35, height: 35, deadly: true },
    { icon: '🦠', name: 'VIRUS', width: 30, height: 35, deadly: true },
    { icon: '🔥', name: 'BURN', width: 32, height: 38, deadly: true },
    { icon: '⚠️', name: 'DANGER', width: 35, height: 35, deadly: true },
    { icon: '💣', name: 'BOMB', width: 32, height: 34, deadly: true },
    { icon: '⚡', name: 'SHOCK', width: 28, height: 40, deadly: true },
    { icon: '🕳️', name: 'HOLE', width: 45, height: 20, deadly: true },
    { icon: '🗡️', name: 'SPIKE', width: 30, height: 45, deadly: true },
    { icon: '🧨', name: 'TNT', width: 35, height: 35, deadly: true },
    { icon: '☠️', name: 'SKULL', width: 38, height: 38, deadly: true },
    { icon: '🌋', name: 'LAVA', width: 40, height: 30, deadly: true },
    { icon: '🐍', name: 'SNAKE', width: 40, height: 30, deadly: true },
    { icon: '🦂', name: 'SCORPION', width: 35, height: 28, deadly: true },
    { icon: '🕷️', name: 'SPIDER', width: 32, height: 32, deadly: true },
  ],

  // Jumpable platforms
  platformTypes: [
    { icon: '📦', name: 'CRATE', width: 45, height: 35, points: 15 },
    { icon: '🧱', name: 'BLOCK', width: 50, height: 30, points: 10 },
    { icon: '🎁', name: 'GIFT', width: 40, height: 40, points: 25, bonus: true },
    { icon: '🏠', name: 'HOUSE', width: 50, height: 45, points: 20 },
    { icon: '🚗', name: 'CAR', width: 55, height: 35, points: 12 },
    { icon: '🏗️', name: 'SCAFFOLD', width: 60, height: 25, points: 18 },
    { icon: '🛒', name: 'CART', width: 45, height: 30, points: 14 },
    { icon: '🗄️', name: 'CABINET', width: 40, height: 50, points: 22 },
    { icon: '📺', name: 'TV', width: 45, height: 35, points: 16 },
    { icon: '🎰', name: 'SLOT', width: 40, height: 45, points: 20 },
    { icon: '🛢️', name: 'BARREL', width: 35, height: 40, points: 12 },
    { icon: '⬛', name: 'CUBE', width: 40, height: 40, points: 15 },
  ],

  // Brick types
  brickTypes: [
    { icon: '🧱', name: 'BRICK', width: 40, height: 25, points: 8, brick: true },
    { icon: '🟫', name: 'BROWN', width: 35, height: 25, points: 8, brick: true },
    { icon: '🟧', name: 'ORANGE', width: 35, height: 25, points: 10, brick: true },
    { icon: '⬜', name: 'WHITE', width: 35, height: 25, points: 8, brick: true },
    { icon: '🟨', name: 'YELLOW', width: 35, height: 25, points: 10, brick: true },
    { icon: '🟦', name: 'BLUE', width: 35, height: 25, points: 12, brick: true },
    { icon: '🟩', name: 'GREEN', width: 35, height: 25, points: 10, brick: true },
    { icon: '🟥', name: 'RED', width: 35, height: 25, points: 10, brick: true },
  ],

  // Aerial platforms
  aerialPlatformTypes: [
    { icon: '☁️', name: 'CLOUD', width: 70, height: 25, points: 30, floating: true },
    { icon: '🎈', name: 'BALLOON', width: 45, height: 35, points: 25, floating: true },
    { icon: '🛸', name: 'UFO', width: 55, height: 25, points: 35, floating: true },
    { icon: '🌙', name: 'MOON', width: 50, height: 30, points: 40, floating: true },
    { icon: '⭐', name: 'STAR', width: 45, height: 30, points: 35, floating: true },
    { icon: '🪂', name: 'PARA', width: 50, height: 30, points: 28, floating: true },
    { icon: '🚁', name: 'HELI', width: 60, height: 30, points: 32, floating: true },
    { icon: '🎪', name: 'TENT', width: 55, height: 35, points: 30, floating: true },
    { icon: '💎', name: 'GEM', width: 40, height: 35, points: 45, bonus: true, floating: true },
    { icon: '🌈', name: 'RAINBOW', width: 80, height: 20, points: 50, floating: true },
  ],

  // Bonus collectibles
  bonusTypes: [
    { icon: '💎', name: 'DIAMOND', width: 28, height: 28, points: 50, effect: 'score' },
    { icon: '⚡', name: 'ENERGY', width: 25, height: 30, points: 30, effect: 'speed' },
    { icon: '🌟', name: 'STAR', width: 28, height: 28, points: 25, effect: 'score' },
    { icon: '🍀', name: 'LUCK', width: 26, height: 26, points: 35, effect: 'score' },
    { icon: '🛡️', name: 'SHIELD', width: 28, height: 30, points: 20, effect: 'shield' },
    { icon: '💰', name: 'BAG', width: 30, height: 28, points: 40, effect: 'score' },
  ],

  // Malus items
  malusTypes: [
    { icon: '🐌', name: 'SLOW', width: 30, height: 25, effect: 'slow', duration: 2000 },
    { icon: '❄️', name: 'FREEZE', width: 28, height: 28, effect: 'freeze', duration: 500 },
    { icon: '🌀', name: 'DIZZY', width: 26, height: 26, effect: 'dizzy', duration: 1500 },
    { icon: '💨', name: 'WIND', width: 30, height: 25, effect: 'pushback', duration: 0 },
  ],

  /**
   * Start the game
   */
  start(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    if (!arena) return;

    this.createArena(arena);
    const canvas = document.getElementById('br-canvas');

    // Initialize via base
    this.init(gameId, canvas);

    // Initialize state with Fibonacci-based values
    this.state = {
      score: 0,
      distance: 0,
      tokens: 0,
      speed: 5, // fib[4]
      baseSpeed: 5, // fib[4]
      maxSpeed: 13, // fib[6]
      gravity: 0.382, // PHI_INVERSE * 0.618
      jumpForce: -8, // fib[5]
      jumpsLeft: 2,
      maxJumps: 2,
      isJumping: false,
      gameOver: false,
      player: { x: 89, y: 0, vy: 0, width: 34, height: 55 }, // fib[10], fib[8], fib[9]
      ground: 0,
      obstacles: [],
      platforms: [],
      collectibles: [],
      bonusItems: [],
      malusItems: [],
      // Initialize Typed Object Pools (Zero-Allocation)
      particlePool: typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(500, 7) : null, // x, y, vx, vy, life, size, type (0=smoke, 1=sparkle, 2=burn)
      dustPool: typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(200, 6) : null, // x, y, vx, vy, life, alpha
      // Legacy fallbacks for compatibility until fully refactored
      particles: [],
      dustParticles: [], // Landing dust effects
      clouds: [],
      buildings: [],
      // Parallax layers (far, mid, near) with phi-based speeds
      parallax: {
        far: [], // 0.2x speed - distant mountains
        mid: [], // 0.5x speed - buildings
        near: [], // 0.8x speed - foreground elements
      },
      lastObstacle: 0,
      lastPlatform: 0,
      lastAerialPlatform: 0,
      lastBrickStructure: 0,
      lastCollectible: 0,
      lastBonus: 0,
      lastMalus: 0,
      frameCount: 0,
      // Phi-based difficulty
      difficultyLevel: 0,
      PHI: 1.618033988749895,
      dash: {
        active: false,
        endTime: 0,
        lastUsed: 0,
        cooldown: 3400, // fib[8] * 100
        duration: 300, // fib[3] * 100
        speed: 13, // fib[6]
      },
      abilityShield: {
        active: false,
        endTime: 0,
        lastUsed: 0,
        cooldown: 8900, // fib[10] * 100 (approx)
        duration: 1300, // fib[6] * 100
      },
      effects: {
        shield: false,
        shieldEnd: 0,
        slow: false,
        slowEnd: 0,
        speedBoost: false,
        speedBoostEnd: 0,
        freeze: false,
        freezeEnd: 0,
      },
    };

    // Cache DOM references for performance (avoid lookups in game loop)
    this.dom = {
      jumps: document.getElementById('br-jumps'),
      distance: document.getElementById('br-distance'),
      tokens: document.getElementById('br-tokens'),
      dashCd: document.getElementById('br-dash-cd'),
      shieldCd: document.getElementById('br-shield-cd'),
      dashAbility: document.getElementById('br-dash-ability'),
      shieldAbility: document.getElementById('br-shield-ability'),
    };

    this.timing = GameTiming.create();

    // Initialize GameJuice for visual feedback
    if (typeof GameJuice !== 'undefined') {
      this.juice = GameJuice.create(this.canvas, this.ctx);
    }

    this.resizeCanvas();
    this.setupInput();
    this.preloadSprites();

    // Initialize Fixed Timestep Loop (2026 Standard)
    if (typeof FixedTimestepLoop !== 'undefined') {
      this.physicsLoop = new FixedTimestepLoop(
        60, // 60 updates per second
        dt => this.update(dt),
        alpha => this.draw(alpha)
      );
      this.physicsLoop.start();
    } else {
      console.warn('[BurnRunner] FixedTimestepLoop missing, falling back to legacy loop');
      this.gameLoop();
    }

    this.registerActiveGame(gameId);
  },

  /**
   * Create arena HTML
   */
  createArena(arena) {
    arena.innerHTML = `
            <div class="br-container">
                <canvas id="br-canvas" class="game-canvas"></canvas>
                <div class="game-hud-top-left game-flex-col">
                    <div class="br-hud-row">
                        <div class="game-hud-stat">
                            <span class="game-hud-stat-label">DISTANCE</span>
                            <div class="br-stat-value--distance" id="br-distance">0m</div>
                        </div>
                        <div class="game-hud-stat">
                            <span class="game-hud-stat-label">TOKENS</span>
                            <div class="br-stat-value--tokens" id="br-tokens">0 &#128293;</div>
                        </div>
                    </div>
                    <div class="br-abilities-row">
                        <div id="br-dash-ability" class="br-ability br-ability--dash">
                            <div class="br-ability-icon">&#128168;</div>
                            <div class="br-ability-label--dash">DASH [LMB]</div>
                            <div id="br-dash-cd" class="br-ability-cd">READY</div>
                        </div>
                        <div id="br-shield-ability" class="br-ability br-ability--shield">
                            <div class="br-ability-icon">&#128737;</div>
                            <div class="br-ability-label--shield">SHIELD [RMB]</div>
                            <div id="br-shield-cd" class="br-ability-cd">READY</div>
                        </div>
                    </div>
                </div>
                <div class="br-jumps-hud">
                    <div class="br-jumps-stat">
                        <span class="br-jumps-label">JUMPS</span>
                        <div id="br-jumps" class="br-jumps-value">&#11014;&#11014;</div>
                    </div>
                </div>
                <div class="br-hint-bar">
                    SPACE: Jump (x2) | Left Click: Dash | Right Click: Shield
                </div>
            </div>
        `;
  },

  /**
   * Preload sprites for performance
   */
  preloadSprites() {
    const sprites = [
      // Player
      { emoji: '🐕', size: 38 },
      // Obstacles (from obstacleTypes)
      ...this.obstacleTypes.map(t => ({ emoji: t.icon, size: 32 })),
      // Platforms (from platformTypes)
      ...this.platformTypes.map(t => ({ emoji: t.icon, size: 36 })),
      // Aerial platforms
      ...this.aerialPlatformTypes.map(t => ({ emoji: t.icon, size: 38 })),
      // Bonus items
      ...this.bonusTypes.map(t => ({ emoji: t.icon, size: 24 })),
      // Malus items
      ...this.malusTypes.map(t => ({ emoji: t.icon, size: 24 })),
      // Brick types
      ...this.brickTypes.map(t => ({ emoji: t.icon, size: 36 })),
      // Particle emojis
      { emoji: '✨', size: 16 },
      { emoji: '💨', size: 16 },
    ];
    SpriteCache.preload(sprites);
  },

  /**
   * Resize canvas
   */
  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;

    const rect = this.canvas.parentElement.getBoundingClientRect();

    // Fallback for hidden modals during initialization (avoids 0x0 canvas)
    this.canvas.width = rect.width > 0 ? rect.width : 800;
    this.canvas.height = rect.height > 0 ? rect.height : 400;

    this.state.ground = this.canvas.height - 80;
    this.state.player.y = this.state.ground - this.state.player.height;
    this.initBackground();
  },

  /**
   * Initialize background elements with 3-layer parallax
   */
  initBackground() {
    const PHI = 1.618033988749895;

    // Clouds (very slow, atmospheric)
    this.state.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.state.clouds.push({
        x: Math.random() * this.canvas.width,
        y: 20 + Math.random() * 60,
        size: 20 + Math.random() * 30,
        speed: 0.2 + Math.random() * 0.3,
      });
    }

    // FAR LAYER: Distant mountains (0.2x parallax speed)
    this.state.parallax.far = [];
    const mountainCount = 5;
    for (let i = 0; i < mountainCount; i++) {
      const baseWidth = 150 + Math.random() * 100;
      this.state.parallax.far.push({
        x: i * (this.canvas.width / 3),
        width: baseWidth,
        height: 80 + Math.random() * 60,
        color: `hsl(${265 + Math.random() * 15}, 30%, ${12 + Math.random() * 6}%)`,
        speed: 0.2, // PHI^-3 ≈ 0.236
      });
    }

    // MID LAYER: Buildings (0.5x parallax speed)
    this.state.parallax.mid = [];
    for (let i = 0; i < 8; i++) {
      this.state.parallax.mid.push({
        x: i * (this.canvas.width / 6),
        width: 40 + Math.random() * 60,
        height: 60 + Math.random() * 80,
        color: `hsl(${260 + Math.random() * 20}, 40%, ${15 + Math.random() * 10}%)`,
        windows: Math.random() > 0.3,
        speed: 0.5, // PHI^-1 ≈ 0.618
      });
    }
    // Keep buildings reference for compatibility
    this.state.buildings = this.state.parallax.mid;

    // NEAR LAYER: Foreground elements (0.8x parallax speed)
    this.state.parallax.near = [];
    const nearElements = ['🌲', '🌵', '🪨', '🌿', '🏮'];
    for (let i = 0; i < 6; i++) {
      this.state.parallax.near.push({
        x: i * (this.canvas.width / 4) + Math.random() * 50,
        icon: nearElements[Math.floor(Math.random() * nearElements.length)],
        size: 24 + Math.random() * 12,
        opacity: 0.4 + Math.random() * 0.3,
        speed: 0.8, // Close to 1 for parallax effect
      });
    }
  },

  /**
   * Setup input handlers
   */
  setupInput() {
    this.track(document, 'keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.jump();
      }
    });

    this.track(this.canvas, 'click', e => {
      e.preventDefault();
      this.activateDash();
    });

    this.track(this.canvas, 'contextmenu', e => {
      e.preventDefault();
      this.activateShield();
    });

    this.track(this.canvas, 'touchstart', e => {
      e.preventDefault();
      this.jump();
    });
  },

  /**
   * Jump action
   */
  jump() {
    if (this.state.gameOver) return;
    if (this.state.jumpsLeft > 0) {
      this.state.player.vy = this.state.jumpForce;
      this.state.isJumping = true;
      this.state.jumpsLeft--;
      this.updateJumpsDisplay();
      if (this.state.jumpsLeft === 0) {
        this.addJumpParticles(
          this.state.player.x + this.state.player.width / 2,
          this.state.player.y + this.state.player.height
        );
      }
    }
  },

  /**
   * Activate dash ability
   */
  activateDash() {
    const now = Date.now();
    if (now - this.state.dash.lastUsed < this.state.dash.cooldown) return false;

    this.state.dash.active = true;
    this.state.dash.endTime = now + this.state.dash.duration;
    this.state.dash.lastUsed = now;

    for (let i = 0; i < 10; i++) {
      if (this.state.particlePool) {
        const idx = this.state.particlePool.acquire();
        if (idx !== -1) {
          const offset = idx * this.state.particlePool.itemSize;
          const data = this.state.particlePool.data;
          data[offset + 0] = this.state.player.x;
          data[offset + 1] = this.state.player.y + this.state.player.height / 2;
          data[offset + 2] = -3 - Math.random() * 3;
          data[offset + 3] = (Math.random() - 0.5) * 2;
          data[offset + 4] = 25;
          data[offset + 5] = 20;
          data[offset + 6] = 0; // 0 = dash icon
        }
      }
    }
    return true;
  },

  /**
   * Activate shield ability
   */
  activateShield() {
    const now = Date.now();
    if (now - this.state.abilityShield.lastUsed < this.state.abilityShield.cooldown) return false;

    this.state.abilityShield.active = true;
    this.state.abilityShield.endTime = now + this.state.abilityShield.duration;
    this.state.abilityShield.lastUsed = now;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.state.particles.push({
        x: this.state.player.x + this.state.player.width / 2 + Math.cos(angle) * 30,
        y: this.state.player.y + this.state.player.height / 2 + Math.sin(angle) * 30,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 30,
        icon: '✨',
        size: 16,
      });
    }
    return true;
  },

  /**
   * Update jumps display
   */
  updateJumpsDisplay() {
    const jumpsEl = this.dom.jumps;
    if (jumpsEl) {
      jumpsEl.innerHTML =
        '⬆️'.repeat(this.state.jumpsLeft) + '⬛'.repeat(this.state.maxJumps - this.state.jumpsLeft);
    }
  },

  /**
   * Add jump particles
   */
  addJumpParticles(x, y) {
    if (!this.state.particlePool) return;
    for (let i = 0; i < 5; i++) {
      const idx = this.state.particlePool.acquire();
      if (idx !== -1) {
        const offset = idx * this.state.particlePool.itemSize;
        const data = this.state.particlePool.data;
        data[offset + 0] = x;
        data[offset + 1] = y;
        data[offset + 2] = (Math.random() - 0.5) * 4;
        data[offset + 3] = Math.random() * 2;
        data[offset + 4] = 20;
        data[offset + 5] = 12;
        data[offset + 6] = 0; // 0 = dash/dust icon
      }
    }
  },

  /**
   * Add effect particles
   */
  addEffectParticles(x, y, icon) {
    if (!this.state.particlePool) return;
    let type = 1; // sparkle
    if (icon === '🛡️') type = 3;
    else if (icon === '⚡') type = 4;
    else if (icon === '💥') type = 5;

    for (let i = 0; i < 6; i++) {
      const idx = this.state.particlePool.acquire();
      if (idx !== -1) {
        const offset = idx * this.state.particlePool.itemSize;
        const data = this.state.particlePool.data;
        data[offset + 0] = x + this.state.player.width / 2;
        data[offset + 1] = y + this.state.player.height / 2;
        data[offset + 2] = (Math.random() - 0.5) * 8;
        data[offset + 3] = -Math.random() * 5 - 2;
        data[offset + 4] = 40;
        data[offset + 5] = 18;
        data[offset + 6] = type;
      }
    }
  },

  /**
   * Add burn particles
   */
  addBurnParticles(x, y) {
    if (!this.state.particlePool) return;
    for (let i = 0; i < 8; i++) {
      const idx = this.state.particlePool.acquire();
      if (idx !== -1) {
        const offset = idx * this.state.particlePool.itemSize;
        const data = this.state.particlePool.data;
        data[offset + 0] = x;
        data[offset + 1] = y;
        data[offset + 2] = (Math.random() - 0.5) * 6;
        data[offset + 3] = -Math.random() * 4 - 2;
        data[offset + 4] = 30;
        data[offset + 5] = 16;
        data[offset + 6] = 2; // 2 = burn icon
      }
    }
  },

  /**
   * Add dust particles on landing (Fibonacci-based count)
   * Using TypedObjectPool for Zero-Allocation
   */
  addDustParticles(x, y, intensity = 1) {
    if (!this.state.dustPool) return; // Fallback handled by draw if null

    const count = Math.floor(5 * intensity); // fib[4] base
    for (let i = 0; i < count; i++) {
      const idx = this.state.dustPool.acquire();
      if (idx === -1) break; // Pool is full

      const offset = idx * this.state.dustPool.itemSize;
      const data = this.state.dustPool.data;

      const angle = (Math.random() - 0.5) * Math.PI; // Spread upward
      const speed = 1.5 + Math.random() * 2.5;

      // itemSize: 6 (x, y, vx, vy, life, alpha)
      data[offset + 0] = x + (Math.random() - 0.5) * 20; // x
      data[offset + 1] = y; // y
      data[offset + 2] = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1); // vx
      data[offset + 3] = -Math.random() * 2 - 0.5; // vy
      data[offset + 4] = 21 + Math.random() * 13; // life
      data[offset + 5] = 0.6 + Math.random() * 0.3; // alpha
    }
  },

  /**
   * Add speed trail particles
   * Using TypedObjectPool for Zero-Allocation
   */
  addTrailParticle() {
    if (this.state.speed < 7 && !this.state.dash.active) return;
    if (!this.state.particlePool) return;

    const intensity = this.state.dash.active ? 1 : (this.state.speed - 7) / 6;
    if (Math.random() > 0.3 * intensity) return;

    const idx = this.state.particlePool.acquire();
    if (idx === -1) return;

    const offset = idx * this.state.particlePool.itemSize;
    const data = this.state.particlePool.data;

    // itemSize: 7 (x, y, vx, vy, life, size, type)
    data[offset + 0] = this.state.player.x - 5;
    data[offset + 1] =
      this.state.player.y + this.state.player.height / 2 + (Math.random() - 0.5) * 20;
    data[offset + 2] = -2 - Math.random() * 2;
    data[offset + 3] = (Math.random() - 0.5) * 1;
    data[offset + 4] = 15 + Math.random() * 10;
    data[offset + 5] = this.state.dash.active ? 16 : 10;
    data[offset + 6] = this.state.dash.active ? 0 : 1; // 0 = dash icon, 1 = sparkle icon
  },

  /**
   * Spawn obstacle
   */
  spawnObstacle() {
    const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
    this.state.obstacles.push({
      x: this.canvas.width + 50,
      y: this.state.ground - type.height,
      ...type,
    });
  },

  /**
   * Spawn platform
   */
  spawnPlatform() {
    const type = this.platformTypes[Math.floor(Math.random() * this.platformTypes.length)];
    this.state.platforms.push({
      x: this.canvas.width + 50,
      y: this.state.ground - type.height,
      scored: false,
      collected: false,
      ...type,
    });
  },

  /**
   * Spawn aerial platform
   */
  spawnAerialPlatform() {
    const type =
      this.aerialPlatformTypes[Math.floor(Math.random() * this.aerialPlatformTypes.length)];
    const minHeight = this.state.ground * 0.25;
    const maxHeight = this.state.ground * 0.6;
    const y = minHeight + Math.random() * (maxHeight - minHeight);

    this.state.platforms.push({
      x: this.canvas.width + 50,
      y: y,
      scored: false,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      ...type,
    });
  },

  /**
   * Spawn collectible
   */
  spawnCollectible() {
    const height = 40 + Math.random() * 70;
    this.state.collectibles.push({
      x: this.canvas.width + 50,
      y: this.state.ground - height - 25,
      width: 25,
      height: 25,
      icon: '🪙',
    });
  },

  /**
   * Check collision
   */
  checkCollision(a, b) {
    const padding = 5;
    return (
      a.x + padding < b.x + b.width - padding &&
      a.x + a.width - padding > b.x + padding &&
      a.y + padding < b.y + b.height &&
      a.y + a.height > b.y + padding
    );
  },

  /**
   * Apply effect
   */
  applyEffect(effect, duration) {
    const now = Date.now();
    switch (effect) {
      case 'shield':
        this.state.effects.shield = true;
        this.state.effects.shieldEnd = now + 3000;
        this.addEffectParticles(this.state.player.x, this.state.player.y, '🛡️');
        break;
      case 'speed':
        this.state.effects.speedBoost = true;
        this.state.effects.speedBoostEnd = now + 3000;
        this.addEffectParticles(this.state.player.x, this.state.player.y, '⚡');
        break;
      case 'slow':
        this.state.effects.slow = true;
        this.state.effects.slowEnd = now + duration;
        break;
      case 'freeze':
        this.state.effects.freeze = true;
        this.state.effects.freezeEnd = now + duration;
        break;
      case 'pushback':
        this.state.player.vy = -5;
        this.addEffectParticles(this.state.player.x, this.state.player.y, '💨');
        break;
    }
  },

  /**
   * Update effects
   */
  updateEffects() {
    const now = Date.now();
    if (this.state.effects.shield && now > this.state.effects.shieldEnd) {
      this.state.effects.shield = false;
    }
    if (this.state.effects.speedBoost && now > this.state.effects.speedBoostEnd) {
      this.state.effects.speedBoost = false;
    }
    if (this.state.effects.slow && now > this.state.effects.slowEnd) {
      this.state.effects.slow = false;
    }
    if (this.state.effects.freeze && now > this.state.effects.freezeEnd) {
      this.state.effects.freeze = false;
    }
  },

  /**
   * Update abilities
   */
  updateAbilities() {
    const now = Date.now();
    if (this.state.dash.active && now > this.state.dash.endTime) {
      this.state.dash.active = false;
    }
    if (this.state.abilityShield.active && now > this.state.abilityShield.endTime) {
      this.state.abilityShield.active = false;
    }
  },

  /**
   * Update ability cooldowns display
   */
  updateAbilityCooldowns() {
    const now = Date.now();
    const dashCdEl = this.dom.dashCd;
    const shieldCdEl = this.dom.shieldCd;
    const dashAbilityEl = this.dom.dashAbility;
    const shieldAbilityEl = this.dom.shieldAbility;

    if (dashCdEl && dashAbilityEl) {
      const dashRemaining = Math.max(
        0,
        this.state.dash.cooldown - (now - this.state.dash.lastUsed)
      );
      if (dashRemaining > 0) {
        dashCdEl.textContent = (dashRemaining / 1000).toFixed(1) + 's';
        dashCdEl.style.color = '#ef4444';
        dashAbilityEl.style.opacity = '0.6';
      } else {
        dashCdEl.textContent = this.state.dash.active ? 'ACTIVE' : 'READY';
        dashCdEl.style.color = this.state.dash.active ? '#3b82f6' : '#22c55e';
        dashAbilityEl.style.opacity = '1';
      }
    }

    if (shieldCdEl && shieldAbilityEl) {
      const shieldRemaining = Math.max(
        0,
        this.state.abilityShield.cooldown - (now - this.state.abilityShield.lastUsed)
      );
      if (shieldRemaining > 0) {
        shieldCdEl.textContent = (shieldRemaining / 1000).toFixed(1) + 's';
        shieldCdEl.style.color = '#ef4444';
        shieldAbilityEl.style.opacity = '0.6';
      } else {
        shieldCdEl.textContent = this.state.abilityShield.active ? 'ACTIVE' : 'READY';
        shieldCdEl.style.color = this.state.abilityShield.active ? '#a855f7' : '#22c55e';
        shieldAbilityEl.style.opacity = '1';
      }
    }
  },

  /**
   * Update game state
   * @param {number} dt - Delta time normalized to 60fps (1.0 = 16.67ms)
   */
  update(dt) {
    if (this.state.gameOver) return;

    if (this.state.effects.freeze) {
      this.updateEffects();
      this.updateAbilityCooldowns();
      return;
    }

    this.state.frameCount += dt;
    this.updateEffects();
    this.updateAbilities();
    this.updateAbilityCooldowns();

    // Calculate effective speed using phi-based difficulty curve
    // Speed increases using inverse phi for smooth ramp: base + (maxSpeed - base) * (1 - e^(-distance/500))
    const PHI_INV = 0.618;
    const distanceFactor = 1 - Math.pow(PHI_INV, this.state.distance / 500);
    let effectiveSpeed =
      this.state.baseSpeed + (this.state.maxSpeed - this.state.baseSpeed) * distanceFactor;

    // Update difficulty level at Fibonacci milestones: 89m, 144m, 233m, 377m
    if (this.state.distance >= 377) this.state.difficultyLevel = 4;
    else if (this.state.distance >= 233) this.state.difficultyLevel = 3;
    else if (this.state.distance >= 144) this.state.difficultyLevel = 2;
    else if (this.state.distance >= 89) this.state.difficultyLevel = 1;

    if (this.state.effects.slow) effectiveSpeed *= PHI_INV;
    if (this.state.effects.speedBoost) effectiveSpeed *= this.state.PHI;
    if (this.state.dash.active) effectiveSpeed = this.state.dash.speed;
    this.state.speed = effectiveSpeed;

    this.state.distance += this.state.speed * 0.1 * dt;

    // Player physics (frame-independent)
    this.state.player.vy += this.state.gravity * dt;
    this.state.player.y += this.state.player.vy * dt;

    if (this.state.player.y >= this.state.ground - this.state.player.height) {
      // Spawn dust on landing (intensity based on fall velocity)
      if (this.state.isJumping && this.state.player.vy > 2) {
        const intensity = Math.min(2, this.state.player.vy / 5);
        this.addDustParticles(
          this.state.player.x + this.state.player.width / 2,
          this.state.ground,
          intensity
        );
      }
      this.state.player.y = this.state.ground - this.state.player.height;
      this.state.player.vy = 0;
      this.state.isJumping = false;
      this.state.jumpsLeft = this.state.maxJumps;
      this.updateJumpsDisplay();
    }

    // Spawn trail particles when moving fast
    this.addTrailParticle();

    // Update clouds (frame-independent)
    this.state.clouds.forEach(cloud => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -cloud.size) {
        cloud.x = this.canvas.width + cloud.size;
        cloud.y = 20 + Math.random() * 60;
      }
    });

    // Spawn obstacles (Fibonacci intervals, density increases with difficulty)
    const obstacleDensity = 89 - this.state.difficultyLevel * 13; // fib[10] - level * fib[6]
    if (this.state.distance - this.state.lastObstacle > obstacleDensity + Math.random() * 55) {
      this.spawnObstacle();
      this.state.lastObstacle = this.state.distance;
    }

    // Spawn platforms (fib[9] base interval)
    if (this.state.distance - this.state.lastPlatform > 55 + Math.random() * 34) {
      this.spawnPlatform();
      this.state.lastPlatform = this.state.distance;
    }

    // Spawn aerial platforms (fib[10] base interval)
    if (this.state.distance - this.state.lastAerialPlatform > 89 + Math.random() * 55) {
      this.spawnAerialPlatform();
      this.state.lastAerialPlatform = this.state.distance;
    }

    // Spawn collectibles (fib[8] base interval)
    if (this.state.distance - this.state.lastCollectible > 34 + Math.random() * 21) {
      this.spawnCollectible();
      this.state.lastCollectible = this.state.distance;
    }

    const self = this;

    // Update platforms (frame-independent)
    this.state.platforms = this.state.platforms.filter(plat => {
      plat.x -= self.state.speed * dt;

      if (plat.floating && plat.bobOffset !== undefined) {
        plat.bobOffset += 0.05 * dt;
        plat.renderY = plat.y + Math.sin(plat.bobOffset) * 8;
      } else {
        plat.renderY = plat.y;
      }

      const platY = plat.renderY || plat.y;
      const playerBottom = self.state.player.y + self.state.player.height;
      const playerCenterX = self.state.player.x + self.state.player.width / 2;
      const platRight = plat.x + plat.width;

      const onTopOf =
        playerBottom >= platY - 5 &&
        playerBottom <= platY + 15 &&
        playerCenterX > plat.x &&
        playerCenterX < platRight &&
        self.state.player.vy >= 0;

      if (onTopOf) {
        // Spawn dust on platform landing
        if (self.state.isJumping) {
          self.addDustParticles(self.state.player.x + self.state.player.width / 2, platY, 0.8);
        }
        self.state.player.y = platY - self.state.player.height;
        self.state.player.vy = 0;
        self.state.isJumping = false;
        self.state.jumpsLeft = self.state.maxJumps;
        self.updateJumpsDisplay();

        if (!plat.scored) {
          plat.scored = true;
          const pointMultiplier = plat.floating ? 2 : 1;
          self.state.tokens += Math.ceil(plat.points / 10) * pointMultiplier;
          self.addBurnParticles(plat.x + plat.width / 2, platY);
        }
      }

      return plat.x > -60;
    });

    // Update obstacles (frame-independent)
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= self.state.speed * dt;

      if (self.checkCollision(self.state.player, obs)) {
        if (self.state.effects.shield || self.state.abilityShield.active) {
          if (self.state.effects.shield) self.state.effects.shield = false;
          self.addEffectParticles(obs.x, obs.y, '💥');
          return false;
        } else if (self.state.dash.active) {
          self.addEffectParticles(obs.x, obs.y, '💨');
          return false;
        } else {
          self.state.gameOver = true;
          const finalScore = Math.floor(self.state.distance) + self.state.tokens * 10;
          endGame(self.gameId, finalScore);
        }
      }

      return obs.x > -50;
    });

    // Update collectibles (frame-independent)
    this.state.collectibles = this.state.collectibles.filter(col => {
      col.x -= self.state.speed * dt;

      if (self.checkCollision(self.state.player, col)) {
        self.state.tokens++;
        self.addBurnParticles(col.x, col.y);
        return false;
      }

      return col.x > -50;
    });

    // Update particles (TypedObjectPool Zero-Allocation)
    if (this.state.particlePool) {
      const pool = this.state.particlePool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;

          data[offset + 0] += data[offset + 2] * dt; // x += vx
          data[offset + 1] += data[offset + 3] * dt; // y += vy
          data[offset + 3] += 0.15 * dt; // vy += gravity
          data[offset + 4] -= dt; // life -= dt

          if (data[offset + 4] <= 0) {
            pool.release(i);
          }
        }
      }
    } else {
      // Legacy fallback
      this.state.particles = this.state.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.15 * dt;
        p.life -= dt;
        return p.life > 0;
      });
    }

    // Update dust particles (TypedObjectPool Zero-Allocation)
    if (this.state.dustPool) {
      const pool = this.state.dustPool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;

          data[offset + 0] += data[offset + 2] * dt; // x += vx
          data[offset + 1] += data[offset + 3] * dt; // y += vy
          data[offset + 2] *= 0.96; // vx *= friction
          data[offset + 3] += 0.08 * dt; // vy += gravity
          data[offset + 4] -= dt; // life -= dt
          data[offset + 5] *= 0.97; // alpha *= fade

          if (data[offset + 4] <= 0 || data[offset + 5] <= 0.05) {
            pool.release(i);
          }
        }
      }
    } else {
      // Legacy fallback
      this.state.dustParticles = this.state.dustParticles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy += 0.08 * dt;
        p.life -= dt;
        p.alpha *= 0.97;
        return p.life > 0 && p.alpha > 0.05;
      });
    }

    // Update UI (using cached DOM references)
    const distanceEl = this.dom.distance;
    const tokensEl = this.dom.tokens;
    if (distanceEl) distanceEl.textContent = Math.floor(this.state.distance) + 'm';
    if (tokensEl) tokensEl.textContent = this.state.tokens + ' 🔥';
    this.state.score = Math.floor(this.state.distance) + this.state.tokens * 10;
    updateScore(this.gameId, this.state.score);
  },

  /**
   * Draw game
   */
  draw() {
    const ctx = this.ctx;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    skyGrad.addColorStop(0, '#0f0a1e');
    skyGrad.addColorStop(0.4, '#1a1030');
    skyGrad.addColorStop(0.7, '#2d1b4e');
    skyGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 73 + this.state.frameCount * 0.1) % this.canvas.width;
      const sy = (i * 37) % (this.canvas.height * 0.5);
      const size = (i % 3) + 1;
      ctx.globalAlpha = 0.3 + (Math.sin(this.state.frameCount * 0.05 + i) + 1) * 0.2;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;

    // FAR LAYER: Distant mountains (slowest parallax - 0.2x)
    this.state.parallax.far.forEach(m => {
      const mx = (m.x - this.state.distance * m.speed) % (this.canvas.width + m.width);
      const adjustedX = mx < -m.width ? mx + this.canvas.width + m.width : mx;

      // Draw mountain silhouette
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(adjustedX, this.state.ground);
      ctx.lineTo(adjustedX + m.width / 2, this.state.ground - m.height);
      ctx.lineTo(adjustedX + m.width, this.state.ground);
      ctx.closePath();
      ctx.fill();

      // Mountain highlight
      ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.beginPath();
      ctx.moveTo(adjustedX + m.width / 2, this.state.ground - m.height);
      ctx.lineTo(adjustedX + m.width / 2 + 20, this.state.ground - m.height + 30);
      ctx.lineTo(adjustedX + m.width / 2, this.state.ground - m.height + 30);
      ctx.closePath();
      ctx.fill();
    });

    // Clouds
    ctx.fillStyle = 'rgba(100, 80, 140, 0.3)';
    this.state.clouds.forEach(cloud => {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.6, cloud.y - 5, cloud.size * 0.7, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 1.2, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // MID LAYER: Buildings (medium parallax - 0.5x)
    this.state.parallax.mid.forEach(b => {
      const bx = (b.x - this.state.distance * b.speed) % (this.canvas.width + b.width);
      const adjustedX = bx < -b.width ? bx + this.canvas.width + b.width : bx;
      ctx.fillStyle = b.color;
      ctx.fillRect(adjustedX, this.state.ground - b.height, b.width, b.height);

      // Windows (only render some for performance)
      if (b.windows) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        for (let wy = this.state.ground - b.height + 10; wy < this.state.ground - 20; wy += 20) {
          for (let wx = adjustedX + 8; wx < adjustedX + b.width - 8; wx += 15) {
            if (Math.random() > 0.4) ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
    });

    // Ground
    const groundGrad = ctx.createLinearGradient(0, this.state.ground, 0, this.canvas.height);
    groundGrad.addColorStop(0, '#4a3070');
    groundGrad.addColorStop(1, '#2a1a40');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.state.ground, this.canvas.width, 50);

    // Ground lines
    ctx.strokeStyle = '#6b4d9a';
    ctx.lineWidth = 2;
    const offset = (this.state.distance * 5) % 60;
    for (let x = -offset; x < this.canvas.width + 60; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, this.state.ground);
      ctx.lineTo(x + 30, this.state.ground + 50);
      ctx.stroke();
    }

    // NEAR LAYER: Foreground elements (fastest parallax - 0.8x)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    this.state.parallax.near.forEach(e => {
      const ex = (e.x - this.state.distance * e.speed) % (this.canvas.width + 100);
      const adjustedX = ex < -50 ? ex + this.canvas.width + 100 : ex;
      ctx.globalAlpha = e.opacity * 0.5; // Semi-transparent foreground
      ctx.font = `${e.size}px Arial`;
      ctx.fillText(e.icon, adjustedX, this.state.ground - 5);
    });
    ctx.globalAlpha = 1;

    // Dust particles (ground level - TypedObjectPool)
    if (this.state.dustPool) {
      ctx.fillStyle = '#a78bfa'; // Purple dust
      this.state.dustPool.forEach((i, data, offset) => {
        // x, y, vx, vy, life, alpha
        ctx.globalAlpha = data[offset + 5];
        ctx.beginPath();
        // Use life as size factor for now, or add size to itemSize later
        ctx.arc(data[offset + 0], data[offset + 1], 4, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Legacy
      this.state.dustParticles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#a78bfa'; // Purple dust
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;

    // Platforms (using SpriteCache)
    this.state.platforms.forEach(plat => {
      const platY = plat.renderY || plat.y;
      const size = plat.floating ? 38 : 36;
      SpriteCache.draw(ctx, plat.icon, plat.x + plat.width / 2, platY + plat.height / 2, size);
    });

    // Player
    const playerCenterX = this.state.player.x + this.state.player.width / 2;
    const playerCenterY = this.state.player.y + this.state.player.height / 2;

    // Player shadow
    const shadowScale = Math.max(
      0.3,
      1 - (this.state.ground - this.state.player.y - this.state.player.height) / 150
    );
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(
      playerCenterX,
      this.state.ground + 5,
      18 * shadowScale,
      6 * shadowScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw player (using SpriteCache)
    const bounce = this.state.isJumping ? 0 : Math.sin(this.state.distance * 0.4) * 2;
    const tilt = this.state.isJumping
      ? this.state.player.vy * 0.02
      : Math.sin(this.state.distance * 0.4) * 0.1;
    SpriteCache.drawTransformed(ctx, '🐕', playerCenterX, playerCenterY + bounce, 38, {
      rotation: tilt,
      scaleX: -1,
    });

    // Trail effect
    if (this.state.speed > 7 || this.state.dash.active) {
      SpriteCache.drawTransformed(ctx, '🐕', playerCenterX - 18, playerCenterY + bounce, 38, {
        scaleX: -1,
        alpha: this.state.dash.active ? 0.4 : 0.25,
      });
    }

    // Dash effect (no shadowBlur for performance)
    if (this.state.dash.active) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shield effect (no shadowBlur for performance)
    if (this.state.abilityShield.active) {
      const shieldPulse = Math.sin(Date.now() * 0.01) * 0.15 + 0.85;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, 35 * shieldPulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Obstacles (using SpriteCache)
    this.state.obstacles.forEach(obs => {
      SpriteCache.draw(ctx, obs.icon, obs.x + obs.width / 2, obs.y + obs.height / 2, 32);
    });

    // Collectibles (using SpriteCache)
    this.state.collectibles.forEach(col => {
      const float = Math.sin(Date.now() * 0.005 + col.x) * 4;
      SpriteCache.draw(ctx, col.icon, col.x + col.width / 2, col.y + col.height / 2 + float, 24);
    });

    // Particles (TypedObjectPool Zero-Allocation)
    if (this.state.particlePool) {
      const icons = ['💨', '✨', '🔥', '🛡️', '⚡', '💥'];
      this.state.particlePool.forEach((i, data, offset) => {
        // x, y, vx, vy, life, size, type
        const typeIndex = Math.floor(data[offset + 6]);
        const icon = icons[typeIndex] || '✨';
        SpriteCache.drawTransformed(
          ctx,
          icon,
          data[offset + 0],
          data[offset + 1],
          data[offset + 5],
          {
            alpha: data[offset + 4] / 30,
          }
        );
      });
    } else {
      // Legacy
      this.state.particles.forEach(p => {
        SpriteCache.drawTransformed(ctx, p.icon, p.x, p.y, p.size || 16, { alpha: p.life / 30 });
      });
    }
  },

  /**
   * Stop the game and cleanup
   * Protected with try/catch to ensure all cleanup runs even if one part fails
   */
  stop() {
    if (this.state) this.state.gameOver = true;

    // Remove event listeners (protected)
    try {
      document.removeEventListener('keydown', this.handleKeyDown);
      if (this.canvas) {
        this.canvas.removeEventListener('click', this.handleClick);
        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        this.canvas.removeEventListener('touchstart', this.handleTouch);
      }
    } catch (e) {
      console.warn('[BurnRunner] Event listener cleanup error:', e);
    }

    // Cleanup juice system
    try {
      if (this.juice) {
        this.juice.cleanup();
      }
    } catch (e) {
      console.warn('[BurnRunner] Juice cleanup error:', e);
    }

    // Clear references (always runs)
    this.juice = null;
    this.canvas = null;
    this.ctx = null;
    this.state = null;
    this.timing = null;
  },
};

// Export
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.BurnRunner = BurnRunner;
  window.BurnRunner = window.ASDF.BurnRunner;
}
