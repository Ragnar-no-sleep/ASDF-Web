// @ts-check

/**
 * Shared E2E test utilities for ASDF-Web
 *
 * Extracted from pages.spec.js for reuse across journey specs.
 * This is fine.
 */

/**
 * Attach console error + pageerror collectors to a page.
 * @param {import('@playwright/test').Page} page
 * @returns {string[]} mutable array that accumulates errors
 */
export function setupErrorCollector(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  return errors;
}

/**
 * Strip non-critical errors (favicon, network, 404).
 * @param {string[]} errors
 * @returns {string[]}
 */
export function filterCriticalErrors(errors) {
  return errors.filter(
    e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource')
  );
}

/**
 * Navigate to a path with retry logic for 429 rate-limiting.
 * Uses default 'load' waitUntil (not networkidle) because tool pages make
 * external API calls that keep the network busy indefinitely.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {{ retries?: number, waitFor?: string }} [opts]
 */
export async function gotoWithRetry(page, path, opts = {}) {
  const retries = opts.retries ?? 3;
  let response = await page.goto(path, { timeout: 15000 });

  let attempt = 0;
  while (response?.status() === 429 && attempt < retries) {
    attempt++;
    await page.waitForTimeout(2000 * attempt);
    response = await page.goto(path, { timeout: 15000 });
  }

  // If a key selector is provided, wait for it to confirm page rendered
  if (opts.waitFor) {
    await page.locator(opts.waitFor).first().waitFor({ timeout: 10000 });
  }

  return response;
}

/**
 * Dismiss the cookie consent banner if present.
 * The banner (z-index:10000) is created dynamically and can cover
 * fixed-position elements like the hub view toggle (bottom-right).
 * @param {import('@playwright/test').Page} page
 */
export async function dismissCookieConsent(page) {
  try {
    const btn = page.locator('#consent-banner .consent-btn-primary');
    await btn.click({ timeout: 3000 });
    // Wait for banner removal animation (300ms)
    await page.locator('#consent-banner').waitFor({ state: 'detached', timeout: 3000 });
  } catch {
    // Banner may not exist if consent was already given
  }
}

/**
 * Check if the current page viewport is mobile-width (< 480px).
 * @param {import('@playwright/test').Page} page
 * @returns {boolean}
 */
export function isMobileViewport(page) {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 480 : false;
}

/**
 * Collect network errors (4xx/5xx responses) during page lifecycle.
 * Call BEFORE navigation — returns a mutable array that fills as responses arrive.
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL — used to tag isFirstParty
 * @returns {{ url: string, status: number, isFirstParty: boolean }[]}
 */
export function collectNetworkErrors(page, baseURL) {
  const errors = [];
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      errors.push({
        url: response.url(),
        status,
        isFirstParty: response.url().startsWith(baseURL),
      });
    }
  });
  return errors;
}

/**
 * Collect performance metrics via Navigation Timing API.
 * Call AFTER page has reached 'load' state.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ loadTimeMs: number, ttfbMs: number }>}
 */
export async function collectPerfMetrics(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return { loadTimeMs: 0, ttfbMs: 0 };
    return {
      loadTimeMs: Math.round(nav.loadEventEnd - nav.startTime),
      ttfbMs: Math.round(nav.responseStart - nav.startTime),
    };
  });
}
