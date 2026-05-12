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
    // Hub Majestic uses .hub-orbit-item links for navigation (not traditional nav/header)
    const hubNodes = page.locator('.hub-orbit-item');
    await expect(hubNodes.first()).toBeVisible();

    // Verify navigation nodes exist
    const count = await hubNodes.count();
    expect(count).toBeGreaterThan(0);

    // Verify main hub element
    const hubMain = page.locator('.hub');
    await expect(hubMain).toBeVisible();
  });

  test('should be responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Grid auto-activated at mobile width
    await expect(page.locator('#hubGridView')).toBeVisible();

    // Cards fit viewport
    const card = page.locator('.hub-tool-card').first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);

    // Orbital hidden
    await expect(page.locator('.hub-orbit-container')).not.toBeVisible();
  });

  test('should be responsive at tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('#main-hub')).toBeVisible();
    await expect(page.locator('.hub-orbit-item').first()).toBeVisible();
  });
});

test.describe('Health Check', () => {
  test('should return 200 on /health', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
  });
});
