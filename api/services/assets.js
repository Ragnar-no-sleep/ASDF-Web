/**
 * ASDF API - Digital Asset Service (Helius DAS)
 *
 * Asset ownership verification via Helius DAS API:
 * - NFT ownership verification
 * - Token balance checks
 * - Collection verification
 * - Compressed NFT support
 *
 * Security by Design:
 * - Response caching to prevent abuse
 * - Rate limiting per wallet
 * - Signature verification for sensitive operations
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const DAS_CONFIG = {
    // Helius DAS RPC endpoint
    rpcUrl: process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,

    // Cache settings (Fibonacci-based TTLs)
    cache: {
        nftOwnership: 5 * 60 * 1000,      // 5 minutes
        tokenBalance: 2 * 60 * 1000,       // 2 minutes
        collection: 13 * 60 * 1000,        // 13 minutes
        assetDetails: 8 * 60 * 1000        // 8 minutes
    },

    // Rate limiting
    maxRequestsPerMinute: 60,

    // Pagination
    defaultPageSize: 100,
    maxPageSize: 1000
};

// Response cache
const assetCache = new Map();

// Rate limiting per wallet
const rateLimits = new Map();

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Get cached response or null
 * @param {string} key - Cache key
 * @returns {Object|null}
 */
function getCached(key) {
    const cached = assetCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
        assetCache.delete(key);
        return null;
    }

    return cached.data;
}

/**
 * Set cache with TTL
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in ms
 */
function setCache(key, data, ttl) {
    assetCache.set(key, {
        data,
        expiresAt: Date.now() + ttl
    });
}

/**
 * Clear expired cache entries
 */
function cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of assetCache.entries()) {
        if (now > value.expiresAt) {
            assetCache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[Assets] Cleaned ${cleaned} expired cache entries`);
    }
}

// Cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check rate limit for wallet
 * @param {string} wallet - Wallet address
 * @returns {{allowed: boolean, remaining: number}}
 */
function checkRateLimit(wallet) {
    const now = Date.now();
    const windowStart = now - 60000;

    let record = rateLimits.get(wallet);

    if (!record || record.windowStart < windowStart) {
        record = { windowStart: now, count: 0 };
    }

    if (record.count >= DAS_CONFIG.maxRequestsPerMinute) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    rateLimits.set(wallet, record);

    return {
        allowed: true,
        remaining: DAS_CONFIG.maxRequestsPerMinute - record.count
    };
}

// ============================================
// DAS API CALLS
// ============================================

/**
 * Make DAS RPC call
 * @param {string} method - RPC method
 * @param {Object} params - Method params
 * @returns {Promise<Object>}
 */
async function dasRpcCall(method, params) {
    const response = await fetch(DAS_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: `asdf-${Date.now()}`,
            method,
            params
        })
    });

    if (!response.ok) {
        throw new Error(`DAS API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
        throw new Error(result.error.message || 'DAS API error');
    }

    return result.result;
}

// ============================================
// NFT OPERATIONS
// ============================================

/**
 * Get all NFTs owned by wallet
 * @param {string} wallet - Wallet address
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getWalletNFTs(wallet, options = {}) {
    const {
        page = 1,
        limit = DAS_CONFIG.defaultPageSize,
        collection = null
    } = options;

    // Check cache
    const cacheKey = `nfts:${wallet}:${page}:${limit}:${collection || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Make DAS call
    const params = {
        ownerAddress: wallet,
        page,
        limit: Math.min(limit, DAS_CONFIG.maxPageSize),
        displayOptions: {
            showCollectionMetadata: true,
            showUnverifiedCollections: false
        }
    };

    const result = await dasRpcCall('getAssetsByOwner', params);

    // Filter by collection if specified
    let items = result.items || [];
    if (collection) {
        items = items.filter(nft =>
            nft.grouping?.some(g =>
                g.group_key === 'collection' && g.group_value === collection
            )
        );
    }

    const response = {
        items,
        total: result.total || items.length,
        page,
        limit,
        hasMore: items.length === limit
    };

    // Cache response
    setCache(cacheKey, response, DAS_CONFIG.cache.nftOwnership);

    return response;
}

/**
 * Verify NFT ownership
 * @param {string} wallet - Wallet address
 * @param {string} mintAddress - NFT mint address
 * @returns {Promise<{owned: boolean, asset?: Object}>}
 */
