/**
 * ASDF Games - Whale Watch Engine (11/10 ECS Edition)
 *
 * Dual cognitive game:
 * - Symbol Match: Find all target symbols in a 3D flip grid.
 * - Memory Sequence: Simon-like recall pattern.
 *
 * Migrated to ECS for peak zero-allocation performance and modularity.
 */

'use strict';

(function () {
  const WhaleWatch = {
    version: '2.2.0',
    gameId: 'whalewatch',
    instance: null,

    symbolLegend: [
      { symbol: '🔥', name: 'Fire' },
      { symbol: '💎', name: 'Diamond' },
      { symbol: '🚀', name: 'Rocket' },
      { symbol: '💰', name: 'Money' },
      { symbol: '⭐', name: 'Star' },
      { symbol: '🎮', name: 'Game' },
      { symbol: '🏆', name: 'Trophy' },
      { symbol: '✨', name: 'Sparkle' },
      { symbol: '🎁', name: 'Gift' },
      { symbol: '👑', name: 'Crown' },
      { symbol: '⚡', name: 'Bolt' },
      { symbol: '🔮', name: 'Crystal' },
    ],

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);

      this.instance = new ASDF.GameInstance(document.createElement('canvas'), {
        maxEntities: 200,
        debug: false,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      world.setResource('GameState', {
        score: 0,
        level: 1,
        gameOver: false,
        symbolMatch: {
          grid: [],
          foundCount: 0,
          totalTargets: 0,
          timer: 55,
          cols: 4,
          rows: 4,
          targetIndex: 0,
          mistakes: 0,
          hints: 2,
        },
        memoryGame: {
          sequence: [],
          playerSeq: [],
          round: 1,
          state: 'idle',
          timer: 10,
        },
      });

      this.dom = {
        score: document.getElementById('ww-score'),
        level: document.getElementById('ww-level'),
        smTimer: document.getElementById('sm-timer'),
        smFound: document.getElementById('sm-found'),
        smTotal: document.getElementById('sm-total'),
        smTargetName: document.getElementById('sm-target-name'),
        memStatus: document.getElementById('mem-status'),
        memTimer: document.getElementById('mem-timer-bar'),
      };

      this.setupSymbolHunt(world);
      this.setupMemoryGame(world);

      this.instance.onUpdate = dt => this.update(dt);
      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="ww-layout" style="display:flex; height:100%; gap:15px; padding:15px; background:#0a1628; color:#fff; font-family:Orbitron, sans-serif;">
          <!-- LEFT: Symbol Match -->
          <div class="ww-panel" style="flex:1; background:rgba(0,0,0,0.3); border-radius:12px; padding:15px; border:1px solid #333; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="color:#fbbf24; font-size:12px;">FIND: <span id="sm-target-name">...</span></span>
                <span style="color:#ef4444; font-size:12px;">⏱️ <span id="sm-timer">55</span>s</span>
            </div>
            <div id="symbol-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px; flex:1;"></div>
            <div style="margin-top:10px; font-size:12px; text-align:center;">
                FOUND: <span id="sm-found">0</span> / <span id="sm-total">0</span>
            </div>
          </div>
          <!-- RIGHT: Memory -->
          <div class="ww-panel" style="flex:1; background:rgba(0,0,0,0.3); border-radius:12px; padding:15px; border:1px solid #333; display:flex; flex-direction:column;">
            <div id="mem-status" style="text-align:center; margin-bottom:10px; color:#a855f7;">Wait for sequence...</div>
            <div style="height:4px; background:#222; margin-bottom:15px;"><div id="mem-timer-bar" style="height:100%; width:100%; background:#22c55e;"></div></div>
            <div id="memory-buttons" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; flex:1;"></div>
          </div>
          <!-- HUD OVERLAY -->
          <div style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); padding:10px 30px; border-radius:30px; border:1px solid #fbbf24; display:flex; gap:30px;">
            <div>SCORE: <span id="ww-score" style="color:#fbbf24; font-weight:bold;">0</span></div>
            <div>LEVEL: <span id="ww-level" style="color:#a855f7; font-weight:bold;">1</span></div>
          </div>
        </div>
      `;
    },

    setupSymbolHunt(world) {
      const state = world.getResource('GameState').symbolMatch;
      const grid = document.getElementById('symbol-grid');
      grid.innerHTML = '';

      const target = this.symbolLegend[Math.floor(Math.random() * this.symbolLegend.length)];
      state.targetIndex = this.symbolLegend.indexOf(target);
      document.getElementById('sm-target-name').textContent = target.name;

      state.totalTargets = 3 + Math.floor(world.getResource('GameState').level / 2);
      state.foundCount = 0;

      const cells = [];
      for (let i = 0; i < state.totalTargets; i++)
        cells.push({ symbol: target.symbol, isTarget: true });
      for (let i = state.totalTargets; i < 16; i++) {
        let other;
        do {
          other = this.symbolLegend[Math.floor(Math.random() * this.symbolLegend.length)];
        } while (other === target);
        cells.push({ symbol: other.symbol, isTarget: false });
      }
      cells.sort(() => Math.random() - 0.5);

      cells.forEach((cell, idx) => {
        const btn = document.createElement('button');
        btn.className = 'ww-card';
        btn.style.cssText =
          'background:rgba(59,130,246,0.1); border:1px solid #3b82f6; border-radius:8px; font-size:24px; cursor:pointer; transition:all 0.2s;';
        btn.innerHTML = '❓';
        btn.onclick = () => {
          if (btn.disabled) return;
          btn.innerHTML = cell.symbol;
          if (cell.isTarget) {
            btn.style.background = 'rgba(34,197,94,0.3)';
            btn.style.borderColor = '#22c55e';
            btn.disabled = true;
            state.foundCount++;
            world.getResource('GameState').score += 20;
            if (state.foundCount >= state.totalTargets) this.nextLevel(world);
          } else {
            btn.style.background = 'rgba(239,68,68,0.3)';
            btn.style.borderColor = '#ef4444';
            setTimeout(() => {
              btn.innerHTML = '❓';
              btn.style.background = 'rgba(59,130,246,0.1)';
              btn.style.borderColor = '#3b82f6';
            }, 500);
            world.getResource('GameState').score = Math.max(
              0,
              world.getResource('GameState').score - 10
            );
          }
          this.updateUI(world);
        };
        grid.appendChild(btn);
      });
    },

    setupMemoryGame(world) {
      const container = document.getElementById('memory-buttons');
      container.innerHTML = '';
      const colors = ['#3b82f6', '#0ea5e9', '#22c55e', '#f59e0b'];
      const icons = ['🦈', '🐋', '🐟', '🐕'];

      colors.forEach((color, idx) => {
        const btn = document.createElement('button');
        btn.style.cssText = `background:rgba(0,0,0,0.5); border:4px solid ${color}; border-radius:12px; font-size:32px; cursor:pointer; opacity:0.6; transition:all 0.1s;`;
        btn.innerHTML = icons[idx];
        btn.onclick = () => this.handleMemoryClick(world, idx);
        container.appendChild(btn);
      });

      this.startMemoryRound(world);
    },

    startMemoryRound(world) {
      const state = world.getResource('GameState').memoryGame;
      state.sequence.push(Math.floor(Math.random() * 4));
      state.playerSeq = [];
      state.state = 'showing';
      this.showSequence(world);
    },

    async showSequence(world) {
      const state = world.getResource('GameState').memoryGame;
      const btns = document.getElementById('memory-buttons').children;

      for (let i = 0; i < state.sequence.length; i++) {
        const idx = state.sequence[i];
        const btn = btns[idx];
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.05)';
        await new Promise(r => setTimeout(r, 400));
        btn.style.opacity = '0.6';
        btn.style.transform = 'scale(1)';
        await new Promise(r => setTimeout(r, 200));
      }

      state.state = 'waiting';
      document.getElementById('mem-status').textContent = 'YOUR TURN!';
      document.getElementById('mem-status').style.color = '#22c55e';
    },

    handleMemoryClick(world, idx) {
      const state = world.getResource('GameState').memoryGame;
      if (state.state !== 'waiting') return;

      state.playerSeq.push(idx);
      const cur = state.playerSeq.length - 1;

      if (state.sequence[cur] !== idx) {
        state.sequence = [];
        state.round = 1;
        document.getElementById('mem-status').textContent = 'WRONG! RESETTING...';
        document.getElementById('mem-status').style.color = '#ef4444';
        setTimeout(() => this.startMemoryRound(world), 1000);
        return;
      }

      if (state.playerSeq.length === state.sequence.length) {
        world.getResource('GameState').score += 50;
        state.round++;
        document.getElementById('mem-status').textContent = 'PERFECT!';
        setTimeout(() => this.startMemoryRound(world), 800);
      }
      this.updateUI(world);
    },

    nextLevel(world) {
      const state = world.getResource('GameState');
      state.level++;
      this.setupSymbolHunt(world);
    },

    update(dt) {
      const world = this.instance.world;
      const state = world.getResource('GameState');
      if (state.gameOver) return;

      state.symbolMatch.timer -= dt / 60;
      if (state.symbolMatch.timer <= 0) {
        this.setupSymbolHunt(world);
        state.symbolMatch.timer = 55;
      }
      this.updateUI(world);
    },

    updateUI(world) {
      const state = world.getResource('GameState');
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.level) this.dom.level.textContent = state.level;
      if (this.dom.smTimer) this.dom.smTimer.textContent = Math.ceil(state.symbolMatch.timer);
      if (this.dom.smFound) this.dom.smFound.textContent = state.symbolMatch.foundCount;
      if (this.dom.smTotal) this.dom.smTotal.textContent = state.symbolMatch.totalTargets;
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.WhaleWatch = WhaleWatch;
  window.WhaleWatch = WhaleWatch;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('whalewatch', WhaleWatch);
})();
