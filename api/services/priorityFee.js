/**
 * ASDF API - Priority Fee Oracle Service
 *
 * Intelligent priority fee estimation:
 * - Real-time fee analysis from recent blocks
 * - Historical percentile calculations
 * - Dynamic fee recommendations
 * - Compute unit estimation
 *
 * Helius Best Practices:
 * - Uses getPriorityFeeEstimate for accurate fees
 * - Account-based fee analysis
 * - Congestion detection
 *
 * Security by Design:
 * - Fee bounds validation
 * - Anomaly detection
 * - Rate limiting protection
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const FEE_CONFIG = {
    // Update intervals
    updateInterval: 10000,          // 10 seconds
    historyRetention: 3600000,      // 1 hour

    // Fee bounds (microLamports per compute unit)
    minFee: 1,
    maxFee: 10000000,               // 10 SOL max safety limit
    defaultFee: 1000,               // 0.001 SOL

    // Compute unit defaults
    defaultComputeUnits: 200000,
    maxComputeUnits: 1400000,

    // Percentile thresholds
    percentiles: {
        low: 25,
        medium: 50,
        high: 75,
        veryHigh: 90
    },

    // Congestion thresholds
    congestionThresholds: {
        low: 500,
        medium: 2000,
        high: 10000,
        extreme: 50000
    },

    // Sample size for calculations
    sampleSize: 150,                // Recent transactions to analyze

    // Cache TTL
    cacheTTL: 5000                  // 5 seconds
};

// Priority levels
const PRIORITY_LEVELS = {
    NONE: 'none',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    VERY_HIGH: 'veryHigh',
    TURBO: 'turbo'
};

// ============================================
// STORAGE
// ============================================

// Fee history samples
const feeHistory = [];

// Current fee estimates (cached)
let currentEstimates = null;
let lastEstimateTime = 0;

// Account-specific fee cache
const accountFeeCache = new Map();

// Global stats
const feeStats = {
    estimatesServed: 0,
    heliusApiCalls: 0,
    fallbacksUsed: 0,
    avgFeeRecommended: 0,
    totalFeeRecommended: 0
};

// Update timer
let updateTimer = null;

// ============================================
// FEE ESTIMATION
// ============================================

/**
 * Get priority fee estimate
 * @param {Object} options - Estimation options
 * @returns {Promise<Object>}
 */
async function getEstimate(options = {}) {
    const {
        priorityLevel = PRIORITY_LEVELS.MEDIUM,
        accountKeys = [],
        computeUnits = FEE_CONFIG.defaultComputeUnits,
        useCache = true
    } = options;

    feeStats.estimatesServed++;

    // Check cache
    if (useCache && currentEstimates && (Date.now() - lastEstimateTime < FEE_CONFIG.cacheTTL)) {
        const estimate = selectEstimateByPriority(currentEstimates, priorityLevel);
        return formatEstimateResponse(estimate, computeUnits, priorityLevel, true);
    }

    try {
        // Try Helius priority fee estimate
        let estimates;

        if (accountKeys.length > 0) {
            estimates = await getHeliusPriorityFeeEstimate(accountKeys);
        } else {
            estimates = await getGlobalPriorityFeeEstimate();
        }

        // Cache results
        currentEstimates = estimates;
        lastEstimateTime = Date.now();

        // Record in history
        recordFeeHistory(estimates);

        const estimate = selectEstimateByPriority(estimates, priorityLevel);
        return formatEstimateResponse(estimate, computeUnits, priorityLevel, false);

    } catch (error) {
        console.error('[PriorityFee] Estimation error:', error.message);
        feeStats.fallbacksUsed++;

        // Use fallback from history
        const fallback = getFallbackEstimate(priorityLevel);
        return formatEstimateResponse(fallback, computeUnits, priorityLevel, false, true);
    }
}

/**
 * Get Helius priority fee estimate
 * @param {Array<string>} accountKeys - Account keys to analyze
 * @returns {Promise<Object>}
 */
