import { authApi } from '../src/api/auth';
import { apiClient } from '../src/api/client';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('authApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(apiClient, 'setToken').mockResolvedValue(undefined);
    jest.spyOn(apiClient, 'clearToken').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getSiweNonce', () => {
    it('calls POST /auth/wallet/nonce with address', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { nonce: 'abc123' } }),
      });

      const nonce = await authApi.getSiweNonce(address);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/wallet/nonce'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ address }),
        })
      );
      expect(nonce).toBe('abc123');
    });
  });

  describe('verifySiwe', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const message = 'cocopay.app wants you to sign in...';
    const signature = '0xdeadbeef';

    it('calls POST /auth/wallet/siwe with address, message, and signature', async () => {
      const mockUser = {
        id: 'user-1',
        email: null,
        name: null,
        wallet_address: address,
        created_at: '2026-02-20T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            token: 'jwt-token-123',
            user: mockUser,
            is_new_user: true,
          },
        }),
      });

      const result = await authApi.verifySiwe(address, message, signature);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/wallet/siwe'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ address, message, signature }),
        })
      );
      expect(result.token).toBe('jwt-token-123');
      expect(result.user.wallet_address).toBe(address);
      expect(result.is_new_user).toBe(true);
    });

    it('stores JWT token on successful verification', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            token: 'jwt-token-456',
            user: { id: 'user-1', email: null, name: null, wallet_address: address, created_at: '2026-02-20' },
            is_new_user: false,
          },
        }),
      });

      await authApi.verifySiwe(address, message, signature);

      expect(apiClient.setToken).toHaveBeenCalledWith('jwt-token-456');
    });
  });

  describe('sendMagicLink', () => {
    it('calls POST /auth/email/send with email', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            verification_id: 'ver-123',
            expires_at: '2026-02-20T01:00:00Z',
          },
        }),
      });

      const result = await authApi.sendMagicLink('test@example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/email/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
      expect(result.verification_id).toBe('ver-123');
    });
  });
});
