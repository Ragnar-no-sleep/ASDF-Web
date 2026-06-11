/**
 * ASDF Games - Whale Watch Engine
 *
 * Dual focus game: scan liquidity signals, then replay whale movement
 * sequences. DOM-first by design for crisp interaction and accessibility.
 */

'use strict';

(function () {
  const SYMBOLS = [
    { symbol: 'A', name: 'ASDF A' },
    { symbol: 'S', name: 'ASDF S' },
    { symbol: 'D', name: 'ASDF D' },
    { symbol: 'F', name: 'ASDF F' },
    { symbol: '+', name: 'Boost' },
    { symbol: '*', name: 'Sun' },
    { symbol: '$', name: 'Token' },
    { symbol: 'X', name: 'Trap' },
    { symbol: '1', name: 'Stack' },
    { symbol: '2', name: 'Route' },
    { symbol: '3', name: 'Run' },
    { symbol: '4', name: 'Score' },
  ];

  const MEMORY_COLORS = ['#ffcc00', '#ff6b35', '#ff2d95', '#fff2b3'];
  const MEMORY_LABELS = ['A', 'S', 'D', 'F'];

  const WhaleWatch = {
    version: '3.0.0',
    gameId: 'whalewatch',
    instance: null,
    dom: null,
    _timeouts: [],
    _handlers: [],

    start(gameId) {
      this.stop();
      this.gameId = gameId;

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      this.instance = new ASDF.GameInstance(document.createElement('canvas'), {
        maxEntities: 16,
        debug: false,
      });

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(
          this.instance.canvas,
          this.instance.canvas.getContext('2d')
        );
      }

      this.instance.world.setResource('GameState', {
        score: 0,
        level: 1,
        gameOver: false,
        scan: {
          timer: 45,
          maxTimer: 45,
          found: 0,
          total: 0,
          mistakes: 0,
          target: SYMBOLS[0],
          cells: [],
        },
        memory: {
          round: 1,
          sequence: [],
          input: [],
          state: 'idle',
        },
      });

      this.cacheDom();
      this.setupScanRound();
      this.setupMemoryBoard();
      this.startMemoryRound();

      this.instance.onUpdate = dt => this.update(dt);
      this.instance.onRender = () => {};
      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="ww-container ww-arcade">
          <section class="ww-panel ww-panel--scan">
            <div class="ww-panel-header">
              <span class="ww-panel-title--gold">Signal Scan</span>
              <span class="ww-stat-timer"><span id="sm-timer">45</span>s</span>
            </div>
            <div class="ww-target-box">
              <span class="ww-target-label">Find</span>
              <strong id="sm-target-name" class="ww-target-name">...</strong>
            </div>
            <div id="symbol-grid" class="ww-symbol-grid"></div>
            <div class="ww-stats-row ww-stats-row--footer">
              <span class="ww-stat-found">FOUND <span id="sm-found">0</span>/<span id="sm-total">0</span></span>
              <span class="ww-stat-mistakes">MISS <span id="sm-mistakes">0</span></span>
            </div>
          </section>

          <section class="ww-panel ww-panel--memory">
            <div class="ww-panel-header">
              <span class="ww-panel-title--purple">Whale Route</span>
              <span class="ww-mem-round">ROUND <span id="mem-round">1</span></span>
            </div>
            <div id="mem-status" class="ww-mem-status">Watch the route</div>
            <div class="ww-timer-bar-track"><div id="mem-timer-bar" class="ww-timer-bar-fill"></div></div>
            <div id="memory-buttons" class="ww-memory-buttons"></div>
          </section>

          <div class="ww-bottom-hud">
            <span>SCORE <strong id="ww-score" class="ww-score-text">0</strong></span>
            <span>LEVEL <strong id="ww-level" class="ww-level-text">1</strong></span>
          </div>
        </div>
      `;
    },

    cacheDom() {
      this.dom = {
        score: document.getElementById('ww-score'),
        level: document.getElementById('ww-level'),
        scanTimer: document.getElementById('sm-timer'),
        scanFound: document.getElementById('sm-found'),
        scanTotal: document.getElementById('sm-total'),
        scanMistakes: document.getElementById('sm-mistakes'),
        targetName: document.getElementById('sm-target-name'),
        grid: document.getElementById('symbol-grid'),
        memoryButtons: document.getElementById('memory-buttons'),
        memoryStatus: document.getElementById('mem-status'),
        memoryRound: document.getElementById('mem-round'),
        memoryBar: document.getElementById('mem-timer-bar'),
      };
    },

    setupScanRound() {
      const state = this.getState();
      const scan = state.scan;
      scan.target = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      scan.total = Math.min(8, 3 + Math.floor(state.level / 2));
      scan.found = 0;
      scan.mistakes = 0;
      scan.timer = Math.max(24, 45 - state.level * 1.5);
      scan.maxTimer = scan.timer;
      scan.cells = this.createScanCells(scan.target, scan.total);

      this.dom.targetName.textContent = `${scan.target.name} (${scan.target.symbol})`;
      this.dom.grid.innerHTML = '';

      scan.cells.forEach((cell, index) => {
        const button = document.createElement('button');
        button.className = 'ww-card';
        button.type = 'button';
        button.textContent = '?';
        button.dataset.index = String(index);
        this.track(button, 'click', () => this.revealScanCell(index, button));
        this.dom.grid.appendChild(button);
      });

      this.updateUI();
    },

    createScanCells(target, total) {
      const cells = [];
      for (let i = 0; i < total; i++) cells.push({ ...target, target: true, revealed: false });
      while (cells.length < 16) {
        const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (symbol.name !== target.name) cells.push({ ...symbol, target: false, revealed: false });
      }
      return cells.sort(() => Math.random() - 0.5);
    },

    revealScanCell(index, button) {
      const state = this.getState();
      const cell = state.scan.cells[index];
      if (!cell || cell.revealed || state.gameOver) return;

      cell.revealed = true;
      button.textContent = cell.symbol;
      button.classList.add('ww-card--revealed');

      if (cell.target) {
        button.classList.add('ww-card--found');
        state.scan.found += 1;
        state.score += 22 + state.level * 2;
        if (state.scan.found >= state.scan.total) {
          state.level += 1;
          this.setLater(() => this.setupScanRound(), 420);
        }
      } else {
        button.classList.add('ww-card--wrong');
        state.scan.mistakes += 1;
        state.score = Math.max(0, state.score - 8);
        this.setLater(() => {
          cell.revealed = false;
          button.textContent = '?';
          button.classList.remove('ww-card--revealed', 'ww-card--wrong');
        }, 520);
      }

      this.updateUI();
    },

    setupMemoryBoard() {
      this.dom.memoryButtons.innerHTML = '';
      MEMORY_COLORS.forEach((color, index) => {
        const button = document.createElement('button');
        button.className = `ww-mem-btn ww-mem-btn--${index}`;
        button.type = 'button';
        button.textContent = MEMORY_LABELS[index];
        button.dataset.color = color;
        this.track(button, 'click', () => this.handleMemoryClick(index));
        this.dom.memoryButtons.appendChild(button);
      });
    },

    startMemoryRound() {
      const state = this.getState();
      const memory = state.memory;
      memory.input = [];
      memory.sequence.push(Math.floor(Math.random() * MEMORY_COLORS.length));
      memory.state = 'showing';
      this.dom.memoryStatus.textContent = 'Watch the route';
      this.showSequence();
    },

    showSequence() {
      const memory = this.getState().memory;
      const buttons = Array.from(this.dom.memoryButtons.children);
      let delay = 280;
      buttons.forEach(btn => btn.setAttribute('disabled', 'true'));

      memory.sequence.forEach(index => {
        this.setLater(() => this.pulseMemoryButton(buttons[index]), delay);
        delay += Math.max(240, 520 - memory.round * 18);
      });

      this.setLater(() => {
        memory.state = 'waiting';
        this.dom.memoryStatus.textContent = 'Repeat the route';
        buttons.forEach(btn => btn.removeAttribute('disabled'));
      }, delay + 120);
    },

    pulseMemoryButton(button) {
      if (!button) return;
      button.classList.add('ww-mem-btn--active');
      this.setLater(() => button.classList.remove('ww-mem-btn--active'), 210);
    },

    handleMemoryClick(index) {
      const state = this.getState();
      const memory = state.memory;
      if (memory.state !== 'waiting' || state.gameOver) return;

      this.pulseMemoryButton(this.dom.memoryButtons.children[index]);
      memory.input.push(index);
      const inputIndex = memory.input.length - 1;

      if (memory.sequence[inputIndex] !== index) {
        state.score = Math.max(0, state.score - 15);
        memory.sequence = [];
        memory.round = 1;
        memory.state = 'showing';
        this.dom.memoryStatus.textContent = 'Route lost';
        this.setLater(() => this.startMemoryRound(), 820);
        this.updateUI();
        return;
      }

      if (memory.input.length === memory.sequence.length) {
        state.score += 38 + memory.round * 7;
        memory.round += 1;
        memory.state = 'showing';
        this.dom.memoryStatus.textContent = 'Route locked';
        this.setLater(() => this.startMemoryRound(), 650);
      }

      this.updateUI();
    },

    update(dt) {
      const state = this.getState();
      if (state.gameOver) return;

      state.scan.timer -= dt / 60;
      if (state.scan.timer <= 0) {
        state.score = Math.max(0, state.score - 20);
        this.setupScanRound();
      }

      this.updateUI();
    },

    updateUI() {
      const state = this.getState();
      const scanRatio = Math.max(0, state.scan.timer / state.scan.maxTimer);
      this.dom.score.textContent = state.score;
      this.dom.level.textContent = state.level;
      this.dom.scanTimer.textContent = Math.ceil(state.scan.timer);
      this.dom.scanFound.textContent = state.scan.found;
      this.dom.scanTotal.textContent = state.scan.total;
      this.dom.scanMistakes.textContent = state.scan.mistakes;
      this.dom.memoryRound.textContent = state.memory.round;
      const bucket = Math.max(0, Math.min(10, Math.ceil(scanRatio * 10)));
      this.dom.memoryBar.className = `ww-timer-bar-fill ww-timer-bar-fill--p${bucket}`;
    },

    getState() {
      return this.instance.world.getResource('GameState');
    },

    track(target, event, handler) {
      target.addEventListener(event, handler);
      this._handlers.push({ target, event, handler });
    },

    setLater(fn, delay) {
      const id = setTimeout(() => {
        this._timeouts = this._timeouts.filter(item => item !== id);
        if (this.instance) fn();
      }, delay);
      this._timeouts.push(id);
      return id;
    },

    stop() {
      this._timeouts.forEach(id => clearTimeout(id));
      this._timeouts = [];
      this._handlers.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      this._handlers = [];
      if (this.instance) this.instance.stop();
      this.instance = null;
      this.dom = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.WhaleWatch = WhaleWatch;
  window.WhaleWatch = WhaleWatch;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('whalewatch', WhaleWatch);
})();
