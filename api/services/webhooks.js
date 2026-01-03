/**
 * ASDF API - Helius Webhooks Service
 *
 * Real-time transaction monitoring via Helius webhooks:
 * - Webhook signature verification
 * - Burn transaction processing
 * - Token transfer tracking
 * - Event queue with retry logic
 *
 * Security by Design:
 * - HMAC signature verification on all webhooks
 * - Idempotent event processing
 * - Rate-limited event handlers
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');
const { recordBurn } = require('./leaderboard');
const { Signatures, Burns, Users } = require('./database');

// ============================================
// CONFIGURATION
// ============================================

const WEBHOOK_CONFIG = {
    // Helius webhook secret (from env)
    secret: process.env.HELIUS_WEBHOOK_SECRET || '',

    // ASDF token mint address
    asdfMint: process.env.ASDF_TOKEN_MINT || '',

    // Burn address (dead wallet)
    burnAddress: process.env.BURN_ADDRESS || 'deaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead',

    // Event processing config
    maxRetries: 3,
    retryDelayMs: 5000,
    eventTTL: 24 * 60 * 60 * 1000,  // 24 hours

    // Rate limiting
    maxEventsPerMinute: 100
};

// Event queue for processing
const eventQueue = [];
const processedEvents = new Map();  // eventId -> timestamp

// Rate limiting
let eventsThisMinute = 0;
let minuteStart = Date.now();

// ============================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================

/**
 * Verify Helius webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Helius-Signature header
 * @returns {boolean}
 */
function verifyWebhookSignature(payload, signature) {
    if (!WEBHOOK_CONFIG.secret) {
        console.warn('[Webhooks] No webhook secret configured - skipping verification');
        return true;  // Allow in development
    }

    if (!signature) {
        logAudit('webhook_missing_signature', {});
        return false;
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_CONFIG.secret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        logAudit('webhook_signature_error', { error: error.message });
        return false;
    }
}

// ============================================
// EVENT PROCESSING
// ============================================

/**
 * Process incoming webhook event
 * @param {Object} event - Helius webhook event
 * @returns {Promise<{processed: boolean, eventId?: string, error?: string}>}
 */
async function processWebhookEvent(event) {
    // Rate limiting check
    const now = Date.now();
    if (now - minuteStart > 60000) {
        eventsThisMinute = 0;
        minuteStart = now;
    }

    if (eventsThisMinute >= WEBHOOK_CONFIG.maxEventsPerMinute) {
        logAudit('webhook_rate_limited', { eventsThisMinute });
        return { processed: false, error: 'Rate limit exceeded' };
    }
    eventsThisMinute++;

    // Generate event ID for idempotency
    const eventId = generateEventId(event);

    // Check if already processed
    if (processedEvents.has(eventId)) {
        return { processed: true, eventId, duplicate: true };
    }

    try {
        // Route event to appropriate handler
        const result = await routeEvent(event);

        // Mark as processed
        processedEvents.set(eventId, Date.now());

        // Cleanup old processed events
        cleanupProcessedEvents();

        return { processed: true, eventId, ...result };
    } catch (error) {
        logAudit('webhook_processing_error', {
            eventId,
            error: error.message
        });

        // Queue for retry
        queueForRetry(event, eventId);

        return { processed: false, eventId, error: error.message };
    }
}

/**
 * Generate unique event ID for idempotency
 * @param {Object} event - Webhook event
 * @returns {string}
 */
function generateEventId(event) {
    const signature = event.signature || event.txSignature || '';
    const timestamp = event.timestamp || event.blockTime || Date.now();
    const type = event.type || 'unknown';

    return crypto
        .createHash('sha256')
        .update(`${signature}:${timestamp}:${type}`)
        .digest('hex')
        .slice(0, 32);
}

/**
 * Route event to appropriate handler
 * @param {Object} event - Webhook event
 * @returns {Promise<Object>}
 */
async function routeEvent(event) {
    const eventType = detectEventType(event);

    switch (eventType) {
        case 'burn':
            return await handleBurnEvent(event);
        case 'transfer':
            return await handleTransferEvent(event);
        case 'swap':
            return await handleSwapEvent(event);
        default:
            logAudit('webhook_unknown_type', { type: eventType });
            return { handled: false, type: eventType };
    }
}

