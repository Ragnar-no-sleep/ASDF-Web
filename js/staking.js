/**
 * ASDF Staking - Token Lock Dashboard
 * Fetches live data from sollama58/TokenVotingUtil (lock-verifier.onrender.com)
 *
 * Tier 1: Real API, lock detail modal, mine filter, sort, localStorage cache
 */

'use strict';

import { AudioFeedback } from './utils/audio-feedback.js';
import { formatNumber, formatWallet } from './utils/format.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';

// ============================================
// CONSTANTS
// ============================================

// Cache config
const CACHE_KEY = 'asdf_locks_v1';
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ASDF pump.fun token = 6 decimals
const ASDF_DECIMALS = 1e6;

// TVU status → ASDF status mapping
const STATUS_MAP = {
  vesting: 'active',
  fully_unlocked: 'completed',
  pending: 'active',
  cancelled: 'cancelled',
};

// ============================================
// STATE
// ============================================

let locks = [];
let activeFilter = 'all';
let activeSort = 'default';
let walletConnected = false;
let connectedPubkey = null;

// ============================================
// DOM HELPERS
// ============================================

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// ============================================
// CACHE (localStorage, 10 min TTL)
// ============================================

function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// ============================================
// FETCH WITH RETRY (2 retries, 377ms backoff)
// ============================================

async function fetchWithRetry(url, opts = {}, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      if (i < retries) await new Promise(r => setTimeout(r, 377 * (i + 1)));
    }
  }
  throw lastErr;
}

// ============================================
// DATA NORMALIZATION (TVU fields → ASDF format)
// ============================================

function normalizeLock(raw) {
  // TVU API: name, sender, recipient, depositedAmount, withdrawnAmount,
  //          status (vesting/fully_unlocked/pending/cancelled),
  //          startTime, endTime, nextUnlockTime (unix seconds), nextUnlockAmount
  const deposited =
    raw.depositedAmount != null
      ? Number(raw.depositedAmount) / ASDF_DECIMALS
      : raw.deposited || raw.amount || 0;

  const withdrawn =
    raw.withdrawnAmount != null
      ? Number(raw.withdrawnAmount) / ASDF_DECIMALS
      : raw.unlocked || 0;

  const nextUnlockAmt =
    raw.nextUnlockAmount != null
      ? Number(raw.nextUnlockAmount) / ASDF_DECIMALS
      : raw.nextUnlockAmount || 0;

  return {
    id: raw.id || raw.pubkey || '',
    title: raw.name || raw.title || 'Unnamed Lock',
    wallet: raw.recipient || raw.wallet || '',
    sender: raw.sender || '',
    amount: deposited,
    deposited: deposited,
    unlocked: withdrawn,
    status: STATUS_MAP[raw.status] || raw.status || 'active',
    startDate: raw.startTime ? new Date(raw.startTime * 1000) : raw.startDate || null,
    endDate: raw.endTime ? new Date(raw.endTime * 1000) : raw.endDate || null,
    nextUnlock: raw.nextUnlockTime ? new Date(raw.nextUnlockTime * 1000) : raw.nextUnlock || null,
    nextUnlockAmount: nextUnlockAmt,
    period: raw.period || 0,
  };
}

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
    connectedPubkey = resp.publicKey.toString();

    AudioFeedback.play('success');

    const btn = $('#connect-wallet');
    if (btn) {
      btn.textContent = connectedPubkey.slice(0, 4) + '...' + connectedPubkey.slice(-4);
      btn.disabled = true;
    }

    // Show "Mine" filter now that wallet is connected
    const mineFilter = $('#filter-mine');
    if (mineFilter) mineFilter.style.display = '';

    const cta = $('#staking-cta');
    if (cta) cta.style.display = 'none';

    // Re-render with mine filter available
    renderLocks();
  } catch (err) {
    console.error('[Staking] Wallet connect failed:', err);
    AudioFeedback.play('error');
  }
}

// ============================================
// DATA FETCHING
// ============================================

function showApiNotice(msg) {
  const existing = $('.staking-api-notice');
  if (existing) existing.remove();
  const notice = document.createElement('div');
  notice.className = 'staking-api-notice';
  notice.textContent = msg;
  const browser = $('.staking-browser');
  if (browser) browser.insertAdjacentElement('afterbegin', notice);
}

async function fetchLocks() {
  const locksList = $('#locks-list');
  if (locksList) {
    locksList.innerHTML =
      '<div class="staking-loading"><div class="staking-spinner"></div><span>Loading locks&hellip;</span></div>';
  }

  // Try cache first
  const cached = getCachedData();
  if (cached) {
    locks = cached;
    AudioFeedback.play('success');
    renderLocks();
    renderTimeline();
    updateStats();
    return;
  }

  try {
    const res = await fetchWithRetry(ASDF_ENDPOINTS.staking + '/api/locks');
    const json = await res.json();
    const rawLocks = (json.data && json.data.locks) || json.locks || [];
    locks = rawLocks.map(normalizeLock);
    setCachedData(locks);
    AudioFeedback.play('success');
    renderLocks();
    renderTimeline();
    updateStats();
  } catch (err) {
    console.error('[Staking] API unavailable, using demo data:', err);
    AudioFeedback.play('error');
    locks = getDemoLocks();
    renderLocks();
    renderTimeline();
    updateStats();
    showApiNotice('Showing demo data \u2014 live API temporarily unavailable');
  }
}

