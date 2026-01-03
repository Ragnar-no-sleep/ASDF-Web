/**
 * ASDF Games - API Client
 *
 * Security: Uses httpOnly cookies for JWT authentication
 * - Cookies are set/cleared by the server
 * - credentials: 'include' sends cookies with cross-origin requests
 * - CSRF token added to state-changing requests
 */

'use strict';

const ApiClient = {
    // Track authentication state (cookie is managed by server)
    _isAuthenticated: false,

    /**
     * Generate cryptographically secure nonce
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Get CSRF token from meta tag or cookie
     * Falls back gracefully if not available
     */
    getCSRFToken() {
        // First try meta tag
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            return meta.getAttribute('content');
        }
        // Fall back to cookie if available (non-httpOnly CSRF cookie)
        const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : null;
    },

    /**
     * Get authentication headers with wallet signature
     * Used for initial authentication before cookie is set
     */
    async getWalletSignatureHeaders() {
        if (!appState.wallet) {
            return {};
        }

        // Generate secure message with nonce
        const nonce = this.generateNonce();
        const timestamp = Date.now();
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

            return {
                'X-Wallet-Address': appState.wallet,
                'X-Auth-Nonce': nonce,
                'X-Auth-Timestamp': timestamp.toString(),
                'X-Auth-Signature': signature
            };
        } catch (error) {
            if (CONFIG.DEV_MODE) {
                console.warn('Could not sign message:', error);
            }
            return { 'X-Wallet-Address': appState.wallet };
        }
    },

    /**
     * Mark as authenticated (called after successful login)
     */
    setAuthenticated(value) {
        this._isAuthenticated = value;
    },

    /**
     * Check if user appears to be authenticated
     * Note: Server-side validation is authoritative
     */
    isAuthenticated() {
        return this._isAuthenticated;
    },

    /**
     * Make an API request
     * Uses httpOnly cookies for authentication (credentials: 'include')
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

        // Add CSRF token for state-changing requests
        if (options.method && options.method !== 'GET') {
            const csrfToken = this.getCSRFToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                // CRITICAL: Include cookies with cross-origin requests
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle auth errors - update state
                if (response.status === 401) {
                    this._isAuthenticated = false;
                }
                throw new Error(data.message || data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            // Only log errors in dev mode to avoid console spam
            if (CONFIG.DEV_MODE) {
                console.warn(`API Error [${endpoint}]:`, error.message);
            }
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
    },

    // Auth endpoints

    /**
     * Request authentication challenge from server
     */
    async requestChallenge(wallet) {
        return this.request('/auth/challenge', {
            method: 'POST',
            body: JSON.stringify({ wallet })
        });
    },

    /**
     * Verify wallet signature and authenticate
     * Server will set httpOnly cookie on success
     */
    async verifyAndLogin(wallet, signature) {
        const result = await this.request('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ wallet, signature })
        });

        if (result.success) {
            this._isAuthenticated = true;
        }

        return result;
    },

    /**
     * Refresh authentication
     * Server will update httpOnly cookie with new token
     */
    async refreshAuth() {
        try {
            const result = await this.request('/auth/refresh');
            if (result.success) {
                this._isAuthenticated = true;
            }
            return result;
        } catch (error) {
            this._isAuthenticated = false;
            throw error;
        }
    },

    /**
     * Logout - clear server-side session and cookie
     */
    async logout() {
        try {
            const result = await this.request('/auth/logout', {
                method: 'POST'
            });
            this._isAuthenticated = false;
            return result;
        } catch (error) {
            // Still mark as logged out even if server call fails
            this._isAuthenticated = false;
            throw error;
        }
    }
};
