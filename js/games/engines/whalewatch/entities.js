/**
 * WhaleWatch Game Entities — Split-screen dual game (Symbol Match + Memory Sequence)
 * @module games/engines/whalewatch/entities
 */

'use strict';

const WhaleWatchEntities = {
  /**
   * Symbol legend: 12 symbols with names for matching
   */
  symbolLegend: [
    { symbol: '&#128293;', name: 'Fire' },
    { symbol: '&#128142;', name: 'Diamond' },
    { symbol: '&#128640;', name: 'Rocket' },
    { symbol: '&#128176;', name: 'Money' },
    { symbol: '&#11088;', name: 'Star' },
    { symbol: '&#127918;', name: 'Game' },
    { symbol: '&#127942;', name: 'Trophy' },
    { symbol: '&#128171;', name: 'Sparkle' },
    { symbol: '&#127873;', name: 'Gift' },
    { symbol: '&#128081;', name: 'Crown' },
    { symbol: '&#9889;', name: 'Bolt' },
    { symbol: '&#128302;', name: 'Crystal' },
  ],

  /**
   * Create initial game state
   */
  createGameState() {
    return {
      score: 0,
      level: 1,
      gameOver: false,
      // Symbol Match (left side)
      symbolMatch: {
        grid: [],
        targetIndex: 0,
        foundCount: 0,
        totalTargets: 0,
        timer: 55,
        cols: 5,
        rows: 5,
        completed: false,
        mistakes: 0,
        maxMistakes: 3,
        hintsRemaining: 2,
        hintActive: false,
        combo: 0,
        lastFindTime: 0,
        comboTimeout: 2000,
      },
      // Memory Game (right side)
      memoryGame: {
        sequence: [],
        playerSequence: [],
        showingSequence: false,
        currentShowIndex: 0,
        waitingForInput: false,
        inputTimer: 0,
        inputTimeLimit: 13,
        buttons: [],
        round: 1,
        completed: false,
      },
      colors: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'],
      difficulty: {
        symbolsPerLevel: [3, 4, 5, 6, 8, 10, 12],
        timerPerLevel: [55, 50, 45, 40, 35, 30, 25],
        gridSizes: [
          { cols: 4, rows: 4 },
          { cols: 5, rows: 4 },
          { cols: 5, rows: 5 },
          { cols: 6, rows: 5 },
          { cols: 6, rows: 6 },
          { cols: 7, rows: 6 },
          { cols: 8, rows: 6 },
        ],
      },
      particles: [],
    };
  },

  /**
   * Create grid for symbol matching (left side)
   */
  createSymbolGrid(level, legend) {
    const levelIndex = Math.min(level - 1, 6);
    const gridSize = this.difficulty.gridSizes[levelIndex];
    const totalTargets = this.difficulty.symbolsPerLevel[levelIndex];

    const availableSymbols = Math.min(8 + level, legend.length);
    const targetIndex = Math.floor(Math.random() * availableSymbols);
    const target = legend[targetIndex];

    const totalCells = gridSize.cols * gridSize.rows;
    const gridSymbols = [];

    // Add target symbols
    for (let i = 0; i < totalTargets; i++) {
      gridSymbols.push({ symbol: target.symbol, isTarget: true, found: false });
    }

    // Add distractor symbols
    for (let i = totalTargets; i < totalCells; i++) {
      let randomItem;
      do {
        randomItem = legend[Math.floor(Math.random() * availableSymbols)];
      } while (randomItem.symbol === target.symbol);
      gridSymbols.push({ symbol: randomItem.symbol, isTarget: false, found: false });
    }

    return {
      grid: gridSymbols.sort(() => Math.random() - 0.5),
      targetIndex,
      target,
      totalTargets,
      cols: gridSize.cols,
      rows: gridSize.rows,
    };
  },

  /**
   * Calculate score bonus for symbol match (Fibonacci combo multiplier)
   */
  calculateSymbolScore(level, combo) {
    const baseScore = 10 + level * 5;
    const comboMultiplier = [1, 1, 2, 3, 5, 8][Math.min(combo, 5)];
    return baseScore * comboMultiplier;
  },

  /**
   * Calculate time bonus for completing symbol hunt
   */
  calculateTimeBonus(timerRemaining) {
    return timerRemaining * 3;
  },

  /**
   * Create particle for celebration
   */
  createParticle(x, y, vx, vy, life, color, size) {
    return {
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      color,
      size,
    };
  },

  /**
   * Spawn celebration particles
   */
  spawnCelebration(x, y, count = 8) {
    const colors = ['#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];
    const particles = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      particles.push(
        this.createParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 2,
          40 + Math.random() * 20,
          colors[Math.floor(Math.random() * colors.length)],
          4 + Math.random() * 4
        )
      );
    }

    return particles;
  },

  /**
   * Update particle physics
   */
  updateParticles(particles, dt = 0.016) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity
      p.life--;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  },

  /**
   * Memory game: generate next sequence element
   */
  nextMemorySequence(sequence) {
    return [...sequence, Math.floor(Math.random() * 4)];
  },

  /**
   * Calculate memory game score bonus
   */
  calculateMemoryScore(round, inputTimeRemaining) {
    const baseScore = 5 * round;
    const timeBonus = Math.floor(inputTimeRemaining * 5);
    const roundBonus = 20 * round + timeBonus;
    return { baseScore, timeBonus, roundBonus };
  },

  /**
   * Validate symbol grid
   */
  validateGrid(grid) {
    if (!Array.isArray(grid)) throw new Error('Grid must be array');
    if (grid.length === 0) throw new Error('Grid cannot be empty');
    grid.forEach((cell, idx) => {
      if (typeof cell.symbol !== 'string') throw new Error(`Cell ${idx}: symbol must be string`);
      if (typeof cell.isTarget !== 'boolean') {
        throw new Error(`Cell ${idx}: isTarget must be boolean`);
      }
      if (typeof cell.found !== 'boolean') throw new Error(`Cell ${idx}: found must be boolean`);
    });
  },
};

if (typeof window !== 'undefined') {
  window.WhaleWatchEntities = WhaleWatchEntities;
}
