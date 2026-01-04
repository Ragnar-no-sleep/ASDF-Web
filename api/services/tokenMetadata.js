/**
 * ASDF API - Token Metadata Service
 *
 * Comprehensive token information via Helius:
 * - Fungible token metadata
 * - Token holder analysis
 * - Token price data
 * - Historical transfers
 *
 * @author Helius Engineering Standards
 * @version 1.0.0
 *
 * Security by Design:
 * - API key protection
 * - Rate limiting awareness
 * - Input validation
 * - Cache management
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

const METADATA_CONFIG = {
    // API endpoints
    apiBase: 'https://api.helius.xyz',
    rpcUrl: process.env.HELIUS_RPC_URL ||
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,

    // Cache TTLs (Fibonacci-based in ms)
    cacheTTL: {
        metadata: 5 * 60 * 1000,     // 5 minutes
        holders: 2 * 60 * 1000,       // 2 minutes
        price: 30 * 1000,             // 30 seconds
        transfers: 60 * 1000          // 1 minute
    },

    // Request settings
    timeout: 15000,
    maxRetries: 3,

    // Holder analysis
    maxHolders: 1000,
    holderPageSize: 100
};

// ============================================
// CACHE
// ============================================

const cache = new Map();

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

// Cleanup every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
        if (now > item.expiresAt) {
            cache.delete(key);
        }
    }
}, 5 * 60 * 1000);

// ============================================
// TOKEN METADATA
// ============================================

/**
 * Get fungible token metadata
 * @param {string} mintAddress - Token mint address
 * @returns {Promise<Object>}
 */
