const { chromium } = require('playwright');

(async () => {
  console.log('Starting Aggressive Playwright test for Space Shooter...');
  const browser = await chromium.launch({ headless: false, slowMo: 100 }); 
  const page = await browser.newPage();
  
  // Capture everything
  page.on('console', msg => console.log(`BROWSER [${msg.type().toUpperCase()}]: ${msg.text()}`));
  page.on('pageerror', error => console.log(`BROWSER [EXCEPTION]: ${error.stack}`));

  try {
    console.log('Navigating to http://localhost:5173/games.html...');
    await page.goto('http://localhost:5173/games.html', { waitUntil: 'networkidle', timeout: 60000 });

    await page.waitForTimeout(2000);

    console.log('Trying to find Space Shooter button via JS execution...');
    const result = await page.evaluate(() => {
        const btn = document.querySelector('button[data-game="spaceshooter"]');
        if (btn) {
            btn.click();
            return 'Button clicked via JS';
        }
        return 'Button not found via JS';
    });
    console.log('Action result:', result);

    await page.waitForTimeout(1000);

    console.log('Trying to find START GAME button via JS execution...');
    const startResult = await page.evaluate(() => {
        const btn = document.querySelector('button[data-action="start-game"][data-game="spaceshooter"]');
        if (btn) {
            btn.click();
            return 'Start button clicked via JS';
        }
        return 'Start button not found via JS';
    });
    console.log('Action result:', startResult);

    console.log('Watch the window! Running for 20 seconds...');
    await page.waitForTimeout(20000);

  } catch (err) {
    console.error('Test execution error:', err.message);
  } finally {
    await browser.close();
    console.log('Test finished.');
  }
})();
