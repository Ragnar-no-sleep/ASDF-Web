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
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
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

// Cache configuration
const CACHE_TTL = {
    tokenSupply: 60 * 1000,      // 1 minute
    tokenBalance: 30 * 1000,     // 30 seconds
    recentBurns: 2 * 60 * 1000   // 2 minutes
};

// Priority fee (microLamports) - adjust based on network conditions
const PRIORITY_FEE = 50000; // ~0.00005 SOL

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
            return await fn();
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
// CONNECTION MANAGEMENT
// ============================================

let connection = null;

/**
 * Get Helius connection
 * @returns {Connection}
 */
function getConnection() {
    if (!connection) {
        if (!HELIUS_API_KEY) {
            throw new Error('HELIUS_API_KEY not configured');
        }
        connection = new Connection(HELIUS_RPC_URL, 'confirmed');
    }
    return connection;
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
 * Includes priority fee for better success during congestion
 * @param {string} walletAddress - User's wallet
 * @param {number} amount - Amount to burn (UI amount, not raw)
 * @returns {Promise<{transaction: string, blockhash: string}>}
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

        // Create priority fee instruction for better success rate
        const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: PRIORITY_FEE
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

        // Priority fee first, then burn
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
            `https://api.helius.xyz/v0/addresses/${ASDF_TOKEN_MINT}/transactions?api-key=${HELIUS_API_KEY}&type=BURN`,
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
                    `https://api.helius.xyz/v0/addresses/${ASDF_TOKEN_MINT}/transactions?api-key=${HELIUS_API_KEY}&limit=1`,
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

    // Utilities
    isValidAddress,
    healthCheck,
    invalidateWalletCache,
    clearAllCaches,

    // Constants
    ASDF_TOKEN_MINT,
    TOKEN_DECIMALS,
    MIN_HOLDER_BALANCE
};
