/**
 * ASDF API - Data Export Service
 *
 * GDPR-compliant data management:
 * - User data export (Right to Access)
 * - Data deletion (Right to Erasure)
 * - Data portability
 * - Audit trail for data requests
 *
 * Security by Design:
 * - Rate-limited export requests
 * - Secure download tokens
 * - PII handling compliance
 * - Data minimization
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const EXPORT_CONFIG = {
    // Export settings
    maxExportSize: 50 * 1024 * 1024,    // 50MB max export
    exportTTL: 24 * 60 * 60 * 1000,     // 24 hours
    maxPendingExports: 3,                // Per user

    // Rate limiting
    exportCooldown: 60 * 60 * 1000,     // 1 hour between exports
    deletionCooldown: 24 * 60 * 60 * 1000, // 24 hours between deletions

    // Token settings
    tokenLength: 64,
    tokenExpiry: 60 * 60 * 1000,        // 1 hour

    // Data categories
    categories: [
        'profile',
        'transactions',
        'achievements',
        'inventory',
        'notifications',
        'game_stats',
        'referrals',
        'audit_logs'
    ],

    // Retention periods (for deletion)
    retentionPeriods: {
        transactions: 7 * 365 * 24 * 60 * 60 * 1000,  // 7 years (legal)
        audit_logs: 2 * 365 * 24 * 60 * 60 * 1000,    // 2 years
        game_stats: 365 * 24 * 60 * 60 * 1000,        // 1 year
        default: 30 * 24 * 60 * 60 * 1000             // 30 days
    }
};

// Request types
const REQUEST_TYPES = {
    EXPORT: 'export',
    DELETE: 'delete',
    RECTIFY: 'rectify'
};

// Request statuses
const REQUEST_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
};

// ============================================
// STORAGE
// ============================================

// Data requests
const dataRequests = new Map();

// Export downloads (token -> export data)
const exportDownloads = new Map();

// Rate limiting per wallet
const rateLimits = new Map();

// Stats
const exportStats = {
    totalExports: 0,
    totalDeletions: 0,
    totalRectifications: 0,
    pendingRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    dataExportedBytes: 0
};

// ============================================
// DATA REQUEST MANAGEMENT
// ============================================

/**
 * Create a data export request
 * @param {string} wallet - User wallet address
 * @param {Object} options - Export options
 * @returns {Object}
 */
function requestExport(wallet, options = {}) {
    const {
        categories = EXPORT_CONFIG.categories,
        format = 'json',
        includeMetadata = true
    } = options;

    // Check rate limit
    const rateCheck = checkRateLimit(wallet, REQUEST_TYPES.EXPORT);
    if (!rateCheck.allowed) {
        return {
            success: false,
            error: 'Export rate limit exceeded',
            retryAfter: rateCheck.retryAfter
        };
    }

    // Check pending exports
    const pendingCount = countPendingRequests(wallet, REQUEST_TYPES.EXPORT);
    if (pendingCount >= EXPORT_CONFIG.maxPendingExports) {
        return {
            success: false,
            error: 'Maximum pending exports reached'
        };
    }

    // Validate categories
    const validCategories = categories.filter(c =>
        EXPORT_CONFIG.categories.includes(c)
    );

    if (validCategories.length === 0) {
        return {
            success: false,
            error: 'No valid data categories specified'
        };
    }

    // Create request
    const requestId = generateRequestId();
    const request = {
        id: requestId,
        wallet,
        type: REQUEST_TYPES.EXPORT,
        status: REQUEST_STATUS.PENDING,
        categories: validCategories,
        format,
        includeMetadata,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: null,
        downloadToken: null,
        error: null
    };

    dataRequests.set(requestId, request);
    exportStats.totalExports++;
    exportStats.pendingRequests++;

    // Update rate limit
    updateRateLimit(wallet, REQUEST_TYPES.EXPORT);

    logAudit('data_export_requested', {
        requestId,
        wallet: wallet.slice(0, 8) + '...',
        categories: validCategories.length
    });

    // Process asynchronously
    processExportRequest(requestId);

    return {
        success: true,
        requestId,
        status: REQUEST_STATUS.PENDING,
        estimatedCompletion: '5 minutes',
        categories: validCategories
    };
}

