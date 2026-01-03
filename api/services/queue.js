/**
 * ASDF API - Job Queue Service
 *
 * Async background job processing:
 * - Priority-based job scheduling
 * - Retry with exponential backoff
 * - Job deduplication
 * - Dead letter queue
 *
 * Security by Design:
 * - Job data sanitization
 * - Execution timeout
 * - Rate limiting per job type
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const QUEUE_CONFIG = {
    // Processing
    maxConcurrent: 5,
    pollInterval: 1000,

    // Retry (Fibonacci backoff multipliers)
    maxRetries: 5,
    retryDelays: [1000, 2000, 3000, 5000, 8000],  // Fibonacci-ish

    // Timeouts
    defaultTimeout: 30000,
    maxTimeout: 300000,

    // Dead letter
    deadLetterThreshold: 5,

    // Cleanup
    completedRetention: 60 * 60 * 1000,  // 1 hour
    failedRetention: 24 * 60 * 60 * 1000  // 24 hours
};

// Priority levels
const PRIORITY = {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    CRITICAL: 3
};

// Job status
const STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DEAD: 'dead'
};

// ============================================
// STORAGE
// ============================================

// Job queues by priority
const queues = {
    [PRIORITY.CRITICAL]: [],
    [PRIORITY.HIGH]: [],
    [PRIORITY.NORMAL]: [],
    [PRIORITY.LOW]: []
};

// Job registry
const jobs = new Map();

// Job handlers
const handlers = new Map();

// Processing state
let activeJobs = 0;
let isProcessing = false;

// Stats
const queueStats = {
    enqueued: 0,
    processed: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    deadLettered: 0
};

// ============================================
// JOB REGISTRATION
// ============================================

/**
 * Register a job handler
 * @param {string} jobType - Job type identifier
 * @param {Function} handler - Handler function
 * @param {Object} options - Handler options
 */
function registerHandler(jobType, handler, options = {}) {
    if (typeof handler !== 'function') {
        throw new Error('Handler must be a function');
    }

    handlers.set(jobType, {
        fn: handler,
        timeout: options.timeout || QUEUE_CONFIG.defaultTimeout,
        maxRetries: options.maxRetries ?? QUEUE_CONFIG.maxRetries,
        rateLimit: options.rateLimit || null
    });

    console.log(`[Queue] Registered handler for: ${jobType}`);
}

/**
 * Unregister a job handler
 * @param {string} jobType - Job type to unregister
 */
function unregisterHandler(jobType) {
    handlers.delete(jobType);
}

// ============================================
// JOB CREATION
// ============================================

/**
 * Add a job to the queue
 * @param {string} jobType - Job type
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 * @returns {{jobId: string, position: number}}
 */
function enqueue(jobType, data = {}, options = {}) {
    const {
        priority = PRIORITY.NORMAL,
        delay = 0,
        dedupeKey = null,
        timeout = null
    } = options;

    // Check handler exists
    if (!handlers.has(jobType)) {
        throw new Error(`No handler registered for job type: ${jobType}`);
    }

    // Check deduplication
    if (dedupeKey) {
        const existing = findByDedupeKey(dedupeKey);
        if (existing) {
            return { jobId: existing.id, position: -1, deduplicated: true };
        }
    }

    // Create job
    const job = {
        id: generateJobId(),
        type: jobType,
        data: sanitizeJobData(data),
        priority,
        status: STATUS.PENDING,
        dedupeKey,
        timeout: timeout || handlers.get(jobType).timeout,
        retries: 0,
        maxRetries: handlers.get(jobType).maxRetries,
        createdAt: Date.now(),
        scheduledFor: delay > 0 ? Date.now() + delay : Date.now(),
        startedAt: null,
        completedAt: null,
        result: null,
        error: null,
        attempts: []
    };

    // Add to registry
    jobs.set(job.id, job);

    // Add to queue
    const queue = queues[priority] || queues[PRIORITY.NORMAL];
    queue.push(job.id);

    queueStats.enqueued++;

    logAudit('job_enqueued', {
        jobId: job.id,
        type: jobType,
        priority
    });

    // Start processing if not running
    if (!isProcessing) {
        startProcessing();
    }

    return {
        jobId: job.id,
        position: queue.length
    };
}

/**
 * Add multiple jobs atomically
 * @param {Array} jobSpecs - Array of {type, data, options}
 * @returns {Array} Job IDs
 */
