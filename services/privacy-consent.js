/**
 * Privacy Consent Management Service
 * Manages user preferences for data collection & processing
 *
 * Usage:
 * import { getConsent, setConsent } from './services/privacy-consent.js';
 * const canTrack = await getConsent(userId, 'analytics');
 * await setConsent(userId, 'analytics', true);
 *
 * @author CYNIC
 */

import { query } from './postgres-pool.js';
import { logger } from './logger.js';
import { cacheManager } from './cache.js';

/**
 * Available consent types and their descriptions
 */
export const CONSENT_TYPES = {
  essential: {
    description: 'Essential cookies (session, security)',
    default: true,
    required: true, // Cannot opt-out
  },
  analytics: {
    description: 'Analytics and usage tracking',
    default: false,
    required: false,
  },
  marketing: {
    description: 'Marketing emails and communications',
    default: false,
    required: false,
  },
  personalization: {
    description: 'Personalized recommendations',
    default: false,
    required: false,
  },
  leaderboard: {
    description: 'Display name on public leaderboards',
    default: true,
    required: false,
  },
};

/**
 * Create or initialize user consent record
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Consent object with all types
 */
export async function initializeConsent(userId) {
  if (!userId) {
    throw new Error('User ID required');
  }

  try {
    // Check if already exists
    const existing = await query('SELECT * FROM user_consent WHERE user_id = $1', [userId]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Initialize with defaults
    const consentData = {};
    for (const [type, config] of Object.entries(CONSENT_TYPES)) {
      consentData[type] = config.default;
    }

    // Create record
    const result = await query(
      `INSERT INTO user_consent (user_id, preferences, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [userId, JSON.stringify(consentData)]
    );

    logger.info('User consent initialized', { userId, preferences: consentData });

    return result.rows[0];
  } catch (err) {
    logger.error('Consent initialization failed', { userId, error: err.message });
    throw err;
  }
}

/**
 * Get user's consent preferences
 * @param {string} userId - User ID
 * @param {string|null} consentType - Specific type or null for all
 * @returns {Promise<Object|boolean>} Consent value(s)
 */
export async function getConsent(userId, consentType = null) {
  if (!userId) {
    return null;
  }

  // Check cache first
  const cacheKey = `consent:${userId}`;
  let cached = await cacheManager.get(cacheKey);

  if (!cached) {
    // Get from database
    try {
      const result = await query('SELECT preferences FROM user_consent WHERE user_id = $1', [
        userId,
      ]);

      if (result.rows.length === 0) {
        // Initialize if doesn't exist
        await initializeConsent(userId);
        return getConsent(userId, consentType);
      }

      cached = result.rows[0].preferences;
      await cacheManager.set(cacheKey, cached, 3600); // Cache for 1 hour
    } catch (err) {
      logger.error('Consent retrieval failed', { userId, error: err.message });
      // Return defaults on error (fail safe)
      cached = {};
      for (const [type, config] of Object.entries(CONSENT_TYPES)) {
        cached[type] = config.default;
      }
    }
  }

  if (consentType) {
    return cached[consentType] ?? CONSENT_TYPES[consentType]?.default ?? false;
  }

  return cached;
}

/**
 * Set user's consent preference
 * @param {string} userId - User ID
 * @param {string} consentType - Consent type
 * @param {boolean} value - True to opt-in, false to opt-out
 * @returns {Promise<Object>} Updated consent record
 */
export async function setConsent(userId, consentType, value) {
  if (!userId || !consentType) {
    throw new Error('User ID and consent type required');
  }

  if (!CONSENT_TYPES[consentType]) {
    throw new Error(`Unknown consent type: ${consentType}`);
  }

  // Essential cookies cannot be disabled
  if (consentType === 'essential' && value === false) {
    logger.warn('Attempt to disable essential cookies', { userId });
    return getConsent(userId);
  }

  try {
    // Get current preferences
    const current = await getConsent(userId);

    // Update consent
    current[consentType] = value;

    // Save to database
    const result = await query(
      `UPDATE user_consent
       SET preferences = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(current), userId]
    );

    // Invalidate cache
    await cacheManager.delete(`consent:${userId}`);

    logger.info('User consent updated', { userId, consentType, value });

    return result.rows[0];
  } catch (err) {
    logger.error('Consent update failed', { userId, consentType, error: err.message });
    throw err;
  }
}

/**
 * Batch update multiple consent types
 * @param {string} userId - User ID
 * @param {Object} preferences - { analytics: true, marketing: false, ... }
 * @returns {Promise<Object>} Updated consent record
 */
export async function setConsentMultiple(userId, preferences) {
  if (!userId || typeof preferences !== 'object') {
    throw new Error('User ID and preferences object required');
  }

  try {
    // Get current
    const current = await getConsent(userId);

    // Merge preferences
    for (const [type, value] of Object.entries(preferences)) {
      if (CONSENT_TYPES[type]) {
        // Skip essential disabling
        if (type === 'essential' && value === false) continue;
        current[type] = value;
      }
    }

    // Save
    const result = await query(
      `UPDATE user_consent
       SET preferences = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(current), userId]
    );

    await cacheManager.delete(`consent:${userId}`);

    logger.info('User consent batch updated', { userId, preferences });

    return result.rows[0];
  } catch (err) {
    logger.error('Batch consent update failed', { userId, error: err.message });
    throw err;
  }
}

/**
 * Reset consent to defaults
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Reset consent record
 */
export async function resetConsent(userId) {
  if (!userId) {
    throw new Error('User ID required');
  }

  const defaults = {};
  for (const [type, config] of Object.entries(CONSENT_TYPES)) {
    defaults[type] = config.default;
  }

  try {
    const result = await query(
      `UPDATE user_consent
       SET preferences = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(defaults), userId]
    );

    await cacheManager.delete(`consent:${userId}`);

    logger.info('User consent reset to defaults', { userId });

    return result.rows[0];
  } catch (err) {
    logger.error('Consent reset failed', { userId, error: err.message });
    throw err;
  }
}

