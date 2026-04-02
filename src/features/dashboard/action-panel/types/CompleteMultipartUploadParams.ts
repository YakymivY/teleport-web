import type { UploadedPart } from './UploadedPart.ts';

export interface CompleteMultipartUploadParams {
  fileTransferId: string;
  s3UploadId: string;
  parts: UploadedPart[];
}
