import { useState, useCallback, useRef, useEffect } from 'react';
import { cashOutApi } from '../api/cashOut';
import type { SignedForwardRequest, PaymentTransaction } from '../api/payments';
import { buildBorrowFromTransaction, fetchBorrowableAmount } from '../services/revLoans';
import { encodeSmartAccountExecute } from '../services/smartAccount';
import { buildForwardRequestTypedData, encodeForwarderExecuteCalldata } from '../services/forwardRequest';
import { USDC_ADDRESSES } from '../constants/juicebox';

// ============================================================================
// Types
// ============================================================================

export type CashOutStatus =
  | 'idle'
  | 'building'
  | 'submitting'
  | 'processing'
  | 'completed'
  | 'failed';

interface UseCashOutReturn {
  status: CashOutStatus;
  confirmationCode: string | null;
  txHash: string | null;
  error: string | null;
  cashOut: (params: CashOutParams) => Promise<void>;
  reset: () => void;
}

interface CashOutParams {
  chainId: number;
  projectId: number;
  collateral: bigint;       // store tokens to burn (18 decimals)
  minBorrowAmount: bigint;  // minimum USDC to receive, slippage protection (6 decimals)
  amountUsd: number;        // USD value for the transaction record
  beneficiary: string;      // who receives USDC
  selfCustody?: {
    smartAccountAddress: string;
    signerAddress: string;
    nonce: bigint;
    signTypedDataAsync: (params: {
      domain: any;
      types: any;
      primaryType: string;
      message: any;
    }) => Promise<string>;
  };
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150; // 5 min

// ============================================================================
// Hook: useCashOut
// ============================================================================

export function useCashOut(): UseCashOutReturn {
  const [status, setStatus] = useState<CashOutStatus>('idle');
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((id: string) => {
    let pollCount = 0;

    const poll = async () => {
      if (!mountedRef.current) return;
      pollCount++;

      try {
        const result = await cashOutApi.status(id);
        if (!mountedRef.current) return;

        if (result.status === 'confirmed') {
          setStatus('completed');
          setTxHash(result.tx_hash);
          stopPolling();
          return;
        }

        if (result.status === 'failed') {
          setStatus('failed');
          setError('Cash out failed on-chain');
          stopPolling();
          return;
        }

        if (pollCount >= MAX_POLLS) {
          setStatus('failed');
          setError('Cash out timed out');
          stopPolling();
        }
      } catch {
        // Swallow poll errors — retry on next interval
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const cashOut = useCallback(async (params: CashOutParams) => {
    const { chainId, projectId, collateral, minBorrowAmount, amountUsd, beneficiary, selfCustody } = params;

    setError(null);
    setConfirmationCode(null);
    setTxHash(null);
    setStatus('building');

    try {
      const usdcAddress = USDC_ADDRESSES[chainId];
      if (!usdcAddress) throw new Error(`No USDC address for chain ${chainId}`);

      // Build borrowFrom calldata
      const tx = buildBorrowFromTransaction(
        { projectId, minBorrowAmount, collateral, beneficiary },
        chainId
      );

      const transactions: PaymentTransaction[] = [
        {
          chain_id: chainId,
          target: tx.to,
          data: tx.data,
          value: '0',
        },
      ];

      if (!mountedRef.current) return;
      setStatus('submitting');

      // Self-custody: wrap in SmartAccount.execute → ForwardRequest
      let signedForwardRequests: SignedForwardRequest[] | undefined;

      if (selfCustody) {
        const { smartAccountAddress, signerAddress, nonce, signTypedDataAsync } = selfCustody;
        signedForwardRequests = [];

        for (const txItem of transactions) {
          const executeData = encodeSmartAccountExecute(
            txItem.target,
            BigInt(txItem.value || '0'),
            txItem.data
          );

          const typedData = buildForwardRequestTypedData({
            chainId,
            from: signerAddress,
            to: smartAccountAddress,
            data: executeData,
            nonce,
          });

          const signature = await signTypedDataAsync(typedData);

          const forwarderCalldata = encodeForwarderExecuteCalldata(
            typedData.message,
            signature
          );

          signedForwardRequests.push({
            chain_id: chainId,
            data: forwarderCalldata,
          });
        }
      }

      const idempotencyKey = `cashout-${projectId}-${collateral.toString()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await cashOutApi.execute({
        amount_usd: amountUsd,
        chain_id: chainId,
        project_id: projectId,
        collateral: collateral.toString(),
        borrow_amount: minBorrowAmount.toString(),
        transactions,
        signed_forward_requests: signedForwardRequests,
        idempotency_key: idempotencyKey,
      });

      if (!mountedRef.current) return;
      setConfirmationCode(result.confirmation_code);
      setStatus('processing');

      startPolling(result.id);
    } catch (err) {
      console.error('[useCashOut] failed:', err);
      if (!mountedRef.current) return;
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Cash out failed');
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setConfirmationCode(null);
    setTxHash(null);
    setError(null);
  }, [stopPolling]);

  return { status, confirmationCode, txHash, error, cashOut, reset };
}

// ============================================================================
// Hook: useBorrowableAmount
// ============================================================================

/**
 * Queries the on-chain borrowable USDC amount for a given collateral.
 * Debounces calls to avoid excessive RPC requests during slider/input changes.
 */
export function useBorrowableAmount(
  chainId: number,
  projectId: number,
  collateral: bigint
): { borrowableAmount: bigint | null; loading: boolean } {
  const [borrowableAmount, setBorrowableAmount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (collateral === 0n || !projectId || !chainId) {
      setBorrowableAmount(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const result = await fetchBorrowableAmount(chainId, projectId, collateral);
        if (mountedRef.current) {
          setBorrowableAmount(result);
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) {
          setBorrowableAmount(null);
          setLoading(false);
        }
      }
    }, 500); // 500ms debounce

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chainId, projectId, collateral]);

  return { borrowableAmount, loading };
}
