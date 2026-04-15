import { TransferStatus } from '../../../../models/transfer-status.enum';
import { requestUploadSingle, uploadFileToPresignedUrl, confirmUpload } from '../../../api/action-panel.api';
import type { Provisional } from '../types/Provisional';
import type { StoreActions } from '../types/StoreActions';
import { handlePresignUploadError } from './handlePresignUploadError';

export async function uploadSmallBatch(small: Provisional[], actions: StoreActions): Promise<void> {
  const { upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile } = actions;

  for (const p of small) updateCurrentFileStatus(p.provisional.id, TransferStatus.PENDING);

  const presigned = await requestUploadSingle({
    files: small.map((p) => ({
      filename: p.file.name,
      contentType: p.contentType,
      sizeBytes: p.file.size,
    })),
  });

  if (presigned.length !== small.length) {
    throw new Error('UPLOAD_INIT_FAILED');
  }

  const batch = small.map((p, idx) => {
    const presign = presigned[idx];
    removeCurrentFile(p.provisional.id);
    upsertCurrentFile({ ...p.provisional, id: presign.id, status: TransferStatus.PENDING });
    return { file: p.file, transferId: presign.id, url: presign.url, headers: presign.headers };
  });

  let uploaded: Array<{ id: string; etag: string }> = [];
  try {
    uploaded = await Promise.all(
      batch.map(async (b) => {
        const etag = await uploadFileToPresignedUrl(b.url, b.headers, b.file);
        return { id: b.transferId, etag };
      }),
    );
  } catch (error) {
    for (const b of batch) updateCurrentFileStatus(b.transferId, TransferStatus.ABORTED);
    handlePresignUploadError(error);
    throw error;
  }

  try {
    const completedTransfers = await confirmUpload({ files: uploaded });
    for (const transfer of completedTransfers) upsertCurrentFile(transfer);
  } catch (error) {
    for (const b of batch) updateCurrentFileStatus(b.transferId, TransferStatus.ABORTED);
    throw error;
  }
}
