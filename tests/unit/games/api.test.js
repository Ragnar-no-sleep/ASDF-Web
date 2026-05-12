/**
 * ASDF Games - ApiClient null-guard tests
 *
 * Verifies that ApiClient.request() throws a clean API_DISABLED error
 * when CONFIG.API_BASE is null (production — Phase 1 BURN backend archived),
 * instead of composing invalid "null/scores/submit" URLs.
 *
 * This is fine.
 */

// ============================================
// MINIMAL INLINE STUBS (no module bundler)
// ============================================

const RateLimiter = {
  canMakeCall: jest.fn(() => true),
};

// ============================================
// COPY OF ApiClient.request() FROM js/games/api.js
// (pure function copy — same pattern as other game tests)
// ============================================

function makeApiClient(apiBase) {
  const CONFIG = { API_BASE: apiBase, DEV_MODE: false };

  return {
    async request(endpoint, options = {}) {
      // Guard: API_BASE is null in production (Phase 1 BURN — backend archived).
      // Throw a clean error so callers' try/catch degrades gracefully instead of
      // composing "null/scores/submit" URLs that confuse the console.
      if (!CONFIG.API_BASE) {
        const err = new Error('API_DISABLED');
        err.code = 'API_DISABLED';
        throw err;
      }

      const url = `${CONFIG.API_BASE}${endpoint}`;

      if (!RateLimiter.canMakeCall(endpoint)) {
        throw new Error('Rate limit exceeded. Please wait.');
      }

      // (fetch not exercised in these unit tests — guard fires before it)
      return { url };
    },
  };
}

// ============================================
// TESTS
// ============================================

describe('ApiClient.request() — null API_BASE guard', () => {
  describe('when CONFIG.API_BASE is null (production)', () => {
    let client;

    beforeEach(() => {
      client = makeApiClient(null);
    });

    it('should throw an error with code API_DISABLED', async () => {
      await expect(client.request('/scores/submit', { method: 'POST' })).rejects.toMatchObject({
        code: 'API_DISABLED',
      });
    });

    it('should throw before composing any URL', async () => {
      // The error message is "API_DISABLED", not a fetch network error
      await expect(client.request('/scores/submit')).rejects.toThrow('API_DISABLED');
    });

    it('should guard all endpoint paths — score submit', async () => {
      await expect(client.request('/scores/submit', { method: 'POST' })).rejects.toMatchObject({
        code: 'API_DISABLED',
      });
    });

    it('should guard all endpoint paths — leaderboard', async () => {
      await expect(
        client.request('/scores/leaderboard/weekly/tokencatcher?limit=10')
      ).rejects.toMatchObject({
        code: 'API_DISABLED',
      });
    });

    it('should guard all endpoint paths — auth challenge', async () => {
      await expect(client.request('/auth/challenge', { method: 'POST' })).rejects.toMatchObject({
        code: 'API_DISABLED',
      });
    });

    it('should guard all endpoint paths — user profile', async () => {
      await expect(client.request('/users/me')).rejects.toMatchObject({
        code: 'API_DISABLED',
      });
    });

    it('should never produce a "null/" URL string', async () => {
      // Verify the error is not a fetch TypeError (which would indicate URL composition happened)
      let caught = null;
      try {
        await client.request('/scores/submit');
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      expect(caught.message).not.toMatch(/^null\//);
      expect(caught.code).toBe('API_DISABLED');
    });
  });

  describe('when CONFIG.API_BASE is set (development)', () => {
    let client;

    beforeEach(() => {
      client = makeApiClient('http://localhost:3001/api');
    });

    it('should not throw API_DISABLED when API_BASE is a non-empty string', async () => {
      // The guard passes — we get rate-limit or fetch errors, not API_DISABLED
      // Override RateLimiter to return false so it throws before fetch
      RateLimiter.canMakeCall.mockReturnValueOnce(false);

      await expect(client.request('/scores/submit')).rejects.toThrow('Rate limit exceeded');
    });

    it('should proceed past the guard when API_BASE is set', async () => {
      // Confirm guard does NOT fire — error is rate-limit, not API_DISABLED
      RateLimiter.canMakeCall.mockReturnValueOnce(false);
      let caught = null;
      try {
        await client.request('/scores/submit');
      } catch (e) {
        caught = e;
      }
      expect(caught).not.toBeNull();
      expect(caught.code).not.toBe('API_DISABLED');
    });
  });
});
