/**
 * REVLoans calldata encoding + borrowable amount query.
 * Uses manual ABI encoding (same pattern as terminal.ts).
 *
 * Source of truth: https://github.com/rev-net/revnet-core-v5/blob/main/src/REVLoans.sol
 */

import { USDC_ADDRESSES, USDC_DECIMALS, JB_MULTI_TERMINAL, getChainById } from '../constants/juicebox';
import { REV_LOANS_ADDRESS } from '../constants/juicebox';
import type { TransactionData } from './terminal';

// ============================================================================
// Constants
// ============================================================================

// borrowFrom(uint256,(address,address),uint256,uint256,address,uint256)
// Params: revnetId, REVLoanSource(token, terminal), minBorrowAmount, collateralCount, beneficiary, prepaidFeePercent
const BORROW_FROM_SELECTOR = '0x83b4cf2f';

// borrowableAmountFrom(uint256,uint256,uint256,uint256)
// Params: revnetId, collateralCount, decimals, currency
const BORROWABLE_AMOUNT_SELECTOR = '0xa4a0481a';

// USDC currency = uint32(uint160(usdcAddress)) — lower 4 bytes of token address
function usdcCurrency(chainId: number): number {
  const addr = USDC_ADDRESSES[chainId];
  if (!addr) throw new Error(`No USDC address for chain ${chainId}`);
  return parseInt(addr.toLowerCase().replace(/^0x/, '').slice(-8), 16);
}

// ============================================================================
// Calldata Encoders
// ============================================================================

export interface BorrowFromParams {
  projectId: number;
  minBorrowAmount: bigint;  // Minimum USDC to receive (6 decimals), slippage protection
  collateral: bigint;       // Store token amount to burn (18 decimals)
  beneficiary: string;      // Who receives USDC
}

/**
 * Encode REVLoans.borrowFrom() calldata.
 *
 * borrowFrom(
 *   uint256 revnetId,
 *   REVLoanSource calldata source,  // (address token, address terminal)
 *   uint256 minBorrowAmount,
 *   uint256 collateralCount,
 *   address payable beneficiary,
 *   uint256 prepaidFeePercent
 * )
 *
 * The REVLoanSource struct is ABI-encoded inline as a tuple (address, address).
 * All types are static — no dynamic offsets needed.
 */
export function buildBorrowFromTransaction(
  params: BorrowFromParams,
  chainId: number
): TransactionData {
  const usdcAddress = USDC_ADDRESSES[chainId];
  if (!usdcAddress) throw new Error(`No USDC address for chain ${chainId}`);

  // revnetId
  const revnetIdHex = params.projectId.toString(16).padStart(64, '0');
  // REVLoanSource.token
  const tokenHex = usdcAddress.slice(2).toLowerCase().padStart(64, '0');
  // REVLoanSource.terminal
  const terminalHex = JB_MULTI_TERMINAL.slice(2).toLowerCase().padStart(64, '0');
  // minBorrowAmount
  const minBorrowHex = params.minBorrowAmount.toString(16).padStart(64, '0');
  // collateralCount
  const collateralHex = params.collateral.toString(16).padStart(64, '0');
  // beneficiary
  const beneficiaryHex = params.beneficiary.slice(2).toLowerCase().padStart(64, '0');
  // prepaidFeePercent = 25 (0.25% = minimum, ~6 months prepaid)
  const feePercentHex = (25).toString(16).padStart(64, '0');

  return {
    to: REV_LOANS_ADDRESS,
    data:
      BORROW_FROM_SELECTOR +
      revnetIdHex +
      tokenHex +          // source.token (first field of struct)
      terminalHex +       // source.terminal (second field of struct)
      minBorrowHex +
      collateralHex +
      beneficiaryHex +
      feePercentHex,
    chainId,
  };
}

// ============================================================================
// RPC Query
// ============================================================================

/**
 * Make an eth_call with fallback RPC URLs (same pattern as bendystraw.ts).
 */
async function rpcCall(rpcUrls: readonly string[], to: string, data: string): Promise<string | null> {
  for (const rpcUrl of rpcUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const result = await response.json();
      if (result.error) continue;
      if (result.result && result.result !== '0x') return result.result;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Query REVLoans.borrowableAmountFrom() to get the max USDC borrowable for
 * a given collateral amount.
 *
 * borrowableAmountFrom(uint256 revnetId, uint256 collateralCount, uint256 decimals, uint256 currency)
 *
 * @returns USDC amount in 6 decimals, or null on failure.
 */
export async function fetchBorrowableAmount(
  chainId: number,
  projectId: number,
  collateral: bigint
): Promise<bigint | null> {
  const chain = getChainById(chainId);
  if (!chain) return null;

  const currency = usdcCurrency(chainId);

  const revnetIdHex = projectId.toString(16).padStart(64, '0');
  const collateralHex = collateral.toString(16).padStart(64, '0');
  const decimalsHex = USDC_DECIMALS.toString(16).padStart(64, '0');
  const currencyHex = currency.toString(16).padStart(64, '0');

  const data =
    BORROWABLE_AMOUNT_SELECTOR +
    revnetIdHex +
    collateralHex +
    decimalsHex +
    currencyHex;

  const result = await rpcCall(chain.rpcUrls, REV_LOANS_ADDRESS, data);
  if (!result) return null;

  // Result is a uint256 ABI-encoded (32 bytes)
  return BigInt(result);
}
