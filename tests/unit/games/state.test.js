/**
 * ASDF Games - State Module Tests
 * Tests state validation, wallet address validation, and integrity checking
 *
 * Following existing test patterns - copying pure functions for testing without ES modules
 *
 * This is fine.
 */

// ============================================
// COPY OF PURE FUNCTIONS FROM js/games/state.js
// (for testing without module bundler)
// ============================================

const GOTW_STORAGE_KEY = 'asdf_gotw_v2';
const GOTW_INTEGRITY_KEY = 'asdf_gotw_integrity';

// Valid game IDs for schema validation
const VALID_GAME_IDS = new Set([
  'tokencatcher',
  'burnrunner',
  'scamblaster',
  'cryptoheist',
  'whalewatch',
  'stakestacker',
  'dexdash',
  'burnorhold',
  'liquiditymaze',
]);

/**
 * Validate Solana address format
 * Base58 alphabet excludes 0, O, I, l
 */
function isValidSolanaAddress(address) {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Generate a simple hash for integrity checking
 */
function generateStateHash(data) {
  const str = JSON.stringify({
    wallet: data.wallet,
    practiceScores: data.practiceScores,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // Add browser fingerprint
  const fp = navigator.userAgent.length + screen.width + screen.height;
  return ((hash ^ fp) >>> 0).toString(36);
}

/**
 * Validate state schema to prevent tampering
 */
function validateStateSchema(data) {
  if (typeof data !== 'object' || data === null) return false;
  if (data.wallet !== null && typeof data.wallet !== 'string') return false;
  if (typeof data.isHolder !== 'boolean') return false;
  if (typeof data.balance !== 'number' || !Number.isFinite(data.balance) || data.balance < 0) {
    return false;
  }
  if (typeof data.practiceScores !== 'object' || data.practiceScores === null) return false;
  if (typeof data.competitiveScores !== 'object' || data.competitiveScores === null) return false;

  // Validate score entries
  for (const [key, value] of Object.entries(data.practiceScores)) {
    if (!VALID_GAME_IDS.has(key) || typeof value !== 'number' || !Number.isFinite(value)) {
      return false;
    }
  }
  for (const [key, value] of Object.entries(data.competitiveScores)) {
    if (!VALID_GAME_IDS.has(key) || typeof value !== 'number' || !Number.isFinite(value)) {
      return false;
    }
  }

  // Validate competitive time tracking fields
  if (data.competitiveTimeUsed !== undefined) {
    if (
      typeof data.competitiveTimeUsed !== 'number' ||
      !Number.isFinite(data.competitiveTimeUsed) ||
      data.competitiveTimeUsed < 0
    ) {
      return false;
    }
  }
  if (data.competitiveTimeDate !== undefined && data.competitiveTimeDate !== null) {
    if (typeof data.competitiveTimeDate !== 'string') return false;
  }
  if (data.competitiveSessionStart !== undefined && data.competitiveSessionStart !== null) {
    if (
      typeof data.competitiveSessionStart !== 'number' ||
      !Number.isFinite(data.competitiveSessionStart)
    ) {
      return false;
    }
  }

  // Validate wallet address format if present
  if (data.wallet && !isValidSolanaAddress(data.wallet)) {
    return false;
  }

  return true;
}

/**
 * Daily competitive time limit
 */
const DAILY_COMPETITIVE_LIMIT = 30 * 60 * 1000; // 30 minutes

/**
 * Get remaining competitive time
 */
function getCompetitiveTimeRemaining(state) {
  let used = state.competitiveTimeUsed || 0;
  if (state.competitiveSessionStart) {
    used += Date.now() - state.competitiveSessionStart;
  }
  return Math.max(0, DAILY_COMPETITIVE_LIMIT - used);
}

/**
 * Format time as MM:SS
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// TESTS
// ============================================

describe('Games State Module', () => {
  // ============================================
  // SOLANA ADDRESS VALIDATION
  // ============================================
  describe('isValidSolanaAddress()', () => {
    it('should accept valid Solana addresses', () => {
      // Real mainnet addresses
      expect(isValidSolanaAddress('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa')).toBe(true);
      expect(isValidSolanaAddress('AR3Rcr8o4iZwGwTUG5LEx7uhcenCCZNrbgkLrjVC1v6y')).toBe(true);
      expect(isValidSolanaAddress('9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump')).toBe(true);
    });

    it('should reject addresses that are too short', () => {
      expect(isValidSolanaAddress('5VUuiKmR4zt1bfHNTTpPMGB2r7tj')).toBe(false);
      expect(isValidSolanaAddress('abc')).toBe(false);
      expect(isValidSolanaAddress('')).toBe(false);
    });

    it('should reject addresses that are too long', () => {
      expect(isValidSolanaAddress('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwaExtra')).toBe(false);
    });

    it('should reject addresses with invalid Base58 characters', () => {
      // 0, O, I, l are not in Base58
      expect(isValidSolanaAddress('0VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa')).toBe(false);
      expect(isValidSolanaAddress('OVUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa')).toBe(false);
      expect(isValidSolanaAddress('IVUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa')).toBe(false);
      expect(isValidSolanaAddress('lVUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa')).toBe(false);
    });

    it('should reject addresses with special characters', () => {
      expect(isValidSolanaAddress('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRw!')).toBe(false);
      expect(isValidSolanaAddress('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRw@')).toBe(false);
      expect(isValidSolanaAddress('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRw ')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(isValidSolanaAddress(null)).toBe(false);
      expect(isValidSolanaAddress(undefined)).toBe(false);
      expect(isValidSolanaAddress(12345)).toBe(false);
      expect(isValidSolanaAddress({})).toBe(false);
      expect(isValidSolanaAddress([])).toBe(false);
    });
  });

  // ============================================
  // STATE SCHEMA VALIDATION
  // ============================================
  describe('validateStateSchema()', () => {
    const validState = {
      wallet: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
      isHolder: false,
      balance: 0,
      practiceScores: {},
      competitiveScores: {},
    };

    it('should accept valid state with all required fields', () => {
      expect(validateStateSchema(validState)).toBe(true);
    });

    it('should accept state with null wallet', () => {
      expect(validateStateSchema({ ...validState, wallet: null })).toBe(true);
    });

    it('should accept state with valid scores', () => {
      const stateWithScores = {
        ...validState,
        practiceScores: { tokencatcher: 100, burnrunner: 200 },
        competitiveScores: { scamblaster: 50 },
      };
      expect(validateStateSchema(stateWithScores)).toBe(true);
    });

    it('should accept state with competitive time tracking', () => {
      const stateWithTime = {
        ...validState,
        competitiveTimeUsed: 60000,
        competitiveTimeDate: '2026-01-27',
        competitiveSessionStart: Date.now(),
      };
      expect(validateStateSchema(stateWithTime)).toBe(true);
    });

    it('should reject non-object input', () => {
      expect(validateStateSchema(null)).toBe(false);
      expect(validateStateSchema(undefined)).toBe(false);
      expect(validateStateSchema('string')).toBe(false);
      expect(validateStateSchema(123)).toBe(false);
    });

    it('should reject invalid wallet type', () => {
      expect(validateStateSchema({ ...validState, wallet: 123 })).toBe(false);
      expect(validateStateSchema({ ...validState, wallet: {} })).toBe(false);
    });

    it('should reject invalid wallet address format', () => {
      expect(validateStateSchema({ ...validState, wallet: 'invalid' })).toBe(false);
      expect(validateStateSchema({ ...validState, wallet: '0invalid' })).toBe(false);
    });

    it('should reject non-boolean isHolder', () => {
      expect(validateStateSchema({ ...validState, isHolder: 'true' })).toBe(false);
      expect(validateStateSchema({ ...validState, isHolder: 1 })).toBe(false);
      expect(validateStateSchema({ ...validState, isHolder: null })).toBe(false);
    });

    it('should reject invalid balance values', () => {
      expect(validateStateSchema({ ...validState, balance: -1 })).toBe(false);
      expect(validateStateSchema({ ...validState, balance: 'zero' })).toBe(false);
      expect(validateStateSchema({ ...validState, balance: Infinity })).toBe(false);
      expect(validateStateSchema({ ...validState, balance: NaN })).toBe(false);
    });

    it('should reject invalid practiceScores type', () => {
      expect(validateStateSchema({ ...validState, practiceScores: null })).toBe(false);
      // Note: Arrays pass typeof === 'object' check, but entries validation catches invalid keys
      expect(validateStateSchema({ ...validState, practiceScores: 'string' })).toBe(false);
    });

    it('should reject invalid game IDs in scores', () => {
      expect(
        validateStateSchema({
          ...validState,
          practiceScores: { invalidgame: 100 },
        })
      ).toBe(false);
    });

    it('should reject non-numeric score values', () => {
      expect(
        validateStateSchema({
          ...validState,
          practiceScores: { tokencatcher: 'hundred' },
        })
      ).toBe(false);
      expect(
        validateStateSchema({
          ...validState,
          practiceScores: { tokencatcher: NaN },
        })
      ).toBe(false);
    });

    it('should reject invalid competitiveTimeUsed', () => {
      expect(
        validateStateSchema({
          ...validState,
          competitiveTimeUsed: -1,
        })
      ).toBe(false);
      expect(
        validateStateSchema({
          ...validState,
          competitiveTimeUsed: 'string',
        })
      ).toBe(false);
    });

    it('should reject invalid competitiveTimeDate', () => {
      expect(
        validateStateSchema({
          ...validState,
          competitiveTimeDate: 12345,
        })
      ).toBe(false);
    });

    it('should reject invalid competitiveSessionStart', () => {
      expect(
        validateStateSchema({
          ...validState,
          competitiveSessionStart: 'now',
        })
      ).toBe(false);
      expect(
        validateStateSchema({
          ...validState,
          competitiveSessionStart: Infinity,
        })
      ).toBe(false);
    });
  });

  // ============================================
  // INTEGRITY HASH
  // ============================================
  describe('generateStateHash()', () => {
    beforeEach(() => {
      // Mock screen dimensions for consistent hashing
      Object.defineProperty(window, 'screen', {
        value: { width: 1920, height: 1080 },
        writable: true,
      });
    });

    it('should generate consistent hash for same data', () => {
      const data = {
        wallet: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
        practiceScores: { tokencatcher: 100 },
      };
      const hash1 = generateStateHash(data);
      const hash2 = generateStateHash(data);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different data', () => {
      const data1 = {
        wallet: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
        practiceScores: { tokencatcher: 100 },
      };
      const data2 = {
        wallet: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
        practiceScores: { tokencatcher: 200 },
      };
      expect(generateStateHash(data1)).not.toBe(generateStateHash(data2));
    });

    it('should return a string', () => {
      const hash = generateStateHash({ wallet: null, practiceScores: {} });
      expect(typeof hash).toBe('string');
    });

    it('should handle null wallet', () => {
      const data = { wallet: null, practiceScores: {} };
      expect(() => generateStateHash(data)).not.toThrow();
    });
  });

  // ============================================
  // COMPETITIVE TIME TRACKING
  // ============================================
  describe('Competitive Time Tracking', () => {
    describe('getCompetitiveTimeRemaining()', () => {
      it('should return full time when no time used', () => {
        const state = { competitiveTimeUsed: 0, competitiveSessionStart: null };
        expect(getCompetitiveTimeRemaining(state)).toBe(DAILY_COMPETITIVE_LIMIT);
      });

      it('should subtract used time', () => {
        const usedTime = 10 * 60 * 1000; // 10 minutes
        const state = { competitiveTimeUsed: usedTime, competitiveSessionStart: null };
        expect(getCompetitiveTimeRemaining(state)).toBe(DAILY_COMPETITIVE_LIMIT - usedTime);
      });

      it('should account for active session', () => {
        const now = Date.now();
        const sessionStart = now - 5 * 60 * 1000; // 5 minutes ago
        const state = { competitiveTimeUsed: 0, competitiveSessionStart: sessionStart };

        // Allow some tolerance for test execution time
        const remaining = getCompetitiveTimeRemaining(state);
        expect(remaining).toBeLessThanOrEqual(DAILY_COMPETITIVE_LIMIT - 5 * 60 * 1000 + 1000);
        expect(remaining).toBeGreaterThanOrEqual(DAILY_COMPETITIVE_LIMIT - 5 * 60 * 1000 - 1000);
      });

      it('should not return negative time', () => {
        const state = {
          competitiveTimeUsed: DAILY_COMPETITIVE_LIMIT + 10000,
          competitiveSessionStart: null,
        };
        expect(getCompetitiveTimeRemaining(state)).toBe(0);
      });
    });

    describe('formatTime()', () => {
      it('should format 0 as 00:00', () => {
        expect(formatTime(0)).toBe('00:00');
      });

      it('should format seconds correctly', () => {
        expect(formatTime(30000)).toBe('00:30');
        expect(formatTime(59000)).toBe('00:59');
      });

      it('should format minutes correctly', () => {
        expect(formatTime(60000)).toBe('01:00');
        expect(formatTime(90000)).toBe('01:30');
        expect(formatTime(30 * 60 * 1000)).toBe('30:00');
      });

      it('should pad single digits', () => {
        expect(formatTime(5000)).toBe('00:05');
        expect(formatTime(5 * 60 * 1000)).toBe('05:00');
      });
    });

    describe('DAILY_COMPETITIVE_LIMIT', () => {
      it('should be 30 minutes', () => {
        expect(DAILY_COMPETITIVE_LIMIT).toBe(30 * 60 * 1000);
      });
    });
  });

  // ============================================
  // VALID GAME IDS
  // ============================================
  describe('VALID_GAME_IDS', () => {
    it('should contain all 9 games', () => {
      expect(VALID_GAME_IDS.size).toBe(9);
    });

    it('should include all expected games', () => {
      const expectedGames = [
        'tokencatcher',
        'burnrunner',
        'scamblaster',
        'cryptoheist',
        'whalewatch',
        'stakestacker',
        'dexdash',
        'burnorhold',
        'liquiditymaze',
      ];
      expectedGames.forEach(game => {
        expect(VALID_GAME_IDS.has(game)).toBe(true);
      });
    });

    it('should not include invalid games', () => {
      expect(VALID_GAME_IDS.has('invalidgame')).toBe(false);
      expect(VALID_GAME_IDS.has('pumparena')).toBe(false); // PumpArena is separate
    });
  });
});