// ============================================
// DEMO FALLBACK DATA
// ============================================

function getDemoLocks() {
  return [
    {
      id: 'lock-001',
      title: 'Team Vesting',
      wallet: 'Bx7dkP4r1111111111111111111111111111111111',
      sender: '',
      amount: 50000000,
      deposited: 50000000,
      unlocked: 28750000,
      status: 'active',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2027-06-01'),
      nextUnlock: new Date('2026-03-01'),
      nextUnlockAmount: 2083333,
      period: 2592000,
    },
    {
      id: 'lock-002',
      title: 'Community Treasury',
      wallet: '7mQvrT2x2222222222222222222222222222222222',
      sender: '',
      amount: 25000000,
      deposited: 25000000,
      unlocked: 18750000,
      status: 'active',
      startDate: new Date('2025-03-15'),
      endDate: new Date('2026-09-15'),
      nextUnlock: new Date('2026-02-15'),
      nextUnlockAmount: 1388889,
      period: 2592000,
    },
    {
      id: 'lock-003',
      title: 'Advisor Lock',
      wallet: '4kNzyF8m3333333333333333333333333333333333',
      sender: '',
      amount: 10000000,
      deposited: 10000000,
      unlocked: 10000000,
      status: 'completed',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2025-12-01'),
      nextUnlock: null,
      nextUnlockAmount: 0,
      period: 2592000,
    },
    {
      id: 'lock-004',
      title: 'LP Incentives',
      wallet: '9pRxcW3j4444444444444444444444444444444444',
      sender: '',
      amount: 15000000,
      deposited: 15000000,
      unlocked: 5000000,
      status: 'active',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2027-03-01'),
      nextUnlock: new Date('2026-02-28'),
      nextUnlockAmount: 833333,
      period: 2592000,
    },
  ];
}

// ============================================
// RENDERING HELPERS
// ============================================

