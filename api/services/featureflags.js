/**
 * ASDF API - Feature Flags Service
 *
 * Runtime feature management:
 * - Boolean and multivariate flags
 * - User/segment targeting
 * - Percentage-based rollouts
 * - A/B testing support
 * - Environment-specific flags
 *
 * Security by Design:
 * - Flag change audit trail
 * - Access control ready
 * - No PII in flag evaluations
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const FEATURE_FLAGS_CONFIG = {
    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Cache TTL for flag evaluations
    evaluationCacheTTL: 60 * 1000,  // 1 minute

    // Max flags
    maxFlags: 1000,

    // History retention
    historyRetention: 30 * 24 * 60 * 60 * 1000  // 30 days
};

// Flag types
const FLAG_TYPES = {
    BOOLEAN: 'boolean',
    STRING: 'string',
    NUMBER: 'number',
    JSON: 'json'
};

// Targeting operators
const OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    STARTS_WITH: 'starts_with',
    ENDS_WITH: 'ends_with',
    GREATER_THAN: 'gt',
    LESS_THAN: 'lt',
    IN: 'in',
    NOT_IN: 'not_in',
    REGEX: 'regex'
};

// ============================================
// STORAGE
// ============================================

// Flag definitions
const flags = new Map();

// User overrides
const userOverrides = new Map();

// Segment definitions
const segments = new Map();

// Evaluation cache
const evaluationCache = new Map();

// Flag history
const flagHistory = [];

// Stats
const featureFlagStats = {
    evaluations: 0,
    cacheHits: 0,
    flagsEnabled: 0,
    flagsDisabled: 0
};

// ============================================
// FLAG MANAGEMENT
// ============================================

/**
 * Create or update a feature flag
 * @param {string} key - Flag key
 * @param {Object} config - Flag configuration
 * @returns {Object}
 */
function createFlag(key, config = {}) {
    const {
        name = key,
        description = '',
        type = FLAG_TYPES.BOOLEAN,
        defaultValue = false,
        enabled = true,
        targeting = [],
        percentage = 100,
        variants = null,
        environments = ['development', 'staging', 'production'],
        tags = []
    } = config;

    const flag = {
        key,
        name,
        description,
        type,
        defaultValue,
        enabled,
        targeting: normalizeTargeting(targeting),
        percentage,
        variants,
        environments,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
    };

    // Check if updating
    const existing = flags.get(key);
    if (existing) {
        flag.createdAt = existing.createdAt;
        flag.version = existing.version + 1;
    }

    flags.set(key, flag);

    // Record history
    recordHistory(key, existing ? 'updated' : 'created', flag);

    logAudit('feature_flag_changed', {
        key,
        action: existing ? 'update' : 'create',
        enabled
    });

    // Clear evaluation cache for this flag
    clearFlagCache(key);

    return { key, version: flag.version };
}

/**
 * Delete a feature flag
 * @param {string} key - Flag key
 * @returns {boolean}
 */
function deleteFlag(key) {
    const flag = flags.get(key);
    if (!flag) return false;

    flags.delete(key);
    clearFlagCache(key);

    recordHistory(key, 'deleted', flag);

    logAudit('feature_flag_deleted', { key });

    return true;
}

/**
 * Enable/disable flag
 * @param {string} key - Flag key
 * @param {boolean} enabled - Enable state
 * @returns {boolean}
 */
function setFlagEnabled(key, enabled) {
    const flag = flags.get(key);
    if (!flag) return false;

    flag.enabled = enabled;
    flag.updatedAt = Date.now();
    flag.version++;

    clearFlagCache(key);
    recordHistory(key, enabled ? 'enabled' : 'disabled', flag);

    return true;
}

/**
 * Update flag percentage
 * @param {string} key - Flag key
 * @param {number} percentage - Rollout percentage (0-100)
 * @returns {boolean}
 */
function setFlagPercentage(key, percentage) {
    const flag = flags.get(key);
    if (!flag) return false;

    flag.percentage = Math.max(0, Math.min(100, percentage));
    flag.updatedAt = Date.now();
    flag.version++;

    clearFlagCache(key);
    recordHistory(key, 'percentage_changed', flag);

    return true;
}

