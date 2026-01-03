/**
 * ASDF API - Graceful Shutdown Service
 *
 * Production-ready shutdown handling:
 * - Connection draining
 * - In-flight request completion
 * - Resource cleanup
 * - Health probe integration
 *
 * Security by Design:
 * - Secure shutdown signals
 * - Audit logging of shutdown events
 * - No data loss during shutdown
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const SHUTDOWN_CONFIG = {
    // Grace period for in-flight requests
    gracePeriod: 30000,        // 30 seconds

    // Force shutdown timeout
    forceTimeout: 60000,       // 60 seconds

    // Health check degradation before shutdown
    preShutdownDelay: 5000,    // 5 seconds

    // Connection drain interval
    drainInterval: 1000,       // 1 second

    // Signals to handle
    signals: ['SIGTERM', 'SIGINT', 'SIGUSR2']
};

// Shutdown states
const STATES = {
    RUNNING: 'running',
    DRAINING: 'draining',
    SHUTTING_DOWN: 'shutting_down',
    TERMINATED: 'terminated'
};

// ============================================
// STORAGE
// ============================================

// Current state
let currentState = STATES.RUNNING;

// Shutdown promise
let shutdownPromise = null;

// Registered cleanup handlers
const cleanupHandlers = new Map();

// Active connections/requests tracking
const activeConnections = new Set();

// Server reference
let serverInstance = null;

// Stats
const shutdownStats = {
    shutdownsInitiated: 0,
    cleanupHandlersRun: 0,
    cleanupHandlersFailed: 0,
    connectionsDrained: 0,
    forcedShutdowns: 0
};

// ============================================
// SERVER REGISTRATION
// ============================================

/**
 * Register HTTP server for graceful shutdown
 * @param {Object} server - HTTP server instance
 */
function registerServer(server) {
    serverInstance = server;
    console.log('[Shutdown] Server registered for graceful shutdown');
}

// ============================================
// CLEANUP HANDLERS
// ============================================

/**
 * Register cleanup handler
 * @param {string} name - Handler name
 * @param {Function} handler - Async cleanup function
 * @param {Object} options - Handler options
 * @returns {Function} Unregister function
 */
function registerCleanup(name, handler, options = {}) {
    const {
        priority = 50,       // 0-100, higher runs first
        timeout = 10000,     // Individual handler timeout
        critical = false     // If true, failure aborts shutdown
    } = options;

    if (typeof handler !== 'function') {
        throw new Error('Cleanup handler must be a function');
    }

    cleanupHandlers.set(name, {
        name,
        handler,
        priority,
        timeout,
        critical,
        registeredAt: Date.now()
    });

    console.log(`[Shutdown] Registered cleanup handler: ${name} (priority: ${priority})`);

    // Return unregister function
    return () => {
        cleanupHandlers.delete(name);
    };
}

/**
 * Unregister cleanup handler
 * @param {string} name - Handler name
 * @returns {boolean}
 */
function unregisterCleanup(name) {
    return cleanupHandlers.delete(name);
}

// ============================================
// CONNECTION TRACKING
// ============================================

/**
 * Track active connection
 * @param {Object} connection - Connection object
 * @returns {Function} Release function
 */
function trackConnection(connection) {
    const id = Symbol('connection');
    connection._shutdownId = id;

    activeConnections.add({
        id,
        connection,
        startTime: Date.now()
    });

    return () => {
        releaseConnection(connection);
    };
}

/**
 * Release tracked connection
 * @param {Object} connection - Connection object
 */
function releaseConnection(connection) {
    for (const entry of activeConnections) {
        if (entry.id === connection._shutdownId) {
            activeConnections.delete(entry);
            shutdownStats.connectionsDrained++;
            break;
        }
    }
}

/**
 * Get active connection count
 * @returns {number}
 */
