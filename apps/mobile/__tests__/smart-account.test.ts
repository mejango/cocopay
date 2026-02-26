import { encodeSmartAccountExecute } from '../src/services/smartAccount';

describe('encodeSmartAccountExecute', () => {
  it('encodes with correct selector (0xb61d27f6)', () => {
    const result = encodeSmartAccountExecute(
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      0n,
      '0x095ea7b3' + '00'.repeat(64)
    );

    expect(result).toMatch(/^0x/);
    expect(result.slice(2, 10)).toBe('b61d27f6');
  });

  it('encodes target address left-padded to 32 bytes', () => {
    const target = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const result = encodeSmartAccountExecute(target, 0n, '0x00');

    // After selector (8 hex chars), next 64 hex chars = target
    const targetSlot = result.slice(10, 74);
    expect(targetSlot).toBe(
      target.replace('0x', '').toLowerCase().padStart(64, '0')
    );
  });

  it('encodes value as uint256', () => {
    const result = encodeSmartAccountExecute(
      '0x' + '11'.repeat(20),
      1000n,
      '0x00'
    );

    // Value slot is at offset 10 + 64 = 74, 64 chars wide
    const valueSlot = result.slice(74, 138);
    expect(valueSlot).toBe((1000).toString(16).padStart(64, '0'));
  });

  it('encodes data with correct offset and length', () => {
    const innerData = '0x095ea7b3' + 'ab'.repeat(64);
    const result = encodeSmartAccountExecute(
      '0x' + '11'.repeat(20),
      0n,
      innerData
    );

    // Data offset should be 0x60 (96) = 3 * 32
    const dataOffsetSlot = result.slice(138, 202);
    expect(dataOffsetSlot).toBe(
      '0000000000000000000000000000000000000000000000000000000000000060'
    );

    // Data length (in bytes)
    const dataBytes = innerData.replace('0x', '');
    const expectedLen = (dataBytes.length / 2).toString(16).padStart(64, '0');
    const dataLenSlot = result.slice(202, 266);
    expect(dataLenSlot).toBe(expectedLen);
  });

  it('pads data to 32-byte boundary', () => {
    // 5 bytes of data (10 hex chars) — should pad to 32 bytes
    const result = encodeSmartAccountExecute(
      '0x' + '11'.repeat(20),
      0n,
      '0x' + 'ab'.repeat(5)
    );

    // ABI body after the 4-byte selector should be word-aligned (multiple of 32 bytes = 64 hex chars)
    const bodyAfterSelector = result.slice(10); // strip 0x (2) + selector (8)
    expect(bodyAfterSelector.length % 64).toBe(0);
  });

  it('handles empty data (0x)', () => {
    const result = encodeSmartAccountExecute(
      '0x' + '11'.repeat(20),
      0n,
      '0x'
    );

    expect(result).toMatch(/^0xb61d27f6/);
    // Data length should be 0
    const dataLenSlot = result.slice(202, 266);
    expect(dataLenSlot).toBe('0'.repeat(64));
  });

  it('matches backend SIMPLE_ACCOUNT_EXECUTE_SELECTOR', () => {
    // Backend uses 'b61d27f6' — verify frontend uses the same
    const result = encodeSmartAccountExecute('0x' + '00'.repeat(20), 0n, '0x');
    expect(result.slice(2, 10)).toBe('b61d27f6');
  });
});
