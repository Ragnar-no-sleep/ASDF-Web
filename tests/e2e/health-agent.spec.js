// @ts-check
import { test, expect } from '@playwright/test';
import {
  PAGE_ROUTES,
  REDIRECT_ROUTES,
  API_ROUTES,
  EXTERNAL_APIS,
  SECURITY_HEADERS,
  HEADER_CHECK_ROUTES,
  PRIVACY_SECTIONS,
} from './config/routes.js';

test.describe.serial('Health Control Agent @smoke', () => {
  // ── Route Health: Pages ───────────────────────────────────────────
  test.describe('Route Health - Pages', () => {
    for (const route of PAGE_ROUTES) {
      test(`${route.label} (${route.path}) returns 200 HTML`, async ({ request }) => {
        const response = await request.get(route.path);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/html');
      });
    }
  });

  // ── Route Health: Redirects ───────────────────────────────────────
  test.describe('Route Health - Redirects', () => {
    for (const route of REDIRECT_ROUTES) {
      test(`${route.label} (${route.path}) redirects 301 to ${route.expectedLocation}`, async ({
        request,
      }) => {
        const response = await request.get(route.path, { maxRedirects: 0 });
        expect(response.status()).toBe(301);
        expect(response.headers()['location']).toBe(route.expectedLocation);
      });
    }
  });

  // ── Route Health: API ─────────────────────────────────────────────
  test.describe('Route Health - API', () => {
    for (const route of API_ROUTES) {
      test(`${route.label} (${route.path}) returns valid JSON`, async ({ request }) => {
        const response = await request.get(route.path);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        const body = await response.json();
        for (const key of route.expectedKeys) {
          expect(body).toHaveProperty(key);
        }
        expect(body.status).toBe('ok');
      });
    }
  });

  // ── Security Headers ──────────────────────────────────────────────
  test.describe('Security Headers', () => {
    for (const path of HEADER_CHECK_ROUTES) {
      test(`${path} has required security headers`, async ({ request }) => {
        const response = await request.get(path);
        const headers = response.headers();

        // Required headers present
        for (const [header, expectedValue] of Object.entries(SECURITY_HEADERS.required)) {
          expect(headers, `Missing header: ${header}`).toHaveProperty(header);
          if (typeof expectedValue === 'string') {
            expect(headers[header]).toBe(expectedValue);
          }
        }

        // Forbidden headers absent
        for (const header of SECURITY_HEADERS.absent) {
          expect(headers).not.toHaveProperty(header);
        }

        // CSP directives present
        const csp = headers['content-security-policy'] || '';
        for (const directive of SECURITY_HEADERS.cspDirectives) {
          expect(csp, `CSP missing directive: ${directive}`).toContain(directive);
        }
      });
    }
  });

  // ── RGPD Compliance ───────────────────────────────────────────────
  test.describe('RGPD Compliance', () => {
    test('consent banner is present with required controls', async ({ page }) => {
      // Clear consent to ensure banner appears
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('asdf_consent'));
      await page.reload();
      await page.waitForLoadState('load');

      const banner = page.locator('#consent-banner');
      await expect(banner).toBeVisible({ timeout: 5000 });

      await expect(page.locator('#consent-accept')).toBeVisible();
      await expect(page.locator('#consent-necessary')).toBeVisible();
    });

    test('privacy page has required legal sections', async ({ page }) => {
      await page.goto('/privacy');
      await page.waitForLoadState('load');

      for (const section of PRIVACY_SECTIONS) {
        const heading = page.locator('h2', { hasText: section });
        await expect(heading, `Missing privacy section: ${section}`).toBeVisible();
      }
    });

    test('consent acceptance persists in localStorage', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('asdf_consent'));
      await page.reload();
      await page.waitForLoadState('load');

      // Accept consent
      const acceptBtn = page.locator('#consent-accept');
      await acceptBtn.click({ timeout: 5000 });

      // Verify persistence
      const consent = await page.evaluate(() => {
        const raw = localStorage.getItem('asdf_consent');
        return raw ? JSON.parse(raw) : null;
      });
      expect(consent).toBeTruthy();
      expect(consent.given).toBe(true);
    });
  });

  // ── External API Health (soft-fail) ───────────────────────────────
  test.describe('External API Health', () => {
    for (const api of EXTERNAL_APIS) {
      test.fixme(`${api.label} (${api.url}) is reachable`, async ({ request }) => {
        // Soft-fail: these are external services, never break build
        const response = await request.get(api.url, { timeout: 10000 });
        expect(response.status()).toBeLessThan(400);
      });
    }
  });
});
