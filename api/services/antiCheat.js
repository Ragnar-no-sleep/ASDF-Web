/**
 * ASDF API - Advanced Anti-Cheat Engine
 *
 * Production-ready cheat detection:
 * - Multi-factor trust scoring
 * - Behavioral fingerprinting
 * - Statistical anomaly detection
 * - Machine learning-like pattern recognition
 * - Reputation tracking
 * - Automated sanctions
 *
 * Philosophy: Fibonacci thresholds, progressive penalties
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Defense in depth
 * - False positive minimization
 * - Appeals support
 * - Transparent scoring
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const ANTICHEAT_CONFIG = {
    // Trust score thresholds (Fibonacci-inspired)
    thresholds: {
        trusted: 89,        // Above 89 = trusted
        normal: 55,         // 55-89 = normal
        suspicious: 34,     // 34-55 = suspicious
        flagged: 21,        // 21-34 = flagged for review
        banned: 13          // Below 13 = auto-ban
    },

    // Factor weights in trust calculation
    weights: {
        replayValidation: 0.25,
        statisticalAnalysis: 0.20,
        behaviorPattern: 0.20,
        historicalReputation: 0.15,
        sessionIntegrity: 0.10,
        environmentCheck: 0.10
    },

    // Decay rates (Fibonacci days)
    decay: {
        suspicionDecayDays: 13,    // Suspicion decays over 13 days
        banDurationDays: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],  // Progressive bans
        reputationRecoveryRate: 0.05  // 5% per clean day
    },

    // Detection sensitivity
    sensitivity: {
        zScoreThreshold: 2.5,      // Standard deviations for anomaly
        minSamplesForStats: 8,     // Fibonacci: need 8 games for stats
        patternMatchThreshold: 0.7, // 70% match = suspicious
        burstActionThreshold: 21   // Max 21 actions in 1 second
    },

    // History limits
    historySize: 100,           // Keep last 100 games per player
    maxTrackedPlayers: 50000    // Memory limit
};

// Sanction types
const SANCTION_TYPES = {
    WARNING: 'warning',
    SCORE_INVALIDATION: 'score_invalidation',
    TEMPORARY_BAN: 'temporary_ban',
    PERMANENT_BAN: 'permanent_ban',
    LEADERBOARD_REMOVAL: 'leaderboard_removal'
};

// ============================================
// STORAGE
// ============================================

// Player profiles with trust scores and history
const playerProfiles = new Map();

// Active sanctions
const activeSanctions = new Map();

// Behavioral fingerprints
const behaviorFingerprints = new Map();

// Game baselines (for new player comparison)
const gameBaselines = new Map();

// Detection events log
const detectionLog = [];
const MAX_LOG_SIZE = 10000;

// Statistics
const stats = {
    totalAnalyses: 0,
    suspiciousDetected: 0,
    falsePositivesReported: 0,
    sanctionsIssued: 0,
    bansIssued: 0,
    avgTrustScore: 100
};

// ============================================
// TRUST SCORE CALCULATION
// ============================================

/**
 * Analyze a game session and update trust score
 * @param {Object} context - Analysis context
 * @returns {{trustScore: number, factors: Object, sanctions: Array}}
 */
