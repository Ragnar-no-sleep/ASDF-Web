/**
 * ASDF Games - Main Entry Point
 * Initialization and event listeners
 */

'use strict';

/**
 * Initialize Solana Web3 global
 */
function initSolanaWeb3() {
  if (typeof solanaWeb3 !== 'undefined') {
    window.solanaWeb3 = solanaWeb3;
  }
}

/**
 * Attach all event listeners
 */
function initEventListeners() {
  // Wallet button
  const walletBtn = document.getElementById('wallet-btn');
  if (walletBtn) {
    walletBtn.addEventListener('click', handleWalletClick);
  }

  // Featured game buttons
  const playFeaturedBtn = document.getElementById('play-featured-btn');
  if (playFeaturedBtn) {
    playFeaturedBtn.addEventListener('click', playFeaturedGame);
  }

  const viewAllGamesBtn = document.getElementById('view-all-games-btn');
  if (viewAllGamesBtn) {
    viewAllGamesBtn.addEventListener('click', scrollToGames);
  }

  // Dev mode button
  const devModeBtn = document.getElementById('dev-mode-btn');
  if (devModeBtn) {
    devModeBtn.addEventListener('click', toggleDevMode);
  }

  // Pump Arena RPG buttons
  const pumpClassicBtn = document.getElementById('pump-classic-btn');
  if (pumpClassicBtn) {
    pumpClassicBtn.addEventListener('click', () => openPumpArena('rpg'));
  }

  // Pump Arena modal controls
  const closePumpArenaBtn = document.getElementById('close-pumparena-btn');
  if (closePumpArenaBtn) {
    closePumpArenaBtn.addEventListener('click', () => {
      if (window.closePumpArena) {
        closePumpArena();
      } else {
        closeGame('pumparena');
      }
    });
  }

  const startPumpArenaBtn = document.getElementById('start-pumparena-btn');
  if (startPumpArenaBtn) {
    // Legacy start button - RPG auto-starts now
    startPumpArenaBtn.style.display = 'none';
  }
}

/**
 * Main initialization
 */
function init() {
  initSolanaWeb3();
  initEventListeners();

  // 11/10 Standard: Boot Arcade Kernel 3.0
  if (typeof ASDF !== 'undefined' && ASDF.Kernel) {
    const kernel = ASDF.Kernel;

    // Core Plugins
    if (ASDF.AssetPipeline) kernel.use(ASDF.AssetPipeline);
    if (ASDF.InputHub) kernel.use(ASDF.InputHub);
    if (ASDF.HUDManager) kernel.use(ASDF.HUDManager);

    // Infrastructure Services
    if (window.ApiClient) kernel.registerService('api', window.ApiClient);
    if (window.GameStore) kernel.registerService('storage', window.GameStore);

    console.log('[Main] Kernel 3.0 booted with services:', Object.keys(kernel.services));
  }

  // Initialize game engines coordinator (enables modular engines)
  if (typeof GameEngines !== 'undefined') {
    GameEngines.init();
  }

  // Subscribe to GameStore events for UI reactions
  if (typeof GameEvents !== 'undefined') {
    GameEvents.on('store:wallet-connected', ({ wallet }) => {
      updateWalletUI(wallet);
    });
    GameEvents.on('store:wallet-disconnected', () => {
      updateWalletUI(null);
      updateAccessUI();
      renderGamesGrid();
    });
    GameEvents.on('store:balance-changed', () => {
      updateAccessUI();
      renderGamesGrid();
    });
    GameEvents.on('score:updated', ({ gameId, score }) => {
      const el = document.getElementById(`score-${gameId}`);
      if (el) el.textContent = score;
    });
    GameEvents.on('score:best', ({ gameId, score }) => {
      const el = document.getElementById(`best-${gameId}`);
      if (el) el.textContent = score;
    });
  }

  // Wire CompetitiveUI event subscribers (must be after GameEvents is defined)
  if (typeof CompetitiveUI !== 'undefined') {
    CompetitiveUI.init();
  }

  loadState();
  checkDailyReset(); // Check if competitive time should reset for new day
  updateFeaturedGame();
  renderGamesGrid();
  generateGameModals();
  updateCountdown();
  renderLeaderboards(); // Load global leaderboard

  // Track page-level intervals via IntervalManager for cleanup
  const pageTimers = IntervalManager.create();

  // Update countdown every second
  pageTimers.setInterval(updateCountdown, 1000);

  // Update competitive timers every second
  pageTimers.setInterval(updateAllCompetitiveTimers, 1000);

  // Cleanup on page exit
  window.addEventListener('beforeunload', () => pageTimers.cleanup());

  // Reconnect wallet if previously connected
  if (appState.wallet) {
    updateWalletUI(appState.wallet);
    updateAccessUI();

    const provider = getPhantomProvider();
    if (provider) {
      provider
        .connect({ onlyIfTrusted: true })
        .then(response => {
          const connectedWallet = response.publicKey.toString();
          if (connectedWallet === appState.wallet) {
            // SECURITY: Always verify balance on reconnect
            checkTokenBalance(connectedWallet);
          } else {
            // Wallet changed - clear old state and reconnect
            GameStore.setWallet(connectedWallet);
            GameStore.resetBalance();
            saveState();
            checkTokenBalance(connectedWallet);
          }
        })
        .catch(() => {
          // Expected errors: 4001 (declined), -32002 (pending)
          // Don't clear wallet state - user can still manually reconnect
        });
    }
  }

  // Listen for Phantom events
  const provider = getPhantomProvider();
  if (provider) {
    provider.on('disconnect', () => {
      // Provider already disconnected — just clear state
      GameStore.clearWallet();
      saveState();
    });

    provider.on('accountChanged', publicKey => {
      if (publicKey) {
        const newWallet = publicKey.toString();
        endCompetitiveSession();
        GameStore.setWallet(newWallet);
        GameStore.resetBalance(); // Security: silent reset before async verify
        saveState();
        checkTokenBalance(newWallet);
      } else {
        disconnectWallet();
      }
    });
  }
}

// Run on DOM ready (handle case where DOMContentLoaded already fired for SPA)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already loaded (SPA case), run init directly
  init();
}

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    // Check Pump Arena first
    const pumpModal = document.getElementById('modal-pumparena');
    if (pumpModal && pumpModal.classList.contains('active')) {
      if (window.closePumpArena) {
        closePumpArena();
      }
      return;
    }

    // Then check other games
    GAMES.forEach(game => {
      const modal = document.getElementById(`modal-${game.id}`);
      if (modal && modal.classList.contains('active')) {
        closeGame(game.id);
      }
    });
  }
});

// Event delegation for dynamically generated game buttons
document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const gameId = target.dataset.game;

  switch (action) {
    case 'open-game':
      if (gameId) openGame(gameId);
      break;
    case 'close-game':
      if (gameId) closeGame(gameId);
      break;
    case 'start-game':
      if (gameId) startGame(gameId);
      break;
    case 'restart-game':
      if (gameId) restartGame(gameId);
      break;
    case 'toggle-competitive':
      if (gameId) toggleCompetitive(gameId);
      break;
    case 'show-leaderboard':
      if (gameId) showLeaderboard(gameId);
      break;
    case 'hide-leaderboard':
      if (gameId) hideLeaderboard(gameId);
      break;
  }
});
