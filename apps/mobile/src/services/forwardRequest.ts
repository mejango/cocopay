/**
 * EIP-712 ForwardRequest builder for ERC-2771 ForwarderV2.
 * Used by self-custody users to sign ForwardRequests client-side via signTypedData.
 */

import { ERC2771_FORWARDER } from '../constants/juicebox';

// EIP-712 domain for the ERC-2771 forwarder
export function buildForwarderDomain(chainId: number) {
  return {
    name: 'ERC2771Forwarder',
    version: '1',
    chainId,
    verifyingContract: ERC2771_FORWARDER,
  } as const;
}

// EIP-712 types for ForwardRequest
export const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ],
} as const;

export interface ForwardRequestMessage {
  from: string;    // Smart account owner (signer)
  to: string;      // Smart account address (target of forwarder call)
  value: bigint;
  gas: bigint;
  nonce: bigint;
  deadline: number;
  data: string;    // SmartAccount.execute(...) calldata
}

/**
 * Build EIP-712 typed data for signTypedData.
 * Returns { domain, types, primaryType, message } ready for wagmi/viem.
 */
export function buildForwardRequestTypedData(params: {
  chainId: number;
  from: string;
  to: string;
  data: string;
  nonce: bigint;
  deadline?: number;
  gas?: bigint;
}) {
  const message: ForwardRequestMessage = {
    from: params.from,
    to: params.to,
    value: 0n,
    gas: params.gas ?? 500_000n,
    nonce: params.nonce,
    deadline: params.deadline ?? Math.floor(Date.now() / 1000) + 3600, // 1 hour
    data: params.data,
  };

  return {
    domain: buildForwarderDomain(params.chainId),
    types: FORWARD_REQUEST_TYPES,
    primaryType: 'ForwardRequest' as const,
    message,
  };
}

/**
 * ABI-encode forwarder.execute((address,address,uint256,uint256,uint48,bytes,bytes)) calldata.
 * Call this after getting the signature from signTypedData.
 */
export function encodeForwarderExecuteCalldata(
  request: ForwardRequestMessage,
  signature: string
): string {
  // execute((address,address,uint256,uint256,uint48,bytes,bytes))
  // Selector: first 4 bytes of keccak256 of the function signature
  // Pre-computed: 0xd5aeaba5 (verified against OpenZeppelin ERC2771Forwarder)
  const selector = 'd5aeaba5';

  const fromEnc = request.from.replace('0x', '').toLowerCase().padStart(64, '0');
  const toEnc = request.to.replace('0x', '').toLowerCase().padStart(64, '0');
  const valueEnc = request.value.toString(16).padStart(64, '0');
  const gasEnc = request.gas.toString(16).padStart(64, '0');
  const deadlineEnc = request.deadline.toString(16).padStart(64, '0');

  // Dynamic fields offsets (7 fields * 32 = 224 = 0xe0)
  const dataBytes = request.data.replace('0x', '');
  const sigBytes = signature.replace('0x', '');

  const dataOffset = 'e0'; // offset to data bytes
  const dataPaddedLen = Math.ceil(dataBytes.length / 2 / 32) * 32;
  const sigOffsetVal = 0xe0 + 32 + dataPaddedLen;
  const sigOffset = sigOffsetVal.toString(16);

  // Encode data
  const dataLen = (dataBytes.length / 2).toString(16).padStart(64, '0');
  const dataPadded = dataBytes + '0'.repeat(dataPaddedLen * 2 - dataBytes.length);

  // Encode signature
  const sigLen = (sigBytes.length / 2).toString(16).padStart(64, '0');
  const sigPaddedLen = Math.ceil(sigBytes.length / 2 / 32) * 32;
  const sigPadded = sigBytes + '0'.repeat(sigPaddedLen * 2 - sigBytes.length);

  // Tuple offset (always 0x20 for single tuple param)
  const tupleOffset = '20'.padStart(64, '0');

  return '0x' + selector +
    tupleOffset +
    fromEnc + toEnc + valueEnc + gasEnc + deadlineEnc +
    dataOffset.padStart(64, '0') + sigOffset.padStart(64, '0') +
    dataLen + dataPadded +
    sigLen + sigPadded;
}
