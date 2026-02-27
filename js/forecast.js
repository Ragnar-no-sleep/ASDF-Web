/**
 * ASDForecast - Prediction Market JavaScript
 * Connects to sollama58/ASDForecast API
 *
 * Real endpoints (asdforecast.onrender.com):
 *   GET /api/state?user={pubkey} — full game state (market, leaderboard, history, msUntilClose)
 *   GET /api/wallet              — price data (solPriceUsd, tokenPriceUsd)
 *
 * All game data comes from a single /api/state call.
 * Removed phantom endpoints: /stats, /leaderboard, /frames/history, /frame/current
 */

'use strict';

import { AudioFeedback } from './utils/audio-feedback.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { formatWallet } from './utils/format.js';

const API_BASE = ASDF_ENDPOINTS.forecast;

function esc(s) {
  if (typeof s !== 'string') return String(s ?? '');
  return s.replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
}

// ============================================
// STATE
// ============================================

const state = {
  wallet: null,
  balance: 0,
  selectedDirection: null,
  msUntilClose: 0,
};

// ============================================
// FORMAT UTILS
// Forecast-specific — semantically different from format.js:
//   formatCompact  → K/M suffix, no $ (SOL amounts)
//   formatTime     → MM:SS countdown display
//   formatTimeAgo  → ISO timestamp → relative ("2m ago")
// ============================================

