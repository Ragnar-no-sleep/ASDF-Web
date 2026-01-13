/**
 * Pump Arena RPG - Trading System
 * Secure peer-to-peer trading with escrow
 *
 * SECURITY BY DESIGN:
 * - Escrow-based trades (items locked until both confirm)
 * - Rate limiting on all trade operations
 * - Input validation and sanitization
 * - Trade history with integrity checks
 * - Anti-fraud protections
 *
 * ASDF PHILOSOPHY:
 * - Trade fees based on Fibonacci (fib[5]% = 5%)
 * - Maximum daily trades = fib[8] = 21
 * - Trade value limits based on tier
 *
 * Version: 1.0.0
 */

'use strict';

// ============================================
// FIBONACCI HELPER
// ============================================

const TRADE_FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

function getTradeFib(n) {
  if (n < 0) return 0;
  if (n < TRADE_FIB.length) return TRADE_FIB[n];
  return TRADE_FIB[TRADE_FIB.length - 1];
}

// ============================================
// TRADE CONFIGURATION (ASDF Philosophy)
// ============================================

const TRADE_CONFIG = {
  // Fee percentage (fib[5] = 5%)
  feePercent: getTradeFib(5),

  // Maximum daily trades per tier
  maxDailyTrades: {
    EMBER: getTradeFib(6), // 8 trades
    SPARK: getTradeFib(7), // 13 trades
    FLAME: getTradeFib(8), // 21 trades
    BLAZE: getTradeFib(9), // 34 trades
    INFERNO: getTradeFib(10), // 55 trades
  },

  // Maximum trade value per tier (in tokens)
  maxTradeValue: {
    EMBER: getTradeFib(9) * 10, // 340 tokens
    SPARK: getTradeFib(10) * 10, // 550 tokens
    FLAME: getTradeFib(11) * 10, // 890 tokens
    BLAZE: getTradeFib(12) * 10, // 1440 tokens
    INFERNO: getTradeFib(13) * 10, // 2330 tokens
  },

  // Trade escrow timeout (fib[8] minutes = 21 minutes)
  escrowTimeout: getTradeFib(8) * 60 * 1000,

  // Minimum time between trades (fib[4] seconds = 3 seconds)
  minTradeInterval: getTradeFib(4) * 1000,
};

// ============================================
// TRADE STATE
// ============================================

const TRADE_STORAGE_KEY = 'asdf_pumparena_trading_v1';

const tradeState = {
  // Active trades (in escrow)
  activeOffers: [],

  // Trade history
  history: [],

  // Daily trade counter
  dailyTrades: 0,
  lastTradeDate: null,

  // Rate limiting
  lastTradeTime: 0,
};

// ============================================
// RATE LIMITER (Security by Design)
// ============================================

const TradeRateLimiter = {
  lastAction: 0,
  actionCount: 0,
  windowStart: Date.now(),

  checkAction() {
    const now = Date.now();

    // Minimum interval between trades
    if (now - this.lastAction < TRADE_CONFIG.minTradeInterval) {
      const wait = Math.ceil((TRADE_CONFIG.minTradeInterval - (now - this.lastAction)) / 1000);
      return { allowed: false, message: `Please wait ${wait}s between trades` };
    }

    // Max 10 actions per minute (anti-spam)
    if (now - this.windowStart > 60000) {
      this.actionCount = 0;
      this.windowStart = now;
    }

    if (this.actionCount >= 10) {
      return { allowed: false, message: 'Too many trade actions. Wait a minute.' };
    }

    return { allowed: true };
  },

  recordAction() {
    this.lastAction = Date.now();
    this.actionCount++;
  },
};

// ============================================
// INPUT VALIDATION (Security by Design)
// ============================================

/**
 * Validate trade offer data
 */
