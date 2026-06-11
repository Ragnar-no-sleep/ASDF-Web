const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test for Burn Runner...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`BROWSER [${msg.type().toUpperCase()}]: ${msg.text()}`);
    }
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    console.log(`BROWSER [EXCEPTION]: ${error.stack}`);
  });

  try {
    console.log('Navigating to http://localhost:5173/games.html...');
    await page.goto('http://localhost:5173/games.html', { waitUntil: 'networkidle' });

    console.log('Waiting for Burn Runner button...');
    const burnRunnerBtn = page.locator('button[data-action="open-game"][data-game="burnrunner"]');
    
    console.log('Clicking to open modal...');
    await burnRunnerBtn.click({ force: true });

    console.log('Waiting for START GAME button...');
    const startBtn = page.locator('button[data-action="start-game"][data-game="burnrunner"]');
    
    console.log('Clicking START GAME...');
    await startBtn.click({ force: true });

    console.log('Waiting for game loop to run (2 seconds)...');
    await page.waitForTimeout(2000);

    console.log('Evaluating canvas state...');
    const canvasData = await page.evaluate(() => {
      const canvas = document.getElementById('br-canvas');
      if (!canvas) return { error: 'Canvas not found in DOM' };
      
      return {
        width: canvas.width,
        height: canvas.height,
        cssWidth: canvas.style.width,
        cssHeight: canvas.style.height,
        parentWidth: canvas.parentElement ? canvas.parentElement.clientWidth : null,
        parentHeight: canvas.parentElement ? canvas.parentElement.clientHeight : null,
      };
    });

    console.log('Canvas State:', canvasData);

  } catch (err) {
    console.error('Test execution error:', err.message);
  } finally {
    await browser.close();
    console.log('Test finished.');
  }
})();
