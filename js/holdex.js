/**
 * HolDEX - Token Tracker JavaScript
 * Connects to holdex.onrender.com API
 */

'use strict';

const HOLDEX_API = 'https://holdex.onrender.com/api';

// escapeHtml loaded from js/shared/security.js

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
// K-SCORE RANKS & CREDIT RATINGS
// (Adapted from sollama58/HolDex calculator.js)
// ============================================

function getKRank(score) {
  if (score >= 90) return { name: 'Diamond', css: 'diamond' };
  if (score >= 80) return { name: 'Platinum', css: 'platinum' };
  if (score >= 70) return { name: 'Gold', css: 'gold' };
  if (score >= 60) return { name: 'Silver', css: 'silver' };
  if (score >= 50) return { name: 'Bronze', css: 'bronze' };
  if (score >= 40) return { name: 'Copper', css: 'copper' };
  if (score >= 20) return { name: 'Iron', css: 'iron' };
  return { name: 'Rust', css: 'rust' };
}

function getCreditRating(score) {
  if (score >= 90) return { grade: 'A1', css: 'a1' };
  if (score >= 75) return { grade: 'A2', css: 'a2' };
  if (score >= 60) return { grade: 'B1', css: 'b1' };
  if (score >= 45) return { grade: 'B2', css: 'b2' };
  if (score >= 30) return { grade: 'C', css: 'c' };
  return { grade: 'D', css: 'd' };
}

// ============================================
// EXPONENTIAL BACKOFF FETCH
// (Adapted from sollama58/ASDFBurnTracker)
// ============================================

async function fetchWithRetry(url, options, maxRetries) {
  if (!options) options = {};
  if (!maxRetries) maxRetries = 3;
  var delay = 1000;
  for (var i = 0; i <= maxRetries; i++) {
    try {
      var response = await fetch(url, options);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response;
    } catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(function (resolve) {
        setTimeout(resolve, delay);
      });
      delay *= 2;
    }
  }
}

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
    const response = await fetchWithRetry(
      HOLDEX_API + '/tokens?sort=' + state.sort + '&filter=' + state.filter
    );
    const data = await response.json();
    return data.tokens || [];
  } catch (error) {
    console.error('[HolDEX] Error fetching tokens:', error);
    return [];
  }
}

async function fetchTokenDetail(address) {
  try {
    const response = await fetchWithRetry(HOLDEX_API + '/token/' + address);
    return await response.json();
  } catch (error) {
    console.error('[HolDEX] Error fetching token detail:', error);
    return null;
  }
}

async function fetchStats() {
  try {
    const response = await fetchWithRetry(HOLDEX_API + '/stats');
    return await response.json();
  } catch (error) {
    console.error('[HolDEX] Error fetching stats:', error);
    return null;
  }
}

async function searchTokens(query) {
  try {
    const response = await fetchWithRetry(HOLDEX_API + '/search?q=' + encodeURIComponent(query));
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

  if (tokensEl) {
    tokensEl.textContent = formatHolders(stats.totalTokens || 0);
    tokensEl.classList.remove('is-loading');
  }
  if (volumeEl) {
    volumeEl.textContent = formatNumber(stats.volume24h || 0);
    volumeEl.classList.remove('is-loading');
  }

  // Update credit rating badge from aggregate K-Score
  var avgKScore = stats.averageKScore || 87;
  var credit = getCreditRating(avgKScore);
  var creditEl = document.getElementById('credit-rating');
  if (creditEl) {
    creditEl.textContent = credit.grade;
    creditEl.className = 'credit-badge credit-badge--' + credit.css;
  }
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
    .map(function (token, index) {
      var ks = Number(token.kscore) || 0;
      var rank = getKRank(ks);
      return (
        '<div class="token-row" data-token="' +
        escapeHtml(token.address || '') +
        '" data-action="open-token-modal">' +
        '<span class="token-rank">' +
        (index + 1) +
        '</span>' +
        '<div class="token-info">' +
        '<div class="token-icon">' +
        escapeHtml((token.symbol || '?')[0]) +
        '</div>' +
        '<div>' +
        '<div class="token-name">' +
        escapeHtml(token.name || 'Unknown') +
        '</div>' +
        '<div class="token-symbol">$' +
        escapeHtml(token.symbol || '???') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<span class="token-price">' +
        escapeHtml(formatPrice(token.price || 0)) +
        '</span>' +
        '<span class="token-change ' +
        (token.change24h >= 0 ? 'positive' : 'negative') +
        '">' +
        escapeHtml(formatPercent(token.change24h || 0)) +
        '</span>' +
        '<span class="token-volume">' +
        escapeHtml(formatNumber(token.volume24h || 0)) +
        '</span>' +
        '<span class="token-mcap">' +
        escapeHtml(formatNumber(token.marketCap || 0)) +
        '</span>' +
        '<span class="token-holders">' +
        escapeHtml(formatHolders(token.holders || 0)) +
        '</span>' +
        '<div class="token-kscore">' +
        '<span class="rank-badge rank-badge--' +
        rank.css +
        '" title="' +
        rank.name +
        '">&#9670;</span>' +
        '<span class="kscore-value">' +
        escapeHtml(String(ks)) +
        '</span>' +
        '<div class="kscore-bar">' +
        '<div class="kscore-fill" style="width: ' +
        Math.min(100, Math.max(0, ks)) +
        '%"></div>' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    })
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

// Event delegation for token rows (replaces inline onclick)
document.addEventListener('click', e => {
  const row = e.target.closest('[data-action="open-token-modal"]');
  if (row) openTokenModal(row.dataset.token);
});

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