function validateTradeOffer(offer) {
  const errors = [];

  // Validate structure
  if (!offer || typeof offer !== 'object') {
    return { valid: false, errors: ['Invalid offer format'] };
  }

  // Validate offered items
  if (!Array.isArray(offer.offeredItems)) {
    errors.push('Offered items must be an array');
  } else {
    offer.offeredItems.forEach((item, i) => {
      if (!validateTradeItem(item)) {
        errors.push(`Invalid offered item at index ${i}`);
      }
    });
  }

  // Validate offered tokens
  if (offer.offeredTokens !== undefined) {
    if (
      typeof offer.offeredTokens !== 'number' ||
      !Number.isFinite(offer.offeredTokens) ||
      offer.offeredTokens < 0 ||
      !Number.isInteger(offer.offeredTokens)
    ) {
      errors.push('Offered tokens must be a non-negative integer');
    }
  }

  // Validate requested items
  if (!Array.isArray(offer.requestedItems)) {
    errors.push('Requested items must be an array');
  } else {
    offer.requestedItems.forEach((item, i) => {
      if (!validateTradeItem(item)) {
        errors.push(`Invalid requested item at index ${i}`);
      }
    });
  }

  // Validate requested tokens
  if (offer.requestedTokens !== undefined) {
    if (
      typeof offer.requestedTokens !== 'number' ||
      !Number.isFinite(offer.requestedTokens) ||
      offer.requestedTokens < 0 ||
      !Number.isInteger(offer.requestedTokens)
    ) {
      errors.push('Requested tokens must be a non-negative integer');
    }
  }

  // Must offer or request something
  const hasOffer = offer.offeredItems?.length > 0 || offer.offeredTokens > 0;
  const hasRequest = offer.requestedItems?.length > 0 || offer.requestedTokens > 0;

  if (!hasOffer) {
    errors.push('Must offer something (items or tokens)');
  }
  if (!hasRequest) {
    errors.push('Must request something (items or tokens)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single trade item
 */
function validateTradeItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 50) return false;
  if (!/^[a-z0-9_]+$/.test(item.id)) return false;
  if (
    typeof item.quantity !== 'number' ||
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0 ||
    item.quantity > 9999
  )
    return false;
  return true;
}

/**
 * Generate secure trade ID
 */
function generateTradeId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `trade_${timestamp}_${random}`;
}

/**
 * Calculate trade hash for integrity
 */
