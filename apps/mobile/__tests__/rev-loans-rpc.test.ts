/**
 * Integration tests for REVLoans RPC queries.
 * These hit real public RPC endpoints — requires internet.
 */
import { fetchBorrowableAmount } from '../src/services/revLoans';

jest.setTimeout(30_000);

describe('fetchBorrowableAmount — real RPC calls', () => {
  describe('Base (chain 8453)', () => {
    it('returns a positive amount for project 6 (Artizen) with 1000e18 collateral', async () => {
      const result = await fetchBorrowableAmount(8453, 6, 1000n * 10n ** 18n);
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(0n);
    });

    it('returns 0 for zero collateral', async () => {
      const result = await fetchBorrowableAmount(8453, 6, 0n);
      expect(result).toBe(0n);
    });

    it('returns 0 for nonexistent project', async () => {
      const result = await fetchBorrowableAmount(8453, 999999, 10n ** 18n);
      expect(result).toBe(0n);
    });
  });

  describe('Ethereum (chain 1)', () => {
    it('returns null for project 3 (ETH loans, not USDC) — negative test', async () => {
      // Project 3 on Ethereum has ETH-denominated loans, not USDC.
      // Querying with USDC currency should revert.
      const result = await fetchBorrowableAmount(1, 3, 1000n * 10n ** 18n);
      expect(result).toBeNull();
    });
  });

  describe('unsupported chain', () => {
    it('returns null for unknown chain ID', async () => {
      const result = await fetchBorrowableAmount(999, 1, 10n ** 18n);
      expect(result).toBeNull();
    });
  });
});
