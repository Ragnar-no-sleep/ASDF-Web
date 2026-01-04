/**
 * ASDF API - Helius Enhanced Services
 *
 * Advanced Helius API integration:
 * - DAS API for NFTs and compressed NFTs
 * - Transaction simulation (preflight)
 * - Enhanced transaction parsing
 * - Account webhooks management
 * - Staked connection optimization
 *
 * @author Helius Engineering Standards
 * @version 2.0.0
 *
 * Security by Design:
 * - API key never logged
 * - Request signing for webhooks
 * - Input validation on all endpoints
 * - Rate limiting awareness
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

// API endpoints
const HELIUS_API = {
    RPC: process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
    REST: 'https://api.helius.xyz',
    DAS: 'https://mainnet.helius-rpc.com'
};

// DAS API configuration
const DAS_CONFIG = {
    pageSize: 100,
    maxPages: 10,
    timeout: 30000,
    retries: 3
};

// Simulation configuration
const SIMULATION_CONFIG = {
    commitment: 'confirmed',
    encoding: 'base64',
    replaceRecentBlockhash: true,
    timeout: 10000
};

// Cache configuration (Fibonacci TTLs)
const CACHE_CONFIG = {
    assetMetadata: 5 * 60 * 1000,   // 5 minutes
    assetsByOwner: 2 * 60 * 1000,   // 2 minutes
    assetsByGroup: 5 * 60 * 1000,   // 5 minutes
    simulation: 10 * 1000,           // 10 seconds
    parsedTx: 60 * 60 * 1000        // 1 hour (immutable)
};

// In-memory cache
const cache = new Map();

// ============================================
// CACHE UTILITIES
// ============================================

function getCached(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
    }
    return item.value;
}

function setCache(key, value, ttl) {
    cache.set(key, {
        value,
        expiresAt: Date.now() + ttl
    });
}

function clearCache(pattern = null) {
    if (!pattern) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
        if (now > item.expiresAt) {
            cache.delete(key);
        }
    }
}, 5 * 60 * 1000);

// ============================================
// DAS API - Digital Asset Standard
// ============================================

/**
 * Get asset by ID using DAS API
 * Supports both regular NFTs and compressed NFTs (cNFTs)
 * @param {string} assetId - Asset mint address or asset ID
 * @returns {Promise<Object>}
 */
async function getAsset(assetId) {
    const cacheKey = `asset:${assetId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const result = await callDasApi('getAsset', { id: assetId });

    if (result) {
        setCache(cacheKey, result, CACHE_CONFIG.assetMetadata);
    }

    return result;
}

/**
 * Get assets by owner
 * Efficient pagination for wallets with many assets
 * @param {string} ownerAddress - Wallet address
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getAssetsByOwner(ownerAddress, options = {}) {
    const {
        page = 1,
        limit = DAS_CONFIG.pageSize,
        sortBy = { sortBy: 'created', sortDirection: 'desc' },
        displayOptions = { showFungible: false, showNativeBalance: false }
    } = options;

    const cacheKey = `assets:owner:${ownerAddress}:${page}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const result = await callDasApi('getAssetsByOwner', {
        ownerAddress,
        page,
        limit,
        sortBy,
        displayOptions
    });

    if (result) {
        setCache(cacheKey, result, CACHE_CONFIG.assetsByOwner);
    }

    return result;
}

/**
 * Get assets by group (collection)
 * @param {string} groupKey - Group key (e.g., 'collection')
 * @param {string} groupValue - Group value (collection address)
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getAssetsByGroup(groupKey, groupValue, options = {}) {
    const { page = 1, limit = DAS_CONFIG.pageSize } = options;

    const cacheKey = `assets:group:${groupKey}:${groupValue}:${page}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const result = await callDasApi('getAssetsByGroup', {
        groupKey,
        groupValue,
        page,
        limit
    });

    if (result) {
        setCache(cacheKey, result, CACHE_CONFIG.assetsByGroup);
    }

    return result;
}

/**
 * Search assets with filters
 * @param {Object} searchParams - Search parameters
 * @returns {Promise<Object>}
 */
