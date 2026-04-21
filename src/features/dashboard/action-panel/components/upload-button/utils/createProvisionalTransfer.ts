import type { FileTransferResponse } from '../../../../models/FileTransferResponse';
import { TransferStatus } from '../../../../models/transfer-status.enum';

export function createProvisionalTransfer(file: File): FileTransferResponse {
  const nowIso = new Date().toISOString();
  return {
    id: `local-${file.name}-${file.lastModified}-${file.size}`,
    sourceDeviceId: '',
    destinationDeviceId: null,
    sourceDeviceName: '',
    destinationDeviceName: null,
    filename: file.name,
    contentType: file.type || null,
    sizeBytes: file.size,
    status: TransferStatus.INITIALIZED,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
