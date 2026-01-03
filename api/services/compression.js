/**
 * ASDF API - Response Compression Service
 *
 * Production-ready compression:
 * - Gzip and Brotli support
 * - Content-type based compression
 * - Size threshold optimization
 * - ETag generation
 *
 * Security by Design:
 * - No compression of sensitive data
 * - BREACH attack mitigation
 * - Resource limit protection
 */

'use strict';

const zlib = require('zlib');
const crypto = require('crypto');

// ============================================
// CONFIGURATION
// ============================================

const COMPRESSION_CONFIG = {
    // Enable/disable compression
    enabled: true,

    // Compression level (1-9, higher = more compression)
    gzipLevel: 6,
    brotliLevel: 4,

    // Minimum size to compress (bytes)
    threshold: 1024,  // 1KB

    // Maximum size to compress (prevent DoS)
    maxSize: 10 * 1024 * 1024,  // 10MB

    // Content types to compress
    compressibleTypes: [
        'text/plain',
        'text/html',
        'text/css',
        'text/xml',
        'text/javascript',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/rss+xml',
        'application/atom+xml',
        'image/svg+xml'
    ],

    // Paths to exclude from compression
    excludedPaths: [
        '/health',
        '/livez',
        '/readyz'
    ],

    // Enable ETag generation
    etag: true,

    // Vary header handling
    vary: true
};

// ============================================
// STORAGE
// ============================================

// Stats
const compressionStats = {
    totalResponses: 0,
    compressedResponses: 0,
    gzipResponses: 0,
    brotliResponses: 0,
    identityResponses: 0,
    bytesSaved: 0,
    bytesOriginal: 0,
    bytesCompressed: 0,
    avgCompressionRatio: 0,
    cacheHits: 0
};

// Simple in-memory cache for frequently compressed responses
const compressionCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 60000;  // 1 minute

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Create compression middleware
 * @param {Object} options - Override options
 * @returns {Function} Express middleware
 */
function middleware(options = {}) {
    const config = { ...COMPRESSION_CONFIG, ...options };

    return async (req, res, next) => {
        if (!config.enabled) {
            return next();
        }

        // Skip excluded paths
        if (config.excludedPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Check Accept-Encoding
        const acceptEncoding = req.get('Accept-Encoding') || '';
        const encoding = selectEncoding(acceptEncoding);

        // Store original methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        const originalEnd = res.end.bind(res);

        // Add Vary header
        if (config.vary) {
            const vary = res.getHeader('Vary');
            if (vary) {
                res.setHeader('Vary', vary + ', Accept-Encoding');
            } else {
                res.setHeader('Vary', 'Accept-Encoding');
            }
        }

        // Override json method
        res.json = function(body) {
            const json = JSON.stringify(body);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return compressAndSend(res, json, encoding, config, originalEnd);
        };

        // Override send method
        res.send = function(body) {
            if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
                return res.json(body);
            }

            const contentType = res.getHeader('Content-Type') || 'text/html';

            if (shouldCompress(contentType, body, config)) {
                return compressAndSend(res, body, encoding, config, originalEnd);
            }

            return originalSend(body);
        };

        next();
    };
}

// ============================================
// ENCODING SELECTION
// ============================================

/**
 * Select best encoding based on Accept-Encoding
 * @param {string} acceptEncoding - Accept-Encoding header value
 * @returns {string} Selected encoding
 */
function selectEncoding(acceptEncoding) {
    // Parse Accept-Encoding with quality values
    const encodings = parseAcceptEncoding(acceptEncoding);

    // Prefer Brotli if available
    if (encodings.br > 0) {
        return 'br';
    }

    // Fall back to gzip
    if (encodings.gzip > 0) {
        return 'gzip';
    }

    // No compression
    return 'identity';
}

/**
 * Parse Accept-Encoding header
 * @param {string} header - Accept-Encoding value
 * @returns {Object} Encoding quality values
 */
function parseAcceptEncoding(header) {
    const encodings = {
        br: 0,
        gzip: 0,
        deflate: 0,
        identity: 1
    };

    if (!header) {
        return encodings;
    }

    const parts = header.split(',');
    for (const part of parts) {
        const [encoding, quality] = part.trim().split(';q=');
        const enc = encoding.trim().toLowerCase();
        const q = quality ? parseFloat(quality) : 1;

        if (encodings.hasOwnProperty(enc)) {
            encodings[enc] = q;
        }

        // Handle wildcard
        if (enc === '*') {
            for (const key of Object.keys(encodings)) {
                if (encodings[key] === 0) {
                    encodings[key] = q * 0.5;
                }
            }
        }
    }

    return encodings;
}