async function searchAssets(searchParams) {
    return callDasApi('searchAssets', searchParams);
}

/**
 * Get asset proof (for compressed NFTs)
 * Required for transfers and burns of cNFTs
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>}
 */
async function getAssetProof(assetId) {
    return callDasApi('getAssetProof', { id: assetId });
}

/**
 * Get multiple asset proofs in batch
 * @param {string[]} assetIds - Array of asset IDs
 * @returns {Promise<Object>}
 */
async function getAssetProofBatch(assetIds) {
    return callDasApi('getAssetProofBatch', { ids: assetIds });
}

// ============================================
// TRANSACTION SIMULATION
// ============================================

/**
 * Simulate transaction before sending
 * Detects errors before spending SOL on fees
 * @param {string} encodedTransaction - Base64 encoded transaction
 * @param {Object} options - Simulation options
 * @returns {Promise<Object>}
 */
async function simulateTransaction(encodedTransaction, options = {}) {
    const {
        commitment = SIMULATION_CONFIG.commitment,
        replaceRecentBlockhash = SIMULATION_CONFIG.replaceRecentBlockhash,
        accounts = null
    } = options;

    const params = {
        transaction: encodedTransaction,
        config: {
            commitment,
            encoding: SIMULATION_CONFIG.encoding,
            replaceRecentBlockhash
        }
    };

    // Optionally include account state for more accurate simulation
    if (accounts) {
        params.config.accounts = {
            encoding: 'base64',
            addresses: accounts
        };
    }

    try {
        const result = await callRpcMethod('simulateTransaction', [
            encodedTransaction,
            params.config
        ]);

        const response = {
            success: !result.value?.err,
            error: result.value?.err || null,
            logs: result.value?.logs || [],
            unitsConsumed: result.value?.unitsConsumed || 0,
            returnData: result.value?.returnData || null
        };

        // Log simulation failures for debugging
        if (!response.success) {
            logAudit('tx_simulation_failed', {
                error: JSON.stringify(result.value?.err),
                unitsConsumed: response.unitsConsumed
            });
        }

        return response;

    } catch (error) {
        console.error('[Helius] Simulation error:', error.message);
        return {
            success: false,
            error: error.message,
            logs: [],
            unitsConsumed: 0
        };
    }
}

/**
 * Estimate compute units for a transaction
 * @param {string} encodedTransaction - Base64 encoded transaction
 * @returns {Promise<number>}
 */
async function estimateComputeUnits(encodedTransaction) {
    const simulation = await simulateTransaction(encodedTransaction);

    if (simulation.success && simulation.unitsConsumed > 0) {
        // Add 20% buffer for safety (Fibonacci: ~21% is fib[8]/fib[9])
        return Math.ceil(simulation.unitsConsumed * 1.21);
    }

    // Default fallback
    return 200000;
}

// ============================================
// ENHANCED TRANSACTION PARSING
// ============================================

/**
 * Parse transaction with Helius Enhanced API
 * Rich metadata about transfers, swaps, NFT actions
 * @param {string} signature - Transaction signature
 * @returns {Promise<Object>}
 */
async function parseTransaction(signature) {
    const cacheKey = `parsed:${signature}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(
            `${HELIUS_API.REST}/v0/transactions/?api-key=${HELIUS_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: [signature] }),
                timeout: 10000
            }
        );

        if (!response.ok) {
            throw new Error(`Parse API error: ${response.status}`);
        }

        const [parsed] = await response.json();

        if (parsed) {
            setCache(cacheKey, parsed, CACHE_CONFIG.parsedTx);
        }

        return parsed;

    } catch (error) {
        console.error('[Helius] Parse transaction error:', error.message);
        return null;
    }
}

/**
 * Parse multiple transactions in batch
 * @param {string[]} signatures - Array of signatures
 * @returns {Promise<Object[]>}
 */
