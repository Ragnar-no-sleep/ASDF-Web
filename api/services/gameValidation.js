/**
 * ASDF API - Game Score Validation Service
 *
 * Anti-cheat game validation with:
 * - Score plausibility checks
 * - Session integrity verification
 * - Rate limiting per game session
 * - Statistical anomaly detection
 *
 * Security by Design:
 * - Server-side score validation
 * - Cryptographic session tokens
 * - Historical analysis for cheaters
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// Game configuration (Fibonacci-based constraints)
const GAME_CONFIG = {
    // Flappy Bird style game
    flappy: {
        maxScorePerSecond: 2,        // Max 2 points per second
        maxPossibleScore: 1000,      // Absolute max score
        minGameDuration: 5000,       // Min 5 seconds
        maxGameDuration: 600000,     // Max 10 minutes
        suspiciousThreshold: 0.95    // 95th percentile = suspicious
    },
    // Snake style game
    snake: {
        maxScorePerSecond: 5,
        maxPossibleScore: 5000,
        minGameDuration: 3000,
        maxGameDuration: 1800000,    // 30 minutes
        suspiciousThreshold: 0.90
    },
    // Generic game defaults
    default: {
        maxScorePerSecond: 10,
        maxPossibleScore: 10000,
        minGameDuration: 1000,
        maxGameDuration: 3600000,    // 1 hour
        suspiciousThreshold: 0.95
    }
};

// Session secret for HMAC (should be from env in production)
const SESSION_SECRET = process.env.GAME_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Active game sessions
const gameSessions = new Map();

// Player score history for anomaly detection
const playerHistory = new Map();

// Session expiry (10 minutes)
const SESSION_EXPIRY = 10 * 60 * 1000;

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Start a new game session
 * @param {string} wallet - Player wallet
 * @param {string} gameType - Type of game
 * @returns {{sessionId: string, token: string, startTime: number}}
 */
function startGameSession(wallet, gameType = 'default') {
    // Cleanup old sessions
    cleanupExpiredSessions();

    // Generate secure session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    const startTime = Date.now();

    // Create session token (HMAC for integrity)
    const tokenData = `${sessionId}:${wallet}:${startTime}:${gameType}`;
    const token = crypto.createHmac('sha256', SESSION_SECRET)
        .update(tokenData)
        .digest('hex');

    // Store session
    gameSessions.set(sessionId, {
        wallet,
        gameType,
        startTime,
        token,
        scoreSubmitted: false,
        lastActivity: startTime
    });

    logAudit('game_session_start', {
        wallet: wallet.slice(0, 8) + '...',
        gameType,
        sessionId: sessionId.slice(0, 8) + '...'
    });

    return {
        sessionId,
        token,
        startTime,
        gameType
    };
}

/**
 * Verify session token integrity
 * @param {string} sessionId - Session ID
 * @param {string} token - Token to verify
 * @returns {boolean}
 */
