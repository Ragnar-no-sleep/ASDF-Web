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
  version: '1.0.0',
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
   * Start game
   * @param {string} gameId
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

    this.ctx = this.canvas.getContext('2d');

    // Initialize modules
    this.timing = GameTiming.create();
    this.intervals = IntervalManager.create();
    this.particles = SpaceParticles.create(this.ctx);
    this.audio = SpaceAudio.create();
    this.parallax = SpaceParallax.create(this.canvas, this.ctx);
    this.entities = SpaceEntities.create();
    this.upgrades = SpaceUpgrades.create();
    this.waves = SpaceWaves.create(this.canvas.width, this.canvas.height);
    this.renderer = SpaceRenderer.create(this.canvas, this.ctx);

    // Setup input
    this.input = InputManager.create({
      canvas: this.canvas,
      keyboard: true,
      mouse: true,
      touch: true,
      onKeyDown: e => this.handleKeyDown(e),
      onKeyUp: e => this.handleKeyUp(e),
      onMouseMove: (e, state) => this.handleMouseMove(e, state),
    });

    // Initialize game state
    this.state = {
      gameOver: false,
      paused: false,
      phase: 'playing', // playing, upgrading, boss, gameover
      wave: 1,
      score: 0,
      particles: [],
      appState: window.appState || {},

      // Ship
      ship: null,

      // Collections
      bullets: [],
      enemies: [],
      enemyBullets: [],
      powerUps: [],
      boss: null,

      // Upgrades (persisted)
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

    this.state.ship = this.entities.createShip(
      this.canvas.width,
      this.canvas.height,
      this.state.upgrades
    );

    // Setup resize (tracked for auto-cleanup in stop())
    this._resizeHandler = () => this.resizeCanvas();
    this.trackHandler(window, 'resize', this._resizeHandler);
    this.resizeCanvas();

    // Register cleanup
    this.registerActiveGame(gameId);

    // Start engine loop
    this.audio.startEngineLoop();
    this.gameLoop();
  },

  /**
   * Game update
   * @param {number} dt
   */
  update(dt) {
    if (this.state.paused || !this.state) return;

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
      const newBullets = this.entities.createBullet(ship, ship.spreadLevel);
      this.state.bullets.push(...newBullets);
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

      // Kill all enemies
      this.state.enemies = [];
      this.state.enemyBullets = [];
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

    this.state.particleCount = this.particles.getCount();
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
    const existing = document.querySelector(`[data-game-arena="${this.gameId}"]`);
    if (existing) {
      this.arena = existing;
      return;
    }

    this.arena = document.createElement('div');
    this.arena.setAttribute('data-game-arena', this.gameId);
    this.arena.className = `game-arena shs-arena`;

    const canvas = document.createElement('canvas');
    canvas.className = 'shs-canvas';
    this.arena.appendChild(canvas);

    const container = document.getElementById('game-container') || document.body;
    container.appendChild(this.arena);
  },

  /**
   * Handle key down
   * @param {KeyboardEvent} e
   */
  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    // Esc to pause
    if (key === 'escape') {
      this.state.paused = !this.state.paused;
    }
  },

  /**
   * Handle key up
   * @param {KeyboardEvent} e
   */
  handleKeyUp(e) {
    // Nuke key released
    if (e.key.toLowerCase() === 'n') {
      this.input.state.keys['n'] = false;
    }
  },

  /**
   * Handle mouse move
   * @param {MouseEvent} e
   * @param {Object} state
   */
  handleMouseMove(e, state) {
    // Optional: track mouse for alternative aim mechanism
  },

  /**
   * Override stop to cleanup all modules
   */
  stop() {
    if (this.state) {
      this.state.gameOver = true;
    }

    // Cleanup modules
    if (this.audio) {
      this.audio.stopEngineLoop();
      this.audio.suspend();
    }

    if (this.input && this.input.cleanup) {
      this.input.cleanup();
    }

    if (this.intervals) {
      this.intervals.cleanup();
    }

    if (this.particles) {
      this.particles.clear();
    }

    // Call parent stop
    GameEngineBase.stop.call(this);
  },
};

// Export to window
if (typeof window !== 'undefined') {
  window.SpaceShooter = SpaceShooter;

  // Register with GameRegistry for framework integration
  if (typeof GameRegistry !== 'undefined') {
    GameRegistry.register('spaceshooter', SpaceShooter);
  }
}
