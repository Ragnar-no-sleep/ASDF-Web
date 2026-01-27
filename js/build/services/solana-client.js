/**
 * Build V2 - Solana Client (Stub)
 * Future integration with @solana/kit for Builder PDA reads
 *
 * @version 1.0.0
 * @status STUB - Not yet implemented
 */

'use strict';

// ============================================
// PHI CONSTANTS (Used for XP calculations)
// ============================================

const PHI = 1.618033988749895;
const PHI_INVERSE = 0.618033988749895;

// ============================================
// BUILDER PDA SCHEMA (Future on-chain structure)
// ============================================

/**
 * Builder PDA structure (matches Anchor program)
 * @typedef {Object} BuilderPDA
 * @property {string} wallet - Owner's wallet pubkey
 * @property {number} xpTotal - Lifetime XP earned
 * @property {number} xpAvailable - Unburned XP (spendable)
 * @property {Object} tracksProgress - Progress per track (0-100%)
 * @property {number[]} skillsCompleted - Array of completed skill IDs
 * @property {number} totalBurned - Lifetime ASDF burned
 * @property {number} streak - Current streak days
 * @property {number} joinedAt - Timestamp
 * @property {number} lastActive - Timestamp
 */

// ============================================
// MOCK DATA (For development without wallet)
// ============================================

const MOCK_BUILDER = {
  wallet: null,
  xpTotal: 0,
  xpAvailable: 0,
  tracksProgress: {
    dev: 0,
    games: 0,
    content: 0
  },
  skillsCompleted: [],
  totalBurned: 0,
  streak: 0,
  joinedAt: null,
  lastActive: null
};

// ============================================
// LOCAL STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  BUILDER_PROFILE: 'asdf_builder_profile',
  PROGRESS: 'asdf_build_progress',
  COMPLETED_LESSONS: 'asdf_completed_lessons',
  XP: 'asdf_xp',
  STREAK: 'asdf_streak'
};

// ============================================
// SOLANA CLIENT (STUB)
// ============================================

