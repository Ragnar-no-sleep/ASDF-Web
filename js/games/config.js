/**
 * ASDF Games - Configuration
 *
 * SECURITY NOTES:
 * - Sensitive addresses are public (on-chain data) but loaded from API when possible
 * - API config takes precedence over local fallbacks
 * - Config is validated before use
 * - Never store private keys or secrets in this file
 */

'use strict';

// ============================================
// ENVIRONMENT DETECTION
// ============================================

const Environment = {
    isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isProd: window.location.hostname === 'alonisthe.dev' || window.location.hostname === 'www.alonisthe.dev',
    isTest: window.location.hostname.includes('test') || window.location.hostname.includes('staging'),

    getMode() {
        if (this.isProd) return 'production';
        if (this.isTest) return 'staging';
        return 'development';
    }
};

// ============================================
// DEFAULT CONFIGURATION (Fallback values)
// ============================================

const DEFAULT_CONFIG = {
    // These are PUBLIC on-chain addresses - not secrets
    // In production, these should be loaded from a secure API
    ASDF_TOKEN_MINT: '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
    TOKEN_DECIMALS: 6,
    MIN_HOLDER_BALANCE: 1000000,

    // Public wallet addresses (viewable on-chain)
    TREASURY_WALLET: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
    ESCROW_WALLET: 'AR3Rcr8o4iZwGwTUG5LEx7uhcenCCZNrbgkLrjVC1v6y',

    // Rotation settings
    ROTATION_EPOCH: '2024-01-01T00:00:00Z',
    CYCLE_WEEKS: 9
};

// ============================================
// RUNTIME CONFIGURATION
// ============================================

const CONFIG = {
    // Environment
    DEV_MODE: Environment.isDev,
    ENV: Environment.getMode(),

    // Feature flags
    DISABLE_BETTING: true,
    DISABLE_PAID_TICKETS: true,

    // Token configuration (loaded from API or fallback)
    ASDF_TOKEN_MINT: DEFAULT_CONFIG.ASDF_TOKEN_MINT,
    TOKEN_DECIMALS: DEFAULT_CONFIG.TOKEN_DECIMALS,
    MIN_HOLDER_BALANCE: DEFAULT_CONFIG.MIN_HOLDER_BALANCE,

    // Wallet addresses (loaded from API or fallback)
    TREASURY_WALLET: DEFAULT_CONFIG.TREASURY_WALLET,
    ESCROW_WALLET: DEFAULT_CONFIG.ESCROW_WALLET,

    // API endpoints (environment-specific)
    API_BASE: Environment.isDev
        ? 'http://localhost:3001/api'
        : 'https://api.asdf-games.com/api',

    // Solana RPC (environment-specific)
    SOLANA_RPC: Environment.isDev
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com',

    // Rotation settings
    ROTATION_EPOCH: new Date(DEFAULT_CONFIG.ROTATION_EPOCH),
    CYCLE_WEEKS: DEFAULT_CONFIG.CYCLE_WEEKS,

    // Config state
    _loaded: false,
    _loadedFrom: 'default'
};

// ============================================
// SECURE CONFIG LOADER
// ============================================

