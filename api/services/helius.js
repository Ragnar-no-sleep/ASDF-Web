/**
 * ASDF API - Helius RPC Service
 *
 * Production-grade Solana integration via Helius
 * - Retry logic with exponential backoff
 * - Response caching for efficiency
 * - Priority fees for congestion
 * - Secure transaction verification
 *
 * @author Helius Engineering Standards
 */

'use strict';

const { Connection, PublicKey, Transaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createBurnInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// SECURITY NOTE: Helius API requires the API key in URL query parameters.
// This is unavoidable for their RPC and REST APIs. To mitigate exposure:
// 1. Never log full URLs containing the API key
// 2. Ensure error messages don't include URLs
// 3. Use the helper functions below that redact keys in logs

/**
 * Build Helius RPC URL (key in query param - required by Helius)
 * @returns {string}
 */
function getHeliusRpcUrl() {
    return process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
}

/**
 * Build Helius REST API URL with key
 * @param {string} path - API path (e.g., /v0/addresses/...)
 * @param {Object} params - Additional query parameters
 * @returns {string}
 */
function buildHeliusApiUrl(path, params = {}) {
    const url = new URL(`https://api.helius.xyz${path}`);
    url.searchParams.set('api-key', HELIUS_API_KEY);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url.toString();
}

/**
 * Redact API key from URL for safe logging
 * @param {string} url - URL that may contain API key
 * @returns {string}
 */
function redactApiKey(url) {
    return url.replace(/api-key=[^&]+/, 'api-key=REDACTED');
}

const HELIUS_RPC_URL = getHeliusRpcUrl();
const ASDF_TOKEN_MINT = process.env.ASDF_TOKEN_MINT || '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump';
const TOKEN_DECIMALS = 6;
const INITIAL_SUPPLY = 1_000_000_000;
const MIN_HOLDER_BALANCE = 1_000_000;

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
};

// Cache configuration (Fibonacci-based TTLs in seconds × 1000)
const CACHE_TTL = {
    tokenSupply: 60 * 1000,      // 1 minute
    tokenBalance: 30 * 1000,     // 30 seconds
    recentBurns: 2 * 60 * 1000,  // 2 minutes
    priorityFee: 10 * 1000,      // 10 seconds (network conditions change fast)
    burnHistory: 5 * 60 * 1000   // 5 minutes
};

// Priority fee configuration
const PRIORITY_FEE_CONFIG = {
    default: 50000,      // Default: 50k microLamports (~0.00005 SOL)
    min: 10000,          // Minimum: 10k microLamports
    max: 500000,         // Maximum: 500k microLamports (~0.0005 SOL)
    percentile: 'medium' // Helius priority level: low, medium, high, veryHigh
};

// Transaction confirmation config
const CONFIRMATION_CONFIG = {
    maxRetries: 30,          // Max confirmation checks
    retryDelayMs: 2000,      // 2 seconds between checks
    commitment: 'confirmed'  // confirmed or finalized
};

// ============================================
// CACHE IMPLEMENTATION
// ============================================