/**
 * Update flag targeting rules
 * @param {string} key - Flag key
 * @param {Array} targeting - Targeting rules
 * @returns {boolean}
 */
function setFlagTargeting(key, targeting) {
    const flag = flags.get(key);
    if (!flag) return false;

    flag.targeting = normalizeTargeting(targeting);
    flag.updatedAt = Date.now();
    flag.version++;

    clearFlagCache(key);
    recordHistory(key, 'targeting_changed', flag);

    return true;
}

// ============================================
// FLAG EVALUATION
// ============================================

/**
 * Evaluate a feature flag
 * @param {string} key - Flag key
 * @param {Object} context - Evaluation context
 * @returns {any}
 */
function evaluate(key, context = {}) {
    featureFlagStats.evaluations++;

    const flag = flags.get(key);

    // Flag doesn't exist
    if (!flag) {
        featureFlagStats.flagsDisabled++;
        return getDefaultForType(FLAG_TYPES.BOOLEAN);
    }

    // Check environment
    if (!flag.environments.includes(FEATURE_FLAGS_CONFIG.environment)) {
        featureFlagStats.flagsDisabled++;
        return flag.defaultValue;
    }

    // Flag is disabled
    if (!flag.enabled) {
        featureFlagStats.flagsDisabled++;
        return flag.defaultValue;
    }

    // Check cache
    const cacheKey = buildCacheKey(key, context);
    const cached = evaluationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FEATURE_FLAGS_CONFIG.evaluationCacheTTL) {
        featureFlagStats.cacheHits++;
        return cached.value;
    }

    // Check user override
    const userId = context.userId || context.wallet;
    if (userId) {
        const override = getUserOverride(key, userId);
        if (override !== undefined) {
            cacheEvaluation(cacheKey, override);
            featureFlagStats.flagsEnabled++;
            return override;
        }
    }

    // Evaluate targeting rules
    const targetingResult = evaluateTargeting(flag.targeting, context);
    if (targetingResult !== undefined) {
        cacheEvaluation(cacheKey, targetingResult);
        targetingResult ? featureFlagStats.flagsEnabled++ : featureFlagStats.flagsDisabled++;
        return targetingResult;
    }

    // Percentage rollout
    if (flag.percentage < 100) {
        const bucket = getBucket(key, userId || context.sessionId || 'anonymous');
        if (bucket > flag.percentage) {
            cacheEvaluation(cacheKey, flag.defaultValue);
            featureFlagStats.flagsDisabled++;
            return flag.defaultValue;
        }
    }

    // Variants (A/B testing)
    if (flag.variants && flag.variants.length > 0) {
        const variant = selectVariant(flag, context);
        cacheEvaluation(cacheKey, variant);
        featureFlagStats.flagsEnabled++;
        return variant;
    }

    // Return true for boolean flags when enabled
    const value = flag.type === FLAG_TYPES.BOOLEAN ? true : flag.defaultValue;
    cacheEvaluation(cacheKey, value);
    featureFlagStats.flagsEnabled++;
    return value;
}

/**
 * Check if feature is enabled (boolean shorthand)
 * @param {string} key - Flag key
 * @param {Object} context - Evaluation context
 * @returns {boolean}
 */
function isEnabled(key, context = {}) {
    const result = evaluate(key, context);
    return Boolean(result);
}

/**
 * Get variation value
 * @param {string} key - Flag key
 * @param {Object} context - Evaluation context
 * @param {any} defaultValue - Default if flag doesn't exist
 * @returns {any}
 */
function getVariation(key, context = {}, defaultValue = null) {
    const flag = flags.get(key);
    if (!flag) return defaultValue;

    const result = evaluate(key, context);
    return result !== undefined ? result : defaultValue;
}

// ============================================
// TARGETING EVALUATION
// ============================================

/**
 * Normalize targeting rules
 * @param {Array} targeting - Raw targeting rules
 * @returns {Array}
 */
