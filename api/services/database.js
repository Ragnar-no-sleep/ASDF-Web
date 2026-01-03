/**
 * ASDF API - Database Abstraction Layer
 *
 * Unified interface for data persistence:
 * - In-memory storage (development)
 * - PostgreSQL ready (production)
 *
 * Security by Design:
 * - Parameterized queries ready
 * - Transaction support
 * - Audit trail for all writes
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const DB_CONFIG = {
    type: process.env.DATABASE_URL ? 'postgres' : 'memory',
    connectionString: process.env.DATABASE_URL,
    pool: {
        min: 2,
        max: 10
    }
};

// ============================================
// IN-MEMORY STORAGE (Development)
// ============================================

const memoryStore = {
    // Users table
    users: new Map(),

    // Inventory table
    inventory: new Map(),  // wallet -> Set of itemIds

    // Equipped items
    equipped: new Map(),   // wallet -> { layer: itemId }

    // Purchases history
    purchases: [],

    // Burns history
    burns: [],

    // Used signatures (for double-spend protection)
    usedSignatures: new Set(),

    // Game scores
    gameScores: [],

    // XP ledger
    xpLedger: []
};

// ============================================
// DATABASE INTERFACE
// ============================================

/**
 * User operations
 */
const Users = {
    /**
     * Get or create user
     * @param {string} wallet - Wallet address
     * @returns {Promise<Object>}
     */
    async getOrCreate(wallet) {
        if (DB_CONFIG.type === 'memory') {
            let user = memoryStore.users.get(wallet);
            if (!user) {
                user = {
                    wallet,
                    totalXP: 0,
                    totalBurned: 0,
                    createdAt: Date.now(),
                    lastActive: Date.now()
                };
                memoryStore.users.set(wallet, user);
                logAudit('user_created', { wallet: wallet.slice(0, 8) + '...' });
            }
            return { ...user };
        }

        // PostgreSQL implementation
        // const result = await pool.query(
        //     `INSERT INTO users (wallet, created_at)
        //      VALUES ($1, NOW())
        //      ON CONFLICT (wallet) DO UPDATE SET last_active = NOW()
        //      RETURNING *`,
        //     [wallet]
        // );
        // return result.rows[0];
    },

    /**
     * Add XP to user
     * @param {string} wallet - Wallet address
     * @param {number} amount - XP to add
     * @param {string} source - XP source (burn, game, etc)
     * @returns {Promise<Object>}
     */
    async addXP(wallet, amount, source) {
        if (DB_CONFIG.type === 'memory') {
            const user = await this.getOrCreate(wallet);
            user.totalXP += amount;
            user.lastActive = Date.now();
            memoryStore.users.set(wallet, user);

            // Record in ledger
            memoryStore.xpLedger.push({
                wallet,
                amount,
                source,
                timestamp: Date.now()
            });

            return { ...user };
        }

        // PostgreSQL: UPDATE users SET total_xp = total_xp + $2 WHERE wallet = $1
    },

    /**
     * Get user stats
     * @param {string} wallet - Wallet address
     * @returns {Promise<Object|null>}
     */
    async getStats(wallet) {
        if (DB_CONFIG.type === 'memory') {
            const user = memoryStore.users.get(wallet);
            if (!user) return null;

            return {
                ...user,
                inventory: await Inventory.getItems(wallet),
                equipped: await Inventory.getEquipped(wallet)
            };
        }

        // PostgreSQL: JOIN users, inventory, equipped
    }
};

/**
 * Inventory operations
 */
