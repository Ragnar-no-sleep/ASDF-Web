/**
 * ASDF Burns Page - JavaScript
 * Fetches burn data from API and updates UI
 */

'use strict';

// Use relative URL in dev (proxied by Vite), full URL in production
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? '/api' : 'https://asdf-api.onrender.com/api';

/**
 * Escape HTML entities to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchBurnStats() {
    try {
        const response = await fetch(`${API_BASE}/ecosystem/burns`);
        if (!response.ok) throw new Error('Failed to fetch stats');
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
            largestBurn: 3046567
        };
    }
}

async function fetchLeaderboard(period = 'all') {
    try {
        const endpoint = period === 'all'
            ? `${API_BASE}/leaderboard/burns`
            : `${API_BASE}/scores/leaderboard/${period}/burns`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = await response.json();
        return { leaderboard: data.leaderboard || data.topBurners || data };
    } catch (error) {
        console.error('[Burns] Error fetching leaderboard:', error);
        return { leaderboard: [] };
    }
}

async function fetchRecentBurns() {
    try {
        const response = await fetch(`${API_BASE}/ecosystem/burns?recent=true`);
        if (!response.ok) throw new Error('Failed to fetch recent burns');
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

function formatNumber(num) {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(2) + 'B';
    } else if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(2) + 'M';
    } else if (num >= 1_000) {
        return (num / 1_000).toFixed(2) + 'K';
    }
    return num.toLocaleString();
}

function formatWallet(wallet) {
    if (!wallet || wallet.length < 8) return wallet || '---';
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

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

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = formatNumber(Math.floor(current));
    }, 16);
}

async function updateStats() {
    const stats = await fetchBurnStats();
    if (!stats) return;

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
        burnsTodayEl.textContent = formatNumber(stats.burnedToday);
    }

    // Total burners
    const totalBurnersEl = document.getElementById('total-burners');
    if (totalBurnersEl && stats.uniqueBurners !== undefined) {
        totalBurnersEl.textContent = stats.uniqueBurners.toLocaleString();
    }

    // Remaining supply
    const remainingEl = document.getElementById('remaining-supply');
    if (remainingEl && stats.circulatingSupply !== undefined) {
        remainingEl.textContent = formatNumber(stats.circulatingSupply);
    }

    // Biggest burn
    const biggestEl = document.getElementById('biggest-burn');
    if (biggestEl && stats.largestBurn !== undefined) {
        biggestEl.textContent = formatNumber(stats.largestBurn);
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

    tableBody.innerHTML = leaderboard.slice(3).map((entry, index) => `
        <div class="table-row">
            <span class="col-rank">#${index + 4}</span>
            <span class="col-wallet">${escapeHtml(formatWallet(entry.wallet))}</span>
            <span class="col-burned">${escapeHtml(formatNumber(entry.totalBurned))} ASDF</span>
            <span class="col-count">${escapeHtml(String(entry.burnCount || '-'))}</span>
        </div>
    `).join('');
}

function updatePodiumPlace(place, data) {
    const el = document.getElementById(`place-${place}`);
    if (!el) return;

    const walletEl = el.querySelector('.place-wallet');
    const amountEl = el.querySelector('.place-amount');

    if (data) {
        if (walletEl) walletEl.textContent = formatWallet(data.wallet);
        if (amountEl) amountEl.textContent = `${formatNumber(data.totalBurned)} ASDF`;
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

    feedEl.innerHTML = data.burns.map(burn => `
        <div class="feed-item">
            <div class="feed-icon">&#128293;</div>
            <div class="feed-content">
                <div class="feed-wallet">${escapeHtml(formatWallet(burn.wallet))}</div>
                <div class="feed-time">${escapeHtml(formatTimeAgo(burn.timestamp))}</div>
            </div>
            <div class="feed-amount">${escapeHtml(formatNumber(burn.amount))} ASDF</div>
        </div>
    `).join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupTabListeners() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
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
// INITIALIZATION
// ============================================

async function init() {
    console.log('[Burns] Initializing...');

    // Setup event listeners
    setupTabListeners();

    // Load initial data
    await Promise.all([
        updateStats(),
        updateLeaderboard('all'),
        updateRecentBurns()
    ]);

    // Refresh data periodically
    setInterval(updateStats, 30000);
    setInterval(updateRecentBurns, 15000);

    console.log('[Burns] Initialized');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
