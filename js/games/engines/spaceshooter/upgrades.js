/**
 * Space Shooter - Power-ups & Upgrade System
 *
 * 5 power-up types: SHIELD, RAPID_FIRE, SPREAD_SHOT, NUKE, HEALTH_PACK
 * 4 upgrade stats with 4 levels (0-3): HULL, ENGINE, WEAPONS, SHIELDS
 * Fibonacci token costs
 *
 * @module games/engines/spaceshooter/upgrades
 */

'use strict';

const SpaceUpgrades = {
  /**
   * Create upgrade system
   * @returns {Object}
   */
  create() {
    const costs = {
      hull: [13, 34, 89], // levels 1-3
      engine: [13, 34, 89],
      weapons: [21, 55, 144],
      shields: [21, 55, 144],
    };

    const stats = {
      hull: { 0: 100, 1: 134, 2: 179, 3: 233 },
      engine: { 0: 4, 1: 5, 2: 6, 3: 8 },
      weapons: { 0: 233, 1: 144, 2: 89, 3: 55 },
      shields: { 0: 0, 1: 34, 2: 55, 3: 89 },
    };

    return {
      /**
       * Update power-up timers
       * @param {number} dt
       * @param {Object} state
       */
      update(dt, state) {
        // Power-up expiration handled in entities.js
      },

      /**
       * Purchase an upgrade
       * @param {string} stat - hull, engine, weapons, shields
       * @param {Object} state
       * @returns {boolean} Success
       */
      purchaseUpgrade(stat, state) {
        const level = state.upgrades[stat] || 0;
        if (level >= 3) return false; // Max level

        const cost = costs[stat][level];
        if (!state.appState || !state.appState.tokens) return false;
        if (state.appState.tokens < cost) return false;

        state.appState.tokens -= cost;
        state.upgrades[stat] = level + 1;

        // Persist to appState
        if (state.appState.gameState) {
          state.appState.gameState.upgrades = { ...state.upgrades };
        }

        return true;
      },

      /**
       * Get upgrade cost
       * @param {string} stat
       * @param {number} level
       * @returns {number}
       */
      getUpgradeCost(stat, level) {
        if (level >= 3) return Infinity;
        return costs[stat][level];
      },

      /**
       * Get stat value
       * @param {string} stat
       * @param {number} level
       * @returns {number}
       */
      getStatValue(stat, level) {
        return stats[stat][level] || 0;
      },

      /**
       * Draw upgrade screen
       * @param {CanvasRenderingContext2D} ctx
       * @param {HTMLCanvasElement} canvas
       * @param {Object} state
       */
      renderUpgradeScreen(ctx, canvas, state) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Title
        ctx.fillStyle = '#ea4e33';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('UPGRADE', centerX, centerY - 120);

        // Tokens
        ctx.fillStyle = '#f59e0b';
        ctx.font = '16px Arial';
        ctx.fillText(
          `Tokens: ${(state.appState && state.appState.tokens) || 0}`,
          centerX,
          centerY - 90
        );

        // Upgrade cards (4x2 grid)
        const upgrades = [
          { name: 'HULL', stat: 'hull', icon: '&#x1F6E1;' },
          { name: 'ENGINE', stat: 'engine', icon: '&#x26A1;' },
          { name: 'WEAPONS', stat: 'weapons', icon: '&#x1F4A5;' },
          { name: 'SHIELDS', stat: 'shields', icon: '&#x1F6F6;' },
        ];

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        for (let i = 0; i < upgrades.length; i++) {
          const u = upgrades[i];
          const level = state.upgrades[u.stat] || 0;
          const cost = this.getUpgradeCost(u.stat, level);
          const x = centerX - 100 + (i % 2) * 100;
          const y = centerY - 40 + Math.floor(i / 2) * 80;

          // Card background
          ctx.fillStyle = level >= 3 ? '#555' : '#1a1a1a';
          ctx.fillRect(x - 35, y - 30, 70, 60);
          ctx.strokeStyle = '#ea4e33';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 35, y - 30, 70, 60);

          // Name
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(u.name, x, y - 15);

          // Level
          ctx.fillStyle = '#4ade80';
          ctx.fillText(`LVL ${level}`, x, y);

          // Cost
          ctx.fillStyle = level >= 3 ? '#888' : '#fff';
          ctx.fillText(cost === Infinity ? 'MAX' : `${cost}T`, x, y + 15);
        }

        ctx.restore();
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceUpgrades = SpaceUpgrades;
}