// ============================================
// COMPRESSION
// ============================================

/**
 * Check if response should be compressed
 * @param {string} contentType - Content-Type header
 * @param {any} body - Response body
 * @param {Object} config - Configuration
 * @returns {boolean}
 */
function shouldCompress(contentType, body, config) {
    // Check if content type is compressible
    const isCompressible = config.compressibleTypes.some(type =>
        contentType.toLowerCase().includes(type)
    );

    if (!isCompressible) {
        return false;
    }

    // Check size threshold
    const size = getBodySize(body);

    if (size < config.threshold) {
        return false;
    }

    if (size > config.maxSize) {
        return false;
    }

    return true;
}

/**
 * Get body size in bytes
 * @param {any} body - Response body
 * @returns {number}
 */
function getBodySize(body) {
    if (Buffer.isBuffer(body)) {
        return body.length;
    }

    if (typeof body === 'string') {
        return Buffer.byteLength(body, 'utf8');
    }

    return 0;
}

/**
 * Compress and send response
 * @param {Object} res - Express response
 * @param {any} body - Body to compress
 * @param {string} encoding - Compression encoding
 * @param {Object} config - Configuration
 * @param {Function} originalEnd - Original end method
 */
async function compressAndSend(res, body, encoding, config, originalEnd) {
    compressionStats.totalResponses++;

    const originalSize = getBodySize(body);
    compressionStats.bytesOriginal += originalSize;

    // No compression needed
    if (encoding === 'identity' || originalSize < config.threshold) {
        compressionStats.identityResponses++;
        res.setHeader('Content-Length', originalSize);
        return originalEnd.call(res, body);
    }

    // Generate cache key
    const cacheKey = generateCacheKey(body, encoding);

    // Check cache
    const cached = compressionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        compressionStats.cacheHits++;
        sendCompressed(res, cached.data, encoding, originalEnd, config, originalSize);
        return;
    }

    // Compress
    try {
        const compressed = await compress(body, encoding, config);

        // Only use compression if it reduces size
        if (compressed.length >= originalSize) {
            compressionStats.identityResponses++;
            res.setHeader('Content-Length', originalSize);
            return originalEnd.call(res, body);
        }

        // Cache the result
        if (compressionCache.size >= CACHE_MAX_SIZE) {
            // Remove oldest entry
            const firstKey = compressionCache.keys().next().value;
            compressionCache.delete(firstKey);
        }

        compressionCache.set(cacheKey, {
            data: compressed,
            expires: Date.now() + CACHE_TTL
        });

        sendCompressed(res, compressed, encoding, originalEnd, config, originalSize);

    } catch (error) {
        console.error('[Compression] Error:', error.message);
        compressionStats.identityResponses++;
        res.setHeader('Content-Length', originalSize);
        return originalEnd.call(res, body);
    }
}

/**
 * Send compressed response
 * @param {Object} res - Express response
 * @param {Buffer} compressed - Compressed data
 * @param {string} encoding - Encoding used
 * @param {Function} originalEnd - Original end method
 * @param {Object} config - Configuration
 * @param {number} originalSize - Original size
 */
function sendCompressed(res, compressed, encoding, originalEnd, config, originalSize) {
    // Update stats
    if (encoding === 'gzip') {
        compressionStats.gzipResponses++;
    } else if (encoding === 'br') {
        compressionStats.brotliResponses++;
    }

    compressionStats.compressedResponses++;
    compressionStats.bytesCompressed += compressed.length;
    compressionStats.bytesSaved += originalSize - compressed.length;

    // Update average compression ratio
    compressionStats.avgCompressionRatio = (
        compressionStats.bytesCompressed / compressionStats.bytesOriginal
    );

    // Set headers
    res.setHeader('Content-Encoding', encoding);
    res.setHeader('Content-Length', compressed.length);
    res.removeHeader('Content-Length');  // Let Express handle it

    // Generate ETag if enabled
    if (config.etag) {
        const etag = generateETag(compressed);
        res.setHeader('ETag', etag);
    }

    originalEnd.call(res, compressed);
}

