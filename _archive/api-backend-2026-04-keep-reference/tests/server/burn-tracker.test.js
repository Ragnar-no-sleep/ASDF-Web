/**
 * Tests for api/services/burn-tracker.js (Layer 4)
 *
 * Mocks solana.js (Layer 3) + @solana/web3.js + @solana/spl-token
 * to test burn domain logic in isolation.
 * Validates: shape contracts, tx construction, verification security,
 * recent burns parsing, wallet history filtering.
 */

'use strict';

// Mock solana.js
jest.mock('../../../api/services/helius/solana', () => ({
  getLatestBlockhash: jest.fn(),
  getPriorityFeeEstimate: jest.fn(),
  getParsedTransaction: jest.fn(),
  getEnhancedTransactions: jest.fn(),
}));

// Mock cache for invalidation test
jest.mock('../../../api/services/helius/middleware/cache', () => ({
  invalidate: jest.fn(),
}));

// Mock @solana/web3.js
const mockSerialize = jest.fn().mockReturnValue(Buffer.from('mock-tx-bytes'));
const mockAdd = jest.fn();
jest.mock('@solana/web3.js', () => ({
  PublicKey: jest.fn().mockImplementation(addr => ({
    toBase58: () => addr,
    toString: () => addr,
    toBuffer: () => Buffer.alloc(32),
    equals: other => addr === other?.toString(),
  })),
  Transaction: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    serialize: mockSerialize,
  })),
  ComputeBudgetProgram: {
    setComputeUnitLimit: jest.fn().mockReturnValue({ type: 'computeLimit' }),
    setComputeUnitPrice: jest.fn().mockReturnValue({ type: 'computePrice' }),
  },
}));

// Mock @solana/spl-token
jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn().mockResolvedValue({
    toBase58: () => 'TOKEN_ACCOUNT',
    toString: () => 'TOKEN_ACCOUNT',
  }),
  createBurnInstruction: jest.fn().mockReturnValue({ type: 'burn' }),
}));

const solana = require('../../../api/services/helius/solana');
const cache = require('../../../api/services/helius/middleware/cache');
const { ASDF } = require('../../../api/services/helius/config');
const { getAssociatedTokenAddress, createBurnInstruction } = require('@solana/spl-token');
const { ComputeBudgetProgram } = require('@solana/web3.js');
const burnTracker = require('../../../api/services/burn-tracker');

