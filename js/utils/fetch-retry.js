/**
 * Fetch with retry + AbortController timeout.
 * Fibonacci-based linear backoff (377ms × attempt).
 *
 * @param {string} url
 * @param {object} [opts] - fetch options + retry config
 * @param {number} [opts.retries=2] - max retry attempts
 * @param {number} [opts.timeout=8000] - abort timeout in ms
 * @param {number} [opts.backoff=377] - base backoff in ms (multiplied by attempt number)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, opts = {}) {
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
