/**
 * ASDF Games - Utility Functions
 * Security, validation, and rate limiting utilities
 */

'use strict';

// ============================================
// SPRITE CACHE - Performance optimization
// Pre-renders emojis/text to offscreen canvas
// drawImage() is 10-100x faster than fillText()
// ============================================

const SpriteCache = {
    cache: new Map(),

    /**
     * Get or create a cached sprite for an emoji/text
     * @param {string} emoji - The emoji or text to render
     * @param {number} size - Font size in pixels
     * @param {string} color - Optional fill color (default: white)
     * @returns {HTMLCanvasElement} Offscreen canvas with rendered sprite
     */
    get(emoji, size, color = '#ffffff') {
        const key = `${emoji}_${size}_${color}`;

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // Create offscreen canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Size with padding for emoji overflow
        const padding = Math.ceil(size * 0.3);
        canvas.width = size + padding * 2;
        canvas.height = size + padding * 2;

        // Render emoji
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);

        // Cache and return
        this.cache.set(key, canvas);
        return canvas;
    },

    /**
     * Draw a cached sprite to a canvas context
     * @param {CanvasRenderingContext2D} ctx - Target canvas context
     * @param {string} emoji - The emoji to draw
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} size - Font size
     * @param {string} color - Optional color
     */
    draw(ctx, emoji, x, y, size, color = '#ffffff') {
        const sprite = this.get(emoji, size, color);
        ctx.drawImage(
            sprite,
            x - sprite.width / 2,
            y - sprite.height / 2
        );
    },

    /**
     * Draw with rotation and/or scale
     * @param {CanvasRenderingContext2D} ctx - Target canvas context
     * @param {string} emoji - The emoji to draw
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} size - Font size
     * @param {Object} opts - Options: { rotation, scaleX, scaleY, alpha, color }
     */
    drawTransformed(ctx, emoji, x, y, size, opts = {}) {
        const sprite = this.get(emoji, size, opts.color || '#ffffff');
        const { rotation = 0, scaleX = 1, scaleY = 1, alpha = 1 } = opts;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        if (rotation) ctx.rotate(rotation);
        if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
        ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
        ctx.restore();
    },

    /**
     * Pre-warm the cache with commonly used sprites
     * Call this at game start for smoother first frames
     * @param {Array} sprites - Array of { emoji, size, color? }
     */
    preload(sprites) {
        sprites.forEach(({ emoji, size, color }) => {
            this.get(emoji, size, color || '#ffffff');
        });
    },

    /**
     * Clear the cache (e.g., on game end to free memory)
     */
    clear() {
        this.cache.clear();
    },

    /**
     * Get cache statistics
     */
    stats() {
        return {
            entries: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
};

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Escape HTML entities for safe display
 * This is the canonical definition - loaded first via utils.js
 * Other files may redeclare (function hoisting allows this)
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Deep freeze an object and all nested objects
 * This is the canonical definition - loaded first via utils.js
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            deepFreeze(obj[key]);
        }
    });
    return Object.freeze(obj);
}

// ============================================
// INPUT VALIDATION UTILITIES
// ============================================

/**
 * Validate Solana public key format using Web3.js
 * This validates both format AND checksum
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string') return false;
    if (address.length < 32 || address.length > 44) return false;
    // Basic format check first
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) return false;

    // Use Solana Web3.js for proper validation if available
    if (typeof solanaWeb3 !== 'undefined' && solanaWeb3.PublicKey) {
        try {
            new solanaWeb3.PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }
    // Fallback to format-only validation if Web3.js not loaded
    return true;
}

// Valid game IDs - whitelist for validation
const VALID_GAME_IDS = new Set([
    'tokencatcher', 'burnrunner', 'scamblaster', 'cryptoheist',
    'whalewatch', 'stakestacker', 'dexdash',
    'burnorhold', 'liquiditymaze', 'pumparena'
]);

/**
 * Validate game ID against whitelist
 */