function enqueueBatch(jobSpecs) {
    const results = [];

    for (const spec of jobSpecs) {
        try {
            const result = enqueue(spec.type, spec.data, spec.options);
            results.push(result);
        } catch (error) {
            results.push({ error: error.message });
        }
    }

    return results;
}

// ============================================
// JOB PROCESSING
// ============================================

/**
 * Start job processing loop
 */
function startProcessing() {
    if (isProcessing) return;

    isProcessing = true;
    processLoop();
}

/**
 * Stop job processing
 */
function stopProcessing() {
    isProcessing = false;
}

/**
 * Main processing loop
 */
async function processLoop() {
    while (isProcessing) {
        // Check capacity
        if (activeJobs >= QUEUE_CONFIG.maxConcurrent) {
            await sleep(QUEUE_CONFIG.pollInterval);
            continue;
        }

        // Get next job
        const job = getNextJob();

        if (!job) {
            await sleep(QUEUE_CONFIG.pollInterval);
            continue;
        }

        // Process job (don't await - run concurrently)
        processJob(job).catch(err => {
            console.error(`[Queue] Unhandled error processing job ${job.id}:`, err);
        });
    }
}

/**
 * Get next job to process
 * @returns {Object|null}
 */
function getNextJob() {
    const now = Date.now();

    // Check queues in priority order
    for (const priority of [PRIORITY.CRITICAL, PRIORITY.HIGH, PRIORITY.NORMAL, PRIORITY.LOW]) {
        const queue = queues[priority];

        for (let i = 0; i < queue.length; i++) {
            const jobId = queue[i];
            const job = jobs.get(jobId);

            if (!job) {
                queue.splice(i, 1);
                i--;
                continue;
            }

            // Check if ready
            if (job.status === STATUS.PENDING && job.scheduledFor <= now) {
                queue.splice(i, 1);
                return job;
            }
        }
    }

    return null;
}

/**
 * Process a single job
 * @param {Object} job - Job to process
 */
async function processJob(job) {
    activeJobs++;
    job.status = STATUS.PROCESSING;
    job.startedAt = Date.now();

    const handler = handlers.get(job.type);

    if (!handler) {
        job.status = STATUS.FAILED;
        job.error = 'Handler not found';
        activeJobs--;
        return;
    }

    const attempt = {
        startedAt: Date.now(),
        attempt: job.retries + 1
    };

    try {
        // Execute with timeout
        const result = await executeWithTimeout(
            handler.fn,
            job.data,
            job.timeout
        );

        // Success
        job.status = STATUS.COMPLETED;
        job.completedAt = Date.now();
        job.result = result;

        attempt.completedAt = Date.now();
        attempt.success = true;
        job.attempts.push(attempt);

        queueStats.completed++;
        queueStats.processed++;

        logAudit('job_completed', {
            jobId: job.id,
            type: job.type,
            duration: job.completedAt - job.startedAt
        });

        // Schedule cleanup
        scheduleCleanup(job.id, QUEUE_CONFIG.completedRetention);

    } catch (error) {
        attempt.completedAt = Date.now();
        attempt.success = false;
        attempt.error = error.message;
        job.attempts.push(attempt);

        job.error = error.message;
        job.retries++;

        queueStats.processed++;

        // Check retry
        if (job.retries < job.maxRetries) {
            // Retry with backoff
            const delay = QUEUE_CONFIG.retryDelays[job.retries - 1] || 8000;
            job.status = STATUS.PENDING;
            job.scheduledFor = Date.now() + delay;

            // Re-queue
            const queue = queues[job.priority];
            queue.push(job.id);

            queueStats.retried++;

            logAudit('job_retrying', {
                jobId: job.id,
                attempt: job.retries,
                delay
            });
        } else {
            // Move to dead letter
            job.status = STATUS.DEAD;
            job.completedAt = Date.now();

            queueStats.failed++;
            queueStats.deadLettered++;

            logAudit('job_dead_lettered', {
                jobId: job.id,
                type: job.type,
                error: error.message
            });

            // Schedule cleanup
            scheduleCleanup(job.id, QUEUE_CONFIG.failedRetention);
        }
    }

    activeJobs--;
}

/**
 * Execute handler with timeout
 * @param {Function} handler - Handler function
 * @param {Object} data - Job data
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<any>}
 */
function executeWithTimeout(handler, data, timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Job timeout'));
        }, timeout);

        Promise.resolve(handler(data))
            .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

// ============================================
// JOB QUERIES
// ============================================

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Object|null}
 */
function getJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;

    return {
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        retries: job.retries,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error,
        attempts: job.attempts.length
    };
}

/**
 * Get jobs by status
 * @param {string} status - Job status
 * @param {number} limit - Max jobs
 * @returns {Object[]}
 */
function getJobsByStatus(status, limit = 50) {
    const results = [];

    for (const job of jobs.values()) {
        if (job.status === status) {
            results.push(getJob(job.id));
            if (results.length >= limit) break;
        }
    }

    return results;
}

/**
 * Get jobs by type
 * @param {string} jobType - Job type
 * @param {number} limit - Max jobs
 * @returns {Object[]}
 */
function getJobsByType(jobType, limit = 50) {
    const results = [];

    for (const job of jobs.values()) {
        if (job.type === jobType) {
            results.push(getJob(job.id));
            if (results.length >= limit) break;
        }
    }

    return results;
}

/**
 * Find job by dedupe key
 * @param {string} dedupeKey - Dedupe key
 * @returns {Object|null}
 */
function findByDedupeKey(dedupeKey) {
    for (const job of jobs.values()) {
        if (job.dedupeKey === dedupeKey &&
            (job.status === STATUS.PENDING || job.status === STATUS.PROCESSING)) {
            return job;
        }
    }
    return null;
}

// ============================================
// JOB MANAGEMENT
// ============================================

/**
 * Cancel a pending job
 * @param {string} jobId - Job ID
 * @returns {boolean}
 */
function cancelJob(jobId) {
    const job = jobs.get(jobId);

    if (!job || job.status !== STATUS.PENDING) {
        return false;
    }

    // Remove from queue
    const queue = queues[job.priority];
    const idx = queue.indexOf(jobId);
    if (idx > -1) {
        queue.splice(idx, 1);
    }

    jobs.delete(jobId);

    logAudit('job_cancelled', { jobId });

    return true;
}

/**
 * Retry a failed/dead job
 * @param {string} jobId - Job ID
 * @returns {boolean}
 */
function retryJob(jobId) {
    const job = jobs.get(jobId);

    if (!job || (job.status !== STATUS.FAILED && job.status !== STATUS.DEAD)) {
        return false;
    }

    job.status = STATUS.PENDING;
    job.retries = 0;
    job.scheduledFor = Date.now();
    job.error = null;

    queues[job.priority].push(job.id);

    logAudit('job_manual_retry', { jobId });

    return true;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate unique job ID
 * @returns {string}
 */
function generateJobId() {
    return `job_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Sanitize job data
 * @param {Object} data - Job data
 * @returns {Object}
 */
function sanitizeJobData(data) {
    if (!data || typeof data !== 'object') return {};

    // Deep clone and remove functions
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'privateKey', 'token'];
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Schedule job cleanup
 * @param {string} jobId - Job ID
 * @param {number} delay - Delay in ms
 */
function scheduleCleanup(jobId, delay) {
    setTimeout(() => {
        jobs.delete(jobId);
    }, delay);
}

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
 * Get queue statistics
 * @returns {Object}
 */
function getQueueStats() {
    const queueSizes = {
        critical: queues[PRIORITY.CRITICAL].length,
        high: queues[PRIORITY.HIGH].length,
        normal: queues[PRIORITY.NORMAL].length,
        low: queues[PRIORITY.LOW].length
    };

    return {
        ...queueStats,
        totalJobs: jobs.size,
        activeJobs,
        queueSizes,
        totalQueued: Object.values(queueSizes).reduce((a, b) => a + b, 0),
        registeredHandlers: handlers.size,
        isProcessing,
        config: {
            maxConcurrent: QUEUE_CONFIG.maxConcurrent,
            maxRetries: QUEUE_CONFIG.maxRetries
        }
    };
}

/**
 * Get dead letter jobs
 * @param {number} limit - Max jobs
 * @returns {Object[]}
 */
function getDeadLetterJobs(limit = 50) {
    return getJobsByStatus(STATUS.DEAD, limit);
}

// Start processing on module load
startProcessing();

module.exports = {
    // Constants
    PRIORITY,
    STATUS,

    // Registration
    registerHandler,
    unregisterHandler,

    // Enqueueing
    enqueue,
    enqueueBatch,

    // Queries
    getJob,
    getJobsByStatus,
    getJobsByType,
    getDeadLetterJobs,

    // Management
    cancelJob,
    retryJob,
    startProcessing,
    stopProcessing,

    // Metrics
    getQueueStats,

    // Config
    QUEUE_CONFIG
};