class SimpleCache {
    constructor() {
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value, ttlMs) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    // Cleanup expired entries periodically
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

const cache = new SimpleCache();

// Cleanup cache every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

// ============================================
// RETRY LOGIC
// ============================================

/**
 * Execute async function with retry logic
 * Uses exponential backoff with jitter
 * @param {Function} fn - Async function to execute
 * @param {string} operation - Operation name for logging
 * @returns {Promise<any>}
 */
async function withRetry(fn, operation = 'RPC call') {
    let lastError;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            lastError = error;

            // Don't retry on certain errors
            const noRetryErrors = [
                'Invalid public key',
                'not configured',
                'insufficient funds',
                'already used'
            ];

            if (noRetryErrors.some(msg => error.message?.includes(msg))) {
                throw error;
            }

            // Report RPC connection failures for failover
            const rpcErrors = ['fetch failed', 'ECONNREFUSED', 'ETIMEDOUT', '503', '502', '429'];
            if (rpcErrors.some(msg => error.message?.includes(msg))) {
                reportConnectionFailure();
            }

            // Calculate delay with exponential backoff + jitter
            const baseDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
            const jitter = Math.random() * 1000;
            const delay = Math.min(baseDelay + jitter, RETRY_CONFIG.maxDelayMs);

            console.warn(`[Helius] ${operation} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}): ${error.message}`);

            if (attempt < RETRY_CONFIG.maxRetries - 1) {
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    console.error(`[Helius] ${operation} failed after ${RETRY_CONFIG.maxRetries} attempts`);
    throw lastError;
}

// ============================================
// CONNECTION MANAGEMENT WITH FAILOVER
// ============================================

// Connection pool for resilience
const connectionPool = {
    primary: null,
    backup: null,
    currentIndex: 0,
    failureCount: 0,
    lastFailure: 0
};

// Failover configuration
const FAILOVER_CONFIG = {
    maxFailures: 3,           // Failures before switching
    cooldownMs: 30 * 1000,    // 30 seconds before retrying primary
    backupRpcUrl: process.env.BACKUP_RPC_URL || null
};

/**
 * Get Helius connection with automatic failover
 * @returns {Connection}
 */
function getConnection() {
    if (!HELIUS_API_KEY) {
        throw new Error('HELIUS_API_KEY not configured');
    }

    // Initialize connections if needed
    if (!connectionPool.primary) {
        connectionPool.primary = new Connection(HELIUS_RPC_URL, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
        });
    }

    if (!connectionPool.backup && FAILOVER_CONFIG.backupRpcUrl) {
        connectionPool.backup = new Connection(FAILOVER_CONFIG.backupRpcUrl, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
        });
    }

    // Check if we should try primary again after cooldown
    const now = Date.now();
    if (connectionPool.currentIndex === 1 && connectionPool.backup) {
        if (now - connectionPool.lastFailure > FAILOVER_CONFIG.cooldownMs) {
            console.log('[Helius] Attempting to return to primary RPC');
            connectionPool.currentIndex = 0;
            connectionPool.failureCount = 0;
        }
    }

    return connectionPool.currentIndex === 0 || !connectionPool.backup
        ? connectionPool.primary
        : connectionPool.backup;
}

/**
 * Report connection failure for failover logic
 */
function reportConnectionFailure() {
    connectionPool.failureCount++;
    connectionPool.lastFailure = Date.now();

    if (connectionPool.failureCount >= FAILOVER_CONFIG.maxFailures && connectionPool.backup) {
        if (connectionPool.currentIndex === 0) {
            console.warn('[Helius] Primary RPC failed, switching to backup');
            connectionPool.currentIndex = 1;
            connectionPool.failureCount = 0;
        }
    }
}

/**
 * Reset connection pool (useful for testing or manual recovery)
 */
function resetConnectionPool() {
    connectionPool.primary = null;
    connectionPool.backup = null;
    connectionPool.currentIndex = 0;
    connectionPool.failureCount = 0;
    connectionPool.lastFailure = 0;
    console.log('[Helius] Connection pool reset');
}

// ============================================
// PRIORITY FEE ESTIMATION (Helius Feature)
// ============================================

/**
 * Get dynamic priority fee based on network conditions
 * Uses Helius Priority Fee API for accurate estimates
 * @param {string[]} accountKeys - Account keys involved in transaction
 * @returns {Promise<number>} Priority fee in microLamports
 */
