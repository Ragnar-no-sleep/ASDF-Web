import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('🎮 DÉMARRAGE DU TEST EN CONDITIONS RÉELLES...');
  
  const proofDir = './test-proofs';
  if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Capture de la console pour voir si le moteur râle
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`🔴 [BROWSER ERROR] ${msg.text()}`);
    else if (msg.text().includes('[PumpArena]')) console.log(`🟢 [GAME LOG] ${msg.text()}`);
  });

  try {
    // 1. Accès au Hub
    console.log('🌐 Chargement du Hub...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${proofDir}/01-hub-loaded.png` });

    // 2. Ouverture de Pump Arena
    console.log('📂 Ouverture de Pump Arena...');
    await page.evaluate(() => {
        if (window.openGame) window.openGame('pumparena');
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${proofDir}/02-modal-opened.png` });

    // 3. Clic sur START
    console.log('🖱️ Clic sur le bouton START...');
    const startBtn = page.locator('#modal-pumparena [data-action="start-game"]').first();
    
    // On vérifie si l'overlay orange est là
    const isOverlayVisible = await page.isVisible('#overlay-pumparena');
    console.log(`🔸 Overlay orange détecté : ${isOverlayVisible}`);

    await startBtn.click();
    console.log('🔥 START cliqué !');
    
    // 4. Attente de la transition
    await page.waitForTimeout(2000);
    
    // 5. VERIFICATION FINALE
    const finalCheck = await page.evaluate(() => {
        const overlay = document.getElementById('overlay-pumparena');
        const canvas = document.getElementById('pa-canvas'); // ID spécifique à PumpArena
        return {
            overlayHidden: overlay ? overlay.classList.contains('hidden') : 'missing',
            canvasVisible: canvas ? (canvas.width > 0) : false,
            activeGames: window.activeGames ? Object.keys(window.activeGames) : []
        };
    });

    console.log('📊 État final du DOM :', JSON.stringify(finalCheck));
    await page.screenshot({ path: `${proofDir}/03-game-running.png` });

    if (finalCheck.overlayHidden === true || finalCheck.overlayHidden === 'missing') {
        console.log('✅ SUCCÈS : Le mur orange est tombé !');
    } else {
        console.log('❌ ÉCHEC : Le mur orange bloque toujours le passage.');
    }

    if (finalCheck.canvasVisible) {
        console.log('🎮 VICTOIRE : Le canvas de jeu est actif et rendu.');
    }

  } catch (e) {
    console.error('💥 Crash pendant le test :', e.message);
  } finally {
    await browser.close();
    console.log(`🏁 Test terminé. Preuves disponibles dans ${path.resolve(proofDir)}`);
  }
})();