/**
 * Request data deletion
 * @param {string} wallet - User wallet address
 * @param {Object} options - Deletion options
 * @returns {Object}
 */
function requestDeletion(wallet, options = {}) {
    const {
        categories = [],
        reason = 'user_request',
        confirmationCode = null
    } = options;

    // Require confirmation for full deletion
    if (categories.length === 0 && !confirmationCode) {
        return {
            success: false,
            error: 'Confirmation code required for full account deletion',
            confirmationRequired: true,
            confirmationCode: generateConfirmationCode(wallet)
        };
    }

    // Check rate limit
    const rateCheck = checkRateLimit(wallet, REQUEST_TYPES.DELETE);
    if (!rateCheck.allowed) {
        return {
            success: false,
            error: 'Deletion rate limit exceeded',
            retryAfter: rateCheck.retryAfter
        };
    }

    // Validate confirmation if full deletion
    if (categories.length === 0) {
        if (!validateConfirmationCode(wallet, confirmationCode)) {
            return {
                success: false,
                error: 'Invalid confirmation code'
            };
        }
    }

    // Check retention requirements
    const retentionIssues = checkRetentionRequirements(wallet, categories);
    if (retentionIssues.length > 0) {
        return {
            success: false,
            error: 'Some data cannot be deleted due to legal retention requirements',
            retentionIssues
        };
    }

    // Create request
    const requestId = generateRequestId();
    const request = {
        id: requestId,
        wallet,
        type: REQUEST_TYPES.DELETE,
        status: REQUEST_STATUS.PENDING,
        categories: categories.length > 0 ? categories : EXPORT_CONFIG.categories,
        reason,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: null,
        deletedCategories: [],
        error: null
    };

    dataRequests.set(requestId, request);
    exportStats.totalDeletions++;
    exportStats.pendingRequests++;

    updateRateLimit(wallet, REQUEST_TYPES.DELETE);

    logAudit('data_deletion_requested', {
        requestId,
        wallet: wallet.slice(0, 8) + '...',
        reason,
        fullDeletion: categories.length === 0
    });

    // Process asynchronously
    processDeletionRequest(requestId);

    return {
        success: true,
        requestId,
        status: REQUEST_STATUS.PENDING,
        message: 'Deletion request submitted. This may take up to 30 days to complete.'
    };
}

/**
 * Get request status
 * @param {string} requestId - Request ID
 * @param {string} wallet - Wallet for verification
 * @returns {Object|null}
 */
function getRequestStatus(requestId, wallet) {
    const request = dataRequests.get(requestId);

    if (!request || request.wallet !== wallet) {
        return null;
    }

    const response = {
        id: request.id,
        type: request.type,
        status: request.status,
        categories: request.categories,
        createdAt: new Date(request.createdAt).toISOString(),
        updatedAt: new Date(request.updatedAt).toISOString()
    };

    if (request.completedAt) {
        response.completedAt = new Date(request.completedAt).toISOString();
    }

    if (request.status === REQUEST_STATUS.COMPLETED && request.downloadToken) {
        response.downloadAvailable = true;
        response.downloadExpiresAt = new Date(
            request.completedAt + EXPORT_CONFIG.tokenExpiry
        ).toISOString();
    }

    if (request.error) {
        response.error = request.error;
    }

    return response;
}

/**
 * Get all requests for a wallet
 * @param {string} wallet - Wallet address
 * @returns {Array}
 */
function getWalletRequests(wallet) {
    const requests = [];

    for (const request of dataRequests.values()) {
        if (request.wallet === wallet) {
            requests.push({
                id: request.id,
                type: request.type,
                status: request.status,
                createdAt: new Date(request.createdAt).toISOString()
            });
        }
    }

    return requests.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
}

