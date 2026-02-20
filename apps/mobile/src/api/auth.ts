import { apiClient } from './client';

interface SendMagicLinkResponse {
  verification_id: string;
  expires_at: string;
}

interface VerifyMagicLinkResponse {
  token: string;
  user: User;
  is_new_user: boolean;
}

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  created_at: string;
}

export const authApi = {
  sendMagicLink: async (email: string) => {
    const response = await apiClient.post<SendMagicLinkResponse>('/auth/email/send', {
      email,
    });
    return response.data;
  },

  verifyMagicLink: async (verificationId: string, token: string) => {
    const response = await apiClient.post<VerifyMagicLinkResponse>('/auth/email/verify', {
      verification_id: verificationId,
      token,
    });

    // Store the JWT token
    await apiClient.setToken(response.data.token);

    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.delete('/auth/session');
    } finally {
      await apiClient.clearToken();
    }
  },
};
