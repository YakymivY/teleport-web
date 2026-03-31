import type { FileTransferResponse } from '../types/FileTransferResponse.ts';
import type { UploadFileMetadata } from '../../../../../../store/upload/types/UploadFileMetadata.ts';

export function mapUploadFileToTransfer(file: UploadFileMetadata): FileTransferResponse {
  const nowIso = new Date().toISOString();

  return {
    id: `local-${file.name}-${file.lastModified}`,
    sourceDeviceId: '',
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    status: file.status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
