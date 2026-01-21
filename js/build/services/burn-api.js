/**
 * Build V2 - Burn API Service
 * Fetches burn data from ASDF API for Yggdrasil visualization
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================

// Use relative URL in dev (proxied by Vite), full URL in production
const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://asdf-api.onrender.com/api';
const CACHE_TTL = 30000; // 30 seconds
const FETCH_TIMEOUT = 5000; // 5 seconds

// ============================================
// MOCK DATA (Fallback when API unavailable)
// ============================================

const MOCK_STATS = {
  totalBurned: 7393300,
  burnPercentage: 0.74,
  circulatingSupply: 992606700,
  uniqueBurners: 23,
  burnedToday: 12500,
  largestBurn: 3046567
};

const MOCK_RECENT_BURNS = [
  { wallet: '7xKXtg...3mPq', amount: 50000, timestamp: Date.now() - 300000 },
  { wallet: '9pLmNk...8vRs', amount: 25000, timestamp: Date.now() - 900000 },
  { wallet: '3hYjKl...2wXz', amount: 100000, timestamp: Date.now() - 1800000 }
];

// ============================================
// BURN API SERVICE
// ============================================

const BurnApiService = {
  /**
   * Cache storage
   */
  cache: {
    stats: { data: null, lastFetch: 0 },
    recentBurns: { data: null, lastFetch: 0 }
  },

  /**
   * Check if cache is valid
   * @param {string} key - Cache key ('stats' or 'recentBurns')
   * @returns {boolean}
   */
  isCacheValid(key) {
    const cached = this.cache[key];
    return cached.data !== null && (Date.now() - cached.lastFetch) < CACHE_TTL;
  },

  /**
   * Fetch with timeout
   * @param {string} url - URL to fetch
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * Get burn statistics
   * @returns {Promise<Object>} Burn stats
   */
  async getStats() {
    // Return cached data if valid
    if (this.isCacheValid('stats')) {
      return this.cache.stats.data;
    }

    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/ecosystem/burns`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Update cache
      this.cache.stats = {
        data: data,
        lastFetch: Date.now()
      };

      return data;
    } catch (error) {
      console.warn('[BurnApiService] Failed to fetch stats, using fallback:', error.message);
      return MOCK_STATS;
    }
  },

  /**
   * Get recent burns
   * @param {number} limit - Number of burns to fetch
   * @returns {Promise<Array>} Recent burns array
   */
  async getRecentBurns(limit = 10) {
    // Return cached data if valid
    if (this.isCacheValid('recentBurns')) {
      return this.cache.recentBurns.data.slice(0, limit);
    }

    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/ecosystem/burns?recent=true`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const burns = data.recentBurns || [];

      // Update cache
      this.cache.recentBurns = {
        data: burns,
        lastFetch: Date.now()
      };

      return burns.slice(0, limit);
    } catch (error) {
      console.warn('[BurnApiService] Failed to fetch recent burns, using fallback:', error.message);
      return MOCK_RECENT_BURNS.slice(0, limit);
    }
  },

  /**
   * Calculate burn intensity (0-1) based on recent activity
   * Used for visual animations
   * @returns {Promise<number>} Intensity value between 0 and 1
   */
  async getBurnIntensity() {
    const stats = await this.getStats();

    // Calculate intensity based on burns today vs average
    // Higher burnedToday = higher intensity
    const dailyAverage = stats.totalBurned / 30; // Rough monthly average
    const intensity = Math.min(1, (stats.burnedToday || 0) / (dailyAverage * 2));

    return Math.max(0.2, intensity); // Minimum 0.2 for visibility
  },

  /**
   * Format burn amount for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted string
   */
  formatAmount(amount) {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(2) + 'B';
    } else if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(2) + 'M';
    } else if (amount >= 1_000) {
      return (amount / 1_000).toFixed(1) + 'K';
    }
    return amount.toLocaleString();
  },

  /**
   * Format timestamp to relative time
   * @param {number|string} timestamp - Timestamp to format
   * @returns {string} Relative time string
   */
  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  },

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache.stats = { data: null, lastFetch: 0 };
    this.cache.recentBurns = { data: null, lastFetch: 0 };
  }
};

// ============================================
// EXPORTS
// ============================================

export { BurnApiService };
export default BurnApiService;

// Global export for browser
if (typeof window !== 'undefined') {
  window.BurnApiService = BurnApiService;
}
