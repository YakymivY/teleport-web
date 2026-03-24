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

export interface RenameDeviceDto {
  id: string;
  name: string;
}

export interface UserDeviceDto {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
}
