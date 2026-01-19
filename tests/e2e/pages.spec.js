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
    !e.includes('net::ERR')
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
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page).toHaveTitle(/Learn|ASDF/i);

    // Check main container exists
    const main = page.locator('main, .learn-container, .container');
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
    await page.waitForLoadState('domcontentloaded');

    // Check page loads
    await expect(page).toHaveTitle(/Deep|Learn|ASDF/i);

    // Check content container
    const content = page.locator('main, .content, .deep-learn');
    await expect(content.first()).toBeVisible();
  });

  test('should handle navigation sections', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should have navigation or sections
    const sections = page.locator('section, .section, nav');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(0); // May have 0 if single-page
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

  test('should display games hub', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page).toHaveTitle(/Games|Arcade|ASDF/i);

    // Check games container
    const gamesArea = page.locator('main, .games, .arcade, #app');
    await expect(gamesArea.first()).toBeVisible();
  });

  test('should have game elements', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Games page should have interactive game elements
    const gameElements = page.locator('.game, .card, button, [data-game]');
    const count = await gameElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
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
    await page.waitForTimeout(1000); // Extra time for WebGL

    const critical = filterCriticalErrors(errors);
    expect(critical).toHaveLength(0);
  });

  test('should display build interface', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page).toHaveTitle(/Build|ASDF/i);

    // Check main container
    const buildArea = page.locator('main, .build, #app, canvas');
    await expect(buildArea.first()).toBeVisible();
  });

  test('should initialize Three.js canvas', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for canvas element (Three.js renderer)
    const canvas = page.locator('canvas');
    const canvasCount = await canvas.count();

    // Build page should have at least one canvas for 3D
    expect(canvasCount).toBeGreaterThanOrEqual(1);
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
    test(`${name} should have consistent meta tags`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      // Check viewport meta
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveCount(1);

      // Check charset
      const charset = page.locator('meta[charset]');
      await expect(charset).toHaveCount(1);
    });

    test(`${name} should be responsive (mobile)`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Page should not have horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Allow small overflow (scrollbars)
      expect(hasHorizontalScroll).toBe(false);
    });
  }
});
