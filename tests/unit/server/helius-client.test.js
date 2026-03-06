/**
 * Tests for api/services/helius/client.js
 * Validates priority fee propagation, connection management, and API contracts
 */

'use strict';

// Mock @solana/web3.js before requiring client
const mockSerialize = jest.fn().mockReturnValue(Buffer.from('mock-tx'));
const mockAdd = jest.fn();
const mockTransaction = jest.fn().mockImplementation(() => ({
  add: mockAdd,
  serialize: mockSerialize,
}));

const mockGetLatestBlockhash = jest.fn().mockResolvedValue({
  blockhash: 'test-blockhash',
  lastValidBlockHeight: 100n,
});
const mockGetSlot = jest.fn().mockResolvedValue(42);
const mockGetTokenAccountBalance = jest.fn().mockResolvedValue({
  value: { uiAmount: 1000, amount: '1000000000' },
});
const mockGetSignatureStatus = jest.fn().mockResolvedValue({ value: null });
const mockConnection = {
  getLatestBlockhash: mockGetLatestBlockhash,
  getSlot: mockGetSlot,
  getTokenAccountBalance: mockGetTokenAccountBalance,
  getSignatureStatus: mockGetSignatureStatus,
};

jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => mockConnection),
  PublicKey: jest.fn().mockImplementation(addr => {
    if (addr === undefined || addr === null) throw new Error('Invalid public key input');
    return { toBase58: () => addr, toString: () => addr };
  }),
  Transaction: mockTransaction,
  ComputeBudgetProgram: {
    setComputeUnitPrice: jest.fn().mockReturnValue({ type: 'setComputeUnitPrice' }),
    setComputeUnitLimit: jest.fn().mockReturnValue({ type: 'setComputeUnitLimit' }),
  },
}));

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn().mockResolvedValue({
    toBase58: () => 'mock-token-account',
    toString: () => 'mock-token-account',
  }),
  createBurnInstruction: jest.fn().mockReturnValue({ type: 'burn' }),
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}));

// Mock fetch for priority fee API
const DYNAMIC_FEE = 75000;
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () =>
    Promise.resolve({
      result: {
        priorityFeeEstimate: DYNAMIC_FEE,
        priorityFeeLevels: {
          low: 25000,
          medium: DYNAMIC_FEE,
          high: 150000,
          veryHigh: 500000,
        },
      },
    }),
});

// Set env before requiring module
process.env.HELIUS_API_KEY = 'test-key-123';
process.env.HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=test-key-123';

const heliusClient = require('../../../api/services/helius/client');

describe('helius/client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear internal cache so each test gets fresh API calls
    heliusClient.clearAllCaches();
    // Restore default fetch mock
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: {
            priorityFeeEstimate: DYNAMIC_FEE,
            priorityFeeLevels: {
              low: 25000,
              medium: DYNAMIC_FEE,
              high: 150000,
              veryHigh: 500000,
            },
          },
        }),
    });
  });

  describe('buildBurnTransaction', () => {
    it('returns dynamic priority fee, not hardcoded default', async () => {
      const result = await heliusClient.buildBurnTransaction(
        '11111111111111111111111111111111',
        100
      );

      // G2 regression: must return the actual computed fee, not PRIORITY_FEE_CONFIG.default (50000)
      expect(result.priorityFee).toBe(DYNAMIC_FEE);
      expect(result.priorityFee).not.toBe(heliusClient.PRIORITY_FEE_CONFIG.default);
    });

    it('returns transaction, blockhash, and lastValidBlockHeight', async () => {
      const result = await heliusClient.buildBurnTransaction(
        '11111111111111111111111111111111',
        50
      );

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('blockhash', 'test-blockhash');
      expect(result).toHaveProperty('lastValidBlockHeight');
      expect(result).toHaveProperty('priorityFee');
    });

    it('adds 3 instructions in correct order: computeLimit, priorityFee, burn', async () => {
      await heliusClient.buildBurnTransaction('11111111111111111111111111111111', 100);

      expect(mockAdd).toHaveBeenCalledTimes(3);
      expect(mockAdd.mock.calls[0][0]).toEqual({ type: 'setComputeUnitLimit' });
      expect(mockAdd.mock.calls[1][0]).toEqual({ type: 'setComputeUnitPrice' });
      expect(mockAdd.mock.calls[2][0]).toEqual({ type: 'burn' });
    });
  });

  describe('getPriorityFeeEstimate', () => {
    it('calls Helius getPriorityFeeEstimate JSON-RPC method', async () => {
      const fee = await heliusClient.getPriorityFeeEstimate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('helius-rpc.com'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('getPriorityFeeEstimate'),
        })
      );
      expect(fee).toBe(DYNAMIC_FEE);
    });

    it('clamps fee within min/max bounds', async () => {
      // Return a fee below minimum
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: { priorityFeeEstimate: 1 },
          }),
      });

      const fee = await heliusClient.getPriorityFeeEstimate();
      expect(fee).toBeGreaterThanOrEqual(heliusClient.PRIORITY_FEE_CONFIG.min);
    });

    it('returns default fee on API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { message: 'Internal error' },
          }),
      });

      const fee = await heliusClient.getPriorityFeeEstimate();
      expect(fee).toBe(heliusClient.PRIORITY_FEE_CONFIG.default);
    });
  });

  describe('connection management', () => {
    it('exports resetConnectionPool', () => {
      expect(typeof heliusClient.resetConnectionPool).toBe('function');
    });

    it('exports redactApiKey for safe logging', () => {
      const redacted = heliusClient.redactApiKey(
        'https://mainnet.helius-rpc.com/?api-key=secret123'
      );
      expect(redacted).not.toContain('secret123');
      expect(redacted).toContain('REDACTED');
    });
  });

  describe('isValidAddress', () => {
    it('accepts valid 32-44 char base58 strings', () => {
      expect(heliusClient.isValidAddress('11111111111111111111111111111111')).toBe(true);
    });

    it('rejects undefined input', () => {
      expect(heliusClient.isValidAddress(undefined)).toBe(false);
    });
  });
});