async function getPriorityFeeEstimate(accountKeys = []) {
    const cacheKey = 'priorityFee';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(getHeliusRpcUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'priority-fee',
                method: 'getPriorityFeeEstimate',
                params: [{
                    accountKeys: accountKeys.length > 0 ? accountKeys : [ASDF_TOKEN_MINT],
                    options: {
                        priorityLevel: PRIORITY_FEE_CONFIG.percentile
                    }
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Priority fee API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.warn('[Helius] Priority fee API error:', data.error.message);
            return PRIORITY_FEE_CONFIG.default;
        }

        // Clamp fee to configured bounds
        const fee = Math.max(
            PRIORITY_FEE_CONFIG.min,
            Math.min(data.result?.priorityFeeEstimate || PRIORITY_FEE_CONFIG.default, PRIORITY_FEE_CONFIG.max)
        );

        cache.set(cacheKey, fee, CACHE_TTL.priorityFee);
        console.log(`[Helius] Priority fee estimate: ${fee} microLamports`);

        return fee;
    } catch (error) {
        console.warn('[Helius] Failed to get priority fee, using default:', error.message);
        return PRIORITY_FEE_CONFIG.default;
    }
}

// ============================================
// TRANSACTION CONFIRMATION TRACKING
// ============================================

/**
 * Wait for transaction confirmation with polling
 * @param {string} signature - Transaction signature
 * @param {string} commitment - Commitment level (confirmed/finalized)
 * @returns {Promise<{confirmed: boolean, slot?: number, error?: string}>}
 */
async function waitForConfirmation(signature, commitment = CONFIRMATION_CONFIG.commitment) {
    const conn = getConnection();

    for (let attempt = 0; attempt < CONFIRMATION_CONFIG.maxRetries; attempt++) {
        try {
            const status = await conn.getSignatureStatus(signature);

            if (status?.value) {
                if (status.value.err) {
                    return {
                        confirmed: false,
                        error: 'Transaction failed on-chain',
                        slot: status.value.slot
                    };
                }

                const isConfirmed = commitment === 'confirmed'
                    ? status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized'
                    : status.value.confirmationStatus === 'finalized';

                if (isConfirmed) {
                    return {
                        confirmed: true,
                        slot: status.value.slot,
                        confirmationStatus: status.value.confirmationStatus
                    };
                }
            }

            // Wait before next check
            await new Promise(r => setTimeout(r, CONFIRMATION_CONFIG.retryDelayMs));

        } catch (error) {
            console.warn(`[Helius] Confirmation check failed (attempt ${attempt + 1}):`, error.message);
        }
    }

    return {
        confirmed: false,
        error: 'Confirmation timeout'
    };
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Get token balances for multiple wallets efficiently
 * @param {string[]} walletAddresses - Array of wallet addresses
 * @returns {Promise<Map<string, {balance: number, isHolder: boolean}>>}
 */
async function getBatchTokenBalances(walletAddresses) {
    const results = new Map();
    const uncached = [];

    // Check cache first
    for (const wallet of walletAddresses) {
        const cacheKey = `balance:${wallet}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            results.set(wallet, cached);
        } else {
            uncached.push(wallet);
        }
    }

    // Fetch uncached in parallel (with concurrency limit)
    const BATCH_SIZE = 5; // Fibonacci number
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        const batch = uncached.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
            batch.map(wallet => getTokenBalance(wallet))
        );

        batchResults.forEach((result, index) => {
            const wallet = batch[index];
            if (result.status === 'fulfilled') {
                results.set(wallet, result.value);
            } else {
                results.set(wallet, { balance: 0, rawBalance: '0', isHolder: false, error: result.reason.message });
            }
        });
    }

    return results;
}

/**
 * Get token balance for a wallet
 * Uses caching and retry logic for reliability
 * @param {string} walletAddress - Solana wallet address
 * @returns {Promise<{balance: number, isHolder: boolean}>}
 */
async function getTokenBalance(walletAddress) {
    // Check cache first
    const cacheKey = `balance:${walletAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    return withRetry(async () => {
        const conn = getConnection();
        const wallet = new PublicKey(walletAddress);
        const mint = new PublicKey(ASDF_TOKEN_MINT);

        try {
            // Get associated token account
            const tokenAccount = await getAssociatedTokenAddress(mint, wallet);

            // Check if account exists and get balance
            const accountInfo = await conn.getTokenAccountBalance(tokenAccount);

            const balance = accountInfo.value.uiAmount || 0;

            const result = {
                balance: balance,
                rawBalance: accountInfo.value.amount,
                isHolder: balance >= MIN_HOLDER_BALANCE
            };

            // Cache the result
            cache.set(cacheKey, result, CACHE_TTL.tokenBalance);
            return result;

        } catch (error) {
            // Account doesn't exist = 0 balance (don't retry this)
            if (error.message?.includes('could not find account')) {
                const result = { balance: 0, rawBalance: '0', isHolder: false };
                cache.set(cacheKey, result, CACHE_TTL.tokenBalance);
                return result;
            }
            throw error;
        }
    }, 'getTokenBalance');
}

/**
 * Get current token supply
 * Uses caching and retry logic for reliability
 * @returns {Promise<{current: number, burned: number}>}
 */
async function getTokenSupply() {
    // Check cache first
    const cacheKey = 'tokenSupply';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    return withRetry(async () => {
        const conn = getConnection();
        const mint = new PublicKey(ASDF_TOKEN_MINT);

        const supplyInfo = await conn.getTokenSupply(mint);
        const currentSupply = Number(supplyInfo.value.amount);
        const initialSupply = INITIAL_SUPPLY * Math.pow(10, TOKEN_DECIMALS);
        const burned = initialSupply - currentSupply;

        const result = {
            current: currentSupply / Math.pow(10, TOKEN_DECIMALS),
            currentRaw: supplyInfo.value.amount,
            burned: burned / Math.pow(10, TOKEN_DECIMALS),
            burnedRaw: burned.toString()
        };

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.tokenSupply);
        return result;
    }, 'getTokenSupply');
}

/**
 * Build a burn transaction for the user to sign
 * Uses dynamic priority fee based on network conditions
 * @param {string} walletAddress - User's wallet
 * @param {number} amount - Amount to burn (UI amount, not raw)
 * @returns {Promise<{transaction: string, blockhash: string, priorityFee: number}>}
 */
async function buildBurnTransaction(walletAddress, amount) {
    return withRetry(async () => {
        const conn = getConnection();

        const wallet = new PublicKey(walletAddress);
        const mint = new PublicKey(ASDF_TOKEN_MINT);

        // Get user's token account
        const tokenAccount = await getAssociatedTokenAddress(mint, wallet);

        // Convert to raw amount
        const rawAmount = BigInt(Math.floor(amount * Math.pow(10, TOKEN_DECIMALS)));

        // Get dynamic priority fee based on current network conditions
        const priorityFee = await getPriorityFeeEstimate([
            mint.toBase58(),
            tokenAccount.toBase58()
        ]);

        // Create priority fee instruction
        const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee
        });

        // Set compute unit limit (burn is ~5000 CU, but set higher for safety)
        const computeLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
            units: 50000
        });

        // Create burn instruction
        const burnInstruction = createBurnInstruction(
            tokenAccount,  // Token account to burn from
            mint,          // Token mint
            wallet,        // Owner of token account
            rawAmount      // Amount to burn
        );

        // Build transaction
        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');

        const transaction = new Transaction({
            feePayer: wallet,
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight
        });

        // Order: compute limit, priority fee, then burn
        transaction.add(computeLimitInstruction);
        transaction.add(priorityFeeInstruction);
        transaction.add(burnInstruction);

        // Serialize for client signing
        const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false
        });

        return {
            transaction: serialized.toString('base64'),
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight,
            priorityFee: PRIORITY_FEE
        };
    }, 'buildBurnTransaction');
}

