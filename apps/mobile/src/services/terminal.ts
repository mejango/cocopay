import { JB_MULTI_TERMINAL, NATIVE_TOKEN, getChainById } from '../constants/juicebox';

// JBMultiTerminal ABI (only functions we need)
export const JB_MULTI_TERMINAL_ABI = [
  {
    name: 'pay',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'beneficiary', type: 'address' },
      { name: 'minReturnedTokens', type: 'uint256' },
      { name: 'memo', type: 'string' },
      { name: 'metadata', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'cashOutTokensOf',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'holder', type: 'address' },
      { name: 'projectId', type: 'uint256' },
      { name: 'cashOutCount', type: 'uint256' },
      { name: 'tokenToReclaim', type: 'address' },
      { name: 'minTokensReclaimed', type: 'uint256' },
      { name: 'beneficiary', type: 'address' },
      { name: 'metadata', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Build transaction data for paying a project
export interface PayParams {
  projectId: number;
  token?: string; // defaults to native token (ETH)
  amount: bigint; // in wei
  beneficiary: string;
  minReturnedTokens?: bigint;
  memo?: string;
  metadata?: string;
}

export interface TransactionData {
  to: string;
  data: string;
  value?: string;
  chainId: number;
}

// Simple ABI encoding without viem dependency (for pay function)
function encodePayCalldata(params: PayParams): string {
  const {
    projectId,
    token = NATIVE_TOKEN,
    amount,
    beneficiary,
    minReturnedTokens = BigInt(0),
    memo = '',
    metadata = '0x',
  } = params;

  // Function selector for pay(uint256,address,uint256,address,uint256,string,bytes)
  const selector = '0x1ebc4c91';

  // Encode parameters (simplified - in production use viem/ethers)
  const projectIdHex = projectId.toString(16).padStart(64, '0');
  const tokenHex = token.slice(2).toLowerCase().padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  const beneficiaryHex = beneficiary.slice(2).toLowerCase().padStart(64, '0');
  const minTokensHex = minReturnedTokens.toString(16).padStart(64, '0');

  // Dynamic data offsets (7 params * 32 bytes = 224 = 0xe0)
  const memoOffset = (7 * 32).toString(16).padStart(64, '0'); // offset to memo
  const metadataOffset = ((7 * 32) + 64 + Math.ceil(memo.length / 32) * 32).toString(16).padStart(64, '0');

  // Encode memo string
  const memoLengthHex = memo.length.toString(16).padStart(64, '0');
  const memoBytes = Buffer.from(memo).toString('hex').padEnd(Math.ceil(memo.length / 32) * 64, '0');

  // Encode metadata bytes
  const metadataClean = metadata.startsWith('0x') ? metadata.slice(2) : metadata;
  const metadataLength = (metadataClean.length / 2).toString(16).padStart(64, '0');
  const metadataBytes = metadataClean.padEnd(Math.ceil(metadataClean.length / 64) * 64, '0');

  return (
    selector +
    projectIdHex +
    tokenHex +
    amountHex +
    beneficiaryHex +
    minTokensHex +
    memoOffset +
    metadataOffset +
    memoLengthHex +
    (memoBytes || '') +
    metadataLength +
    (metadataBytes || '')
  );
}

// Build pay transaction
export function buildPayTransaction(
  params: PayParams,
  chainId: number
): TransactionData {
  const isNativeToken = (params.token || NATIVE_TOKEN).toLowerCase() === NATIVE_TOKEN.toLowerCase();

  return {
    to: JB_MULTI_TERMINAL,
    data: encodePayCalldata(params),
    value: isNativeToken ? params.amount.toString() : undefined,
    chainId,
  };
}

// Build transaction data for cashing out tokens
export interface CashOutParams {
  holder: string;
  projectId: number;
  cashOutCount: bigint; // amount of project tokens to cash out (18 decimals)
  tokenToReclaim?: string; // defaults to native token (ETH)
  minTokensReclaimed?: bigint;
  beneficiary: string;
  metadata?: string;
}

function encodeCashOutCalldata(params: CashOutParams): string {
  const {
    holder,
    projectId,
    cashOutCount,
    tokenToReclaim = NATIVE_TOKEN,
    minTokensReclaimed = BigInt(0),
    beneficiary,
    metadata = '0x',
  } = params;

  // Function selector for cashOutTokensOf(address,uint256,uint256,address,uint256,address,bytes)
  const selector = '0x6d8aa8f8';

  // Encode parameters
  const holderHex = holder.slice(2).toLowerCase().padStart(64, '0');
  const projectIdHex = projectId.toString(16).padStart(64, '0');
  const cashOutCountHex = cashOutCount.toString(16).padStart(64, '0');
  const tokenHex = tokenToReclaim.slice(2).toLowerCase().padStart(64, '0');
  const minReclaimedHex = minTokensReclaimed.toString(16).padStart(64, '0');
  const beneficiaryHex = beneficiary.slice(2).toLowerCase().padStart(64, '0');

  // Metadata offset (7 params * 32 bytes = 224 = 0xe0)
  const metadataOffset = (7 * 32).toString(16).padStart(64, '0');

  // Encode metadata bytes
  const metadataClean = metadata.startsWith('0x') ? metadata.slice(2) : metadata;
  const metadataLength = (metadataClean.length / 2).toString(16).padStart(64, '0');
  const metadataBytes = metadataClean.padEnd(Math.ceil(metadataClean.length / 64) * 64, '0');

  return (
    selector +
    holderHex +
    projectIdHex +
    cashOutCountHex +
    tokenHex +
    minReclaimedHex +
    beneficiaryHex +
    metadataOffset +
    metadataLength +
    (metadataBytes || '')
  );
}

// Build cash out transaction
export function buildCashOutTransaction(
  params: CashOutParams,
  chainId: number
): TransactionData {
  return {
    to: JB_MULTI_TERMINAL,
    data: encodeCashOutCalldata(params),
    chainId,
  };
}

// Format transaction for display
export function formatTransactionForDisplay(tx: TransactionData): string {
  const chain = getChainById(tx.chainId);
  const chainName = chain?.name || `Chain ${tx.chainId}`;

  let display = `Network: ${chainName}\n`;
  display += `To: ${tx.to}\n`;
  if (tx.value) {
    const ethValue = Number(BigInt(tx.value)) / 1e18;
    display += `Value: ${ethValue.toFixed(6)} ETH\n`;
  }
  display += `Data: ${tx.data.slice(0, 66)}...`;

  return display;
}
