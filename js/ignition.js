/**
 * ASDF Ignition Page - JavaScript
 * Solana airdrop platform: dashboard, tabs, countdown, wallet UI
 * API integration points marked with [API] comments
 */

(function () {
  'use strict';

  function showNotice(msg) {
    var el = document.createElement('div');
    el.className = 'error-inline';
    el.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:999;max-width:340px;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 4000);
  }

  // ============================================
  // CONFIG
  // ============================================

  var isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // API endpoint — mirrors ASDF_ENDPOINTS.ignition (see /js/config/endpoints.js)
  var API_BASE = isDev ? '/api' : 'https://alonisthe.dev/ignition';

  // ============================================
  // MOCK DATA
  // ============================================

  var MOCK = {
    pool: {
      balance: 12.847,
      usd: 2441.0,
    },
    countdown: {
      // Next airdrop: 2 days 14h 37m from now (mock)
      target: Date.now() + (2 * 24 * 60 * 60 + 14 * 60 * 60 + 37 * 60) * 1000,
    },
    holdings: {
      sol: '0.000',
      status: '--',
      tokens: '0',
      asdf: '0',
    },
    koth: {
      name: '$PUMP',
      fullName: 'PumpKing Token',
      volume: '$1.2M',
      mcap: '$4.8M',
      holders: '2,847',
      share: '10%',
    },
  };

  // ============================================
  // TAB NAVIGATION
  // ============================================

  var tabs = [];
  var sections = [];

  function initTabs() {
    tabs = Array.prototype.slice.call(document.querySelectorAll('.ig-tab'));
    sections = Array.prototype.slice.call(document.querySelectorAll('.ig-section'));

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(tab.getAttribute('data-section'));
      });
    });
  }

  function switchTab(sectionId) {
    // Update tab active states
    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-section') === sectionId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    // Show/hide sections
    sections.forEach(function (section) {
      var id = section.id.replace('section-', '');
      if (id === sectionId) {
        section.removeAttribute('hidden');
        section.classList.add('ig-section--active');
      } else {
        section.setAttribute('hidden', '');
        section.classList.remove('ig-section--active');
      }
    });
  }

  // ============================================
  // COUNTDOWN TIMER
  // ============================================

  var countdownInterval = null;

  function startCountdown() {
    var target = MOCK.countdown.target;

    function update() {
      var now = Date.now();
      var diff = Math.max(0, target - now);

      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      var secs = Math.floor((diff % (1000 * 60)) / 1000);

      var daysEl = document.getElementById('countdown-days');
      var hoursEl = document.getElementById('countdown-hours');
      var minsEl = document.getElementById('countdown-mins');
      var secsEl = document.getElementById('countdown-secs');

      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);

      if (diff <= 0 && countdownInterval) {
        clearInterval(countdownInterval);
      }
    }

    update();
    countdownInterval = setInterval(update, 1000);
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // ============================================
  // WALLET CONNECTION (UI Only)
  // ============================================

  var walletConnected = false;

  function initWallet() {
    var btn = document.getElementById('wallet-connect');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (walletConnected) {
        disconnectWallet();
      } else {
        connectWallet();
      }
    });
  }

  function connectWallet() {
    // [API] TODO: Integrate actual Solana wallet adapter
    // Check for Phantom, Solflare, Backpack providers
    // window.solana || window.solflare || window.backpack

    var btn = document.getElementById('wallet-connect');
    if (!btn) return;

    // Mock connection UI state
    walletConnected = true;
    btn.classList.add('connected');
    btn.querySelector('.ig-wallet-label').textContent = '7xK2...m9Fq';
    btn.querySelector('.ig-wallet-icon').textContent = '\u2713';

    // Enable form buttons when wallet is connected
    enableFormButtons(true);

    // [API] TODO: Fetch actual holdings after wallet connection
    updateHoldings({
      sol: '2.847',
      status: 'Holder',
      tokens: '3',
      asdf: '145,230',
    });

    console.log('[Ignition] Wallet connected (mock)');
  }

  function disconnectWallet() {
    var btn = document.getElementById('wallet-connect');
    if (!btn) return;

    walletConnected = false;
    btn.classList.remove('connected');
    btn.querySelector('.ig-wallet-label').textContent = 'Connect Wallet';
    btn.querySelector('.ig-wallet-icon').textContent = '\u26AB';

    enableFormButtons(false);

    updateHoldings(MOCK.holdings);

    console.log('[Ignition] Wallet disconnected');
  }

  function enableFormButtons(enabled) {
    var buttons = [
      document.getElementById('launch-token-btn'),
      document.getElementById('register-token-btn'),
      document.getElementById('pags-submit-btn'),
    ];

    buttons.forEach(function (btn) {
      if (btn) btn.disabled = !enabled;
    });
  }

  // ============================================
  // DASHBOARD UPDATES
  // ============================================

  function updateHoldings(data) {
    var sol = document.getElementById('holding-sol');
    var status = document.getElementById('holding-status');
    var tokens = document.getElementById('holding-tokens');
    var asdf = document.getElementById('holding-asdf');

    if (sol) sol.textContent = data.sol;
    if (status) status.textContent = data.status;
    if (tokens) tokens.textContent = data.tokens;
    if (asdf) asdf.textContent = data.asdf;
  }

  function updatePool() {
    // [API] TODO: Fetch pool balance from API
    // fetch(`${API_BASE}/ignition/pool`)
    //   .then(res => res.json())
    //   .then(data => { ... })

    var amountEl = document.querySelector('.ig-pool-amount');
    var usdEl = document.querySelector('.ig-pool-usd');

    if (amountEl) amountEl.textContent = MOCK.pool.balance.toFixed(3);
    if (usdEl) usdEl.textContent = '~ $' + MOCK.pool.usd.toFixed(2) + ' USD';
  }

  function updateKOTH() {
    // [API] TODO: Fetch current KOTH from API
    // fetch(`${API_BASE}/ignition/koth`)
    //   .then(res => res.json())
    //   .then(data => { ... })

    var nameEl = document.getElementById('koth-name');
    var tickerEl = document.getElementById('koth-ticker');
    var volumeEl = document.getElementById('koth-volume');
    var mcapEl = document.getElementById('koth-mcap');
    var holdersEl = document.getElementById('koth-holders');
    var shareEl = document.getElementById('koth-share');

    if (nameEl) nameEl.textContent = MOCK.koth.name;
    if (tickerEl) tickerEl.textContent = MOCK.koth.fullName;
    if (volumeEl) volumeEl.textContent = MOCK.koth.volume;
    if (mcapEl) mcapEl.textContent = MOCK.koth.mcap;
    if (holdersEl) holdersEl.textContent = MOCK.koth.holders;
    if (shareEl) shareEl.textContent = MOCK.koth.share;
  }

  // ============================================
  // FORM HANDLERS (Placeholder)
  // ============================================

  function initForms() {
    // Token Launcher form
    var launcherForm = document.getElementById('launcher-form');
    if (launcherForm) {
      launcherForm.addEventListener('submit', function (e) {
        e.preventDefault();
        // [API] TODO: Submit token launch transaction
        // Requires wallet connection + 0.02 SOL fee
        console.log('[Ignition] Token launch submitted (mock)');
        showNotice('Token launch\u00a0: wallet + int\u00e9gration Solana requise. Prochainement.');
      });
    }

    // Token Registration form
    var registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        // [API] TODO: Verify mint address and register token
        console.log('[Ignition] Token registration submitted (mock)');
        showNotice('Token registration\u00a0: int\u00e9gration API requise. Prochainement.');
      });
    }

    // PAGS form
    var pagsForm = document.getElementById('pags-form');
    if (pagsForm) {
      pagsForm.addEventListener('submit', function (e) {
        e.preventDefault();
        // [API] TODO: Designate Twitter user as fee beneficiary
        console.log('[Ignition] PAGS designation submitted (mock)');
        showNotice('PAGS designation\u00a0: int\u00e9gration API requise. Prochainement.');
      });
    }
  }

  // ============================================
  // LEADERBOARD
  // ============================================

  function fetchLeaderboard() {
    // [API] TODO: Fetch top tokens from API
    // fetch(`${API_BASE}/ignition/leaderboard`)
    //   .then(res => res.json())
    //   .then(data => renderLeaderboard(data))

    // Currently using static HTML mock data
    console.log('[Ignition] Leaderboard loaded (static mock)');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    console.log('[Ignition] Initializing...');

    // Setup tab navigation
    initTabs();

    // Start countdown timer
    startCountdown();

    // Setup wallet connection
    initWallet();

    // Setup form handlers
    initForms();

    // Populate mock data
    updatePool();
    updateKOTH();
    updateHoldings(MOCK.holdings);
    fetchLeaderboard();

    // [API] TODO: Periodic refresh
    // setInterval(updatePool, 30000);
    // setInterval(fetchLeaderboard, 60000);

    console.log('[Ignition] Initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
