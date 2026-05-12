/**
 * ASDF Staking - Token Lock Dashboard
 * Fetches live data from sollama58/TokenVotingUtil (lock-verifier.onrender.com)
 *
 * Tier 1: Real API, lock detail modal, mine filter, sort, localStorage cache
 *
 * TVU API actual format (empirically verified 2026-02-27):
 *   GET /api/locks → { summary, locks[] }
 *   lock fields: id, contractName, sender, recipient, totalAmount,
 *     withdrawn, unlocked, locked, startDate (ISO), endDate (ISO),
 *     status (pending|vesting|fully_unlocked|cancelled),
 *     unlockSchedule: [{ date (ISO), amount, cumulative }]
 *   amounts: already in display units (NO decimals divide needed)
 */

'use strict';

import { AudioFeedback } from './utils/audio-feedback.js';
import { formatNumber, formatWallet } from './utils/format.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { fetchWithRetry } from './utils/fetch-retry.js';
import { esc } from './utils/escape.js';
import { POLL_INTERVAL, CACHE_TTL as CACHE_DURATIONS, TIME_MS } from './config/timing.js';
import { showNotice } from './utils/notice.js';

// ============================================
// ORACLE SILENCE (one-time notice per page load)
// ============================================

let _oracleSilenceShown = false;

function announceOracleSilence(message) {
  if (_oracleSilenceShown) return;
  _oracleSilenceShown = true;
  showNotice(message);
}

// ============================================
// CONSTANTS
// ============================================

const CACHE_KEY = 'asdf_locks_v2';
const CACHE_TTL = CACHE_DURATIONS.LOCKS;

// TVU status → ASDF display status
const STATUS_MAP = {
  vesting: 'active',
  fully_unlocked: 'completed',
  pending: 'pending', // future lock, not yet started
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
// DATA NORMALIZATION (TVU actual fields → ASDF)
// ============================================

function normalizeLock(raw) {
  // Amounts come pre-formatted from TVU (no decimals divide needed)
  const amount = raw.totalAmount || raw.amount || 0;
  const unlocked = raw.unlocked != null ? raw.unlocked : raw.withdrawn || 0;

  // Derive nextUnlock from unlockSchedule (first future entry)
  let nextUnlock = null;
  let nextUnlockAmount = 0;
  if (Array.isArray(raw.unlockSchedule) && raw.unlockSchedule.length > 0) {
    const now = Date.now();
    const next = raw.unlockSchedule.find(e => new Date(e.date).getTime() > now);
    if (next) {
      nextUnlock = new Date(next.date);
      nextUnlockAmount = next.amount;
    }
  }

  return {
    id: raw.id || '',
    title: raw.contractName || raw.name || raw.title || 'Unnamed Lock',
    wallet: raw.recipient || raw.wallet || '',
    sender: raw.sender || '',
    amount,
    deposited: amount,
    unlocked,
    status: STATUS_MAP[raw.status] || raw.status || 'active',
    startDate: raw.startDate ? new Date(raw.startDate) : null,
    endDate: raw.endDate ? new Date(raw.endDate) : null,
    nextUnlock,
    nextUnlockAmount,
    period: raw.period || 0,
    unlockSchedule: raw.unlockSchedule || [],
  };
}

// ============================================
// WALLET CONNECTION
// ============================================

async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      window.showNotice('Wallet required — install Phantom to use Staking');
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

    // Reveal "Mine" filter
    const mineFilter = $('#filter-mine');
    if (mineFilter) mineFilter.style.display = '';

    const cta = $('#staking-cta');
    if (cta) cta.style.display = 'none';

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
    // TVU response: { summary, locks } — no data wrapper
    const rawLocks = json.locks || (json.data && json.data.locks) || [];
    locks = rawLocks.map(normalizeLock);
    setCachedData(locks);
    AudioFeedback.play('success');
    renderLocks();
    renderTimeline();
    updateStats();
  } catch (err) {
    console.error('[Staking] API unavailable, using demo data:', err);
    AudioFeedback.play('error');
    announceOracleSilence(
      '*growl* \u2014 Staking ledger unreachable. Demo data shown. Verify your locks on-chain.'
    );
    locks = getDemoLocks();
    renderLocks();
    renderTimeline();
    updateStats();
    showApiNotice('Showing demo data \u2014 live API temporarily unavailable');
  }
}

