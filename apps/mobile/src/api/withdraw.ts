import { apiClient } from './client';
import type { PaymentTransaction, SignedForwardRequest } from './payments';

export interface ExecuteWithdrawRequest {
  amount_usd: number;
  chain_id: number;
  destination_address: string;
  amount: string;             // raw USDC amount
  transactions: PaymentTransaction[];
  signed_forward_requests?: SignedForwardRequest[];
  idempotency_key?: string;
}

export interface ExecuteWithdrawResponse {
  id: string;
  status: string;
  confirmation_code: string;
}

export interface WithdrawStatusResponse {
  id: string;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  confirmed_at: string | null;
}

export const withdrawApi = {
  execute: async (data: ExecuteWithdrawRequest) => {
    const response = await apiClient.post<ExecuteWithdrawResponse>('/withdrawals/execute', data);
    return response.data;
  },

  status: async (id: string) => {
    const response = await apiClient.get<WithdrawStatusResponse>(`/withdrawals/${id}/status`);
    return response.data;
  },
};
