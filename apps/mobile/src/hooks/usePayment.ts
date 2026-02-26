import { useState, useCallback, useRef, useEffect } from 'react';
import { paymentsApi } from '../api/payments';
import type { PaymentTransaction, TokenUsed, SignedForwardRequest } from '../api/payments';
import type { StoreDeployment } from '../api/stores';
import { buildPayTransaction, buildApproveTransaction, buildTokenTransferTransaction } from '../services/terminal';
import { encodeSmartAccountExecute } from '../services/smartAccount';
import { buildForwardRequestTypedData, encodeForwarderExecuteCalldata } from '../services/forwardRequest';
import { USDC_ADDRESSES, USDC_DECIMALS, JB_MULTI_TERMINAL } from '../constants/juicebox';
import type { Revnet } from '../types/revnet';

// ============================================================================
// Types
// ============================================================================

export type PaymentStatus =
  | 'idle'
  | 'building'
  | 'submitting'
  | 'processing'
  | 'completed'
  | 'failed';

export interface SelectedToken {
  type: 'usdc' | 'store_token';
  amountUsd: number;
  // For store tokens: the revnet data
  revnet?: Revnet;
}

interface UsePaymentReturn {
  status: PaymentStatus;
  confirmationCode: string | null;
  txHash: string | null;
  error: string | null;
  pay: (params: PayParams) => Promise<void>;
  reset: () => void;
}

