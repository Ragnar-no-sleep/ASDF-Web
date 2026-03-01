/**
 * ASDF Ignition - Solana Airdrop Platform JavaScript
 *
 * Backend (sollama58/ignition) not yet deployed.
 * Shell ready — pending endpoints marked with [API] comments.
 *
 * Expected endpoints (when available):
 *   GET /ignition/pool          — { balance, usd }
 *   GET /ignition/koth          — { name, fullName, volume, mcap, holders, share, history[] }
 *   GET /ignition/leaderboard   — { tokens[{ rank, token, volume, mcap, multiplier }] }
 *   GET /ignition/robinhood     — { partners[{ name, creator, feesSol, status }] }
 *   GET /ignition/pags          — { designations[{ handle, wallet, earned }] }
 *   GET /ignition/airdrop-schedule — { nextAirdropMs }
 *   GET /ignition/holdings?wallet= — { sol, status, tokens, asdf }
 */

'use strict';

import { AudioFeedback } from './utils/audio-feedback.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { formatWallet } from './utils/format.js';
import { ANIMATION, TIME_MS } from './config/timing.js';

// API_BASE ready for when backend is deployed
// eslint-disable-next-line no-unused-vars
const API_BASE = ASDF_ENDPOINTS.ignition;

// ============================================
// STATE
// ============================================

const state = {
  wallet: null,
};

// ============================================
// TAB NAVIGATION
// ============================================

function initTabs() {
  const tabs = Array.from(document.querySelectorAll('.ig-tab'));
  const sections = Array.from(document.querySelectorAll('.ig-section'));

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      AudioFeedback.play('click');
      const sectionId = tab.getAttribute('data-section');

      tabs.forEach(t => {
        const isActive = t.getAttribute('data-section') === sectionId;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });

      sections.forEach(section => {
        const id = section.id.replace('section-', '');
        if (id === sectionId) {
          section.removeAttribute('hidden');
          section.classList.add('ig-section--active');
        } else {
          section.setAttribute('hidden', '');
          section.classList.remove('ig-section--active');
        }
      });
    });
  });
}

// ============================================
// COUNTDOWN
// ============================================

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function startCountdown(targetMs) {
  const ids = ['countdown-days', 'countdown-hours', 'countdown-mins', 'countdown-secs'];
  const els = ids.map(id => document.getElementById(id));

  if (!targetMs) {
    // [API] No target until backend provides real airdrop schedule
    els.forEach(el => {
      if (el) el.textContent = '--';
    });
    return;
  }

  function tick() {
    const diff = Math.max(0, targetMs - Date.now());
    const [dEl, hEl, mEl, sEl] = els;

    if (dEl) dEl.textContent = pad(Math.floor(diff / TIME_MS.DAY));
    if (hEl) hEl.textContent = pad(Math.floor((diff % TIME_MS.DAY) / TIME_MS.HOUR));
    if (mEl) mEl.textContent = pad(Math.floor((diff % TIME_MS.HOUR) / TIME_MS.MINUTE));
    if (sEl) sEl.textContent = pad(Math.floor((diff % TIME_MS.MINUTE) / TIME_MS.SECOND));

    if (diff <= 0)
      els.forEach(el => {
        if (el) el.textContent = '00';
      });
  }

  tick();
  const timer = setInterval(() => {
    if (Date.now() >= targetMs) {
      clearInterval(timer);
      els.forEach(el => {
        if (el) el.textContent = '00';
      });
      return;
    }
    tick();
  }, ANIMATION.TICK);

  PageLifecycle.registerTimer('ignition-countdown', timer);
}

// ============================================
// WALLET CONNECTION
// ============================================

async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      window.showNotice('Wallet required — install Phantom to use Ignition');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    const resp = await window.solana.connect();
    state.wallet = resp.publicKey.toString();

    const btn = document.getElementById('wallet-connect');
    if (btn) {
      btn.classList.add('connected');
      btn.querySelector('.ig-wallet-label').textContent = formatWallet(state.wallet, 4, 4);
      btn.querySelector('.ig-wallet-icon').textContent = '\u2713';
    }

    enableFormButtons(true);

    // [API] TODO: GET /ignition/holdings?wallet={pubkey}
    updateHoldings({ sol: '\u2014', status: '\u2014', tokens: '\u2014', asdf: '\u2014' });
  } catch (error) {
    console.error('[Ignition] Wallet connection error:', error);
  }
}

