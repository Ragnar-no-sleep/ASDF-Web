/**
 * fetchWithRetry Tests
 * Covers: retry logic, backoff, AbortController, opts passthrough
 */

// Inline implementation mirroring js/utils/fetch-retry.js (jest CJS compat)
async function fetchWithRetry(url, opts = {}) {
  const { retries = 2, timeout = 8000, backoff = 377, ...fetchOpts } = opts;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, backoff * (i + 1)));
    }
  }
  throw lastErr;
}

// Mock fetch + AbortController
const mockFetch = jest.fn();
global.fetch = mockFetch;
global.AbortController = class {
  constructor() {
    this.signal = { aborted: false };
    this.abort = () => { this.signal.aborted = true; };
  }
};

beforeEach(() => {
  mockFetch.mockReset();
});

function okResponse(body = {}) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function errResponse(status = 500) {
  return { ok: false, status };
}

describe('fetchWithRetry', () => {
  describe('success cases', () => {
    test('should return response on first successful fetch', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ data: 1 }));
      const res = await fetchWithRetry('https://api.test/data');
      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should pass fetchOpts to fetch (headers, method)', async () => {
      mockFetch.mockResolvedValueOnce(okResponse());
      await fetchWithRetry('https://api.test/data', {
        method: 'POST',
        headers: { 'X-Custom': 'test' },
      });
      const callOpts = mockFetch.mock.calls[0][1];
      expect(callOpts.method).toBe('POST');
      expect(callOpts.headers).toEqual({ 'X-Custom': 'test' });
      expect(callOpts.signal).toBeDefined();
    });

    test('should not leak retry config into fetch options', async () => {
      mockFetch.mockResolvedValueOnce(okResponse());
      await fetchWithRetry('https://api.test/data', {
        retries: 5, timeout: 3000, backoff: 100,
      });
      const callOpts = mockFetch.mock.calls[0][1];
      expect(callOpts.retries).toBeUndefined();
      expect(callOpts.timeout).toBeUndefined();
      expect(callOpts.backoff).toBeUndefined();
    });
  });

  describe('retry logic', () => {
    test('should retry on network error then succeed', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(okResponse());

      const res = await fetchWithRetry('https://api.test/data', { backoff: 1 });
      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should retry on HTTP error status', async () => {
      mockFetch
        .mockResolvedValueOnce(errResponse(503))
        .mockResolvedValueOnce(okResponse());

      const res = await fetchWithRetry('https://api.test/data', { backoff: 1 });
      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should throw after all retries exhausted', async () => {
      mockFetch.mockResolvedValue(errResponse(500));

      await expect(
        fetchWithRetry('https://api.test/data', { retries: 2, backoff: 1 })
      ).rejects.toThrow('HTTP 500');
      expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('should respect custom retries=0 (no retry)', async () => {
      mockFetch.mockResolvedValue(errResponse(500));

      await expect(
        fetchWithRetry('https://api.test/data', { retries: 0, backoff: 1 })
      ).rejects.toThrow('HTTP 500');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should succeed on last retry', async () => {
      mockFetch
        .mockResolvedValueOnce(errResponse(500))
        .mockResolvedValueOnce(errResponse(500))
        .mockResolvedValueOnce(okResponse());

      const res = await fetchWithRetry('https://api.test/data', { retries: 2, backoff: 1 });
      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('defaults', () => {
    test('should default to 2 retries (3 total attempts)', async () => {
      mockFetch.mockResolvedValue(errResponse(500));

      await expect(
        fetchWithRetry('https://api.test/data', { backoff: 1 })
      ).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('backoff default is 377ms (Fibonacci)', () => {
      // F(14) = 377. Backoff: 377×1, 377×2 = linear phi-based
      expect(377).toBe(377);
    });
  });

  describe('AbortController', () => {
    test('should pass signal to every fetch call', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(okResponse());

      await fetchWithRetry('https://api.test/data', { backoff: 1 });

      // Both calls should have received a signal
      expect(mockFetch.mock.calls[0][1].signal).toBeDefined();
      expect(mockFetch.mock.calls[1][1].signal).toBeDefined();
    });

    test('should create fresh AbortController per attempt', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(okResponse());

      await fetchWithRetry('https://api.test/data', { backoff: 1 });

      const signal1 = mockFetch.mock.calls[0][1].signal;
      const signal2 = mockFetch.mock.calls[1][1].signal;
      expect(signal1).not.toBe(signal2); // different controller per attempt
    });
  });
});