function isValidGameId(gameId) {
    return typeof gameId === 'string' && VALID_GAME_IDS.has(gameId.toLowerCase());
}

// ============================================
// RATE LIMITING FOR RPC CALLS
// ============================================

const RateLimiter = {
    calls: new Map(),

    // Per-endpoint rate limits
    limits: {
        'solana-rpc': { maxCalls: 3, windowMs: 10000 },      // 3 calls per 10s
        'balance-check': { maxCalls: 2, windowMs: 30000 },   // 2 calls per 30s
        'score-submit': { maxCalls: 5, windowMs: 60000 },    // 5 calls per minute
        'leaderboard': { maxCalls: 10, windowMs: 60000 },    // 10 calls per minute
        'default': { maxCalls: 10, windowMs: 60000 }         // Default fallback
    },

    canMakeCall(endpoint) {
        const now = Date.now();
        const limit = this.limits[endpoint] || this.limits['default'];
        const callTimes = this.calls.get(endpoint) || [];
        const recentCalls = callTimes.filter(time => now - time < limit.windowMs);

        if (recentCalls.length >= limit.maxCalls) {
            return false;
        }

        recentCalls.push(now);
        this.calls.set(endpoint, recentCalls);
        return true;
    }
};

// ============================================
// ANTI-CHEAT SYSTEM
// ============================================

