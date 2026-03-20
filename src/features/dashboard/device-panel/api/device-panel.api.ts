import type { Device } from '../types/types';
import type { StartPairingResponseDto } from '../types/types';
import { apiClient } from '../../../../api/apiClient';

export async function fetchDevices(): Promise<Device[]> {
  const response = await apiClient.get<Device[]>('/devices');
  return response.data;
}

export async function startPairing(): Promise<StartPairingResponseDto> {
  const response = await apiClient.post<StartPairingResponseDto>(
    '/devices/pairing/start',
    { method: 'digit_code' }
  );
  return response.data;
}
