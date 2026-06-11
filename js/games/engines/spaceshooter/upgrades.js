'use strict';

const SpaceUpgrades = {
  costs: {
    hull: [13, 34, 89],
    engine: [13, 34, 89],
    weapons: [21, 55, 144],
    shields: [21, 55, 144],
  },

  stats: {
    hull: { 0: 100, 1: 134, 2: 179, 3: 233 },
    engine: { 0: 4, 1: 5, 2: 6, 3: 8 },
    weapons: { 0: 233, 1: 144, 2: 89, 3: 55 },
    shields: { 0: 0, 1: 34, 2: 55, 3: 89 },
  },

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(stat, state) {
    const level = state.upgrades[stat] || 0;
    if (level >= 3) return false;

    const cost = this.costs[stat][level];
    if (!state.appState || !state.appState.tokens) return false;
    if (state.appState.tokens < cost) return false;

    state.appState.tokens -= cost;
    state.upgrades[stat] = level + 1;

    if (state.appState.gameState) {
      state.appState.gameState.upgrades = { ...state.upgrades };
    }

    return true;
  },

  /**
   * Get upgrade cost
   */
  getUpgradeCost(stat, level) {
    if (level >= 3) return Infinity;
    return this.costs[stat][level];
  },

  /**
   * Get stat value
   */
  getStatValue(stat, level) {
    return this.stats[stat][level] || 0;
  },

  /**
   * Draw upgrade screen
   */
  renderUpgradeScreen(ctx, canvas, state) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = '#ea4e33';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('UPGRADE', centerX, centerY - 120);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '16px Arial';
    ctx.fillText(
      `Tokens: ${(state.appState && state.appState.tokens) || 0}`,
      centerX,
      centerY - 90
    );

    const upgrades = [
      { name: 'HULL', stat: 'hull' },
      { name: 'ENGINE', stat: 'engine' },
      { name: 'WEAPONS', stat: 'weapons' },
      { name: 'SHIELDS', stat: 'shields' },
    ];

    for (let i = 0; i < upgrades.length; i++) {
      const u = upgrades[i];
      const level = state.upgrades[u.stat] || 0;
      const cost = this.getUpgradeCost(u.stat, level);
      const x = centerX - 100 + (i % 2) * 100;
      const y = centerY - 40 + Math.floor(i / 2) * 80;

      ctx.fillStyle = level >= 3 ? '#555' : '#1a1a1a';
      ctx.fillRect(x - 35, y - 30, 70, 60);
      ctx.strokeStyle = '#ea4e33';
      ctx.strokeRect(x - 35, y - 30, 70, 60);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '12px Arial';
      ctx.fillText(u.name, x, y - 15);
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`LVL ${level}`, x, y);
      ctx.fillStyle = level >= 3 ? '#888' : '#fff';
      ctx.fillText(cost === Infinity ? 'MAX' : `${cost}T`, x, y + 15);
    }
    ctx.restore();
  },
};

if (typeof window !== 'undefined') {
  window.SpaceUpgrades = SpaceUpgrades;
}