function disconnectWallet() {
  state.wallet = null;

  const btn = document.getElementById('wallet-connect');
  if (btn) {
    btn.classList.remove('connected');
    btn.querySelector('.ig-wallet-label').textContent = 'Connect Wallet';
    btn.querySelector('.ig-wallet-icon').textContent = '\u26AB';
  }

  enableFormButtons(false);
  updateHoldings({ sol: '\u2014', status: '\u2014', tokens: '\u2014', asdf: '\u2014' });
}

function initWallet() {
  const btn = document.getElementById('wallet-connect');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (state.wallet) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  });
}

function enableFormButtons(enabled) {
  ['launch-token-btn', 'register-token-btn', 'pags-submit-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

// ============================================
// PENDING STATE RENDERERS
// ============================================

function updateHoldings(data) {
  const map = {
    'holding-sol': data.sol,
    'holding-status': data.status,
    'holding-tokens': data.tokens,
    'holding-asdf': data.asdf,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

function showPoolPending() {
  // [API] TODO: GET /ignition/pool
  const amountEl = document.querySelector('.ig-pool-amount');
  const usdEl = document.querySelector('.ig-pool-usd');
  if (amountEl) amountEl.textContent = '\u2014';
  if (usdEl) usdEl.textContent = 'Endpoint pending';
}

function showKothPending() {
  // [API] TODO: GET /ignition/koth
  const fields = {
    'koth-name': '\u2014',
    'koth-ticker': '\u2014',
    'koth-volume': '\u2014',
    'koth-mcap': '\u2014',
    'koth-holders': '\u2014',
    'koth-share': '\u2014',
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const historyEl = document.getElementById('koth-history');
  if (historyEl) {
    historyEl.innerHTML =
      '<div class="ig-koth-row" style="color:var(--white-muted)">History endpoint pending</div>';
  }
}

function showLeaderboardPending() {
  // [API] TODO: GET /ignition/leaderboard
  const body = document.getElementById('leaderboard-body');
  if (body) {
    body.innerHTML = `
      <div class="ig-table-row" style="color:var(--white-muted);grid-column:1/-1;text-align:center;padding:24px">
        Leaderboard endpoint pending
      </div>`;
  }
}

function showRobinhoodPending() {
  // [API] TODO: GET /ignition/robinhood
  const list = document.getElementById('robinhood-list');
  if (list) {
    list.innerHTML = `
      <div style="color:var(--white-muted);padding:24px;text-align:center">
        Robinhood endpoint pending
      </div>`;
  }
}

function showPagsPending() {
  // [API] TODO: GET /ignition/pags
  const list = document.getElementById('pags-list');
  if (!list) return;

  list.querySelectorAll('.ig-pags-row').forEach(row => row.remove());

  const pending = document.createElement('div');
  pending.style.cssText = 'color:var(--white-muted);padding:12px 0';
  pending.textContent = 'Designations endpoint pending';
  list.appendChild(pending);
}

// ============================================
// FORM HANDLERS
// ============================================

function initForms() {
  const launcherForm = document.getElementById('launcher-form');
  if (launcherForm) {
    launcherForm.addEventListener('submit', e => {
      e.preventDefault();
      // [API] TODO: POST /ignition/launch — wallet + 0.02 SOL transaction
      window.showNotice(
        'Token launch requires wallet connection and Solana integration — coming soon.'
      );
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      // [API] TODO: POST /ignition/register — verify mint + register token
      window.showNotice('Token registration requires API integration — coming soon.');
    });
  }

  const pagsForm = document.getElementById('pags-form');
  if (pagsForm) {
    pagsForm.addEventListener('submit', e => {
      e.preventDefault();
      // [API] TODO: POST /ignition/pags — designate Twitter fee beneficiary
      window.showNotice('PAGS designation requires API integration — coming soon.');
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  AudioFeedback.init();

  initTabs();
  initWallet();
  initForms();

  // Honest pending state for all API-driven sections
  showPoolPending();
  showKothPending();
  showLeaderboardPending();
  showRobinhoodPending();
  showPagsPending();

  // Countdown — no target until backend provides real schedule
  // [API] TODO: startCountdown(await fetchAirdropSchedule())
  startCountdown(null);

  // Holdings default — pending wallet connection + API
  updateHoldings({ sol: '\u2014', status: '\u2014', tokens: '\u2014', asdf: '\u2014' });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
