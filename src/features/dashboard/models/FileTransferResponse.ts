import type { TransferStatus } from './transfer-status.enum.ts';

export interface FileTransferResponse {
  id: string;
  sourceDeviceId: string;
  destinationDeviceId: string | null;
  sourceDeviceName: string;
  destinationDeviceName: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
}