async function verifyNFTOwnership(wallet, mintAddress) {
    const cacheKey = `ownership:${wallet}:${mintAddress}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        // Get asset details
        const asset = await dasRpcCall('getAsset', { id: mintAddress });

        // Check ownership
        const owned = asset.ownership?.owner === wallet;

        const result = {
            owned,
            asset: owned ? {
                mint: mintAddress,
                name: asset.content?.metadata?.name,
                image: asset.content?.links?.image,
                collection: asset.grouping?.find(g => g.group_key === 'collection')?.group_value,
                attributes: asset.content?.metadata?.attributes
            } : null
        };

        setCache(cacheKey, result, DAS_CONFIG.cache.nftOwnership);

        return result;
    } catch (error) {
        logAudit('nft_verification_error', {
            wallet: wallet.slice(0, 8) + '...',
            mint: mintAddress.slice(0, 8) + '...',
            error: error.message
        });
        return { owned: false, error: error.message };
    }
}

/**
 * Verify ownership of any NFT from collection
 * @param {string} wallet - Wallet address
 * @param {string} collectionAddress - Collection mint address
 * @returns {Promise<{owned: boolean, count: number, items?: Array}>}
 */
async function verifyCollectionOwnership(wallet, collectionAddress) {
    const cacheKey = `collection:${wallet}:${collectionAddress}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        // Get wallet's NFTs from this collection
        const params = {
            ownerAddress: wallet,
            grouping: ['collection', collectionAddress],
            page: 1,
            limit: 100
        };

        const result = await dasRpcCall('getAssetsByOwner', params);

        // Filter for exact collection match
        const collectionItems = (result.items || []).filter(nft =>
            nft.grouping?.some(g =>
                g.group_key === 'collection' && g.group_value === collectionAddress
            )
        );

        const response = {
            owned: collectionItems.length > 0,
            count: collectionItems.length,
            items: collectionItems.slice(0, 10).map(nft => ({
                mint: nft.id,
                name: nft.content?.metadata?.name,
                image: nft.content?.links?.image
            }))
        };

        setCache(cacheKey, response, DAS_CONFIG.cache.collection);

        return response;
    } catch (error) {
        logAudit('collection_verification_error', {
            wallet: wallet.slice(0, 8) + '...',
            collection: collectionAddress.slice(0, 8) + '...',
            error: error.message
        });
        return { owned: false, count: 0, error: error.message };
    }
}

// ============================================
// TOKEN OPERATIONS
// ============================================

/**
 * Get fungible token balances for wallet
 * @param {string} wallet - Wallet address
 * @returns {Promise<Object>}
 */
