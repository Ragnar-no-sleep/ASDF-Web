/**
 * ASDF API - API Versioning Service
 *
 * Production-ready API versioning:
 * - Header-based version detection
 * - URL path versioning support
 * - Version deprecation handling
 * - Backward compatibility management
 *
 * Security by Design:
 * - Version validation
 * - Deprecation warnings
 * - Audit logging for version usage
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const VERSIONING_CONFIG = {
    // Current version
    currentVersion: 'v1',

    // Supported versions
    supportedVersions: ['v1'],

    // Deprecated versions (still work but with warnings)
    deprecatedVersions: [],

    // Sunset versions (no longer supported)
    sunsetVersions: [],

    // Default version for requests without version
    defaultVersion: 'v1',

    // Version detection methods
    detection: {
        header: true,        // X-API-Version header
        path: true,          // /v1/endpoint
        query: false         // ?version=v1
    },

    // Header name for version
    headerName: 'X-API-Version',

    // Response header for current version
    responseHeader: 'X-API-Version-Used'
};

// ============================================
// STORAGE
// ============================================

// Version handlers
const versionHandlers = new Map();

// Route transformers per version
const routeTransformers = new Map();

// Deprecation dates for versions
const deprecationDates = new Map();

// Response transformers per version
const responseTransformers = new Map();

// Stats
const versionStats = {
    requests: {},
    deprecationWarnings: 0,
    versionErrors: 0
};

// Initialize stats for supported versions
for (const version of VERSIONING_CONFIG.supportedVersions) {
    versionStats.requests[version] = 0;
}

// ============================================
// VERSION DETECTION
// ============================================

/**
 * Detect API version from request
 * @param {Object} req - Express request
 * @returns {string} Detected version
 */
