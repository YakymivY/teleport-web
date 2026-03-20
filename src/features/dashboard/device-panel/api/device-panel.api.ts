import axios from 'axios';
import type { Device } from '../types/types';
import type { StartPairingResponseDto } from '../types/types';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function fetchDevices(): Promise<Device[]> {
  const API_URL = import.meta.env.VITE_API_URL;
  const response = await axios.get<Device[]>(`${API_URL}/devices`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function startPairing(): Promise<StartPairingResponseDto> {
  const API_URL = import.meta.env.VITE_API_URL;
  const response = await axios.post<StartPairingResponseDto>(
    `${API_URL}/devices/pairing/start`,
    { method: 'digit_code' },
    { headers: getAuthHeaders() }
  );
  return response.data;
}
