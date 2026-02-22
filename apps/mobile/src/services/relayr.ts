/**
 * Relayr client for multi-chain transaction bundling.
 *
 * - Prepaid bundles: user pays gas on one chain, Relayr executes on all (SIWE users)
 * - Balance bundles: proxied through CocoPay backend (avoids CORS, keeps API keys server-side)
 */

import { apiClient } from '../api/client';

const RELAYR_API_URL = process.env.EXPO_PUBLIC_RELAYR_API_URL || 'https://api.relayr.ba5ed.com';
const RELAYR_API_KEY = process.env.EXPO_PUBLIC_RELAYR_API_KEY || '';

// ============================================================================
// Types
// ============================================================================

export interface PrepaidBundleTransaction {
  chain: number;
  target: string;
  data?: string;
  value?: string;
  gas_limit?: number;
}

export interface PaymentOption {
  chainId: number;
  token: string;
  amount: string;
  estimatedGas: string;
}

export interface PrepaidBundleRequest {
  transactions: PrepaidBundleTransaction[];
  perform_simulation?: boolean;
  signer_address: string;
}

export interface PrepaidBundleResponse {
  bundle_uuid: string;
  tx_uuids: string[];
  payment_options: PaymentOption[];
  expires_at: number;
}

export interface BundlePaymentRequest {
  bundle_uuid: string;
  chain_id: number;
  signed_tx: string;
}

export interface BundleTransactionStatus {
  tx_uuid: string;
  chain_id: number;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  tx_hash?: string;
  error?: string;
}

export interface BundleStatusResponse {
  bundle_uuid: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  transactions: BundleTransactionStatus[];
  payment_received: boolean;
}

// ============================================================================
// API Client
// ============================================================================

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${RELAYR_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(RELAYR_API_KEY ? { 'x-api-key': RELAYR_API_KEY } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.reason || error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface BalanceBundleRequest {
  transactions: PrepaidBundleTransaction[];
  perform_simulation?: boolean;
  signer_address?: string;
}

export interface BalanceBundleResponse {
  bundle_uuid: string;
  tx_uuids: string[];
}

// ============================================================================
// Balance Bundles (App-Sponsored, proxied through backend)
// ============================================================================

/**
 * Create a balance bundle via the CocoPay backend (which proxies to Relayr staging).
 * Used for testnet deploys where the browser can't reach Relayr directly (CORS).
 */
export async function createBalanceBundle(
  request: BalanceBundleRequest
): Promise<BalanceBundleResponse> {
  const response = await apiClient.post<BalanceBundleResponse>('/deployments/bundle', {
    transactions: request.transactions,
    signer_address: request.signer_address,
  });
  return response.data;
}

/**
 * Get bundle status via the CocoPay backend (which proxies to Relayr staging).
 */
export async function getStagingBundleStatus(bundleId: string): Promise<BundleStatusResponse> {
  const response = await apiClient.get<any>(`/deployments/bundle/${bundleId}`);
  return transformBundleResponse(response.data);
}

// ============================================================================
// Prepaid Bundles (Self-Custody)
// ============================================================================

/**
 * Create a prepaid bundle for self-custody wallets.
 * User pays gas on one chain, Relayr executes on all target chains.
 */
export async function createPrepaidBundle(
  request: PrepaidBundleRequest
): Promise<PrepaidBundleResponse> {
  return fetchApi<PrepaidBundleResponse>('/v1/bundle/prepaid', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get the status of a bundle (works for both prepaid and balance bundles).
 */
export async function getBundleStatus(bundleId: string): Promise<BundleStatusResponse> {
  const raw = await fetchApi<any>(`/v1/bundle/${bundleId}`);
  return transformBundleResponse(raw);
}

/**
 * Submit signed payment transaction for a prepaid bundle.
 */
export async function sendBundlePayment(request: BundlePaymentRequest): Promise<void> {
  await fetchApi<{}>('/v1/bundle/payment', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Response Transformation
// ============================================================================

type CallState =
  | { state: 'Invalid' }
  | { state: 'Pending' }
  | { state: 'Mempool'; data: Record<string, unknown> }
  | { state: 'Cancel'; data: Record<string, unknown> }
  | { state: 'Resend'; data: Record<string, unknown> }
  | { state: 'Included'; data: { block: number } }
  | { state: 'Cancelled'; data: Record<string, unknown> }
  | { state: 'Success'; data: Record<string, unknown> }
  | { state: 'Reverted'; data: Record<string, unknown> };

function mapCallStateToStatus(
  callState: CallState
): 'pending' | 'submitted' | 'confirmed' | 'failed' {
  switch (callState.state) {
    case 'Invalid':
    case 'Reverted':
    case 'Cancelled':
      return 'failed';
    case 'Success':
      return 'confirmed';
    case 'Mempool':
    case 'Cancel':
    case 'Resend':
    case 'Included':
      return 'submitted';
    case 'Pending':
    default:
      return 'pending';
  }
}

function transformBundleResponse(raw: any): BundleStatusResponse {
  const transactions: BundleTransactionStatus[] = (raw.transactions || []).map((tx: any) => {
    const statusData =
      'data' in tx.status && typeof tx.status.data === 'object' && tx.status.data !== null
        ? (tx.status.data as Record<string, unknown>)
        : null;
    const txHash = statusData?.tx_hash ?? statusData?.txHash ?? statusData?.hash;

    return {
      tx_uuid: tx.tx_uuid,
      chain_id: tx.request.chain,
      status: mapCallStateToStatus(tx.status),
      tx_hash: txHash as string | undefined,
      error:
        tx.status.state === 'Reverted' || tx.status.state === 'Invalid'
          ? `Transaction ${tx.status.state.toLowerCase()}`
          : undefined,
    };
  });

  const statuses = transactions.map((t) => t.status);
  const allConfirmed = statuses.every((s) => s === 'confirmed');
  const anyFailed = statuses.some((s) => s === 'failed');
  const anySubmitted = statuses.some((s) => s === 'submitted');
  const anyPending = statuses.some((s) => s === 'pending');

  let status: BundleStatusResponse['status'];
  if (transactions.length === 0) {
    status = raw.payment_received ? 'processing' : 'pending';
  } else if (allConfirmed) {
    status = 'completed';
  } else if (anyFailed && statuses.some((s) => s === 'confirmed')) {
    status = 'partial';
  } else if (anyFailed) {
    status = 'failed';
  } else if (anySubmitted || anyPending) {
    status = 'processing';
  } else {
    status = raw.payment_received ? 'processing' : 'pending';
  }

  return {
    bundle_uuid: raw.bundle_uuid,
    status,
    transactions,
    payment_received: raw.payment_received,
  };
}