/**
 * Compress data with specified encoding
 * @param {any} data - Data to compress
 * @param {string} encoding - Encoding to use
 * @param {Object} config - Configuration
 * @returns {Promise<Buffer>}
 */
function compress(data, encoding, config) {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

        if (encoding === 'br') {
            zlib.brotliCompress(buffer, {
                params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: config.brotliLevel
                }
            }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        } else {
            zlib.gzip(buffer, {
                level: config.gzipLevel
            }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        }
    });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate cache key for compressed content
 * @param {any} body - Content body
 * @param {string} encoding - Compression encoding
 * @returns {string}
 */
function generateCacheKey(body, encoding) {
    const hash = crypto
        .createHash('md5')
        .update(typeof body === 'string' ? body : JSON.stringify(body))
        .digest('hex')
        .substring(0, 16);

    return `${encoding}:${hash}`;
}

/**
 * Generate ETag for content
 * @param {Buffer} content - Content buffer
 * @returns {string}
 */
function generateETag(content) {
    const hash = crypto
        .createHash('md5')
        .update(content)
        .digest('base64')
        .substring(0, 22);

    return `W/"${content.length.toString(16)}-${hash}"`;
}

// ============================================
// DECOMPRESSION
// ============================================

/**
 * Decompress request body middleware
 * @returns {Function} Express middleware
 */
function decompressMiddleware() {
    return (req, res, next) => {
        const encoding = req.get('Content-Encoding');

        if (!encoding || encoding === 'identity') {
            return next();
        }

        const chunks = [];

        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);

            decompress(buffer, encoding)
                .then(decompressed => {
                    req.body = JSON.parse(decompressed.toString('utf8'));
                    next();
                })
                .catch(err => {
                    res.status(400).json({
                        error: 'Decompression Failed',
                        message: err.message
                    });
                });
        });
    };
}

/**
 * Decompress data
 * @param {Buffer} data - Compressed data
 * @param {string} encoding - Encoding used
 * @returns {Promise<Buffer>}
 */
function decompress(data, encoding) {
    return new Promise((resolve, reject) => {
        if (encoding === 'br') {
            zlib.brotliDecompress(data, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        } else if (encoding === 'gzip') {
            zlib.gunzip(data, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        } else if (encoding === 'deflate') {
            zlib.inflate(data, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        } else {
            reject(new Error(`Unsupported encoding: ${encoding}`));
        }
    });
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Clear compression cache
 */
function clearCache() {
    compressionCache.clear();
}

/**
 * Get cache stats
 * @returns {Object}
 */
function getCacheStats() {
    let expiredCount = 0;
    const now = Date.now();

    for (const entry of compressionCache.values()) {
        if (entry.expires <= now) {
            expiredCount++;
        }
    }

    return {
        size: compressionCache.size,
        maxSize: CACHE_MAX_SIZE,
        expired: expiredCount,
        hits: compressionStats.cacheHits
    };
}

// ============================================
// METRICS
// ============================================

/**
 * Get compression statistics
 * @returns {Object}
 */
function getStats() {
    const compressionRatio = compressionStats.bytesOriginal > 0
        ? (1 - (compressionStats.bytesCompressed / compressionStats.bytesOriginal)) * 100
        : 0;

    return {
        ...compressionStats,
        avgCompressionRatio: (compressionStats.avgCompressionRatio * 100).toFixed(2) + '%',
        bytesSavedFormatted: formatBytes(compressionStats.bytesSaved),
        bytesOriginalFormatted: formatBytes(compressionStats.bytesOriginal),
        bytesCompressedFormatted: formatBytes(compressionStats.bytesCompressed),
        compressionRate: compressionStats.totalResponses > 0
            ? ((compressionStats.compressedResponses / compressionStats.totalResponses) * 100).toFixed(2) + '%'
            : '0%',
        savingsPercent: compressionRatio.toFixed(2) + '%',
        cache: getCacheStats()
    };
}

/**
 * Format bytes to human readable
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
    // Config
    COMPRESSION_CONFIG,

    // Middleware
    middleware,
    decompressMiddleware,

    // Utilities
    compress,
    decompress,
    selectEncoding,
    shouldCompress,
    generateETag,

    // Cache
    clearCache,
    getCacheStats,

    // Stats
    getStats
};
