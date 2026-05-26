/**
 * ASDF Games - BurnOrHold Engine (11/10 ECS Edition)
 *
 * Real-time chaos strategy game. Capture nodes by sending validators.
 * Migrated to ECS for peak zero-allocation performance and modularity.
 */

'use strict';

(function () {
  const BurnOrHold = {
    version: '2.1.0',
    gameId: 'burnorhold',
    instance: null,

    OWNER: { NEUTRAL: 0, PLAYER: 1, ENEMY: 2 },
    CHAIN_NAMES: ['ETH', 'SOL', 'AVAX', 'MATIC', 'BNB', 'ARB', 'OP', 'BASE', 'FTM', 'ATOM'],

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('cc-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      // 11/10: Resize early for correct node distribution
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Node', { owner: 'u8', validators: 'u16', max: 'u16', type: 'u8' });
      world.registerComponent('Attack', { from: 'u32', to: 'u32', count: 'u16', owner: 'u8' });
      world.registerComponent('VisualEffect', { type: 'u8' });

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        gameOver: false,
        nodes: [],
        selectedNodeId: -1,
        regenTimer: 0,
        aiTimer: 0,
        frameCount: 0,
      });

      this.dom = {
        score: document.getElementById('cc-score'),
        wave: document.getElementById('cc-wave'),
        playerNodes: document.getElementById('cc-player-nodes'),
        enemyNodes: document.getElementById('cc-enemy-nodes'),
      };

      this.setupInput();
      this.preloadSprites();
      this.generateNodes(world);

      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Override Render
      const icons = ['🌐', '⚔️'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="boh-container" style="width:100%; height:100%; position:relative; background:#0a0a1a;">
          <canvas id="cc-canvas" style="width:100%; height:100%; display:block;"></canvas>
          <div class="boh-hud-top" style="position:absolute; top:10px; left:10px; display:flex; gap:20px; color:#fff; font-family:monospace; background:rgba(0,0,0,0.5); padding:10px; border-radius:8px;">
            <div class="boh-stat">YOURS: <span id="cc-player-nodes" style="color:#22c55e;">0</span></div>
            <div class="boh-stat">ENEMY: <span id="cc-enemy-nodes" style="color:#ef4444;">0</span></div>
            <div class="boh-stat">SCORE: <span id="cc-score">0</span></div>
            <div class="boh-stat">WAVE: <span id="cc-wave">1</span></div>
          </div>
          <div class="boh-instructions" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); color:#666; font-size:10px;">Click your node -> Click target to attack!</div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🌐', size: 40 },
        { emoji: '⚔️', size: 16 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    generateNodes(world) {
      const state = world.getResource('GameState');
      const cw = this.instance.canvas.width,
        ch = this.instance.canvas.height;
      const count = 10;

      for (let i = 0; i < count; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Position');
        world.addComponent(e, 'Node');
        world.addComponent(e, 'Renderable');

        const idx = world.getIndex(e);
        const pos = world.componentRegistry.get('Position').props;
        const node = world.componentRegistry.get('Node').props;
        const rend = world.componentRegistry.get('Renderable').props;

        // Better distribution margin
        pos.x[idx] = 60 + Math.random() * (cw - 120);
        pos.y[idx] = 100 + Math.random() * (ch - 200);
        node.owner[idx] = i === 0 ? 1 : i === 1 ? 2 : 0;
        node.validators[idx] = 10;
        rend.size[idx] = 40;
      }
    },

    setupInput() {
      const world = this.instance.world;
      this.instance.canvas.addEventListener('pointerdown', e => {
        const rect = this.instance.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (this.instance.canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (this.instance.canvas.height / rect.height);

        const state = world.getResource('GameState');
        const nodes = world.createQuery(['Position', 'Node']);
        const { dense, count } = nodes.set;
        const pos = world.componentRegistry.get('Position').props;
        const nodeProps = world.componentRegistry.get('Node').props;

        for (let i = 0; i < count; i++) {
          const idx = dense[i];
          if (Math.hypot(pos.x[idx] - mx, pos.y[idx] - my) < 40) {
            const id = world.getEntityId(idx);
            if (nodeProps.owner[idx] === 1) {
              state.selectedNodeId = id;
            } else if (state.selectedNodeId !== -1) {
              this.launchAttack(world, state.selectedNodeId, id);
              state.selectedNodeId = -1;
            }
            break;
          }
        }
      });
    },

    launchAttack(world, fromId, toId) {
      if (fromId === toId) return;
      const fromIdx = world.getIndex(fromId);
      const nodeProps = world.componentRegistry.get('Node').props;
      const count = Math.floor(nodeProps.validators[fromIdx] / 2);
      if (count <= 0) return;
      nodeProps.validators[fromIdx] -= count;

      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Attack');
      world.addComponent(e, 'Renderable');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const att = world.componentRegistry.get('Attack').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const targetIdx = world.getIndex(toId);

      pos.x[idx] = world.componentRegistry.get('Position').props.x[fromIdx];
      pos.y[idx] = world.componentRegistry.get('Position').props.y[fromIdx];

      const angle = Math.atan2(
        world.componentRegistry.get('Position').props.y[targetIdx] - pos.y[idx],
        world.componentRegistry.get('Position').props.x[targetIdx] - pos.x[idx]
      );

      vel.vx[idx] = Math.cos(angle) * 5;
      vel.vy[idx] = Math.sin(angle) * 5;
      att.from[idx] = fromId;
      att.to[idx] = toId;
      att.count[idx] = count;
      att.owner[idx] = nodeProps.owner[fromIdx];
      rend.iconIndex[idx] = 1; // ⚔️
      rend.size[idx] = 16;
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        state.regenTimer += dt;
        if (state.regenTimer > 60) {
          const nodes = world.createQuery(['Node']);
          const { dense, count } = nodes.set;
          const nodeProps = world.componentRegistry.get('Node').props;
          for (let i = 0; i < count; i++) {
            const idx = dense[i];
            if (nodeProps.owner[idx] !== 0) nodeProps.validators[idx]++;
          }
          state.regenTimer = 0;
        }

        // AI
        state.aiTimer += dt;
        if (state.aiTimer > 180) {
          const nodes = world.createQuery(['Node']);
          const { dense, count } = nodes.set;
          const nodeProps = world.componentRegistry.get('Node').props;
          const enemyNodes = [],
            targetNodes = [];
          for (let i = 0; i < count; i++) {
            const idx = dense[i];
            const id = world.getEntityId(idx);
            if (nodeProps.owner[idx] === 2) enemyNodes.push(id);
            else targetNodes.push(id);
          }
          if (enemyNodes.length > 0 && targetNodes.length > 0) {
            const from = enemyNodes[Math.floor(Math.random() * enemyNodes.length)];
            const to = targetNodes[Math.floor(Math.random() * targetNodes.length)];
            self.launchAttack(world, from, to);
          }
          state.aiTimer = 0;
        }

        // Attacks
        const attacks = world.createQuery(['Attack', 'Position']);
        const { dense, count } = attacks.set;
        const pos = world.componentRegistry.get('Position').props;
        const att = world.componentRegistry.get('Attack').props;
        const nodePos = world.componentRegistry.get('Position').props;
        const nodeProps = world.componentRegistry.get('Node').props;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          const targetId = att.to[idx];
          if (!world.componentRegistry.get('Position').props) continue; // safety

          const targetIdx = world.getIndex(targetId);
          if (
            Math.hypot(pos.x[idx] - nodePos.x[targetIdx], pos.y[idx] - nodePos.y[targetIdx]) < 10
          ) {
            if (nodeProps.owner[targetIdx] === att.owner[idx]) {
              nodeProps.validators[targetIdx] += att.count[idx];
            } else {
              nodeProps.validators[targetIdx] -= att.count[idx];
              if (nodeProps.validators[targetIdx] < 0) {
                nodeProps.validators[targetIdx] = Math.abs(nodeProps.validators[targetIdx]);
                nodeProps.owner[targetIdx] = att.owner[idx];
              }
            }
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(world, state);
      };
    },

    updateUI(world, state) {
      const nodes = world.createQuery(['Node']);
      const { dense, count } = nodes.set;
      const nodeProps = world.componentRegistry.get('Node').props;
      let pCount = 0,
        eCount = 0;
      for (let i = 0; i < count; i++) {
        if (nodeProps.owner[dense[i]] === 1) pCount++;
        else if (nodeProps.owner[dense[i]] === 2) eCount++;
      }
      if (this.dom.playerNodes) this.dom.playerNodes.textContent = pCount;
      if (this.dom.enemyNodes) this.dom.enemyNodes.textContent = eCount;
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.wave) this.dom.wave.textContent = state.wave;
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const world = this.instance.world;
      const state = world.getResource('GameState');

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      const nodes = world.createQuery(['Node', 'Position']);
      const { dense, count } = nodes.set;
      const pos = world.componentRegistry.get('Position').props;

      // Lines
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          ctx.moveTo(pos.x[dense[i]], pos.y[dense[i]]);
          ctx.lineTo(pos.x[dense[j]], pos.y[dense[j]]);
        }
      }
      ctx.stroke();

      const nodeProps = world.componentRegistry.get('Node').props;
      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const owner = nodeProps.owner[idx];
        const color = owner === 1 ? '#22c55e' : owner === 2 ? '#ef4444' : '#333';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x[idx], pos.y[idx], 25, 0, Math.PI * 2);
        ctx.fill();

        if (world.getEntityId(idx) === state.selectedNodeId) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(nodeProps.validators[idx], pos.x[idx], pos.y[idx] + 5);
      }

      // Attacks
      const attacks = world.createQuery(['Attack', 'Position']);
      const aDense = attacks.set.dense;
      for (let i = 0; i < attacks.set.count; i++) {
        const idx = aDense[i];
        SpriteCache.draw(ctx, '⚔️', pos.x[idx], pos.y[idx], 16);
      }
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.BurnOrHold = BurnOrHold;
  window.BurnOrHold = BurnOrHold;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('burnorhold', BurnOrHold);
})();
