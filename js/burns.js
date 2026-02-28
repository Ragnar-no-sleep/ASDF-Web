/**
 * ASDF Burns Page - JavaScript
 * Fetches burn data from ASDFBurnTracker API and updates UI
 *
 * Real endpoints (sollama58/ASDFBurnTracker):
 *   GET /api/burn   — totalBurned, burnPercentage, circulatingSupply
 *   GET /api/wallet — tokenPriceUsd, ctoFeesSol, ctoFeesUsd
 *
 * Pending (issue #2): burnedToday, uniqueBurners, largestBurn
 * Pending (issue #3): GET /api/leaderboard
 * Pending (issue #4): GET /api/burns/recent
 */

'use strict';

import * as contextualAnimations from './utils/contextual-animations.js';
import { AudioFeedback } from './utils/audio-feedback.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { formatNumber, formatWallet } from './utils/format.js';
import { fetchWithRetry } from './utils/fetch-retry.js';

const API_BASE = ASDF_ENDPOINTS.burns;

// ============================================
// API CONNECTION STATUS
// (Adapted from sollama58/ASDFBurnTracker status monitor)
// ============================================

function updateConnectionStatus(connected) {
  const badge = document.querySelector('.hero-badge');
  const dot = document.querySelector('.hero-badge-dot');
  if (!badge || !dot) return;

  if (connected) {
    dot.style.background = '#22c55e';
    dot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.6)';
    badge.setAttribute('title', 'API connected');
  } else {
    dot.style.background = '#ef4444';
    dot.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
    badge.setAttribute('title', 'API unreachable');
  }
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchBurnStats() {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/burn`, { retries: 3 });
    const data = await response.json();
    updateConnectionStatus(true);
    return {
      totalBurned: data.burnedAmount ?? 0,
      burnPercentage: data.burnedPercent ?? 0,
      circulatingSupply: data.currentSupply ?? 0,
      uniqueBurners: data.uniqueBurners ?? null,
      burnedToday: data.burnedToday ?? null,
      largestBurn: data.largestBurn ?? null,
    };
  } catch (error) {
    console.error('[Burns] Error fetching burn stats:', error);
    updateConnectionStatus(false);
    return null;
  }
}

async function fetchWalletStats() {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/wallet`, { retries: 3 });
    updateConnectionStatus(true);
    return await response.json();
  } catch (error) {
    console.error('[Burns] Error fetching wallet stats:', error);
    updateConnectionStatus(false);
    return null;
  }
}

// ============================================
// UI UPDATES
// ============================================

// Local: ISO timestamp variant — format.js expects Unix ms, API returns ISO strings
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  // Trigger burn particles on the mega stat
  const megaStatValue = document.getElementById('total-burned');
  if (megaStatValue && element.closest('#total-burned')) {
    contextualAnimations.burnParticles(megaStatValue, target);
    AudioFeedback.play('burn');
  }

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = formatNumber(Math.floor(current), 2);
  }, 16);
}

async function updateStats() {
  const stats = await fetchBurnStats();
  if (!stats) {
    AudioFeedback.play('error');
    ['burns-today', 'total-burners', 'remaining-supply', 'biggest-burn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '\u2014';
    });
    return;
  }

  AudioFeedback.play('success');

  // Total burned
  const totalBurnedEl = document.querySelector('#total-burned .counter-number');
  if (totalBurnedEl && stats.totalBurned) {
    animateCounter(totalBurnedEl, stats.totalBurned);
  }

  // Burn progress
  const progressEl = document.getElementById('burn-progress');
  const percentageEl = document.getElementById('burn-percentage');
  if (progressEl && stats.burnPercentage) {
    progressEl.style.width = `${stats.burnPercentage}%`;
    if (percentageEl) percentageEl.textContent = `${stats.burnPercentage.toFixed(2)}%`;
  }

  // Burned today — not yet in backend (issue #2)
  const burnsTodayEl = document.getElementById('burns-today');
  if (burnsTodayEl) {
    burnsTodayEl.textContent =
      stats.burnedToday !== null ? formatNumber(stats.burnedToday, 2) : '\u2014';
  }

  // Unique burners — not yet in backend (issue #2)
  const totalBurnersEl = document.getElementById('total-burners');
  if (totalBurnersEl) {
    totalBurnersEl.textContent =
      stats.uniqueBurners !== null ? stats.uniqueBurners.toLocaleString() : '\u2014';
  }

  // Circulating supply
  const remainingEl = document.getElementById('remaining-supply');
  if (remainingEl) {
    remainingEl.textContent = stats.circulatingSupply
      ? formatNumber(stats.circulatingSupply, 2)
      : '\u2014';
  }

  // Largest burn — not yet in backend (issue #2)
  const biggestEl = document.getElementById('biggest-burn');
  if (biggestEl) {
    biggestEl.textContent =
      stats.largestBurn !== null ? formatNumber(stats.largestBurn, 2) : '\u2014';
  }
}

async function updateWalletStats() {
  const data = await fetchWalletStats();
  if (!data || !data.tokenPriceUsd) return;

  // Enrich hero badge title with live price
  const badge = document.querySelector('.hero-badge');
  if (badge) badge.setAttribute('title', `API connected \u00b7 $${data.tokenPriceUsd}`);
}

function showLeaderboardPending() {
  // Leaderboard endpoint not yet available — sollama58/ASDFBurnTracker issue #3
  updatePodiumPlace(1, null);
  updatePodiumPlace(2, null);
  updatePodiumPlace(3, null);

  const tableBody = document.getElementById('leaderboard-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <div class="feed-empty">
        <span>Leaderboard endpoint in progress</span>
      </div>
    `;
  }
}

function showFeedPending() {
  // Recent burns endpoint not yet available — sollama58/ASDFBurnTracker issue #4
  const feedEl = document.getElementById('burns-feed');
  if (feedEl) {
    feedEl.innerHTML = `
      <div class="feed-empty">
        <span>Recent burns endpoint in progress</span>
      </div>
    `;
  }
}

function updatePodiumPlace(place, data) {
  const el = document.getElementById(`place-${place}`);
  if (!el) return;

  const walletEl = el.querySelector('.place-wallet');
  const amountEl = el.querySelector('.place-amount');

  if (data) {
    if (walletEl) walletEl.textContent = formatWallet(data.wallet, 4, 4);
    if (amountEl) amountEl.textContent = `${formatNumber(data.totalBurned, 2)} ASDF`;
  } else {
    if (walletEl) walletEl.textContent = '---';
    if (amountEl) amountEl.textContent = '\u2014';
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupTabListeners() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      AudioFeedback.play('click');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Leaderboard endpoint pending (issue #3) — no-op for now
    });
  });
}

// ============================================
// VISCERAL FEEDBACK SETUP
// ============================================

function setupVisceralFeedback() {
  AudioFeedback.init();

  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      AudioFeedback.play('hover');
    });
  });

  const ctaBtn = document.querySelector('.cta-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', e => {
      AudioFeedback.play('click');
    });
  }

  const podiumPlaces = document.querySelectorAll('.podium-place');
  podiumPlaces.forEach(place => {
    place.addEventListener('click', e => {
      AudioFeedback.play('click');
    });
  });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  setupTabListeners();
  setupVisceralFeedback();
  showLeaderboardPending();
  showFeedPending();

  await Promise.all([updateStats(), updateWalletStats()]);

  PageLifecycle.registerTimer('burns-stats', setInterval(updateStats, 30000));
  PageLifecycle.registerTimer('burns-wallet', setInterval(updateWalletStats, 60000));
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
