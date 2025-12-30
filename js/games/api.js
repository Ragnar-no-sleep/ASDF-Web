/**
 * ASDF Games - API Client
 */

'use strict';

const ApiClient = {
    // Cache signed auth to avoid repeated signing prompts
    _authCache: null,
    _authCacheExpiry: 0,
    AUTH_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    /**
     * Generate cryptographically secure nonce
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Get CSRF token from meta tag if available
     */
    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    },

    /**
     * Get authentication headers with wallet signature
     * Uses secure nonce and caches to reduce signing prompts
     */
    async getAuthHeaders() {
        if (!appState.wallet) {
            return {};
        }

        // Return cached auth if still valid
        const now = Date.now();
        if (this._authCache && now < this._authCacheExpiry) {
            return this._authCache;
        }

        // Generate secure message with nonce
        const nonce = this.generateNonce();
        const timestamp = now;
        const message = [
            'ASDF Games Authentication',
            `Wallet: ${appState.wallet}`,
            `Nonce: ${nonce}`,
            `Timestamp: ${timestamp}`,
            'This signature proves you own this wallet.'
        ].join('\n');

        try {
            const provider = getPhantomProvider();
            if (!provider) {
                return { 'X-Wallet-Address': appState.wallet };
            }

            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
            const signature = btoa(String.fromCharCode(...signedMessage.signature));

            const headers = {
                'X-Wallet-Address': appState.wallet,
                'X-Auth-Nonce': nonce,
                'X-Auth-Timestamp': timestamp.toString(),
                'X-Auth-Signature': signature
            };

            // Add CSRF token if available
            const csrfToken = this.getCSRFToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            // Cache the auth headers
            this._authCache = headers;
            this._authCacheExpiry = now + this.AUTH_CACHE_DURATION;

            return headers;
        } catch (error) {
            console.warn('Could not sign message:', error);
            return { 'X-Wallet-Address': appState.wallet };
        }
    },

    /**
     * Clear auth cache (call on wallet disconnect)
     */
    clearAuthCache() {
        this._authCache = null;
        this._authCacheExpiry = 0;
    },

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;

        if (!RateLimiter.canMakeCall(endpoint)) {
            throw new Error('Rate limit exceeded. Please wait.');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (options.auth !== false && appState.wallet) {
            const authHeaders = await this.getAuthHeaders();
            Object.assign(headers, authHeaders);
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // Score endpoints
    async submitScore(gameId, score, isCompetitive = false, sessionData = null) {
        return this.request('/scores/submit', {
            method: 'POST',
            body: JSON.stringify({ gameId, score, isCompetitive, sessionData })
        });
    },

    async getBestScore(gameId) {
        return this.request(`/scores/best/${gameId}`);
    },

    async getAllBestScores() {
        return this.request('/scores/all');
    },

    async getWeeklyLeaderboard(gameId, limit = 10) {
        return this.request(`/scores/leaderboard/weekly/${gameId}?limit=${limit}`, { auth: false });
    },

    async getCycleLeaderboard(limit = 10) {
        return this.request(`/scores/leaderboard/cycle?limit=${limit}`, { auth: false });
    },

    // User endpoints
    async getUserProfile() {
        return this.request('/users/me');
    },

    async refreshBalance() {
        return this.request('/users/refresh-balance', { method: 'POST' });
    },

    async getAirdropSlots() {
        return this.request('/users/airdrop-slots');
    },

    async getPeriodInfo() {
        return this.request('/users/period', { auth: false });
    }
};
