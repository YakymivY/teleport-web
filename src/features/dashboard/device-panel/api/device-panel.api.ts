import type { Device } from '../types/types';
import type { DeleteDeviceDto } from '../types/types';
import type { RenameDeviceDto } from '../types/types';
import type { StartPairingResponseDto } from '../types/types';
import type { UserDeviceDto } from '../types/types';
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

export async function renameDevice(payload: RenameDeviceDto): Promise<Device> {
  const response = await apiClient.patch<UserDeviceDto>('/devices/rename', payload);
  const { id, name, createdAt, lastSeenAt } = response.data;
  return {
    id,
    name,
    createdAt: new Date(createdAt),
    lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
  };
}

export async function deleteDevice(payload: DeleteDeviceDto): Promise<void> {
  await apiClient.delete('/devices/delete', { data: payload });
}
