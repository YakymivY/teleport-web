export interface SsePayload {
  status: 'verified' | 'expired';
  token?: string;
}
