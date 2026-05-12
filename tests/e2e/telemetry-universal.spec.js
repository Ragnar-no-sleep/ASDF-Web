// @ts-check
import { test, expect } from '@playwright/test';
import {
  setupErrorCollector,
  filterCriticalErrors,
  gotoWithRetry,
  collectNetworkErrors,
  collectPerfMetrics,
} from './fixtures.js';
import { PAGE_ROUTES } from './config/routes.js';

/** Global noise — browser-generated, not app errors */
const GLOBAL_NOISE = [
  'Content Security Policy', // CSP enforcement notices (browser-level)
];

/**
 * Route-scoped pre-existing errors. Only these exact routes get a pass
 * for these exact patterns. New ReferenceErrors on other routes will fail.
 */
const ROUTE_EXCEPTIONS = {
  '/build': [
    "reading 'DEV'", // Three.js dev-mode check in non-bundled context
    'resolve module specifier', // bare import "three" without bundler
  ],
  '/games': [
    'GameValidation is not defined', // Lazy-loaded module race condition
    "sanitizeNumber' has already been declared", // Duplicate script load
    '[ShopSync]', // Shop sync fails without backend
    '[ShopUI]', // Shop UI fails without backend
    'API endpoint not found', // Shop backend unreachable in dev/CI
  ],
};

function isKnownNoise(msg, routePath) {
  if (GLOBAL_NOISE.some(p => msg.includes(p))) return true;
  const exceptions = ROUTE_EXCEPTIONS[routePath];
  return exceptions ? exceptions.some(p => msg.includes(p)) : false;
}

test.describe.serial('Universal Telemetry @smoke', () => {
  // ── Console Errors ────────────────────────────────────────────────
  test.describe('Console Errors', () => {
    for (const route of PAGE_ROUTES) {
      test(`${route.label} (${route.path}) has no critical JS errors`, async ({ page }) => {
        const errors = setupErrorCollector(page);
        await gotoWithRetry(page, route.path);
        await page.waitForLoadState('load');

        const critical = filterCriticalErrors(errors).filter(e => !isKnownNoise(e, route.path));
        expect(critical, `Critical errors on ${route.path}: ${critical.join(', ')}`).toHaveLength(
          0
        );
      });
    }
  });

  // ── Network Integrity ─────────────────────────────────────────────
  test.describe('Network Integrity', () => {
    for (const route of PAGE_ROUTES) {
      test(`${route.label} (${route.path}) has no first-party 404s`, async ({ page, baseURL }) => {
        const networkErrors = collectNetworkErrors(page, baseURL);
        await gotoWithRetry(page, route.path);
        await page.waitForLoadState('load');

        const firstParty404s = networkErrors.filter(e => e.isFirstParty && e.status === 404);
        expect(
          firstParty404s,
          `First-party 404s on ${route.path}: ${firstParty404s.map(e => e.url).join(', ')}`
        ).toHaveLength(0);
      });
    }
  });

  // ── Performance Baseline ──────────────────────────────────────────
  test.describe('Performance Baseline', () => {
    for (const route of PAGE_ROUTES) {
      test(`${route.label} (${route.path}) loads within ${route.maxLoadMs}ms`, async ({ page }) => {
        await gotoWithRetry(page, route.path);
        await page.waitForLoadState('load');

        const metrics = await collectPerfMetrics(page);
        expect(
          metrics.loadTimeMs,
          `${route.path} load time ${metrics.loadTimeMs}ms exceeds ${route.maxLoadMs}ms`
        ).toBeLessThanOrEqual(route.maxLoadMs);
        expect(
          metrics.ttfbMs,
          `${route.path} TTFB ${metrics.ttfbMs}ms exceeds ${route.maxTtfbMs}ms`
        ).toBeLessThanOrEqual(route.maxTtfbMs);
      });
    }
  });
});