function analyzeSession(context) {
    const {
        wallet,
        sessionId,
        gameType,
        score,
        duration,
        replay = null,
        clientInfo = {}
    } = context;

    stats.totalAnalyses++;

    // Get or create player profile
    const profile = getOrCreateProfile(wallet);

    // Calculate individual factors
    const factors = {};

    // 1. Replay validation factor
    factors.replayValidation = replay
        ? calculateReplayFactor(replay)
        : { score: 50, details: 'No replay provided' };

    // 2. Statistical analysis factor
    factors.statisticalAnalysis = calculateStatisticalFactor(
        profile, gameType, score, duration
    );

    // 3. Behavior pattern factor
    factors.behaviorPattern = calculateBehaviorFactor(
        wallet, gameType, clientInfo
    );

    // 4. Historical reputation factor
    factors.historicalReputation = calculateReputationFactor(profile);

    // 5. Session integrity factor
    factors.sessionIntegrity = calculateSessionFactor(
        sessionId, duration, clientInfo
    );

    // 6. Environment check factor
    factors.environmentCheck = calculateEnvironmentFactor(clientInfo);

    // Calculate weighted trust score
    let trustScore = 0;
    for (const [factor, weight] of Object.entries(ANTICHEAT_CONFIG.weights)) {
        trustScore += (factors[factor]?.score || 50) * weight;
    }

    trustScore = Math.round(trustScore);

    // Update profile
    updateProfile(profile, gameType, score, duration, trustScore, factors);

    // Determine sanctions
    const sanctions = determineSanctions(profile, trustScore, factors);

    // Log if suspicious
    if (trustScore < ANTICHEAT_CONFIG.thresholds.normal) {
        stats.suspiciousDetected++;
        logDetection(wallet, sessionId, trustScore, factors, sanctions);
    }

    // Update global stats
    updateGlobalStats(trustScore);

    return {
        trustScore,
        status: getTrustStatus(trustScore),
        factors,
        sanctions,
        profileTrustScore: profile.trustScore
    };
}

/**
 * Calculate replay validation factor
 * @param {Object} replay - Replay validation result
 * @returns {{score: number, details: string}}
 */
function calculateReplayFactor(replay) {
    if (!replay.valid) {
        return {
            score: 0,
            details: `Invalid replay: ${replay.issues?.join(', ') || 'unknown'}`
        };
    }

    // Use replay trust score directly
    return {
        score: replay.score || 50,
        details: replay.issues?.length > 0
            ? `Issues: ${replay.issues.join(', ')}`
            : 'Replay validated'
    };
}

/**
 * Calculate statistical analysis factor
 * @param {Object} profile - Player profile
 * @param {string} gameType - Game type
 * @param {number} score - Achieved score
 * @param {number} duration - Game duration
 * @returns {{score: number, details: string}}
 */
function calculateStatisticalFactor(profile, gameType, score, duration) {
    const history = profile.gameHistory[gameType] || [];
    const details = [];
    let factorScore = 100;

    // Not enough history for comparison
    if (history.length < ANTICHEAT_CONFIG.sensitivity.minSamplesForStats) {
        // Compare against game baselines
        const baseline = gameBaselines.get(gameType);
        if (baseline) {
            const percentile = calculatePercentile(score, baseline.scores);
            if (percentile > 99) {
                factorScore -= 30;
                details.push('Score in top 1% globally (new player)');
            }
        }
        return {
            score: Math.max(50, factorScore),
            details: details.join('; ') || 'Insufficient history for analysis'
        };
    }

    const scores = history.map(h => h.score);
    const durations = history.map(h => h.duration);

    // 1. Z-score analysis
    const zScore = calculateZScore(score, scores);
    if (Math.abs(zScore) > ANTICHEAT_CONFIG.sensitivity.zScoreThreshold) {
        factorScore -= 25;
        details.push(`Z-score: ${zScore.toFixed(2)} (anomalous)`);
    }

    // 2. Score growth analysis
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const growthRatio = score / avgScore;

    if (growthRatio > 5) {
        factorScore -= 35;
        details.push(`Score ${growthRatio.toFixed(1)}x higher than average`);
    } else if (growthRatio > 3) {
        factorScore -= 20;
        details.push(`Score ${growthRatio.toFixed(1)}x higher than average`);
    }

    // 3. Duration correlation
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const expectedScorePerMs = avgScore / avgDuration;
    const actualScorePerMs = score / duration;

    if (actualScorePerMs > expectedScorePerMs * 3) {
        factorScore -= 20;
        details.push('Score efficiency much higher than usual');
    }

    // 4. Consistency check (too perfect = suspicious)
    const scoreVariance = calculateVariance(scores);
    if (scoreVariance < avgScore * 0.05 && scores.length > 20) {
        factorScore -= 15;
        details.push('Suspiciously consistent scores');
    }

    return {
        score: Math.max(0, factorScore),
        details: details.join('; ') || 'Statistical analysis passed'
    };
}

