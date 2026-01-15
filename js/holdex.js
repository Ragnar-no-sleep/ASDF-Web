/**
 * HolDEX - Token Tracker JavaScript
 * Connects to holdex.onrender.com API
 */

'use strict';

const HOLDEX_API = 'https://holdex.onrender.com/api';

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
// STATE
// ============================================

const state = {
  tokens: [],
  filter: 'all',
  sort: 'kscore',
  selectedToken: null,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatNumber(num) {
  if (num >= 1_000_000_000) {
    return '$' + (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return '$' + (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return '$' + (num / 1_000).toFixed(2) + 'K';
  }
  return '$' + num.toLocaleString();
}

function formatPrice(num) {
  if (num < 0.0001) {
    return '$' + num.toFixed(8);
  } else if (num < 0.01) {
    return '$' + num.toFixed(6);
  } else if (num < 1) {
    return '$' + num.toFixed(4);
  }
  return '$' + num.toFixed(2);
}

function formatPercent(num) {
  const formatted = num.toFixed(2);
  const sign = num >= 0 ? '+' : '';
  return sign + formatted + '%';
}

function formatHolders(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

// ============================================
// API CALLS
// ============================================

async function fetchTokens() {
  try {
    const response = await fetch(`${HOLDEX_API}/tokens?sort=${state.sort}&filter=${state.filter}`);
    if (!response.ok) throw new Error('Failed to fetch tokens');
    const data = await response.json();
    return data.tokens || [];
  } catch (error) {
    console.error('[HolDEX] Error fetching tokens:', error);
    return [];
  }
}

async function fetchTokenDetail(address) {
  try {
    const response = await fetch(`${HOLDEX_API}/token/${address}`);
    if (!response.ok) throw new Error('Failed to fetch token detail');
    return await response.json();
  } catch (error) {
    console.error('[HolDEX] Error fetching token detail:', error);
    return null;
  }
}

async function fetchStats() {
  try {
    const response = await fetch(`${HOLDEX_API}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  } catch (error) {
    console.error('[HolDEX] Error fetching stats:', error);
    return null;
  }
}

async function searchTokens(query) {
  try {
    const response = await fetch(`${HOLDEX_API}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[HolDEX] Search error:', error);
    return [];
  }
}

// ============================================
// UI UPDATES
// ============================================

function updateStats(stats) {
  if (!stats) return;

  const tokensEl = document.getElementById('stat-tokens');
  const volumeEl = document.getElementById('stat-volume');

  if (tokensEl) tokensEl.textContent = formatHolders(stats.totalTokens || 0);
  if (volumeEl) volumeEl.textContent = formatNumber(stats.volume24h || 0);
}

function renderTokenList(tokens) {
  const container = document.getElementById('token-list');
  if (!container) return;

  if (tokens.length === 0) {
    container.innerHTML = `
            <div class="token-row" style="justify-content: center; padding: 40px;">
                <span style="color: var(--white-muted);">No tokens found. Try a different filter.</span>
            </div>
        `;
    return;
  }

  container.innerHTML = tokens
    .map(
      (token, index) => `
        <div class="token-row" data-token="${escapeHtml(token.address || '')}" onclick="openTokenModal('${escapeHtml(token.address || '')}')">
            <span class="token-rank">${index + 1}</span>
            <div class="token-info">
                <div class="token-icon">${escapeHtml(token.symbol?.[0] || '?')}</div>
                <div>
                    <div class="token-name">${escapeHtml(token.name || 'Unknown')}</div>
                    <div class="token-symbol">$${escapeHtml(token.symbol || '???')}</div>
                </div>
            </div>
            <span class="token-price">${escapeHtml(formatPrice(token.price || 0))}</span>
            <span class="token-change ${token.change24h >= 0 ? 'positive' : 'negative'}">
                ${escapeHtml(formatPercent(token.change24h || 0))}
            </span>
            <span class="token-volume">${escapeHtml(formatNumber(token.volume24h || 0))}</span>
            <span class="token-mcap">${escapeHtml(formatNumber(token.marketCap || 0))}</span>
            <span class="token-holders">${escapeHtml(formatHolders(token.holders || 0))}</span>
            <div class="token-kscore">
                <span class="kscore-value">${escapeHtml(String(token.kscore || 0))}</span>
                <div class="kscore-bar">
                    <div class="kscore-fill" style="width: ${Math.min(100, Math.max(0, Number(token.kscore) || 0))}%"></div>
                </div>
            </div>
        </div>
    `
    )
    .join('');
}

// ============================================
// MODAL
// ============================================

function openTokenModal(address) {
  const modal = document.getElementById('token-modal');
  if (!modal) return;

  modal.classList.add('active');
  state.selectedToken = address;

  // Fetch and display token details
  fetchTokenDetail(address).then(token => {
    if (!token) return;

    document.getElementById('modal-icon').textContent = token.symbol?.[0] || '?';
    document.getElementById('modal-name').textContent = token.name || 'Unknown';
    document.getElementById('modal-symbol').textContent = '$' + (token.symbol || '???');
    document.getElementById('modal-price').textContent = formatPrice(token.price || 0);
    document.getElementById('modal-mcap').textContent = formatNumber(token.marketCap || 0);
    document.getElementById('modal-volume').textContent = formatNumber(token.volume24h || 0);
    document.getElementById('modal-kscore').textContent = token.kscore || 0;
  });
}

function closeTokenModal() {
  const modal = document.getElementById('token-modal');
  if (modal) {
    modal.classList.remove('active');
    state.selectedToken = null;
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;

      const tokens = await fetchTokens();
      renderTokenList(tokens);
    });
  });

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', async e => {
      state.sort = e.target.value;
      const tokens = await fetchTokens();
      renderTokenList(tokens);
    });
  }

  // Search input
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          const tokens = await fetchTokens();
          renderTokenList(tokens);
        } else {
          const results = await searchTokens(query);
          renderTokenList(results);
        }
      }, 300);
    });
  }

  // Modal close
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeTokenModal);
  }

  // Modal backdrop close
  const modal = document.getElementById('token-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeTokenModal();
      }
    });
  }

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeTokenModal();
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  console.log('[HolDEX] Initializing...');

  // Setup event listeners
  setupEventListeners();

  // Load initial data
  const [stats, tokens] = await Promise.all([fetchStats(), fetchTokens()]);

  updateStats(stats);

  // If we have tokens from API, render them; otherwise keep sample data
  if (tokens.length > 0) {
    renderTokenList(tokens);
  }

  // Refresh data periodically
  setInterval(async () => {
    const stats = await fetchStats();
    updateStats(stats);
  }, 30000);

  setInterval(async () => {
    const tokens = await fetchTokens();
    if (tokens.length > 0) {
      renderTokenList(tokens);
    }
  }, 60000);

  console.log('[HolDEX] Initialized');
}

// Expose modal function globally for onclick
window.openTokenModal = openTokenModal;

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