// ============================================
// EXPORT PROCESSING
// ============================================

/**
 * Process export request
 * @param {string} requestId - Request ID
 */
async function processExportRequest(requestId) {
    const request = dataRequests.get(requestId);
    if (!request) return;

    try {
        request.status = REQUEST_STATUS.PROCESSING;
        request.updatedAt = Date.now();

        // Collect data from all categories
        const exportData = {
            exportInfo: {
                requestId,
                wallet: request.wallet,
                exportedAt: new Date().toISOString(),
                categories: request.categories,
                format: request.format
            },
            data: {}
        };

        for (const category of request.categories) {
            const categoryData = await collectCategoryData(request.wallet, category);
            exportData.data[category] = categoryData;
        }

        // Add metadata if requested
        if (request.includeMetadata) {
            exportData.metadata = {
                totalRecords: countRecords(exportData.data),
                dataRetentionPolicy: getRetentionPolicy(),
                privacyContact: 'privacy@asdf.games'
            };
        }

        // Generate download token
        const downloadToken = generateDownloadToken();
        const exportJson = JSON.stringify(exportData, null, 2);
        const exportSize = Buffer.byteLength(exportJson, 'utf8');

        // Check size limit
        if (exportSize > EXPORT_CONFIG.maxExportSize) {
            throw new Error('Export exceeds maximum size limit');
        }

        // Store export for download
        exportDownloads.set(downloadToken, {
            data: exportJson,
            wallet: request.wallet,
            createdAt: Date.now(),
            expiresAt: Date.now() + EXPORT_CONFIG.tokenExpiry,
            downloaded: false
        });

        // Update request
        request.status = REQUEST_STATUS.COMPLETED;
        request.completedAt = Date.now();
        request.updatedAt = Date.now();
        request.downloadToken = downloadToken;

        exportStats.pendingRequests--;
        exportStats.completedRequests++;
        exportStats.dataExportedBytes += exportSize;

        logAudit('data_export_completed', {
            requestId,
            wallet: request.wallet.slice(0, 8) + '...',
            size: exportSize,
            categories: request.categories.length
        });

    } catch (error) {
        request.status = REQUEST_STATUS.FAILED;
        request.error = error.message;
        request.updatedAt = Date.now();

        exportStats.pendingRequests--;
        exportStats.failedRequests++;

        logAudit('data_export_failed', {
            requestId,
            error: error.message
        });
    }
}

/**
 * Download export data
 * @param {string} token - Download token
 * @param {string} wallet - Wallet for verification
 * @returns {Object}
 */
function downloadExport(token, wallet) {
    const download = exportDownloads.get(token);

    if (!download) {
        return { success: false, error: 'Download not found or expired' };
    }

    if (download.wallet !== wallet) {
        return { success: false, error: 'Unauthorized' };
    }

    if (Date.now() > download.expiresAt) {
        exportDownloads.delete(token);
        return { success: false, error: 'Download expired' };
    }

    // Mark as downloaded
    download.downloaded = true;

    logAudit('data_export_downloaded', {
        wallet: wallet.slice(0, 8) + '...'
    });

    return {
        success: true,
        data: download.data,
        contentType: 'application/json',
        filename: `asdf_data_export_${Date.now()}.json`
    };
}

// ============================================
// DELETION PROCESSING
// ============================================

/**
 * Process deletion request
 * @param {string} requestId - Request ID
 */
