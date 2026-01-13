/**
 * ASDF Games - State Management & Wallet
 * Security: isHolder and balance are NEVER trusted from localStorage
 * They are always re-verified via on-chain balance check on wallet connect
 */

'use strict';

const GOTW_STORAGE_KEY = 'asdf_gotw_v2'; // Bumped version for new format
const GOTW_INTEGRITY_KEY = 'asdf_gotw_integrity';

const appState = {
  wallet: null,
  isHolder: false, // SECURITY: Never trust from localStorage, always verify on-chain
  balance: 0, // SECURITY: Never trust from localStorage, always verify on-chain
  practiceScores: {},
  competitiveScores: {},
  // Competitive time tracking (30min daily limit)
  competitiveTimeUsed: 0, // Time used today in ms
  competitiveTimeDate: null, // Date string for daily reset check
  competitiveSessionStart: null, // Timestamp when current session started (null if not in session)
};

// Competitive mode constants
const DAILY_COMPETITIVE_LIMIT = 30 * 60 * 1000; // 30 minutes in ms

// Track active game modes (practice/competitive) - shared between ui.js and engine.js
const activeGameModes = {};

let testMode = false;

// ============================================
// AUTHENTICATION STATE
// ============================================

// Note: JWT is now stored in httpOnly cookie (not accessible via JavaScript)
// Authentication state is tracked by ApiClient.isAuthenticated()
// Server is the source of truth for authentication

function toggleDevMode() {
  testMode = !testMode;
  const btn = document.getElementById('dev-mode-btn');
  if (btn) {
    btn.classList.toggle('active', testMode);
    btn.textContent = testMode ? 'DEV ON' : 'DEV';
  }
  updateAccessUI();
  renderGamesGrid();
}

// ============================================
// INTEGRITY CHECKING
// ============================================

/**
 * Generate a simple hash for integrity checking
 * Note: This is not cryptographically secure, just a deterrent
 * Real security comes from server-side verification
 */