function normalizeTargeting(targeting) {
    if (!Array.isArray(targeting)) return [];

    return targeting.map(rule => ({
        attribute: rule.attribute || rule.attr,
        operator: rule.operator || rule.op || OPERATORS.EQUALS,
        value: rule.value,
        variation: rule.variation ?? true
    }));
}

/**
 * Evaluate targeting rules
 * @param {Array} targeting - Targeting rules
 * @param {Object} context - Evaluation context
 * @returns {any|undefined}
 */
function evaluateTargeting(targeting, context) {
    for (const rule of targeting) {
        const contextValue = getNestedValue(context, rule.attribute);
        const matches = evaluateOperator(contextValue, rule.operator, rule.value);

        if (matches) {
            return rule.variation;
        }
    }

    return undefined;
}

/**
 * Evaluate operator
 * @param {any} contextValue - Value from context
 * @param {string} operator - Operator
 * @param {any} targetValue - Target value
 * @returns {boolean}
 */
function evaluateOperator(contextValue, operator, targetValue) {
    if (contextValue === undefined || contextValue === null) {
        return false;
    }

    switch (operator) {
        case OPERATORS.EQUALS:
            return contextValue === targetValue;

        case OPERATORS.NOT_EQUALS:
            return contextValue !== targetValue;

        case OPERATORS.CONTAINS:
            return String(contextValue).includes(targetValue);

        case OPERATORS.NOT_CONTAINS:
            return !String(contextValue).includes(targetValue);

        case OPERATORS.STARTS_WITH:
            return String(contextValue).startsWith(targetValue);

        case OPERATORS.ENDS_WITH:
            return String(contextValue).endsWith(targetValue);

        case OPERATORS.GREATER_THAN:
            return Number(contextValue) > Number(targetValue);

        case OPERATORS.LESS_THAN:
            return Number(contextValue) < Number(targetValue);

        case OPERATORS.IN:
            return Array.isArray(targetValue) && targetValue.includes(contextValue);

        case OPERATORS.NOT_IN:
            return !Array.isArray(targetValue) || !targetValue.includes(contextValue);

        case OPERATORS.REGEX:
            try {
                return new RegExp(targetValue).test(String(contextValue));
            } catch {
                return false;
            }

        default:
            return false;
    }
}

/**
 * Get nested value from object
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path
 * @returns {any}
 */
function getNestedValue(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((o, k) => o?.[k], obj);
}

// ============================================
// USER OVERRIDES
// ============================================

/**
 * Set user override for flag
 * @param {string} flagKey - Flag key
 * @param {string} userId - User ID
 * @param {any} value - Override value
 */
function setUserOverride(flagKey, userId, value) {
    const key = `${flagKey}:${userId}`;
    userOverrides.set(key, {
        value,
        createdAt: Date.now()
    });

    // Clear cache
    for (const [cacheKey] of evaluationCache.entries()) {
        if (cacheKey.includes(flagKey) && cacheKey.includes(userId)) {
            evaluationCache.delete(cacheKey);
        }
    }

    logAudit('feature_flag_override', {
        flagKey,
        userId: hashUserId(userId),
        value
    });
}

/**
 * Get user override
 * @param {string} flagKey - Flag key
 * @param {string} userId - User ID
 * @returns {any|undefined}
 */
function getUserOverride(flagKey, userId) {
    const key = `${flagKey}:${userId}`;
    const override = userOverrides.get(key);
    return override?.value;
}

/**
 * Remove user override
 * @param {string} flagKey - Flag key
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function removeUserOverride(flagKey, userId) {
    const key = `${flagKey}:${userId}`;
    return userOverrides.delete(key);
}

/**
 * Get all overrides for user
 * @param {string} userId - User ID
 * @returns {Object}
 */
function getUserOverrides(userId) {
    const result = {};
    for (const [key, override] of userOverrides.entries()) {
        if (key.endsWith(`:${userId}`)) {
            const flagKey = key.replace(`:${userId}`, '');
            result[flagKey] = override.value;
        }
    }
    return result;
}

// ============================================
// SEGMENTS
// ============================================

/**
 * Create user segment
 * @param {string} name - Segment name
 * @param {Object} config - Segment configuration
 * @returns {Object}
 */
