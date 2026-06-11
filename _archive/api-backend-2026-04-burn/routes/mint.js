/**
 * ASDF API - Minting & Anti-Sybil Service
 * 
 * Implements Option C (Anti-Sybil via CYNIC):
 * - Nonce-based replay protection
 * - Ed25519 signature verification
 * - Game history validation (N >= 5)
 * - CYNIC behavioral judgment
 * - Rate-limited minting (1/hour)
 */

'use strict';

const express = require('express');
const router = express.Router();
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { GameScores } = require('../services/database');
const { submitJudgment } = require('../services/cynic');
const { generateNonce, validateNonce } = require('../services/security');
const { checkLimit } = require('../services/ratelimit');
const { uploadMetadata } = require('../services/irys');

// ============================================
// CONFIGURATION
// ============================================

const ANTI_SYBIL_CONFIG = {
  minGamesRequired: 5,
  confidenceThreshold: 0.618, // φ⁻¹
  permitExpiryMs: 60 * 60 * 1000, // 1 hour
};

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/mint/nonce
 * Generates a challenge nonce for signature
 */
router.get('/nonce', (req, res) => {
  const nonce = generateNonce();
  res.json({ nonce });
});

/**
 * POST /api/mint/mint-permit
 * Validates eligibility and returns a mint permit
 */
router.post('/mint-permit', async (req, res) => {
  const { wallet, nonce, signature, archetype } = req.body;

  // 1. Basic validation
  if (!wallet || !nonce || !signature || !archetype) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // 2. Rate limiting (1 mint per wallet per hour)
  const rateLimit = checkLimit(`mint:${wallet}`, 'authenticated', '/api/mint/mint-permit');
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'rate_limit_exceeded',
      message: 'One mint permitted per hour. Please try again later.',
      retryAfter: rateLimit.retryAfter 
    });
  }

  // 3. Nonce validation (Replay protection)
  const nonceValid = validateNonce(nonce, wallet);
  if (!nonceValid.valid) {
    return res.status(401).json({ error: nonceValid.error });
  }

  try {
    // 4. Ed25519 Signature Verification
    const message = `ASDF_MINT_PERMIT:${nonce}:${wallet}:${archetype}`;
    const messageBytes = Buffer.from(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(wallet);

    const isSignatureValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isSignatureValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 5. Anti-Sybil Gate: Game History (N >= 5)
    // In memory store, we filter the gameScores
    const scores = await GameScores.getHighScores('pumparena', 1000); // Get all to filter
    // Note: In production with Postgres, this would be: 
    // SELECT COUNT(*) FROM game_scores WHERE wallet = $1
    const userGamesCount = scores.filter(s => s.wallet === wallet).length;

    if (userGamesCount < ANTI_SYBIL_CONFIG.minGamesRequired) {
      return res.status(403).json({ 
        error: 'insufficient_history',
        message: `At least ${ANTI_SYBIL_CONFIG.minGamesRequired} games required to earn a Personality Card. (Current: ${userGamesCount})`
      });
    }

    // 6. Anti-Sybil Gate: CYNIC Judgment
    const judgment = await submitJudgment('wallet-judgment', {
      wallet,
      gamesPlayed: userGamesCount,
      archetype
    });

    if (judgment.qScore < (ANTI_SYBIL_CONFIG.confidenceThreshold * 100)) {
      return res.status(403).json({ 
        error: 'low_confidence',
        message: 'Identity verification failed. Behavioral patterns inconsistent with organic play.',
        qScore: judgment.qScore
      });
    }

    // 7. Success: Return Permit with Real Ed25519 Signature
    // SECURITY: The treasury private key must be in Base58 format in process.env.TREASURY_PRIVATE_KEY
    const treasuryPrivateKeyB58 = process.env.TREASURY_PRIVATE_KEY;
    if (!treasuryPrivateKeyB58) {
      console.error('[MintPermit] CRITICAL: TREASURY_PRIVATE_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      const treasuryKeypair = nacl.sign.keyPair.fromSecretKey(bs58.decode(treasuryPrivateKeyB58));
      const expiresAt = Date.now() + ANTI_SYBIL_CONFIG.permitExpiryMs;
      
      // 7. Success: Upload Metadata to Arweave
      const treasuryPublicKey = bs58.encode(treasuryKeypair.publicKey);
      
      const metadata = {
        name: `Personality: ${archetype}`,
        symbol: 'ASDFPC',
        description: `Earned personality card for ${wallet} based on ${userGamesCount} games.`,
        seller_fee_basis_points: 0,
        image: `https://asdf.games/assets/cards/${archetype.toLowerCase()}.png`,
        external_url: 'https://asdf.games',
        attributes: [
          { trait_type: 'Archetype', value: archetype },
          { trait_type: 'Games Played', value: userGamesCount },
          { trait_type: 'Q-Score', value: judgment.qScore },
          { trait_type: 'Confidence', value: 'High' }
        ],
        properties: {
          files: [
            { 
              uri: `https://asdf.games/assets/cards/${archetype.toLowerCase()}.png`, 
              type: 'image/png' 
            }
          ],
          category: 'image',
          creators: [
            { address: treasuryPublicKey, share: 100 }
          ]
        }
      };

      const metadataUrl = await uploadMetadata(metadata);

      // Construct the permit data for signing
      const permitData = {
        wallet,
        archetype,
        qScore: judgment.qScore,
        issuedAt: Date.now(),
        expiresAt,
        metadataUrl
      };

      // Create a deterministic message for the on-chain program to verify
      // Format: "ASDF_PERMIT:<wallet>:<archetype>:<qScore>:<metadataUrl>:<expiresAt>"
      const message = `ASDF_PERMIT:${wallet}:${archetype}:${judgment.qScore}:${metadataUrl}:${expiresAt}`;
      const signature = bs58.encode(nacl.sign.detached(Buffer.from(message), treasuryKeypair.secretKey));

      res.json({
        success: true,
        permit: {
          ...permitData,
          signature
        }
      });
    } catch (err) {
      console.error('[MintPermit] Signature error:', err.message);
      throw new Error('Failed to sign mint permit');
    }

  } catch (error) {
    console.error('[MintPermit] Error:', error.message);
    res.status(500).json({ error: 'Internal server error during permit generation' });
  }
});

module.exports = router;
