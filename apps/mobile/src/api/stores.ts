import { apiClient } from './client';

interface Store {
  id: string;
  name: string;
  symbol: string;
  category: string | null;
  location: {
    lat: number;
    lng: number;
    address: string | null;
  } | null;
  user_rewards_usd: string;
}

interface StoreDetails extends Store {
  description: string | null;
  revnet: {
    project_id: number;
    token_address: string;
    terminal_address: string;
  } | null;
  deployment_status: string;
  qr_code_url: string;
  website: string | null;
  instagram: string | null;
  created_at: string;
}

interface CreateStoreInput {
  name: string;
  symbol: string;
  category?: string;
  description?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export const storesApi = {
  list: async (params?: { lat?: number; lng?: number; search?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.lat) query.set('lat', params.lat.toString());
    if (params?.lng) query.set('lng', params.lng.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());

    const endpoint = `/stores${query.toString() ? `?${query}` : ''}`;
    const response = await apiClient.get<Store[]>(endpoint);
    return { data: response.data, meta: response.meta };
  },

  get: async (id: string) => {
    const response = await apiClient.get<StoreDetails>(`/stores/${id}`);
    return response.data;
  },

  create: async (data: CreateStoreInput) => {
    const response = await apiClient.post<StoreDetails>('/stores', data);
    return response.data;
  },
};
