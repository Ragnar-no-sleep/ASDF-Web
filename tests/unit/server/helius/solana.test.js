/**
 * Tests for api/services/helius/solana.js (Layer 3)
 *
 * Mocks transport.rpcCall/restCall to test solana.js in isolation.
 * Validates: caching policy, data unwrapping, fee clamping,
 * confirmation polling, raw data contracts.
 */

'use strict';

// Mock transport before requiring solana
jest.mock('../../../../api/services/helius/transport', () => ({
  rpcCall: jest.fn(),
  restCall: jest.fn(),
}));

const { rpcCall, restCall } = require('../../../../api/services/helius/transport');
const { PRIORITY_FEE, CACHE_TTL } = require('../../../../api/services/helius/config');
const solana = require('../../../../api/services/helius/solana');

describe('helius/solana', () => {
  beforeEach(() => {
    rpcCall.mockReset();
    restCall.mockReset();
  });

  // ==== getBalance ====

  describe('getBalance', () => {
    it('calls rpcCall with correct method and cache opts', async () => {
      rpcCall.mockResolvedValueOnce(5_000_000_000);

      const result = await solana.getBalance('ABC123');

      expect(result).toBe(5_000_000_000);
      expect(rpcCall).toHaveBeenCalledWith(
        'getBalance',
        ['ABC123'],
        expect.objectContaining({
          cacheKey: 'bal:ABC123',
          cacheTTL: CACHE_TTL.tokenBalance,
        })
      );
    });
  });

  // ==== getTokenAccountsByOwner ====

  describe('getTokenAccountsByOwner', () => {
    it('passes wallet + mint + jsonParsed encoding', async () => {
      const mockResult = {
        value: [
          {
            account: {
              data: { parsed: { info: { tokenAmount: { uiAmount: 50000 } } } },
            },
          },
        ],
      };
      rpcCall.mockResolvedValueOnce(mockResult);

      const result = await solana.getTokenAccountsByOwner('WALLET', 'MINT');

      expect(result).toEqual(mockResult);
      expect(rpcCall).toHaveBeenCalledWith(
        'getTokenAccountsByOwner',
        ['WALLET', { mint: 'MINT' }, { encoding: 'jsonParsed' }],
        expect.objectContaining({
          cacheKey: 'taccts:WALLET:MINT',
          cacheTTL: CACHE_TTL.tokenBalance,
        })
      );
    });
  });

  // ==== getTokenSupply ====

  describe('getTokenSupply', () => {
    it('unwraps value and returns raw supply data', async () => {
      rpcCall.mockResolvedValueOnce({
        value: {
          amount: '993000000000000',
          decimals: 6,
          uiAmount: 993000000,
        },
      });

      const result = await solana.getTokenSupply('MINT');

      expect(result).toEqual({
        amount: '993000000000000',
        decimals: 6,
        uiAmount: 993000000,
      });
    });

    it('does NOT compute burned or isHolder (raw data only)', async () => {
      rpcCall.mockResolvedValueOnce({
        value: { amount: '993000000000000', decimals: 6, uiAmount: 993000000 },
      });

      const result = await solana.getTokenSupply('MINT');

      expect(result).not.toHaveProperty('burned');
      expect(result).not.toHaveProperty('isHolder');
      expect(result).not.toHaveProperty('burnPercentage');
    });

    it('uses correct cache key and TTL', async () => {
      rpcCall.mockResolvedValueOnce({ value: { amount: '0', decimals: 6, uiAmount: 0 } });

      await solana.getTokenSupply('MINT');

      expect(rpcCall).toHaveBeenCalledWith(
        'getTokenSupply',
        ['MINT'],
        expect.objectContaining({
          cacheKey: 'supply:MINT',
          cacheTTL: CACHE_TTL.tokenSupply,
        })
      );
    });
  });

  // ==== getPriorityFeeEstimate ====

  describe('getPriorityFeeEstimate', () => {
    it('returns clamped fee from Helius response', async () => {
      rpcCall.mockResolvedValueOnce({ priorityFeeEstimate: 75000 });

      const fee = await solana.getPriorityFeeEstimate(['MINT']);

      expect(fee).toBe(75000);
    });

    it('clamps fee below minimum', async () => {
      rpcCall.mockResolvedValueOnce({ priorityFeeEstimate: 1 });

      const fee = await solana.getPriorityFeeEstimate();

      expect(fee).toBe(PRIORITY_FEE.min);
    });

    it('clamps fee above maximum', async () => {
      rpcCall.mockResolvedValueOnce({ priorityFeeEstimate: 999_999_999 });

      const fee = await solana.getPriorityFeeEstimate();

      expect(fee).toBe(PRIORITY_FEE.max);
    });

    it('returns default when priorityFeeEstimate is missing', async () => {
      rpcCall.mockResolvedValueOnce({});

      const fee = await solana.getPriorityFeeEstimate();

      expect(fee).toBe(PRIORITY_FEE.default);
    });

    it('uses priority capability', async () => {
      rpcCall.mockResolvedValueOnce({ priorityFeeEstimate: 50000 });

      await solana.getPriorityFeeEstimate();

      expect(rpcCall).toHaveBeenCalledWith(
        'getPriorityFeeEstimate',
        expect.any(Array),
        expect.objectContaining({ capability: 'priority' })
      );
    });
  });

  // ==== DAS ====

  describe('getAsset', () => {
    it('uses das capability and caches by asset id', async () => {
      rpcCall.mockResolvedValueOnce({ id: 'nft-1', content: {} });

      const result = await solana.getAsset('nft-1');

      expect(result).toEqual({ id: 'nft-1', content: {} });
      expect(rpcCall).toHaveBeenCalledWith(
        'getAsset',
        [{ id: 'nft-1' }],
        expect.objectContaining({
          capability: 'das',
          cacheKey: 'das:nft-1',
          cacheTTL: CACHE_TTL.das,
        })
      );
    });
  });

  describe('getAssetsByOwner', () => {
    it('passes owner + page, uses das capability', async () => {
      rpcCall.mockResolvedValueOnce({ items: [], total: 0 });

      await solana.getAssetsByOwner('OWNER', 2);

      expect(rpcCall).toHaveBeenCalledWith(
        'getAssetsByOwner',
        [{ ownerAddress: 'OWNER', page: 2, limit: 100 }],
        expect.objectContaining({
          capability: 'das',
          cacheKey: 'dasown:OWNER:2',
        })
      );
    });

    it('defaults to page 1', async () => {
      rpcCall.mockResolvedValueOnce({ items: [] });

      await solana.getAssetsByOwner('OWNER');

      expect(rpcCall).toHaveBeenCalledWith(
        'getAssetsByOwner',
        [{ ownerAddress: 'OWNER', page: 1, limit: 100 }],
        expect.any(Object)
      );
    });
  });

  // ==== Enhanced Transactions ====

  describe('getEnhancedTransactions', () => {
    it('calls restCall with address and params', async () => {
      restCall.mockResolvedValueOnce([{ signature: 'tx1' }]);

      const result = await solana.getEnhancedTransactions(
        'MINT',
        { type: 'BURN' },
        {
          cacheKey: 'burns:20',
          cacheTTL: 120_000,
        }
      );

      expect(result).toEqual([{ signature: 'tx1' }]);
      expect(restCall).toHaveBeenCalledWith(
        '/v0/addresses/MINT/transactions',
        expect.objectContaining({
          params: { type: 'BURN' },
          cacheKey: 'burns:20',
          cacheTTL: 120_000,
        })
      );
    });
  });

  // ==== Writes ====

  describe('sendTransaction', () => {
    it('sends with skipPreflight false', async () => {
      rpcCall.mockResolvedValueOnce('sig123');

      const result = await solana.sendTransaction('base64tx');

      expect(result).toBe('sig123');
      expect(rpcCall).toHaveBeenCalledWith('sendTransaction', [
        'base64tx',
        { skipPreflight: false, preflightCommitment: 'confirmed' },
      ]);
    });

    it('does NOT pass cache options', async () => {
      rpcCall.mockResolvedValueOnce('sig');

      await solana.sendTransaction('tx');

      // rpcCall called with only 2 args (no opts), meaning no cacheKey
      expect(rpcCall.mock.calls[0]).toHaveLength(2);
    });
  });

  // ==== getLatestBlockhash ====

  describe('getLatestBlockhash', () => {
    it('unwraps value to flat object', async () => {
      rpcCall.mockResolvedValueOnce({
        value: {
          blockhash: 'abc123',
          lastValidBlockHeight: 12345n, // BigInt from RPC
        },
      });

      const result = await solana.getLatestBlockhash();

      expect(result).toEqual({
        blockhash: 'abc123',
        lastValidBlockHeight: 12345,
      });
      // lastValidBlockHeight is Number, not BigInt
      expect(typeof result.lastValidBlockHeight).toBe('number');
    });

    it('passes commitment param', async () => {
      rpcCall.mockResolvedValueOnce({
        value: { blockhash: 'x', lastValidBlockHeight: 1 },
      });

      await solana.getLatestBlockhash('finalized');

      expect(rpcCall).toHaveBeenCalledWith('getLatestBlockhash', [{ commitment: 'finalized' }]);
    });
  });

  // ==== getParsedTransaction ====

  describe('getParsedTransaction', () => {
    it('returns parsed transaction', async () => {
      const mockTx = {
        transaction: { message: { instructions: [] } },
        meta: { err: null },
        slot: 100,
      };
      rpcCall.mockResolvedValueOnce(mockTx);

      const result = await solana.getParsedTransaction('sig123');

      expect(result).toEqual(mockTx);
      expect(rpcCall).toHaveBeenCalledWith('getParsedTransaction', [
        'sig123',
        { commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
      ]);
    });

    it('returns null when transaction not found', async () => {
      rpcCall.mockResolvedValueOnce(null);

      const result = await solana.getParsedTransaction('missing');
      expect(result).toBeNull();
    });

    it('does NOT cache (verification must be fresh)', async () => {
      rpcCall.mockResolvedValueOnce(null);

      await solana.getParsedTransaction('sig');

      // No cacheKey in the call
      expect(rpcCall.mock.calls[0]).toHaveLength(2);
    });
  });

  // ==== getSignatureStatus ====

  describe('getSignatureStatus', () => {
    it('extracts first element from value array', async () => {
      rpcCall.mockResolvedValueOnce({
        value: [{ confirmationStatus: 'confirmed', slot: 50 }],
      });

      const result = await solana.getSignatureStatus('sig');

      expect(result).toEqual({ confirmationStatus: 'confirmed', slot: 50 });
    });

    it('returns null when value[0] is null', async () => {
      rpcCall.mockResolvedValueOnce({ value: [null] });

      const result = await solana.getSignatureStatus('sig');
      expect(result).toBeNull();
    });
  });

  // ==== waitForConfirmation ====

  describe('waitForConfirmation', () => {
    it('returns confirmed on first poll', async () => {
      rpcCall.mockResolvedValueOnce({
        value: [{ confirmationStatus: 'confirmed', slot: 10 }],
      });

      const result = await solana.waitForConfirmation('sig', {
        maxAttempts: 3,
        delayMs: 1,
      });

      expect(result).toEqual({
        confirmed: true,
        slot: 10,
        confirmationStatus: 'confirmed',
      });
    });

    it('returns timeout after maxAttempts', async () => {
      rpcCall.mockResolvedValue({ value: [null] }); // always null

      const result = await solana.waitForConfirmation('sig', {
        maxAttempts: 2,
        delayMs: 1,
      });

      expect(result).toEqual({ confirmed: false, error: 'Confirmation timeout' });
    });

    it('returns failed for on-chain error', async () => {
      rpcCall.mockResolvedValueOnce({
        value: [{ err: { InstructionError: [0, 'Custom'] }, slot: 5 }],
      });

      const result = await solana.waitForConfirmation('sig', {
        maxAttempts: 1,
        delayMs: 1,
      });

      expect(result).toEqual({
        confirmed: false,
        error: 'Transaction failed on-chain',
        slot: 5,
      });
    });

    it('swallows RPC errors and retries', async () => {
      rpcCall.mockRejectedValueOnce(new Error('network error'));
      rpcCall.mockResolvedValueOnce({
        value: [{ confirmationStatus: 'finalized', slot: 20 }],
      });

      const result = await solana.waitForConfirmation('sig', {
        maxAttempts: 3,
        delayMs: 1,
      });

      expect(result.confirmed).toBe(true);
    });

    it('requires finalized when commitment is finalized', async () => {
      rpcCall.mockResolvedValueOnce({
        value: [{ confirmationStatus: 'confirmed', slot: 10 }],
      });
      rpcCall.mockResolvedValueOnce({
        value: [{ confirmationStatus: 'finalized', slot: 15 }],
      });

      const result = await solana.waitForConfirmation('sig', {
        commitment: 'finalized',
        maxAttempts: 3,
        delayMs: 1,
      });

      expect(result.confirmed).toBe(true);
      expect(result.confirmationStatus).toBe('finalized');
      expect(rpcCall).toHaveBeenCalledTimes(2);
    });
  });

  // ==== getSlot ====

  describe('getSlot', () => {
    it('returns slot number', async () => {
      rpcCall.mockResolvedValueOnce(12345);
      expect(await solana.getSlot()).toBe(12345);
    });
  });

  // ==== Module contract ====

  describe('exports', () => {
    const expectedExports = [
      'getBalance',
      'getTokenAccountsByOwner',
      'getTokenSupply',
      'getPriorityFeeEstimate',
      'getAsset',
      'getAssetsByOwner',
      'getEnhancedTransactions',
      'sendTransaction',
      'getLatestBlockhash',
      'getParsedTransaction',
      'getSignatureStatus',
      'waitForConfirmation',
      'getSlot',
    ];

    it.each(expectedExports)('exports %s as a function', name => {
      expect(typeof solana[name]).toBe('function');
    });

    it('exports exactly 13 functions', () => {
      expect(Object.keys(solana)).toHaveLength(13);
    });
  });
});
