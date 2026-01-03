/**
 * ASDF API - Enhanced Health Check Service
 *
 * Comprehensive health monitoring:
 * - Dependency health checks
 * - Degraded state detection
 * - Health history tracking
 * - Readiness vs liveness probes
 *
 * Security by Design:
 * - No sensitive info in health responses
 * - Rate-limited health endpoints
 * - Graceful degradation info
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const HEALTH_CONFIG = {
    // Check intervals
    checkInterval: 30000,        // 30 seconds
    checkTimeout: 10000,         // 10 seconds per check

    // History
    historySize: 100,
    historyRetention: 60 * 60 * 1000,  // 1 hour

    // Thresholds
    degradedThreshold: 0.8,      // 80% healthy for degraded
    unhealthyThreshold: 0.5,     // 50% healthy for unhealthy

    // Startup
    startupGracePeriod: 30000    // 30 seconds to become ready
};

// Health states
const STATES = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    UNKNOWN: 'unknown'
};

// Check types
const CHECK_TYPES = {
    LIVENESS: 'liveness',       // Is the service running?
    READINESS: 'readiness',     // Is the service ready to serve?
    STARTUP: 'startup'          // Has the service started up?
};

// ============================================
// STORAGE
// ============================================

// Registered health checks
const checks = new Map();

// Check results history
const checkHistory = [];

// Current overall status
let overallStatus = {
    state: STATES.UNKNOWN,
    lastCheck: null,
    startupComplete: false,
    startTime: Date.now()
};

// Stats
const healthStats = {
    checksRun: 0,
    checksPassed: 0,
    checksFailed: 0,
    stateChanges: 0
};

// ============================================
// HEALTH CHECK REGISTRATION
// ============================================

/**
 * Register a health check
 * @param {string} name - Check name
 * @param {Function} checker - Async function returning health status
 * @param {Object} options - Check options
 */
function registerCheck(name, checker, options = {}) {
    const {
        type = CHECK_TYPES.READINESS,
        critical = false,
        timeout = HEALTH_CONFIG.checkTimeout,
        interval = HEALTH_CONFIG.checkInterval,
        description = ''
    } = options;

    if (typeof checker !== 'function') {
        throw new Error('Health check must be a function');
    }

    checks.set(name, {
        name,
        checker,
        type,
        critical,
        timeout,
        interval,
        description,
        lastResult: null,
        lastCheck: null,
        consecutive: {
            passes: 0,
            failures: 0
        }
    });

    console.log(`[HealthCheck] Registered: ${name} (${type}, critical: ${critical})`);
}

/**
 * Unregister a health check
 * @param {string} name - Check name
 * @returns {boolean}
 */
function unregisterCheck(name) {
    return checks.delete(name);
}

// ============================================
// CHECK EXECUTION
// ============================================

/**
 * Run a single health check
 * @param {string} name - Check name
 * @returns {Promise<Object>}
 */
async function runCheck(name) {
    const check = checks.get(name);
    if (!check) {
        return { name, status: STATES.UNKNOWN, error: 'Check not found' };
    }

    healthStats.checksRun++;
    const startTime = Date.now();

    try {
        // Execute with timeout
        const result = await Promise.race([
            check.checker(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Check timeout')), check.timeout)
            )
        ]);

        const duration = Date.now() - startTime;
        const status = result?.healthy !== false ? STATES.HEALTHY : STATES.UNHEALTHY;

        const checkResult = {
            name,
            status,
            duration,
            timestamp: Date.now(),
            details: result?.details || null,
            error: null
        };

        // Update check state
        check.lastResult = checkResult;
        check.lastCheck = Date.now();

        if (status === STATES.HEALTHY) {
            check.consecutive.passes++;
            check.consecutive.failures = 0;
            healthStats.checksPassed++;
        } else {
            check.consecutive.failures++;
            check.consecutive.passes = 0;
            healthStats.checksFailed++;
        }

        return checkResult;

    } catch (error) {
        const duration = Date.now() - startTime;

        const checkResult = {
            name,
            status: STATES.UNHEALTHY,
            duration,
            timestamp: Date.now(),
            details: null,
            error: error.message
        };

        check.lastResult = checkResult;
        check.lastCheck = Date.now();
        check.consecutive.failures++;
        check.consecutive.passes = 0;
        healthStats.checksFailed++;

        return checkResult;
    }
}

/**
 * Run all health checks
 * @param {string} type - Optional filter by type
 * @returns {Promise<Object>}
 */
