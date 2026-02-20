import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ENV } from '../config/env';

const TOKEN_KEY = 'auth_token';

// Storage abstraction for web/native compatibility
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    page?: number;
    per_page?: number;
    total?: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

class ApiClient {
  private baseUrl = ENV.API_URL;

  async getToken(): Promise<string | null> {
    return storage.getItem(TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    await storage.setItem(TOKEN_KEY, token);
  }

  async clearToken(): Promise<void> {
    await storage.removeItem(TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok) {
      const error = json as ApiError;
      throw new ApiError(error.error.code, error.error.message, error.error.details);
    }

    return json as ApiResponse<T>;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
export { ApiError };
