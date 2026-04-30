import type { UploadedPart } from '../../../types/UploadedPart';

export interface UploadCheckpoint {
  s3UploadId: string;
  fileTransferId: string;
  uploadedParts: UploadedPart[];
  filename: string;
  sizeBytes: number;
}