async function runAllChecks(type = null) {
    const checkList = Array.from(checks.values())
        .filter(c => !type || c.type === type);

    const results = await Promise.all(
        checkList.map(c => runCheck(c.name))
    );

    // Build results map
    const checksMap = {};
    let healthyCount = 0;
    let criticalUnhealthy = false;

    for (const result of results) {
        checksMap[result.name] = result;
        if (result.status === STATES.HEALTHY) {
            healthyCount++;
        } else {
            const check = checks.get(result.name);
            if (check?.critical) {
                criticalUnhealthy = true;
            }
        }
    }

    // Calculate overall status
    const healthRatio = results.length > 0 ? healthyCount / results.length : 1;
    let overallState;

    if (criticalUnhealthy) {
        overallState = STATES.UNHEALTHY;
    } else if (healthRatio >= 1) {
        overallState = STATES.HEALTHY;
    } else if (healthRatio >= HEALTH_CONFIG.degradedThreshold) {
        overallState = STATES.DEGRADED;
    } else if (healthRatio >= HEALTH_CONFIG.unhealthyThreshold) {
        overallState = STATES.DEGRADED;
    } else {
        overallState = STATES.UNHEALTHY;
    }

    // Track state changes
    if (overallStatus.state !== overallState) {
        healthStats.stateChanges++;
        logAudit('health_state_change', {
            from: overallStatus.state,
            to: overallState
        });
    }

    // Update overall status
    overallStatus = {
        state: overallState,
        lastCheck: Date.now(),
        startupComplete: overallStatus.startupComplete,
        startTime: overallStatus.startTime
    };

    // Record in history
    const historyEntry = {
        timestamp: Date.now(),
        state: overallState,
        healthRatio,
        checks: results.length,
        healthy: healthyCount,
        unhealthy: results.length - healthyCount
    };

    checkHistory.push(historyEntry);

    // Trim history
    while (checkHistory.length > HEALTH_CONFIG.historySize) {
        checkHistory.shift();
    }

    return {
        status: overallState,
        timestamp: new Date().toISOString(),
        checks: checksMap,
        summary: {
            total: results.length,
            healthy: healthyCount,
            unhealthy: results.length - healthyCount,
            healthRatio: (healthRatio * 100).toFixed(1) + '%'
        }
    };
}

// ============================================
// PROBE ENDPOINTS
// ============================================

/**
 * Liveness probe - is the service running?
 * @returns {Object}
 */
function livenessProbe() {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - overallStatus.startTime
    };
}

/**
 * Readiness probe - is the service ready to serve?
 * @returns {Promise<Object>}
 */
async function readinessProbe() {
    // Check if startup is complete
    if (!overallStatus.startupComplete) {
        const elapsed = Date.now() - overallStatus.startTime;
        if (elapsed < HEALTH_CONFIG.startupGracePeriod) {
            return {
                ready: false,
                reason: 'startup_in_progress',
                elapsed
            };
        }
        // Mark startup complete after grace period
        overallStatus.startupComplete = true;
    }

    // Run readiness checks
    const result = await runAllChecks(CHECK_TYPES.READINESS);

    return {
        ready: result.status === STATES.HEALTHY || result.status === STATES.DEGRADED,
        status: result.status,
        timestamp: result.timestamp,
        summary: result.summary
    };
}

/**
 * Startup probe - has initial startup completed?
 * @returns {Promise<Object>}
 */
async function startupProbe() {
    if (overallStatus.startupComplete) {
        return {
            started: true,
            timestamp: new Date().toISOString()
        };
    }

    // Run startup checks
    const result = await runAllChecks(CHECK_TYPES.STARTUP);

    if (result.status === STATES.HEALTHY) {
        overallStatus.startupComplete = true;
        logAudit('startup_complete', {
            duration: Date.now() - overallStatus.startTime
        });
    }

    return {
        started: result.status === STATES.HEALTHY,
        status: result.status,
        elapsed: Date.now() - overallStatus.startTime,
        summary: result.summary
    };
}

// ============================================
// DETAILED HEALTH
// ============================================

/**
 * Get detailed health status
 * @returns {Promise<Object>}
 */
async function getDetailedHealth() {
    const result = await runAllChecks();

    // Add metadata
    return {
        ...result,
        service: {
            name: 'asdf-api',
            version: process.env.npm_package_version || '1.4.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: Date.now() - overallStatus.startTime,
            startTime: new Date(overallStatus.startTime).toISOString()
        },
        memory: getMemoryStats(),
        stats: healthStats
    };
}

/**
 * Get memory statistics
 * @returns {Object}
 */
