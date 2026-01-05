/**
 * ASDF Shop V2 - Purchase Flow
 *
 * Two-phase purchase system with dual currency support
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// PURCHASE MANAGER
// ============================================

const ShopPurchase = {
    // Current purchase in progress
    currentPurchase: null,

    // Purchase states
    STATES: {
        IDLE: 'idle',
        INITIATING: 'initiating',
        AWAITING_CONFIRMATION: 'awaiting_confirmation',
        CONFIRMING: 'confirming',
        COMPLETED: 'completed',
        FAILED: 'failed'
    },

    // Current state
    state: 'idle',

    // Callbacks
    onStateChange: null,
    onSuccess: null,
    onError: null,

    // ============================================
    // PURCHASE FLOW
    // ============================================

    /**
     * Initiate purchase flow
     * @param {Object} item - Item to purchase
     * @param {string} currency - 'burn' or 'ingame'
     * @param {Object} shopState - Shop state for updates
     */
    async initiate(item, currency, shopState) {
        if (this.state !== this.STATES.IDLE) {
            console.warn('[ShopPurchase] Purchase already in progress');
            return { success: false, error: 'Purchase already in progress' };
        }

        this.setState(this.STATES.INITIATING);

        try {
            // Check if sync is available
            if (!window.ShopSync) {
                throw new Error('Shop sync not available');
            }

            // Check availability
            if (!this.checkAvailability(item, shopState)) {
                throw new Error('Item not available for purchase');
            }

            // Check balance
            if (!this.checkBalance(item, currency, shopState)) {
                throw new Error(`Insufficient ${currency} balance`);
            }

            // Initiate on server
            const result = await window.ShopSync.initiatePurchase(item.id, currency);

            if (!result.success) {
                throw new Error(result.error || 'Failed to initiate purchase');
            }

            // Store purchase data
            this.currentPurchase = {
                purchaseId: result.purchaseId,
                item,
                currency,
                price: result.price,
                burnAddress: result.burnAddress,
                initiatedAt: Date.now(),
                expiresAt: result.expiresAt
            };

            this.setState(this.STATES.AWAITING_CONFIRMATION);

            // For burn purchases, need wallet signature
            if (currency === 'burn') {
                return {
                    success: true,
                    requiresSignature: true,
                    purchaseId: result.purchaseId,
                    price: result.price,
                    burnAddress: result.burnAddress
                };
            }

            // For in-game currency, auto-confirm
            return await this.confirm(null, shopState);

        } catch (error) {
            console.error('[ShopPurchase] Initiate failed:', error);
            this.setState(this.STATES.FAILED);
            this.reset();

            if (this.onError) {
                this.onError(error);
            }

            return { success: false, error: error.message };
        }
    },

    /**
     * Confirm purchase (after signature for burn)
     * @param {string|null} signature - Transaction signature (for burn)
     * @param {Object} shopState - Shop state for updates
     */
    async confirm(signature, shopState) {
        if (this.state !== this.STATES.AWAITING_CONFIRMATION) {
            console.warn('[ShopPurchase] Not awaiting confirmation');
            return { success: false, error: 'Not awaiting confirmation' };
        }

        if (!this.currentPurchase) {
            return { success: false, error: 'No purchase in progress' };
        }

        this.setState(this.STATES.CONFIRMING);

        try {
            const result = await window.ShopSync.confirmPurchase(
                this.currentPurchase.purchaseId,
                signature
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to confirm purchase');
            }

            // Update local state
            if (shopState) {
                // Add to inventory
                const inventory = [...shopState.inventory];
                if (!inventory.some(i => i.id === this.currentPurchase.item.id)) {
                    inventory.push({
                        ...this.currentPurchase.item,
                        owned: true,
                        purchasedAt: new Date().toISOString()
                    });
                    shopState.setInventory(inventory);
                }

                // Update currency
                if (this.currentPurchase.currency === 'ingame') {
                    const newBalance = shopState.currency.ingame - this.currentPurchase.price;
                    shopState.updateIngameCurrency(newBalance);
                }

                // Save to local
                shopState.saveToLocal();

                // Emit event
                shopState.emit('purchase-complete', {
                    item: this.currentPurchase.item,
                    currency: this.currentPurchase.currency,
                    price: this.currentPurchase.price
                });
            }

            this.setState(this.STATES.COMPLETED);

            if (this.onSuccess) {
                this.onSuccess(this.currentPurchase);
            }

            const completedPurchase = { ...this.currentPurchase };
            this.reset();

            return {
                success: true,
                item: completedPurchase.item,
                message: 'Purchase completed successfully!'
            };

        } catch (error) {
            console.error('[ShopPurchase] Confirm failed:', error);
            this.setState(this.STATES.FAILED);

            if (this.onError) {
                this.onError(error);
            }

            return { success: false, error: error.message };
        }
    },

    /**
     * Cancel current purchase
     */
    cancel() {
        if (this.currentPurchase) {
            console.log('[ShopPurchase] Cancelled purchase:', this.currentPurchase.purchaseId);
        }
        this.reset();
    },

    /**
     * Reset purchase state
     */
    reset() {
        this.currentPurchase = null;
        this.setState(this.STATES.IDLE);
    },

    // ============================================
    // VALIDATION
    // ============================================

    /**
     * Check if item is available for purchase
     */
    checkAvailability(item, shopState) {
        // Check if already owned
        if (shopState && shopState.inventory.some(i => i.id === item.id)) {
            return false;
        }

        // Check quantity limit
        if (item.is_limited && item.quantity_limit) {
            if ((item.quantity_sold || 0) >= item.quantity_limit) {
                return false;
            }
        }

        // Check time availability
        const now = new Date();
        if (item.available_from && new Date(item.available_from) > now) {
            return false;
        }
        if (item.available_until && new Date(item.available_until) < now) {
            return false;
        }

        // Check tier requirement
        if (item.required_tier && shopState) {
            const userTier = shopState.userTier || 0;
            if (userTier < item.required_tier) {
                return false;
            }
        }

        return true;
    },

    /**
     * Check if user has sufficient balance
     */
    checkBalance(item, currency, shopState) {
        if (!shopState) return true; // Can't verify without state

        const price = item.price || item.prices?.[currency] || 0;

        if (currency === 'ingame') {
            return (shopState.currency.ingame || 0) >= price;
        }

        // For burn, we can't check balance here (wallet does that)
        return true;
    },

    /**
     * Get purchase button state
     */
    getButtonState(item, currency, shopState) {
        if (!this.checkAvailability(item, shopState)) {
            if (shopState?.inventory.some(i => i.id === item.id)) {
                return { disabled: true, text: 'Owned', class: 'owned' };
            }
            return { disabled: true, text: 'Unavailable', class: 'unavailable' };
        }

        if (!this.checkBalance(item, currency, shopState)) {
            return { disabled: true, text: 'Insufficient Funds', class: 'insufficient' };
        }

        if (this.state !== this.STATES.IDLE) {
            return { disabled: true, text: 'Processing...', class: 'processing' };
        }

        const price = item.price || item.prices?.[currency] || 0;
        const icon = currency === 'burn' ? '🔥' : '🪙';
        return {
            disabled: false,
            text: `${icon} ${price.toLocaleString()}`,
            class: 'available'
        };
    },

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    /**
     * Set current state
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;

        if (this.onStateChange) {
            this.onStateChange(newState, oldState);
        }

        console.log(`[ShopPurchase] State: ${oldState} -> ${newState}`);
    },

    /**
     * Register callbacks
     */
    on(event, callback) {
        switch (event) {
            case 'stateChange':
                this.onStateChange = callback;
                break;
            case 'success':
                this.onSuccess = callback;
                break;
            case 'error':
                this.onError = callback;
                break;
        }
    }
};

// ============================================
// BURN PURCHASE HELPER (SOLANA)
// ============================================

const BurnPurchase = {
    /**
     * Execute burn transaction
     * @param {number} amount - Amount to burn (in lamports)
     * @param {string} burnAddress - Destination address
     * @returns {Promise<string>} Transaction signature
     */
    async executeBurn(amount, burnAddress) {
        // Check for Solana wallet
        const provider = window.solana || window.phantom?.solana;
        if (!provider) {
            throw new Error('Solana wallet not found');
        }

        if (!provider.isConnected) {
            await provider.connect();
        }

        // Import Solana web3 (should be loaded globally)
        const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = window.solanaWeb3;

        if (!Connection || !PublicKey) {
            throw new Error('Solana Web3 not loaded');
        }

        // Create connection
        const connection = new Connection(
            window.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
            'confirmed'
        );

        // Create transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: provider.publicKey,
                toPubkey: new PublicKey(burnAddress),
                lamports: amount
            })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = provider.publicKey;

        // Sign and send
        const signed = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        return signature;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopPurchase, BurnPurchase };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopPurchase = ShopPurchase;
    window.BurnPurchase = BurnPurchase;
}