function verifySessionToken(sessionId, token) {
    const session = gameSessions.get(sessionId);
    if (!session) return false;

    const expectedData = `${sessionId}:${session.wallet}:${session.startTime}:${session.gameType}`;
    const expectedToken = crypto.createHmac('sha256', SESSION_SECRET)
        .update(expectedData)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expectedToken)
    );
}

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of gameSessions.entries()) {
        if (now - session.startTime > SESSION_EXPIRY) {
            gameSessions.delete(sessionId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[GameValidation] Cleaned ${cleaned} expired sessions`);
    }
}

// ============================================
// SCORE VALIDATION
// ============================================

/**
 * Validate and submit a game score
 * @param {string} sessionId - Game session ID
 * @param {string} token - Session token
 * @param {number} score - Final score
 * @param {Object} gameData - Additional game data for validation
 * @returns {{valid: boolean, score?: number, error?: string, suspicious?: boolean}}
 */
function submitScore(sessionId, token, score, gameData = {}) {
    // Verify session exists
    const session = gameSessions.get(sessionId);
    if (!session) {
        logAudit('score_invalid_session', { sessionId: sessionId?.slice(0, 8) });
        return { valid: false, error: 'Invalid or expired session' };
    }

    // Verify token
    if (!verifySessionToken(sessionId, token)) {
        logAudit('score_invalid_token', {
            wallet: session.wallet.slice(0, 8) + '...',
            sessionId: sessionId.slice(0, 8)
        });
        return { valid: false, error: 'Invalid session token' };
    }

    // Check if already submitted
    if (session.scoreSubmitted) {
        logAudit('score_duplicate', {
            wallet: session.wallet.slice(0, 8) + '...',
            sessionId: sessionId.slice(0, 8)
        });
        return { valid: false, error: 'Score already submitted for this session' };
    }

    const now = Date.now();
    const duration = now - session.startTime;
    const config = GAME_CONFIG[session.gameType] || GAME_CONFIG.default;

    // Validate game duration
    if (duration < config.minGameDuration) {
        logAudit('score_too_fast', {
            wallet: session.wallet.slice(0, 8) + '...',
            duration,
            minRequired: config.minGameDuration
        });
        return { valid: false, error: 'Game completed too quickly', suspicious: true };
    }

    if (duration > config.maxGameDuration) {
        return { valid: false, error: 'Game session expired' };
    }

    // Validate score value
    if (typeof score !== 'number' || score < 0 || !Number.isFinite(score)) {
        return { valid: false, error: 'Invalid score value' };
    }

    score = Math.floor(score); // Ensure integer

    if (score > config.maxPossibleScore) {
        logAudit('score_impossible', {
            wallet: session.wallet.slice(0, 8) + '...',
            score,
            maxPossible: config.maxPossibleScore
        });
        return { valid: false, error: 'Score exceeds maximum possible', suspicious: true };
    }

    // Check score rate (points per second)
    const scoreRate = score / (duration / 1000);
    if (scoreRate > config.maxScorePerSecond) {
        logAudit('score_rate_exceeded', {
            wallet: session.wallet.slice(0, 8) + '...',
            scoreRate,
            maxRate: config.maxScorePerSecond
        });
        return { valid: false, error: 'Score rate too high', suspicious: true };
    }

    // Statistical anomaly detection
    const anomalyResult = checkForAnomalies(session.wallet, score, session.gameType);

    // Mark session as submitted
    session.scoreSubmitted = true;
    session.finalScore = score;
    session.duration = duration;

    // Record in player history
    recordPlayerScore(session.wallet, session.gameType, score, duration);

    logAudit('score_submitted', {
        wallet: session.wallet.slice(0, 8) + '...',
        score,
        duration,
        gameType: session.gameType,
        suspicious: anomalyResult.suspicious
    });

    return {
        valid: true,
        score,
        duration,
        suspicious: anomalyResult.suspicious,
        percentile: anomalyResult.percentile
    };
}

// ============================================
// ANOMALY DETECTION
// ============================================

/**
 * Record player score for history tracking
 */
function recordPlayerScore(wallet, gameType, score, duration) {
    const key = `${wallet}:${gameType}`;
    const history = playerHistory.get(key) || {
        scores: [],
        totalGames: 0,
        avgScore: 0,
        maxScore: 0,
        suspiciousCount: 0
    };

    history.scores.push({
        score,
        duration,
        timestamp: Date.now()
    });

    // Keep last 100 scores
    if (history.scores.length > 100) {
        history.scores.shift();
    }

    history.totalGames++;
    history.maxScore = Math.max(history.maxScore, score);
    history.avgScore = history.scores.reduce((sum, s) => sum + s.score, 0) / history.scores.length;

    playerHistory.set(key, history);
}

/**
 * Check for statistical anomalies in score
 * @param {string} wallet - Player wallet
 * @param {number} score - Score to check
 * @param {string} gameType - Game type
 * @returns {{suspicious: boolean, percentile: number}}
 */
function checkForAnomalies(wallet, score, gameType) {
    const key = `${wallet}:${gameType}`;
    const history = playerHistory.get(key);
    const config = GAME_CONFIG[gameType] || GAME_CONFIG.default;

    // Not enough history to detect anomalies
    if (!history || history.scores.length < 5) {
        return { suspicious: false, percentile: 0 };
    }

    // Calculate z-score
    const scores = history.scores.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(
        scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    );

    // Avoid division by zero
    if (stdDev === 0) {
        return { suspicious: score > mean * 2, percentile: 50 };
    }

    const zScore = (score - mean) / stdDev;

    // Calculate percentile (approximate)
    const percentile = calculatePercentile(scores, score);

    // Flag as suspicious if:
    // 1. Z-score > 3 (more than 3 std deviations above mean)
    // 2. Score is above suspicious threshold percentile
    // 3. Score is 5x higher than average
    const suspicious =
        zScore > 3 ||
        percentile >= config.suspiciousThreshold * 100 ||
        score > history.avgScore * 5;

    if (suspicious) {
        history.suspiciousCount++;
        playerHistory.set(key, history);
    }

    return { suspicious, percentile, zScore };
}

/**
 * Calculate percentile of score in array
 */
function calculatePercentile(scores, score) {
    const sorted = [...scores].sort((a, b) => a - b);
    const below = sorted.filter(s => s < score).length;
    return (below / sorted.length) * 100;
}

// ============================================
// PLAYER STATS
// ============================================

/**
 * Get player statistics for a game
 * @param {string} wallet - Player wallet
 * @param {string} gameType - Game type
 * @returns {Object}
 */
function getPlayerStats(wallet, gameType) {
    const key = `${wallet}:${gameType}`;
    const history = playerHistory.get(key);

    if (!history) {
        return {
            wallet,
            gameType,
            totalGames: 0,
            hasPlayed: false
        };
    }

    return {
        wallet,
        gameType,
        hasPlayed: true,
        totalGames: history.totalGames,
        avgScore: Math.round(history.avgScore),
        maxScore: history.maxScore,
        recentScores: history.scores.slice(-10).map(s => ({
            score: s.score,
            timestamp: s.timestamp
        }))
    };
}

/**
 * Get game validation metrics
 * @returns {Object}
 */
function getValidationMetrics() {
    return {
        activeSessions: gameSessions.size,
        trackedPlayers: playerHistory.size,
        sessionExpiry: SESSION_EXPIRY
    };
}

// Cleanup sessions every minute
setInterval(cleanupExpiredSessions, 60 * 1000);

module.exports = {
    // Session management
    startGameSession,
    verifySessionToken,

    // Score validation
    submitScore,

    // Player stats
    getPlayerStats,
    getValidationMetrics,

    // Configuration
    GAME_CONFIG
};
