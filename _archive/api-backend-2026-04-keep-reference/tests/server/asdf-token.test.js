/**
 * Tests for api/services/asdf-token.js (Layer 4)
 *
 * Mocks solana.js (Layer 3) to test domain logic in isolation.
 * Validates: shape contracts, isHolder threshold, BigInt precision,
 * batch concurrency, supply burn math.
 */

'use strict';

jest.mock('../../../api/services/helius/solana', () => ({
  getTokenAccountsByOwner: jest.fn(),
  getTokenSupply: jest.fn(),
  getPriorityFeeEstimate: jest.fn(),
}));

const solana = require('../../../api/services/helius/solana');
const { ASDF } = require('../../../api/services/helius/config');
const token = require('../../../api/services/asdf-token');

describe('asdf-token (Layer 4)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ==== getTokenBalance ====

  describe('getTokenBalance', () => {
    it('returns correct shape: { balance, rawBalance, isHolder }', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({
        value: [
          {
            account: {
              data: { parsed: { info: { tokenAmount: { amount: '5000000000000' } } } },
            },
          },
        ],
      });

      const result = await token.getTokenBalance('WALLET');

      expect(result).toEqual({
        balance: 5000000,
        rawBalance: '5000000000000',
        isHolder: true,
      });
    });

    it('sums multiple token accounts with BigInt precision', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({
        value: [
          { account: { data: { parsed: { info: { tokenAmount: { amount: '3000000000000' } } } } } },
          { account: { data: { parsed: { info: { tokenAmount: { amount: '2000000000000' } } } } } },
        ],
      });

      const result = await token.getTokenBalance('WALLET');

      expect(result.balance).toBe(5000000);
      expect(result.rawBalance).toBe('5000000000000');
    });

    it('returns isHolder=false below MIN_HOLDER_BALANCE', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({
        value: [
          {
            account: {
              data: { parsed: { info: { tokenAmount: { amount: '999999000000' } } } },
            },
          },
        ],
      });

      const result = await token.getTokenBalance('WALLET');

      expect(result.balance).toBe(999999);
      expect(result.isHolder).toBe(false);
    });

    it('returns isHolder=true at exactly MIN_HOLDER_BALANCE', async () => {
      const rawAtThreshold = String(ASDF.MIN_HOLDER_BALANCE * 10 ** ASDF.DECIMALS);
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({
        value: [
          {
            account: {
              data: { parsed: { info: { tokenAmount: { amount: rawAtThreshold } } } },
            },
          },
        ],
      });

      const result = await token.getTokenBalance('WALLET');

      expect(result.balance).toBe(ASDF.MIN_HOLDER_BALANCE);
      expect(result.isHolder).toBe(true);
    });

    it('handles empty token accounts (zero balance)', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({ value: [] });

      const result = await token.getTokenBalance('WALLET');

      expect(result).toEqual({
        balance: 0,
        rawBalance: '0',
        isHolder: false,
      });
    });

    it('handles null value array', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({ value: null });

      const result = await token.getTokenBalance('WALLET');

      expect(result.balance).toBe(0);
      expect(result.rawBalance).toBe('0');
    });

    it('skips accounts with missing amount field', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({
        value: [
          { account: { data: { parsed: { info: { tokenAmount: {} } } } } },
          { account: { data: { parsed: { info: { tokenAmount: { amount: '1000000000000' } } } } } },
        ],
      });

      const result = await token.getTokenBalance('WALLET');

      expect(result.balance).toBe(1000000);
    });

    it('passes ASDF.MINT to solana.getTokenAccountsByOwner', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({ value: [] });

      await token.getTokenBalance('MY_WALLET');

      expect(solana.getTokenAccountsByOwner).toHaveBeenCalledWith('MY_WALLET', ASDF.MINT);
    });
  });

  // ==== isHolder ====

  describe('isHolder', () => {
    it('returns true for holder', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({
        value: [
          {
            account: {
              data: { parsed: { info: { tokenAmount: { amount: '2000000000000' } } } },
            },
          },
        ],
      });

      expect(await token.isHolder('WALLET')).toBe(true);
    });

    it('returns false for non-holder', async () => {
      solana.getTokenAccountsByOwner.mockResolvedValueOnce({ value: [] });

      expect(await token.isHolder('WALLET')).toBe(false);
    });
  });

  // ==== getSupplyStats ====

  describe('getSupplyStats', () => {
    it('returns correct shape: { current, currentRaw, burned, burnedRaw }', async () => {
      solana.getTokenSupply.mockResolvedValueOnce({
        amount: '993000000000000',
        decimals: 6,
        uiAmount: 993000000,
      });

      const result = await token.getSupplyStats();

      expect(result).toEqual({
        current: 993000000,
        currentRaw: '993000000000000',
        burned: 7000000,
        burnedRaw: '7000000000000',
      });
    });

    it('computes burned from INITIAL_SUPPLY - current', async () => {
      solana.getTokenSupply.mockResolvedValueOnce({
        amount: '500000000000000',
        decimals: 6,
        uiAmount: 500000000,
      });

      const result = await token.getSupplyStats();

      expect(result.burned).toBe(ASDF.INITIAL_SUPPLY - 500000000);
      expect(result.current).toBe(500000000);
    });

    it('handles zero burns (full supply)', async () => {
      solana.getTokenSupply.mockResolvedValueOnce({
        amount: '1000000000000000',
        decimals: 6,
        uiAmount: 1000000000,
      });

      const result = await token.getSupplyStats();

      expect(result.burned).toBe(0);
      expect(result.burnedRaw).toBe('0');
    });

    it('passes ASDF.MINT to solana.getTokenSupply', async () => {
      solana.getTokenSupply.mockResolvedValueOnce({
        amount: '0',
        decimals: 6,
        uiAmount: 0,
      });

      await token.getSupplyStats();

      expect(solana.getTokenSupply).toHaveBeenCalledWith(ASDF.MINT);
    });
  });

  // ==== getBatchTokenBalances ====

  describe('getBatchTokenBalances', () => {
    it('returns Map with correct entries', async () => {
      solana.getTokenAccountsByOwner
        .mockResolvedValueOnce({
          value: [
            {
              account: { data: { parsed: { info: { tokenAmount: { amount: '1000000000000' } } } } },
            },
          ],
        })
        .mockResolvedValueOnce({ value: [] });

      const result = await token.getBatchTokenBalances(['W1', 'W2']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('W1').balance).toBe(1000000);
      expect(result.get('W1').isHolder).toBe(true);
      expect(result.get('W2').balance).toBe(0);
      expect(result.get('W2').isHolder).toBe(false);
    });

    it('handles errors gracefully with fallback entry', async () => {
      solana.getTokenAccountsByOwner
        .mockResolvedValueOnce({
          value: [
            {
              account: { data: { parsed: { info: { tokenAmount: { amount: '1000000000000' } } } } },
            },
          ],
        })
        .mockRejectedValueOnce(new Error('RPC timeout'));

      const result = await token.getBatchTokenBalances(['W1', 'W2']);

      expect(result.get('W1').balance).toBe(1000000);
      expect(result.get('W2')).toEqual({
        balance: 0,
        rawBalance: '0',
        isHolder: false,
        error: 'RPC timeout',
      });
    });

    it('batches in groups of 5 (Fibonacci concurrency)', async () => {
      const wallets = Array.from({ length: 7 }, (_, i) => `W${i}`);
      solana.getTokenAccountsByOwner.mockResolvedValue({ value: [] });

      await token.getBatchTokenBalances(wallets);

      // 7 wallets = 2 batches (5 + 2)
      expect(solana.getTokenAccountsByOwner).toHaveBeenCalledTimes(7);
    });

    it('handles empty input', async () => {
      const result = await token.getBatchTokenBalances([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  // ==== getPriorityFeeEstimate ====

  describe('getPriorityFeeEstimate', () => {
    it('passes through to solana.getPriorityFeeEstimate', async () => {
      solana.getPriorityFeeEstimate.mockResolvedValueOnce(75000);

      const result = await token.getPriorityFeeEstimate(['ACCT1']);

      expect(result).toBe(75000);
      expect(solana.getPriorityFeeEstimate).toHaveBeenCalledWith(['ACCT1']);
    });
  });

  // ==== Module contract ====

  describe('exports', () => {
    const expectedExports = [
      'getTokenBalance',
      'isHolder',
      'getSupplyStats',
      'getBatchTokenBalances',
      'getPriorityFeeEstimate',
    ];

    it.each(expectedExports)('exports %s as a function', name => {
      expect(typeof token[name]).toBe('function');
    });

    it('exports exactly 5 functions', () => {
      expect(Object.keys(token)).toHaveLength(5);
    });
  });
});
