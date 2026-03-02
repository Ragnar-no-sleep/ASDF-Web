// @ts-check
import { test, expect } from '@playwright/test';
import {
  setupErrorCollector,
  filterCriticalErrors,
  gotoWithRetry,
  dismissCookieConsent,
} from './fixtures.js';

/**
 * Hub Landing Page — Navigation Journey
 *
 * Tests orbital view, tool navigation, satellite links, footer nav,
 * and grid view toggle.
 *
 * Uses a shared page (single load) to stay within rate limits.
 * This is fine.
 */

test.setTimeout(30000);

test.describe('Hub Navigation Journey', () => {
  test.describe.configure({ mode: 'serial' });

  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await gotoWithRetry(page, '/');
    await dismissCookieConsent(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('hub loads with orbital view visible', async () => {
    const errors = setupErrorCollector(page);

    const hub = page.locator('#main-hub');
    await expect(hub).toBeVisible();

    // Orbital items should be present
    const orbitItems = page.locator('.hub-orbit-item');
    await expect(orbitItems).toHaveCount(5);

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('view toggle button and grid structure exist', async () => {
    // Toggle button exists
    const toggle = page.locator('#hubViewToggle');
    await expect(toggle).toBeAttached();

    // Grid view container exists (hidden by default)
    const gridView = page.locator('#hubGridView');
    await expect(gridView).toBeAttached();

    // Grid contains tool cards
    const toolCards = gridView.locator('.hub-tool-card');
    const count = await toolCards.count();
    expect(count).toBe(5);
  });

  test('view toggle switches to grid and back', async () => {
    const toggle = page.locator('#hubViewToggle');
    await toggle.click();

    await expect(page.locator('#hubGridView')).toHaveClass(/is-active/);
    await expect(page.locator('#main-hub')).toHaveAttribute('data-view', 'grid');

    // Verify localStorage persistence
    const stored = await page.evaluate(() => localStorage.getItem('asdf-hub-view'));
    expect(stored).toBe('grid');

    // Toggle back to orbital for remaining tests
    await toggle.click();
    await expect(page.locator('#hubGridView')).not.toHaveClass(/is-active/);
  });

  test('orbital items navigate to tool pages', async () => {
    const burnsLink = page.locator('.hub-orbit-item[data-orbit-id="burns"]');
    await expect(burnsLink).toBeVisible();
    await expect(burnsLink).toHaveAttribute('href', /burns/);
  });

  test('satellite items navigate to content pages', async () => {
    const learnSat = page.locator('.hub-satellite[data-sat="learn"]');
    await expect(learnSat).toBeVisible();
    await expect(learnSat).toHaveAttribute('href', /story|learn/);

    const buildSat = page.locator('.hub-satellite[data-sat="build"]');
    await expect(buildSat).toBeVisible();

    const gamesSat = page.locator('.hub-satellite[data-sat="games"]');
    await expect(gamesSat).toBeVisible();
  });

  test('footer navigation links work', async () => {
    const footerNav = page.locator('.hub-footer-nav');
    await expect(footerNav).toBeVisible();

    const footerLinks = footerNav.locator('a');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