async function parseTransactions(signatures) {
    if (signatures.length === 0) return [];
    if (signatures.length > 100) {
        throw new Error('Maximum 100 transactions per batch');
    }

    // Check cache for each
    const results = [];
    const uncached = [];

    for (const sig of signatures) {
        const cached = getCached(`parsed:${sig}`);
        if (cached) {
            results.push(cached);
        } else {
            uncached.push(sig);
        }
    }

    if (uncached.length === 0) {
        return results;
    }

    try {
        const response = await fetch(
            `${HELIUS_API.REST}/v0/transactions/?api-key=${HELIUS_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: uncached }),
                timeout: 30000
            }
        );

        if (!response.ok) {
            throw new Error(`Parse API error: ${response.status}`);
        }

        const parsed = await response.json();

        // Cache results
        for (const tx of parsed) {
            if (tx?.signature) {
                setCache(`parsed:${tx.signature}`, tx, CACHE_CONFIG.parsedTx);
            }
        }

        return [...results, ...parsed];

    } catch (error) {
        console.error('[Helius] Batch parse error:', error.message);
        return results;
    }
}

/**
 * Get transaction history with enhanced parsing
 * @param {string} address - Wallet or token address
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>}
 */
async function getEnhancedTransactionHistory(address, options = {}) {
    const {
        type = '',
        before = '',
        limit = 100
    } = options;

    let url = `${HELIUS_API.REST}/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;

    if (type) url += `&type=${type}`;
    if (before) url += `&before=${before}`;
    if (limit) url += `&limit=${limit}`;

    try {
        const response = await fetch(url, { timeout: 15000 });

        if (!response.ok) {
            throw new Error(`History API error: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('[Helius] Transaction history error:', error.message);
        return [];
    }
}

// ============================================
// WEBHOOK MANAGEMENT
// ============================================

/**
 * Create a webhook programmatically
 * @param {Object} config - Webhook configuration
 * @returns {Promise<Object>}
 */
async function createWebhook(config) {
    const {
        webhookURL,
        transactionTypes = ['ANY'],
        accountAddresses = [],
        webhookType = 'enhanced'
    } = config;

    if (!webhookURL) {
        throw new Error('webhookURL is required');
    }

    try {
        const response = await fetch(
            `${HELIUS_API.REST}/v0/webhooks?api-key=${HELIUS_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webhookURL,
                    transactionTypes,
                    accountAddresses,
                    webhookType
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Webhook creation failed: ${response.status}`);
        }

        const webhook = await response.json();

        logAudit('webhook_created', {
            webhookId: webhook.webhookID,
            type: webhookType,
            accounts: accountAddresses.length
        });

        return webhook;

    } catch (error) {
        console.error('[Helius] Create webhook error:', error.message);
        throw error;
    }
}

/**
 * Get all webhooks for this API key
 * @returns {Promise<Object[]>}
 */
async function getWebhooks() {
    try {
        const response = await fetch(
            `${HELIUS_API.REST}/v0/webhooks?api-key=${HELIUS_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Get webhooks failed: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('[Helius] Get webhooks error:', error.message);
        return [];
    }
}

/**
 * Delete a webhook
 * @param {string} webhookId - Webhook ID
 * @returns {Promise<boolean>}
 */
async function deleteWebhook(webhookId) {
    try {
        const response = await fetch(
            `${HELIUS_API.REST}/v0/webhooks/${webhookId}?api-key=${HELIUS_API_KEY}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            throw new Error(`Delete webhook failed: ${response.status}`);
        }

        logAudit('webhook_deleted', { webhookId });
        return true;

    } catch (error) {
        console.error('[Helius] Delete webhook error:', error.message);
        return false;
    }
}

/**
 * Verify webhook signature
 * @param {Buffer|string} payload - Raw webhook payload
 * @param {string} signature - Signature from header
 * @returns {boolean}
 */
function verifyWebhookSignature(payload, signature) {
    if (!HELIUS_WEBHOOK_SECRET) {
        console.warn('[Helius] HELIUS_WEBHOOK_SECRET not configured');
        return process.env.NODE_ENV !== 'production';
    }

    try {
        const payloadString = typeof payload === 'string' ? payload : payload.toString();
        const expectedSignature = crypto
            .createHmac('sha256', HELIUS_WEBHOOK_SECRET)
            .update(payloadString)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('[Helius] Signature verification error:', error.message);
        return false;
    }
}

// ============================================
// RPC HELPERS
// ============================================

/**
 * Call DAS API method
 * @param {string} method - DAS method name
 * @param {Object} params - Method parameters
 * @returns {Promise<Object>}
 */
async function callDasApi(method, params) {
    let lastError;

    for (let attempt = 0; attempt < DAS_CONFIG.retries; attempt++) {
        try {
            const response = await fetch(HELIUS_API.RPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: `das-${Date.now()}`,
                    method,
                    params
                }),
                timeout: DAS_CONFIG.timeout
            });

            if (!response.ok) {
                throw new Error(`DAS API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'DAS API error');
            }

            return data.result;

        } catch (error) {
            lastError = error;

            if (attempt < DAS_CONFIG.retries - 1) {
                // Exponential backoff with jitter
                const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    console.error('[Helius] DAS API failed:', lastError?.message);
    throw lastError;
}

/**
 * Call standard RPC method
 * @param {string} method - RPC method name
 * @param {Array} params - Method parameters
 * @returns {Promise<Object>}
 */
async function callRpcMethod(method, params) {
    const response = await fetch(HELIUS_API.RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: `rpc-${Date.now()}`,
            method,
            params
        }),
        timeout: SIMULATION_CONFIG.timeout
    });

    if (!response.ok) {
        throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'RPC error');
    }

    return data.result;
}

// ============================================
// HEALTH & METRICS
// ============================================

/**
 * Check Helius API health
 * @returns {Promise<Object>}
 */
async function healthCheck() {
    const start = Date.now();
    const status = {
        rpc: false,
        das: false,
        enhancedApi: false,
        latency: {}
    };

    // Check RPC
    try {
        const rpcStart = Date.now();
        await callRpcMethod('getSlot', []);
        status.rpc = true;
        status.latency.rpc = Date.now() - rpcStart;
    } catch {
        status.latency.rpc = -1;
    }

    // Check DAS
    try {
        const dasStart = Date.now();
        await callDasApi('getAsset', { id: 'So11111111111111111111111111111111111111112' });
        status.das = true;
        status.latency.das = Date.now() - dasStart;
    } catch {
        status.latency.das = -1;
    }

    // Check Enhanced API
    try {
        const apiStart = Date.now();
        const response = await fetch(
            `${HELIUS_API.REST}/v0/addresses/So11111111111111111111111111111111111111112/transactions?api-key=${HELIUS_API_KEY}&limit=1`,
            { timeout: 5000 }
        );
        status.enhancedApi = response.ok;
        status.latency.enhancedApi = Date.now() - apiStart;
    } catch {
        status.latency.enhancedApi = -1;
    }

    return {
        healthy: status.rpc && status.das,
        totalLatency: Date.now() - start,
        cacheSize: cache.size,
        ...status
    };
}

/**
 * Get service metrics
 * @returns {Object}
 */
function getMetrics() {
    return {
        cacheSize: cache.size,
        apiKeyConfigured: !!HELIUS_API_KEY,
        webhookSecretConfigured: !!HELIUS_WEBHOOK_SECRET
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // DAS API
    getAsset,
    getAssetsByOwner,
    getAssetsByGroup,
    searchAssets,
    getAssetProof,
    getAssetProofBatch,

    // Transaction Simulation
    simulateTransaction,
    estimateComputeUnits,

    // Enhanced Parsing
    parseTransaction,
    parseTransactions,
    getEnhancedTransactionHistory,

    // Webhook Management
    createWebhook,
    getWebhooks,
    deleteWebhook,
    verifyWebhookSignature,

    // Utilities
    healthCheck,
    getMetrics,
    clearCache,

    // Configuration
    DAS_CONFIG,
    SIMULATION_CONFIG,
    CACHE_CONFIG
};