function formatDate(d) {
  if (!d) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getProgress(lock) {
  if (!lock.amount) return 0;
  return Math.min(100, Math.round((lock.unlocked / lock.amount) * 100));
}

function getCountdown(date) {
  if (!date) return '--';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return days + 'd ' + hours + 'h';
  return hours + 'h';
}

// ============================================
// FILTER + SORT
// ============================================

function isMyLock(lock) {
  if (!walletConnected || !connectedPubkey) return false;
  return lock.sender === connectedPubkey || lock.wallet === connectedPubkey;
}

function getFilteredSortedLocks() {
  let filtered;
  if (activeFilter === 'mine') {
    filtered = locks.filter(isMyLock);
  } else if (activeFilter === 'all') {
    filtered = locks.slice();
  } else {
    filtered = locks.filter(l => l.status === activeFilter);
  }

  if (activeSort === 'amount') {
    filtered.sort((a, b) => b.amount - a.amount);
  } else if (activeSort === 'date') {
    filtered.sort((a, b) => {
      const ta = a.endDate ? a.endDate.getTime() : 0;
      const tb = b.endDate ? b.endDate.getTime() : 0;
      return ta - tb;
    });
  } else if (activeSort === 'status') {
    const order = { active: 0, completed: 1, cancelled: 2 };
    filtered.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
  }

  return filtered;
}

// ============================================
// LOCK BROWSER
// ============================================

function renderLocks() {
  const container = $('#locks-list');
  if (!container) return;

  const filtered = getFilteredSortedLocks();

  if (filtered.length === 0) {
    container.innerHTML = '<div class="staking-loading"><span>No locks found</span></div>';
    return;
  }

  container.innerHTML = filtered
    .map(lock => {
      const pct = getProgress(lock);
      return (
        '<div class="staking-lock staking-lock--clickable" data-id="' +
        lock.id +
        '">' +
        '<div class="staking-lock-info">' +
        '<div class="staking-lock-title">' +
        lock.title +
        '</div>' +
        '<div class="staking-lock-wallet">' +
        formatWallet(lock.wallet, 8, 4) +
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

  // Attach click + hover events
  setTimeout(() => {
    $$('.staking-lock--clickable').forEach(card => {
      const lock = locks.find(l => l.id === card.dataset.id);
      if (!lock) return;
      card.addEventListener('mouseenter', () => AudioFeedback.play('hover'));
      card.addEventListener('click', () => showLockDetail(lock));
    });
    $$('.staking-stat-card').forEach(card => {
      card.addEventListener('mouseenter', () => AudioFeedback.play('hover'));
    });
  }, 100);
}

// ============================================
// LOCK DETAIL MODAL
// ============================================

function showLockDetail(lock) {
  const modal = $('#lock-modal');
  if (!modal) return;

  AudioFeedback.play('click');

  const pct = getProgress(lock);

  const set = (id, val) => {
    const el = modal.querySelector('#' + id);
    if (el) el.textContent = val;
  };

  set('lock-modal-title', lock.title);

  const statusEl = modal.querySelector('#lock-modal-status');
  if (statusEl) {
    statusEl.textContent = lock.status;
    statusEl.className = 'lock-modal-status staking-lock-status ' + lock.status;
  }

  set('lock-modal-amount', formatNumber(lock.amount) + ' ASDF');
  set('lock-modal-unlocked', formatNumber(lock.unlocked) + ' ASDF');

  const fillEl = modal.querySelector('#lock-modal-fill');
  if (fillEl) fillEl.style.width = pct + '%';
  set('lock-modal-pct', pct + '% unlocked');

  set('lock-modal-wallet', lock.wallet);
  set('lock-modal-start', formatDate(lock.startDate));
  set('lock-modal-end', formatDate(lock.endDate));

  const nextRow = modal.querySelector('#lock-modal-next-row');
  if (nextRow) {
    if (lock.nextUnlock && lock.status === 'active') {
      nextRow.style.display = '';
      set(
        'lock-modal-next',
        formatDate(lock.nextUnlock) + ' \u2014 ' + formatNumber(lock.nextUnlockAmount) + ' ASDF'
      );
    } else {
      nextRow.style.display = 'none';
    }
  }

  const solscanEl = modal.querySelector('#lock-modal-solscan');
  if (solscanEl) {
    // Only show Solscan link if id looks like a real pubkey (not demo)
    if (lock.id && lock.id.length >= 32) {
      solscanEl.href = 'https://solscan.io/account/' + lock.id;
      solscanEl.style.display = '';
    } else {
      solscanEl.style.display = 'none';
    }
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLockModal() {
  const modal = $('#lock-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ============================================
// UNLOCK TIMELINE (HTML list — Chart.js deferred to Tier 2)
// ============================================

function renderTimeline() {
  const container = $('#unlock-timeline');
  if (!container) return;

  const upcoming = locks
    .filter(l => l.nextUnlock && l.status === 'active')
    .sort((a, b) => a.nextUnlock - b.nextUnlock);

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="staking-loading"><span>No upcoming unlocks</span></div>';
    return;
  }

  container.innerHTML = upcoming
    .map(lock => {
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

// ============================================
// STATS
// ============================================

function updateStats() {
  let totalLocked = 0;
  let totalDeposited = 0;
  let activeLocks = 0;
  let nextUnlockDate = null;

  locks.forEach(lock => {
    totalLocked += lock.amount - lock.unlocked;
    totalDeposited += lock.deposited;
    if (lock.status === 'active') activeLocks++;
    if (lock.nextUnlock && lock.status === 'active') {
      if (!nextUnlockDate || lock.nextUnlock < nextUnlockDate) nextUnlockDate = lock.nextUnlock;
    }
  });

  const el = (id, val) => {
    const e = $(id);
    if (e) e.textContent = val;
  };
  el('#stat-total-locked', formatNumber(totalLocked));
  el('#stat-deposited', formatNumber(totalDeposited));
  el('#stat-active-locks', activeLocks.toString());
  el('#stat-next-unlock', getCountdown(nextUnlockDate));
}

// ============================================
// FILTERS & SORT
// ============================================

function handleFilterClick(e) {
  const btn = e.target.closest('.staking-filter');
  if (!btn) return;

  AudioFeedback.play('click');
  activeFilter = btn.getAttribute('data-filter') || 'all';

  $$('.staking-filter').forEach(f => f.classList.toggle('active', f === btn));
  renderLocks();
}

function handleSortChange(e) {
  activeSort = e.target.value || 'default';
  AudioFeedback.play('click');
  renderLocks();
}

// ============================================
// VISCERAL FEEDBACK SETUP
// ============================================

function setupVisceralFeedback() {
  AudioFeedback.init();

  const ctaBtn = $('#connect-wallet');
  if (ctaBtn) ctaBtn.addEventListener('mouseenter', () => AudioFeedback.play('hover'));
}

// ============================================
// INIT
// ============================================

function init() {
  // Wallet connect
  const connectBtn = $('#connect-wallet');
  if (connectBtn) connectBtn.addEventListener('click', connectWallet);

  // Filters (event delegation)
  const filtersEl = $('.staking-filters');
  if (filtersEl) filtersEl.addEventListener('click', handleFilterClick);

  // Sort
  const sortEl = $('#locks-sort');
  if (sortEl) sortEl.addEventListener('change', handleSortChange);

  // Modal close handlers
  const modalClose = $('#lock-modal-close');
  if (modalClose) modalClose.addEventListener('click', closeLockModal);

  const modalOverlay = $('#lock-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeLockModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLockModal();
  });

  // Hide "Mine" filter until wallet connected
  const mineFilter = $('#filter-mine');
  if (mineFilter) mineFilter.style.display = 'none';

  setupVisceralFeedback();
  fetchLocks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
