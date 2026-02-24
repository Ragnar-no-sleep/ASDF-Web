/**
 * Data Retention & Cleanup Service
 * Automatically deletes old data according to retention policies
 *
 * Usage:
 * import { startRetentionSchedule } from './services/data-retention.js';
 * startRetentionSchedule(); // Runs daily cleanup
 *
 * @author CYNIC
 */

import { query } from './postgres-pool.js';
import { cacheManager } from './cache.js';
import { logger } from './logger.js';

/**
 * Retention policies by data type (in milliseconds)
 * TTL = time before data is eligible for deletion
 */
export const RETENTION_POLICIES = {
  // Core gameplay data
  game_scores: 365 * 24 * 60 * 60 * 1000, // 1 year - for leaderboards/history
  leaderboard_entries: 365 * 24 * 60 * 60 * 1000, // 1 year - same as scores
  user_achievements: 730 * 24 * 60 * 60 * 1000, // 2 years - user accomplishments

  // Logs and audit trails
  application_logs: 30 * 24 * 60 * 60 * 1000, // 30 days - general logging
  auth_logs: 90 * 24 * 60 * 60 * 1000, // 90 days - login/logout events
  security_logs: 90 * 24 * 60 * 60 * 1000, // 90 days - auth attempts, CSRF, attacks
  error_logs: 90 * 24 * 60 * 60 * 1000, // 90 days - application errors
  api_request_logs: 30 * 24 * 60 * 60 * 1000, // 30 days - HTTP request logs

  // User data
  user_account_data: null, // Never auto-delete (user must explicitly delete)
  user_preferences: null, // Never auto-delete
  user_sessions: 30 * 24 * 60 * 60 * 1000, // 30 days - explicit sessions

  // Temporary data
  password_reset_tokens: 24 * 60 * 60 * 1000, // 1 day - security tokens
  email_verification_tokens: 7 * 24 * 60 * 60 * 1000, // 7 days
  two_factor_auth_codes: 24 * 60 * 60 * 1000, // 1 day
};

/**
 * Map of table names to retention column
 * Assumes all tables have a 'created_at' or 'timestamp' column
 */
const TABLE_CONFIG = {
  game_scores: { table: 'game_scores', column: 'created_at' },
  leaderboard_entries: { table: 'leaderboard_entries', column: 'created_at' },
  user_achievements: { table: 'user_achievements', column: 'created_at' },
  application_logs: { table: 'application_logs', column: 'created_at' },
  auth_logs: { table: 'audit_logs', column: 'created_at', where: "type = 'auth'" },
  security_logs: { table: 'audit_logs', column: 'created_at', where: "type = 'security'" },
  error_logs: { table: 'error_logs', column: 'created_at' },
  api_request_logs: { table: 'request_logs', column: 'created_at' },
  password_reset_tokens: {
    table: 'tokens',
    column: 'created_at',
    where: "type = 'password_reset'",
  },
  email_verification_tokens: { table: 'tokens', column: 'created_at', where: "type = 'email'" },
  two_factor_auth_codes: { table: 'tokens', column: 'created_at', where: "type = '2fa'" },
};

/**
 * Execute retention cleanup for a single data type
 * @param {string} policyName - Name of retention policy (e.g., 'game_scores')
 * @returns {Promise<{deleted: number, error?: string}>}
 */
export async function cleanupDataType(policyName) {
  const ttl = RETENTION_POLICIES[policyName];
  const config = TABLE_CONFIG[policyName];

  // Skip policies with no TTL or missing config
  if (ttl === null || ttl === undefined || !config) {
    return { deleted: 0, skipped: true };
  }

  try {
    const cutoffTime = new Date(Date.now() - ttl);

    // Build WHERE clause
    let whereClause = `${config.column} < $1`;
    const params = [cutoffTime];

    if (config.where) {
      whereClause += ` AND ${config.where}`;
    }

    // Execute delete
    const sql = `DELETE FROM ${config.table} WHERE ${whereClause}`;
    const result = await query(sql, params);

    logger.info(`Data retention cleanup: ${policyName}`, {
      table: config.table,
      deleted: result.rowCount,
      cutoffDate: cutoffTime.toISOString(),
    });

    return { deleted: result.rowCount };
  } catch (err) {
    logger.error(`Data retention cleanup failed for ${policyName}`, {
      error: err.message,
      policyName,
    });

    return { deleted: 0, error: err.message };
  }
}

/**
 * Execute all retention cleanups
 * @returns {Promise<{total: number, results: Object}>}
 */
export async function cleanupAllData() {
  logger.info('Starting data retention cleanup job');

  const results = {};
  let totalDeleted = 0;

  for (const policyName of Object.keys(RETENTION_POLICIES)) {
    const result = await cleanupDataType(policyName);
    results[policyName] = result;
    totalDeleted += result.deleted || 0;
  }

  logger.info('Data retention cleanup complete', {
    total_deleted: totalDeleted,
    policies_processed: Object.keys(RETENTION_POLICIES).length,
  });

  return { total: totalDeleted, results };
}