function detectVersion(req) {
    let version = null;

    // Try header detection
    if (VERSIONING_CONFIG.detection.header) {
        version = req.get(VERSIONING_CONFIG.headerName);
        if (version) {
            return normalizeVersion(version);
        }
    }

    // Try path detection
    if (VERSIONING_CONFIG.detection.path) {
        const pathMatch = req.path.match(/^\/(v\d+)\//);
        if (pathMatch) {
            return normalizeVersion(pathMatch[1]);
        }
    }

    // Try query detection
    if (VERSIONING_CONFIG.detection.query) {
        version = req.query.version || req.query.v;
        if (version) {
            return normalizeVersion(version);
        }
    }

    // Return default version
    return VERSIONING_CONFIG.defaultVersion;
}

/**
 * Normalize version string
 * @param {string} version - Raw version
 * @returns {string} Normalized version
 */
function normalizeVersion(version) {
    if (!version) {
        return VERSIONING_CONFIG.defaultVersion;
    }

    // Remove 'v' prefix if present and add it back
    const num = version.toString().toLowerCase().replace(/^v/, '');
    return `v${num}`;
}

// ============================================
// VERSION VALIDATION
// ============================================

/**
 * Check if version is supported
 * @param {string} version - Version to check
 * @returns {Object} Validation result
 */
function validateVersion(version) {
    const normalized = normalizeVersion(version);

    // Check if supported
    if (VERSIONING_CONFIG.supportedVersions.includes(normalized)) {
        return {
            valid: true,
            version: normalized,
            deprecated: VERSIONING_CONFIG.deprecatedVersions.includes(normalized),
            current: normalized === VERSIONING_CONFIG.currentVersion
        };
    }

    // Check if deprecated
    if (VERSIONING_CONFIG.deprecatedVersions.includes(normalized)) {
        return {
            valid: true,
            version: normalized,
            deprecated: true,
            current: false,
            warning: `API version ${normalized} is deprecated. Please upgrade to ${VERSIONING_CONFIG.currentVersion}`
        };
    }

    // Check if sunset
    if (VERSIONING_CONFIG.sunsetVersions.includes(normalized)) {
        return {
            valid: false,
            version: normalized,
            error: `API version ${normalized} is no longer supported. Please use ${VERSIONING_CONFIG.currentVersion}`
        };
    }

    // Unknown version
    return {
        valid: false,
        version: normalized,
        error: `Unknown API version: ${normalized}. Supported versions: ${VERSIONING_CONFIG.supportedVersions.join(', ')}`
    };
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Express middleware for API versioning
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function middleware(options = {}) {
    const {
        strict = false,           // Reject requests with invalid versions
        warnDeprecated = true     // Add deprecation warnings
    } = options;

    return (req, res, next) => {
        // Detect version
        const version = detectVersion(req);
        const validation = validateVersion(version);

        // Store version on request
        req.apiVersion = validation.version;

        // Track stats
        if (versionStats.requests[validation.version] !== undefined) {
            versionStats.requests[validation.version]++;
        }

        // Set response header
        res.setHeader(VERSIONING_CONFIG.responseHeader, validation.version);

        // Handle invalid versions
        if (!validation.valid) {
            versionStats.versionErrors++;

            if (strict) {
                return res.status(400).json({
                    error: 'Invalid API Version',
                    message: validation.error,
                    supportedVersions: VERSIONING_CONFIG.supportedVersions,
                    currentVersion: VERSIONING_CONFIG.currentVersion
                });
            }

            // Fall back to default version
            req.apiVersion = VERSIONING_CONFIG.defaultVersion;
        }

        // Handle deprecated versions
        if (validation.deprecated && warnDeprecated) {
            versionStats.deprecationWarnings++;

            // Add deprecation header
            res.setHeader('Deprecation', 'true');
            res.setHeader('Sunset', getSunsetDate(validation.version));

            if (validation.warning) {
                res.setHeader('X-API-Deprecation-Warning', validation.warning);
            }

            logAudit('api_version_deprecated', {
                version: validation.version,
                path: req.path
            });
        }

        // Apply request transformers
        transformRequest(req);

        // Wrap response for transformation
        if (responseTransformers.has(req.apiVersion)) {
            wrapResponse(req, res);
        }

        next();
    };
}

// ============================================
// TRANSFORMERS
// ============================================

/**
 * Register request transformer for version
 * @param {string} version - API version
 * @param {Function} transformer - Transform function
 */
function registerRequestTransformer(version, transformer) {
    if (typeof transformer !== 'function') {
        throw new Error('Transformer must be a function');
    }

    routeTransformers.set(normalizeVersion(version), transformer);
}

/**
 * Register response transformer for version
 * @param {string} version - API version
 * @param {Function} transformer - Transform function
 */
function registerResponseTransformer(version, transformer) {
    if (typeof transformer !== 'function') {
        throw new Error('Transformer must be a function');
    }

    responseTransformers.set(normalizeVersion(version), transformer);
}

/**
 * Apply request transformation
 * @param {Object} req - Express request
 */
function transformRequest(req) {
    const transformer = routeTransformers.get(req.apiVersion);
    if (transformer) {
        try {
            transformer(req);
        } catch (error) {
            console.error(`[Versioning] Request transform error: ${error.message}`);
        }
    }
}

/**
 * Wrap response for transformation
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function wrapResponse(req, res) {
    const originalJson = res.json.bind(res);
    const transformer = responseTransformers.get(req.apiVersion);

    res.json = (data) => {
        try {
            const transformed = transformer(data, req);
            return originalJson(transformed);
        } catch (error) {
            console.error(`[Versioning] Response transform error: ${error.message}`);
            return originalJson(data);
        }
    };
}

// ============================================
// VERSION-SPECIFIC HANDLERS
// ============================================

/**
 * Register version-specific route handler
 * @param {string} version - API version
 * @param {string} route - Route path
 * @param {Function} handler - Route handler
 */
function registerHandler(version, route, handler) {
    const key = `${normalizeVersion(version)}:${route}`;
    versionHandlers.set(key, handler);
}

/**
 * Get version-specific handler
 * @param {string} version - API version
 * @param {string} route - Route path
 * @returns {Function|null}
 */
function getHandler(version, route) {
    const key = `${normalizeVersion(version)}:${route}`;
    return versionHandlers.get(key) || null;
}

/**
 * Create versioned router
 * @param {string} version - API version
 * @returns {Object} Express router-like object
 */
function createVersionedRouter(version) {
    const express = require('express');
    const router = express.Router();
    const normalizedVersion = normalizeVersion(version);

    // Add version check middleware
    router.use((req, res, next) => {
        if (req.apiVersion !== normalizedVersion) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Endpoint not available in ${req.apiVersion}`
            });
        }
        next();
    });

    return router;
}

// ============================================
// DEPRECATION MANAGEMENT
// ============================================

/**
 * Deprecate a version
 * @param {string} version - Version to deprecate
 * @param {Date} sunsetDate - When version will be removed
 */
function deprecateVersion(version, sunsetDate) {
    const normalized = normalizeVersion(version);

    // Move from supported to deprecated
    const idx = VERSIONING_CONFIG.supportedVersions.indexOf(normalized);
    if (idx > -1) {
        VERSIONING_CONFIG.supportedVersions.splice(idx, 1);
    }

    if (!VERSIONING_CONFIG.deprecatedVersions.includes(normalized)) {
        VERSIONING_CONFIG.deprecatedVersions.push(normalized);
    }

    // Store sunset date
    deprecationDates.set(normalized, sunsetDate);

    logAudit('version_deprecated', {
        version: normalized,
        sunsetDate: sunsetDate.toISOString()
    });

    console.log(`[Versioning] Version ${normalized} deprecated, sunset: ${sunsetDate.toISOString()}`);
}

/**
 * Sunset a version (remove support)
 * @param {string} version - Version to sunset
 */
function sunsetVersion(version) {
    const normalized = normalizeVersion(version);

    // Remove from deprecated
    const idx = VERSIONING_CONFIG.deprecatedVersions.indexOf(normalized);
    if (idx > -1) {
        VERSIONING_CONFIG.deprecatedVersions.splice(idx, 1);
    }

    if (!VERSIONING_CONFIG.sunsetVersions.includes(normalized)) {
        VERSIONING_CONFIG.sunsetVersions.push(normalized);
    }

    logAudit('version_sunset', {
        version: normalized
    });

    console.log(`[Versioning] Version ${normalized} is now sunset (unsupported)`);
}

/**
 * Get sunset date for version
 * @param {string} version - API version
 * @returns {string} Sunset date header value
 */
function getSunsetDate(version) {
    if (global.deprecationDates?.has(version)) {
        return global.deprecationDates.get(version).toISOString();
    }

    // Default to 90 days from now
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toISOString();
}

// ============================================
// COMPATIBILITY HELPERS
// ============================================

/**
 * Check if feature available in version
 * @param {string} version - API version
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
function hasFeature(version, feature) {
    // Define features per version
    const features = {
        v1: ['basic', 'leaderboard', 'auth', 'webhooks', 'achievements']
    };

    const normalized = normalizeVersion(version);
    return features[normalized]?.includes(feature) ?? false;
}

/**
 * Get version number for comparison
 * @param {string} version - Version string
 * @returns {number}
 */
function getVersionNumber(version) {
    const match = version.match(/v(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if version is at least a certain level
 * @param {string} version - Current version
 * @param {string} minVersion - Minimum required version
 * @returns {boolean}
 */
function isVersionAtLeast(version, minVersion) {
    return getVersionNumber(version) >= getVersionNumber(minVersion);
}

// ============================================
// DOCUMENTATION
// ============================================

/**
 * Get version documentation
 * @returns {Object}
 */
function getVersionInfo() {
    return {
        currentVersion: VERSIONING_CONFIG.currentVersion,
        supportedVersions: VERSIONING_CONFIG.supportedVersions,
        deprecatedVersions: VERSIONING_CONFIG.deprecatedVersions,
        sunsetVersions: VERSIONING_CONFIG.sunsetVersions,
        defaultVersion: VERSIONING_CONFIG.defaultVersion,
        detection: {
            header: VERSIONING_CONFIG.headerName,
            path: '/v{n}/...',
            query: VERSIONING_CONFIG.detection.query ? '?version=v{n}' : null
        }
    };
}

// ============================================
// METRICS
// ============================================

/**
 * Get versioning statistics
 * @returns {Object}
 */
function getStats() {
    const totalRequests = Object.values(versionStats.requests)
        .reduce((sum, count) => sum + count, 0);

    return {
        ...versionStats,
        totalRequests,
        currentVersion: VERSIONING_CONFIG.currentVersion,
        supportedCount: VERSIONING_CONFIG.supportedVersions.length,
        deprecatedCount: VERSIONING_CONFIG.deprecatedVersions.length,
        sunsetCount: VERSIONING_CONFIG.sunsetVersions.length,
        versionDistribution: Object.entries(versionStats.requests)
            .map(([version, count]) => ({
                version,
                count,
                percentage: totalRequests > 0
                    ? ((count / totalRequests) * 100).toFixed(2) + '%'
                    : '0%'
            }))
    };
}

module.exports = {
    // Config
    VERSIONING_CONFIG,

    // Detection
    detectVersion,
    normalizeVersion,
    validateVersion,

    // Middleware
    middleware,

    // Transformers
    registerRequestTransformer,
    registerResponseTransformer,

    // Handlers
    registerHandler,
    getHandler,
    createVersionedRouter,

    // Deprecation
    deprecateVersion,
    sunsetVersion,

    // Compatibility
    hasFeature,
    isVersionAtLeast,

    // Documentation
    getVersionInfo,

    // Stats
    getStats
};
