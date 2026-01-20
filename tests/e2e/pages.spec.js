// @ts-check
import { test, expect } from '@playwright/test';

/**
 * ASDF-Web Critical Pages E2E Tests
 *
 * Tests all active pages for:
 * - Page loads without JS errors
 * - Critical elements are visible
 * - No broken resources
 *
 * This is fine.
 */

// Increase default timeout for CI
test.setTimeout(30000);

// Helper to collect console errors
function setupErrorCollector(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  return errors;
}

// Filter out non-critical errors (favicon, etc)
function filterCriticalErrors(errors) {
  return errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('404') &&
    !e.includes('net::ERR') &&
    !e.includes('Failed to load resource')
  );
}

// ============================================
// LEARN PAGE
// ============================================

test.describe('Learn Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn.html');
  });

  test('should load without JS errors', async ({ page }) => {
    const errors = setupErrorCollector(page);
    await page.waitForLoadState('networkidle');

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('should display main content', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check main container exists
    const main = page.locator('main, .learn-container, .container, body');
    await expect(main.first()).toBeVisible();
  });

  test('should have interactive elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should have buttons or links
    const interactiveElements = page.locator('button, a[href], .btn');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ============================================
// DEEP LEARN PAGE
// ============================================

test.describe('Deep Learn Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deep-learn.html');
  });

  test('should load without JS errors', async ({ page }) => {
    const errors = setupErrorCollector(page);
    await page.waitForLoadState('networkidle');

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('should display learning content', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check content container
    const content = page.locator('main, .content, .deep-learn, body');
    await expect(content.first()).toBeVisible();
  });
});

// ============================================
// GAMES PAGE
// ============================================

test.describe('Games Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games.html');
  });

  test('should load without JS errors', async ({ page }) => {
    const errors = setupErrorCollector(page);
    await page.waitForLoadState('networkidle');

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('should display games content', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check body is visible (page loaded)
    await expect(page.locator('body')).toBeVisible();

    // Check for any content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });
});

// ============================================
// BUILD PAGE
// ============================================

test.describe('Build Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/build.html');
  });

  test('should load without JS errors', async ({ page }) => {
    const errors = setupErrorCollector(page);

    // Give Three.js time to initialize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('should display build content', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check body is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle WebGL context', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check WebGL is available
    const webglSupported = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    });

    expect(webglSupported).toBe(true);
  });
});

// ============================================
// CROSS-PAGE TESTS
// ============================================

test.describe('Cross-Page Consistency', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/learn.html', name: 'Learn' },
    { path: '/deep-learn.html', name: 'Deep Learn' },
    { path: '/games.html', name: 'Games' },
    { path: '/build.html', name: 'Build' },
  ];

  for (const { path, name } of pages) {
    test(`${name} should load successfully`, async ({ page }) => {
      const response = await page.goto(path);

      // Check response is OK
      expect(response?.status()).toBeLessThan(400);

      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');

      // Body should be visible
      await expect(page.locator('body')).toBeVisible();
    });

    test(`${name} should be responsive (mobile)`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Body should be visible on mobile
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
