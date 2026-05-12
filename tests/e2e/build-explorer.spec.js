// @ts-check
import { test, expect } from '@playwright/test';
import { setupErrorCollector, filterCriticalErrors, gotoWithRetry } from './fixtures.js';

/**
 * Build Page — Explorer Journey
 *
 * Tests Yggdrasil tree, node statuses, SVG fallback, propose CTA.
 * Each test navigates independently — no cascade on failure.
 * This is fine.
 */

test.setTimeout(30000);

test.describe('Build Explorer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithRetry(page, '/build.html');
  });

  test('build page loads without critical errors', async ({ page }) => {
    const errors = setupErrorCollector(page);

    // Cosmos container should be visible
    const cosmos = page.locator('#yggdrasil-cosmos');
    await expect(cosmos).toBeVisible();

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('tree nodes are visible with data-project attributes', async ({ page }) => {
    const treeNodes = page.locator('.tree-node[data-project]');
    const count = await treeNodes.count();
    expect(count).toBeGreaterThan(0);

    // Verify specific projects exist
    const projects = ['burn-tracker', 'forecast', 'holdex', 'learn-platform', 'games-platform'];
    for (const project of projects) {
      const node = page.locator(`.tree-node[data-project="${project}"]`);
      await expect(node).toBeAttached();
    }
  });

  test('tree nodes have correct status indicators', async ({ page }) => {
    const liveNodes = page.locator('.tree-node[data-status="live"]');
    const liveCount = await liveNodes.count();
    expect(liveCount).toBeGreaterThan(0);

    const buildingNodes = page.locator('.tree-node[data-status="building"]');
    const buildingCount = await buildingNodes.count();
    expect(buildingCount).toBeGreaterThan(0);

    const plannedNodes = page.locator('.tree-node[data-status="planned"]');
    const plannedCount = await plannedNodes.count();
    expect(plannedCount).toBeGreaterThan(0);
  });

  test('SVG fallback tree section exists', async ({ page }) => {
    const fallback = page.locator('#yggdrasil-svg-fallback.tree-section');
    await expect(fallback).toBeAttached();
  });

  test('propose CTA button exists and links correctly', async ({ page }) => {
    const proposeBtn = page.locator('.btn-propose');
    await expect(proposeBtn).toBeAttached();
    await expect(proposeBtn).toHaveAttribute('href', /github\.com/);
    await expect(proposeBtn).toHaveAttribute('target', '_blank');
  });
});
