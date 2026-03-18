export interface Device {
  id: string;
  name: string;
  createdAt: Date;
  lastSeenAt: Date | null;
}

export interface DevicePairingResponse {
  code: string;
  expiresIn: number;
}