/**
 * Calculate behavior pattern factor
 * @param {string} wallet - Wallet address
 * @param {string} gameType - Game type
 * @param {Object} clientInfo - Client information
 * @returns {{score: number, details: string}}
 */
function calculateBehaviorFactor(wallet, gameType, clientInfo) {
    const fingerprint = behaviorFingerprints.get(wallet);
    const details = [];
    let factorScore = 100;

    if (!fingerprint) {
        // First session - establish baseline
        behaviorFingerprints.set(wallet, createFingerprint(clientInfo));
        return { score: 80, details: 'New player - baseline established' };
    }

    // Compare current behavior to fingerprint
    const current = createFingerprint(clientInfo);

    // 1. Input pattern similarity
    if (fingerprint.inputPattern && current.inputPattern) {
        const similarity = comparePatterns(fingerprint.inputPattern, current.inputPattern);
        if (similarity < 0.5) {
            factorScore -= 15;
            details.push('Input pattern changed significantly');
        }
    }

    // 2. Session timing patterns
    if (fingerprint.typicalPlayTimes) {
        const hour = new Date().getHours();
        if (!fingerprint.typicalPlayTimes.includes(hour)) {
            factorScore -= 5;
            details.push('Playing at unusual time');
        }
    }

    // 3. Performance progression
    if (fingerprint.skillProgression) {
        const expectedSkill = fingerprint.skillProgression.predicted;
        const actualSkill = clientInfo.recentPerformance || 0;

        if (actualSkill > expectedSkill * 2) {
            factorScore -= 20;
            details.push('Skill jump exceeds normal progression');
        }
    }

    // Update fingerprint
    updateFingerprint(wallet, current);

    return {
        score: Math.max(0, factorScore),
        details: details.join('; ') || 'Behavior pattern normal'
    };
}

/**
 * Calculate historical reputation factor
 * @param {Object} profile - Player profile
 * @returns {{score: number, details: string}}
 */
function calculateReputationFactor(profile) {
    const details = [];
    let factorScore = profile.trustScore;

    // Account age bonus
    const accountAgeDays = (Date.now() - profile.firstSeen) / (24 * 60 * 60 * 1000);
    if (accountAgeDays > 30) {
        factorScore = Math.min(100, factorScore + 5);
        details.push('Established player');
    }

    // Games played bonus
    const totalGames = Object.values(profile.gameHistory)
        .reduce((sum, games) => sum + games.length, 0);
    if (totalGames > 50) {
        factorScore = Math.min(100, factorScore + 5);
        details.push('Active player');
    }

    // Previous sanctions penalty
    if (profile.sanctionHistory.length > 0) {
        const recentSanctions = profile.sanctionHistory
            .filter(s => Date.now() - s.timestamp < 30 * 24 * 60 * 60 * 1000);
        factorScore -= recentSanctions.length * 10;
        details.push(`${recentSanctions.length} recent sanctions`);
    }

    // Clean streak bonus
    if (profile.cleanStreak > 10) {
        factorScore = Math.min(100, factorScore + Math.min(10, profile.cleanStreak / 5));
        details.push(`${profile.cleanStreak} clean games streak`);
    }

    return {
        score: Math.max(0, Math.min(100, factorScore)),
        details: details.join('; ') || 'No reputation issues'
    };
}

/**
 * Calculate session integrity factor
 * @param {string} sessionId - Session ID
 * @param {number} duration - Game duration
 * @param {Object} clientInfo - Client information
 * @returns {{score: number, details: string}}
 */
function calculateSessionFactor(sessionId, duration, clientInfo) {
    const details = [];
    let factorScore = 100;

    // Session ID validation
    if (!sessionId || sessionId.length < 10) {
        factorScore -= 30;
        details.push('Invalid session ID');
    }

    // Duration sanity check
    if (duration < 1000) {
        factorScore -= 40;
        details.push('Impossibly short session');
    }

    if (duration > 4 * 60 * 60 * 1000) {
        factorScore -= 10;
        details.push('Unusually long session');
    }

    // Client timestamp validation
    if (clientInfo.clientTime) {
        const drift = Math.abs(Date.now() - clientInfo.clientTime);
        if (drift > 60000) {  // 1 minute drift
            factorScore -= 20;
            details.push('Client clock drift detected');
        }
    }

    // Request timing
    if (clientInfo.requestLatency && clientInfo.requestLatency < 5) {
        factorScore -= 15;
        details.push('Impossibly fast request');
    }

    return {
        score: Math.max(0, factorScore),
        details: details.join('; ') || 'Session integrity verified'
    };
}

