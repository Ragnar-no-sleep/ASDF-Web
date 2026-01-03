/**
 * ASDF API - Scheduled Tasks Service
 *
 * Cron-like task scheduling:
 * - Interval-based scheduling
 * - Cron expression support
 * - Task history tracking
 * - Error handling with retries
 *
 * Security by Design:
 * - Task isolation
 * - Execution timeouts
 * - Audit logging
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const SCHEDULER_CONFIG = {
    // Default task settings
    defaultTimeout: 60000,  // 1 minute
    maxTimeout: 300000,     // 5 minutes

    // Retry settings
    maxRetries: 3,
    retryDelay: 5000,

    // History
    historySize: 100,

    // Tick interval
    tickInterval: 1000  // Check every second
};

// ============================================
// CRON PARSING
// ============================================

// Simple cron field parser
const CRON_FIELDS = {
    minute: { min: 0, max: 59 },
    hour: { min: 0, max: 23 },
    dayOfMonth: { min: 1, max: 31 },
    month: { min: 1, max: 12 },
    dayOfWeek: { min: 0, max: 6 }  // 0 = Sunday
};

/**
 * Parse cron expression
 * @param {string} expression - Cron expression (5 fields)
 * @returns {Object} Parsed cron
 */
function parseCron(expression) {
    const parts = expression.trim().split(/\s+/);

    if (parts.length !== 5) {
        throw new Error('Invalid cron expression: must have 5 fields');
    }

    const fields = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

    const parsed = {};
    for (let i = 0; i < 5; i++) {
        parsed[fields[i]] = parseField(parts[i], CRON_FIELDS[fields[i]]);
    }

    return parsed;
}

/**
 * Parse a single cron field
 * @param {string} field - Field value
 * @param {{min: number, max: number}} range - Valid range
 * @returns {number[]|null} Matching values or null for any
 */
function parseField(field, range) {
    if (field === '*') {
        return null;  // Any value
    }

    const values = new Set();

    // Handle comma-separated values
    const parts = field.split(',');

    for (const part of parts) {
        // Handle ranges (e.g., 1-5)
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                if (i >= range.min && i <= range.max) {
                    values.add(i);
                }
            }
        }
        // Handle step values (e.g., */5)
        else if (part.includes('/')) {
            const [base, step] = part.split('/');
            const stepNum = parseInt(step);
            const startVal = base === '*' ? range.min : parseInt(base);

            for (let i = startVal; i <= range.max; i += stepNum) {
                values.add(i);
            }
        }
        // Single value
        else {
            const num = parseInt(part);
            if (num >= range.min && num <= range.max) {
                values.add(num);
            }
        }
    }

    return values.size > 0 ? Array.from(values) : null;
}

/**
 * Check if cron matches current time
 * @param {Object} cron - Parsed cron
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
function cronMatches(cron, date) {
    const checks = [
        { field: 'minute', value: date.getMinutes() },
        { field: 'hour', value: date.getHours() },
        { field: 'dayOfMonth', value: date.getDate() },
        { field: 'month', value: date.getMonth() + 1 },
        { field: 'dayOfWeek', value: date.getDay() }
    ];

    for (const check of checks) {
        const allowed = cron[check.field];
        if (allowed !== null && !allowed.includes(check.value)) {
            return false;
        }
    }

    return true;
}

// ============================================
// STORAGE
// ============================================

// Scheduled tasks
const tasks = new Map();

// Task execution history
const taskHistory = [];

// Running tasks
const runningTasks = new Set();

// Scheduler state
let isRunning = false;
let tickTimer = null;

// ============================================
// TASK MANAGEMENT
// ============================================

/**
 * Schedule a task with cron expression
 * @param {string} name - Task name
 * @param {string} cronExpression - Cron expression
 * @param {Function} handler - Task handler
 * @param {Object} options - Task options
 * @returns {{taskId: string}}
 */