function formatCompact(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toLocaleString();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Local: ISO timestamp variant — format.js expects Unix ms, API returns ISO strings
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================
// API CALLS
// ============================================

async function fetchState(userPubkey = null) {
  try {
    const url = userPubkey
      ? `${API_BASE}/api/state?user=${encodeURIComponent(userPubkey)}`
      : `${API_BASE}/api/state`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.error('[Forecast] Error fetching state:', error);
    return null;
  }
}

async function fetchWallet() {
  try {
    const response = await fetch(`${API_BASE}/api/wallet`);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.error('[Forecast] Error fetching wallet data:', error);
    return null;
  }
}

// ============================================
// UI UPDATES
// ============================================

function updateStats(data) {
  if (!data) return;

  const ps = data.platformStats || {};

  const volumeEl = document.getElementById('stat-volume');
  if (volumeEl) {
    volumeEl.textContent =
      ps.totalVolume != null ? formatCompact(ps.totalVolume) + ' SOL' : '\u2014';
    volumeEl.classList.remove('is-loading');
  }

  // framesCompleted — not in /api/state response
  const framesEl = document.getElementById('stat-frames');
  if (framesEl) {
    framesEl.textContent = '\u2014';
    framesEl.classList.remove('is-loading');
  }

  const usersEl = document.getElementById('stat-users');
  if (usersEl) {
    const users = data.uniqueUsers ?? ps.totalLifetimeUsers;
    usersEl.textContent = users != null ? formatCompact(users) : '\u2014';
    usersEl.classList.remove('is-loading');
  }

  // burnedAmount — not in /api/state, would need /api/burn separately
  const burnedEl = document.getElementById('stat-burned');
  if (burnedEl) {
    burnedEl.textContent = '\u2014';
    burnedEl.classList.remove('is-loading');
  }
}

function updateMarquee(stateData, walletData) {
  if (walletData?.solPriceUsd) {
    const solEl = document.getElementById('ticker-sol');
    if (solEl) solEl.textContent = '$' + Number(walletData.solPriceUsd).toFixed(2);
  }

  if (stateData?.currentVolume != null) {
    const volEl = document.getElementById('ticker-volume');
    if (volEl) volEl.textContent = formatCompact(stateData.currentVolume) + ' SOL';
  }
}

function updateLeaderboard(leaderboard) {
  const body = document.getElementById('leaderboard-body');
  if (!body) return;

  if (!leaderboard || leaderboard.length === 0) {
    body.innerHTML = `
      <div class="table-row">
        <span style="grid-column:1/-1;text-align:center;color:var(--white-muted)">
          No predictions yet. Be the first!
        </span>
      </div>`;
    return;
  }

  body.innerHTML = leaderboard
    .slice(0, 10)
    .map(
      (entry, index) => `
      <div class="table-row">
        <span class="rank ${index < 3 ? 'top-' + (index + 1) : ''}">#${index + 1}</span>
        <span class="wallet">${esc(formatWallet(entry.wallet, 4, 4))}</span>
        <span class="winrate">${entry.winRate != null ? (entry.winRate * 100).toFixed(1) + '%' : '\u2014'}</span>
        <span class="total-won">${esc((entry.totalWon?.toFixed(2) ?? '0.00') + ' SOL')}</span>
        <span class="bets-count">${esc(String(entry.totalBets || 0))}</span>
      </div>`
    )
    .join('');
}

function updateHistory(history) {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (!history || history.length === 0) {
    list.innerHTML = `
      <div class="history-item">
        <div class="history-result">?</div>
        <div class="history-details">
          <div class="history-frame">No frames yet</div>
          <div class="history-time">Waiting for first prediction...</div>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = history
    .slice(0, 10)
    .map(frame => {
      const isUp = String(frame.result).toLowerCase() === 'up';
      const timestamp = frame.resolvedAt ?? frame.endTime ?? null;
      return `
      <div class="history-item">
        <div class="history-result ${isUp ? 'win' : 'loss'}">${isUp ? '+' : '-'}</div>
        <div class="history-details">
          <div class="history-frame">Frame #${esc(String(frame.frameId ?? '?'))}</div>
          <div class="history-time">${esc(timestamp ? formatTimeAgo(timestamp) : '?')}</div>
        </div>
        <div class="history-amount">
          <div class="history-bet">${esc((frame.totalVolume?.toFixed(2) ?? '0.00') + ' SOL total')}</div>
          <div class="history-payout ${isUp ? 'positive' : 'negative'}">${isUp ? 'UP' : 'DOWN'}</div>
        </div>
      </div>`;
    })
    .join('');
}

function updateOdds(market) {
  const upEl = document.getElementById('odds-up');
  const downEl = document.getElementById('odds-down');

  if (!market) {
    if (upEl) upEl.textContent = 'multiplier: --';
    if (downEl) downEl.textContent = 'multiplier: --';
    return;
  }

  // Binary AMM: payout = (opposing shares / own shares) * 0.94
  const sharesUp = market.sharesUp || 50;
  const sharesDown = market.sharesDown || 50;
  const oddsUp = (sharesDown / sharesUp * 0.94).toFixed(2);
  const oddsDown = (sharesUp / sharesDown * 0.94).toFixed(2);

  if (upEl) upEl.textContent = `multiplier: ${oddsUp}x`;
  if (downEl) downEl.textContent = `multiplier: ${oddsDown}x`;
}

let _countdownTimer = null;

function startCountdown(msUntilClose) {
  if (_countdownTimer) {
    clearInterval(_countdownTimer);
    _countdownTimer = null;
  }

  state.msUntilClose = msUntilClose;
  const el = document.getElementById('countdown');
  if (!el) return;

  el.textContent = formatTime(Math.floor(state.msUntilClose / 1000));

  _countdownTimer = setInterval(() => {
    state.msUntilClose = Math.max(0, state.msUntilClose - 1000);
    el.textContent = formatTime(Math.floor(state.msUntilClose / 1000));
    if (state.msUntilClose <= 0) {
      clearInterval(_countdownTimer);
      _countdownTimer = null;
    }
  }, 1000);

  PageLifecycle.registerTimer('forecast-countdown', _countdownTimer);
}

function updateFromState(data) {
  if (!data) return;

  updateStats(data);
  updateLeaderboard(data.leaderboard);
  updateHistory(data.history);
  updateOdds(data.market);

  if (data.msUntilClose != null) {
    startCountdown(data.msUntilClose);
  }
}

// ============================================
// WALLET CONNECTION
// ============================================

async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      window.showNotice('Wallet required — install Phantom to use ASDForecast');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    const resp = await window.solana.connect();
    state.wallet = resp.publicKey.toString();

    const btn = document.getElementById('connect-wallet');
    if (btn) {
      btn.textContent = formatWallet(state.wallet, 4, 4);
      btn.classList.add('connected');
    }

    const predictBtn = document.getElementById('btn-predict');
    if (predictBtn) {
      predictBtn.disabled = false;
      predictBtn.textContent = 'Select UP or DOWN';
    }

    // Refresh state with user pubkey to get activePosition
    const data = await fetchState(state.wallet);
    updateFromState(data);
  } catch (error) {
    console.error('[Forecast] Wallet connection error:', error);
  }
}

// ============================================
// PREDICTION HANDLING
// ============================================

function selectDirection(direction) {
  state.selectedDirection = direction;
  AudioFeedback.play('click');

  document.querySelectorAll('.prediction-btn').forEach(btn => btn.classList.remove('selected'));
  const selectedBtn = document.getElementById(`btn-${direction}`);
  if (selectedBtn) selectedBtn.classList.add('selected');

  const predictBtn = document.getElementById('btn-predict');
  if (predictBtn && state.wallet) {
    predictBtn.disabled = false;
    predictBtn.textContent = `Predict ${direction.toUpperCase()}`;
  }
}

function setAmount(amount) {
  const input = document.getElementById('bet-amount');
  if (!input) return;
  input.value = amount === 'max' ? state.balance : amount;
}

async function submitPrediction() {
  if (!state.wallet || !state.selectedDirection) return;

  const amount = parseFloat(document.getElementById('bet-amount').value);
  if (!amount || amount <= 0) {
    window.showNotice('Invalid amount — enter a positive value.');
    return;
  }

  // Wallet transaction required — pending Solana web3.js integration (POST /api/verify-bet)
  window.showNotice('Prediction submission requires a wallet transaction — feature in development.');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  const connectBtn = document.getElementById('connect-wallet');
  if (connectBtn) connectBtn.addEventListener('click', connectWallet);

  const upBtn = document.getElementById('btn-up');
  const downBtn = document.getElementById('btn-down');
  if (upBtn) upBtn.addEventListener('click', () => selectDirection('up'));
  if (downBtn) downBtn.addEventListener('click', () => selectDirection('down'));

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setAmount(btn.dataset.amount));
  });

  const predictBtn = document.getElementById('btn-predict');
  if (predictBtn) predictBtn.addEventListener('click', submitPrediction);
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  AudioFeedback.init();
  setupEventListeners();

  const [data, walletData] = await Promise.all([fetchState(), fetchWallet()]);

  updateFromState(data);
  updateMarquee(data, walletData);

  // Active prediction market — poll state every 10s
  PageLifecycle.registerTimer(
    'forecast-state',
    setInterval(async () => {
      const data = await fetchState(state.wallet || null);
      updateFromState(data);
    }, 10000)
  );

  // Price refresh every 30s
  PageLifecycle.registerTimer(
    'forecast-wallet',
    setInterval(async () => {
      const [data, walletData] = await Promise.all([fetchState(), fetchWallet()]);
      updateMarquee(data, walletData);
    }, 30000)
  );
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
