import { apiClient } from './client';

export interface PaymentTransaction {
  chain_id: number;
  target: string;
  data: string;
  value: string;
}

export interface TokenUsed {
  type: 'usdc' | 'store_token';
  token_address: string;
  amount_usd: string;
  amount_raw: string;
  store_id?: string;
}

export interface SignedForwardRequest {
  chain_id: number;
  data: string; // forwarder.execute() calldata
}

export interface ExecutePaymentRequest {
  store_id: string;
  amount_usd: number;
  chain_id: number;
  tokens_used: TokenUsed[];
  transactions: PaymentTransaction[];
  signed_forward_requests?: SignedForwardRequest[];
  idempotency_key?: string;
}

export interface ExecutePaymentResponse {
  id: string;
  status: string;
  confirmation_code: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  confirmed_at: string | null;
}

export const paymentsApi = {
  execute: async (data: ExecutePaymentRequest) => {
    const response = await apiClient.post<ExecutePaymentResponse>('/payments/execute', data);
    return response.data;
  },

  status: async (id: string) => {
    const response = await apiClient.get<PaymentStatusResponse>(`/payments/${id}/status`);
    return response.data;
  },
};