/**
 * Calculate environment check factor
 * @param {Object} clientInfo - Client information
 * @returns {{score: number, details: string}}
 */
function calculateEnvironmentFactor(clientInfo) {
    const details = [];
    let factorScore = 100;

    // User agent check
    if (!clientInfo.userAgent) {
        factorScore -= 20;
        details.push('No user agent');
    } else {
        // Check for known automation tools
        const automationKeywords = ['selenium', 'puppeteer', 'headless', 'phantom', 'bot'];
        const ua = clientInfo.userAgent.toLowerCase();
        if (automationKeywords.some(kw => ua.includes(kw))) {
            factorScore -= 40;
            details.push('Automation tool detected');
        }
    }

    // Screen resolution check
    if (clientInfo.screenResolution) {
        const [w, h] = clientInfo.screenResolution.split('x').map(Number);
        if (w < 100 || h < 100 || w > 10000 || h > 10000) {
            factorScore -= 15;
            details.push('Unusual screen resolution');
        }
    }

    // WebGL fingerprint (helps identify VM/headless)
    if (clientInfo.webglVendor === 'Brian Paul' ||
        clientInfo.webglRenderer?.includes('SwiftShader')) {
        factorScore -= 25;
        details.push('Virtual/headless environment detected');
    }

    // Multiple sessions check
    if (clientInfo.concurrentSessions && clientInfo.concurrentSessions > 1) {
        factorScore -= 20;
        details.push('Multiple concurrent sessions');
    }

    return {
        score: Math.max(0, factorScore),
        details: details.join('; ') || 'Environment check passed'
    };
}

// ============================================
// SANCTIONS
// ============================================

/**
 * Determine sanctions based on trust score
 * @param {Object} profile - Player profile
 * @param {number} trustScore - Current trust score
 * @param {Object} factors - Trust factors
 * @returns {Array}
 */
function determineSanctions(profile, trustScore, factors) {
    const sanctions = [];
    const thresholds = ANTICHEAT_CONFIG.thresholds;

    if (trustScore < thresholds.banned) {
        // Auto-ban for very low trust
        const banDuration = calculateBanDuration(profile);
        sanctions.push({
            type: SANCTION_TYPES.TEMPORARY_BAN,
            duration: banDuration,
            reason: 'Trust score below threshold',
            automated: true
        });
        stats.bansIssued++;
    } else if (trustScore < thresholds.flagged) {
        // Score invalidation
        sanctions.push({
            type: SANCTION_TYPES.SCORE_INVALIDATION,
            reason: 'Suspicious activity detected',
            automated: true
        });

        // Leaderboard removal
        sanctions.push({
            type: SANCTION_TYPES.LEADERBOARD_REMOVAL,
            reason: 'Under investigation',
            automated: true
        });
    } else if (trustScore < thresholds.suspicious) {
        // Warning
        if (profile.warningCount < 3) {
            sanctions.push({
                type: SANCTION_TYPES.WARNING,
                reason: 'Suspicious patterns detected',
                automated: true
            });
            profile.warningCount++;
        } else {
            // Too many warnings = score invalidation
            sanctions.push({
                type: SANCTION_TYPES.SCORE_INVALIDATION,
                reason: 'Repeated suspicious activity',
                automated: true
            });
        }
    }

    // Apply sanctions
    for (const sanction of sanctions) {
        applySanction(profile.wallet, sanction);
    }

    stats.sanctionsIssued += sanctions.length;

    return sanctions;
}

/**
 * Calculate ban duration based on history
 * @param {Object} profile - Player profile
 * @returns {number} Ban duration in ms
 */
