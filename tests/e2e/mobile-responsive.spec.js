// @ts-check
import { test, expect } from '@playwright/test';
import { gotoWithRetry, dismissCookieConsent } from './fixtures.js';

/**
 * Mobile Responsive — Structural Proof at 390px
 *
 * Verifies CSS responsive rules produce usable layouts at iPhone 13 width.
 * Uses boundingBox() to prove elements fit within viewport — not just
 * "body is visible".
 *
 * This is fine.
 */

test.describe('Mobile Responsive (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hub: grid auto-activated, cards fit viewport', async ({ page }) => {
    await gotoWithRetry(page, '/');
    await dismissCookieConsent(page);

    // Grid view should be forced on by CSS
    const gridView = page.locator('#hubGridView');
    await expect(gridView).toBeVisible();

    // Each tool card should fit within 390px viewport
    const cards = page.locator('.hub-tool-card');
    const count = await cards.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
      }
    }
  });

  test('hub: orbital system hidden', async ({ page }) => {
    await gotoWithRetry(page, '/');

    await expect(page.locator('.hub-orbit-container')).not.toBeVisible();
    await expect(page.locator('.hub-planet')).not.toBeVisible();
    await expect(page.locator('.hub-view-toggle')).not.toBeVisible();
  });

  test('games: arcade cards fit viewport', async ({ page }) => {
    await gotoWithRetry(page, '/games.html');
    await dismissCookieConsent(page);

    const hubSection = page.locator('#hub-section');
    await expect(hubSection).toBeVisible();

    const cards = page.locator('.arcade-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Each card should fit within viewport width
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(390);
      }
    }
  });

  test('ecosystem-map: stats grid single column', async ({ page }) => {
    await gotoWithRetry(page, '/ecosystem-map.html');

    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    // At 390px, grid-template-columns: 1fr means all stat cards stack
    const statCards = statsGrid.locator('.stat-card');
    const count = await statCards.count();

    if (count >= 2) {
      const first = await statCards.nth(0).boundingBox();
      const second = await statCards.nth(1).boundingBox();
      if (first && second) {
        // Stacked = second card starts below first (not side by side)
        expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
      }
    }
  });
});
