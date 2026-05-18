/**
 * ASDF Games - DexDash Engine (Horizontal 2026 Standard)
 *
 * Optimized racing game with horizontal scrolling
 * Visual realism: Side-view car driving on a flat road
 * Pure Vanilla JS - Zero Allocation
 */

'use strict';

const DexDash = {
  ...GameEngineBase,
  version: '1.1.8',
  gameId: 'dexdash',
  roadHeight: 250,

  dexLogos: ['🦄', '🦞', '🍣', '☀️', '🌊', '💎'],
  obstacleTypes: [
    { icon: '🚧', slowdown: 2 },
    { icon: '⛔', slowdown: 3 },
    { icon: '🐌', slowdown: 1.5 },
  ],

  /**
   * Start the game
   */
  start(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    if (!arena) return;

    this.gameId = gameId;
    this.createArena(arena);
    this.canvas = document.getElementById('dd-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Performance Optimization: Cache DOM references and UI state (2026 Standard)
    this.dom = {
      distance: document.getElementById('dd-distance'),
      score: document.getElementById('dd-score'),
      speed: document.getElementById('dd-speed'),
    };
    this.uiState = {
      distance: -1,
      score: -1,
      speed: -1,
    };

    this.resizeCanvas();
    this.state = {
      score: 0,
      distance: 0,
      gameOver: false,
      // Start car at the left
      player: { x: 120, y: 0, vx: 0, vy: 0, speed: 2 },
      obstacles: [],
      boosts: [],
      roadOffset: 0,
      keys: { up: false, down: false, left: false, right: false },
      effects: [],
      maxSpeed: 8,
      frameCount: 0,
    };

    this.timing = GameTiming.create();
    this.setupInput();
    this.preloadSprites();

    // Start game loop (2026 Standard)
    this.gameLoop();

    this.registerActiveGame(gameId);
  },

  /**
   * Create arena HTML
   */
  createArena(arena) {
    arena.innerHTML = `
      <div class="dd-container">
        <canvas id="dd-canvas" class="game-canvas"></canvas>
        <div class="game-hud-top-center">
          <div class="game-hud-stat"><span class="dd-stat-label">DIST</span><div id="dd-distance">0m</div></div>
          <div class="game-hud-stat"><span class="dd-stat-label">SCORE</span><div id="dd-score">0</div></div>
          <div class="game-hud-stat"><span class="dd-stat-label">SPEED</span><div id="dd-speed">0</div></div>
        </div>
      </div>
    `;
  },

  preloadSprites() {
    SpriteCache.preload([
      { emoji: '🏎️', size: 60 },
      { emoji: '🚧', size: 40 },
      { emoji: '⛔', size: 40 },
      { emoji: '🦄', size: 35 },
    ]);
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth || 800;
    this.canvas.height = parent.clientHeight || 600;
    this.state.player.y = this.canvas.height / 2;
  },

  roadTop() {
    return (this.canvas.height - this.roadHeight) / 2;
  },
  roadBottom() {
    return this.roadTop() + this.roadHeight;
  },

  spawnObstacle() {
    const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
    this.state.obstacles.push({
      x: this.canvas.width + 100,
      y: this.roadTop() + 40 + Math.random() * (this.roadHeight - 80),
      ...type,
      speedVar: 1 + Math.random(),
    });
  },

  spawnBoost() {
    this.state.boosts.push({
      x: this.canvas.width + 100,
      y: this.roadTop() + 40 + Math.random() * (this.roadHeight - 80),
      icon: this.dexLogos[Math.floor(Math.random() * this.dexLogos.length)],
      value: 50,
      speedVar: 0.5 + Math.random(),
    });
  },

  update(dt) {
    if (this.state.gameOver) return;

    const s = this.state;
    s.maxSpeed = Math.min(14, 8 + s.distance * 0.005);
    s.player.speed = Math.min(s.maxSpeed, s.player.speed + 0.01 * dt);
    s.distance += s.player.speed * 0.2 * dt;
    s.roadOffset = (s.roadOffset + s.player.speed * 10 * dt) % 100;

    // Movement
    const friction = Math.pow(0.92, dt);
    if (s.keys.up) s.player.vy -= 1.5 * dt;
    if (s.keys.down) s.player.vy += 1.5 * dt;
    if (s.keys.left) s.player.vx -= 1.0 * dt;
    if (s.keys.right) s.player.vx += 1.0 * dt;

    s.player.vx *= friction;
    s.player.vy *= friction;
    s.player.x += s.player.vx * dt;
    s.player.y += s.player.vy * dt;

    // Boundaries
    const rT = this.roadTop(),
      rB = this.roadBottom();
    s.player.y = Math.max(rT + 30, Math.min(rB - 30, s.player.y));
    s.player.x = Math.max(60, Math.min(this.canvas.width - 60, s.player.x));

    // Spawning
    if (Math.random() < 0.02) this.spawnObstacle();
    if (Math.random() < 0.01) this.spawnBoost();

    // Entities Logic
    const worldSpeed = s.player.speed * 8;
    s.obstacles = s.obstacles.filter(o => {
      o.x -= (worldSpeed + o.speedVar) * dt;
      if (Math.hypot(o.x - s.player.x, o.y - s.player.y) < 40) {
        s.player.speed = Math.max(2, s.player.speed - o.slowdown);
        s.score = Math.max(0, s.score - 10);
        return false;
      }
      return o.x > -100;
    });

    s.boosts = s.boosts.filter(b => {
      b.x -= (worldSpeed + b.speedVar) * dt;
      if (Math.hypot(b.x - s.player.x, b.y - s.player.y) < 40) {
        s.score += b.value;
        s.player.speed = Math.min(s.maxSpeed, b.speedVar + s.player.speed + 0.5);
        return false;
      }
      return b.x > -100;
    });
  },

  draw() {
    const ctx = this.ctx;
    const s = this.state;
    const rT = this.roadTop(),
      rB = this.roadBottom();

    // Clear and BG
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Horizontal Road
    ctx.fillStyle = '#151525';
    ctx.fillRect(0, rT | 0, this.canvas.width, this.roadHeight | 0);

    // Side Edges
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, rT | 0);
    ctx.lineTo(this.canvas.width, rT | 0);
    ctx.moveTo(0, rB | 0);
    ctx.lineTo(this.canvas.width, rB | 0);
    ctx.stroke();

    // Markings (Horizontal movement)
    ctx.strokeStyle = '#d97706';
    ctx.setLineDash([40, 60]);
    ctx.beginPath();
    ctx.moveTo(-s.roadOffset, (this.canvas.height / 2) | 0);
    ctx.lineTo(this.canvas.width, (this.canvas.height / 2) | 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Entities
    s.obstacles.forEach(o => SpriteCache.draw(ctx, o.icon, o.x | 0, o.y | 0, 40));
    s.boosts.forEach(b => SpriteCache.draw(ctx, b.icon, b.x | 0, b.y | 0, 35));

    // Player: FLAT and FORWARD
    SpriteCache.drawTransformed(ctx, '🏎️', s.player.x | 0, s.player.y | 0, 60, {
      scaleX: -1, // Face Right
      rotation: s.player.vy * 0.03, // Very subtle tilt
    });

    // Performance Optimization: Dirty-check UI updates (2026 Standard)
    this.updateUI();
  },

  updateUI() {
    const s = this.state;
    const dist = s.distance | 0;
    const speed = (s.player.speed * 20) | 0;

    if (dist !== this.uiState.distance) {
      if (this.dom.distance) this.dom.distance.textContent = dist + 'm';
      this.uiState.distance = dist;
    }

    if (s.score !== this.uiState.score) {
      if (this.dom.score) this.dom.score.textContent = s.score;
      this.uiState.score = s.score;
      updateScore(this.gameId, s.score);
    }

    if (speed !== this.uiState.speed) {
      if (this.dom.speed) this.dom.speed.textContent = speed + ' km/h';
      this.uiState.speed = speed;
    }
  },

  setupInput() {
    const k = this.state.keys;
    this.track(document, 'keydown', e => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = true;
    });
    this.track(document, 'keyup', e => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = false;
    });
  },

  stop() {
    GameEngineBase.stop.call(this);
  },
};

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.DexDash = DexDash;
  window.DexDash = window.ASDF.DexDash;

  if (typeof GameRegistry !== 'undefined') {
    GameRegistry.register('dexdash', DexDash);
  }
}
