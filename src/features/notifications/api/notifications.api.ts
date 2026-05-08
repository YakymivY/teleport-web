import { apiClient } from '../../../api/apiClient';

export async function saveFcmToken(fcmToken: string) {
  await apiClient.put('/devices/fcm-token', { fcmToken });
}
