import { apiClient, ApiError } from '../src/api/client';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('ApiClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('get', () => {
    it('makes a GET request with correct headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 }, meta: { timestamp: '2024-01-01' } }),
      });

      const result = await apiClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        })
      );
      expect(result.data).toEqual({ id: 1 });
    });

    it('throws ApiError on error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        }),
      });

      await expect(apiClient.get('/test')).rejects.toThrow('Resource not found');
    });
  });

  describe('post', () => {
    it('makes a POST request with body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      const body = { name: 'test' };
      await apiClient.post('/test', body);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });
  });
});
