import { useState, useCallback, useRef, useEffect } from 'react';
import { withdrawApi } from '../api/withdraw';
import type { SignedForwardRequest, PaymentTransaction } from '../api/payments';
import { buildTokenTransferTransaction } from '../services/terminal';
import { encodeSmartAccountExecute } from '../services/smartAccount';
import { buildForwardRequestTypedData, encodeForwarderExecuteCalldata } from '../services/forwardRequest';
import { USDC_ADDRESSES, USDC_DECIMALS } from '../constants/juicebox';

// ============================================================================
// Types
// ============================================================================

export type WithdrawStatus =
  | 'idle'
  | 'building'
  | 'submitting'
  | 'processing'
  | 'completed'
  | 'failed';

interface UseWithdrawReturn {
  status: WithdrawStatus;
  confirmationCode: string | null;
  txHash: string | null;
  error: string | null;
  withdraw: (params: WithdrawParams) => Promise<void>;
  reset: () => void;
}

interface WithdrawParams {
  chainId: number;
  destinationAddress: string;
  amountUsd: number;         // USD value for the transaction record
  amountRaw: bigint;         // USDC amount in 6 decimals
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
// Hook
// ============================================================================

export function useWithdraw(): UseWithdrawReturn {
  const [status, setStatus] = useState<WithdrawStatus>('idle');
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
        const result = await withdrawApi.status(id);
        if (!mountedRef.current) return;

        if (result.status === 'confirmed') {
          setStatus('completed');
          setTxHash(result.tx_hash);
          stopPolling();
          return;
        }

        if (result.status === 'failed') {
          setStatus('failed');
          setError('Withdrawal failed on-chain');
          stopPolling();
          return;
        }

        if (pollCount >= MAX_POLLS) {
          setStatus('failed');
          setError('Withdrawal timed out');
          stopPolling();
        }
      } catch {
        // Swallow poll errors — retry on next interval
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const withdraw = useCallback(async (params: WithdrawParams) => {
    const { chainId, destinationAddress, amountUsd, amountRaw, selfCustody } = params;

    setError(null);
    setConfirmationCode(null);
    setTxHash(null);
    setStatus('building');

    try {
      const usdcAddress = USDC_ADDRESSES[chainId];
      if (!usdcAddress) throw new Error(`No USDC address for chain ${chainId}`);

      // Build ERC-20 transfer calldata (already exists in terminal.ts)
      const tx = buildTokenTransferTransaction(
        usdcAddress,
        destinationAddress,
        amountRaw,
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

      const idempotencyKey = `withdraw-${destinationAddress}-${amountRaw.toString()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await withdrawApi.execute({
        amount_usd: amountUsd,
        chain_id: chainId,
        destination_address: destinationAddress,
        amount: amountRaw.toString(),
        transactions,
        signed_forward_requests: signedForwardRequests,
        idempotency_key: idempotencyKey,
      });

      if (!mountedRef.current) return;
      setConfirmationCode(result.confirmation_code);
      setStatus('processing');

      startPolling(result.id);
    } catch (err) {
      console.error('[useWithdraw] failed:', err);
      if (!mountedRef.current) return;
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setConfirmationCode(null);
    setTxHash(null);
    setError(null);
  }, [stopPolling]);

  return { status, confirmationCode, txHash, error, withdraw, reset };
}
