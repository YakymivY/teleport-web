import { TransferStatus } from '../../../../models/transfer-status.enum';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse';
import { getUploadCheckpoint } from './uploadCheckpoint';

const CHECKPOINT_KEY_PREFIX = 'upload_';

export function getInterruptedCheckpoints(): FileTransferResponse[] {
  const results: FileTransferResponse[] = [];
  const nowIso = new Date().toISOString();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CHECKPOINT_KEY_PREFIX)) continue;

    const checkpoint = getUploadCheckpoint(key);
    if (!checkpoint) continue;

    results.push({
      id: `interrupted-${key}`,
      sourceDeviceId: '',
      destinationDeviceId: null,
      sourceDeviceName: '',
      destinationDeviceName: null,
      filename: checkpoint.filename,
      contentType: null,
      sizeBytes: checkpoint.sizeBytes,
      status: TransferStatus.INTERRUPTED,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return results;
}
