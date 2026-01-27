/**
 * ASDF Games - SSR Services (Node.js)
 *
 * Mirrors the PHP services for server-side rendering.
 * Used by server.cjs for bot/crawler requests.
 */

'use strict';

// =============================================================================
// CONFIG SERVICE
// =============================================================================

class ConfigService {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const env = this.getEnvironment();

    return {
      ENV: env,
      DEV_MODE: env === 'development',

      // Token configuration
      ASDF_TOKEN_MINT: 'ASdfasdFa6u9KrRuVMPQKWY4DNKL24ShUggDhFGvpump',
      TOKEN_DECIMALS: 6,
      MIN_HOLDER_BALANCE: 10_000_000,

      // Wallets
      TREASURY_WALLET: 'GXyzQ3V8jP2nMx7RdKfLmNs9TUvWkH6pY4cABrDqE5gh',
      ESCROW_WALLET: 'HKabJ4Z9pL5nQy2TdMrXW8vYuNfH3sEjG6mC7BxRkU9w',

      // API endpoints
      API_BASE: this.getApiBase(env),
      SOLANA_RPC: 'https://api.mainnet-beta.solana.com',

      // Game rotation
      ROTATION_EPOCH: '2025-01-20T00:00:00Z',
      CYCLE_WEEKS: 9,
    };
  }

  getEnvironment() {
    if (process.env.NODE_ENV === 'production') return 'production';
    if (process.env.NODE_ENV === 'staging') return 'staging';
    return 'development';
  }

  getApiBase(env) {
    switch (env) {
      case 'development':
        return 'http://localhost:3001/api';
      case 'staging':
        return 'https://test.alonisthe.dev/api';
      default:
        return 'https://asdf-api.onrender.com/api';
    }
  }

  get(key, defaultValue = null) {
    return this.config[key] ?? defaultValue;
  }

  all() {
    return { ...this.config };
  }

  isDev() {
    return this.config.DEV_MODE === true;
  }

  toJson() {
    // Filter sensitive values
    const safe = Object.fromEntries(
      Object.entries(this.config).filter(
        ([key]) => !key.includes('SECRET') && !key.includes('PRIVATE')
      )
    );
    return JSON.stringify(safe);
  }
}

// =============================================================================
// GAME SERVICE
// =============================================================================

class GameService {
  constructor(config) {
    this.config = config;
    this.games = this.defineGames();
  }

  defineGames() {
    return [
      {
        id: 'tokencatcher',
        name: 'Token Catcher',
        icon: '🪙',
        type: 'Arcade',
        description: 'Catch falling tokens, avoid scam coins!',
      },
      {
        id: 'burnrunner',
        name: 'Burn Runner',
        icon: '🔥',
        type: 'Endless Runner',
        description: 'Run through the burn, collect what remains.',
      },
      {
        id: 'scamblaster',
        name: 'Scam Blaster',
        icon: '🎯',
        type: 'Shooter',
        description: 'Blast the scams, protect the community.',
      },
      {
        id: 'cryptoheist',
        name: 'Crypto Heist',
        icon: '💎',
        type: 'Stealth',
        description: 'Infiltrate the exchange, secure the bags.',
      },
      {
        id: 'whalewatch',
        name: 'Whale Watch',
        icon: '🐋',
        type: 'Strategy',
        description: 'Track the whales, predict the moves.',
      },
      {
        id: 'stakestacker',
        name: 'Stake Stacker',
        icon: '📊',
        type: 'Puzzle',
        description: 'Stack your stakes, maximize returns.',
      },
      {
        id: 'dexdash',
        name: 'DEX Dash',
        icon: '💹',
        type: 'Racing',
        description: 'Race across DEXes, find the best routes.',
      },
      {
        id: 'burnorhold',
        name: 'Burn or HODL',
        icon: '🎰',
        type: 'Decision',
        description: 'Quick decisions: burn it or hold it?',
      },
      {
        id: 'liquiditymaze',
        name: 'Liquidity Maze',
        icon: '🌊',
        type: 'Maze',
        description: 'Navigate pools, avoid impermanent loss.',
      },
    ];
  }

  all() {
    return this.games;
  }

  find(id) {
    return this.games.find((g) => g.id === id) || null;
  }

  validIds() {
    return this.games.map((g) => g.id);
  }

  isValid(id) {
    return this.validIds().includes(id);
  }

