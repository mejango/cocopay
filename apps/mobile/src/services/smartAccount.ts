/**
 * Smart Account encoding utilities.
 * Encodes SimpleAccount.execute(address, uint256, bytes) calldata.
 */

// SimpleAccount.execute selector: keccak256("execute(address,uint256,bytes)") = 0xb61d27f6
const EXECUTE_SELECTOR = 'b61d27f6';

/**
 * ABI-encode a SimpleAccount.execute(target, value, data) call.
 * @param target - The contract to call
 * @param value - ETH value to send (usually 0 for ERC-20 operations)
 * @param data - The inner calldata (e.g., ERC-20 approve or terminal.pay)
 */
export function encodeSmartAccountExecute(
  target: string,
  value: bigint,
  data: string
): string {
  const targetHex = target.replace('0x', '').toLowerCase().padStart(64, '0');
  const valueHex = value.toString(16).padStart(64, '0');

  const dataBytes = data.replace('0x', '');
  // bytes offset = 0x60 (3 * 32)
  const dataOffset = '0000000000000000000000000000000000000000000000000000000000000060';
  const dataLength = (dataBytes.length / 2).toString(16).padStart(64, '0');
  const dataPadded = dataBytes + '0'.repeat((64 - (dataBytes.length % 64)) % 64);

  return '0x' + EXECUTE_SELECTOR + targetHex + valueHex + dataOffset + dataLength + dataPadded;
}
