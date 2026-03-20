import axios from 'axios';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function logout(endpoint: '/auth/logout' | '/auth/logout-all') {
  const API_URL = import.meta.env.VITE_API_URL;
  const response = await axios.post(
    `${API_URL}${endpoint}`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}