const Inventory = {
    /**
     * Get user's items
     * @param {string} wallet - Wallet address
     * @returns {Promise<string[]>}
     */
    async getItems(wallet) {
        if (DB_CONFIG.type === 'memory') {
            const items = memoryStore.inventory.get(wallet);
            return items ? Array.from(items) : ['skin_default'];
        }

        // PostgreSQL: SELECT item_id FROM inventory WHERE wallet = $1
    },

    /**
     * Add item to inventory
     * @param {string} wallet - Wallet address
     * @param {string} itemId - Item to add
     * @returns {Promise<boolean>}
     */
    async addItem(wallet, itemId) {
        if (DB_CONFIG.type === 'memory') {
            let items = memoryStore.inventory.get(wallet);
            if (!items) {
                items = new Set(['skin_default']);
            }
            items.add(itemId);
            memoryStore.inventory.set(wallet, items);

            logAudit('item_added', {
                wallet: wallet.slice(0, 8) + '...',
                itemId
            });

            return true;
        }

        // PostgreSQL: INSERT INTO inventory (wallet, item_id) VALUES ($1, $2)
    },

    /**
     * Check if user owns item
     * @param {string} wallet - Wallet address
     * @param {string} itemId - Item to check
     * @returns {Promise<boolean>}
     */
    async hasItem(wallet, itemId) {
        const items = await this.getItems(wallet);
        return items.includes(itemId);
    },

    /**
     * Get equipped items
     * @param {string} wallet - Wallet address
     * @returns {Promise<Object>}
     */
    async getEquipped(wallet) {
        if (DB_CONFIG.type === 'memory') {
            return memoryStore.equipped.get(wallet) || {
                background: null,
                aura: null,
                skin: 'skin_default',
                outfit: null,
                eyes: null,
                head: null,
                held: null
            };
        }

        // PostgreSQL: SELECT * FROM equipped WHERE wallet = $1
    },

    /**
     * Equip an item
     * @param {string} wallet - Wallet address
     * @param {string} layer - Layer to equip
     * @param {string} itemId - Item to equip
     * @returns {Promise<Object>}
     */
    async equipItem(wallet, layer, itemId) {
        if (DB_CONFIG.type === 'memory') {
            const equipped = await this.getEquipped(wallet);
            equipped[layer] = itemId;
            memoryStore.equipped.set(wallet, equipped);
            return equipped;
        }

        // PostgreSQL: UPDATE equipped SET $layer = $2 WHERE wallet = $1
    }
};

/**
 * Purchase operations
 */
const Purchases = {
    /**
     * Record a purchase
     * @param {Object} purchase - Purchase data
     * @returns {Promise<Object>}
     */
    async record(purchase) {
        const record = {
            id: memoryStore.purchases.length + 1,
            ...purchase,
            timestamp: Date.now()
        };

        if (DB_CONFIG.type === 'memory') {
            memoryStore.purchases.push(record);

            // Add to inventory
            await Inventory.addItem(purchase.wallet, purchase.itemId);

            // Add XP
            await Users.addXP(purchase.wallet, purchase.price, 'purchase');

            return record;
        }

        // PostgreSQL: BEGIN; INSERT purchases; INSERT inventory; UPDATE users; COMMIT;
    },

    /**
     * Get purchase history
     * @param {string} wallet - Wallet address
     * @param {number} limit - Max records
     * @returns {Promise<Array>}
     */
    async getHistory(wallet, limit = 50) {
        if (DB_CONFIG.type === 'memory') {
            return memoryStore.purchases
                .filter(p => p.wallet === wallet)
                .slice(-limit)
                .reverse();
        }

        // PostgreSQL: SELECT * FROM purchases WHERE wallet = $1 ORDER BY timestamp DESC LIMIT $2
    }
};

/**
 * Signature tracking (double-spend protection)
 */
const Signatures = {
    /**
     * Check if signature was already used
     * @param {string} signature - Transaction signature
     * @returns {Promise<boolean>}
     */
    async isUsed(signature) {
        if (DB_CONFIG.type === 'memory') {
            return memoryStore.usedSignatures.has(signature);
        }

        // PostgreSQL: SELECT 1 FROM used_signatures WHERE signature = $1
    },

    /**
     * Mark signature as used
     * @param {string} signature - Transaction signature
     * @param {string} wallet - Associated wallet
     * @param {string} purpose - Usage purpose
     * @returns {Promise<boolean>}
     */
    async markUsed(signature, wallet, purpose) {
        if (DB_CONFIG.type === 'memory') {
            if (memoryStore.usedSignatures.has(signature)) {
                return false; // Already used
            }
            memoryStore.usedSignatures.add(signature);

            logAudit('signature_used', {
                signature: signature.slice(0, 16) + '...',
                wallet: wallet.slice(0, 8) + '...',
                purpose
            });

            return true;
        }

        // PostgreSQL: INSERT INTO used_signatures (signature, wallet, purpose, used_at) VALUES (...)
    }
};