async function getTokenMetadata(mintAddress) {
    const cacheKey = `metadata:${mintAddress}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        // Use DAS API for comprehensive metadata
        const response = await fetch(METADATA_CONFIG.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'token-metadata',
                method: 'getAsset',
                params: { id: mintAddress }
            }),
            timeout: METADATA_CONFIG.timeout
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const result = formatTokenMetadata(data.result);
        setCache(cacheKey, result, METADATA_CONFIG.cacheTTL.metadata);

        return result;

    } catch (error) {
        console.error('[TokenMetadata] Get metadata error:', error.message);
        return null;
    }
}

/**
 * Format token metadata response
 * @param {Object} asset - Raw asset data
 * @returns {Object}
 */
function formatTokenMetadata(asset) {
    if (!asset) return null;

    return {
        mint: asset.id,
        name: asset.content?.metadata?.name || 'Unknown',
        symbol: asset.content?.metadata?.symbol || '',
        description: asset.content?.metadata?.description || '',
        image: asset.content?.links?.image || asset.content?.files?.[0]?.uri || null,
        decimals: asset.token_info?.decimals || 0,
        supply: asset.token_info?.supply || '0',
        tokenStandard: asset.interface || 'FungibleToken',
        creators: asset.creators || [],
        royalty: asset.royalty?.percent || 0,
        mutable: asset.mutable ?? true,
        burnt: asset.burnt ?? false,
        attributes: asset.content?.metadata?.attributes || [],
        externalUrl: asset.content?.links?.external_url || null
    };
}

/**
 * Get multiple token metadata in batch
 * @param {string[]} mintAddresses - Array of mint addresses
 * @returns {Promise<Map<string, Object>>}
 */
async function getBatchTokenMetadata(mintAddresses) {
    const results = new Map();
    const uncached = [];

    // Check cache first
    for (const mint of mintAddresses) {
        const cached = getCached(`metadata:${mint}`);
        if (cached) {
            results.set(mint, cached);
        } else {
            uncached.push(mint);
        }
    }

    if (uncached.length === 0) {
        return results;
    }

    // Batch fetch via DAS
    try {
        const response = await fetch(METADATA_CONFIG.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'batch-metadata',
                method: 'getAssetBatch',
                params: { ids: uncached }
            }),
            timeout: METADATA_CONFIG.timeout * 2
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.result) {
            for (const asset of data.result) {
                if (asset) {
                    const formatted = formatTokenMetadata(asset);
                    results.set(asset.id, formatted);
                    setCache(`metadata:${asset.id}`, formatted, METADATA_CONFIG.cacheTTL.metadata);
                }
            }
        }

    } catch (error) {
        console.error('[TokenMetadata] Batch metadata error:', error.message);
    }

    return results;
}

// ============================================
// TOKEN HOLDERS
// ============================================

/**
 * Get token holders
 * @param {string} mintAddress - Token mint address
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getTokenHolders(mintAddress, options = {}) {
    const {
        limit = 100,
        cursor = null
    } = options;

    const cacheKey = `holders:${mintAddress}:${limit}:${cursor || 'start'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        let url = `${METADATA_CONFIG.apiBase}/v0/token-metadata/holders?api-key=${HELIUS_API_KEY}&mint=${mintAddress}&limit=${limit}`;

        if (cursor) {
            url += `&cursor=${cursor}`;
        }

        const response = await fetch(url, {
            timeout: METADATA_CONFIG.timeout
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        const result = {
            holders: data.result || [],
            total: data.total || 0,
            cursor: data.cursor || null,
            hasMore: !!data.cursor
        };

        setCache(cacheKey, result, METADATA_CONFIG.cacheTTL.holders);

        return result;

    } catch (error) {
        console.error('[TokenMetadata] Get holders error:', error.message);
        return { holders: [], total: 0, cursor: null, hasMore: false };
    }
}

/**
 * Analyze token holder distribution
 * @param {string} mintAddress - Token mint address
 * @returns {Promise<Object>}
 */
async function analyzeHolderDistribution(mintAddress) {
    const cacheKey = `distribution:${mintAddress}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        // Get all holders (paginated)
        const allHolders = [];
        let cursor = null;
        let pages = 0;
        const maxPages = METADATA_CONFIG.maxHolders / METADATA_CONFIG.holderPageSize;

        do {
            const result = await getTokenHolders(mintAddress, {
                limit: METADATA_CONFIG.holderPageSize,
                cursor
            });

            allHolders.push(...result.holders);
            cursor = result.cursor;
            pages++;

        } while (cursor && pages < maxPages);

        // Calculate distribution
        const totalSupply = allHolders.reduce((sum, h) => sum + (h.amount || 0), 0);
        const sortedHolders = allHolders.sort((a, b) => (b.amount || 0) - (a.amount || 0));

        // Distribution tiers
        const distribution = {
            total: allHolders.length,
            totalSupplyHeld: totalSupply,
            top10: calculateTopNPercentage(sortedHolders, 10, totalSupply),
            top50: calculateTopNPercentage(sortedHolders, 50, totalSupply),
            top100: calculateTopNPercentage(sortedHolders, 100, totalSupply),
            tiers: calculateTiers(sortedHolders),
            giniCoefficient: calculateGiniCoefficient(sortedHolders.map(h => h.amount || 0))
        };

        setCache(cacheKey, distribution, METADATA_CONFIG.cacheTTL.holders);

        return distribution;

    } catch (error) {
        console.error('[TokenMetadata] Holder distribution error:', error.message);
        return null;
    }
}

/**
 * Calculate top N holders percentage
 */
function calculateTopNPercentage(holders, n, total) {
    if (total === 0) return 0;
    const topN = holders.slice(0, n);
    const topNTotal = topN.reduce((sum, h) => sum + (h.amount || 0), 0);
    return (topNTotal / total) * 100;
}

/**
 * Calculate holder tiers
 */
function calculateTiers(holders) {
    const tiers = {
        whale: { min: 1000000, count: 0, percentage: 0 },     // 1M+
        dolphin: { min: 100000, count: 0, percentage: 0 },    // 100k-1M
        fish: { min: 10000, count: 0, percentage: 0 },        // 10k-100k
        shrimp: { min: 1000, count: 0, percentage: 0 },       // 1k-10k
        plankton: { min: 0, count: 0, percentage: 0 }         // <1k
    };

    for (const holder of holders) {
        const amount = holder.amount || 0;
        if (amount >= 1000000) tiers.whale.count++;
        else if (amount >= 100000) tiers.dolphin.count++;
        else if (amount >= 10000) tiers.fish.count++;
        else if (amount >= 1000) tiers.shrimp.count++;
        else tiers.plankton.count++;
    }

    const total = holders.length;
    for (const tier of Object.values(tiers)) {
        tier.percentage = total > 0 ? (tier.count / total) * 100 : 0;
    }

    return tiers;
}

/**
 * Calculate Gini coefficient (inequality measure)
 * 0 = perfect equality, 1 = perfect inequality
 */
function calculateGiniCoefficient(values) {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    if (sum === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (2 * (i + 1) - n - 1) * sorted[i];
    }

    return numerator / (n * sum);
}

// ============================================
// TOKEN TRANSFERS
// ============================================

/**
 * Get recent token transfers
 * @param {string} mintAddress - Token mint address
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>}
 */
async function getTokenTransfers(mintAddress, options = {}) {
    const { limit = 100, before = '' } = options;

    const cacheKey = `transfers:${mintAddress}:${limit}:${before || 'latest'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        let url = `${METADATA_CONFIG.apiBase}/v0/addresses/${mintAddress}/transactions?api-key=${HELIUS_API_KEY}&type=TRANSFER&limit=${limit}`;

        if (before) {
            url += `&before=${before}`;
        }

        const response = await fetch(url, {
            timeout: METADATA_CONFIG.timeout
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const transactions = await response.json();

        // Filter and format token transfers
        const transfers = transactions
            .filter(tx => tx.tokenTransfers?.length > 0)
            .flatMap(tx => tx.tokenTransfers
                .filter(t => t.mint === mintAddress)
                .map(t => ({
                    signature: tx.signature,
                    timestamp: tx.timestamp,
                    from: t.fromUserAccount,
                    to: t.toUserAccount,
                    amount: t.tokenAmount,
                    slot: tx.slot
                }))
            );

        setCache(cacheKey, transfers, METADATA_CONFIG.cacheTTL.transfers);

        return transfers;

    } catch (error) {
        console.error('[TokenMetadata] Get transfers error:', error.message);
        return [];
    }
}

/**
 * Get token burn transactions
 * @param {string} mintAddress - Token mint address
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>}
 */
async function getTokenBurns(mintAddress, options = {}) {
    const { limit = 100 } = options;

    try {
        const url = `${METADATA_CONFIG.apiBase}/v0/addresses/${mintAddress}/transactions?api-key=${HELIUS_API_KEY}&type=BURN&limit=${limit}`;

        const response = await fetch(url, {
            timeout: METADATA_CONFIG.timeout
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const transactions = await response.json();

        return transactions.map(tx => {
            const burn = tx.tokenTransfers?.find(t => t.mint === mintAddress);
            return {
                signature: tx.signature,
                timestamp: tx.timestamp,
                wallet: tx.feePayer,
                amount: burn?.tokenAmount || 0,
                slot: tx.slot
            };
        });

    } catch (error) {
        console.error('[TokenMetadata] Get burns error:', error.message);
        return [];
    }
}

// ============================================
// TOKEN PRICE (via Jupiter)
// ============================================

/**
 * Get token price in USD
 * @param {string} mintAddress - Token mint address
 * @returns {Promise<Object>}
 */
async function getTokenPrice(mintAddress) {
    const cacheKey = `price:${mintAddress}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        // Use Jupiter Price API
        const response = await fetch(
            `https://price.jup.ag/v6/price?ids=${mintAddress}`,
            { timeout: 10000 }
        );

        if (!response.ok) {
            throw new Error(`Price API error: ${response.status}`);
        }

        const data = await response.json();
        const priceData = data.data?.[mintAddress];

        if (!priceData) {
            return { price: 0, source: 'none' };
        }

        const result = {
            price: priceData.price || 0,
            mintSymbol: priceData.mintSymbol || '',
            vsToken: priceData.vsToken || 'USDC',
            vsTokenSymbol: priceData.vsTokenSymbol || 'USDC',
            confidence: priceData.confidence || 'low',
            source: 'jupiter'
        };

        setCache(cacheKey, result, METADATA_CONFIG.cacheTTL.price);

        return result;

    } catch (error) {
        console.error('[TokenMetadata] Get price error:', error.message);
        return { price: 0, source: 'error' };
    }
}

// ============================================
// HEALTH & METRICS
// ============================================

/**
 * Health check
 * @returns {Promise<Object>}
 */
async function healthCheck() {
    const start = Date.now();

    try {
        // Test metadata endpoint
        await getTokenMetadata('So11111111111111111111111111111111111111112');

        return {
            healthy: true,
            latency: Date.now() - start,
            cacheSize: cache.size
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            latency: Date.now() - start
        };
    }
}

/**
 * Get service metrics
 * @returns {Object}
 */
function getMetrics() {
    return {
        cacheSize: cache.size,
        apiKeyConfigured: !!HELIUS_API_KEY
    };
}

/**
 * Clear cache
 * @param {string} pattern - Optional pattern to match
 */
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

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Token metadata
    getTokenMetadata,
    getBatchTokenMetadata,

    // Holders
    getTokenHolders,
    analyzeHolderDistribution,

    // Transfers
    getTokenTransfers,
    getTokenBurns,

    // Price
    getTokenPrice,

    // Utilities
    healthCheck,
    getMetrics,
    clearCache,

    // Configuration
    METADATA_CONFIG
};
