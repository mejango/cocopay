import { useState, useCallback, useRef, useEffect } from 'react';
import { useSendTransaction } from 'wagmi';
import { encodeDeployRevnetTransactions } from '../services/relayr/encoder';
import { createPrepaidBundle, createBalanceBundle, sendBundlePayment, getBundleStatus, getStagingBundleStatus } from '../services/relayr';
import type { BundleTransactionStatus } from '../services/relayr';

// ============================================================================
// Types
// ============================================================================

export type DeployStatus =
  | 'idle'
  | 'encoding'
  | 'awaiting_payment'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ChainDeployState {
  chainId: number;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: string;
}

interface UseDeployRevnetReturn {
  status: DeployStatus;
  chainStates: ChainDeployState[];
  slowChainIds: number[];
  error: string | null;
  deploy: (params: {
    name: string;
    ticker: string;
    walletAddress: string;
    chainIds?: number[];
    testMode?: boolean;
  }) => Promise<void>;
  dismiss: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEPLOY_CHAIN_IDS = [8453, 10, 42161, 1]; // Base, Optimism, Arbitrum, Ethereum
const POLL_INTERVAL_MS = 2000;
const SLOW_CHAIN_THRESHOLD_MS = 90_000;

// ============================================================================
// Hook
// ============================================================================

export function useDeployRevnet(): UseDeployRevnetReturn {
  const { sendTransactionAsync } = useSendTransaction();

  const [status, setStatus] = useState<DeployStatus>('idle');
  const [chainStates, setChainStates] = useState<ChainDeployState[]>([]);
  const [slowChainIds, setSlowChainIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingStartedAtRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      if (slowCheckRef.current) clearInterval(slowCheckRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (slowCheckRef.current) {
      clearInterval(slowCheckRef.current);
      slowCheckRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (bundleUuid: string, useStaging = false) => {
      processingStartedAtRef.current = Date.now();

      const poll = async () => {
        if (!mountedRef.current) return;

        try {
          const bundleStatus = useStaging
            ? await getStagingBundleStatus(bundleUuid)
            : await getBundleStatus(bundleUuid);

          if (!mountedRef.current) return;

          // Update per-chain states from transaction statuses
          const updated: ChainDeployState[] = bundleStatus.transactions.map(
            (tx: BundleTransactionStatus) => ({
              chainId: tx.chain_id,
              status: tx.status,
              txHash: tx.tx_hash,
            })
          );

          if (updated.length > 0) {
            setChainStates(updated);
          }

          // Check terminal states
          if (bundleStatus.status === 'completed') {
            setStatus('completed');
            stopPolling();
            return;
          }

          if (bundleStatus.status === 'failed') {
            setStatus('failed');
            setError('Deployment failed');
            stopPolling();
            return;
          }
        } catch {
          // Swallow poll errors — retry on next interval
        }
      };

      // Immediate first poll, then interval
      poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

      // Slow chain detection: check every 5s after processing starts
      slowCheckRef.current = setInterval(() => {
        if (!mountedRef.current || !processingStartedAtRef.current) return;

        const elapsed = Date.now() - processingStartedAtRef.current;
        if (elapsed < SLOW_CHAIN_THRESHOLD_MS) return;

        setChainStates((current) => {
          const hasConfirmed = current.some((cs) => cs.status === 'confirmed');
          if (!hasConfirmed) return current;

          const stuck = current
            .filter((cs) => cs.status === 'pending' || cs.status === 'submitted')
            .map((cs) => cs.chainId);

          if (stuck.length > 0) {
            setSlowChainIds(stuck);
          }

          return current;
        });
      }, 5000);
    },
    [stopPolling]
  );

  const deploy = useCallback(
    async (params: { name: string; ticker: string; walletAddress: string; chainIds?: number[]; testMode?: boolean }) => {
      const targetChains = params.chainIds ?? DEPLOY_CHAIN_IDS;

      setError(null);
      setSlowChainIds([]);
      setStatus('encoding');

      // Initialize chain states as pending
      setChainStates(
        targetChains.map((chainId) => ({
          chainId,
          status: 'pending' as const,
        }))
      );

      try {
        // 1. Encode transactions
        const encoderParams = {
          name: params.name,
          ticker: params.ticker,
          splitOperator: params.walletAddress,
          chainIds: targetChains,
        };
        console.log('[useDeployRevnet] encoder params:', JSON.stringify(encoderParams, null, 2));

        const deployTxs = encodeDeployRevnetTransactions(encoderParams);
        console.log('[useDeployRevnet] encoded txs:', deployTxs.map((tx) => ({
          chainId: tx.chainId,
          to: tx.to,
          value: tx.value,
          dataLength: tx.data.length,
          dataPrefix: tx.data.slice(0, 10),
        })));

        if (params.testMode) {
          // Test mode: use Relayr balance bundle via staging API
          const bundleRequest = {
            signer_address: params.walletAddress,
            transactions: deployTxs.map((tx) => ({
              chain: tx.chainId,
              target: tx.to,
              data: tx.data,
              value: tx.value,
            })),
          };
          console.log('[useDeployRevnet] balance bundle request:', JSON.stringify({
            signer_address: bundleRequest.signer_address,
            transactionCount: bundleRequest.transactions.length,
            transactions: bundleRequest.transactions.map((tx) => ({
              chain: tx.chain,
              target: tx.target,
              value: tx.value,
              dataLength: tx.data?.length,
            })),
          }, null, 2));

          const bundle = await createBalanceBundle(bundleRequest);

          if (!mountedRef.current) return;
          setStatus('processing');

          // Poll staging API for per-chain status
          startPolling(bundle.bundle_uuid, true);
          return;
        }

        // Production: use Relayr prepaid bundle
        // 2. Create prepaid bundle
        const bundle = await createPrepaidBundle({
          signer_address: params.walletAddress,
          transactions: deployTxs.map((tx) => ({
            chain: tx.chainId,
            target: tx.to,
            data: tx.data,
            value: tx.value,
          })),
        });

        if (!mountedRef.current) return;
        setStatus('awaiting_payment');

        // 3. Pay with first payment option
        if (bundle.payment_options.length === 0) {
          throw new Error('No payment options available');
        }

        const paymentOption = bundle.payment_options[0];

        const txHash = await sendTransactionAsync({
          to: paymentOption.token as `0x${string}`,
          value: BigInt(paymentOption.amount),
          chainId: paymentOption.chainId,
        });

        await sendBundlePayment({
          bundle_uuid: bundle.bundle_uuid,
          chain_id: paymentOption.chainId,
          signed_tx: txHash,
        });

        if (!mountedRef.current) return;
        setStatus('processing');

        // 4. Start polling for per-chain status
        startPolling(bundle.bundle_uuid);
      } catch (err) {
        console.error('[useDeployRevnet] deploy failed:', err);
        if (!mountedRef.current) return;
        setStatus('failed');
        setError(err instanceof Error ? err.message : 'Deployment failed');
      }
    },
    [sendTransactionAsync, startPolling]
  );

  const dismiss = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setChainStates([]);
    setSlowChainIds([]);
    setError(null);
  }, [stopPolling]);

  return { status, chainStates, slowChainIds, error, deploy, dismiss };
}