function generateStateHash(data) {
  const str = JSON.stringify({
    wallet: data.wallet,
    practiceScores: data.practiceScores,
    // Intentionally exclude isHolder and balance - they're verified on-chain
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add browser fingerprint to make cross-browser tampering harder
  const fp = navigator.userAgent.length + screen.width + screen.height;
  return ((hash ^ fp) >>> 0).toString(36);
}

/**
 * Verify state integrity
 */
function verifyStateIntegrity(data) {
  try {
    const storedHash = localStorage.getItem(GOTW_INTEGRITY_KEY);
    if (!storedHash) return true; // First run, no hash yet
    const currentHash = generateStateHash(data);
    return storedHash === currentHash;
  } catch {
    return false;
  }
}

/**
 * Validate state schema to prevent tampering
 */
function validateStateSchema(data) {
  if (typeof data !== 'object' || data === null) return false;
  if (data.wallet !== null && typeof data.wallet !== 'string') return false;
  if (typeof data.isHolder !== 'boolean') return false;
  if (typeof data.balance !== 'number' || !Number.isFinite(data.balance) || data.balance < 0)
    return false;
  if (typeof data.practiceScores !== 'object' || data.practiceScores === null) return false;
  if (typeof data.competitiveScores !== 'object' || data.competitiveScores === null) return false;

  for (const [key, value] of Object.entries(data.practiceScores)) {
    if (!VALID_GAME_IDS.has(key) || typeof value !== 'number' || !Number.isFinite(value))
      return false;
  }
  for (const [key, value] of Object.entries(data.competitiveScores)) {
    if (!VALID_GAME_IDS.has(key) || typeof value !== 'number' || !Number.isFinite(value))
      return false;
  }

  // Validate competitive time tracking fields (optional for backwards compatibility)
  if (data.competitiveTimeUsed !== undefined) {
    if (
      typeof data.competitiveTimeUsed !== 'number' ||
      !Number.isFinite(data.competitiveTimeUsed) ||
      data.competitiveTimeUsed < 0
    )
      return false;
  }
  if (data.competitiveTimeDate !== undefined && data.competitiveTimeDate !== null) {
    if (typeof data.competitiveTimeDate !== 'string') return false;
  }
  if (data.competitiveSessionStart !== undefined && data.competitiveSessionStart !== null) {
    if (
      typeof data.competitiveSessionStart !== 'number' ||
      !Number.isFinite(data.competitiveSessionStart)
    )
      return false;
  }

  // Validate wallet address format if present
  if (data.wallet && !isValidSolanaAddress(data.wallet)) {
    return false;
  }

  return true;
}

function loadState() {
  try {
    const saved = localStorage.getItem(GOTW_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (validateStateSchema({ ...appState, ...parsed })) {
        // Verify integrity
        if (!verifyStateIntegrity(parsed)) {
          console.warn('State integrity check failed, resetting sensitive data');
          // Reset potentially tampered data but keep safe data
          appState.wallet = parsed.wallet;
          appState.practiceScores = {};
          appState.competitiveScores = {};
          // isHolder and balance will be verified on-chain
          appState.isHolder = false;
          appState.balance = 0;
          saveState();
        } else {
          // SECURITY: Only load wallet and scores from localStorage
          // isHolder and balance are ALWAYS set to false/0 and verified on-chain
          appState.wallet = parsed.wallet;
          appState.practiceScores = parsed.practiceScores || {};
          appState.competitiveScores = parsed.competitiveScores || {};
          // Load competitive time tracking
          appState.competitiveTimeUsed = parsed.competitiveTimeUsed || 0;
          appState.competitiveTimeDate = parsed.competitiveTimeDate || null;
          appState.competitiveSessionStart = parsed.competitiveSessionStart || null;
          // These are intentionally NOT loaded from storage
          appState.isHolder = false;
          appState.balance = 0;
        }
      } else {
        console.warn('Invalid state schema, using defaults');
        localStorage.removeItem(GOTW_STORAGE_KEY);
        localStorage.removeItem(GOTW_INTEGRITY_KEY);
      }
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
    localStorage.removeItem(GOTW_STORAGE_KEY);
    localStorage.removeItem(GOTW_INTEGRITY_KEY);
  }
}

function saveState() {
  try {
    // Only save non-sensitive data
    const safeState = {
      wallet: appState.wallet,
      isHolder: false, // Never persist - always verify on-chain
      balance: 0, // Never persist - always verify on-chain
      practiceScores: appState.practiceScores,
      competitiveScores: appState.competitiveScores,
      // Competitive time tracking
      competitiveTimeUsed: appState.competitiveTimeUsed,
      competitiveTimeDate: appState.competitiveTimeDate,
      competitiveSessionStart: appState.competitiveSessionStart,
    };
    localStorage.setItem(GOTW_STORAGE_KEY, JSON.stringify(safeState));
    // Save integrity hash
    localStorage.setItem(GOTW_INTEGRITY_KEY, generateStateHash(safeState));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

// ============================================
// WALLET CONNECTION (PHANTOM)
// ============================================

function getPhantomProvider() {
  if ('phantom' in window) {
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  return null;
}

async function handleWalletClick() {
  if (appState.wallet) {
    await disconnectWallet();
  } else {
    await connectWallet();
  }
}

async function connectWallet() {
  try {
    const provider = getPhantomProvider();
    if (!provider) {
      alert('Please install Phantom wallet to connect.\n\nhttps://phantom.app/');
      return;
    }

    const response = await provider.connect();
    const publicKey = response.publicKey.toString();

    appState.wallet = publicKey;
    saveState();

    updateWalletUI(publicKey);
    await checkTokenBalance(publicKey);
  } catch (error) {
    console.error('Wallet connection failed:', error);
    if (error.code === 4001) {
      return;
    }
    alert('Failed to connect wallet. Please try again.');
  }
}

async function disconnectWallet() {
  try {
    const provider = getPhantomProvider();
    if (provider) {
      await provider.disconnect();
    }
  } catch (e) {
    console.warn('Disconnect error:', e);
  }

  // End any active competitive session
  endCompetitiveSession();

  appState.wallet = null;
  appState.isHolder = false;
  appState.balance = 0;
  saveState();

  updateWalletUI(null);
  updateAccessUI();
  renderGamesGrid();
}

/**
 * Check token balance via API (not direct RPC)
 * SECURITY: Balance and isHolder are verified server-side via Helius RPC
 * This prevents client-side spoofing of holder status
 */
async function checkTokenBalance(publicKey) {
  try {
    if (!isValidSolanaAddress(publicKey)) {
      console.warn('Invalid Solana address format');
      return;
    }

    if (!RateLimiter.canMakeCall('api-balance')) {
      console.warn('Rate limited - please wait before checking balance again');
      return;
    }

    // Use API endpoint instead of direct RPC call
    // The API uses Helius RPC with proper rate limiting and caching
    const response = await fetch(`${CONFIG.API_BASE}/ecosystem/stats`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    // For authenticated balance, use the API with httpOnly cookie auth
    // Cookie is automatically included via credentials: 'include'
    if (ApiClient.isAuthenticated()) {
      // Use authenticated endpoint for verified balance
      const profileResponse = await fetch(`${CONFIG.API_BASE}/user/profile`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include', // Include httpOnly cookie
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        appState.balance = profile.balance || 0;
        appState.isHolder = profile.isHolder || false;
      } else {
        // Session invalid on server, update local state
        ApiClient.setAuthenticated(false);
        appState.balance = 0;
        appState.isHolder = false;
      }
    } else {
      // Not authenticated - user needs to authenticate for verified holder status
      // For display only, show 0 balance until authenticated
      appState.balance = 0;
      appState.isHolder = false;
    }

    saveState();
    updateAccessUI();
    renderGamesGrid();
  } catch (error) {
    console.error('Failed to check token balance:', error);
    appState.balance = 0;
    appState.isHolder = false;
    updateAccessUI();
    renderGamesGrid();
  }
}

function updateWalletUI(publicKey) {
  const btn = document.getElementById('wallet-btn');
  const btnText = document.getElementById('wallet-btn-text');
  const badge = document.getElementById('user-badge');

  if (publicKey && typeof publicKey === 'string' && publicKey.length >= 8) {
    btn.classList.add('connected');
    btnText.textContent = '';
    const addrSpan = document.createElement('span');
    addrSpan.className = 'wallet-address';
    addrSpan.textContent = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
    btnText.appendChild(addrSpan);
    badge.className = appState.isHolder ? 'holder-badge' : 'visitor-badge';
    badge.textContent = appState.isHolder ? 'HOLDER' : 'CONNECTED';
  } else {
    btn.classList.remove('connected');
    btnText.textContent = 'Connect Wallet';
    badge.className = 'visitor-badge';
    badge.textContent = 'VISITOR';
  }
}

function updateAccessUI() {
  const accessAll = document.getElementById('access-all');
  const hasFullAccess = appState.isHolder || testMode;

  if (hasFullAccess) {
    accessAll.classList.remove('locked');
    accessAll.classList.add('unlocked');
    accessAll.querySelector('strong').textContent = testMode ? 'Test Mode' : 'Unlocked';
  } else {
    accessAll.classList.add('locked');
    accessAll.classList.remove('unlocked');
    accessAll.querySelector('strong').textContent = 'Holders Only';
  }
}

// ============================================
// COMPETITIVE TIME TRACKING (30min/day limit)
// ============================================

/**
 * Check if it's a new day and reset competitive time if needed
 */
function checkDailyReset() {
  const today = new Date().toDateString();
  if (appState.competitiveTimeDate !== today) {
    appState.competitiveTimeUsed = 0;
    appState.competitiveTimeDate = today;
    appState.competitiveSessionStart = null;
    saveState();
  }
}

/**
 * Get remaining competitive time in milliseconds
 * Accounts for any active session in progress
 */
function getCompetitiveTimeRemaining() {
  checkDailyReset();
  let used = appState.competitiveTimeUsed;
  if (appState.competitiveSessionStart) {
    used += Date.now() - appState.competitiveSessionStart;
  }
  return Math.max(0, DAILY_COMPETITIVE_LIMIT - used);
}

/**
 * Start a competitive session (begins counting time)
 * @returns {boolean} true if session started, false if time exhausted
 */
function startCompetitiveSession() {
  checkDailyReset();

  if (appState.competitiveTimeUsed >= DAILY_COMPETITIVE_LIMIT) {
    return false; // Time exhausted
  }

  if (!appState.competitiveSessionStart) {
    appState.competitiveSessionStart = Date.now();
    saveState();
  }
  return true;
}

/**
 * End the current competitive session (stop counting time)
 */
function endCompetitiveSession() {
  if (appState.competitiveSessionStart) {
    appState.competitiveTimeUsed += Date.now() - appState.competitiveSessionStart;
    appState.competitiveSessionStart = null;
    // Clamp to max limit
    appState.competitiveTimeUsed = Math.min(appState.competitiveTimeUsed, DAILY_COMPETITIVE_LIMIT);
    saveState();
  }
}

/**
 * Check if player can access competitive mode for a specific game
 * @param {string} gameId - The game ID to check
 * @returns {boolean} true if competitive mode is available
 */
function canPlayCompetitive(gameId) {
  // No wallet = no competitive
  if (!appState.wallet && !testMode) return false;

  // Time exhausted = no competitive
  if (getCompetitiveTimeRemaining() <= 0) return false;

  // Get current featured game
  const currentGame = getCurrentGame();
  const isFeatured = gameId === currentGame.id;

  // Wallet connected = featured game only
  // Holder 1M+ or testMode = all games
  return isFeatured || appState.isHolder || testMode;
}

/**
 * Format remaining time as MM:SS
 * @returns {string} Formatted time string
 */
function formatCompetitiveTimeRemaining() {
  const remaining = getCompetitiveTimeRemaining();
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