describe('burn-tracker (Layer 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockClear();
    mockSerialize.mockClear().mockReturnValue(Buffer.from('mock-tx-bytes'));
  });

  // ==== buildBurnTransaction ====

  describe('buildBurnTransaction', () => {
    beforeEach(() => {
      solana.getLatestBlockhash.mockResolvedValue({
        blockhash: 'abc123hash',
        lastValidBlockHeight: 99999,
      });
      solana.getPriorityFeeEstimate.mockResolvedValue(75000);
    });

    it('returns correct shape: { transaction, blockhash, lastValidBlockHeight, priorityFee }', async () => {
      const result = await burnTracker.buildBurnTransaction('WALLET', 1000);

      expect(result).toEqual({
        transaction: expect.any(String),
        blockhash: 'abc123hash',
        lastValidBlockHeight: 99999,
        priorityFee: 75000,
      });
    });

    it('returns base64-encoded transaction', async () => {
      const result = await burnTracker.buildBurnTransaction('WALLET', 1000);

      // Buffer.from('mock-tx-bytes').toString('base64')
      expect(result.transaction).toBe(Buffer.from('mock-tx-bytes').toString('base64'));
    });

    it('fetches blockhash and priority fee in parallel', async () => {
      await burnTracker.buildBurnTransaction('WALLET', 1000);

      expect(solana.getLatestBlockhash).toHaveBeenCalledTimes(1);
      expect(solana.getPriorityFeeEstimate).toHaveBeenCalledTimes(1);
    });

    it('derives associated token address for ASDF mint', async () => {
      await burnTracker.buildBurnTransaction('WALLET', 1000);

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
    });

    it('adds 3 instructions in correct order: compute limit, priority fee, burn', async () => {
      await burnTracker.buildBurnTransaction('WALLET', 500);

      expect(mockAdd).toHaveBeenCalledTimes(3);
      expect(ComputeBudgetProgram.setComputeUnitLimit).toHaveBeenCalledWith({ units: 50_000 });
      expect(ComputeBudgetProgram.setComputeUnitPrice).toHaveBeenCalledWith({
        microLamports: 75000,
      });
      expect(createBurnInstruction).toHaveBeenCalled();
    });

    it('serializes without requiring signatures', async () => {
      await burnTracker.buildBurnTransaction('WALLET', 100);

      expect(mockSerialize).toHaveBeenCalledWith({
        requireAllSignatures: false,
        verifySignatures: false,
      });
    });

    it('converts UI amount to raw amount using ASDF.DECIMALS', async () => {
      await burnTracker.buildBurnTransaction('WALLET', 1000.5);

      // createBurnInstruction receives BigInt raw amount
      const burnCall = createBurnInstruction.mock.calls[0];
      // 4th arg is the raw amount
      expect(burnCall[3]).toBe(BigInt(Math.floor(1000.5 * 10 ** ASDF.DECIMALS)));
    });
  });

  // ==== verifyBurnTransaction ====

  describe('verifyBurnTransaction', () => {
    const validTx = {
      transaction: {
        message: {
          instructions: [
            {
              program: 'spl-token',
              parsed: {
                type: 'burn',
                info: {
                  mint: ASDF.MINT,
                  authority: 'WALLET',
                  amount: '1000000000', // 1000 tokens
                },
              },
            },
          ],
        },
      },
      meta: { err: null },
      slot: 12345,
      blockTime: 1700000000,
    };

    it('returns valid=true with correct shape for valid burn', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce(validTx);

      const result = await burnTracker.verifyBurnTransaction('sig123', 'WALLET', 1000);

      expect(result).toEqual({
        valid: true,
        actualAmount: 1000,
        signature: 'sig123',
        slot: 12345,
        blockTime: 1700000000,
      });
    });

    it('throws when transaction not found', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce(null);

      await expect(burnTracker.verifyBurnTransaction('missing', 'WALLET', 1000)).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('returns valid=false when transaction failed on-chain', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce({
        ...validTx,
        meta: { err: { InstructionError: [0, 'Custom'] } },
      });

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result).toEqual({ valid: false, error: 'Transaction failed on-chain' });
    });

    it('returns valid=false when no burn instruction found', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce({
        transaction: {
          message: { instructions: [{ program: 'system', parsed: { type: 'transfer' } }] },
        },
        meta: { err: null },
      });

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result).toEqual({ valid: false, error: 'No burn instruction found' });
    });

    it('returns valid=false for wrong token mint (security)', async () => {
      const wrongMintTx = JSON.parse(JSON.stringify(validTx));
      wrongMintTx.transaction.message.instructions[0].parsed.info.mint = 'WRONG_MINT';
      solana.getParsedTransaction.mockResolvedValueOnce(wrongMintTx);

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result).toEqual({ valid: false, error: 'Wrong token mint' });
    });

    it('returns valid=false for wrong wallet (security)', async () => {
      const wrongWalletTx = JSON.parse(JSON.stringify(validTx));
      wrongWalletTx.transaction.message.instructions[0].parsed.info.authority = 'ATTACKER';
      solana.getParsedTransaction.mockResolvedValueOnce(wrongWalletTx);

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result).toEqual({ valid: false, error: 'Wrong wallet' });
    });

    it('returns valid=false for amount mismatch', async () => {
      const wrongAmountTx = JSON.parse(JSON.stringify(validTx));
      wrongAmountTx.transaction.message.instructions[0].parsed.info.amount = '500000000'; // 500 tokens
      solana.getParsedTransaction.mockResolvedValueOnce(wrongAmountTx);

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount mismatch');
      expect(result.actualAmount).toBe(500);
      expect(result.expectedAmount).toBe(1000);
    });

    it('allows exactly 0.000001 tolerance (boundary)', async () => {
      // 999999999 / 1e6 = 999.999999, diff from 1000 = 0.000001
      // Code uses > 0.000001, so exactly 0.000001 passes
      const nearTx = JSON.parse(JSON.stringify(validTx));
      nearTx.transaction.message.instructions[0].parsed.info.amount = '999999999';
      solana.getParsedTransaction.mockResolvedValueOnce(nearTx);

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result.valid).toBe(true);
    });

    it('rejects amount beyond tolerance (> 0.000001)', async () => {
      // 999999000 / 1e6 = 999.999, diff from 1000 = 0.001
      const farTx = JSON.parse(JSON.stringify(validTx));
      farTx.transaction.message.instructions[0].parsed.info.amount = '999999000';
      solana.getParsedTransaction.mockResolvedValueOnce(farTx);

      const result = await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount mismatch');
    });

    it('invalidates cache on successful verification', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce(validTx);

      await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(cache.invalidate).toHaveBeenCalledWith('taccts:WALLET');
    });

    it('does NOT invalidate cache on failed verification', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce({
        ...validTx,
        meta: { err: { InstructionError: [0, 'Custom'] } },
      });

      await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(cache.invalidate).not.toHaveBeenCalled();
    });

    it('calls solana.getParsedTransaction (not rpcCall directly)', async () => {
      solana.getParsedTransaction.mockResolvedValueOnce(validTx);

      await burnTracker.verifyBurnTransaction('sig', 'WALLET', 1000);

      expect(solana.getParsedTransaction).toHaveBeenCalledWith('sig');
    });
  });

  // ==== getRecentBurns ====

  describe('getRecentBurns', () => {
    it('returns correct shape: Array<{ signature, wallet, amount, timestamp, slot }>', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([
        {
          signature: 'tx1',
          feePayer: 'WALLET1',
          tokenTransfers: [{ tokenAmount: 500 }],
          timestamp: 1700000000,
          slot: 100,
        },
        {
          signature: 'tx2',
          feePayer: 'WALLET2',
          tokenTransfers: [{ tokenAmount: 1000 }],
          timestamp: 1700001000,
          slot: 200,
        },
      ]);

      const result = await burnTracker.getRecentBurns(20);

      expect(result).toEqual([
        { signature: 'tx1', wallet: 'WALLET1', amount: 500, timestamp: 1700000000, slot: 100 },
        { signature: 'tx2', wallet: 'WALLET2', amount: 1000, timestamp: 1700001000, slot: 200 },
      ]);
    });

    it('respects limit parameter', async () => {
      const txs = Array.from({ length: 10 }, (_, i) => ({
        signature: `tx${i}`,
        feePayer: `W${i}`,
        tokenTransfers: [{ tokenAmount: 100 }],
        timestamp: 1700000000 + i,
        slot: i,
      }));
      solana.getEnhancedTransactions.mockResolvedValueOnce(txs);

      const result = await burnTracker.getRecentBurns(3);

      expect(result).toHaveLength(3);
    });

    it('defaults limit to 20', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([]);

      await burnTracker.getRecentBurns();

      expect(solana.getEnhancedTransactions).toHaveBeenCalledWith(
        ASDF.MINT,
        { type: 'BURN' },
        expect.objectContaining({
          cacheKey: 'burns:20',
          cacheTTL: 120_000,
        })
      );
    });

    it('handles missing tokenTransfers gracefully', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([
        { signature: 'tx1', feePayer: 'W', tokenTransfers: null, timestamp: 0, slot: 0 },
      ]);

      const result = await burnTracker.getRecentBurns();

      expect(result[0].amount).toBe(0);
    });

    it('passes ASDF.MINT and BURN type to enhanced API', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([]);

      await burnTracker.getRecentBurns(5);

      expect(solana.getEnhancedTransactions).toHaveBeenCalledWith(
        ASDF.MINT,
        { type: 'BURN' },
        expect.objectContaining({ cacheKey: 'burns:5' })
      );
    });
  });

  // ==== getWalletBurnHistory ====

  describe('getWalletBurnHistory', () => {
    it('returns correct shape: { burns, totalBurned, burnCount }', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([
        {
          signature: 'tx1',
          tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -500 }],
          timestamp: 1700000000,
          slot: 100,
        },
      ]);

      const result = await burnTracker.getWalletBurnHistory('WALLET');

      expect(result).toEqual({
        burns: [{ signature: 'tx1', amount: 500, timestamp: 1700000000, slot: 100 }],
        totalBurned: 500,
        burnCount: 1,
      });
    });

    it('filters for ASDF token burns only', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([
        {
          signature: 'tx-asdf',
          tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -100 }],
          timestamp: 1,
          slot: 1,
        },
        {
          signature: 'tx-other',
          tokenTransfers: [{ mint: 'OTHER_MINT', tokenAmount: -200 }],
          timestamp: 2,
          slot: 2,
        },
      ]);

      const result = await burnTracker.getWalletBurnHistory('WALLET');

      expect(result.burnCount).toBe(1);
      expect(result.burns[0].signature).toBe('tx-asdf');
    });

    it('uses Math.abs for burn amounts (negative tokenAmount)', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([
        {
          signature: 'tx1',
          tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -750 }],
          timestamp: 1,
          slot: 1,
        },
      ]);

      const result = await burnTracker.getWalletBurnHistory('WALLET');

      expect(result.burns[0].amount).toBe(750);
      expect(result.totalBurned).toBe(750);
    });

    it('sums totalBurned across multiple burns', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([
        {
          signature: 't1',
          tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -100 }],
          timestamp: 1,
          slot: 1,
        },
        {
          signature: 't2',
          tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -200 }],
          timestamp: 2,
          slot: 2,
        },
        {
          signature: 't3',
          tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -300 }],
          timestamp: 3,
          slot: 3,
        },
      ]);

      const result = await burnTracker.getWalletBurnHistory('WALLET');

      expect(result.totalBurned).toBe(600);
      expect(result.burnCount).toBe(3);
    });

    it('respects limit parameter', async () => {
      const txs = Array.from({ length: 5 }, (_, i) => ({
        signature: `tx${i}`,
        tokenTransfers: [{ mint: ASDF.MINT, tokenAmount: -10 }],
        timestamp: i,
        slot: i,
      }));
      solana.getEnhancedTransactions.mockResolvedValueOnce(txs);

      const result = await burnTracker.getWalletBurnHistory('WALLET', 2);

      expect(result.burns).toHaveLength(2);
      // totalBurned is only from returned burns (sliced)
      expect(result.totalBurned).toBe(20);
    });

    it('handles empty history', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([]);

      const result = await burnTracker.getWalletBurnHistory('WALLET');

      expect(result).toEqual({ burns: [], totalBurned: 0, burnCount: 0 });
    });

    it('passes wallet address and cache opts to enhanced API', async () => {
      solana.getEnhancedTransactions.mockResolvedValueOnce([]);

      await burnTracker.getWalletBurnHistory('MY_WALLET', 50);

      expect(solana.getEnhancedTransactions).toHaveBeenCalledWith(
        'MY_WALLET',
        { type: 'BURN' },
        expect.objectContaining({
          cacheKey: 'burnhist:MY_WALLET',
          cacheTTL: 300_000,
        })
      );
    });
  });

  // ==== Module contract ====

  describe('exports', () => {
    const expectedExports = [
      'buildBurnTransaction',
      'verifyBurnTransaction',
      'getRecentBurns',
      'getWalletBurnHistory',
    ];

    it.each(expectedExports)('exports %s as a function', name => {
      expect(typeof burnTracker[name]).toBe('function');
    });

    it('exports exactly 4 functions', () => {
      expect(Object.keys(burnTracker)).toHaveLength(4);
    });
  });
});
