/**
 * HolDEX - Token Tracker JavaScript
 * Connects to sollama58/HolDex API
 *
 * Real endpoints (sollama58/HolDex):
 *   GET /api/tokens?sort=&filter=&search=  — token list (field: kScore, mint, ticker, priceUsd)
 *   GET /api/token/:mint                   — single token (wrapped in data.token)
 *
 * No /stats endpoint — stats derived from token list response
 */

'use strict';

import { AudioFeedback } from './utils/audio-feedback.js';
import { ASDF_ENDPOINTS } from './config/endpoints.js';
import { PageLifecycle } from './core/PageLifecycle.js';
import { fetchWithRetry } from './utils/fetch-retry.js';
import { esc } from './utils/escape.js';
import { POLL_INTERVAL, DEBOUNCE } from './config/timing.js';

const API_BASE = ASDF_ENDPOINTS.holdex;

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

// fetchWithRetry imported from js/utils/fetch-retry.js

// ============================================
// FORMAT UTILS
// HolDex-specific — semantically different from format.js:
//   formatUSD     → currency with K/M/B suffixes ($24.7M)
//   formatPrice   → adaptive decimal precision ($0.0042)
//   formatPercent → signed percentage (+12.5%)
//   formatHolders → compact count (1.2K)
// ============================================