async function getTokenBalances(wallet) {
    const cacheKey = `tokens:${wallet}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const result = await dasRpcCall('getAssetsByOwner', {
            ownerAddress: wallet,
            page: 1,
            limit: 1000,
            displayOptions: {
                showFungible: true,
                showNativeBalance: true
            }
        });

        // Filter for fungible tokens only
        const tokens = (result.items || [])
            .filter(asset => asset.interface === 'FungibleToken' || asset.interface === 'FungibleAsset')
            .map(token => ({
                mint: token.id,
                symbol: token.content?.metadata?.symbol || 'Unknown',
                name: token.content?.metadata?.name || 'Unknown Token',
                balance: token.token_info?.balance || 0,
                decimals: token.token_info?.decimals || 0,
                uiBalance: (token.token_info?.balance || 0) / Math.pow(10, token.token_info?.decimals || 0)
            }));

        const response = {
            tokens,
            nativeBalance: result.nativeBalance?.lamports || 0,
            nativeBalanceSol: (result.nativeBalance?.lamports || 0) / 1e9
        };

        setCache(cacheKey, response, DAS_CONFIG.cache.tokenBalance);

        return response;
    } catch (error) {
        logAudit('token_balance_error', {
            wallet: wallet.slice(0, 8) + '...',
            error: error.message
        });
        return { tokens: [], error: error.message };
    }
}

/**
 * Get specific token balance
 * @param {string} wallet - Wallet address
 * @param {string} mintAddress - Token mint address
 * @returns {Promise<Object>}
 */
async function getTokenBalance(wallet, mintAddress) {
    const balances = await getTokenBalances(wallet);

    const token = balances.tokens?.find(t => t.mint === mintAddress);

    return {
        mint: mintAddress,
        balance: token?.balance || 0,
        uiBalance: token?.uiBalance || 0,
        hasBalance: (token?.balance || 0) > 0
    };
}

// ============================================
// ASSET DETAILS
// ============================================

/**
 * Get detailed asset information
 * @param {string} mintAddress - Asset mint address
 * @returns {Promise<Object>}
 */
async function getAssetDetails(mintAddress) {
    const cacheKey = `asset:${mintAddress}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const asset = await dasRpcCall('getAsset', { id: mintAddress });

        const details = {
            mint: mintAddress,
            interface: asset.interface,
            owner: asset.ownership?.owner,
            frozen: asset.ownership?.frozen || false,
            supply: asset.supply,
            mutable: asset.mutable,
            burnt: asset.burnt || false,

            // Metadata
            name: asset.content?.metadata?.name,
            symbol: asset.content?.metadata?.symbol,
            description: asset.content?.metadata?.description,
            image: asset.content?.links?.image,
            externalUrl: asset.content?.links?.external_url,
            attributes: asset.content?.metadata?.attributes,

            // Collection
            collection: asset.grouping?.find(g => g.group_key === 'collection')?.group_value,

            // Royalties
            royalty: asset.royalty ? {
                percent: asset.royalty.percent,
                primarySaleHappened: asset.royalty.primary_sale_happened
            } : null,

            // Creators
            creators: asset.creators?.map(c => ({
                address: c.address,
                share: c.share,
                verified: c.verified
            }))
        };

        setCache(cacheKey, details, DAS_CONFIG.cache.assetDetails);

        return details;
    } catch (error) {
        logAudit('asset_details_error', {
            mint: mintAddress.slice(0, 8) + '...',
            error: error.message
        });
        return { error: error.message };
    }
}

// ============================================
// COMPRESSED NFT SUPPORT
// ============================================

/**
 * Get compressed NFT proof for transfer
 * @param {string} mintAddress - cNFT mint address
 * @returns {Promise<Object>}
 */
async function getAssetProof(mintAddress) {
    try {
        const proof = await dasRpcCall('getAssetProof', { id: mintAddress });

        return {
            root: proof.root,
            proof: proof.proof,
            nodeIndex: proof.node_index,
            leaf: proof.leaf,
            treeId: proof.tree_id
        };
    } catch (error) {
        logAudit('asset_proof_error', {
            mint: mintAddress.slice(0, 8) + '...',
            error: error.message
        });
        return { error: error.message };
    }
}

// ============================================
// METRICS
// ============================================

/**
 * Get asset service metrics
 * @returns {Object}
 */
function getAssetMetrics() {
    return {
        cacheSize: assetCache.size,
        activeRateLimits: rateLimits.size,
        config: {
            maxRequestsPerMinute: DAS_CONFIG.maxRequestsPerMinute,
            cacheTTLs: DAS_CONFIG.cache
        }
    };
}

module.exports = {
    // NFT operations
    getWalletNFTs,
    verifyNFTOwnership,
    verifyCollectionOwnership,

    // Token operations
    getTokenBalances,
    getTokenBalance,

    // Asset details
    getAssetDetails,
    getAssetProof,

    // Rate limiting
    checkRateLimit,

    // Metrics
    getAssetMetrics,

    // Config
    DAS_CONFIG
};
