/**
 * ASDF Games - Pump Arena Engine
 *
 * Builder strategy game: select a project lane, make high-pressure launch
 * decisions, and grow reputation before influence runs out.
 */

'use strict';
/* global activeGames, endGame, GameRegistry */

(function () {
  const MAX_ROUNDS = 10;
  const CHOICE_COST = 10;

  const PumpArena = {
    version: '3.0.0',
    gameId: 'pumparena',
    instance: null,
    dom: null,
    _mainClickHandler: null,

    projectTypes: {
      defi: {
        name: 'ASDF Drop',
        badge: 'A',
        color: '#ffcc00',
        desc: 'Simple launch moves with clear timing.',
      },
      gaming: {
        name: 'Mini Game',
        badge: 'S',
        color: '#ff6b35',
        desc: 'Make the game room feel alive.',
      },
      community: {
        name: 'ASDF Crew',
        badge: 'D',
        color: '#ff2d95',
        desc: 'Keep the crowd active and focused.',
      },
      infra: {
        name: 'Launch Booth',
        badge: 'F',
        color: '#fff2b3',
        desc: 'Polish the booth before the rush.',
      },
    },

    scenarios: {
      defi: [
        {
          title: 'Countdown Rush',
          narrative: 'The ASDF sun is up and the drop starts soon.',
          choices: [
            { text: 'Add a clear countdown', gain: 24, cost: 12 },
            { text: 'Delay a little and make the screen cleaner', gain: 31, cost: 18 },
          ],
        },
        {
          title: 'Crowded Feed',
          narrative: 'Too many posts are flying around the menu.',
          choices: [
            { text: 'Pin the main ASDF card', gain: 19, cost: 10 },
            { text: 'Show one strong visual and one short line', gain: 28, cost: 14 },
          ],
        },
        {
          title: 'Prize Table',
          narrative: 'Players want a reason to come back after one run.',
          choices: [
            { text: 'Add a simple daily score target', gain: 26, cost: 12 },
            { text: 'Make the reward text shorter', gain: 18, cost: 8 },
          ],
        },
      ],
      gaming: [
        {
          title: 'First Playtest',
          narrative: 'The loop works, but the first click feels slow.',
          choices: [
            { text: 'Speed up the input feel', gain: 30, cost: 14 },
            { text: 'Keep the loop short and easy', gain: 18, cost: 9 },
          ],
        },
        {
          title: 'Bonus Round',
          narrative: 'The room needs a simple surprise between levels.',
          choices: [
            { text: 'Add a golden ASDF token', gain: 27, cost: 11 },
            { text: 'Add a quick color burst', gain: 21, cost: 8 },
          ],
        },
        {
          title: 'Busy Lobby',
          narrative: 'More players join and the screen starts to feel packed.',
          choices: [
            { text: 'Reduce extra decoration', gain: 25, cost: 13 },
            { text: 'Make enemies easier to read', gain: 22, cost: 10 },
          ],
        },
      ],
      community: [
        {
          title: 'Chat Burst',
          narrative: 'The ASDF crew is active and needs one clear call.',
          choices: [
            { text: 'Start a short play challenge', gain: 29, cost: 12 },
            { text: 'Post the best score target', gain: 22, cost: 8 },
          ],
        },
        {
          title: 'Winner Moment',
          narrative: 'A player hits a clean run and the room reacts.',
          choices: [
            { text: 'Show a simple win banner', gain: 27, cost: 11 },
            { text: 'Keep the score card compact', gain: 20, cost: 8 },
          ],
        },
        {
          title: 'Theme Vote',
          narrative: 'Players ask for the next ASDF game look.',
          choices: [
            { text: 'Pick sunset colors', gain: 26, cost: 10 },
            { text: 'Let the crew choose the next icon set', gain: 30, cost: 15 },
          ],
        },
      ],
      infra: [
        {
          title: 'Booth Setup',
          narrative: 'The launch booth needs to be readable on mobile.',
          choices: [
            { text: 'Make buttons larger', gain: 28, cost: 13 },
            { text: 'Reduce long labels', gain: 23, cost: 9 },
          ],
        },
        {
          title: 'Clean Menu',
          narrative: 'The booth has too many small panels.',
          choices: [
            { text: 'Group the cards into two clear columns', gain: 29, cost: 12 },
            { text: 'Keep one main action per panel', gain: 24, cost: 10 },
          ],
        },
        {
          title: 'Final Polish',
          narrative: 'The game works, now it needs one last ASDF pass.',
          choices: [
            { text: 'Unify the colors', gain: 31, cost: 14 },
            { text: 'Remove noisy effects', gain: 25, cost: 11 },
          ],
        },
      ],
    },

    start(gameId) {
      this.stop();

      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);

      this.instance = new ASDF.GameInstance(document.createElement('canvas'), {
        maxEntities: 64,
        debug: false,
      });

      this.resetState();
      this.cacheDom();
      this.setupMainActions();
      this.renderSelect();

      this.instance.onRender = () => {};
      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    resetState() {
      this.instance.world.setResource('GameState', {
        score: 0,
        influence: 100,
        reputation: 0,
        round: 1,
        phase: 'select',
        selectedType: null,
        lastChoice: null,
        gameOver: false,
      });
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="pa-layout">
          <aside class="pa-sidebar">
            <div class="pa-brand">
              <span class="pa-brand-mark">ASDF</span>
              <strong>Pump Arena</strong>
            </div>
            <div class="pa-meter">
              <span>Influence</span>
              <strong id="pa-influence">100</strong>
            </div>
            <div class="pa-meter">
              <span>Reputation</span>
              <strong id="pa-reputation">0</strong>
            </div>
            <div class="pa-meter">
              <span>Round</span>
              <strong id="pa-round">1/${MAX_ROUNDS}</strong>
            </div>
          </aside>
          <main id="pa-main-view" class="pa-main-view"></main>
        </div>
      `;
    },

    cacheDom() {
      this.dom = {
        main: document.getElementById('pa-main-view'),
        influence: document.getElementById('pa-influence'),
        reputation: document.getElementById('pa-reputation'),
        round: document.getElementById('pa-round'),
      };
    },

    setupMainActions() {
      if (!this.dom?.main) return;
      this._mainClickHandler = event => {
        const category = event.target.closest('[data-pa-category]');
        if (category) {
          this.selectCategory(category.dataset.paCategory);
          return;
        }

        const choice = event.target.closest('[data-pa-choice]');
        if (choice) {
          this.makeChoice(Number(choice.dataset.paChoice));
          return;
        }

        if (event.target.closest('[data-pa-restart]')) {
          this.restart();
        }
      };
      this.dom.main.addEventListener('click', this._mainClickHandler);
    },

    renderSelect() {
      const cards = Object.entries(this.projectTypes)
        .map(
          ([id, type]) => `
            <button class="pa-card pa-card--${id}" data-pa-category="${id}">
              <span class="pa-card-icon">${type.badge}</span>
              <span class="pa-card-title">${type.name}</span>
              <span class="pa-card-desc">${type.desc}</span>
            </button>
          `
        )
        .join('');

      this.dom.main.innerHTML = `
        <section class="pa-panel">
          <span class="pa-eyebrow">Launch desk</span>
          <h2 class="pa-title">Choose a builder lane</h2>
          <div class="pa-category-grid">${cards}</div>
        </section>
      `;
    },

    selectCategory(id) {
      const state = this.getState();
      state.selectedType = id;
      state.phase = 'scenario';
      this.renderScenario();
    },

    renderScenario() {
      const state = this.getState();
      const typeId = state.selectedType || 'defi';
      const type = this.projectTypes[state.selectedType] || this.projectTypes.defi;
      const scenario = this.getScenario(state);

      const choices = scenario.choices
        .map(
          (choice, idx) => `
            <button class="pa-choice" data-pa-choice="${idx}">
              <span class="pa-choice-primary">${choice.text}</span>
              <span>+${choice.gain} rep / -${choice.cost} influence</span>
            </button>
          `
        )
        .join('');

      this.dom.main.innerHTML = `
        <section class="pa-panel pa-scenario pa-scenario--${typeId}">
          <span class="pa-eyebrow">${type.name}</span>
          <h2 class="pa-title">${scenario.title}</h2>
          <p class="pa-copy">${scenario.narrative}</p>
          <div class="pa-choice-list">${choices}</div>
        </section>
      `;
    },

    makeChoice(idx) {
      const state = this.getState();
      if (state.gameOver) return;

      const scenario = this.getScenario(state);
      const choice = scenario.choices[idx];
      if (!choice) return;

      state.reputation += choice.gain;
      state.score = state.reputation;
      state.influence = Math.max(0, state.influence - (choice.cost || CHOICE_COST));
      state.round += 1;
      state.lastChoice = choice.text;

      this.updateUI(state);

      if (state.round > MAX_ROUNDS || state.influence <= 0) {
        this.gameOver(state);
        return;
      }

      this.renderScenario();
    },

    getScenario(state) {
      const scenarioList = this.scenarios[state.selectedType] || this.scenarios.defi;
      return scenarioList[(state.round - 1) % scenarioList.length];
    },

    getState() {
      return this.instance.world.getResource('GameState');
    },

    updateUI(state) {
      this.dom.influence.textContent = state.influence;
      this.dom.reputation.textContent = state.reputation;
      this.dom.round.textContent = `${Math.min(state.round, MAX_ROUNDS)}/${MAX_ROUNDS}`;
    },

    gameOver(state) {
      state.gameOver = true;
      const rating =
        state.reputation >= 260
          ? 'Legendary launch'
          : state.reputation >= 210
            ? 'Strong ecosystem'
            : 'Needs another sprint';

      this.dom.main.innerHTML = `
        <section class="pa-panel pa-final">
          <span class="pa-eyebrow">Mission complete</span>
          <h2 class="pa-title">${rating}</h2>
          <div class="pa-final-score">${state.reputation}</div>
          <p class="pa-copy">Final reputation with ${state.influence} influence remaining.</p>
          <button class="pa-restart" data-pa-restart>Play again</button>
        </section>
      `;

      if (typeof endGame === 'function') endGame(this.gameId, state.reputation);
    },

    restart() {
      if (!this.instance) return;
      this.resetState();
      this.updateUI(this.getState());
      this.renderSelect();
    },

    stop() {
      if (this.dom?.main && this._mainClickHandler) {
        this.dom.main.removeEventListener('click', this._mainClickHandler);
      }
      this._mainClickHandler = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
      this.dom = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.PumpArena = PumpArena;
  window.PumpArena = PumpArena;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('pumparena', PumpArena);
})();