function formatUSD(num) {
  if (num >= 1_000_000_000) return '$' + (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return '$' + (num / 1_000).toFixed(2) + 'K';
  return '$' + num.toLocaleString();
}

function formatPrice(num) {
  if (num < 0.0001) return '$' + num.toFixed(8);
  if (num < 0.01) return '$' + num.toFixed(6);
  if (num < 1) return '$' + num.toFixed(4);
  return '$' + num.toFixed(2);
}

function formatPercent(num) {
  return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
}

function formatHolders(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ============================================
// API CALLS
// ============================================

async function fetchTokens() {
  try {
    const response = await fetchWithRetry(
      `${API_BASE}/api/tokens?sort=${state.sort}&filter=${state.filter}`
    );
    const data = await response.json();
    return data.tokens || [];
  } catch (error) {
    console.error('[HolDEX] Error fetching tokens:', error);
    return [];
  }
}

async function fetchTokenDetail(mint) {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/token/${mint}`);
    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error('[HolDEX] Error fetching token detail:', error);
    return null;
  }
}

async function searchTokens(query) {
  try {
    const response = await fetchWithRetry(
      `${API_BASE}/api/tokens?search=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.tokens || [];
  } catch (error) {
    console.error('[HolDEX] Search error:', error);
    return [];
  }
}

// ============================================
// UI UPDATES
// ============================================

function updateSidebar(tokens) {
  // Token count
  const tokensEl = document.getElementById('stat-tokens');
  if (tokensEl) {
    tokensEl.textContent = tokens.length > 0 ? tokens.length.toLocaleString() : '\u2014';
    tokensEl.classList.remove('is-loading');
  }

  // Aggregate volume — sum from list (no /stats endpoint)
  const volumeEl = document.getElementById('stat-volume');
  if (volumeEl) {
    const totalVolume = tokens.reduce((sum, t) => sum + (t.volume24h || 0), 0);
    volumeEl.textContent = totalVolume > 0 ? formatUSD(totalVolume) : '\u2014';
    volumeEl.classList.remove('is-loading');
  }

  // Credit rating — computed from average K-Score across loaded tokens
  if (tokens.length > 0) {
    const avgKScore = tokens.reduce((sum, t) => sum + (t.kScore || 0), 0) / tokens.length;
    const credit = getCreditRating(avgKScore);
    const creditEl = document.getElementById('credit-rating');
    if (creditEl) {
      creditEl.textContent = credit.grade;
      creditEl.className = 'credit-badge credit-badge--' + credit.css;
    }
  }

  // Top Gainers — top 3 by change24h (positive only)
  const gainersEl = document.getElementById('gainers-list');
  if (!gainersEl) return;

  const gainers = [...tokens]
    .filter(t => (t.change24h || 0) > 0)
    .sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
    .slice(0, 3);

  if (gainers.length > 0) {
    gainersEl.innerHTML = gainers
      .map(
        t => `
      <div class="gainer">
        <span class="gainer-symbol">${esc('$' + (t.ticker || '???'))}</span>
        <span class="gainer-change">${esc(formatPercent(t.change24h || 0))}</span>
      </div>`
      )
      .join('');
  } else {
    gainersEl.innerHTML = '<div class="gainer"><span class="gainer-symbol">\u2014</span></div>';
  }
}

function renderTokenList(tokens) {
  const container = document.getElementById('token-list');
  if (!container) return;

  if (tokens.length === 0) {
    container.innerHTML = `<tr><td colspan="8" class="holdex-empty">No tokens found.</td></tr>`;
    return;
  }

  container.innerHTML = tokens
    .map((token, index) => {
      const ks = Number(token.kScore) || 0;
      const rank = getKRank(ks);
      const changeClass = (token.change24h || 0) >= 0 ? 'positive' : 'negative';
      return `<tr class="token-row" data-token="${esc(token.mint || '')}" data-action="open-token-modal">
        <td class="col-rank">${index + 1}</td>
        <td class="col-token">
          <div class="token-info">
            <div class="token-icon">${esc((token.ticker || '?')[0])}</div>
            <div>
              <div class="token-name">${esc(token.name || 'Unknown')}</div>
              <div class="token-symbol">$${esc(token.ticker || '???')}</div>
            </div>
          </div>
        </td>
        <td class="col-price token-price">${esc(formatPrice(token.priceUsd || 0))}</td>
        <td class="col-change token-change ${changeClass}">${esc(formatPercent(token.change24h || 0))}</td>
        <td class="col-volume token-volume">${esc(formatUSD(token.volume24h || 0))}</td>
        <td class="col-mcap token-mcap">${esc(formatUSD(token.marketCap || 0))}</td>
        <td class="col-holders token-holders">${esc(formatHolders(token.holders || 0))}</td>
        <td class="col-kscore">
          <div class="token-kscore">
            <span class="rank-badge rank-badge--${rank.css}" title="${rank.name}">&#9670;</span>
            <span class="kscore-value">${esc(String(ks))}</span>
            <div class="kscore-bar">
              <div class="kscore-fill" data-w="${Math.min(100, Math.max(0, ks))}"></div>
            </div>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  // Apply kscore-fill widths via CSSOM (CSP Phase 2 — no inline style=)
  container.querySelectorAll('.kscore-fill[data-w]').forEach(el => {
    el.style.setProperty('--w', el.dataset.w + '%');
  });
}

// ============================================
// MODAL
// ============================================

function openTokenModal(mint) {
  const modal = document.getElementById('token-modal');
  if (!modal) return;

  AudioFeedback.play('click');
  modal.classList.add('active');
  state.selectedToken = mint;

  fetchTokenDetail(mint).then(token => {
    if (!token) return;
    document.getElementById('modal-icon').textContent = token.ticker?.[0] || '?';
    document.getElementById('modal-name').textContent = token.name || 'Unknown';
    document.getElementById('modal-symbol').textContent = '$' + (token.ticker || '???');
    document.getElementById('modal-price').textContent = formatPrice(token.priceUsd || 0);
    document.getElementById('modal-mcap').textContent = formatUSD(token.marketCap || 0);
    document.getElementById('modal-volume').textContent = formatUSD(token.volume24h || 0);
    document.getElementById('modal-kscore').textContent = token.kScore || 0;
  });
}

function closeTokenModal() {
  const modal = document.getElementById('token-modal');
  if (!modal) return;

  AudioFeedback.play('click');
  modal.classList.remove('active');
  state.selectedToken = null;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', async () => {
      AudioFeedback.play('click');
      document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      const tokens = await fetchTokens();
      state.tokens = tokens;
      renderTokenList(tokens);
      updateSidebar(tokens);
    });
  });

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', async e => {
      AudioFeedback.play('click');
      state.sort = e.target.value;
      const tokens = await fetchTokens();
      state.tokens = tokens;
      renderTokenList(tokens);
      updateSidebar(tokens);
    });
  }

  // Search — debounced
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        const tokens = query.length >= 2 ? await searchTokens(query) : await fetchTokens();
        renderTokenList(tokens);
        updateSidebar(tokens);
      }, DEBOUNCE.SEARCH);
    });
  }

  // Modal close
  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeTokenModal);

  const modal = document.getElementById('token-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeTokenModal();
      }
    });
  }

  PageLifecycle.registerListener(document, 'keydown', e => {
    if (e.key === 'Escape') closeTokenModal();
  });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  AudioFeedback.init();
  setupEventListeners();

  const tokens = await fetchTokens();
  state.tokens = tokens;
  renderTokenList(tokens);
  updateSidebar(tokens);

  PageLifecycle.registerTimer(
    'holdex-tokens',
    setInterval(async () => {
      const tokens = await fetchTokens();
      state.tokens = tokens;
      renderTokenList(tokens);
      updateSidebar(tokens);
    }, POLL_INTERVAL.SLOW)
  );
}

// Event delegation for token rows
document.addEventListener('click', e => {
  const row = e.target.closest('[data-action="open-token-modal"]');
  if (row) openTokenModal(row.dataset.token);
});

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
