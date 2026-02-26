/**
 * ASDF Staking - Streamflow Token Lock Dashboard
 * Fetches lock data from Streamflow SDK and displays lock browser + timeline
 */

'use strict';

// Phase 1 Visceral Feedback - Import modules
import { AudioFeedback } from './utils/audio-feedback.js';
import { formatNumber } from './utils/format.js';

// ASDF token mint on Solana
const ASDF_MINT = '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump';

// Streamflow program ID (mainnet)
const STREAMFLOW_PROGRAM_ID = 'strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m';

// State
let locks = [];
let activeFilter = 'all';
let walletConnected = false;

// ============================================
// DOM REFERENCES
// ============================================

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// ============================================
// WALLET CONNECTION
// ============================================

async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      AudioFeedback.play('warning');
      return;
    }

    const resp = await window.solana.connect();
    walletConnected = true;

    // Visceral feedback: success chime
    AudioFeedback.play('success');
    const btn = $('#connect-wallet');

    const pubkey = resp.publicKey.toString();
    if (btn) {
      btn.textContent = pubkey.slice(0, 4) + '...' + pubkey.slice(-4);
      btn.disabled = true;
    }

    // Hide CTA
    const cta = $('#staking-cta');
    if (cta) cta.style.display = 'none';

    // Reload with wallet context
    await fetchLocks();
  } catch (err) {
    console.error('[Staking] Wallet connect failed:', err);
    AudioFeedback.play('error');
  }
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchLocks() {
  const locksList = $('#locks-list');
  if (locksList) {
    locksList.innerHTML = '<div class="staking-loading"><span>Loading locks&hellip;</span></div>';
  }

  try {
    // For now, display demo data structure
    // Real integration will use Streamflow JS SDK:
    // import { StreamflowSolana } from '@streamflow/stream'
    // const client = new StreamflowSolana.SolanaStreamClient('mainnet-beta')
    // const streams = await client.get({ mint: ASDF_MINT })

    locks = getDemoLocks();

    // Visceral feedback: success chime on data load
    AudioFeedback.play('success');

    renderLocks();
    renderTimeline();
    updateStats();
  } catch (err) {
    console.error('[Staking] Failed to fetch locks:', err);
    AudioFeedback.play('error');

    const locksList = $('#locks-list');
    if (locksList) {
      locksList.innerHTML =
        '<div class="staking-loading"><span>Failed to load lock data</span></div>';
    }
  }
}

function getDemoLocks() {
  return [
    {
      id: 'lock-001',
      title: 'Team Vesting',
      wallet: 'Bx7d...kP4r',
      amount: 50000000,
      deposited: 50000000,
      unlocked: 28750000,
      status: 'active',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2027-06-01'),
      nextUnlock: new Date('2026-03-01'),
      nextUnlockAmount: 2083333,
    },
    {
      id: 'lock-002',
      title: 'Community Treasury',
      wallet: '7mQv...rT2x',
      amount: 25000000,
      deposited: 25000000,
      unlocked: 18750000,
      status: 'active',
      startDate: new Date('2025-03-15'),
      endDate: new Date('2026-09-15'),
      nextUnlock: new Date('2026-02-15'),
      nextUnlockAmount: 1388889,
    },
    {
      id: 'lock-003',
      title: 'Advisor Lock',
      wallet: '4kNz...yF8m',
      amount: 10000000,
      deposited: 10000000,
      unlocked: 10000000,
      status: 'completed',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2025-12-01'),
      nextUnlock: null,
      nextUnlockAmount: 0,
    },
    {
      id: 'lock-004',
      title: 'LP Incentives',
      wallet: '9pRx...cW3j',
      amount: 15000000,
      deposited: 15000000,
      unlocked: 5000000,
      status: 'active',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2027-03-01'),
      nextUnlock: new Date('2026-02-28'),
      nextUnlockAmount: 833333,
    },
  ];
}

// ============================================
// RENDERING
// ============================================

