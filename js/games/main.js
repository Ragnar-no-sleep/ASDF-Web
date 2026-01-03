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

    loadState();
    checkDailyReset(); // Check if competitive time should reset for new day
    updateFeaturedGame();
    renderGamesGrid();
    generateGameModals();
    updateCountdown();
    renderLeaderboards(); // Load global leaderboard

    // Update countdown every second
    setInterval(updateCountdown, 1000);

    // Update competitive timers every second
    setInterval(updateAllCompetitiveTimers, 1000);

    // Reconnect wallet if previously connected
    if (appState.wallet) {
        updateWalletUI(appState.wallet);
        updateAccessUI();

        const provider = getPhantomProvider();
        if (provider) {
            provider.connect({ onlyIfTrusted: true })
                .then(response => {
                    const connectedWallet = response.publicKey.toString();
                    if (connectedWallet === appState.wallet) {
                        // SECURITY: Always verify balance on reconnect
                        checkTokenBalance(connectedWallet);
                    } else {
                        // Wallet changed - clear old state and reconnect
                        appState.wallet = connectedWallet;
                        appState.isHolder = false;
                        appState.balance = 0;
                        saveState();
                        updateWalletUI(connectedWallet);
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
            // End any active competitive session
            endCompetitiveSession();
            appState.wallet = null;
            appState.isHolder = false;
            appState.balance = 0;
            // Clear API auth cache on disconnect
            if (typeof ApiClient !== 'undefined' && ApiClient.clearAuthCache) {
                ApiClient.clearAuthCache();
            }
            saveState();
            updateWalletUI(null);
            updateAccessUI();
            renderGamesGrid();
        });

        provider.on('accountChanged', (publicKey) => {
            if (publicKey) {
                const newWallet = publicKey.toString();
                // End competitive session when switching accounts
                endCompetitiveSession();
                appState.wallet = newWallet;
                // SECURITY: Reset holder status until verified
                appState.isHolder = false;
                appState.balance = 0;
                // Clear old auth cache
                if (typeof ApiClient !== 'undefined' && ApiClient.clearAuthCache) {
                    ApiClient.clearAuthCache();
                }
                saveState();
                updateWalletUI(newWallet);
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
document.addEventListener('keydown', (e) => {
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
document.addEventListener('click', (e) => {
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
