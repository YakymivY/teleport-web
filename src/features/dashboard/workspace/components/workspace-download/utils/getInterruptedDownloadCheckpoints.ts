import { TransferStatus } from '../../../../models/transfer-status.enum';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse';
import { getDownloadCheckpoint, CHECKPOINT_KEY_PREFIX } from './downloadCheckpoint';

export function getInterruptedDownloadCheckpoints(): FileTransferResponse[] {
  const results: FileTransferResponse[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CHECKPOINT_KEY_PREFIX)) continue;

    const checkpoint = getDownloadCheckpoint(key);
    if (!checkpoint) continue;

    const nowIso = new Date().toISOString();
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
