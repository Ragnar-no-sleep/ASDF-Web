// @ts-check
import { test, expect } from '@playwright/test';
import {
  setupErrorCollector,
  filterCriticalErrors,
  gotoWithRetry,
  dismissCookieConsent,
  isMobileViewport,
} from './fixtures.js';

/**
 * Hub Landing Page — Navigation Journey
 *
 * Tests orbital view, tool navigation, satellite links, footer nav,
 * and grid view toggle. Mobile viewport auto-switches to grid.
 *
 * Each test navigates independently — no cascade on failure.
 * This is fine.
 */

test.setTimeout(30000);

test.describe('Hub Navigation Journey', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithRetry(page, '/');
    await dismissCookieConsent(page);
  });

  test('hub loads with orbital view visible', async ({ page }) => {
    const errors = setupErrorCollector(page);
    const mobile = isMobileViewport(page);

    if (mobile) {
      // Mobile: grid view forced by CSS
      const grid = page.locator('#hubGridView');
      await expect(grid).toBeVisible();

      const toolCards = grid.locator('.hub-tool-card');
      await expect(toolCards).toHaveCount(5);
    } else {
      const hub = page.locator('#main-hub');
      await expect(hub).toBeVisible();

      const orbitItems = page.locator('.hub-orbit-item');
      await expect(orbitItems).toHaveCount(5);
    }

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('view toggle button and grid structure exist', async ({ page }) => {
    // Toggle button exists in DOM
    const toggle = page.locator('#hubViewToggle');
    await expect(toggle).toBeAttached();

    // Grid view container exists
    const gridView = page.locator('#hubGridView');
    await expect(gridView).toBeAttached();

    // Grid contains tool cards
    const toolCards = gridView.locator('.hub-tool-card');
    const count = await toolCards.count();
    expect(count).toBe(5);
  });

  test('view toggle switches to grid and back', async ({ page }) => {
    const mobile = isMobileViewport(page);
    if (mobile) {
      // Toggle hidden on mobile — grid is forced
      await expect(page.locator('.hub-view-toggle')).not.toBeVisible();
      return;
    }

    const toggle = page.locator('#hubViewToggle');
    await toggle.click();

    await expect(page.locator('#hubGridView')).toHaveClass(/is-active/);
    await expect(page.locator('#main-hub')).toHaveAttribute('data-view', 'grid');

    // Verify localStorage persistence
    const stored = await page.evaluate(() => localStorage.getItem('asdf-hub-view'));
    expect(stored).toBe('grid');

    // Toggle back to orbital
    await toggle.click();
    await expect(page.locator('#hubGridView')).not.toHaveClass(/is-active/);
  });

  test('orbital items navigate to tool pages', async ({ page }) => {
    const mobile = isMobileViewport(page);

    if (mobile) {
      // Grid cards have tool hrefs
      const burnsCard = page.locator('.hub-tool-card[data-tool="burns"]');
      await expect(burnsCard).toBeVisible();
      await expect(burnsCard).toHaveAttribute('href', /burns/);
    } else {
      const burnsLink = page.locator('.hub-orbit-item[data-orbit-id="burns"]');
      await expect(burnsLink).toBeVisible();
      await expect(burnsLink).toHaveAttribute('href', /burns/);
    }
  });

  test('satellite items navigate to content pages', async ({ page }) => {
    const mobile = isMobileViewport(page);

    if (mobile) {
      // Satellites are inside the hidden orbital — check grid footer links instead
      const gridFooter = page.locator('.hub-grid-footer');
      await expect(gridFooter).toBeAttached();
    } else {
      // Satellites may be opacity:0 without achievements — use toBeAttached
      const learnSat = page.locator('.hub-satellite[data-sat="learn"]');
      await expect(learnSat).toBeAttached();
      await expect(learnSat).toHaveAttribute('href', /story|learn/);

      const buildSat = page.locator('.hub-satellite[data-sat="build"]');
      await expect(buildSat).toBeAttached();

      const gamesSat = page.locator('.hub-satellite[data-sat="games"]');
      await expect(gamesSat).toBeAttached();
    }
  });

  test('footer navigation links work', async ({ page }) => {
    const mobile = isMobileViewport(page);

    if (mobile) {
      // Mobile uses grid footer
      const gridFooter = page.locator('.hub-grid-footer');
      await expect(gridFooter).toBeAttached();
    } else {
      const footerNav = page.locator('.hub-footer-nav');
      await expect(footerNav).toBeVisible();

      const footerLinks = footerNav.locator('a');
      const count = await footerLinks.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
