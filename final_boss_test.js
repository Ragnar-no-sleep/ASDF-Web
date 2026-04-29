import { chromium } from 'playwright';

(async () => {
  console.log('🕵️ ANALYSE LIVE DE L\'ORCHESTRATEUR...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let engineReady = false;
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[BROWSER] ${text}`);
    if (text.includes('Game Lifecycle Ready')) engineReady = true;
  });

  try {
    console.log('🌐 Accès au Hub...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Attente du chargement dynamique (max 10s)
    let attempts = 0;
    while (!engineReady && attempts < 10) {
        await page.waitForTimeout(1000);
        attempts++;
    }

    if (engineReady) {
        console.log('✅ MOTEUR DÉTECTÉ ! Tentative de lancement...');
        // On ouvre Pump Arena
        await page.evaluate(() => {
            if (window.openGame) window.openGame('pumparena');
            else console.log('ERROR: openGame not found even with engine ready');
        });
        await page.waitForTimeout(1000);

        // On vérifie si l'overlay orange est visible
        const isVisible = await page.isVisible('#overlay-pumparena');
        console.log(`🔸 Overlay orange visible : ${isVisible}`);

        // On clique sur START
        const startBtn = page.locator('#modal-pumparena [data-action="start-game"]').first();
        if (await startBtn.isVisible()) {
            await startBtn.click();
            console.log('🖱️ START cliqué.');
            await page.waitForTimeout(2000);
            
            const isHidden = await page.evaluate(() => {
                const ov = document.getElementById('overlay-pumparena');
                return ov ? ov.classList.contains('hidden') : 'no overlay';
            });
            console.log(`🔹 Verdict : L'overlay est-il caché ? ${isHidden}`);
        } else {
            console.log('❌ Bouton START introuvable.');
        }
    } else {
        console.log('❌ ÉCHEC : Le moteur n\'a jamais répondu (Pas de "Ready" log).');
    }

  } catch (e) {
    console.error('💥 Crash :', e.message);
  } finally {
    await browser.close();
  }
})();
