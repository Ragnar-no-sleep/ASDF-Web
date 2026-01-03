/**
 * ASDF API - Dynamic Configuration Service
 *
 * Runtime configuration management:
 * - Environment-based defaults
 * - Runtime updates without restart
 * - Configuration validation
 * - Change notifications
 *
 * Security by Design:
 * - Sensitive values encrypted at rest
 * - Access control for updates
 * - Audit logging for changes
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

// SECURITY: Validate encryption key at startup in production
const isProduction = process.env.NODE_ENV === 'production';
const configEncryptionKey = process.env.CONFIG_ENCRYPTION_KEY;

if (isProduction && !configEncryptionKey) {
    throw new Error(
        'SECURITY ERROR: CONFIG_ENCRYPTION_KEY must be configured in production.\n' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
}

const CONFIG_CONFIG = {
    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Encryption for sensitive values (required in production)
    encryptionKey: configEncryptionKey || crypto.randomBytes(32).toString('hex'),

    // History
    historySize: 100,

    // Validation
    strictMode: true
};

// ============================================
// STORAGE
// ============================================

// Configuration store
const configStore = new Map();

// Configuration schemas
const schemas = new Map();

// Change listeners
const listeners = new Map();

// Change history
const changeHistory = [];

// Stats
const configStats = {
    gets: 0,
    sets: 0,
    deletes: 0,
    validationErrors: 0
};

// ============================================
// SCHEMA DEFINITION
// ============================================

/**
 * Define configuration schema
 * @param {string} key - Config key
 * @param {Object} schema - Schema definition
 */
function defineSchema(key, schema) {
    schemas.set(key, {
        type: schema.type || 'string',
        required: schema.required ?? false,
        default: schema.default,
        sensitive: schema.sensitive ?? false,
        validator: schema.validator || null,
        description: schema.description || '',
        allowedValues: schema.allowedValues || null,
        min: schema.min,
        max: schema.max,
        pattern: schema.pattern,
        readonly: schema.readonly ?? false,
        environments: schema.environments || ['development', 'staging', 'production']
    });

    // Set default value if not already set
    if (schema.default !== undefined && !configStore.has(key)) {
        configStore.set(key, {
            value: schema.default,
            updatedAt: Date.now(),
            source: 'default'
        });
    }
}

// ============================================
// CORE OPERATIONS
// ============================================

/**
 * Get configuration value
 * @param {string} key - Config key
 * @param {any} defaultValue - Default if not found
 * @returns {any}
 */
function get(key, defaultValue = undefined) {
    configStats.gets++;

    const entry = configStore.get(key);
    if (!entry) {
        // Check schema for default
        const schema = schemas.get(key);
        if (schema?.default !== undefined) {
            return schema.default;
        }
        return defaultValue;
    }

    // Decrypt if sensitive
    const schema = schemas.get(key);
    if (schema?.sensitive && entry.encrypted) {
        return decrypt(entry.value);
    }

    return entry.value;
}

/**
 * Set configuration value
 * @param {string} key - Config key
 * @param {any} value - Value to set
 * @param {Object} options - Set options
 * @returns {{success: boolean, error?: string}}
 */
function set(key, value, options = {}) {
    const schema = schemas.get(key);

    // Check if readonly
    if (schema?.readonly && !options.force) {
        return { success: false, error: 'Configuration is readonly' };
    }

    // Check environment restrictions
    if (schema?.environments && !schema.environments.includes(CONFIG_CONFIG.environment)) {
        return { success: false, error: `Not allowed in ${CONFIG_CONFIG.environment} environment` };
    }

    // Validate
    const validation = validate(key, value);
    if (!validation.valid) {
        configStats.validationErrors++;
        return { success: false, error: validation.error };
    }

    const oldEntry = configStore.get(key);
    const oldValue = oldEntry?.value;

    // Encrypt if sensitive
    let storedValue = value;
    let encrypted = false;
    if (schema?.sensitive) {
        storedValue = encrypt(value);
        encrypted = true;
    }

    const entry = {
        value: storedValue,
        encrypted,
        updatedAt: Date.now(),
        updatedBy: options.updatedBy || 'system',
        source: options.source || 'runtime'
    };

    configStore.set(key, entry);
    configStats.sets++;

    // Record change
    recordChange(key, oldValue, value, options);

    // Notify listeners
    notifyListeners(key, value, oldValue);

    return { success: true };
}

/**
 * Delete configuration value
 * @param {string} key - Config key
 * @returns {boolean}
 */
function del(key) {
    const schema = schemas.get(key);

    if (schema?.readonly) {
        return false;
    }

    if (schema?.required) {
        return false;
    }

    const existed = configStore.delete(key);
    if (existed) {
        configStats.deletes++;
        recordChange(key, get(key), undefined, { action: 'delete' });
    }

    return existed;
}

/**
 * Check if configuration exists
 * @param {string} key - Config key
 * @returns {boolean}
 */
