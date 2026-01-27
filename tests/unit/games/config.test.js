/**
 * ASDF Games - Config Module Tests
 * Tests configuration validation, environment detection, and config loading
 *
 * This is fine.
 */

// ============================================
// COPY OF PURE FUNCTIONS FROM js/games/config.js
// ============================================

/**
 * Environment detection
 */
const Environment = {
  isDev: () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  isProd: () =>
    window.location.hostname === 'alonisthe.dev' ||
    window.location.hostname === 'www.alonisthe.dev',
  isTest: () =>
    window.location.hostname.includes('test') || window.location.hostname.includes('staging'),

  getMode() {
    if (this.isProd()) return 'production';
    if (this.isTest()) return 'staging';
    return 'development';
  },
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  ASDF_TOKEN_MINT: '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
  TOKEN_DECIMALS: 6,
  MIN_HOLDER_BALANCE: 1000000,
  TREASURY_WALLET: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
  ESCROW_WALLET: 'AR3Rcr8o4iZwGwTUG5LEx7uhcenCCZNrbgkLrjVC1v6y',
  ROTATION_EPOCH: '2024-01-01T00:00:00Z',
  CYCLE_WEEKS: 9,
};

/**
 * Validate Solana address (same as state.js)
 */
function isValidSolanaAddress(address) {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Config validation
 */
const ConfigValidator = {
  validate(config) {
    const errors = [];

    if (!isValidSolanaAddress(config.ASDF_TOKEN_MINT)) {
      errors.push('Invalid ASDF_TOKEN_MINT address');
    }

    if (!isValidSolanaAddress(config.TREASURY_WALLET)) {
      errors.push('Invalid TREASURY_WALLET address');
    }

    if (!isValidSolanaAddress(config.ESCROW_WALLET)) {
      errors.push('Invalid ESCROW_WALLET address');
    }

    if (typeof config.MIN_HOLDER_BALANCE !== 'number' || config.MIN_HOLDER_BALANCE <= 0) {
      errors.push('MIN_HOLDER_BALANCE must be positive');
    }

    if (typeof config.TOKEN_DECIMALS !== 'number' || config.TOKEN_DECIMALS < 0) {
      errors.push('TOKEN_DECIMALS must be non-negative');
    }

    if (typeof config.CYCLE_WEEKS !== 'number' || config.CYCLE_WEEKS <= 0) {
      errors.push('CYCLE_WEEKS must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Games definition
 */
const GAMES = [
  {
    id: 'tokencatcher',
    name: 'Token Catcher',
    icon: '\uD83E\uDEA3',
    type: 'Arcade',
    description: 'Catch falling ASDF tokens with your basket.',
  },
  {
    id: 'burnrunner',
    name: 'Burn Runner',
    icon: '\uD83D\uDD25',
    type: 'Endless Runner',
    description: 'Run through the blockchain, collect tokens.',
  },
  {
    id: 'scamblaster',
    name: 'Scam Blaster',
    icon: '\uD83D\uDD2B',
    type: 'Shooter',
    description: 'Shoot down scam tokens.',
  },
  {
    id: 'cryptoheist',
    name: 'Crypto Heist',
    icon: '\uD83E\uDDB9',
    type: 'Action',
    description: 'Navigate the crypto underworld!',
  },
  {
    id: 'whalewatch',
    name: 'Whale Watch',
    icon: '\uD83D\uDC0B',
    type: 'Match + Memory',
    description: 'Match pairs to reveal whale patterns.',
  },
  {
    id: 'stakestacker',
    name: 'Stake Stacker',
    icon: '\uD83D\uDCE6',
    type: 'Puzzle',
    description: 'Stack staking blocks for APY rewards.',
  },
  {
    id: 'dexdash',
    name: 'DEX Dash',
    icon: '\uD83C\uDFC1',
    type: 'Racing',
    description: 'Race across DEX platforms.',
  },
  {
    id: 'burnorhold',
    name: 'Chain Conquest',
    icon: '\u2694\uFE0F',
    type: 'Strategy',
    description: 'Conquer blockchain territories!',
  },
  {
    id: 'liquiditymaze',
    name: 'Liquidity Maze',
    icon: '\uD83C\uDF0A',
    type: 'Navigation',
    description: 'Navigate the DeFi maze.',
  },
];

/**
 * Reward slots per rank
 */
const REWARD_SLOTS = { 1: 5, 2: 2, 3: 1 };

// ============================================
// TESTS
// ============================================

describe('Games Config Module', () => {
  // ============================================
  // ENVIRONMENT DETECTION
  // ============================================
  describe('Environment', () => {
    const originalLocation = window.location;

    afterEach(() => {
      // Restore original location
      delete window.location;
      window.location = originalLocation;
    });

    describe('isDev()', () => {
      it('should return true for localhost', () => {
        delete window.location;
        window.location = { hostname: 'localhost' };
        expect(Environment.isDev()).toBe(true);
      });

      it('should return true for 127.0.0.1', () => {
        delete window.location;
        window.location = { hostname: '127.0.0.1' };
        expect(Environment.isDev()).toBe(true);
      });

      it('should return false for production domain', () => {
        delete window.location;
        window.location = { hostname: 'alonisthe.dev' };
        expect(Environment.isDev()).toBe(false);
      });
    });

    describe('isProd()', () => {
      it('should return true for alonisthe.dev', () => {
        delete window.location;
        window.location = { hostname: 'alonisthe.dev' };
        expect(Environment.isProd()).toBe(true);
      });

      it('should return true for www.alonisthe.dev', () => {
        delete window.location;
        window.location = { hostname: 'www.alonisthe.dev' };
        expect(Environment.isProd()).toBe(true);
      });

      it('should return false for localhost', () => {
        delete window.location;
        window.location = { hostname: 'localhost' };
        expect(Environment.isProd()).toBe(false);
      });
    });

    describe('isTest()', () => {
      it('should return true for test subdomain', () => {
        delete window.location;
        window.location = { hostname: 'test.alonisthe.dev' };
        expect(Environment.isTest()).toBe(true);
      });

      it('should return true for staging subdomain', () => {
        delete window.location;
        window.location = { hostname: 'staging.alonisthe.dev' };
        expect(Environment.isTest()).toBe(true);
      });

      it('should return false for production', () => {
        delete window.location;
        window.location = { hostname: 'alonisthe.dev' };
        expect(Environment.isTest()).toBe(false);
      });
    });

    describe('getMode()', () => {
      it('should return production for prod domain', () => {
        delete window.location;
        window.location = { hostname: 'alonisthe.dev' };
        expect(Environment.getMode()).toBe('production');
      });

      it('should return staging for test domain', () => {
        delete window.location;
        window.location = { hostname: 'test.example.com' };
        expect(Environment.getMode()).toBe('staging');
      });

      it('should return development for localhost', () => {
        delete window.location;
        window.location = { hostname: 'localhost' };
        expect(Environment.getMode()).toBe('development');
      });
    });
  });

  // ============================================
  // DEFAULT CONFIG
  // ============================================
  describe('DEFAULT_CONFIG', () => {
    it('should have valid token mint address', () => {
      expect(isValidSolanaAddress(DEFAULT_CONFIG.ASDF_TOKEN_MINT)).toBe(true);
    });

    it('should have valid treasury wallet address', () => {
      expect(isValidSolanaAddress(DEFAULT_CONFIG.TREASURY_WALLET)).toBe(true);
    });

    it('should have valid escrow wallet address', () => {
      expect(isValidSolanaAddress(DEFAULT_CONFIG.ESCROW_WALLET)).toBe(true);
    });

    it('should have 6 token decimals (Solana SPL standard)', () => {
      expect(DEFAULT_CONFIG.TOKEN_DECIMALS).toBe(6);
    });

    it('should have positive min holder balance', () => {
      expect(DEFAULT_CONFIG.MIN_HOLDER_BALANCE).toBeGreaterThan(0);
    });

    it('should have valid rotation epoch date', () => {
      const epoch = new Date(DEFAULT_CONFIG.ROTATION_EPOCH);
      expect(epoch.getTime()).not.toBeNaN();
    });

    it('should have positive cycle weeks', () => {
      expect(DEFAULT_CONFIG.CYCLE_WEEKS).toBeGreaterThan(0);
    });
  });

  // ============================================
  // CONFIG VALIDATOR
  // ============================================
  describe('ConfigValidator', () => {
    describe('validate()', () => {
      it('should pass validation with valid config', () => {
        const result = ConfigValidator.validate(DEFAULT_CONFIG);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail with invalid token mint', () => {
        const config = { ...DEFAULT_CONFIG, ASDF_TOKEN_MINT: 'invalid' };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid ASDF_TOKEN_MINT address');
      });

      it('should fail with invalid treasury wallet', () => {
        const config = { ...DEFAULT_CONFIG, TREASURY_WALLET: 'invalid' };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid TREASURY_WALLET address');
      });

      it('should fail with invalid escrow wallet', () => {
        const config = { ...DEFAULT_CONFIG, ESCROW_WALLET: 'invalid' };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid ESCROW_WALLET address');
      });

      it('should fail with zero min holder balance', () => {
        const config = { ...DEFAULT_CONFIG, MIN_HOLDER_BALANCE: 0 };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('MIN_HOLDER_BALANCE must be positive');
      });

      it('should fail with negative min holder balance', () => {
        const config = { ...DEFAULT_CONFIG, MIN_HOLDER_BALANCE: -100 };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('MIN_HOLDER_BALANCE must be positive');
      });

      it('should fail with negative token decimals', () => {
        const config = { ...DEFAULT_CONFIG, TOKEN_DECIMALS: -1 };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('TOKEN_DECIMALS must be non-negative');
      });

      it('should fail with zero cycle weeks', () => {
        const config = { ...DEFAULT_CONFIG, CYCLE_WEEKS: 0 };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('CYCLE_WEEKS must be positive');
      });

      it('should collect multiple errors', () => {
        const config = {
          ...DEFAULT_CONFIG,
          ASDF_TOKEN_MINT: 'invalid',
          TREASURY_WALLET: 'invalid',
          MIN_HOLDER_BALANCE: -1,
        };
        const result = ConfigValidator.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });
  });

  // ============================================
  // GAMES CONFIGURATION
  // ============================================
  describe('GAMES', () => {
    it('should have 9 games defined', () => {
      expect(GAMES).toHaveLength(9);
    });

    it('should have unique game IDs', () => {
      const ids = GAMES.map(g => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have required fields for each game', () => {
      GAMES.forEach(game => {
        expect(game).toHaveProperty('id');
        expect(game).toHaveProperty('name');
        expect(game).toHaveProperty('icon');
        expect(game).toHaveProperty('type');
        expect(game).toHaveProperty('description');
      });
    });

    it('should have non-empty strings for all fields', () => {
      GAMES.forEach(game => {
        expect(typeof game.id).toBe('string');
        expect(game.id.length).toBeGreaterThan(0);
        expect(typeof game.name).toBe('string');
        expect(game.name.length).toBeGreaterThan(0);
        expect(typeof game.description).toBe('string');
        expect(game.description.length).toBeGreaterThan(0);
      });
    });

    it('should have lowercase IDs without spaces', () => {
      GAMES.forEach(game => {
        expect(game.id).toBe(game.id.toLowerCase());
        expect(game.id).not.toContain(' ');
      });
    });

    it('should include expected game types', () => {
      const types = new Set(GAMES.map(g => g.type));
      expect(types).toContain('Arcade');
      expect(types).toContain('Endless Runner');
      expect(types).toContain('Shooter');
      expect(types).toContain('Strategy');
    });
  });

  // ============================================
  // REWARD SLOTS
  // ============================================
  describe('REWARD_SLOTS', () => {
    it('should give most slots to rank 1', () => {
      expect(REWARD_SLOTS[1]).toBeGreaterThan(REWARD_SLOTS[2]);
      expect(REWARD_SLOTS[2]).toBeGreaterThan(REWARD_SLOTS[3]);
    });

    it('should have 5 slots for rank 1', () => {
      expect(REWARD_SLOTS[1]).toBe(5);
    });

    it('should have 2 slots for rank 2', () => {
      expect(REWARD_SLOTS[2]).toBe(2);
    });

    it('should have 1 slot for rank 3', () => {
      expect(REWARD_SLOTS[3]).toBe(1);
    });

    it('should sum to 8 total slots', () => {
      const total = REWARD_SLOTS[1] + REWARD_SLOTS[2] + REWARD_SLOTS[3];
      expect(total).toBe(8);
    });
  });

  // ============================================
  // SOLANA ADDRESS VALIDATION
  // ============================================
  describe('isValidSolanaAddress()', () => {
    it('should validate addresses from config', () => {
      expect(isValidSolanaAddress(DEFAULT_CONFIG.ASDF_TOKEN_MINT)).toBe(true);
      expect(isValidSolanaAddress(DEFAULT_CONFIG.TREASURY_WALLET)).toBe(true);
      expect(isValidSolanaAddress(DEFAULT_CONFIG.ESCROW_WALLET)).toBe(true);
    });

    it('should reject pump.fun style addresses with invalid characters', () => {
      // Valid pump.fun address ends with 'pump'
      expect(isValidSolanaAddress('9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump')).toBe(true);
      // Invalid - contains 0 (zero) which is not in Base58
      expect(isValidSolanaAddress('0zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump')).toBe(false);
    });
  });
});
