import { apiClient } from './client';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  smart_account_address: string | null;
  backup_owner_phone: string | null;
  locale: string;
  preferred_chain_id: string;
  created_at: string;
}

interface BalanceBreakdown {
  type: 'usdc' | 'store_token';
  label: string;
  store_id?: string;
  amount_usd: string;
  token_amount?: string;
  chain_id: string;
}

interface Balance {
  total_usd: string;
  breakdown: BalanceBreakdown[];
  by_chain: Record<string, string>;
  available_bonus: string;
}

interface Transaction {
  id: string;
  type: string;
  amount_usd: string;
  counterparty: {
    type: 'store' | 'user';
    id: string;
    name: string;
  } | null;
  rewards_earned_usd: string | null;
  confirmation_code: string;
  status: 'pending' | 'confirmed' | 'failed';
  chain_id: string;
  created_at: string;
}

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get<User>('/user');
    return response.data;
  },

  updateProfile: async (data: Partial<Pick<User, 'name' | 'locale' | 'preferred_chain_id'>>) => {
    const response = await apiClient.patch<User>('/user', data);
    return response.data;
  },

  getBalance: async () => {
    const response = await apiClient.get<Balance>('/user/balance');
    return response.data;
  },

  getTransactions: async (params?: { page?: number; per_page?: number; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());
    if (params?.type) query.set('type', params.type);

    const endpoint = `/user/transactions${query.toString() ? `?${query}` : ''}`;
    const response = await apiClient.get<Transaction[]>(endpoint);
    return { data: response.data, meta: response.meta };
  },
};
