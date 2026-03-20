export interface Device {
  id: string;
  name: string;
  createdAt: Date;
  lastSeenAt: Date | null;
}
export interface StartPairingResponseDto {
  code: string;
  expiresIn: number;
}
