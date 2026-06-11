/**
 * ASDF API - Irys Arweave Storage Service
 *
 * Handles permanent storage of NFT metadata on Arweave via Irys.
 * Enables decentralized identity cards for the Solana hackathon.
 *
 * @version 1.0.0
 */

'use strict';

const Irys = require('@irys/sdk');
const bs58 = require('bs58');

// ============================================
// CONFIGURATION
// ============================================

const IRYS_CONFIG = {
  url: process.env.NODE_ENV === 'production' ? 'https://node1.irys.xyz' : 'https://devnet.irys.xyz',
  token: 'solana',
  rpcUrl: process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

let irysInstance = null;

/**
 * Get or initialize Irys instance
 * @returns {Promise<Irys>}
 */
async function getIrys() {
  if (irysInstance) return irysInstance;

  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TREASURY_PRIVATE_KEY missing for Irys initialization');
  }

  // Irys expects the raw secret key bytes
  const secretKey = bs58.decode(privateKey);

  irysInstance = new Irys({
    url: IRYS_CONFIG.url,
    token: IRYS_CONFIG.token,
    key: secretKey,
    config: { providerUrl: IRYS_CONFIG.rpcUrl },
  });

  console.log(`[Irys] Initialized on ${IRYS_CONFIG.url}`);
  return irysInstance;
}

/**
 * Upload JSON metadata to Arweave
 * @param {Object} metadata - The JSON metadata object
 * @returns {Promise<string>} The permanent URL of the uploaded data
 */
async function uploadMetadata(metadata) {
  try {
    const irys = await getIrys();
    const data = JSON.stringify(metadata);
    
    // Check balance and fund if necessary (devnet only, or small amounts)
    const price = await irys.getPrice(data.length);
    const balance = await irys.getLoadedBalance();
    
    if (balance.lt(price)) {
      console.log(`[Irys] Funding node with ${price} atomic units...`);
      await irys.fund(price);
    }

    const response = await irys.upload(data, {
      tags: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'ASDF-Games' },
        { name: 'Type', value: 'Personality-Card' },
      ],
    });

    const url = `https://arweave.net/${response.id}`;
    console.log(`[Irys] Metadata uploaded: ${url}`);
    return url;
  } catch (error) {
    console.error('[Irys] Upload failed:', error.message);
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

/**
 * Get current Irys balance
 * @returns {Promise<string>} Balance in SOL
 */
async function getBalance() {
  const irys = await getIrys();
  const balance = await irys.getLoadedBalance();
  return irys.utils.fromAtomic(balance).toString();
}

module.exports = {
  uploadMetadata,
  getBalance,
};