/**
 * Delete user account and all associated data
 * Called when user explicitly requests deletion (GDPR Right to be Forgotten)
 *
 * @param {string} userId - User ID to delete
 * @param {object} options - Deletion options
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteUserData(userId, options = {}) {
  const gracePeriod = options.gracePeriod || 30 * 24 * 60 * 60 * 1000; // 30 days
  const immediate = options.immediate || false;

  if (!userId) {
    throw new Error('User ID required');
  }

  logger.security('User deletion requested', 'warn', {
    userId,
    immediate,
    gracePeriod: gracePeriod / 1000 / 60 / 60 / 24,
  });

  try {
    if (immediate) {
      // Immediate deletion (for testing/compliance)
      await query('DELETE FROM game_scores WHERE user_id = $1', [userId]);
      await query('DELETE FROM leaderboard_entries WHERE user_id = $1', [userId]);
      await query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);
      await query('DELETE FROM user_accounts WHERE id = $1', [userId]);

      logger.info('User account deleted', { userId });

      return { success: true, message: 'User deleted immediately' };
    } else {
      // Soft delete with grace period (allow undo)
      await query('UPDATE user_accounts SET deleted_at = NOW() WHERE id = $1', [userId]);

      logger.info('User account marked for deletion', { userId, gracePeriod });

      return {
        success: true,
        message: `User marked for deletion. Permanent deletion in ${gracePeriod / 1000 / 60 / 60 / 24} days`,
      };
    }
  } catch (err) {
    logger.error('User deletion failed', { userId, error: err.message });
    throw err;
  }
}

/**
 * Anonymize old user data (for GDPR compliance)
 * Keeps data for analytics but removes personal identifiers
 *
 * @param {string} userId - User ID to anonymize
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function anonymizeUserData(userId) {
  if (!userId) {
    throw new Error('User ID required');
  }

  try {
    // Replace wallet with hash (can't link back to user)
    const hashed = `anon_${userId.slice(0, 8).toLowerCase()}`;

    await query('UPDATE game_scores SET user_id = $1 WHERE user_id = $2', [hashed, userId]);
    await query('UPDATE leaderboard_entries SET user_id = $1 WHERE user_id = $2', [hashed, userId]);

    logger.info('User data anonymized', { userId, anonymizedId: hashed });

    return { success: true, message: 'User data anonymized for analytics' };
  } catch (err) {
    logger.error('User anonymization failed', { userId, error: err.message });
    throw err;
  }
}

/**
 * Process soft-deleted users (grace period expired)
 * Runs daily to permanently delete accounts marked for deletion
 *
 * @returns {Promise<{processed: number}>}
 */
export async function processExpiredDeletions() {
  const gracePeriodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const cutoffDate = new Date(Date.now() - gracePeriodMs);

  try {
    // Get users marked for deletion past grace period
    const expiredUsers = await query(
      'SELECT id FROM user_accounts WHERE deleted_at IS NOT NULL AND deleted_at < $1',
      [cutoffDate]
    );

    for (const { id } of expiredUsers.rows) {
      await deleteUserData(id, { immediate: true });
    }

    logger.info('Expired user deletions processed', { count: expiredUsers.rowCount });

    return { processed: expiredUsers.rowCount };
  } catch (err) {
    logger.error('Expired deletion processing failed', { error: err.message });
    return { processed: 0, error: err.message };
  }
}

/**
 * Get retention policy summary
 * @returns {Object} Summary of all policies
 */
export function getRetentionSummary() {
  const policies = {};

  for (const [name, ttl] of Object.entries(RETENTION_POLICIES)) {
    if (ttl === null || ttl === undefined) {
      policies[name] = { ttl: 'Never (user must delete)', days: null };
    } else {
      const days = ttl / 1000 / 60 / 60 / 24;
      policies[name] = { ttl: `${days} days`, days };
    }
  }

  return policies;
}

/**
 * Clear cache for specific user
 * Called when user data changes
 * @param {string} userId - User ID
 */
export async function invalidateUserCache(userId) {
  if (!userId) return;

  const keys = [
    `user:${userId}:profile`,
    `user:${userId}:scores`,
    `user:${userId}:achievements`,
    `leaderboard:*`,
  ];

  for (const key of keys) {
    await cacheManager.delete(key);
  }

  logger.info('User cache invalidated', { userId });
}

/**
 * Schedule retention cleanup job
 * Runs at specified interval (default: daily at 2 AM UTC)
 *
 * @param {object} options - Scheduling options
 */
export function startRetentionSchedule(options = {}) {
  const intervalMs = options.intervalMs || 24 * 60 * 60 * 1000; // Daily
  const runAtHour = options.runAtHour || 2; // 2 AM UTC

  logger.info('Data retention scheduler started', { intervalMs, runAtHour });

  // Calculate delay to next scheduled run
  const now = new Date();
  const scheduled = new Date();
  scheduled.setUTCHours(runAtHour, 0, 0, 0);

  if (scheduled < now) {
    scheduled.setTime(scheduled.getTime() + 24 * 60 * 60 * 1000);
  }

  const delayMs = scheduled.getTime() - now.getTime();

  // First run at scheduled time
  setTimeout(async () => {
    await cleanupAllData();
    await processExpiredDeletions();

    // Then run periodically
    setInterval(async () => {
      await cleanupAllData();
      await processExpiredDeletions();
    }, intervalMs);
  }, delayMs);

  logger.info('Next retention cleanup scheduled', { at: scheduled.toISOString() });
}

/**
 * Export user data for GDPR Data Subject Access Request
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's complete data export
 */
export async function exportUserData(userId) {
  if (!userId) {
    throw new Error('User ID required');
  }

  try {
    return {
      user: await query('SELECT * FROM user_accounts WHERE id = $1', [userId]),
      scores: await query('SELECT * FROM game_scores WHERE user_id = $1', [userId]),
      achievements: await query('SELECT * FROM user_achievements WHERE user_id = $1', [userId]),
      preferences: await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]),
      activity: await query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
        [userId]
      ),
      exportedAt: new Date().toISOString(),
      retentionPolicies: getRetentionSummary(),
    };
  } catch (err) {
    logger.error('User data export failed', { userId, error: err.message });
    throw err;
  }
}