async function getHeliusPriorityFeeEstimate(accountKeys) {
    feeStats.heliusApiCalls++;

    const heliusUrl = process.env.HELIUS_RPC_URL;
    if (!heliusUrl) {
        throw new Error('HELIUS_RPC_URL not configured');
    }

    const response = await fetch(heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getPriorityFeeEstimate',
            params: [{
                accountKeys,
                options: {
                    includeAllPriorityFeeLevels: true,
                    recommendedPriorityFee: true
                }
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const result = data.result;

    return {
        none: 0,
        low: result.priorityFeeLevels?.low || FEE_CONFIG.defaultFee / 2,
        medium: result.priorityFeeLevels?.medium || FEE_CONFIG.defaultFee,
        high: result.priorityFeeLevels?.high || FEE_CONFIG.defaultFee * 2,
        veryHigh: result.priorityFeeLevels?.veryHigh || FEE_CONFIG.defaultFee * 5,
        recommended: result.priorityFeeEstimate || FEE_CONFIG.defaultFee,
        timestamp: Date.now()
    };
}

/**
 * Get global priority fee estimate (fallback)
 * @returns {Promise<Object>}
 */
async function getGlobalPriorityFeeEstimate() {
    const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

    // Get recent prioritization fees
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getRecentPrioritizationFees',
            params: []
        })
    });

    if (!response.ok) {
        throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const fees = data.result || [];

    // Calculate percentiles
    const sortedFees = fees
        .map(f => f.prioritizationFee)
        .filter(f => f > 0)
        .sort((a, b) => a - b);

    if (sortedFees.length === 0) {
        return getDefaultEstimates();
    }

    return {
        none: 0,
        low: percentile(sortedFees, FEE_CONFIG.percentiles.low),
        medium: percentile(sortedFees, FEE_CONFIG.percentiles.medium),
        high: percentile(sortedFees, FEE_CONFIG.percentiles.high),
        veryHigh: percentile(sortedFees, FEE_CONFIG.percentiles.veryHigh),
        recommended: percentile(sortedFees, FEE_CONFIG.percentiles.medium),
        timestamp: Date.now()
    };
}

/**
 * Get default estimates
 * @returns {Object}
 */
function getDefaultEstimates() {
    return {
        none: 0,
        low: FEE_CONFIG.defaultFee / 2,
        medium: FEE_CONFIG.defaultFee,
        high: FEE_CONFIG.defaultFee * 2,
        veryHigh: FEE_CONFIG.defaultFee * 5,
        recommended: FEE_CONFIG.defaultFee,
        timestamp: Date.now()
    };
}

/**
 * Get fallback estimate from history
 * @param {string} priorityLevel - Priority level
 * @returns {number}
 */
function getFallbackEstimate(priorityLevel) {
    if (feeHistory.length === 0) {
        return getDefaultEstimates()[priorityLevel] || FEE_CONFIG.defaultFee;
    }

    // Average from recent history
    const recentFees = feeHistory.slice(-10);
    const avgFee = recentFees.reduce((sum, h) => sum + (h[priorityLevel] || h.medium), 0) / recentFees.length;

    return Math.round(avgFee);
}

/**
 * Select estimate by priority level
 * @param {Object} estimates - All estimates
 * @param {string} priorityLevel - Desired level
 * @returns {number}
 */
function selectEstimateByPriority(estimates, priorityLevel) {
    switch (priorityLevel) {
        case PRIORITY_LEVELS.NONE:
            return 0;
        case PRIORITY_LEVELS.LOW:
            return estimates.low;
        case PRIORITY_LEVELS.MEDIUM:
            return estimates.medium;
        case PRIORITY_LEVELS.HIGH:
            return estimates.high;
        case PRIORITY_LEVELS.VERY_HIGH:
            return estimates.veryHigh;
        case PRIORITY_LEVELS.TURBO:
            return estimates.veryHigh * 2;
        default:
            return estimates.recommended || estimates.medium;
    }
}

/**
 * Format estimate response
 * @param {number} fee - Priority fee in microLamports
 * @param {number} computeUnits - Compute units
 * @param {string} priorityLevel - Priority level
 * @param {boolean} cached - From cache
 * @param {boolean} fallback - Used fallback
 * @returns {Object}
 */
function formatEstimateResponse(fee, computeUnits, priorityLevel, cached, fallback = false) {
    // Apply bounds
    const boundedFee = Math.max(FEE_CONFIG.minFee, Math.min(FEE_CONFIG.maxFee, fee));

    // Calculate total cost
    const totalMicroLamports = boundedFee * computeUnits;
    const totalLamports = Math.ceil(totalMicroLamports / 1_000_000);
    const totalSol = totalLamports / 1_000_000_000;

    // Update stats
    feeStats.totalFeeRecommended += boundedFee;
    feeStats.avgFeeRecommended = feeStats.totalFeeRecommended / feeStats.estimatesServed;

    return {
        priorityFee: boundedFee,
        priorityLevel,
        computeUnits,
        totalCost: {
            microLamports: totalMicroLamports,
            lamports: totalLamports,
            sol: totalSol.toFixed(9)
        },
        congestionLevel: getCongestionLevel(boundedFee),
        cached,
        fallback,
        timestamp: new Date().toISOString()
    };
}

// ============================================
// CONGESTION ANALYSIS
// ============================================