const ConfigLoader = {
    /**
     * Load configuration from secure API
     * Falls back to defaults if API unavailable
     */
    async load() {
        if (CONFIG._loaded) {
            return CONFIG;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE}/config/public`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                // Short timeout - don't block app startup
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                const apiConfig = await response.json();
                this.applyConfig(apiConfig);
                CONFIG._loadedFrom = 'api';
                console.info('Config loaded from API');
            }
        } catch (error) {
            // API not available - use defaults (expected in dev)
            if (!Environment.isDev) {
                console.warn('Config API unavailable, using defaults:', error.message);
            }
            CONFIG._loadedFrom = 'default';
        }

        CONFIG._loaded = true;
        return CONFIG;
    },

    /**
     * Apply and validate API config
     */
    applyConfig(apiConfig) {
        // Only apply validated fields
        if (this.isValidSolanaAddress(apiConfig.tokenMint)) {
            CONFIG.ASDF_TOKEN_MINT = apiConfig.tokenMint;
        }

        if (this.isValidSolanaAddress(apiConfig.treasuryWallet)) {
            CONFIG.TREASURY_WALLET = apiConfig.treasuryWallet;
        }

        if (this.isValidSolanaAddress(apiConfig.escrowWallet)) {
            CONFIG.ESCROW_WALLET = apiConfig.escrowWallet;
        }

        if (typeof apiConfig.minHolderBalance === 'number' && apiConfig.minHolderBalance > 0) {
            CONFIG.MIN_HOLDER_BALANCE = apiConfig.minHolderBalance;
        }

        if (typeof apiConfig.cycleWeeks === 'number' && apiConfig.cycleWeeks > 0) {
            CONFIG.CYCLE_WEEKS = apiConfig.cycleWeeks;
        }

        if (apiConfig.rotationEpoch) {
            const epoch = new Date(apiConfig.rotationEpoch);
            if (!isNaN(epoch.getTime())) {
                CONFIG.ROTATION_EPOCH = epoch;
            }
        }
    },

    /**
     * Basic Solana address validation
     */
    isValidSolanaAddress(address) {
        if (typeof address !== 'string') return false;
        if (address.length < 32 || address.length > 44) return false;
        return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
    },

    /**
     * Get current config status
     */
    getStatus() {
        return {
            loaded: CONFIG._loaded,
            source: CONFIG._loadedFrom,
            environment: CONFIG.ENV
        };
    }
};

// ============================================
// CONFIG VALIDATION
// ============================================

const ConfigValidator = {
    /**
     * Validate critical config before use
     */
    validate() {
        const errors = [];

        if (!ConfigLoader.isValidSolanaAddress(CONFIG.ASDF_TOKEN_MINT)) {
            errors.push('Invalid ASDF_TOKEN_MINT address');
        }

        if (!ConfigLoader.isValidSolanaAddress(CONFIG.TREASURY_WALLET)) {
            errors.push('Invalid TREASURY_WALLET address');
        }

        if (CONFIG.MIN_HOLDER_BALANCE <= 0) {
            errors.push('MIN_HOLDER_BALANCE must be positive');
        }

        if (errors.length > 0) {
            console.error('Config validation failed:', errors);
            return false;
        }

        return true;
    }
};

// Games definition
const GAMES = [
    {
        id: 'burnrunner',
        name: 'Burn Runner',
        icon: '🔥',
        type: 'Endless Runner',
        description: 'Run through the blockchain, collect tokens, avoid obstacles. Every token collected gets burned!'
    },
    {
        id: 'scamblaster',
        name: 'Scam Blaster',
        icon: '🔫',
        type: 'Shooter',
        description: 'Shoot down scam tokens and rug projects before they hit your wallet!'
    },
    {
        id: 'hodlhero',
        name: 'Hold Hero',
        icon: '💎',
        type: 'Tower Defense',
        description: 'Protect your wallet from waves of FUD and scammers. Hold the line!'
    },
    {
        id: 'cryptoheist',
        name: 'Crypto Heist',
        icon: '🦹',
        type: 'Action',
        description: 'Navigate the crypto underworld! Steal tokens, evade the SEC, and escape with your loot!'
    },
    {
        id: 'rugpull',
        name: 'Rug Pull Escape',
        icon: '🏃',
        type: 'Reaction Game',
        description: 'Spot the warning signs and withdraw before the rug gets pulled!'
    },
    {
        id: 'whalewatch',
        name: 'Whale Watch',
        icon: '🐋',
        type: 'Pattern Memory',
        description: 'Track whale movements and predict their next trade patterns.'
    },
    {
        id: 'stakestacker',
        name: 'Stake Stacker',
        icon: '📦',
        type: 'Puzzle',
        description: 'Stack and arrange staking blocks for maximum APY rewards.'
    },
    {
        id: 'dexdash',
        name: 'DEX Dash',
        icon: '🏁',
        type: 'Racing',
        description: 'Race across DEX platforms. Fastest route to the best swap wins!'
    },
    {
        id: 'burnorhold',
        name: 'Token Archer',
        icon: '🏹',
        type: 'Turn-based',
        description: 'Take turns shooting arrows at your enemy! Aim with drag, release to fire. Defeat the enemy to win!'
    }
];

// Airdrop slots per rank
const AIRDROP_SLOTS = { 1: 5, 2: 2, 3: 1 };