/**
 * Verify a burn transaction
 * Critical security function - verifies on-chain burn before granting items
 * @param {string} signature - Transaction signature
 * @param {string} expectedWallet - Expected sender wallet
 * @param {number} expectedAmount - Expected burn amount
 * @returns {Promise<{valid: boolean, actualAmount?: number, error?: string}>}
 */
async function verifyBurnTransaction(signature, expectedWallet, expectedAmount) {
    // Don't cache verification - must always check on-chain
    return withRetry(async () => {
        const conn = getConnection();

        // Get transaction details with confirmed commitment
        const tx = await conn.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            // Transaction might not be indexed yet - this should trigger retry
            throw new Error('Transaction not found - may still be processing');
        }

        if (tx.meta?.err) {
            return { valid: false, error: 'Transaction failed on-chain' };
        }

        // Find burn instruction
        const instructions = tx.transaction.message.instructions;
        const burnIx = instructions.find(ix => {
            if (ix.program !== 'spl-token') return false;
            if (ix.parsed?.type !== 'burn') return false;
            return true;
        });

        if (!burnIx) {
            return { valid: false, error: 'No burn instruction found' };
        }

        const info = burnIx.parsed.info;

        // Security: Verify mint is exactly our token
        if (info.mint !== ASDF_TOKEN_MINT) {
            console.warn(`[Security] Wrong mint attempted: ${info.mint}`);
            return { valid: false, error: 'Wrong token mint' };
        }

        // Security: Verify authority matches expected wallet
        if (info.authority !== expectedWallet) {
            console.warn(`[Security] Wrong authority: expected ${expectedWallet}, got ${info.authority}`);
            return { valid: false, error: 'Wrong wallet' };
        }

        // Verify amount with tolerance for floating point
        const actualAmount = Number(info.amount) / Math.pow(10, TOKEN_DECIMALS);
        const tolerance = 0.000001;

        if (Math.abs(actualAmount - expectedAmount) > tolerance) {
            return {
                valid: false,
                error: 'Amount mismatch',
                actualAmount: actualAmount,
                expectedAmount: expectedAmount
            };
        }

        // Invalidate balance cache for this wallet (they just burned)
        cache.delete(`balance:${expectedWallet}`);

        return {
            valid: true,
            actualAmount: actualAmount,
            signature: signature,
            slot: tx.slot,
            blockTime: tx.blockTime
        };
    }, 'verifyBurnTransaction');
}