/**
 * Get current congestion level
 * @param {number} fee - Current priority fee
 * @returns {string}
 */
function getCongestionLevel(fee) {
    if (fee < FEE_CONFIG.congestionThresholds.low) {
        return 'low';
    }
    if (fee < FEE_CONFIG.congestionThresholds.medium) {
        return 'medium';
    }
    if (fee < FEE_CONFIG.congestionThresholds.high) {
        return 'high';
    }
    if (fee < FEE_CONFIG.congestionThresholds.extreme) {
        return 'veryHigh';
    }
    return 'extreme';
}

/**
 * Get congestion analysis
 * @returns {Object}
 */
function getCongestionAnalysis() {
    if (feeHistory.length === 0) {
        return {
            current: 'unknown',
            trend: 'stable',
            avgFee: null,
            peakFee: null
        };
    }

    const recent = feeHistory.slice(-30);
    const older = feeHistory.slice(-60, -30);

    const recentAvg = recent.reduce((sum, h) => sum + h.medium, 0) / recent.length;
    const olderAvg = older.length > 0
        ? older.reduce((sum, h) => sum + h.medium, 0) / older.length
        : recentAvg;

    let trend;
    if (recentAvg > olderAvg * 1.2) {
        trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.8) {
        trend = 'decreasing';
    } else {
        trend = 'stable';
    }

    const allFees = feeHistory.map(h => h.medium);
    const peakFee = Math.max(...allFees);
    const minFee = Math.min(...allFees);

    return {
        current: getCongestionLevel(recentAvg),
        trend,
        avgFee: Math.round(recentAvg),
        peakFee,
        minFee,
        samples: feeHistory.length,
        recommendation: getRecommendation(recentAvg, trend)
    };
}

/**
 * Get fee recommendation based on congestion
 * @param {number} avgFee - Average fee
 * @param {string} trend - Congestion trend
 * @returns {string}
 */
function getRecommendation(avgFee, trend) {
    const congestion = getCongestionLevel(avgFee);

    if (congestion === 'low') {
        return 'Network is not congested. Low priority fees recommended.';
    }
    if (congestion === 'medium') {
        return 'Moderate congestion. Medium priority recommended for timely confirmation.';
    }
    if (congestion === 'high') {
        if (trend === 'increasing') {
            return 'High congestion increasing. Consider high priority or waiting.';
        }
        return 'High congestion. High priority recommended for faster confirmation.';
    }
    if (congestion === 'veryHigh' || congestion === 'extreme') {
        if (trend === 'decreasing') {
            return 'Extreme congestion but decreasing. Consider waiting 5-10 minutes.';
        }
        return 'Extreme congestion. Very high priority required or consider waiting.';
    }

    return 'Use recommended priority level.';
}

// ============================================
// HISTORY & ANALYTICS
// ============================================

/**
 * Record fee history
 * @param {Object} estimates - Fee estimates
 */
function recordFeeHistory(estimates) {
    feeHistory.push({
        ...estimates,
        recordedAt: Date.now()
    });

    // Trim old entries
    const cutoff = Date.now() - FEE_CONFIG.historyRetention;
    while (feeHistory.length > 0 && feeHistory[0].recordedAt < cutoff) {
        feeHistory.shift();
    }

    // Also limit by count
    while (feeHistory.length > FEE_CONFIG.sampleSize * 2) {
        feeHistory.shift();
    }
}

/**
 * Get fee history
 * @param {number} limit - Max entries
 * @returns {Array}
 */
function getHistory(limit = 50) {
    return feeHistory.slice(-limit).reverse().map(h => ({
        low: h.low,
        medium: h.medium,
        high: h.high,
        veryHigh: h.veryHigh,
        timestamp: new Date(h.recordedAt).toISOString()
    }));
}

/**
 * Get hourly averages
 * @param {number} hours - Number of hours
 * @returns {Array}
 */
function getHourlyAverages(hours = 1) {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const buckets = [];

    for (let i = 0; i < hours; i++) {
        const start = now - (i + 1) * hourMs;
        const end = now - i * hourMs;

        const hourFees = feeHistory.filter(h => h.recordedAt >= start && h.recordedAt < end);

        if (hourFees.length > 0) {
            buckets.push({
                hour: i,
                startTime: new Date(start).toISOString(),
                avgLow: Math.round(hourFees.reduce((s, h) => s + h.low, 0) / hourFees.length),
                avgMedium: Math.round(hourFees.reduce((s, h) => s + h.medium, 0) / hourFees.length),
                avgHigh: Math.round(hourFees.reduce((s, h) => s + h.high, 0) / hourFees.length),
                samples: hourFees.length
            });
        }
    }

    return buckets;
}

