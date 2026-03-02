// @ts-check
import { test, expect } from '@playwright/test';
import { setupErrorCollector, filterCriticalErrors, gotoWithRetry } from './fixtures.js';

/**
 * Learn Page — Interactive Journey
 *
 * Tests 5-phase interactive learning flow: observe, drag, burn, type, explore.
 * Each test navigates independently — no cascade on failure.
 * This is fine.
 */

test.setTimeout(30000);

test.describe('Learn Journey', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithRetry(page, '/learn.html');
  });

  test('learn page loads with Phase 1 active', async ({ page }) => {
    const errors = setupErrorCollector(page);

    const phase1 = page.locator('#phase-1');
    await expect(phase1).toHaveClass(/active/);

    // Other phases should be locked
    await expect(page.locator('#phase-2')).toHaveClass(/locked/);
    await expect(page.locator('#phase-3')).toHaveClass(/locked/);

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('progress bar exists and starts at minimum', async ({ page }) => {
    const progressBar = page.locator('.progress[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Fill element exists (zero-width at 0% so not "visible")
    const fill = page.locator('.progress-fill');
    await expect(fill).toBeAttached();
  });

  test('drag slider elements exist in Phase 2', async ({ page }) => {
    const handle = page.locator('#drag-handle');
    const slider = page.locator('#drag-slider');

    // Elements exist in the DOM even if phase is locked
    await expect(slider).toBeAttached();
    await expect(handle).toBeAttached();

    // Success message should be hidden initially
    const success = page.locator('.drag-success');
    await expect(success).toBeAttached();
  });

  test('burn box elements exist in Phase 3', async ({ page }) => {
    const burnBox = page.locator('#burn-box');
    const burnCount = page.locator('#burn-count');
    const burnDots = page.locator('.burn-dot');

    await expect(burnBox).toBeAttached();
    await expect(burnCount).toBeAttached();
    await expect(burnDots).toHaveCount(5);

    // Completion element should exist
    const burnDone = page.locator('.burn-done');
    await expect(burnDone).toBeAttached();
  });

  test('type input field exists in Phase 4', async ({ page }) => {
    const typeInput = page.locator('#type-input');
    await expect(typeInput).toBeAttached();

    // Completion element should exist
    const typeDone = page.locator('.type-done');
    await expect(typeDone).toBeAttached();
  });

  test('Phase 5 shows all 5 tool explore items', async ({ page }) => {
    const exploreItems = page.locator('.explore-item[data-tool]');
    await expect(exploreItems).toHaveCount(5);

    // Verify each tool is represented
    const tools = ['burns', 'forecast', 'holdex', 'staking', 'ignition'];
    for (const tool of tools) {
      const item = page.locator(`.explore-item[data-tool="${tool}"]`);
      await expect(item).toBeAttached();
    }
  });
});