async function processDeletionRequest(requestId) {
    const request = dataRequests.get(requestId);
    if (!request) return;

    try {
        request.status = REQUEST_STATUS.PROCESSING;
        request.updatedAt = Date.now();

        const deletedCategories = [];

        for (const category of request.categories) {
            // Check retention requirements
            const retention = EXPORT_CONFIG.retentionPeriods[category] ||
                             EXPORT_CONFIG.retentionPeriods.default;

            const canDelete = await checkCategoryDeletable(request.wallet, category, retention);

            if (canDelete) {
                await deleteCategoryData(request.wallet, category);
                deletedCategories.push(category);
            } else {
                // Schedule for later deletion after retention period
                scheduleDelayedDeletion(request.wallet, category, retention);
            }
        }

        request.status = REQUEST_STATUS.COMPLETED;
        request.completedAt = Date.now();
        request.updatedAt = Date.now();
        request.deletedCategories = deletedCategories;

        exportStats.pendingRequests--;
        exportStats.completedRequests++;

        logAudit('data_deletion_completed', {
            requestId,
            wallet: request.wallet.slice(0, 8) + '...',
            deletedCategories: deletedCategories.length,
            totalCategories: request.categories.length
        });

    } catch (error) {
        request.status = REQUEST_STATUS.FAILED;
        request.error = error.message;
        request.updatedAt = Date.now();

        exportStats.pendingRequests--;
        exportStats.failedRequests++;

        logAudit('data_deletion_failed', {
            requestId,
            error: error.message
        });
    }
}

// ============================================
// DATA COLLECTION
// ============================================

/**
 * Collect data for a category
 * @param {string} wallet - Wallet address
 * @param {string} category - Data category
 * @returns {Promise<Object>}
 */
async function collectCategoryData(wallet, category) {
    switch (category) {
        case 'profile':
            return collectProfileData(wallet);
        case 'transactions':
            return collectTransactionData(wallet);
        case 'achievements':
            return collectAchievementData(wallet);
        case 'inventory':
            return collectInventoryData(wallet);
        case 'notifications':
            return collectNotificationData(wallet);
        case 'game_stats':
            return collectGameStatsData(wallet);
        case 'referrals':
            return collectReferralData(wallet);
        case 'audit_logs':
            return collectAuditData(wallet);
        default:
            return { error: 'Unknown category' };
    }
}

/**
 * Collect profile data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectProfileData(wallet) {
    // In production, this would query the database
    return {
        wallet: wallet,
        registeredAt: null,  // Would be from DB
        lastActive: null,
        tier: null,
        preferences: {}
    };
}

/**
 * Collect transaction data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectTransactionData(wallet) {
    try {
        const txMonitor = require('./txMonitor');
        return {
            history: txMonitor.getWalletHistory(wallet, 1000),
            note: 'Transaction history from monitoring service'
        };
    } catch {
        return { history: [], note: 'Transaction service unavailable' };
    }
}

/**
 * Collect achievement data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectAchievementData(wallet) {
    try {
        const achievements = require('./achievements');
        return {
            unlocked: achievements.getUnlockedAchievements(wallet),
            progress: achievements.getAchievementProgress(wallet)
        };
    } catch {
        return { unlocked: [], progress: {} };
    }
}

/**
 * Collect inventory data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectInventoryData(wallet) {
    try {
        const shop = require('./shop');
        return {
            inventory: shop.getInventory(wallet),
            equipped: shop.getEquipped(wallet)
        };
    } catch {
        return { inventory: [], equipped: {} };
    }
}

/**
 * Collect notification data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectNotificationData(wallet) {
    try {
        const notifications = require('./notifications');
        return notifications.getNotifications(wallet, { limit: 1000 });
    } catch {
        return { notifications: [], total: 0 };
    }
}

/**
 * Collect game stats data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectGameStatsData(wallet) {
    try {
        const gameValidation = require('./gameValidation');
        return {
            stats: gameValidation.getPlayerStats(wallet)
        };
    } catch {
        return { stats: {} };
    }
}

/**
 * Collect referral data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectReferralData(wallet) {
    try {
        const referrals = require('./referrals');
        return referrals.getReferralStats(wallet);
    } catch {
        return { code: null, referrals: [] };
    }
}

/**
 * Collect audit data
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function collectAuditData(wallet) {
    // Limited audit data for user - only their own actions
    try {
        const audit = require('./audit');
        return audit.search({
            actor: wallet,
            limit: 500
        });
    } catch {
        return { events: [], total: 0 };
    }
}

// ============================================
// DELETION HELPERS
// ============================================

/**
 * Check if category data can be deleted
 * @param {string} wallet - Wallet address
 * @param {string} category - Data category
 * @param {number} retention - Retention period in ms
 * @returns {Promise<boolean>}
 */