function formatDate(d) {
  if (!d) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getProgress(lock) {
  return Math.min(100, Math.round((lock.unlocked / lock.amount) * 100));
}

function getCountdown(date) {
  if (!date) return '--';
  const now = Date.now();
  const diff = date.getTime() - now;
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return days + 'd ' + hours + 'h';
  return hours + 'h';
}

function renderLocks() {
  const container = $('#locks-list');
  if (!container) return;

  const filtered =
    activeFilter === 'all'
      ? locks
      : locks.filter(function (l) {
          return l.status === activeFilter;
        });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="staking-loading"><span>No locks found</span></div>';
    return;
  }

  container.innerHTML = filtered
    .map(function (lock) {
      const pct = getProgress(lock);
      return (
        '<div class="staking-lock" data-id="' +
        lock.id +
        '">' +
        '<div class="staking-lock-info">' +
        '<div class="staking-lock-title">' +
        lock.title +
        '</div>' +
        '<div class="staking-lock-wallet">' +
        lock.wallet +
        '</div>' +
        '</div>' +
        '<div class="staking-lock-amount">' +
        formatNumber(lock.amount) +
        ' ASDF</div>' +
        '<div class="staking-lock-progress">' +
        '<div class="staking-progress-bar"><div class="staking-progress-fill" style="width:' +
        pct +
        '%"></div></div>' +
        '<div class="staking-lock-pct">' +
        pct +
        '% unlocked</div>' +
        '</div>' +
        '<span class="staking-lock-status ' +
        lock.status +
        '">' +
        lock.status +
        '</span>' +
        '</div>'
      );
    })
    .join('');

  // Visceral feedback: lock animation for completed locks
  setTimeout(() => {
    const lockCards = $$('.staking-lock');
    lockCards.forEach(card => {
      const lockId = card.dataset.id;
      const lock = locks.find(l => l.id === lockId);
      // Add hover effects
      card.addEventListener('mouseenter', () => {
        AudioFeedback.play('hover');
      });

      // Add click ripple
      card.addEventListener('click', e => {
        AudioFeedback.play('click');
      });
    });
  }, 100);
}

function renderTimeline() {
  const container = $('#unlock-timeline');
  if (!container) return;

  const upcoming = locks
    .filter(function (l) {
      return l.nextUnlock && l.status === 'active';
    })
    .sort(function (a, b) {
      return a.nextUnlock - b.nextUnlock;
    });

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="staking-loading"><span>No upcoming unlocks</span></div>';
    return;
  }

  container.innerHTML = upcoming
    .map(function (lock) {
      return (
        '<div class="staking-timeline-item">' +
        '<div class="staking-timeline-date">' +
        formatDate(lock.nextUnlock) +
        ' (' +
        getCountdown(lock.nextUnlock) +
        ')</div>' +
        '<div class="staking-timeline-desc">' +
        lock.title +
        '</div>' +
        '<div class="staking-timeline-amount">' +
        formatNumber(lock.nextUnlockAmount) +
        ' ASDF</div>' +
        '</div>'
      );
    })
    .join('');
}

function updateStats() {
  let totalLocked = 0;
  let totalDeposited = 0;
  let activeLocks = 0;
  let nextUnlockDate = null;

  locks.forEach(function (lock) {
    totalLocked += lock.amount - lock.unlocked;
    totalDeposited += lock.deposited;
    if (lock.status === 'active') activeLocks++;
    if (lock.nextUnlock && lock.status === 'active') {
      if (!nextUnlockDate || lock.nextUnlock < nextUnlockDate) {
        nextUnlockDate = lock.nextUnlock;
      }
    }
  });

  let el;
  el = $('#stat-total-locked');
  if (el) el.textContent = formatNumber(totalLocked);
  el = $('#stat-deposited');
  if (el) el.textContent = formatNumber(totalDeposited);
  el = $('#stat-active-locks');
  if (el) el.textContent = activeLocks.toString();
  el = $('#stat-next-unlock');
  if (el) el.textContent = getCountdown(nextUnlockDate);

  // Visceral feedback: hover on stat cards
  setTimeout(() => {
    const statCards = $$('.staking-stat-card');
    statCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        AudioFeedback.play('hover');
      });
    });
  }, 200);
}

// ============================================
// FILTERS
// ============================================

function handleFilterClick(e) {
  const btn = e.target.closest('.staking-filter');
  if (!btn) return;

  // Visceral feedback: click sound
  AudioFeedback.play('click');

  activeFilter = btn.getAttribute('data-filter') || 'all';

  $$('.staking-filter').forEach(function (f) {
    f.classList.toggle('active', f === btn);
  });

  renderLocks();
}

// ============================================
// VISCERAL FEEDBACK SETUP
// ============================================

function setupVisceralFeedback() {
  // Initialize audio system
  AudioFeedback.init();

  // CTA button effects
  const ctaBtn = $('#connect-wallet');
  if (ctaBtn) {
    ctaBtn.addEventListener('mouseenter', () => {
      AudioFeedback.play('hover');
    });
  }
}

// ============================================
// INIT
// ============================================

function init() {
  // Wallet connect
  const connectBtn = $('#connect-wallet');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectWallet);
  }

  // Filters
  const filtersEl = document.querySelector('.staking-filters');
  if (filtersEl) {
    filtersEl.addEventListener('click', handleFilterClick);
  }

  // Setup visceral feedback
  setupVisceralFeedback();

  // Load data
  fetchLocks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
