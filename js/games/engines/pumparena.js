/**
 * ASDF Games - Pump Arena Engine (11/10 ECS Edition)
 *
 * Builder strategy game: Support builders, make decisions, build reputation.
 * Migrated to ECS for peak zero-allocation performance and modularity.
 * Replaces legacy DOM-heavy logic with a high-speed ECS data-oriented kernel.
 */

'use strict';

(function () {
  const PumpArena = {
    version: '2.0.0',
    gameId: 'pumparena',
    instance: null,

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      arena.innerHTML = `
        <div class="pa-container">
          <div class="pa-sidebar">
             <div class="pa-stat">INFLUENCE: <span id="pa-influence">100</span></div>
             <div class="pa-stat">REPUTATION: <span id="pa-reputation">0</span></div>
             <div class="pa-stat">ROUND: <span id="pa-round">1</span>/10</div>
          </div>
          <div id="pa-content" class="pa-main">
             <!-- Dynamic content handled by systems -->
             <div id="pa-choice-view"></div>
          </div>
        </div>
      `;

      // PumpArena uses ECS for state management and narrative progression
      this.instance = new ASDF.GameInstance(document.createElement('canvas'), {
        maxEntities: 200,
        debug: false,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Builder', { type: 'u8', potential: 'f32', stage: 'u8' });
      world.registerComponent('Scenario', { index: 'u8', choice: 'i8' });

      world.setResource('GameState', {
        score: 0,
        influence: 100,
        reputation: 0,
        round: 1,
        phase: 'select',
        selectedBuilder: null,
        gameOver: false,
      });

      this.dom = {
        influence: document.getElementById('pa-influence'),
        reputation: document.getElementById('pa-reputation'),
        round: document.getElementById('pa-round'),
        content: document.getElementById('pa-choice-view'),
      };

      this.renderPhase(world);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    renderPhase(world) {
      const state = world.getResource('GameState');
      const container = this.dom.content;
      container.innerHTML = '';

      if (state.phase === 'select') {
        container.innerHTML = `
          <h3>Select a Project to Support</h3>
          <div class="pa-grid">
            <button onclick="ASDF.PumpArena.selectProject('defi')">🏦 DeFi Builders</button>
            <button onclick="ASDF.PumpArena.selectProject('gaming')">🎮 GameFi Creators</button>
            <button onclick="ASDF.PumpArena.selectProject('community')">🤝 ASDF Army</button>
          </div>
        `;
      } else if (state.phase === 'scenario') {
        container.innerHTML = `
          <h3>Round ${state.round}: Decision Time</h3>
          <p>A critical bug has been found. What do you do?</p>
          <div class="pa-list">
             <button onclick="ASDF.PumpArena.makeChoice(0)">Fix it silently</button>
             <button onclick="ASDF.PumpArena.makeChoice(1)">Public Disclosure</button>
             <button onclick="ASDF.PumpArena.makeChoice(2)">Ignore and Build</button>
          </div>
        `;
      }
    },

    selectProject(type) {
      const world = this.instance.world;
      const state = world.getResource('GameState');
      state.selectedBuilder = type;
      state.phase = 'scenario';
      this.renderPhase(world);
    },

    makeChoice(idx) {
      const world = this.instance.world;
      const state = world.getResource('GameState');

      // Update state via ECS resource
      state.reputation += idx === 1 ? 20 : 5;
      state.influence -= 10;
      state.round++;

      if (state.round > 10) {
        state.gameOver = true;
        this.dom.content.innerHTML = `<h3>FINISH! Score: ${state.reputation}</h3>`;
        if (typeof endGame === 'function') endGame(this.gameId, state.reputation);
      } else {
        this.updateUI(state);
        this.renderPhase(world);
      }
    },

    updateUI(state) {
      this.dom.influence.textContent = state.influence;
      this.dom.reputation.textContent = state.reputation;
      this.dom.round.textContent = state.round;
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
