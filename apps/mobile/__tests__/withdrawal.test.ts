import { buildTokenTransferTransaction } from '../src/services/terminal';
import { USDC_ADDRESSES } from '../src/constants/juicebox';

const RECIPIENT = '0x21a8c5f5666EC3b786585EABc311D9de18A5Db6C';
const AMOUNT = 1_000_000n; // 1 USDC (6 decimals)

describe('buildTokenTransferTransaction — ERC-20 transfer encoding', () => {
  const tx = buildTokenTransferTransaction(
    USDC_ADDRESSES[8453],
    RECIPIENT,
    AMOUNT,
    8453
  );

  it('starts with correct selector (0xa9059cbb)', () => {
    expect(tx.data).toMatch(/^0x/);
    expect(tx.data.slice(2, 10)).toBe('a9059cbb');
  });

  it('encodes recipient address left-padded to 32 bytes', () => {
    const recipientSlot = tx.data.slice(10, 74);
    expect(recipientSlot).toBe(
      RECIPIENT.slice(2).toLowerCase().padStart(64, '0')
    );
  });

  it('encodes amount as uint256', () => {
    const amountSlot = tx.data.slice(74, 138);
    expect(amountSlot).toBe(AMOUNT.toString(16).padStart(64, '0'));
  });

  it('targets correct token address (USDC on Base)', () => {
    expect(tx.to.toLowerCase()).toBe(USDC_ADDRESSES[8453].toLowerCase());
  });

  it('has correct total calldata length: 4 + (2 * 32) = 68 bytes = 138 hex chars with 0x', () => {
    // 0x (2) + selector (8) + 2 words * 64 = 2 + 8 + 128 = 138
    expect(tx.data.length).toBe(138);
  });

  it('sets chainId on the transaction', () => {
    expect(tx.chainId).toBe(8453);
  });

  it('does not set a value (ERC-20 transfers are not payable)', () => {
    expect(tx.value).toBeUndefined();
  });
});

describe('buildTokenTransferTransaction — multi-chain', () => {
  const chains = [
    { chainId: 1, name: 'Ethereum' },
    { chainId: 10, name: 'Optimism' },
    { chainId: 8453, name: 'Base' },
    { chainId: 42161, name: 'Arbitrum' },
  ];

  it.each(chains)(
    'targets correct USDC address for $name (chain $chainId)',
    ({ chainId }) => {
      const tx = buildTokenTransferTransaction(
        USDC_ADDRESSES[chainId],
        RECIPIENT,
        AMOUNT,
        chainId
      );
      expect(tx.to.toLowerCase()).toBe(USDC_ADDRESSES[chainId].toLowerCase());
    }
  );
});

describe('buildTokenTransferTransaction — edge cases', () => {
  it('encodes large amounts correctly', () => {
    const largeAmount = 10n ** 18n; // Way more than USDC max but valid uint256
    const tx = buildTokenTransferTransaction(
      USDC_ADDRESSES[8453],
      RECIPIENT,
      largeAmount,
      8453
    );
    const amountSlot = tx.data.slice(74, 138);
    expect(amountSlot).toBe(largeAmount.toString(16).padStart(64, '0'));
  });

  it('encodes zero amount', () => {
    const tx = buildTokenTransferTransaction(
      USDC_ADDRESSES[8453],
      RECIPIENT,
      0n,
      8453
    );
    const amountSlot = tx.data.slice(74, 138);
    expect(amountSlot).toBe('0'.repeat(64));
  });
});
