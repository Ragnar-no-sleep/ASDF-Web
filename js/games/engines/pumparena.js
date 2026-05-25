/**
 * ASDF Games - Pump Arena Engine (11/10 ECS Edition)
 *
 * Builder strategy game: Support builders, make decisions, build reputation.
 * Features: 4 project categories, dynamic scenarios, and partnership system.
 */

'use strict';

(function () {
  const PumpArena = {
    version: '2.2.0',
    gameId: 'pumparena',
    instance: null,

    projectTypes: {
      defi: {
        name: 'DeFi Builders',
        icon: '🏦',
        color: '#3b82f6',
        desc: 'Build the future of finance',
      },
      gaming: {
        name: 'GameFi Creators',
        icon: '🎮',
        color: '#a855f7',
        desc: 'Create immersive experiences',
      },
      community: {
        name: 'ASDF Army',
        icon: '🤝',
        color: '#22c55e',
        desc: 'Grow the ecosystem together',
      },
      infra: {
        name: 'Technical Layer',
        icon: '🏗️',
        color: '#fbbf24',
        desc: 'Build the foundation',
      },
    },

    scenarios: {
      defi: [
        {
          title: 'Security Audit',
          narrative: 'A bug is found in the vault.',
          choices: [
            { text: 'Disclose', gain: 20 },
            { text: 'Silent Fix', gain: 10 },
          ],
        },
        {
          title: 'Liquidity Crisis',
          narrative: 'TVL is dropping fast.',
          choices: [
            { text: 'Yield Farm', gain: 15 },
            { text: 'Burn Supply', gain: 25 },
          ],
        },
      ],
      gaming: [
        {
          title: 'Alpha Test',
          narrative: 'Players report lag.',
          choices: [
            { text: 'Optimize', gain: 20 },
            { text: 'New Skin', gain: 5 },
          ],
        },
        {
          title: 'Loot Box Drop',
          narrative: 'Community wants rarity.',
          choices: [
            { text: 'Transparent odds', gain: 25 },
            { text: 'Hidden pools', gain: 10 },
          ],
        },
      ],
    },

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);

      this.instance = new ASDF.GameInstance(document.createElement('canvas'), {
        maxEntities: 100,
        debug: false,
      });

      const world = this.instance.world;
      world.setResource('GameState', {
        score: 0,
        influence: 100,
        reputation: 0,
        round: 1,
        phase: 'select',
        selectedType: null,
        gameOver: false,
      });

      this.dom = {
        main: document.getElementById('pa-main-view'),
        influence: document.getElementById('pa-influence'),
        reputation: document.getElementById('pa-reputation'),
        round: document.getElementById('pa-round'),
      };

      this.renderSelect(world);

      this.instance.onRender = () => {};
      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="pa-layout" style="display:flex; height:100%; background:#0a0a0f; color:#fff; font-family:Orbitron, sans-serif;">
          <div class="pa-sidebar" style="width:200px; padding:20px; border-right:1px solid #333; background:rgba(0,0,0,0.5);">
            <div style="margin-bottom:20px;"><span style="color:#666; font-size:10px;">INFLUENCE</span><div id="pa-influence" style="color:#fbbf24; font-size:24px;">100</div></div>
            <div style="margin-bottom:20px;"><span style="color:#666; font-size:10px;">REPUTATION</span><div id="pa-reputation" style="color:#22c55e; font-size:24px;">0</div></div>
            <div style="margin-bottom:20px;"><span style="color:#666; font-size:10px;">ROUND</span><div id="pa-round" style="color:#a855f7; font-size:24px;">1/10</div></div>
          </div>
          <div id="pa-main-view" style="flex:1; padding:30px; overflow-y:auto; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          </div>
        </div>
      `;
    },

    renderSelect(world) {
      const view = this.dom.main;
      view.innerHTML = `
        <h2 style="margin-bottom:30px;">Select Project Category</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; width:100%; max-width:600px;">
          ${Object.entries(this.projectTypes)
            .map(
              ([id, t]) => `
            <button class="pa-btn" onclick="ASDF.PumpArena.selectCategory('${id}')" style="background:rgba(255,255,255,0.05); border:1px solid ${t.color}; padding:20px; border-radius:12px; cursor:pointer; color:#fff; transition:all 0.2s;">
              <div style="font-size:32px; margin-bottom:10px;">${t.icon}</div>
              <div style="font-weight:bold;">${t.name}</div>
              <div style="font-size:10px; color:#aaa; margin-top:5px;">${t.desc}</div>
            </button>
          `
            )
            .join('')}
        </div>
      `;
    },

    selectCategory(id) {
      const state = this.instance.world.getResource('GameState');
      state.selectedType = id;
      state.phase = 'scenario';
      this.renderScenario();
    },

    renderScenario() {
      const state = this.instance.world.getResource('GameState');
      const typeScenarios = this.scenarios[state.selectedType] || this.scenarios.defi;
      const scenario = typeScenarios[state.round % typeScenarios.length];
      const type = this.projectTypes[state.selectedType];

      this.dom.main.innerHTML = `
            <div style="max-width:500px; text-align:center;">
                <div style="color:${type.color}; font-size:12px; margin-bottom:10px;">${type.name}</div>
                <h3 style="margin-bottom:20px;">${scenario.title}</h3>
                <p style="color:#ccc; line-height:1.6; margin-bottom:30px;">${scenario.narrative}</p>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    ${scenario.choices
                      .map(
                        (c, idx) => `
                        <button onclick="ASDF.PumpArena.makeChoice(${idx})" style="background:rgba(255,255,255,0.05); border:1px solid #333; padding:15px; border-radius:8px; cursor:pointer; color:#fff; text-align:left;">
                            ${c.text}
                        </button>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `;
    },

    makeChoice(idx) {
      const state = this.instance.world.getResource('GameState');
      const typeScenarios = this.scenarios[state.selectedType] || this.scenarios.defi;
      const choice = typeScenarios[state.round % typeScenarios.length].choices[idx];

      state.reputation += choice.gain;
      state.influence -= 10;
      state.round++;

      if (state.round > 10 || state.influence <= 0) {
        this.gameOver(state);
      } else {
        this.updateUI(state);
        this.renderScenario();
      }
    },

    updateUI(state) {
      this.dom.influence.textContent = state.influence;
      this.dom.reputation.textContent = state.reputation;
      this.dom.round.textContent = `${state.round}/10`;
    },

    gameOver(state) {
      this.dom.main.innerHTML = `
            <h2 style="color:#22c55e;">MISSION COMPLETE</h2>
            <div style="font-size:48px; margin:20px 0;">🏆</div>
            <div style="font-size:24px;">FINAL REPUTATION: ${state.reputation}</div>
            <button onclick="location.reload()" style="margin-top:30px; padding:12px 30px; background:#fbbf24; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">PLAY AGAIN</button>
        `;
      if (typeof endGame === 'function') endGame(this.gameId, state.reputation);
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.PumpArena = PumpArena;
  window.PumpArena = PumpArena;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('pumparena', PumpArena);
})();
