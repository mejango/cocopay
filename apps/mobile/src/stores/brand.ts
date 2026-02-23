import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BRAND_ORDER, type BrandKey } from '../theme/brands';

const BRAND_STORAGE_KEY = 'cocopay_brand';

async function getStoredBrand(): Promise<BrandKey | null> {
  try {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem(BRAND_STORAGE_KEY);
      if (stored && (BRAND_ORDER as readonly string[]).includes(stored)) {
        return stored as BrandKey;
      }
      return null;
    }
    const stored = await SecureStore.getItemAsync(BRAND_STORAGE_KEY);
    if (stored && (BRAND_ORDER as readonly string[]).includes(stored)) {
      return stored as BrandKey;
    }
  } catch {
    // ignore
  }
  return null;
}

async function storeBrand(brand: BrandKey): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(BRAND_STORAGE_KEY, brand);
      return;
    }
    await SecureStore.setItemAsync(BRAND_STORAGE_KEY, brand);
  } catch {
    // ignore
  }
}

interface BrandState {
  brandKey: BrandKey;
  cycleBrand: () => void;
  loadStored: () => Promise<void>;
}

export const useBrandStore = create<BrandState>((set, get) => ({
  brandKey: 'juice',

  cycleBrand: () => {
    const current = get().brandKey;
    const currentIndex = BRAND_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % BRAND_ORDER.length;
    const next = BRAND_ORDER[nextIndex];
    set({ brandKey: next });
    storeBrand(next);
  },

  loadStored: async () => {
    const stored = await getStoredBrand();
    if (stored && stored !== get().brandKey) {
      set({ brandKey: stored });
    }
  },
}));
