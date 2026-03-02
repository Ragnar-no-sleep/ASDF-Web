// @ts-check
import { test, expect } from '@playwright/test';
import {
  setupErrorCollector,
  filterCriticalErrors,
  gotoWithRetry,
  dismissCookieConsent,
} from './fixtures.js';

/**
 * Games Page — Arcade Journey
 *
 * Tests hub navigation, arcade card nav, game grid, settings, wallet, profile.
 * Note: .nav-tabs are display:none — arcade cards are the primary navigation.
 * Note: data-hub-back buttons exist only in settings/shop/profile (not games).
 * Uses a shared page (single load) to stay within rate limits.
 * This is fine.
 */

test.setTimeout(30000);

test.describe('Games Arcade Journey', () => {
  test.describe.configure({ mode: 'serial' });

  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await gotoWithRetry(page, '/games.html');
    await dismissCookieConsent(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('games page loads with hub section visible', async () => {
    const errors = setupErrorCollector(page);

    const hubSection = page.locator('#hub-section');
    await expect(hubSection).toBeVisible();

    // Arcade cards should be present
    const arcadeCards = page.locator('.arcade-card');
    const count = await arcadeCards.count();
    expect(count).toBeGreaterThan(0);

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('wallet button exists', async () => {
    const walletBtn = page.locator('#wallet-btn');
    await expect(walletBtn).toBeAttached();
    await expect(walletBtn).toHaveAttribute('aria-label', /wallet/i);
  });

  test('arcade cards navigate to games view', async () => {
    const gamesCard = page.locator('.arcade-card[data-hub-view="games"]');
    await expect(gamesCard).toBeVisible();
    await gamesCard.click();

    // Games grid should become visible
    const gamesGrid = page.locator('#games-grid');
    await expect(gamesGrid).toBeVisible({ timeout: 5000 });

    // Navigate back to hub for next tests
    await page.evaluate(() => {
      if (window.Hub && typeof window.Hub.navigateTo === 'function') {
        window.Hub.navigateTo('hub');
      }
    });
    await expect(page.locator('#hub-section')).toBeVisible({
      timeout: 5000,
    });
  });

  test('settings back-to-hub button works', async () => {
    // Navigate to settings via arcade card
    await page.locator('.arcade-card[data-hub-view="settings"]').click();

    // Back button should be visible in settings
    const backBtn = page.locator('#settings-section [data-hub-back]');
    await expect(backBtn).toBeVisible({ timeout: 5000 });

    // Click back
    await backBtn.click();

    // Hub should be visible again
    await expect(page.locator('#hub-section')).toBeVisible({
      timeout: 5000,
    });
  });

  test('settings toggles are interactive', async () => {
    // Navigate to settings
    await page.locator('.arcade-card[data-hub-view="settings"]').click();

    // Find a toggle switch
    const toggle = page.locator('.toggle-switch[data-setting]').first();
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // Get initial state
    const initialState = await toggle.getAttribute('aria-checked');

    // Click to toggle
    await toggle.click();

    // State should change
    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);

    // Return to hub
    await page.locator('#settings-section [data-hub-back]').click();
    await expect(page.locator('#hub-section')).toBeVisible({
      timeout: 5000,
    });
  });

  test('profile section shows stats structure', async () => {
    // Navigate to profile via arcade card
    await page.locator('.arcade-card[data-hub-view="profile"]').click();

    const statsGrid = page.locator('#profile-stats-grid');
    await expect(statsGrid).toBeAttached();

    const achievementsGrid = page.locator('#achievements-grid');
    await expect(achievementsGrid).toBeAttached();
  });
});
