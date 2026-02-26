import { apiClient } from './client';
import type { PaymentTransaction, SignedForwardRequest } from './payments';

export interface ExecuteCashOutRequest {
  amount_usd: number;
  chain_id: number;
  project_id: number;
  collateral: string;       // raw token amount
  borrow_amount: string;    // raw USDC amount
  transactions: PaymentTransaction[];
  signed_forward_requests?: SignedForwardRequest[];
  idempotency_key?: string;
}

export interface ExecuteCashOutResponse {
  id: string;
  status: string;
  confirmation_code: string;
}

export interface CashOutStatusResponse {
  id: string;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  confirmed_at: string | null;
}

export const cashOutApi = {
  execute: async (data: ExecuteCashOutRequest) => {
    const response = await apiClient.post<ExecuteCashOutResponse>('/cash_outs/execute', data);
    return response.data;
  },

  status: async (id: string) => {
    const response = await apiClient.get<CashOutStatusResponse>(`/cash_outs/${id}/status`);
    return response.data;
  },
};