/**
 * Detect event type from Helius webhook payload
 * @param {Object} event - Webhook event
 * @returns {string}
 */
function detectEventType(event) {
    // Helius Enhanced Transactions format
    if (event.type) {
        return event.type.toLowerCase();
    }

    // Check for burn (transfer to burn address)
    if (event.tokenTransfers) {
        for (const transfer of event.tokenTransfers) {
            if (transfer.toUserAccount === WEBHOOK_CONFIG.burnAddress) {
                return 'burn';
            }
        }
        return 'transfer';
    }

    // Check for swap
    if (event.events?.swap) {
        return 'swap';
    }

    return 'unknown';
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle burn event
 * @param {Object} event - Burn event
 * @returns {Promise<Object>}
 */
async function handleBurnEvent(event) {
    const signature = event.signature || event.txSignature;

    // Check for duplicate signature
    if (await Signatures.isUsed(signature)) {
        logAudit('webhook_duplicate_burn', { signature: signature?.slice(0, 16) });
        return { handled: true, duplicate: true };
    }

    // Extract burn details
    const burnDetails = extractBurnDetails(event);

    if (!burnDetails.valid) {
        logAudit('webhook_invalid_burn', { reason: burnDetails.error });
        return { handled: false, error: burnDetails.error };
    }

    // Record the burn
    await Burns.record({
        wallet: burnDetails.wallet,
        amount: burnDetails.amount,
        signature,
        timestamp: event.timestamp || Date.now(),
        source: 'webhook'
    });

    // Mark signature as used
    await Signatures.markUsed(signature, burnDetails.wallet, 'burn');

    // Add to leaderboard
    recordBurn(burnDetails.wallet, burnDetails.amount, signature);

    logAudit('webhook_burn_processed', {
        wallet: burnDetails.wallet.slice(0, 8) + '...',
        amount: burnDetails.amount
    });

    return {
        handled: true,
        type: 'burn',
        wallet: burnDetails.wallet,
        amount: burnDetails.amount
    };
}

/**
 * Extract burn details from event
 * @param {Object} event - Event data
 * @returns {Object}
 */
function extractBurnDetails(event) {
    // Helius Enhanced format
    if (event.tokenTransfers) {
        for (const transfer of event.tokenTransfers) {
            if (transfer.toUserAccount === WEBHOOK_CONFIG.burnAddress) {
                // Verify it's ASDF token
                if (WEBHOOK_CONFIG.asdfMint && transfer.mint !== WEBHOOK_CONFIG.asdfMint) {
                    return { valid: false, error: 'Not ASDF token' };
                }

                return {
                    valid: true,
                    wallet: transfer.fromUserAccount,
                    amount: transfer.tokenAmount || 0,
                    mint: transfer.mint
                };
            }
        }
    }

    // Native format with instructions
    if (event.instructions) {
        for (const ix of event.instructions) {
            if (ix.programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                // SPL Token program - check for burn instruction
                const parsed = ix.parsed;
                if (parsed?.type === 'burn' || parsed?.type === 'burnChecked') {
                    return {
                        valid: true,
                        wallet: parsed.info?.authority || event.feePayer,
                        amount: parsed.info?.amount || parsed.info?.tokenAmount?.uiAmount || 0,
                        mint: parsed.info?.mint
                    };
                }
            }
        }
    }

    return { valid: false, error: 'Could not extract burn details' };
}

/**
 * Handle transfer event (non-burn)
 * @param {Object} event - Transfer event
 * @returns {Promise<Object>}
 */
async function handleTransferEvent(event) {
    // For now, we just log transfers for monitoring
    const transfers = event.tokenTransfers || [];

    for (const transfer of transfers) {
        // Check if it's ASDF token
        if (WEBHOOK_CONFIG.asdfMint && transfer.mint !== WEBHOOK_CONFIG.asdfMint) {
            continue;
        }

        logAudit('webhook_transfer', {
            from: transfer.fromUserAccount?.slice(0, 8) + '...',
            to: transfer.toUserAccount?.slice(0, 8) + '...',
            amount: transfer.tokenAmount
        });
    }

    return { handled: true, type: 'transfer', count: transfers.length };
}

/**
 * Handle swap event
 * @param {Object} event - Swap event
 * @returns {Promise<Object>}
 */
async function handleSwapEvent(event) {
    const swap = event.events?.swap;

    if (!swap) {
        return { handled: false, error: 'No swap data' };
    }

    // Log swap for analytics
    logAudit('webhook_swap', {
        tokenIn: swap.tokenInputs?.[0]?.mint?.slice(0, 8),
        tokenOut: swap.tokenOutputs?.[0]?.mint?.slice(0, 8),
        amountIn: swap.tokenInputs?.[0]?.tokenAmount,
        amountOut: swap.tokenOutputs?.[0]?.tokenAmount
    });

    return { handled: true, type: 'swap' };
}

// ============================================
// RETRY QUEUE
// ============================================

/**
 * Queue event for retry
 * @param {Object} event - Event to retry
 * @param {string} eventId - Event ID
 */
function queueForRetry(event, eventId) {
    const retryCount = (event._retryCount || 0) + 1;

    if (retryCount > WEBHOOK_CONFIG.maxRetries) {
        logAudit('webhook_max_retries', { eventId });
        return;
    }

    eventQueue.push({
        event: { ...event, _retryCount: retryCount },
        eventId,
        scheduledFor: Date.now() + (WEBHOOK_CONFIG.retryDelayMs * retryCount)
    });
}

/**
 * Process retry queue
 */
async function processRetryQueue() {
    const now = Date.now();
    const toProcess = [];

    // Find events ready to process
    for (let i = eventQueue.length - 1; i >= 0; i--) {
        if (eventQueue[i].scheduledFor <= now) {
            toProcess.push(eventQueue.splice(i, 1)[0]);
        }
    }

    // Process each
    for (const item of toProcess) {
        await processWebhookEvent(item.event);
    }
}

// Process retry queue every 5 seconds
setInterval(processRetryQueue, 5000);

// ============================================
// CLEANUP
// ============================================

/**
 * Cleanup old processed events
 */
function cleanupProcessedEvents() {
    const cutoff = Date.now() - WEBHOOK_CONFIG.eventTTL;
    let cleaned = 0;

    for (const [eventId, timestamp] of processedEvents.entries()) {
        if (timestamp < cutoff) {
            processedEvents.delete(eventId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[Webhooks] Cleaned ${cleaned} old processed events`);
    }
}

// Cleanup every hour
setInterval(cleanupProcessedEvents, 60 * 60 * 1000);

// ============================================
// WEBHOOK MANAGEMENT
// ============================================

/**
 * Get webhook status and metrics
 * @returns {Object}
 */
function getWebhookMetrics() {
    return {
        queueSize: eventQueue.length,
        processedCount: processedEvents.size,
        eventsThisMinute,
        config: {
            maxRetries: WEBHOOK_CONFIG.maxRetries,
            maxEventsPerMinute: WEBHOOK_CONFIG.maxEventsPerMinute,
            hasSecret: !!WEBHOOK_CONFIG.secret,
            hasMintConfigured: !!WEBHOOK_CONFIG.asdfMint
        }
    };
}

/**
 * Register webhook with Helius (for setup)
 * @param {string} webhookUrl - URL to receive webhooks
 * @param {string[]} addresses - Addresses to monitor
 * @returns {Promise<Object>}
 */
async function registerWebhook(webhookUrl, addresses) {
    const apiKey = process.env.HELIUS_API_KEY;

    if (!apiKey) {
        throw new Error('HELIUS_API_KEY not configured');
    }

    const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            webhookURL: webhookUrl,
            transactionTypes: ['TRANSFER', 'BURN', 'SWAP'],
            accountAddresses: addresses,
            webhookType: 'enhanced'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to register webhook: ${error}`);
    }

    const result = await response.json();

    logAudit('webhook_registered', {
        webhookId: result.webhookID,
        addressCount: addresses.length
    });

    return result;
}

/**
 * List registered webhooks
 * @returns {Promise<Array>}
 */
async function listWebhooks() {
    const apiKey = process.env.HELIUS_API_KEY;

    if (!apiKey) {
        throw new Error('HELIUS_API_KEY not configured');
    }

    const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${apiKey}`);

    if (!response.ok) {
        throw new Error('Failed to list webhooks');
    }

    return response.json();
}

module.exports = {
    // Verification
    verifyWebhookSignature,

    // Processing
    processWebhookEvent,

    // Management
    registerWebhook,
    listWebhooks,
    getWebhookMetrics,

    // Config
    WEBHOOK_CONFIG
};
