import type { TransferStatus } from '../../../../models/transfer-status.enum.ts';

export interface FileTransferResponse {
  id: string;
  sourceDeviceId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
}
