import { TransferStatus } from '../../../../models/transfer-status.enum';
import { PART_SIZE_BYTES } from '../../../configs/file-size.config';
import { calculateTotalParts } from '../../../../../../utils/fileUtils';
import {
  initMultipartUpload,
  getMultipartPartUrl,
  uploadChunkToPresignedUrl,
  completeMultipartUpload,
} from '../../../api/action-panel.api';
import type { UploadedPart } from '../../../types/UploadedPart';
import type { Provisional } from '../types/Provisional';
import type { StoreActions } from '../types/StoreActions';
import { handlePresignUploadError } from './handlePresignUploadError';

export async function uploadLargeFile(p: Provisional, actions: StoreActions): Promise<void> {
  const { upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile } = actions;

  updateCurrentFileStatus(p.provisional.id, TransferStatus.PENDING);

  const totalParts = calculateTotalParts(p.file.size, PART_SIZE_BYTES);
  const { s3UploadId, id: fileTransferId } = await initMultipartUpload({
    filename: p.file.name,
    contentType: p.contentType,
    sizeBytes: p.file.size,
    totalParts,
  });

  const uploadedParts: UploadedPart[] = [];
  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    const start = (partNumber - 1) * PART_SIZE_BYTES;
    const end = Math.min(start + PART_SIZE_BYTES, p.file.size);
    const chunk = p.file.slice(start, end);

    const { method, url, headers } = await getMultipartPartUrl({
      fileTransferId,
      s3UploadId,
      partNumber,
    });

    let etag = '';
    try {
      etag = await uploadChunkToPresignedUrl(url, method ?? 'PUT', headers, chunk);
    } catch (error) {
      handlePresignUploadError(error);
      throw error;
    }

    uploadedParts.push({ partNumber, etag });
  }

  const completedTransfer = await completeMultipartUpload({
    fileTransferId,
    s3UploadId,
    parts: uploadedParts,
  });

  upsertCurrentFile(completedTransfer);
  removeCurrentFile(p.provisional.id);
}
