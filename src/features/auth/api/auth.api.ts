import axios from 'axios';

export async function requestMagicLink(email: string, sessionId: string) {
  const API_URL = import.meta.env.VITE_API_URL;
  return axios.post(`${API_URL}/auth/magic-link`, { email, sessionId });
}

export async function verifyPairingCode(code: string) {
  const API_URL = import.meta.env.VITE_API_URL;
  const response = await axios.post<{ deviceToken?: string }>(`${API_URL}/devices/pairing/verify`, {
    code,
  });
  return response.data;
}

export function getSseVerifyUrl(sessionId: string) {
  const API_URL = import.meta.env.VITE_API_URL;
  return `${API_URL}/auth-sse/sse-verify/${sessionId}`;
}