function calculateBanDuration(profile) {
    const banCount = profile.sanctionHistory
        .filter(s => s.type === SANCTION_TYPES.TEMPORARY_BAN).length;

    const durations = ANTICHEAT_CONFIG.decay.banDurationDays;
    const dayIndex = Math.min(banCount, durations.length - 1);

    return durations[dayIndex] * 24 * 60 * 60 * 1000;
}

/**
 * Apply a sanction to a wallet
 * @param {string} wallet - Wallet address
 * @param {Object} sanction - Sanction to apply
 */
function applySanction(wallet, sanction) {
    const existing = activeSanctions.get(wallet) || [];

    const newSanction = {
        ...sanction,
        timestamp: Date.now(),
        id: crypto.randomBytes(8).toString('hex'),
        expiresAt: sanction.duration
            ? Date.now() + sanction.duration
            : null
    };

    existing.push(newSanction);
    activeSanctions.set(wallet, existing);

    // Log
    logAudit('sanction_applied', {
        wallet: wallet.slice(0, 8) + '...',
        type: sanction.type,
        reason: sanction.reason
    });
}

/**
 * Check if wallet is banned
 * @param {string} wallet - Wallet address
 * @returns {{banned: boolean, expiresAt?: number, reason?: string}}
 */
function checkBan(wallet) {
    const sanctions = activeSanctions.get(wallet) || [];
    const now = Date.now();

    for (const sanction of sanctions) {
        if (sanction.type === SANCTION_TYPES.TEMPORARY_BAN ||
            sanction.type === SANCTION_TYPES.PERMANENT_BAN) {

            if (!sanction.expiresAt || sanction.expiresAt > now) {
                return {
                    banned: true,
                    expiresAt: sanction.expiresAt,
                    reason: sanction.reason
                };
            }
        }
    }

    return { banned: false };
}

/**
 * Lift a sanction
 * @param {string} wallet - Wallet address
 * @param {string} sanctionId - Sanction ID
 * @param {string} reason - Reason for lifting
 * @returns {boolean}
 */
