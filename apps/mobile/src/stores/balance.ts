import { create } from 'zustand';
import { fetchUserRevnets } from '../services/bendystraw';
import { DEFAULT_WALLET_ADDRESS } from '../constants/juicebox';
import type { Revnet } from '../types/revnet';

interface BalanceState {
  walletAddress: string;
  revnets: Revnet[];
  totalUsd: string;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  setWalletAddress: (address: string) => void;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  walletAddress: DEFAULT_WALLET_ADDRESS,
  revnets: [],
  totalUsd: '0.00',
  isLoading: false,
  error: null,

  setWalletAddress: (address: string) => {
    if (address !== get().walletAddress) {
      set({ walletAddress: address });
    }
  },

  fetch: async () => {
    const { walletAddress } = get();
    set({ isLoading: true, error: null });

    try {
      const revnets = await fetchUserRevnets(walletAddress);

      // Calculate total cash out value in USD
      const totalCashOutUsd = revnets.reduce((sum, r) => {
        return sum + (r.cashOutValueUsd || 0);
      }, 0);

      set({
        revnets,
        totalUsd: totalCashOutUsd.toFixed(2),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load revnets',
        isLoading: false,
      });
    }
  },
}));