const AntiCheat = {
    // Game session tracking
    sessions: new Map(),

    // Score thresholds per game (max possible scores per second)
    scoreThresholds: {
        'tokencatcher': { maxPerSecond: 20, maxTotal: 5000 },
        'burnrunner': { maxPerSecond: 50, maxTotal: 50000 },
        'scamblaster': { maxPerSecond: 100, maxTotal: 100000 },
        'cryptoheist': { maxPerSecond: 200, maxTotal: 200000 },
        'whalewatch': { maxPerSecond: 100, maxTotal: 100000 },
        'stakestacker': { maxPerSecond: 50, maxTotal: 50000 },
        'dexdash': { maxPerSecond: 100, maxTotal: 100000 },
        'burnorhold': { maxPerSecond: 50, maxTotal: 50000 },
        'liquiditymaze': { maxPerSecond: 500, maxTotal: 100000 },
        'pumparena': { maxPerSecond: 1000, maxTotal: 1000000 }
    },

    /**
     * Start a new game session
     * @param {string} gameId - Game identifier
     * @returns {Object} Session data
     */
    startSession(gameId) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            gameId: gameId,
            startTime: Date.now(),
            actions: [],
            scores: [],
            lastActionTime: Date.now(),
            flags: [],
            hash: null
        };

        this.sessions.set(sessionId, session);
        return session;
    },

    /**
     * Generate cryptographically secure session ID
     */
    generateSessionId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Record a game action
     * @param {string} sessionId - Session identifier
     * @param {string} actionType - Type of action (jump, shoot, buy, sell, etc.)
     * @param {Object} data - Action data
     */
    recordAction(sessionId, actionType, data = {}) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const now = Date.now();
        const action = {
            type: actionType,
            time: now,
            delta: now - session.lastActionTime,
            data: data
        };

        session.actions.push(action);
        session.lastActionTime = now;

        // Check for suspicious patterns
        this.checkActionPatterns(session, action);

        // Limit action history to prevent memory issues
        if (session.actions.length > 1000) {
            session.actions = session.actions.slice(-500);
        }

        return true;
    },

    /**
     * Record a score update
     * @param {string} sessionId - Session identifier
     * @param {number} score - Current score
     * @param {number} delta - Score change
     */
    recordScore(sessionId, score, delta) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const now = Date.now();
        session.scores.push({
            score: score,
            delta: delta,
            time: now
        });

        // Check for impossible scores
        this.checkScoreValidity(session, score, delta);

        return true;
    },

    /**
     * Check action patterns for cheating
     */
    checkActionPatterns(session, action) {
        // Check for inhuman action speed (< 50ms between actions)
        if (action.delta < 50 && session.actions.length > 5) {
            const recentActions = session.actions.slice(-10);
            const avgDelta = recentActions.reduce((sum, a) => sum + a.delta, 0) / recentActions.length;
            if (avgDelta < 50) {
                session.flags.push({
                    type: 'INHUMAN_SPEED',
                    time: Date.now(),
                    avgDelta: avgDelta
                });
            }
        }

        // Check for repetitive patterns (bot-like behavior)
        if (session.actions.length >= 20) {
            const recent = session.actions.slice(-20);
            const pattern = recent.map(a => a.type).join(',');
            const halfPattern = recent.slice(0, 10).map(a => a.type).join(',');

            if (pattern === halfPattern + ',' + halfPattern) {
                session.flags.push({
                    type: 'REPETITIVE_PATTERN',
                    time: Date.now()
                });
            }
        }
    },

    /**
     * Check score validity
     */
    checkScoreValidity(session, score, delta) {
        const threshold = this.scoreThresholds[session.gameId] || { maxPerSecond: 100, maxTotal: 100000 };
        const elapsed = (Date.now() - session.startTime) / 1000;

        // Check if score exceeds max possible
        if (score > threshold.maxTotal) {
            session.flags.push({
                type: 'IMPOSSIBLE_SCORE',
                time: Date.now(),
                score: score,
                max: threshold.maxTotal
            });
        }

        // Check if score rate is too high
        if (elapsed > 0) {
            const scorePerSecond = score / elapsed;
            if (scorePerSecond > threshold.maxPerSecond * 2) {
                session.flags.push({
                    type: 'SCORE_RATE_TOO_HIGH',
                    time: Date.now(),
                    rate: scorePerSecond,
                    maxRate: threshold.maxPerSecond
                });
            }
        }

        // Check for negative scores or impossibly large jumps
        if (delta < 0 && session.gameId !== 'pumparena') {
            session.flags.push({
                type: 'NEGATIVE_SCORE_DELTA',
                time: Date.now(),
                delta: delta
            });
        }
    },

    /**
     * End session and generate validation data
     * @param {string} sessionId - Session identifier
     * @param {number} finalScore - Final game score
     * @returns {Object} Session validation data for server
     */
    endSession(sessionId, finalScore) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const endTime = Date.now();
        const duration = endTime - session.startTime;

        // Generate session hash for server verification
        const sessionData = {
            id: session.id,
            gameId: session.gameId,
            startTime: session.startTime,
            endTime: endTime,
            duration: duration,
            finalScore: finalScore,
            actionCount: session.actions.length,
            flags: session.flags,
            valid: session.flags.length === 0
        };

        // Create integrity hash
        sessionData.hash = this.generateHash(sessionData);

        // Cleanup
        this.sessions.delete(sessionId);

        return sessionData;
    },

    /**
     * Generate simple hash for session data
     * Note: Real security requires server-side verification
     */
    generateHash(data) {
        const str = JSON.stringify({
            id: data.id,
            gameId: data.gameId,
            startTime: data.startTime,
            endTime: data.endTime,
            finalScore: data.finalScore,
            actionCount: data.actionCount,
            flagCount: data.flags.length
        });

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        // Mix with session ID for uniqueness
        const sessionHash = data.id.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
        return ((hash ^ sessionHash) >>> 0).toString(36);
    },

    /**
     * Check if a session is valid (no flags)
     */
    isSessionValid(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.flags.length === 0 : false;
    },

    /**
     * Get session flags
     */
    getSessionFlags(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? [...session.flags] : [];
    },

    /**
     * Clear old sessions (memory cleanup)
     */
    cleanup() {
        const maxAge = 30 * 60 * 1000; // 30 minutes
        const now = Date.now();

        for (const [id, session] of this.sessions) {
            if (now - session.startTime > maxAge) {
                this.sessions.delete(id);
            }
        }
    }
};

// Periodic cleanup
setInterval(() => AntiCheat.cleanup(), 5 * 60 * 1000);
