import { useAuthStore, User } from '../src/stores/auth';
import { authApi } from '../src/api/auth';
import { apiClient } from '../src/api/client';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock the API modules
jest.mock('../src/api/auth');
jest.mock('../src/api/user');
jest.mock('../src/api/client', () => ({
  apiClient: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
}));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset zustand store state
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('User interface', () => {
    it('supports wallet_address, deposit_address, and auth_type fields', () => {
      const walletUser: User = {
        id: 'user-1',
        email: null,
        name: null,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        smart_account_address: null,
        deposit_address: '0x1234567890abcdef1234567890abcdef12345678',
        auth_type: 'self_custody',
        locale: 'en',
      };

      useAuthStore.getState().setUser(walletUser);
      const state = useAuthStore.getState();

      expect(state.user).toEqual(walletUser);
      expect(state.user?.auth_type).toBe('self_custody');
      expect(state.user?.wallet_address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(state.user?.deposit_address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(state.isAuthenticated).toBe(true);
    });

    it('supports managed (email) users', () => {
      const managedUser: User = {
        id: 'user-2',
        email: 'test@example.com',
        name: 'Test User',
        wallet_address: null,
        smart_account_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        deposit_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        auth_type: 'managed',
        locale: 'en',
      };

      useAuthStore.getState().setUser(managedUser);
      const state = useAuthStore.getState();

      expect(state.user?.auth_type).toBe('managed');
      expect(state.user?.wallet_address).toBeNull();
      expect(state.user?.deposit_address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });
  });

  describe('loginWithSiwe', () => {
    it('calls verifySiwe and sets user + isAuthenticated', async () => {
      const walletUser = {
        id: 'user-1',
        email: null,
        name: null,
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        smart_account_address: null,
        deposit_address: '0x1234567890abcdef1234567890abcdef12345678',
        auth_type: 'self_custody' as const,
        locale: 'en',
      };

      mockedAuthApi.verifySiwe.mockResolvedValueOnce({
        token: 'jwt-token',
        user: walletUser as any,
        is_new_user: true,
      });

      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const message = 'cocopay.app wants you to sign in...';
      const signature = '0xdeadbeef';

      await useAuthStore.getState().loginWithSiwe(address, message, signature);

      expect(mockedAuthApi.verifySiwe).toHaveBeenCalledWith(address, message, signature);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toBeTruthy();
    });
  });

  describe('setUser', () => {
    it('sets user and isAuthenticated to true', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        wallet_address: null,
        smart_account_address: null,
        deposit_address: null,
        auth_type: 'managed',
        locale: 'en',
      };

      useAuthStore.getState().setUser(user);

      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated to false when user is null', () => {
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user and sets isAuthenticated to false', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: null,
          name: null,
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          smart_account_address: null,
          deposit_address: '0x1234567890abcdef1234567890abcdef12345678',
          auth_type: 'self_custody',
          locale: 'en',
        },
        isAuthenticated: true,
      });

      mockedAuthApi.logout.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
