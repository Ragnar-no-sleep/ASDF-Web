/**
 * ASDForecast - Prediction Market JavaScript
 * Connects to asdforecast.onrender.com API
 */

'use strict';

const FORECAST_API = 'https://asdforecast.onrender.com/api';

// ============================================
// STATE
// ============================================

let state = {
    wallet: null,
    balance: 0,
    selectedDirection: null, // 'up' or 'down'
    currentFrame: null,
    countdown: 0
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatNumber(num) {
    if (num >= 1_000_000) {
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

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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

async function fetchStats() {
    try {
        const response = await fetch(`${FORECAST_API}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('[Forecast] Error fetching stats:', error);
        return null;
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch(`${FORECAST_API}/leaderboard`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        return await response.json();
    } catch (error) {
        console.error('[Forecast] Error fetching leaderboard:', error);
        return { leaderboard: [] };
    }
}

async function fetchHistory() {
    try {
        const response = await fetch(`${FORECAST_API}/frames/history?limit=10`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch (error) {
        console.error('[Forecast] Error fetching history:', error);
        return { frames: [] };
    }
}

async function fetchCurrentFrame() {
    try {
        const response = await fetch(`${FORECAST_API}/frame/current`);
        if (!response.ok) throw new Error('Failed to fetch current frame');
        return await response.json();
    } catch (error) {
        console.error('[Forecast] Error fetching current frame:', error);
        return null;
    }
}

// ============================================
// UI UPDATES
// ============================================

function updateStats(stats) {
    if (!stats) return;

    const volumeEl = document.getElementById('stat-volume');
    const framesEl = document.getElementById('stat-frames');
    const usersEl = document.getElementById('stat-users');
    const burnedEl = document.getElementById('stat-burned');

    if (volumeEl) volumeEl.textContent = formatNumber(stats.totalVolume || 0) + ' SOL';
    if (framesEl) framesEl.textContent = formatNumber(stats.framesCompleted || 0);
    if (usersEl) usersEl.textContent = formatNumber(stats.uniqueUsers || 0);
    if (burnedEl) burnedEl.textContent = formatNumber(stats.asdfBurned || 0);
}

function updateLeaderboard(data) {
    const body = document.getElementById('leaderboard-body');
    if (!body || !data.leaderboard) return;

    if (data.leaderboard.length === 0) {
        body.innerHTML = `
            <div class="table-row">
                <span colspan="5" style="grid-column: 1 / -1; text-align: center; color: var(--white-muted);">
                    No predictions yet. Be the first!
                </span>
            </div>
        `;
        return;
    }

    body.innerHTML = data.leaderboard.slice(0, 10).map((entry, index) => `
        <div class="table-row">
            <span class="rank ${index < 3 ? 'top-' + (index + 1) : ''}">#${index + 1}</span>
            <span class="wallet">${formatWallet(entry.wallet)}</span>
            <span class="winrate">${(entry.winRate * 100).toFixed(1)}%</span>
            <span class="total-won">${entry.totalWon?.toFixed(2) || '0.00'} SOL</span>
            <span class="bets-count">${entry.totalBets || 0}</span>
        </div>
    `).join('');
}

function updateHistory(data) {
    const list = document.getElementById('history-list');
    if (!list || !data.frames) return;

    if (data.frames.length === 0) {
        list.innerHTML = `
            <div class="history-item">
                <div class="history-result">?</div>
                <div class="history-details">
                    <div class="history-frame">No frames yet</div>
                    <div class="history-time">Waiting for first prediction...</div>
                </div>
            </div>
        `;
        return;
    }

    list.innerHTML = data.frames.map(frame => `
        <div class="history-item">
            <div class="history-result ${frame.result === 'up' ? 'win' : 'loss'}">
                ${frame.result === 'up' ? '+' : '-'}
            </div>
            <div class="history-details">
                <div class="history-frame">Frame #${frame.frameId}</div>
                <div class="history-time">${formatTimeAgo(frame.resolvedAt)}</div>
            </div>
            <div class="history-amount">
                <div class="history-bet">${frame.totalVolume?.toFixed(2) || '0.00'} SOL total</div>
                <div class="history-payout ${frame.result === 'up' ? 'positive' : 'negative'}">
                    ${frame.result === 'up' ? 'UP' : 'DOWN'}
                </div>
            </div>
        </div>
    `).join('');
}

function updateCountdown() {
    const el = document.getElementById('countdown');
    if (!el) return;

    // Calculate seconds until next 15-minute mark
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const nextMark = Math.ceil((minutes + 1) / 15) * 15;
    const remaining = ((nextMark - minutes - 1) * 60) + (60 - seconds);

    state.countdown = remaining > 0 ? remaining : 0;
    el.textContent = formatTime(state.countdown);
}

function updateOdds(frame) {
    if (!frame) return;

    const upEl = document.getElementById('odds-up');
    const downEl = document.getElementById('odds-down');

    if (upEl) upEl.textContent = `${(frame.oddsUp || 1.95).toFixed(2)}x`;
    if (downEl) downEl.textContent = `${(frame.oddsDown || 1.95).toFixed(2)}x`;
}

// ============================================
// WALLET CONNECTION
// ============================================

async function connectWallet() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            alert('Please install Phantom wallet to use ASDForecast');
            window.open('https://phantom.app/', '_blank');
            return;
        }

        const resp = await window.solana.connect();
        state.wallet = resp.publicKey.toString();

        // Update UI
        const btn = document.getElementById('connect-wallet');
        btn.textContent = formatWallet(state.wallet);
        btn.classList.add('connected');

        const predictBtn = document.getElementById('btn-predict');
        predictBtn.disabled = false;
        predictBtn.textContent = 'Select UP or DOWN';

        // Fetch balance
        await updateBalance();

        console.log('[Forecast] Wallet connected:', state.wallet);
    } catch (error) {
        console.error('[Forecast] Wallet connection error:', error);
    }
}

async function updateBalance() {
    if (!state.wallet) return;

    try {
        // This would require Solana web3.js in production
        const balanceEl = document.getElementById('user-balance');
        if (balanceEl) balanceEl.textContent = '0.00';
    } catch (error) {
        console.error('[Forecast] Balance fetch error:', error);
    }
}

// ============================================
// PREDICTION HANDLING
// ============================================

function selectDirection(direction) {
    state.selectedDirection = direction;

    // Update UI
    document.querySelectorAll('.prediction-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    const selectedBtn = document.getElementById(`btn-${direction}`);
    if (selectedBtn) selectedBtn.classList.add('selected');

    // Update predict button
    const predictBtn = document.getElementById('btn-predict');
    if (predictBtn && state.wallet) {
        predictBtn.disabled = false;
        predictBtn.textContent = `Predict ${direction.toUpperCase()}`;
    }
}

function setAmount(amount) {
    const input = document.getElementById('bet-amount');
    if (!input) return;

    if (amount === 'max') {
        input.value = state.balance;
    } else {
        input.value = amount;
    }
}

async function submitPrediction() {
    if (!state.wallet || !state.selectedDirection) return;

    const amount = parseFloat(document.getElementById('bet-amount').value);
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    console.log('[Forecast] Submitting prediction:', {
        wallet: state.wallet,
        direction: state.selectedDirection,
        amount
    });

    // In production, this would send a transaction
    alert('Prediction submission requires wallet transaction. Feature in development.');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Connect wallet
    const connectBtn = document.getElementById('connect-wallet');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }

    // Direction buttons
    const upBtn = document.getElementById('btn-up');
    const downBtn = document.getElementById('btn-down');

    if (upBtn) upBtn.addEventListener('click', () => selectDirection('up'));
    if (downBtn) downBtn.addEventListener('click', () => selectDirection('down'));

    // Amount presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            setAmount(amount);
        });
    });

    // Predict button
    const predictBtn = document.getElementById('btn-predict');
    if (predictBtn) {
        predictBtn.addEventListener('click', submitPrediction);
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    console.log('[Forecast] Initializing...');

    // Setup event listeners
    setupEventListeners();

    // Start countdown
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Load initial data
    const [stats, leaderboard, history, frame] = await Promise.all([
        fetchStats(),
        fetchLeaderboard(),
        fetchHistory(),
        fetchCurrentFrame()
    ]);

    updateStats(stats);
    updateLeaderboard(leaderboard);
    updateHistory(history);
    updateOdds(frame);

    // Refresh data periodically
    setInterval(async () => {
        const stats = await fetchStats();
        updateStats(stats);
    }, 30000);

    setInterval(async () => {
        const frame = await fetchCurrentFrame();
        updateOdds(frame);
    }, 10000);

    console.log('[Forecast] Initialized');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