const SolanaClient = {
  /**
   * Connection status
   */
  _connected: false,
  _wallet: null,
  _rpcEndpoint: null,

  /**
   * Initialize client (stub)
   * @param {Object} config
   * @param {string} config.rpcEndpoint - Helius RPC endpoint
   */
  async init(config = {}) {
    this._rpcEndpoint = config.rpcEndpoint || 'https://mainnet.helius-rpc.com';
    console.log('[SolanaClient] Initialized (stub mode)');
    return true;
  },

  /**
   * Check if wallet is connected
   * @returns {boolean}
   */
  isConnected() {
    return this._connected && this._wallet !== null;
  },

  /**
   * Get connected wallet address
   * @returns {string|null}
   */
  getWalletAddress() {
    return this._wallet;
  },

  /**
   * Connect wallet (stub - will integrate with wallet-standard)
   * @returns {Promise<string|null>}
   */
  async connectWallet() {
    // Future: Integrate with wallet-standard
    console.log('[SolanaClient] Wallet connection not implemented (stub)');
    return null;
  },

  /**
   * Disconnect wallet
   */
  async disconnectWallet() {
    this._connected = false;
    this._wallet = null;
    console.log('[SolanaClient] Wallet disconnected');
  },

  // ============================================
  // BUILDER PDA OPERATIONS (STUBS)
  // ============================================

  /**
   * Get Builder PDA for wallet
   * @param {string} wallet - Wallet pubkey
   * @returns {Promise<BuilderPDA|null>}
   */
  async getBuilderPDA(wallet) {
    // Future: Fetch from Solana using @solana/kit
    // const program = getProgram('asdf-builder');
    // const [pda] = findProgramAddressSync([Buffer.from('builder'), wallet.toBuffer()], programId);
    // return await program.account.builder.fetch(pda);

    console.log('[SolanaClient] getBuilderPDA not implemented (stub)');

    // Return localStorage data if available
    return this._getLocalBuilderData(wallet);
  },

  /**
   * Check if Builder PDA exists
   * @param {string} wallet
   * @returns {Promise<boolean>}
   */
  async builderPDAExists(wallet) {
    // Future: Check on-chain
    const data = this._getLocalBuilderData(wallet);
    return data !== null && data.joinedAt !== null;
  },

  /**
   * Initialize Builder PDA (stub)
   * @param {string} wallet
   * @returns {Promise<boolean>}
   */
  async initializeBuilderPDA(wallet) {
    // Future: Create on-chain PDA
    console.log('[SolanaClient] initializeBuilderPDA not implemented (stub)');

    // Initialize in localStorage for now
    const builder = {
      ...MOCK_BUILDER,
      wallet,
      joinedAt: Date.now(),
      lastActive: Date.now()
    };

    this._saveLocalBuilderData(wallet, builder);
    return true;
  },

  /**
   * Update builder progress (stub)
   * @param {string} wallet
   * @param {Object} progress
   * @returns {Promise<boolean>}
   */
  async updateProgress(wallet, progress) {
    // Future: Write to on-chain PDA
    console.log('[SolanaClient] updateProgress not implemented (stub)');

    const builder = await this.getBuilderPDA(wallet) || { ...MOCK_BUILDER, wallet };
    const updated = {
      ...builder,
      ...progress,
      lastActive: Date.now()
    };

    this._saveLocalBuilderData(wallet, updated);
    return true;
  },

  /**
   * Add XP to builder (stub)
   * @param {string} wallet
   * @param {number} amount
   * @param {string} source - Source of XP (lesson, quest, etc.)
   * @returns {Promise<number>} - New total XP
   */
  async addXP(wallet, amount, source = 'unknown') {
    const builder = await this.getBuilderPDA(wallet) || { ...MOCK_BUILDER, wallet };

    // Apply streak bonus
    const streakBonus = this._calculateStreakBonus(builder.streak);
    const finalXP = Math.floor(amount * (1 + streakBonus));

    const updated = {
      ...builder,
      xpTotal: builder.xpTotal + finalXP,
      xpAvailable: builder.xpAvailable + finalXP,
      lastActive: Date.now()
    };

    this._saveLocalBuilderData(wallet, updated);
    console.log(`[SolanaClient] Added ${finalXP} XP (${amount} base + ${Math.floor(streakBonus * 100)}% streak bonus)`);

    return updated.xpTotal;
  },

  /**
   * Complete a lesson (stub)
   * @param {string} wallet
   * @param {string} trackId
   * @param {string} moduleId
   * @param {string} lessonId
   * @param {number} xpReward
   * @returns {Promise<boolean>}
   */
  async completeLesson(wallet, trackId, moduleId, lessonId, xpReward) {
    const builder = await this.getBuilderPDA(wallet) || { ...MOCK_BUILDER, wallet };

    // Check if already completed
    const completedKey = `${trackId}:${moduleId}:${lessonId}`;
    const completed = this._getCompletedLessons(wallet);

    if (completed.includes(completedKey)) {
      console.log('[SolanaClient] Lesson already completed');
      return false;
    }

    // Add XP
    await this.addXP(wallet, xpReward, `lesson:${lessonId}`);

    // Mark as completed
    completed.push(completedKey);
    this._saveCompletedLessons(wallet, completed);

    console.log(`[SolanaClient] Completed lesson: ${completedKey}`);
    return true;
  },

  // ============================================
  // STREAK CALCULATIONS
  // ============================================

  /**
   * Calculate streak bonus using phi-based formula
   * @param {number} streakDays
   * @returns {number} - Bonus multiplier (0 to 0.618)
   */
  _calculateStreakBonus(streakDays) {
    if (streakDays <= 1) return 0;
    const bonus = Math.pow(PHI, streakDays / 7) - 1;
    return Math.min(bonus, PHI_INVERSE); // Cap at 61.8%
  },

  /**
   * Update streak (call daily)
   * @param {string} wallet
   * @returns {Promise<number>} - New streak value
   */
  async updateStreak(wallet) {
    const builder = await this.getBuilderPDA(wallet) || { ...MOCK_BUILDER, wallet };

    const now = Date.now();
    const lastActive = builder.lastActive || 0;
    const daysSinceLastActive = Math.floor((now - lastActive) / (24 * 60 * 60 * 1000));

    let newStreak = builder.streak;

    if (daysSinceLastActive === 0) {
      // Same day - no change
    } else if (daysSinceLastActive === 1) {
      // Consecutive day - increment streak
      newStreak++;
    } else {
      // Streak broken - reset
      newStreak = 1;
    }

    const updated = {
      ...builder,
      streak: newStreak,
      lastActive: now
    };

    this._saveLocalBuilderData(wallet, updated);
    return newStreak;
  },

  // ============================================
  // LOCAL STORAGE HELPERS
  // ============================================

  /**
   * Get builder data from localStorage
   * @param {string} wallet
   * @returns {Object|null}
   */
  _getLocalBuilderData(wallet) {
    try {
      const key = `${STORAGE_KEYS.BUILDER_PROFILE}_${wallet || 'anonymous'}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[SolanaClient] Error reading localStorage:', e);
      return null;
    }
  },

  /**
   * Save builder data to localStorage
   * @param {string} wallet
   * @param {Object} data
   */
  _saveLocalBuilderData(wallet, data) {
    try {
      const key = `${STORAGE_KEYS.BUILDER_PROFILE}_${wallet || 'anonymous'}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('[SolanaClient] Error writing localStorage:', e);
    }
  },

  /**
   * Get completed lessons from localStorage
   * @param {string} wallet
   * @returns {string[]}
   */
  _getCompletedLessons(wallet) {
    try {
      const key = `${STORAGE_KEYS.COMPLETED_LESSONS}_${wallet || 'anonymous'}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Save completed lessons to localStorage
   * @param {string} wallet
   * @param {string[]} lessons
   */
  _saveCompletedLessons(wallet, lessons) {
    try {
      const key = `${STORAGE_KEYS.COMPLETED_LESSONS}_${wallet || 'anonymous'}`;
      localStorage.setItem(key, JSON.stringify(lessons));
    } catch (e) {
      console.error('[SolanaClient] Error saving completed lessons:', e);
    }
  },

  // ============================================
  // MIGRATION (Future)
  // ============================================

  /**
   * Migrate localStorage data to on-chain PDA
   * Called when user connects wallet for first time
   * @param {string} wallet
   * @returns {Promise<boolean>}
   */
  async migrateToOnChain(wallet) {
    // Future: Read localStorage, write to PDA, clear localStorage
    console.log('[SolanaClient] migrateToOnChain not implemented (stub)');
    return false;
  }
};

// Export
export { SolanaClient, PHI, PHI_INVERSE };
export default SolanaClient;

// Global export for browser
if (typeof window !== 'undefined') {
  window.SolanaClient = SolanaClient;
}
