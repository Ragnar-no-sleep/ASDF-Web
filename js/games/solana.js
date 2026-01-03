/**
 * ASDF Games - Solana Payment System
 *
 * SECURITY NOTE: This module uses direct RPC for transaction signing only.
 * - Balance checks should use the API (/api/user/profile)
 * - Purchases should use the Shop API flow (/api/shop/purchase)
 * - This module is for legacy SOL transfers only
 *
 * For new features, use the API endpoints which use Helius RPC
 * with proper rate limiting, caching, and security.
 */

'use strict';

// Solana Program IDs (defined once to avoid duplication)
const SOLANA_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

const SolanaPayment = {
    connection: null,

    // Cached PublicKey instances
    _tokenProgramId: null,
    _associatedTokenProgramId: null,

    /**
     * Get cached Token Program ID
     */
    getTokenProgramId() {
        if (!this._tokenProgramId) {
            this._tokenProgramId = new solanaWeb3.PublicKey(SOLANA_TOKEN_PROGRAM_ID);
        }
        return this._tokenProgramId;
    },

    /**
     * Get cached Associated Token Program ID
     */
    getAssociatedTokenProgramId() {
        if (!this._associatedTokenProgramId) {
            this._associatedTokenProgramId = new solanaWeb3.PublicKey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID);
        }
        return this._associatedTokenProgramId;
    },

    /**
     * Initialize Solana connection
     */
    getConnection() {
        if (!this.connection) {
            if (typeof solanaWeb3 === 'undefined') {
                console.error('Solana Web3.js not loaded');
                return null;
            }
            this.connection = new solanaWeb3.Connection(CONFIG.SOLANA_RPC, 'confirmed');
        }
        return this.connection;
    },

    /**
     * Get Phantom provider
     */
    getProvider() {
        if (typeof window.phantom?.solana !== 'undefined') {
            return window.phantom.solana;
        }
        if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
            return window.solana;
        }
        return null;
    },

    /**
     * Transfer SOL to treasury
     */
    async transferSOL(amountSOL) {
        const provider = this.getProvider();
        if (!provider || !provider.publicKey) {
            throw new Error('Wallet not connected');
        }

        const connection = this.getConnection();
        if (!connection) {
            throw new Error('Solana connection failed');
        }

        if (!CONFIG.TREASURY_WALLET || CONFIG.TREASURY_WALLET === 'YOUR_TREASURY_WALLET_ADDRESS_HERE') {
            throw new Error('Treasury wallet not configured');
        }

        try {
            const fromPubkey = provider.publicKey;
            const toPubkey = new solanaWeb3.PublicKey(CONFIG.TREASURY_WALLET);
            const lamports = Math.round(amountSOL * solanaWeb3.LAMPORTS_PER_SOL);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            const transaction = new solanaWeb3.Transaction({
                recentBlockhash: blockhash,
                feePayer: fromPubkey
            });

            transaction.add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: toPubkey,
                    lamports: lamports
                })
            );

            const { signature } = await provider.signAndSendTransaction(transaction);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
            }

            return signature;

        } catch (error) {
            console.error('SOL transfer error:', error);
            throw error;
        }
    },

    /**
     * Transfer SPL tokens
     */
    async transferTokens(amount, destinationWallet = CONFIG.ESCROW_WALLET) {
        const provider = this.getProvider();
        if (!provider || !provider.publicKey) {
            throw new Error('Wallet not connected');
        }

        const connection = this.getConnection();
        if (!connection) {
            throw new Error('Solana connection failed');
        }

        if (!CONFIG.ASDF_TOKEN_MINT || CONFIG.ASDF_TOKEN_MINT === 'YOUR_TOKEN_MINT_ADDRESS_HERE') {
            throw new Error('Token mint not configured');
        }
        if (!destinationWallet || destinationWallet === 'YOUR_ESCROW_WALLET_ADDRESS_HERE') {
            throw new Error('Destination wallet not configured');
        }

        try {
            const fromPubkey = provider.publicKey;
            const mintPubkey = new solanaWeb3.PublicKey(CONFIG.ASDF_TOKEN_MINT);
            const toPubkey = new solanaWeb3.PublicKey(destinationWallet);
            const rawAmount = BigInt(Math.round(amount * Math.pow(10, CONFIG.TOKEN_DECIMALS)));

            const fromTokenAccount = await this.getAssociatedTokenAddress(fromPubkey, mintPubkey);
            const toTokenAccount = await this.getAssociatedTokenAddress(toPubkey, mintPubkey);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            const transaction = new solanaWeb3.Transaction({
                recentBlockhash: blockhash,
                feePayer: fromPubkey
            });

            const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
            if (!toAccountInfo) {
                transaction.add(
                    this.createAssociatedTokenAccountInstruction(
                        fromPubkey,
                        toTokenAccount,
                        toPubkey,
                        mintPubkey
                    )
                );
            }

            transaction.add(
                this.createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    fromPubkey,
                    rawAmount
                )
            );

            const { signature } = await provider.signAndSendTransaction(transaction);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
            }

            return signature;

        } catch (error) {
            console.error('Token transfer error:', error);
            throw error;
        }
    },

    /**
     * Get Associated Token Address (ATA)
     */
    async getAssociatedTokenAddress(walletAddress, mintAddress) {
        const [address] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                this.getTokenProgramId().toBuffer(),
                mintAddress.toBuffer()
            ],
            this.getAssociatedTokenProgramId()
        );
        return address;
    },

    /**
     * Create Associated Token Account instruction
     */
    createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
        const keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedToken, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: this.getTokenProgramId(), isSigner: false, isWritable: false },
        ];

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.getAssociatedTokenProgramId(),
            data: Buffer.alloc(0)
        });
    },

    /**
     * Create SPL Token transfer instruction
     */
    createTransferInstruction(source, destination, owner, amount) {
        const keys = [
            { pubkey: source, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: true, isWritable: false }
        ];

        const data = Buffer.alloc(9);
        data.writeUInt8(3, 0);
        data.writeBigUInt64LE(amount, 1);

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.getTokenProgramId(),
            data
        });
    }
};