interface PayParams {
  storeId: string;
  amountUsd: number;
  chainId: number;
  ownerAddress: string;
  deployment: StoreDeployment;
  selectedTokens: SelectedToken[];
  beneficiary: string;
  // Self-custody signing (optional — omit for managed users)
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
// Helpers
// ============================================================================

/**
 * Inverse bonding curve: how many tokens for $X of value?
 * tokenAmount = (usdAmount * tokenSupply) / treasuryBalance
 */
function tokensForUsdAmount(usdAmount: number, revnet: Revnet): bigint {
  const treasury = BigInt(revnet.treasuryBalance);
  const supply = BigInt(revnet.tokenSupply);
  if (treasury === 0n) return 0n;
  const usdRaw = BigInt(Math.floor(usdAmount * 1e6)); // 6 decimals to match USDC treasury
  return (usdRaw * supply) / treasury;
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150; // 5 min at 2s intervals

// ============================================================================
// Hook
// ============================================================================

export function usePayment(): UsePaymentReturn {
  const [status, setStatus] = useState<PaymentStatus>('idle');
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

  const startPolling = useCallback((paymentId: string) => {
    let pollCount = 0;

    const poll = async () => {
      if (!mountedRef.current) return;
      pollCount++;

      try {
        const result = await paymentsApi.status(paymentId);
        if (!mountedRef.current) return;

        if (result.status === 'confirmed') {
          setStatus('completed');
          setTxHash(result.tx_hash);
          stopPolling();
          return;
        }

        if (result.status === 'failed') {
          setStatus('failed');
          setError('Payment failed on-chain');
          stopPolling();
          return;
        }

        if (pollCount >= MAX_POLLS) {
          setStatus('failed');
          setError('Payment timed out');
          stopPolling();
        }
      } catch {
        // Swallow poll errors — retry on next interval
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const pay = useCallback(async (params: PayParams) => {
    const { storeId, amountUsd, chainId, ownerAddress, deployment, selectedTokens, beneficiary, selfCustody } = params;

    setError(null);
    setConfirmationCode(null);
    setTxHash(null);
    setStatus('building');

    try {
      const usdcAddress = USDC_ADDRESSES[chainId];
      if (!usdcAddress) throw new Error(`No USDC address for chain ${chainId}`);

      // Build calldata array and tokens_used from selected tokens
      const transactions: PaymentTransaction[] = [];
      const tokensUsed: TokenUsed[] = [];

      for (const token of selectedTokens) {
        if (token.amountUsd <= 0) continue;

        if (token.type === 'usdc') {
          // USDC payment: approve terminal + pay project
          const rawAmount = BigInt(Math.floor(token.amountUsd * 10 ** USDC_DECIMALS));

          // 1. Approve terminal to spend USDC
          const approveTx = buildApproveTransaction(
            usdcAddress,
            deployment.terminal_address || JB_MULTI_TERMINAL,
            rawAmount,
            chainId
          );
          transactions.push({
            chain_id: chainId,
            target: approveTx.to,
            data: approveTx.data,
            value: '0',
          });

          // 2. Pay project via terminal (mints store tokens to payer as rewards)
          const payTx = buildPayTransaction(
            {
              projectId: deployment.project_id,
              token: usdcAddress,
              amount: rawAmount,
              beneficiary,
              memo: `CocoPay payment`,
            },
            chainId
          );
          transactions.push({
            chain_id: chainId,
            target: payTx.to,
            data: payTx.data,
            value: payTx.value || '0',
          });

          tokensUsed.push({
            type: 'usdc',
            token_address: usdcAddress,
            amount_usd: token.amountUsd.toFixed(2),
            amount_raw: rawAmount.toString(),
          });

        } else if (token.type === 'store_token' && token.revnet) {
          // Store token payment: direct ERC-20 transfer to store owner
          const rawAmount = tokensForUsdAmount(token.amountUsd, token.revnet);

          const transferTx = buildTokenTransferTransaction(
            deployment.token_address,
            ownerAddress,
            rawAmount,
            chainId
          );
          transactions.push({
            chain_id: chainId,
            target: transferTx.to,
            data: transferTx.data,
            value: '0',
          });

          tokensUsed.push({
            type: 'store_token',
            token_address: deployment.token_address,
            amount_usd: token.amountUsd.toFixed(2),
            amount_raw: rawAmount.toString(),
            store_id: storeId,
          });
        }
      }

      if (transactions.length === 0) {
        throw new Error('No transactions to execute');
      }

      if (!mountedRef.current) return;
      setStatus('submitting');

      // Self-custody: wrap each tx in SmartAccount.execute, sign ForwardRequests
      let signedForwardRequests: SignedForwardRequest[] | undefined;

      if (selfCustody) {
        const { smartAccountAddress, signerAddress, nonce, signTypedDataAsync } = selfCustody;
        signedForwardRequests = [];
        let currentNonce = nonce;

        for (const tx of transactions) {
          // 1. Wrap inner calldata in SmartAccount.execute(target, value, data)
          const executeData = encodeSmartAccountExecute(
            tx.target,
            BigInt(tx.value || '0'),
            tx.data
          );

          // 2. Build ForwardRequest typed data
          const typedData = buildForwardRequestTypedData({
            chainId,
            from: signerAddress,
            to: smartAccountAddress,
            data: executeData,
            nonce: currentNonce,
          });

          // 3. Sign via wallet (prompts user)
          const signature = await signTypedDataAsync(typedData);

          // 4. Encode forwarder.execute() calldata
          const forwarderCalldata = encodeForwarderExecuteCalldata(
            typedData.message,
            signature
          );

          signedForwardRequests.push({
            chain_id: chainId,
            data: forwarderCalldata,
          });

          currentNonce += 1n;
        }
      }

      // Submit to backend
      const result = await paymentsApi.execute({
        store_id: storeId,
        amount_usd: amountUsd,
        chain_id: chainId,
        tokens_used: tokensUsed,
        transactions,
        signed_forward_requests: signedForwardRequests,
      });

      if (!mountedRef.current) return;
      setConfirmationCode(result.confirmation_code);
      setStatus('processing');

      // Poll for completion
      startPolling(result.id);

    } catch (err) {
      console.error('[usePayment] pay failed:', err);
      if (!mountedRef.current) return;
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setConfirmationCode(null);
    setTxHash(null);
    setError(null);
  }, [stopPolling]);

  return { status, confirmationCode, txHash, error, pay, reset };
}
