import type { FileTransferResponse } from '../features/dashboard/workspace/components/workspace-upload/types/FileTransferResponse';
import type { UploadFileMetadata } from '../store/upload/types/UploadFileMetadata';

export function mapUploadFileToTransfer(file: UploadFileMetadata): FileTransferResponse {
  const nowIso = new Date().toISOString();

  return {
    id: `local-${file.name}-${file.lastModified}`,
    sourceDeviceId: '',
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