async function checkCategoryDeletable(wallet, category, retention) {
    // Categories with legal retention requirements
    if (category === 'transactions' || category === 'audit_logs') {
        return false;  // Must be retained for compliance
    }

    return true;
}

/**
 * Delete category data
 * @param {string} wallet - Wallet address
 * @param {string} category - Data category
 */
async function deleteCategoryData(wallet, category) {
    // In production, this would actually delete from databases
    console.log(`[DataExport] Deleting ${category} data for ${wallet.slice(0, 8)}...`);

    // Placeholder - actual implementation would depend on storage
    switch (category) {
        case 'notifications':
            // Clear notifications
            break;
        case 'game_stats':
            // Clear game stats
            break;
        case 'preferences':
            // Reset preferences
            break;
    }
}

/**
 * Schedule delayed deletion
 * @param {string} wallet - Wallet address
 * @param {string} category - Data category
 * @param {number} retention - Retention period
 */
function scheduleDelayedDeletion(wallet, category, retention) {
    // In production, this would schedule a job
    logAudit('deletion_scheduled', {
        wallet: wallet.slice(0, 8) + '...',
        category,
        scheduledFor: new Date(Date.now() + retention).toISOString()
    });
}

/**
 * Check retention requirements
 * @param {string} wallet - Wallet address
 * @param {Array} categories - Categories to check
 * @returns {Array}
 */