  getCurrentWeekIndex() {
    const epoch = new Date(this.config.get('ROTATION_EPOCH')).getTime();
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const weeksSinceEpoch = Math.floor((now - epoch) / weekMs);
    return weeksSinceEpoch % this.config.get('CYCLE_WEEKS');
  }

  getCurrentGame() {
    return this.games[this.getCurrentWeekIndex()];
  }

  getNextRotationTime() {
    const now = new Date();
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

    const dayOfWeek = utcNow.getUTCDay(); // 0 = Sunday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextMonday = new Date(utcNow);
    nextMonday.setUTCDate(utcNow.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    return nextMonday;
  }

  getRewardSlots() {
    return { 1: 5, 2: 2, 3: 1 };
  }

  toJson() {
    return JSON.stringify(this.games);
  }
}

// =============================================================================
// LEADERBOARD SERVICE
// =============================================================================

class LeaderboardService {
  constructor(config, games) {
    this.config = config;
    this.games = games;
    this.cache = new Map();
    this.CACHE_TTL = 60 * 1000; // 1 minute
  }

  async getWeekly(gameId, limit = 10) {
    if (!this.games.isValid(gameId)) {
      return { leaderboard: [], game: gameId, period: 'weekly', error: 'Invalid game' };
    }

    const cacheKey = `weekly_${gameId}_${limit}`;

    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    let data = await this.fetchFromApi(`/leaderboard/weekly/${gameId}?limit=${limit}`);

    if (!data) {
      data = {
        leaderboard: this.getMockLeaderboard(limit),
        game: gameId,
        period: 'weekly',
      };
    }

    this.setCache(cacheKey, data);
    return data;
  }

  async getCycle(limit = 10) {
    const cacheKey = `cycle_${limit}`;

    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    let data = await this.fetchFromApi(`/leaderboard/cycle?limit=${limit}`);

    if (!data) {
      data = {
        leaderboard: this.getMockCycleLeaderboard(limit),
        period: 'cycle',
      };
    }

    this.setCache(cacheKey, data);
    return data;
  }

  async fetchFromApi(endpoint) {
    const url = this.config.get('API_BASE') + endpoint;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  isCached(key) {
    const entry = this.cache.get(key);
    return entry && entry.expires > Date.now();
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_TTL,
    });
  }

  getMockLeaderboard(limit) {
    const entries = [];
    for (let i = 1; i <= Math.min(limit, 10); i++) {
      entries.push({
        rank: i,
        player: this.generateMockAddress(),
        score: Math.max(0, 10000 - i * 1000 + Math.floor(Math.random() * 500)),
      });
    }
    return entries;
  }

  getMockCycleLeaderboard(limit) {
    const entries = [];
    const rewardSlots = this.games.getRewardSlots();

    for (let i = 1; i <= Math.min(limit, 10); i++) {
      entries.push({
        rank: i,
        player: this.generateMockAddress(),
        slots: (rewardSlots[i] || 0) * (Math.floor(Math.random() * 5) + 1),
      });
    }
    return entries;
  }

  generateMockAddress() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    let addr = '';
    for (let i = 0; i < 8; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr + '...';
  }

  renderHtml(leaderboard, type = 'weekly') {
    if (!leaderboard || leaderboard.length === 0) {
      return '<div class="leaderboard-empty">No scores yet</div>';
    }

    return leaderboard
      .map((entry) => {
        const rank = entry.rank || 0;
        const player = this.escapeHtml(entry.player || '');
        const value =
          type === 'cycle'
            ? `${entry.slots || 0} slots`
            : (entry.score || 0).toLocaleString();

        const rankClass =
          rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player">${player}</div>
                <div class="leaderboard-score">${value}</div>
            </div>`;
      })
      .join('');
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// =============================================================================
// SERVICE CONTAINER
// =============================================================================

let container = null;

function getContainer() {
  if (!container) {
    const config = new ConfigService();
    const games = new GameService(config);
    const leaderboard = new LeaderboardService(config, games);

    container = { config, games, leaderboard };
  }
  return container;
}

function generateHydrationScript() {
  const { config, games } = getContainer();
  const currentGame = games.getCurrentGame();

  const data = {
    CONFIG: config.all(),
    GAMES: games.all(),
    currentGame,
    rotationEpoch: config.get('ROTATION_EPOCH'),
    cycleWeeks: config.get('CYCLE_WEEKS'),
  };

  return `<script>window.__ASDF_SSR__ = ${JSON.stringify(data)};</script>`;
}

module.exports = {
  ConfigService,
  GameService,
  LeaderboardService,
  getContainer,
  generateHydrationScript,
};
