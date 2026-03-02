// @ts-check
import { test, expect } from '@playwright/test';
import { setupErrorCollector, filterCriticalErrors, gotoWithRetry } from './fixtures.js';

/**
 * Burns Page — Explorer Journey
 *
 * Tests hero, stats, leaderboard tabs, eco-nav, live feed.
 * Each test navigates independently — no cascade on failure.
 * This is fine.
 */

test.setTimeout(30000);

test.describe('Burns Explorer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithRetry(page, '/burns.html');
  });

  test('burns page loads with hero and stats visible', async ({ page }) => {
    const errors = setupErrorCollector(page);

    const hero = page.locator('.burns-hero');
    await expect(hero).toBeVisible();

    const megaStat = page.locator('.mega-stat');
    await expect(megaStat).toBeVisible();

    const statsSection = page.locator('.stats-section');
    await expect(statsSection).toBeVisible();

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('leaderboard tabs switch periods', async ({ page }) => {
    const tabs = page.locator('.tab-btn[data-period]');
    await expect(tabs).toHaveCount(3);

    // "All Time" should be active by default
    const allTab = page.locator('.tab-btn[data-period="all"]');
    await expect(allTab).toHaveClass(/active/);

    // Click "This Cycle" tab
    const cycleTab = page.locator('.tab-btn[data-period="cycle"]');
    await cycleTab.click();
    await expect(cycleTab).toHaveClass(/active/);

    // "All Time" should no longer be active
    await expect(allTab).not.toHaveClass(/active/);

    // Click "This Week" tab
    const weeklyTab = page.locator('.tab-btn[data-period="weekly"]');
    await weeklyTab.click();
    await expect(weeklyTab).toHaveClass(/active/);

    // Verify exactly one active tab
    const activeTab = page.locator('.tab-btn.active');
    await expect(activeTab).toHaveCount(1);
    await expect(activeTab).toHaveAttribute('data-period', 'weekly');
  });

  test('eco-nav links navigate to other tools', async ({ page }) => {
    const ecoLinks = page.locator('.eco-nav-link');
    const count = await ecoLinks.count();
    expect(count).toBe(5);

    // Burns should be marked active
    const activeBurns = page.locator('.eco-nav-link.active');
    await expect(activeBurns).toHaveText(/Burns/);

    // Other tools should link correctly
    const forecastLink = page.locator('.eco-nav-link[href="/forecast"]');
    await expect(forecastLink).toBeVisible();

    const holdexLink = page.locator('.eco-nav-link[href="/holdex"]');
    await expect(holdexLink).toBeVisible();
  });

  test('live feed container has ARIA log role', async ({ page }) => {
    const feed = page.locator('#burns-feed');
    await expect(feed).toBeAttached();
    await expect(feed).toHaveAttribute('role', 'log');
    await expect(feed).toHaveAttribute('aria-live', 'polite');
  });
});