// ============================================
// DEMO FALLBACK DATA (matches normalizeLock output shape)
// ============================================

function getDemoLocks() {
  return [
    {
      id: 'demo-001',
      title: 'Team Vesting',
      wallet: 'FcTcbGqcTpXqcHZptzp7XmKN2LvhPgBMMuLbGiFe16nG',
      sender: 'DF2DBPBnnTbkEgqWtRcEzT4ECMVFWwpQ63pz9Y8XDoJM',
      amount: 10000000,
      deposited: 10000000,
      unlocked: 0,
      status: 'active',
      startDate: new Date('2026-01-14'),
      endDate: new Date('2038-01-11'),
      nextUnlock: new Date('2026-04-16'),
      nextUnlockAmount: 208333,
      period: 7883982,
      unlockSchedule: [],
    },
    {
      id: 'demo-002',
      title: 'Community Treasury',
      wallet: 'dcW5uy7wKdKFxkhyBfPv3MyvrCkDcv1rWucoat13KH4',
      sender: 'dcW5uy7wKdKFxkhyBfPv3MyvrCkDcv1rWucoat13KH4',
      amount: 10000000,
      deposited: 10000000,
      unlocked: 0,
      status: 'pending',
      startDate: new Date('2026-06-19'),
      endDate: new Date('2026-06-19'),
      nextUnlock: new Date('2026-06-19'),
      nextUnlockAmount: 9999999,
      period: 1,
      unlockSchedule: [],
    },
    {
      id: 'demo-003',
      title: 'Advisor Lock',
      wallet: '4evwwDJE7rQNfLtGBnmHGxZHVGKRqyqpoaR8Ab15qf9h',
      sender: '4evwwDJE7rQNfLtGBnmHGxZHVGKRqyqpoaR8Ab15qf9h',
      amount: 5,
      deposited: 5,
      unlocked: 0,
      status: 'pending',
      startDate: new Date('2055-02-25'),
      endDate: new Date('2055-02-25'),
      nextUnlock: new Date('2055-02-25'),
      nextUnlockAmount: 4.999999,
      period: 1,
      unlockSchedule: [],
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
  const days = Math.floor(diff / TIME_MS.DAY);
  const hours = Math.floor((diff % TIME_MS.DAY) / TIME_MS.HOUR);
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
  } else if (activeFilter === 'active') {
    // 'active' includes both vesting + pending (not yet started)
    filtered = locks.filter(l => l.status === 'active' || l.status === 'pending');
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
    const order = { active: 0, pending: 1, completed: 2, cancelled: 3 };
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

  // esc() applied to all API-sourced strings interpolated into innerHTML
  container.innerHTML = filtered
    .map(lock => {
      const pct = getProgress(lock);
      return (
        '<div class="staking-lock staking-lock--clickable" data-id="' +
        esc(lock.id) +
        '">' +
        '<div class="staking-lock-info">' +
        '<div class="staking-lock-title">' +
        esc(lock.title) +
        '</div>' +
        '<div class="staking-lock-wallet">' +
        esc(formatWallet(lock.wallet, 8, 4)) +
        '</div>' +
        '</div>' +
        '<div class="staking-lock-amount">' +
        formatNumber(lock.amount) +
        ' ASDF</div>' +
        '<div class="staking-lock-progress">' +
        '<div class="staking-progress-bar"><div class="staking-progress-fill" data-progress="' +
        pct +
        '"></div></div>' +
        '<div class="staking-lock-pct">' +
        pct +
        '% unlocked</div>' +
        '</div>' +
        '<span class="staking-lock-status ' +
        esc(lock.status) +
        '">' +
        esc(lock.status) +
        '</span>' +
        '</div>'
      );
    })
    .join('');

  // Apply progress widths via CSSOM
  container.querySelectorAll('[data-progress]').forEach(el => {
    el.style.setProperty('width', el.dataset.progress + '%');
    el.removeAttribute('data-progress');
  });
}

// ============================================
// LOCK DETAIL MODAL (uses textContent — XSS-safe)
// ============================================

function showLockDetail(lock) {
  const modal = $('#lock-modal');
  if (!modal) return;

  AudioFeedback.play('click');

  const pct = getProgress(lock);
  const set = (id, val) => {
    const e = modal.querySelector('#' + id);
    if (e) e.textContent = val;
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
    if (lock.nextUnlock) {
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
    if (lock.id && lock.id.length >= 32 && !lock.id.startsWith('demo-')) {
      solscanEl.href = 'https://solscan.io/account/' + encodeURIComponent(lock.id);
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
// UNLOCK TIMELINE
// ============================================

function renderTimeline() {
  const container = $('#unlock-timeline');
  if (!container) return;

  const upcoming = locks
    .filter(l => l.nextUnlock && (l.status === 'active' || l.status === 'pending'))
    .sort((a, b) => a.nextUnlock - b.nextUnlock);

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="staking-loading"><span>No upcoming unlocks</span></div>';
    return;
  }

  container.innerHTML = upcoming
    .map(
      lock =>
        '<div class="staking-timeline-item">' +
        '<div class="staking-timeline-date">' +
        formatDate(lock.nextUnlock) +
        ' (' +
        getCountdown(lock.nextUnlock) +
        ')</div>' +
        '<div class="staking-timeline-desc">' +
        esc(lock.title) +
        '</div>' +
        '<div class="staking-timeline-amount">' +
        formatNumber(lock.nextUnlockAmount) +
        ' ASDF</div>' +
        '</div>'
    )
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
    if (lock.status === 'active' || lock.status === 'pending') activeLocks++;
    if (lock.nextUnlock) {
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
// VISCERAL FEEDBACK
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
  const connectBtn = $('#connect-wallet');
  if (connectBtn) connectBtn.addEventListener('click', connectWallet);

  const filtersEl = $('.staking-filters');
  if (filtersEl) filtersEl.addEventListener('click', handleFilterClick);

  const sortEl = $('#locks-sort');
  if (sortEl) sortEl.addEventListener('change', handleSortChange);

  const modalClose = $('#lock-modal-close');
  if (modalClose) modalClose.addEventListener('click', closeLockModal);

  const modalOverlay = $('#lock-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeLockModal();
    });
  }

  PageLifecycle.registerListener(document, 'keydown', e => {
    if (e.key === 'Escape') closeLockModal();
  });

  // Mine filter hidden until wallet connected
  const mineFilter = $('#filter-mine');
  if (mineFilter) mineFilter.style.display = 'none';

  setupVisceralFeedback();

  // Event delegation on lock list — registered once, survives re-renders
  const locksList = $('#locks-list');
  if (locksList) {
    locksList.addEventListener('click', e => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const lock = locks.find(l => l.id === card.dataset.id);
      if (lock) showLockDetail(lock);
    });
    locksList.addEventListener('mouseover', e => {
      const card = e.target.closest('.staking-lock--clickable');
      if (card && !card.contains(e.relatedTarget)) AudioFeedback.play('hover');
    });
  }

  // Stat cards hover — static DOM, registered once
  $$('.staking-stat-card').forEach(card => {
    card.addEventListener('mouseenter', () => AudioFeedback.play('hover'));
  });

  fetchLocks();

  // Refresh countdown + stats displays every 60s (matches footer claim)
  // No API refetch — operates on in-memory locks state
  PageLifecycle.registerTimer(
    'staking-refresh',
    setInterval(() => {
      renderTimeline();
      updateStats();
    }, POLL_INTERVAL.SLOW)
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Named exports for unit testing (pure functions only)
export {
  normalizeLock,
  getCachedData,
  setCachedData,
  getDemoLocks,
  formatDate,
  getProgress,
  getCountdown,
  STATUS_MAP,
};
