import { create } from 'zustand';
import { authApi } from '../api/auth';
import { userApi } from '../api/user';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  smart_account_address: string | null;
  locale: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string) => Promise<{ verificationId: string }>;
  verifyMagicLink: (verificationId: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  login: async (email) => {
    const result = await authApi.sendMagicLink(email);
    return { verificationId: result.verification_id };
  },

  verifyMagicLink: async (verificationId, token) => {
    const result = await authApi.verifyMagicLink(verificationId, token);
    set({ user: result.user, isAuthenticated: true });
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await apiClient.getToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const user = await userApi.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await apiClient.clearToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
