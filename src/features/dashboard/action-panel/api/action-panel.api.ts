import { apiClient } from '../../../../api/apiClient';

export async function logout(endpoint: '/auth/logout' | '/auth/logout-all') {
  const response = await apiClient.post(endpoint, {});
  return response.data;
}