/**
 * Get recent burns from the blockchain
 * Uses Helius Enhanced API for efficient querying
 * Results are cached to reduce API calls
 * @param {number} limit - Max burns to return
 * @returns {Promise<Array>}
 */
async function getRecentBurns(limit = 20) {
    // Check cache first
    const cacheKey = `recentBurns:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    return withRetry(async () => {
        if (!HELIUS_API_KEY) {
            throw new Error('HELIUS_API_KEY not configured');
        }

        // Use Helius Enhanced Transactions API
        const response = await fetch(
            buildHeliusApiUrl(`/v0/addresses/${ASDF_TOKEN_MINT}/transactions`, { type: 'BURN' }),
            {
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        if (!response.ok) {
            const status = response.status;
            if (status === 429) {
                throw new Error('Helius rate limit exceeded');
            }
            throw new Error(`Helius API error: ${status}`);
        }

        const transactions = await response.json();

        const result = transactions.slice(0, limit).map(tx => ({
            signature: tx.signature,
            wallet: tx.feePayer,
            amount: tx.tokenTransfers?.[0]?.tokenAmount || 0,
            timestamp: tx.timestamp,
            slot: tx.slot
        }));

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.recentBurns);
        return result;
    }, 'getRecentBurns');
}

/**
 * Get burn history for a specific wallet
 * Uses Helius Enhanced API to fetch wallet's burn transactions
 * @param {string} walletAddress - Wallet to get history for
 * @param {number} limit - Max burns to return
 * @returns {Promise<{burns: Array, totalBurned: number}>}
 */
async function getWalletBurnHistory(walletAddress, limit = 50) {
    // Check cache first
    const cacheKey = `burnHistory:${walletAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    return withRetry(async () => {
        if (!HELIUS_API_KEY) {
            throw new Error('HELIUS_API_KEY not configured');
        }

        // Use Helius Enhanced Transactions API for wallet
        const response = await fetch(
            buildHeliusApiUrl(`/v0/addresses/${walletAddress}/transactions`, { type: 'BURN' }),
            {
                headers: { 'Accept': 'application/json' }
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Helius rate limit exceeded');
            }
            throw new Error(`Helius API error: ${response.status}`);
        }

        const transactions = await response.json();

        // Filter for ASDF token burns only
        const asdfBurns = transactions.filter(tx => {
            const transfer = tx.tokenTransfers?.find(t =>
                t.mint === ASDF_TOKEN_MINT && t.tokenAmount < 0
            );
            return transfer !== undefined;
        });

        const burns = asdfBurns.slice(0, limit).map(tx => {
            const transfer = tx.tokenTransfers.find(t => t.mint === ASDF_TOKEN_MINT);
            return {
                signature: tx.signature,
                amount: Math.abs(transfer?.tokenAmount || 0),
                timestamp: tx.timestamp,
                slot: tx.slot
            };
        });

        const totalBurned = burns.reduce((sum, b) => sum + b.amount, 0);

        const result = {
            burns,
            totalBurned,
            burnCount: burns.length
        };

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.burnHistory);
        return result;
    }, 'getWalletBurnHistory');
}