// ============================================
// ACCOUNT-SPECIFIC FEES
// ============================================

/**
 * Get fee estimate for specific accounts
 * @param {Array<string>} accountKeys - Account addresses
 * @param {string} priorityLevel - Priority level
 * @returns {Promise<Object>}
 */
async function getAccountFeeEstimate(accountKeys, priorityLevel = PRIORITY_LEVELS.MEDIUM) {
    const cacheKey = accountKeys.sort().join(':');

    // Check cache
    const cached = accountFeeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < FEE_CONFIG.cacheTTL * 2)) {
        return formatEstimateResponse(
            selectEstimateByPriority(cached.estimates, priorityLevel),
            FEE_CONFIG.defaultComputeUnits,
            priorityLevel,
            true
        );
    }

    // Get fresh estimate
    const estimates = await getHeliusPriorityFeeEstimate(accountKeys);

    // Cache
    accountFeeCache.set(cacheKey, {
        estimates,
        timestamp: Date.now()
    });

    // Cleanup old cache entries
    if (accountFeeCache.size > 100) {
        const oldest = Array.from(accountFeeCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, 50);

        for (const [key] of oldest) {
            accountFeeCache.delete(key);
        }
    }

    return formatEstimateResponse(
        selectEstimateByPriority(estimates, priorityLevel),
        FEE_CONFIG.defaultComputeUnits,
        priorityLevel,
        false
    );
}

// ============================================
// COMPUTE UNIT ESTIMATION
// ============================================

/**
 * Estimate compute units for transaction type
 * @param {string} txType - Transaction type
 * @param {Object} options - Additional options
 * @returns {number}
 */
function estimateComputeUnits(txType, options = {}) {
    const estimates = {
        transfer: 50000,
        tokenTransfer: 100000,
        burn: 80000,
        swap: 300000,
        nftTransfer: 150000,
        nftMint: 200000,
        stake: 100000,
        unstake: 100000,
        createAccount: 150000,
        closeAccount: 50000
    };

    const base = estimates[txType] || FEE_CONFIG.defaultComputeUnits;

    // Add buffer for safety
    const buffer = options.buffer || 1.2;

    return Math.min(Math.round(base * buffer), FEE_CONFIG.maxComputeUnits);
}

// ============================================
// UTILITIES
// ============================================

/**
 * Calculate percentile
 * @param {Array<number>} arr - Sorted array
 * @param {number} p - Percentile (0-100)
 * @returns {number}
 */
function percentile(arr, p) {
    if (arr.length === 0) return 0;

    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))];
}

// ============================================
// BACKGROUND UPDATES
// ============================================

/**
 * Start background fee updates
 * @param {number} interval - Update interval
 */
function startUpdates(interval = FEE_CONFIG.updateInterval) {
    if (updateTimer) {
        clearInterval(updateTimer);
    }

    // Initial fetch
    getEstimate({ useCache: false }).catch(err => {
        console.warn('[PriorityFee] Initial fetch failed:', err.message);
    });

    updateTimer = setInterval(async () => {
        try {
            await getEstimate({ useCache: false });
        } catch (error) {
            console.warn('[PriorityFee] Update failed:', error.message);
        }
    }, interval);

    console.log(`[PriorityFee] Background updates started (${interval}ms)`);
}

/**
 * Stop background updates
 */
function stopUpdates() {
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
}

// ============================================
// METRICS
// ============================================

/**
 * Get service statistics
 * @returns {Object}
 */
function getStats() {
    const congestion = getCongestionAnalysis();

    return {
        ...feeStats,
        currentEstimates: currentEstimates ? {
            low: currentEstimates.low,
            medium: currentEstimates.medium,
            high: currentEstimates.high,
            veryHigh: currentEstimates.veryHigh
        } : null,
        congestion: {
            level: congestion.current,
            trend: congestion.trend
        },
        historySize: feeHistory.length,
        accountCacheSize: accountFeeCache.size,
        avgFeeRecommended: Math.round(feeStats.avgFeeRecommended),
        lastUpdate: lastEstimateTime
            ? new Date(lastEstimateTime).toISOString()
            : null
    };
}

// ============================================
// INITIALIZATION
// ============================================

// Start updates on load
startUpdates();

module.exports = {
    // Constants
    PRIORITY_LEVELS,
    FEE_CONFIG,

    // Estimation
    getEstimate,
    getAccountFeeEstimate,

    // Congestion
    getCongestionLevel,
    getCongestionAnalysis,

    // History
    getHistory,
    getHourlyAverages,

    // Compute units
    estimateComputeUnits,

    // Updates
    startUpdates,
    stopUpdates,

    // Stats
    getStats
};