function schedule(name, cronExpression, handler, options = {}) {
    if (typeof handler !== 'function') {
        throw new Error('Handler must be a function');
    }

    const taskId = generateTaskId();
    const cron = parseCron(cronExpression);

    const task = {
        id: taskId,
        name,
        cron,
        cronExpression,
        handler,
        timeout: options.timeout || SCHEDULER_CONFIG.defaultTimeout,
        enabled: options.enabled !== false,
        runOnStart: options.runOnStart || false,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        failCount: 0,
        createdAt: Date.now()
    };

    tasks.set(taskId, task);

    logAudit('task_scheduled', {
        taskId,
        name,
        cron: cronExpression
    });

    // Run on start if configured
    if (task.runOnStart && task.enabled) {
        setTimeout(() => executeTask(task), 100);
    }

    return { taskId };
}

/**
 * Schedule a task with interval
 * @param {string} name - Task name
 * @param {number} intervalMs - Interval in milliseconds
 * @param {Function} handler - Task handler
 * @param {Object} options - Task options
 * @returns {{taskId: string}}
 */
function scheduleInterval(name, intervalMs, handler, options = {}) {
    if (typeof handler !== 'function') {
        throw new Error('Handler must be a function');
    }

    const taskId = generateTaskId();

    const task = {
        id: taskId,
        name,
        interval: intervalMs,
        handler,
        timeout: options.timeout || SCHEDULER_CONFIG.defaultTimeout,
        enabled: options.enabled !== false,
        runOnStart: options.runOnStart || false,
        lastRun: null,
        nextRun: Date.now() + (options.runOnStart ? 0 : intervalMs),
        runCount: 0,
        failCount: 0,
        createdAt: Date.now()
    };

    tasks.set(taskId, task);

    logAudit('task_scheduled', {
        taskId,
        name,
        interval: intervalMs
    });

    // Run on start if configured
    if (task.runOnStart && task.enabled) {
        setTimeout(() => executeTask(task), 100);
    }

    return { taskId };
}

/**
 * Unschedule a task
 * @param {string} taskId - Task ID
 * @returns {boolean}
 */
function unschedule(taskId) {
    const task = tasks.get(taskId);
    if (!task) return false;

    tasks.delete(taskId);

    logAudit('task_unscheduled', {
        taskId,
        name: task.name
    });

    return true;
}

/**
 * Enable/disable a task
 * @param {string} taskId - Task ID
 * @param {boolean} enabled - Enable state
 * @returns {boolean}
 */
function setTaskEnabled(taskId, enabled) {
    const task = tasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;

    logAudit('task_state_changed', {
        taskId,
        name: task.name,
        enabled
    });

    return true;
}

/**
 * Run a task immediately
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>}
 */
async function runNow(taskId) {
    const task = tasks.get(taskId);
    if (!task) {
        return { success: false, error: 'Task not found' };
    }

    return await executeTask(task);
}

// ============================================
// TASK EXECUTION
// ============================================

/**
 * Execute a task
 * @param {Object} task - Task to execute
 * @returns {Promise<Object>}
 */
async function executeTask(task) {
    if (runningTasks.has(task.id)) {
        return { success: false, error: 'Task already running' };
    }

    runningTasks.add(task.id);

    const execution = {
        taskId: task.id,
        taskName: task.name,
        startedAt: Date.now(),
        completedAt: null,
        success: false,
        error: null,
        result: null
    };

    try {
        // Execute with timeout
        const result = await executeWithTimeout(task.handler, task.timeout);

        execution.success = true;
        execution.result = result;
        execution.completedAt = Date.now();

        task.lastRun = Date.now();
        task.runCount++;

        // Update next run for interval tasks
        if (task.interval) {
            task.nextRun = Date.now() + task.interval;
        }

        logAudit('task_completed', {
            taskId: task.id,
            name: task.name,
            duration: execution.completedAt - execution.startedAt
        });

    } catch (error) {
        execution.success = false;
        execution.error = error.message;
        execution.completedAt = Date.now();

        task.failCount++;

        logAudit('task_failed', {
            taskId: task.id,
            name: task.name,
            error: error.message
        });
    }

    runningTasks.delete(task.id);

    // Record in history
    taskHistory.push(execution);
    if (taskHistory.length > SCHEDULER_CONFIG.historySize) {
        taskHistory.shift();
    }

    return execution;
}

/**
 * Execute handler with timeout
 * @param {Function} handler - Handler function
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<any>}
 */