/**
 * Validate Solana address format
 * @param {string} address - Address to validate
 * @returns {boolean}
 */
function isValidAddress(address) {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Health check for Helius connection
 * Comprehensive health status for monitoring
 * @returns {Promise<{healthy: boolean, latency: number, details: Object}>}
 */
async function healthCheck() {
    const start = Date.now();
    const details = {
        rpc: false,
        enhancedApi: false,
        cacheSize: cache.cache.size
    };

    try {
        const conn = getConnection();

        // Check RPC connection
        const slot = await conn.getSlot();
        details.rpc = true;
        details.currentSlot = slot;

        // Check Enhanced API (quick ping)
        if (HELIUS_API_KEY) {
            try {
                const response = await fetch(
                    buildHeliusApiUrl(`/v0/addresses/${ASDF_TOKEN_MINT}/transactions`, { limit: '1' }),
                    { timeout: 5000 }
                );
                details.enhancedApi = response.ok;
            } catch {
                details.enhancedApi = false;
            }
        }

        return {
            healthy: details.rpc,
            latency: Date.now() - start,
            details
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            latency: Date.now() - start,
            details
        };
    }
}

/**
 * Invalidate cache for a specific wallet
 * @param {string} walletAddress - Wallet to invalidate
 */
function invalidateWalletCache(walletAddress) {
    cache.delete(`balance:${walletAddress}`);
}

/**
 * Clear all caches (use with caution)
 */
function clearAllCaches() {
    cache.clear();
    console.log('[Helius] All caches cleared');
}

module.exports = {
    // Core functions
    getConnection,
    getTokenBalance,
    getTokenSupply,
    buildBurnTransaction,
    verifyBurnTransaction,
    getRecentBurns,
    getWalletBurnHistory,

    // Advanced Helius features
    getPriorityFeeEstimate,
    waitForConfirmation,
    getBatchTokenBalances,

    // Connection management
    resetConnectionPool,
    reportConnectionFailure,

    // Utilities
    isValidAddress,
    healthCheck,
    invalidateWalletCache,
    clearAllCaches,
    redactApiKey,  // For safe logging of URLs

    // Constants
    ASDF_TOKEN_MINT,
    TOKEN_DECIMALS,
    MIN_HOLDER_BALANCE,
    PRIORITY_FEE_CONFIG,
    CONFIRMATION_CONFIG,
    FAILOVER_CONFIG
};