/**
 * Validate if action is allowed based on consent
 * @param {string} userId - User ID
 * @param {string} action - Action type (e.g., 'track_analytics', 'send_email')
 * @returns {Promise<boolean>} True if action allowed
 */
export async function isActionAllowed(userId, action) {
  const actionConsentMap = {
    track_analytics: 'analytics',
    track_event: 'analytics',
    send_email: 'marketing',
    send_newsletter: 'marketing',
    personalize_content: 'personalization',
    display_on_leaderboard: 'leaderboard',
    essential_session: 'essential', // Always allowed if authenticated
  };

  const requiredConsent = actionConsentMap[action];
  if (!requiredConsent) {
    logger.warn('Unknown action type', { action });
    return false;
  }

  const hasConsent = await getConsent(userId, requiredConsent);
  return hasConsent;
}

/**
 * Track consent change event
 * @param {string} userId - User ID
 * @param {string} consentType - Type of consent
 * @param {boolean} value - New value
 * @returns {Promise<void>}
 */
export async function trackConsentChange(userId, consentType, value) {
  try {
    await query(
      `INSERT INTO consent_audit_log (user_id, consent_type, value, ip, user_agent, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, consentType, value]
    );
  } catch (err) {
    logger.error('Consent audit log failed', { userId, error: err.message });
  }
}

/**
 * Get consent history for audit
 * @param {string} userId - User ID
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Consent change history
 */
export async function getConsentHistory(userId, limit = 50) {
  if (!userId) {
    throw new Error('User ID required');
  }

  try {
    const result = await query(
      `SELECT * FROM consent_audit_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (err) {
    logger.error('Consent history retrieval failed', { userId, error: err.message });
    return [];
  }
}

/**
 * Generate consent banner HTML
 * Shows all available consent types with toggle switches
 *
 * @returns {string} HTML banner
 */
export function generateConsentBanner() {
  let html = '<div class="consent-banner">';
  html += '<h3>Privacy & Cookies</h3>';
  html += '<p>We use cookies to enhance your experience. Please choose your preferences:</p>';
  html += '<div class="consent-options">';

  for (const [type, config] of Object.entries(CONSENT_TYPES)) {
    const checked = config.default ? 'checked' : '';
    const disabled = config.required ? 'disabled' : '';

    html += `
      <label class="consent-option">
        <input
          type="checkbox"
          name="consent_${type}"
          value="true"
          ${checked}
          ${disabled}
          data-consent-type="${type}"
        />
        <span class="consent-label">
          ${config.description}
          ${config.required ? '<em>(required)</em>' : ''}
        </span>
      </label>
    `;
  }

  html += '</div>';
  html += '<div class="consent-actions">';
  html += '<button id="consent-reject" class="btn-secondary">Reject All</button>';
  html += '<button id="consent-accept" class="btn-primary">Accept All</button>';
  html += '</div>';
  html += '</div>';

  return html;
}

/**
 * Initialize consent banner on frontend
 * Add this to your HTML <script> tag
 *
 * @returns {string} JavaScript code
 */
export function generateConsentScript() {
  return `
    (function() {
      // Get user's current consent
      const checkboxes = document.querySelectorAll('[data-consent-type]');

      document.getElementById('consent-accept').addEventListener('click', async () => {
        const preferences = {};
        checkboxes.forEach(box => {
          preferences[box.dataset.consentType] = true;
          box.checked = true;
        });
        await fetch('/api/user/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        });
        document.querySelector('.consent-banner').remove();
      });

      document.getElementById('consent-reject').addEventListener('click', async () => {
        const preferences = {};
        checkboxes.forEach(box => {
          if (box.dataset.consentType !== 'essential') {
            preferences[box.dataset.consentType] = false;
            box.checked = false;
          }
        });
        await fetch('/api/user/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        });
        document.querySelector('.consent-banner').remove();
      });

      // Handle individual checkbox changes
      checkboxes.forEach(box => {
        box.addEventListener('change', async () => {
          const prefs = { [box.dataset.consentType]: box.checked };
          await fetch('/api/user/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefs),
          });
        });
      });
    })();
  `;
}

/**
 * Get consent compliance summary
 * @returns {Object} Summary of all consent types with descriptions
 */
export function getConsentSummary() {
  return CONSENT_TYPES;
}

/**
 * Delete all consent data for user (GDPR compliance)
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteConsentData(userId) {
  if (!userId) {
    throw new Error('User ID required');
  }

  try {
    await query('DELETE FROM user_consent WHERE user_id = $1', [userId]);
    await query('DELETE FROM consent_audit_log WHERE user_id = $1', [userId]);
    await cacheManager.delete(`consent:${userId}`);

    logger.info('User consent data deleted', { userId });

    return { success: true };
  } catch (err) {
    logger.error('Consent data deletion failed', { userId, error: err.message });
    throw err;
  }
}
