import { apiClient } from '../../../api/apiClient';

export async function requestMagicLink(email: string, sessionId: string) {
  return apiClient.post('/auth/magic-link', { email, sessionId });
}

export async function verifyPairingCode(code: string) {
  const response = await apiClient.post<{ deviceToken?: string }>(
    '/devices/pairing/verify',
    { code }
  );
  return response.data;
}

export function getSseVerifyUrl(sessionId: string) {
  const API_URL = import.meta.env.VITE_API_URL;
  return `${API_URL}/auth-sse/sse-verify/${sessionId}`;
}
