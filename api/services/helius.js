/**
 * ASDF API - Helius RPC Service
 *
 * Secure Solana integration via Helius
 * - Balance checks
 * - Transaction verification
 * - Token burns
 * - Webhook handling
 */

'use strict';

const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// Environment variables (loaded from .env in production)
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const ASDF_TOKEN_MINT = process.env.ASDF_TOKEN_MINT || '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump';
const TOKEN_DECIMALS = 6;

// Connection singleton
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
 * @param {string} walletAddress - Solana wallet address
 * @returns {Promise<{balance: number, isHolder: boolean}>}
 */
async function getTokenBalance(walletAddress) {
    const conn = getConnection();

    try {
        const wallet = new PublicKey(walletAddress);
        const mint = new PublicKey(ASDF_TOKEN_MINT);

        // Get associated token account
        const tokenAccount = await getAssociatedTokenAddress(mint, wallet);

        // Check if account exists and get balance
        const accountInfo = await conn.getTokenAccountBalance(tokenAccount);

        const balance = accountInfo.value.uiAmount || 0;
        const MIN_HOLDER_BALANCE = 1_000_000; // 1M tokens

        return {
            balance: balance,
            rawBalance: accountInfo.value.amount,
            isHolder: balance >= MIN_HOLDER_BALANCE
        };
    } catch (error) {
        // Account doesn't exist = 0 balance
        if (error.message?.includes('could not find account')) {
            return { balance: 0, rawBalance: '0', isHolder: false };
        }
        throw error;
    }
}

/**
 * Get current token supply
 * @returns {Promise<{current: number, burned: number}>}
 */
async function getTokenSupply() {
    const conn = getConnection();
    const mint = new PublicKey(ASDF_TOKEN_MINT);

    const supplyInfo = await conn.getTokenSupply(mint);
    const currentSupply = Number(supplyInfo.value.amount);
    const initialSupply = 1_000_000_000 * Math.pow(10, TOKEN_DECIMALS);
    const burned = initialSupply - currentSupply;

    return {
        current: currentSupply / Math.pow(10, TOKEN_DECIMALS),
        currentRaw: supplyInfo.value.amount,
        burned: burned / Math.pow(10, TOKEN_DECIMALS),
        burnedRaw: burned.toString()
    };
}

/**
 * Build a burn transaction for the user to sign
 * @param {string} walletAddress - User's wallet
 * @param {number} amount - Amount to burn (UI amount, not raw)
 * @returns {Promise<{transaction: string, blockhash: string}>}
 */
async function buildBurnTransaction(walletAddress, amount) {
    const conn = getConnection();

    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(ASDF_TOKEN_MINT);

    // Get user's token account
    const tokenAccount = await getAssociatedTokenAddress(mint, wallet);

    // Convert to raw amount
    const rawAmount = BigInt(Math.floor(amount * Math.pow(10, TOKEN_DECIMALS)));

    // Create burn instruction
    const burnInstruction = createBurnInstruction(
        tokenAccount,  // Token account to burn from
        mint,          // Token mint
        wallet,        // Owner of token account
        rawAmount      // Amount to burn
    );

    // Build transaction
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();

    const transaction = new Transaction({
        feePayer: wallet,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
    });

    transaction.add(burnInstruction);

    // Serialize for client signing
    const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
    });

    return {
        transaction: serialized.toString('base64'),
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
    };
}

/**
 * Verify a burn transaction
 * @param {string} signature - Transaction signature
 * @param {string} expectedWallet - Expected sender wallet
 * @param {number} expectedAmount - Expected burn amount
 * @returns {Promise<{valid: boolean, actualAmount?: number, error?: string}>}
 */
async function verifyBurnTransaction(signature, expectedWallet, expectedAmount) {
    const conn = getConnection();

    try {
        // Get transaction details
        const tx = await conn.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            return { valid: false, error: 'Transaction not found' };
        }

        if (tx.meta?.err) {
            return { valid: false, error: 'Transaction failed' };
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

        // Verify mint
        if (info.mint !== ASDF_TOKEN_MINT) {
            return { valid: false, error: 'Wrong token mint' };
        }

        // Verify authority (must be the expected wallet)
        if (info.authority !== expectedWallet) {
            return { valid: false, error: 'Wrong wallet' };
        }

        // Verify amount
        const actualAmount = Number(info.amount) / Math.pow(10, TOKEN_DECIMALS);
        const tolerance = 0.000001; // Allow tiny rounding differences

        if (Math.abs(actualAmount - expectedAmount) > tolerance) {
            return {
                valid: false,
                error: 'Amount mismatch',
                actualAmount: actualAmount
            };
        }

        return {
            valid: true,
            actualAmount: actualAmount,
            signature: signature,
            slot: tx.slot,
            blockTime: tx.blockTime
        };

    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Get recent burns from the blockchain
 * Uses Helius Enhanced API for efficient querying
 * @param {number} limit - Max burns to return
 * @returns {Promise<Array>}
 */
async function getRecentBurns(limit = 20) {
    // Use Helius Enhanced Transactions API
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${ASDF_TOKEN_MINT}/transactions?api-key=${HELIUS_API_KEY}&type=BURN`);

    if (!response.ok) {
        throw new Error('Failed to fetch burns from Helius');
    }

    const transactions = await response.json();

    return transactions.slice(0, limit).map(tx => ({
        signature: tx.signature,
        wallet: tx.feePayer,
        amount: tx.tokenTransfers?.[0]?.tokenAmount || 0,
        timestamp: tx.timestamp,
        slot: tx.slot
    }));
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
 * @returns {Promise<{healthy: boolean, latency: number}>}
 */
async function healthCheck() {
    const start = Date.now();
    try {
        const conn = getConnection();
        await conn.getSlot();
        return {
            healthy: true,
            latency: Date.now() - start
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            latency: Date.now() - start
        };
    }
}

module.exports = {
    getConnection,
    getTokenBalance,
    getTokenSupply,
    buildBurnTransaction,
    verifyBurnTransaction,
    getRecentBurns,
    isValidAddress,
    healthCheck,
    // Constants
    ASDF_TOKEN_MINT,
    TOKEN_DECIMALS
};
