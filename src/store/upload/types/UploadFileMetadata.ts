import { TransferStatus } from '../../../features/dashboard/models/transfer-status.enum.ts';

export interface UploadFileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  status: TransferStatus;
}