function executeWithTimeout(handler, timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Task timeout'));
        }, Math.min(timeout, SCHEDULER_CONFIG.maxTimeout));

        Promise.resolve(handler())
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
// SCHEDULER LOOP
// ============================================

/**
 * Start the scheduler
 */
function start() {
    if (isRunning) return;

    isRunning = true;
    tick();

    console.log('[Scheduler] Started');
}

/**
 * Stop the scheduler
 */
function stop() {
    isRunning = false;

    if (tickTimer) {
        clearTimeout(tickTimer);
        tickTimer = null;
    }

    console.log('[Scheduler] Stopped');
}

/**
 * Scheduler tick
 */
function tick() {
    if (!isRunning) return;

    const now = new Date();

    for (const task of tasks.values()) {
        if (!task.enabled) continue;
        if (runningTasks.has(task.id)) continue;

        let shouldRun = false;

        // Cron-based task
        if (task.cron) {
            // Only check at the start of each minute
            if (now.getSeconds() === 0) {
                shouldRun = cronMatches(task.cron, now);
            }
        }
        // Interval-based task
        else if (task.interval && task.nextRun) {
            shouldRun = Date.now() >= task.nextRun;
        }

        if (shouldRun) {
            executeTask(task).catch(err => {
                console.error(`[Scheduler] Error executing task ${task.name}:`, err);
            });
        }
    }

    // Schedule next tick
    tickTimer = setTimeout(tick, SCHEDULER_CONFIG.tickInterval);
}

// ============================================
// QUERIES
// ============================================

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Object|null}
 */
function getTask(taskId) {
    const task = tasks.get(taskId);
    if (!task) return null;

    return {
        id: task.id,
        name: task.name,
        cronExpression: task.cronExpression || null,
        interval: task.interval || null,
        enabled: task.enabled,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        runCount: task.runCount,
        failCount: task.failCount,
        isRunning: runningTasks.has(task.id)
    };
}

/**
 * Get all tasks
 * @returns {Object[]}
 */
function getAllTasks() {
    const result = [];

    for (const task of tasks.values()) {
        result.push(getTask(task.id));
    }

    return result;
}

/**
 * Get task execution history
 * @param {string} taskId - Optional task ID filter
 * @param {number} limit - Max entries
 * @returns {Object[]}
 */
function getHistory(taskId = null, limit = 50) {
    let history = taskHistory;

    if (taskId) {
        history = history.filter(h => h.taskId === taskId);
    }

    return history.slice(-limit).reverse();
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate unique task ID
 * @returns {string}
 */
function generateTaskId() {
    return `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================
// METRICS
// ============================================

/**
 * Get scheduler metrics
 * @returns {Object}
 */
function getSchedulerMetrics() {
    let totalRuns = 0;
    let totalFails = 0;

    for (const task of tasks.values()) {
        totalRuns += task.runCount;
        totalFails += task.failCount;
    }

    return {
        isRunning,
        taskCount: tasks.size,
        runningTasks: runningTasks.size,
        historySize: taskHistory.length,
        totalRuns,
        totalFails,
        successRate: totalRuns > 0
            ? ((1 - totalFails / totalRuns) * 100).toFixed(2) + '%'
            : '100%'
    };
}

// ============================================
// PREDEFINED SCHEDULES
// ============================================

// Common cron expressions
const SCHEDULES = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_15_MINUTES: '*/15 * * * *',
    EVERY_HOUR: '0 * * * *',
    EVERY_DAY_MIDNIGHT: '0 0 * * *',
    EVERY_DAY_NOON: '0 12 * * *',
    EVERY_MONDAY: '0 0 * * 1',
    EVERY_FIRST_OF_MONTH: '0 0 1 * *'
};

// Start scheduler on module load
start();

module.exports = {
    // Scheduling
    schedule,
    scheduleInterval,
    unschedule,

    // Control
    setTaskEnabled,
    runNow,
    start,
    stop,

    // Queries
    getTask,
    getAllTasks,
    getHistory,

    // Metrics
    getSchedulerMetrics,

    // Predefined
    SCHEDULES,

    // Config
    SCHEDULER_CONFIG
};