function createSegment(name, config = {}) {
    const segment = {
        name,
        description: config.description || '',
        rules: normalizeTargeting(config.rules || []),
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    segments.set(name, segment);

    logAudit('segment_created', { name });

    return { name };
}

/**
 * Check if context matches segment
 * @param {string} segmentName - Segment name
 * @param {Object} context - Evaluation context
 * @returns {boolean}
 */
function matchesSegment(segmentName, context) {
    const segment = segments.get(segmentName);
    if (!segment) return false;

    // All rules must match (AND logic)
    for (const rule of segment.rules) {
        const contextValue = getNestedValue(context, rule.attribute);
        if (!evaluateOperator(contextValue, rule.operator, rule.value)) {
            return false;
        }
    }

    return true;
}

/**
 * Get segments user belongs to
 * @param {Object} context - Evaluation context
 * @returns {string[]}
 */
function getUserSegments(context) {
    const result = [];
    for (const [name] of segments.entries()) {
        if (matchesSegment(name, context)) {
            result.push(name);
        }
    }
    return result;
}

// ============================================
// A/B TESTING
// ============================================

/**
 * Select variant for user
 * @param {Object} flag - Flag definition
 * @param {Object} context - Evaluation context
 * @returns {any}
 */
function selectVariant(flag, context) {
    if (!flag.variants || flag.variants.length === 0) {
        return flag.defaultValue;
    }

    const userId = context.userId || context.wallet || context.sessionId || 'anonymous';
    const bucket = getBucket(`${flag.key}:variant`, userId);

    // Calculate cumulative weights
    let cumulative = 0;
    for (const variant of flag.variants) {
        cumulative += variant.weight || (100 / flag.variants.length);
        if (bucket <= cumulative) {
            return variant.value;
        }
    }

    // Fallback to first variant
    return flag.variants[0].value;
}

/**
 * Get deterministic bucket for user (0-100)
 * @param {string} flagKey - Flag key
 * @param {string} userId - User identifier
 * @returns {number}
 */
function getBucket(flagKey, userId) {
    const hash = crypto
        .createHash('md5')
        .update(`${flagKey}:${userId}`)
        .digest('hex');

    // Use first 8 chars of hash
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Build cache key
 * @param {string} flagKey - Flag key
 * @param {Object} context - Context
 * @returns {string}
 */
function buildCacheKey(flagKey, context) {
    const userId = context.userId || context.wallet || 'anon';
    return `${flagKey}:${userId}:${FEATURE_FLAGS_CONFIG.environment}`;
}

/**
 * Cache evaluation result
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 */
function cacheEvaluation(key, value) {
    evaluationCache.set(key, {
        value,
        timestamp: Date.now()
    });
}

/**
 * Clear flag cache
 * @param {string} flagKey - Flag key to clear
 */
function clearFlagCache(flagKey) {
    for (const [key] of evaluationCache.entries()) {
        if (key.startsWith(flagKey)) {
            evaluationCache.delete(key);
        }
    }
}

/**
 * Get default value for type
 * @param {string} type - Flag type
 * @returns {any}
 */
function getDefaultForType(type) {
    switch (type) {
        case FLAG_TYPES.BOOLEAN:
            return false;
        case FLAG_TYPES.STRING:
            return '';
        case FLAG_TYPES.NUMBER:
            return 0;
        case FLAG_TYPES.JSON:
            return null;
        default:
            return false;
    }
}

/**
 * Hash user ID for audit logs
 * @param {string} userId - User ID
 * @returns {string}
 */
function hashUserId(userId) {
    return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

/**
 * Record flag history
 * @param {string} key - Flag key
 * @param {string} action - Action type
 * @param {Object} flag - Flag data
 */
function recordHistory(key, action, flag) {
    flagHistory.push({
        key,
        action,
        snapshot: { ...flag },
        timestamp: Date.now()
    });

    // Trim old history
    const cutoff = Date.now() - FEATURE_FLAGS_CONFIG.historyRetention;
    while (flagHistory.length > 0 && flagHistory[0].timestamp < cutoff) {
        flagHistory.shift();
    }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get flag definition
 * @param {string} key - Flag key
 * @returns {Object|null}
 */
function getFlag(key) {
    const flag = flags.get(key);
    if (!flag) return null;

    return {
        ...flag,
        targeting: undefined  // Hide targeting details
    };
}

/**
 * Get all flags
 * @param {Object} filters - Filters
 * @returns {Object[]}
 */
function getAllFlags(filters = {}) {
    const result = [];

    for (const flag of flags.values()) {
        // Apply filters
        if (filters.enabled !== undefined && flag.enabled !== filters.enabled) {
            continue;
        }
        if (filters.tag && !flag.tags.includes(filters.tag)) {
            continue;
        }
        if (filters.environment && !flag.environments.includes(filters.environment)) {
            continue;
        }

        result.push({
            key: flag.key,
            name: flag.name,
            description: flag.description,
            type: flag.type,
            enabled: flag.enabled,
            percentage: flag.percentage,
            environments: flag.environments,
            tags: flag.tags,
            version: flag.version,
            updatedAt: flag.updatedAt
        });
    }

    return result;
}

/**
 * Get flag history
 * @param {string} key - Flag key (optional)
 * @param {number} limit - Max entries
 * @returns {Object[]}
 */
function getHistory(key = null, limit = 50) {
    let history = flagHistory;

    if (key) {
        history = history.filter(h => h.key === key);
    }

    return history.slice(-limit).reverse();
}

/**
 * Evaluate all flags for context
 * @param {Object} context - Evaluation context
 * @returns {Object}
 */
function evaluateAll(context = {}) {
    const result = {};

    for (const [key] of flags.entries()) {
        result[key] = evaluate(key, context);
    }

    return result;
}

// ============================================
// METRICS
// ============================================

/**
 * Get feature flag statistics
 * @returns {Object}
 */
function getStats() {
    let enabledCount = 0;
    for (const flag of flags.values()) {
        if (flag.enabled) enabledCount++;
    }

    return {
        ...featureFlagStats,
        totalFlags: flags.size,
        enabledFlags: enabledCount,
        segments: segments.size,
        userOverrides: userOverrides.size,
        cacheSize: evaluationCache.size,
        historySize: flagHistory.length,
        cacheHitRate: featureFlagStats.evaluations > 0
            ? ((featureFlagStats.cacheHits / featureFlagStats.evaluations) * 100).toFixed(2) + '%'
            : '0%'
    };
}

// ============================================
// PREDEFINED FLAGS
// ============================================

// Common feature flags
createFlag('maintenance_mode', {
    name: 'Maintenance Mode',
    description: 'Enable site-wide maintenance mode',
    type: FLAG_TYPES.BOOLEAN,
    defaultValue: false,
    enabled: false
});

createFlag('new_game_engine', {
    name: 'New Game Engine',
    description: 'Enable new game engine for testing',
    type: FLAG_TYPES.BOOLEAN,
    percentage: 0,
    targeting: [
        { attribute: 'userType', operator: OPERATORS.EQUALS, value: 'beta', variation: true }
    ]
});

createFlag('premium_features', {
    name: 'Premium Features',
    description: 'Enable premium features for subscribers',
    type: FLAG_TYPES.BOOLEAN,
    targeting: [
        { attribute: 'tier', operator: OPERATORS.IN, value: ['premium', 'admin'], variation: true }
    ]
});

module.exports = {
    // Constants
    FLAG_TYPES,
    OPERATORS,

    // Flag management
    createFlag,
    deleteFlag,
    setFlagEnabled,
    setFlagPercentage,
    setFlagTargeting,

    // Evaluation
    evaluate,
    isEnabled,
    getVariation,
    evaluateAll,

    // User overrides
    setUserOverride,
    getUserOverride,
    removeUserOverride,
    getUserOverrides,

    // Segments
    createSegment,
    matchesSegment,
    getUserSegments,

    // Queries
    getFlag,
    getAllFlags,
    getHistory,

    // Utils
    getBucket,

    // Stats
    getStats,

    // Config
    FEATURE_FLAGS_CONFIG
};