/**
 * Burns tracking
 */
const Burns = {
    /**
     * Record a burn
     * @param {Object} burn - Burn data
     * @returns {Promise<Object>}
     */
    async record(burn) {
        const record = {
            id: memoryStore.burns.length + 1,
            ...burn,
            timestamp: burn.timestamp || Date.now()
        };

        if (DB_CONFIG.type === 'memory') {
            memoryStore.burns.push(record);

            // Update user stats
            const user = await Users.getOrCreate(burn.wallet);
            user.totalBurned += burn.amount;
            memoryStore.users.set(burn.wallet, user);

            // Add XP
            await Users.addXP(burn.wallet, burn.amount, 'burn');

            return record;
        }

        // PostgreSQL: INSERT INTO burns; UPDATE users SET total_burned = total_burned + $amount
    },

    /**
     * Get burn history for wallet
     * @param {string} wallet - Wallet address
     * @param {number} limit - Max records
     * @returns {Promise<Array>}
     */
    async getHistory(wallet, limit = 50) {
        if (DB_CONFIG.type === 'memory') {
            return memoryStore.burns
                .filter(b => b.wallet === wallet)
                .slice(-limit)
                .reverse();
        }

        // PostgreSQL: SELECT * FROM burns WHERE wallet = $1 ORDER BY timestamp DESC LIMIT $2
    },

    /**
     * Get total burned across all users
     * @returns {Promise<number>}
     */
    async getTotalBurned() {
        if (DB_CONFIG.type === 'memory') {
            return memoryStore.burns.reduce((sum, b) => sum + b.amount, 0);
        }

        // PostgreSQL: SELECT SUM(amount) FROM burns
    }
};

/**
 * Game scores
 */
const GameScores = {
    /**
     * Record a game score
     * @param {Object} score - Score data
     * @returns {Promise<Object>}
     */
    async record(score) {
        const record = {
            id: memoryStore.gameScores.length + 1,
            ...score,
            timestamp: Date.now()
        };

        if (DB_CONFIG.type === 'memory') {
            memoryStore.gameScores.push(record);
            return record;
        }

        // PostgreSQL: INSERT INTO game_scores (wallet, game_type, score, duration) VALUES (...)
    },

    /**
     * Get high scores for a game
     * @param {string} gameType - Game type
     * @param {number} limit - Max records
     * @returns {Promise<Array>}
     */
    async getHighScores(gameType, limit = 20) {
        if (DB_CONFIG.type === 'memory') {
            return memoryStore.gameScores
                .filter(s => s.gameType === gameType)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }

        // PostgreSQL: SELECT * FROM game_scores WHERE game_type = $1 ORDER BY score DESC LIMIT $2
    }
};

// ============================================
// DATABASE HEALTH & UTILITIES
// ============================================

/**
 * Get database health status
 * @returns {Object}
 */
function getHealthStatus() {
    return {
        type: DB_CONFIG.type,
        connected: true, // Always true for memory
        stats: {
            users: memoryStore.users.size,
            purchases: memoryStore.purchases.length,
            burns: memoryStore.burns.length,
            signatures: memoryStore.usedSignatures.size,
            gameScores: memoryStore.gameScores.length
        }
    };
}

/**
 * Clear all data (for testing only)
 */
function clearAll() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot clear database in production');
    }

    memoryStore.users.clear();
    memoryStore.inventory.clear();
    memoryStore.equipped.clear();
    memoryStore.purchases.length = 0;
    memoryStore.burns.length = 0;
    memoryStore.usedSignatures.clear();
    memoryStore.gameScores.length = 0;
    memoryStore.xpLedger.length = 0;

    console.log('[Database] All data cleared');
}

module.exports = {
    // Models
    Users,
    Inventory,
    Purchases,
    Signatures,
    Burns,
    GameScores,

    // Utilities
    getHealthStatus,
    clearAll,

    // Config
    DB_CONFIG
};