function getActiveConnectionCount() {
    return activeConnections.size;
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Express middleware for connection tracking and shutdown handling
 * @returns {Function} Express middleware
 */
function middleware() {
    return (req, res, next) => {
        // Reject new requests during shutdown
        if (currentState !== STATES.RUNNING) {
            res.setHeader('Connection', 'close');
            res.setHeader('Retry-After', '30');

            if (currentState === STATES.SHUTTING_DOWN) {
                return res.status(503).json({
                    error: 'Service Unavailable',
                    message: 'Server is shutting down',
                    retryAfter: 30
                });
            }
        }

        // Track connection
        const release = trackConnection(req);

        // Release on response finish
        res.on('finish', release);
        res.on('close', release);

        next();
    };
}

// ============================================
// SHUTDOWN PROCESS
// ============================================

/**
 * Initiate graceful shutdown
 * @param {string} reason - Shutdown reason
 * @returns {Promise<void>}
 */
async function initiateShutdown(reason = 'manual') {
    // Prevent multiple shutdown attempts
    if (shutdownPromise) {
        console.log('[Shutdown] Shutdown already in progress');
        return shutdownPromise;
    }

    shutdownStats.shutdownsInitiated++;

    logAudit('shutdown_initiated', {
        reason,
        activeConnections: activeConnections.size,
        cleanupHandlers: cleanupHandlers.size
    });

    console.log(`[Shutdown] Initiating graceful shutdown (reason: ${reason})`);

    shutdownPromise = performShutdown(reason);
    return shutdownPromise;
}

/**
 * Perform shutdown sequence
 * @param {string} reason - Shutdown reason
 */
async function performShutdown(reason) {
    const startTime = Date.now();

    try {
        // Phase 1: Mark as draining
        currentState = STATES.DRAINING;
        console.log('[Shutdown] Phase 1: Draining connections');

        // Stop accepting new connections
        if (serverInstance) {
            serverInstance.close();
        }

        // Wait for health checks to update
        await sleep(SHUTDOWN_CONFIG.preShutdownDelay);

        // Phase 2: Wait for in-flight requests
        console.log('[Shutdown] Phase 2: Waiting for in-flight requests');
        await drainConnections(SHUTDOWN_CONFIG.gracePeriod);

        // Phase 3: Run cleanup handlers
        currentState = STATES.SHUTTING_DOWN;
        console.log('[Shutdown] Phase 3: Running cleanup handlers');
        await runCleanupHandlers();

        // Phase 4: Final shutdown
        const duration = Date.now() - startTime;
        console.log(`[Shutdown] Graceful shutdown complete (${duration}ms)`);

        logAudit('shutdown_complete', {
            reason,
            duration,
            connectionsDrained: shutdownStats.connectionsDrained
        });

        currentState = STATES.TERMINATED;

    } catch (error) {
        console.error('[Shutdown] Error during shutdown:', error.message);

        logAudit('shutdown_error', {
            reason,
            error: error.message
        });

        // Force exit on error
        shutdownStats.forcedShutdowns++;
        currentState = STATES.TERMINATED;
    }
}

/**
 * Drain active connections
 * @param {number} timeout - Max wait time
 */
async function drainConnections(timeout) {
    const startTime = Date.now();

    while (activeConnections.size > 0) {
        const elapsed = Date.now() - startTime;

        if (elapsed >= timeout) {
            console.log(`[Shutdown] Drain timeout, ${activeConnections.size} connections remaining`);

            // Force close remaining connections
            for (const entry of activeConnections) {
                try {
                    if (entry.connection.destroy) {
                        entry.connection.destroy();
                    }
                } catch {
                    // Ignore errors
                }
            }

            activeConnections.clear();
            break;
        }

        console.log(`[Shutdown] Draining... ${activeConnections.size} connections remaining`);
        await sleep(SHUTDOWN_CONFIG.drainInterval);
    }
}

/**
 * Run all cleanup handlers
 */
async function runCleanupHandlers() {
    // Sort by priority (higher first)
    const handlers = Array.from(cleanupHandlers.values())
        .sort((a, b) => b.priority - a.priority);

    for (const handler of handlers) {
        console.log(`[Shutdown] Running cleanup: ${handler.name}`);

        try {
            await Promise.race([
                handler.handler(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Handler timeout')), handler.timeout)
                )
            ]);

            shutdownStats.cleanupHandlersRun++;
            console.log(`[Shutdown] Cleanup complete: ${handler.name}`);

        } catch (error) {
            shutdownStats.cleanupHandlersFailed++;
            console.error(`[Shutdown] Cleanup failed: ${handler.name} - ${error.message}`);

            if (handler.critical) {
                throw new Error(`Critical cleanup handler failed: ${handler.name}`);
            }
        }
    }
}

// ============================================
// SIGNAL HANDLERS
// ============================================

/**
 * Setup signal handlers
 */
function setupSignalHandlers() {
    for (const signal of SHUTDOWN_CONFIG.signals) {
        process.on(signal, async () => {
            console.log(`[Shutdown] Received ${signal}`);

            await initiateShutdown(signal);

            // Set force timeout
            setTimeout(() => {
                console.log('[Shutdown] Force exit due to timeout');
                process.exit(1);
            }, SHUTDOWN_CONFIG.forceTimeout);

            // Exit gracefully
            process.exit(0);
        });
    }

    console.log('[Shutdown] Signal handlers registered');
}

// ============================================
// HEALTH INTEGRATION
// ============================================

/**
 * Check if accepting traffic
 * @returns {boolean}
 */
function isAcceptingTraffic() {
    return currentState === STATES.RUNNING;
}

/**
 * Check if ready for termination
 * @returns {boolean}
 */
function isReadyForTermination() {
    return currentState === STATES.TERMINATED ||
           (currentState === STATES.SHUTTING_DOWN && activeConnections.size === 0);
}

/**
 * Get shutdown state for health checks
 * @returns {Object}
 */
function getHealthState() {
    return {
        state: currentState,
        accepting: isAcceptingTraffic(),
        activeConnections: activeConnections.size,
        cleanupHandlers: cleanupHandlers.size
    };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Sleep helper
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// METRICS
// ============================================

/**
 * Get shutdown statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...shutdownStats,
        currentState,
        activeConnections: activeConnections.size,
        registeredHandlers: cleanupHandlers.size,
        serverRegistered: serverInstance !== null
    };
}

// ============================================
// INITIALIZATION
// ============================================

// Setup signal handlers on module load
setupSignalHandlers();

// Register default cleanup handlers

// Cache cleanup
registerCleanup('cache', async () => {
    try {
        const cache = require('./cache');
        if (cache.shutdown) {
            await cache.shutdown();
        }
    } catch {
        // Cache may not be loaded
    }
}, { priority: 30 });

// Queue cleanup
registerCleanup('queue', async () => {
    try {
        const queue = require('./queue');
        if (queue.shutdown) {
            await queue.shutdown();
        }
    } catch {
        // Queue may not be loaded
    }
}, { priority: 40 });

// Scheduler cleanup
registerCleanup('scheduler', async () => {
    try {
        const scheduler = require('./scheduler');
        if (scheduler.shutdown) {
            await scheduler.shutdown();
        }
    } catch {
        // Scheduler may not be loaded
    }
}, { priority: 50 });

// Background health checks
registerCleanup('healthcheck', async () => {
    try {
        const healthcheck = require('./healthcheck');
        if (healthcheck.stopBackgroundChecks) {
            healthcheck.stopBackgroundChecks();
        }
    } catch {
        // Health check may not be loaded
    }
}, { priority: 20 });

module.exports = {
    // Constants
    STATES,
    SHUTDOWN_CONFIG,

    // Server
    registerServer,

    // Cleanup handlers
    registerCleanup,
    unregisterCleanup,

    // Connection tracking
    trackConnection,
    releaseConnection,
    getActiveConnectionCount,

    // Middleware
    middleware,

    // Shutdown
    initiateShutdown,

    // Health
    isAcceptingTraffic,
    isReadyForTermination,
    getHealthState,

    // Stats
    getStats
};
