/**
 * ASDF Burns Page - JavaScript
 * Fetches burn data from API and updates UI
 */

'use strict';

import * as contextualAnimations from './utils/contextual-animations.js';
import { AudioFeedback } from './utils/audio-feedback.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { formatNumber, formatWallet } from './utils/format.js';

const API_BASE = ASDF_ENDPOINTS.burns;

// escapeHtml — window global, loaded via js/shared/security.js in burns.html

// ============================================
// EXPONENTIAL BACKOFF FETCH
// (Adapted from sollama58/ASDFBurnTracker)
// ============================================

async function fetchWithRetry(url, maxRetries) {
  if (!maxRetries) maxRetries = 3;
  var delay = 1000;
  for (var i = 0; i <= maxRetries; i++) {
    try {
      var response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      updateConnectionStatus(true);
      return response;
    } catch (err) {
      if (i === maxRetries) {
        updateConnectionStatus(false);
        throw err;
      }
      console.warn('[Burns] Retry ' + (i + 1) + '/' + maxRetries + ' after ' + delay + 'ms');
      await new Promise(function (resolve) {
        setTimeout(resolve, delay);
      });
      delay *= 2;
    }
  }
}

// ============================================
// API CONNECTION STATUS
// (Adapted from sollama58/ASDFBurnTracker status monitor)
// ============================================

function updateConnectionStatus(connected) {
  var badge = document.querySelector('.hero-badge');
  var dot = document.querySelector('.hero-badge-dot');
  if (!badge || !dot) return;

  if (connected) {
    dot.style.background = '#22c55e';
    dot.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.6)';
    badge.setAttribute('title', 'API connected');
  } else {
    dot.style.background = '#ef4444';
    dot.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
    badge.setAttribute('title', 'API unreachable - showing cached data');
  }
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchBurnStats() {
  try {
    const response = await fetchWithRetry(`${API_BASE}/ecosystem/burns`);
    return await response.json();
  } catch (error) {
    console.error('[Burns] Error fetching stats:', error);
    // Return mock data for display
    return {
      totalBurned: 7393300,
      burnPercentage: 0.74,
      circulatingSupply: 992606700,
      uniqueBurners: 23,
      burnedToday: 12500,
      largestBurn: 3046567,
    };
  }
}

async function fetchLeaderboard(period = 'all') {
  try {
    const endpoint =
      period === 'all'
        ? `${API_BASE}/leaderboard/burns`
        : `${API_BASE}/scores/leaderboard/${period}/burns`;

    const response = await fetchWithRetry(endpoint);
    const data = await response.json();
    return { leaderboard: data.leaderboard || data.topBurners || data };
  } catch (error) {
    console.error('[Burns] Error fetching leaderboard:', error);
    return { leaderboard: [] };
  }
}

async function fetchRecentBurns() {
  try {
    const response = await fetchWithRetry(`${API_BASE}/ecosystem/burns?recent=true`);
    const data = await response.json();
    return { burns: data.recentBurns || [] };
  } catch (error) {
    console.error('[Burns] Error fetching recent burns:', error);
    return { burns: [] };
  }
}

// ============================================
// UI UPDATES
// ============================================

// formatNumber + formatWallet imported from ./utils/format.js
// formatNumber called with decimals=2 throughout (burns show cents precision)
// formatWallet called with (4, 4) to match ASDFBurnTracker display convention

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
    return;
  }

  // Success chime on data load
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

  // Burns today
  const burnsTodayEl = document.getElementById('burns-today');
  if (burnsTodayEl && stats.burnedToday !== undefined) {
    burnsTodayEl.textContent = formatNumber(stats.burnedToday, 2);
  }

  // Total burners
  const totalBurnersEl = document.getElementById('total-burners');
  if (totalBurnersEl && stats.uniqueBurners !== undefined) {
    totalBurnersEl.textContent = stats.uniqueBurners.toLocaleString();
  }

  // Remaining supply
  const remainingEl = document.getElementById('remaining-supply');
  if (remainingEl && stats.circulatingSupply !== undefined) {
    remainingEl.textContent = formatNumber(stats.circulatingSupply, 2);
  }

  // Biggest burn
  const biggestEl = document.getElementById('biggest-burn');
  if (biggestEl && stats.largestBurn !== undefined) {
    biggestEl.textContent = formatNumber(stats.largestBurn, 2);
  }
}

async function updateLeaderboard(period = 'all') {
  const data = await fetchLeaderboard(period);
  if (!data || !data.leaderboard) return;

  const leaderboard = data.leaderboard;

  // Update podium
  updatePodiumPlace(1, leaderboard[0]);
  updatePodiumPlace(2, leaderboard[1]);
  updatePodiumPlace(3, leaderboard[2]);

  // Update table
  const tableBody = document.getElementById('leaderboard-body');
  if (!tableBody) return;

  tableBody.innerHTML = leaderboard
    .slice(3)
    .map(
      (entry, index) => `
        <div class="table-row">
            <span class="col-rank">#${index + 4}</span>
            <span class="col-wallet">${escapeHtml(formatWallet(entry.wallet, 4, 4))}</span>
            <span class="col-burned">${escapeHtml(formatNumber(entry.totalBurned, 2))} ASDF</span>
            <span class="col-count">${escapeHtml(String(entry.burnCount || '-'))}</span>
        </div>
    `
    )
    .join('');
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
    if (amountEl) amountEl.textContent = '0 ASDF';
  }
}

async function updateRecentBurns() {
  const data = await fetchRecentBurns();
  if (!data || !data.burns) return;

  const feedEl = document.getElementById('burns-feed');
  if (!feedEl) return;

  if (data.burns.length === 0) {
    feedEl.innerHTML = `
            <div class="feed-empty">
                <span>No recent burns</span>
            </div>
        `;
    return;
  }

  feedEl.innerHTML = data.burns
    .map(
      burn => `
        <div class="feed-item">
            <div class="feed-icon">&#128293;</div>
            <div class="feed-content">
                <div class="feed-wallet">${escapeHtml(formatWallet(burn.wallet, 4, 4))}</div>
                <div class="feed-time">${escapeHtml(formatTimeAgo(burn.timestamp))}</div>
            </div>
            <div class="feed-amount">${escapeHtml(formatNumber(burn.amount, 2))} ASDF</div>
        </div>
    `
    )
    .join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupTabListeners() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      // Visceral feedback: click sound
      AudioFeedback.play('click');

      // Update active state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Fetch new data
      const period = tab.dataset.period;
      updateLeaderboard(period);
    });
  });
}

// ============================================
// VISCERAL FEEDBACK SETUP
// ============================================

function setupVisceralFeedback() {
  // Initialize audio system
  AudioFeedback.init();

  // Add hover effects to stat cards
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      AudioFeedback.play('hover');
    });
  });

  // Add click effects to CTA button
  const ctaBtn = document.querySelector('.cta-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', e => {
      AudioFeedback.play('click');
    });
  }

  // Add ripple to podium places on click
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

  await Promise.all([updateStats(), updateLeaderboard('all'), updateRecentBurns()]);

  PageLifecycle.registerTimer('burns-stats', setInterval(updateStats, 30000));
  PageLifecycle.registerTimer('burns-feed', setInterval(updateRecentBurns, 15000));
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
