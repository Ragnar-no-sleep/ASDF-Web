// @ts-check
import { test, expect } from '@playwright/test';

/**
 * ASDF-Web Homepage E2E Tests
 *
 * Philosophy: Don't trust. Verify.
 * Every user journey must be tested.
 *
 * This is fine. 🐕‍🦺🔥
 */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load successfully', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveTitle(/ASDF/i);

    // Verify no console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Check no critical errors
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  test('should have working navigation', async ({ page }) => {
    // Hub Majestic uses .hub-node links for navigation (not traditional nav/header)
    const hubNodes = page.locator('.hub-node');
    await expect(hubNodes.first()).toBeVisible();

    // Verify navigation nodes exist
    const count = await hubNodes.count();
    expect(count).toBeGreaterThan(0);

    // Verify core hub element
    const hubCore = page.locator('.hub-core');
    await expect(hubCore).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Health Check', () => {
  test('should return 200 on /health', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
  });
});
