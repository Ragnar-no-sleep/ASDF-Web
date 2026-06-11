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
    _cleanupInput: null,
    _nodeQuery: null,
    _nodePositionQuery: null,
    _attackQuery: null,

    OWNER: { NEUTRAL: 0, PLAYER: 1, ENEMY: 2 },
    CHAIN_NAMES: ['ASDF', 'A', 'S', 'D', 'F', 'SUN', 'RUN', 'STACK', 'BOOST', 'GO'],

    start(gameId) {
      this.stop();

      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('cc-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: false,
      });

      // 11/10: Resize early for correct node distribution
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

      // Components
      world.registerComponent('Node', { owner: 'u8', validators: 'u16', max: 'u16', type: 'u8' });
      world.registerComponent('Attack', { from: 'u32', to: 'u32', count: 'u16', owner: 'u8' });
      world.registerComponent('VisualEffect', { type: 'u8' });

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      this._nodeQuery = world.createQuery(['Node']);
      this._nodePositionQuery = world.createQuery(['Node', 'Position']);
      this._attackQuery = world.createQuery(['Attack', 'Position']);

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

      this.instance.onUpdate = (dt, dtMs) => {
        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }
        return shouldFreeze;
      };

      this.instance.onRender = alpha => {
        if (this.juice) this.juice.renderPre();
        this.draw(alpha);
        if (this.juice) this.juice.renderPost();
      };

      world.addSystem(ASDF.PersonalitySystem.create());
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Override Render
      // const icons = ['🌐', '⚔️'];
      // const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      // this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="boh-container">
          <canvas id="cc-canvas" class="boh-canvas"></canvas>
          <div class="boh-hud-top">
            <div class="boh-hud-group">
              <div class="boh-stat boh-stat--player">
                YOURS
                <span id="cc-player-nodes" class="boh-stat-value boh-stat-value--player">0</span>
              </div>
              <div class="boh-stat boh-stat--enemy">
                ENEMY
                <span id="cc-enemy-nodes" class="boh-stat-value boh-stat-value--enemy">0</span>
              </div>
              <div class="boh-stat boh-stat--score">
                SCORE
                <span id="cc-score" class="boh-stat-value boh-stat-value--score">0</span>
              </div>
              <div class="boh-stat boh-stat--wave">
                WAVE
                <span id="cc-wave" class="boh-stat-value boh-stat-value--wave">1</span>
              </div>
            </div>
            <div class="boh-instructions-text">Tap ASDF node, tap target</div>
          </div>
          <div class="boh-bottom-bar">
            <div class="boh-instructions">
              <span class="boh-instructions-text">Hold the ASDF circles</span>
            </div>
            <button class="boh-next-wave-btn game-hidden" id="boh-retry-wave-btn">
              RESTART WAVE
            </button>
          </div>
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
        world.addComponent(e, 'Rotation');
        world.addComponent(e, 'Scale');

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
      const canvas = this.instance.canvas;
      const onPointerDown = e => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);

        const state = world.getResource('GameState');
        const nodes = this._nodePositionQuery || world.createQuery(['Position', 'Node']);
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
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      this._cleanupInput = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
      };
    },

    launchAttack(world, fromId, toId) {
      if (fromId === toId) return;
      const activeAttacks = (this._attackQuery || world.createQuery(['Attack', 'Position'])).set
        .count;
      if (activeAttacks > 80) return;
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
          const nodes = self._nodeQuery || world.createQuery(['Node']);
          const { dense, count } = nodes.set;
          const nodeProps = world.componentRegistry.get('Node').props;
          for (let i = 0; i < count; i++) {
            const idx = dense[i];
            if (nodeProps.owner[idx] !== 0) {
              nodeProps.validators[idx] = Math.min(
                120 + state.wave * 8,
                nodeProps.validators[idx] + 1
              );
            }
          }
          state.regenTimer = 0;
        }

        // AI
        state.aiTimer += dt;
        const aiInterval = Math.max(70, 180 - state.wave * 12);
        if (state.aiTimer > aiInterval) {
          const nodes = self._nodeQuery || world.createQuery(['Node']);
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
        const attacks = self._attackQuery || world.createQuery(['Attack', 'Position']);
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

                if (self.juice) {
                  self.juice.impact(nodePos.x[targetIdx], nodePos.y[targetIdx], {
                    intensity: 'medium',
                  });
                  const color = att.owner[idx] === 1 ? '#ffcc00' : '#f43f5e';
                  self.juice.burst(nodePos.x[targetIdx], nodePos.y[targetIdx], {
                    color,
                    count: 12,
                  });
                }
              }
            }
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        state.frameCount += dt;
        state.wave = 1 + Math.floor(state.frameCount / 900);
        self.updateUI(world, state);
      };
    },

    updateUI(world, state) {
      const nodes = this._nodeQuery || world.createQuery(['Node']);
      const { dense, count } = nodes.set;
      const nodeProps = world.componentRegistry.get('Node').props;
      let pCount = 0,
        eCount = 0;
      for (let i = 0; i < count; i++) {
        if (nodeProps.owner[dense[i]] === 1) pCount++;
        else if (nodeProps.owner[dense[i]] === 2) eCount++;
      }
      state.score = pCount * 100 - eCount * 50 + state.wave * 25;
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
      if (this.instance) {
        this.drawConquestScene(ctx, w, h, world, state);
        return;
      }

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      const nodes = this._nodePositionQuery || world.createQuery(['Node', 'Position']);
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
      const attacks = this._attackQuery || world.createQuery(['Attack', 'Position']);
      const aDense = attacks.set.dense;
      for (let i = 0; i < attacks.set.count; i++) {
        const idx = aDense[i];
        SpriteCache.draw(ctx, '⚔️', pos.x[idx], pos.y[idx], 16);
      }
    },

    drawConquestScene(ctx, w, h, world, state) {
      this.drawNetworkBackdrop(ctx, w, h, state);

      const nodes = this._nodePositionQuery || world.createQuery(['Node', 'Position']);
      const { dense, count } = nodes.set;
      const pos = world.componentRegistry.get('Position').props;
      const nodeProps = world.componentRegistry.get('Node').props;

      this.drawNetworkLinks(ctx, dense, count, pos);
      this.drawAttackPackets(ctx, world);

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        this.drawNode(ctx, world, idx, pos.x[idx], pos.y[idx], nodeProps, state);
      }
    },

    drawNetworkBackdrop(ctx, w, h, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          seed: state.score || state.wave || 0,
        });
      } else {
        ctx.fillStyle = '#12071f';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(255,204,0,0.08)';
      ctx.fillRect(0, h * 0.84, w, 2);
    },

    drawNetworkLinks(ctx, dense, count, pos) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const ax = pos.x[dense[i]];
          const ay = pos.y[dense[i]];
          const bx = pos.x[dense[j]];
          const by = pos.y[dense[j]];
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist > 280) continue;
          ctx.strokeStyle = 'rgba(255, 204, 0, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    },

    drawNode(ctx, world, idx, x, y, nodeProps, state) {
      const owner = nodeProps.owner[idx];
      const validators = nodeProps.validators[idx];
      const color =
        owner === this.OWNER.PLAYER
          ? '#ffcc00'
          : owner === this.OWNER.ENEMY
            ? '#f43f5e'
            : '#ff6b35';
      const radius = 24 + Math.min(12, validators / 10);

      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,247,237,0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(validators, 0, 2);

      const label = this.CHAIN_NAMES[idx % this.CHAIN_NAMES.length];
      ctx.fillStyle = 'rgba(255, 247, 237, 0.68)';
      ctx.font = '10px Orbitron, sans-serif';
      ctx.fillText(owner === this.OWNER.PLAYER ? 'ASDF' : label, 0, radius + 16);

      if (world.getEntityId(idx) === state.selectedNodeId) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawAttackPackets(ctx, world) {
      const attacks = this._attackQuery || world.createQuery(['Attack', 'Position']);
      const { dense, count } = attacks.set;
      const pos = world.componentRegistry.get('Position').props;
      const att = world.componentRegistry.get('Attack').props;
      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const color = att.owner[idx] === this.OWNER.PLAYER ? '#ffcc00' : '#f43f5e';
        ctx.save();
        ctx.translate(pos.x[idx], pos.y[idx]);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 4 + Math.min(4, att.count[idx] / 16), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,247,237,0.36)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 8);
        ctx.stroke();
        ctx.restore();
      }
    },

    hexPath(ctx, x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    },

    stop() {
      if (this._cleanupInput) {
        this._cleanupInput();
        this._cleanupInput = null;
      }
      this._nodeQuery = null;
      this._nodePositionQuery = null;
      this._attackQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.BurnOrHold = BurnOrHold;
  window.BurnOrHold = BurnOrHold;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('burnorhold', BurnOrHold);
})();