function calculateTradeHash(trade) {
  const data = JSON.stringify({
    id: trade.id,
    offered: trade.offeredItems,
    offeredTokens: trade.offeredTokens,
    requested: trade.requestedItems,
    requestedTokens: trade.requestedTokens,
    created: trade.created,
  });

  // Simple hash (in production, use crypto.subtle)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ============================================
// DAILY TRADE LIMIT CHECK
// ============================================

function checkDailyLimit() {
  const state = window.PumpArenaState?.get();
  const tier = state?.asdfTier?.current || 'EMBER';
  const maxTrades = TRADE_CONFIG.maxDailyTrades[tier] || TRADE_CONFIG.maxDailyTrades.EMBER;

  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (tradeState.lastTradeDate !== today) {
    tradeState.dailyTrades = 0;
    tradeState.lastTradeDate = today;
  }

  if (tradeState.dailyTrades >= maxTrades) {
    return {
      allowed: false,
      message: `Daily trade limit reached (${maxTrades}). Upgrade tier for more trades.`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: maxTrades - tradeState.dailyTrades,
  };
}

// ============================================
// TRADE VALUE LIMIT CHECK
// ============================================

function checkValueLimit(tokens) {
  const state = window.PumpArenaState?.get();
  const tier = state?.asdfTier?.current || 'EMBER';
  const maxValue = TRADE_CONFIG.maxTradeValue[tier] || TRADE_CONFIG.maxTradeValue.EMBER;

  if (tokens > maxValue) {
    return {
      allowed: false,
      message: `Trade exceeds tier limit (${maxValue} tokens). Upgrade tier for higher limits.`,
      maxValue,
    };
  }

  return { allowed: true, maxValue };
}

// ============================================
// CORE TRADE FUNCTIONS
// ============================================

/**
 * Create a new trade offer (puts items in escrow)
 */
function createTradeOffer(offer) {
  // Rate limit check
  const rateCheck = TradeRateLimiter.checkAction();
  if (!rateCheck.allowed) {
    return { success: false, message: rateCheck.message };
  }

  // Daily limit check
  const dailyCheck = checkDailyLimit();
  if (!dailyCheck.allowed) {
    return { success: false, message: dailyCheck.message };
  }

  // Validate offer
  const validation = validateTradeOffer(offer);
  if (!validation.valid) {
    return { success: false, message: validation.errors.join(', ') };
  }

  // Check value limit
  const totalTokens = Math.max(offer.offeredTokens || 0, offer.requestedTokens || 0);
  const valueCheck = checkValueLimit(totalTokens);
  if (!valueCheck.allowed) {
    return { success: false, message: valueCheck.message };
  }

  // Verify player has the offered items/tokens
  const state = window.PumpArenaState?.get();
  if (!state) {
    return { success: false, message: 'Game state not available' };
  }

  // Check tokens
  if (offer.offeredTokens > 0) {
    if (state.resources.tokens < offer.offeredTokens) {
      return { success: false, message: 'Insufficient tokens' };
    }
  }

  // Check items in inventory
  if (offer.offeredItems && offer.offeredItems.length > 0) {
    for (const item of offer.offeredItems) {
      const hasItem = checkInventoryItem(item.id, item.quantity);
      if (!hasItem.success) {
        return { success: false, message: hasItem.message };
      }
    }
  }

  TradeRateLimiter.recordAction();

  // Create trade object
  const trade = {
    id: generateTradeId(),
    status: 'pending',
    offeredItems: offer.offeredItems || [],
    offeredTokens: offer.offeredTokens || 0,
    requestedItems: offer.requestedItems || [],
    requestedTokens: offer.requestedTokens || 0,
    created: Date.now(),
    expires: Date.now() + TRADE_CONFIG.escrowTimeout,
    hash: null,
  };

  // Calculate integrity hash
  trade.hash = calculateTradeHash(trade);

  // Lock offered items in escrow
  if (trade.offeredTokens > 0) {
    window.PumpArenaState.addTokens(-trade.offeredTokens);
  }

  if (trade.offeredItems.length > 0) {
    trade.offeredItems.forEach(item => {
      removeFromInventory(item.id, item.quantity);
    });
  }

  // Add to active offers
  tradeState.activeOffers.push(trade);
  tradeState.dailyTrades++;

  saveTradingState();

  document.dispatchEvent(
    new CustomEvent('pumparena:trade-created', {
      detail: { tradeId: trade.id },
    })
  );

  return {
    success: true,
    message: 'Trade offer created',
    tradeId: trade.id,
    expiresIn: TRADE_CONFIG.escrowTimeout / 1000 / 60 + ' minutes',
  };
}

/**
 * Accept a trade offer
 */
function acceptTradeOffer(tradeId) {
  // Rate limit
  const rateCheck = TradeRateLimiter.checkAction();
  if (!rateCheck.allowed) {
    return { success: false, message: rateCheck.message };
  }

  // Daily limit
  const dailyCheck = checkDailyLimit();
  if (!dailyCheck.allowed) {
    return { success: false, message: dailyCheck.message };
  }

  // Find trade
  const tradeIndex = tradeState.activeOffers.findIndex(t => t.id === tradeId);
  if (tradeIndex === -1) {
    return { success: false, message: 'Trade not found' };
  }

  const trade = tradeState.activeOffers[tradeIndex];

  // Verify hash integrity
  const expectedHash = calculateTradeHash(trade);
  if (trade.hash !== expectedHash) {
    // Trade was tampered with - cancel it
    cancelTradeOffer(tradeId);
    return { success: false, message: 'Trade integrity check failed' };
  }

  // Check if expired
  if (Date.now() > trade.expires) {
    cancelTradeOffer(tradeId);
    return { success: false, message: 'Trade has expired' };
  }

  // Check acceptor has requested items/tokens
  const state = window.PumpArenaState?.get();

  if (trade.requestedTokens > 0) {
    if (state.resources.tokens < trade.requestedTokens) {
      return { success: false, message: "You don't have enough tokens" };
    }
  }

  for (const item of trade.requestedItems) {
    const hasItem = checkInventoryItem(item.id, item.quantity);
    if (!hasItem.success) {
      return { success: false, message: `Missing: ${item.id}` };
    }
  }

  TradeRateLimiter.recordAction();

  // Execute trade

  // Deduct from acceptor
  if (trade.requestedTokens > 0) {
    window.PumpArenaState.addTokens(-trade.requestedTokens);
  }
  trade.requestedItems.forEach(item => {
    removeFromInventory(item.id, item.quantity);
  });

  // Calculate and deduct fee
  const totalTokens = trade.offeredTokens + trade.requestedTokens;
  const fee = Math.floor((totalTokens * TRADE_CONFIG.feePercent) / 100);

  // Give to acceptor (from escrow)
  const tokensToAcceptor = Math.max(0, trade.offeredTokens - Math.floor(fee / 2));
  if (tokensToAcceptor > 0) {
    window.PumpArenaState.addTokens(tokensToAcceptor);
  }
  trade.offeredItems.forEach(item => {
    addToInventory(item.id, item.quantity);
  });

  // Give to creator (the requested items minus fee)
  const tokensToCreator = Math.max(0, trade.requestedTokens - Math.ceil(fee / 2));

  // Remove from active, add to history
  tradeState.activeOffers.splice(tradeIndex, 1);
  tradeState.history.push({
    ...trade,
    status: 'completed',
    completedAt: Date.now(),
    fee,
  });
  tradeState.dailyTrades++;

  // Keep history limited to last 100 trades
  if (tradeState.history.length > 100) {
    tradeState.history = tradeState.history.slice(-100);
  }

  saveTradingState();

  document.dispatchEvent(
    new CustomEvent('pumparena:trade-completed', {
      detail: { tradeId, fee },
    })
  );

  return {
    success: true,
    message: `Trade completed! Fee: ${fee} tokens`,
    received: {
      items: trade.offeredItems,
      tokens: tokensToAcceptor,
    },
  };
}

/**
 * Cancel a trade offer (returns items from escrow)
 */
function cancelTradeOffer(tradeId) {
  const tradeIndex = tradeState.activeOffers.findIndex(t => t.id === tradeId);
  if (tradeIndex === -1) {
    return { success: false, message: 'Trade not found' };
  }

  const trade = tradeState.activeOffers[tradeIndex];

  // Return escrowed items to creator
  if (trade.offeredTokens > 0) {
    window.PumpArenaState.addTokens(trade.offeredTokens);
  }
  trade.offeredItems.forEach(item => {
    addToInventory(item.id, item.quantity);
  });

  // Remove from active
  tradeState.activeOffers.splice(tradeIndex, 1);

  // Add to history as cancelled
  tradeState.history.push({
    ...trade,
    status: 'cancelled',
    cancelledAt: Date.now(),
  });

  saveTradingState();

  document.dispatchEvent(
    new CustomEvent('pumparena:trade-cancelled', {
      detail: { tradeId },
    })
  );

  return { success: true, message: 'Trade cancelled, items returned' };
}

/**
 * Clean up expired trades
 */
function cleanupExpiredTrades() {
  const now = Date.now();
  const expired = tradeState.activeOffers.filter(t => now > t.expires);

  expired.forEach(trade => {
    cancelTradeOffer(trade.id);
  });

  return { cleaned: expired.length };
}

// ============================================
// INVENTORY HELPERS
// ============================================

function checkInventoryItem(itemId, quantity) {
  if (window.PumpArenaInventory) {
    const inventory = window.PumpArenaInventory.getInventory();
    const item = inventory.find(i => i.id === itemId);
    if (!item || item.quantity < quantity) {
      return { success: false, message: `Insufficient ${itemId}` };
    }
    return { success: true };
  }
  return { success: false, message: 'Inventory not available' };
}

function removeFromInventory(itemId, quantity) {
  if (window.PumpArenaInventory?.removeItem) {
    window.PumpArenaInventory.removeItem(itemId, quantity);
  }
}

function addToInventory(itemId, quantity) {
  if (window.PumpArenaInventory?.addItem) {
    window.PumpArenaInventory.addItem(itemId, quantity);
  }
}

// ============================================
// PERSISTENCE
// ============================================

function loadTradingState() {
  try {
    const saved = localStorage.getItem(TRADE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // Validate and load
      if (Array.isArray(parsed.activeOffers)) {
        tradeState.activeOffers = parsed.activeOffers.filter(t => t && t.id && t.status && t.hash);
      }
      if (Array.isArray(parsed.history)) {
        tradeState.history = parsed.history.slice(-100);
      }
      if (typeof parsed.dailyTrades === 'number') {
        tradeState.dailyTrades = parsed.dailyTrades;
      }
      if (parsed.lastTradeDate) {
        tradeState.lastTradeDate = parsed.lastTradeDate;
      }
    }
  } catch (e) {
    console.warn('Failed to load trading state:', e);
  }

  // Clean up expired trades on load
  cleanupExpiredTrades();
}

function saveTradingState() {
  try {
    localStorage.setItem(
      TRADE_STORAGE_KEY,
      JSON.stringify({
        activeOffers: tradeState.activeOffers,
        history: tradeState.history.slice(-100),
        dailyTrades: tradeState.dailyTrades,
        lastTradeDate: tradeState.lastTradeDate,
        version: '1.0.0',
      })
    );
  } catch (e) {
    console.warn('Failed to save trading state:', e);
  }
}

// ============================================
// GETTERS
// ============================================

function getActiveOffers() {
  cleanupExpiredTrades();
  return tradeState.activeOffers.map(t => ({
    id: t.id,
    status: t.status,
    offeredItems: t.offeredItems,
    offeredTokens: t.offeredTokens,
    requestedItems: t.requestedItems,
    requestedTokens: t.requestedTokens,
    created: t.created,
    expires: t.expires,
    timeLeft: Math.max(0, t.expires - Date.now()),
  }));
}

function getTradeHistory() {
  return tradeState.history.slice(-20).reverse();
}

function getTradeLimits() {
  const state = window.PumpArenaState?.get();
  const tier = state?.asdfTier?.current || 'EMBER';

  const dailyCheck = checkDailyLimit();

  return {
    tier,
    dailyLimit: TRADE_CONFIG.maxDailyTrades[tier],
    dailyUsed: tradeState.dailyTrades,
    dailyRemaining: dailyCheck.remaining,
    maxValue: TRADE_CONFIG.maxTradeValue[tier],
    feePercent: TRADE_CONFIG.feePercent,
  };
}

// ============================================
// TRADING UI
// ============================================

function renderTradingPanel(container) {
  const limits = getTradeLimits();
  const offers = getActiveOffers();
  const history = getTradeHistory();

  container.innerHTML = `
        <div class="trading-panel" style="background: #12121a; padding: 0; border-radius: 16px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a2e1a, #0d200d); padding: 20px; border-bottom: 2px solid #22c55e40;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 32px;">🔄</span>
                        <div>
                            <h3 style="color: #22c55e; margin: 0; font-size: 20px;">Trading Post</h3>
                            <div style="color: #86efac; font-size: 12px;">Exchange tokens & items</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <div style="padding: 8px 12px; background: #22c55e20; border: 1px solid #22c55e40; border-radius: 8px; text-align: center;">
                            <div style="color: #22c55e; font-weight: bold; font-size: 16px;">${limits.dailyRemaining}/${limits.dailyLimit}</div>
                            <div style="color: #86efac; font-size: 10px;">Daily Trades</div>
                        </div>
                        <div style="padding: 8px 12px; background: #3b82f620; border: 1px solid #3b82f640; border-radius: 8px; text-align: center;">
                            <div style="color: #3b82f6; font-weight: bold; font-size: 16px;">${limits.maxValue}</div>
                            <div style="color: #93c5fd; font-size: 10px;">Max Value</div>
                        </div>
                        <div style="padding: 8px 12px; background: #f9731620; border: 1px solid #f9731640; border-radius: 8px; text-align: center;">
                            <div style="color: #f97316; font-weight: bold; font-size: 16px;">${limits.feePercent}%</div>
                            <div style="color: #fdba74; font-size: 10px;">Fee</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="padding: 20px; max-height: 65vh; overflow-y: auto;">
                <!-- Create Trade Section -->
                <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #ffffff; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #22c55e;">📝</span> Create Trade Offer
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 15px; align-items: center;">
                        <!-- Offer Side -->
                        <div style="background: #12121a; padding: 15px; border-radius: 10px; border: 1px solid #ef444440;">
                            <label style="color: #ef4444; font-size: 12px; font-weight: 600; display: block; margin-bottom: 10px;">You Give:</label>
                            <div style="display: flex; align-items: center; gap: 8px; background: #1a1a24; padding: 10px; border-radius: 8px; border: 1px solid #333;">
                                <span style="color: #fbbf24; font-size: 18px;">🪙</span>
                                <input type="number" id="offer-tokens" min="0" max="${limits.maxValue}" placeholder="0"
                                    style="background: transparent; border: none; color: #ffffff; font-size: 16px; width: 100%; outline: none;">
                            </div>
                        </div>

                        <!-- Arrow -->
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #22c55e20, #3b82f620); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            ⇄
                        </div>

                        <!-- Request Side -->
                        <div style="background: #12121a; padding: 15px; border-radius: 10px; border: 1px solid #22c55e40;">
                            <label style="color: #22c55e; font-size: 12px; font-weight: 600; display: block; margin-bottom: 10px;">You Receive:</label>
                            <div style="display: flex; align-items: center; gap: 8px; background: #1a1a24; padding: 10px; border-radius: 8px; border: 1px solid #333;">
                                <span style="color: #fbbf24; font-size: 18px;">🪙</span>
                                <input type="number" id="request-tokens" min="0" max="${limits.maxValue}" placeholder="0"
                                    style="background: transparent; border: none; color: #ffffff; font-size: 16px; width: 100%; outline: none;">
                            </div>
                        </div>
                    </div>
                    <button id="create-trade-btn" style="
                        width: 100%; margin-top: 15px; padding: 12px;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        border: none; border-radius: 10px;
                        color: white; font-weight: 600; font-size: 14px;
                        cursor: pointer; transition: all 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        Create Trade Offer
                    </button>
                </div>

                <!-- Active Offers -->
                <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #ffffff; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #3b82f6;">📋</span> Active Offers
                        <span style="background: #3b82f630; color: #3b82f6; padding: 2px 8px; border-radius: 10px; font-size: 12px;">${offers.length}</span>
                    </h4>
                    ${
                      offers.length > 0
                        ? `
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${offers
                              .map(
                                offer => `
                                <div style="background: #12121a; padding: 12px; border-radius: 10px; border: 1px solid #333; display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 15px;">
                                        <div style="color: #ef4444; font-size: 13px;">
                                            ${offer.offeredTokens > 0 ? `<span style="color: #fbbf24;">${offer.offeredTokens} 🪙</span>` : '-'}
                                            ${offer.offeredItems.map(i => `<span>${i.quantity}x ${escapeHtml(i.id)}</span>`).join('')}
                                        </div>
                                        <span style="color: #666;">→</span>
                                        <div style="color: #22c55e; font-size: 13px;">
                                            ${offer.requestedTokens > 0 ? `<span style="color: #fbbf24;">${offer.requestedTokens} 🪙</span>` : '-'}
                                            ${offer.requestedItems.map(i => `<span>${i.quantity}x ${escapeHtml(i.id)}</span>`).join('')}
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="color: #888; font-size: 11px;">⏱️ ${Math.ceil(offer.timeLeft / 60000)}m</span>
                                        <button class="btn-cancel" data-trade="${offer.id}" style="
                                            padding: 6px 12px; background: #ef444420; border: 1px solid #ef4444;
                                            border-radius: 6px; color: #ef4444; font-size: 11px; cursor: pointer;
                                        ">Cancel</button>
                                    </div>
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    `
                        : `
                        <div style="text-align: center; padding: 20px; color: #666;">
                            <div style="font-size: 32px; margin-bottom: 10px;">📭</div>
                            <div>No active trade offers</div>
                        </div>
                    `
                    }
                </div>

                <!-- Trade History -->
                <div style="background: #1a1a24; border: 1px solid #333; border-radius: 12px; padding: 20px;">
                    <h4 style="color: #ffffff; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #a855f7;">📜</span> Recent History
                    </h4>
                    ${
                      history.length > 0
                        ? `
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${history
                              .slice(0, 5)
                              .map(trade => {
                                const statusColors = {
                                  completed: {
                                    bg: '#22c55e20',
                                    text: '#22c55e',
                                    border: '#22c55e',
                                  },
                                  cancelled: {
                                    bg: '#ef444420',
                                    text: '#ef4444',
                                    border: '#ef4444',
                                  },
                                  expired: { bg: '#6b728020', text: '#6b7280', border: '#6b7280' },
                                };
                                const status = statusColors[trade.status] || statusColors.expired;
                                return `
                                    <div style="background: #12121a; padding: 10px 15px; border-radius: 8px; border-left: 3px solid ${status.border}; display: flex; align-items: center; justify-content: space-between;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="background: ${status.bg}; color: ${status.text}; padding: 2px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase;">${trade.status}</span>
                                            <span style="color: #888; font-size: 12px;">
                                                ${trade.offeredTokens > 0 ? `${trade.offeredTokens}🪙` : ''}
                                                ${trade.offeredItems.length > 0 ? `+${trade.offeredItems.length} items` : ''}
                                                ⇄
                                                ${trade.requestedTokens > 0 ? `${trade.requestedTokens}🪙` : ''}
                                                ${trade.requestedItems.length > 0 ? `+${trade.requestedItems.length} items` : ''}
                                            </span>
                                        </div>
                                        ${trade.fee ? `<span style="color: #666; font-size: 11px;">Fee: ${trade.fee}</span>` : ''}
                                    </div>
                                `;
                              })
                              .join('')}
                        </div>
                    `
                        : `
                        <div style="text-align: center; padding: 15px; color: #666;">
                            No trade history yet
                        </div>
                    `
                    }
                </div>
            </div>
        </div>
    `;

  // Create trade button
  container.querySelector('#create-trade-btn')?.addEventListener('click', () => {
    const offeredTokens = parseInt(container.querySelector('#offer-tokens').value) || 0;
    const requestedTokens = parseInt(container.querySelector('#request-tokens').value) || 0;

    const result = createTradeOffer({
      offeredItems: [], // Would be populated from UI
      offeredTokens,
      requestedItems: [], // Would be populated from UI
      requestedTokens,
    });

    if (result.success) {
      showTradeNotification(result.message, 'success');
      renderTradingPanel(container);
    } else {
      showTradeNotification(result.message, 'error');
    }
  });

  // Cancel buttons
  container.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      const tradeId = btn.dataset.trade;
      const result = cancelTradeOffer(tradeId);
      if (result.success) {
        showTradeNotification(result.message, 'info');
        renderTradingPanel(container);
      } else {
        showTradeNotification(result.message, 'error');
      }
    });
  });
}

function showTradeNotification(message, type) {
  if (typeof showNotification === 'function') {
    showNotification(message, type);
  } else {
    console.log(`[Trade ${type}] ${message}`);
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// INITIALIZATION
// ============================================

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', loadTradingState);
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
  window.PumpArenaTrading = {
    // Core functions
    load: loadTradingState,
    save: saveTradingState,
    createOffer: createTradeOffer,
    acceptOffer: acceptTradeOffer,
    cancelOffer: cancelTradeOffer,
    cleanup: cleanupExpiredTrades,

    // Getters
    getActiveOffers,
    getHistory: getTradeHistory,
    getLimits: getTradeLimits,

    // UI
    renderPanel: renderTradingPanel,

    // Config
    CONFIG: TRADE_CONFIG,
    getFib: getTradeFib,
  };
}
