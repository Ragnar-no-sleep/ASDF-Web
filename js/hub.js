/**
 * ASDF Hub Central
 * Minimal JS for live stats and nav behavior
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const API_URL = 'https://asdf-api.onrender.com';
  const REFRESH_INTERVAL = 30000; // 30 seconds

  // ============================================
  // DOM ELEMENTS
  // ============================================

  const nav = document.getElementById('hub-nav');
  const statBurned = document.getElementById('stat-burned');
  const statSupply = document.getElementById('stat-supply');

  // ============================================
  // NAV SCROLL BEHAVIOR
  // ============================================

  function handleScroll() {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  // ============================================
  // LIVE STATS
  // ============================================

  function formatNumber(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

  async function fetchStats() {
    try {
      const response = await fetch(`${API_URL}/api/burn-stats`);
      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();

      if (data.totalBurned) {
        statBurned.textContent = formatNumber(data.totalBurned);
      }

      if (data.currentSupply) {
        statSupply.textContent = formatNumber(data.currentSupply);
      }
    } catch (error) {
      console.log('Stats fetch failed, using fallback');
      // Fallback values
      statBurned.textContent = '8.2%';
      statSupply.textContent = '917M';
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Nav scroll behavior
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    // Fetch live stats
    fetchStats();
    setInterval(fetchStats, REFRESH_INTERVAL);
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