function checkRetentionRequirements(wallet, categories) {
    const issues = [];

    const categoriesToCheck = categories.length > 0
        ? categories
        : EXPORT_CONFIG.categories;

    for (const category of categoriesToCheck) {
        if (category === 'transactions') {
            issues.push({
                category: 'transactions',
                reason: 'Financial records must be retained for 7 years',
                retention: '7 years'
            });
        }
        if (category === 'audit_logs') {
            issues.push({
                category: 'audit_logs',
                reason: 'Security logs must be retained for 2 years',
                retention: '2 years'
            });
        }
    }

    return issues;
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check rate limit for request type
 * @param {string} wallet - Wallet address
 * @param {string} requestType - Request type
 * @returns {Object}
 */
function checkRateLimit(wallet, requestType) {
    const key = `${wallet}:${requestType}`;
    const lastRequest = rateLimits.get(key);

    if (!lastRequest) {
        return { allowed: true };
    }

    const cooldown = requestType === REQUEST_TYPES.DELETE
        ? EXPORT_CONFIG.deletionCooldown
        : EXPORT_CONFIG.exportCooldown;

    const elapsed = Date.now() - lastRequest;

    if (elapsed < cooldown) {
        return {
            allowed: false,
            retryAfter: Math.ceil((cooldown - elapsed) / 1000)
        };
    }

    return { allowed: true };
}

/**
 * Update rate limit
 * @param {string} wallet - Wallet address
 * @param {string} requestType - Request type
 */
function updateRateLimit(wallet, requestType) {
    const key = `${wallet}:${requestType}`;
    rateLimits.set(key, Date.now());
}

/**
 * Count pending requests
 * @param {string} wallet - Wallet address
 * @param {string} requestType - Request type
 * @returns {number}
 */
function countPendingRequests(wallet, requestType) {
    let count = 0;

    for (const request of dataRequests.values()) {
        if (request.wallet === wallet &&
            request.type === requestType &&
            (request.status === REQUEST_STATUS.PENDING ||
             request.status === REQUEST_STATUS.PROCESSING)) {
            count++;
        }
    }

    return count;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate request ID
 * @returns {string}
 */
function generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate download token
 * @returns {string}
 */
function generateDownloadToken() {
    return crypto.randomBytes(EXPORT_CONFIG.tokenLength / 2).toString('hex');
}

/**
 * Generate confirmation code for deletion
 * @param {string} wallet - Wallet address
 * @returns {string}
 */
function generateConfirmationCode(wallet) {
    // SECURITY: Require JWT_SECRET - no fallback allowed
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    const hash = crypto
        .createHmac('sha256', jwtSecret)
        .update(wallet + Date.now().toString())
        .digest('hex')
        .substring(0, 8)
        .toUpperCase();

    // Store temporarily
    const key = `confirm:${wallet}`;
    rateLimits.set(key, { code: hash, expires: Date.now() + 30 * 60 * 1000 });

    return hash;
}

/**
 * Validate confirmation code
 * @param {string} wallet - Wallet address
 * @param {string} code - Confirmation code
 * @returns {boolean}
 */
function validateConfirmationCode(wallet, code) {
    const key = `confirm:${wallet}`;
    const stored = rateLimits.get(key);

    if (!stored || Date.now() > stored.expires) {
        return false;
    }

    const valid = stored.code === code.toUpperCase();

    if (valid) {
        rateLimits.delete(key);
    }

    return valid;
}

/**
 * Count records in export data
 * @param {Object} data - Export data
 * @returns {number}
 */
function countRecords(data) {
    let count = 0;

    for (const category of Object.values(data)) {
        if (Array.isArray(category)) {
            count += category.length;
        } else if (category && typeof category === 'object') {
            count += Object.keys(category).length;
        }
    }

    return count;
}

/**
 * Get retention policy
 * @returns {Object}
 */
function getRetentionPolicy() {
    return {
        transactions: '7 years (legal requirement)',
        audit_logs: '2 years (security requirement)',
        game_stats: '1 year',
        other: '30 days after account deletion'
    };
}

// ============================================
// CLEANUP
// ============================================

/**
 * Cleanup expired exports and requests
 */
function cleanup() {
    const now = Date.now();

    // Cleanup expired downloads
    for (const [token, download] of exportDownloads) {
        if (now > download.expiresAt) {
            exportDownloads.delete(token);
        }
    }

    // Cleanup old requests (keep for 30 days)
    const requestRetention = 30 * 24 * 60 * 60 * 1000;
    for (const [id, request] of dataRequests) {
        if (request.completedAt && now - request.completedAt > requestRetention) {
            dataRequests.delete(id);
        }
    }

    // Cleanup rate limits
    const rateLimitRetention = 24 * 60 * 60 * 1000;
    for (const [key, timestamp] of rateLimits) {
        if (typeof timestamp === 'number' && now - timestamp > rateLimitRetention) {
            rateLimits.delete(key);
        }
    }
}

// Run cleanup periodically
setInterval(cleanup, 60 * 60 * 1000);  // Every hour

// ============================================
// METRICS
// ============================================

/**
 * Get service statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...exportStats,
        activeDownloads: exportDownloads.size,
        totalRequests: dataRequests.size,
        requestsByStatus: {
            pending: countByStatus(REQUEST_STATUS.PENDING),
            processing: countByStatus(REQUEST_STATUS.PROCESSING),
            completed: countByStatus(REQUEST_STATUS.COMPLETED),
            failed: countByStatus(REQUEST_STATUS.FAILED)
        },
        dataExportedFormatted: formatBytes(exportStats.dataExportedBytes)
    };
}

/**
 * Count requests by status
 * @param {string} status - Request status
 * @returns {number}
 */
function countByStatus(status) {
    let count = 0;
    for (const request of dataRequests.values()) {
        if (request.status === status) count++;
    }
    return count;
}

/**
 * Format bytes
 * @param {number} bytes - Bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

module.exports = {
    // Constants
    REQUEST_TYPES,
    REQUEST_STATUS,
    EXPORT_CONFIG,

    // Requests
    requestExport,
    requestDeletion,
    getRequestStatus,
    getWalletRequests,

    // Download
    downloadExport,

    // Stats
    getStats
};