function liftSanction(wallet, sanctionId, reason = 'Manual review') {
    const sanctions = activeSanctions.get(wallet);
    if (!sanctions) return false;

    const index = sanctions.findIndex(s => s.id === sanctionId);
    if (index === -1) return false;

    const lifted = sanctions.splice(index, 1)[0];

    logAudit('sanction_lifted', {
        wallet: wallet.slice(0, 8) + '...',
        type: lifted.type,
        reason
    });

    return true;
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get or create player profile
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function getOrCreateProfile(wallet) {
    if (playerProfiles.has(wallet)) {
        return playerProfiles.get(wallet);
    }

    const profile = {
        wallet,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        trustScore: 100,
        gameHistory: {},
        sanctionHistory: [],
        warningCount: 0,
        cleanStreak: 0,
        totalGames: 0,
        flags: []
    };

    playerProfiles.set(wallet, profile);

    // Enforce memory limit
    if (playerProfiles.size > ANTICHEAT_CONFIG.maxTrackedPlayers) {
        pruneOldProfiles();
    }

    return profile;
}

/**
 * Update player profile
 * @param {Object} profile - Profile to update
 * @param {string} gameType - Game type
 * @param {number} score - Achieved score
 * @param {number} duration - Game duration
 * @param {number} sessionTrust - Session trust score
 * @param {Object} factors - Trust factors
 */
function updateProfile(profile, gameType, score, duration, sessionTrust, factors) {
    profile.lastSeen = Date.now();
    profile.totalGames++;

    // Update game history
    if (!profile.gameHistory[gameType]) {
        profile.gameHistory[gameType] = [];
    }

    profile.gameHistory[gameType].push({
        score,
        duration,
        trustScore: sessionTrust,
        timestamp: Date.now()
    });

    // Enforce history limit
    if (profile.gameHistory[gameType].length > ANTICHEAT_CONFIG.historySize) {
        profile.gameHistory[gameType].shift();
    }

    // Update trust score (weighted average with decay)
    const oldWeight = 0.8;
    const newWeight = 0.2;
    profile.trustScore = Math.round(
        profile.trustScore * oldWeight +
        sessionTrust * newWeight
    );

    // Update clean streak
    if (sessionTrust >= ANTICHEAT_CONFIG.thresholds.normal) {
        profile.cleanStreak++;
    } else {
        profile.cleanStreak = 0;
    }

    // Update game baselines
    updateGameBaseline(gameType, score);
}

/**
 * Prune old profiles to free memory
 */
function pruneOldProfiles() {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;  // 90 days

    for (const [wallet, profile] of playerProfiles.entries()) {
        if (profile.lastSeen < cutoff) {
            playerProfiles.delete(wallet);
            behaviorFingerprints.delete(wallet);
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate Z-score
 * @param {number} value - Value to check
 * @param {number[]} samples - Sample data
 * @returns {number}
 */
function calculateZScore(value, samples) {
    if (samples.length === 0) return 0;

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(calculateVariance(samples));

    if (stdDev === 0) return 0;

    return (value - mean) / stdDev;
}

/**
 * Calculate variance
 * @param {number[]} values - Values
 * @returns {number}
 */
function calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

/**
 * Calculate percentile
 * @param {number} value - Value
 * @param {number[]} samples - Sample data
 * @returns {number}
 */
function calculatePercentile(value, samples) {
    if (samples.length === 0) return 50;
    const sorted = [...samples].sort((a, b) => a - b);
    const below = sorted.filter(s => s < value).length;
    return (below / sorted.length) * 100;
}

/**
 * Create behavior fingerprint
 * @param {Object} clientInfo - Client info
 * @returns {Object}
 */
function createFingerprint(clientInfo) {
    return {
        userAgent: clientInfo.userAgent,
        screenResolution: clientInfo.screenResolution,
        timezone: clientInfo.timezone,
        language: clientInfo.language,
        typicalPlayTimes: [new Date().getHours()],
        inputPattern: clientInfo.inputPattern || null,
        skillProgression: null
    };
}

/**
 * Update fingerprint with new data
 * @param {string} wallet - Wallet address
 * @param {Object} current - Current fingerprint
 */
function updateFingerprint(wallet, current) {
    const existing = behaviorFingerprints.get(wallet);
    if (!existing) return;

    // Add current play time
    const hour = new Date().getHours();
    if (!existing.typicalPlayTimes.includes(hour)) {
        existing.typicalPlayTimes.push(hour);
        if (existing.typicalPlayTimes.length > 24) {
            existing.typicalPlayTimes.shift();
        }
    }

    // Update input pattern
    if (current.inputPattern) {
        existing.inputPattern = current.inputPattern;
    }
}

/**
 * Compare patterns for similarity
 * @param {Object} a - Pattern A
 * @param {Object} b - Pattern B
 * @returns {number} Similarity 0-1
 */
function comparePatterns(a, b) {
    // Simplified pattern comparison
    if (!a || !b) return 1;

    let matches = 0;
    let total = 0;

    for (const key of Object.keys(a)) {
        if (b[key] !== undefined) {
            total++;
            if (Math.abs(a[key] - b[key]) < a[key] * 0.2) {
                matches++;
            }
        }
    }

    return total > 0 ? matches / total : 1;
}

/**
 * Update game baseline
 * @param {string} gameType - Game type
 * @param {number} score - Score to add
 */
function updateGameBaseline(gameType, score) {
    let baseline = gameBaselines.get(gameType);

    if (!baseline) {
        baseline = { scores: [], avgScore: 0 };
        gameBaselines.set(gameType, baseline);
    }

    baseline.scores.push(score);
    if (baseline.scores.length > 10000) {
        baseline.scores.shift();
    }

    baseline.avgScore = baseline.scores.reduce((a, b) => a + b, 0) / baseline.scores.length;
}

/**
 * Get trust status string
 * @param {number} score - Trust score
 * @returns {string}
 */
function getTrustStatus(score) {
    const t = ANTICHEAT_CONFIG.thresholds;
    if (score >= t.trusted) return 'trusted';
    if (score >= t.normal) return 'normal';
    if (score >= t.suspicious) return 'suspicious';
    if (score >= t.flagged) return 'flagged';
    return 'banned';
}

/**
 * Log detection event
 * @param {string} wallet - Wallet
 * @param {string} sessionId - Session ID
 * @param {number} trustScore - Trust score
 * @param {Object} factors - Factors
 * @param {Array} sanctions - Sanctions
 */
function logDetection(wallet, sessionId, trustScore, factors, sanctions) {
    detectionLog.push({
        timestamp: Date.now(),
        wallet: wallet.slice(0, 8) + '...',
        sessionId,
        trustScore,
        factorSummary: Object.entries(factors)
            .map(([k, v]) => `${k}: ${v.score}`)
            .join(', '),
        sanctions: sanctions.map(s => s.type)
    });

    if (detectionLog.length > MAX_LOG_SIZE) {
        detectionLog.shift();
    }

    logAudit('suspicious_detected', {
        wallet: wallet.slice(0, 8) + '...',
        trustScore,
        sanctionCount: sanctions.length
    });
}

/**
 * Update global statistics
 * @param {number} trustScore - Trust score
 */
function updateGlobalStats(trustScore) {
    const n = stats.totalAnalyses;
    stats.avgTrustScore = ((stats.avgTrustScore * (n - 1)) + trustScore) / n;
}

// ============================================
// API
// ============================================

/**
 * Get player trust profile
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function getProfile(wallet) {
    const profile = playerProfiles.get(wallet);
    if (!profile) {
        return { found: false };
    }

    return {
        found: true,
        trustScore: profile.trustScore,
        status: getTrustStatus(profile.trustScore),
        totalGames: profile.totalGames,
        cleanStreak: profile.cleanStreak,
        warningCount: profile.warningCount,
        activeSanctions: (activeSanctions.get(wallet) || [])
            .filter(s => !s.expiresAt || s.expiresAt > Date.now()),
        memberSince: profile.firstSeen
    };
}

/**
 * Report false positive
 * @param {string} wallet - Wallet address
 * @param {string} details - Details
 */
function reportFalsePositive(wallet, details) {
    stats.falsePositivesReported++;

    logAudit('false_positive_reported', {
        wallet: wallet.slice(0, 8) + '...',
        details
    });
}

/**
 * Get anti-cheat statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...stats,
        trackedPlayers: playerProfiles.size,
        activeBans: Array.from(activeSanctions.values())
            .flat()
            .filter(s =>
                (s.type === SANCTION_TYPES.TEMPORARY_BAN ||
                 s.type === SANCTION_TYPES.PERMANENT_BAN) &&
                (!s.expiresAt || s.expiresAt > Date.now())
            ).length,
        avgTrustScore: stats.avgTrustScore.toFixed(1),
        detectionRate: stats.totalAnalyses > 0
            ? ((stats.suspiciousDetected / stats.totalAnalyses) * 100).toFixed(2) + '%'
            : '0%'
    };
}

/**
 * Get recent detections (admin)
 * @param {number} limit - Number to return
 * @returns {Array}
 */
function getRecentDetections(limit = 50) {
    return detectionLog.slice(-limit).reverse();
}

// ============================================
// CLEANUP
// ============================================

// Cleanup expired sanctions hourly
setInterval(() => {
    const now = Date.now();

    for (const [wallet, sanctions] of activeSanctions.entries()) {
        const active = sanctions.filter(s => !s.expiresAt || s.expiresAt > now);

        if (active.length === 0) {
            activeSanctions.delete(wallet);
        } else if (active.length !== sanctions.length) {
            activeSanctions.set(wallet, active);
        }
    }
}, 60 * 60 * 1000);

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Core
    analyzeSession,
    checkBan,

    // Profile
    getProfile,
    getOrCreateProfile,

    // Sanctions
    liftSanction,
    applySanction,

    // Admin
    getStats,
    getRecentDetections,
    reportFalsePositive,

    // Types
    SANCTION_TYPES,
    ANTICHEAT_CONFIG
};
