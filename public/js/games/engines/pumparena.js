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

    projectTypes: {
      defi: {
        name: 'DeFi Builders',
        badge: 'DF',
        color: '#38bdf8',
        desc: 'Liquidity, audits, and market trust.',
      },
      gaming: {
        name: 'GameFi Creators',
        badge: 'GF',
        color: '#f472b6',
        desc: 'Fast loops, fair rewards, player retention.',
      },
      community: {
        name: 'ASDF Army',
        badge: 'CA',
        color: '#22c55e',
        desc: 'Momentum, governance, and public signal.',
      },
      infra: {
        name: 'Technical Layer',
        badge: 'TL',
        color: '#fbbf24',
        desc: 'Reliability, scale, and clean integrations.',
      },
    },

    scenarios: {
      defi: [
        {
          title: 'Security Audit',
          narrative: 'A vault bug is found two hours before the public campaign.',
          choices: [
            { text: 'Publish the finding and fund a fast patch', gain: 24, cost: 12 },
            { text: 'Pause deposits and run a full external audit', gain: 31, cost: 18 },
          ],
        },
        {
          title: 'Liquidity Crisis',
          narrative: 'TVL is dropping while competitors start a noisy incentive war.',
          choices: [
            { text: 'Launch a capped yield sprint', gain: 19, cost: 10 },
            { text: 'Secure partner liquidity with transparent terms', gain: 28, cost: 14 },
          ],
        },
        {
          title: 'Treasury Vote',
          narrative: 'The DAO asks how aggressively to spend the next growth tranche.',
          choices: [
            { text: 'Back builders with milestone grants', gain: 26, cost: 12 },
            { text: 'Buy back supply after a public report', gain: 18, cost: 8 },
          ],
        },
      ],
      gaming: [
        {
          title: 'Alpha Test',
          narrative: 'The first players love the loop but report input lag in combat.',
          choices: [
            { text: 'Ship a performance patch before new content', gain: 30, cost: 14 },
            { text: 'Add ranked rewards and keep collecting telemetry', gain: 18, cost: 9 },
          ],
        },
        {
          title: 'Loot Economy',
          narrative: 'Creators want rare drops, but players are watching fairness closely.',
          choices: [
            { text: 'Publish transparent odds and crafting paths', gain: 27, cost: 11 },
            { text: 'Run a limited cosmetic-only event', gain: 21, cost: 8 },
          ],
        },
        {
          title: 'Server Spike',
          narrative: 'A tournament doubles traffic and matchmaking queues start slipping.',
          choices: [
            { text: 'Scale servers and delay the finals thirty minutes', gain: 25, cost: 13 },
            { text: 'Move top matches to dedicated lobbies', gain: 22, cost: 10 },
          ],
        },
      ],
      community: [
        {
          title: 'Signal Storm',
          narrative: 'A rumor is spreading faster than the official announcement.',
          choices: [
            { text: 'Open a live community room with receipts', gain: 29, cost: 12 },
            { text: 'Drop a concise thread and answer top holders', gain: 22, cost: 8 },
          ],
        },
        {
          title: 'Builder Showcase',
          narrative: 'Three small teams need attention, but the main feed is crowded.',
          choices: [
            { text: 'Host a curated demo night', gain: 27, cost: 11 },
            { text: 'Boost one launch per day with metrics', gain: 20, cost: 8 },
          ],
        },
        {
          title: 'Governance Heat',
          narrative: 'The vote is close and both sides are pushing hard in public.',
          choices: [
            { text: 'Publish neutral impact analysis', gain: 26, cost: 10 },
            { text: 'Invite delegates to a moderated debate', gain: 30, cost: 15 },
          ],
        },
      ],
      infra: [
        {
          title: 'RPC Bottleneck',
          narrative: 'A partner integration is timing out during peak wallet activity.',
          choices: [
            { text: 'Add regional fallback routing', gain: 28, cost: 13 },
            { text: 'Prioritize critical endpoints and cache reads', gain: 23, cost: 9 },
          ],
        },
        {
          title: 'SDK Release',
          narrative: 'The new SDK is powerful, but documentation is still thin.',
          choices: [
            { text: 'Ship with examples and starter templates', gain: 29, cost: 12 },
            { text: 'Run a closed beta with three teams', gain: 24, cost: 10 },
          ],
        },
        {
          title: 'Incident Review',
          narrative: 'A degraded service window ended, and builders want a timeline.',
          choices: [
            { text: 'Publish a full postmortem and fixes', gain: 31, cost: 14 },
            { text: 'Credit affected partners and add status alerts', gain: 25, cost: 11 },
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

    renderSelect() {
      const cards = Object.entries(this.projectTypes)
        .map(
          ([id, type]) => `
            <button class="pa-card" style="--pa-accent:${type.color}" onclick="ASDF.PumpArena.selectCategory('${id}')">
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
      const type = this.projectTypes[state.selectedType] || this.projectTypes.defi;
      const scenario = this.getScenario(state);

      const choices = scenario.choices
        .map(
          (choice, idx) => `
            <button class="pa-choice" onclick="ASDF.PumpArena.makeChoice(${idx})">
              <span class="pa-choice-primary">${choice.text}</span>
              <span>+${choice.gain} rep / -${choice.cost} influence</span>
            </button>
          `
        )
        .join('');

      this.dom.main.innerHTML = `
        <section class="pa-panel pa-scenario" style="--pa-accent:${type.color}">
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
          <button class="pa-restart" onclick="ASDF.PumpArena.restart()">Play again</button>
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
