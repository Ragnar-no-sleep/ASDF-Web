/**
 * Space Shooter - Main Game Engine
 *
 * Coordinator: GameEngineBase + all modules + game state
 * Entry point: window.SpaceShooter
 *
 * @module games/engines/spaceshooter/index
 */

'use strict';

const SpaceShooter = {
  ...GameEngineBase,

  // Game meta
  version: '1.0.1',
  gameId: 'spaceshooter',

  // DOM
  canvas: null,
  ctx: null,
  arena: null,

  // Timing & input
  timing: null,
  input: null,
  intervals: null,

  // Modules
  parallax: null,
  particles: null,
  audio: null,
  entities: null,
  waves: null,
  upgrades: null,
  renderer: null,

  // Game state
  state: null,

  /**
   * Create initial game state (2026 Standard)
   */
  createInitialState() {
    return {
      gameOver: false,
      paused: false,
      phase: 'playing',
      wave: 1,
      score: 0,
      particles: [],
      appState: window.appState || {},
      ship: null,
      bullets: [],
      enemies: [],
      enemyBullets: [],
      powerUps: [],
      boss: null,
      upgrades: {
        hull:
          (window.appState &&
            window.appState.gameState &&
            window.appState.gameState.upgrades &&
            window.appState.gameState.upgrades.hull) ||
          0,
        engine:
          (window.appState &&
            window.appState.gameState &&
            window.appState.gameState.upgrades &&
            window.appState.gameState.upgrades.engine) ||
          0,
        weapons:
          (window.appState &&
            window.appState.gameState &&
            window.appState.gameState.upgrades &&
            window.appState.gameState.upgrades.weapons) ||
          0,
        shields:
          (window.appState &&
            window.appState.gameState &&
            window.appState.gameState.upgrades &&
            window.appState.gameState.upgrades.shields) ||
          0,
      },
    };
  },

  /**
   * Start game
   */
  start(gameId) {
    this.gameId = gameId;

    // Get or create arena
    const existingArena = document.querySelector(`[data-game-arena="${gameId}"]`);
    if (!existingArena) {
      this.createArena();
    } else {
      this.arena = existingArena;
    }

    this.canvas = this.arena.querySelector('canvas');
    if (!this.canvas) {
      const canvas = document.createElement('canvas');
      this.arena.appendChild(canvas);
      this.canvas = canvas;
    }

    // Standard engine initialization (sets up state via createInitialState)
    this.init(gameId, this.canvas);

    // Initialize modules with safety checks
    try {
      this.timing = GameTiming.create();
      this.intervals = IntervalManager.create();
      this.particles = SpaceParticles.create(this.ctx);
      this.audio = SpaceAudio.create();
      this.parallax = SpaceParallax.create(this.canvas, this.ctx);
      this.entities = SpaceEntities;
      this.upgrades = SpaceUpgrades
        ? SpaceUpgrades.create()
        : { hull: 0, engine: 0, weapons: 0, shields: 0 };
      this.waves = SpaceWaves.create(this.canvas.width, this.canvas.height);
      this.renderer = SpaceRenderer.create(this.canvas, this.ctx);
    } catch (err) {
      console.error('[SpaceShooter] Module initialization failed:', err);
      // Fallback to basic state to prevent complete hang
      if (!this.renderer) this.state.gameOver = true;
    }

    // Setup input
    this.input = InputManager.create({
      canvas: this.canvas,
      keyboard: true,
      mouse: true,
      touch: true,
      onKeyDown: e => this.handleKeyDown(e),
      onKeyUp: e => this.handleKeyUp(e),
    });

    // Create ship entity
    this.state.ship = this.entities.createShip(
      this.canvas.width,
      this.canvas.height,
      this.state.upgrades
    );

    // Initialize Zero-Allocation Pools for Entities
    if (this.entities.initPools) {
      this.entities.initPools(this.state);
    }

    // Setup resize
    this._resizeHandler = () => this.resizeCanvas();
    this.track(window, 'resize', this._resizeHandler);
    this.resizeCanvas();

    // Register cleanup
    this.registerActiveGame(gameId);

    // Start engine loop
    this.audio.startEngineLoop();

    // Start game loop (2026 Standard)
    this.gameLoop();
  },

  /**
   * Game update
   */
  update(dt) {
    if (!this.state || this.state.paused || this.state.gameOver) return;

    const ship = this.state.ship;

    // Ship input
    if (this.input.state.keys['arrowleft'] || this.input.state.keys['a']) {
      ship.vx = -ship.speed;
    } else if (this.input.state.keys['arrowright'] || this.input.state.keys['d']) {
      ship.vx = ship.speed;
    } else {
      ship.vx = 0;
    }

    if (this.input.state.keys['arrowup'] || this.input.state.keys['w']) {
      ship.vy = -ship.speed * 0.6;
    } else if (this.input.state.keys['arrowdown'] || this.input.state.keys['s']) {
      ship.vy = ship.speed * 0.4;
    } else {
      ship.vy = 0;
    }

    // Auto-fire
    ship.lastShot -= dt;
    if (ship.lastShot <= 0) {
      this.entities.createBullet(this.state, ship, ship.spreadLevel);
      ship.lastShot = ship.fireRate;
      this.audio.play('shoot');
    }

    // Nuke activation
    if (this.input.state.keys['n'] && ship.nukeCharges > 0) {
      ship.nukeCharges--;
      this.particles.emit('EXPLOSION_LARGE', ship.x, ship.y, {
        count: 32,
        speed: 4,
        life: 610,
        color: '#ffff00',
      });

      if (this.state.enemyPool) this.state.enemyPool.clear();
      if (this.state.enemyBulletPool) this.state.enemyBulletPool.clear();

      this.audio.play('nuke');
      this.renderer.shake(20);
      delete this.input.state.keys['n'];
    }

    // Update entities
    this.entities.update(dt, this.state, this.canvas.width, this.canvas.height);
    this.entities.checkCollisions(this.state);

    // Update parallax, particles
    this.parallax.update(dt);
    this.particles.update(dt);

    // Update waves
    if (this.state.phase === 'playing' || this.state.phase === 'boss') {
      this.waves.update(dt, this.state);
    }

    // Check game over
    if (this.state.ship.hp <= 0) {
      this.state.gameOver = true;
    }
  },

  /**
   * Game draw
   */
  draw() {
    if (!this.state) return;
    this.renderer.draw(this.state, this.parallax, this.particles);
  },

  /**
   * Create arena DOM
   */
  createArena() {
    this.arena = document.createElement('div');
    this.arena.setAttribute('data-game-arena', this.gameId);
    this.arena.className = `game-arena shs-arena`;

    const canvas = document.createElement('canvas');
    canvas.className = 'shs-canvas';
    this.arena.appendChild(canvas);

    const container = document.getElementById('game-container') || document.body;
    container.appendChild(this.arena);
  },

  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'escape') this.state.paused = !this.state.paused;
  },

  handleKeyUp(e) {
    if (e.key.toLowerCase() === 'n') this.input.state.keys['n'] = false;
  },

  /**
   * Override stop to cleanup all modules
   */
  stop() {
    if (this.state) this.state.gameOver = true;
    if (this.audio) {
      this.audio.stopEngineLoop();
      this.audio.suspend();
    }
    if (this.input && this.input.cleanup) this.input.cleanup();
    if (this.intervals) this.intervals.cleanup();
    if (this.particles) this.particles.clear();
    GameEngineBase.stop.call(this);
  },
};

// Export
if (typeof window !== 'undefined') {
  window.SpaceShooter = SpaceShooter;
  if (typeof GameRegistry !== 'undefined') {
    GameRegistry.register('spaceshooter', SpaceShooter);
  }
}
