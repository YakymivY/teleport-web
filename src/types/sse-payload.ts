export interface SsePayload {
  status: 'verified' | 'expired' | 'error';
  token?: string;
  message?: string;
}