function getMemoryStats() {
    const usage = process.memoryUsage();
    return {
        heapUsed: formatBytes(usage.heapUsed),
        heapTotal: formatBytes(usage.heapTotal),
        external: formatBytes(usage.external),
        rss: formatBytes(usage.rss),
        heapUsedPercent: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(1) + '%'
    };
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// ============================================
// HISTORY & TRENDING
// ============================================

/**
 * Get health check history
 * @param {number} limit - Max entries
 * @returns {Object[]}
 */
function getHistory(limit = 50) {
    return checkHistory.slice(-limit).reverse();
}

/**
 * Get health trend
 * @param {number} minutes - Time window
 * @returns {Object}
 */
function getTrend(minutes = 60) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recent = checkHistory.filter(h => h.timestamp > cutoff);

    if (recent.length < 2) {
        return { trend: 'stable', data: [] };
    }

    // Calculate average health ratio over time
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, h) => sum + h.healthRatio, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, h) => sum + h.healthRatio, 0) / secondHalf.length;

    let trend;
    if (secondAvg > firstAvg + 0.05) {
        trend = 'improving';
    } else if (secondAvg < firstAvg - 0.05) {
        trend = 'declining';
    } else {
        trend = 'stable';
    }

    return {
        trend,
        firstAvg: (firstAvg * 100).toFixed(1) + '%',
        secondAvg: (secondAvg * 100).toFixed(1) + '%',
        samples: recent.length
    };
}

// ============================================
// BACKGROUND CHECKER
// ============================================

let checkTimer = null;

/**
 * Start background health checking
 * @param {number} interval - Check interval in ms
 */
function startBackgroundChecks(interval = HEALTH_CONFIG.checkInterval) {
    if (checkTimer) {
        clearInterval(checkTimer);
    }

    checkTimer = setInterval(async () => {
        try {
            await runAllChecks();
        } catch (error) {
            console.error('[HealthCheck] Background check failed:', error.message);
        }
    }, interval);

    console.log(`[HealthCheck] Background checks started (${interval}ms interval)`);
}

/**
 * Stop background health checking
 */
function stopBackgroundChecks() {
    if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
        console.log('[HealthCheck] Background checks stopped');
    }
}

// ============================================
// METRICS
// ============================================

/**
 * Get health check statistics
 * @returns {Object}
 */
function getStats() {
    const checkList = Array.from(checks.values());
    const healthy = checkList.filter(c => c.lastResult?.status === STATES.HEALTHY).length;

    return {
        ...healthStats,
        overallState: overallStatus.state,
        startupComplete: overallStatus.startupComplete,
        uptime: Date.now() - overallStatus.startTime,
        registeredChecks: checks.size,
        healthyChecks: healthy,
        unhealthyChecks: checks.size - healthy,
        historySize: checkHistory.length,
        trend: getTrend(30).trend,
        passRate: healthStats.checksRun > 0
            ? ((healthStats.checksPassed / healthStats.checksRun) * 100).toFixed(2) + '%'
            : '100%'
    };
}

// ============================================
// PREDEFINED CHECKS
// ============================================

// Memory check
registerCheck('memory', async () => {
    const usage = process.memoryUsage();
    const heapUsedPercent = usage.heapUsed / usage.heapTotal;

    return {
        healthy: heapUsedPercent < 0.9,  // Unhealthy if >90% heap used
        details: {
            heapUsedPercent: (heapUsedPercent * 100).toFixed(1) + '%'
        }
    };
}, {
    type: CHECK_TYPES.LIVENESS,
    critical: true,
    description: 'Memory usage check'
});

// Event loop check
registerCheck('event-loop', async () => {
    const start = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const lag = Date.now() - start;

    return {
        healthy: lag < 100,  // Unhealthy if event loop lag > 100ms
        details: {
            lagMs: lag
        }
    };
}, {
    type: CHECK_TYPES.LIVENESS,
    critical: true,
    description: 'Event loop responsiveness'
});

// Process check
registerCheck('process', async () => {
    return {
        healthy: true,
        details: {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform
        }
    };
}, {
    type: CHECK_TYPES.STARTUP,
    description: 'Process information'
});

// Start background checks
startBackgroundChecks();

module.exports = {
    // Constants
    STATES,
    CHECK_TYPES,

    // Registration
    registerCheck,
    unregisterCheck,

    // Execution
    runCheck,
    runAllChecks,

    // Probes
    livenessProbe,
    readinessProbe,
    startupProbe,

    // Detailed
    getDetailedHealth,
    getMemoryStats,

    // History
    getHistory,
    getTrend,

    // Background
    startBackgroundChecks,
    stopBackgroundChecks,

    // Metrics
    getStats,

    // Config
    HEALTH_CONFIG
};