function has(key) {
    return configStore.has(key) || schemas.get(key)?.default !== undefined;
}

/**
 * Get all configuration (filtered)
 * @param {Object} options - Filter options
 * @returns {Object}
 */
function getAll(options = {}) {
    const {
        includeSensitive = false,
        includeMetadata = false,
        pattern = null
    } = options;

    const result = {};
    const regex = pattern ? new RegExp(pattern) : null;

    for (const [key, entry] of configStore.entries()) {
        // Filter by pattern
        if (regex && !regex.test(key)) {
            continue;
        }

        const schema = schemas.get(key);

        // Skip sensitive unless requested
        if (schema?.sensitive && !includeSensitive) {
            result[key] = '[SENSITIVE]';
            continue;
        }

        if (includeMetadata) {
            result[key] = {
                value: schema?.sensitive && entry.encrypted ? decrypt(entry.value) : entry.value,
                updatedAt: entry.updatedAt,
                source: entry.source,
                schema: schema ? {
                    type: schema.type,
                    sensitive: schema.sensitive,
                    readonly: schema.readonly
                } : null
            };
        } else {
            result[key] = schema?.sensitive && entry.encrypted ? decrypt(entry.value) : entry.value;
        }
    }

    return result;
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Set multiple configuration values
 * @param {Object} configs - Key-value pairs
 * @param {Object} options - Set options
 * @returns {Object} Results for each key
 */
function setMany(configs, options = {}) {
    const results = {};

    for (const [key, value] of Object.entries(configs)) {
        results[key] = set(key, value, options);
    }

    return results;
}

/**
 * Load configuration from environment
 * @param {Object} mapping - Env var to config key mapping
 */
function loadFromEnv(mapping) {
    for (const [envVar, configKey] of Object.entries(mapping)) {
        const value = process.env[envVar];
        if (value !== undefined) {
            const schema = schemas.get(configKey);
            let parsedValue = value;

            // Type coercion
            if (schema) {
                switch (schema.type) {
                    case 'number':
                        parsedValue = Number(value);
                        break;
                    case 'boolean':
                        parsedValue = value.toLowerCase() === 'true';
                        break;
                    case 'json':
                        try {
                            parsedValue = JSON.parse(value);
                        } catch {
                            console.warn(`[Config] Failed to parse JSON for ${configKey}`);
                        }
                        break;
                }
            }

            set(configKey, parsedValue, { source: 'environment' });
        }
    }
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate configuration value
 * @param {string} key - Config key
 * @param {any} value - Value to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validate(key, value) {
    const schema = schemas.get(key);

    if (!schema) {
        // Allow any value if no schema (non-strict mode)
        if (!CONFIG_CONFIG.strictMode) {
            return { valid: true };
        }
        return { valid: false, error: 'No schema defined for key' };
    }

    // Required check
    if (schema.required && (value === undefined || value === null)) {
        return { valid: false, error: 'Value is required' };
    }

    // Type check
    if (!validateType(value, schema.type)) {
        return { valid: false, error: `Expected ${schema.type}, got ${typeof value}` };
    }

    // Allowed values
    if (schema.allowedValues && !schema.allowedValues.includes(value)) {
        return { valid: false, error: `Value must be one of: ${schema.allowedValues.join(', ')}` };
    }

    // Range checks for numbers
    if (schema.type === 'number') {
        if (schema.min !== undefined && value < schema.min) {
            return { valid: false, error: `Value must be >= ${schema.min}` };
        }
        if (schema.max !== undefined && value > schema.max) {
            return { valid: false, error: `Value must be <= ${schema.max}` };
        }
    }

    // Pattern check for strings
    if (schema.type === 'string' && schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
            return { valid: false, error: 'Value does not match pattern' };
        }
    }

    // Custom validator
    if (schema.validator) {
        try {
            const result = schema.validator(value);
            if (result !== true) {
                return { valid: false, error: result || 'Custom validation failed' };
            }
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    return { valid: true };
}

/**
 * Validate type
 * @param {any} value - Value to check
 * @param {string} type - Expected type
 * @returns {boolean}
 */
function validateType(value, type) {
    switch (type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'json':
            return true;  // Already parsed
        case 'any':
            return true;
        default:
            return true;
    }
}

// ============================================
// CHANGE LISTENERS
// ============================================

/**
 * Subscribe to configuration changes
 * @param {string} key - Config key (or '*' for all)
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function onChange(key, callback) {
    if (!listeners.has(key)) {
        listeners.set(key, new Set());
    }

    listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
        listeners.get(key)?.delete(callback);
    };
}

/**
 * Notify change listeners
 * @param {string} key - Changed key
 * @param {any} newValue - New value
 * @param {any} oldValue - Old value
 */
function notifyListeners(key, newValue, oldValue) {
    // Specific key listeners
    const keyListeners = listeners.get(key);
    if (keyListeners) {
        for (const callback of keyListeners) {
            try {
                callback(newValue, oldValue, key);
            } catch (error) {
                console.error(`[Config] Listener error for ${key}:`, error.message);
            }
        }
    }

    // Wildcard listeners
    const wildcardListeners = listeners.get('*');
    if (wildcardListeners) {
        for (const callback of wildcardListeners) {
            try {
                callback(newValue, oldValue, key);
            } catch (error) {
                console.error('[Config] Wildcard listener error:', error.message);
            }
        }
    }
}

// ============================================
// ENCRYPTION
// ============================================

/**
 * Encrypt sensitive value
 * @param {any} value - Value to encrypt
 * @returns {string}
 */
function encrypt(value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(CONFIG_CONFIG.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(stringValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive value
 * @param {string} encrypted - Encrypted value
 * @returns {any}
 */
function decrypt(encrypted) {
    try {
        const [ivHex, data] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(CONFIG_CONFIG.encryptionKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Try to parse as JSON
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        console.error('[Config] Decryption failed:', error.message);
        return null;
    }
}

// ============================================
// HISTORY
// ============================================

/**
 * Record configuration change
 * @param {string} key - Changed key
 * @param {any} oldValue - Old value
 * @param {any} newValue - New value
 * @param {Object} options - Change options
 */
function recordChange(key, oldValue, newValue, options = {}) {
    const schema = schemas.get(key);

    changeHistory.push({
        key,
        oldValue: schema?.sensitive ? '[SENSITIVE]' : oldValue,
        newValue: schema?.sensitive ? '[SENSITIVE]' : newValue,
        timestamp: Date.now(),
        updatedBy: options.updatedBy || 'system',
        source: options.source || 'runtime',
        action: options.action || 'update'
    });

    // Trim history
    while (changeHistory.length > CONFIG_CONFIG.historySize) {
        changeHistory.shift();
    }

    logAudit('config_changed', {
        key,
        source: options.source || 'runtime'
    });
}

/**
 * Get change history
 * @param {string} key - Optional key filter
 * @param {number} limit - Max entries
 * @returns {Object[]}
 */
function getHistory(key = null, limit = 50) {
    let history = changeHistory;

    if (key) {
        history = history.filter(h => h.key === key);
    }

    return history.slice(-limit).reverse();
}

// ============================================
// METRICS
// ============================================

/**
 * Get configuration statistics
 * @returns {Object}
 */
function getStats() {
    let sensitiveCount = 0;
    let readonlyCount = 0;

    for (const schema of schemas.values()) {
        if (schema.sensitive) sensitiveCount++;
        if (schema.readonly) readonlyCount++;
    }

    return {
        ...configStats,
        totalConfigs: configStore.size,
        totalSchemas: schemas.size,
        sensitiveConfigs: sensitiveCount,
        readonlyConfigs: readonlyCount,
        environment: CONFIG_CONFIG.environment,
        historySize: changeHistory.length,
        listeners: Array.from(listeners.values()).reduce((sum, set) => sum + set.size, 0)
    };
}

// ============================================
// PREDEFINED SCHEMAS
// ============================================

// API configuration
defineSchema('api.port', {
    type: 'number',
    default: 3001,
    min: 1,
    max: 65535,
    description: 'API server port'
});

defineSchema('api.rateLimit.enabled', {
    type: 'boolean',
    default: true,
    description: 'Enable rate limiting'
});

defineSchema('api.rateLimit.maxRequests', {
    type: 'number',
    default: 60,
    min: 1,
    max: 1000,
    description: 'Max requests per minute'
});

// Security
defineSchema('security.jwtSecret', {
    type: 'string',
    sensitive: true,
    required: true,
    description: 'JWT signing secret'
});

defineSchema('security.adminWallets', {
    type: 'array',
    default: [],
    description: 'Admin wallet addresses'
});

// Features
defineSchema('features.maintenance', {
    type: 'boolean',
    default: false,
    description: 'Enable maintenance mode'
});

defineSchema('features.newGameEngine', {
    type: 'boolean',
    default: false,
    description: 'Enable new game engine'
});

// Cache
defineSchema('cache.defaultTTL', {
    type: 'number',
    default: 300000,  // 5 minutes
    min: 1000,
    description: 'Default cache TTL in ms'
});

// Load from environment
loadFromEnv({
    'API_PORT': 'api.port',
    'JWT_SECRET': 'security.jwtSecret',
    'ADMIN_WALLETS': 'security.adminWallets',
    'MAINTENANCE_MODE': 'features.maintenance'
});

module.exports = {
    // Schema
    defineSchema,

    // Core
    get,
    set,
    del,
    has,
    getAll,

    // Bulk
    setMany,
    loadFromEnv,

    // Validation
    validate,

    // Listeners
    onChange,

    // History
    getHistory,

    // Stats
    getStats,

    // Config
    CONFIG_CONFIG
};
